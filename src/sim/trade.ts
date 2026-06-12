import { createRng } from "../lib/rng";
import type {
  DraftPick,
  GameSave,
  Player,
  PlayerAvailability,
  Position,
  TeamTradeDirection,
  TradeAsset,
  TradeBlockEntry,
  TradeCapPreview,
  TradeDifficulty,
  TradeEvaluation,
  TradeHistoryEntry,
  TradeNewsItem,
  TradeOffer,
  TradeRosterPreview,
  TradeState,
  TradeValueBreakdown,
  TradeVerdict
} from "../types";
import { POSITIONS } from "../types";
import { activeRosterLimitForDate, leagueYearStartDate, tradeDeadlineDate } from "./calendar";
import { addDeadMoneyCharge, deadMoneyIfMoved, newTeamContractForAcquiredPlayer, playerCapHit, recalculateBudgets, teamCapLedger } from "./cap";
import { activeRosterSize, clearIrState, isOnIr } from "./ir";
import { isPracticeSquadPlayer } from "./practiceSquad";
import { versatilityBonus } from "./positionEligibility";
import { rosterNeeds, teamById, teamOverall } from "./selectors";

export const TRADE_DEADLINE_WEEK = 9;

export const tradeTuning = {
  positionPremium: {
    QB: 1.82,
    RB: 0.72,
    WR: 1.1,
    TE: 0.84,
    LT: 1.16,
    LG: 0.74,
    C: 0.8,
    RG: 0.74,
    RT: 1,
    EDGE: 1.26,
    DL: 1,
    LB: 0.86,
    CB: 1.18,
    S: 0.84,
    K: 0.28,
    P: 0.22
  } satisfies Record<Position, number>,
  pickBase: {
    1: 880,
    2: 420,
    3: 210,
    4: 115,
    5: 70,
    6: 42,
    7: 24
  } satisfies Record<number, number>,
  difficulty: {
    easy: { accept: 0.98, counter: 0.8, protection: 0.88 },
    normal: { accept: 1.08, counter: 0.88, protection: 1 },
    hard: { accept: 1.18, counter: 0.96, protection: 1.14 },
    realistic: { accept: 1.25, counter: 1.02, protection: 1.28 }
  } satisfies Record<TradeDifficulty, { accept: number; counter: number; protection: number }>
};

const needCache = new WeakMap<GameSave, Map<string, ReturnType<typeof rosterNeeds>>>();

function money(value: number): number {
  return Number(value.toFixed(2));
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function assetKey(asset: TradeAsset): string {
  return `${asset.type}:${asset.id}`;
}

function cachedRosterNeeds(save: GameSave, teamId: string): ReturnType<typeof rosterNeeds> {
  let teamMap = needCache.get(save);
  if (!teamMap) {
    teamMap = new Map();
    needCache.set(save, teamMap);
  }
  const existing = teamMap.get(teamId);
  if (existing) return existing;
  const needs = rosterNeeds(save, teamId);
  teamMap.set(teamId, needs);
  return needs;
}

function needMultiplier(save: GameSave, teamId: string, position: Position): number {
  const need = cachedRosterNeeds(save, teamId).find((item) => item.position === position);
  if (!need) return 1;
  if (need.grade < 52) return 1.24;
  if (need.grade < 60) return 1.11;
  if (need.grade > 74) return 0.82;
  return 1;
}

function playerContractMultiplier(player: Player): number {
  const years = player.contract?.years ?? player.contractYears;
  const apy = player.contract?.apy ?? player.salary;
  const contractControl = years >= 3 ? 1.08 : years === 1 ? 0.88 : 1;
  const salaryDrag = Math.max(0.46, 1 - apy / 92);
  const valueContract = player.overall >= 70 && apy <= 10 ? 1.18 : player.overall >= 64 && apy <= 5 ? 1.12 : 1;
  return contractControl * salaryDrag * valueContract;
}

function healthMultiplier(player: Player): number {
  if (isOnIr(player)) return 0.55;
  if (player.status === "injured") return 0.68;
  if (player.status === "limited") return 0.9;
  const injuryPenalty = Math.max(0, 64 - (player.medical ?? 64)) * 0.006;
  return Math.max(0.74, 1 - injuryPenalty);
}

export function teamTradeDirection(save: GameSave, teamId: string): TeamTradeDirection {
  const record = save.records[teamId];
  const games = (record?.wins ?? 0) + (record?.losses ?? 0) + (record?.ties ?? 0);
  const winPct = games ? ((record?.wins ?? 0) + (record?.ties ?? 0) * 0.5) / games : 0.5;
  const overall = teamOverall(save, teamId);
  const roster = save.players.filter((player) => player.teamId === teamId && !isPracticeSquadPlayer(player));
  const coreAge = roster
    .slice()
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 16)
    .reduce((sum, player) => sum + player.age, 0) / Math.max(1, Math.min(16, roster.length));
  const extraPicks = save.draftPicks.filter((pick) => pick.currentTeamId === teamId && pick.originalTeamId !== teamId && !pick.usedByProspectId).length;
  if (games >= 8 && winPct <= 0.2) return "tanking";
  if (overall >= 74 || (games >= 6 && winPct >= 0.72)) return "championship-contender";
  if (overall >= 66 || (games >= 6 && winPct >= 0.56)) return "playoff-contender";
  if (overall <= 52 || extraPicks >= 4) return "rebuilding";
  if (coreAge >= 29.5 || overall <= 58) return "retooling";
  return "average";
}

export function isTradeWindowOpen(save: GameSave): boolean {
  if (save.phase === "draft") return true;
  if (save.currentDate < leagueYearStartDate(save.seasonYear)) return false;
  if (save.currentDate > tradeDeadlineDate(save.seasonYear)) return false;
  return ["free-agency", "draft-prep", "udfa", "rookie-results", "rookie-onboarding", "offseason-complete", "preseason", "regular"].includes(save.phase);
}

function availabilityForPlayer(save: GameSave, player: Player): PlayerAvailability {
  const override = save.tradeState?.availabilityOverrides?.[player.id];
  if (override) return override;
  const direction = teamTradeDirection(save, player.teamId);
  const roster = save.players.filter((candidate) => candidate.teamId === player.teamId && candidate.position === player.position && !isPracticeSquadPlayer(candidate));
  const strongerReplacement = roster.some((candidate) => candidate.id !== player.id && candidate.overall >= player.overall - 2 && candidate.age <= player.age);
  const expiring = (player.contract?.endYear ?? save.seasonYear + player.contractYears - 1) <= save.seasonYear;
  const block = save.tradeState?.tradeBlock.find((entry) => entry.playerId === player.id);
  if (block) return block.availability;
  if (player.position === "QB" && player.overall >= 70 && player.age <= 32 && !strongerReplacement) return "untouchable";
  if (player.overall >= 78 && player.age <= 27 && player.salary <= 18) return "untouchable";
  if (player.overall >= 72 && player.age <= 25) return "hard-to-get";
  if (["rebuilding", "tanking", "retooling"].includes(direction) && (player.age >= 30 || expiring || player.salary >= 18)) return "available";
  if (strongerReplacement && player.age >= 26) return "available";
  if (player.age >= 32 || (expiring && direction !== "championship-contender")) return "available";
  return "neutral";
}

function availabilityMultiplier(availability: PlayerAvailability): number {
  if (availability === "actively-shopping") return 0.78;
  if (availability === "available") return 0.9;
  if (availability === "hard-to-get") return 1.28;
  if (availability === "untouchable") return 1.9;
  return 1;
}

function protectionMultiplier(save: GameSave, player: Player, givingTeamId: string): { multiplier: number; notes: string[] } {
  const notes: string[] = [];
  const direction = teamTradeDirection(save, givingTeamId);
  let multiplier = 1;
  const replacement = save.players.some((candidate) =>
    candidate.teamId === givingTeamId &&
    candidate.id !== player.id &&
    candidate.position === player.position &&
    candidate.overall >= player.overall - 3 &&
    candidate.age <= player.age
  );
  if (player.position === "QB" && player.overall >= 70) {
    multiplier *= player.age >= 34 || replacement || ["rebuilding", "tanking"].includes(direction) ? 1.7 : 3.2;
    notes.push("Franchise QB protection");
  }
  if (player.overall >= 78 && player.age <= 27) {
    multiplier *= 1.65;
    notes.push("Elite young star protection");
  }
  if (player.age <= 24 && player.potential >= 76 && player.salary <= 12) {
    multiplier *= 1.38;
    notes.push("Young cheap starter protection");
  }
  if (["championship-contender", "playoff-contender"].includes(direction) && player.overall >= 70 && !replacement) {
    multiplier *= 1.34;
    notes.push("Contender starter protection");
  }
  if (replacement || player.age >= 31 || (player.contract?.endYear ?? save.seasonYear) <= save.seasonYear) {
    multiplier *= 0.86;
  }
  return { multiplier, notes };
}

function projectedFutureSlot(save: GameSave, teamId: string): number {
  const ranked = [...save.teams]
    .map((team) => {
      const record = save.records[team.id];
      const wins = record?.wins ?? 0;
      const losses = record?.losses ?? 0;
      const grade = teamOverall(save, team.id);
      const ageDrag = save.players
        .filter((player) => player.teamId === team.id)
        .slice()
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 20)
        .reduce((sum, player) => sum + Math.max(0, player.age - 29) * 0.12, 0);
      return { teamId: team.id, strength: grade + wins * 1.7 - losses * 0.7 - ageDrag };
    })
    .sort((a, b) => a.strength - b.strength || a.teamId.localeCompare(b.teamId));
  return Math.max(1, ranked.findIndex((item) => item.teamId === teamId) + 1);
}

export function pickTradeValue(pick: DraftPick, save?: GameSave): number {
  const roundValue = tradeTuning.pickBase[pick.round as keyof typeof tradeTuning.pickBase] ?? 10;
  const currentDraftYear = save?.draftState?.draftYear ?? ((save?.seasonYear ?? 2026) + 1);
  const slot = save && pick.draftYear > currentDraftYear ? projectedFutureSlot(save, pick.originalTeamId) : pick.pickInRound ?? 16;
  const premium = pick.round === 1 ? Math.max(0.62, 1.38 - slot * 0.018) : Math.max(0.72, 1.16 - slot * 0.01);
  const futureDiscount = save && pick.draftYear > currentDraftYear ? Math.max(0.58, 0.9 - (pick.draftYear - currentDraftYear) * 0.08) : 1;
  return Math.round(roundValue * premium * futureDiscount);
}

function pickBreakdown(save: GameSave, pick: DraftPick, receivingTeamId: string, givingTeamId: string): TradeValueBreakdown {
  const direction = teamTradeDirection(save, givingTeamId);
  const base = pickTradeValue(pick, save);
  const need = ["rebuilding", "tanking", "retooling"].includes(teamTradeDirection(save, receivingTeamId)) ? 1.14 : 1;
  let protection = 1;
  const notes: string[] = [];
  if (pick.round === 1 && pick.draftYear > (save.draftState?.draftYear ?? save.seasonYear + 1)) {
    protection *= ["rebuilding", "tanking"].includes(direction) ? 1.65 : 1.24;
    notes.push("Future first protected");
  }
  if (pick.originalTeamId !== givingTeamId) {
    protection *= 0.92;
    notes.push("Extra pick");
  }
  const final = Math.round(base * need * protection);
  return {
    assetId: pick.id,
    assetType: "pick",
    label: `${pick.draftYear} R${pick.round}${pick.pickInRound ? `.${pick.pickInRound}` : ""}`,
    base,
    age: 1,
    position: 1,
    contract: 1,
    potential: 1,
    health: 1,
    need,
    availability: 1,
    protection,
    final,
    notes
  };
}

function playerBreakdown(save: GameSave, player: Player, receivingTeamId: string, givingTeamId = player.teamId, includeProtection = true): TradeValueBreakdown {
  const base = Math.pow(Math.max(0, player.overall - 35), 1.55);
  const age = player.age <= 24 ? 1.24 : player.age <= 28 ? 1.08 : player.age <= 31 ? 0.92 : 0.68;
  const position = tradeTuning.positionPremium[player.position];
  const contract = playerContractMultiplier(player);
  const potential = 1 + Math.max(-8, player.potential - player.overall) * 0.018;
  const health = healthMultiplier(player);
  const need = needMultiplier(save, receivingTeamId, player.position);
  const availability = availabilityMultiplier(availabilityForPlayer(save, player));
  const protectedValue = includeProtection ? protectionMultiplier(save, player, givingTeamId) : { multiplier: 1, notes: [] };
  const versatility = 1 + versatilityBonus(player) * 0.018;
  const final = Math.round(base * age * position * contract * potential * health * need * availability * protectedValue.multiplier * versatility);
  return {
    assetId: player.id,
    assetType: "player",
    label: `${playerName(player)} (${player.position})`,
    base: Math.round(base),
    age,
    position,
    contract,
    potential,
    health,
    need,
    availability,
    protection: protectedValue.multiplier,
    final,
    notes: protectedValue.notes
  };
}

export function playerTradeValue(save: GameSave, player: Player, receivingTeamId = player.teamId): number {
  return playerBreakdown(save, player, receivingTeamId, player.teamId, false).final;
}

function assetBreakdown(save: GameSave, asset: TradeAsset, receivingTeamId: string, givingTeamId: string, includeProtection = true): TradeValueBreakdown | undefined {
  if (asset.type === "player") {
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? playerBreakdown(save, player, receivingTeamId, givingTeamId, includeProtection) : undefined;
  }
  const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
  return pick ? pickBreakdown(save, pick, receivingTeamId, givingTeamId) : undefined;
}

function assetsBreakdown(save: GameSave, assets: TradeAsset[], receivingTeamId: string, givingTeamId: string, includeProtection = true): TradeValueBreakdown[] {
  return assets
    .map((asset) => assetBreakdown(save, asset, receivingTeamId, givingTeamId, includeProtection))
    .filter((row): row is TradeValueBreakdown => Boolean(row));
}

function sumBreakdown(rows: TradeValueBreakdown[]): number {
  return rows.reduce((sum, row) => sum + row.final, 0);
}

export function packageValue(save: GameSave, receivingTeamId: string, players: Player[], picks: DraftPick[]): number {
  const playerValue = players.reduce((sum, player) => sum + playerTradeValue(save, player, receivingTeamId), 0);
  const pickValue = picks.reduce((sum, pick) => sum + pickTradeValue(pick, save), 0);
  return Math.round(playerValue + pickValue);
}

export function tradeVerdict(incomingValue: number, outgoingValue: number): TradeVerdict {
  const ratio = incomingValue / Math.max(1, outgoingValue);
  if (ratio >= tradeTuning.difficulty.normal.accept) return "accept";
  if (ratio >= tradeTuning.difficulty.normal.counter) return "counter";
  return "decline";
}

export function normalizeTradeState(save: GameSave): TradeState {
  const previous = save.tradeState;
  const teamPreferences = Object.fromEntries(save.teams.map((team) => [
    team.id,
    previous?.teamPreferences?.[team.id] ?? {
      teamId: team.id,
      direction: teamTradeDirection({ ...save, tradeState: previous } as GameSave, team.id),
      updatedWeek: save.currentWeek
    }
  ]));
  return {
    difficulty: previous?.difficulty ?? "normal",
    offers: previous?.offers ?? [],
    history: previous?.history ?? [],
    news: previous?.news ?? [],
    tradeBlock: previous?.tradeBlock ?? [],
    availabilityOverrides: previous?.availabilityOverrides ?? {},
    teamPreferences,
    lastCpuOfferWeek: previous?.lastCpuOfferWeek
  };
}

function tradePlayersForAssets(save: GameSave, assets: TradeAsset[]): Player[] {
  return assets
    .filter((asset) => asset.type === "player")
    .map((asset) => save.players.find((player) => player.id === asset.id))
    .filter((player): player is Player => Boolean(player));
}

function tradePicksForAssets(save: GameSave, assets: TradeAsset[]): DraftPick[] {
  return assets
    .filter((asset) => asset.type === "pick")
    .map((asset) => save.draftPicks.find((pick) => pick.id === asset.id))
    .filter((pick): pick is DraftPick => Boolean(pick));
}

function removePlayerFromDepthOverrides(save: GameSave, teamId: string, playerId: string): GameSave["depthOverrides"] {
  const teamOverrides = save.depthOverrides?.[teamId] ?? {};
  const nextTeamOverrides = Object.fromEntries(
    Object.entries(teamOverrides).map(([position, orderedIds]) => [
      position,
      orderedIds?.filter((id) => id !== playerId)
    ])
  ) as Partial<Record<Position, string[]>>;
  return {
    ...(save.depthOverrides ?? {}),
    [teamId]: nextTeamOverrides
  };
}

function transferAsset(save: GameSave, asset: TradeAsset, fromTeamId: string, toTeamId: string): GameSave {
  if (asset.type === "pick") {
    return {
      ...save,
      draftPicks: save.draftPicks.map((pick) => (pick.id === asset.id ? { ...pick, currentTeamId: toTeamId } : pick))
    };
  }
  const player = save.players.find((candidate) => candidate.id === asset.id);
  if (!player) return save;
  let next = addDeadMoneyCharge(save, player, fromTeamId, "trade");
  const depthWithoutFormerTeam = removePlayerFromDepthOverrides(next, fromTeamId, asset.id);
  const depthWithoutBothTeams = removePlayerFromDepthOverrides({ ...next, depthOverrides: depthWithoutFormerTeam }, toTeamId, asset.id);
  next = {
    ...next,
    players: next.players.map((candidate) => (
      candidate.id === asset.id
        ? clearIrState({
          ...candidate,
          teamId: toTeamId,
          previousTeamId: fromTeamId,
          teamStartSeason: next.seasonYear,
          acquisitionSource: "trade" as const,
          contract: newTeamContractForAcquiredPlayer(candidate, next.seasonYear) ?? candidate.contract
        })
        : candidate
    )),
    depthOverrides: depthWithoutBothTeams
  };
  return recalculateBudgets(next);
}

function applyAssetsOnly(save: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">): GameSave {
  let next = save;
  for (const asset of offer.gives) next = transferAsset(next, asset, offer.fromTeamId, offer.toTeamId);
  for (const asset of offer.receives) next = transferAsset(next, asset, offer.toTeamId, offer.fromTeamId);
  return recalculateBudgets(next);
}

function rosterPreviewFor(save: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">, teamId: string): TradeRosterPreview {
  const outgoing = tradePlayersForAssets(save, teamId === offer.fromTeamId ? offer.gives : offer.receives).filter((player) => !isPracticeSquadPlayer(player) && !isOnIr(player));
  const incoming = tradePlayersForAssets(save, teamId === offer.fromTeamId ? offer.receives : offer.gives).filter((player) => !isPracticeSquadPlayer(player) && !isOnIr(player));
  const before = activeRosterSize(save, teamId);
  const after = before - outgoing.length + incoming.length;
  const maxRoster = activeRosterLimitForDate(save.seasonYear, save.currentDate);
  const warnings: string[] = [];
  const positionWarnings: string[] = [];
  if (after > maxRoster) warnings.push(`Roster would exceed ${maxRoster} active players.`);
  if (after < 45) warnings.push("Roster would fall below the 45-player minimum.");
  for (const position of POSITIONS) {
    const current = save.players.filter((player) => player.teamId === teamId && player.position === position && !isPracticeSquadPlayer(player) && !isOnIr(player)).length;
    const next = current - outgoing.filter((player) => player.position === position).length + incoming.filter((player) => player.position === position).length;
    const minimum = position === "QB" || position === "K" || position === "P" ? 1 : 0;
    if (next < minimum) positionWarnings.push(`No active ${position} would remain.`);
    const starterLoss = outgoing.some((player) => player.position === position && player.overall >= 64);
    const replacement = incoming.some((player) => player.position === position && player.overall >= 60) || save.players.some((player) => player.teamId === teamId && player.position === position && !outgoing.some((out) => out.id === player.id) && player.overall >= 60);
    if (starterLoss && !replacement) positionWarnings.push(`Starter-level ${position} depth would be exposed.`);
  }
  return { teamId, rosterBefore: before, rosterAfter: after, warnings, positionWarnings };
}

function capPreviewFor(save: GameSave, simulated: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">, teamId: string): TradeCapPreview {
  const incoming = tradePlayersForAssets(save, teamId === offer.fromTeamId ? offer.receives : offer.gives);
  const outgoing = tradePlayersForAssets(save, teamId === offer.fromTeamId ? offer.gives : offer.receives);
  const incomingCap = money(incoming.reduce((sum, player) => sum + playerCapHit(player, save.seasonYear), 0));
  const outgoingCap = money(outgoing.reduce((sum, player) => sum + playerCapHit(player, save.seasonYear), 0));
  const deadMoney = money(outgoing.reduce((sum, player) => sum + deadMoneyIfMoved(player, save.seasonYear), 0));
  const current = teamCapLedger(save, teamId);
  const projected = teamCapLedger(simulated, teamId);
  return {
    teamId,
    currentRoom: current.capRoom,
    incomingCap,
    outgoingCap,
    deadMoney,
    projectedRoom: projected.capRoom,
    compliant: projected.compliant
  };
}

function validateTrade(save: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">): string[] {
  const blocks: string[] = [];
  if (offer.fromTeamId === offer.toTeamId) blocks.push("A trade requires two different teams.");
  if (!save.teams.some((team) => team.id === offer.fromTeamId) || !save.teams.some((team) => team.id === offer.toTeamId)) blocks.push("A trade team no longer exists.");
  if (!isTradeWindowOpen(save)) blocks.push("The trade window is closed.");
  const allAssets = [...offer.gives, ...offer.receives];
  const seen = new Set<string>();
  for (const asset of allAssets) {
    const key = assetKey(asset);
    if (seen.has(key)) blocks.push("An asset is duplicated in the trade.");
    seen.add(key);
  }
  const givesPlayers = new Set(offer.gives.filter((asset) => asset.type === "player").map((asset) => asset.id));
  if (offer.receives.some((asset) => asset.type === "player" && givesPlayers.has(asset.id))) blocks.push("A player appears on both sides of the trade.");
  for (const [assets, ownerTeamId] of [[offer.gives, offer.fromTeamId], [offer.receives, offer.toTeamId]] as const) {
    for (const asset of assets) {
      if (asset.type === "pick") {
        const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
        if (!pick) blocks.push("A draft pick no longer exists.");
        else if (pick.currentTeamId !== ownerTeamId) blocks.push("A team does not own a draft pick being traded.");
        else if (pick.usedByProspectId) blocks.push("A used draft pick cannot be traded.");
      } else {
        const player = save.players.find((candidate) => candidate.id === asset.id);
        if (!player) blocks.push("A player no longer exists.");
        else if (player.teamId !== ownerTeamId) blocks.push("A team does not control a player being traded.");
        else if (isPracticeSquadPlayer(player)) blocks.push("Practice squad players must be promoted before being traded.");
        else if (player.teamId === "FA") blocks.push("Free agents cannot be traded.");
      }
    }
  }
  const rosterPreviews = [rosterPreviewFor(save, offer, offer.fromTeamId), rosterPreviewFor(save, offer, offer.toTeamId)];
  for (const preview of rosterPreviews) blocks.push(...preview.warnings, ...preview.positionWarnings.filter((warning) => warning.startsWith("No active")));
  const simulated = applyAssetsOnly(save, offer);
  for (const teamId of [offer.fromTeamId, offer.toTeamId]) {
    if (!teamCapLedger(simulated, teamId).compliant) blocks.push(`${teamById(save, teamId).abbreviation} would exceed the salary cap.`);
  }
  return [...new Set(blocks)];
}

function packageQualityPenalty(incoming: TradeValueBreakdown[], outgoing: TradeValueBreakdown[]): { penalty: number; reasons: string[] } {
  const reasons: string[] = [];
  let penalty = 1;
  const outgoingPremium = outgoing.some((row) => row.final >= 760 || (row.assetType === "pick" && row.label.includes("R1")));
  const incomingPremium = incoming.some((row) => row.final >= 620 || (row.assetType === "pick" && row.label.includes("R1")));
  const weakAssetCount = incoming.filter((row) => row.final < 150).length;
  if (outgoingPremium && !incomingPremium) {
    penalty *= 0.72;
    reasons.push("Premium assets usually require premium assets in return.");
  }
  if (outgoingPremium && weakAssetCount >= 3) {
    penalty *= 0.82;
    reasons.push("Many low-value assets do not equal one premium asset.");
  }
  return { penalty, reasons };
}

function buildCounterOffers(save: GameSave, offer: TradeOffer, hardBlocks: string[], incomingValue: number, outgoingValue: number): TradeOffer[] {
  if (hardBlocks.length || incomingValue / Math.max(1, outgoingValue) < 0.72) return [];
  const counters: TradeOffer[] = [];
  const existingIds = new Set(offer.gives.map((asset) => asset.id));
  const extraPick = save.draftPicks
    .filter((pick) => pick.currentTeamId === offer.fromTeamId && !pick.usedByProspectId && !existingIds.has(pick.id))
    .sort((a, b) => a.draftYear - b.draftYear || a.round - b.round || a.pickInRound - b.pickInRound)
    .find((pick) => pick.round >= 3) ??
    save.draftPicks
      .filter((pick) => pick.currentTeamId === offer.fromTeamId && !pick.usedByProspectId && !existingIds.has(pick.id))
      .sort((a, b) => a.draftYear - b.draftYear || a.round - b.round || a.pickInRound - b.pickInRound)[0];
  if (extraPick) {
    const gives = [...offer.gives, { type: "pick" as const, id: extraPick.id }];
    const counter = createTradeOffer(save, offer.fromTeamId, offer.toTeamId, gives, offer.receives, "cpu", {
      id: `${offer.id}-counter-pick`,
      parentOfferId: offer.id,
      message: `${teamById(save, offer.toTeamId).abbreviation} counters by asking for an added ${extraPick.draftYear} round ${extraPick.round} pick.`
    }, false);
    counters.push(counter);
  }
  const protectedOutgoing = offer.receives.find((asset) => {
    if (asset.type !== "player") return false;
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? availabilityForPlayer(save, player) === "untouchable" || playerBreakdown(save, player, offer.fromTeamId, offer.toTeamId, true).protection >= 1.6 : false;
  });
  if (protectedOutgoing && offer.receives.length > 1) {
    const receives = offer.receives.filter((asset) => asset.id !== protectedOutgoing.id);
    const counter = createTradeOffer(save, offer.fromTeamId, offer.toTeamId, offer.gives, receives, "cpu", {
      id: `${offer.id}-counter-protection`,
      parentOfferId: offer.id,
      message: `${teamById(save, offer.toTeamId).abbreviation} removes a protected player from the deal.`
    }, false);
    counters.push(counter);
  }
  return counters.slice(0, 3);
}

export function evaluateTradeOffer(save: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">, withCounters = true): TradeEvaluation {
  const hardBlocks = validateTrade(save, offer);
  const incomingBreakdown = assetsBreakdown(save, offer.gives, offer.toTeamId, offer.fromTeamId, false);
  const outgoingBreakdown = assetsBreakdown(save, offer.receives, offer.fromTeamId, offer.toTeamId, true);
  const quality = packageQualityPenalty(incomingBreakdown, outgoingBreakdown);
  const difficulty = tradeTuning.difficulty[save.tradeState?.difficulty ?? "normal"];
  const incomingValue = Math.round(sumBreakdown(incomingBreakdown) * quality.penalty);
  const outgoingValue = sumBreakdown(outgoingBreakdown);
  const ratio = incomingValue / Math.max(1, outgoingValue);
  const simulated = applyAssetsOnly(save, offer);
  const capPreview = [capPreviewFor(save, simulated, offer, offer.fromTeamId), capPreviewFor(save, simulated, offer, offer.toTeamId)];
  const rosterPreview = [rosterPreviewFor(save, offer, offer.fromTeamId), rosterPreviewFor(save, offer, offer.toTeamId)];
  const reasons = [...quality.reasons];
  for (const row of outgoingBreakdown) reasons.push(...row.notes);
  if (ratio >= difficulty.accept) reasons.unshift("The package clearly beats our valuation.");
  else if (ratio >= difficulty.counter) reasons.unshift("The value is close enough to discuss.");
  else reasons.unshift("The package does not meet our team-building threshold.");
  if (rosterPreview.some((preview) => preview.positionWarnings.length)) reasons.push("Roster impact is part of the decision.");
  let verdict: TradeVerdict = "decline";
  if (!hardBlocks.length && ratio >= difficulty.accept) verdict = "accept";
  else if (!hardBlocks.length && ratio >= difficulty.counter) verdict = "counter";
  const interest = Math.round(Math.max(0, Math.min(100, ratio * 72 - hardBlocks.length * 30 + (verdict === "accept" ? 18 : verdict === "counter" ? 8 : 0))));
  const shell = {
    id: `eval-${save.currentWeek}-${offer.fromTeamId}-${offer.toTeamId}`,
    fromTeamId: offer.fromTeamId,
    toTeamId: offer.toTeamId,
    gives: offer.gives,
    receives: offer.receives,
    status: "submitted" as const,
    source: "user" as const,
    createdWeek: save.currentWeek,
    createdDate: save.currentDate,
    message: ""
  };
  const evaluation: TradeEvaluation = {
    verdict,
    interest,
    incomingValue,
    outgoingValue,
    valueGap: incomingValue - outgoingValue,
    reasons: [...new Set(reasons)].slice(0, 8),
    hardBlocks: [...new Set(hardBlocks)],
    capPreview,
    rosterPreview,
    incomingBreakdown,
    outgoingBreakdown
  };
  if (withCounters && verdict === "counter") {
    evaluation.counterOffers = buildCounterOffers(save, { ...shell, evaluation }, evaluation.hardBlocks, incomingValue, outgoingValue);
  }
  return evaluation;
}

export function createTradeOffer(
  save: GameSave,
  fromTeamId: string,
  toTeamId: string,
  gives: TradeAsset[],
  receives: TradeAsset[],
  source: TradeOffer["source"] = "user",
  options: Partial<Pick<TradeOffer, "id" | "message" | "rationale" | "parentOfferId">> = {},
  withCounters = true
): TradeOffer {
  const tradeSave = { ...save, tradeState: normalizeTradeState(save) };
  const base = {
    fromTeamId,
    toTeamId,
    gives,
    receives
  };
  const evaluation = evaluateTradeOffer(tradeSave, base, withCounters);
  return {
    id: options.id ?? `trade-${tradeSave.seasonYear}-${tradeSave.currentWeek}-${fromTeamId}-${toTeamId}-${tradeSave.tradeState!.offers.length}`,
    ...base,
    status: "submitted",
    source,
    createdWeek: tradeSave.currentWeek,
    createdDate: tradeSave.currentDate,
    message: options.message ?? evaluation.hardBlocks[0] ?? evaluation.reasons[0] ?? "Trade submitted.",
    rationale: options.rationale,
    evaluation,
    parentOfferId: options.parentOfferId
  };
}

function assetLabel(save: GameSave, asset: TradeAsset): string {
  if (asset.type === "player") {
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? `${playerName(player)} (${player.position})` : asset.id;
  }
  const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
  return pick ? `${pick.draftYear} R${pick.round}` : asset.id;
}

function tradeSummary(save: GameSave, offer: Pick<TradeOffer, "fromTeamId" | "toTeamId" | "gives" | "receives">): string {
  const from = teamById(save, offer.fromTeamId).abbreviation;
  const to = teamById(save, offer.toTeamId).abbreviation;
  const gives = offer.gives.map((asset) => assetLabel(save, asset)).join(", ") || "nothing";
  const receives = offer.receives.map((asset) => assetLabel(save, asset)).join(", ") || "nothing";
  return `${from} sends ${gives} to ${to} for ${receives}.`;
}

function tradeNewsFor(save: GameSave, offer: TradeOffer): TradeNewsItem {
  const players = [...tradePlayersForAssets(save, offer.gives), ...tradePlayersForAssets(save, offer.receives)];
  const best = players.slice().sort((a, b) => b.overall - a.overall)[0];
  const hasFirst = [...offer.gives, ...offer.receives].some((asset) => {
    const pick = asset.type === "pick" ? save.draftPicks.find((candidate) => candidate.id === asset.id) : undefined;
    return pick?.round === 1;
  });
  const importance: TradeNewsItem["importance"] = best?.position === "QB" && best.overall >= 70 ? "blockbuster" : best && best.overall >= 76 ? "major" : hasFirst ? "notable" : "minor";
  return {
    id: `trade-news-${offer.id}`,
    seasonYear: save.seasonYear,
    week: save.currentWeek,
    date: save.currentDate,
    title: importance === "blockbuster" ? "Blockbuster trade shakes the league" : importance === "major" ? "Major starter changes teams" : "Trade completed",
    body: tradeSummary(save, offer),
    importance,
    teamIds: [offer.fromTeamId, offer.toTeamId],
    playerIds: players.map((player) => player.id)
  };
}

export function applyAcceptedTrade(save: GameSave, offer: TradeOffer): GameSave {
  const tradeSave = { ...save, tradeState: normalizeTradeState(save) };
  const evaluation = evaluateTradeOffer(tradeSave, offer, false);
  const acceptedOffer: TradeOffer = { ...offer, evaluation, status: evaluation.verdict === "accept" && !evaluation.hardBlocks.length ? "accepted" : evaluation.verdict === "counter" ? "countered" : "declined" };
  if (acceptedOffer.status !== "accepted") {
    return {
      ...tradeSave,
      tradeState: {
        ...tradeSave.tradeState!,
        offers: [acceptedOffer, ...tradeSave.tradeState!.offers.filter((candidate) => candidate.id !== offer.id)].slice(0, 80)
      }
    };
  }
  let next = applyAssetsOnly(tradeSave, acceptedOffer);
  const history: TradeHistoryEntry = {
    id: `trade-history-${acceptedOffer.id}`,
    seasonYear: next.seasonYear,
    week: next.currentWeek,
    date: next.currentDate,
    fromTeamId: acceptedOffer.fromTeamId,
    toTeamId: acceptedOffer.toTeamId,
    gives: acceptedOffer.gives,
    receives: acceptedOffer.receives,
    summary: tradeSummary(tradeSave, acceptedOffer),
    source: acceptedOffer.source,
    capImpact: acceptedOffer.evaluation.capPreview
  };
  const news = tradeNewsFor(tradeSave, acceptedOffer);
  next = {
    ...next,
    tradeState: {
      ...normalizeTradeState(next),
      offers: [acceptedOffer, ...normalizeTradeState(next).offers.filter((candidate) => candidate.id !== acceptedOffer.id)].slice(0, 80),
      history: [history, ...normalizeTradeState(next).history].slice(0, 120),
      news: [news, ...normalizeTradeState(next).news].slice(0, 80)
    },
    inbox: []
  };
  return recalculateBudgets(next);
}

export function submitTradeOffer(save: GameSave, offer: TradeOffer): GameSave {
  const tradeSave = { ...save, tradeState: normalizeTradeState(save) };
  const evaluated = { ...offer, evaluation: evaluateTradeOffer(tradeSave, offer, true) };
  if (evaluated.evaluation.verdict === "accept") return applyAcceptedTrade(tradeSave, evaluated);
  const status: TradeOffer["status"] = evaluated.evaluation.verdict === "counter" ? "countered" : "declined";
  return {
    ...tradeSave,
    tradeState: {
      ...tradeSave.tradeState!,
      offers: [{ ...evaluated, status }, ...tradeSave.tradeState!.offers.filter((candidate) => candidate.id !== evaluated.id)].slice(0, 80)
    },
    inbox: []
  };
}

export function toggleUserTradeBlock(save: GameSave, playerId: string): GameSave {
  const tradeState = normalizeTradeState(save);
  const player = save.players.find((candidate) => candidate.id === playerId);
  if (!player) return { ...save, tradeState };
  const existing = tradeState.tradeBlock.find((entry) => entry.playerId === playerId && entry.userMarked);
  const tradeBlock = existing
    ? tradeState.tradeBlock.filter((entry) => entry !== existing)
    : [{
      playerId,
      teamId: player.teamId,
      availability: "actively-shopping" as PlayerAvailability,
      reason: "User trade block",
      updatedWeek: save.currentWeek,
      userMarked: true
    }, ...tradeState.tradeBlock];
  return { ...save, tradeState: { ...tradeState, tradeBlock } };
}

function generateTradeBlockForTeams(save: GameSave, teamIds?: Set<string>): TradeBlockEntry[] {
  const tradeState = normalizeTradeState(save);
  const userEntries = tradeState.tradeBlock.filter((entry) => entry.userMarked && (!teamIds || teamIds.has(entry.teamId)));
  const cpuEntries = save.players
    .filter((player) => player.teamId !== "FA" && !isPracticeSquadPlayer(player))
    .filter((player) => !teamIds || teamIds.has(player.teamId))
    .map((player): TradeBlockEntry | undefined => {
      const availability = availabilityForPlayer({ ...save, tradeState } as GameSave, player);
      if (availability !== "available" && availability !== "actively-shopping") return undefined;
      return {
        playerId: player.id,
        teamId: player.teamId,
        availability,
        reason: player.age >= 31 ? "Aging veteran" : player.salary >= 18 ? "Cap flexibility" : "Depth chart fit",
        updatedWeek: save.currentWeek
      };
    })
    .filter((entry): entry is TradeBlockEntry => Boolean(entry))
    .slice(0, 80);
  const seen = new Set<string>();
  return [...userEntries, ...cpuEntries].filter((entry) => {
    if (seen.has(entry.playerId)) return false;
    seen.add(entry.playerId);
    return true;
  });
}

export function generateTradeBlock(save: GameSave): TradeBlockEntry[] {
  return generateTradeBlockForTeams(save);
}

function bestPickPackage(save: GameSave, teamId: string, targetTeamId: string, targetValue: number): TradeAsset[] {
  const assets: TradeAsset[] = [];
  const picks = save.draftPicks
    .filter((pick) => pick.currentTeamId === teamId && !pick.usedByProspectId)
    .sort((a, b) => a.draftYear - b.draftYear || a.round - b.round || a.pickInRound - b.pickInRound);
  for (const pick of picks) {
    if (pick.round === 1 && teamTradeDirection(save, teamId) === "rebuilding") continue;
    assets.push({ type: "pick", id: pick.id });
    const value = sumBreakdown(assetsBreakdown(save, assets, targetTeamId, teamId, true));
    if (value >= targetValue * 1.08 || assets.length >= 3) break;
  }
  return assets;
}

export function generateIncomingTradeOffers(save: GameSave, tradeBlockOverride?: TradeBlockEntry[]): TradeOffer[] {
  const tradeState = normalizeTradeState(save);
  if (!isTradeWindowOpen(save)) return [];
  const rng = createRng(`${save.seed}:incoming-trades:${save.seasonYear}:${save.currentWeek}:${save.currentDate}`);
  const userBlock = (tradeBlockOverride ?? generateTradeBlock({ ...save, tradeState })).filter((entry) => entry.teamId === save.selectedTeamId);
  const offers: TradeOffer[] = [];
  for (const entry of rng.shuffle(userBlock).slice(0, 2)) {
    const player = save.players.find((candidate) => candidate.id === entry.playerId);
    if (!player) continue;
    const buyer = save.teams
      .filter((team) => team.id !== save.selectedTeamId)
      .map((team) => ({
        team,
        score: needMultiplier(save, team.id, player.position) * 40 + (["championship-contender", "playoff-contender"].includes(teamTradeDirection(save, team.id)) ? 18 : 0) + rng.float(-8, 8)
      }))
      .sort((a, b) => b.score - a.score)[0]?.team;
    if (!buyer) continue;
    const targetValue = playerBreakdown(save, player, buyer.id, save.selectedTeamId, false).final;
    const gives = bestPickPackage(save, buyer.id, save.selectedTeamId, targetValue);
    if (!gives.length) continue;
    const offer = createTradeOffer(save, buyer.id, save.selectedTeamId, gives, [{ type: "player", id: player.id }], "cpu", {
      id: `incoming-${save.seasonYear}-${save.currentWeek}-${buyer.id}-${player.id}`,
      message: `${teamById(save, buyer.id).abbreviation} is interested in ${playerName(player)}.`
    });
    if (offer.evaluation.verdict !== "decline") offers.push(offer);
  }
  return offers;
}

export function refreshTradeActivity(save: GameSave): GameSave {
  const tradeState = normalizeTradeState(save);
  const shouldGenerate = isTradeWindowOpen(save) && tradeState.lastCpuOfferWeek !== save.currentWeek;
  if (!shouldGenerate) {
    return save.tradeState ? save : { ...save, tradeState };
  }
  const incomingBlock = generateTradeBlockForTeams({ ...save, tradeState }, new Set([save.selectedTeamId]));
  const incoming = generateIncomingTradeOffers({ ...save, tradeState: { ...tradeState, tradeBlock: incomingBlock } }, incomingBlock);
  return {
    ...save,
    tradeState: {
      ...tradeState,
      tradeBlock: tradeState.tradeBlock.length ? tradeState.tradeBlock : incomingBlock,
      offers: [...incoming, ...tradeState.offers].slice(0, 80),
      lastCpuOfferWeek: shouldGenerate ? save.currentWeek : tradeState.lastCpuOfferWeek
    }
  };
}
