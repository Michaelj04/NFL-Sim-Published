import type {
  CompPickLedger,
  CompPickLedgerEntry,
  CompPickProjection,
  ContractSeason,
  ContractOrigin,
  DeadMoneyCharge,
  DraftPick,
  FreeAgentSecurityLevel,
  FreeAgentRights,
  GameSave,
  Player,
  PlayerContract,
  Position,
  ReleaseDesignation,
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

const SECURITY_STRUCTURE: Record<FreeAgentSecurityLevel, { bonusRate: number; guaranteeRate: number }> = {
  low: { bonusRate: 0.12, guaranteeRate: 0.42 },
  standard: { bonusRate: 0.2, guaranteeRate: 0.62 },
  strong: { bonusRate: 0.28, guaranteeRate: 0.78 }
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
  options: Partial<Pick<PlayerContract, "origin" | "rights" | "apy" | "years" | "signingBonus" | "guaranteedTotal" | "tagType" | "tenderLevel" | "security" | "voidYears" | "optionYear" | "fifthYearOption">> = {}
): PlayerContract {
  const years = Math.max(1, Math.round(options.years ?? player.contractYears ?? 1));
  const apy = money(options.apy ?? player.salary ?? 1);
  const origin = options.origin ?? "generated";
  const security = options.security ?? "standard";
  const structure = SECURITY_STRUCTURE[security];
  const voidYears = origin === "free-agent" || origin === "extension" ? Math.max(0, Math.min(3, Math.round(options.voidYears ?? 0))) : 0;
  const totalValue = money(apy * years);
  const defaultBonusRate = origin === "practice-squad" ? 0 : origin === "rookie" || origin === "udfa" ? 0.16 : structure.bonusRate;
  const signingBonus = money(Math.min(totalValue, options.signingBonus ?? totalValue * defaultBonusRate));
  const defaultGuarantee = origin === "practice-squad" ? 0 : origin === "tag" || origin === "tender" ? totalValue : totalValue * structure.guaranteeRate;
  const guaranteedTotal = money(Math.min(totalValue, Math.max(signingBonus, options.guaranteedTotal ?? defaultGuarantee)));
  const prorationYears = Math.max(1, years + voidYears);
  const annualProration = money(signingBonus / prorationYears);
  const basePool = money(Math.max(0, totalValue - signingBonus));
  const weights = Array.from({ length: years }, (_, index) => 1 + index * 0.035);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const baseSalaries = weights.map((weight) => money(basePool * weight / weightTotal));
  const baseAdjustment = money(basePool - baseSalaries.reduce((sum, value) => sum + value, 0));
  baseSalaries[baseSalaries.length - 1] = money((baseSalaries[baseSalaries.length - 1] ?? 0) + baseAdjustment);
  let remainingGuaranteedSalary = money(Math.max(0, guaranteedTotal - signingBonus));
  const activeSeasons: ContractSeason[] = Array.from({ length: years }, (_, index) => {
    const baseSalary = baseSalaries[index] ?? 0;
    const guaranteedSalary = money(Math.min(baseSalary, remainingGuaranteedSalary));
    remainingGuaranteedSalary = money(remainingGuaranteedSalary - guaranteedSalary);
    return {
      seasonYear: seasonYear + index,
      baseSalary,
      signingBonusProration: annualProration,
      guaranteedSalary,
      optionYear: options.optionYear === seasonYear + index
    };
  });
  const voidSeasons: ContractSeason[] = Array.from({ length: voidYears }, (_, index) => ({
    seasonYear: seasonYear + years + index,
    baseSalary: 0,
    signingBonusProration: annualProration,
    guaranteedSalary: 0,
    voidYear: true
  }));
  return {
    startYear: seasonYear,
    endYear: seasonYear + years - 1,
    years,
    apy,
    totalValue,
    signingBonus,
    guaranteedTotal,
    security,
    origin,
    rights: options.rights ?? "none",
    tagType: options.tagType,
    tenderLevel: options.tenderLevel,
    voidYears,
    optionYear: options.optionYear,
    fifthYearOption: options.fifthYearOption,
    seasons: [...activeSeasons, ...voidSeasons],
    restructureHistory: []
  };
}

export function ensurePlayerContract(player: Player, seasonYear: number): Player {
  if (player.contract?.seasons?.length) {
    return syncPlayerContractFields({
      ...player,
      contract: {
        ...player.contract,
        totalValue: player.contract.totalValue ?? contractTotalValue(player.contract),
        security: player.contract.security ?? "standard",
        voidYears: player.contract.voidYears ?? player.contract.seasons.filter((season) => season.voidYear).length,
        restructureHistory: player.contract.restructureHistory ?? []
      }
    }, seasonYear);
  }
  return syncPlayerContractFields({
    ...player,
    contract: makeContract(player, seasonYear, {
      origin: isPracticeSquadPlayer(player) ? "practice-squad" : player.traits?.includes("Rookie") ? "rookie" : "generated",
      rights: player.teamId === FREE_AGENT_TEAM_ID ? "ufa" : "none"
    })
  }, seasonYear);
}

export function contractTotalValue(contract: PlayerContract): number {
  return money(contract.totalValue ?? contract.seasons
    .filter((season) => !season.voidYear)
    .reduce((sum, season) => sum + season.baseSalary, 0) + contract.signingBonus);
}

export function remainingContractYears(player: Player, seasonYear: number): number {
  const contract = player.contract;
  if (!contract) return Math.max(0, player.contractYears);
  return contract.seasons.filter((season) => !season.voidYear && season.seasonYear >= seasonYear).length;
}

export function syncPlayerContractFields(player: Player, seasonYear: number): Player {
  if (!player.contract) return player;
  return {
    ...player,
    salary: player.contract.apy,
    contractYears: remainingContractYears(player, seasonYear)
  };
}

export function currentCapSeason(player: Player, seasonYear: number) {
  return player.contract?.seasons.find((season) => season.seasonYear === seasonYear && !season.voidYear);
}

export function currentContractSeason(player: Player, seasonYear: number) {
  return currentCapSeason(player, seasonYear);
}

export function playerCapHit(player: Player, seasonYear: number): number {
  if (player.teamId === FREE_AGENT_TEAM_ID) return 0;
  if (player.contract && seasonYear > player.contract.endYear) return 0;
  const season = currentContractSeason(player, seasonYear);
  if (!season) return player.contract ? 0 : money(player.salary);
  return money(season.baseSalary + season.signingBonusProration);
}

export function playerCashDue(player: Player, seasonYear: number): number {
  const season = currentContractSeason(player, seasonYear);
  if (!season) return player.contract ? 0 : money(player.salary);
  return money(season.baseSalary);
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

export function addDeadMoneyCharge(save: GameSave, player: Player, teamId: string, source: DeadMoneyCharge["source"], options: { amount?: number; seasonYear?: number } = {}): GameSave {
  const amount = money(options.amount ?? deadMoneyIfMoved(player, save.seasonYear));
  if (amount <= 0) return save;
  const chargeYear = options.seasonYear ?? save.seasonYear;
  const charge: DeadMoneyCharge = {
    id: `dead-${source}-${chargeYear}-${save.currentWeek}-${player.id}-${(save.deadMoney ?? []).length}`,
    teamId,
    playerId: player.id,
    playerName: playerName(player),
    seasonYear: chargeYear,
    amount,
    source
  };
  return { ...save, deadMoney: [charge, ...(save.deadMoney ?? [])] };
}

export function deadMoneyByReleaseDesignation(player: Player, seasonYear: number, designation: ReleaseDesignation = "standard"): { current: number; deferred: number } {
  const remainingBonus = remainingBonusProration(player, seasonYear);
  const guaranteed = guaranteedSalaryRemaining(player, seasonYear);
  if (designation !== "post-june") return { current: money(remainingBonus + guaranteed), deferred: 0 };
  const currentSeason = currentCapSeason(player, seasonYear);
  const currentBonus = money(currentSeason?.signingBonusProration ?? 0);
  return {
    current: money(currentBonus + guaranteed),
    deferred: money(Math.max(0, remainingBonus - currentBonus))
  };
}

export function addReleaseDeadMoneyCharges(save: GameSave, player: Player, teamId: string, designation: ReleaseDesignation = "standard"): GameSave {
  const split = deadMoneyByReleaseDesignation(player, save.seasonYear, designation);
  let next = addDeadMoneyCharge(save, player, teamId, designation === "post-june" ? "post-june-release" : "release", { amount: split.current });
  if (split.deferred > 0) {
    next = addDeadMoneyCharge(next, player, teamId, "post-june-release", { amount: split.deferred, seasonYear: save.seasonYear + 1 });
  }
  return next;
}

export function contractOfferForPlayer(save: GameSave, player: Player, teamId: string, options: { years?: number; apy?: number; origin?: ContractOrigin; security?: FreeAgentSecurityLevel; voidYears?: number } = {}): PlayerContract {
  const demand = suggestedApy(player);
  const years = options.years ?? (player.age <= 25 ? 4 : player.age >= 31 ? 1 : 3);
  const apy = money(options.apy ?? demand);
  const security = options.security ?? "standard";
  const structure = SECURITY_STRUCTURE[security];
  return makeContract(player, save.seasonYear, {
    origin: options.origin ?? "free-agent",
    rights: "none",
    years,
    apy,
    security,
    voidYears: options.voidYears,
    signingBonus: apy * years * structure.bonusRate,
    guaranteedTotal: apy * years * structure.guaranteeRate
  });
}

export function suggestedApy(player: Pick<Player, "overall" | "potential" | "age" | "position" | "salary">): number {
  const premium: Record<Position, number> = {
    QB: 1.9, RB: 0.72, WR: 1.08, TE: 0.78, LT: 1.16, LG: 0.72, C: 0.76, RG: 0.72, RT: 1.0,
    EDGE: 1.28, DL: 1.0, LB: 0.84, CB: 1.18, S: 0.82, K: 0.34, P: 0.3
  };
  const grade = Math.max(player.overall, player.potential * 0.6 + player.overall * 0.4);
  const ageDrag = player.age > 30 ? (player.age - 30) * 0.07 : 0;
  const base = Math.pow(Math.max(0.015, (grade - 42) / 38), 2.12) * 21 * premium[player.position];
  return money(Math.max(0.84, Math.min(player.position === "QB" ? 56 : 34, base * (1 - ageDrag) + 0.9)));
}

export function canFitContract(save: GameSave, teamId: string, contract: PlayerContract, ignorePlayerId?: string): boolean {
  const currentYear = contract.seasons.find((season) => season.seasonYear === save.seasonYear && !season.voidYear) ?? contract.seasons.find((season) => !season.voidYear);
  if (!currentYear) return true;
  const newHit = money(currentYear.baseSalary + currentYear.signingBonusProration);
  if (ignorePlayerId) {
    const existing = save.players.find((player) => player.id === ignorePlayerId);
    const currentHit = existing ? playerCapHit(existing, save.seasonYear) : 0;
    if (teamCapLedger(save, teamId).capRoom + currentHit < newHit) return false;
  }
  const simulated = {
    ...save,
    players: save.players.map((player) => player.id === ignorePlayerId ? syncPlayerContractFields({ ...player, contract }, save.seasonYear) : player)
  };
  if (ignorePlayerId) return teamCapLedger(simulated, teamId).compliant;
  return teamCapLedger(save, teamId).capRoom >= newHit;
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
    players: save.players.map((candidate) => candidate.id === playerId ? syncPlayerContractFields({ ...candidate, contract }, save.seasonYear) : candidate)
  });
}

export function canApplyTagOrTender(save: GameSave, playerId: string, teamId: string, kind: TagType | TenderLevel): { ok: boolean; reason?: string; contract?: PlayerContract } {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
  if (!player) return { ok: false, reason: "Player is not on this roster." };
  if (save.phase !== "contract-decisions") return { ok: false, reason: "Available during contract decisions." };
  const isTag = kind === "franchise" || kind === "transition";
  const settings = teamCapSettings(save, teamId);
  if (isTag && (kind === "franchise" ? settings.franchiseTagUsed : settings.transitionTagUsed)) return { ok: false, reason: `${kind === "franchise" ? "Franchise" : "Transition"} tag already used.` };
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
  if (!canFitContract(save, teamId, contract, playerId)) return { ok: false, reason: "Not enough cap room.", contract };
  return { ok: true, contract };
}

export function applyTagOrTender(save: GameSave, playerId: string, teamId: string, kind: TagType | TenderLevel): GameSave {
  const check = canApplyTagOrTender(save, playerId, teamId, kind);
  if (!check.ok || !check.contract) return save;
  const isTag = kind === "franchise" || kind === "transition";
  const settings = teamCapSettings(save, teamId);
  const contract = check.contract;
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
    players: save.players.map((candidate) => candidate.id === playerId ? syncPlayerContractFields({ ...candidate, contract }, save.seasonYear) : candidate)
  });
}

export function canExtendPlayerContract(save: GameSave, playerId: string, teamId = save.selectedTeamId): { ok: boolean; reason?: string } {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
  if (!player?.contract) return { ok: false, reason: "No active contract." };
  if (save.phase !== "contract-decisions") return { ok: false, reason: "Available during contract decisions." };
  if (remainingContractYears(player, save.seasonYear) > 2) return { ok: false, reason: "Extension window opens with two years or fewer remaining." };
  return { ok: true };
}

export function extendPlayerContract(save: GameSave, playerId: string, teamId = save.selectedTeamId, options: { years?: number; apy?: number; security?: FreeAgentSecurityLevel; voidYears?: number } = {}): GameSave {
  const check = canExtendPlayerContract(save, playerId, teamId);
  if (!check.ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId)!;
  const current = player.contract!;
  const years = options.years ?? (player.age <= 27 ? 4 : player.age >= 31 ? 2 : 3);
  const apy = options.apy ?? money(suggestedApy(player) * (player.overall >= 72 ? 1.04 : 0.96));
  const extension = makeContract(player, current.endYear + 1, {
    origin: "extension",
    rights: "none",
    years,
    apy,
    security: options.security ?? "standard",
    voidYears: options.voidYears ?? (apy >= 12 && years >= 3 ? 1 : 0)
  });
  const contract: PlayerContract = {
    ...extension,
    startYear: current.startYear,
    years: current.years + extension.years,
    seasons: [
      ...current.seasons.filter((season) => season.seasonYear <= current.endYear),
      ...extension.seasons
    ],
    signingBonus: money(current.signingBonus + extension.signingBonus),
    guaranteedTotal: money(current.guaranteedTotal + extension.guaranteedTotal),
    totalValue: money(contractTotalValue(current) + contractTotalValue(extension)),
    origin: "extension",
    restructureHistory: current.restructureHistory ?? []
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? syncPlayerContractFields({ ...candidate, contract }, save.seasonYear) : candidate)
  });
}

export function canExerciseFifthYearOption(save: GameSave, playerId: string, teamId = save.selectedTeamId): { ok: boolean; reason?: string } {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
  if (!player?.contract) return { ok: false, reason: "No active contract." };
  if (save.phase !== "contract-decisions") return { ok: false, reason: "Available during contract decisions." };
  if (player.draftRound !== 1 || player.contract.origin !== "rookie") return { ok: false, reason: "Only first-round rookie contracts are eligible." };
  if (player.contract.fifthYearOption?.exercised || player.contract.seasons.some((season) => season.optionYear)) return { ok: false, reason: "Fifth-year option already exercised." };
  if (player.contract.endYear - save.seasonYear > 1) return { ok: false, reason: "Option window opens near the final rookie-contract seasons." };
  return { ok: true };
}

export function exerciseFifthYearOption(save: GameSave, playerId: string, teamId = save.selectedTeamId): GameSave {
  const check = canExerciseFifthYearOption(save, playerId, teamId);
  if (!check.ok) return save;
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId)!;
  const current = player.contract!;
  const optionYear = current.endYear + 1;
  const apy = money(Math.max(suggestedApy(player) * 0.78, player.salary * 1.18, 1.2));
  const optionSeason: ContractSeason = {
    seasonYear: optionYear,
    baseSalary: apy,
    signingBonusProration: 0,
    guaranteedSalary: apy,
    optionYear: true
  };
  const contract: PlayerContract = {
    ...current,
    endYear: optionYear,
    years: current.years + 1,
    totalValue: money(contractTotalValue(current) + apy),
    guaranteedTotal: money(current.guaranteedTotal + apy),
    seasons: [...current.seasons.filter((season) => !season.voidYear), optionSeason, ...current.seasons.filter((season) => season.voidYear).map((season) => ({ ...season, seasonYear: season.seasonYear + 1 }))],
    fifthYearOption: { eligible: true, exercised: true, seasonYear: optionYear, apy }
  };
  return recalculateBudgets({
    ...save,
    players: save.players.map((candidate) => candidate.id === playerId ? syncPlayerContractFields({ ...candidate, contract }, save.seasonYear) : candidate)
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
    if (contract.endYear > save.seasonYear) return syncPlayerContractFields({ ...player, contract }, save.seasonYear);
    return syncPlayerContractFields({
      ...player,
      contract: {
        ...contract,
        rights: freeAgentRightsFor(save, player)
      }
    }, save.seasonYear);
  });
  return normalizeCapState({ ...save, players, phase: "contract-decisions" });
}

export function advanceToFreeAgency(save: GameSave): GameSave {
  if (save.phase !== "contract-decisions") return save;
  let workingSave = save;
  const players = workingSave.players.map((player) => {
    if (player.teamId === FREE_AGENT_TEAM_ID) return player;
    const rights = player.contract?.rights ?? "none";
    if ((player.contract?.endYear ?? workingSave.seasonYear) > workingSave.seasonYear || rights === "none") return player;
    if (rights === "erfa") {
      const contract = makeContract(player, workingSave.seasonYear, { origin: "tender", rights: "none", years: 1, apy: TENDER_APY.erfa, signingBonus: 0, guaranteedTotal: TENDER_APY.erfa, tenderLevel: "erfa" });
      if (canFitContract(workingSave, player.teamId, contract, player.id)) return syncPlayerContractFields({ ...player, contract }, workingSave.seasonYear);
    }
    const voidDead = remainingBonusProration(player, workingSave.seasonYear + 1);
    if (voidDead > 0) workingSave = addDeadMoneyCharge(workingSave, player, player.teamId, "guarantee", { amount: voidDead });
    return {
      ...player,
      previousTeamId: player.teamId,
      teamId: FREE_AGENT_TEAM_ID,
      teamStartSeason: workingSave.seasonYear,
      contract: {
        ...player.contract!,
        rights
      }
    } as Player & { previousTeamId?: string };
  });
  return normalizeCapState(projectCompPicks({
    ...workingSave,
    players,
    phase: "free-agency",
    freeAgencyMarket: { seasonYear: workingSave.seasonYear, currentWave: 1, offers: [], decisions: [] },
    inbox: []
  }));
}

export function advanceToDraftPrep(save: GameSave): GameSave {
  if (save.phase !== "free-agency") return save;
  const projected = finalizeCompPicks(projectCompPicks(save));
  return normalizeCapState({
    ...projected,
    phase: "draft-prep",
    inbox: []
  });
}

export function teamHasCapCompliance(save: GameSave, teamId = save.selectedTeamId): boolean {
  return teamCapLedger(save, teamId).compliant;
}
