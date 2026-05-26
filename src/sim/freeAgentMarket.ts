import type {
  FreeAgencyDecisionLog,
  FreeAgencyMarketState,
  FreeAgentOffer,
  FreeAgentRolePromise,
  FreeAgentSecurityLevel,
  GameSave,
  Player,
  Position
} from "../types";
import { contractOfferForPlayer, makeContract, suggestedApy, teamCapLedger } from "./cap";
import { canSignFreeAgentWithContract, FREE_AGENT_TEAM_ID, freeAgentPlayers, makeFreeAgencyMove, signFreeAgentWithContract } from "./freeAgents";
import { activeRosterSize } from "./ir";
import { isPracticeSquadPlayer } from "./practiceSquad";
import { rosterNeeds, teamOverall } from "./selectors";

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeFreeAgencyMarket(save: GameSave): FreeAgencyMarketState {
  const market = save.freeAgencyMarket;
  if (!market || market.seasonYear !== save.seasonYear) {
    return { seasonYear: save.seasonYear, currentWave: 1, offers: [], decisions: [] };
  }
  return {
    seasonYear: save.seasonYear,
    currentWave: market.currentWave ?? 1,
    offers: market.offers ?? [],
    decisions: market.decisions ?? []
  };
}

export function saveWithNormalizedFreeAgencyMarket(save: GameSave): GameSave {
  return { ...save, freeAgencyMarket: normalizeFreeAgencyMarket(save) };
}

export function expectedFreeAgentYears(player: Player): number {
  if (player.age <= 25 && player.potential >= 68) return 4;
  if (player.age >= 32) return 1;
  if (player.overall >= 68) return 3;
  return 2;
}

export function expectedFreeAgentAsk(player: Player): number {
  return suggestedApy(player);
}

export function projectedPendingFreeAgents(save: GameSave): Player[] {
  return save.players
    .filter((player) => player.teamId !== FREE_AGENT_TEAM_ID)
    .filter((player) => !isPracticeSquadPlayer(player))
    .filter((player) => (player.contract?.endYear ?? save.seasonYear + player.contractYears - 1) <= save.seasonYear)
    .sort((a, b) => expectedFreeAgentAsk(b) - expectedFreeAgentAsk(a) || b.overall - a.overall || a.lastName.localeCompare(b.lastName));
}

export function projectedCapHitForOffer(save: GameSave, player: Player, years: number, apy: number, security: FreeAgentSecurityLevel): number {
  const bonusRate = security === "strong" ? 0.28 : security === "low" ? 0.12 : 0.2;
  const contract = makeContract(player, save.seasonYear, {
    origin: "free-agent",
    rights: "none",
    years,
    apy,
    signingBonus: apy * years * bonusRate,
    guaranteedTotal: apy * Math.min(2, years) * (security === "strong" ? 0.78 : security === "low" ? 0.42 : 0.62)
  });
  const firstYear = contract.seasons.find((season) => season.seasonYear === save.seasonYear) ?? contract.seasons[0];
  return money((firstYear?.baseSalary ?? apy) + (firstYear?.signingBonusProration ?? 0));
}

export function roleForTeamNeed(save: GameSave, player: Player, teamId: string): FreeAgentRolePromise {
  const need = rosterNeeds(save, teamId).find((item) => item.position === player.position);
  if ((need?.grade ?? 60) <= player.overall - 4 && player.overall >= 60) return "starter";
  if ((need?.grade ?? 60) <= player.overall + 3) return "rotation";
  if (player.age <= 24 || player.potential >= player.overall + 8) return "development";
  return "depth";
}

export function freeAgentInterestScore(
  save: GameSave,
  player: Player,
  teamId: string,
  terms: { years: number; apy: number; security: FreeAgentSecurityLevel; role: FreeAgentRolePromise }
): number {
  const ask = expectedFreeAgentAsk(player);
  const moneyScore = Math.min(42, (terms.apy / Math.max(0.5, ask)) * 34);
  const securityScore = terms.security === "strong" ? 12 : terms.security === "standard" ? 8 : 3;
  const roleScore = terms.role === "starter" ? 15 : terms.role === "rotation" ? 10 : terms.role === "development" ? 7 : 5;
  const need = rosterNeeds(save, teamId).find((item) => item.position === player.position)?.grade ?? 60;
  const needScore = Math.max(0, Math.min(12, (player.overall - need + 10) * 0.55));
  const contenderScore = Math.max(0, Math.min(8, (teamOverall(save, teamId) - 55) * 0.25));
  const capScore = Math.max(0, Math.min(6, teamCapLedger(save, teamId).capRoom / Math.max(1, ask) * 1.8));
  const loyaltyPenalty = player.previousTeamId && player.previousTeamId !== teamId ? 0 : 3;
  return Math.round(Math.max(1, Math.min(99, moneyScore + securityScore + roleScore + needScore + contenderScore + capScore + loyaltyPenalty)));
}

export function likelyFreeAgentCompetitors(save: GameSave, player: Player, limit = 3): string[] {
  return save.teams
    .map((team) => ({
      teamId: team.id,
      score: freeAgentInterestScore(save, player, team.id, {
        years: expectedFreeAgentYears(player),
        apy: expectedFreeAgentAsk(player),
        security: "standard",
        role: roleForTeamNeed(save, player, team.id)
      })
    }))
    .sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId))
    .slice(0, limit)
    .map((item) => item.teamId);
}

export function submitFreeAgentOffer(
  save: GameSave,
  playerId: string,
  teamId = save.selectedTeamId,
  terms?: Partial<Pick<FreeAgentOffer, "years" | "apy" | "security" | "role">>
): GameSave {
  const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === FREE_AGENT_TEAM_ID);
  if (!player) return save;
  const market = normalizeFreeAgencyMarket(save);
  const years = terms?.years ?? expectedFreeAgentYears(player);
  const apy = money(terms?.apy ?? expectedFreeAgentAsk(player));
  const security = terms?.security ?? "standard";
  const role = terms?.role ?? roleForTeamNeed(save, player, teamId);
  const contract = contractOfferForPlayer(save, player, teamId, { years, apy });
  const check = canSignFreeAgentWithContract(save, player.id, teamId, contract);
  if (!check.ok) return save;
  const source = teamId === save.selectedTeamId ? "user" : "cpu";
  const offer: FreeAgentOffer = {
    id: `fa-offer-${save.seasonYear}-${save.currentWeek}-${market.currentWave}-${teamId}-${player.id}`,
    seasonYear: save.seasonYear,
    week: save.currentWeek,
    date: save.currentDate,
    wave: market.currentWave,
    playerId: player.id,
    teamId,
    source,
    years,
    apy,
    security,
    role,
    interestScore: freeAgentInterestScore(save, player, teamId, { years, apy, security, role }),
    projectedCapHit: projectedCapHitForOffer(save, player, years, apy, security),
    expectedAsk: expectedFreeAgentAsk(player),
    status: "submitted",
    resolveWeek: save.currentWeek,
    resolveDate: save.currentDate,
    competingTeamIds: source === "user" ? likelyFreeAgentCompetitors(save, player).filter((id) => id !== teamId) : []
  };
  const offers = [offer, ...market.offers.filter((candidate) => !(candidate.status === "submitted" && candidate.playerId === player.id && candidate.teamId === teamId))];
  return {
    ...save,
    freeAgencyMarket: { ...market, offers },
    freeAgencyLog: [
      makeFreeAgencyMove(save, { ...player, salary: apy, contractYears: years }, teamId, "offer", {
        source: offer.source,
        details: `${years} yr, $${apy.toFixed(1)}M APY, ${role}`
      }),
      ...(save.freeAgencyLog ?? [])
    ]
  };
}

function cpuNeedPositions(save: GameSave, teamId: string): Position[] {
  return rosterNeeds(save, teamId)
    .filter((need) => need.grade < 58)
    .slice(0, 4)
    .map((need) => need.position);
}

function cpuOfferTargets(save: GameSave, teamId: string): Player[] {
  const needs = new Set(cpuNeedPositions(save, teamId));
  const shortRoster = activeRosterSize(save, teamId) < 53;
  return freeAgentPlayers(save)
    .filter((player) => shortRoster || needs.has(player.position))
    .filter((player) => player.overall >= 50 || needs.has(player.position))
    .sort((a, b) => {
      const aNeed = needs.has(a.position) ? 8 : 0;
      const bNeed = needs.has(b.position) ? 8 : 0;
      return (b.overall + bNeed) - (a.overall + aNeed) || expectedFreeAgentAsk(a) - expectedFreeAgentAsk(b);
    })
    .slice(0, shortRoster ? 3 : 1);
}

export function addCpuFreeAgentOffers(save: GameSave, options: { includeSelectedTeam?: boolean } = {}): GameSave {
  let next = saveWithNormalizedFreeAgencyMarket(save);
  for (const team of next.teams) {
    if (team.id === next.selectedTeamId && !options.includeSelectedTeam) continue;
    for (const player of cpuOfferTargets(next, team.id)) {
      const ask = expectedFreeAgentAsk(player);
      const role = roleForTeamNeed(next, player, team.id);
      const apy = money(ask * (role === "starter" ? 1.06 : role === "rotation" ? 0.98 : 0.9));
      next = submitFreeAgentOffer(next, player.id, team.id, {
        years: expectedFreeAgentYears(player),
        apy,
        security: role === "starter" ? "strong" : "standard",
        role
      });
    }
  }
  return next;
}

export function resolveFreeAgencyWave(save: GameSave, options: { includeCpuOffers?: boolean } = {}): GameSave {
  let next = saveWithNormalizedFreeAgencyMarket(save);
  if (options.includeCpuOffers) next = addCpuFreeAgentOffers(next);
  const market = normalizeFreeAgencyMarket(next);
  const submitted = market.offers.filter((offer) => offer.status === "submitted" && ((offer.resolveDate ?? next.currentDate) <= next.currentDate || offer.resolveWeek <= next.currentWeek));
  const byPlayer = new Map<string, FreeAgentOffer[]>();
  for (const offer of submitted) {
    byPlayer.set(offer.playerId, [...(byPlayer.get(offer.playerId) ?? []), offer]);
  }

  let offers = market.offers.slice();
  const decisions: FreeAgencyDecisionLog[] = [];
  for (const [playerId, playerOffers] of byPlayer) {
    const player = next.players.find((candidate) => candidate.id === playerId && candidate.teamId === FREE_AGENT_TEAM_ID);
    if (!player) {
      offers = offers.map((offer) => offer.playerId === playerId && offer.status === "submitted" ? { ...offer, status: "expired", resolvedWeek: next.currentWeek, resolvedDate: next.currentDate, resolutionReason: "Player is no longer available." } : offer);
      continue;
    }
    const sorted = playerOffers
      .map((offer) => ({ offer, score: offer.interestScore + Math.max(0, offer.apy - offer.expectedAsk) * 1.4 }))
      .sort((a, b) => b.score - a.score || b.offer.apy - a.offer.apy || a.offer.teamId.localeCompare(b.offer.teamId));
    const winner = sorted[0]?.offer;
    if (!winner || winner.interestScore < 44) {
      offers = offers.map((offer) => offer.playerId === playerId && offer.status === "submitted" ? { ...offer, status: "declined", resolvedWeek: next.currentWeek, resolvedDate: next.currentDate, resolutionReason: "Offer did not meet the player's market." } : offer);
      decisions.push(decisionFor(next, player, undefined, "declined", "No offer met the player's market."));
      continue;
    }
    const contract = contractOfferForPlayer(next, player, winner.teamId, { years: winner.years, apy: winner.apy });
    const beforeTeamId = player.previousTeamId;
    next = signFreeAgentWithContract(next, player.id, winner.teamId, contract, {
      source: winner.source,
      details: `${winner.years} yr, $${winner.apy.toFixed(1)}M APY, ${winner.role}`
    });
    const signed = next.players.find((candidate) => candidate.id === player.id);
    if (!signed || signed.teamId === FREE_AGENT_TEAM_ID) {
      offers = offers.map((offer) => offer.playerId === playerId && offer.status === "submitted" ? { ...offer, status: "declined", resolvedWeek: next.currentWeek, resolvedDate: next.currentDate, resolutionReason: "The winning team could not fit the contract." } : offer);
      decisions.push(decisionFor(next, player, undefined, "declined", "Winning team could not fit the contract."));
      continue;
    }
    offers = offers.map((offer) => {
      if (offer.playerId !== playerId || offer.status !== "submitted") return offer;
      return {
        ...offer,
        status: offer.id === winner.id ? "accepted" : "declined",
        resolvedWeek: next.currentWeek,
        resolvedDate: next.currentDate,
        resolutionReason: offer.id === winner.id ? "Accepted best offer." : `Signed with ${winner.teamId.toUpperCase()}.`
      };
    });
    decisions.push(decisionFor(next, signed, winner, "accepted", `${signed.firstName} ${signed.lastName} signed with ${winner.teamId.toUpperCase()}${beforeTeamId ? ` after leaving ${beforeTeamId.toUpperCase()}` : ""}.`));
  }

  return {
    ...next,
    freeAgencyMarket: {
      ...normalizeFreeAgencyMarket(next),
      currentWave: market.currentWave + 1,
      offers,
      decisions: [...decisions, ...market.decisions].slice(0, 80)
    }
  };
}

function decisionFor(
  save: GameSave,
  player: Player,
  offer: FreeAgentOffer | undefined,
  status: FreeAgencyDecisionLog["status"],
  summary: string
): FreeAgencyDecisionLog {
  const market = normalizeFreeAgencyMarket(save);
  return {
    id: `fa-decision-${save.seasonYear}-${save.currentWeek}-${market.currentWave}-${player.id}-${status}`,
    seasonYear: save.seasonYear,
    week: save.currentWeek,
    date: save.currentDate,
    wave: market.currentWave,
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    teamId: offer?.teamId,
    status,
    apy: offer?.apy,
    years: offer?.years,
    summary
  };
}
