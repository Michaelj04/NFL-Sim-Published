import type { GameSave, Player, Position, RosterMoveRecommendation } from "../types";
import { canReleasePlayer, freeAgentPlayers, releasePlayerToFreeAgency } from "./freeAgents";
import { expectedFreeAgentAsk, expectedFreeAgentYears, resolveFreeAgencyWave, submitFreeAgentOffer } from "./freeAgentMarket";
import { activeRosterSize, activatePlayerFromIr, autoManageCpuIr, canActivatePlayerFromIr, canDesignatePlayerToReturn, canPlacePlayerOnIr, designatePlayerToReturn, irPlayersForTeam, isOnIr, placePlayerOnIr } from "./ir";
import { canElevatePracticeSquadPlayer, canPromotePracticeSquadPlayer, elevatePracticeSquadPlayer, isPracticeSquadPlayer, practiceSquadPlayers, promotePracticeSquadPlayer } from "./practiceSquad";
import { rosterNeeds } from "./selectors";

const TARGET_POSITION_COUNTS: Partial<Record<Position, number>> = {
  QB: 2, RB: 3, WR: 5, TE: 3, LT: 2, LG: 2, C: 2, RG: 2, RT: 2,
  EDGE: 4, DL: 4, LB: 5, CB: 5, S: 4, K: 1, P: 1
};

function activeRosterPlayers(save: GameSave, teamId: string): Player[] {
  return save.players.filter((player) => (
    player.teamId === teamId &&
    !isOnIr(player) &&
    !isPracticeSquadPlayer(player)
  ));
}

function positionCounts(save: GameSave, teamId: string): Partial<Record<Position, number>> {
  return activeRosterPlayers(save, teamId).reduce((counts, player) => {
    counts[player.position] = (counts[player.position] ?? 0) + 1;
    return counts;
  }, {} as Partial<Record<Position, number>>);
}

function bottomRosterCut(save: GameSave, teamId: string, avoidPlayerIds = new Set<string>()): Player | undefined {
  const counts = positionCounts(save, teamId);
  return activeRosterPlayers(save, teamId)
    .filter((player) => !avoidPlayerIds.has(player.id))
    .filter((player) => player.status !== "injured")
    .filter((player) => canReleasePlayer(save, player.id, teamId).ok)
    .sort((a, b) => {
      const aExcess = (counts[a.position] ?? 0) > (TARGET_POSITION_COUNTS[a.position] ?? 2) ? -8 : 0;
      const bExcess = (counts[b.position] ?? 0) > (TARGET_POSITION_COUNTS[b.position] ?? 2) ? -8 : 0;
      return (a.overall + aExcess + a.potential * 0.08) - (b.overall + bExcess + b.potential * 0.08);
    })[0];
}

function bestAvailableFreeAgent(save: GameSave, teamId: string, position?: Position): Player | undefined {
  const needs = new Set(rosterNeeds(save, teamId).slice(0, 5).map((need) => need.position));
  return freeAgentPlayers(save)
    .filter((player) => !position || player.position === position)
    .sort((a, b) => {
      const aNeed = needs.has(a.position) ? 8 : 0;
      const bNeed = needs.has(b.position) ? 8 : 0;
      return (b.overall + bNeed) - (a.overall + aNeed) || expectedFreeAgentAsk(a) - expectedFreeAgentAsk(b);
    })[0];
}

export function autoManageCpuRoster(save: GameSave): GameSave {
  let next = autoManageCpuIr(save);
  for (const team of next.teams) {
    if (team.id === next.selectedTeamId) continue;

    const readyIr = irPlayersForTeam(next, team.id)
      .filter((player) => player.status !== "injured")
      .sort((a, b) => b.overall - a.overall);
    for (const player of readyIr) {
      if (!player.irReturnDesignatedWeek && canDesignatePlayerToReturn(next, player.id, team.id).ok) {
        next = designatePlayerToReturn(next, player.id, team.id);
      }
      if (!canActivatePlayerFromIr(next, player.id, team.id).ok && activeRosterSize(next, team.id) >= 53) {
        const cut = bottomRosterCut(next, team.id, new Set([player.id]));
        if (cut && player.overall >= cut.overall + 4) next = releasePlayerToFreeAgency(next, cut.id, team.id);
      }
      if (canActivatePlayerFromIr(next, player.id, team.id).ok) {
        next = activatePlayerFromIr(next, player.id, team.id);
      }
    }

    const injuredPressure = activeRosterPlayers(next, team.id).filter((player) => player.status === "injured" || player.status === "limited").length;
    if (activeRosterSize(next, team.id) < 53 || injuredPressure >= 3) {
      const topNeed = rosterNeeds(next, team.id)[0]?.position;
      const callup = practiceSquadPlayers(next, team.id)
        .filter((player) => !topNeed || player.position === topNeed)
        .filter((player) => canPromotePracticeSquadPlayer(next, player.id, team.id).ok)
        .sort((a, b) => b.overall - a.overall || b.potential - a.potential)[0];
      if (callup && activeRosterSize(next, team.id) < 53) {
        next = promotePracticeSquadPlayer(next, callup.id, team.id);
        continue;
      }
      const target = bestAvailableFreeAgent(next, team.id, topNeed);
      if (target) {
        next = submitFreeAgentOffer(next, target.id, team.id, {
          years: expectedFreeAgentYears(target),
          apy: expectedFreeAgentAsk(target),
          security: "standard",
          role: "depth"
        });
      }
    }

    if (injuredPressure >= 2) {
      const elevation = practiceSquadPlayers(next, team.id)
        .filter((player) => canElevatePracticeSquadPlayer(next, player.id, team.id).ok)
        .sort((a, b) => b.overall - a.overall || b.potential - a.potential)[0];
      if (elevation) next = elevatePracticeSquadPlayer(next, elevation.id, team.id);
    }
  }
  return resolveFreeAgencyWave(next, { includeCpuOffers: true });
}

export function buildRosterMoveRecommendations(save: GameSave, teamId = save.selectedTeamId): RosterMoveRecommendation[] {
  const recommendations: RosterMoveRecommendation[] = [];
  for (const player of activeRosterPlayers(save, teamId)) {
    if (player.status === "injured" && !isOnIr(player) && (player.injuryWeeks >= 4 || (player.injury?.initialWeeks ?? 0) >= 5)) {
      const check = canPlacePlayerOnIr(save, player.id, teamId);
      recommendations.push({
        id: `place-ir-${player.id}`,
        type: "place-ir",
        teamId,
        playerId: player.id,
        position: player.position,
        title: `Place ${player.firstName} ${player.lastName} on IR`,
        summary: `${player.position} is projected out ${player.injuryWeeks} weeks.`,
        impact: check.ok ? "Frees one active roster spot while salary stays on the cap." : check.reason ?? "IR unavailable.",
        required: false,
        disabledReason: check.ok ? undefined : check.reason
      });
    }
  }

  for (const player of irPlayersForTeam(save, teamId).filter((candidate) => candidate.status !== "injured").sort((a, b) => b.overall - a.overall)) {
    if (!player.irReturnDesignatedWeek && canDesignatePlayerToReturn(save, player.id, teamId).ok) {
      recommendations.push({
        id: `designate-ir-${player.id}`,
        type: "designate-ir-return",
        teamId,
        playerId: player.id,
        position: player.position,
        title: `Open return window for ${player.firstName} ${player.lastName}`,
        summary: `${player.position} has met the four-week IR minimum and is medically cleared.`,
        impact: "Uses one team IR return activation and starts the three-week practice window.",
        required: false
      });
    }
    if (player.irReturnDesignatedWeek) {
      const check = canActivatePlayerFromIr(save, player.id, teamId);
      recommendations.push({
        id: `activate-ir-${player.id}`,
        type: "activate-ir",
        teamId,
        playerId: player.id,
        position: player.position,
        title: `Activate ${player.firstName} ${player.lastName} from IR`,
        summary: `${player.position} is ready to return to the active roster.`,
        impact: check.ok ? "Restores him to the active roster." : check.reason ?? "Activation unavailable.",
        required: Boolean(player.irPracticeWindowDeadlineWeek && save.currentWeek >= player.irPracticeWindowDeadlineWeek),
        disabledReason: check.ok ? undefined : check.reason
      });
    }
  }

  if (activeRosterSize(save, teamId) < 53) {
    const need = rosterNeeds(save, teamId)[0]?.position;
    const callup = practiceSquadPlayers(save, teamId)
      .filter((player) => !need || player.position === need)
      .filter((player) => canPromotePracticeSquadPlayer(save, player.id, teamId).ok)
      .sort((a, b) => b.overall - a.overall || b.potential - a.potential)[0];
    if (callup) {
      recommendations.push({
        id: `promote-${callup.id}`,
        type: "promote-practice",
        teamId,
        playerId: callup.id,
        position: callup.position,
        title: `Promote ${callup.firstName} ${callup.lastName}`,
        summary: `Practice squad ${callup.position} fills an active roster opening.`,
        impact: "Converts to active-roster salary and counts against the 53.",
        required: activeRosterSize(save, teamId) < 45
      });
    } else {
      const target = bestAvailableFreeAgent(save, teamId, need);
      if (target) {
        recommendations.push({
          id: `offer-${target.id}`,
          type: "sign",
          teamId,
          targetPlayerId: target.id,
          position: target.position,
          title: `Offer ${target.firstName} ${target.lastName}`,
          summary: `Best available ${target.position} for a roster opening.`,
          impact: `Projected ask $${expectedFreeAgentAsk(target).toFixed(1)}M APY over ${expectedFreeAgentYears(target)} years.`,
          required: activeRosterSize(save, teamId) < 45
        });
      }
    }
  }

  return recommendations;
}

export function applyRosterMoveRecommendations(save: GameSave, recommendationIds: string[], teamId = save.selectedTeamId): GameSave {
  let next = save;
  const selected = new Set(recommendationIds);
  const recommendations = buildRosterMoveRecommendations(save, teamId).filter((recommendation) => selected.has(recommendation.id) && !recommendation.disabledReason);
  for (const recommendation of recommendations) {
    if (recommendation.type === "place-ir" && recommendation.playerId) next = placePlayerOnIr(next, recommendation.playerId, teamId);
    if (recommendation.type === "designate-ir-return" && recommendation.playerId) next = designatePlayerToReturn(next, recommendation.playerId, teamId);
    if (recommendation.type === "activate-ir" && recommendation.playerId) {
      if (!canActivatePlayerFromIr(next, recommendation.playerId, teamId).ok && activeRosterSize(next, teamId) >= 53) {
        const cut = bottomRosterCut(next, teamId, new Set([recommendation.playerId]));
        if (cut) next = releasePlayerToFreeAgency(next, cut.id, teamId);
      }
      next = activatePlayerFromIr(next, recommendation.playerId, teamId);
    }
    if (recommendation.type === "promote-practice" && recommendation.playerId) next = promotePracticeSquadPlayer(next, recommendation.playerId, teamId);
    if (recommendation.type === "elevate-practice" && recommendation.playerId) next = elevatePracticeSquadPlayer(next, recommendation.playerId, teamId);
    if (recommendation.type === "sign" && recommendation.targetPlayerId) {
      const target = next.players.find((player) => player.id === recommendation.targetPlayerId);
      if (target) {
        next = submitFreeAgentOffer(next, target.id, teamId, {
          years: expectedFreeAgentYears(target),
          apy: expectedFreeAgentAsk(target),
          security: "standard",
          role: "depth"
        });
      }
    }
  }
  return next;
}

export function hasBlockingRosterIssues(save: GameSave, teamId = save.selectedTeamId): boolean {
  return activeRosterSize(save, teamId) < 45 || buildRosterMoveRecommendations(save, teamId).some((recommendation) => recommendation.required && !recommendation.disabledReason);
}
