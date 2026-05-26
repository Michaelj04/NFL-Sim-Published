import { afterEach, describe, expect, it, vi } from "vitest";
import { collegePrograms } from "../../data/collegePrograms";
import { collegeImageFor } from "../../data/collegeImages";
import { firstNames, lastNames } from "../../data/names";
import { nflTeams } from "../../data/nflTeams";
import { createRng } from "../../lib/rng";
import { createRoot } from "react-dom/client";
import { act, createElement } from "react";
import { CollegeLogo, TeamLogo, normalizeSave } from "../../App";
import type { CollegeProgram } from "../../types";
import { concernBandFor, concernSignalForRange, teamConcernAdjustment } from "../concerns";
import {
  advanceToDraftPrep,
  advanceToFreeAgency,
  capSavingsIfMoved,
  deadMoneyIfMoved,
  playerCapHit,
  projectCompPicks,
  restructurePlayerContract,
  teamCapLedger
} from "../cap";
import { runAnnualDevelopment } from "../development";
import { buildDisplayDepthChart, buildFormationAssignments, displayEffectiveOverall, offenseFormations } from "../depthDisplay";
import {
  advanceDraftEvent,
  applyDraftTradeOffer,
  buildTradeDownOfferToUser,
  buildTradeOfferForPick,
  clearDraftEvent,
  completedDraftTrades,
  currentDraftPick,
  draftPickTimeLimit,
  draftRoomNeeds,
  enterDraft,
  ensureDraftState,
  makeDraftSelection,
  runRookieOnboarding,
  setDraftSpeed,
  setSkipDraftTradeNotifications,
  simRestOfDraft
} from "../draft";
import { createNewSave, generateSchedule } from "../generate";
import { applyMedicalEvents, buildMedicalEvent, injuryRiskWeight, medicalTuningForTests, playerMedical, tickMedicalRecovery } from "../medical";
import {
  IR_PLAYER_RETURN_LIMIT,
  IR_TEAM_RETURN_LIMIT,
  activatePlayerFromIr,
  activeRosterSize,
  autoManageCpuIr,
  canActivatePlayerFromIr,
  canDesignatePlayerToReturn,
  canPlacePlayerOnIr,
  designatePlayerToReturn,
  isOnIr,
  placePlayerOnIr
} from "../ir";
import { passMatchupChances, simulateGame } from "../playByPlay";
import { calculateSnapPlan, starterCountsByPosition } from "../personnel";
import { effectiveOverallAtPosition, eligiblePositionsFor, generatePositionFits, normalizePositionFits, positionFitFor, skillOverallAtPosition, versatilityBonus } from "../positionEligibility";
import {
  calculateOverallFromRatings,
  generateRatings,
  ratingTierLabel,
  ratingRegistry,
  refreshPlayerRatings,
  refreshProspectRatings
} from "../ratings";
import { FREE_AGENT_TEAM_ID, MAX_ROSTER_SIZE, freeAgentPlayers, releasePlayerToFreeAgency, signFreeAgent } from "../freeAgents";
import { expectedFreeAgentAsk, projectedPendingFreeAgents, resolveFreeAgencyWave, submitFreeAgentOffer } from "../freeAgentMarket";
import { gamesOnDate, leagueYearStartDate, regularSeasonStartDate } from "../calendar";
import {
  PRACTICE_SQUAD_PLAYER_ELEVATION_LIMIT,
  PRACTICE_SQUAD_PROTECTION_LIMIT,
  PRACTICE_SQUAD_SIZE,
  canElevatePracticeSquadPlayer,
  canPoachPracticeSquadPlayer,
  canPromotePracticeSquadPlayer,
  canProtectPracticeSquadPlayer,
  canSignFreeAgentToPracticeSquad,
  elevatePracticeSquadPlayer,
  isPracticeSquadPlayer,
  poachPracticeSquadPlayer,
  practiceSquadPlayers,
  promotePracticeSquadPlayer,
  protectPracticeSquadPlayer,
  releasePracticeSquadPlayer,
  signFreeAgentToPracticeSquad
} from "../practiceSquad";
import { normalizePlayerModel, runWeeklyTraining } from "../playerModel";
import { autoManageCpuRoster, buildRosterMoveRecommendations } from "../rosterAi";
import {
  applyScoutingProjection,
  applyWeeklyScoutingPlan,
  buildWeeklyScoutingRecap,
  compareProspectsForLens,
  ensureScoutingPlan,
  optimizeWeeklyScoutingPlan,
  quickFocusProspect,
  scoutingAssignmentPreview,
  scoutingRecapImpact,
  updateProspectBoard,
  updateScoutingAssignment,
  updateScoutingAssignmentLock
} from "../scouting";
import { createMemorySaveDriver, createSaveRepository, LEGACY_STORAGE_KEY, parseSave, serializeSave } from "../save";
import { advanceDay, advancePostseasonRound, advanceWeek, applyCharacterEvents, characterEventChance, startNextSeason } from "../season";
import { depthChart, playoffSeeds, playersForTeam, powerRankings, rosterNeeds, teamOverall, teamSchedule } from "../selectors";
import { hireStaffCandidate, interviewStaffCandidate, staffPayroll, staffSlotDefinitions, staffValueScore } from "../staff";
import { packageValue, playerTradeValue, tradeVerdict } from "../trade";
import { isPlayerOnWaivers, processWaiversForDate, submitWaiverClaim } from "../waivers";
import {
  beginRookieOnboarding,
  bestRookieScore,
  finalizeUdfaClass,
  getCurrentAiUdfaWaveOffers,
  placeUdfaOffer,
  resolveNextUdfaWave,
  rivalUdfaOffers,
  rookieClassScoreRows,
  rookieValueSpentScore,
  simRemainingUdfaWaves,
  UDFA_OFFER_SLOTS,
  undraftedProspects,
  withdrawUdfaOffer
} from "../udfa";
import { POSITIONS, type ActiveInjury, type GameSave, type MedicalEvent, type Prospect } from "../../types";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function withProgress(save: GameSave, progressById: Map<string, number> | Record<string, number>, fallback?: number): GameSave {
  const progressMap = progressById instanceof Map ? progressById : new Map(Object.entries(progressById));
  return {
    ...save,
    prospects: save.prospects.map((prospect) => {
      const progress = progressMap.get(prospect.id) ?? fallback;
      if (progress === undefined) return prospect;
      return {
        ...prospect,
        scouted: {
          ...prospect.scouted,
          confidence: progress,
          progress
        }
      };
    })
  };
}

function withProspectPatch(save: GameSave, prospectId: string, patch: (prospect: Prospect) => Prospect): GameSave {
  return {
    ...save,
    prospects: save.prospects.map((prospect) => (prospect.id === prospectId ? patch(prospect) : prospect))
  };
}

function testRatings(base = 60): number[] {
  return Array.from({ length: ratingRegistry.length }, () => base);
}

function setTestRating(ratings: number[], key: string, value: number): void {
  const index = ratingRegistry.findIndex((rating) => rating.key === key);
  if (index >= 0) ratings[index] = value;
}

function averageKeys(ratings: number[], keys: string[]): number {
  return keys.reduce((sum, key) => {
    const index = ratingRegistry.findIndex((rating) => rating.key === key);
    return sum + (index >= 0 ? ratings[index] : 0);
  }, 0) / Math.max(1, keys.length);
}

function boost(ratings: number[], keys: string[], value = 90): number[] {
  keys.forEach((key) => setTestRating(ratings, key, value));
  return ratings;
}

function onlyPositionFit(position: (typeof POSITIONS)[number]) {
  return Object.fromEntries(POSITIONS.map((candidate) => [candidate, candidate === position ? 100 : 0]));
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

function renderCollegeLogo(school: CollegeProgram) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(CollegeLogo, { school }));
  });
  return { container, root };
}

function renderTeamLogo(team: (typeof nflTeams)[number]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const save = { teams: [team] } as GameSave;
  act(() => {
    root.render(createElement(TeamLogo, { save, teamId: team.id }));
  });
  return { container, root };
}

function finishDraftForTest(save: GameSave): GameSave {
  let next = setSkipDraftTradeNotifications(ensureDraftState(save), true);
  let guard = 0;
  while (next.phase === "draft" && guard < 800) {
    if (next.draftState.pendingEvent) {
      next = clearDraftEvent(next);
    }
    const pick = currentDraftPick(next);
    if (!pick) break;
    if (pick.currentTeamId === next.selectedTeamId) {
      const draftedIds = new Set(next.draftState.history.map((selection) => selection.prospectId));
      const prospect = next.prospects
        .filter((candidate) => !draftedIds.has(candidate.id))
        .sort((a, b) => a.teamRank - b.teamRank)[0];
      next = makeDraftSelection(next, prospect?.id);
    } else {
      next = advanceDraftEvent(next);
    }
    guard += 1;
  }
  return next;
}

function finishPostseasonForTest(save: GameSave): GameSave {
  let next = save;
  let guard = 0;
  while (next.phase === "postseason" && guard < 8) {
    next = advancePostseasonRound(next);
    guard += 1;
  }
  return next;
}

function advanceToUserPickForTest(save: GameSave): GameSave {
  let next = setSkipDraftTradeNotifications(ensureDraftState(save), true);
  let guard = 0;
  while (next.phase === "draft" && guard < 400) {
    if (next.draftState.pendingEvent) {
      next = clearDraftEvent(next);
    }
    const pick = currentDraftPick(next);
    if (!pick || pick.currentTeamId === next.selectedTeamId) return next;
    next = advanceDraftEvent(next);
    guard += 1;
  }
  return next;
}

function completeOnePickDraftForTest(seed: string): GameSave {
  const base = createNewSave("chi", "goals", seed);
  const draftYear = base.draftState.draftYear;
  const draftPrep: GameSave = {
    ...base,
    phase: "draft-prep",
    draftPicks: base.draftPicks.filter((pick) => pick.draftYear !== draftYear || pick.overallPick <= 1),
    draftState: {
      ...base.draftState,
      currentPickIndex: 0,
      order: [],
      history: [],
      completed: false,
      pendingEvent: undefined
    }
  };
  const opened = enterDraft(draftPrep);
  return makeDraftSelection(opened, opened.prospects[0].id);
}

describe("franchise generator", () => {
  it("uses expanded shared name pools for generated people", () => {
    const save = createNewSave("chi", "goals", "expanded-name-pool-seed");
    const people = [
      ...playersForTeam(save, "chi"),
      ...save.prospects.slice(0, 40),
      ...save.staff.filter((member) => member.teamId === "chi"),
      ...save.staffMarket.candidates.slice(0, 20)
    ];

    expect(firstNames.length).toBeGreaterThanOrEqual(250);
    expect(lastNames.length).toBeGreaterThanOrEqual(350);
    expect(people.every((person) => firstNames.includes(person.firstName as (typeof firstNames)[number]))).toBe(true);
    expect(people.every((person) => lastNames.includes(person.lastName as (typeof lastNames)[number]))).toBe(true);
  });

  it("keeps obvious duplicate full names out of generated cohorts", () => {
    const save = createNewSave("bal", "goals", "duplicate-name-seed");
    const rosterNames = playersForTeam(save, "bal").map(fullName);
    const prospectNames = save.prospects.map(fullName);
    const staffNames = save.staff.filter((member) => member.teamId === "bal").map(fullName);
    const marketNames = save.staffMarket.candidates.map(fullName);

    expect(new Set(rosterNames).size).toBe(rosterNames.length);
    expect(new Set(prospectNames).size).toBe(prospectNames.length);
    expect(new Set(staffNames).size).toBe(staffNames.length);
    expect(new Set(marketNames).size).toBe(marketNames.length);
  });

  it("creates a full NFL save with 53-man rosters, practice squads, and a college pipeline", () => {
    const save = createNewSave("chi", "goals", "unit-seed");

    expect(save.teams).toHaveLength(32);
    expect(activeRosterSize(save, "chi")).toBe(53);
    expect(practiceSquadPlayers(save, "chi")).toHaveLength(PRACTICE_SQUAD_SIZE);
    expect(save.schools.length).toBeGreaterThan(180);
    expect(save.prospects).toHaveLength(460);
    expect(save.prospects.some((prospect) => (prospect as any).region === "Small School")).toBe(false);
    expect(save.scoutingPlan.assignments.some((assignment) => (assignment as any).region === "Small School")).toBe(false);
    expect(save.staff.filter((member) => member.teamId === "chi")).toHaveLength(staffSlotDefinitions.length);
    expect(save.budget.chi).toEqual(expect.any(Number));
  });

  it("seeds deterministic first-year compensatory picks for fresh careers", () => {
    const first = createNewSave("chi", "goals", "seeded-comp-picks");
    const second = createNewSave("chi", "goals", "seeded-comp-picks");
    const compPicks = first.draftPicks.filter((pick) => pick.draftYear === first.draftState.draftYear && pick.compensatory);
    const byTeam = compPicks.reduce<Record<string, number>>((counts, pick) => ({
      ...counts,
      [pick.originalTeamId]: (counts[pick.originalTeamId] ?? 0) + 1
    }), {});

    expect(compPicks.length).toBeGreaterThanOrEqual(24);
    expect(compPicks.length).toBeLessThanOrEqual(32);
    expect(compPicks.every((pick) => pick.round >= 3 && pick.round <= 7)).toBe(true);
    expect(compPicks.every((pick) => pick.pickInRound > first.teams.length)).toBe(true);
    expect(compPicks.every((pick) => pick.compSource === "seeded")).toBe(true);
    expect(Math.max(...Object.values(byTeam))).toBeLessThanOrEqual(4);
    expect(new Set(first.draftPicks.filter((pick) => pick.draftYear === first.draftState.draftYear).map((pick) => pick.overallPick)).size)
      .toBe(first.draftState.order.length);
    expect(first.draftState.order).toEqual(expect.arrayContaining(compPicks.map((pick) => pick.id)));
    expect(compPicks.map((pick) => `${pick.id}:${pick.overallPick}`)).toEqual(
      second.draftPicks
        .filter((pick) => pick.draftYear === second.draftState.draftYear && pick.compensatory)
        .map((pick) => `${pick.id}:${pick.overallPick}`)
    );
  });

  it("hydrates generated players and prospects with body, training, and skill-bucket data", () => {
    const save = createNewSave("chi", "goals", "player-model-seed");
    const player = save.players[0];
    const prospect = save.prospects[0];

    expect(player.body.heightInches).toBeGreaterThan(66);
    expect(player.body.weightLbs).toBeGreaterThan(170);
    expect(player.skillBuckets.coverage).toEqual(expect.any(Number));
    expect(player.training.conversionProgress[player.position]).toBe(100);
    expect(prospect.body.musclePct).toBeGreaterThan(30);
    expect(prospect.training.targetPosition).toBe(prospect.position);
    expect(prospect.scouted.bodyRanges?.heightInches[0]).toBe(prospect.body.heightInches);
    expect(prospect.scouted.conversionUpside?.length ?? 0).toBeGreaterThan(0);
  });

  it("runs weekly training without changing height and produces transparent reports", () => {
    const save = createNewSave("chi", "goals", "weekly-training-seed");
    const trackedPlayer = playersForTeam(save, "chi")[0];
    const initialHeight = trackedPlayer.body.heightInches;
    const initialWeight = trackedPlayer.body.weightLbs;

    const next = runWeeklyTraining(save);
    const updated = next.players.find((player) => player.id === trackedPlayer.id)!;

    expect(updated.body.heightInches).toBe(initialHeight);
    expect(updated.training.lastReport?.week).toBe(save.currentWeek);
    expect(updated.training.lastReport?.bodySummary.length).toBeGreaterThan(5);
    expect(updated.training.lastReport?.readinessDelta).toEqual(expect.any(Number));
    expect(Math.abs(updated.body.weightLbs - initialWeight)).toBeLessThanOrEqual(3);
  }, 15000);

  it("can auto-switch a player to a better trained position", () => {
    const save = createNewSave("chi", "goals", "position-switch-seed");
    const basePlayer = playersForTeam(save, "chi").find((player) => player.position === "LB")!;
    const converted = normalizePlayerModel({
      ...basePlayer,
      position: "LB",
      body: {
        heightInches: 72,
        frameSize: 58,
        weightLbs: 196,
        musclePct: 46,
        bodyFatPct: 9,
        conditioning: 84,
        flexibility: 88,
        recovery: 76,
        explosiveReadiness: 87
      },
      skillBuckets: {
        ...basePlayer.skillBuckets,
        speed: 92,
        burst: 90,
        processing: 78,
        discipline: 72,
        hands: 80,
        coverage: 95,
        tackling: 70,
        frontDefense: 46,
        passRush: 38,
        power: 44
      },
      training: {
        ...basePlayer.training,
        autoPosition: true,
        targetPosition: "CB",
        conversionProgress: {
          ...basePlayer.training.conversionProgress,
          LB: 100,
          CB: 100
        }
      }
    }, save.seed);

    expect(converted.position).toBe("CB");
    expect(converted.positionFits.CB).toBeGreaterThanOrEqual(90);
  });

  it("seeds a deterministic free-agent market outside team rosters", () => {
    const first = createNewSave("chi", "goals", "free-agent-market-seed");
    const second = createNewSave("chi", "goals", "free-agent-market-seed");
    const market = freeAgentPlayers(first);

    expect(activeRosterSize(first, "chi")).toBe(MAX_ROSTER_SIZE);
    expect(practiceSquadPlayers(first, "chi")).toHaveLength(PRACTICE_SQUAD_SIZE);
    expect(market.length).toBeGreaterThan(120);
    expect(market.every((player) => player.teamId === FREE_AGENT_TEAM_ID)).toBe(true);
    expect(market.map((player) => `${player.id}:${player.overall}:${player.salary}`)).toEqual(
      freeAgentPlayers(second).map((player) => `${player.id}:${player.overall}:${player.salary}`)
    );
  });

  it("seeds current-team tenure for newly generated rosters", () => {
    const save = createNewSave("chi", "goals", "team-tenure-seed");
    const teamPlayers = playersForTeam(save, "chi");

    expect(teamPlayers.length).toBeGreaterThan(0);
    expect(teamPlayers.every((player) => typeof player.teamStartSeason === "number" && player.teamStartSeason! <= save.seasonYear)).toBe(true);
    expect(teamPlayers.some((player) => player.teamStartSeason !== save.seasonYear)).toBe(true);
  });

  it("signs and releases free agents with roster, budget, and transaction log updates", () => {
    let save = createNewSave("chi", "goals", "free-agent-sign-release-seed");
    const released = playersForTeam(save, "chi").filter((player) => !isPracticeSquadPlayer(player)).sort((a, b) => a.salary - b.salary)[0];
    const startingBudget = 120;
    save = { ...save, budget: { ...save.budget, chi: startingBudget } };

    save = releasePlayerToFreeAgency(save, released.id, "chi");
    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE - 1);
    expect(save.players.find((player) => player.id === released.id)?.teamId).toBe(FREE_AGENT_TEAM_ID);
    expect(save.players.find((player) => player.id === released.id)?.teamStartSeason).toBe(save.seasonYear);
    expect(save.budget.chi).toBeCloseTo(teamCapLedger(save, "chi").capRoom, 2);
    expect(save.freeAgencyLog[0]).toMatchObject({ type: "release", playerId: released.id, teamId: "chi" });

    const signed = freeAgentPlayers(save).find((player) => player.id !== released.id && player.salary <= save.budget.chi)!;
    const afterReleaseBudget = save.budget.chi;
    save = signFreeAgent(save, signed.id, "chi");

    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE);
    expect(save.players.find((player) => player.id === signed.id)?.teamId).toBe("chi");
    expect(save.players.find((player) => player.id === signed.id)?.teamStartSeason).toBe(save.seasonYear);
    expect(save.budget.chi).toBeCloseTo(teamCapLedger(save, "chi").capRoom, 2);
    expect(save.budget.chi).toBeLessThan(afterReleaseBudget);
    expect(save.freeAgencyLog[0]).toMatchObject({ type: "signing", playerId: signed.id, teamId: "chi" });
  });

  it("generates year-by-year contracts and cap ledgers for new careers", () => {
    const save = createNewSave("chi", "goals", "cap-ledger-seed");
    const player = playersForTeam(save, "chi")[0];
    const ledger = teamCapLedger(save, "chi");

    expect(player.contract?.seasons.length).toBeGreaterThan(0);
    expect(playerCapHit(player, save.seasonYear)).toBeGreaterThan(0);
    expect(ledger.salaryCap).toBeGreaterThan(250);
    expect(ledger.totalCommitments).toBeGreaterThan(0);
    expect(save.budget.chi).toBeCloseTo(ledger.capRoom, 2);
  });

  it("restructures eligible contracts by lowering current cap and adding proration", () => {
    let save = createNewSave("chi", "goals", "restructure-seed");
    const target = playersForTeam(save, "chi")
      .filter((player) => (player.contract?.seasons.filter((season) => season.seasonYear >= save.seasonYear).length ?? 0) >= 2)
      .sort((a, b) => playerCapHit(b, save.seasonYear) - playerCapHit(a, save.seasonYear))[0];
    const beforeHit = playerCapHit(target, save.seasonYear);
    const beforeRoom = teamCapLedger(save, "chi").capRoom;

    save = restructurePlayerContract(save, target.id, "chi");
    const updated = save.players.find((player) => player.id === target.id)!;

    expect(playerCapHit(updated, save.seasonYear)).toBeLessThan(beforeHit);
    expect(teamCapLedger(save, "chi").capRoom).toBeGreaterThan(beforeRoom);
    expect(updated.contract?.restructureHistory?.[0].convertedBase).toBeGreaterThan(0);
  });

  it("creates dead money and cap savings previews on release", () => {
    let save = createNewSave("chi", "goals", "dead-money-seed");
    const target = playersForTeam(save, "chi").filter((player) => !isPracticeSquadPlayer(player)).sort((a, b) => b.salary - a.salary)[0];
    const projectedDead = deadMoneyIfMoved(target, save.seasonYear);
    const projectedSavings = capSavingsIfMoved(target, save.seasonYear);

    save = releasePlayerToFreeAgency(save, target.id, "chi");

    expect(save.deadMoney?.find((charge) => charge.playerId === target.id)?.amount).toBeCloseTo(projectedDead, 2);
    expect(projectedSavings).toBeGreaterThanOrEqual(0);
    expect(save.budget.chi).toBeCloseTo(teamCapLedger(save, "chi").capRoom, 2);
  });

  it("opens free agency, tracks qualifying UFA movement, and finalizes comp picks", () => {
    let save = createNewSave("chi", "goals", "comp-pick-seed");
    const expiring = playersForTeam(save, "chi").find((player) => !isPracticeSquadPlayer(player) && player.contract);
    expect(expiring).toBeTruthy();
    save = {
      ...save,
      phase: "contract-decisions",
      players: save.players.map((player) => player.id === expiring!.id ? {
        ...player,
        contractYears: 1,
        contract: {
          ...player.contract!,
          endYear: save.seasonYear,
          rights: "ufa" as const,
          seasons: player.contract!.seasons.slice(0, 1).map((season) => ({ ...season, seasonYear: save.seasonYear }))
        }
      } : player)
    };

    save = advanceToFreeAgency(save);
    const marketPlayer = save.players.find((player) => player.id === expiring!.id)!;
    expect(marketPlayer.teamId).toBe(FREE_AGENT_TEAM_ID);
    expect(marketPlayer.previousTeamId).toBe("chi");

    const dalRelease = playersForTeam(save, "dal").find((player) => !isPracticeSquadPlayer(player))!;
    save = releasePlayerToFreeAgency(save, dalRelease.id, "dal");
    save = signFreeAgent(save, marketPlayer.id, "dal");
    save = projectCompPicks(save);
    expect(save.compPickLedger?.entries.some((entry) => entry.teamId === "chi" && entry.kind === "lost")).toBe(true);

    save = advanceToDraftPrep(save);
    expect(save.phase).toBe("draft-prep");
    expect(save.draftPicks.some((pick) => pick.id.startsWith("comp-") && pick.currentTeamId === "chi")).toBe(true);
  });

  it("blocks free-agent signings while the roster is full", () => {
    const save = { ...createNewSave("chi", "goals", "free-agent-full-roster-seed"), budget: { chi: 200 } };
    const target = freeAgentPlayers(save)[0];
    const blocked = signFreeAgent(save, target.id, "chi");

    expect(activeRosterSize(blocked, "chi")).toBe(MAX_ROSTER_SIZE);
    expect(blocked.players.find((player) => player.id === target.id)?.teamId).toBe(FREE_AGENT_TEAM_ID);
    expect(blocked.freeAgencyLog).toHaveLength(0);
  });

  it("submits and resolves free-agent offers through a deterministic market wave", () => {
    let save = createNewSave("chi", "goals", "free-agent-market-wave-seed");
    const release = playersForTeam(save, "chi").filter((player) => !isPracticeSquadPlayer(player)).sort((a, b) => a.overall - b.overall)[0];
    save = releasePlayerToFreeAgency(save, release.id, "chi");
    const target = freeAgentPlayers(save).filter((player) => player.id !== release.id).sort((a, b) => b.overall - a.overall)[0];

    save = submitFreeAgentOffer(save, target.id, "chi", { years: 2, apy: expectedFreeAgentAsk(target) * 1.08, security: "strong", role: "rotation" });
    expect(save.freeAgencyMarket?.offers.some((offer) => offer.playerId === target.id && offer.status === "submitted")).toBe(true);

    save = resolveFreeAgencyWave(save);
    const signed = save.players.find((player) => player.id === target.id)!;
    expect(signed.teamId).toBe("chi");
    expect(save.freeAgencyMarket?.offers.find((offer) => offer.playerId === target.id)?.status).toBe("accepted");
    expect(save.freeAgencyLog.some((move) => move.type === "signing" && move.playerId === target.id)).toBe(true);
  });

  it("lists pending free agents as expiring-contract players, not unresolved offers", () => {
    const save = createNewSave("chi", "goals", "pending-free-agent-class-seed");
    const expiring = playersForTeam(save, "chi").find((player) => !isPracticeSquadPlayer(player) && player.contract)!;
    const withExpiring = {
      ...save,
      players: save.players.map((player) => player.id === expiring.id ? {
        ...player,
        contractYears: 1,
        contract: {
          ...player.contract!,
          endYear: save.seasonYear,
          seasons: player.contract!.seasons.slice(0, 1).map((season) => ({ ...season, seasonYear: save.seasonYear }))
        }
      } : player)
    };

    expect(projectedPendingFreeAgents(withExpiring).some((player) => player.id === expiring.id)).toBe(true);
  });

  it("lets CPU roster AI fill active roster holes from free agency", () => {
    let save = createNewSave("chi", "goals", "cpu-active-fa-ai-seed");
    const cpuRelease = playersForTeam(save, "dal").filter((player) => !isPracticeSquadPlayer(player)).sort((a, b) => a.overall - b.overall)[0];
    save = releasePlayerToFreeAgency(save, cpuRelease.id, "dal");
    expect(activeRosterSize(save, "dal")).toBe(MAX_ROSTER_SIZE - 1);

    const managed = autoManageCpuRoster(save);
    expect(activeRosterSize(managed, "dal")).toBe(MAX_ROSTER_SIZE);
    expect(managed.freeAgencyLog.some((move) => move.type === "signing" && move.teamId === "dal")).toBe(true);
  });

  it("builds user roster recommendations without silently applying them", () => {
    let save = createNewSave("chi", "goals", "user-roster-recommendations-seed");
    const release = playersForTeam(save, "chi").filter((player) => !isPracticeSquadPlayer(player)).sort((a, b) => a.overall - b.overall)[0];
    save = releasePlayerToFreeAgency(save, release.id, "chi");

    const recommendations = buildRosterMoveRecommendations(save, "chi");
    expect(recommendations.some((recommendation) => recommendation.type === "promote-practice" || recommendation.type === "sign")).toBe(true);
    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE - 1);
  });

  it("generates valid practice squads for every team without counting against the active roster", () => {
    const save = createNewSave("chi", "goals", "practice-squad-generation-seed");

    expect(save.teams.every((team) => activeRosterSize(save, team.id) === MAX_ROSTER_SIZE)).toBe(true);
    expect(save.teams.every((team) => practiceSquadPlayers(save, team.id).length === PRACTICE_SQUAD_SIZE)).toBe(true);
    expect(practiceSquadPlayers(save, "chi").every((player) => isPracticeSquadPlayer(player) && player.salary < 0.5)).toBe(true);
    expect(save.teams.every((team) => practiceSquadPlayers(save, team.id).filter((player) => save.seasonYear - (player.draftYear ?? save.seasonYear) > 2).length <= 6)).toBe(true);
  });

  it("signs, releases, and promotes practice squad players with active roster and budget rules", () => {
    let save = createNewSave("chi", "goals", "practice-squad-flow-seed");
    const squadPlayer = practiceSquadPlayers(save, "chi")[0];
    save = releasePracticeSquadPlayer(save, squadPlayer.id, "chi");
    expect(practiceSquadPlayers(save, "chi")).toHaveLength(PRACTICE_SQUAD_SIZE - 1);
    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE);

    const target = freeAgentPlayers(save).find((player) => canSignFreeAgentToPracticeSquad(save, player.id, "chi").ok)!;
    const budgetBefore = save.budget.chi;
    save = signFreeAgentToPracticeSquad(save, target.id, "chi");
    const signed = save.players.find((player) => player.id === target.id)!;
    expect(isPracticeSquadPlayer(signed)).toBe(true);
    expect(practiceSquadPlayers(save, "chi")).toHaveLength(PRACTICE_SQUAD_SIZE);
    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE);
    expect(save.budget.chi).toBeLessThan(budgetBefore);

    expect(canPromotePracticeSquadPlayer(save, signed.id, "chi").ok).toBe(false);
    const activeRelease = playersForTeam(save, "chi").find((player) => !isPracticeSquadPlayer(player))!;
    save = releasePlayerToFreeAgency(save, activeRelease.id, "chi");
    save = promotePracticeSquadPlayer(save, signed.id, "chi");
    const promoted = save.players.find((player) => player.id === signed.id)!;
    expect(isPracticeSquadPlayer(promoted)).toBe(false);
    expect(activeRosterSize(save, "chi")).toBe(MAX_ROSTER_SIZE);
  });

  it("handles practice squad protections, elevations, weekly return, and poaching", () => {
    let save = createNewSave("chi", "goals", "practice-squad-rules-seed");
    const squad = practiceSquadPlayers(save, "chi").slice(0, PRACTICE_SQUAD_PROTECTION_LIMIT + 1);
    for (const player of squad.slice(0, PRACTICE_SQUAD_PROTECTION_LIMIT)) {
      save = protectPracticeSquadPlayer(save, player.id, "chi");
    }
    expect(canProtectPracticeSquadPlayer(save, squad.at(-1)!.id, "chi").ok).toBe(false);

    const elevatedTarget = practiceSquadPlayers(save, "chi").find((player) => canElevatePracticeSquadPlayer(save, player.id, "chi").ok)!;
    save = elevatePracticeSquadPlayer(save, elevatedTarget.id, "chi");
    expect(save.players.find((player) => player.id === elevatedTarget.id)?.practiceSquadElevations).toBe(1);
    expect(calculateSnapPlan(save, "chi").byPlayer[elevatedTarget.id]?.length ?? 0).toBeGreaterThanOrEqual(0);
    const advanced = advanceWeek(save);
    const returned = advanced.players.find((player) => player.id === elevatedTarget.id)!;
    expect(isPracticeSquadPlayer(returned)).toBe(true);
    expect(returned.practiceSquadElevatedWeek).toBeUndefined();

    let poachSave = createNewSave("chi", "goals", "practice-squad-poach-seed");
    const target = practiceSquadPlayers(poachSave, "chi").find((player) => player.practiceSquadProtectedWeek !== poachSave.currentWeek)!;
    const dalRelease = playersForTeam(poachSave, "dal").find((player) => !isPracticeSquadPlayer(player))!;
    poachSave = releasePlayerToFreeAgency(poachSave, dalRelease.id, "dal");
    expect(canPoachPracticeSquadPlayer(poachSave, target.id, "dal").ok).toBe(true);
    poachSave = poachPracticeSquadPlayer(poachSave, target.id, "dal");
    expect(poachSave.players.find((player) => player.id === target.id)?.teamId).toBe("dal");
    expect(isPracticeSquadPlayer(poachSave.players.find((player) => player.id === target.id)!)).toBe(false);

    let limitSave = createNewSave("chi", "goals", "practice-squad-elevation-limit-seed");
    const limitTarget = practiceSquadPlayers(limitSave, "chi")[0];
    limitSave = {
      ...limitSave,
      players: limitSave.players.map((player) => player.id === limitTarget.id ? { ...player, practiceSquadElevations: PRACTICE_SQUAD_PLAYER_ELEVATION_LIMIT } : player)
    };
    expect(canElevatePracticeSquadPlayer(limitSave, limitTarget.id, "chi").ok).toBe(false);
  }, 20000);

  it("builds a 460-player class with realistic progress, position caps, and K/P value", () => {
    const save = createNewSave("chi", "goals", "prospect-class-balance-seed");
    const progressValues = save.prospects.map((prospect) => prospect.scouted.progress);
    const qbCount = save.prospects.filter((prospect) => prospect.position === "QB").length;
    const kickerPunters = save.prospects.filter((prospect) => prospect.position === "K" || prospect.position === "P");
    const earlySpecialists = kickerPunters.filter((prospect) => prospect.consensusRank <= 100 || prospect.teamRank <= 100);

    expect(save.prospects).toHaveLength(460);
    expect(Math.min(...progressValues)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...progressValues)).toBeLessThanOrEqual(50);
    expect(qbCount).toBeLessThanOrEqual(32);
    expect(kickerPunters.length).toBeLessThanOrEqual(24);
    expect(earlySpecialists.length).toBeLessThanOrEqual(2);
  });

  it("prevents unrealistic same-school position duplicates", () => {
    const save = createNewSave("chi", "goals", "school-position-duplicate-seed");
    const bucketFor = (position: string) => (["LT", "LG", "C", "RG", "RT"].includes(position) ? "OL" : position);
    const counts = new Map<string, number>();

    for (const prospect of save.prospects) {
      const key = `${prospect.schoolId}:${bucketFor(prospect.position)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [key, count] of counts) {
      const [, bucket] = key.split(":");
      if (["QB", "K", "P"].includes(bucket)) expect(count).toBeLessThanOrEqual(1);
      if (["RB", "TE", "LB", "S"].includes(bucket)) expect(count).toBeLessThanOrEqual(2);
      if (["WR", "CB", "DL", "EDGE", "OL"].includes(bucket)) expect(count).toBeLessThanOrEqual(3);
    }
  });

  it("recreates the same career from the same new-career options", () => {
    const options = { selectedTeamId: "chi", mode: "goals" as const, seed: "same-career-seed", scenario: "contender" as const };
    const first = createNewSave(options);
    const second = createNewSave(options);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.scenario).toBe("contender");
  });

  it("generates different people and prospects from different seeds", () => {
    const first = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "people-seed-a", scenario: "neutral" });
    const second = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "people-seed-b", scenario: "neutral" });

    expect(first.players.slice(0, 24).map((player) => `${player.id}:${player.overall}`)).not.toEqual(
      second.players.slice(0, 24).map((player) => `${player.id}:${player.overall}`)
    );
    expect(first.staff.slice(0, 8).map((member) => `${member.id}:${member.ratings.advice}`)).not.toEqual(
      second.staff.slice(0, 8).map((member) => `${member.id}:${member.ratings.advice}`)
    );
    expect(first.prospects.slice(0, 20).map((prospect) => `${prospect.id}:${prospect.trueOverall}`)).not.toEqual(
      second.prospects.slice(0, 20).map((prospect) => `${prospect.id}:${prospect.trueOverall}`)
    );
  });

  it("keeps real NFL teams and college programs in new-career saves", () => {
    const save = createNewSave({ selectedTeamId: "phi", mode: "sandbox", seed: "identity-seed", scenario: "worst" });

    expect(save.selectedTeamId).toBe("phi");
    expect(save.teams.some((team) => team.fullName === "Philadelphia Eagles")).toBe(true);
    expect(save.teams.every((team) => team.logoUrl)).toBe(true);
    expect(save.schools.some((school) => school.name === "Alabama")).toBe(true);
    expect(save.schools.some((school) => school.subdivision === "FCS")).toBe(true);
  });

  it("resolves college image metadata for every seeded school", () => {
    expect(collegePrograms.length).toBeGreaterThan(180);
    expect(
      collegePrograms.every((school) => {
        const image = collegeImageFor(school);
        return image.logoInitials.length > 0 && image.primaryColor.startsWith("#") && image.secondaryColor.startsWith("#") && ((image.logoUrls?.length ?? 0) > 0 || image.logoSource === "generated");
      })
    ).toBe(true);
    expect(collegePrograms.some((school) => school.logoSource === "espn" && school.logoUrl?.includes("a.espncdn.com"))).toBe(true);
    const curatedProblemSchools = [
      { id: "albany-caa", name: "Albany", conference: "CAA" },
      { id: "chicago-state-nec", name: "Chicago State", conference: "NEC" },
      { id: "missouri-state-conference-usa", name: "Missouri State", conference: "Conference USA" },
      { id: "south-dakota-state-mvfc", name: "South Dakota State", conference: "MVFC" },
      { id: "south-carolina-state-meac", name: "South Carolina State", conference: "MEAC" },
      { id: "southeastern-louisiana-southland", name: "Southeastern Louisiana", conference: "Southland" },
      { id: "st-thomas-pioneer-league", name: "St. Thomas", conference: "Pioneer League" },
      { id: "grambling-state-swac", name: "Grambling State", conference: "SWAC" },
      { id: "incarnate-word-southland", name: "Incarnate Word", conference: "Southland" },
      { id: "lindenwood-big-south-ovc", name: "Lindenwood", conference: "Big South-OVC" },
      { id: "tarleton-state-uac", name: "Tarleton State", conference: "UAC" },
      { id: "tennessee-state-big-south-ovc", name: "Tennessee State", conference: "Big South-OVC" },
      { id: "tennessee-tech-big-south-ovc", name: "Tennessee Tech", conference: "Big South-OVC" },
      { id: "texas-southern-swac", name: "Texas Southern", conference: "SWAC" },
      { id: "utah-tech-uac", name: "Utah Tech", conference: "UAC" },
      { id: "valparaiso-pioneer-league", name: "Valparaiso", conference: "Pioneer League" },
      { id: "vmi-socon", name: "VMI", conference: "SoCon" },
      { id: "wagner-nec", name: "Wagner", conference: "NEC" },
      { id: "weber-state-big-sky", name: "Weber State", conference: "Big Sky" },
      { id: "western-carolina-socon", name: "Western Carolina", conference: "SoCon" },
      { id: "youngstown-state-mvfc", name: "Youngstown State", conference: "MVFC" },
      { id: "southern-utah-uac", name: "Southern Utah", conference: "UAC" },
      { id: "stetson-pioneer-league", name: "Stetson", conference: "Pioneer League" }
    ];
    expect(
      curatedProblemSchools.every((school) => {
        const image = collegeImageFor(school);
        return Boolean(image.logoUrl);
      })
    ).toBe(true);
    expect(
      curatedProblemSchools.every((school) => {
        const image = collegeImageFor(school);
        return image.logoSource === "espn" || image.logoSource === "local";
      })
    ).toBe(true);
    expect(collegePrograms.some((school) => school.logoSource === "generated" && !school.logoUrl)).toBe(true);
  });

  it("normalizes old saves with missing college image fields", () => {
    const save = createNewSave("chi", "goals", "legacy-college-logo-seed");
    const legacy = {
      ...save,
      schools: save.schools.map(({ logoUrl, logoUrls, logoSource, logoInitials, primaryColor, secondaryColor, ...school }) => school)
    } as unknown as typeof save;
    const normalized = normalizeSave(legacy);

    expect(normalized.schools.every((school) => school.logoInitials && school.primaryColor && school.secondaryColor && school.logoSource)).toBe(true);
    expect(normalized.schools.find((school) => school.name === "Alabama")?.logoUrl).toContain("a.espncdn.com");
    expect(normalized.schools.find((school) => school.name === "Alabama")?.logoUrls?.length).toBeGreaterThan(0);
  });

  it("normalizes legacy saves with free-agent infrastructure defaults", () => {
    const save = createNewSave("chi", "goals", "legacy-free-agent-seed");
    const legacy = {
      ...save,
      players: save.players.filter((player) => player.teamId !== FREE_AGENT_TEAM_ID),
      freeAgencyLog: undefined
    } as unknown as GameSave;

    const normalized = normalizeSave(legacy);

    expect(freeAgentPlayers(normalized).length).toBeGreaterThan(120);
    expect(normalized.freeAgencyLog).toEqual([]);
  });

  it("renders college logo fallback when no remote URL exists", () => {
    const school = collegePrograms.find((program) => !program.logoUrl)!;
    const { container, root } = renderCollegeLogo(school);

    expect(container.querySelector("[data-testid='college-logo']")?.getAttribute("data-status")).toBe("fallback");
    expect(container.querySelector(".logo-fallback")?.textContent).toBe(school.logoInitials);
    expect(container.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });

  it("hides fallback behind remote college logos and only shows it after errors", () => {
    const school = collegePrograms.find((program) => program.logoUrl)!;
    const { container, root } = renderCollegeLogo(school);
    const logo = container.querySelector("[data-testid='college-logo']");
    const image = container.querySelector("img") as HTMLImageElement;

    expect(logo?.getAttribute("data-status")).toBe("loading");
    expect(container.querySelector(".logo-fallback")).toBeNull();
    act(() => {
      image.dispatchEvent(new Event("load", { bubbles: true }));
    });
    expect(logo?.getAttribute("data-status")).toBe("loaded");
    expect(container.querySelector(".logo-fallback")).toBeNull();
    act(() => {
      image.dispatchEvent(new Event("error", { bubbles: true }));
    });
    expect(logo?.getAttribute("data-status")).toBe("fallback");
    expect(container.querySelector(".logo-fallback")?.textContent).toBe(school.logoInitials);
    act(() => root.unmount());
  });

  it("tries a backup college logo source before falling back", () => {
    const school: CollegeProgram = {
      ...collegePrograms[0],
      id: "test-backup-college",
      name: "Backup College",
      logoSource: "local",
      logoInitials: "BC",
      logoUrl: "https://example.com/primary.png",
      logoUrls: ["https://example.com/primary.png", "https://example.com/backup.png"]
    };
    const { container, root } = renderCollegeLogo(school);
    const logo = container.querySelector("[data-testid='college-logo']");
    let image = container.querySelector("img") as HTMLImageElement;

    expect(image.getAttribute("src")).toBe("https://example.com/primary.png");
    act(() => {
      image.dispatchEvent(new Event("error", { bubbles: true }));
    });
    image = container.querySelector("img") as HTMLImageElement;
    expect(logo?.getAttribute("data-status")).toBe("loading");
    expect(image.getAttribute("src")).toBe("https://example.com/backup.png");
    act(() => {
      image.dispatchEvent(new Event("load", { bubbles: true }));
    });
    expect(logo?.getAttribute("data-status")).toBe("loaded");
    expect(container.querySelector(".logo-fallback")).toBeNull();
    act(() => root.unmount());
  });

  it("renders team logo fallback when no remote URL exists", () => {
    const team = { ...nflTeams[0], logoUrl: "" };
    const { container, root } = renderTeamLogo(team);

    expect(container.querySelector("[data-testid='team-logo']")?.getAttribute("data-status")).toBe("fallback");
    expect(container.querySelector(".logo-fallback")?.textContent).toBe(team.abbreviation);
    expect(container.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });

  it("hides fallback behind remote team logos and only shows it after errors", () => {
    const team = nflTeams.find((candidate) => candidate.logoUrl)!;
    const { container, root } = renderTeamLogo(team);
    const logo = container.querySelector("[data-testid='team-logo']");
    const image = container.querySelector("img") as HTMLImageElement;

    expect(logo?.getAttribute("data-status")).toBe("loading");
    expect(container.querySelector(".logo-fallback")).toBeNull();
    act(() => {
      image.dispatchEvent(new Event("load", { bubbles: true }));
    });
    expect(logo?.getAttribute("data-status")).toBe("loaded");
    expect(container.querySelector(".logo-fallback")).toBeNull();
    act(() => {
      image.dispatchEvent(new Event("error", { bubbles: true }));
    });
    expect(logo?.getAttribute("data-status")).toBe("fallback");
    expect(container.querySelector(".logo-fallback")?.textContent).toBe(team.abbreviation);
    act(() => root.unmount());
  });

  it("shapes the selected team by scenario without changing the team choice", () => {
    const worst = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "scenario-shape-seed", scenario: "worst" });
    const contender = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "scenario-shape-seed", scenario: "contender" });

    expect(teamOverall(contender, "chi")).toBeGreaterThan(teamOverall(worst, "chi") + 12);
    expect(worst.draftPicks.filter((pick) => pick.draftYear === worst.draftState.draftYear && pick.currentTeamId === "chi" && !pick.compensatory)).toHaveLength(10);
    expect(contender.draftPicks.filter((pick) => pick.draftYear === contender.draftState.draftYear && pick.currentTeamId === "chi" && !pick.compensatory)).toHaveLength(4);
    expect(worst.draftPicks.filter((pick) => pick.draftYear > worst.draftState.draftYear && pick.currentTeamId === "chi")).toHaveLength(7);
    expect(worst.budget.chi).toBeGreaterThan(contender.budget.chi);
    expect(contender.goals.makePlayoffs).toBe(true);
  });

  it("lets random scenario vary quality while keeping the selected team", () => {
    const saves = ["random-a", "random-b", "random-c", "random-d"].map((seed) =>
      createNewSave({ selectedTeamId: "nyj", mode: "goals", seed, scenario: "random" })
    );
    const grades = new Set(saves.map((save) => teamOverall(save, "nyj")));

    expect(saves.every((save) => save.selectedTeamId === "nyj")).toBe(true);
    expect(saves.every((save) => save.scenario === "random")).toBe(true);
    expect(grades.size).toBeGreaterThan(1);
  }, 10000);

  it("generates the NFL opponent mix over an 18-week, 17-game schedule", () => {
    const save = createNewSave("phi", "sandbox", "schedule-seed");
    const schedule = generateSchedule(save.teams, "schedule-seed", save.previousSeasonRanks, save.seasonYear);

    expect(schedule).toHaveLength(272);
    expect(Math.max(...schedule.map((game) => game.week))).toBe(18);
    for (const team of save.teams) {
      const games = schedule.filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id);
      const opponents = games.map((game) => save.teams.find((candidate) => candidate.id === (game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId))!);
      const divisionGames = games.filter((game) => {
        const opponent = save.teams.find((candidate) => candidate.id === (game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId));
        return opponent?.conference === team.conference && opponent.division === team.division;
      });
      const byWeek = new Set(games.map((game) => game.week));
      const sameConferenceNonDivisionCounts = opponents
        .filter((opponent) => opponent.conference === team.conference && opponent.division !== team.division)
        .reduce<Record<string, number>>((counts, opponent) => ({ ...counts, [opponent.division]: (counts[opponent.division] ?? 0) + 1 }), {});
      const crossConferenceCounts = opponents
        .filter((opponent) => opponent.conference !== team.conference)
        .reduce<Record<string, number>>((counts, opponent) => ({ ...counts, [opponent.division]: (counts[opponent.division] ?? 0) + 1 }), {});

      expect(games).toHaveLength(17);
      expect(byWeek.size).toBe(17);
      expect(divisionGames).toHaveLength(6);
      for (const opponent of opponents.filter((candidate) => candidate.conference === team.conference && candidate.division === team.division)) {
        const pair = games.filter((game) => game.homeTeamId === opponent.id || game.awayTeamId === opponent.id);
        expect(pair).toHaveLength(2);
        expect(pair.some((game) => game.homeTeamId === team.id)).toBe(true);
        expect(pair.some((game) => game.awayTeamId === team.id)).toBe(true);
      }
      expect(Object.values(sameConferenceNonDivisionCounts).sort((a, b) => a - b)).toEqual([1, 1, 4]);
      expect(Object.values(crossConferenceCounts).sort((a, b) => a - b)).toEqual([1, 4]);
    }
  });

  it("starts fresh careers on a dated league-year calendar with preseason and regular-season games", () => {
    const save = createNewSave("phi", "sandbox", "daily-calendar-seed");
    const regularGames = save.schedule.filter((game) => game.seasonType === "regular");
    const preseasonGames = save.schedule.filter((game) => game.seasonType === "preseason");

    expect(save.currentDate).toBe(leagueYearStartDate(2026));
    expect(save.calendarPhase).toBe("free-agency");
    expect(preseasonGames).toHaveLength(48);
    expect(regularGames).toHaveLength(272);
    expect(regularGames.every((game) => game.date && game.kickoffSlot)).toBe(true);
    expect(save.seasonCalendar.some((event) => event.date === regularSeasonStartDate(2026) && event.type === "game")).toBe(true);
  });

  it("advances one calendar day without simming future games, then sims games on their exact date", () => {
    let save = createNewSave("phi", "sandbox", "advance-day-seed");
    const firstGameDate = save.schedule.find((game) => game.seasonType === "preseason")!.date!;
    save = { ...save, currentDate: firstGameDate, calendarPhase: "preseason", phase: "preseason" };
    const todaysGameIds = new Set(gamesOnDate(save, firstGameDate).map((game) => game.id));

    const advanced = advanceDay(save);

    expect(advanced.currentDate).not.toBe(firstGameDate);
    expect(advanced.schedule.filter((game) => todaysGameIds.has(game.id)).every((game) => game.status === "final")).toBe(true);
    expect(advanced.schedule.filter((game) => !todaysGameIds.has(game.id) && game.date && game.date > firstGameDate).every((game) => game.status === "scheduled")).toBe(true);
  });

  it("routes waiver-eligible releases through a dated waiver claim window", () => {
    let save = createNewSave("chi", "goals", "waiver-window-seed");
    const player = playersForTeam(save, "chi").find((candidate) => candidate.age <= 26 && candidate.position !== "QB")!;
    save = releasePlayerToFreeAgency(save, player.id, "chi");

    expect(isPlayerOnWaivers(save, player.id)).toBe(true);
    const dalCut = playersForTeam(save, "dal")[0];
    save = { ...save, players: save.players.map((candidate) => candidate.id === dalCut.id ? { ...candidate, teamId: FREE_AGENT_TEAM_ID } : candidate) };
    save = submitWaiverClaim(save, player.id, "dal");
    save = { ...save, waiverState: { ...save.waiverState!, order: ["dal", ...save.teams.filter((team) => team.id !== "dal").map((team) => team.id)] } };
    save = processWaiversForDate({ ...save, currentDate: save.waiverState!.players[0].claimDeadlineDate });

    expect(save.players.find((candidate) => candidate.id === player.id)?.teamId).toBe("dal");
    expect(save.waiverState?.players.find((entry) => entry.playerId === player.id)?.status).toBe("claimed");
  });

  it("surfaces roster needs from weak position groups", () => {
    const save = createNewSave("ari", "goals", "needs-seed");
    const needs = rosterNeeds(save, "ari");

    expect(needs[0].grade).toBeLessThanOrEqual(needs.at(-1)?.grade ?? 100);
    expect(needs[0].position).toEqual(expect.any(String));
  });

  it("builds league power rows and a seven-team playoff picture for each conference", () => {
    const save = createNewSave("lac", "sandbox", "league-ranking-seed");
    const power = powerRankings(save);
    const seeds = playoffSeeds(save);

    expect(power).toHaveLength(32);
    expect(new Set(power.map((row) => row.rank)).size).toBe(32);
    expect(power.every((row) => POSITIONS.every((position) => Number.isFinite(row.positions[position])))).toBe(true);
    expect(seeds.AFC).toHaveLength(7);
    expect(seeds.NFC).toHaveLength(7);
    expect(seeds.AFC.slice(0, 4).every((row) => row.kind === "division")).toBe(true);
  });
});

describe("draft room overhaul", () => {
  it("creates slot-aware draft picks and lets CPU picks run until the user's pick", () => {
    const base = createNewSave("chi", "goals", "draft-flow-seed");
    const save = advanceToUserPickForTest(enterDraft({ ...base, phase: "draft-prep" }));
    const userPick = save.draftPicks.find((pick) => save.draftState.order[save.draftState.currentPickIndex] === pick.id);

    expect(save.phase).toBe("draft");
    expect(save.draftPicks.every((pick) => pick.id && pick.draftYear && pick.overallPick)).toBe(true);
    expect(userPick?.currentTeamId).toBe("chi");
    expect(save.draftState.history.length).toBeGreaterThanOrEqual(0);
  }, 30000);

  it("keeps future picks tradable but out of the active draft order", () => {
    const save = enterDraft({ ...createNewSave("chi", "goals", "future-pick-seed"), phase: "draft-prep" });
    const activePickYears = save.draftState.order.map((pickId) => save.draftPicks.find((pick) => pick.id === pickId)?.draftYear);
    const futurePicks = save.draftPicks.filter((pick) => pick.draftYear > save.draftState.draftYear);

    expect(futurePicks).toHaveLength(save.teams.length * 7);
    expect(activePickYears.every((year) => year === save.draftState.draftYear)).toBe(true);
  });

  it("uses 3/2/1 minute draft clock limits and pauses when the user clock expires", () => {
    const base = createNewSave("chi", "goals", "draft-clock-seed");
    const onClock = advanceToUserPickForTest(enterDraft({ ...base, phase: "draft-prep" }));
    const paused = advanceDraftEvent(setDraftSpeed(onClock, 10));

    expect(draftPickTimeLimit(1)).toBe(180);
    expect(draftPickTimeLimit(2)).toBe(120);
    expect(draftPickTimeLimit(3)).toBe(60);
    expect(draftPickTimeLimit(7)).toBe(60);
    expect(paused.draftState.clockSeconds).toBe(0);
    expect(paused.draftState.pendingEvent?.type).toBe("clock");
  });

  it("recalculates live draft-room needs after the user drafts a player", () => {
    const base = createNewSave("chi", "goals", "draft-needs-seed");
    const onClock = advanceToUserPickForTest(enterDraft({ ...base, phase: "draft-prep" }));
    const topNeed = draftRoomNeeds(onClock, "chi")[0];
    const target = onClock.prospects
      .filter((prospect) => !onClock.draftState.history.some((selection) => selection.prospectId === prospect.id) && prospect.position === topNeed.position)
      .sort((a, b) => a.teamRank - b.teamRank)[0] ?? onClock.prospects[0];
    const picked = makeDraftSelection(onClock, target.id);
    const updatedNeed = draftRoomNeeds(picked, "chi").find((need) => need.position === target.position)!;

    expect(updatedNeed.drafted).toBeGreaterThan(0);
    expect(updatedNeed.urgency).toBeLessThanOrEqual(topNeed.urgency);
  }, 30000);

  it("generates AI trade-down offers with smart counter packages", () => {
    const save = enterDraft({ ...createNewSave("chi", "goals", "ai-offer-package-seed"), phase: "draft-prep" });
    const userPicks = save.draftPicks.filter((pick) => pick.draftYear === save.draftState.draftYear && pick.currentTeamId === "chi" && !pick.usedByProspectId);
    const buyers = save.teams.filter((team) => team.id !== "chi");
    let offer = undefined as ReturnType<typeof buildTradeDownOfferToUser>;
    for (const pick of userPicks) {
      for (const team of buyers) {
        offer = buildTradeDownOfferToUser(save, pick, team.id);
        if (offer) break;
      }
      if (offer) break;
    }

    expect(offer).toBeTruthy();
    expect(offer?.userFacing).toBe(true);
    expect(offer?.counterOffers?.length).toBeGreaterThan(0);
    expect(
      offer?.counterOffers?.some((counter) =>
        counter.gives.some((asset) => {
          if (asset.type === "player") return true;
          const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
          return Boolean(pick && pick.draftYear > save.draftState.draftYear);
        })
      )
    ).toBe(true);
  }, 30000);

  it("builds a trade-up preview without mutating draft assets until confirmed", () => {
    const save = enterDraft({ ...createNewSave("nyj", "goals", "draft-preview-seed"), phase: "draft-prep" });
    const beforeOwners = save.draftPicks.map((pick) => `${pick.id}:${pick.currentTeamId}`).join("|");
    let preview: ReturnType<typeof buildTradeOfferForPick> = undefined;
    for (const pick of save.draftPicks.filter((candidate) => candidate.currentTeamId !== "nyj" && !candidate.usedByProspectId)) {
      preview = buildTradeOfferForPick(save, pick.id);
      if (preview?.verdict === "accept") break;
    }

    expect(preview).toBeTruthy();
    expect(save.draftPicks.map((pick) => `${pick.id}:${pick.currentTeamId}`).join("|")).toBe(beforeOwners);

    const confirmed = applyDraftTradeOffer(save, preview!);
    const targetPickId = preview!.receives.find((asset) => asset.type === "pick")?.id;
    expect(confirmed.draftPicks.find((pick) => pick.id === targetPickId)?.currentTeamId).toBe("nyj");
  });

  it("keeps completed trade filtering separate from draft event noise", () => {
    const save = enterDraft({ ...createNewSave("nyj", "goals", "completed-trades-seed"), phase: "draft-prep" });
    let preview: ReturnType<typeof buildTradeOfferForPick> = undefined;
    for (const pick of save.draftPicks.filter((candidate) => candidate.currentTeamId !== "nyj" && !candidate.usedByProspectId)) {
      preview = buildTradeOfferForPick(save, pick.id);
      if (preview?.verdict === "accept") break;
    }
    expect(preview).toBeTruthy();
    const acceptedPreview = preview!;
    const traded = applyDraftTradeOffer(save, acceptedPreview);
    const noisy = {
      ...traded,
      draftState: {
        ...traded.draftState,
        tradeOffers: [{ ...acceptedPreview, id: "declined-preview", status: "declined" as const }, ...traded.draftState.tradeOffers],
        eventLog: [
          { id: "fake-pick", type: "pick" as const, title: "Pick log", message: "Not a trade.", interrupt: false, week: 1 },
          { id: "fake-surprise", type: "surprise" as const, title: "Top prospect still waiting", message: "No longer shown.", interrupt: true, week: 1 },
          ...traded.draftState.eventLog
        ]
      }
    };

    const completed = completedDraftTrades(noisy);
    expect(completed).toHaveLength(1);
    expect(completed[0].status).toBe("accepted");
    expect(completed[0].id).toBe(acceptedPreview.id);
  });

  it("does not create surprise draft interruptions", () => {
    let save = enterDraft({ ...createNewSave("chi", "goals", "no-surprise-events-seed"), phase: "draft-prep" });
    for (let index = 0; index < 35; index += 1) {
      if (save.draftState.pendingEvent?.type === "offer" || save.draftState.pendingEvent?.type === "clock") {
        save = clearDraftEvent(save);
      }
      save = advanceDraftEvent(save);
    }

    expect(save.draftState.pendingEvent?.type).not.toBe("surprise");
    expect(save.draftState.eventLog.some((event) => event.type === "surprise" || event.title === "Top prospect still waiting")).toBe(false);
  });

  it("drafts prospects, runs UDFA results, and onboards the full rookie class", () => {
    const base = createNewSave("chi", "goals", "rookie-class-seed");
    const onClock = advanceToUserPickForTest(enterDraft({ ...base, phase: "draft-prep" }));
    const selectedIds = new Set(onClock.draftState.history.map((selection) => selection.prospectId));
    const target = onClock.prospects.find((prospect) => !selectedIds.has(prospect.id))!;
    const pickSave = makeDraftSelection(onClock, target.id);
    const completed = finishDraftForTest(simRestOfDraft(pickSave));
    const rookies = playersForTeam(completed, "chi").filter((player) => player.traits.includes("Rookie"));
    const rookieCount = rookies.length;
    const results = finalizeUdfaClass(completed);
    const onboarded = runRookieOnboarding(beginRookieOnboarding(results));

    expect(completed.phase).toBe("udfa");
    expect(completed.draftState.completed).toBe(true);
    expect(completed.draftState.history).toHaveLength(completed.draftState.order.length);
    expect(rookieCount).toBeGreaterThan(0);
    expect(rookies.every((rookie) => rookie.positionFits[rookie.position] === 100)).toBe(true);
    expect(rookies.every((rookie) => rookie.makeup.version >= 2 && rookie.suspensionWeeks === 0)).toBe(true);
    expect(results.phase).toBe("rookie-results");
    expect(results.rookieResults?.[0].acquisitions.length).toBeGreaterThanOrEqual(completed.draftState.history.length);
    expect(onboarded.phase).toBe("offseason-complete");
  }, 30000);

  it("limits UDFA offer slots and hard pool spend during a wave", () => {
    const completed = finishDraftForTest(simRestOfDraft(enterDraft({ ...createNewSave("chi", "goals", "udfa-offer-seed"), phase: "draft-prep" })));
    const targets = undraftedProspects(completed).slice(0, UDFA_OFFER_SLOTS + 1);
    let offered = completed;
    targets.forEach((prospect, index) => {
      offered = placeUdfaOffer(offered, prospect.id, index === 0 ? 0.14 : 0.01, index === 0 ? 0.08 : 0.01);
    });
    const live = offered.udfaState!.offers.filter((offer) => offer.isUserOffer && offer.status === "active");
    const blocked = placeUdfaOffer(offered, targets[0].id, 0.25, 0.25);

    expect(offered.phase).toBe("udfa");
    expect(live.length).toBeLessThanOrEqual(UDFA_OFFER_SLOTS);
    expect(live.reduce((sum, offer) => sum + offer.signingBonus + offer.guaranteedMoney, 0)).toBeLessThanOrEqual(0.25);
    expect(blocked.udfaState!.offers.find((offer) => offer.id === live[0].id)?.guaranteedMoney).toBe(live[0].guaranteedMoney);
  }, 30000);

  it("clears stale draft events when entering UDFA and normalizing old UDFA saves", () => {
    const base = createNewSave("chi", "goals", "udfa-pending-event-seed");
    const draftYear = base.draftState.draftYear;
    const staleEvent = {
      id: "legacy-offer",
      type: "offer" as const,
      title: "Legacy trade offer",
      message: "This event should not block UDFA.",
      interrupt: true,
      week: base.currentWeek
    };
    const opened = enterDraft({
      ...base,
      phase: "draft-prep",
      draftPicks: base.draftPicks.filter((pick) => pick.draftYear !== draftYear || pick.overallPick <= 1),
      draftState: {
        ...base.draftState,
        currentPickIndex: 0,
        order: [],
        history: [],
        completed: false,
        pendingEvent: staleEvent
      }
    });
    const completed = makeDraftSelection(opened, opened.prospects[0].id);
    const normalized = normalizeSave({
      ...base,
      phase: "udfa",
      draftState: {
        ...base.draftState,
        pendingEvent: staleEvent
      }
    });

    expect(completed.phase).toBe("udfa");
    expect(completed.draftState.pendingEvent).toBeUndefined();
    expect(normalized.draftState.pendingEvent).toBeUndefined();
  });

  it("withdraws and re-submits active UDFA offers", () => {
    const completed = completeOnePickDraftForTest("udfa-withdraw-resubmit-seed");
    const target = undraftedProspects(completed)[0];
    const offered = placeUdfaOffer(completed, target.id, 0.03, 0.04);
    const live = offered.udfaState!.offers.find((offer) => offer.isUserOffer && offer.prospectId === target.id && offer.status === "active")!;
    const withdrawn = withdrawUdfaOffer(offered, live.id);
    const resubmitted = placeUdfaOffer(withdrawn, target.id, 0.02, 0.02);
    const active = resubmitted.udfaState!.offers.filter((offer) => offer.isUserOffer && offer.prospectId === target.id && offer.status === "active");

    expect(withdrawn.udfaState!.offers.some((offer) => offer.id === live.id && offer.status === "active")).toBe(false);
    expect(active).toHaveLength(1);
    expect(active[0].signingBonus + active[0].guaranteedMoney).toBeCloseTo(0.04, 3);
  });

  it("generates stable shared AI UDFA wave offers for the same save snapshot", () => {
    const completed = completeOnePickDraftForTest("udfa-ai-wave-stable-seed");

    const first = getCurrentAiUdfaWaveOffers(completed);
    const second = getCurrentAiUdfaWaveOffers(completed);

    expect(second).toEqual(first);
  }, 10000);

  it("filters rival UDFA offers from shared AI wave data without changing results", () => {
    const completed = completeOnePickDraftForTest("udfa-rival-filter-seed");
    const target = undraftedProspects(completed).sort((a, b) => a.teamRank - b.teamRank)[0];
    const aiOffers = getCurrentAiUdfaWaveOffers(completed);

    const withPrecomputed = rivalUdfaOffers(completed, target.id, aiOffers);
    const withoutPrecomputed = rivalUdfaOffers(completed, target.id);

    expect(withPrecomputed).toEqual(withoutPrecomputed);
  }, 10000);

  it("resolves UDFA waves into three-year rookies and a stable class result snapshot", () => {
    const completed = finishDraftForTest(simRestOfDraft(enterDraft({ ...createNewSave("nyj", "goals", "udfa-results-seed"), phase: "draft-prep" })));
    const target = undraftedProspects(completed).sort((a, b) => a.teamRank - b.teamRank)[0];
    const bid = placeUdfaOffer(completed, target.id, 0.1, 0.1);
    const wave = resolveNextUdfaWave(bid);
    const resolved = finalizeUdfaClass(simRemainingUdfaWaves(wave));
    const result = resolved.rookieResults![0];
    const udfaPlayerIds = new Set(resolved.udfaState!.signings.map((signing) => signing.playerId));
    const scores = rookieClassScoreRows(result, resolved.teams.map((team) => team.id));

    expect(resolved.phase).toBe("rookie-results");
    expect(resolved.udfaState!.signings.length).toBeGreaterThan(0);
    expect(resolved.players.filter((player) => udfaPlayerIds.has(player.id)).every((player) => player.contractYears === 3 && player.traits.includes("UDFA"))).toBe(true);
    expect(result.acquisitions.some((acquisition) => acquisition.source === "udfa")).toBe(true);
    expect(result.acquisitions.every((acquisition) => acquisition.actualOverall > 0 && acquisition.scouting.overallRange.length === 2)).toBe(true);
    expect(scores).toHaveLength(resolved.teams.length);
    expect(rookieValueSpentScore(bestRookieScore(64, 82), "udfa")).toBeGreaterThan(rookieValueSpentScore(bestRookieScore(64, 82), "draft", 1));
  }, 45000);

  it("rolls an offseason-complete career into a fresh regular season", () => {
    const offseason = { ...createNewSave("chi", "goals", "next-season-seed"), phase: "offseason-complete" as const };
    const agedPlayer = offseason.players[0];
    const next = startNextSeason(offseason);

    expect(next.phase).toBe("regular");
    expect(next.currentWeek).toBe(1);
    expect(next.seasonYear).toBe(offseason.seasonYear + 1);
    expect(next.schedule.filter((game) => game.seasonType === "regular")).toHaveLength(272);
    expect(next.schedule.filter((game) => game.seasonType === "preseason")).toHaveLength(48);
    expect(next.prospects).toHaveLength(460);
    expect(next.draftState.draftYear).toBe(next.seasonYear + 1);
    expect(next.players.find((player) => player.id === agedPlayer.id)?.age).toBe(agedPlayer.age + 1);
    expect(next.players.every((player) => player.stats.snaps === 0 && player.stats.games === 0)).toBe(true);
    expect(Object.values(next.records).every((record) => record.wins === 0 && record.losses === 0 && record.ties === 0)).toBe(true);
  }, 30000);

  it("runs a full postseason before offseason contract decisions", () => {
    let save = createNewSave("chi", "goals", "postseason-seed");
    save = advanceWeek({ ...save, currentWeek: 18 });

    expect(save.phase).toBe("postseason");
    expect(save.currentWeek).toBe(19);
    expect(save.postseasonState?.seeds).toHaveLength(14);
    expect(save.schedule.filter((game) => game.seasonType === "postseason" && game.playoffRound === "wild-card")).toHaveLength(6);

    save = advancePostseasonRound(save);
    expect(save.phase).toBe("postseason");
    expect(save.postseasonState?.rounds.find((round) => round.round === "wild-card")?.completed).toBe(true);
    expect(save.schedule.filter((game) => game.playoffRound === "wild-card").every((game) => game.status === "final" && game.homeScore !== game.awayScore)).toBe(true);
    expect(save.players.some((player) => (player.playoffStats?.games ?? 0) > 0)).toBe(true);
    expect(save.players.every((player) => player.stats.games <= 17)).toBe(true);

    save = finishPostseasonForTest(save);
    const championId = save.postseasonState?.championTeamId;
    const runnerUpId = save.postseasonState?.runnerUpTeamId;
    const championRoundOne = save.draftPicks.find((pick) => pick.draftYear === save.draftState.draftYear && pick.round === 1 && pick.originalTeamId === championId);
    const runnerUpRoundOne = save.draftPicks.find((pick) => pick.draftYear === save.draftState.draftYear && pick.round === 1 && pick.originalTeamId === runnerUpId);

    expect(save.phase).toBe("contract-decisions");
    expect(championId).toBeTruthy();
    expect(runnerUpId).toBeTruthy();
    expect(save.schedule.find((game) => game.playoffRound === "super-bowl")?.status).toBe("final");
    expect(championRoundOne?.pickInRound).toBe(32);
    expect(runnerUpRoundOne?.pickInRound).toBe(31);
    expect(save.inbox[0].title).toContain("Super Bowl");
  }, 60000);

  it("keeps a fresh career playable through saved rookie results and next-season rollover", () => {
    let save = createNewSave("lac", "goals", "fresh-career-regression-seed");
    const firstDraftClass = new Set(save.prospects.map((prospect) => prospect.id));
    save = advanceWeek(save);
    save = finishPostseasonForTest(advanceWeek({ ...save, currentWeek: 18 }));
    const draftYear = save.draftState.draftYear;
    save = {
      ...save,
      draftPicks: save.draftPicks.filter((pick) => pick.draftYear !== draftYear || pick.overallPick <= 1),
      draftState: {
        ...save.draftState,
        currentPickIndex: 0,
        order: [],
        history: [],
        tradeOffers: [],
        tradeLog: [],
        completed: false
      }
    };

    save = advanceToDraftPrep(advanceToFreeAgency(save));
    const draftOpen = enterDraft(save);
    const drafted = makeDraftSelection(draftOpen, draftOpen.prospects[0].id);
    const target = undraftedProspects(drafted).sort((a, b) => a.teamRank - b.teamRank)[0];
    const offered = placeUdfaOffer(drafted, target.id, 0.09, 0.1);
    const results = finalizeUdfaClass(resolveNextUdfaWave(offered));
    const restored = normalizeSave(parseSave(serializeSave(results)));
    const offseason = runRookieOnboarding(beginRookieOnboarding(restored));
    const next = startNextSeason(offseason);

    expect(save.phase).toBe("draft-prep");
    expect(drafted.phase).toBe("udfa");
    expect(results.phase).toBe("rookie-results");
    expect(restored.rookieResults?.[0].draftYear).toBe(restored.draftState.draftYear);
    expect(offseason.phase).toBe("offseason-complete");
    expect(next.phase).toBe("regular");
    expect(next.currentWeek).toBe(1);
    expect(next.schedule.filter((game) => game.seasonType === "regular")).toHaveLength(272);
    expect(next.schedule.filter((game) => game.seasonType === "preseason")).toHaveLength(48);
    expect(next.prospects).toHaveLength(460);
    expect(next.draftState.history).toHaveLength(0);
    expect(next.udfaState).toBeUndefined();
    expect(next.prospects.some((prospect) => !firstDraftClass.has(prospect.id))).toBe(true);
    expect(Object.values(next.records).every((record) => record.wins === 0 && record.losses === 0 && record.ties === 0)).toBe(true);
  }, 120000);

  it("applies player-plus-pick draft trades and updates budgets", () => {
    let base = enterDraft({ ...createNewSave("nyj", "goals", "draft-trade-seed"), phase: "draft-prep" });
    const userPick = base.draftPicks.find((pick) => pick.currentTeamId === "nyj" && !pick.usedByProspectId);
    const userFuturePick = base.draftPicks.find((pick) => pick.currentTeamId === "nyj" && pick.draftYear > base.draftState.draftYear && pick.round === 4);
    const player = playersForTeam(base, "nyj")
      .filter((candidate) => candidate.position !== "QB" && candidate.position !== "K" && candidate.position !== "P")
      .sort((a, b) => a.salary - b.salary)[0];
    const targetPick = base.draftPicks.find((pick) => pick.currentTeamId !== "nyj" && !pick.usedByProspectId);
    expect(userPick && userFuturePick && targetPick && player).toBeTruthy();
    base = { ...base, budget: { ...base.budget, [targetPick!.currentTeamId]: 80 } };
    const beforeUserBudget = base.budget.nyj;
    const beforeTargetBudget = base.budget[targetPick!.currentTeamId];
    const traded = applyDraftTradeOffer(base, {
      id: "test-offer",
      fromTeamId: "nyj",
      toTeamId: targetPick!.currentTeamId,
      gives: [
        { type: "pick", id: userPick!.id },
        { type: "pick", id: userFuturePick!.id },
        { type: "player", id: player!.id }
      ],
      receives: [{ type: "pick", id: targetPick!.id }],
      incomingValue: 9999,
      outgoingValue: 1,
      verdict: "accept",
      status: "proposed",
      message: "Test trade."
    });

    expect(traded.draftPicks.find((pick) => pick.id === targetPick!.id)?.currentTeamId).toBe("nyj");
    expect(traded.draftPicks.find((pick) => pick.id === userPick!.id)?.currentTeamId).toBe(targetPick!.currentTeamId);
    expect(traded.draftPicks.find((pick) => pick.id === userFuturePick!.id)?.currentTeamId).toBe(targetPick!.currentTeamId);
    expect(traded.players.find((candidate) => candidate.id === player!.id)?.teamId).toBe(targetPick!.currentTeamId);
    expect(traded.players.find((candidate) => candidate.id === player!.id)?.teamStartSeason).toBe(traded.seasonYear);
    expect(traded.budget.nyj).toBeGreaterThan(beforeUserBudget);
    expect(traded.budget[targetPick!.currentTeamId]).toBeLessThan(beforeTargetBudget);
  });
});

describe("scouting assignments and board controls", () => {
  it("tightens prospect progress through specific weekly assignments", () => {
    const save = createNewSave("dal", "goals", "scouting-overhaul-seed");
    const plan = ensureScoutingPlan(save);
    const prospect = save.prospects[0];
    const assigned = updateScoutingAssignment(save, plan.assignments[0].id, { type: "prospect", focusId: prospect.id });
    const before = prospect.scouted.progress;
    const afterWeek = applyWeeklyScoutingPlan(assigned);
    const updated = afterWeek.prospects.find((item) => item.id === prospect.id)!;

    expect(afterWeek.scoutingPlan.reports.length).toBeGreaterThan(0);
    expect(updated.scouted.progress).toBeGreaterThan(before);
    expect(updated.scouted.concerns.medical[1]).toBeGreaterThanOrEqual(updated.scouted.concerns.medical[0]);
  });

  it("builds weekly recap entries only for team-rank movers", () => {
    const save = createNewSave("dal", "goals", "scouting-recap-builder-seed");
    const riserBefore = { ...save.prospects[0], teamRank: 50 };
    const fallerBefore = { ...save.prospects[1], teamRank: 20 };
    const unchangedBefore = { ...save.prospects[2], teamRank: 70 };
    const riserAfter = { ...riserBefore, teamRank: 38, scouted: { ...riserBefore.scouted, progress: riserBefore.scouted.progress + 8 } };
    const fallerAfter = { ...fallerBefore, teamRank: 29, scouted: { ...fallerBefore.scouted, progress: fallerBefore.scouted.progress + 6 } };
    const unchangedAfter = { ...unchangedBefore, scouted: { ...unchangedBefore.scouted, progress: unchangedBefore.scouted.progress + 10 } };
    const recap = buildWeeklyScoutingRecap(3, [riserBefore, fallerBefore, unchangedBefore], [riserAfter, fallerAfter, unchangedAfter]);

    expect(recap.risers).toHaveLength(1);
    expect(recap.fallers).toHaveLength(1);
    expect(recap.risers[0]).toMatchObject({
      prospectId: riserBefore.id,
      consensusRank: riserBefore.consensusRank,
      progressBefore: riserBefore.scouted.progress,
      progressAfter: riserAfter.scouted.progress
    });
    expect(recap.fallers[0].prospectId).toBe(fallerBefore.id);
    expect([...recap.risers, ...recap.fallers].some((entry) => entry.prospectId === unchangedBefore.id)).toBe(false);
  });

  it("weights scouting recap movement by board importance", () => {
    const save = createNewSave("dal", "goals", "scouting-recap-impact-seed");
    const highBefore = { ...save.prospects[0], id: "impact-high", teamRank: 15 };
    const lowBefore = { ...save.prospects[1], id: "impact-low", teamRank: 430 };
    const highAfter = { ...highBefore, teamRank: 8 };
    const lowAfter = { ...lowBefore, teamRank: 340 };
    const recap = buildWeeklyScoutingRecap(4, [lowBefore, highBefore], [lowAfter, highAfter]);
    const highEntry = recap.risers.find((entry) => entry.prospectId === highBefore.id)!;
    const lowEntry = recap.risers.find((entry) => entry.prospectId === lowBefore.id)!;

    expect(scoutingRecapImpact(highEntry, "riser")).toBe(56);
    expect(scoutingRecapImpact(lowEntry, "riser")).toBe(90);
    expect(recap.risers.map((entry) => entry.prospectId)).toEqual([lowBefore.id, highBefore.id]);
  });

  it("lets high-board weighted movers beat larger low-board moves when impact is higher", () => {
    const save = createNewSave("dal", "goals", "scouting-recap-weighted-order-seed");
    const highBefore = { ...save.prospects[0], id: "weighted-high", teamRank: 24 };
    const lowBefore = { ...save.prospects[1], id: "weighted-low", teamRank: 430 };
    const highAfter = { ...highBefore, teamRank: 12 };
    const lowAfter = { ...lowBefore, teamRank: 370 };
    const recap = buildWeeklyScoutingRecap(5, [lowBefore, highBefore], [lowAfter, highAfter]);

    expect(scoutingRecapImpact(recap.risers[0], "riser")).toBeGreaterThan(scoutingRecapImpact(recap.risers[1], "riser"));
    expect(recap.risers.map((entry) => entry.prospectId)).toEqual([highBefore.id, lowBefore.id]);
  });

  it("uses previous rank as faller impact anchor and tie-breaks by anchor rank", () => {
    const save = createNewSave("dal", "goals", "scouting-recap-faller-impact-seed");
    const topBefore = { ...save.prospects[0], id: "faller-top", teamRank: 8 };
    const lateBefore = { ...save.prospects[1], id: "faller-late", teamRank: 300 };
    const tieA = { ...save.prospects[2], id: "faller-tie-a", teamRank: 40 };
    const tieB = { ...save.prospects[3], id: "faller-tie-b", teamRank: 45 };
    const recap = buildWeeklyScoutingRecap(
      6,
      [lateBefore, tieB, topBefore, tieA],
      [
        { ...lateBefore, teamRank: 390 },
        { ...tieB, teamRank: 55 },
        { ...topBefore, teamRank: 20 },
        { ...tieA, teamRank: 50 }
      ]
    );

    expect(scoutingRecapImpact(recap.fallers[0], "faller")).toBe(96);
    expect(recap.fallers[0].prospectId).toBe(topBefore.id);
    expect(recap.fallers.map((entry) => entry.prospectId)).toEqual([topBefore.id, lateBefore.id, tieA.id, tieB.id]);
  });

  it("stores a scouting recap from weekly scouting progress", () => {
    let save = createNewSave("dal", "goals", "scouting-recap-week-seed");
    const plan = ensureScoutingPlan(save);
    const riser = save.prospects.find((prospect) => !["K", "P"].includes(prospect.position))!;
    const faller = save.prospects.find((prospect) => prospect.id !== riser.id && !["K", "P"].includes(prospect.position))!;
    save = withProspectPatch(save, riser.id, (prospect) => ({
      ...prospect,
      trueOverall: 78,
      potential: 92,
      teamRank: 320,
      scouted: {
        ...prospect.scouted,
        low: 34,
        high: 44,
        potentialLow: 45,
        potentialHigh: 56,
        progress: 12,
        confidence: 12
      }
    }));
    save = withProspectPatch(save, faller.id, (prospect) => ({
      ...prospect,
      trueOverall: 36,
      potential: 46,
      teamRank: 1,
      scouted: {
        ...prospect.scouted,
        low: 72,
        high: 84,
        potentialLow: 82,
        potentialHigh: 96,
        progress: 12,
        confidence: 12
      }
    }));
    let assigned = updateScoutingAssignment(save, plan.assignments[0].id, { type: "prospect", focusId: riser.id });
    assigned = updateScoutingAssignment(assigned, ensureScoutingPlan(assigned).assignments[1].id, { type: "prospect", focusId: faller.id });
    const afterWeek = applyWeeklyScoutingPlan(assigned);
    const recap = afterWeek.scoutingPlan.recaps[0];

    expect(recap.week).toBe(save.currentWeek);
    expect(recap.risers.some((entry) => entry.prospectId === riser.id)).toBe(true);
    expect(recap.fallers.some((entry) => entry.prospectId === faller.id)).toBe(true);
    const riserEntry = recap.risers.find((entry) => entry.prospectId === riser.id)!;
    expect(riserEntry.teamRankAfter).toBeLessThan(riserEntry.teamRankBefore);
    expect(riserEntry.overallBefore[0]).toBeLessThanOrEqual(riserEntry.overallBefore[1]);
    expect(riserEntry.overallAfter[0]).toBeLessThanOrEqual(riserEntry.overallAfter[1]);
  });

  it("prevents duplicate exact scouting assignments", () => {
    const save = createNewSave("dal", "goals", "scouting-duplicates-seed");
    const plan = ensureScoutingPlan(save);
    const first = plan.assignments[0];
    const second = plan.assignments[1];
    const updated = updateScoutingAssignment(save, second.id, { type: first.type, focusId: first.focusId });
    const assignments = ensureScoutingPlan(updated).assignments;
    const keys = assignments.map((assignment) => `${assignment.type}:${assignment.focusId}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("shows narrow assignments as deeper and broad assignments as wider", () => {
    const save = createNewSave("dal", "goals", "scouting-preview-seed");
    const plan = ensureScoutingPlan(save);
    const specific = updateScoutingAssignment(save, plan.assignments[0].id, { type: "prospect", focusId: save.prospects[0].id });
    const broad = updateScoutingAssignment(save, plan.assignments[1].id, { type: "side", focusId: "Offense" });
    const specificPreview = scoutingAssignmentPreview(specific, ensureScoutingPlan(specific).assignments[0]);
    const broadPreview = scoutingAssignmentPreview(broad, ensureScoutingPlan(broad).assignments[1]);

    expect(specificPreview.count).toBe(1);
    expect(broadPreview.count).toBeGreaterThan(specificPreview.count);
    expect(specificPreview.minGain).toBeGreaterThan(broadPreview.maxGain);
  });

  it("builds rich assignment previews for the war room planner", () => {
    const save = createNewSave("dal", "goals", "scouting-card-preview-seed");
    const plan = ensureScoutingPlan(save);
    const preview = scoutingAssignmentPreview(save, plan.assignments[0]);

    expect(preview.ratingChips.length).toBeGreaterThan(0);
    expect(preview.targets.length).toBeLessThanOrEqual(5);
    expect(preview.recommendation.length).toBeGreaterThan(10);
    expect(preview.targets[0]?.gainRange[1] ?? preview.maxGain).toBe(preview.maxGain);
  });

  it("optimizes unlocked scout assignments while preserving locks and unique focuses", () => {
    const save = createNewSave("dal", "goals", "scouting-optimize-seed");
    const plan = ensureScoutingPlan(save);
    const lockedBase = updateScoutingAssignment(save, plan.assignments[0].id, { type: "region", focusId: "West" });
    const locked = updateScoutingAssignmentLock(lockedBase, plan.assignments[0].id, true);
    const before = ensureScoutingPlan(locked).assignments[0];
    const optimized = optimizeWeeklyScoutingPlan(locked);
    const assignments = ensureScoutingPlan(optimized).assignments;
    const keys = assignments.map((assignment) => `${assignment.type}:${assignment.focusId}`);
    const needPositions = new Set(rosterNeeds(optimized, optimized.selectedTeamId).slice(0, 4).map((need) => need.position));
    const focusedNeed = assignments.some((assignment) => {
      if (assignment.type === "position") return needPositions.has(assignment.focusId as any);
      if (assignment.type !== "prospect") return false;
      const prospect = optimized.prospects.find((item) => item.id === assignment.focusId);
      return prospect ? needPositions.has(prospect.position) : false;
    });

    expect(assignments[0].type).toBe(before.type);
    expect(assignments[0].focusId).toBe(before.focusId);
    expect(assignments[0].locked).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    expect(focusedNeed).toBe(true);
  });

  it("does not optimize directly into fully scouted prospects unless they are locked", () => {
    const save = createNewSave("dal", "goals", "scouting-full-progress-optimize-seed");
    const target = save.prospects[0];
    const fullProgress = withProgress(save, { [target.id]: 100 });
    const plan = ensureScoutingPlan(fullProgress);
    const assigned = updateScoutingAssignment(fullProgress, plan.assignments[0].id, { type: "prospect", focusId: target.id });
    const optimized = optimizeWeeklyScoutingPlan(assigned);
    const optimizedAssignments = ensureScoutingPlan(optimized).assignments;

    expect(optimizedAssignments.some((assignment) => assignment.type === "prospect" && assignment.focusId === target.id)).toBe(false);

    const locked = updateScoutingAssignmentLock(assigned, plan.assignments[0].id, true);
    const lockedOptimized = optimizeWeeklyScoutingPlan(locked);
    expect(ensureScoutingPlan(lockedOptimized).assignments[0]).toMatchObject({
      type: "prospect",
      focusId: target.id,
      locked: true
    });
  });

  it("prefers lower-progress high-upside mysteries over nearly saturated stars", () => {
    let save = createNewSave("dal", "goals", "scouting-mystery-upside-seed");
    const saturatedStar = save.prospects[0];
    const mystery = save.prospects.find((prospect) => prospect.id !== saturatedStar.id && !["K", "P"].includes(prospect.position))!;
    save = withProgress(save, new Map([[saturatedStar.id, 88], [mystery.id, 28]]), 100);
    save = withProspectPatch(save, saturatedStar.id, (prospect) => ({
      ...prospect,
      teamRank: 1,
      consensusRank: 1,
      valuePickScore: 0,
      favorite: false
    }));
    save = withProspectPatch(save, mystery.id, (prospect) => ({
      ...prospect,
      teamRank: 24,
      consensusRank: 165,
      valuePickScore: 141,
      favorite: true,
      scouted: {
        ...prospect.scouted,
        low: Math.max(38, saturatedStar.scouted.low - 3),
        high: Math.max(saturatedStar.scouted.high - 2, prospect.scouted.high),
        potentialLow: Math.max(prospect.scouted.potentialLow, saturatedStar.scouted.potentialLow),
        potentialHigh: Math.min(99, Math.max(prospect.scouted.potentialHigh, saturatedStar.scouted.potentialHigh + 8)),
        progress: 28,
        confidence: 28
      }
    }));

    const optimized = optimizeWeeklyScoutingPlan(save);
    const directProspects = ensureScoutingPlan(optimized).assignments.filter((assignment) => assignment.type === "prospect");

    expect(directProspects.some((assignment) => assignment.focusId === saturatedStar.id)).toBe(false);
    expect(directProspects.some((assignment) => assignment.focusId === mystery.id)).toBe(true);
  });

  it("rotates stale repeated assignments away from saturated targets", () => {
    const save = createNewSave("dal", "goals", "scouting-stale-rotate-seed");
    const plan = ensureScoutingPlan(save);
    let assigned = save;
    const staleProspects = save.prospects.slice(0, plan.assignments.length);
    plan.assignments.forEach((assignment, index) => {
      assigned = updateScoutingAssignment(assigned, assignment.id, { type: "prospect", focusId: staleProspects[index].id });
    });
    assigned = withProgress(assigned, new Map(staleProspects.map((prospect) => [prospect.id, 100])));
    const optimized = optimizeWeeklyScoutingPlan(assigned);
    const staleIds = new Set(staleProspects.map((prospect) => prospect.id));

    expect(ensureScoutingPlan(optimized).assignments.some((assignment) => assignment.type === "prospect" && staleIds.has(assignment.focusId))).toBe(false);
  });

  it("keeps optimized plans diverse and broad previews focused on unsaturated targets", () => {
    const save = createNewSave("dal", "goals", "scouting-diverse-preview-seed");
    const optimized = optimizeWeeklyScoutingPlan(save);
    const assignments = ensureScoutingPlan(optimized).assignments;
    const keys = assignments.map((assignment) => `${assignment.type}:${assignment.focusId}`);
    const typeCount = new Set(assignments.map((assignment) => assignment.type)).size;
    const broad = assignments.find((assignment) => assignment.type !== "prospect")!;
    const preview = scoutingAssignmentPreview(optimized, broad);

    expect(new Set(keys).size).toBe(keys.length);
    expect(typeCount).toBeGreaterThanOrEqual(3);
    expect(preview.targets.length).toBeGreaterThan(0);
    expect(preview.targets.every((target) => target.progress < 100)).toBe(true);
  });

  it("quick focuses a prospect with an available unlocked scout", () => {
    const save = createNewSave("dal", "goals", "quick-focus-seed");
    const plan = ensureScoutingPlan(save);
    const prospect = save.prospects.find((item) => !plan.assignments.some((assignment) => assignment.type === "prospect" && assignment.focusId === item.id))!;
    const locked = updateScoutingAssignmentLock(save, plan.assignments[0].id, true);
    const focused = quickFocusProspect(locked, prospect.id);
    const assignment = ensureScoutingPlan(focused).assignments.find((item) => item.type === "prospect" && item.focusId === prospect.id);

    expect(assignment).toBeDefined();
    expect(assignment?.id).not.toBe(plan.assignments[0].id);
    expect(ensureScoutingPlan(focused).assignments[0].locked).toBe(true);
  });

  it("keeps uncertainty even at full scouting progress", () => {
    const save = createNewSave("dal", "goals", "full-progress-uncertainty-seed");
    const prospect = save.prospects[0];
    const school = save.schools.find((item) => item.id === prospect.schoolId);
    const full = applyScoutingProjection(prospect, 100, save.seed, school, 90);

    expect(full.scouted.high - full.scouted.low).toBeGreaterThanOrEqual(2);
    expect(full.scouted.potentialHigh - full.scouted.potentialLow).toBeGreaterThanOrEqual(5);
    expect(full.scouted.concerns.medical[1] - full.scouted.concerns.medical[0]).toBeGreaterThanOrEqual(4);
  });

  it("generates independent concern profiles instead of tying them to prospect quality", () => {
    const save = createNewSave("dal", "goals", "concern-distribution-seed");
    const values = save.prospects.flatMap((prospect) => [prospect.medical, prospect.character, prospect.workEthic]);
    const neutralCount = values.filter((value) => concernBandFor(value) === "neutral").length;
    const redCount = values.filter((value) => concernBandFor(value) === "red").length;
    const goodOrEliteCount = values.filter((value) => concernBandFor(value) === "good" || concernBandFor(value) === "elite").length;
    const bottomProspects = [...save.prospects].sort((a, b) => a.trueOverall - b.trueOverall).slice(0, 80);

    expect(neutralCount).toBeGreaterThan(930);
    expect(redCount).toBeGreaterThanOrEqual(10);
    expect(redCount).toBeLessThan(55);
    expect(goodOrEliteCount).toBeGreaterThan(90);
    expect(bottomProspects.some((prospect) => prospect.medical >= 60 && prospect.character >= 60 && prospect.workEthic >= 60)).toBe(true);
    expect(bottomProspects.filter((prospect) => prospect.medical < 45 || prospect.character < 45 || prospect.workEthic < 45).length).toBeLessThan(25);
  });

  it("keeps concern ranges fuzzy and only surfaces meaningful concern badges", () => {
    const save = createNewSave("dal", "goals", "concern-range-seed");
    const prospect = save.prospects[0];
    const school = save.schools.find((item) => item.id === prospect.schoolId);
    const low = applyScoutingProjection(prospect, 18, save.seed, school, 62);
    const full = applyScoutingProjection(prospect, 100, save.seed, school, 90);

    expect(low.scouted.concerns.medical[1] - low.scouted.concerns.medical[0]).toBeGreaterThan(
      full.scouted.concerns.medical[1] - full.scouted.concerns.medical[0]
    );
    expect(full.scouted.concerns.character[1] - full.scouted.concerns.character[0]).toBeGreaterThanOrEqual(5);
    expect(concernSignalForRange("medical", [64, 78])).toBeUndefined();
    expect(concernSignalForRange("character", [31, 44])?.symbol).toBe("!");
    expect(concernSignalForRange("workEthic", [82, 92])?.symbol).toBe("^");
  });

  it("lets concerns move valuation without overpowering neutral football grades", () => {
    const neutral = {
      medical: [64, 76] as [number, number],
      character: [63, 77] as [number, number],
      workEthic: [65, 78] as [number, number]
    };
    const eliteMakeup = {
      medical: [86, 94] as [number, number],
      character: [83, 91] as [number, number],
      workEthic: [90, 96] as [number, number]
    };
    const redFlags = {
      medical: [26, 42] as [number, number],
      character: [34, 48] as [number, number],
      workEthic: [46, 58] as [number, number]
    };

    expect(Math.abs(teamConcernAdjustment(neutral))).toBeLessThan(0.5);
    expect(teamConcernAdjustment(eliteMakeup)).toBeGreaterThan(teamConcernAdjustment(neutral));
    expect(teamConcernAdjustment(redFlags)).toBeLessThan(-7);
    expect(teamConcernAdjustment(eliteMakeup)).toBeLessThanOrEqual(3);
  });

  it("persists favorite and hidden board controls without manual tiers", () => {
    const save = createNewSave("sf", "goals", "board-tags-seed");
    const prospect = save.prospects[0];
    const updated = updateProspectBoard(save, prospect.id, {
      favorite: true,
      hidden: true
    });
    const found = updated.prospects.find((item) => item.id === prospect.id)!;

    expect(found.favorite).toBe(true);
    expect(found.hidden).toBe(true);
    expect("draftTier" in found).toBe(false);
    expect("boardTags" in found).toBe(false);
    expect("userNote" in found).toBe(false);
  });

  it("sorts prospects differently across balanced, upside, floor, and value lenses", () => {
    const save = createNewSave("sf", "goals", "board-lens-seed");
    const topIds = (lens: "balanced" | "upside" | "floor" | "value") =>
      save.prospects.slice().sort((a, b) => compareProspectsForLens(a, b, lens)).slice(0, 20).map((prospect) => prospect.id);

    const balanced = topIds("balanced").join("|");
    expect(topIds("upside").join("|")).not.toBe(balanced);
    expect(topIds("floor").join("|")).not.toBe(balanced);
    expect(topIds("value").join("|")).not.toBe(balanced);
  });
});

describe("staff market overhaul", () => {
  it("generates exact staff slots with seven same-title scouts", () => {
    const save = createNewSave("chi", "goals", "staff-slot-seed");
    const staff = save.staff.filter((member) => member.teamId === "chi");
    const scouts = staff.filter((member) => member.department === "Scouting");

    expect(staff.map((member) => member.slotId).sort()).toEqual(staffSlotDefinitions.map((slot) => slot.id).sort());
    expect(scouts).toHaveLength(7);
    expect(scouts.every((member) => member.role === "Scout")).toBe(true);
    expect(staff).toHaveLength(20);
    expect(staff.some((member) => member.role === "Special Teams Coordinator")).toBe(true);
    expect(staff.some((member) => member.role === "RB Coach")).toBe(true);
    expect(staff.some((member) => member.role === "WR Coach")).toBe(true);
    expect(staff.some((member) => member.role === "TE Coach")).toBe(true);
    expect(staff.some((member) => member.role === "LB Coach")).toBe(true);
    expect(staff.some((member) => (member as any).role === "Cap Analyst" || (member as any).department === "Operations" || (member as any).slotId === "cap-analyst")).toBe(false);
    expect(save.staffMarket.candidates.some((member) => (member as any).role === "Cap Analyst" || (member as any).department === "Operations" || (member as any).slotId === "cap-analyst")).toBe(false);
    expect(staff.some((member) => member.role === "Scouting Director")).toBe(false);
    expect(staff.some((member) => member.role === "Area Scout East")).toBe(false);
  });

  it("does not generate old staff flavor fields", () => {
    const save = createNewSave("chi", "goals", "staff-no-flavor-seed");
    const generated = [
      ...save.staff.filter((member) => member.teamId === "chi"),
      ...save.staffMarket.candidates.slice(0, 30)
    ] as any[];

    for (const member of generated) {
      expect("specialty" in member).toBe(false);
      expect("personality" in member).toBe(false);
      expect("schemePreference" in member).toBe(false);
    }
  });

  it("gives every scout ratings for regions, positions, conferences, and school size", () => {
    const save = createNewSave("chi", "goals", "staff-scout-ratings-seed");
    const conferences = [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
    const scouts = save.staff.filter((member) => member.teamId === "chi" && member.department === "Scouting");

    for (const scout of scouts) {
      const ratings = scout.skillProfile.scout!;
      expect(Object.keys(ratings.positions).sort()).toEqual([...POSITIONS].sort());
      expect(Object.keys(ratings.conferences).sort((a, b) => a.localeCompare(b))).toEqual(conferences);
      expect(Object.keys(ratings.regions).sort()).toEqual(["East", "Midwest", "National", "South", "West"]);
      expect(ratings.largeSchool).toEqual(expect.any(Number));
      expect(ratings.smallSchool).toEqual(expect.any(Number));
      expect(ratings.offense).toBeGreaterThan(20);
      expect(ratings.defense).toBeGreaterThan(20);
      expect(ratings.specialTeams).toBeGreaterThan(20);
      for (const obsolete of ["reportAccuracy", "projection", "discovery", "medical", "character", "analytics"]) {
        expect(obsolete in (ratings as any)).toBe(false);
      }
    }
  });

  it("normalizes legacy staff into the new slot model", () => {
    const save = createNewSave("chi", "goals", "legacy-staff-slot-seed");
    const legacyScoutRoles = ["Scouting Director", "National Scout", "Regional Scout", "Area Scout East", "Area Scout South", "Area Scout Midwest", "Area Scout West"] as const;
    const legacyCap = {
      ...save.staff.find((member) => member.teamId === "chi" && member.role === "Trainer")!,
      id: "chi-cap-legacy",
      role: "Cap Analyst",
      slotId: "cap-analyst",
      department: "Operations",
      skillProfile: {
        type: "Operations",
        operations: {
          negotiation: 90,
          capPlanning: 88,
          tradeEvaluation: 86,
          contractStructure: 84,
          budgetAdvice: 82,
          ownerManagement: 80
        }
      },
      specialty: "Cap",
      personality: "Innovator",
      schemePreference: "spread"
    } as any;
    const legacy = {
      ...save,
      staff: [
        ...save.staff.map((member, index) => {
          const copy = { ...member } as any;
          delete copy.slotId;
          delete copy.valueScore;
          copy.specialty = "Teacher";
          copy.personality = "Builder";
          copy.schemePreference = "air-raid";
          if (copy.department === "Scouting") {
            copy.role = legacyScoutRoles[index % legacyScoutRoles.length];
            copy.skillProfile = {
              ...copy.skillProfile,
              scout: {
                ...copy.skillProfile.scout,
                reportAccuracy: 99,
                projection: 98,
                discovery: 97,
                medical: 96,
                character: 95,
                analytics: 94
              }
            };
          }
          return copy;
        }),
        legacyCap
      ]
    };
    const normalized = normalizeSave(legacy);
    const staff = normalized.staff.filter((member) => member.teamId === "chi");
    const scouts = staff.filter((member) => member.department === "Scouting");

    expect(staff.map((member) => member.slotId).sort()).toEqual(staffSlotDefinitions.map((slot) => slot.id).sort());
    expect(scouts).toHaveLength(7);
    expect(scouts.every((member) => member.role === "Scout" && member.skillProfile.scout)).toBe(true);
    expect(staff.some((member) => (member as any).role === "Cap Analyst" || (member as any).department === "Operations" || (member as any).slotId === "cap-analyst")).toBe(false);
    expect(staff.some((member) => "specialty" in (member as any) || "personality" in (member as any) || "schemePreference" in (member as any))).toBe(false);
    for (const scout of scouts) {
      for (const obsolete of ["reportAccuracy", "projection", "discovery", "medical", "character", "analytics"]) {
        expect(obsolete in (scout.skillProfile.scout as any)).toBe(false);
      }
    }
  });

  it("normalizes legacy Small School regions into geography and school size", () => {
    const save = createNewSave("chi", "goals", "legacy-small-school-region-seed");
    const legacyProspect = save.prospects.find((prospect) => save.schools.find((school) => school.id === prospect.schoolId)?.subdivision === "FCS") ?? save.prospects[0];
    const legacyReport = {
      id: "legacy-small-school-report",
      week: save.currentWeek,
      region: "Small School",
      title: "Legacy small-school report",
      body: "Old save data used Small School as a region.",
      prospectIds: [legacyProspect.id]
    };
    const legacy = {
      ...save,
      prospects: save.prospects.map((prospect) =>
        prospect.id === legacyProspect.id ? { ...prospect, region: "Small School" } : prospect
      ),
      scoutingPlan: {
        ...save.scoutingPlan,
        assignments: save.scoutingPlan.assignments.map((assignment, index) => {
          if (index !== 0) return assignment;
          const { type: _type, focusId: _focusId, ...legacyAssignment } = assignment as any;
          return { ...legacyAssignment, region: "Small School", schoolSize: undefined };
        }),
        reports: [legacyReport, ...(save.scoutingPlan.reports ?? [])]
      }
    } as any;

    const normalized = normalizeSave(legacy);
    const normalizedProspect = normalized.prospects.find((prospect) => prospect.id === legacyProspect.id)!;
    const normalizedAssignment = normalized.scoutingPlan.assignments[0];

    expect((normalizedProspect as any).region).not.toBe("Small School");
    expect(["East", "Midwest", "South", "West"]).toContain(normalizedProspect.region);
    expect(normalizedAssignment.type).toBe("region");
    expect(normalizedAssignment.focusId).toBe("National");
    expect((normalized.scoutingPlan.reports[0] as any).region).toBe("National");
  });

  it("scores candidate value higher for skill at a lower contract cost", () => {
    const save = createNewSave("chi", "goals", "staff-value-seed");
    const candidate = save.staffMarket.candidates.find((item) => item.slotId === "qb-coach")!;
    const slot = staffSlotDefinitions.find((item) => item.id === candidate.slotId)!;
    const bargain = { ...candidate, demandSalary: Number((candidate.demandSalary * 0.55).toFixed(1)), demandYears: 1 };
    const expensive = { ...candidate, demandSalary: Number((candidate.demandSalary * 1.8).toFixed(1)), demandYears: 5 };

    expect(staffValueScore(bargain, slot)).toBeGreaterThan(staffValueScore(expensive, slot));
  });

  it("rewards matching scout region, conference, position, and school size", () => {
    const save = createNewSave("chi", "goals", "scout-specialty-match-seed");
    const prospect = save.prospects.find((item) => save.schools.find((school) => school.id === item.schoolId)?.subdivision === "FBS")!;
    const school = save.schools.find((item) => item.id === prospect.schoolId)!;
    const plan = ensureScoutingPlan(save);
    const assignmentId = plan.assignments[0].id;
    const mismatchRegion = prospect.region === "West" ? "East" : "West";
    const tuned = {
      ...save,
      staff: save.staff.map((member) => {
        if (member.id !== plan.assignments[0].scoutId || !member.skillProfile.scout) return member;
        return {
          ...member,
          skillProfile: {
            ...member.skillProfile,
            scout: {
              ...member.skillProfile.scout,
              regions: {
                ...member.skillProfile.scout.regions,
                [prospect.region]: 95,
                [mismatchRegion]: 25
              }
            }
          }
        };
      })
    };
    const matched = updateScoutingAssignment(tuned, assignmentId, { type: "region", focusId: prospect.region });
    const mismatched = updateScoutingAssignment(tuned, assignmentId, { type: "region", focusId: mismatchRegion });
    const matchedPreview = scoutingAssignmentPreview(matched, ensureScoutingPlan(matched).assignments[0]);
    const mismatchedPreview = scoutingAssignmentPreview(mismatched, ensureScoutingPlan(mismatched).assignments[0]);

    expect(school.subdivision).toBe("FBS");
    expect(matchedPreview.fit).toBeGreaterThan(mismatchedPreview.fit);
    expect(matchedPreview.minGain).toBeGreaterThan(mismatchedPreview.minGain);
  });

  it("interviews and hires candidates with budget and payroll impact", () => {
    const save = createNewSave("chi", "goals", "staff-market-seed");
    const candidate = save.staffMarket.candidates.find((item) => !item.hired && item.interestedTeamIds.includes("chi"))!;
    const interviewed = interviewStaffCandidate(save, candidate.id);
    const afterInterview = interviewed.staffMarket.candidates.find((item) => item.id === candidate.id)!;
    const beforePayroll = staffPayroll(interviewed, "chi");
    const hired = hireStaffCandidate(interviewed, candidate.id);
    const hiredCandidate = hired.staffMarket.candidates.find((item) => item.id === candidate.id)!;

    expect(afterInterview.interviewed).toBe(true);
    expect(hiredCandidate.hired).toBe(true);
    expect(staffPayroll(hired, "chi")).not.toBe(beforePayroll);
    expect(hired.staff.some((member) => member.teamId === "chi" && member.role === candidate.role && member.lastName === candidate.lastName)).toBe(true);
  });
});

describe("play-by-play simulation", () => {
  it("is deterministic for the same save and game seed", () => {
    const save = createNewSave("gb", "goals", "game-seed");
    const game = teamSchedule(save, "gb")[0];

    const first = simulateGame(save, game);
    const second = simulateGame(save, game);

    expect(first.homeScore).toBe(second.homeScore);
    expect(first.awayScore).toBe(second.awayScore);
    expect(first.log.map((entry) => entry.text)).toEqual(second.log.map((entry) => entry.text));
    expect(Object.keys(first.snapCounts).length).toBeGreaterThan(20);
    expect(first.log.length).toBeGreaterThan(40);
  });

  it("advances a week, finalizes games, updates standings, and improves scouting", () => {
    const save = createNewSave("dal", "goals", "advance-seed");
    const trackedProspectId = save.prospects[0].id;
    const progressBefore = save.prospects[0].scouted.progress;
    const next = advanceWeek(save);
    const selectedGames = teamSchedule(next, "dal");
    const trackedProspect = next.prospects.find((prospect) => prospect.id === trackedProspectId)!;

    expect(next.currentWeek).toBe(2);
    expect(selectedGames.some((game) => game.status === "final")).toBe(true);
    expect(next.records.dal.wins + next.records.dal.losses + next.records.dal.ties).toBe(1);
    expect(trackedProspect.scouted.progress).toBeGreaterThanOrEqual(progressBefore);
    expect(playersForTeam(next, "dal").reduce((sum, player) => sum + player.stats.snaps, 0)).toBeGreaterThan(0);
    expect(next.inbox.length).toBeGreaterThan(save.inbox.length);
  }, 30000);
});

describe("expanded ratings", () => {
  it("uses 60 as the average-starter baseline for fresh neutral rosters", () => {
    const save = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "rating-scale-baseline", scenario: "neutral" });
    const roster = playersForTeam(save, "chi");
    const starters = roster.filter((player) => player.overall >= 60);
    const elite = save.players.filter((player) => player.overall >= 80);

    expect(ratingTierLabel(40)).toBe("Fringe");
    expect(ratingTierLabel(50)).toBe("Backup");
    expect(ratingTierLabel(60)).toBe("Starter");
    expect(ratingTierLabel(70)).toBe("Pro Bowl");
    expect(starters.length).toBeGreaterThanOrEqual(8);
    expect(starters.length).toBeLessThanOrEqual(18);
    expect(elite.length).toBeLessThan(12);
  });

  it("keeps rookies mostly below starter level while making elite ceilings rare", () => {
    const save = createNewSave({ selectedTeamId: "ten", mode: "goals", seed: "rookie-scale-baseline", scenario: "neutral" });
    const starterReady = save.prospects.filter((prospect) => prospect.trueOverall >= 60);
    const eliteCeilings = save.prospects.filter((prospect) => prospect.potential >= 80);
    const firstRounders = save.prospects.filter((prospect) => prospect.projectedRound === 1);

    expect(starterReady.length).toBeLessThan(50);
    expect(eliteCeilings.length).toBeLessThan(12);
    expect(firstRounders.length).toBeGreaterThan(12);
    expect(firstRounders.every((prospect) => prospect.scouted.potentialLow <= prospect.potential && prospect.scouted.potentialHigh >= prospect.potential)).toBe(true);
  });

  it("keeps component ratings and overall deterministic by seed", () => {
    const first = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "ratings-deterministic", scenario: "neutral" });
    const second = createNewSave({ selectedTeamId: "chi", mode: "goals", seed: "ratings-deterministic", scenario: "neutral" });
    const firstPlayer = playersForTeam(first, "chi")[0];
    const secondPlayer = playersForTeam(second, "chi")[0];

    expect(firstPlayer.ratings).toEqual(secondPlayer.ratings);
    expect(firstPlayer.overall).toBe(secondPlayer.overall);
    expect(first.prospects[0].scouted.ratingRanges).toEqual(second.prospects[0].scouted.ratingRanges);
    expect("roleGrades" in firstPlayer).toBe(false);
    expect("roleGradeRanges" in first.prospects[0].scouted).toBe(false);
  });

  it("generates more position-focused rating profiles by default", () => {
    const qb = generateRatings("QB", 60, createRng("focused-qb"));
    const lt = generateRatings("LT", 60, createRng("focused-lt"));
    const cb = generateRatings("CB", 60, createRng("focused-cb"));

    const qbOffense = averageKeys(qb, ["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy", "timing", "pocketPresence", "pressureSense"]);
    const qbDefense = averageKeys(qb, ["tackling", "pursuit", "runDefense", "zoneCoverage", "manCoverage"]);
    const ltBlocking = averageKeys(lt, ["runBlock", "passBlock", "passBlockFootwork", "anchor", "handTechnique", "blitzPickup"]);
    const ltDefense = averageKeys(lt, ["tackling", "pursuit", "runDefense", "powerRush", "zoneCoverage"]);
    const cbCoverage = averageKeys(cb, ["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills", "closingSpeed"]);
    const cbBlocking = averageKeys(cb, ["runBlock", "passBlock", "anchor", "handTechnique", "blitzPickup"]);

    expect(qbOffense - qbDefense).toBeGreaterThan(14);
    expect(ltBlocking - ltDefense).toBeGreaterThan(16);
    expect(cbCoverage - cbBlocking).toBeGreaterThan(18);
  });

  it("weights shared core traits differently across positions", () => {
    const base = testRatings(60);
    const faster = [...base];
    setTestRating(faster, "speed", 90);
    setTestRating(faster, "acceleration", 90);

    const rbLift = calculateOverallFromRatings("RB", faster) - calculateOverallFromRatings("RB", base);
    const ltLift = calculateOverallFromRatings("LT", faster) - calculateOverallFromRatings("LT", base);

    expect(rbLift).toBeGreaterThan(ltLift + 2);
    expect(ltLift).toBeGreaterThanOrEqual(0);
  });

  it("weights QB passing components more than rushing components", () => {
    const passer = boost(testRatings(60), ["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy", "timing", "pocketPresence"], 92);
    const runner = boost(testRatings(60), ["rushingVision", "burst", "elusiveness", "powerRun", "breakTackle"], 92);

    expect(calculateOverallFromRatings("QB", passer)).toBeGreaterThan(calculateOverallFromRatings("QB", runner) + 10);
  });

  it("evaluates RB profiles from position components without named roles", () => {
    const powerBack = boost(testRatings(58), ["rushingVision", "contactBalance", "breakTackle", "powerRun", "ballSecurity", "stamina"], 91);
    const receivingBack = boost(testRatings(58), ["passCatching", "blitzPickup", "shortRoute", "separation", "burst", "ballSecurity"], 91);
    const powerOverall = calculateOverallFromRatings("RB", powerBack);
    const receivingOverall = calculateOverallFromRatings("RB", receivingBack);

    expect(powerOverall).toBeGreaterThan(74);
    expect(receivingOverall).toBeGreaterThan(65);
    expect(powerOverall).toBeGreaterThan(receivingOverall);
  });

  it("prioritizes technical components for OL, EDGE, CB, S, K, and P overalls", () => {
    const blocker = boost(testRatings(55), ["passBlock", "passBlockFootwork", "anchor", "handTechnique", "strength"], 90);
    const rusher = boost(testRatings(55), ["powerRush", "finesseRush", "passRushPlan", "explosiveness", "blockShedding"], 90);
    const corner = boost(testRatings(55), ["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills", "changeOfDirection", "speed", "acceleration", "closingSpeed"], 90);
    const safety = boost(testRatings(55), ["zoneCoverage", "playRecognition", "ballSkills", "tackling", "closingSpeed"], 90);
    const kicker = boost(testRatings(55), ["kickPower", "kickAccuracy", "composure"], 90);
    const punter = boost(testRatings(55), ["puntPower", "puntAccuracy", "composure"], 90);

    expect(calculateOverallFromRatings("LT", blocker)).toBeGreaterThan(70);
    expect(calculateOverallFromRatings("EDGE", rusher)).toBeGreaterThan(70);
    expect(calculateOverallFromRatings("CB", corner)).toBeGreaterThan(75);
    expect(calculateOverallFromRatings("S", safety)).toBeGreaterThan(70);
    expect(calculateOverallFromRatings("K", kicker)).toBeGreaterThan(70);
    expect(calculateOverallFromRatings("P", punter)).toBeGreaterThan(70);
  });

  it("auto-upgrades old players and prospects that do not have component ratings", () => {
    const save = createNewSave("chi", "goals", "legacy-upgrade-seed");
    const legacyPlayer = { ...playersForTeam(save, "chi")[0] } as any;
    const legacyProspect = { ...save.prospects[0], scouted: { ...save.prospects[0].scouted } } as any;
    delete legacyPlayer.ratings;
    delete legacyPlayer.roleGrades;
    delete legacyProspect.ratings;
    delete legacyProspect.roleGrades;
    delete legacyProspect.scouted.ratingRanges;
    delete legacyProspect.scouted.roleGradeRanges;

    const upgradedPlayer = refreshPlayerRatings(legacyPlayer, save.seed);
    const upgradedAgain = refreshPlayerRatings(legacyPlayer, save.seed);
    const upgradedProspect = refreshProspectRatings(legacyProspect, save.seed);

    expect(upgradedPlayer.ratings).toHaveLength(ratingRegistry.length);
    expect(upgradedPlayer.overall).toBe(upgradedAgain.overall);
    expect("roleGrades" in upgradedPlayer).toBe(false);
    expect(upgradedProspect.scouted.ratingRanges).toHaveLength(ratingRegistry.length);
    expect("roleGradeRanges" in upgradedProspect.scouted).toBe(false);
  });

  it("generates realistic multi-position fits for common position families", () => {
    const guardRatings = boost(testRatings(64), ["runBlock", "passBlock", "anchor", "handTechnique", "awareness"], 76);
    const guardFits = generatePositionFits({ position: "RG", ratings: guardRatings, traits: [] });
    const tackleRatings = boost(testRatings(64), ["passBlock", "passBlockFootwork", "anchor", "handTechnique"], 76);
    const tackleFits = generatePositionFits({ position: "LT", ratings: tackleRatings, traits: [] });
    const cornerRatings = boost(testRatings(64), ["manCoverage", "zoneCoverage", "playRecognition", "closingSpeed", "tackling"], 78);
    const cornerFits = generatePositionFits({ position: "CB", ratings: cornerRatings, traits: [] });
    const edgeRatings = boost(testRatings(64), ["blockShedding", "runDefense", "powerRush", "tackling", "pursuit"], 78);
    const edgeFits = generatePositionFits({ position: "EDGE", ratings: edgeRatings, traits: [] });
    const qbFits = generatePositionFits({ position: "QB", ratings: testRatings(70), traits: ["Versatile alignment"] });

    expect(guardFits.RG).toBe(100);
    expect(guardFits.LG).toBeGreaterThanOrEqual(90);
    expect(guardFits.C).toBeGreaterThanOrEqual(86);
    expect(guardFits.RT).toBeGreaterThanOrEqual(70);
    expect((guardFits.LT ?? 0)).toBeLessThan(guardFits.LG ?? 0);
    expect(tackleFits.RT).toBeGreaterThanOrEqual(86);
    expect(cornerFits.S).toBeGreaterThanOrEqual(70);
    expect(edgeFits.DL).toBeGreaterThanOrEqual(74);
    expect(edgeFits.LB).toBeGreaterThanOrEqual(64);
    expect(Object.keys(qbFits)).toEqual(["QB"]);
  });

  it("calculates effective alternate-position OVR with familiarity penalties", () => {
    const ratings = boost(testRatings(66), ["runBlock", "passBlock", "anchor", "handTechnique", "awareness", "playRecognition", "blitzPickup"], 78);
    const player = {
      position: "RG" as const,
      ratings,
      traits: [],
      positionFits: generatePositionFits({ position: "RG", ratings, traits: [] })
    };
    const primaryOverall = calculateOverallFromRatings("RG", ratings);
    const centerTargetOverall = calculateOverallFromRatings("C", ratings);

    expect(positionFitFor(player, "RG")).toBe(100);
    expect(effectiveOverallAtPosition(player, "RG")).toBe(primaryOverall);
    expect(effectiveOverallAtPosition(player, "C")).toBeLessThan(centerTargetOverall);
    expect(effectiveOverallAtPosition(player, "C")).toBeGreaterThan(centerTargetOverall - 8);
    expect(eligiblePositionsFor(player)).toContain("C");
  });

  it("separates raw position skill OVR from fit-adjusted readiness", () => {
    const ratings = boost(testRatings(52), ["awareness", "playRecognition", "discipline", "runBlock", "passBlock", "anchor", "blitzPickup", "strength"], 61);
    const player = {
      position: "DL" as const,
      ratings,
      traits: [],
      positionFits: { DL: 100, C: 51 }
    };

    expect(skillOverallAtPosition(player, "C")).toBeGreaterThanOrEqual(52);
    expect(skillOverallAtPosition(player, "C")).toBeLessThan(68);
    expect(positionFitFor(player, "C")).toBe(51);
    expect(effectiveOverallAtPosition(player, "C")).toBeLessThan(skillOverallAtPosition(player, "C"));
  });

  it("normalizes missing position fits for old saves", () => {
    const save = createNewSave("chi", "goals", "position-fit-normalize-seed");
    const legacy = {
      ...save,
      players: save.players.map((player, index) => {
        const copy = { ...player } as any;
        if (index === 0) delete copy.positionFits;
        return copy;
      }),
      prospects: save.prospects.map((prospect, index) => {
        const copy = { ...prospect, scouted: { ...prospect.scouted } } as any;
        if (index === 0) delete copy.positionFits;
        return copy;
      })
    };
    const normalized = normalizeSave(legacy);

    expect(normalized.players[0].positionFits[normalized.players[0].position]).toBe(100);
    expect(normalized.prospects[0].positionFits[normalized.prospects[0].position]).toBe(100);
    expect(normalizePositionFits(normalized.players[0])[normalized.players[0].position]).toBe(100);
  });

  it("keeps full position-lens projections for generated players", () => {
    const save = normalizeSave(createNewSave("chi", "goals", "position-lens-projection-seed"));
    const player = playersForTeam(save, "chi").find((candidate) => candidate.position === "QB") ?? playersForTeam(save, "chi")[0];
    const storedFits = POSITIONS.map((position) => player.positionFits[position]);
    const projectedOveralls = POSITIONS.map((position) => effectiveOverallAtPosition(player, position));

    expect(storedFits.every((fit) => typeof fit === "number" && fit >= 20 && fit <= 100)).toBe(true);
    expect(projectedOveralls.every((overall) => overall > 0)).toBe(true);
    expect(new Set(storedFits).size).toBeGreaterThan(3);
  });

  it("keeps distant alternate-position projections weak for specialists", () => {
    const save = normalizeSave(createNewSave("chi", "goals", "specialist-position-lens-seed"));
    const qb = playersForTeam(save, "chi").find((candidate) => candidate.position === "QB")!;
    const rt = playersForTeam(save, "chi").find((candidate) => candidate.position === "RT")!;

    expect(effectiveOverallAtPosition(qb, "LB")).toBeLessThan(40);
    expect(effectiveOverallAtPosition(rt, "CB")).toBeLessThan(35);
    expect(effectiveOverallAtPosition(rt, "LT")).toBeGreaterThan(effectiveOverallAtPosition(rt, "CB") + 15);
  });

  it("uses richer matchup ratings for pass rush and QB mistake risk", () => {
    const calmPocket = passMatchupChances({
      qbGrade: 88,
      targetGrade: 82,
      defenderGrade: 72,
      passBlock: 86,
      passRush: 68,
      pressureSense: 90,
      composure: 92
    });
    const overwhelmed = passMatchupChances({
      qbGrade: 62,
      targetGrade: 65,
      defenderGrade: 86,
      passBlock: 58,
      passRush: 92,
      pressureSense: 52,
      composure: 50
    });

    expect(overwhelmed.sackChance).toBeGreaterThan(calmPocket.sackChance);
    expect(overwhelmed.interceptionChance).toBeGreaterThan(calmPocket.interceptionChance);
    expect(calmPocket.yardsMean).toBeGreaterThan(overwhelmed.yardsMean);
  });

  it("runs annual development with age, potential, staff, snaps, and injuries", () => {
    const save = createNewSave("chi", "goals", "annual-development-seed");
    const roster = playersForTeam(save, "chi");
    const young = roster.find((player) => player.position !== "K" && player.position !== "P")!;
    const old = roster.find((player) => player.id !== young.id && player.position !== "K" && player.position !== "P")!;
    const tuned = {
      ...save,
      players: save.players.map((player) => {
        if (player.id === young.id) {
          return {
            ...player,
            age: 22,
            potential: Math.min(99, player.overall + 18),
            makeup: { ...player.makeup, workEthic: 95, medical: 90 },
            stats: { ...player.stats, snaps: 950, offenseSnaps: 950 },
            development: { workEthic: 95, learning: 95, volatility: 24, peakAge: 27, declineAge: 32, style: "Steady Climber" as const }
          };
        }
        if (player.id === old.id) {
          return {
            ...player,
            age: 35,
            potential: player.overall,
            status: "injured" as const,
            injuryWeeks: 5,
            makeup: { ...player.makeup, workEthic: 35, medical: 35 },
            stats: { ...player.stats, snaps: 900, defenseSnaps: 900 },
            development: { workEthic: 35, learning: 35, volatility: 20, peakAge: 25, declineAge: 30, style: "Early Bloomer" as const }
          };
        }
        return player;
      })
    };

    const developed = runAnnualDevelopment(tuned);
    const youngAfter = developed.players.find((player) => player.id === young.id)!;
    const oldAfter = developed.players.find((player) => player.id === old.id)!;

    expect(youngAfter.overall).toBeGreaterThan(young.overall);
    expect(oldAfter.overall).toBeLessThan(old.overall);
    expect(developed.developmentReports.some((report) => report.playerId === young.id)).toBe(true);
    expect(developed.developmentReports.some((report) => report.playerId === old.id)).toBe(true);
  });

  it("uses character makeup for rare league availability events", () => {
    const save = createNewSave("chi", "goals", "character-events-seed");
    const volatile = {
      ...save,
      currentWeek: 7,
      players: save.players.map((player) => ({
        ...player,
        status: "active" as const,
        makeup: { ...player.makeup, character: 20 }
      }))
    };
    const after = applyCharacterEvents(volatile);
    const suspended = after.players.filter((player) => player.status === "suspended");

    expect(characterEventChance(92)).toBe(0);
    expect(characterEventChance(20)).toBeGreaterThan(characterEventChance(55));
    expect(suspended.length).toBeGreaterThan(0);
    expect(after.inbox.some((item) => item.category === "discipline" && item.title.includes("suspended"))).toBe(true);
  });
});

describe("medical system", () => {
  it("uses the single Medical attribute as the primary injury risk driver", () => {
    const save = createNewSave("chi", "goals", "medical-risk-seed");
    const player = playersForTeam(save, "chi").find((candidate) => candidate.position !== "K" && candidate.position !== "P")!;
    const lowMedical = { ...player, medical: 28, makeup: { ...player.makeup, medical: 28 } };
    const highMedical = { ...player, medical: 96, makeup: { ...player.makeup, medical: 96 } };

    expect(playerMedical(lowMedical)).toBe(28);
    expect(injuryRiskWeight(lowMedical, 60, 0.8)).toBeGreaterThan(injuryRiskWeight(highMedical, 60, 0.8) * 2);
    expect(injuryRiskWeight(lowMedical, 88, 0.8)).toBeLessThan(injuryRiskWeight(lowMedical, 45, 0.8));
  });

  it("uses higher injury tuning and makes heavy snap loads matter", () => {
    const save = createNewSave("chi", "goals", "medical-tuning-seed");
    const player = playersForTeam(save, "chi").find((candidate) => candidate.position !== "K" && candidate.position !== "P")!;
    const tuning = medicalTuningForTests();

    expect(tuning.practiceBaseChance).toBeGreaterThan(0.00028);
    expect(tuning.practiceMaxChance).toBeGreaterThan(0.0022);
    expect(injuryRiskWeight(player, 60, 1)).toBeGreaterThan(injuryRiskWeight(player, 60, 0.3) * 1.08);
  });

  it("creates deterministic football injuries with limited/out/career fields", () => {
    const save = createNewSave("chi", "goals", "medical-event-seed");
    const player = { ...playersForTeam(save, "chi")[0], medical: 35, makeup: { ...playersForTeam(save, "chi")[0].makeup, medical: 35 } };
    const first = buildMedicalEvent(save, player, createRng("medical-event-one"), { week: 4, source: "game", trainerQuality: 60, gameId: "game-1" });
    const second = buildMedicalEvent(save, player, createRng("medical-event-one"), { week: 4, source: "game", trainerQuality: 60, gameId: "game-1" });

    expect(first).toEqual(second);
    expect(["limited", "injured", "careerEnded"]).toContain(first.status);
    expect(first.name.length).toBeGreaterThan(3);
    expect(first.medical).toBe(35);
    expect(first.description).toContain(first.name);
  });

  it("ticks injured players through a limited return before full activity", () => {
    const save = createNewSave("chi", "goals", "medical-recovery-seed");
    const player = playersForTeam(save, "chi")[0];
    const injury: ActiveInjury = {
      id: "test-injury",
      typeId: "knee-sprain",
      name: "Knee sprain",
      severity: "moderate",
      status: "injured",
      weeksRemaining: 1,
      initialWeeks: 3,
      limitedWeeksRemaining: 2,
      ovrPenalty: 7,
      recurrenceTag: "knee",
      occurredWeek: 3,
      description: "Test knee sprain.",
      permanentOverallDelta: 0,
      permanentPotentialDelta: 0,
      careerEnding: false
    };
    const limited = tickMedicalRecovery({ ...player, status: "injured", injuryWeeks: 1, injury });
    const stillLimited = tickMedicalRecovery(limited);
    const active = tickMedicalRecovery(stillLimited);

    expect(limited.status).toBe("limited");
    expect(limited.injury?.ovrPenalty).toBe(7);
    expect(stillLimited.status).toBe("limited");
    expect(active.status).toBe("active");
    expect(active.injury).toBeUndefined();
  });

  it("applies permanent medical damage and records career-ending injuries as blocking inbox items", () => {
    const save = createNewSave("chi", "goals", "medical-career-ended-seed");
    const player = playersForTeam(save, "chi")[0];
    const majorEvent: MedicalEvent = {
      id: "major-damage-test",
      typeId: "acl-tear",
      name: "ACL tear",
      severity: "major",
      status: "injured",
      weeksRemaining: 8,
      initialWeeks: 8,
      limitedWeeksRemaining: 2,
      ovrPenalty: 10,
      recurrenceTag: "knee",
      occurredWeek: 4,
      description: `${player.firstName} ${player.lastName} suffered an ACL tear.`,
      permanentOverallDelta: -2,
      permanentPotentialDelta: -3,
      careerEnding: false,
      playerId: player.id,
      teamId: player.teamId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      medical: 36,
      source: "game",
      gameId: "medical-game"
    };
    const damaged = applyMedicalEvents(save, [majorEvent]);
    const damagedPlayer = damaged.players.find((candidate) => candidate.id === player.id)!;

    expect(damagedPlayer.overall).toBeLessThanOrEqual(player.overall);
    expect(damagedPlayer.potential).toBeLessThanOrEqual(player.potential);

    const event: MedicalEvent = {
      id: "career-ending-test",
      typeId: "neck-injury",
      name: "Neck injury",
      severity: "catastrophic",
      status: "careerEnded",
      weeksRemaining: 0,
      initialWeeks: 0,
      limitedWeeksRemaining: 0,
      ovrPenalty: 14,
      recurrenceTag: "neck",
      occurredWeek: 5,
      description: `${player.firstName} ${player.lastName} suffered a career-ending neck injury.`,
      permanentOverallDelta: -12,
      permanentPotentialDelta: -15,
      careerEnding: true,
      playerId: player.id,
      teamId: player.teamId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      medical: 24,
      source: "game",
      gameId: "medical-game"
    };
    const after = applyMedicalEvents(save, [event]);

    expect(after.players.some((candidate) => candidate.id === player.id)).toBe(false);
    expect(after.careerEndedRecords[0].playerId).toBe(player.id);
    expect(after.medicalHistory[0].careerEnding).toBe(true);
    expect(after.inbox.some((item) => item.blocking && item.important && item.category === "injury")).toBe(true);
  });

  it("manages injured reserve roster relief and return rules", () => {
    const save = createNewSave("chi", "goals", "ir-rules-seed");
    const player = playersForTeam(save, "chi").find((candidate) => candidate.position !== "K" && candidate.position !== "P")!;
    const injury: ActiveInjury = {
      id: "ir-test-injury",
      typeId: "knee-sprain",
      name: "Knee sprain",
      severity: "moderate",
      status: "injured",
      weeksRemaining: 6,
      initialWeeks: 6,
      limitedWeeksRemaining: 1,
      ovrPenalty: 7,
      recurrenceTag: "knee",
      occurredWeek: 1,
      description: "Test IR injury.",
      permanentOverallDelta: 0,
      permanentPotentialDelta: 0,
      careerEnding: false
    };
    const injuredSave: GameSave = {
      ...save,
      players: save.players.map((candidate) => (
        candidate.id === player.id
          ? { ...candidate, status: "injured" as const, injuryWeeks: 6, injury }
          : candidate
      ))
    };
    const beforeSalary = playersForTeam(injuredSave, "chi").reduce((sum, candidate) => sum + candidate.salary, 0);
    const placed = placePlayerOnIr(injuredSave, player.id, "chi");
    const irPlayer = placed.players.find((candidate) => candidate.id === player.id)!;

    expect(isOnIr(irPlayer)).toBe(true);
    expect(activeRosterSize(placed, "chi")).toBe(activeRosterSize(injuredSave, "chi") - 1);
    expect(playersForTeam(placed, "chi").reduce((sum, candidate) => sum + candidate.salary, 0)).toBeCloseTo(beforeSalary);
    expect(depthChart(placed, "chi")[player.position].some((candidate) => candidate.id === player.id)).toBe(false);
    expect(canDesignatePlayerToReturn(placed, player.id, "chi").ok).toBe(false);

    const cleared = {
      ...placed,
      currentWeek: placed.currentWeek + 4,
      players: placed.players.map((candidate) => (
        candidate.id === player.id
          ? { ...candidate, status: "active" as const, injuryWeeks: 0, injury: undefined }
          : candidate
      ))
    };
    const designated = designatePlayerToReturn(cleared, player.id, "chi");
    const designatedPlayer = designated.players.find((candidate) => candidate.id === player.id)!;

    expect(designated.irReturnUsage.chi).toBe(1);
    expect(designatedPlayer.irReturnCount).toBe(1);
    expect(designatedPlayer.irPracticeWindowDeadlineWeek).toBe(designated.currentWeek + 3);

    const activated = activatePlayerFromIr(designated, player.id, "chi");
    expect(isOnIr(activated.players.find((candidate) => candidate.id === player.id)!)).toBe(false);

    const returnLimitPlayer = {
      ...designatedPlayer,
      irReturnDesignatedWeek: undefined,
      irPracticeWindowDeadlineWeek: undefined,
      irReturnCount: IR_PLAYER_RETURN_LIMIT
    };
    const limitSave = {
      ...designated,
      irReturnUsage: { ...designated.irReturnUsage, chi: IR_TEAM_RETURN_LIMIT },
      players: designated.players.map((candidate) => candidate.id === player.id ? returnLimitPlayer : candidate)
    };
    expect(canDesignatePlayerToReturn(limitSave, player.id, "chi").ok).toBe(false);
  });

  it("lets CPU teams use IR for long injuries and activate cleared players", () => {
    const save = createNewSave("chi", "goals", "cpu-ir-seed");
    const cpuPlayer = playersForTeam(save, "dal").find((candidate) => candidate.position !== "K" && candidate.position !== "P")!;
    const injury: ActiveInjury = {
      id: "cpu-ir-test",
      typeId: "high-ankle",
      name: "High ankle sprain",
      severity: "moderate",
      status: "injured",
      weeksRemaining: 6,
      initialWeeks: 6,
      limitedWeeksRemaining: 1,
      ovrPenalty: 8,
      recurrenceTag: "lower-leg",
      occurredWeek: 1,
      description: "CPU IR injury.",
      permanentOverallDelta: 0,
      permanentPotentialDelta: 0,
      careerEnding: false
    };
    const injured = {
      ...save,
      players: save.players.map((player) => player.id === cpuPlayer.id ? { ...player, status: "injured" as const, injuryWeeks: 6, injury } : player)
    };
    const placed = autoManageCpuIr(injured);
    const placedPlayer = placed.players.find((player) => player.id === cpuPlayer.id)!;

    expect(isOnIr(placedPlayer)).toBe(true);

    const cleared = {
      ...placed,
      currentWeek: placedPlayer.irEligibleWeek ?? 5,
      players: placed.players.map((player) => player.id === cpuPlayer.id ? { ...player, status: "active" as const, injuryWeeks: 0, injury: undefined } : player)
    };
    const activated = autoManageCpuIr(cleared);
    expect(isOnIr(activated.players.find((player) => player.id === cpuPlayer.id)!)).toBe(false);
  });

  it("removes old durability and injury recovery ratings from active rating display", () => {
    expect(ratingRegistry.some((rating) => String(rating.key) === "durability" || String(rating.key) === "injuryRecovery")).toBe(false);
  });
});

describe("personnel and snap plans", () => {
  it("assigns starters and rotations by position instead of named roles", () => {
    const save = createNewSave("chi", "goals", "snap-role-seed");
    const plan = calculateSnapPlan(save, "chi");

    expect(starterCountsByPosition.RB).toBe(2);
    expect(starterCountsByPosition.WR).toBe(3);
    expect(starterCountsByPosition.CB).toBe(3);
    expect(plan.entries.filter((entry) => entry.position === "WR" && entry.starter && entry.player)).toHaveLength(3);
    expect(plan.entries.filter((entry) => entry.position === "CB" && entry.starter && entry.player)).toHaveLength(3);
    expect(plan.entries.find((entry) => entry.position === "QB" && entry.starter)?.snapShare).toBe(1);
    expect(plan.entries.find((entry) => entry.position === "LT" && entry.starter)?.snapShare).toBe(1);
    expect(plan.entries.every((entry) => entry.label === "Starter" || entry.label === "Rotation")).toBe(true);
  });

  it("splits close running backs and feeds a clear lead back when ratings separate", () => {
    const closeSave = createNewSave("buf", "goals", "close-rb-seed");
    const closeRbs = playersForTeam(closeSave, "buf").filter((player) => player.position === "RB").sort((a, b) => b.overall - a.overall);
    closeRbs[0].ratings = testRatings(82);
    closeRbs[0].overall = calculateOverallFromRatings("RB", closeRbs[0].ratings);
    closeRbs[0].positionFits = onlyPositionFit("RB");
    closeRbs[1].ratings = testRatings(81);
    closeRbs[1].overall = calculateOverallFromRatings("RB", closeRbs[1].ratings);
    closeRbs[1].positionFits = onlyPositionFit("RB");
    const closePlan = calculateSnapPlan(closeSave, "buf");
    const closeEntries = closePlan.entries.filter((entry) => entry.position === "RB" && entry.player);

    expect(closeEntries[0].snapShare).toBeCloseTo(0.58);
    expect(closeEntries[1].snapShare).toBeCloseTo(0.46);

    const gapSave = createNewSave("buf", "goals", "gap-rb-seed");
    const gapRbs = playersForTeam(gapSave, "buf").filter((player) => player.position === "RB").sort((a, b) => b.overall - a.overall);
    gapRbs[0].ratings = testRatings(88);
    gapRbs[0].overall = calculateOverallFromRatings("RB", gapRbs[0].ratings);
    gapRbs[0].positionFits = onlyPositionFit("RB");
    gapRbs[1].ratings = testRatings(70);
    gapRbs[1].overall = calculateOverallFromRatings("RB", gapRbs[1].ratings);
    gapRbs[1].positionFits = onlyPositionFit("RB");
    const gapPlan = calculateSnapPlan(gapSave, "buf");
    const gapEntries = gapPlan.entries.filter((entry) => entry.position === "RB" && entry.player);

    expect(gapEntries[0].snapShare).toBeCloseTo(0.76);
    expect(gapEntries[1].snapShare).toBeCloseTo(0.24);
  }, 30000);

  it("honors depth order overrides and promotes healthy players over injured starters", () => {
    const save = createNewSave("chi", "goals", "depth-order-seed");
    const rbs = playersForTeam(save, "chi").filter((player) => player.position === "RB").sort((a, b) => b.overall - a.overall);
    const overridden = {
      ...save,
      depthOverrides: {
        ...save.depthOverrides,
        chi: {
          ...(save.depthOverrides.chi ?? {}),
          RB: [rbs[1].id, rbs[0].id, ...rbs.slice(2).map((player) => player.id)]
        }
      }
    };
    const overrideEntries = calculateSnapPlan(overridden, "chi").entries.filter((entry) => entry.position === "RB" && entry.player);

    expect(overrideEntries[0].playerId).toBe(rbs[1].id);

    const injured = {
      ...save,
      players: save.players.map((player) => (player.id === rbs[0].id ? { ...player, status: "injured" as const, injuryWeeks: 2 } : player))
    };
    const injuredEntries = calculateSnapPlan(injured, "chi").entries.filter((entry) => entry.position === "RB" && entry.player);

    expect(injuredEntries.some((entry) => entry.playerId === rbs[0].id)).toBe(false);
    expect(injuredEntries[0].playerId).toBe(rbs[1].id);
  });

  it("uses eligible alternates in depth charts while assigning each player to one active snap position", () => {
    const base = createNewSave("chi", "goals", "multi-position-depth-seed");
    const centers = playersForTeam(base, "chi").filter((player) => player.position === "C");
    const save = {
      ...base,
      players: base.players.map((player) => {
        if (centers.some((center) => center.id === player.id)) return { ...player, status: "injured" as const, injuryWeeks: 3 };
        return player;
      })
    };
    const centerDepth = depthChart(save, "chi").C;
    const plan = calculateSnapPlan(save, "chi");
    const activeEntriesByPlayer = Object.values(plan.byPlayer);

    expect(centerDepth.some((player) => player.position !== "C")).toBe(true);
    expect(plan.entries.some((entry) => entry.position === "C" && entry.player && entry.primaryPosition !== "C")).toBe(true);
    expect(activeEntriesByPlayer.every((entries) => entries.length <= 1)).toBe(true);
  });

  it("keeps unavailable players visible at the bottom of display depth while excluding them from snaps", () => {
    const base = createNewSave("chi", "goals", "display-depth-status-seed");
    const wrs = playersForTeam(base, "chi").filter((player) => player.position === "WR").slice(0, 4);
    const save = {
      ...base,
      players: base.players.map((player) => {
        if (player.id === wrs[0].id) return { ...player, status: "injured" as const, injuryWeeks: 3 };
        if (player.id === wrs[1].id) return { ...player, status: "suspended" as const, suspensionWeeks: 2 };
        if (player.id === wrs[2].id) return { ...player, status: "limited" as const };
        return player;
      })
    };
    const chart = buildDisplayDepthChart(save, "chi").WR;
    const plan = calculateSnapPlan(save, "chi");

    expect(chart.some((player) => player.id === wrs[0].id)).toBe(true);
    expect(chart.some((player) => player.id === wrs[1].id)).toBe(true);
    expect(chart.findIndex((player) => player.id === wrs[0].id)).toBeGreaterThan(chart.findIndex((player) => player.id === wrs[2].id));
    expect(chart.findIndex((player) => player.id === wrs[1].id)).toBeGreaterThan(chart.findIndex((player) => player.id === wrs[2].id));
    expect(plan.byPlayer[wrs[0].id]).toBeUndefined();
    expect(plan.byPlayer[wrs[1].id]).toBeUndefined();
  });

  it("penalizes limited players and prevents duplicate active formation cards", () => {
    const base = createNewSave("chi", "goals", "depth-formation-unique-seed");
    const player = playersForTeam(base, "chi").find((candidate) => candidate.position === "WR")!;
    const limitedPlayer = { ...player, status: "limited" as const };
    const save = {
      ...base,
      players: base.players.map((candidate) => (candidate.id === player.id ? limitedPlayer : candidate))
    };
    const chart = buildDisplayDepthChart(save, "chi");
    const plan = calculateSnapPlan(save, "chi");
    const assignments = buildFormationAssignments(chart, plan, offenseFormations[0].slots, { showRotation: true, showFullDepth: false });
    const mainIds = assignments.map((assignment) => assignment.main?.id).filter((id): id is string => Boolean(id));

    expect(displayEffectiveOverall(limitedPlayer, "WR")).toBe(displayEffectiveOverall({ ...limitedPlayer, status: "active" }, "WR") - 6);
    expect(new Set(mainIds).size).toBe(mainIds.length);
  });
});

describe("trade values", () => {
  it("evaluates players and packages with need-aware values", () => {
    const save = createNewSave("nyj", "goals", "trade-seed");
    const player = playersForTeam(save, "nyj").sort((a, b) => b.overall - a.overall)[0];
    const pick = save.draftPicks.find((draftPick) => draftPick.currentTeamId === "nyj" && draftPick.round === 1);

    expect(playerTradeValue(save, player)).toBeGreaterThan(100);
    expect(packageValue(save, "chi", [player], pick ? [pick] : [])).toBeGreaterThan(playerTradeValue(save, player));
    expect(["accept", "counter", "decline"]).toContain(tradeVerdict(100, 100));
  });

  it("adds only a small value bonus for useful versatility", () => {
    const save = createNewSave("chi", "goals", "versatility-trade-seed");
    const guard = playersForTeam(save, "chi").find((player) => player.position === "RG")!;
    const versatile = { ...guard, positionFits: { ...guard.positionFits, LG: 94, C: 90, RT: 76 } };

    expect(versatilityBonus(versatile)).toBeGreaterThan(0);
    expect(versatilityBonus(versatile)).toBeLessThanOrEqual(5);
    expect(playerTradeValue({ ...save, players: save.players.map((player) => (player.id === guard.id ? versatile : player)) }, versatile)).toBeGreaterThan(0);
  });
});

describe("IndexedDB-style save repository", () => {
  it("creates, lists, loads, renames, deletes, and tracks an active career", async () => {
    const repo = createSaveRepository(createMemorySaveDriver(), window.localStorage);
    const save = createNewSave("chi", "goals", "slot-seed");
    const record = await repo.createCareer(save, "My Bears Build");

    expect((await repo.listCareers()).map((slot) => slot.name)).toEqual(["My Bears Build"]);
    expect((await repo.loadActiveCareer())?.id).toBe(record.id);
    expect((await repo.loadCareer(record.id))?.save.selectedTeamId).toBe("chi");

    const renamed = await repo.renameCareer(record.id, "Chicago Test");
    expect(renamed?.name).toBe("Chicago Test");

    await repo.deleteCareer(record.id);
    expect(await repo.listCareers()).toHaveLength(0);
    expect(await repo.loadActiveCareer()).toBeUndefined();
  });

  it("preserves full league logs and snap charts in primary career saves", async () => {
    const repo = createSaveRepository(createMemorySaveDriver(), window.localStorage);
    const save = advanceWeek(createNewSave("chi", "goals", "full-log-seed"));
    const record = await repo.createCareer(save, "Full Logs");
    const loaded = await repo.loadCareer(record.id);
    const neutralGame = loaded?.save.schedule.find(
      (game) => game.status === "final" && game.homeTeamId !== "chi" && game.awayTeamId !== "chi"
    );

    expect(neutralGame?.log.length).toBeGreaterThan(20);
    expect(Object.keys(neutralGame?.snapCounts ?? {}).length).toBeGreaterThan(20);
  }, 30000);

  it("keeps only five rotating backups per career", async () => {
    const driver = createMemorySaveDriver();
    const repo = createSaveRepository(driver, window.localStorage);
    const save = createNewSave("nyj", "goals", "backup-seed");
    const record = await repo.createCareer(save, "Backup Test");

    for (let index = 0; index < 7; index += 1) {
      await repo.createBackup(record.id, { ...save, currentWeek: index + 1 });
    }

    expect(await driver.listBackups(record.id)).toHaveLength(5);
  }, 30000);

  it("prunes backups and retries when a quota error blocks a career save", async () => {
    const driver = createMemorySaveDriver();
    const repo = createSaveRepository(driver, window.localStorage);
    const save = createNewSave("dal", "goals", "quota-retry-seed");
    const record = await repo.createCareer(save, "Quota Test");
    for (let index = 0; index < 5; index += 1) {
      await repo.createBackup(record.id, { ...save, currentWeek: index + 1 });
    }

    const originalPutCareer = driver.putCareer.bind(driver);
    let shouldFail = true;
    driver.putCareer = async (career) => {
      if (shouldFail) {
        shouldFail = false;
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return originalPutCareer(career);
    };

    const result = await repo.saveCareer(record.id, { ...save, currentWeek: 4 });

    expect(result.ok).toBe(true);
    expect(result.prunedBackups).toBeGreaterThan(0);
    expect((await repo.loadCareer(record.id))?.save.currentWeek).toBe(4);
  }, 30000);

  it("migrates an old localStorage save and removes the old blob after success", async () => {
    const repo = createSaveRepository(createMemorySaveDriver(), window.localStorage);
    const save = createNewSave("phi", "sandbox", "legacy-migrate-seed");
    const compact = {
      ...save,
      players: save.players.slice(0, 12),
      prospects: save.prospects.slice(0, 12),
      schedule: save.schedule.slice(0, 4),
      staff: save.staff.slice(0, 16),
      inbox: save.inbox.slice(0, 4)
    };
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(compact));

    const result = await repo.migrateLegacyLocalSave((legacy) => legacy);

    expect(result.migrated).toBe(true);
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect((await repo.listCareers())[0].selectedTeamId).toBe("phi");
  });

  it("leaves an old localStorage save in place if migration fails", async () => {
    const repo = createSaveRepository(createMemorySaveDriver({ failCareerPuts: 1 }), window.localStorage);
    const save = createNewSave("phi", "sandbox", "legacy-fail-seed");
    const compact = {
      ...save,
      players: save.players.slice(0, 12),
      prospects: save.prospects.slice(0, 12),
      schedule: save.schedule.slice(0, 4),
      staff: save.staff.slice(0, 16),
      inbox: save.inbox.slice(0, 4)
    };
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(compact));

    const result = await repo.migrateLegacyLocalSave((legacy) => legacy);

    expect(result.migrated).toBe(false);
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeTruthy();
    expect(await repo.listCareers()).toHaveLength(0);
  });

});
