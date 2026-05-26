import { clamp, createRng, slugify } from "../lib/rng";
import { POSITIONS } from "../types";
import type { DraftEvent, DraftPick, DraftSelection, DraftState, DraftTradeAsset, DraftTradeOffer, GameSave, Player, PlayerStats, Position, Prospect, TeamRecord } from "../types";
import { addDeadMoneyCharge, finalizeCompPicks, makeContract, newTeamContractForAcquiredPlayer, recalculateBudgets } from "./cap";
import { prospectMakeup, teamConcernAdjustment } from "./concerns";
import { calibratePotential, calculateOverallFromRatings, legacyAttributesFromRatings } from "./ratings";
import { rosterNeeds, teamById, teamOverall } from "./selectors";
import { coachDevelopmentGrade } from "./staff";
import { clearIrState } from "./ir";
import { packageValue, pickTradeValue, playerTradeValue, tradeVerdict } from "./trade";
import { runAnnualDevelopment } from "./development";
import { isPlayablePlayer } from "./personnel";
import { normalizePlayerModel } from "./playerModel";
import { postseasonDraftRank } from "./postseason";
import { eligiblePositionsFor, normalizePositionFits, versatilityBonus } from "./positionEligibility";
import { positionDraftValue } from "./scouting";

const DRAFT_YEAR = 2027;
const rosterNeedCache = new WeakMap<GameSave, Map<string, ReturnType<typeof rosterNeeds>>>();

function cachedRosterNeeds(save: GameSave, teamId: string): ReturnType<typeof rosterNeeds> {
  let teamMap = rosterNeedCache.get(save);
  if (!teamMap) {
    teamMap = new Map();
    rosterNeedCache.set(save, teamMap);
  }
  const existing = teamMap.get(teamId);
  if (existing) return existing;
  const needs = rosterNeeds(save, teamId);
  teamMap.set(teamId, needs);
  return needs;
}

export function draftPickTimeLimit(round: number): number {
  if (round === 1) return 180;
  if (round === 2) return 120;
  return 60;
}

function keepDraftEvents(events: DraftEvent[]): DraftEvent[] {
  return events.filter((event) => event.type !== "surprise" && event.title !== "Top prospect still waiting");
}

function keepDraftOffers(offers: DraftTradeOffer[]): DraftTradeOffer[] {
  return offers;
}

export function completedDraftTrades(save: GameSave): DraftTradeOffer[] {
  return ensureDraftState(save).draftState.tradeOffers.filter((offer) => offer.status === "accepted" && (offer.gives.length > 0 || offer.receives.length > 0));
}

function formatAssets(save: GameSave, assets: DraftTradeAsset[]): string {
  return assets.map((asset) => {
    if (asset.type === "pick") {
      const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
      return pick ? `${pick.draftYear} R${pick.round}.${pick.pickInRound} ${teamById(save, pick.originalTeamId).abbreviation}` : asset.id;
    }
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? `${player.position} ${player.firstName[0]}. ${player.lastName}` : asset.id;
  }).join(", ");
}

function makeDraftEvent(save: GameSave, type: DraftEvent["type"], title: string, message: string, interrupt: boolean, extras: Partial<DraftEvent> = {}): DraftEvent {
  return {
    id: `draft-event-${type}-${save.draftState?.history?.length ?? 0}-${save.draftState?.eventLog?.length ?? 0}-${extras.offerId ?? extras.pickId ?? ""}`,
    type,
    title,
    message,
    interrupt,
    week: save.currentWeek,
    ...extras
  };
}

function cloneSave(save: GameSave): GameSave {
  return JSON.parse(JSON.stringify(save)) as GameSave;
}

function winningPct(record: TeamRecord): number {
  const total = record.wins + record.losses + record.ties;
  if (!total) return 0;
  return (record.wins + record.ties * 0.5) / total;
}

function draftRank(save: GameSave): string[] {
  const postseasonRank = postseasonDraftRank(save);
  if (postseasonRank.length === save.teams.length) return postseasonRank;
  return [...save.teams]
    .sort((a, b) => {
      const aRecord = save.records[a.id];
      const bRecord = save.records[b.id];
      const pct = winningPct(aRecord) - winningPct(bRecord);
      if (pct !== 0) return pct;
      const aDiff = aRecord.pointsFor - aRecord.pointsAgainst;
      const bDiff = bRecord.pointsFor - bRecord.pointsAgainst;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.id.localeCompare(b.id);
    })
    .map((team) => team.id);
}

function normalizeDraftPicks(save: GameSave): DraftPick[] {
  const currentYear = save.draftState?.draftYear ?? save.draftPicks[0]?.draftYear ?? DRAFT_YEAR;
  const rank = draftRank(save);
  const rankByTeam = new Map(rank.map((teamId, index) => [teamId, index + 1]));
  const existing = new Map(save.draftPicks.map((pick) => [pick.id, pick]));
  const futureYear = currentYear + 1;
  for (const team of save.teams) {
    for (let round = 1; round <= 7; round += 1) {
      const id = `${futureYear}-${round}-${team.id}`;
      if (!existing.has(id)) {
        const pickInRound = save.teams.findIndex((candidate) => candidate.id === team.id) + 1;
        existing.set(id, {
          id,
          draftYear: futureYear,
          round,
          pickInRound,
          overallPick: (round - 1) * save.teams.length + pickInRound,
          originalTeamId: team.id,
          currentTeamId: team.id
        });
      }
    }
  }
  const normalized = [...existing.values()].map((pick) => {
    if (pick.compensatory) {
      return {
        ...pick,
        id: pick.id ?? `comp-${pick.draftYear ?? DRAFT_YEAR}-${pick.round}-${pick.originalTeamId}`,
        draftYear: pick.draftYear ?? DRAFT_YEAR,
        pickInRound: pick.pickInRound ?? save.teams.length + 1,
        overallPick: pick.overallPick ?? (pick.round - 1) * save.teams.length + (pick.pickInRound ?? save.teams.length + 1),
        compensatory: true,
        compSource: pick.compSource ?? "ledger"
      };
    }
    const round = pick.round;
    const pickInRound = pick.draftYear === currentYear ? rankByTeam.get(pick.originalTeamId) ?? pick.pickInRound ?? 1 : pick.pickInRound ?? 16;
    const overallPick = (round - 1) * save.teams.length + pickInRound;
    return {
      id: pick.id ?? `${pick.draftYear ?? DRAFT_YEAR}-${round}-${pick.originalTeamId}`,
      draftYear: pick.draftYear ?? DRAFT_YEAR,
      round,
      pickInRound,
      overallPick,
      originalTeamId: pick.originalTeamId,
      currentTeamId: pick.currentTeamId,
      usedByProspectId: pick.usedByProspectId,
      compensatory: pick.compensatory,
      compSource: pick.compSource,
      compLabel: pick.compLabel
    };
  });
  const years = [...new Set(normalized.map((pick) => pick.draftYear))];
  return years.flatMap((draftYear) =>
    normalized
      .filter((pick) => pick.draftYear === draftYear)
      .sort((a, b) => a.round - b.round || a.pickInRound - b.pickInRound || a.originalTeamId.localeCompare(b.originalTeamId))
      .map((pick, index) => ({ ...pick, overallPick: index + 1 }))
  );
}

export function ensureDraftState(save: GameSave): GameSave {
  const draftPicks = normalizeDraftPicks(save);
  const previous = save.draftState;
  const draftYear = previous?.draftYear ?? draftPicks.find((pick) => pick.draftYear === DRAFT_YEAR)?.draftYear ?? DRAFT_YEAR;
  const order = draftPicks.filter((pick) => pick.draftYear === draftYear).sort((a, b) => a.overallPick - b.overallPick).map((pick) => pick.id);
  const history = previous?.history ?? [];
  const used = new Set(history.map((selection) => selection.pickId));
  const currentPickIndex = previous ? Math.max(previous.currentPickIndex, order.findIndex((pickId) => !used.has(pickId))) : order.findIndex((pickId) => !used.has(pickId));
  const currentPick = draftPicks.find((pick) => pick.id === order[currentPickIndex < 0 ? order.length : currentPickIndex]);
  const pickTimeLimit = currentPick ? draftPickTimeLimit(currentPick.round) : previous?.pickTimeLimit ?? 60;
  const pendingEvent = previous?.pendingEvent?.type === "surprise" || previous?.pendingEvent?.title === "Top prospect still waiting" ? undefined : previous?.pendingEvent;
  const draftState: DraftState = {
    draftYear,
    order,
    currentPickIndex: currentPickIndex < 0 ? order.length : currentPickIndex,
    history,
    tradeOffers: previous?.tradeOffers ?? [],
    tradeLog: previous?.tradeLog ?? [],
    eventLog: keepDraftEvents(previous?.eventLog ?? []),
    pendingEvent,
    clockSeconds: Math.min(previous?.clockSeconds ?? pickTimeLimit, pickTimeLimit),
    pickTimeLimit,
    simSpeed: previous?.simSpeed ?? 1,
    skipCpuTradeNotifications: previous?.skipCpuTradeNotifications ?? false,
    completed: previous?.completed ?? history.length >= order.length
  };
  return { ...save, draftPicks, draftState };
}

export function enterDraft(save: GameSave): GameSave {
  const next = ensureDraftState(finalizeCompPicks(save));
  if (next.phase !== "draft-prep") return next;
  return {
    ...next,
    phase: "draft",
    inbox: [
      {
        id: `draft-open-${next.currentWeek}-${next.inbox.length}`,
        week: next.currentWeek,
        category: "draft",
        title: "Draft room is live",
        body: "The board is locked, phones are open, and the draft can now move pick by pick.",
        priority: "high",
        read: false
      },
      ...next.inbox
    ]
  };
}

export function currentDraftPick(save: GameSave): DraftPick | undefined {
  const next = ensureDraftState(save);
  const pickId = next.draftState.order[next.draftState.currentPickIndex];
  return next.draftPicks.find((pick) => pick.id === pickId);
}

function syncDraftClock(save: GameSave, previousPickId?: string): GameSave {
  const next = ensureDraftState(save);
  const pick = currentDraftPick(next);
  if (!pick) return next;
  const limit = draftPickTimeLimit(pick.round);
  const samePick = previousPickId === pick.id;
  return {
    ...next,
    draftState: {
      ...next.draftState,
      pickTimeLimit: limit,
      clockSeconds: samePick ? Math.min(next.draftState.clockSeconds, limit) : limit
    }
  };
}

function availableProspects(save: GameSave): Prospect[] {
  const selected = new Set(save.draftState?.history?.map((selection) => selection.prospectId) ?? []);
  return save.prospects.filter((prospect) => !selected.has(prospect.id));
}

function positionPremium(position: Position): number {
  return positionDraftValue(position);
}

function prospectDraftScore(prospect: Prospect, needGrades: Map<Position, number>, rngSeed: string): number {
  const need = needGrades.get(prospect.position) ?? 60;
  const needBoost = clamp(64 - need, -7, 22);
  const medicalRange = prospect.scouted.concerns?.medical ?? [prospect.medical, prospect.medical];
  const characterRange = prospect.scouted.concerns?.character ?? [prospect.character, prospect.character];
  const workRange = prospect.scouted.concerns?.workEthic ?? [prospect.workEthic, prospect.workEthic];
  const riskPenalty = prospect.riskFlags.length * 0.55 - teamConcernAdjustment({ medical: medicalRange, character: characterRange, workEthic: workRange });
  const rng = createRng(rngSeed);
  return (
    prospect.consensusGrade * 0.52 +
    prospect.teamGrade * 0.18 +
    prospect.scouted.high * 0.1 +
    (prospect.scouted.potentialHigh ?? prospect.potential) * 0.08 +
    prospect.stock * 0.1 +
    needBoost +
    positionPremium(prospect.position) * 0.4 -
    riskPenalty +
    versatilityBonus(prospect) * 0.35 +
    rng.float(-2.2, 2.2)
  );
}

function chooseCpuProspect(save: GameSave, teamId: string, pick: DraftPick): Prospect | undefined {
  const needGrades = new Map(cachedRosterNeeds(save, teamId).map((need) => [need.position, need.grade]));
  const candidates = availableProspects(save)
    .slice()
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .slice(0, 180)
    .map((prospect) => ({
      prospect,
      score: prospectDraftScore(prospect, needGrades, `${save.seed}:${pick.id}:${prospect.id}`)
    }));
  return candidates.sort((a, b) => b.score - a.score)[0]?.prospect;
}

export function draftRoomNeeds(save: GameSave, teamId: string): Array<{ position: Position; grade: number; urgency: number; drafted: number }> {
  const baseNeeds = new Map(cachedRosterNeeds(save, teamId).map((need) => [need.position, need.grade]));
  const drafted = new Map<Position, { count: number; credit: number }>();
  for (const selection of save.draftState?.history ?? []) {
    if (selection.teamId !== teamId) continue;
    const prospect = save.prospects.find((candidate) => candidate.id === selection.prospectId);
    if (!prospect) continue;
    const previous = drafted.get(prospect.position) ?? { count: 0, credit: 0 };
    const gradeCredit = Math.round(clamp((prospect.scouted.high + prospect.scouted.potentialHigh) / 2 - 48, 2, 18));
    drafted.set(prospect.position, { count: previous.count + 1, credit: previous.credit + gradeCredit });
    for (const altPosition of eligiblePositionsFor(prospect).filter((position) => position !== prospect.position)) {
      const altPrevious = drafted.get(altPosition) ?? { count: 0, credit: 0 };
      drafted.set(altPosition, { count: altPrevious.count, credit: altPrevious.credit + Math.round(gradeCredit * 0.42) });
    }
  }
  return POSITIONS.map((position) => {
    const baseGrade = baseNeeds.get(position) ?? 64;
    const credit = drafted.get(position) ?? { count: 0, credit: 0 };
    const grade = Math.round(clamp(baseGrade + credit.credit, 35, 88));
    return {
      position,
      grade,
      urgency: Math.round(clamp(78 - grade + positionDraftValue(position) * 1.5, 0, 60)),
      drafted: credit.count
    };
  }).sort((a, b) => b.urgency - a.urgency || a.position.localeCompare(b.position));
}

function emptyStats(): PlayerStats {
  return {
    games: 0,
    snaps: 0,
    offenseSnaps: 0,
    defenseSnaps: 0,
    specialTeamsSnaps: 0,
    passYards: 0,
    rushYards: 0,
    receivingYards: 0,
    tackles: 0,
    sacks: 0,
    interceptions: 0,
    touchdowns: 0
  };
}

function rookieSalary(pick: DraftPick, position: Position): number {
  const premium = position === "QB" ? 1.25 : ["LT", "EDGE", "CB", "WR"].includes(position) ? 1.08 : position === "K" || position === "P" ? 0.58 : 1;
  const roundBase = [0, 7.2, 4.1, 2.4, 1.55, 1.1, 0.92, 0.78][pick.round] ?? 0.75;
  const slotDrag = Math.max(0, (pick.pickInRound - 1) * 0.045);
  return Number(clamp((roundBase - slotDrag) * premium, 0.75, 10.5).toFixed(1));
}

function prospectToRookie(save: GameSave, prospect: Prospect, pick: DraftPick): Player {
  const team = pick.currentTeamId;
  const overall = calculateOverallFromRatings(prospect.position, prospect.ratings);
  const salary = Number((rookieSalary(pick, prospect.position) * (1 + versatilityBonus(prospect) * 0.01)).toFixed(1));
  return normalizePlayerModel({
    id: `${team}-rookie-${pick.overallPick}-${slugify(prospect.firstName)}-${slugify(prospect.lastName)}`,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    position: prospect.position,
    positionFits: normalizePositionFits(prospect),
    teamId: team,
    teamStartSeason: save.seasonYear,
    draftYear: save.draftState.draftYear,
    collegeId: prospect.schoolId,
    age: prospect.age,
    overall,
    potential: prospect.potential,
    ratings: [...prospect.ratings],
    attributes: legacyAttributesFromRatings(prospect.position, prospect.ratings),
    salary,
    contractYears: 4,
    contract: makeContract({ position: prospect.position, salary, contractYears: 4, age: prospect.age, overall, potential: prospect.potential }, save.seasonYear, {
      origin: "rookie",
      years: 4,
      apy: salary
    }),
    medical: prospect.medical,
    status: "active",
    injuryWeeks: 0,
    injury: undefined,
    suspensionWeeks: 0,
    makeup: prospectMakeup(prospect),
    traits: [...prospect.traits, "Rookie"].slice(0, 4),
    development: {
      ...prospect.development,
      workEthic: prospect.workEthic,
      learning: Math.round(clamp(prospect.development.learning * 0.62 + prospect.workEthic * 0.38, 20, 99))
    },
    body: prospect.body,
    skillBuckets: prospect.skillBuckets,
    training: {
      ...prospect.training,
      targetPosition: prospect.training?.targetPosition ?? prospect.position,
      conversionProgress: {
        [prospect.position]: 100,
        ...(prospect.training?.conversionProgress ?? {})
      }
    },
    stats: emptyStats(),
    playoffStats: emptyStats()
  } as Player, `${save.seed}:rookie:${pick.id}`);
}

function completeDraftIfNeeded(save: GameSave): GameSave {
  if (save.draftState.history.length < save.draftState.order.length) return save;
  const existing = new Set(save.players.map((player) => player.id));
  const rookies: Player[] = [];
  const signedHistory: DraftSelection[] = save.draftState.history.map((selection) => {
    if (selection.signedPlayerId) return selection;
    const pick = save.draftPicks.find((candidate) => candidate.id === selection.pickId);
    const prospect = save.prospects.find((candidate) => candidate.id === selection.prospectId);
    if (!pick || !prospect) return selection;
    const rookie = prospectToRookie(save, prospect, pick);
    if (!existing.has(rookie.id)) {
      rookies.push(rookie);
      existing.add(rookie.id);
    }
    return { ...selection, signedPlayerId: rookie.id };
  });
  return recalculateBudgets({
    ...save,
    phase: "udfa",
    players: [...save.players, ...rookies],
    draftState: {
      ...save.draftState,
      history: signedHistory,
      completed: true,
      currentPickIndex: save.draftState.order.length,
      pendingEvent: undefined
    },
    inbox: [
      {
        id: `draft-complete-${save.currentWeek}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "draft",
        title: "Draft complete",
        body: `${rookies.length} drafted rookies have joined league rosters. The undrafted market is now open.`,
        priority: "high",
        read: false
      },
      ...save.inbox
    ]
  });
}

export function makeDraftSelection(save: GameSave, prospectId?: string): GameSave {
  let next = ensureDraftState(save);
  if (next.phase === "draft-prep") next = enterDraft(next);
  if (next.phase !== "draft" || next.draftState.completed) return next;
  const pick = currentDraftPick(next);
  if (!pick || pick.usedByProspectId) return next;
  const prospect = prospectId
    ? availableProspects(next).find((candidate) => candidate.id === prospectId)
    : chooseCpuProspect(next, pick.currentTeamId, pick);
  if (!prospect) return next;
  const selection: DraftSelection = {
    pickId: pick.id,
    prospectId: prospect.id,
    teamId: pick.currentTeamId,
    round: pick.round,
    overallPick: pick.overallPick
  };
  next.draftPicks = next.draftPicks.map((candidate) =>
    candidate.id === pick.id ? { ...candidate, usedByProspectId: prospect.id } : candidate
  );
  next.draftState = {
    ...next.draftState,
    history: [...next.draftState.history, selection],
    currentPickIndex: next.draftState.currentPickIndex + 1,
    pendingEvent: undefined,
    eventLog: keepDraftEvents([
      makeDraftEvent(
        next,
        "pick",
        `Pick #${pick.overallPick}: ${teamById(next, pick.currentTeamId).abbreviation} select ${prospect.position}`,
        `${teamById(next, pick.currentTeamId).fullName} selected ${prospect.firstName} ${prospect.lastName} from pick ${pick.overallPick}.`,
        false,
        { pickId: pick.id, teamId: pick.currentTeamId, prospectId: prospect.id }
      ),
      ...(next.draftState.eventLog ?? [])
    ])
  };
  return completeDraftIfNeeded(syncDraftClock(next, pick.id));
}

function shouldStopForEvent(save: GameSave): boolean {
  return Boolean(save.draftState?.pendingEvent?.interrupt);
}

export function advanceDraftEvent(save: GameSave): GameSave {
  let next = enterDraft(ensureDraftState(save));
  if (next.phase !== "draft" || next.draftState.completed) return next;
  if (shouldStopForEvent(next)) return next;
  const pick = currentDraftPick(next);
  if (!pick) return completeDraftIfNeeded(next);
  const tick = 30 * next.draftState.simSpeed;
  if (pick.currentTeamId === next.selectedTeamId) {
    const clockSeconds = Math.max(0, next.draftState.clockSeconds - tick);
    const event = clockSeconds === 0
      ? makeDraftEvent(next, "clock", "Your pick clock expired", "The room is paused. Make a pick or accept a trade before the draft continues.", true, { pickId: pick.id, teamId: pick.currentTeamId })
      : next.draftState.pendingEvent;
    if (!event && next.draftState.clockSeconds === next.draftState.pickTimeLimit) {
      const offered = maybeCreateUserTradeOffer(next, pick, false);
      if (offered.draftState.pendingEvent) return offered;
    }
    return {
      ...next,
      draftState: {
        ...next.draftState,
        clockSeconds,
        pendingEvent: event,
        eventLog: event ? keepDraftEvents([event, ...(next.draftState.eventLog ?? [])]) : next.draftState.eventLog
      }
    };
  }
  const earlyUserPick = next.draftPicks
    .filter((candidate) => candidate.currentTeamId === next.selectedTeamId && !candidate.usedByProspectId && candidate.draftYear === next.draftState.draftYear && candidate.overallPick > pick.overallPick)
    .sort((a, b) => a.overallPick - b.overallPick)[0];
  if (earlyUserPick && earlyUserPick.overallPick - pick.overallPick <= 6) {
    const rng = createRng(`${next.seed}:early-user-offer:${pick.id}:${earlyUserPick.id}`);
    if (rng.float(0, 1) < 0.18) {
      const offered = maybeCreateUserTradeOffer(next, earlyUserPick, true);
      if (offered.draftState.pendingEvent) return offered;
    }
  }
  next = maybeCpuTradeBeforePick(next, pick);
  if (shouldStopForEvent(next)) return next;
  const current = currentDraftPick(next);
  if (!current) return next;
  return makeDraftSelection(next);
}

export function clearDraftEvent(save: GameSave): GameSave {
  const next = ensureDraftState(save);
  return { ...next, draftState: { ...next.draftState, pendingEvent: undefined } };
}

export function setDraftSpeed(save: GameSave, speed: 1 | 3 | 10): GameSave {
  const next = ensureDraftState(save);
  return { ...next, draftState: { ...next.draftState, simSpeed: speed } };
}

export function setSkipDraftTradeNotifications(save: GameSave, skip: boolean): GameSave {
  const next = ensureDraftState(save);
  return { ...next, draftState: { ...next.draftState, skipCpuTradeNotifications: skip } };
}

export function simDraftToNextUserPick(save: GameSave): GameSave {
  let next = enterDraft(ensureDraftState(save));
  let guard = 0;
  while (next.phase === "draft" && guard < 260) {
    const pick = currentDraftPick(next);
    if (!pick || pick.currentTeamId === next.selectedTeamId || shouldStopForEvent(next)) break;
    next = advanceDraftEvent(next);
    guard += 1;
  }
  return next;
}

export function simCurrentDraftRound(save: GameSave): GameSave {
  let next = enterDraft(ensureDraftState(save));
  const pick = currentDraftPick(next);
  const round = pick?.round;
  let guard = 0;
  while (next.phase === "draft" && round && guard < 40) {
    const current = currentDraftPick(next);
    if (!current || current.round !== round || current.currentTeamId === next.selectedTeamId || shouldStopForEvent(next)) break;
    next = advanceDraftEvent(next);
    guard += 1;
  }
  return next;
}

export function simRestOfDraft(save: GameSave): GameSave {
  let next = enterDraft(ensureDraftState(save));
  let guard = 0;
  while (next.phase === "draft" && guard < 260) {
    const pick = currentDraftPick(next);
    if (!pick || pick.currentTeamId === next.selectedTeamId || shouldStopForEvent(next)) break;
    next = advanceDraftEvent(next);
    guard += 1;
  }
  return next;
}

function assetsValue(save: GameSave, receivingTeamId: string, assets: DraftTradeAsset[]): number {
  const players = assets
    .filter((asset) => asset.type === "player")
    .map((asset) => save.players.find((player) => player.id === asset.id))
    .filter((player): player is Player => Boolean(player));
  const picks = assets
    .filter((asset) => asset.type === "pick")
    .map((asset) => save.draftPicks.find((pick) => pick.id === asset.id))
    .filter((pick): pick is DraftPick => Boolean(pick));
  return packageValue(save, receivingTeamId, players, picks);
}

export function buildTradeOfferForPick(save: GameSave, targetPickId: string): DraftTradeOffer | undefined {
  const next = ensureDraftState(save);
  const targetPick = next.draftPicks.find((pick) => pick.id === targetPickId);
  if (!targetPick || targetPick.currentTeamId === next.selectedTeamId || targetPick.usedByProspectId) return undefined;
  const gives: DraftTradeAsset[] = [];
  const userPicks = next.draftPicks
    .filter((pick) =>
      pick.currentTeamId === next.selectedTeamId &&
      !pick.usedByProspectId &&
      (pick.draftYear > next.draftState.draftYear || pick.overallPick > targetPick.overallPick)
    )
    .sort((a, b) => a.draftYear - b.draftYear || a.overallPick - b.overallPick);
  for (const pick of userPicks.slice(0, 3)) {
    gives.push({ type: "pick", id: pick.id });
    if (assetsValue(next, targetPick.currentTeamId, gives) >= pickTradeValue(targetPick, next) * 1.04) break;
  }
  const players = next.players
    .filter((player) => player.teamId === next.selectedTeamId && isPlayablePlayer(player) && !["QB", "K", "P"].includes(player.position))
    .sort((a, b) => playerTradeValue(next, a, targetPick.currentTeamId) - playerTradeValue(next, b, targetPick.currentTeamId));
  while (assetsValue(next, targetPick.currentTeamId, gives) < pickTradeValue(targetPick, next) * 1.02 && players.length) {
    const player = players.shift();
    if (player) gives.push({ type: "player", id: player.id });
    if (gives.filter((asset) => asset.type === "player").length >= 2) break;
  }
  if (!gives.length) return undefined;
  const receives = [{ type: "pick" as const, id: targetPick.id }];
  const incomingValue = assetsValue(next, targetPick.currentTeamId, gives);
  const outgoingValue = assetsValue(next, next.selectedTeamId, receives);
  const verdict = tradeVerdict(incomingValue, outgoingValue);
  return {
    id: `offer-${targetPick.id}-${next.inbox.length}`,
    fromTeamId: next.selectedTeamId,
    toTeamId: targetPick.currentTeamId,
    gives,
    receives,
    incomingValue,
    outgoingValue,
    verdict,
    status: "proposed",
    message:
      verdict === "accept"
        ? "The opposing front office is ready to accept this package."
        : verdict === "counter"
          ? "The opposing front office is close but wants a sweeter package."
          : "The opposing front office declines the value gap."
  };
}

function teamDraftNeedScore(save: GameSave, teamId: string, position: Position): number {
  const need = cachedRosterNeeds(save, teamId).find((item) => item.position === position);
  return need ? clamp(70 - need.grade, -10, 30) : 0;
}

function projectedTeamStrength(save: GameSave, teamId: string): number {
  const record = save.records[teamId];
  return teamOverall(save, teamId) + (record?.wins ?? 0) * 1.2 - (record?.losses ?? 0) * 0.4;
}

function tradeAggression(save: GameSave, teamId: string): number {
  const picks = save.draftPicks.filter((pick) => pick.currentTeamId === teamId && !pick.usedByProspectId).length;
  const strength = projectedTeamStrength(save, teamId);
  const need = cachedRosterNeeds(save, teamId).slice(0, 3).reduce((sum, item) => sum + Math.max(0, 64 - item.grade), 0);
  return clamp(34 + need * 0.5 + Math.max(0, strength - 60) * 0.32 + Math.max(0, picks - 7) * 2.4, 18, 88);
}

function tradeDownWillingness(save: GameSave, teamId: string, pick: DraftPick): number {
  const strength = projectedTeamStrength(save, teamId);
  const picks = save.draftPicks.filter((candidate) => candidate.currentTeamId === teamId && !candidate.usedByProspectId).length;
  const needs = cachedRosterNeeds(save, teamId).slice(0, 5).reduce((sum, item) => sum + Math.max(0, 62 - item.grade), 0);
  const roundPressure = pick.round === 1 ? 10 : pick.round <= 3 ? 4 : 0;
  return clamp(48 + needs * 0.32 + Math.max(0, 58 - strength) * 0.28 - Math.max(0, strength - 66) * 0.22 - Math.max(0, picks - 9) * 1.5 - roundPressure, 16, 82);
}

function tradeTargetScore(save: GameSave, teamId: string, prospect: Prospect, pick: DraftPick): number {
  const needScore = teamDraftNeedScore(save, teamId, prospect.position);
  const boardValue = Math.max(0, 45 - prospect.consensusRank + pick.overallPick) * 0.18;
  const premium = positionDraftValue(prospect.position) * 0.45;
  const tier = prospect.consensusGrade * 0.2 + prospect.scouted.high * 0.08 + prospect.scouted.potentialHigh * 0.05;
  return needScore + boardValue + premium + tier;
}

function futurePickForTeam(save: GameSave, teamId: string, round: number): DraftPick | undefined {
  return save.draftPicks.find((pick) =>
    pick.draftYear > save.draftState.draftYear &&
    pick.round === round &&
    pick.currentTeamId === teamId &&
    !pick.usedByProspectId
  );
}

function draftTradePlayers(save: GameSave, teamId: string, receivingTeamId: string): Player[] {
  return save.players
    .filter((player) =>
      player.teamId === teamId &&
      isPlayablePlayer(player) &&
      player.age <= 30 &&
      player.salary <= 12 &&
      player.overall >= 48 &&
      player.overall <= 69 &&
      !["QB", "K", "P"].includes(player.position)
    )
    .sort((a, b) => playerTradeValue(save, b, receivingTeamId) - playerTradeValue(save, a, receivingTeamId));
}

function availableTradePicks(save: GameSave, teamId: string, afterPick?: DraftPick): DraftPick[] {
  return save.draftPicks
    .filter((pick) =>
      pick.currentTeamId === teamId &&
      !pick.usedByProspectId &&
      (!afterPick || pick.draftYear > save.draftState.draftYear || pick.overallPick > afterPick.overallPick)
    )
    .sort((a, b) => a.draftYear - b.draftYear || a.round - b.round || a.overallPick - b.overallPick);
}

function buildMoveUpPackage(save: GameSave, buyerTeamId: string, sellerTeamId: string, targetPick: DraftPick): DraftTradeAsset[] {
  const gives: DraftTradeAsset[] = [];
  const targetValue = pickTradeValue(targetPick, save);
  const buyerPicks = availableTradePicks(save, buyerTeamId, targetPick);
  for (const pick of buyerPicks) {
    if (pick.id === targetPick.id) continue;
    gives.push({ type: "pick", id: pick.id });
    if (assetsValue(save, sellerTeamId, gives) >= targetValue * 1.08) return gives;
    if (gives.length >= 2) break;
  }
  for (const round of [2, 3, 4, 1]) {
    const pick = futurePickForTeam(save, buyerTeamId, round);
    if (pick && !gives.some((asset) => asset.id === pick.id)) {
      gives.push({ type: "pick", id: pick.id });
      if (assetsValue(save, sellerTeamId, gives) >= targetValue * 1.08) return gives;
      if (gives.length >= 3) break;
    }
  }
  if (targetPick.round <= 3 && assetsValue(save, sellerTeamId, gives) < targetValue * 1.02 && gives.length <= 2) {
    for (const player of draftTradePlayers(save, buyerTeamId, sellerTeamId).slice(0, 2)) {
      gives.push({ type: "player", id: player.id });
      if (assetsValue(save, sellerTeamId, gives) >= targetValue * 1.08) return gives;
      if (gives.filter((asset) => asset.type === "player").length >= 1) break;
    }
  }
  return gives;
}

function counterOfferWithExtraAsset(save: GameSave, base: DraftTradeOffer, extra: DraftTradeAsset, label: string): DraftTradeOffer | undefined {
  if (base.gives.some((asset) => asset.id === extra.id)) return undefined;
  const gives = [...base.gives, extra];
  return {
    ...base,
    id: `${base.id}-${label}`,
    gives,
    incomingValue: assetsValue(save, base.toTeamId, gives),
    outgoingValue: assetsValue(save, base.fromTeamId, base.receives),
    message: `${teamById(save, base.fromTeamId).abbreviation} adds ${label.replace(/-/g, " ")} to improve the package.`
  };
}

export function buildTradeDownOfferToUser(save: GameSave, targetPick: DraftPick, buyerTeamId: string): DraftTradeOffer | undefined {
  const next = ensureDraftState(save);
  if (targetPick.currentTeamId !== next.selectedTeamId || targetPick.usedByProspectId || buyerTeamId === next.selectedTeamId) return undefined;
  const gives = buildMoveUpPackage(next, buyerTeamId, next.selectedTeamId, targetPick);
  if (!gives.length) return undefined;
  const receives = [{ type: "pick" as const, id: targetPick.id }];
  const incomingValue = assetsValue(next, next.selectedTeamId, gives);
  const outgoingValue = assetsValue(next, buyerTeamId, receives);
  const verdict = tradeVerdict(incomingValue, outgoingValue);
  const buyer = teamById(next, buyerTeamId);
  const message = `${buyer.abbreviation} wants to move up to #${targetPick.overallPick}. You receive ${formatAssets(next, gives)}.`;
  const base: DraftTradeOffer = {
    id: `ai-offer-${buyerTeamId}-${targetPick.id}-${next.draftState.tradeOffers.length}`,
    fromTeamId: buyerTeamId,
    toTeamId: next.selectedTeamId,
    gives,
    receives,
    incomingValue,
    outgoingValue,
    verdict,
    status: "proposed",
    userFacing: true,
    rationale: `${buyer.abbreviation} has an urgent need and enough capital to pay for the jump.`,
    message
  };
  const counterOffers = [
    futurePickForTeam(next, buyerTeamId, 4),
    futurePickForTeam(next, buyerTeamId, 5),
    draftTradePlayers(next, buyerTeamId, next.selectedTeamId)[0]
  ]
    .map((asset, index) => {
      if (!asset) return undefined;
      const isPlayer = "position" in asset;
      return counterOfferWithExtraAsset(
        next,
        base,
        isPlayer ? { type: "player" as const, id: asset.id } : { type: "pick" as const, id: asset.id },
        isPlayer ? "depth-player" : `future-round-${asset.round}`
      );
    })
    .filter((offer): offer is DraftTradeOffer => Boolean(offer))
    .slice(0, 3);
  return { ...base, counterOffers };
}

function maybeCreateUserTradeOffer(save: GameSave, targetPick: DraftPick, early = false): GameSave {
  const next = ensureDraftState(save);
  if (targetPick.currentTeamId !== next.selectedTeamId || targetPick.usedByProspectId) return next;
  const alreadyOffered = next.draftState.tradeOffers.some((offer) =>
    offer.userFacing && offer.receives.some((asset) => asset.type === "pick" && asset.id === targetPick.id)
  );
  if (alreadyOffered) return next;
  const rng = createRng(`${next.seed}:user-offer:${targetPick.id}:${next.draftState.history.length}:${early}`);
  const offerChance = early ? 0.12 : targetPick.round === 1 ? 0.72 : targetPick.round === 2 ? 0.48 : 0.24;
  if (rng.float(0, 1) > offerChance) return next;
  const currentAvailable = availableProspects(next).slice().sort((a, b) => a.consensusRank - b.consensusRank);
  const bait = currentAvailable.slice(0, early ? 18 : 36);
  const buyer = next.teams
    .filter((team) => team.id !== next.selectedTeamId)
    .map((team) => {
      const bestNeed = Math.max(...bait.map((prospect) => teamDraftNeedScore(next, team.id, prospect.position)));
      return {
        team,
        score: bestNeed + tradeAggression(next, team.id) * 0.35 + rng.float(-8, 8)
      };
    })
    .sort((a, b) => b.score - a.score)[0]?.team;
  if (!buyer) return next;
  const offer = buildTradeDownOfferToUser(next, targetPick, buyer.id);
  if (!offer || offer.verdict === "decline") return next;
  const event = makeDraftEvent(next, "offer", "Trade offer on your pick", offer.message, true, { pickId: targetPick.id, teamId: buyer.id, offerId: offer.id });
  return {
    ...next,
    draftState: {
      ...next.draftState,
      tradeOffers: keepDraftOffers([offer, ...next.draftState.tradeOffers]),
      pendingEvent: event,
      eventLog: keepDraftEvents([event, ...(next.draftState.eventLog ?? [])])
    }
  };
}

function maybeCpuTradeBeforePick(save: GameSave, pick: DraftPick): GameSave {
  let next = ensureDraftState(save);
  if (pick.currentTeamId === next.selectedTeamId) return next;
  const rng = createRng(`${next.seed}:cpu-trade:${pick.id}:${next.draftState.history.length}`);
  const sellerInterest = tradeDownWillingness(next, pick.currentTeamId, pick);
  const chance = (pick.round === 1 ? 0.14 : pick.round <= 3 ? 0.075 : 0.025) * (0.65 + sellerInterest / 120);
  if (rng.float(0, 1) > chance) return next;
  const sellerTeamId = pick.currentTeamId;
  const board = availableProspects(next).slice().sort((a, b) => a.consensusRank - b.consensusRank).slice(0, 28);
  const buyer = next.teams
    .filter((team) => team.id !== sellerTeamId && team.id !== next.selectedTeamId)
    .map((team) => {
      const topNeed = Math.max(...board.map((prospect) => tradeTargetScore(next, team.id, prospect, pick)));
      const sellerStrength = projectedTeamStrength(next, sellerTeamId);
      return {
        team,
        score: topNeed + tradeAggression(next, team.id) * 0.36 + sellerInterest * 0.16 - Math.max(0, sellerStrength - 66) * 0.16 + rng.float(-8, 8)
      };
    })
    .sort((a, b) => b.score - a.score)[0]?.team;
  if (!buyer) return next;
  const gives = buildMoveUpPackage(next, buyer.id, sellerTeamId, pick);
  if (!gives.length) return next;
  const receives = [{ type: "pick" as const, id: pick.id }];
  const offer: DraftTradeOffer = {
    id: `cpu-trade-${buyer.id}-${pick.id}-${next.draftState.tradeOffers.length}`,
    fromTeamId: buyer.id,
    toTeamId: sellerTeamId,
    gives,
    receives,
    incomingValue: assetsValue(next, sellerTeamId, gives),
    outgoingValue: assetsValue(next, buyer.id, receives),
    verdict: tradeVerdict(assetsValue(next, sellerTeamId, gives), assetsValue(next, buyer.id, receives)),
    status: "proposed",
    rationale: `${teamById(next, buyer.id).abbreviation} pays to jump for a premium need while ${teamById(next, sellerTeamId).abbreviation} collects extra capital.`,
    message: `${teamById(next, buyer.id).abbreviation} trades up to #${pick.overallPick} with ${teamById(next, sellerTeamId).abbreviation}.`
  };
  if (offer.verdict !== "accept") return next;
  return applyDraftTradeOffer(next, offer);
}

export function proposeDraftTradeForPick(save: GameSave, targetPickId: string): GameSave {
  const offer = buildTradeOfferForPick(save, targetPickId);
  if (!offer) return save;
  return applyDraftTradeOffer(save, offer);
}

export function applyDraftTradeOffer(save: GameSave, offer: DraftTradeOffer): GameSave {
  let next = ensureDraftState(cloneSave(save));
  const accepted = offer.verdict === "accept";
  const givesPlayers = offer.gives
    .filter((asset) => asset.type === "player")
    .map((asset) => next.players.find((player) => player.id === asset.id))
    .filter((player): player is Player => Boolean(player));
  const salaryToTarget = givesPlayers.reduce((sum, player) => sum + player.salary, 0);
  if (accepted && (next.budget[offer.toTeamId] ?? 0) - salaryToTarget < -60) {
    offer = { ...offer, status: "declined", verdict: "decline", message: "Trade blocked by the receiving team's cap room." };
  } else if (accepted) {
    const applyAsset = (asset: DraftTradeAsset, toTeamId: string) => {
      if (asset.type === "pick") {
        next.draftPicks = next.draftPicks.map((pick) => (pick.id === asset.id ? { ...pick, currentTeamId: toTeamId } : pick));
      } else {
        const player = next.players.find((candidate) => candidate.id === asset.id);
        if (player) {
          const fromTeamId = player.teamId;
          next = addDeadMoneyCharge(next, player, fromTeamId, "trade");
          next.players = next.players.map((candidate) => (
            candidate.id === asset.id
              ? clearIrState({
                ...candidate,
                teamId: toTeamId,
                teamStartSeason: next.seasonYear,
                contract: newTeamContractForAcquiredPlayer(candidate, next.seasonYear) ?? candidate.contract
              })
              : candidate
          ));
          next = recalculateBudgets(next);
        }
      }
    };
    offer.gives.forEach((asset) => applyAsset(asset, offer.toTeamId));
    offer.receives.forEach((asset) => applyAsset(asset, offer.fromTeamId));
    next = recalculateBudgets(next);
    offer = { ...offer, status: "accepted" };
  } else {
    offer = { ...offer, status: "declined" };
  }
  const from = teamById(next, offer.fromTeamId).abbreviation;
  const to = teamById(next, offer.toTeamId).abbreviation;
  next = ensureDraftState(next);
  const event = makeDraftEvent(
    next,
    offer.userFacing && offer.status === "proposed" ? "offer" : "trade",
    `Draft trade ${offer.status}`,
    `${from}-${to}: ${offer.status}. ${offer.message}`,
    Boolean(offer.userFacing && offer.status === "proposed"),
    { offerId: offer.id }
  );
  const userInvolved = offer.fromTeamId === next.selectedTeamId || offer.toTeamId === next.selectedTeamId || Boolean(offer.userFacing);
  return {
    ...next,
    draftState: {
      ...next.draftState,
      tradeOffers: keepDraftOffers([offer, ...next.draftState.tradeOffers.filter((candidate) => candidate.id !== offer.id)]),
      tradeLog: [`${from}-${to}: ${offer.status} (${offer.incomingValue}-${offer.outgoingValue})`, ...next.draftState.tradeLog],
      eventLog: keepDraftEvents([event, ...(next.draftState.eventLog ?? [])])
    },
    inbox: userInvolved ? [
      {
        id: `draft-trade-${offer.id}`,
        week: next.currentWeek,
        category: "draft",
        title: `Draft trade ${offer.status}`,
        body: offer.message,
        priority: offer.status === "accepted" ? "normal" : "low",
        read: false
      },
      ...next.inbox
    ] : next.inbox
  };
}

export function acceptDraftTradeOffer(save: GameSave, offerId: string): GameSave {
  const next = ensureDraftState(save);
  const offer = next.draftState.tradeOffers.find((candidate) => candidate.id === offerId);
  if (!offer) return next;
  const accepted = applyDraftTradeOffer(next, { ...offer, verdict: "accept", status: "proposed" });
  return clearDraftEvent(accepted);
}

export function acceptDraftTradeCounterOffer(save: GameSave, offerId: string, counterOfferId: string): GameSave {
  const next = ensureDraftState(save);
  const offer = next.draftState.tradeOffers.find((candidate) => candidate.id === offerId);
  const counter = offer?.counterOffers?.find((candidate) => candidate.id === counterOfferId);
  if (!counter) return next;
  const accepted = applyDraftTradeOffer(next, { ...counter, verdict: "accept", status: "proposed" });
  return clearDraftEvent(accepted);
}

export function declineDraftTradeOffer(save: GameSave, offerId: string): GameSave {
  const next = ensureDraftState(save);
  const offer = next.draftState.tradeOffers.find((candidate) => candidate.id === offerId);
  if (!offer) return clearDraftEvent(next);
  const declined = applyDraftTradeOffer(next, { ...offer, verdict: "decline", status: "proposed", message: "Offer declined by your draft room." });
  return clearDraftEvent(declined);
}

export function runRookieOnboarding(save: GameSave): GameSave {
  if (save.phase !== "rookie-onboarding") return save;
  const signedIds = new Set([
    ...save.draftState.history.map((selection) => selection.signedPlayerId).filter(Boolean),
    ...(save.udfaState?.signings.map((signing) => signing.playerId) ?? [])
  ]);
  const rng = createRng(`${save.seed}:rookie-onboarding:${save.draftState.history.length}:${save.udfaState?.signings.length ?? 0}`);
  const players = save.players.map((player) => {
    if (!signedIds.has(player.id)) return player;
    const development = coachDevelopmentGrade(save.staff, player.teamId, player.position);
    const bonus = Math.round(clamp((development - 60) / 16 + (player.traits.includes("Rookie") ? 0.75 : 0) + rng.int(-1, 1), -1, 3));
    if (bonus <= 0) return player;
    const ratings = player.ratings.map((rating) => Math.round(clamp(rating + bonus, 20, 99)));
    const overall = calculateOverallFromRatings(player.position, ratings);
    return {
      ...player,
      ratings,
      overall,
      potential: calibratePotential(overall, player.potential + Math.max(0, Math.floor(bonus / 2))),
      attributes: legacyAttributesFromRatings(player.position, ratings)
    };
  });
  const onboarded: GameSave = {
    ...save,
    phase: "offseason-complete",
    players,
    inbox: [
      {
        id: `rookie-onboarding-${save.currentWeek}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "draft",
        title: "Rookie onboarding complete",
        body: "Position coaches shaped the rookie class before offseason planning.",
        priority: "normal",
        read: false
      },
      ...save.inbox
    ]
  };
  const developed = runAnnualDevelopment(onboarded);
  const selectedReports = (developed.developmentReports ?? []).filter((report) => report.teamId === developed.selectedTeamId);
  const breakouts = selectedReports.filter((report) => report.category === "breakout").length;
  const declines = selectedReports.filter((report) => report.category === "decline" || report.category === "injury").length;
  return {
    ...developed,
    inbox: [
      {
        id: `annual-development-${save.currentWeek}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "staff",
        title: "Offseason development report filed",
        body: `Staff logged ${selectedReports.length} player development notes, including ${breakouts} breakout watch and ${declines} decline or injury flags.`,
        priority: breakouts || declines ? "normal" : "low",
        read: false
      },
      ...developed.inbox
    ]
  };
}
