import { clamp, createRng } from "../lib/rng";
import type {
  DraftSelection,
  GameSave,
  Player,
  PlayerStats,
  Position,
  Prospect,
  RookieAcquisitionResult,
  RookieClassResults,
  RookieScoutingSnapshot,
  UdfaOffer,
  UdfaSigning,
  UdfaState
} from "../types";
import { prospectMakeup } from "./concerns";
import { makeContract, recalculateBudgets } from "./cap";
import { draftRoomNeeds, ensureDraftState } from "./draft";
import { normalizePlayerModel } from "./playerModel";
import { eligiblePositionsFor, normalizePositionFits, versatilityBonus } from "./positionEligibility";
import { calculateOverallFromRatings, legacyAttributesFromRatings } from "./ratings";
import { positionDraftValue } from "./scouting";
import { rosterNeeds, teamOverall } from "./selectors";

export const UDFA_POOL = 0.25;
export const UDFA_TOTAL_WAVES = 3;
export const UDFA_OFFER_SLOTS = 6;
const UDFA_MINIMUM_SALARY = 0.75;
const draftRoomNeedCache = new WeakMap<GameSave, Map<string, ReturnType<typeof draftRoomNeeds>>>();
const rosterOpportunityCache = new WeakMap<GameSave, Map<string, number>>();
const udfaOpportunityCache = new WeakMap<GameSave, Map<string, number>>();
const aiWaveOfferCache = new WeakMap<GameSave, UdfaOffer[]>();

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

function cents(value: number): number {
  return Number(clamp(value, 0, UDFA_POOL).toFixed(3));
}

function offerCost(offer: Pick<UdfaOffer, "signingBonus" | "guaranteedMoney">): number {
  return cents(offer.signingBonus + offer.guaranteedMoney);
}

function selectedProspectIds(save: GameSave): Set<string> {
  return new Set(save.draftState.history.map((selection) => selection.prospectId));
}

function signedUdfaProspectIds(save: GameSave): Set<string> {
  return new Set(save.udfaState?.signings.map((signing) => signing.prospectId) ?? []);
}

function cloneSave(save: GameSave): GameSave {
  return JSON.parse(JSON.stringify(save)) as GameSave;
}

function rookieTraits(prospect: Prospect): string[] {
  return [...prospect.traits.filter((trait) => trait !== "Rookie" && trait !== "UDFA").slice(0, 2), "Rookie", "UDFA"];
}

function prospectToUdfaPlayer(save: GameSave, prospect: Prospect, teamId: string, wave: number): Player {
  const overall = calculateOverallFromRatings(prospect.position, prospect.ratings);
  const salary = Number((UDFA_MINIMUM_SALARY * (1 + versatilityBonus(prospect) * 0.004)).toFixed(2));
  return normalizePlayerModel({
    id: `${teamId}-udfa-${save.draftState.draftYear}-${wave}-${prospect.id}`,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    position: prospect.position,
    positionFits: normalizePositionFits(prospect),
    teamId,
    teamStartSeason: save.seasonYear,
    draftYear: save.draftState.draftYear,
    collegeId: prospect.schoolId,
    age: prospect.age,
    overall,
    potential: prospect.potential,
    ratings: [...prospect.ratings],
    attributes: legacyAttributesFromRatings(prospect.position, prospect.ratings),
    salary,
    contractYears: 3,
    contract: makeContract({ position: prospect.position, salary, contractYears: 3, age: prospect.age, overall, potential: prospect.potential }, save.seasonYear, {
      origin: "udfa",
      years: 3,
      apy: salary,
      signingBonus: 0.03,
      guaranteedTotal: 0.06
    }),
    medical: prospect.medical,
    status: "active",
    injuryWeeks: 0,
    injury: undefined,
    suspensionWeeks: 0,
    makeup: prospectMakeup(prospect),
    traits: rookieTraits(prospect),
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
  } as Player, `${save.seed}:udfa:${teamId}:${wave}:${prospect.id}`);
}

export function undraftedProspects(save: GameSave): Prospect[] {
  const drafted = selectedProspectIds(save);
  const signed = signedUdfaProspectIds(save);
  return save.prospects.filter((prospect) => !drafted.has(prospect.id) && !signed.has(prospect.id));
}

export function ensureUdfaState(save: GameSave): GameSave {
  const next = ensureDraftState(save);
  const previous = next.udfaState;
  const draftYear = next.draftState.draftYear;
  const teamPools = Object.fromEntries(next.teams.map((team) => [team.id, cents(previous?.teamPools?.[team.id] ?? UDFA_POOL)]));
  return {
    ...next,
    udfaState: {
      draftYear,
      wave: previous?.draftYear === draftYear ? clamp(previous.wave, 1, UDFA_TOTAL_WAVES) : 1,
      totalWaves: UDFA_TOTAL_WAVES,
      offerSlots: UDFA_OFFER_SLOTS,
      teamPools,
      offers: previous?.draftYear === draftYear ? previous.offers ?? [] : [],
      signings: previous?.draftYear === draftYear ? previous.signings ?? [] : [],
      recaps: previous?.draftYear === draftYear ? previous.recaps ?? [] : [],
      completed: previous?.draftYear === draftYear ? previous.completed ?? false : false
    }
  };
}

function cachedDraftRoomNeeds(save: GameSave, teamId: string): ReturnType<typeof draftRoomNeeds> {
  let teamMap = draftRoomNeedCache.get(save);
  if (!teamMap) {
    teamMap = new Map();
    draftRoomNeedCache.set(save, teamMap);
  }
  const cached = teamMap.get(teamId);
  if (cached) return cached;
  const needs = draftRoomNeeds(save, teamId);
  teamMap.set(teamId, needs);
  return needs;
}

function rosterOpportunity(save: GameSave, teamId: string, position: Position): number {
  let positionMap = rosterOpportunityCache.get(save);
  if (!positionMap) {
    positionMap = new Map();
    rosterOpportunityCache.set(save, positionMap);
  }
  const cacheKey = `${teamId}:${position}`;
  const cached = positionMap.get(cacheKey);
  if (cached !== undefined) return cached;
  const need = cachedDraftRoomNeeds(save, teamId).find((item) => item.position === position);
  const primaryPlayers = save.players
    .filter((player) => player.teamId === teamId && eligiblePositionsFor(player).includes(position))
    .sort((a, b) => b.overall - a.overall);
  const best = primaryPlayers[0]?.overall ?? 35;
  const rosterCrowd = primaryPlayers.filter((player) => player.overall >= 50).length;
  const value = clamp((need?.urgency ?? 24) * 1.15 + Math.max(0, 61 - best) * 0.75 - rosterCrowd * 3, 4, 96);
  positionMap.set(cacheKey, value);
  return value;
}

export function udfaOpportunityForTeam(save: GameSave, teamId: string, prospect: Prospect): number {
  let opportunityMap = udfaOpportunityCache.get(save);
  if (!opportunityMap) {
    opportunityMap = new Map();
    udfaOpportunityCache.set(save, opportunityMap);
  }
  const cacheKey = `${teamId}:${prospect.id}`;
  const cached = opportunityMap.get(cacheKey);
  if (cached !== undefined) return cached;
  const primary = rosterOpportunity(save, teamId, prospect.position);
  const alternate = eligiblePositionsFor(prospect)
    .filter((position) => position !== prospect.position)
    .map((position) => rosterOpportunity(save, teamId, position) * 0.42)
    .sort((a, b) => b - a)[0] ?? 0;
  const value = Math.round(clamp(primary + alternate + positionDraftValue(prospect.position) * 0.18, 1, 99));
  opportunityMap.set(cacheKey, value);
  return value;
}

function currentWaveUserOffers(state: UdfaState, teamId: string): UdfaOffer[] {
  return state.offers.filter((offer) => offer.teamId === teamId && offer.wave === state.wave && offer.isUserOffer && offer.status === "active");
}

function userOfferCommitment(state: UdfaState, teamId: string, ignoreId?: string): number {
  return cents(currentWaveUserOffers(state, teamId)
    .filter((offer) => offer.id !== ignoreId)
    .reduce((sum, offer) => sum + offerCost(offer), 0));
}

type NeedByTeamCache = Map<string, Map<Position, number>>;

function buildNeedByTeamCache(save: GameSave): NeedByTeamCache {
  return new Map(
    save.teams.map((team) => [
      team.id,
      new Map(rosterNeeds(save, team.id).map((need) => [need.position, need.grade]))
    ])
  );
}

export function activeUdfaOfferForProspect(save: GameSave, prospectId: string): UdfaOffer | undefined {
  const next = ensureUdfaState(save);
  return next.udfaState?.offers
    .filter((offer) => offer.prospectId === prospectId && offer.teamId === next.selectedTeamId && (offer.status === "active" || offer.status === "countered"))
    .sort((a, b) => b.wave - a.wave)[0];
}

export function placeUdfaOffer(save: GameSave, prospectId: string, signingBonus: number, guaranteedMoney: number): GameSave {
  const next = ensureUdfaState(cloneSave(save));
  const state = next.udfaState!;
  if (next.phase !== "udfa" || state.completed || !undraftedProspects(next).some((prospect) => prospect.id === prospectId)) return next;
  const prospect = next.prospects.find((candidate) => candidate.id === prospectId);
  if (!prospect) return next;
  const bonus = cents(signingBonus);
  const guarantee = cents(guaranteedMoney);
  const existing = state.offers.find((offer) =>
    offer.prospectId === prospectId &&
    offer.teamId === next.selectedTeamId &&
    offer.wave === state.wave &&
    offer.isUserOffer &&
    offer.status === "active"
  );
  const commitment = userOfferCommitment(state, next.selectedTeamId, existing?.id) + bonus + guarantee;
  if (commitment > (state.teamPools[next.selectedTeamId] ?? 0) + 0.0001) return next;
  if (!existing && currentWaveUserOffers(state, next.selectedTeamId).length >= state.offerSlots) return next;
  const offer: UdfaOffer = {
    id: existing?.id ?? `udfa-offer-${state.draftYear}-${state.wave}-${next.selectedTeamId}-${prospect.id}`,
    prospectId,
    teamId: next.selectedTeamId,
    wave: state.wave,
    signingBonus: bonus,
    guaranteedMoney: guarantee,
    status: "active",
    isUserOffer: true,
    opportunity: udfaOpportunityForTeam(next, next.selectedTeamId, prospect),
    response: existing ? "Offer updated before the wave resolves." : "Offer is live for this wave."
  };
  return {
    ...next,
    udfaState: {
      ...state,
      offers: existing
        ? state.offers.map((candidate) => (candidate.id === existing.id ? offer : candidate))
        : [offer, ...state.offers]
    }
  };
}

export function withdrawUdfaOffer(save: GameSave, offerId: string): GameSave {
  const next = ensureUdfaState(save);
  if (next.phase !== "udfa") return next;
  return {
    ...next,
    udfaState: {
      ...next.udfaState!,
      offers: next.udfaState!.offers.filter((offer) => offer.id !== offerId || !offer.isUserOffer || offer.status !== "active")
    }
  };
}

function aiTargetScore(
  save: GameSave,
  teamId: string,
  prospect: Prospect,
  wave: number,
  needByTeam: NeedByTeamCache
): number {
  const need = needByTeam.get(teamId)?.get(prospect.position);
  const needBoost = Math.max(0, 68 - (need ?? 64)) * 0.65;
  const board = Math.max(0, 210 - prospect.consensusRank) * 0.17 + prospect.consensusGrade * 0.46 + prospect.scouted.high * 0.16;
  const opportunity = udfaOpportunityForTeam(save, teamId, prospect) * 0.35;
  const rng = createRng(`${save.seed}:udfa-target:${wave}:${teamId}:${prospect.id}`);
  return board + needBoost + opportunity + positionDraftValue(prospect.position) * 0.28 + rng.float(-11, 11);
}

function aiOfferTerms(save: GameSave, teamId: string, prospect: Prospect, wave: number, opportunity: number): Pick<UdfaOffer, "signingBonus" | "guaranteedMoney"> {
  const rng = createRng(`${save.seed}:udfa-terms:${wave}:${teamId}:${prospect.id}`);
  const demand = clamp((190 - prospect.consensusRank) / 250 + (prospect.consensusGrade - 48) / 70 + opportunity / 420, 0, 0.68);
  const guarantee = cents(clamp(0.003 + demand * 0.072 + rng.float(-0.008, 0.014), 0, 0.135));
  const signingBonus = cents(clamp(0.002 + demand * 0.055 + rng.float(-0.007, 0.012), 0, 0.105));
  return { signingBonus, guaranteedMoney: guarantee };
}

export function getCurrentAiUdfaWaveOffers(save: GameSave): UdfaOffer[] {
  const next = ensureUdfaState(save);
  const state = next.udfaState!;
  if (state.completed) return [];
  const cached = aiWaveOfferCache.get(next);
  if (cached) return cached;
  const unsigned = undraftedProspects(next);
  const offers: UdfaOffer[] = [];
  const needByTeam = buildNeedByTeamCache(next);
  for (const team of next.teams.filter((candidate) => candidate.id !== next.selectedTeamId)) {
    const rng = createRng(`${next.seed}:udfa-ai-wave:${state.wave}:${team.id}`);
    const targetLimit = state.wave === 1 ? 4 : state.wave === 2 ? 3 : 2;
    let committed = 0;
    let offersForTeam = 0;
    const targets = unsigned
      .slice()
      .sort((a, b) => aiTargetScore(next, team.id, b, state.wave, needByTeam) - aiTargetScore(next, team.id, a, state.wave, needByTeam))
      .slice(0, 20);
    for (const prospect of targets) {
      if (offersForTeam >= targetLimit) break;
      if (rng.float(0, 1) < (prospect.consensusRank > 260 ? 0.42 : 0.14)) continue;
      const opportunity = udfaOpportunityForTeam(next, team.id, prospect);
      const terms = aiOfferTerms(next, team.id, prospect, state.wave, opportunity);
      if (committed + terms.signingBonus + terms.guaranteedMoney > (state.teamPools[team.id] ?? 0) + 0.0001) continue;
      committed += terms.signingBonus + terms.guaranteedMoney;
      offersForTeam += 1;
      offers.push({
        id: `udfa-ai-${state.draftYear}-${state.wave}-${team.id}-${prospect.id}`,
        prospectId: prospect.id,
        teamId: team.id,
        wave: state.wave,
        ...terms,
        status: "active",
        isUserOffer: false,
        opportunity,
        response: "Rival offer is live."
      });
    }
  }
  aiWaveOfferCache.set(next, offers);
  return offers;
}

export function rivalUdfaOffers(save: GameSave, prospectId: string, aiOffers?: UdfaOffer[]): UdfaOffer[] {
  const next = ensureUdfaState(save);
  const live = (aiOffers ?? getCurrentAiUdfaWaveOffers(next)).filter((offer) => offer.prospectId === prospectId);
  const known = next.udfaState!.offers.filter((offer) =>
    offer.prospectId === prospectId &&
    !offer.isUserOffer &&
    offer.wave === next.udfaState!.wave &&
    offer.status === "active"
  );
  return [...known, ...live.filter((offer) => !known.some((candidate) => candidate.id === offer.id))]
    .sort((a, b) => offerCost(b) - offerCost(a));
}

function prospectDecisionScore(save: GameSave, prospect: Prospect, offer: UdfaOffer): number {
  const teamStrength = teamOverall(save, offer.teamId);
  const schoolSignal = prospect.production * 0.025 + prospect.stock * 0.08;
  const fit = positionDraftValue(prospect.position) * 0.2 + offer.opportunity * 0.34;
  const money = offer.guaranteedMoney * 285 + offer.signingBonus * 220;
  const rng = createRng(`${save.seed}:udfa-choice:${offer.wave}:${prospect.id}:${offer.teamId}`);
  return money + fit + teamStrength * 0.18 + schoolSignal + rng.float(-7, 7);
}

function shouldCounter(save: GameSave, prospect: Prospect, offer: UdfaOffer, offers: UdfaOffer[]): boolean {
  if (!offer.isUserOffer || offer.wave >= UDFA_TOTAL_WAVES || prospect.consensusRank > 150) return false;
  if (offers.some((candidate) => !candidate.isUserOffer && prospectDecisionScore(save, prospect, candidate) > prospectDecisionScore(save, prospect, offer) - 4)) return false;
  const cost = offerCost(offer);
  const desired = clamp((155 - prospect.consensusRank) / 180 * 0.12 + 0.035, 0.035, 0.16);
  return cost < desired && createRng(`${save.seed}:udfa-counter:${offer.wave}:${prospect.id}`).float(0, 1) < 0.16;
}

function signUdfa(save: GameSave, offer: UdfaOffer): { player?: Player; signing?: UdfaSigning } {
  const prospect = save.prospects.find((candidate) => candidate.id === offer.prospectId);
  if (!prospect) return {};
  const player = prospectToUdfaPlayer(save, prospect, offer.teamId, offer.wave);
  return {
    player,
    signing: {
      id: `udfa-signing-${save.draftState.draftYear}-${offer.teamId}-${prospect.id}`,
      prospectId: prospect.id,
      playerId: player.id,
      teamId: offer.teamId,
      wave: offer.wave,
      signingBonus: offer.signingBonus,
      guaranteedMoney: offer.guaranteedMoney
    }
  };
}

export function resolveNextUdfaWave(save: GameSave): GameSave {
  let next = ensureUdfaState(cloneSave(save));
  const state = next.udfaState!;
  if (next.phase !== "udfa" || state.completed) return next;
  const activeUser = currentWaveUserOffers(state, next.selectedTeamId);
  const offers = [...activeUser, ...getCurrentAiUdfaWaveOffers(next)];
  const prospectById = new Map(next.prospects.map((prospect) => [prospect.id, prospect]));
  const grouped = new Map<string, UdfaOffer[]>();
  for (const offer of offers) grouped.set(offer.prospectId, [...(grouped.get(offer.prospectId) ?? []), offer]);

  const newPlayers: Player[] = [];
  const signings: UdfaSigning[] = [];
  const teamPools = { ...state.teamPools };
  const statuses = new Map<string, UdfaOffer>();
  const userSignedIds: string[] = [];
  const userLostIds: string[] = [];
  const counterIds: string[] = [];
  const relevantCpuSigningIds: string[] = [];
  const everUserTargets = new Set(state.offers.filter((offer) => offer.isUserOffer).map((offer) => offer.prospectId));

  for (const [prospectId, prospectOffers] of grouped) {
    const prospect = prospectById.get(prospectId);
    if (!prospect) continue;
    const ordered = prospectOffers.slice().sort((a, b) => prospectDecisionScore(next, prospect, b) - prospectDecisionScore(next, prospect, a));
    const winner = ordered[0];
    if (shouldCounter(next, prospect, winner, ordered)) {
      const counterBonus = cents(Math.max(winner.signingBonus, winner.signingBonus + 0.012));
      const counterGuarantee = cents(Math.max(winner.guaranteedMoney, winner.guaranteedMoney + 0.018));
      for (const offer of ordered) {
        statuses.set(offer.id, offer.id === winner.id ? {
          ...offer,
          status: "countered",
          counterSigningBonus: counterBonus,
          counterGuaranteedMoney: counterGuarantee,
          response: `${prospect.lastName}'s camp wants a stronger guarantee next wave.`
        } : { ...offer, status: "lost", response: "Prospect kept negotiating elsewhere." });
      }
      counterIds.push(prospectId);
      continue;
    }
    const signed = signUdfa(next, winner);
    if (!signed.player || !signed.signing) continue;
    newPlayers.push(signed.player);
    signings.push(signed.signing);
    teamPools[winner.teamId] = cents((teamPools[winner.teamId] ?? UDFA_POOL) - offerCost(winner));
    for (const offer of ordered) {
      const didWin = offer.id === winner.id;
      statuses.set(offer.id, {
        ...offer,
        status: didWin ? "signed" : "lost",
        response: didWin ? `${prospect.firstName} ${prospect.lastName} signed.` : `${prospect.lastName} chose ${winner.teamId.toUpperCase()}.`
      });
      if (offer.isUserOffer && didWin) userSignedIds.push(prospectId);
      if (offer.isUserOffer && !didWin) userLostIds.push(prospectId);
    }
    if (!winner.isUserOffer && (everUserTargets.has(prospectId) || prospect.teamRank <= 40)) relevantCpuSigningIds.push(signed.signing.id);
  }

  const allWaveOffers = [...offers.map((offer) => statuses.get(offer.id) ?? { ...offer, status: "declined" as const })];
  const priorOffers = state.offers.filter((offer) => !allWaveOffers.some((candidate) => candidate.id === offer.id));
  const nextWave = Math.min(UDFA_TOTAL_WAVES, state.wave + 1);
  const completed = state.wave >= UDFA_TOTAL_WAVES;
  next = {
    ...next,
    players: [...next.players, ...newPlayers.filter((player) => !next.players.some((candidate) => candidate.id === player.id))],
    udfaState: {
      ...state,
      wave: nextWave,
      teamPools,
      offers: [...allWaveOffers, ...priorOffers],
      signings: [...state.signings, ...signings],
      recaps: [{
        wave: state.wave,
        userSignedIds,
        userLostIds,
        counterIds,
        relevantCpuSigningIds
      }, ...state.recaps.filter((recap) => recap.wave !== state.wave)],
      completed
    }
  };
  return recalculateBudgets({
    ...next,
    inbox: userSignedIds.length || userLostIds.length || counterIds.length ? [
      {
        id: `udfa-wave-${state.draftYear}-${state.wave}-${next.inbox.length}`,
        week: next.currentWeek,
        category: "draft",
        title: `UDFA wave ${state.wave} resolved`,
        body: `${userSignedIds.length} signing${userSignedIds.length === 1 ? "" : "s"}, ${userLostIds.length} lost target${userLostIds.length === 1 ? "" : "s"}, and ${counterIds.length} counter${counterIds.length === 1 ? "" : "s"} are on the desk.`,
        priority: userSignedIds.length || counterIds.length ? "normal" : "low",
        read: false
      },
      ...next.inbox
    ] : next.inbox
  });
}

export function simRemainingUdfaWaves(save: GameSave): GameSave {
  let next = ensureUdfaState(save);
  while (next.phase === "udfa" && !next.udfaState!.completed) {
    next = resolveNextUdfaWave(next);
  }
  return next;
}

function scoutingSnapshot(prospect: Prospect): RookieScoutingSnapshot {
  return {
    teamRank: prospect.teamRank,
    consensusRank: prospect.consensusRank,
    progress: prospect.scouted.progress,
    overallRange: [prospect.scouted.low, prospect.scouted.high],
    potentialRange: [prospect.scouted.potentialLow, prospect.scouted.potentialHigh],
    concerns: {
      medical: [...prospect.scouted.concerns.medical],
      character: [...prospect.scouted.concerns.character],
      workEthic: [...prospect.scouted.concerns.workEthic]
    },
    reports: [...(prospect.scoutReports ?? [])].slice(0, 4),
    note: prospect.scouted.note
  };
}

function acquiringBoardRanks(save: GameSave): Map<string, Map<string, number>> {
  const ranks = new Map<string, Map<string, number>>();
  for (const team of save.teams) {
    const needByPosition = new Map(rosterNeeds(save, team.id).map((need) => [need.position, need.grade]));
    const ordered = save.prospects
      .slice()
      .sort((a, b) => {
        const score = (prospect: Prospect) => {
          const need = Math.max(0, 68 - (needByPosition.get(prospect.position) ?? 64));
          const rng = createRng(`${save.seed}:team-board:${save.draftState.draftYear}:${team.id}:${prospect.id}`);
          return prospect.consensusGrade * 0.52 + prospect.teamGrade * 0.18 + prospect.stock * 0.08 + need * 0.42 + positionDraftValue(prospect.position) * 0.3 + rng.float(-4, 4);
        };
        return score(b) - score(a) || a.id.localeCompare(b.id);
      });
    ranks.set(team.id, new Map(ordered.map((prospect, index) => [prospect.id, index + 1])));
  }
  return ranks;
}

export function bestRookieScore(overall: number, potential: number): number {
  return Math.round(overall * 0.48 + potential * 0.52);
}

export function rookieValueSpentScore(score: number, source: "draft" | "udfa", overallPick?: number): number {
  const capitalDiscount = source === "udfa" ? 92 : clamp((overallPick ?? 224) * 0.39 - 8, -8, 80);
  return Math.round(score * 1.55 + capitalDiscount);
}

function resultForSelection(save: GameSave, selection: DraftSelection, ranks: Map<string, Map<string, number>>): RookieAcquisitionResult | undefined {
  const prospect = save.prospects.find((candidate) => candidate.id === selection.prospectId);
  const player = selection.signedPlayerId ? save.players.find((candidate) => candidate.id === selection.signedPlayerId) : undefined;
  if (!prospect || !player) return undefined;
  const score = bestRookieScore(player.overall, player.potential);
  return {
    id: `rookie-result-draft-${selection.pickId}`,
    playerId: player.id,
    prospectId: prospect.id,
    teamId: selection.teamId,
    source: "draft",
    costLabel: `Pick #${selection.overallPick}`,
    overallPick: selection.overallPick,
    round: selection.round,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    position: prospect.position,
    schoolId: prospect.schoolId,
    actualOverall: player.overall,
    actualPotential: player.potential,
    userBoardRank: prospect.teamRank,
    consensusRank: prospect.consensusRank,
    acquiringTeamRank: ranks.get(selection.teamId)?.get(prospect.id) ?? prospect.consensusRank,
    scouting: scoutingSnapshot(prospect),
    bestRookieScore: score,
    valueSpentScore: rookieValueSpentScore(score, "draft", selection.overallPick)
  };
}

function resultForSigning(save: GameSave, signing: UdfaSigning, ranks: Map<string, Map<string, number>>): RookieAcquisitionResult | undefined {
  const prospect = save.prospects.find((candidate) => candidate.id === signing.prospectId);
  const player = save.players.find((candidate) => candidate.id === signing.playerId);
  if (!prospect || !player) return undefined;
  const score = bestRookieScore(player.overall, player.potential);
  return {
    id: `rookie-result-udfa-${signing.id}`,
    playerId: player.id,
    prospectId: prospect.id,
    teamId: signing.teamId,
    source: "udfa",
    costLabel: "UDFA",
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    position: prospect.position,
    schoolId: prospect.schoolId,
    actualOverall: player.overall,
    actualPotential: player.potential,
    userBoardRank: prospect.teamRank,
    consensusRank: prospect.consensusRank,
    acquiringTeamRank: ranks.get(signing.teamId)?.get(prospect.id) ?? prospect.consensusRank,
    scouting: scoutingSnapshot(prospect),
    bestRookieScore: score,
    valueSpentScore: rookieValueSpentScore(score, "udfa")
  };
}

export function buildRookieClassResults(save: GameSave): RookieClassResults {
  const next = ensureUdfaState(save);
  const ranks = acquiringBoardRanks(next);
  const acquisitions = [
    ...next.draftState.history.map((selection) => resultForSelection(next, selection, ranks)),
    ...next.udfaState!.signings.map((signing) => resultForSigning(next, signing, ranks))
  ]
    .filter((result): result is RookieAcquisitionResult => Boolean(result))
    .sort((a, b) => b.bestRookieScore - a.bestRookieScore || b.valueSpentScore - a.valueSpentScore);
  return {
    id: `rookie-results-${next.draftState.draftYear}`,
    draftYear: next.draftState.draftYear,
    createdWeek: next.currentWeek,
    acquisitions
  };
}

export function latestRookieResults(save: GameSave): RookieClassResults | undefined {
  return [...(save.rookieResults ?? [])].sort((a, b) => b.draftYear - a.draftYear)[0];
}

export function finalizeUdfaClass(save: GameSave): GameSave {
  let next = simRemainingUdfaWaves(save);
  if (next.phase !== "udfa") return next;
  const results = buildRookieClassResults(next);
  return {
    ...next,
    phase: "rookie-results",
    rookieResults: [results, ...(next.rookieResults ?? []).filter((item) => item.draftYear !== results.draftYear)],
    inbox: [
      {
        id: `rookie-results-${results.draftYear}-${next.inbox.length}`,
        week: next.currentWeek,
        category: "draft",
        title: "Rookie class results ready",
        body: `${results.acquisitions.length} drafted and undrafted rookies are ready for the class reveal before onboarding.`,
        priority: "high",
        read: false
      },
      ...next.inbox
    ]
  };
}

export function beginRookieOnboarding(save: GameSave): GameSave {
  if (save.phase !== "rookie-results") return save;
  return { ...save, phase: "rookie-onboarding" };
}

export function udfaTargetSuggestions(save: GameSave, limit = 6): Prospect[] {
  const next = ensureUdfaState(save);
  return undraftedProspects(next)
    .slice()
    .sort((a, b) => {
      const score = (prospect: Prospect) =>
        Math.max(0, 180 - prospect.teamRank) * 0.35 +
        prospect.valuePickScore * 0.44 +
        udfaOpportunityForTeam(next, next.selectedTeamId, prospect) * 0.42 +
        prospect.scouted.potentialHigh * 0.12;
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export function udfaInboundInterest(save: GameSave, limit = 3): Prospect[] {
  const next = ensureUdfaState(save);
  return undraftedProspects(next)
    .filter((prospect) => {
      const opportunity = udfaOpportunityForTeam(next, next.selectedTeamId, prospect);
      const rng = createRng(`${next.seed}:udfa-agent-interest:${next.udfaState!.wave}:${prospect.id}`);
      return opportunity >= 58 && rng.float(0, 1) < clamp((opportunity - 42) / 190 + Math.max(0, 140 - prospect.teamRank) / 700, 0.08, 0.34);
    })
    .sort((a, b) => udfaOpportunityForTeam(next, next.selectedTeamId, b) - udfaOpportunityForTeam(next, next.selectedTeamId, a) || a.teamRank - b.teamRank)
    .slice(0, limit);
}

export interface RookieClassScoreRow {
  teamId: string;
  totalScore: number;
  upsideScore: number;
  valueScore: number;
  count: number;
  totalRank: number;
  upsideRank: number;
  valueRank: number;
}

export function rookieClassScoreRows(results: RookieClassResults, teamIds: string[]): RookieClassScoreRow[] {
  const rows = teamIds.map((teamId) => {
    const acquisitions = results.acquisitions.filter((result) => result.teamId === teamId);
    const best = acquisitions.slice().sort((a, b) => b.bestRookieScore - a.bestRookieScore).slice(0, 12);
    const value = acquisitions.slice().sort((a, b) => b.valueSpentScore - a.valueSpentScore).slice(0, 12);
    return {
      teamId,
      totalScore: Math.round(best.reduce((sum, result) => sum + result.bestRookieScore, 0)),
      upsideScore: Math.round(best.reduce((sum, result) => sum + result.actualPotential, 0)),
      valueScore: Math.round(value.reduce((sum, result) => sum + result.valueSpentScore, 0) / Math.max(1, value.length)),
      count: acquisitions.length,
      totalRank: 0,
      upsideRank: 0,
      valueRank: 0
    };
  });
  const rank = (key: "totalScore" | "upsideScore" | "valueScore") =>
    new Map(rows.slice().sort((a, b) => b[key] - a[key] || a.teamId.localeCompare(b.teamId)).map((row, index) => [row.teamId, index + 1]));
  const total = rank("totalScore");
  const upside = rank("upsideScore");
  const value = rank("valueScore");
  return rows
    .map((row) => ({
      ...row,
      totalRank: total.get(row.teamId) ?? teamIds.length,
      upsideRank: upside.get(row.teamId) ?? teamIds.length,
      valueRank: value.get(row.teamId) ?? teamIds.length
    }))
    .sort((a, b) => a.totalRank - b.totalRank);
}
