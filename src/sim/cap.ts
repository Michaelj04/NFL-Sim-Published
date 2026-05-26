import type {
  CompPickLedger,
  CompPickLedgerEntry,
  CompPickProjection,
  ContractOrigin,
  DeadMoneyCharge,
  DraftPick,
  FreeAgentRights,
  GameSave,
  Player,
  PlayerContract,
  Position,
  TagType,
  TeamCapSettings,
  TenderLevel
} from "../types";
import { POSITIONS } from "../types";
import { isOnIr } from "./ir";
import { isPracticeSquadPlayer } from "./practiceSquad";

export const NFL_SALARY_CAP_2026 = 301.2;
export const COMP_PICK_MAX_PER_TEAM = 4;
const FREE_AGENT_TEAM_ID = "FA";

const TAG_APY: Record<TagType, Partial<Record<Position, number>>> = {
  franchise: {
    QB: 43,
    RB: 13,
    WR: 24,
    TE: 13,
    LT: 24,
    LG: 20,
    C: 18,
    RG: 20,
    RT: 21,
    EDGE: 25,
    DL: 23,
    LB: 21,
    CB: 22,
    S: 18,
    K: 6,
    P: 5.5
  },
  transition: {
    QB: 36,
    RB: 10,
    WR: 20,
    TE: 11,
    LT: 20,
    LG: 16,
    C: 15,
    RG: 16,
    RT: 17,
    EDGE: 21,
    DL: 19,
    LB: 17,
    CB: 18,
    S: 14,
    K: 4.6,
    P: 4.2
  }
};

const TENDER_APY: Record<TenderLevel, number> = {
  erfa: 0.92,
  "right-of-first-refusal": 2.98,
  "original-round": 3.12,
  "second-round": 4.89,
  "first-round": 7.05
};

function money(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}

function playerName(player: Pick<Player, "firstName" | "lastName">): string {
  return `${player.firstName} ${player.lastName}`;
}

export function freeAgentRightsFor(save: Pick<GameSave, "seasonYear">, player: Player): FreeAgentRights {
  if (player.teamId === FREE_AGENT_TEAM_ID) return player.contract?.rights ?? "ufa";
  const exp = player.draftYear ? Math.max(0, save.seasonYear - player.draftYear) : Math.max(0, player.age - 22);
  if (exp <= 1) return "erfa";
  if (exp <= 3) return "rfa";
  return "ufa";
}

export function makeContract(
  player: Pick<Player, "salary" | "contractYears" | "position" | "age" | "overall" | "potential">,
  seasonYear: number,
  options: Partial<Pick<PlayerContract, "origin" | "rights" | "apy" | "years" | "signingBonus" | "guaranteedTotal" | "tagType" | "tenderLevel">> = {}
): PlayerContract {
  const years = Math.max(1, Math.round(options.years ?? player.contractYears ?? 1));
  const apy = money(options.apy ?? player.salary ?? 1);
  const origin = options.origin ?? "generated";
  const signingBonus = money(options.signingBonus ?? (origin === "practice-squad" ? 0 : apy * years * (origin === "rookie" ? 0.16 : 0.22)));
  const guaranteedTotal = money(options.guaranteedTotal ?? signingBonus + (origin === "practice-squad" ? 0 : apy * Math.min(2, years) * 0.28));
  const annualProration = years > 0 ? money(signingBonus / years) : 0;
  const baseSalary = money(Math.max(0.25, apy - annualProration));
  return {
    startYear: seasonYear,
    endYear: seasonYear + years - 1,
    years,
    apy,
    signingBonus,
    guaranteedTotal,
    origin,
    rights: options.rights ?? "none",
    tagType: options.tagType,
    tenderLevel: options.tenderLevel,
    seasons: Array.from({ length: years }, (_, index) => ({
      seasonYear: seasonYear + index,
      baseSalary: money(baseSalary * (1 + index * 0.035)),
      signingBonusProration: annualProration,
      guaranteedSalary: money(index === 0 ? Math.min(baseSalary, Math.max(0, guaranteedTotal - signingBonus)) : 0)
    })),
    restructureHistory: []
  };
}

export function ensurePlayerContract(player: Player, seasonYear: number): Player {
  if (player.contract?.seasons?.length) return player;
  return {
    ...player,
    contract: makeContract(player, seasonYear, {
      origin: isPracticeSquadPlayer(player) ? "practice-squad" : player.traits?.includes("Rookie") ? "rookie" : "generated",
      rights: player.teamId === FREE_AGENT_TEAM_ID ? "ufa" : "none"
    })
  };
}

export function currentContractSeason(player: Player, seasonYear: number) {
  const contract = player.contract;
  return contract?.seasons.find((season) => season.seasonYear === seasonYear) ?? contract?.seasons[0];
}

export function playerCapHit(player: Player, seasonYear: number): number {
  if (player.teamId === FREE_AGENT_TEAM_ID) return 0;
  const season = currentContractSeason(player, seasonYear);
  if (!season) return money(player.salary);
  return money(season.baseSalary + season.signingBonusProration);
}

export function playerCashDue(player: Player, seasonYear: number): number {
  const season = currentContractSeason(player, seasonYear);
  return money(season?.baseSalary ?? player.salary);
}

export function remainingBonusProration(player: Player, seasonYear: number): number {
  return money((player.contract?.seasons ?? [])
    .filter((season) => season.seasonYear >= seasonYear)
    .reduce((sum, season) => sum + season.signingBonusProration, 0));
}

export function guaranteedSalaryRemaining(player: Player, seasonYear: number): number {
  return money((player.contract?.seasons ?? [])
    .filter((season) => season.seasonYear >= seasonYear)
    .reduce((sum, season) => sum + season.guaranteedSalary, 0));
}

export function deadMoneyIfMoved(player: Player, seasonYear: number): number {
  return money(remainingBonusProration(player, seasonYear) + guaranteedSalaryRemaining(player, seasonYear));
}

export function capSavingsIfMoved(player: Player, seasonYear: number): number {
  return money(Math.max(0, playerCapHit(player, seasonYear) - deadMoneyIfMoved(player, seasonYear)));
}

export function teamCapSettings(save: GameSave, teamId: string): TeamCapSettings {
  return save.capSettings?.[teamId] ?? {
    salaryCap: NFL_SALARY_CAP_2026 + Math.max(0, save.seasonYear - 2026) * 10,
    rookieReserve: 0,
    franchiseTagUsed: false,
    transitionTagUsed: false
  };
}

export function deadMoneyForTeam(save: GameSave, teamId: string, seasonYear = save.seasonYear): number {
  return money((save.deadMoney ?? [])
    .filter((charge) => charge.teamId === teamId && charge.seasonYear === seasonYear)
    .reduce((sum, charge) => sum + charge.amount, 0));
}

export function activeCapCommitments(save: GameSave, teamId: string, seasonYear = save.seasonYear): number {
  return money(save.players
    .filter((player) => player.teamId === teamId && !isPracticeSquadPlayer(player) && !isOnIr(player))
    .reduce((sum, player) => sum + playerCapHit(player, seasonYear), 0));
}

export function practiceSquadCapCommitments(save: GameSave, teamId: string, seasonYear = save.seasonYear): number {
  return money(save.players
    .filter((player) => player.teamId === teamId && isPracticeSquadPlayer(player))
    .reduce((sum, player) => sum + playerCapHit(player, seasonYear), 0));
}

export function irCapCommitments(save: GameSave, teamId: string, seasonYear = save.seasonYear): number {
  return money(save.players
    .filter((player) => player.teamId === teamId && isOnIr(player))
    .reduce((sum, player) => sum + playerCapHit(player, seasonYear), 0));
}

export interface TeamCapLedger {
  teamId: string;
  salaryCap: number;
  activeCap: number;
  practiceSquadCap: number;
  irCap: number;
  deadMoney: number;
  rookieReserve: number;
  totalCommitments: number;
  capRoom: number;
  compliant: boolean;
}

export function teamCapLedger(save: GameSave, teamId: string, seasonYear = save.seasonYear): TeamCapLedger {
  const settings = teamCapSettings(save, teamId);
  const activeCap = activeCapCommitments(save, teamId, seasonYear);
  const practiceSquadCap = practiceSquadCapCommitments(save, teamId, seasonYear);
  const irCap = irCapCommitments(save, teamId, seasonYear);
  const deadMoney = deadMoneyForTeam(save, teamId, seasonYear);
  const rookieReserve = settings.rookieReserve ?? 0;
  const totalCommitments = money(activeCap + practiceSquadCap + irCap + deadMoney + rookieReserve);
  const capRoom = money(settings.salaryCap - totalCommitments);
  return {
    teamId,
    salaryCap: settings.salaryCap,
    activeCap,
    practiceSquadCap,
    irCap,
    deadMoney,
    rookieReserve,
    totalCommitments,
    capRoom,
    compliant: capRoom >= 0
  };
}

export function capRoom(save: GameSave, teamId: string): number {
  return teamCapLedger(save, teamId).capRoom;
}

export function recalculateBudgets(save: GameSave): GameSave {
  return {
    ...save,
    budget: Object.fromEntries(save.teams.map((team) => [team.id, capRoom(save, team.id)]))
  };
}

export function normalizeCapState(save: GameSave): GameSave {
  const players = (save.players ?? []).map((player) => ensurePlayerContract(player, save.seasonYear));
  const capSettings = {
    ...Object.fromEntries(save.teams.map((team) => [team.id, teamCapSettings({ ...save, players } as GameSave, team.id)])),
    ...(save.capSettings ?? {})
  };
  const normalized: GameSave = {
    ...save,
    players,
    capSettings,
    deadMoney: save.deadMoney ?? [],
    compPickLedger: save.compPickLedger ?? { seasonYear: save.seasonYear, entries: [], projections: [] }
  };
  return recalculateBudgets(normalized);
}

export function addDeadMoneyCharge(save: GameSave, player: Player, teamId: string, source: DeadMoneyCharge["source"]): GameSave {
  const amount = deadMoneyIfMoved(player, save.seasonYear);
  if (amount <= 0) return save;
  const charge: DeadMoneyCharge = {
    id: `dead-${source}-${save.seasonYear}-${save.currentWeek}-${player.id}-${(save.deadMoney ?? []).length}`,
    teamId,
    playerId: player.id,
    playerName: playerName(player),
    seasonYear: save.seasonYear,
    amount,
    source
  };
  return { ...save, deadMoney: [charge, ...(save.deadMoney ?? [])] };
}

export function contractOfferForPlayer(save: GameSave, player: Player, teamId: string, options: { years?: number; apy?: number; origin?: ContractOrigin } = {}): PlayerContract {
  const demand = suggestedApy(player);
  const years = options.years ?? (player.age <= 25 ? 4 : player.age >= 31 ? 1 : 3);
  return makeContract(player, save.seasonYear, {
    origin: options.origin ?? "free-agent",
    rights: "none",
    years,
    apy: options.apy ?? demand,
    signingBonus: demand * years * 0.2,
    guaranteedTotal: demand * Math.min(2, years) * 0.62
  });
}

export function suggestedApy(player: Pick<Player, "overall" | "potential" | "age" | "position" | "salary">): number {
  const premium: Record<Position, number> = {
    QB: 1.9, RB: 0.72, WR: 1.08, TE: 0.78, LT: 1.16, LG: 0.72, C: 0.76, RG: 0.72, RT: 1.0,
    EDGE: 1.28, DL: 1.0, LB: 0.84, CB: 1.18, S: 0.82, K: 0.34, P: 0.3
  };
  const grade = Math.max(player.overall, player.potential * 0.6 + player.overall * 0.4);
  const ageDrag = player.age > 30 ? (player.age - 30) * 0.07 : 0;
  const base = Math.pow(Math.max(0.02, (grade - 38) / 45), 2.08) * 23 * premium[player.position];
  return money(Math.max(0.84, Math.min(player.position === "QB" ? 56 : 34, base * (1 - ageDrag) + 0.9)));
}

export function canFitContract(save: GameSave, teamId: string, contract: PlayerContract, ignorePlayerId?: string): boolean {
  const currentYear = contract.seasons.find((season) => season.seasonYear === save.seasonYear) ?? contract.seasons[0];
  if (!currentYear) return true;
  const simulated = {
    ...save,
    players: save.players.map((player) => player.id === ignorePlayerId ? { ...player, contract } : player)
  };
  return teamCapLedger(simulated, teamId).capRoom >= currentYear.baseSalary + currentYear.signingBonusProration || teamCapLedger(save, teamId).capRoom >= currentYear.baseSalary + currentYear.signingBonusProration;
}

export function restructurePlayerContract(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
  if (!player?.contract) return save;
  const current = currentContractSeason(player, save.seasonYear);
  const futureYears = player.contract.seasons.filter((season) => season.seasonYear >= save.seasonYear);
  if (!current || futureYears.length < 2 || current.baseSalary < 2.5) return save;
  const convert = money(Math.min(current.baseSalary - 1.25, Math.max(0, current.baseSalary * 0.55)));
  const annual = money(convert / futureYears.length);
  const contract: PlayerContract = {
    ...player.contract,
    signingBonus: money(player.contract.signingBonus + convert),
    seasons: player.contract.seasons.map((season) => season.seasonYear >= save.seasonYear
      ? {
        ...season,
        baseSalary: money(season.seasonYear === save.seasonYear ? season.baseSalary - convert : season.baseSalary),
        signingBonusProration: money(season.signingBonusProration + annual)
      }
      : season),
    restructureHistory: [
      { seasonYear: save.seasonYear, convertedBase: convert, addedBonus: convert, annualProration: annual },
      ...(player.contract.restructureHistory ?? [])
    ]
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? { ...candidate, contract, salary: contract.apy } : candidate)
  });
}

export function applyTagOrTender(save: GameSave, playerId: string, teamId: string, kind: TagType | TenderLevel): GameSave {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
  if (!player) return save;
  const isTag = kind === "franchise" || kind === "transition";
  const settings = teamCapSettings(save, teamId);
  if (isTag && (kind === "franchise" ? settings.franchiseTagUsed : settings.transitionTagUsed)) return save;
  const apy = isTag ? TAG_APY[kind][player.position] ?? 12 : TENDER_APY[kind];
  const contract = makeContract(player, save.seasonYear, {
    origin: isTag ? "tag" : "tender",
    rights: "none",
    years: 1,
    apy,
    signingBonus: 0,
    guaranteedTotal: apy,
    tagType: isTag ? kind : undefined,
    tenderLevel: isTag ? undefined : kind
  });
  return recalculateBudgets({
    ...save,
    capSettings: {
      ...(save.capSettings ?? {}),
      [teamId]: {
        ...settings,
        franchiseTagUsed: settings.franchiseTagUsed || kind === "franchise",
        transitionTagUsed: settings.transitionTagUsed || kind === "transition"
      }
    },
    players: save.players.map((candidate) => candidate.id === playerId ? { ...candidate, contract, salary: contract.apy, contractYears: 1 } : candidate)
  });
}

export function newTeamContractForAcquiredPlayer(player: Player, seasonYear: number): PlayerContract | undefined {
  if (!player.contract) return undefined;
  return {
    ...player.contract,
    signingBonus: 0,
    guaranteedTotal: guaranteedSalaryRemaining(player, seasonYear),
    seasons: player.contract.seasons.map((season) => ({
      ...season,
      signingBonusProration: 0
    })),
    restructureHistory: player.contract.restructureHistory ?? []
  };
}

export function recordCompPickSigning(save: GameSave, player: Player, signingTeamId: string): GameSave {
  const originalTeamId = player.contract?.rights === "ufa" ? (player as Player & { previousTeamId?: string }).previousTeamId : undefined;
  const lostTeamId = originalTeamId;
  if (!lostTeamId || lostTeamId === signingTeamId || player.contract?.rights !== "ufa") return save;
  const contract = player.contract ?? contractOfferForPlayer(save, player, signingTeamId);
  const value = compPickValue(player, contract.apy);
  const roundProjection = compPickRound(value);
  const base = {
    playerId: player.id,
    playerName: playerName(player),
    position: player.position,
    originalTeamId: lostTeamId,
    signingTeamId,
    seasonYear: save.seasonYear,
    apy: contract.apy,
    contractYears: contract.years,
    value,
    roundProjection
  };
  const entries: CompPickLedgerEntry[] = [
    {
      id: `comp-lost-${save.seasonYear}-${lostTeamId}-${player.id}`,
      kind: "lost",
      teamId: lostTeamId,
      ...base
    },
    {
      id: `comp-gained-${save.seasonYear}-${signingTeamId}-${player.id}`,
      kind: "gained",
      teamId: signingTeamId,
      ...base
    }
  ];
  const ledger = save.compPickLedger ?? { seasonYear: save.seasonYear, entries: [], projections: [] };
  return projectCompPicks({
    ...save,
    compPickLedger: {
      ...ledger,
      entries: [...entries, ...ledger.entries.filter((entry) => !entries.some((next) => next.id === entry.id))]
    }
  });
}

function compPickValue(player: Player, apy: number): number {
  const playtime = Math.min(12, (player.stats?.snaps ?? 0) / 80);
  const performance = Math.max(0, player.overall - 55) * 0.38;
  return money(apy * 2.2 + playtime + performance);
}

function compPickRound(value: number): number {
  if (value >= 60) return 3;
  if (value >= 44) return 4;
  if (value >= 31) return 5;
  if (value >= 20) return 6;
  return 7;
}

export function projectCompPicks(save: GameSave): GameSave {
  const ledger = save.compPickLedger ?? { seasonYear: save.seasonYear, entries: [], projections: [] };
  const entries: CompPickLedgerEntry[] = ledger.entries.map((entry) => ({ ...entry, canceledById: undefined }));
  for (const team of save.teams) {
    const losses = entries.filter((entry) => entry.teamId === team.id && entry.kind === "lost").sort((a, b) => b.value - a.value);
    const gains = entries.filter((entry) => entry.teamId === team.id && entry.kind === "gained").sort((a, b) => b.value - a.value);
    const usedLosses = new Set<string>();
    for (const gain of gains) {
      const loss = losses.find((candidate) => !usedLosses.has(candidate.id) && candidate.value <= gain.value * 1.18);
      if (!loss) continue;
      gain.canceledById = loss.id;
      loss.canceledById = gain.id;
      usedLosses.add(loss.id);
    }
  }
  const projections: CompPickProjection[] = save.teams.flatMap((team) =>
    entries
      .filter((entry) => entry.teamId === team.id && entry.kind === "lost" && !entry.canceledById)
      .sort((a, b) => b.value - a.value)
      .slice(0, COMP_PICK_MAX_PER_TEAM)
      .map((entry, index) => ({
        id: `comp-proj-${save.seasonYear + 1}-${team.id}-${index}-${entry.playerId}`,
        teamId: team.id,
        draftYear: save.seasonYear + 1,
        round: entry.roundProjection,
        value: entry.value,
        playerName: entry.playerName,
        sourceEntryId: entry.id,
        finalized: false
      }))
  );
  return {
    ...save,
    compPickLedger: {
      ...ledger,
      entries,
      projections
    }
  };
}

export function finalizeCompPicks(save: GameSave): GameSave {
  const ledger = projectCompPicks(save).compPickLedger ?? { seasonYear: save.seasonYear, entries: [], projections: [] };
  const draftYear = save.draftState?.draftYear ?? save.seasonYear + 1;
  if (ledger.finalizedDraftYear === draftYear) return save;
  const existing = new Set(save.draftPicks.map((pick) => pick.id));
  const compPicks: DraftPick[] = ledger.projections
    .filter((projection) => projection.draftYear === draftYear)
    .sort((a, b) => a.round - b.round || b.value - a.value)
    .map((projection, index, projections) => {
      const id = `comp-${projection.draftYear}-${projection.round}-${projection.teamId}-${projection.sourceEntryId}`;
      const sameRoundBefore = projections.slice(0, index).filter((candidate) => candidate.round === projection.round).length;
      const existingSameRoundComp = save.draftPicks.filter((pick) => pick.draftYear === projection.draftYear && pick.round === projection.round && pick.compensatory).length;
      const pickInRound = save.teams.length + existingSameRoundComp + sameRoundBefore + 1;
      return {
        id,
        draftYear: projection.draftYear,
        round: projection.round,
        pickInRound,
        overallPick: (projection.round - 1) * save.teams.length + pickInRound,
        originalTeamId: projection.teamId,
        currentTeamId: projection.teamId,
        compensatory: true,
        compSource: "ledger" as const,
        compLabel: projection.playerName
      };
    })
    .filter((pick) => !existing.has(pick.id));
  const draftPicks = assignCompensatoryDraftOrder([...save.draftPicks, ...compPicks]);
  return {
    ...save,
    draftPicks,
    compPickLedger: {
      ...ledger,
      finalizedDraftYear: draftYear,
      projections: ledger.projections.map((projection) => projection.draftYear === draftYear ? { ...projection, finalized: true } : projection)
    }
  };
}

function assignCompensatoryDraftOrder(picks: DraftPick[]): DraftPick[] {
  const years = [...new Set(picks.map((pick) => pick.draftYear))];
  return years.flatMap((draftYear) =>
    picks
      .filter((pick) => pick.draftYear === draftYear)
      .sort((a, b) => a.round - b.round || a.pickInRound - b.pickInRound || a.originalTeamId.localeCompare(b.originalTeamId))
      .map((pick, index) => ({ ...pick, overallPick: index + 1 }))
  );
}

export function expiringContractPlayers(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => player.teamId === teamId && !isPracticeSquadPlayer(player) && (player.contract?.endYear ?? save.seasonYear) <= save.seasonYear);
}

export function openOffseasonContracts(save: GameSave): GameSave {
  const players = save.players.map((player) => {
    if (player.teamId === FREE_AGENT_TEAM_ID) return player;
    const contract = ensurePlayerContract(player, save.seasonYear).contract!;
    if (contract.endYear > save.seasonYear) return { ...player, contract };
    return {
      ...player,
      contract: {
        ...contract,
        rights: freeAgentRightsFor(save, player)
      }
    };
  });
  return normalizeCapState({ ...save, players, phase: "contract-decisions" });
}

export function advanceToFreeAgency(save: GameSave): GameSave {
  if (save.phase !== "contract-decisions") return save;
  const players = save.players.map((player) => {
    if (player.teamId === FREE_AGENT_TEAM_ID) return player;
    const rights = player.contract?.rights ?? "none";
    if ((player.contract?.endYear ?? save.seasonYear) > save.seasonYear || rights === "none") return player;
    if (rights === "erfa") {
      const contract = makeContract(player, save.seasonYear, { origin: "tender", rights: "none", years: 1, apy: TENDER_APY.erfa, signingBonus: 0, guaranteedTotal: TENDER_APY.erfa, tenderLevel: "erfa" });
      return { ...player, contract, salary: contract.apy, contractYears: 1 };
    }
    return {
      ...player,
      previousTeamId: player.teamId,
      teamId: FREE_AGENT_TEAM_ID,
      teamStartSeason: save.seasonYear,
      contract: {
        ...player.contract!,
        rights
      }
    } as Player & { previousTeamId?: string };
  });
  return normalizeCapState(projectCompPicks({
    ...save,
    players,
    phase: "free-agency",
    freeAgencyMarket: { seasonYear: save.seasonYear, currentWave: 1, offers: [], decisions: [] },
    inbox: [
      {
        id: `free-agency-open-${save.seasonYear}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "budget",
        title: "Free agency is open",
        body: "Expired UFAs have hit the market. The comp-pick ledger is now tracking qualifying gains and losses.",
        priority: "high",
        read: false
      },
      ...save.inbox
    ]
  }));
}

export function advanceToDraftPrep(save: GameSave): GameSave {
  if (save.phase !== "free-agency") return save;
  const projected = finalizeCompPicks(projectCompPicks(save));
  return normalizeCapState({
    ...projected,
    phase: "draft-prep",
    inbox: [
      {
        id: `draft-prep-open-${save.seasonYear}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "draft",
        title: "Draft prep is open",
        body: "Compensatory picks are finalized and the front office can move into the draft room.",
        priority: "high",
        read: false
      },
      ...save.inbox
    ]
  });
}

export function teamHasCapCompliance(save: GameSave, teamId = save.selectedTeamId): boolean {
  return teamCapLedger(save, teamId).compliant;
}
