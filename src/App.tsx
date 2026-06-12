import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { collegeImageFor } from "./data/collegeImages";
import { collegePrograms } from "./data/collegePrograms";
import { nflTeams } from "./data/nflTeams";
import { careerScenarioLabels, createNewSave, generateFreeAgentPool } from "./sim/generate";
import { createInitialCollegeRosterState } from "./sim/collegeRoster";
import { generateCollegeSeasonResults } from "./sim/collegeSeasonResults";
import { generateCollegeMoraleState } from "./sim/collegeMorale";
import { generateCollegeTrainingBanks } from "./sim/collegeTraining";
import { generateDraftEvaluationState } from "./sim/draftEvaluation";
import { generateAnnualRecruitClass } from "./sim/annualRecruitClass";
import { normalizeAnnualRecruitingState, updateRecruitingPitch, updateRecruitingScoutAssignment } from "./sim/annualRecruiting";
import { buildSchoolProfileState } from "./sim/schoolProfiles";
import { loadYearZeroProgressTemplate } from "./sim/yearZero/yearZeroBootstrap";
import { buildYearZeroDebugExport } from "./sim/yearZero/yearZeroDebug";
import {
  acceptDraftTradeOffer,
  acceptDraftTradeCounterOffer,
  advanceDraftEvent,
  applyDraftTradeOffer,
  buildTradeOfferForPick,
  clearDraftEvent,
  completedDraftTrades,
  currentDraftPick,
  declineDraftTradeOffer,
  draftRoomNeeds,
  enterDraft,
  ensureDraftState,
  makeDraftSelection,
  runRookieOnboarding,
  setDraftSpeed,
  simCurrentDraftRound,
  simDraftToNextUserPick,
  simRestOfDraft
} from "./sim/draft";
import {
  activeUdfaOfferForProspect,
  beginRookieOnboarding,
  ensureUdfaState,
  finalizeUdfaClass,
  getCurrentAiUdfaWaveOffers,
  latestRookieResults,
  placeUdfaOffer,
  resolveNextUdfaWave,
  rivalUdfaOffers,
  rookieClassScoreRows,
  simRemainingUdfaWaves,
  udfaInboundInterest,
  udfaOpportunityForTeam,
  udfaTargetSuggestions,
  undraftedProspects,
  withdrawUdfaOffer
} from "./sim/udfa";
import { advanceDay, advancePostseasonRound, startNextSeason } from "./sim/season";
import { addDays, calendarPhaseForDate, formatDateLong, leagueYearStartDate, nextDateWithGames, parseDate, refreshCalendar } from "./sim/calendar";
import {
  advanceToDraftPrep,
  advanceToFreeAgency,
  applyTagOrTender,
  canApplyTagOrTender,
  canExerciseFifthYearOption,
  canExtendPlayerContract,
  capSavingsIfMoved,
  contractTotalValue,
  deadMoneyIfMoved,
  exerciseFifthYearOption,
  extendPlayerContract,
  playerCapHit,
  normalizeCapState,
  recalculateBudgets,
  remainingContractYears,
  restructurePlayerContract,
  suggestedApy,
  teamCapLedger
} from "./sim/cap";
import { concernSignalForRange, normalizePlayerMakeup, normalizeProspectMakeup } from "./sim/concerns";
import {
  ensureScoutingPlan,
  applyScoutingProjection,
  assignmentTypes,
  compareProspectsForLens,
  ensureProspectConcerns,
  rankProspectBoard,
  scoutingRecapImpact,
  optimizeWeeklyScoutingPlan,
  quickFocusProspect,
  scoutingAssignmentPreview,
  scoutingFocusOptions,
  scoutingRegions,
  updateProspectBoard,
  updateScoutingAssignment,
  updateScoutingAssignmentLock
} from "./sim/scouting";
import {
  payroll,
  playoffSeeds,
  playersForTeam,
  powerRankByTeam,
  powerRankings,
  positionPowerGrade,
  rankedTeams,
  rosterNeeds,
  scoutingQuality,
  selectedTeam,
  staffForTeam,
  teamById,
  teamOverall,
  teamSchedule,
  teamStreak,
  unitGrade,
  weekGames
} from "./sim/selectors";
import { calculateSnapPlan, starterCountsByPosition } from "./sim/personnel";
import {
  canReleasePlayer,
  FREE_AGENT_TEAM_ID,
  freeAgentPlayers,
  MAX_ROSTER_SIZE,
  releasePlayerToFreeAgency,
  rosterLimit,
  rosterSize
} from "./sim/freeAgents";
import {
  expectedFreeAgentAsk,
  expectedFreeAgentYears,
  freeAgentInterestScore,
  likelyFreeAgentCompetitors,
  normalizeFreeAgencyMarket,
  projectedCapHitForOffer,
  projectedPendingFreeAgents,
  resolveFreeAgencyWave,
  roleForTeamNeed,
  submitFreeAgentOffer
} from "./sim/freeAgentMarket";
import { applyRosterMoveRecommendations, buildRosterMoveRecommendations, hasBlockingRosterIssues } from "./sim/rosterAi";
import {
  canElevatePracticeSquadPlayer,
  canPromotePracticeSquadPlayer,
  canProtectPracticeSquadPlayer,
  canSignFreeAgentToPracticeSquad,
  elevatePracticeSquadPlayer,
  isPracticeSquadPlayer,
  normalizePracticeSquadState,
  PRACTICE_SQUAD_SIZE,
  practiceSquadPlayers,
  practiceSquadSize,
  promotePracticeSquadPlayer,
  protectPracticeSquadPlayer,
  releasePracticeSquadPlayer,
  signFreeAgentToPracticeSquad
} from "./sim/practiceSquad";
import {
  activatePlayerFromIr,
  canActivatePlayerFromIr,
  canDesignatePlayerToReturn,
  canPlacePlayerOnIr,
  designatePlayerToReturn,
  IR_TEAM_RETURN_LIMIT,
  irPlayersForTeam,
  isOnIr,
  normalizeIrState,
  placePlayerOnIr
} from "./sim/ir";
import { effectiveOverallAtPosition, eligiblePositionsFor, isPrimaryPosition, normalizePositionFits, positionFitFor, skillOverallAtPosition } from "./sim/positionEligibility";
import { developmentPlanForTraining, developmentPlanLabels, normalizePlayerModel, normalizeProspectModel, updatePlayerTrainingSettings } from "./sim/playerModel";
import { medicalRiskTier, medicalStatusLabel, normalizePlayerMedical, playerMedical } from "./sim/medical";
import { submitWaiverClaim } from "./sim/waivers";
import {
  adjustedNetYardsPerAttempt,
  adjustedYardsPerAttempt,
  approximateValue,
  formatRate,
  formatStatNumber,
  mergePlayerStats,
  mergeTeamGameStats,
  netYardsPerAttempt,
  normalizePlayerStats,
  normalizeTeamGameStats,
  passerRating,
  passingEfficiency,
  playerPrimaryStatCategory,
  qbRecord,
  qbrApprox,
  rate,
  successRate,
  totalPlayerStats
} from "./sim/stats";
import {
  applyAcceptedTrade,
  createTradeOffer,
  evaluateTradeOffer,
  normalizeTradeState,
  refreshTradeActivity,
  submitTradeOffer,
  toggleUserTradeBlock
} from "./sim/trade";
import { buildPostseasonSeeds, currentPostseasonRound, postseasonRoundLabel } from "./sim/postseason";
import {
  buildDisplayDepthChart,
  buildFormationAssignments,
  defenseFormations,
  displayEffectiveOverall,
  fitToneForPlayer,
  isEmergencyAtDisplayPosition,
  isPlayableDepthStatus,
  offenseFormations,
  specialTeamsFormation,
  unitPositions,
  type DefenseFormationId,
  type DepthUnit,
  type FormationAssignment,
  type FormationPreset,
  type OffenseFormationId,
  type PositionFitTone
} from "./sim/depthDisplay";
import {
  positionRatingImportance,
  ratingRangeLabel,
  ratingTierFor,
  ratingTierLabel,
  ratingValue,
  ratingsByGroup,
  refreshPlayerRatings,
  refreshProspectRatings,
  type RatingKey
} from "./sim/ratings";
import { normalizeScoutingRegion } from "./sim/regions";
import { ensureDevelopmentProfile } from "./sim/development";
import {
  createCareer,
  deleteCareer,
  downloadSave,
  listCareers,
  loadActiveCareer,
  loadCareer,
  migrateLegacyLocalSave,
  parseSave,
  renameCareer,
  saveCareer,
  setActiveCareer,
  type CareerSlot
} from "./sim/save";
import {
  colorTierForStaff,
  ensureStaffMarket,
  hireStaffCandidate,
  interviewStaffCandidate,
  normalizeStaffForTeams,
  scoutSpecialtyTags,
  staffOverall,
  staffPayroll,
  staffValueScore,
  slotDefinitionFor
} from "./sim/staff";
import type { AnnualRecruit, AnnualRecruitEvaluation, AnnualRecruitingBoardEntry, CareerScenario, CareerType, CollegeDevelopmentFocus, CollegeFatiguePosture, CollegeProgram, CollegeRosterPlayer, Conference, DevelopmentPlan, DraftPick, DraftTradeAsset, DraftTradeOffer, FreeAgentOffer, FreeAgentRolePromise, FreeAgentSecurityLevel, GameSave, Player, PlayerStats, Position, Prospect, ProspectBoardLens, ProspectConcernKey, RookieAcquisitionResult, RookieClassResults, RosterMoveRecommendation, SaveMode, ScoutingAssignment, ScoutingAssignmentType, ScoutingRecapEntry, ScoutingRegion, StaffCandidate, StaffMember, StaffSlotId, TeamGameStats, TradeAsset, TradeEvaluation, TradeHistoryEntry, TradeNewsItem, TradeOffer, TrainingBodyPlan, TrainingSkillPlan, UdfaOffer } from "./types";
import { POSITIONS } from "./types";

type Tab =
  | "roster"
  | "training"
  | "free-agents"
  | "trading"
  | "depth"
  | "medical"
  | "staff"
  | "scouting"
  | "comp-picks"
  | "calendar"
  | "schedule"
  | "standings"
  | "power"
  | "game"
  | "budget"
  | "draft"
  | "stats"
  | "college-hub"
  | "college-recruiting"
  | "college-roster"
  | "college-depth"
  | "college-training"
  | "college-nil"
  | "college-transfer"
  | "college-season"
  | "college-draft"
  | "college-jobs";
type SaveStatus = "Saved" | "Saving" | "Unsaved" | "Save failed";
type SchoolPrestigeBand = "all" | "elite" | "strong" | "solid" | "builder";

const schoolPrestigeBandLabels: Record<SchoolPrestigeBand, string> = {
  all: "All Prestige",
  elite: "Elite 85+",
  strong: "Strong 75-84",
  solid: "Solid 65-74",
  builder: "Builder <65"
};

function matchesSchoolPrestigeBand(prestige: number, band: SchoolPrestigeBand) {
  if (band === "elite") return prestige >= 85;
  if (band === "strong") return prestige >= 75 && prestige < 85;
  if (band === "solid") return prestige >= 65 && prestige < 75;
  if (band === "builder") return prestige < 65;
  return true;
}

const nflNavGroups: Array<{ label: string; tabs: Array<{ id: Tab; label: string }> }> = [
  {
    label: "Team",
    tabs: [
      { id: "roster", label: "Roster" },
      { id: "training", label: "Development" },
      { id: "free-agents", label: "Free Agents" },
      { id: "medical", label: "Medical" }
    ]
  },
  {
    label: "Football Ops",
    tabs: [
      { id: "depth", label: "Depth Chart" },
      { id: "trading", label: "Trading" },
      { id: "staff", label: "Staff" },
      { id: "budget", label: "Budget" }
    ]
  },
  {
    label: "Scouting & Draft",
    tabs: [
      { id: "scouting", label: "Scouting" },
      { id: "comp-picks", label: "Comp Picks" },
      { id: "calendar", label: "Calendar" },
      { id: "draft", label: "Draft" }
    ]
  },
  {
    label: "League",
    tabs: [
      { id: "schedule", label: "Schedule" },
      { id: "standings", label: "Standings" },
      { id: "power", label: "Power Rankings" },
      { id: "game", label: "Game Log" },
      { id: "stats", label: "Stats" }
    ]
  }
];

const collegeNavGroups: Array<{ label: string; tabs: Array<{ id: Tab; label: string }> }> = [
  {
    label: "Program",
    tabs: [
      { id: "college-hub", label: "College Hub" },
      { id: "college-roster", label: "Roster" },
      { id: "college-depth", label: "Depth" },
      { id: "college-training", label: "Development" },
      { id: "college-nil", label: "NIL" }
    ]
  },
  {
    label: "Talent",
    tabs: [
      { id: "college-recruiting", label: "Recruiting" },
      { id: "college-transfer", label: "Transfer Portal" },
      { id: "college-draft", label: "Draft Pipeline" }
    ]
  },
  {
    label: "World",
    tabs: [
      { id: "college-season", label: "Season" },
      { id: "college-jobs", label: "Jobs" },
      { id: "calendar", label: "Calendar" },
      { id: "schedule", label: "NFL Schedule" },
      { id: "stats", label: "NFL Stats" }
    ]
  }
];

const scenarioCards: Array<{ id: CareerScenario; description: string }> = [
  { id: "worst", description: "Rebuild from the bottom." },
  { id: "neutral", description: "Balanced starting point." },
  { id: "contender", description: "Win-now pressure." },
  { id: "random", description: "Unknown roster quality for your selected team." }
];

function randomCareerSeed(): string {
  return `career-${Math.random().toString(36).slice(2, 7)}-${Date.now().toString(36)}`;
}

function managementStateForSchools(schools: CollegeProgram[]): NonNullable<GameSave["collegeManagement"]> {
  return {
    recruitingPriorities: {},
    hiddenRecruitIds: [],
    depthOverrides: Object.fromEntries(schools.map((school) => [school.id, {}])),
    trainingFocus: Object.fromEntries(schools.map((school) => [school.id, "balanced"])),
    fatiguePosture: Object.fromEntries(schools.map((school) => [school.id, "standard"])),
    nilAllocationByPosition: Object.fromEntries(schools.map((school) => [school.id, {}])),
    transferWatchlist: [],
    jobMarketOpen: false
  };
}

function schoolForSave(save: GameSave): CollegeProgram | undefined {
  return save.schools.find((school) => school.id === save.selectedSchoolId);
}

function managedSchoolId(save: GameSave): string {
  return save.selectedSchoolId ?? save.schools[0]?.id ?? "";
}

function isCollegeCareer(save: GameSave): boolean {
  return save.careerType === "college";
}

function projectedOverallForPosition(entity: Pick<Player | Prospect, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }, position: Position): number {
  return skillOverallAtPosition(entity, position);
}

function matchesPositionLens(entity: Pick<Player | Prospect, "position" | "ratings" | "traits"> & { positionFits?: Partial<Record<Position, number>> }, position: Position | "all"): boolean {
  if (position === "all") return true;
  if (entity.position === position) return true;
  return positionFitFor(entity, position) >= 54 && projectedOverallForPosition(entity, position) >= 48;
}

function compareProspectsForPositionLens(a: Prospect, b: Prospect, position: Position, lens: ProspectBoardLens): number {
  const overallGap = projectedOverallForPosition(b, position) - projectedOverallForPosition(a, position);
  if (overallGap !== 0) return overallGap;
  const fitGap = positionFitFor(b, position) - positionFitFor(a, position);
  if (fitGap !== 0) return fitGap;
  const potentialGap = b.potential - a.potential;
  if (potentialGap !== 0) return potentialGap;
  return compareProspectsForLens(a, b, lens);
}

export function normalizeSave(save: GameSave): GameSave {
  const { roleOverrides: _legacyRoleOverrides, ...saveWithoutLegacyRoles } = save as GameSave & { roleOverrides?: unknown };
  const seasonYear = save.seasonYear ?? ((save.draftState?.draftYear ?? 2027) - 1);
  const shouldClearDraftPendingEvent = ["contract-decisions", "free-agency", "udfa", "rookie-results", "rookie-onboarding", "offseason-complete"].includes(save.phase);
  const normalizedDraftState = save.draftState
    ? {
      ...save.draftState,
      pendingEvent: shouldClearDraftPendingEvent ? undefined : save.draftState.pendingEvent
    }
    : {
      draftYear: 2027,
      order: [],
      currentPickIndex: 0,
      history: [],
      tradeOffers: [],
      tradeLog: [],
      eventLog: [],
      clockSeconds: 60,
      pickTimeLimit: 60,
      simSpeed: 1 as const,
      skipCpuTradeNotifications: false,
      completed: false
    };
  const normalizedSchools = save.schools.map((school) => ({
    ...school,
    ...collegeImageFor(school)
  }));
  const careerType = save.careerType ?? "nfl";
  const selectedSchoolId = careerType === "college" ? save.selectedSchoolId ?? normalizedSchools[0]?.id : save.selectedSchoolId;
  const selectedSchool = normalizedSchools.find((school) => school.id === selectedSchoolId) ?? normalizedSchools[0];
  const schoolById = new Map(normalizedSchools.map((school) => [school.id, school]));
  const normalizedCollegeRoster = save.collegeRoster ?? (save.yearZero ? createInitialCollegeRosterState(save.yearZero, seasonYear) : undefined);
  const normalizedCollegeSeasonResults = save.collegeSeasonResults ?? generateCollegeSeasonResults(save.seed, normalizedCollegeRoster, seasonYear);
  const normalizedAnnualRecruitClass = save.annualRecruitClass ?? generateAnnualRecruitClass(save.seed, seasonYear);
  const normalizedAnnualRecruiting = normalizeAnnualRecruitingState(
    save.annualRecruiting,
    save.seed,
    seasonYear,
    normalizedSchools,
    normalizedAnnualRecruitClass.recruits,
    save.currentWeek ?? 1
  );
  const rawPlayers = save.players ?? [];
  const playersToNormalize = rawPlayers.some((player) => player.teamId === FREE_AGENT_TEAM_ID)
    ? rawPlayers
    : [...rawPlayers, ...generateFreeAgentPool(save.teams, normalizedSchools, save.seed)];

  const normalized: GameSave = {
    ...saveWithoutLegacyRoles,
    seasonYear,
    currentDate: save.currentDate ?? leagueYearStartDate(seasonYear),
    leagueYearStartDate: save.leagueYearStartDate ?? leagueYearStartDate(seasonYear),
    calendarPhase: save.calendarPhase ?? "league-year",
    seasonCalendar: save.seasonCalendar ?? [],
    schoolProfiles: save.schoolProfiles ?? buildSchoolProfileState(normalizedSchools, save.seed, seasonYear),
    careerType,
    selectedSchoolId,
    careerEmployment: save.careerEmployment ?? {
      level: careerType,
      organizationId: careerType === "college" ? selectedSchool?.id ?? "college" : save.selectedTeamId,
      contractStartSeason: seasonYear,
      contractEndSeason: seasonYear + 3,
      status: "active",
      history: [{
        level: careerType,
        organizationId: careerType === "college" ? selectedSchool?.id ?? "college" : save.selectedTeamId,
        startSeason: seasonYear,
        status: "active",
        summary: careerType === "college" ? `Hired by ${selectedSchool?.name ?? "college program"}.` : "Hired by franchise."
      }]
    },
    collegeManagement: {
      ...managementStateForSchools(normalizedSchools),
      ...(save.collegeManagement ?? {}),
      depthOverrides: {
        ...managementStateForSchools(normalizedSchools).depthOverrides,
        ...(save.collegeManagement?.depthOverrides ?? {})
      },
      trainingFocus: {
        ...managementStateForSchools(normalizedSchools).trainingFocus,
        ...(save.collegeManagement?.trainingFocus ?? {})
      },
      fatiguePosture: {
        ...managementStateForSchools(normalizedSchools).fatiguePosture,
        ...(save.collegeManagement?.fatiguePosture ?? {})
      },
      nilAllocationByPosition: {
        ...managementStateForSchools(normalizedSchools).nilAllocationByPosition,
        ...(save.collegeManagement?.nilAllocationByPosition ?? {})
      }
    },
    annualRecruitClass: normalizedAnnualRecruitClass,
    annualRecruiting: normalizedAnnualRecruiting,
    collegeRoster: normalizedCollegeRoster,
    collegeTraining: save.collegeTraining ?? generateCollegeTrainingBanks(save.seed, seasonYear, normalizedCollegeRoster, normalizedCollegeSeasonResults, save.collegeManagement),
    collegeSeasonResults: normalizedCollegeSeasonResults,
    collegeMorale: save.collegeMorale ?? generateCollegeMoraleState(save.seed, seasonYear, normalizedCollegeRoster, normalizedCollegeSeasonResults, normalizedAnnualRecruiting, save.collegeTraining, save.collegeManagement),
    draftEvaluation: save.draftEvaluation ?? generateDraftEvaluationState(save.seed, normalizedDraftState.draftYear, save.prospects ?? [], save.currentWeek ?? 1, save.schools),
    previousSeasonRanks: save.previousSeasonRanks,
    scenario: save.scenario ?? "neutral",
    players: playersToNormalize.map((player) => {
      const refreshed = normalizePlayerModel(refreshPlayerRatings(player, save.seed), save.seed);
      const makeup = normalizePlayerMakeup(refreshed, save.seed);
      return {
        ...normalizePracticeSquadState(normalizeIrState(normalizePlayerMedical({
          ...refreshed,
          teamStartSeason: refreshed.teamStartSeason ?? seasonYear,
          draftYear: refreshed.draftYear ?? seasonYear - Math.max(0, refreshed.age - 21),
          medical: refreshed.medical ?? makeup.medical,
          makeup,
          positionFits: normalizePositionFits(refreshed),
          potential: Math.max(refreshed.overall, refreshed.potential ?? refreshed.overall),
          development: ensureDevelopmentProfile(refreshed.development, `${save.seed}:${refreshed.id}`, refreshed.age, ratingValue(refreshed.ratings, "workEthic")),
          suspensionWeeks: refreshed.suspensionWeeks ?? 0,
          stats: normalizePlayerStats(player.stats),
          playoffStats: normalizePlayerStats(player.playoffStats),
          statHistory: (player.statHistory ?? []).map((entry) => ({
            ...entry,
            stats: normalizePlayerStats(entry.stats),
            playoffStats: normalizePlayerStats(entry.playoffStats),
            awards: entry.awards ?? []
          }))
        }), seasonYear), seasonYear),
      };
    }),
    schools: normalizedSchools,
    staff: normalizeStaffForTeams(save.staff ?? [], save.teams, save.seed, normalizedSchools),
    prospects: save.prospects.map((prospect) => {
      const refreshed = normalizeProspectModel(normalizeProspectMakeup(refreshProspectRatings(prospect, save.seed), save.seed), save.seed);
      const progress = refreshed.scouted.progress ?? refreshed.scouted.confidence ?? 35;
      const riskFlags = refreshed.riskFlags ?? [];
      const baseProspect = {
        ...refreshed,
        positionFits: normalizePositionFits(refreshed),
        development: ensureDevelopmentProfile(refreshed.development, `${save.seed}:${refreshed.id}`, refreshed.age, ratingValue(refreshed.ratings, "workEthic")),
        region: normalizeScoutingRegion(refreshed.region, schoolById.get(refreshed.schoolId)),
        stock: refreshed.stock ?? 0,
        riskFlags,
        medical: refreshed.medical ?? 72,
        character: refreshed.character ?? ratingValue(refreshed.ratings, "discipline"),
        workEthic: refreshed.workEthic ?? refreshed.potential,
        concernProfileVersion: refreshed.concernProfileVersion,
        consensusRank: refreshed.consensusRank ?? 999,
        consensusGrade: refreshed.consensusGrade ?? 0,
        consensusProgress: refreshed.consensusProgress ?? Math.round(Math.max(15, Math.min(82, progress + 12))),
        teamRank: refreshed.teamRank ?? 999,
        teamGrade: refreshed.teamGrade ?? 0,
        valuePickScore: refreshed.valuePickScore ?? 0,
        valuePickLabel: refreshed.valuePickLabel ?? "Fair",
        concernVisibility: refreshed.concernVisibility ?? {
          medical: (refreshed.medical ?? 60) < 36 || riskFlags.includes("Medical"),
          character: (refreshed.character ?? 60) < 36 || riskFlags.includes("Character"),
          workEthic: (refreshed.workEthic ?? 60) < 36
        },
        concernDetails: refreshed.concernDetails ?? {},
        schemeFit: refreshed.schemeFit ?? "multiple",
        productionTrend: refreshed.productionTrend ?? 0,
        favorite: refreshed.favorite ?? false,
        hidden: refreshed.hidden ?? false,
        scoutReports: refreshed.scoutReports ?? [refreshed.scouted.note],
        scouted: {
          ...refreshed.scouted,
          progress,
          confidence: progress,
          concerns: refreshed.scouted.concerns ?? {
            medical: [refreshed.medical ?? 60, refreshed.medical ?? 60],
            character: [refreshed.character ?? 60, refreshed.character ?? 60],
            workEthic: [refreshed.workEthic ?? 60, refreshed.workEthic ?? 60]
          }
        }
      };
      return applyScoutingProjection({ ...baseProspect, ...ensureProspectConcerns(baseProspect) }, progress, save.seed, schoolById.get(refreshed.schoolId));
    }),
    schedule: save.schedule.map((game) => ({
      ...game,
      seasonType: game.seasonType ?? "regular",
      injuries: game.injuries ?? [],
      snapCounts: game.snapCounts ?? {},
      playerStats: Object.fromEntries(Object.entries(game.playerStats ?? {}).map(([playerId, stats]) => [playerId, normalizePlayerStats(stats)])),
      teamStats: Object.fromEntries(Object.entries(game.teamStats ?? {}).map(([teamId, stats]) => [teamId, normalizeTeamGameStats(teamId, stats)]))
    })),
    inbox: [],
    depthOverrides: save.depthOverrides ?? Object.fromEntries(save.teams.map((team) => [team.id, {}])),
    freeAgencyLog: save.freeAgencyLog ?? [],
    freeAgencyMarket: normalizeFreeAgencyMarket(save),
    draftPicks: save.draftPicks ?? [],
    draftState: normalizedDraftState,
    udfaState: save.udfaState,
    rookieResults: save.rookieResults ?? [],
    postseasonState: save.postseasonState,
    scoutingPlan: save.scoutingPlan
      ? {
        ...save.scoutingPlan,
        reports: save.scoutingPlan.reports ?? [],
        recaps: save.scoutingPlan.recaps ?? [],
        lastProcessedWeek: save.scoutingPlan.lastProcessedWeek ?? 0
      }
      : {
        assignments: [],
        reports: [],
        recaps: [],
        lastProcessedWeek: 0
      },
    staffMarket: save.staffMarket ?? {
      weekGenerated: save.currentWeek,
      candidates: []
    },
    developmentReports: save.developmentReports ?? [],
    medicalHistory: save.medicalHistory ?? [],
    careerEndedRecords: save.careerEndedRecords ?? [],
    irReturnUsage: save.irReturnUsage ?? Object.fromEntries(save.teams.map((team) => [team.id, 0])),
    waiverState: save.waiverState ?? { order: save.teams.map((team) => team.id), players: [] },
    injuryReports: save.injuryReports ?? []
  };
  const ranked = { ...normalized, prospects: rankProspectBoard(normalized.prospects, normalizedSchools, save.seed) };
  const withSystems = ensureStaffMarket({ ...ensureUdfaState(ensureDraftState(normalizeCapState(ranked))), scoutingPlan: ensureScoutingPlan(ranked) });
  return refreshCalendar({ ...withSystems, tradeState: normalizeTradeState(withSystems) });
}

export function TeamLogo({ teamId, save, size = 44 }: { teamId: string; save: GameSave; size?: number }) {
  const team = teamById(save, teamId);
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "failed">(() => (team.logoUrl ? "loading" : "failed"));

  useEffect(() => {
    setImageStatus(team.logoUrl ? "loading" : "failed");
  }, [team.id, team.logoUrl]);

  const useFallback = !team.logoUrl || imageStatus === "failed";
  const className = `logo-wrap team-logo ${useFallback ? "team-logo-fallback" : imageStatus === "loaded" ? "team-logo-real" : "team-logo-loading"}`;
  return (
    <span className={className} style={{ width: size, height: size }} data-testid="team-logo" data-status={useFallback ? "fallback" : imageStatus}>
      {useFallback ? (
        <span className="logo-fallback">{team.abbreviation}</span>
      ) : (
        <img
          src={team.logoUrl}
          alt={`${team.fullName} logo`}
          onLoad={() => setImageStatus("loaded")}
          onError={() => setImageStatus("failed")}
        />
      )}
    </span>
  );
}

export function CollegeLogo({ school, size = 40 }: { school?: CollegeProgram; size?: number }) {
  const fallback = school?.logoInitials ?? "COL";
  const primary = school?.primaryColor ?? "#2f4858";
  const secondary = school?.secondaryColor ?? "#d8dee8";
  const logoSources = school?.logoUrls?.length ? school.logoUrls : school?.logoUrl ? [school.logoUrl] : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeLogoUrl = logoSources[sourceIndex];
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "failed">(() => (activeLogoUrl ? "loading" : "failed"));

  useEffect(() => {
    setSourceIndex(0);
    setImageStatus(logoSources.length ? "loading" : "failed");
  }, [school?.id, logoSources.join("|")]);

  const style: CSSProperties & { "--college-primary": string; "--college-secondary": string } = {
    width: size,
    height: size,
    "--college-primary": primary,
    "--college-secondary": secondary
  };
  const useFallback = !activeLogoUrl || imageStatus === "failed";
  const className = `logo-wrap college-logo ${useFallback ? "college-logo-fallback" : imageStatus === "loaded" ? "college-logo-real" : "college-logo-loading"}`;
  return (
    <span className={className} style={style} data-testid="college-logo" data-status={useFallback ? "fallback" : imageStatus}>
      {useFallback ? (
        <span className="logo-fallback">{fallback}</span>
      ) : (
        <img
          src={activeLogoUrl}
          alt={`${school?.name ?? "College"} logo`}
          onLoad={() => setImageStatus("loaded")}
          onError={() => {
            if (sourceIndex + 1 < logoSources.length) {
              setSourceIndex((current) => current + 1);
              setImageStatus("loading");
              return;
            }
            setImageStatus("failed");
          }}
        />
      )}
    </span>
  );
}

function SchoolCell({ school }: { school?: CollegeProgram }) {
  return (
    <span className="school-cell">
      <CollegeLogo school={school} size={40} />
      <span>
        <strong>{school?.name ?? "Unknown"}</strong>
        <small>{school?.subdivision ?? "College"}</small>
      </span>
    </span>
  );
}

function RecordLine({ save, teamId }: { save: GameSave; teamId: string }) {
  const record = save.records[teamId];
  return (
    <span>
      {record.wins}-{record.losses}
      {record.ties ? `-${record.ties}` : ""}
    </span>
  );
}

function TeamScopePicker({
  save,
  teamId,
  setTeamId,
  label = "Viewing team"
}: {
  save: GameSave;
  teamId: string;
  setTeamId: (teamId: string) => void;
  label?: string;
}) {
  const team = teamById(save, teamId);
  return (
    <label className="team-scope-picker">
      <span>{label}</span>
      <TeamLogo save={save} teamId={team.id} size={34} />
      <select value={teamId} onChange={(event) => setTeamId(event.target.value)} aria-label={label}>
        {save.teams
          .slice()
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
          .map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.fullName}
            </option>
          ))}
      </select>
    </label>
  );
}

export default function App() {
  const [save, setSave] = useState<GameSave | undefined>();
  const [careerSlots, setCareerSlots] = useState<CareerSlot[]>([]);
  const [activeCareerId, setActiveCareerId] = useState<string | undefined>();
  const [activeCareerName, setActiveCareerName] = useState("Unsaved Career");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("Unsaved");
  const [saveFailure, setSaveFailure] = useState<string | undefined>();
  const [isBooting, setIsBooting] = useState(true);
  const [setupCareerType, setSetupCareerType] = useState<CareerType>("nfl");
  const [setupTeamId, setSetupTeamId] = useState("chi");
  const [setupSchoolId, setSetupSchoolId] = useState(() => collegePrograms[0]?.id ?? "");
  const [setupMode, setSetupMode] = useState<SaveMode>("goals");
  const [setupScenario, setSetupScenario] = useState<CareerScenario>("neutral");
  const [setupSeed, setSetupSeed] = useState(() => randomCareerSeed());
  const [openingMenuMode, setOpeningMenuMode] = useState<"new" | "load">("new");
  const [isCreatingYearZero, setIsCreatingYearZero] = useState(false);
  const [yearZeroProgress, setYearZeroProgress] = useState(() => loadYearZeroProgressTemplate());
  const [teamSearch, setTeamSearch] = useState("");
  const [teamConference, setTeamConference] = useState<Conference | "all">("all");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolSubdivision, setSchoolSubdivision] = useState<"all" | "FBS" | "FCS">("all");
  const [schoolConference, setSchoolConference] = useState<string>("all");
  const [schoolPrestigeBand, setSchoolPrestigeBand] = useState<SchoolPrestigeBand>("all");
  const [expandedSchoolConferences, setExpandedSchoolConferences] = useState<Set<string>>(new Set());
  const [schoolConferenceTogglesTouched, setSchoolConferenceTogglesTouched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("roster");
  const [tradePrefillPlayerId, setTradePrefillPlayerId] = useState<string>();
  const [pendingRosterRecommendations, setPendingRosterRecommendations] = useState<RosterMoveRecommendation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveGenerationRef = useRef(0);
  const skipNextAutosaveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const migration = await migrateLegacyLocalSave(normalizeSave);
        const active = migration.record ?? (await loadActiveCareer());
        const slots = await listCareers();
        if (cancelled) return;
        setCareerSlots(slots);
        if (active) {
          const normalized = normalizeSave(active.save);
          skipNextAutosaveRef.current = true;
          setSave(normalized);
          setActiveCareerId(active.id);
          setActiveCareerName(active.slot.name);
          setSaveStatus("Saved");
        } else if (migration.error) {
          setSaveStatus("Save failed");
          setSaveFailure(migration.error);
        } else {
          setSaveStatus("Unsaved");
        }
      } catch (error) {
        if (!cancelled) {
          setSaveStatus("Save failed");
          setSaveFailure(error instanceof Error ? error.message : "Could not load careers.");
        }
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!save || !activeCareerId || isBooting) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const generation = (saveGenerationRef.current += 1);
    setSaveStatus("Saving");
    setSaveFailure(undefined);
    const timeout = window.setTimeout(() => {
      void saveCareer(activeCareerId, save).then(async (result) => {
        if (generation !== saveGenerationRef.current) return;
        if (result.ok && result.slot) {
          setSaveStatus("Saved");
          setActiveCareerName(result.slot.name);
          setCareerSlots(await listCareers());
        } else {
          setSaveStatus("Save failed");
          setSaveFailure(result.error ?? "Autosave failed. Export is still available.");
        }
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeCareerId, isBooting, save]);

  const activeTeam = save ? selectedTeam(save) : undefined;

  const appStyle = useMemo(() => {
    if (save?.careerType === "college") {
      const school = schoolForSave(save);
      return {
        "--team-primary": school?.primaryColor ?? "#176b87",
        "--team-secondary": school?.secondaryColor ?? "#c7d3dd"
      } as CSSProperties & Record<string, string>;
    }
    if (!activeTeam) return {};
    return {
      "--team-primary": activeTeam.colors.primary,
      "--team-secondary": activeTeam.colors.secondary
    } as CSSProperties & Record<string, string>;
  }, [activeTeam, save]);

  const selectedSetupTeam = useMemo(
    () => nflTeams.find((team) => team.id === setupTeamId) ?? nflTeams[0],
    [setupTeamId]
  );
  const setupSchools = useMemo(() => collegePrograms.map((school) => ({ ...school, ...collegeImageFor(school) })), []);
  const selectedSetupSchool = useMemo(
    () => setupSchools.find((school) => school.id === setupSchoolId) ?? setupSchools[0],
    [setupSchoolId, setupSchools]
  );
  const setupSchoolConferences = useMemo(() => {
    return Array.from(new Set(setupSchools.map((school) => school.conference))).sort((a, b) => a.localeCompare(b));
  }, [setupSchools]);
  const defaultOpenSchoolConferences = useMemo(() => {
    const conferenceStats = new Map<string, { total: number; count: number }>();
    setupSchools.forEach((school) => {
      const current = conferenceStats.get(school.conference) ?? { total: 0, count: 0 };
      current.total += school.prestige;
      current.count += 1;
      conferenceStats.set(school.conference, current);
    });
    const topConferences = Array.from(conferenceStats.entries())
      .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([conference]) => conference);
    return new Set([selectedSetupSchool?.conference, ...topConferences].filter(Boolean) as string[]);
  }, [selectedSetupSchool?.conference, setupSchools]);

  const filteredSetupTeams = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();
    return nflTeams.filter((team) => {
      const matchesConference = teamConference === "all" || team.conference === teamConference;
      const matchesQuery =
        !query ||
        team.fullName.toLowerCase().includes(query) ||
        team.city.toLowerCase().includes(query) ||
        team.name.toLowerCase().includes(query) ||
        team.abbreviation.toLowerCase().includes(query);
      return matchesConference && matchesQuery;
    });
  }, [teamConference, teamSearch]);

  const filteredSetupSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    return setupSchools
      .filter((school) => {
        const matchesSubdivision = schoolSubdivision === "all" || school.subdivision === schoolSubdivision;
        const matchesConference = schoolConference === "all" || school.conference === schoolConference;
        const matchesPrestige = matchesSchoolPrestigeBand(school.prestige, schoolPrestigeBand);
        const matchesQuery =
          !query ||
          school.name.toLowerCase().includes(query) ||
          school.mascot.toLowerCase().includes(query) ||
          school.conference.toLowerCase().includes(query);
        return matchesSubdivision && matchesConference && matchesPrestige && matchesQuery;
      })
      .sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));
  }, [schoolConference, schoolPrestigeBand, schoolSearch, schoolSubdivision, setupSchools]);
  const setupSchoolConferenceGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredSetupSchools>();
    filteredSetupSchools.forEach((school) => {
      const current = groups.get(school.conference) ?? [];
      current.push(school);
      groups.set(school.conference, current);
    });
    return Array.from(groups.entries())
      .map(([conference, schools]) => ({
        conference,
        schools,
        averagePrestige: Math.round(schools.reduce((total, school) => total + school.prestige, 0) / Math.max(1, schools.length))
      }))
      .sort((a, b) => b.averagePrestige - a.averagePrestige || a.conference.localeCompare(b.conference));
  }, [filteredSetupSchools]);
  const schoolFiltersActive = Boolean(schoolSearch.trim()) || schoolSubdivision !== "all" || schoolConference !== "all" || schoolPrestigeBand !== "all";

  function toggleSchoolConferenceGroup(conference: string) {
    setSchoolConferenceTogglesTouched(true);
    setExpandedSchoolConferences((current) => {
      const next = new Set(schoolConferenceTogglesTouched ? current : defaultOpenSchoolConferences);
      if (next.has(conference)) {
        next.delete(conference);
      } else {
        next.add(conference);
      }
      return next;
    });
  }

  async function refreshCareerSlots() {
    setCareerSlots(await listCareers());
  }

  async function loadCareerSlot(slotId: string) {
    const record = await loadCareer(slotId);
    if (!record) return;
    await setActiveCareer(slotId);
    skipNextAutosaveRef.current = true;
    const normalized = normalizeSave(record.save);
    setSave(normalized);
    setActiveCareerId(record.id);
    setActiveCareerName(record.slot.name);
    setSaveStatus("Saved");
    setSaveFailure(undefined);
    setActiveTab(normalized.careerType === "college" ? "college-hub" : "roster");
    setOpeningMenuMode("load");
    await refreshCareerSlots();
  }

  async function startCareer() {
    const seed = setupSeed.trim() || randomCareerSeed();
    setSetupSeed(seed);
    setYearZeroProgress(loadYearZeroProgressTemplate());
    setIsCreatingYearZero(true);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const newSave = normalizeSave(createNewSave({
      careerType: setupCareerType,
      selectedTeamId: setupTeamId,
      selectedSchoolId: setupCareerType === "college" ? setupSchoolId : undefined,
      mode: setupMode,
      seed,
      scenario: setupScenario
    }));
    try {
      const record = await createCareer(newSave);
      skipNextAutosaveRef.current = true;
      setSave(normalizeSave(record.save));
      setActiveCareerId(record.id);
      setActiveCareerName(record.slot.name);
      setCareerSlots(await listCareers());
      setSaveStatus("Saved");
      setSaveFailure(undefined);
    } catch (error) {
      setSave(newSave);
      setActiveCareerId(undefined);
      setActiveCareerName("Unsaved Career");
      setSaveStatus("Save failed");
      setSaveFailure(error instanceof Error ? error.message : "New career could not be saved. Export is still available.");
    }
    setIsCreatingYearZero(false);
    setActiveTab(setupCareerType === "college" ? "college-hub" : "roster");
    setOpeningMenuMode("new");
  }

  function newCareer() {
    setOpeningMenuMode("new");
    setSave(undefined);
    setActiveCareerId(undefined);
    setActiveCareerName("Unsaved Career");
    setSaveStatus("Unsaved");
    setSaveFailure(undefined);
    setActiveTab("roster");
    setSetupSeed(randomCareerSeed());
  }

  async function renameCareerSlot(slotId: string) {
    const slot = careerSlots.find((candidate) => candidate.id === slotId);
    const name = window.prompt("Career name", slot?.name ?? activeCareerName);
    if (!name) return;
    const updated = await renameCareer(slotId, name);
    if (updated) {
      if (slotId === activeCareerId) setActiveCareerName(updated.name);
      await refreshCareerSlots();
    }
  }

  async function deleteCareerSlot(slotId: string) {
    const slot = careerSlots.find((candidate) => candidate.id === slotId);
    if (!window.confirm(`Delete ${slot?.name ?? "this career"}?`)) return;
    await deleteCareer(slotId);
    if (slotId === activeCareerId) {
      newCareer();
    }
    await refreshCareerSlots();
  }

  async function exportCareerSlot(slotId: string) {
    const record = await loadCareer(slotId);
    if (record) downloadSave(record.save);
  }

  async function copySeed() {
    try {
      await navigator.clipboard?.writeText(setupSeed);
    } catch {
      window.prompt("Copy career seed", setupSeed);
    }
  }

  function handleAdvanceDay() {
    setSave((current) => {
      if (!current) return current;
      const recommendations = buildRosterMoveRecommendations(current, current.selectedTeamId);
      if (recommendations.length && current.phase === "regular") {
        setPendingRosterRecommendations(recommendations);
        return current;
      }
      return advanceDay(current);
    });
  }

  function handleAdvancePostseasonRound() {
    setSave((current) => (current ? advancePostseasonRound(current) : current));
  }

  function openFreeAgencyPhase() {
    setSave((current) => (current ? advanceToFreeAgency(current) : current));
  }

  function openDraftPrepPhase() {
    setSave((current) => (current ? advanceToDraftPrep(resolveFreeAgencyWave(current, { includeCpuOffers: true })) : current));
  }

  function submitFreeAgentPlayerOffer(playerId: string, terms?: Partial<Pick<FreeAgentOffer, "years" | "apy" | "security" | "role">>) {
    setSave((current) => (current ? submitFreeAgentOffer(current, playerId, current.selectedTeamId, terms) : current));
  }

  function resolveFreeAgentOffers() {
    setSave((current) => (current ? resolveFreeAgencyWave(current, { includeCpuOffers: true }) : current));
  }

  function claimWaiverPlayer(playerId: string) {
    setSave((current) => (current ? submitWaiverClaim(current, playerId, current.selectedTeamId) : current));
  }

  function approveRosterRecommendations(recommendationIds: string[]) {
    setSave((current) => {
      if (!current) return current;
      const withMoves = applyRosterMoveRecommendations(current, recommendationIds, current.selectedTeamId);
      if (hasBlockingRosterIssues(withMoves, withMoves.selectedTeamId)) return withMoves;
      return advanceDay(withMoves);
    });
    setPendingRosterRecommendations([]);
  }

  function dismissRosterRecommendations() {
    if (save && hasBlockingRosterIssues(save, save.selectedTeamId)) return;
    setPendingRosterRecommendations([]);
    setSave((current) => (current ? advanceDay(current) : current));
  }

  function signFreeAgentPracticeSquadPlayer(playerId: string) {
    setSave((current) => (current ? signFreeAgentToPracticeSquad(current, playerId, current.selectedTeamId) : current));
  }

  function releaseRosterPlayer(playerId: string) {
    setSave((current) => (current ? releasePlayerToFreeAgency(current, playerId, current.selectedTeamId) : current));
  }

  function postJuneReleaseRosterPlayer(playerId: string) {
    setSave((current) => (current ? releasePlayerToFreeAgency(current, playerId, current.selectedTeamId, "post-june") : current));
  }

  function restructureRosterPlayer(playerId: string) {
    setSave((current) => (current ? restructurePlayerContract(current, playerId, current.selectedTeamId) : current));
  }

  function tagOrTenderRosterPlayer(playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) {
    setSave((current) => (current ? applyTagOrTender(current, playerId, current.selectedTeamId, kind) : current));
  }

  function extendRosterPlayer(playerId: string) {
    setSave((current) => (current ? extendPlayerContract(current, playerId, current.selectedTeamId) : current));
  }

  function exerciseRosterFifthYearOption(playerId: string) {
    setSave((current) => (current ? exerciseFifthYearOption(current, playerId, current.selectedTeamId) : current));
  }

  function placeRosterPlayerOnIr(playerId: string) {
    setSave((current) => (current ? placePlayerOnIr(current, playerId, current.selectedTeamId) : current));
  }

  function designateRosterPlayerToReturn(playerId: string) {
    setSave((current) => (current ? designatePlayerToReturn(current, playerId, current.selectedTeamId) : current));
  }

  function activateRosterPlayerFromIr(playerId: string) {
    setSave((current) => (current ? activatePlayerFromIr(current, playerId, current.selectedTeamId) : current));
  }

  function promotePracticePlayer(playerId: string) {
    setSave((current) => (current ? promotePracticeSquadPlayer(current, playerId, current.selectedTeamId) : current));
  }

  function elevatePracticePlayer(playerId: string) {
    setSave((current) => (current ? elevatePracticeSquadPlayer(current, playerId, current.selectedTeamId) : current));
  }

  function protectPracticePlayer(playerId: string) {
    setSave((current) => (current ? protectPracticeSquadPlayer(current, playerId, current.selectedTeamId) : current));
  }

  function releasePracticePlayer(playerId: string) {
    setSave((current) => (current ? releasePracticeSquadPlayer(current, playerId, current.selectedTeamId) : current));
  }

  function updateTrainingPlan(
    playerId: string,
    updates: Parameters<typeof updatePlayerTrainingSettings>[1]
  ) {
    void playerId;
    void updates;
  }

  function setDepthOrder(position: Position, orderedIds: string[]) {
    if (!save) return;
    const teamId = save.selectedTeamId;
    setSave({
      ...save,
      depthOverrides: {
        ...(save.depthOverrides ?? {}),
        [teamId]: {
          ...(save.depthOverrides?.[teamId] ?? {}),
          [position]: orderedIds
        }
      }
    });
  }

  function moveDepthPlayer(position: Position, player: Player, direction: -1 | 1) {
    if (!save) return;
    const currentOrder = buildDisplayDepthChart(save, save.selectedTeamId)[position].map((depthPlayer) => depthPlayer.id);
    const currentIndex = currentOrder.indexOf(player.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    setDepthOrder(position, nextOrder);
  }

  function assignDepthPlayer(position: Position, playerId: string) {
    if (!save) return;
    const teamId = save.selectedTeamId;
    const player = save.players.find((candidate) => candidate.id === playerId && candidate.teamId === teamId);
    if (!player) return;
    const canPlayPosition = player.position === position || !isEmergencyAtDisplayPosition(player, position);
    if (!canPlayPosition) return;
    const chart = buildDisplayDepthChart(save, teamId);
    const teamOverrides = { ...(save.depthOverrides?.[teamId] ?? {}) };
    for (const currentPosition of POSITIONS) {
      const existing = teamOverrides[currentPosition];
      if (existing?.includes(playerId)) {
        teamOverrides[currentPosition] = existing.filter((id) => id !== playerId);
      }
    }
    const targetOrder = chart[position].map((depthPlayer) => depthPlayer.id);
    teamOverrides[position] = [playerId, ...targetOrder.filter((id) => id !== playerId)];
    setSave({
      ...save,
      depthOverrides: {
        ...(save.depthOverrides ?? {}),
        [teamId]: teamOverrides
      }
    });
  }

  function autoSortDepth(position: Position) {
    if (!save) return;
    const teamId = save.selectedTeamId;
    const teamOverrides = { ...(save.depthOverrides?.[teamId] ?? {}) };
    delete teamOverrides[position];
    setSave({
      ...save,
      depthOverrides: {
        ...(save.depthOverrides ?? {}),
        [teamId]: teamOverrides
      }
    });
  }

  function autoSortDepthUnit(positions: Position[]) {
    if (!save) return;
    const teamId = save.selectedTeamId;
    const teamOverrides = { ...(save.depthOverrides?.[teamId] ?? {}) };
    positions.forEach((position) => {
      delete teamOverrides[position];
    });
    setSave({
      ...save,
      depthOverrides: {
        ...(save.depthOverrides ?? {}),
        [teamId]: teamOverrides
      }
    });
  }

  function interviewCandidate(candidateId: string) {
    setSave((current) => (current ? interviewStaffCandidate(current, candidateId) : current));
  }

  function hireCandidate(candidateId: string, slotId: StaffSlotId) {
    setSave((current) => (current ? hireStaffCandidate(current, candidateId, slotId) : current));
  }

  function updateAssignment(assignmentId: string, updates: { type?: ScoutingAssignmentType; focusId?: string }) {
    setSave((current) => (current ? updateScoutingAssignment(current, assignmentId, updates) : current));
  }

  function toggleAssignmentLock(assignmentId: string, locked: boolean) {
    setSave((current) => (current ? updateScoutingAssignmentLock(current, assignmentId, locked) : current));
  }

  function optimizeScoutingPlan() {
    setSave((current) => (current ? optimizeWeeklyScoutingPlan(current) : current));
  }

  function quickFocus(prospectId: string) {
    setSave((current) => (current ? quickFocusProspect(current, prospectId) : current));
  }

  function updateBoard(prospectId: string, updates: Parameters<typeof updateProspectBoard>[2]) {
    setSave((current) => (current ? updateProspectBoard(current, prospectId, updates) : current));
  }

  function openDraftRoom() {
    setSave((current) => (current ? enterDraft(current) : current));
    setActiveTab("draft");
  }

  function draftProspect(prospectId: string) {
    setSave((current) => (current ? makeDraftSelection(current, prospectId) : current));
  }

  function nextDraftEvent() {
    setSave((current) => (current ? advanceDraftEvent(current) : current));
  }

  function updateDraftSpeed(speed: 1 | 3 | 10) {
    setSave((current) => (current ? setDraftSpeed(current, speed) : current));
  }

  function dismissDraftEvent() {
    setSave((current) => (current ? clearDraftEvent(current) : current));
  }

  function acceptTradeOffer(offerId: string) {
    setSave((current) => (current ? acceptDraftTradeOffer(current, offerId) : current));
  }

  function acceptTradeCounterOffer(offerId: string, counterOfferId: string) {
    setSave((current) => (current ? acceptDraftTradeCounterOffer(current, offerId, counterOfferId) : current));
  }

  function declineTradeOffer(offerId: string) {
    setSave((current) => (current ? declineDraftTradeOffer(current, offerId) : current));
  }

  function simToUserPick() {
    setSave((current) => (current ? simDraftToNextUserPick(current) : current));
  }

  function simRound() {
    setSave((current) => (current ? simCurrentDraftRound(current) : current));
  }

  function simDraft() {
    setSave((current) => (current ? simRestOfDraft(current) : current));
  }

  function confirmTradeOffer(offer: DraftTradeOffer) {
    setSave((current) => (current ? applyDraftTradeOffer(current, offer) : current));
  }

  function openTradingForPlayer(playerId?: string) {
    setTradePrefillPlayerId(playerId);
    setActiveTab("trading");
  }

  function submitRosterTradeOffer(offer: TradeOffer) {
    setSave((current) => (current ? submitTradeOffer(current, offer) : current));
  }

  function acceptRosterTradeOffer(offerId: string) {
    setSave((current) => {
      if (!current) return current;
      const offer = current.tradeState?.offers.find((candidate) => candidate.id === offerId);
      return offer ? applyAcceptedTrade(current, offer) : current;
    });
  }

  function toggleRosterTradeBlock(playerId: string) {
    setSave((current) => (current ? toggleUserTradeBlock(current, playerId) : current));
  }

  function refreshTrades() {
    setSave((current) => (current ? refreshTradeActivity(current) : current));
  }

  function onboardRookies() {
    setSave((current) => (current ? runRookieOnboarding(current) : current));
  }

  function submitUdfaOffer(prospectId: string, signingBonus: number, guaranteedMoney: number) {
    setSave((current) => (current ? placeUdfaOffer(current, prospectId, signingBonus, guaranteedMoney) : current));
  }

  function removeUdfaOffer(offerId: string) {
    setSave((current) => (current ? withdrawUdfaOffer(current, offerId) : current));
  }

  function nextUdfaWave() {
    setSave((current) => (current ? resolveNextUdfaWave(current) : current));
  }

  function simUdfaWaves() {
    setSave((current) => (current ? simRemainingUdfaWaves(current) : current));
  }

  function revealRookieResults() {
    setSave((current) => (current ? finalizeUdfaClass(current) : current));
  }

  function openRookieOnboarding() {
    setSave((current) => (current ? beginRookieOnboarding(current) : current));
  }

  function beginNextSeason() {
    setSave((current) => (current ? startNextSeason(current) : current));
    setActiveTab(save?.careerType === "college" ? "college-hub" : "roster");
  }

  function updateCollegeRecruit(entryId: string, updates: Partial<AnnualRecruitingBoardEntry>) {
    setSave((current) => current?.annualRecruiting ? {
      ...current,
      annualRecruiting: {
        ...current.annualRecruiting,
        board: current.annualRecruiting.board.map((entry) => entry.id === entryId ? { ...entry, ...updates } : entry)
      }
    } : current);
  }

  function updateCollegeRecruitPitch(prospectId: string, updates: Parameters<typeof updateRecruitingPitch>[2]) {
    setSave((current) => current ? updateRecruitingPitch(current, prospectId, updates) : current);
  }

  function updateCollegeRecruitScout(assignmentId: string, updates: Parameters<typeof updateRecruitingScoutAssignment>[2]) {
    setSave((current) => current ? updateRecruitingScoutAssignment(current, assignmentId, updates) : current);
  }

  function setCollegeRecruitPriority(entryId: string, priority: number) {
    setSave((current) => {
      if (!current) return current;
      return {
        ...current,
        collegeManagement: {
          ...managementStateForSchools(current.schools),
          ...(current.collegeManagement ?? {}),
          recruitingPriorities: {
            ...(current.collegeManagement?.recruitingPriorities ?? {}),
            [entryId]: priority
          }
        }
      };
    });
  }

  function updateCollegeRosterPlayer(playerId: string, updates: Partial<CollegeRosterPlayer>) {
    setSave((current) => current?.collegeRoster ? {
      ...current,
      collegeRoster: {
        ...current.collegeRoster,
        players: current.collegeRoster.players.map((player) => player.id === playerId ? { ...player, ...updates } : player)
      }
    } : current);
  }

  function moveCollegeDepthPlayer(position: Position, playerId: string, direction: -1 | 1) {
    setSave((current) => {
      if (!current?.collegeRoster) return current;
      const schoolId = managedSchoolId(current);
      const eligible = current.collegeRoster.players
        .filter((player) => player.schoolId === schoolId && player.position === position && !["cut", "graduated", "declared", "redshirt"].includes(player.rosterStatus ?? "active"))
        .sort((a, b) => b.collegeOverall - a.collegeOverall || a.id.localeCompare(b.id));
      const existing = current.collegeManagement?.depthOverrides?.[schoolId]?.[position];
      const order = existing?.length ? [...existing, ...eligible.map((player) => player.id).filter((id) => !existing.includes(id))] : eligible.map((player) => player.id);
      const index = order.indexOf(playerId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return {
        ...current,
        collegeManagement: {
          ...managementStateForSchools(current.schools),
          ...(current.collegeManagement ?? {}),
          depthOverrides: {
            ...(current.collegeManagement?.depthOverrides ?? {}),
            [schoolId]: {
              ...(current.collegeManagement?.depthOverrides?.[schoolId] ?? {}),
              [position]: order
            }
          }
        }
      };
    });
  }

  function autoCollegeDepth(position?: Position) {
    setSave((current) => {
      if (!current) return current;
      const schoolId = managedSchoolId(current);
      const schoolOverrides = { ...(current.collegeManagement?.depthOverrides?.[schoolId] ?? {}) };
      if (position) delete schoolOverrides[position];
      else POSITIONS.forEach((candidate) => delete schoolOverrides[candidate]);
      return {
        ...current,
        collegeManagement: {
          ...managementStateForSchools(current.schools),
          ...(current.collegeManagement ?? {}),
          depthOverrides: {
            ...(current.collegeManagement?.depthOverrides ?? {}),
            [schoolId]: schoolOverrides
          }
        }
      };
    });
  }

  function updateCollegeTraining(focus: CollegeDevelopmentFocus, posture: CollegeFatiguePosture) {
    void focus;
    void posture;
  }

  function updateCollegeNil(position: Position, value: number) {
    setSave((current) => {
      if (!current) return current;
      const schoolId = managedSchoolId(current);
      const nextManagement = {
        ...managementStateForSchools(current.schools),
        ...(current.collegeManagement ?? {}),
        nilAllocationByPosition: {
          ...(current.collegeManagement?.nilAllocationByPosition ?? {}),
          [schoolId]: {
            ...(current.collegeManagement?.nilAllocationByPosition?.[schoolId] ?? {}),
            [position]: value
          }
        }
      };
      return {
        ...current,
        collegeManagement: nextManagement,
        collegeMorale: generateCollegeMoraleState(current.seed, current.seasonYear, current.collegeRoster, current.collegeSeasonResults, current.annualRecruiting, current.collegeTraining, nextManagement)
      };
    });
  }

  function toggleTransferWatch(entryId: string) {
    setSave((current) => {
      if (!current) return current;
      const currentList = current.collegeManagement?.transferWatchlist ?? [];
      const transferWatchlist = currentList.includes(entryId) ? currentList.filter((id) => id !== entryId) : [...currentList, entryId];
      return {
        ...current,
        collegeManagement: {
          ...managementStateForSchools(current.schools),
          ...(current.collegeManagement ?? {}),
          transferWatchlist
        }
      };
    });
  }

  function switchCareerJob(level: CareerType, organizationId: string) {
    setSave((current) => {
      if (!current) return current;
      const organizationName = level === "college"
        ? current.schools.find((school) => school.id === organizationId)?.name ?? organizationId
        : current.teams.find((team) => team.id === organizationId)?.fullName ?? organizationId;
      return {
        ...current,
        careerType: level,
        selectedTeamId: level === "nfl" ? organizationId : current.selectedTeamId,
        selectedSchoolId: level === "college" ? organizationId : current.selectedSchoolId,
        careerEmployment: {
          level,
          organizationId,
          contractStartSeason: current.seasonYear,
          contractEndSeason: current.seasonYear + 3,
          status: "active",
          history: [
            ...(current.careerEmployment?.history ?? []),
            {
              level,
              organizationId,
              startSeason: current.seasonYear,
              status: "active",
              summary: `Accepted job with ${organizationName}.`
            }
          ]
        },
        collegeManagement: {
          ...managementStateForSchools(current.schools),
          ...(current.collegeManagement ?? {}),
          jobMarketOpen: false
        }
      };
    });
    setActiveTab(level === "college" ? "college-hub" : "roster");
  }

  async function importSave(file?: File) {
    if (!file) return;
    const raw = await file.text();
    const parsed = parseSave(raw);
    const normalized = normalizeSave(parsed);
    const importedCareerId = parsed.careerId;
    const existing = importedCareerId ? careerSlots.find((slot) => slot.id === importedCareerId) : undefined;
    try {
      if (existing) {
        const result = await saveCareer(existing.id, normalized);
        if (!result.ok) throw new Error(result.error ?? "Imported save could not be stored.");
        await setActiveCareer(existing.id);
        skipNextAutosaveRef.current = true;
        setSave(normalized);
        setActiveCareerId(existing.id);
        setActiveCareerName(result.slot?.name ?? existing.name);
      } else {
        const record = await createCareer(normalized);
        skipNextAutosaveRef.current = true;
        setSave(normalizeSave(record.save));
        setActiveCareerId(record.id);
        setActiveCareerName(record.slot.name);
      }
      setCareerSlots(await listCareers());
      setSaveStatus("Saved");
      setSaveFailure(undefined);
    } catch (error) {
      setSave(normalized);
      setSaveStatus("Save failed");
      setSaveFailure(error instanceof Error ? error.message : "Imported save could not be stored. Export is still available.");
    }
    setActiveTab(normalized.careerType === "college" ? "college-hub" : "roster");
    setOpeningMenuMode("load");
  }

  if (isBooting) {
    return (
      <div className="setup-screen">
        <section className="setup-panel loading-panel">
          <p className="eyebrow">Loading</p>
          <h1>Opening career files</h1>
          <p className="setup-copy">Checking saved careers and migrating old browser saves.</p>
        </section>
      </div>
    );
  }

  if (isCreatingYearZero) {
    return (
      <div className="setup-screen">
        <section className="setup-panel year-zero-loading-panel">
          <p className="eyebrow">Year Zero Bootstrap</p>
          <h1>Building the starting football universe</h1>
          <p className="setup-copy">Validating the V11.6.4 bundle set and generating the complete starting player base once for this save.</p>
          <div className="year-zero-meter"><span /></div>
          <ol className="year-zero-progress-list">
            {yearZeroProgress.slice(0, 8).map((step) => (
              <li key={step.id}>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  if (!save) {
    const hideOpeningSummary = openingMenuMode === "new" && setupCareerType === "college";
    const selectedOpeningIdentity = setupCareerType === "college" ? selectedSetupSchool?.name ?? "College Program" : selectedSetupTeam.fullName;
    const selectedOpeningSubline = setupCareerType === "college"
      ? `${selectedSetupSchool?.conference ?? "Independent"} | ${selectedSetupSchool?.subdivision ?? "College"} | Prestige ${selectedSetupSchool?.prestige ?? "--"}`
      : `${selectedSetupTeam.conference} ${selectedSetupTeam.division} | ${selectedSetupTeam.city}`;

    const openingSummary = (
      <aside className="opening-summary-rail">
        <section className="opening-preview-card">
          <p className="eyebrow">Live Setup</p>
          <div className="opening-preview-head">
            {setupCareerType === "college" ? (
              <CollegeLogo school={selectedSetupSchool} size={72} />
            ) : (
              <TeamLogo save={{ teams: nflTeams } as GameSave} teamId={selectedSetupTeam.id} size={72} />
            )}
            <div>
              <h2>{selectedOpeningIdentity}</h2>
              <p>{selectedOpeningSubline}</p>
            </div>
          </div>
          <div className="opening-summary-grid">
            <article>
              <span>League</span>
              <strong>{setupCareerType === "college" ? "College Program" : "NFL Franchise"}</strong>
            </article>
            <article>
              <span>Scenario</span>
              <strong>{careerScenarioLabels[setupScenario]}</strong>
            </article>
            <article>
              <span>Mode</span>
              <strong>{setupMode === "goals" ? "Goals Mode" : "Sandbox"}</strong>
            </article>
            <article>
              <span>Seed</span>
              <strong>{setupSeed}</strong>
            </article>
          </div>
        </section>
      </aside>
    );

    const newCareerSection = (
      <section className="opening-workspace-card opening-new-career">
        <header className="opening-workspace-header">
          <div>
            <h2>New Career</h2>
            <p>Start a fresh universe, lock the league tone, then choose the team or program you want to run.</p>
          </div>
        </header>
        <div className="setup-layout">
          <section className="setup-step opening-builder-card">
            <div className="opening-section-heading">
              <div>
                <p className="eyebrow">League</p>
                <h3>Shape the world</h3>
                <p>Pick the job level and the pressure around your first season.</p>
              </div>
            </div>
            <div className="mode-row setup-mode-row" role="group" aria-label="Career type">
              <button className={setupCareerType === "nfl" ? "selected" : ""} onClick={() => setSetupCareerType("nfl")}>
                NFL Team
              </button>
              <button className={setupCareerType === "college" ? "selected" : ""} onClick={() => setSetupCareerType("college")}>
                College Program
              </button>
            </div>
            <div className="scenario-grid">
              {scenarioCards.map((scenario) => (
                <button
                  key={scenario.id}
                  className={`scenario-card ${setupScenario === scenario.id ? "selected" : ""}`}
                  onClick={() => setSetupScenario(scenario.id)}
                >
                  <strong>{careerScenarioLabels[scenario.id]}</strong>
                  <span>{scenario.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setup-step opening-builder-card">
            <div className="opening-section-heading">
              <div>
                <p className="eyebrow">Control</p>
                <h3>Set your rules</h3>
                <p>Decide how guided the career feels and keep a seed handy for repeatable worlds.</p>
              </div>
            </div>
            <div className="mode-row setup-mode-row" role="group" aria-label="Save mode">
              <button className={setupMode === "goals" ? "selected" : ""} onClick={() => setSetupMode("goals")}>
                Goals Mode
              </button>
              <button className={setupMode === "sandbox" ? "selected" : ""} onClick={() => setSetupMode("sandbox")}>
                Sandbox
              </button>
            </div>
            <div className="seed-row opening-seed-row">
              <input value={setupSeed} onChange={(event) => setSetupSeed(event.target.value)} aria-label="Career seed" />
              <button onClick={() => setSetupSeed(randomCareerSeed())}>Randomize Seed</button>
              <button onClick={() => void copySeed()}>Copy Seed</button>
            </div>
          </section>

          <section className="setup-step team-browser-step opening-builder-card">
            <div className="opening-section-heading">
              <div>
                <p className="eyebrow">{setupCareerType === "college" ? "Program" : "Team"}</p>
                <h3>{setupCareerType === "college" ? "Choose your program" : "Choose your team"}</h3>
                <p>{setupCareerType === "college" ? "Choose the school you manage while the NFL sim keeps rolling in the background." : "Pick the franchise that anchors the world you are about to launch."}</p>
              </div>
            </div>
            {setupCareerType === "college" ? (
              <>
                <div className="team-browser-tools college-program-tools">
                  <input
                    type="search"
                    value={schoolSearch}
                    onChange={(event) => setSchoolSearch(event.target.value)}
                    placeholder="Search schools"
                    aria-label="Search schools"
                  />
                  <select
                    value={schoolConference}
                    onChange={(event) => setSchoolConference(event.target.value)}
                    aria-label="Filter conference"
                  >
                    <option value="all">All Conferences</option>
                    {setupSchoolConferences.map((conference) => (
                      <option key={conference} value={conference}>
                        {conference}
                      </option>
                    ))}
                  </select>
                  <select
                    value={schoolSubdivision}
                    onChange={(event) => setSchoolSubdivision(event.target.value as "all" | "FBS" | "FCS")}
                    aria-label="Filter subdivision"
                  >
                    <option value="all">All Subdivisions</option>
                    <option value="FBS">FBS</option>
                    <option value="FCS">FCS</option>
                  </select>
                  <select
                    value={schoolPrestigeBand}
                    onChange={(event) => setSchoolPrestigeBand(event.target.value as SchoolPrestigeBand)}
                    aria-label="Filter prestige"
                  >
                    {(Object.keys(schoolPrestigeBandLabels) as SchoolPrestigeBand[]).map((band) => (
                      <option key={band} value={band}>
                        {schoolPrestigeBandLabels[band]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="college-program-browser">
                  <div className="college-program-browser-summary">
                    <strong>{filteredSetupSchools.length} programs</strong>
                    <span>{schoolFiltersActive ? "Filtered by your current choices" : "Top conferences are open by default"}</span>
                  </div>
                  {setupSchoolConferenceGroups.length ? (
                    setupSchoolConferenceGroups.map((group) => {
                      const isOpen =
                        schoolFiltersActive ||
                        (!schoolConferenceTogglesTouched
                          ? defaultOpenSchoolConferences.has(group.conference)
                          : expandedSchoolConferences.has(group.conference));
                      return (
                        <section className="college-conference-group" key={group.conference}>
                          <button
                            className="college-conference-toggle"
                            onClick={() => toggleSchoolConferenceGroup(group.conference)}
                            aria-expanded={isOpen}
                          >
                            <span>{isOpen ? "-" : "+"}</span>
                            <strong>{group.conference}</strong>
                            <small>{group.schools.length} programs | Avg prestige {group.averagePrestige}</small>
                          </button>
                          {isOpen ? (
                            <div className="college-program-list">
                              {group.schools.map((school) => {
                                const isSelected = setupSchoolId === school.id;
                                return (
                                  <div
                                    key={school.id}
                                    className={`college-program-row ${isSelected ? "selected" : ""}`}
                                    style={{ "--tile-color": school.primaryColor } as CSSProperties & Record<string, string>}
                                  >
                                    <button className="college-program-identity" onClick={() => setSetupSchoolId(school.id)}>
                                      <CollegeLogo school={school} size={34} />
                                      <span title={school.name}>{school.name}</span>
                                    </button>
                                    <strong className="college-program-prestige">Prestige {school.prestige}</strong>
                                    <button
                                      className="college-program-select"
                                      onClick={() => setSetupSchoolId(school.id)}
                                      aria-pressed={isSelected}
                                    >
                                      {isSelected ? "Selected" : "Select"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </section>
                      );
                    })
                  ) : (
                    <div className="college-program-empty">
                      <strong>No programs match those filters.</strong>
                      <span>Try clearing search or widening prestige and subdivision filters.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="team-browser-tools">
                  <input
                    type="search"
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                    placeholder="Search teams"
                    aria-label="Search teams"
                  />
                  <select
                    value={teamConference}
                    onChange={(event) => setTeamConference(event.target.value as Conference | "all")}
                    aria-label="Filter conference"
                  >
                    <option value="all">All Conferences</option>
                    <option value="AFC">AFC</option>
                    <option value="NFC">NFC</option>
                  </select>
                </div>
                <div className="team-grid">
                  {filteredSetupTeams.map((team) => (
                    <button
                      key={team.id}
                      className={`team-tile ${setupTeamId === team.id ? "selected" : ""}`}
                      style={{ "--tile-color": team.colors.primary } as CSSProperties & Record<string, string>}
                      onClick={() => setSetupTeamId(team.id)}
                    >
                      <img src={team.logoUrl} alt="" onError={(event) => (event.currentTarget.style.display = "none")} />
                      <span>{team.fullName}</span>
                      <small>
                        {team.conference} {team.division} | {careerScenarioLabels[setupScenario]}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
        <div className="opening-workspace-footer">
          <button className="primary-action" onClick={() => void startCareer()}>
            Start Career
          </button>
        </div>
      </section>
    );

    const loadSaveSection = (
      <section className="opening-workspace-card opening-load-save">
        <header className="opening-workspace-header">
          <div>
            <h2>Load Save</h2>
            <p>Resume a running universe, import a backup, or clean up older slots without leaving the launcher.</p>
          </div>
          <div className="opening-load-toolbar">
            <button className="primary-action opening-import-button" onClick={() => fileInputRef.current?.click()}>Import Save</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => void importSave(event.target.files?.[0])}
            />
          </div>
        </header>
        {careerSlots.length ? (
          <div className="career-slot-grid opening-career-slot-grid">
            {careerSlots.map((slot) => (
              <article className="career-slot-card" key={slot.id}>
                <div>
                  <strong>{slot.name}</strong>
                  <span>
                    {slot.teamName} | {slot.currentDate ? formatDateLong(slot.currentDate) : `Week ${slot.currentWeek}`} | {slot.recordSummary}
                  </span>
                  <small>
                    {careerScenarioLabels[slot.scenario]} | {slot.phase} | {new Date(slot.updatedAt).toLocaleString()}
                  </small>
                </div>
                <div className="slot-actions">
                  <button onClick={() => void loadCareerSlot(slot.id)}>Load</button>
                  <button onClick={() => void renameCareerSlot(slot.id)}>Rename</button>
                  <button onClick={() => void exportCareerSlot(slot.id)}>Export</button>
                  <button className="ghost-danger" onClick={() => void deleteCareerSlot(slot.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-slots opening-empty-slots">No saved careers yet. Start a new one and it will appear here automatically.</p>
        )}
      </section>
    );

    const openingHeroCards = [
      {
        id: "new" as const,
        title: "New Career",
        detail: "Start a fresh universe",
        meta: `${setupCareerType === "college" ? "College" : "NFL"} | ${careerScenarioLabels[setupScenario]}`
      },
      {
        id: "load" as const,
        title: "Load Save",
        detail: "Resume or import a career",
        meta: careerSlots.length ? `${careerSlots.length} saved ${careerSlots.length === 1 ? "career" : "careers"}` : "No saves yet"
      }
    ];

    return (
      <div
        className="setup-screen opening-screen"
        style={
          {
            "--team-primary": setupCareerType === "college" ? selectedSetupSchool?.primaryColor ?? selectedSetupTeam.colors.primary : selectedSetupTeam.colors.primary,
            "--team-secondary": setupCareerType === "college" ? selectedSetupSchool?.secondaryColor ?? selectedSetupTeam.colors.secondary : selectedSetupTeam.colors.secondary
          } as CSSProperties & Record<string, string>
        }
      >
        <section className="setup-panel opening-panel">
          <div className="opening-topbar">
            <div>
              <p className="eyebrow">Career Command</p>
              <h1>Choose how you want to enter the football world.</h1>
            </div>
          </div>

          <div className="opening-actions" role="group" aria-label="Opening actions">
            {openingHeroCards.map((card) => (
              <button
                key={card.id}
                className={`opening-action-tile ${openingMenuMode === card.id ? "selected" : ""}`}
                onClick={() => setOpeningMenuMode(card.id)}
                aria-pressed={openingMenuMode === card.id}
              >
                <strong>{card.title}</strong>
                <span>{card.detail}</span>
                <small>{card.meta}</small>
              </button>
            ))}
          </div>

          <div className={`opening-main-layout ${hideOpeningSummary ? "opening-main-layout-full" : ""}`}>
            <div className="opening-active-workspace">
              {openingMenuMode === "new" ? newCareerSection : loadSaveSection}
            </div>
            {hideOpeningSummary ? null : openingSummary}
          </div>
        </section>
      </div>
    );
  }

  const activeSchool = schoolForSave(save);
  const currentNavGroups = save.careerType === "college" ? collegeNavGroups : nflNavGroups;

  return (
    <div className="app-shell" style={appStyle}>
      <aside className="side-nav">
        <div className="club-block">
          {save.careerType === "college" ? (
            <CollegeLogo school={activeSchool} size={46} />
          ) : (
            <TeamLogo save={save} teamId={save.selectedTeamId} size={46} />
          )}
          <div>
            <p className="eyebrow">{save.careerType === "college" ? "College desk" : formatDateLong(save.currentDate)}</p>
            <h1>{save.careerType === "college" ? activeSchool?.name : activeTeam?.name}</h1>
            <p>
              {save.careerType === "college" ? `${activeSchool?.conference ?? "Independent"} | ${activeSchool?.subdivision ?? "College"}` : <RecordLine save={save} teamId={save.selectedTeamId} />} | {save.calendarPhase}
            </p>
          </div>
        </div>
        <nav>
          {currentNavGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.tabs.map((tab) => (
                <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div>
            <p className="eyebrow">GM desk</p>
            <h2>{save.careerType === "college" ? activeSchool?.name : activeTeam?.fullName}</h2>
            <small className="career-name">{activeCareerName}</small>
          </div>
          <div className="action-row">
            <details className={`save-chip save-${saveStatus.toLowerCase().replace(/\s+/g, "-")}`}>
              <summary>{saveStatus}</summary>
              <div>
                <strong>{activeCareerName}</strong>
                <p>{saveFailure ?? "Career autosaves to browser database storage."}</p>
                {saveFailure ? <button onClick={() => downloadSave(save)}>Export Now</button> : null}
              </div>
            </details>
            <select value={activeCareerId ?? ""} onChange={(event) => void loadCareerSlot(event.target.value)} aria-label="Switch career">
              <option value="" disabled>Switch Career</option>
              {careerSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.name}</option>
              ))}
            </select>
            <button onClick={handleAdvanceDay}>Advance Day</button>
            {save.phase === "offseason-complete" ? <button onClick={beginNextSeason}>Start Next Season</button> : null}
            <button onClick={() => downloadSave(save)}>Export Save</button>
            <button onClick={() => fileInputRef.current?.click()}>Import Save</button>
            {activeCareerId ? <button onClick={() => void renameCareerSlot(activeCareerId)}>Rename</button> : null}
            <button className="ghost-danger" onClick={newCareer}>New Career</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(event) => void importSave(event.target.files?.[0])}
            />
          </div>
        </header>

        {activeTab === "college-hub" && <CollegeHubView save={save} openTab={setActiveTab} />}
        {activeTab === "college-recruiting" && (
          <CollegeRecruitingView
            save={save}
            updatePitch={updateCollegeRecruitPitch}
            updateScout={updateCollegeRecruitScout}
          />
        )}
        {activeTab === "college-roster" && <CollegeRosterView save={save} updatePlayer={updateCollegeRosterPlayer} />}
        {activeTab === "college-depth" && <CollegeDepthView save={save} movePlayer={moveCollegeDepthPlayer} autoSort={autoCollegeDepth} />}
        {activeTab === "college-training" && <CollegeDevelopmentView save={save} />}
        {activeTab === "college-nil" && <CollegeNilView save={save} updateNil={updateCollegeNil} />}
        {activeTab === "college-transfer" && <CollegeTransferView save={save} toggleWatch={toggleTransferWatch} />}
        {activeTab === "college-season" && <CollegeSeasonView save={save} beginNextSeason={beginNextSeason} />}
        {activeTab === "college-draft" && <CollegeDraftPipelineView save={save} />}
        {activeTab === "college-jobs" && <CollegeJobsView save={save} switchJob={switchCareerJob} />}
        {activeTab === "roster" && (
          <RosterView
            save={save}
            releasePlayer={releaseRosterPlayer}
            postJuneReleasePlayer={postJuneReleaseRosterPlayer}
            restructurePlayer={restructureRosterPlayer}
            tagOrTenderPlayer={tagOrTenderRosterPlayer}
            extendPlayer={extendRosterPlayer}
            exerciseFifthYearOption={exerciseRosterFifthYearOption}
            placeOnIr={placeRosterPlayerOnIr}
            designateToReturn={designateRosterPlayerToReturn}
            activateFromIr={activateRosterPlayerFromIr}
            promotePractice={promotePracticePlayer}
            elevatePractice={elevatePracticePlayer}
            protectPractice={protectPracticePlayer}
            releasePractice={releasePracticePlayer}
            openTradeForPlayer={openTradingForPlayer}
          />
        )}
        {activeTab === "training" && <DevelopmentView save={save} />}
        {activeTab === "free-agents" && (
          <FreeAgentsView
            save={save}
            submitOffer={submitFreeAgentPlayerOffer}
            resolveWave={resolveFreeAgentOffers}
            signPractice={signFreeAgentPracticeSquadPlayer}
          />
        )}
        {activeTab === "medical" && (
          <MedicalView
            save={save}
            placeOnIr={placeRosterPlayerOnIr}
            designateToReturn={designateRosterPlayerToReturn}
            activateFromIr={activateRosterPlayerFromIr}
          />
        )}
        {activeTab === "depth" && (
          <DepthView
            save={save}
            moveDepthPlayer={moveDepthPlayer}
            autoSortDepth={autoSortDepth}
            assignDepthPlayer={assignDepthPlayer}
            autoSortDepthUnit={autoSortDepthUnit}
          />
        )}
        {activeTab === "staff" && <StaffView save={save} interview={interviewCandidate} hire={hireCandidate} />}
        {activeTab === "trading" && (
          <TradingView
            save={save}
            prefillPlayerId={tradePrefillPlayerId}
            submitTrade={submitRosterTradeOffer}
            acceptOffer={acceptRosterTradeOffer}
            toggleBlock={toggleRosterTradeBlock}
            refreshActivity={refreshTrades}
          />
        )}
        {activeTab === "calendar" && <CalendarView save={save} openTab={setActiveTab} openGame={(id) => { setSave({ ...save, lastViewedGameId: id }); setActiveTab("game"); }} />}
        {activeTab === "scouting" && (
          <ScoutingView
            save={save}
            updateAssignment={updateAssignment}
            toggleAssignmentLock={toggleAssignmentLock}
            optimizeScoutingPlan={optimizeScoutingPlan}
            quickFocus={quickFocus}
            updateBoard={updateBoard}
          />
        )}
        {activeTab === "schedule" && <ScheduleView save={save} openGame={(id) => { setSave({ ...save, lastViewedGameId: id }); setActiveTab("game"); }} />}
        {activeTab === "standings" && <StandingsView save={save} advancePostseasonRound={handleAdvancePostseasonRound} openGame={(id) => { setSave({ ...save, lastViewedGameId: id }); setActiveTab("game"); }} />}
        {activeTab === "power" && <PowerRankingsView save={save} />}
        {activeTab === "game" && <GameView save={save} />}
        {activeTab === "budget" && <BudgetView save={save} openFreeAgency={openFreeAgencyPhase} openDraftPrep={openDraftPrepPhase} />}
        {activeTab === "comp-picks" && <CompPicksView save={save} />}
        {activeTab === "draft" && (
          <DraftView
            save={save}
            openDraftRoom={openDraftRoom}
            draftProspect={draftProspect}
            nextDraftEvent={nextDraftEvent}
            setSpeed={updateDraftSpeed}
            dismissEvent={dismissDraftEvent}
            acceptOffer={acceptTradeOffer}
            acceptCounterOffer={acceptTradeCounterOffer}
            declineOffer={declineTradeOffer}
            simToUserPick={simToUserPick}
            simRound={simRound}
            simDraft={simDraft}
            confirmTradeOffer={confirmTradeOffer}
            onboardRookies={onboardRookies}
            submitUdfaOffer={submitUdfaOffer}
            removeUdfaOffer={removeUdfaOffer}
            nextUdfaWave={nextUdfaWave}
            simUdfaWaves={simUdfaWaves}
            revealRookieResults={revealRookieResults}
            openRookieOnboarding={openRookieOnboarding}
            beginNextSeason={beginNextSeason}
          />
        )}
        {activeTab === "stats" && <StatsView save={save} />}
      </main>
      {pendingRosterRecommendations.length ? (
        <RosterRecommendationModal
          recommendations={pendingRosterRecommendations}
          blocking={save ? hasBlockingRosterIssues(save, save.selectedTeamId) : false}
          approve={approveRosterRecommendations}
          dismiss={dismissRosterRecommendations}
        />
      ) : null}
    </div>
  );
}

function CollegeEmptyState({ title }: { title: string }) {
  return (
    <section className="panel-card">
      <p className="eyebrow">College</p>
      <h2>{title}</h2>
      <p className="muted">This save does not have the required college state loaded.</p>
    </section>
  );
}

function selectedSchoolContext(save: GameSave) {
  const schoolId = managedSchoolId(save);
  const school = save.schools.find((candidate) => candidate.id === schoolId);
  const players = save.collegeRoster?.players.filter((player) => player.schoolId === schoolId) ?? [];
  const activePlayers = players.filter((player) => !["cut", "graduated", "declared"].includes(player.rosterStatus ?? "active"));
  const production = save.collegeSeasonResults?.production.filter((row) => row.schoolId === schoolId) ?? [];
  const awards = save.collegeSeasonResults?.awards.filter((row) => row.schoolId === schoolId) ?? [];
  const morale = save.collegeMorale?.entries.filter((row) => row.schoolId === schoolId) ?? [];
  const recruiting = save.annualRecruiting?.board.filter((row) => row.schoolId === schoolId) ?? [];
  return { schoolId, school, players, activePlayers, production, awards, morale, recruiting };
}

function CollegeHubView({ save, openTab }: { save: GameSave; openTab: (tab: Tab) => void }) {
  const { school, activePlayers, production, awards, morale, recruiting } = selectedSchoolContext(save);
  if (!school) return <CollegeEmptyState title="No managed school" />;
  const signed = recruiting.filter((entry) => entry.status === "signed").length;
  const offered = recruiting.filter((entry) => entry.status === "offered" || entry.status === "visited").length;
  const avgMorale = morale.length ? Math.round(morale.reduce((sum, row) => sum + row.morale, 0) / morale.length) : 0;
  const topProduction = [...production].sort((a, b) => b.productionScore - a.productionScore).slice(0, 5);
  const profile = save.schoolProfiles?.profiles.find((row) => row.schoolId === school.id);
  return (
    <section className="view-stack college-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">College Hub</p>
          <h2>{school.name}</h2>
          <p>{school.conference} | {school.subdivision} | {school.scheme} scheme</p>
        </div>
        <CollegeLogo school={school} size={76} />
      </div>
      <div className="metric-grid">
        <article><span>Roster</span><strong>{activePlayers.length}</strong><small>active players</small></article>
        <article><span>Recruiting</span><strong>{signed}/{offered}</strong><small>signed / active offers</small></article>
        <article><span>Morale</span><strong>{avgMorale || "--"}</strong><small>team average</small></article>
        <article><span>Program</span><strong>{profile?.programTier ?? "Tier"}</strong><small>NIL {profile?.nilPower ?? school.prestige}</small></article>
      </div>
      <div className="college-command-grid">
        {[
          ["college-recruiting", "Recruiting", `${recruiting.length} board targets`],
          ["college-roster", "Roster", `${activePlayers.filter((player) => player.rosterStatus === "redshirt").length} redshirts`],
          ["college-depth", "Depth", "Set starters and rotations"],
          ["college-training", "Development", "Set player growth posture"],
          ["college-nil", "NIL", "Allocate position budget"],
          ["college-transfer", "Transfer Portal", `${save.annualTransferPortal?.entries.filter((entry) => entry.playerPool === "college").length ?? 0} entries`],
          ["college-season", "Season", `${awards.length} award results`]
        ].map(([tab, title, detail]) => (
          <button key={tab} className="college-command" onClick={() => openTab(tab as Tab)}>
            <strong>{title}</strong>
            <span>{detail}</span>
          </button>
        ))}
      </div>
      <section className="table-card">
        <div className="table-card-header"><h3>Top Production</h3></div>
        <DataTable>
          <thead><tr><th>Player</th><th>Pos</th><th>Depth</th><th>Production</th><th>Snaps</th></tr></thead>
          <tbody>
            {topProduction.map((row) => {
              const player = activePlayers.find((candidate) => candidate.id === row.playerId);
              return <tr key={row.id}><td>{player ? `${player.firstName} ${player.lastName}` : row.playerId}</td><td>{row.position}</td><td>{row.depthRank}</td><td>{row.productionScore}</td><td>{Math.round(row.snapShare * 100)}%</td></tr>;
            })}
          </tbody>
        </DataTable>
      </section>
    </section>
  );
}

const RECRUITING_TAB_ITEMS = [
  ["board", "Board"],
  ["targets", "Targets"],
  ["class", "Class"],
  ["scouts", "Scouts"]
] as const;

const RECRUITING_STATUSES: AnnualRecruitingBoardEntry["status"][] = ["evaluating", "offered", "visited", "committed", "signed", "decommitted", "withdrawn"];
const RECRUITING_LANES = ["Watchlist", "Offered", "Visits", "Committed", "Signed", "Dropped"] as const;
type RecruitingModalTab = "overview" | "recruitment" | "scouting" | "pitch";

function RecruitStars({ value, title = `${value}-star` }: { value: number; title?: string }) {
  return (
    <span className="recruit-stars" title={title} aria-label={title}>
      {"★".repeat(value)}
    </span>
  );
}

function CollegeRecruitingView({
  save,
  updatePitch,
  updateScout
}: {
  save: GameSave;
  updatePitch: (prospectId: string, updates: Parameters<typeof updateRecruitingPitch>[2]) => void;
  updateScout: (assignmentId: string, updates: Parameters<typeof updateRecruitingScoutAssignment>[2]) => void;
}) {
  const { school } = selectedSchoolContext(save);
  const schoolId = managedSchoolId(save);
  const recruitingState = save.annualRecruiting;
  const recruits = save.annualRecruitClass?.recruits ?? [];
  const [activeRecruitingTab, setActiveRecruitingTab] = useState<"board" | "targets" | "class" | "scouts">("board");
  const [position, setPosition] = useState<Position | "all">("all");
  const [stars, setStars] = useState<"all" | "5" | "4" | "3" | "2">("all");
  const [status, setStatus] = useState<AnnualRecruitingBoardEntry["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [visibleRows, setVisibleRows] = useState(120);
  const [selectedRecruitId, setSelectedRecruitId] = useState<string>();
  const [modalInitialTab, setModalInitialTab] = useState<RecruitingModalTab>("overview");
  const [sortKey, setSortKey] = useState<"rank" | "stars" | "interest" | "gap">("rank");
  if (!school || !save.annualRecruitClass || !recruitingState) return <CollegeEmptyState title="No recruiting board" />;

  const recruitingIndexes = useMemo(() => {
    const recruitMap = new Map(recruits.map((recruit) => [recruit.id, recruit]));
    const schoolMap = new Map(save.schools.map((candidate) => [candidate.id, candidate]));
    const selectedEntryMap = new Map<string, AnnualRecruitingBoardEntry>();
    const entriesByProspect = new Map<string, AnnualRecruitingBoardEntry[]>();
    let selectedPointUsage = 0;

    for (const entry of recruitingState.board) {
      if (entry.schoolId === schoolId) {
        selectedEntryMap.set(entry.prospectId, entry);
        selectedPointUsage += entry.weeklyPoints ?? 0;
      }
      if (entry.status === "withdrawn") continue;
      const prospectEntries = entriesByProspect.get(entry.prospectId);
      if (prospectEntries) prospectEntries.push(entry);
      else entriesByProspect.set(entry.prospectId, [entry]);
    }

    for (const entries of entriesByProspect.values()) {
      entries.sort((a, b) => b.interestScore - a.interestScore || a.id.localeCompare(b.id));
    }

    const evaluationMap = new Map(
      (recruitingState.evaluations ?? [])
        .filter((evaluation) => evaluation.schoolId === schoolId)
        .map((evaluation) => [evaluation.prospectId, evaluation])
    );
    const selectedTargetIds = new Set(recruitingState.targetIdsBySchool?.[schoolId] ?? []);
    const removedTargetIds = new Set(recruitingState.removedTargetIdsBySchool?.[schoolId] ?? []);
    const targetSet = new Set<string>(selectedTargetIds);
    for (const entry of selectedEntryMap.values()) {
      if (!removedTargetIds.has(entry.prospectId) && ["offered", "visited", "committed", "signed"].includes(entry.status)) {
        targetSet.add(entry.prospectId);
      }
    }

    const recruitStateMap = new Map<string, typeof recruits>();
    for (const recruit of recruits) {
      const stateRecruits = recruitStateMap.get(recruit.homeState);
      if (stateRecruits) stateRecruits.push(recruit);
      else recruitStateMap.set(recruit.homeState, [recruit]);
    }
    const states = [...recruitStateMap.keys()].sort();
    for (const stateRecruits of recruitStateMap.values()) {
      stateRecruits.sort((a, b) => a.nationalRank - b.nationalRank);
    }

    const assignments = (recruitingState.scoutAssignments ?? []).filter((assignment) => assignment.schoolId === schoolId);
    const coverageByState = new Map<string, number>();
    const coverageCounts = new Map<string, number>();
    for (const assignment of assignments) {
      coverageByState.set(assignment.stateFocus, (coverageByState.get(assignment.stateFocus) ?? 0) + assignment.coverage);
      coverageCounts.set(assignment.stateFocus, (coverageCounts.get(assignment.stateFocus) ?? 0) + 1);
    }
    for (const [state, coverage] of coverageByState) {
      coverageByState.set(state, Math.round(coverage / Math.max(1, coverageCounts.get(state) ?? 1)));
    }

    return {
      recruitById: recruitMap,
      schoolById: schoolMap,
      selectedEntries: selectedEntryMap,
      entriesByProspect,
      evaluationByRecruit: evaluationMap,
      targetIds: targetSet,
      usedPoints: selectedPointUsage,
      recruitsByState: recruitStateMap,
      recruitStates: states,
      scoutAssignments: assignments,
      scoutCoverageByState: coverageByState
    };
  }, [recruitingState.board, recruitingState.evaluations, recruitingState.removedTargetIdsBySchool, recruitingState.scoutAssignments, recruitingState.targetIdsBySchool, recruits, save.schools, schoolId]);

  const filteredRecruitIds = useMemo(() => recruits
    .filter((recruit) => position === "all" || recruit.position === position)
    .filter((recruit) => stars === "all" || recruit.stars === Number(stars))
    .filter((recruit) => status === "all" || recruitingIndexes.selectedEntries.get(recruit.id)?.status === status)
    .filter((recruit) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return `${recruit.firstName} ${recruit.lastName}`.toLowerCase().includes(query)
        || recruit.homeState.toLowerCase().includes(query)
        || recruit.position.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sortKey === "stars") return b.stars - a.stars || a.nationalRank - b.nationalRank;
      if (sortKey === "interest") return (recruitingIndexes.selectedEntries.get(b.id)?.interestScore ?? 0) - (recruitingIndexes.selectedEntries.get(a.id)?.interestScore ?? 0) || a.nationalRank - b.nationalRank;
      if (sortKey === "gap") {
        const gapFor = (recruitId: string) => {
          const entry = recruitingIndexes.selectedEntries.get(recruitId);
          const leader = recruitingIndexes.entriesByProspect.get(recruitId)?.[0];
          return leader ? leader.interestScore - (entry?.interestScore ?? 0) : 100;
        };
        return gapFor(a.id) - gapFor(b.id) || a.nationalRank - b.nationalRank;
      }
      return a.nationalRank - b.nationalRank;
    })
    .map((recruit) => recruit.id), [recruits, position, stars, status, search, sortKey, recruitingIndexes]);

  const visibleBoardRows = useMemo(() => filteredRecruitIds.slice(0, visibleRows).flatMap((id) => {
    const recruit = recruitingIndexes.recruitById.get(id);
    if (!recruit) return [];
    const entry = recruitingIndexes.selectedEntries.get(id);
    const topSchools = recruitingIndexes.entriesByProspect.get(id) ?? [];
    const yourRankIndex = topSchools.findIndex((candidate) => candidate.schoolId === schoolId);
    const yourRank = yourRankIndex >= 0 ? yourRankIndex + 1 : 0;
    const leader = topSchools[0];
    const interest = entry?.interestScore ?? 0;
    const gap = leader ? leader.interestScore - interest : 100;
    return [{ recruit, entry, evaluation: recruitingIndexes.evaluationByRecruit.get(id), topSchools, yourRank, gap, interest, isTarget: recruitingIndexes.targetIds.has(id) }];
  }), [filteredRecruitIds, recruitingIndexes, schoolId, visibleRows]);

  const selectedRecruit = selectedRecruitId ? recruitingIndexes.recruitById.get(selectedRecruitId) : undefined;
  const selectedEntry = selectedRecruit ? recruitingIndexes.selectedEntries.get(selectedRecruit.id) : undefined;
  const selectedEvaluation = selectedRecruit ? recruitingIndexes.evaluationByRecruit.get(selectedRecruit.id) : undefined;
  const selectedTopSchools = selectedRecruit ? recruitingIndexes.entriesByProspect.get(selectedRecruit.id) ?? [] : [];
  const selectedBudget = recruitingState.weeklyPointsBySchool?.[schoolId] ?? 0;
  const usedPoints = recruitingIndexes.usedPoints;
  const classSummary = recruitingState.classSummaries?.find((summary) => summary.schoolId === schoolId);
  const openRecruit = (prospectId: string, tab: RecruitingModalTab = "overview") => {
    setSelectedRecruitId(prospectId);
    setModalInitialTab(tab);
  };
  const targetRows = useMemo(() => [...recruitingIndexes.targetIds].flatMap((id) => {
    const recruit = recruitingIndexes.recruitById.get(id);
    if (!recruit) return [];
    const entry = recruitingIndexes.selectedEntries.get(id);
    return [{ recruit, entry, lane: entry?.status === "signed" ? "Signed" : entry?.status === "committed" ? "Committed" : entry?.status === "visited" ? "Visits" : entry?.status === "offered" ? "Offered" : entry?.status === "withdrawn" ? "Dropped" : "Watchlist" }];
  }).sort((a, b) => (b.entry?.interestScore ?? 0) - (a.entry?.interestScore ?? 0) || a.recruit.nationalRank - b.recruit.nationalRank), [recruitingIndexes]);

  return (
    <section className="view-stack college-view">
      <div className="view-header recruiting-header">
        <div>
          <p className="eyebrow">Recruiting</p>
          <h2>{school.name} Recruiting Desk</h2>
        </div>
        <div className="recruiting-metrics">
          <span><strong>{selectedBudget - usedPoints}</strong> points left</span>
          <span><strong>{classSummary?.rank ? `#${classSummary.rank}` : "--"}</strong> class rank</span>
          <span><strong>{classSummary?.blueChips ?? 0}</strong> blue chips</span>
        </div>
      </div>
      <div className="recruiting-tabs" role="tablist" aria-label="Recruiting tabs">
        {RECRUITING_TAB_ITEMS.map(([id, label]) => (
          <button key={id} className={activeRecruitingTab === id ? "selected" : ""} onClick={() => setActiveRecruitingTab(id)}>{label}</button>
        ))}
      </div>

      {activeRecruitingTab === "board" && (
        <>
          <div className="board-toolbar recruiting-toolbar">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleRows(120); }} placeholder="Search recruits" aria-label="Search recruits" />
            <select value={position} onChange={(event) => { setPosition(event.target.value as Position | "all"); setVisibleRows(120); }}><option value="all">All Positions</option>{POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}</select>
            <select value={stars} onChange={(event) => { setStars(event.target.value as typeof stars); setVisibleRows(120); }}><option value="all">All Stars</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value as AnnualRecruitingBoardEntry["status"] | "all"); setVisibleRows(120); }}><option value="all">All Statuses</option>{RECRUITING_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={sortKey} onChange={(event) => { setSortKey(event.target.value as typeof sortKey); setVisibleRows(120); }}><option value="rank">Sort: Rank</option><option value="stars">Sort: Stars</option><option value="interest">Sort: Interest</option><option value="gap">Sort: Gap</option></select>
          </div>
          <section className="table-card recruiting-board-card">
            <DataTable>
              <thead><tr><th>Stars</th><th>Rank</th><th>Recruit</th><th>Pos</th><th>State</th><th>Interest</th><th>Your Rank</th><th>Gap</th><th>Status</th><th>Pts</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleBoardRows.map((row) => (
                  <tr key={row.recruit.id} className="recruiting-row" onClick={() => openRecruit(row.recruit.id)}>
                    <td><RecruitStars value={row.recruit.stars} /></td>
                    <td>#{row.recruit.nationalRank}</td>
                    <td><strong>{row.recruit.firstName} {row.recruit.lastName}</strong><small>Our grade {row.evaluation ? `${row.evaluation.evaluatedStarsLow}-${row.evaluation.evaluatedStarsHigh} stars` : "unscouted"}</small></td>
                    <td>{row.recruit.position}</td>
                    <td>{row.recruit.homeState}</td>
                    <td><strong>{row.interest || "--"}</strong></td>
                    <td>{row.yourRank ? `#${row.yourRank}` : "--"}</td>
                    <td>{row.entry ? row.gap <= 0 ? "Lead" : `-${row.gap}` : "--"}</td>
                    <td>{row.entry?.status ?? (row.isTarget ? "watchlist" : "untracked")}</td>
                    <td>{row.entry?.weeklyPoints ?? 0}</td>
                    <td className="button-cell">
                      <button onClick={(event) => { event.stopPropagation(); updatePitch(row.recruit.id, { target: true }); }}>Watch</button>
                      <button onClick={(event) => { event.stopPropagation(); openRecruit(row.recruit.id, "pitch"); }}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {visibleRows < filteredRecruitIds.length ? <button className="show-more-button" onClick={() => setVisibleRows((current) => current + 120)}>Show More ({filteredRecruitIds.length - visibleRows} remaining)</button> : null}
          </section>
        </>
      )}

      {activeRecruitingTab === "targets" && (
        <section className="recruiting-pipeline">
          {RECRUITING_LANES.map((lane) => (
            <article className="recruiting-lane" key={lane}>
              <h3>{lane}</h3>
              {targetRows.filter((row) => row.lane === lane).map((row) => (
                <button className="recruiting-lane-card" key={row.recruit.id} onClick={() => openRecruit(row.recruit.id, "recruitment")}>
                  <span><RecruitStars value={row.recruit.stars} /></span>
                  <strong>{row.recruit.firstName} {row.recruit.lastName}</strong>
                  <small>{row.recruit.position} | {row.recruit.homeState} | Interest {row.entry?.interestScore ?? "--"}</small>
                </button>
              ))}
            </article>
          ))}
        </section>
      )}

      {activeRecruitingTab === "class" && (
        <section className="recruiting-class-grid">
          <div className="metric-grid">
            <article><span>Class Rank</span><strong>{classSummary?.rank ? `#${classSummary.rank}` : "--"}</strong></article>
            <article><span>Commits</span><strong>{classSummary?.commits ?? 0}</strong></article>
            <article><span>Signees</span><strong>{classSummary?.signees ?? 0}</strong></article>
            <article><span>Avg Stars</span><strong>{classSummary?.averageStars || "--"}</strong></article>
            <article><span>Blue Chips</span><strong>{classSummary?.blueChips ?? 0}</strong></article>
          </div>
          <section className="table-card">
            <DataTable>
              <thead><tr><th>Recruit</th><th>Stars</th><th>Pos</th><th>State</th><th>Status</th><th>Interest</th></tr></thead>
              <tbody>
                {targetRows.filter((row) => row.entry?.status === "committed" || row.entry?.status === "signed").map((row) => (
                  <tr key={row.recruit.id} onClick={() => openRecruit(row.recruit.id, "overview")}>
                    <td><strong>{row.recruit.firstName} {row.recruit.lastName}</strong><small>#{row.recruit.nationalRank}</small></td>
                    <td><RecruitStars value={row.recruit.stars} /></td>
                    <td>{row.recruit.position}</td>
                    <td>{row.recruit.homeState}</td>
                    <td>{row.entry?.status}</td>
                    <td>{row.entry?.interestScore}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </section>
        </section>
      )}

      {activeRecruitingTab === "scouts" && (
        <section className="recruiting-scouts-grid">
          <div className="recruiting-state-list">
            {recruitingIndexes.recruitStates.slice(0, 40).map((state) => {
              const count = recruitingIndexes.recruitsByState.get(state)?.length ?? 0;
              const coverage = recruitingIndexes.scoutCoverageByState.get(state) ?? 0;
              return <span key={state}><strong>{state}</strong><small>{count} recruits | {coverage || 0}% coverage</small></span>;
            })}
          </div>
          <section className="table-card">
            <DataTable>
              <thead><tr><th>Scout</th><th>State</th><th>Position</th><th>Target</th><th>Coverage</th><th>Report</th></tr></thead>
              <tbody>
                {recruitingIndexes.scoutAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><strong>{assignment.scoutName}</strong><small>Effectiveness {assignment.effectiveness}</small></td>
                    <td><select value={assignment.stateFocus} onChange={(event) => updateScout(assignment.id, { stateFocus: event.target.value })}>{recruitingIndexes.recruitStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></td>
                    <td><select value={assignment.positionFocus} onChange={(event) => updateScout(assignment.id, { positionFocus: event.target.value as Position | "all" })}><option value="all">All</option>{POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}</select></td>
                    <td><select value={assignment.targetProspectId ?? ""} onChange={(event) => updateScout(assignment.id, { targetProspectId: event.target.value || undefined })}><option value="">State coverage</option>{(recruitingIndexes.recruitsByState.get(assignment.stateFocus) ?? []).slice(0, 80).map((recruit) => <option key={recruit.id} value={recruit.id}>{recruit.firstName} {recruit.lastName}</option>)}</select></td>
                    <td>{assignment.coverage}%</td>
                    <td>{assignment.lastReport}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </section>
        </section>
      )}

      {selectedRecruit ? (
        <RecruitingRecruitModal
          recruit={selectedRecruit}
          entry={selectedEntry}
          evaluation={selectedEvaluation}
          topSchools={selectedTopSchools}
          schoolById={recruitingIndexes.schoolById}
          schoolId={schoolId}
          currentWeek={save.currentWeek}
          initialTab={modalInitialTab}
          updatePitch={updatePitch}
          onClose={() => setSelectedRecruitId(undefined)}
        />
      ) : null}
    </section>
  );
}

function RecruitingRecruitModal({
  recruit,
  entry,
  evaluation,
  topSchools,
  schoolById,
  schoolId,
  currentWeek,
  initialTab,
  updatePitch,
  onClose
}: {
  recruit: AnnualRecruit;
  entry?: AnnualRecruitingBoardEntry;
  evaluation?: AnnualRecruitEvaluation;
  topSchools: AnnualRecruitingBoardEntry[];
  schoolById: Map<string, CollegeProgram>;
  schoolId: string;
  currentWeek: number;
  initialTab: RecruitingModalTab;
  updatePitch: (prospectId: string, updates: Parameters<typeof updateRecruitingPitch>[2]) => void;
  onClose: () => void;
}) {
  const [modalTab, setModalTab] = useState<RecruitingModalTab>(initialTab);
  const [showAllInterested, setShowAllInterested] = useState(false);
  const [draftWeeklyPoints, setDraftWeeklyPoints] = useState(entry?.weeklyPoints ?? 0);
  const [draftNilOffer, setDraftNilOffer] = useState(entry?.nilOffer ?? 0);

  useEffect(() => {
    setModalTab(initialTab);
    setShowAllInterested(false);
    setDraftWeeklyPoints(entry?.weeklyPoints ?? 0);
    setDraftNilOffer(entry?.nilOffer ?? 0);
  }, [entry?.nilOffer, entry?.weeklyPoints, initialTab, recruit.id]);

  const commitWeeklyPoints = () => {
    const nextValue = Math.round(draftWeeklyPoints);
    if (nextValue !== (entry?.weeklyPoints ?? 0)) updatePitch(recruit.id, { weeklyPoints: nextValue, target: true });
  };
  const commitNilOffer = () => {
    const nextValue = Math.round(draftNilOffer);
    if (nextValue !== (entry?.nilOffer ?? 0)) updatePitch(recruit.id, { nilOffer: nextValue, target: true });
  };

  return (
    <div className="modal-backdrop roster-modal-backdrop" onClick={onClose}>
      <section className="roster-modal recruiting-modal" onClick={(event) => event.stopPropagation()}>
        <header className="recruiting-modal-header">
          <div>
            <p className="eyebrow">Recruit</p>
            <h2>{recruit.firstName} {recruit.lastName}</h2>
            <p>{recruit.position} | {recruit.homeState} | #{recruit.nationalRank} national</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="recruiting-modal-stars">
          <span>Consensus <RecruitStars value={recruit.stars} /></span>
          <span>Our Grade {evaluation ? <RecruitStars value={evaluation.evaluatedStars} title={`${evaluation.evaluatedStarsLow}-${evaluation.evaluatedStarsHigh} stars`} /> : "Unscouted"}</span>
        </div>
        <div className="recruiting-tabs modal-tabs" role="tablist" aria-label="Recruit modal tabs">
          {(["overview", "recruitment", "scouting", "pitch"] as const).map((tab) => <button key={tab} className={modalTab === tab ? "selected" : ""} onClick={() => setModalTab(tab)}>{tab}</button>)}
        </div>
        {modalTab === "overview" && (
          <div className="recruiting-modal-grid">
            <article><span>Height / Weight</span><strong>{recruit.height}" / {recruit.weight}</strong></article>
            <article><span>Ranks</span><strong>#{recruit.nationalRank} nat | #{recruit.positionRank} {recruit.position}</strong></article>
            <article><span>Development</span><strong>{recruit.developmentTrait}</strong></article>
            <article><span>Personality</span><strong>{recruit.personality}</strong></article>
            <article><span>OVR Range</span><strong>{evaluation ? evaluation.projectedOverallRange.join("-") : recruit.visibleOverallRange.join("-")}</strong></article>
            <article><span>POT Range</span><strong>{evaluation ? evaluation.projectedPotentialRange.join("-") : recruit.visiblePotentialRange.join("-")}</strong></article>
          </div>
        )}
        {modalTab === "recruitment" && (
          <div className="recruiting-interest-list">
            {(showAllInterested ? topSchools : topSchools.slice(0, 5)).map((interestEntry, index) => {
              const entrySchool = schoolById.get(interestEntry.schoolId);
              return (
                <div className={`recruiting-interest-row ${interestEntry.schoolId === schoolId ? "user-school" : ""}`} key={interestEntry.id}>
                  <strong>#{index + 1} {entrySchool?.name ?? interestEntry.schoolId}</strong>
                  <div className="interest-meter"><span style={{ width: `${interestEntry.interestScore}%` }} /></div>
                  <small>{interestEntry.interestScore} interest | {interestEntry.status} | {interestEntry.pipelineType}</small>
                </div>
              );
            })}
            {topSchools.length > 5 ? <button onClick={() => setShowAllInterested((current) => !current)}>{showAllInterested ? "Show Top 5" : `Display More (${topSchools.length - 5})`}</button> : null}
          </div>
        )}
        {modalTab === "scouting" && (
          <div className="recruiting-scout-report">
            <div className="metric-grid">
              <article><span>Confidence</span><strong>{evaluation?.confidence ?? 0}%</strong></article>
              <article><span>Progress</span><strong>{evaluation?.progress ?? 0}%</strong></article>
              <article><span>Grade Range</span><strong>{evaluation ? `${evaluation.evaluatedStarsLow}-${evaluation.evaluatedStarsHigh} stars` : "--"}</strong></article>
            </div>
            <h3>Notes</h3>
            <ul>{(evaluation?.notes ?? ["No team scouting report yet."]).map((note) => <li key={note}>{note}</li>)}</ul>
            <h3>Risk</h3>
            <p>{evaluation?.riskFlags.length ? evaluation.riskFlags.join(", ") : "No major flags yet."}</p>
          </div>
        )}
        {modalTab === "pitch" && (
          <div className="recruiting-pitch-panel">
            <label>Weekly Points <strong>{draftWeeklyPoints}</strong><input type="range" min={0} max={120} value={draftWeeklyPoints} onChange={(event) => setDraftWeeklyPoints(Number(event.target.value))} onPointerUp={commitWeeklyPoints} onBlur={commitWeeklyPoints} /></label>
            <div className="recruiting-pitch-actions">
              <button onClick={() => updatePitch(recruit.id, { scholarshipOffered: true, status: "offered", target: true })}>Offer Scholarship</button>
              <button onClick={() => updatePitch(recruit.id, { status: "visited", visitScheduledWeek: currentWeek, target: true })}>Schedule Visit</button>
              <button onClick={() => updatePitch(recruit.id, { promiseType: "early_playing_time", target: true })}>Promise Playing Time</button>
              <button onClick={() => updatePitch(recruit.id, { removeTarget: true, status: "withdrawn" })}>Remove Target</button>
            </div>
            <label>NIL Offer <strong>{draftNilOffer}</strong><input type="range" min={0} max={100} value={draftNilOffer} onChange={(event) => setDraftNilOffer(Number(event.target.value))} onPointerUp={commitNilOffer} onBlur={commitNilOffer} /></label>
            <p className="muted">Points and NIL save when you release the slider. Weekly recruiting resolves on Advance Day during the weekly tick.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CollegeRosterView({ save, updatePlayer }: { save: GameSave; updatePlayer: (playerId: string, updates: Partial<CollegeRosterPlayer>) => void }) {
  const { school, players } = selectedSchoolContext(save);
  const [position, setPosition] = useState<Position | "all">("all");
  const [status, setStatus] = useState<string>("active");
  if (!school) return <CollegeEmptyState title="No college roster" />;
  const rows = players
    .filter((player) => position === "all" || player.position === position)
    .filter((player) => status === "all" || (player.rosterStatus ?? "active") === status)
    .sort((a, b) => b.collegeOverall - a.collegeOverall || a.lastName.localeCompare(b.lastName));
  return (
    <section className="view-stack college-view">
      <div className="view-header"><div><p className="eyebrow">Roster</p><h2>{school.name}</h2></div></div>
      <div className="board-toolbar">
        <select value={position} onChange={(event) => setPosition(event.target.value as Position | "all")}><option value="all">All Positions</option>{POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="redshirt">Redshirt</option><option value="walk_on">Walk-on</option><option value="cut">Cut</option><option value="graduated">Graduated</option><option value="declared">Declared</option><option value="all">All Statuses</option></select>
      </div>
      <section className="table-card">
        <DataTable>
          <thead><tr><th>Player</th><th>Pos</th><th>Class</th><th>OVR</th><th>Pot</th><th>Academic</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong><small>{player.source}</small></td>
                <td>{player.position}</td>
                <td>{player.classYear}</td>
                <td>{player.collegeOverall}</td>
                <td>{player.collegePotential}</td>
                <td>{player.academicEligible === false ? "Ineligible" : `Risk ${player.academicRisk ?? 0}`}</td>
                <td>{player.rosterStatus ?? "active"}</td>
                <td className="button-cell">
                  <button onClick={() => updatePlayer(player.id, { rosterStatus: player.rosterStatus === "redshirt" ? "active" : "redshirt", redshirted: player.rosterStatus !== "redshirt" })}>Redshirt</button>
                  <button onClick={() => updatePlayer(player.id, { rosterStatus: "active", cutSeason: undefined })}>Active</button>
                  <button onClick={() => updatePlayer(player.id, { rosterStatus: "cut", cutSeason: save.seasonYear })}>Cut</button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
    </section>
  );
}

function CollegeDepthView({ save, movePlayer, autoSort }: { save: GameSave; movePlayer: (position: Position, playerId: string, direction: -1 | 1) => void; autoSort: (position?: Position) => void }) {
  const { schoolId, school, activePlayers } = selectedSchoolContext(save);
  if (!school) return <CollegeEmptyState title="No depth chart" />;
  const overrides = save.collegeManagement?.depthOverrides?.[schoolId] ?? {};
  return (
    <section className="view-stack college-view">
      <div className="view-header"><div><p className="eyebrow">Depth</p><h2>{school.name} Depth Chart</h2></div><button onClick={() => autoSort()}>Auto All</button></div>
      <div className="college-depth-grid">
        {POSITIONS.map((position) => {
          const candidates = activePlayers.filter((player) => player.position === position && player.rosterStatus !== "redshirt");
          const override = overrides[position] ?? [];
          const ordered = [...override.map((id) => candidates.find((player) => player.id === id)).filter(Boolean) as CollegeRosterPlayer[], ...candidates.filter((player) => !override.includes(player.id)).sort((a, b) => b.collegeOverall - a.collegeOverall)].slice(0, 5);
          return (
            <article className="depth-card" key={position}>
              <header><strong>{position}</strong><button onClick={() => autoSort(position)}>Auto</button></header>
              {ordered.map((player, index) => (
                <div className="college-depth-row" key={player.id}>
                  <span>{index + 1}</span>
                  <strong>{player.firstName} {player.lastName}</strong>
                  <small>{player.collegeOverall}</small>
                  <button onClick={() => movePlayer(position, player.id, -1)}>Up</button>
                  <button onClick={() => movePlayer(position, player.id, 1)}>Down</button>
                </div>
              ))}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CollegeDevelopmentView({
  save
}: {
  save: GameSave;
}) {
  const { schoolId, school, activePlayers, morale } = selectedSchoolContext(save);
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [sort, setSort] = useState<SortState<CollegeDevelopmentSortKey>>({ key: "overall", direction: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (!school) return <CollegeEmptyState title="No development state" />;
  const moraleByPlayerId = new Map(morale.map((entry) => [entry.playerId, entry]));
  const rows = activePlayers
    .filter((player) => positionFilter === "all" || player.position === positionFilter)
    .sort((a, b) => {
      const values: Record<CollegeDevelopmentSortKey, [string | number, string | number]> = {
        name: [`${a.lastName}, ${a.firstName}`, `${b.lastName}, ${b.firstName}`],
        position: [a.position, b.position],
        class: [a.classYear, b.classYear],
        overall: [a.collegeOverall, b.collegeOverall],
        potential: [a.collegePotential, b.collegePotential],
        academic: [a.academicEligible === false ? 1 : 0, b.academicEligible === false ? 1 : 0],
        portal: [moraleByPlayerId.get(a.id)?.transferRisk ?? 0, moraleByPlayerId.get(b.id)?.transferRisk ?? 0]
      };
      const primary = sortableValueCompare(values[sort.key][0], values[sort.key][1]) * sortMultiplier(sort.direction);
      if (primary !== 0) return primary;
      return `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`);
    })
    .slice(0, 160);
  const activeFilterItems: Array<ActiveFilter | undefined> = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined
  ];
  const activeFilters = activeFilterItems.filter(isActiveFilter);
  return (
    <section className="view-stack development-workspace college-view">
      <div className="roster-command-bar development-command-bar">
        <FilterButton count={activeFilters.length} onClick={() => setFiltersOpen(true)} />
        <span className="read-only-chip">{rows.length} players shown</span>
      </div>
      <section className="table-card development-table-card">
        <DataTable>
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="name" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="Pos" sortKey="position" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="Class" sortKey="class" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="OVR" sortKey="overall" sort={sort} setSort={setSort} />
              <SortableHeader label="POT" sortKey="potential" sort={sort} setSort={setSort} />
              <SortableHeader label="Academic" sortKey="academic" sort={sort} setSort={setSort} />
              <SortableHeader label="Portal Risk" sortKey="portal" sort={sort} setSort={setSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => {
              const moraleRow = moraleByPlayerId.get(player.id);
              return (
                <tr key={player.id}>
                  <td><strong>{player.firstName} {player.lastName}</strong></td>
                  <td>{player.position}</td>
                  <td>{player.classYear}</td>
                  <td><strong>{player.collegeOverall}</strong></td>
                  <td><strong>{player.collegePotential}</strong></td>
                  <td>{player.academicEligible === false ? "Risk" : "Eligible"}</td>
                  <td>{moraleRow ? `${moraleRow.transferRisk}%` : "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </section>
      {filtersOpen ? (
        <FilterModal
          title={`${school.name} Development Filters`}
          activeFilters={activeFilters}
          clearAll={() => setPositionFilter("all")}
          close={() => setFiltersOpen(false)}
        >
          <label className="roster-select-field">
            <span>Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All</option>
              {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
        </FilterModal>
      ) : null}
    </section>
  );
}

function CollegeNilView({
  save,
  updateNil
}: {
  save: GameSave;
  updateNil: (position: Position, value: number) => void;
}) {
  const { schoolId, school, activePlayers, morale } = selectedSchoolContext(save);
  if (!school) return <CollegeEmptyState title="No NIL state" />;
  const nil = save.collegeManagement?.nilAllocationByPosition?.[schoolId] ?? {};
  const trainingByPlayerId = new Map((save.collegeTraining?.entries ?? []).filter((entry) => entry.schoolId === schoolId).map((entry) => [entry.playerId, entry]));
  const moraleByPlayerId = new Map(morale.map((entry) => [entry.playerId, entry]));
  const totalAllocation = POSITIONS.reduce((sum, position) => sum + (nil[position] ?? 0), 0);
  const highRisk = activePlayers
    .map((player) => {
      const training = trainingByPlayerId.get(player.id);
      const moraleRow = moraleByPlayerId.get(player.id);
      const allocation = nil[player.position] ?? 0;
      const nilEffect = Math.round(allocation * (training?.nilSensitivity ?? 0.5));
      return { player, training, morale: moraleRow, allocation, nilEffect, risk: moraleRow?.transferRisk ?? 0 };
    })
    .sort((a, b) => b.risk - a.risk || b.nilEffect - a.nilEffect)
    .slice(0, 40);
  return (
    <section className="view-stack college-view nil-workspace">
      <div className="view-header">
        <div>
          <p className="eyebrow">NIL</p>
          <h2>{school.name} NIL Desk</h2>
          <p>Position allocation, player demand, and portal-risk context.</p>
        </div>
        <div className="development-header-metrics">
          <span><small>Total</small><strong>{totalAllocation}</strong></span>
          <span><small>High Risk</small><strong>{highRisk.filter((row) => row.risk >= 60).length}</strong></span>
        </div>
      </div>
      <section className="table-card nil-allocation-card">
        <div className="table-card-header"><h3>Position Allocation</h3></div>
        <div className="nil-grid">
          {POSITIONS.map((position) => (
            <label key={position}>
              <span>{position}</span>
              <input type="number" min={0} max={100} value={nil[position] ?? 0} onChange={(event) => updateNil(position, Number(event.target.value))} />
            </label>
          ))}
        </div>
      </section>
      <section className="table-card development-table-card">
        <div className="table-card-header"><h3>Player NIL Risk</h3></div>
        <DataTable>
          <thead><tr><th>Player</th><th>Pos</th><th>OVR</th><th>POT</th><th>Allocation</th><th>Demand</th><th>Retention Effect</th><th>Portal Risk</th><th>Context</th></tr></thead>
          <tbody>
            {highRisk.map(({ player, training, morale: moraleRow, allocation, nilEffect, risk }) => (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong></td>
                <td>{player.position}</td>
                <td>{player.collegeOverall}</td>
                <td>{player.collegePotential}</td>
                <td>{allocation}</td>
                <td>{Math.round((training?.nilSensitivity ?? 0.5) * 100)}%</td>
                <td>{nilEffect > 0 ? `+${nilEffect}` : "--"}</td>
                <td>{moraleRow ? `${risk}%` : "--"}</td>
                <td>{moraleRow?.reasons.join(", ") || training?.debug || "Stable"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
    </section>
  );
}

function CollegeTransferView({ save, toggleWatch }: { save: GameSave; toggleWatch: (entryId: string) => void }) {
  const { school } = selectedSchoolContext(save);
  const watchlist = new Set(save.collegeManagement?.transferWatchlist ?? []);
  const entries = (save.annualTransferPortal?.entries ?? []).filter((entry) => entry.playerPool === "college").slice(0, 160);
  if (!school) return <CollegeEmptyState title="No transfer portal" />;
  return (
    <section className="view-stack college-view">
      <div className="view-header"><div><p className="eyebrow">Transfer Portal</p><h2>{school.name} Targets</h2></div></div>
      <section className="table-card">
        <DataTable>
          <thead><tr><th>Player</th><th>Pos</th><th>From</th><th>Reason</th><th>Status</th><th>Best Fits</th><th>Action</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td><strong>{entry.playerName}</strong></td>
                <td>{entry.position}</td>
                <td>{save.schools.find((candidate) => candidate.id === entry.fromTeamId)?.name ?? entry.fromTeamId}</td>
                <td>{entry.reason}</td>
                <td>{entry.status}</td>
                <td>{entry.destinationScores.slice(0, 3).map((score) => save.schools.find((candidate) => candidate.id === score.teamId)?.name ?? score.teamId).join(", ")}</td>
                <td><button className={watchlist.has(entry.id) ? "selected" : ""} onClick={() => toggleWatch(entry.id)}>{watchlist.has(entry.id) ? "Watching" : "Watch"}</button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
    </section>
  );
}

function CollegeSeasonView({ save, beginNextSeason }: { save: GameSave; beginNextSeason: () => void }) {
  const { school, production, awards } = selectedSchoolContext(save);
  if (!school) return <CollegeEmptyState title="No season results" />;
  return (
    <section className="view-stack college-view">
      <div className="view-header">
        <div><p className="eyebrow">Season</p><h2>{school.name} {save.seasonYear}</h2></div>
        {save.phase === "offseason-complete" ? <button onClick={beginNextSeason}>Start Next Season</button> : null}
      </div>
      <div className="metric-grid">
        <article><span>Production Rows</span><strong>{production.length}</strong><small>selected school</small></article>
        <article><span>Awards</span><strong>{awards.length}</strong><small>award results</small></article>
        <article><span>Recruiting Phase</span><strong>{save.annualRecruiting?.currentPhase ?? "--"}</strong><small>annual pipeline</small></article>
        <article><span>Draft Year</span><strong>{save.draftState.draftYear}</strong><small>NFL bridge</small></article>
      </div>
      <section className="table-card">
        <DataTable>
          <thead><tr><th>Player</th><th>Pos</th><th>Production</th><th>Snap Share</th><th>Stats</th></tr></thead>
          <tbody>{production.slice(0, 80).map((row) => <tr key={row.id}><td>{save.collegeRoster?.players.find((player) => player.id === row.playerId)?.lastName ?? row.playerId}</td><td>{row.position}</td><td>{row.productionScore}</td><td>{Math.round(row.snapShare * 100)}%</td><td>{Object.entries(row.stats ?? {}).slice(0, 3).map(([key, value]) => `${key} ${value}`).join(", ")}</td></tr>)}</tbody>
        </DataTable>
      </section>
    </section>
  );
}

function CollegeDraftPipelineView({ save }: { save: GameSave }) {
  const { school } = selectedSchoolContext(save);
  if (!school) return <CollegeEmptyState title="No draft pipeline" />;
  const prospects = save.prospects.filter((prospect) => prospect.schoolId === school.id).slice(0, 120);
  const evalById = new Map(save.draftEvaluation?.results.map((row) => [row.prospectId, row]) ?? []);
  return (
    <section className="view-stack college-view">
      <div className="view-header"><div><p className="eyebrow">Draft Pipeline</p><h2>{school.name} NFL Prospects</h2></div></div>
      <section className="table-card">
        <DataTable>
          <thead><tr><th>Prospect</th><th>Pos</th><th>Class</th><th>Round</th><th>Grade</th><th>Evaluation</th></tr></thead>
          <tbody>{prospects.map((prospect) => <tr key={prospect.id}><td><strong>{prospect.firstName} {prospect.lastName}</strong></td><td>{prospect.position}</td><td>{prospect.classYear}</td><td>{prospect.projectedRound}</td><td>{prospect.consensusGrade}</td><td>{evalById.get(prospect.id)?.evaluationSummary ?? prospect.scouted.note}</td></tr>)}</tbody>
        </DataTable>
      </section>
    </section>
  );
}

function CollegeJobsView({ save, switchJob }: { save: GameSave; switchJob: (level: CareerType, organizationId: string) => void }) {
  const employment = save.careerEmployment;
  const canSwitch = employment?.status !== "active" || save.collegeManagement?.jobMarketOpen;
  const collegeOffers = [...save.schools].sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name)).slice(0, 12);
  const nflOffers = [...save.teams].sort((a, b) => a.fullName.localeCompare(b.fullName)).slice(0, 8);
  return (
    <section className="view-stack college-view">
      <div className="view-header"><div><p className="eyebrow">Jobs</p><h2>Career Employment</h2><p>{employment?.status ?? "active"} through {employment?.contractEndSeason ?? save.seasonYear + 3}</p></div></div>
      <section className="table-card">
        <div className="table-card-header"><h3>College Offers</h3></div>
        <DataTable>
          <thead><tr><th>School</th><th>Conference</th><th>Prestige</th><th>Scheme</th><th>Action</th></tr></thead>
          <tbody>{collegeOffers.map((school) => <tr key={school.id}><td><SchoolCell school={school} /></td><td>{school.conference}</td><td>{school.prestige}</td><td>{school.scheme}</td><td><button disabled={!canSwitch} onClick={() => switchJob("college", school.id)}>Accept</button></td></tr>)}</tbody>
        </DataTable>
      </section>
      <section className="table-card">
        <div className="table-card-header"><h3>NFL Offers</h3></div>
        <DataTable>
          <thead><tr><th>Team</th><th>Division</th><th>Record</th><th>Action</th></tr></thead>
          <tbody>{nflOffers.map((team) => <tr key={team.id}><td>{team.fullName}</td><td>{team.conference} {team.division}</td><td><RecordLine save={save} teamId={team.id} /></td><td><button disabled={!canSwitch} onClick={() => switchJob("nfl", team.id)}>Accept</button></td></tr>)}</tbody>
        </DataTable>
      </section>
    </section>
  );
}

function RosterRecommendationModal({
  recommendations,
  blocking,
  approve,
  dismiss
}: {
  recommendations: RosterMoveRecommendation[];
  blocking: boolean;
  approve: (ids: string[]) => void;
  dismiss: () => void;
}) {
  const defaultIds = useMemo(
    () => recommendations.filter((recommendation) => !recommendation.disabledReason).map((recommendation) => recommendation.id),
    [recommendations]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);

  useEffect(() => {
    setSelectedIds(defaultIds);
  }, [defaultIds]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]));
  }

  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation">
      <article className="trade-modal roster-recommendation-modal" role="dialog" aria-modal="true" aria-label="Staff roster recommendations" onMouseDown={(event) => event.stopPropagation()}>
        <p className="eyebrow">Staff Recommendations</p>
        <h3>Roster moves before advance</h3>
        <p>{blocking ? "One or more roster issues must be handled before the week can advance." : "Staff has suggested moves for the week. Approve the ones you want to process now."}</p>
        <div className="recommendation-list">
          {recommendations.map((recommendation) => (
            <label key={recommendation.id} className={`recommendation-row ${recommendation.required ? "required" : ""} ${recommendation.disabledReason ? "disabled" : ""}`}>
              <input
                type="checkbox"
                checked={selectedIds.includes(recommendation.id)}
                disabled={Boolean(recommendation.disabledReason)}
                onChange={() => toggle(recommendation.id)}
              />
              <span>
                <strong>{recommendation.title}</strong>
                <em>{recommendation.summary}</em>
                <small>{recommendation.disabledReason ?? recommendation.impact}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="trade-modal-actions">
          <button type="button" onClick={() => approve(selectedIds)}>Approve Selected</button>
          <button type="button" disabled={blocking} title={blocking ? "Required roster issues must be fixed first." : "Skip recommendations and advance"} onClick={dismiss}>
            Skip And Advance
          </button>
        </div>
      </article>
    </div>
  );
}

function MetricStrip({ save, teamId = save.selectedTeamId }: { save: GameSave; teamId?: string }) {
  const team = teamById(save, teamId);
  const needs = rosterNeeds(save, team.id).slice(0, 3);
  const grade = teamOverall(save, team.id);
  return (
    <section className="metric-grid">
      <article>
        <span>Team Grade</span>
        <strong>{grade}</strong>
        <em>{ratingTierLabel(grade)}</em>
      </article>
      <article>
        <span>Cap Room</span>
        <strong>${save.budget[team.id].toFixed(1)}M</strong>
      </article>
      <article>
        <span>Scouting</span>
        <strong>{scoutingQuality(save, team.id)}</strong>
      </article>
      <article>
        <span>Needs</span>
        <strong>{needs.map((need) => need.position).join(", ")}</strong>
      </article>
    </section>
  );
}

function YearZeroDebugPanel({ debug }: { debug: NonNullable<ReturnType<typeof buildYearZeroDebugExport>> }) {
  const invariantEntries = Object.entries(debug.invariants);
  const passed = invariantEntries.filter(([, ok]) => ok).length;
  const implementedAudit = debug.selfAudit.filter((row) => row.status === "Implemented").length;
  const partialAudit = debug.selfAudit.filter((row) => row.status === "Partially Implemented").length;
  function downloadDebugExport() {
    const blob = new Blob([JSON.stringify(debug, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `year-zero-debug-${debug.seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <article className="year-zero-debug-card">
      <div>
        <p className="eyebrow">Year Zero Bootstrap</p>
        <h3>V11.6.4 universe loaded</h3>
        <p>
          {debug.bundleCount} bundles / {debug.bundledRows.toLocaleString()} rows. Artifacts generated once for seed <strong>{debug.seed}</strong>.
        </p>
        {debug.annualPipeline ? (
          <p>
            Annual pipeline armed for draft year {debug.annualPipeline.lastGeneratedDraftYear} using {debug.annualPipeline.runtimeCsvs.length} normal runtime CSVs; schema checked {debug.annualPipeline.schemaValidatedColumns} columns across {debug.annualPipeline.schemaValidatedCsvs} CSVs.
          </p>
        ) : null}
        {debug.annualTransferPortal ? (
          <p>
            Annual transfer board: {debug.annualTransferPortal.entries} entries for {debug.annualTransferPortal.seasonYear}, {debug.annualTransferPortal.collegeEntries} college-sourced and {debug.annualTransferPortal.committedEntries} committed, avg top destination {debug.annualTransferPortal.averageTopDestinationScore}.
          </p>
        ) : null}
        {debug.annualRecruiting ? (
          <p>
            Annual recruiting: {debug.annualRecruiting.boardEntries.toLocaleString()} board entries in {debug.annualRecruiting.currentPhase}, {debug.annualRecruiting.visitedEntries.toLocaleString()} visits, {debug.annualRecruiting.promisedEntries.toLocaleString()} promises, avg need {debug.annualRecruiting.averagePositionNeed}, avg NIL demand {debug.annualRecruiting.averageNilDemand}, avg academic fit {debug.annualRecruiting.averageAcademicFit}, avg class target {debug.annualRecruiting.averageTargetClassSize}, {debug.annualRecruiting.signedEntries.toLocaleString()} signed and {debug.annualRecruiting.committedEntries.toLocaleString()} committed.
          </p>
        ) : null}
        {debug.annualRecruitClass ? (
          <p>
            Annual recruit class: {debug.annualRecruitClass.recruits.toLocaleString()} recruits, including {debug.annualRecruitClass.fiveStars.toLocaleString()} five-stars and {debug.annualRecruitClass.fourStars.toLocaleString()} four-stars; {debug.annualRecruitClass.ratingInputCoverage.toLocaleString()} with rating-input maps and {debug.annualRecruitClass.convertedBroadPositions.toLocaleString()} broad-position conversions.
          </p>
        ) : null}
        {debug.annualRosterImportPlan ? (
          <p>
            Annual import plan: {debug.annualRosterImportPlan.entries.toLocaleString()} roster handoff entries, {debug.annualRosterImportPlan.plannedEntries.toLocaleString()} ready, {debug.annualRosterImportPlan.deferredEntries.toLocaleString()} deferred.
          </p>
        ) : null}
        {debug.schoolProfiles ? (
          <p>
            School profiles: {debug.schoolProfiles.profiles.toLocaleString()} active profiles, {debug.schoolProfiles.csvMatchedProfiles.toLocaleString()} CSV-matched and {debug.schoolProfiles.repoAdaptedProfiles.toLocaleString()} deterministic repo-adapted; {debug.schoolProfiles.archetypeProfiles.toLocaleString()} have archetype/template fields, avg development {debug.schoolProfiles.averageDevelopment}, avg portal aggression {debug.schoolProfiles.averagePortalAggression}; schema checked {debug.schoolProfiles.schemaValidatedColumns} columns across {debug.schoolProfiles.schemaValidatedCsvs} CSVs.
          </p>
        ) : null}
        {debug.collegeRoster ? (
          <p>
            College roster state: {debug.collegeRoster.players.toLocaleString()} players on the college scale, {debug.collegeRoster.annualSignees.toLocaleString()} annual signees.
            {debug.collegeRoster.lastProgression ? ` Last progression declared ${debug.collegeRoster.lastProgression.draftDeclarations.toLocaleString()} players for the ${debug.collegeRoster.lastProgression.draftYear} draft, redshirted ${debug.collegeRoster.lastProgression.redshirtedPlayers.toLocaleString()}, added ${debug.collegeRoster.lastProgression.walkOnsAdded.toLocaleString()} walk-ons, cut ${debug.collegeRoster.lastProgression.cutPlayers.toLocaleString()}, and marked ${(debug.collegeRoster.lastProgression.academicIneligiblePlayers ?? 0).toLocaleString()} academically ineligible.` : ""}
          </p>
        ) : null}
        {debug.collegeSeasonResults ? (
          <p>
            College season results: {debug.collegeSeasonResults.production.toLocaleString()} production rows, {debug.collegeSeasonResults.starters.toLocaleString()} starters, avg snap share {debug.collegeSeasonResults.averageSnapShare}, {debug.collegeSeasonResults.awards.toLocaleString()} awards ({debug.collegeSeasonResults.awardGroups.join(", ") || "no groups"}, draft bonus {debug.collegeSeasonResults.totalAwardDraftBonus}), {debug.collegeSeasonResults.injuries.toLocaleString()} injuries ({debug.collegeSeasonResults.recurrenceTaggedInjuries.toLocaleString()} recurrence-tagged, avg recurrence {Math.round(debug.collegeSeasonResults.averageRecurrenceRisk * 100)}%, avg wear {debug.collegeSeasonResults.averageLongTermWear}).
          </p>
        ) : null}
        {debug.collegeMorale ? (
          <p>
            College morale: {debug.collegeMorale.entries.toLocaleString()} players, {debug.collegeMorale.lowMorale.toLocaleString()} low morale, {debug.collegeMorale.highTransferRisk.toLocaleString()} high transfer risk, avg promise pressure {debug.collegeMorale.averagePromisePressure}.
          </p>
        ) : null}
        {debug.collegeTraining ? (
          <p>
            College training banks: {debug.collegeTraining.entries.toLocaleString()} entries, avg technical {debug.collegeTraining.averageTechnicalBank}, avg fatigue {debug.collegeTraining.averageFatigue}.
          </p>
        ) : null}
        {debug.draftEvaluation ? (
          <p>
            Draft evaluation: {debug.draftEvaluation.results.toLocaleString()} prospects, {debug.draftEvaluation.allStarInvites.toLocaleString()} all-star invites ({debug.draftEvaluation.allStarEvents.join(", ") || "none"}), competition tiers {debug.draftEvaluation.competitionTiers.join(", ") || "none"}, average combine {debug.draftEvaluation.averageCombine}, {debug.draftEvaluation.draftRuntimeCsvs} draft runtime CSVs.
          </p>
        ) : null}
      </div>
      <div className="year-zero-debug-grid">
        <span><strong>{debug.artifactCounts.collegePlayers.toLocaleString()}</strong> college players</span>
        <span><strong>{debug.artifactCounts.highSchoolRecruits.toLocaleString()}</strong> HS recruits</span>
        <span><strong>{debug.artifactCounts.draftClass.toLocaleString()}</strong> draft prospects</span>
        <span><strong>{debug.artifactCounts.nflPlayers.toLocaleString()}</strong> NFL players</span>
      </div>
      <div className="year-zero-invariants">
        <strong>{passed}/{invariantEntries.length} invariants passing</strong>
        {invariantEntries.map(([key, ok]) => (
          <span key={key} className={ok ? "ok" : "warn"}>{ok ? "OK" : "Check"} {key}</span>
        ))}
      </div>
      <div className="year-zero-invariants">
        <strong>Pipeline scheduler: {debug.pipelineScheduler.phaseGates.filter((gate) => gate.status === "complete").length}/{debug.pipelineScheduler.phaseGates.length} gates complete</strong>
        {debug.pipelineScheduler.phaseGates.map((gate) => (
          <span key={gate.eventId} className={gate.status === "complete" ? "ok" : gate.status === "ready" ? "warn" : "danger"} title={`${gate.phase} week ${gate.weekHint} | ${gate.engineEffect}`}>{gate.status} {gate.eventId}</span>
        ))}
      </div>
      <div className="year-zero-invariants">
        <strong>Runtime governance: {debug.runtimeGovernance.violations.length === 0 ? "clean" : `${debug.runtimeGovernance.violations.length} violation(s)`}</strong>
        <span className={debug.runtimeGovernance.violations.length === 0 ? "ok" : "danger"} title={debug.runtimeGovernance.runtimeCsvs.join(", ")}>superseded blocked {debug.runtimeGovernance.supersededFilesBlocked}</span>
        <span className="ok">removed patterns {debug.runtimeGovernance.removedPatternsBlocked}</span>
        <span className="ok">precedence rules {debug.runtimeGovernance.precedenceRules}</span>
        <span className="ok">provenance {debug.runtimeGovernance.provenanceCoveredActiveCsvs}/{debug.runtimeGovernance.activeRuntimeCsvs}</span>
      </div>
      <div className="year-zero-invariants">
        <strong>Balance metrics: {debug.pipelineScheduler.balanceMetrics.filter((metric) => metric.status === "within_range").length}/{debug.pipelineScheduler.balanceMetrics.length} in range</strong>
        {debug.pipelineScheduler.balanceMetrics.map((metric) => (
          <span key={metric.metric} className={metric.status === "within_range" ? "ok" : metric.status === "missing" ? "danger" : "warn"} title={`target ${metric.lowerBound}-${metric.upperBound}, mean ${metric.targetMean}`}>{metric.metric}: {metric.actual}</span>
        ))}
      </div>
      <div className="year-zero-invariants">
        <strong>Self-audit: {implementedAudit} implemented, {partialAudit} partial, {debug.selfAudit.length - implementedAudit - partialAudit} pending</strong>
        {debug.selfAudit.slice(0, 10).map((row) => (
          <span key={row.requirement} className={row.status === "Implemented" ? "ok" : row.status === "Partially Implemented" ? "warn" : "danger"} title={`${row.filesChanged} | ${row.finalPhaseTests}`}>{row.status} {row.requirement}</span>
        ))}
      </div>
      <button type="button" onClick={downloadDebugExport}>Export Year Zero Debug JSON</button>
    </article>
  );
}

function RatingPill({ value, compact = false }: { value: number; compact?: boolean }) {
  const tier = ratingTierFor(value);
  return (
    <span className={`rating-pill tier-${tier.id}`} title={`${tier.label}: ${tier.description}`}>
      <strong>{value}</strong>
      {!compact ? <small>{tier.label}</small> : null}
    </span>
  );
}

function PositionFitBadges({ item, max = 4, includePrimary = false }: { item: Player | GameSave["prospects"][number]; max?: number; includePrimary?: boolean }) {
  const positions = eligiblePositionsFor(item).filter((position) => includePrimary || position !== item.position);
  const shown = positions.slice(0, max);
  if (!shown.length) return null;
  return (
    <span className="position-fit-badges">
      {shown.map((position) => {
        const effective = effectiveOverallAtPosition(item, position);
        return (
          <span key={position} className={`position-fit-badge ${isPrimaryPosition(item, position) ? "primary" : ""}`} title={`${position} effective OVR ${effective}`}>
            {position} {effective}
          </span>
        );
      })}
      {positions.length > shown.length ? <span className="position-fit-badge muted">+{positions.length - shown.length}</span> : null}
    </span>
  );
}

function PlayerRatingBreakdown({ player }: { player: Player }) {
  return (
    <details className="rating-details">
      <summary>Ratings</summary>
      <div className="development-line">
        <span>{ratingTierLabel(player.overall)} OVR</span>
        <span>{ratingTierLabel(player.potential)} POT</span>
        <span>{player.development.style}</span>
        <span>Med {playerMedical(player)}</span>
        <span>Work {player.development.workEthic}</span>
        <span>Learn {player.development.learning}</span>
      </div>
      <div className="development-line position-fit-line">
        <span>Eligible</span>
        <PositionFitBadges item={player} includePrimary max={8} />
      </div>
      <div className="rating-groups">
        {ratingsByGroup().map(({ group, ratings }) => (
          <div key={group} className="rating-group">
            <h4>{group}</h4>
            {ratings.map((rating) => (
              <span key={rating.key}>
                {rating.label}
                <strong>{ratingValue(player.ratings, rating.key as RatingKey)}</strong>
              </span>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function DevelopmentReportPanel({ save }: { save: GameSave }) {
  void save;
  return null;
}

function ProspectRatingBreakdown({ prospect, showProgress = true }: { prospect: GameSave["prospects"][number]; showProgress?: boolean }) {
  return (
    <details className="rating-details">
      <summary>Scouted Ratings</summary>
      <div className="development-line">
        <span>OVR {prospect.scouted.low}-{prospect.scouted.high}</span>
        <span>POT {prospect.scouted.potentialLow}-{prospect.scouted.potentialHigh}</span>
        <span>{prospect.development.style}</span>
        {showProgress ? <span>Progress {prospect.scouted.progress ?? prospect.scouted.confidence}%</span> : null}
      </div>
      <div className="development-line position-fit-line">
        <span>Eligible</span>
        <PositionFitBadges item={prospect} includePrimary max={8} />
      </div>
      <div className="concern-range-grid">
        <ConcernRangePill concernType="medical" label="Medical" range={prospect.scouted.concerns.medical} />
        <ConcernRangePill concernType="character" label="Character" range={prospect.scouted.concerns.character} />
        <ConcernRangePill concernType="workEthic" label="Work Ethic" range={prospect.scouted.concerns.workEthic} />
      </div>
      {prospect.scouted.bodyRanges ? (
        <div className="roster-detail-stats prospect-body-grid">
          <span><small>Height</small><strong>{formatHeight(prospect.scouted.bodyRanges.heightInches[0])}</strong></span>
          <span><small>Weight</small><strong>{prospect.scouted.bodyRanges.weightLbs[0]}-{prospect.scouted.bodyRanges.weightLbs[1]}</strong></span>
          <span><small>Muscle</small><strong>{prospect.scouted.bodyRanges.musclePct[0]}-{prospect.scouted.bodyRanges.musclePct[1]}%</strong></span>
          <span><small>Body Fat</small><strong>{prospect.scouted.bodyRanges.bodyFatPct[0]}-{prospect.scouted.bodyRanges.bodyFatPct[1]}%</strong></span>
          <span><small>Cond</small><strong>{prospect.scouted.bodyRanges.conditioning[0]}-{prospect.scouted.bodyRanges.conditioning[1]}</strong></span>
          <span><small>Flex</small><strong>{prospect.scouted.bodyRanges.flexibility[0]}-{prospect.scouted.bodyRanges.flexibility[1]}</strong></span>
        </div>
      ) : null}
      {prospect.scouted.conversionUpside?.length ? (
        <div className="development-line position-fit-line">
          <span>Conversion</span>
          <span className="position-fit-badges">
            {prospect.scouted.conversionUpside.slice(0, 4).map((option) => (
              <span key={option.targetPosition} className="position-fit-badge">{option.targetPosition} {option.fit}</span>
            ))}
          </span>
        </div>
      ) : null}
      <div className="rating-groups">
        {ratingsByGroup().map(({ group, ratings }) => (
          <div key={group} className="rating-group">
            <h4>{group}</h4>
            {ratings.map((rating) => (
              <span key={rating.key}>
                {rating.label}
                <strong>{ratingRangeLabel(prospect.scouted.ratingRanges, rating.key as RatingKey)}</strong>
              </span>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function DossierLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="roster-dossier-line">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function DraftProspectDetailModal({ prospect, school, action, activeTab }: { prospect: GameSave["prospects"][number]; school?: CollegeProgram; action: ReactNode; activeTab: DraftProspectModalTab }) {
  const trend = prospect.productionTrend > 0 ? `+${prospect.productionTrend}` : String(prospect.productionTrend);
  const ratingGroups = ratingsByGroup()
    .map(({ group, ratings }) => ({
      group,
      ratings: ratings
        .map((rating) => ({
          key: rating.key,
          label: rating.label,
          value: ratingRangeLabel(prospect.scouted.ratingRanges, rating.key as RatingKey)
        }))
        .filter((rating) => rating.value !== "--")
    }))
    .filter(({ ratings }) => ratings.length);

  return (
    <div className="roster-detail-panel roster-detail-panel-single draft-prospect-card">
      {activeTab === "overview" ? (
        <>
          <section className="roster-dossier-card draft-prospect-section">
            <h4>Snapshot</h4>
            <div className="roster-dossier-grid roster-overview-grid draft-prospect-metric-grid">
              <DossierLine label="OVR" value={`${prospect.scouted.low}-${prospect.scouted.high}`} />
              <DossierLine label="POT" value={`${prospect.scouted.potentialLow}-${prospect.scouted.potentialHigh}`} />
              <DossierLine label="Dev" value={prospect.development.style} />
              <DossierLine label="Round" value={`R${prospect.projectedRound}`} />
              <DossierLine label="Production" value={prospect.production} />
              <DossierLine label="Trend" value={trend} />
            </div>
          </section>

          <section className="roster-dossier-card draft-prospect-section">
            <h4>Context</h4>
            <div className="roster-dossier-grid roster-overview-grid draft-prospect-info-grid">
              <DossierLine label="School" value={school?.name ?? "Unknown"} />
              <DossierLine label="Conference" value={school?.conference ?? "Unknown"} />
              <DossierLine label="Region" value={prospect.region} />
              <DossierLine label="Team Rank" value={`#${prospect.teamRank}`} />
              <DossierLine label="NFL Rank" value={`#${prospect.consensusRank}`} />
              <DossierLine label="Progress" value={`${prospect.scouted.progress ?? prospect.scouted.confidence}%`} />
            </div>
          </section>

          {prospect.scouted.bodyRanges ? (
        <section className="roster-dossier-card draft-prospect-section">
          <h4>Body</h4>
          <div className="roster-dossier-grid roster-overview-grid draft-prospect-metric-grid compact">
            <DossierLine label="Height" value={formatHeight(prospect.scouted.bodyRanges.heightInches[0])} />
            <DossierLine label="Weight" value={`${prospect.scouted.bodyRanges.weightLbs[0]}-${prospect.scouted.bodyRanges.weightLbs[1]}`} />
            <DossierLine label="Muscle" value={`${prospect.scouted.bodyRanges.musclePct[0]}-${prospect.scouted.bodyRanges.musclePct[1]}%`} />
            <DossierLine label="Body Fat" value={`${prospect.scouted.bodyRanges.bodyFatPct[0]}-${prospect.scouted.bodyRanges.bodyFatPct[1]}%`} />
            <DossierLine label="Cond" value={`${prospect.scouted.bodyRanges.conditioning[0]}-${prospect.scouted.bodyRanges.conditioning[1]}`} />
            <DossierLine label="Flex" value={`${prospect.scouted.bodyRanges.flexibility[0]}-${prospect.scouted.bodyRanges.flexibility[1]}`} />
          </div>
        </section>
          ) : null}

          <section className="roster-dossier-card draft-prospect-section">
            <h4>Eligible Positions</h4>
            <div className="draft-position-fit-row">
              <PositionFitBadges item={prospect} includePrimary max={8} />
              {prospect.scouted.conversionUpside?.length ? (
                <div className="draft-conversion-row">
                  <small>Conversion</small>
                  <span className="position-fit-badges">
                    {prospect.scouted.conversionUpside.slice(0, 4).map((option) => (
                      <span key={option.targetPosition} className="position-fit-badge">{option.targetPosition} {option.fit}</span>
                    ))}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <div className="draft-modal-actions">
            {action}
          </div>
        </>
      ) : null}

      {activeTab === "scouting" ? (
        <>
          <section className="roster-dossier-card draft-prospect-section">
            <h4>Scouting Note</h4>
            <p className="draft-prospect-note">{prospect.scoutReports?.[0] ?? prospect.scouted.note}</p>
          </section>

          <section className="roster-dossier-card draft-prospect-section">
            <h4>Production Context</h4>
            <div className="roster-dossier-grid roster-overview-grid draft-prospect-info-grid">
              <DossierLine label="Production" value={prospect.production} />
              <DossierLine label="Trend" value={trend} />
              <DossierLine label="Progress" value={`${prospect.scouted.progress ?? prospect.scouted.confidence}%`} />
            </div>
          </section>

          <section className="roster-dossier-card draft-prospect-section">
            <h4>Concerns</h4>
            <div className="concern-pills draft-concern-pills">
              <ConcernRangePill concernType="medical" label="Medical" range={prospect.scouted.concerns.medical} />
              <ConcernRangePill concernType="character" label="Character" range={prospect.scouted.concerns.character} />
              <ConcernRangePill concernType="workEthic" label="Work" range={prospect.scouted.concerns.workEthic} />
              {!concernSignalForRange("medical", prospect.scouted.concerns.medical) &&
                !concernSignalForRange("character", prospect.scouted.concerns.character) &&
                !concernSignalForRange("workEthic", prospect.scouted.concerns.workEthic) ? <span className="draft-empty-note">No major concern flags.</span> : null}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "ratings" ? (
        <section className="roster-dossier-card draft-prospect-section">
          <h4>Ratings</h4>
          <div className="draft-rating-grid">
            {ratingGroups.map(({ group, ratings }) => (
              <div key={group} className="draft-rating-group">
                <h5>{group}</h5>
                <div>
                  {ratings.map((rating) => (
                    <span key={rating.key} className="draft-rating-row">
                      <small>{rating.label}</small>
                      <strong>{rating.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ConcernRangePill({ concernType, label, range }: { concernType: ProspectConcernKey; label?: string; range: [number, number] }) {
  const signal = concernSignalForRange(concernType, range);
  if (!signal) return null;
  return (
    <span className={`concern-pill concern-${signal.tone} concern-${signal.band}`} title={signal.description}>
      <span className="concern-symbol">{signal.symbol}</span>
      {label ?? signal.label}
      <strong>{range[0]}-{range[1]}</strong>
    </span>
  );
}

function ValueBadge({ prospect }: { prospect: GameSave["prospects"][number] }) {
  const tone = prospect.valuePickScore >= 40 ? "good" : prospect.valuePickScore <= -20 ? "risk" : prospect.valuePickScore >= 15 ? "average" : "neutral";
  return (
    <span className={`value-badge value-${tone}`}>
      {prospect.valuePickLabel}
      <strong>{prospect.valuePickScore > 0 ? `+${prospect.valuePickScore}` : prospect.valuePickScore}</strong>
    </span>
  );
}

function ScoutingProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span className="scouting-progress">
      <i style={{ width: `${clamped}%` }} />
      <strong>{clamped}%</strong>
    </span>
  );
}

type SortDirection = "asc" | "desc";
type SortState<T extends string> = { key: T; direction: SortDirection };

function sortableValueCompare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortMultiplier(direction: SortDirection): number {
  return direction === "asc" ? 1 : -1;
}

function toggleSortState<T extends string>(current: SortState<T>, key: T, defaultDirection: SortDirection = "desc"): SortState<T> {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: defaultDirection };
}

function playerName(player: Pick<Player, "firstName" | "lastName">): string {
  return `${player.lastName}, ${player.firstName}`;
}

function SortableHeader<T extends string>({
  label,
  sortKey,
  sort,
  setSort,
  defaultDirection = "desc"
}: {
  label: string;
  sortKey: T;
  sort: SortState<T>;
  setSort: (sort: SortState<T>) => void;
  defaultDirection?: SortDirection;
}) {
  const active = sort.key === sortKey;
  return (
    <th aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className={`table-sort-button${active ? " active" : ""}`}
        onClick={() => setSort(toggleSortState(sort, sortKey, defaultDirection))}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="table-sort-arrow" aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );
}

export type RosterSort = "overall" | "potential" | "age" | "position";
type RosterSortKey = "name" | "position" | "age" | "overall" | "potential" | "contract" | "ywt" | "experience";
type PracticeSquadSortKey = "name" | "position" | "age" | "overall" | "potential";
type DevelopmentSortKey = "name" | "position" | "age" | "overall" | "potential" | "playingTime" | "health";
type CollegeDevelopmentSortKey = "name" | "position" | "class" | "overall" | "potential" | "academic" | "portal";
type FreeAgentSortKey = "name" | "position" | "age" | "overall" | "potential" | "ask" | "years" | "interest" | "salary";
type RosterCompositionMode = "active" | "practice";
type RosterCompositionGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "EDGE" | "DL" | "LB" | "CB" | "S" | "K" | "P";
type RosterRangeFilter = "all" | "90+" | "80-89" | "70-79" | "60-69" | "under-60";
type RosterAgeFilter = "all" | "24-under" | "25-28" | "29-32" | "33-plus";
type RosterStatusFilter = "all" | "healthy" | "limited" | "injured" | "ir" | "suspended" | "practice";
type RosterExperienceFilter = "all" | "rookie" | "1-3" | "4-6" | "7-plus";
type FreeAgentSalaryFilter = "all" | "under-2" | "2-5" | "5-10" | "10-plus";
type ActiveFilter = { label: string; clear: () => void };

type RosterModalTab = "overview" | "contract" | "ratings" | "stats" | "medical";

function isActiveFilter(item: ActiveFilter | undefined): item is ActiveFilter {
  return Boolean(item);
}

const rosterCompositionGroups: RosterCompositionGroup[] = ["QB", "RB", "WR", "TE", "OL", "K", "P", "EDGE", "DL", "LB", "CB", "S"];
const rosterCompositionSections: Array<{ label: string; groups: RosterCompositionGroup[] }> = [
  { label: "Offense", groups: ["QB", "RB", "WR", "TE", "OL"] },
  { label: "Defense", groups: ["EDGE", "DL", "LB", "CB", "S"] }
];
const rosterCompositionSpecialists: RosterCompositionGroup[] = ["K", "P"];

const activeRosterCompositionTargets: Record<RosterCompositionGroup, number> = {
  QB: 3,
  RB: 4,
  WR: 6,
  TE: 3,
  OL: 9,
  EDGE: 4,
  DL: 5,
  LB: 7,
  CB: 5,
  S: 5,
  K: 1,
  P: 1
};

const practiceRosterCompositionTargets: Record<RosterCompositionGroup, number> = {
  QB: 1,
  RB: 1,
  WR: 2,
  TE: 1,
  OL: 3,
  EDGE: 1,
  DL: 2,
  LB: 2,
  CB: 2,
  S: 1,
  K: 0,
  P: 0
};

function rosterCompositionGroupForPosition(position: Position): RosterCompositionGroup {
  if (position === "LT" || position === "LG" || position === "C" || position === "RG" || position === "RT") return "OL";
  if (position === "EDGE") return "EDGE";
  if (position === "DL") return "DL";
  return position as RosterCompositionGroup;
}

function rosterCompositionRows(players: Player[], targets: Record<RosterCompositionGroup, number>) {
  const counts = new Map<RosterCompositionGroup, number>(rosterCompositionGroups.map((group) => [group, 0]));
  for (const player of players) {
    const group = rosterCompositionGroupForPosition(player.position);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return rosterCompositionGroups.map((group) => {
    const count = counts.get(group) ?? 0;
    const target = targets[group];
    return { group, count, target, underTarget: target > 0 && count < target };
  });
}

function rosterRangeMatch(value: number, filter: RosterRangeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "90+") return value >= 90;
  if (filter === "80-89") return value >= 80 && value <= 89;
  if (filter === "70-79") return value >= 70 && value <= 79;
  if (filter === "60-69") return value >= 60 && value <= 69;
  return value < 60;
}

function rosterAgeMatch(age: number, filter: RosterAgeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "24-under") return age <= 24;
  if (filter === "25-28") return age >= 25 && age <= 28;
  if (filter === "29-32") return age >= 29 && age <= 32;
  return age >= 33;
}

function rosterExperienceYears(player: Player): number {
  if (player.traits.includes("Rookie")) return 0;
  return Math.max(1, player.age - 21);
}

function rosterExperienceLabel(player: Player): string {
  const years = rosterExperienceYears(player);
  return years === 0 ? "Rookie" : `${years}Y`;
}

function rosterExperienceMatch(player: Player, filter: RosterExperienceFilter): boolean {
  const years = rosterExperienceYears(player);
  if (filter === "all") return true;
  if (filter === "rookie") return years === 0;
  if (filter === "1-3") return years >= 1 && years <= 3;
  if (filter === "4-6") return years >= 4 && years <= 6;
  return years >= 7;
}

function freeAgentSalaryMatch(salary: number, filter: FreeAgentSalaryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "under-2") return salary < 2;
  if (filter === "2-5") return salary >= 2 && salary <= 5;
  if (filter === "5-10") return salary > 5 && salary <= 10;
  return salary > 10;
}

function rosterStatusMatch(player: Player, filter: RosterStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "healthy") return player.status === "active" && !isOnIr(player);
  if (filter === "ir") return isOnIr(player);
  if (filter === "practice") return isPracticeSquadPlayer(player);
  return player.status === filter;
}

function rosterStatusSymbol(player: Player): { symbol: string; label: string } | undefined {
  if (isOnIr(player)) return { symbol: "IR", label: medicalStatusLabel(player) };
  if (player.status === "injured") return { symbol: "!", label: medicalStatusLabel(player) };
  if (player.status === "limited") return { symbol: "~", label: medicalStatusLabel(player) };
  if (player.status === "suspended") return { symbol: "X", label: medicalStatusLabel(player) };
  if (player.status === "elevated") return { symbol: "UP", label: "Elevated from practice squad" };
  if (isPracticeSquadPlayer(player)) return { symbol: "P", label: "Practice squad" };
  return undefined;
}

export function rosterSortPlayers(players: Player[], sort: RosterSort, practiceSquadLast = false): Player[] {
  return players.slice().sort((a, b) => {
    if (practiceSquadLast) {
      const statusOrder = Number(isPracticeSquadPlayer(a)) - Number(isPracticeSquadPlayer(b));
      if (statusOrder !== 0) return statusOrder;
    }
    if (sort === "potential") return b.potential - a.potential || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "age") return a.age - b.age || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "position") return a.position.localeCompare(b.position) || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    return b.overall - a.overall || b.potential - a.potential || a.lastName.localeCompare(b.lastName);
  });
}

function compareRosterPlayers(save: GameSave, sort: SortState<RosterSortKey>, practiceSquadLast = false) {
  return (a: Player, b: Player) => {
    if (practiceSquadLast) {
      const statusOrder = Number(isPracticeSquadPlayer(a)) - Number(isPracticeSquadPlayer(b));
      if (statusOrder !== 0) return statusOrder;
    }
    const values: Record<RosterSortKey, [string | number, string | number]> = {
      name: [playerName(a), playerName(b)],
      position: [a.position, b.position],
      age: [a.age, b.age],
      overall: [a.overall, b.overall],
      potential: [a.potential, b.potential],
      contract: [playerCapHit(a, save.seasonYear) || a.salary, playerCapHit(b, save.seasonYear) || b.salary],
      ywt: [yearsWithTeam(save, a), yearsWithTeam(save, b)],
      experience: [rosterExperienceYears(a), rosterExperienceYears(b)]
    };
    const primary = sortableValueCompare(values[sort.key][0], values[sort.key][1]) * sortMultiplier(sort.direction);
    if (primary !== 0) return primary;
    return playerName(a).localeCompare(playerName(b));
  };
}

function comparePracticeSquadPlayers(sort: SortState<PracticeSquadSortKey>) {
  return (a: Player, b: Player) => {
    const values: Record<PracticeSquadSortKey, [string | number, string | number]> = {
      name: [playerName(a), playerName(b)],
      position: [a.position, b.position],
      age: [a.age, b.age],
      overall: [a.overall, b.overall],
      potential: [a.potential, b.potential]
    };
    const primary = sortableValueCompare(values[sort.key][0], values[sort.key][1]) * sortMultiplier(sort.direction);
    if (primary !== 0) return primary;
    return playerName(a).localeCompare(playerName(b));
  };
}

function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainder = inches % 12;
  return `${feet}'${remainder}"`;
}

function contractEndYear(save: GameSave, player: Player): number {
  return player.contract?.endYear ?? (save.seasonYear + Math.max(1, player.contractYears) - 1);
}

function contractSummary(save: GameSave, player: Player): string {
  const hit = playerCapHit(player, save.seasonYear) || player.salary;
  return `$${hit.toFixed(2)}M cap hit thru ${contractEndYear(save, player)}`;
}

function yearsWithTeam(save: GameSave, player: Player): number {
  return Math.max(1, save.seasonYear - (player.teamStartSeason ?? save.seasonYear) + 1);
}

function playerDraftYear(save: GameSave, player: Player): number {
  return player.draftYear ?? (save.seasonYear - rosterExperienceYears(player));
}

function totalNflYears(save: GameSave, player: Player): number {
  return Math.max(1, save.seasonYear - playerDraftYear(save, player) + 1);
}

function remainingContractRows(save: GameSave, player: Player): Array<{ year: number; base: number; bonus: number; guarantee: number; capHit: number; label: string }> {
  const seasons = player.contract?.seasons?.filter((season) => season.seasonYear >= save.seasonYear);
  if (seasons?.length) {
    return seasons.map((season, index) => ({
      year: season.seasonYear,
      base: season.baseSalary,
      bonus: season.signingBonusProration,
      guarantee: season.guaranteedSalary,
      capHit: season.baseSalary + season.signingBonusProration,
      label: season.voidYear ? "Void year" : season.optionYear ? "Option year" : index === 0 ? "Current year" : `Year ${index + 1}`
    }));
  }
  return Array.from({ length: Math.max(1, player.contractYears) }, (_, index) => ({
    year: save.seasonYear + index,
    base: player.salary,
    bonus: 0,
    guarantee: index === 0 ? player.salary : 0,
    capHit: player.salary,
    label: index === 0 ? "Current year" : `Year ${index + 1}`
  }));
}

function DevelopmentView({ save }: { save: GameSave }) {
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  const [sort, setSort] = useState<SortState<DevelopmentSortKey>>({ key: "overall", direction: "desc" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rows = useMemo(() => {
    const players = playersForTeam(save, save.selectedTeamId)
      .filter((player) => positionFilter === "all" || player.position === positionFilter)
      .filter((player) => statusFilter === "all" || rosterStatusMatch(player, statusFilter));
    return players.sort((a, b) => {
      const values: Record<DevelopmentSortKey, [string | number, string | number]> = {
        name: [playerName(a), playerName(b)],
        position: [a.position, b.position],
        age: [a.age, b.age],
        overall: [a.overall, b.overall],
        potential: [a.potential, b.potential],
        playingTime: [a.stats.snaps, b.stats.snaps],
        health: [medicalStatusLabel(a), medicalStatusLabel(b)]
      };
      const primary = sortableValueCompare(values[sort.key][0], values[sort.key][1]) * sortMultiplier(sort.direction);
      if (primary !== 0) return primary;
      return playerName(a).localeCompare(playerName(b));
    });
  }, [positionFilter, save, sort, statusFilter]);
  const activeFilterItems: Array<ActiveFilter | undefined> = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    statusFilter !== "all" ? { label: statusFilter === "healthy" ? "Healthy only" : statusFilter, clear: () => setStatusFilter("all") } : undefined
  ];
  const activeFilters = activeFilterItems.filter(isActiveFilter);
  return (
    <section className="view-stack development-workspace">
      <div className="roster-command-bar development-command-bar">
        <FilterButton count={activeFilters.length} onClick={() => setFiltersOpen(true)} />
        <span className="read-only-chip">{rows.length} players shown</span>
      </div>
      <section className="table-card development-table-card">
        <DataTable>
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="name" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="Pos" sortKey="position" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="Age" sortKey="age" sort={sort} setSort={setSort} defaultDirection="asc" />
              <SortableHeader label="OVR" sortKey="overall" sort={sort} setSort={setSort} />
              <SortableHeader label="POT" sortKey="potential" sort={sort} setSort={setSort} />
              <SortableHeader label="Playing Time" sortKey="playingTime" sort={sort} setSort={setSort} />
              <SortableHeader label="Health" sortKey="health" sort={sort} setSort={setSort} defaultDirection="asc" />
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong></td>
                <td>{player.position}</td>
                <td>{player.age}</td>
                <td><strong>{player.overall}</strong></td>
                <td><strong>{player.potential}</strong></td>
                <td>{player.stats.snaps ? `${player.stats.snaps.toLocaleString()} snaps` : isPracticeSquadPlayer(player) ? "Practice" : "Needs reps"}</td>
                <td>{medicalStatusLabel(player)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
      {filtersOpen ? (
        <FilterModal
          title="Development Filters"
          activeFilters={activeFilters}
          clearAll={() => {
            setPositionFilter("all");
            setStatusFilter("all");
          }}
          close={() => setFiltersOpen(false)}
        >
          <label className="roster-select-field">
            <span>Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All</option>
              {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
          <label className="roster-select-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RosterStatusFilter)}>
              <option value="all">All</option>
              <option value="healthy">Healthy</option>
              <option value="limited">Limited</option>
              <option value="injured">Injured</option>
              <option value="ir">IR</option>
              <option value="practice">Practice</option>
            </select>
          </label>
        </FilterModal>
      ) : null}
    </section>
  );
}

function RosterFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="roster-filter-chip" onClick={onClear}>
      {label}
      <span aria-hidden="true">x</span>
    </button>
  );
}

function FilterButton({ count, onClick, label = "Filter" }: { count: number; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="filter-modal-trigger" onClick={onClick}>
      {label}
      {count ? <span>{count}</span> : null}
    </button>
  );
}

function FilterModal({
  title,
  activeFilters,
  clearAll,
  close,
  children
}: {
  title: string;
  activeFilters: Array<{ label: string; clear: () => void }>;
  clearAll: () => void;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={close}>
      <article className="roster-modal filter-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="roster-modal-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h3>{title}</h3>
          </div>
        </div>
        <div className="filter-modal-grid">
          {children}
        </div>
        {activeFilters.length ? (
          <div className="roster-active-filters filter-modal-active-filters">
            {activeFilters.map((filter) => (
              <RosterFilterChip key={filter.label} label={filter.label} onClear={filter.clear} />
            ))}
          </div>
        ) : null}
        <div className="trade-modal-actions">
          <button type="button" disabled={!activeFilters.length} onClick={clearAll}>Clear Filters</button>
          <button type="button" onClick={close}>Done</button>
        </div>
      </article>
    </div>
  );
}

function RosterCompositionModal({
  title,
  players,
  targets,
  close
}: {
  title: string;
  players: Player[];
  targets: Record<RosterCompositionGroup, number>;
  close: () => void;
}) {
  const rows = rosterCompositionRows(players, targets);
  const rowByGroup = new Map(rows.map((row) => [row.group, row]));
  const renderCompositionItem = (group: RosterCompositionGroup) => {
    const row = rowByGroup.get(group)!;
    return (
      <span key={row.group} className={`roster-composition-item${row.underTarget ? " composition-under" : ""}`}>
        <strong>{row.group}</strong>
        <span className="roster-composition-count">
          {row.count}<span>/{row.target}</span>
        </span>
      </span>
    );
  };
  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={close}>
      <article className="roster-modal roster-composition-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="roster-composition-header">
          <div>
            <p className="eyebrow">Roster</p>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={close}>Close</button>
        </div>
        <div className="roster-composition-body" aria-label={`${title} position counts`}>
          <div className="roster-composition-grid">
            {rosterCompositionSections.map((section) => (
              <section key={section.label} className="roster-composition-section" aria-label={section.label}>
                <span className="roster-composition-section-title">{section.label}</span>
                <div className="roster-composition-list">
                  {section.groups.map(renderCompositionItem)}
                </div>
              </section>
            ))}
          </div>
          <div className="roster-composition-specialists" aria-label="Specialists">
            <span className="roster-composition-section-title">Specialists</span>
            <div className="roster-composition-specialist-list">
              {rosterCompositionSpecialists.map(renderCompositionItem)}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function PlayerRatingsDetails({ player, summary = "Ratings Breakdown" }: { player: Player; summary?: string }) {
  return (
    <details className="player-ratings-disclosure">
      <summary>{summary}</summary>
      <div className="rating-groups">
        {ratingsByGroup().map(({ group, ratings }) => (
          <div key={group} className="rating-group">
            <h4>{group}</h4>
            {ratings.map((rating) => (
              <span key={rating.key}>
                {rating.label}
                <strong>{ratingValue(player.ratings, rating.key as RatingKey)}</strong>
              </span>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function RosterOverviewTab({ player, save }: { player: Player; save: GameSave }) {
  const school = save.schools.find((candidate) => candidate.id === player.collegeId);
  const statusText = medicalStatusLabel(player);
  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Player File</p>
          <strong>Background And Build</strong>
        </div>
        <div className="roster-overview-hero">
          <div className="roster-overview-college-logo">
            <CollegeLogo school={school} size={92} />
          </div>
          <div className="roster-detail-meta roster-overview-flavor">
            <span>{school?.name ?? "Unknown College"}</span>
            <span>{player.position}</span>
            <span>{rosterExperienceLabel(player)}</span>
            <span>{player.development.style}</span>
          </div>
        </div>
        <div className="roster-dossier-grid roster-overview-grid">
          <div className="roster-dossier-line">
            <small>Age</small>
            <strong>{player.age}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Height</small>
            <strong>{formatHeight(player.body.heightInches)}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Weight</small>
            <strong>{player.body.weightLbs}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>YWT</small>
            <strong>{yearsWithTeam(save, player)}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>NFL Years</small>
            <strong>{totalNflYears(save, player)}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Draft Year</small>
            <strong>{playerDraftYear(save, player)}</strong>
          </div>
        </div>
        <div className="roster-detail-meta roster-overview-statusline">
          <span className={`medical-pill medical-${medicalRiskTier(playerMedical(player))}`}>Medical {playerMedical(player)}</span>
          <span>{statusText}</span>
          {isPracticeSquadPlayer(player) ? <span>Practice squad{player.practiceSquadElevatedWeek === save.currentWeek ? " | elevated this week" : ""}</span> : null}
          {isPracticeSquadPlayer(player) ? <span>Elevations {player.practiceSquadElevations ?? 0}/3</span> : null}
          {isPracticeSquadPlayer(player) && player.practiceSquadProtectedWeek === save.currentWeek ? <span>Protected this week</span> : null}
          {player.injury ? <span>{player.injury.name}</span> : null}
          {player.injuryWeeks > 0 ? <span>{player.injuryWeeks} wk</span> : null}
          {player.suspensionWeeks > 0 ? <span>{player.suspensionWeeks} gm</span> : null}
        </div>
      </section>
    </div>
  );
}

function playerDisplayName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function compactPlayerName(player: Player): string {
  return `${player.firstName[0]}. ${player.lastName}`;
}

type PlayerStatTableCategory = "passing" | "rushing" | "receiving" | "defense" | "kicking" | "punting";
type StatDisplayRow = {
  id: string;
  season: string;
  age: string | number;
  team: string;
  league: string;
  position: Position | string;
  stats: PlayerStats;
  awards: string[];
  total?: boolean;
  average?: boolean;
};
type StatColumn = {
  key: string;
  label: string;
  title?: string;
  value: (row: StatDisplayRow) => string | number;
  sortValue?: (row: StatDisplayRow) => number;
};

function primaryStatLine(stats: PlayerStats, position: Position): string {
  if (position === "QB") {
    return `${stats.passYards} YDS | ${stats.passTouchdowns} TD | ${stats.interceptionsThrown} INT`;
  }
  if (["RB"].includes(position)) {
    return `${stats.rushYards} RUSH | ${stats.rushTouchdowns} TD | ${formatRate(rate(stats.rushYards, stats.rushAttempts), 1)} YPC`;
  }
  if (["WR", "TE"].includes(position)) {
    return `${stats.receptions} REC | ${stats.receivingYards} YDS | ${stats.receivingTouchdowns} TD`;
  }
  if (["K"].includes(position)) {
    return `${stats.fieldGoalsMade}/${stats.fieldGoalAttempts} FG | ${stats.extraPointsMade}/${stats.extraPointAttempts} XP`;
  }
  if (["P"].includes(position)) {
    return `${stats.punts} P | ${stats.puntYards} YDS | ${stats.puntInside20} I20`;
  }
  return `${stats.tackles} TKL | ${stats.sacks} SCK | ${stats.interceptions} INT`;
}

function advancedPlayerStatLine(stats: PlayerStats, position: Position): string {
  if (position === "QB") {
    return `CMP ${formatRate(rate(stats.passCompletions, stats.passAttempts, 100), 1, "%")} | Y/A ${formatRate(rate(stats.passYards, stats.passAttempts), 1)} | EFF ${formatRate(passingEfficiency(stats), 1)}`;
  }
  if (position === "RB") {
    return `YPC ${formatRate(rate(stats.rushYards, stats.rushAttempts), 1)} | FUM ${formatRate(rate(stats.fumbles, stats.rushAttempts, 100), 1, "%")}`;
  }
  if (["WR", "TE"].includes(position)) {
    return `Catch ${formatRate(rate(stats.receptions, stats.targets, 100), 1, "%")} | Y/R ${formatRate(rate(stats.receivingYards, stats.receptions), 1)} | Y/T ${formatRate(rate(stats.receivingYards, stats.targets), 1)}`;
  }
  if (position === "K") {
    return `FG ${formatRate(rate(stats.fieldGoalsMade, stats.fieldGoalAttempts, 100), 1, "%")} | XP ${formatRate(rate(stats.extraPointsMade, stats.extraPointAttempts, 100), 1, "%")}`;
  }
  if (position === "P") {
    return `AVG ${formatRate(rate(stats.puntYards, stats.punts), 1)} | I20 ${stats.puntInside20}`;
  }
  return `TKL/G ${formatRate(rate(stats.tackles, stats.games), 1)} | SCK/Snap ${formatRate(rate(stats.sacks, stats.defenseSnaps, 100), 2, "%")} | Splash ${stats.sacks + stats.interceptions + stats.forcedFumbles}`;
}

function teamAbbreviationFor(save: GameSave, teamId: string): string {
  return save.teams.find((team) => team.id === teamId)?.abbreviation ?? (teamId === FREE_AGENT_TEAM_ID ? "FA" : teamId.toUpperCase());
}

function scaleStatsPerGames(stats: PlayerStats, targetGames: number): PlayerStats {
  const games = Math.max(1, stats.games);
  const factor = targetGames / games;
  const scaled = normalizePlayerStats(stats);
  for (const key of Object.keys(scaled) as Array<keyof PlayerStats>) {
    scaled[key] = key === "games" ? targetGames : Number((scaled[key] * factor).toFixed(1));
  }
  return scaled;
}

function buildPlayerStatRows(player: Player, save: GameSave): StatDisplayRow[] {
  const currentCombined = mergePlayerStats(player.stats, player.playoffStats);
  const seasonRows: StatDisplayRow[] = [
    {
      id: `current-${player.id}`,
      season: `${save.seasonYear}`,
      age: player.age,
      team: teamAbbreviationFor(save, player.teamId),
      league: "NFL",
      position: player.position,
      stats: currentCombined,
      awards: []
    },
    ...(player.statHistory ?? []).map((entry) => ({
      id: entry.id,
      season: `${entry.seasonYear}`,
      age: entry.age,
      team: teamAbbreviationFor(save, entry.teamId),
      league: "NFL",
      position: entry.position,
      stats: mergePlayerStats(entry.stats, entry.playoffStats),
      awards: entry.awards ?? []
    }))
  ].filter((row) => row.stats.games || row.stats.snaps || row.id.startsWith("current"));
  const career = seasonRows.reduce((sum, row) => mergePlayerStats(sum, row.stats), normalizePlayerStats());
  const years = seasonRows.filter((row) => row.stats.games > 0 || row.stats.snaps > 0).length;
  return [
    ...seasonRows,
    {
      id: `career-${player.id}`,
      season: years ? `${years} Yrs` : "Career",
      age: "",
      team: "",
      league: "",
      position: "",
      stats: career,
      awards: [],
      total: true
    },
    {
      id: `avg17-${player.id}`,
      season: "17 Game Avg",
      age: "",
      team: "",
      league: "",
      position: "",
      stats: scaleStatsPerGames(career, 17),
      awards: [],
      average: true
    }
  ];
}

function playerStatColumns(category: PlayerStatTableCategory): StatColumn[] {
  const base: StatColumn[] = [
    { key: "season", label: "Season", value: (row) => row.season },
    { key: "age", label: "Age", value: (row) => row.age },
    { key: "team", label: "Team", value: (row) => row.team },
    { key: "league", label: "Lg", value: (row) => row.league },
    { key: "pos", label: "Pos", value: (row) => row.position },
    { key: "g", label: "G", value: (row) => formatStatNumber(row.stats.games, row.average ? 1 : 0), sortValue: (row) => row.stats.games },
    { key: "gs", label: "GS", value: (row) => formatStatNumber(row.stats.gamesStarted, row.average ? 1 : 0), sortValue: (row) => row.stats.gamesStarted }
  ];
  const awards: StatColumn = { key: "awards", label: "Awards", value: (row) => row.awards.join(", ") };
  if (category === "passing") {
    return [
      ...base,
      { key: "qbrec", label: "QBrec", value: (row) => row.average ? qbRecord(row.stats) : qbRecord(row.stats) },
      { key: "cmp", label: "Cmp", value: (row) => formatStatNumber(row.stats.passCompletions, row.average ? 1 : 0), sortValue: (row) => row.stats.passCompletions },
      { key: "att", label: "Att", value: (row) => formatStatNumber(row.stats.passAttempts, row.average ? 1 : 0), sortValue: (row) => row.stats.passAttempts },
      { key: "cmpPct", label: "Cmp%", value: (row) => formatRate(rate(row.stats.passCompletions, row.stats.passAttempts, 100), 1), sortValue: (row) => rate(row.stats.passCompletions, row.stats.passAttempts, 100) ?? -1 },
      { key: "yds", label: "Yds", value: (row) => formatStatNumber(row.stats.passYards, row.average ? 1 : 0), sortValue: (row) => row.stats.passYards },
      { key: "td", label: "TD", value: (row) => formatStatNumber(row.stats.passTouchdowns, row.average ? 1 : 0), sortValue: (row) => row.stats.passTouchdowns },
      { key: "tdPct", label: "TD%", value: (row) => formatRate(rate(row.stats.passTouchdowns, row.stats.passAttempts, 100), 1), sortValue: (row) => rate(row.stats.passTouchdowns, row.stats.passAttempts, 100) ?? -1 },
      { key: "int", label: "Int", value: (row) => formatStatNumber(row.stats.interceptionsThrown, row.average ? 1 : 0), sortValue: (row) => row.stats.interceptionsThrown },
      { key: "intPct", label: "Int%", value: (row) => formatRate(rate(row.stats.interceptionsThrown, row.stats.passAttempts, 100), 1), sortValue: (row) => rate(row.stats.interceptionsThrown, row.stats.passAttempts, 100) ?? -1 },
      { key: "first", label: "1D", value: (row) => formatStatNumber(row.stats.passingFirstDowns, row.average ? 1 : 0), sortValue: (row) => row.stats.passingFirstDowns },
      { key: "succ", label: "Succ%", value: (row) => formatRate(successRate(row.stats, "pass"), 1), sortValue: (row) => successRate(row.stats, "pass") ?? -1 },
      { key: "lng", label: "Lng", value: (row) => formatStatNumber(row.stats.passingLong), sortValue: (row) => row.stats.passingLong },
      { key: "ya", label: "Y/A", value: (row) => formatRate(rate(row.stats.passYards, row.stats.passAttempts), 1), sortValue: (row) => rate(row.stats.passYards, row.stats.passAttempts) ?? -1 },
      { key: "aya", label: "AY/A", value: (row) => formatRate(adjustedYardsPerAttempt(row.stats), 1), sortValue: (row) => adjustedYardsPerAttempt(row.stats) ?? -1 },
      { key: "yc", label: "Y/C", value: (row) => formatRate(rate(row.stats.passYards, row.stats.passCompletions), 1), sortValue: (row) => rate(row.stats.passYards, row.stats.passCompletions) ?? -1 },
      { key: "yg", label: "Y/G", value: (row) => formatRate(rate(row.stats.passYards, row.stats.games), 1), sortValue: (row) => rate(row.stats.passYards, row.stats.games) ?? -1 },
      { key: "rate", label: "Rate", value: (row) => formatRate(passerRating(row.stats), 1), sortValue: (row) => passerRating(row.stats) ?? -1 },
      { key: "qbr", label: "QBR", value: (row) => formatRate(qbrApprox(row.stats), 1), sortValue: (row) => qbrApprox(row.stats) ?? -1 },
      { key: "sk", label: "Sk", value: (row) => formatStatNumber(row.stats.sacksTaken, row.average ? 1 : 0), sortValue: (row) => row.stats.sacksTaken },
      { key: "skyds", label: "Yds", title: "Sack yards lost", value: (row) => formatStatNumber(row.stats.sackYardsLost, row.average ? 1 : 0), sortValue: (row) => row.stats.sackYardsLost },
      { key: "skpct", label: "Sk%", value: (row) => formatRate(rate(row.stats.sacksTaken, row.stats.passAttempts + row.stats.sacksTaken, 100), 2), sortValue: (row) => rate(row.stats.sacksTaken, row.stats.passAttempts + row.stats.sacksTaken, 100) ?? -1 },
      { key: "nya", label: "NY/A", value: (row) => formatRate(netYardsPerAttempt(row.stats), 2), sortValue: (row) => netYardsPerAttempt(row.stats) ?? -1 },
      { key: "anya", label: "ANY/A", value: (row) => formatRate(adjustedNetYardsPerAttempt(row.stats), 2), sortValue: (row) => adjustedNetYardsPerAttempt(row.stats) ?? -1 },
      { key: "4qc", label: "4QC", value: (row) => formatStatNumber(row.stats.fourthQuarterComebacks, row.average ? 1 : 0), sortValue: (row) => row.stats.fourthQuarterComebacks },
      { key: "gwd", label: "GWD", value: (row) => formatStatNumber(row.stats.gameWinningDrives, row.average ? 1 : 0), sortValue: (row) => row.stats.gameWinningDrives },
      { key: "av", label: "AV", value: (row) => approximateValue(row.stats, "QB"), sortValue: (row) => approximateValue(row.stats, "QB") },
      awards
    ];
  }
  if (category === "rushing") {
    return [...base,
      { key: "att", label: "Att", value: (row) => formatStatNumber(row.stats.rushAttempts, row.average ? 1 : 0), sortValue: (row) => row.stats.rushAttempts },
      { key: "yds", label: "Yds", value: (row) => formatStatNumber(row.stats.rushYards, row.average ? 1 : 0), sortValue: (row) => row.stats.rushYards },
      { key: "td", label: "TD", value: (row) => formatStatNumber(row.stats.rushTouchdowns, row.average ? 1 : 0), sortValue: (row) => row.stats.rushTouchdowns },
      { key: "first", label: "1D", value: (row) => formatStatNumber(row.stats.rushingFirstDowns, row.average ? 1 : 0), sortValue: (row) => row.stats.rushingFirstDowns },
      { key: "succ", label: "Succ%", value: (row) => formatRate(successRate(row.stats, "rush"), 1), sortValue: (row) => successRate(row.stats, "rush") ?? -1 },
      { key: "lng", label: "Lng", value: (row) => formatStatNumber(row.stats.rushingLong), sortValue: (row) => row.stats.rushingLong },
      { key: "ya", label: "Y/A", value: (row) => formatRate(rate(row.stats.rushYards, row.stats.rushAttempts), 1), sortValue: (row) => rate(row.stats.rushYards, row.stats.rushAttempts) ?? -1 },
      { key: "yg", label: "Y/G", value: (row) => formatRate(rate(row.stats.rushYards, row.stats.games), 1), sortValue: (row) => rate(row.stats.rushYards, row.stats.games) ?? -1 },
      { key: "fum", label: "Fmb", value: (row) => formatStatNumber(row.stats.fumbles, row.average ? 1 : 0), sortValue: (row) => row.stats.fumbles },
      { key: "av", label: "AV", value: (row) => approximateValue(row.stats, "RB"), sortValue: (row) => approximateValue(row.stats, "RB") },
      awards];
  }
  if (category === "receiving") {
    return [...base,
      { key: "tgt", label: "Tgt", value: (row) => formatStatNumber(row.stats.targets, row.average ? 1 : 0), sortValue: (row) => row.stats.targets },
      { key: "rec", label: "Rec", value: (row) => formatStatNumber(row.stats.receptions, row.average ? 1 : 0), sortValue: (row) => row.stats.receptions },
      { key: "catch", label: "Ctch%", value: (row) => formatRate(rate(row.stats.receptions, row.stats.targets, 100), 1), sortValue: (row) => rate(row.stats.receptions, row.stats.targets, 100) ?? -1 },
      { key: "yds", label: "Yds", value: (row) => formatStatNumber(row.stats.receivingYards, row.average ? 1 : 0), sortValue: (row) => row.stats.receivingYards },
      { key: "td", label: "TD", value: (row) => formatStatNumber(row.stats.receivingTouchdowns, row.average ? 1 : 0), sortValue: (row) => row.stats.receivingTouchdowns },
      { key: "first", label: "1D", value: (row) => formatStatNumber(row.stats.receivingFirstDowns, row.average ? 1 : 0), sortValue: (row) => row.stats.receivingFirstDowns },
      { key: "succ", label: "Succ%", value: (row) => formatRate(successRate(row.stats, "receive"), 1), sortValue: (row) => successRate(row.stats, "receive") ?? -1 },
      { key: "lng", label: "Lng", value: (row) => formatStatNumber(row.stats.receivingLong), sortValue: (row) => row.stats.receivingLong },
      { key: "yr", label: "Y/R", value: (row) => formatRate(rate(row.stats.receivingYards, row.stats.receptions), 1), sortValue: (row) => rate(row.stats.receivingYards, row.stats.receptions) ?? -1 },
      { key: "yt", label: "Y/Tgt", value: (row) => formatRate(rate(row.stats.receivingYards, row.stats.targets), 1), sortValue: (row) => rate(row.stats.receivingYards, row.stats.targets) ?? -1 },
      { key: "drop", label: "Drop", value: (row) => formatStatNumber(row.stats.drops, row.average ? 1 : 0), sortValue: (row) => row.stats.drops },
      { key: "av", label: "AV", value: (row) => approximateValue(row.stats, row.position === "TE" ? "TE" : "WR"), sortValue: (row) => approximateValue(row.stats, row.position === "TE" ? "TE" : "WR") },
      awards];
  }
  if (category === "kicking") {
    return [...base,
      { key: "fgm", label: "FGM", value: (row) => formatStatNumber(row.stats.fieldGoalsMade, row.average ? 1 : 0), sortValue: (row) => row.stats.fieldGoalsMade },
      { key: "fga", label: "FGA", value: (row) => formatStatNumber(row.stats.fieldGoalAttempts, row.average ? 1 : 0), sortValue: (row) => row.stats.fieldGoalAttempts },
      { key: "fgp", label: "FG%", value: (row) => formatRate(rate(row.stats.fieldGoalsMade, row.stats.fieldGoalAttempts, 100), 1), sortValue: (row) => rate(row.stats.fieldGoalsMade, row.stats.fieldGoalAttempts, 100) ?? -1 },
      { key: "lng", label: "Lng", value: (row) => formatStatNumber(row.stats.fieldGoalLong), sortValue: (row) => row.stats.fieldGoalLong },
      { key: "xpm", label: "XPM", value: (row) => formatStatNumber(row.stats.extraPointsMade, row.average ? 1 : 0), sortValue: (row) => row.stats.extraPointsMade },
      { key: "xpa", label: "XPA", value: (row) => formatStatNumber(row.stats.extraPointAttempts, row.average ? 1 : 0), sortValue: (row) => row.stats.extraPointAttempts },
      { key: "av", label: "AV", value: (row) => approximateValue(row.stats, "K"), sortValue: (row) => approximateValue(row.stats, "K") },
      awards];
  }
  if (category === "punting") {
    return [...base,
      { key: "p", label: "P", value: (row) => formatStatNumber(row.stats.punts, row.average ? 1 : 0), sortValue: (row) => row.stats.punts },
      { key: "yds", label: "Yds", value: (row) => formatStatNumber(row.stats.puntYards, row.average ? 1 : 0), sortValue: (row) => row.stats.puntYards },
      { key: "avg", label: "Avg", value: (row) => formatRate(rate(row.stats.puntYards, row.stats.punts), 1), sortValue: (row) => rate(row.stats.puntYards, row.stats.punts) ?? -1 },
      { key: "lng", label: "Lng", value: (row) => formatStatNumber(row.stats.puntLong), sortValue: (row) => row.stats.puntLong },
      { key: "i20", label: "I20", value: (row) => formatStatNumber(row.stats.puntInside20, row.average ? 1 : 0), sortValue: (row) => row.stats.puntInside20 },
      { key: "tb", label: "TB", value: (row) => formatStatNumber(row.stats.puntTouchbacks, row.average ? 1 : 0), sortValue: (row) => row.stats.puntTouchbacks },
      { key: "av", label: "AV", value: (row) => approximateValue(row.stats, "P"), sortValue: (row) => approximateValue(row.stats, "P") },
      awards];
  }
  return [...base,
    { key: "tkl", label: "Tkl", value: (row) => formatStatNumber(row.stats.tackles, row.average ? 1 : 0), sortValue: (row) => row.stats.tackles },
    { key: "tfl", label: "TFL", value: (row) => formatStatNumber(row.stats.tacklesForLoss, row.average ? 1 : 0), sortValue: (row) => row.stats.tacklesForLoss },
    { key: "sk", label: "Sk", value: (row) => formatStatNumber(row.stats.sacks, 1), sortValue: (row) => row.stats.sacks },
    { key: "qbh", label: "QBHits", value: (row) => formatStatNumber(row.stats.qbHits, row.average ? 1 : 0), sortValue: (row) => row.stats.qbHits },
    { key: "pr", label: "Prs", value: (row) => formatStatNumber(row.stats.qbPressures, row.average ? 1 : 0), sortValue: (row) => row.stats.qbPressures },
    { key: "int", label: "Int", value: (row) => formatStatNumber(row.stats.interceptions, row.average ? 1 : 0), sortValue: (row) => row.stats.interceptions },
    { key: "pd", label: "PD", value: (row) => formatStatNumber(row.stats.passesDefended, row.average ? 1 : 0), sortValue: (row) => row.stats.passesDefended },
    { key: "ff", label: "FF", value: (row) => formatStatNumber(row.stats.forcedFumbles, row.average ? 1 : 0), sortValue: (row) => row.stats.forcedFumbles },
    { key: "fr", label: "FR", value: (row) => formatStatNumber(row.stats.fumbleRecoveries, row.average ? 1 : 0), sortValue: (row) => row.stats.fumbleRecoveries },
    { key: "ctgt", label: "Tgt", value: (row) => formatStatNumber(row.stats.coverageTargets, row.average ? 1 : 0), sortValue: (row) => row.stats.coverageTargets },
    { key: "cmpa", label: "CmpA", value: (row) => formatStatNumber(row.stats.completionsAllowed, row.average ? 1 : 0), sortValue: (row) => row.stats.completionsAllowed },
    { key: "av", label: "AV", value: (row) => approximateValue(row.stats, "LB"), sortValue: (row) => approximateValue(row.stats, "LB") },
    awards];
}

function DensePlayerStatsTable({ rows, category }: { rows: StatDisplayRow[]; category: PlayerStatTableCategory }) {
  const columns = playerStatColumns(category);
  return (
    <div className="stat-table-scroll">
      <table className="stat-reference-table">
        <thead>
          <tr>
            {columns.map((column, index) => <th key={column.key} title={column.title} className={index === 0 ? "sticky-col" : ""}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.total || row.average ? "stat-total-row" : ""}>
              {columns.map((column, index) => <td key={column.key} className={index === 0 ? "sticky-col" : ""}>{column.value(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterStatsTab({ player, save }: { player: Player; save: GameSave }) {
  const careerTotals = totalPlayerStats(player);
  const currentCombined = mergePlayerStats(player.stats, player.playoffStats);
  const category = playerPrimaryStatCategory(player.position);
  const rows = buildPlayerStatRows(player, save);
  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Stats</p>
          <strong>Season Production</strong>
        </div>
        <div className="roster-dossier-grid roster-overview-grid">
          <div className="roster-dossier-line">
            <small>{save.seasonYear}</small>
            <strong>{primaryStatLine(currentCombined, player.position)}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Career</small>
            <strong>{primaryStatLine(careerTotals, player.position)}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Games</small>
            <strong>{careerTotals.games}</strong>
          </div>
          <div className="roster-dossier-line">
            <small>Snaps</small>
            <strong>{careerTotals.snaps}</strong>
          </div>
        </div>
        <DensePlayerStatsTable rows={rows} category={category} />
      </section>
    </div>
  );
}

function RosterContractTab({
  player,
  save,
  releasePlayer,
  postJuneReleasePlayer,
  restructurePlayer,
  tagOrTenderPlayer,
  extendPlayer,
  exerciseFifthYearOption
}: {
  player: Player;
  save: GameSave;
  releasePlayer?: (playerId: string) => void;
  postJuneReleasePlayer?: (playerId: string) => void;
  restructurePlayer?: (playerId: string) => void;
  tagOrTenderPlayer?: (playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) => void;
  extendPlayer?: (playerId: string) => void;
  exerciseFifthYearOption?: (playerId: string) => void;
}) {
  const deadMoney = deadMoneyIfMoved(player, save.seasonYear);
  const savings = capSavingsIfMoved(player, save.seasonYear);
  const rights = player.contract?.rights ?? "none";
  const franchiseCheck = canApplyTagOrTender(save, player.id, save.selectedTeamId, "franchise");
  const transitionCheck = canApplyTagOrTender(save, player.id, save.selectedTeamId, "transition");
  const tenderKind: Parameters<typeof applyTagOrTender>[3] = rights === "erfa" ? "erfa" : "second-round";
  const tenderCheck = canApplyTagOrTender(save, player.id, save.selectedTeamId, tenderKind);
  const extensionCheck = canExtendPlayerContract(save, player.id, save.selectedTeamId);
  const optionCheck = canExerciseFifthYearOption(save, player.id, save.selectedTeamId);
  const contract = player.contract;
  const totalValue = contract ? contractTotalValue(contract) : player.salary * Math.max(1, player.contractYears);
  const activeYears = remainingContractYears(player, save.seasonYear);
  const voidYears = contract?.voidYears ?? contract?.seasons.filter((season) => season.voidYear).length ?? 0;
  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Contract</p>
          <strong>Cap Table And Control</strong>
        </div>
        <div className="roster-detail-meta">
          <span>{contractSummary(save, player)}</span>
          <span>{activeYears} active year{activeYears === 1 ? "" : "s"} left</span>
          <span>Total ${totalValue.toFixed(2)}M</span>
          <span>APY ${(contract?.apy ?? player.salary).toFixed(2)}M</span>
          <span>Guaranteed ${(contract?.guaranteedTotal ?? player.salary).toFixed(2)}M</span>
          {voidYears ? <span>{voidYears} void year{voidYears === 1 ? "" : "s"}</span> : null}
          {contract?.security ? <span>Security {contract.security}</span> : null}
          <span>Rights {rights.toUpperCase()}</span>
          <span>Cut dead ${deadMoney.toFixed(2)}M</span>
          <span>Savings ${savings.toFixed(2)}M</span>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Year</th>
              <th>Window</th>
              <th>Base</th>
              <th>Bonus</th>
              <th>Guaranteed</th>
              <th>Cap Hit</th>
            </tr>
          </thead>
          <tbody>
            {remainingContractRows(save, player).map((row) => (
              <tr key={`${player.id}-${row.year}`}>
                <td><strong>{row.year}</strong></td>
                <td>{row.label}</td>
                <td>${row.base.toFixed(2)}M</td>
                <td>${row.bonus.toFixed(2)}M</td>
                <td>${row.guarantee.toFixed(2)}M</td>
                <td><strong>${row.capHit.toFixed(2)}M</strong></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className="contract-action-grid">
          <button type="button" disabled={!releasePlayer} onClick={() => releasePlayer?.(player.id)}>
            Release
          </button>
          <button type="button" disabled={!postJuneReleasePlayer} onClick={() => postJuneReleasePlayer?.(player.id)}>
            Post-June Cut
          </button>
          <button type="button" disabled={!restructurePlayer || (player.contract?.seasons.filter((season) => season.seasonYear >= save.seasonYear).length ?? 0) < 2} onClick={() => restructurePlayer?.(player.id)}>
            Restructure
          </button>
          <button type="button" disabled={!extendPlayer || !extensionCheck.ok} title={extensionCheck.reason} onClick={() => extendPlayer?.(player.id)}>
            Extend
          </button>
          <button type="button" disabled={!exerciseFifthYearOption || !optionCheck.ok} title={optionCheck.reason} onClick={() => exerciseFifthYearOption?.(player.id)}>
            Fifth-Year Option
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || rights !== "ufa" || !franchiseCheck.ok} title={franchiseCheck.reason} onClick={() => tagOrTenderPlayer?.(player.id, "franchise")}>
            Franchise Tag
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || rights !== "ufa" || !transitionCheck.ok} title={transitionCheck.reason} onClick={() => tagOrTenderPlayer?.(player.id, "transition")}>
            Transition Tag
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || (rights !== "rfa" && rights !== "erfa") || !tenderCheck.ok} title={tenderCheck.reason} onClick={() => tagOrTenderPlayer?.(player.id, tenderKind)}>
            {rights === "erfa" ? "ERFA Tender" : "RFA Tender"}
          </button>
        </div>
        <p className="roster-contract-note">No-trade language and incentives remain abstracted; guarantees, void years, options, tenders, tags, and extensions are live cap mechanics.</p>
      </section>
    </div>
  );
}

function RosterRatingsTab({ player }: { player: Player }) {
  const [selectedPosition, setSelectedPosition] = useState<Position>(player.position);
  const positions = useMemo(
    () => POSITIONS.slice().sort((a, b) => {
      const overallGap = skillOverallAtPosition(player, b) - skillOverallAtPosition(player, a);
      if (overallGap !== 0) return overallGap;
      const fitGap = positionFitFor(player, b) - positionFitFor(player, a);
      if (fitGap !== 0) return fitGap;
      if (a === player.position) return -1;
      if (b === player.position) return 1;
      return a.localeCompare(b);
    }),
    [player]
  );

  useEffect(() => {
    setSelectedPosition(player.position);
  }, [player.id, player.position]);

  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Ratings</p>
          <strong>Position Lens</strong>
        </div>
        <div className="roster-ratings-toolbar">
          <label className="roster-select-field">
            <span>Position view</span>
            <select value={selectedPosition} onChange={(event) => setSelectedPosition(event.target.value as Position)}>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position} | OVR {skillOverallAtPosition(player, position)} | Fit {positionFitFor(player, position)}
                </option>
              ))}
            </select>
          </label>
          <div className="roster-detail-meta">
            <span>Selected {selectedPosition}</span>
            <span>OVR {skillOverallAtPosition(player, selectedPosition)}</span>
            <span>Fit {positionFitFor(player, selectedPosition)}</span>
          </div>
        </div>
        <div className="rating-groups rating-groups-emphasis">
          {ratingsByGroup().map(({ group, ratings }) => (
            <div key={group} className="rating-group">
              <h4>{group}</h4>
              {ratings.map((rating) => {
                const importance = positionRatingImportance(selectedPosition, rating.key as RatingKey);
                const importanceClass =
                  importance >= 0.82 ? "rating-importance-4" :
                  importance >= 0.56 ? "rating-importance-3" :
                  importance >= 0.26 ? "rating-importance-2" :
                  importance > 0 ? "rating-importance-1" :
                  "rating-muted";
                return (
                  <span key={rating.key} className={importanceClass}>
                    {rating.label}
                    <strong>{ratingValue(player.ratings, rating.key as RatingKey)}</strong>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function IrActionControls({
  player,
  save,
  placeOnIr,
  designateToReturn,
  activateFromIr
}: {
  player: Player;
  save: GameSave;
  placeOnIr?: (playerId: string) => void;
  designateToReturn?: (playerId: string) => void;
  activateFromIr?: (playerId: string) => void;
}) {
  const placeCheck = canPlacePlayerOnIr(save, player.id, player.teamId);
  const designateCheck = canDesignatePlayerToReturn(save, player.id, player.teamId);
  const activateCheck = canActivatePlayerFromIr(save, player.id, player.teamId);
  return (
    <div className="ir-action-row">
      <button type="button" disabled={!placeOnIr || !placeCheck.ok} title={placeCheck.reason ?? "Place player on injured reserve"} onClick={() => placeOnIr?.(player.id)}>
        Place on IR
      </button>
      <button type="button" disabled={!designateToReturn || !designateCheck.ok} title={designateCheck.reason ?? "Open return window"} onClick={() => designateToReturn?.(player.id)}>
        Designate Return
      </button>
      <button type="button" disabled={!activateFromIr || !activateCheck.ok} title={activateCheck.reason ?? "Activate from injured reserve"} onClick={() => activateFromIr?.(player.id)}>
        Activate
      </button>
    </div>
  );
}

function RosterMedicalTab({
  player,
  save,
  placeOnIr,
  designateToReturn,
  activateFromIr
}: {
  player: Player;
  save: GameSave;
  placeOnIr?: (playerId: string) => void;
  designateToReturn?: (playerId: string) => void;
  activateFromIr?: (playerId: string) => void;
}) {
  const currentStatus = medicalStatusLabel(player);
  const riskTier = medicalRiskTier(playerMedical(player));
  const history = (save.medicalHistory ?? []).filter((entry) => entry.playerId === player.id).slice(0, 18);
  const returnUsage = save.irReturnUsage?.[player.teamId] ?? 0;

  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Medical</p>
          <strong>Health Dossier</strong>
        </div>
        <details className="roster-medical-disclosure" open>
          <summary>Current Health</summary>
          <div className="roster-medical-grid">
            <div className="roster-dossier-line">
              <small>Medical Rating</small>
              <strong>{playerMedical(player)}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Risk Tier</small>
              <strong className={`medical-text-${riskTier}`}>{riskTier}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Status</small>
              <strong>{currentStatus}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Current Issue</small>
              <strong>{player.injury?.name ?? "No active injury"}</strong>
            </div>
          </div>
          <IrActionControls player={player} save={save} placeOnIr={placeOnIr} designateToReturn={designateToReturn} activateFromIr={activateFromIr} />
        </details>
        <details className="roster-medical-disclosure" open>
          <summary>IR / Reserve</summary>
          <div className="roster-medical-grid">
            <div className="roster-dossier-line">
              <small>Reserve Status</small>
              <strong>{isOnIr(player) ? "Injured Reserve" : "Active roster"}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Eligible Week</small>
              <strong>{player.irEligibleWeek ?? "-"}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Return Window</small>
              <strong>{player.irPracticeWindowDeadlineWeek ? `Through Wk ${player.irPracticeWindowDeadlineWeek}` : "-"}</strong>
            </div>
            <div className="roster-dossier-line">
              <small>Team Returns</small>
              <strong>{returnUsage}/{IR_TEAM_RETURN_LIMIT}</strong>
            </div>
          </div>
        </details>
        <details className="roster-medical-disclosure" open>
          <summary>Injury History</summary>
          {history.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Injury</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.occurredWeek}</td>
                    <td><strong>{entry.name}</strong></td>
                    <td>{entry.severity}</td>
                    <td>{entry.careerEnding ? "Career ending" : entry.status}</td>
                    <td>{entry.source}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : <p className="roster-contract-note">No injury history logged for this player yet.</p>}
        </details>
      </section>
    </div>
  );
}

function RosterView({
  save,
  releasePlayer,
  postJuneReleasePlayer,
  restructurePlayer,
  tagOrTenderPlayer,
  extendPlayer,
  exerciseFifthYearOption,
  placeOnIr,
  designateToReturn,
  activateFromIr,
  promotePractice,
  elevatePractice,
  protectPractice,
  releasePractice,
  openTradeForPlayer
}: {
  save: GameSave;
  releasePlayer: (playerId: string) => void;
  postJuneReleasePlayer: (playerId: string) => void;
  restructurePlayer: (playerId: string) => void;
  tagOrTenderPlayer: (playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) => void;
  extendPlayer: (playerId: string) => void;
  exerciseFifthYearOption: (playerId: string) => void;
  placeOnIr: (playerId: string) => void;
  designateToReturn: (playerId: string) => void;
  activateFromIr: (playerId: string) => void;
  promotePractice: (playerId: string) => void;
  elevatePractice: (playerId: string) => void;
  protectPractice: (playerId: string) => void;
  releasePractice: (playerId: string) => void;
  openTradeForPlayer: (playerId?: string) => void;
}) {
  const [viewTeamId, setViewTeamId] = useState(save.selectedTeamId);
  const [sort, setSort] = useState<SortState<RosterSortKey>>({ key: "overall", direction: "desc" });
  const [squadSort, setSquadSort] = useState<SortState<PracticeSquadSortKey>>({ key: "potential", direction: "desc" });
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [overallFilter, setOverallFilter] = useState<RosterRangeFilter>("all");
  const [potentialFilter, setPotentialFilter] = useState<RosterRangeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<RosterAgeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  const [experienceFilter, setExperienceFilter] = useState<RosterExperienceFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compositionModal, setCompositionModal] = useState<RosterCompositionMode | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string>();
  const [activeModalTab, setActiveModalTab] = useState<RosterModalTab>("overview");
  const activeModalRef = useRef<HTMLElement | null>(null);
  const team = teamById(save, viewTeamId);
  const players = useMemo(() => playersForTeam(save, team.id), [save, team.id]);
  const squadPlayers = useMemo(() => practiceSquadPlayers(save, team.id).sort(comparePracticeSquadPlayers(squadSort)), [save, squadSort, team.id]);
  const activeRosterPlayers = useMemo(() => players.filter((player) => !isOnIr(player) && !isPracticeSquadPlayer(player)), [players]);
  const filteredPlayers = useMemo(() => {
    const filtered = players.filter((player) => {
      if (positionFilter !== "all" && player.position !== positionFilter) return false;
      if (!rosterRangeMatch(player.overall, overallFilter)) return false;
      if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
      if (!rosterAgeMatch(player.age, ageFilter)) return false;
      if (!rosterStatusMatch(player, statusFilter)) return false;
      if (!rosterExperienceMatch(player, experienceFilter)) return false;
      return true;
    });
    return filtered.sort(compareRosterPlayers(save, sort, statusFilter === "all" && (sort.key === "overall" || sort.key === "potential")));
  }, [ageFilter, experienceFilter, overallFilter, players, positionFilter, potentialFilter, save, sort, statusFilter]);
  const activeFilterItems: Array<ActiveFilter | undefined> = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    overallFilter !== "all" ? { label: `OVR ${overallFilter}`, clear: () => setOverallFilter("all") } : undefined,
    potentialFilter !== "all" ? { label: `POT ${potentialFilter}`, clear: () => setPotentialFilter("all") } : undefined,
    ageFilter !== "all" ? { label: `Age ${ageFilter}`, clear: () => setAgeFilter("all") } : undefined,
    statusFilter !== "all" ? { label: statusFilter === "healthy" ? "Healthy only" : statusFilter, clear: () => setStatusFilter("all") } : undefined,
    experienceFilter !== "all" ? { label: experienceFilter === "rookie" ? "Rookies" : `${experienceFilter} yrs`, clear: () => setExperienceFilter("all") } : undefined
  ];
  const activeFilters = activeFilterItems.filter(isActiveFilter);
  const activePlayer = activePlayerId ? players.find((player) => player.id === activePlayerId) : undefined;
  const canManageRoster = viewTeamId === save.selectedTeamId;
  const openRosterPlayer = (playerId: string) => {
    setActiveModalTab("overview");
    setActivePlayerId(playerId);
  };

  useEffect(() => {
    if (activePlayerId && !players.some((player) => player.id === activePlayerId)) {
      setActivePlayerId(undefined);
    }
  }, [activePlayerId, players]);

  useEffect(() => {
    if (activePlayerId) {
      activeModalRef.current?.focus();
    }
  }, [activePlayerId]);

  return (
    <section className="view-stack roster-workspace">
      <div className="view-command-row">
        <div className="roster-team-filter-group">
          <TeamScopePicker save={save} teamId={viewTeamId} setTeamId={setViewTeamId} label="Roster team" />
          <FilterButton count={activeFilters.length} onClick={() => setFiltersOpen(true)} />
        </div>
        <div className="roster-command-meta">
          <button type="button" className="read-only-chip roster-summary-button" onClick={() => setCompositionModal("active")}>Active {rosterSize(save, team.id)}/{MAX_ROSTER_SIZE}</button>
          <button type="button" className="read-only-chip roster-summary-button" onClick={() => setCompositionModal("practice")}>PS {practiceSquadSize(save, team.id)}/{PRACTICE_SQUAD_SIZE}</button>
          {viewTeamId !== save.selectedTeamId ? <span className="read-only-chip">Read-only roster view</span> : null}
        </div>
      </div>
      {filtersOpen ? (
        <FilterModal
          title={`${team.fullName} Roster Filters`}
          activeFilters={activeFilters}
          clearAll={() => {
            setPositionFilter("all");
            setOverallFilter("all");
            setPotentialFilter("all");
            setAgeFilter("all");
            setStatusFilter("all");
            setExperienceFilter("all");
          }}
          close={() => setFiltersOpen(false)}
        >
          <label className="roster-select-field">
            <span>Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </label>
          <label className="roster-select-field">
            <span>OVR</span>
            <select value={overallFilter} onChange={(event) => setOverallFilter(event.target.value as RosterRangeFilter)}>
              <option value="all">All</option>
              <option value="90+">90+</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="60-69">60-69</option>
              <option value="under-60">Under 60</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>POT</span>
            <select value={potentialFilter} onChange={(event) => setPotentialFilter(event.target.value as RosterRangeFilter)}>
              <option value="all">All</option>
              <option value="90+">90+</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="60-69">60-69</option>
              <option value="under-60">Under 60</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Age</span>
            <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value as RosterAgeFilter)}>
              <option value="all">All</option>
              <option value="24-under">24 and under</option>
              <option value="25-28">25-28</option>
              <option value="29-32">29-32</option>
              <option value="33-plus">33+</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RosterStatusFilter)}>
              <option value="all">All</option>
              <option value="healthy">Healthy</option>
              <option value="limited">Limited</option>
              <option value="injured">Injured</option>
              <option value="ir">IR</option>
              <option value="suspended">Suspended</option>
              <option value="practice">Practice</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Experience</span>
            <select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value as RosterExperienceFilter)}>
              <option value="all">All</option>
              <option value="rookie">Rookies</option>
              <option value="1-3">1-3 years</option>
              <option value="4-6">4-6 years</option>
              <option value="7-plus">7+ years</option>
            </select>
          </label>
        </FilterModal>
      ) : null}
      {compositionModal === "active" ? (
        <RosterCompositionModal
          title="Active Roster Composition"
          players={activeRosterPlayers}
          targets={activeRosterCompositionTargets}
          close={() => setCompositionModal(null)}
        />
      ) : null}
      {compositionModal === "practice" ? (
        <RosterCompositionModal
          title="Practice Squad Composition"
          players={squadPlayers}
          targets={practiceRosterCompositionTargets}
          close={() => setCompositionModal(null)}
        />
      ) : null}
      <DataTable>
        <thead>
          <tr>
            <SortableHeader label="Name" sortKey="name" sort={sort} setSort={setSort} defaultDirection="asc" />
            <SortableHeader label="Pos" sortKey="position" sort={sort} setSort={setSort} defaultDirection="asc" />
            <SortableHeader label="Age" sortKey="age" sort={sort} setSort={setSort} defaultDirection="asc" />
            <SortableHeader label="OVR" sortKey="overall" sort={sort} setSort={setSort} />
            <SortableHeader label="POT" sortKey="potential" sort={sort} setSort={setSort} />
            <SortableHeader label="Contract" sortKey="contract" sort={sort} setSort={setSort} />
            <SortableHeader label="YWT" sortKey="ywt" sort={sort} setSort={setSort} />
            <SortableHeader label="EXP" sortKey="experience" sort={sort} setSort={setSort} />
            <th>Release</th>
            <th>Trade</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.length ? filteredPlayers.map((player) => {
            const school = save.schools.find((candidate) => candidate.id === player.collegeId);
            const statusMarker = rosterStatusSymbol(player);
            const releaseCheck = canReleasePlayer(save, player.id, team.id);
            return (
              <tr
                key={player.id}
                className={`roster-table-row roster-status-${player.status}`}
                onClick={() => openRosterPlayer(player.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRosterPlayer(player.id);
                  }
                }}
                tabIndex={0}
              >
                <td>
                  <div className="roster-table-player">
                    <span className="roster-table-player-main">
                      <strong>{player.firstName} {player.lastName}</strong>
                      {statusMarker ? <span className={`roster-status-dot roster-status-dot-${player.status}`} title={statusMarker.label}>{statusMarker.symbol}</span> : null}
                    </span>
                    <span className="roster-table-player-meta">
                      <CollegeLogo school={school} size={22} />
                      <span>{school?.name ?? "Unknown College"}</span>
                    </span>
                  </div>
                </td>
                <td>{player.position}</td>
                <td>{player.age}</td>
                <td><strong>{player.overall}</strong></td>
                <td><strong>{player.potential}</strong></td>
                <td>
                  <div className="roster-contract-cell">
                    <strong>${player.salary.toFixed(2)}M</strong>
                    <small>thru {contractEndYear(save, player)}</small>
                  </div>
                </td>
                <td>
                  <strong>{yearsWithTeam(save, player)}</strong>
                </td>
                <td>
                  <span className="roster-experience-badge roster-table-experience-badge">{rosterExperienceLabel(player)}</span>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  {canManageRoster ? (
                    <button
                      type="button"
                      className="roster-row-action roster-release-button"
                      disabled={!releaseCheck.ok}
                      title={releaseCheck.reason ?? `Release ${player.firstName} ${player.lastName}`}
                      onClick={() => releasePlayer(player.id)}
                    >
                      Release
                    </button>
                  ) : <span className="roster-table-readonly">-</span>}
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  {canManageRoster ? (
                    <button
                      type="button"
                      className="roster-row-action"
                      onClick={() => openTradeForPlayer(player.id)}
                    >
                      Trade
                    </button>
                  ) : <span className="roster-table-readonly">-</span>}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={10}>No players match the current filters.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <section className="table-card practice-squad-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Practice Squad</p>
            <h3>{team.fullName} developmental roster</h3>
          </div>
          <span className="read-only-chip">{squadPlayers.length}/{PRACTICE_SQUAD_SIZE}</span>
        </div>
        <DataTable>
          <thead>
            <tr>
              <SortableHeader label="Name" sortKey="name" sort={squadSort} setSort={setSquadSort} defaultDirection="asc" />
              <SortableHeader label="Pos" sortKey="position" sort={squadSort} setSort={setSquadSort} defaultDirection="asc" />
              <SortableHeader label="Age" sortKey="age" sort={squadSort} setSort={setSquadSort} defaultDirection="asc" />
              <SortableHeader label="OVR" sortKey="overall" sort={squadSort} setSort={setSquadSort} />
              <SortableHeader label="POT" sortKey="potential" sort={squadSort} setSort={setSquadSort} />
              <th>Elev</th>
              <th>Protect</th>
              <th>Elevate</th>
              <th>Promote</th>
              <th>Release</th>
            </tr>
          </thead>
          <tbody>
            {squadPlayers.length ? squadPlayers.map((player) => {
              const school = save.schools.find((candidate) => candidate.id === player.collegeId);
              const promoteCheck = canPromotePracticeSquadPlayer(save, player.id, team.id);
              const elevateCheck = canElevatePracticeSquadPlayer(save, player.id, team.id);
              const protectCheck = canProtectPracticeSquadPlayer(save, player.id, team.id);
              return (
                <tr key={player.id} className="roster-table-row roster-status-practice" onClick={() => openRosterPlayer(player.id)} tabIndex={0}>
                  <td>
                    <div className="roster-table-player">
                      <span className="roster-table-player-main"><strong>{player.firstName} {player.lastName}</strong></span>
                      <span className="roster-table-player-meta">
                        <CollegeLogo school={school} size={22} />
                        <span>{school?.name ?? "Unknown College"}</span>
                      </span>
                    </div>
                  </td>
                  <td>{player.position}</td>
                  <td>{player.age}</td>
                  <td><strong>{player.overall}</strong></td>
                  <td><strong>{player.potential}</strong></td>
                  <td>{player.practiceSquadElevations ?? 0}/3</td>
                  <td>{player.practiceSquadProtectedWeek === save.currentWeek ? "Protected" : "-"}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {canManageRoster ? <button type="button" className="roster-row-action" disabled={!elevateCheck.ok} title={elevateCheck.reason} onClick={() => elevatePractice(player.id)}>Elevate</button> : "-"}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {canManageRoster ? <button type="button" className="roster-row-action" disabled={!promoteCheck.ok} title={promoteCheck.reason} onClick={() => promotePractice(player.id)}>Promote</button> : "-"}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {canManageRoster ? (
                      <div className="roster-inline-actions">
                        <button type="button" className="roster-row-action" disabled={!protectCheck.ok} title={protectCheck.reason} onClick={() => protectPractice(player.id)}>Protect</button>
                        <button type="button" className="roster-row-action roster-release-button" onClick={() => releasePractice(player.id)}>Release</button>
                      </div>
                    ) : "-"}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={10}>No practice squad players for this team.</td></tr>
            )}
          </tbody>
        </DataTable>
      </section>
      {activePlayer ? (
        <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={() => setActivePlayerId(undefined)}>
          <article
            ref={activeModalRef}
            className="roster-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activePlayer.firstName} ${activePlayer.lastName} player details`}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setActivePlayerId(undefined);
              }
            }}
          >
            <div className="roster-modal-header">
              <div>
                <p className="eyebrow">Roster Profile</p>
                <h3>{activePlayer.firstName} {activePlayer.lastName}</h3>
                <div className="roster-detail-meta">
                  <span>{activePlayer.position}</span>
                  <span>{save.schools.find((candidate) => candidate.id === activePlayer.collegeId)?.name ?? "Unknown College"}</span>
                  <span>{rosterExperienceLabel(activePlayer)}</span>
                </div>
              </div>
              <div className="roster-modal-actions">
                <div className="roster-primary-grades">
                  <span><small>OVR</small><strong>{activePlayer.overall}</strong></span>
                  <span><small>POT</small><strong>{activePlayer.potential}</strong></span>
                </div>
                <button type="button" onClick={(event) => {
                  event.stopPropagation();
                  setActivePlayerId(undefined);
                }}>Close</button>
              </div>
            </div>
            <div className="roster-modal-tabs" role="tablist" aria-label="Player detail tabs">
              {([
                ["overview", "Overview"],
                ["contract", "Contract"],
                ["ratings", "Ratings"],
                ["stats", "Stats"],
                ["medical", "Medical"]
              ] as Array<[RosterModalTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeModalTab === tab}
                  className={activeModalTab === tab ? "selected" : ""}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setActiveModalTab(tab);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveModalTab(tab);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeModalTab === "overview" ? <RosterOverviewTab player={activePlayer} save={save} /> : null}
            {activeModalTab === "contract" ? (
              <RosterContractTab
                player={activePlayer}
                save={save}
                releasePlayer={canManageRoster ? releasePlayer : undefined}
                postJuneReleasePlayer={canManageRoster ? postJuneReleasePlayer : undefined}
                restructurePlayer={canManageRoster ? restructurePlayer : undefined}
                tagOrTenderPlayer={canManageRoster ? tagOrTenderPlayer : undefined}
                extendPlayer={canManageRoster ? extendPlayer : undefined}
                exerciseFifthYearOption={canManageRoster ? exerciseFifthYearOption : undefined}
              />
            ) : null}
            {activeModalTab === "ratings" ? <RosterRatingsTab player={activePlayer} /> : null}
            {activeModalTab === "stats" ? <RosterStatsTab player={activePlayer} save={save} /> : null}
            {activeModalTab === "medical" ? (
              <RosterMedicalTab
                player={activePlayer}
                save={save}
                placeOnIr={canManageRoster ? placeOnIr : undefined}
                designateToReturn={canManageRoster ? designateToReturn : undefined}
                activateFromIr={canManageRoster ? activateFromIr : undefined}
              />
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}

function formatTradeMoney(value: number): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(1)}M`;
}

function tradeAssetLabel(save: GameSave, asset: TradeAsset): string {
  if (asset.type === "player") {
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? `${player.firstName} ${player.lastName} (${player.position})` : asset.id;
  }
  const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
  return pick ? `${pick.draftYear} Round ${pick.round}${pick.pickInRound ? `, Pick ${pick.pickInRound}` : ""}` : asset.id;
}

function tradeAssetKey(asset: TradeAsset): string {
  return `${asset.type}:${asset.id}`;
}

function tradeAssetSortLabel(save: GameSave, asset: TradeAsset): string {
  if (asset.type === "player") {
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? `${100 - player.overall}-${player.position}-${player.lastName}` : asset.id;
  }
  const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
  return pick ? `${pick.draftYear}-${pick.round}-${pick.pickInRound}` : asset.id;
}

function tradeAssetSecondaryLabel(save: GameSave, asset: TradeAsset): string {
  if (asset.type === "player") {
    const player = save.players.find((candidate) => candidate.id === asset.id);
    return player ? `${player.overall} OVR | ${formatTradeMoney(player.salary)} APY` : "";
  }
  const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
  if (!pick) return "";
  return `Original ${teamById(save, pick.originalTeamId).fullName}`;
}

function TradeTeamIdentity({
  save,
  teamId,
  size = 34,
  compact = false
}: {
  save: GameSave;
  teamId: string;
  size?: number;
  compact?: boolean;
}) {
  const team = teamById(save, teamId);
  return (
    <span className={`trade-team-identity ${compact ? "compact" : ""}`}>
      <TeamLogo save={save} teamId={team.id} size={size} />
      <span>
        <strong>{compact ? team.name : team.fullName}</strong>
        <small>{team.abbreviation}</small>
      </span>
    </span>
  );
}

function TradeTeamMatchup({ save, userTeamId, targetTeamId }: { save: GameSave; userTeamId: string; targetTeamId: string }) {
  return (
    <div className="trade-team-matchup">
      <TradeTeamIdentity save={save} teamId={userTeamId} />
      <span className="trade-matchup-divider">for</span>
      <TradeTeamIdentity save={save} teamId={targetTeamId} />
    </div>
  );
}

function TradeAssetContent({ save, asset }: { save: GameSave; asset: TradeAsset }) {
  const pick = asset.type === "pick" ? save.draftPicks.find((candidate) => candidate.id === asset.id) : undefined;
  return (
    <span className="trade-asset-content">
      {pick ? <TeamLogo save={save} teamId={pick.originalTeamId} size={24} /> : null}
      <span>
        <strong>{tradeAssetLabel(save, asset)}</strong>
        <small>{tradeAssetSecondaryLabel(save, asset)}</small>
      </span>
    </span>
  );
}

function TradeMiniAssetList({ save, assets }: { save: GameSave; assets: TradeAsset[] }) {
  if (!assets.length) return <span className="trade-mini-asset-list empty">No assets</span>;
  return (
    <span className="trade-mini-asset-list">
      {assets.map((asset) => (
        <span key={tradeAssetKey(asset)} title={tradeAssetLabel(save, asset)}>{tradeAssetLabel(save, asset)}</span>
      ))}
    </span>
  );
}

function TradeTeamLogoStrip({ save, teamIds }: { save: GameSave; teamIds: string[] }) {
  const uniqueTeamIds = [...new Set(teamIds)].filter((teamId) => save.teams.some((team) => team.id === teamId));
  return (
    <span className="trade-team-logo-strip">
      {uniqueTeamIds.slice(0, 4).map((teamId) => (
        <TeamLogo key={teamId} save={save} teamId={teamId} size={28} />
      ))}
    </span>
  );
}

type TradeMarketSection = "assets" | "incoming" | "block" | "market" | "history";
type TradeDeskTab = "builder" | "incoming" | "block" | "market" | "history";
type TradeAssetSide = "gives" | "receives";
type TradeModalState =
  | { type: "asset"; side: TradeAssetSide; asset: TradeAsset }
  | { type: "offer"; offer: TradeOffer }
  | { type: "analysis" }
  | { type: "history"; entry: TradeHistoryEntry }
  | { type: "news"; item: TradeNewsItem };

const tradeMarketSections: Array<{ id: TradeMarketSection; label: string }> = [
  { id: "assets", label: "Assets" },
  { id: "incoming", label: "Incoming" },
  { id: "block", label: "Block" },
  { id: "market", label: "Market" },
  { id: "history", label: "History" }
];

const tradeDeskTabs: Array<{ id: TradeDeskTab; label: string }> = [
  { id: "builder", label: "Deal Builder" },
  { id: "incoming", label: "Incoming Offers" },
  { id: "block", label: "Trade Block" },
  { id: "market", label: "League Market" },
  { id: "history", label: "History & News" }
];

function TradingView({
  save,
  prefillPlayerId,
  submitTrade,
  acceptOffer,
  toggleBlock,
  refreshActivity
}: {
  save: GameSave;
  prefillPlayerId?: string;
  submitTrade: (offer: TradeOffer) => void;
  acceptOffer: (offerId: string) => void;
  toggleBlock: (playerId: string) => void;
  refreshActivity: () => void;
}) {
  const userTeamId = save.selectedTeamId;
  const initialTarget = save.teams.find((team) => team.id !== userTeamId)?.id ?? userTeamId;
  const [targetTeamId, setTargetTeamId] = useState(initialTarget);
  const [gives, setGives] = useState<TradeAsset[]>([]);
  const [receives, setReceives] = useState<TradeAsset[]>([]);
  const [activeTradeTab, setActiveTradeTab] = useState<TradeDeskTab>("builder");
  const [activeTradeModal, setActiveTradeModal] = useState<TradeModalState | undefined>();
  const [assetTab, setAssetTab] = useState<"players" | "picks">("players");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketTeamFilter, setMarketTeamFilter] = useState<string>("all");
  const lastPrefillRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (targetTeamId !== userTeamId && save.teams.some((team) => team.id === targetTeamId)) return;
    setTargetTeamId(save.teams.find((team) => team.id !== userTeamId)?.id ?? userTeamId);
  }, [save.teams, targetTeamId, userTeamId]);

  useEffect(() => {
    if (!prefillPlayerId || lastPrefillRef.current === prefillPlayerId) return;
    const player = save.players.find((candidate) => candidate.id === prefillPlayerId);
    if (!player || player.teamId === "FA") return;
    lastPrefillRef.current = prefillPlayerId;
    const asset: TradeAsset = { type: "player", id: player.id };
    if (player.teamId === userTeamId) {
      setGives((current) => current.some((item) => tradeAssetKey(item) === tradeAssetKey(asset)) ? current : [asset, ...current]);
    } else {
      setTargetTeamId(player.teamId);
      setReceives((current) => current.some((item) => tradeAssetKey(item) === tradeAssetKey(asset)) ? current : [asset, ...current]);
    }
  }, [prefillPlayerId, save.players, userTeamId]);

  const tradeState = save.tradeState ?? normalizeTradeState(save);
  const offer = useMemo(() => createTradeOffer(save, userTeamId, targetTeamId, gives, receives), [gives, receives, save, targetTeamId, userTeamId]);
  const evaluation = useMemo(() => evaluateTradeOffer(save, offer), [offer, save]);
  const userAssets = useMemo(() => tradeAssetsForTeam(save, userTeamId), [save, userTeamId]);
  const targetAssets = useMemo(() => tradeAssetsForTeam(save, targetTeamId), [save, targetTeamId]);
  const selectedKeys = new Set([...gives, ...receives].map(tradeAssetKey));
  const incomingOffers = tradeState.offers.filter((candidate) => candidate.toTeamId === userTeamId && candidate.source === "cpu" && candidate.status !== "accepted");
  const userBlockIds = new Set(tradeState.tradeBlock.filter((entry) => entry.userMarked).map((entry) => entry.playerId));
  const blockPlayers = save.players
    .filter((player) => player.teamId === userTeamId && !isPracticeSquadPlayer(player))
    .sort((a, b) => b.overall - a.overall || a.age - b.age);
  const boardPlayers = tradeState.tradeBlock
    .map((entry) => save.players.find((player) => player.id === entry.playerId))
    .filter((player): player is Player => Boolean(player))
    .slice(0, 24);

  function addAsset(side: "gives" | "receives", asset: TradeAsset) {
    const update = (current: TradeAsset[]) => selectedKeys.has(tradeAssetKey(asset)) ? current : [...current, asset];
    if (side === "gives") setGives(update);
    else setReceives(update);
  }

  function removeAsset(side: "gives" | "receives", asset: TradeAsset) {
    const key = tradeAssetKey(asset);
    if (side === "gives") setGives((current) => current.filter((item) => tradeAssetKey(item) !== key));
    else setReceives((current) => current.filter((item) => tradeAssetKey(item) !== key));
  }

  function loadCounterOffer(counter: TradeOffer) {
    setGives(counter.gives);
    setReceives(counter.receives);
    setActiveTradeTab("builder");
    setActiveTradeModal(undefined);
  }

  function loadIncomingOffer(incoming: TradeOffer) {
    setTargetTeamId(incoming.fromTeamId);
    setGives(incoming.receives);
    setReceives(incoming.gives);
    setActiveTradeTab("builder");
    setActiveTradeModal(undefined);
  }

  function targetMarketPlayer(player: Player) {
    setTargetTeamId(player.teamId);
    setActiveTradeModal({ type: "asset", side: "receives", asset: { type: "player", id: player.id } });
  }

  function clearBuilder() {
    setGives([]);
    setReceives([]);
  }

  const hasAssets = gives.length > 0 || receives.length > 0;
  const submitDisabled = !hasAssets || evaluation.hardBlocks.length > 0 || targetTeamId === userTeamId;
  const historyCount = (tradeState.history?.length ?? 0) + (tradeState.news?.length ?? 0);
  const filteredBoardPlayers = boardPlayers.filter((player) => {
    const query = marketSearch.trim().toLowerCase();
    if (marketTeamFilter !== "all" && player.teamId !== marketTeamFilter) return false;
    if (!query) return true;
    return `${player.firstName} ${player.lastName} ${player.position} ${teamById(save, player.teamId).fullName}`.toLowerCase().includes(query);
  });
  const tabBadges: Partial<Record<TradeDeskTab, number>> = {
    incoming: incomingOffers.length,
    block: userBlockIds.size,
    market: filteredBoardPlayers.length,
    history: historyCount
  };

  return (
    <section className="view-stack trading-workspace trade-desk">
      <TradePackageSummaryBar
        save={save}
        offer={offer}
        userTeamId={userTeamId}
        targetTeamId={targetTeamId}
        gives={gives}
        receives={receives}
        evaluation={evaluation}
        hasAssets={hasAssets}
        submitDisabled={submitDisabled}
        clearBuilder={clearBuilder}
        submitTrade={submitTrade}
        loadCounterOffer={loadCounterOffer}
        removeAsset={removeAsset}
        openAnalysis={() => setActiveTradeModal({ type: "analysis" })}
      />
      <TradeDeskTabs activeTab={activeTradeTab} setActiveTab={setActiveTradeTab} tabBadges={tabBadges} />
      {activeTradeTab === "builder" ? (
        <TradeDealBuilderTab
          save={save}
          userTeamId={userTeamId}
          targetTeamId={targetTeamId}
          setTargetTeamId={setTargetTeamId}
          assetTab={assetTab}
          setAssetTab={setAssetTab}
          positionFilter={positionFilter}
          setPositionFilter={setPositionFilter}
          assetSearch={assetSearch}
          setAssetSearch={setAssetSearch}
          userAssets={filterTradeAssets(save, userAssets, assetTab, assetSearch, positionFilter)}
          targetAssets={filterTradeAssets(save, targetAssets, assetTab, assetSearch, positionFilter)}
          selectedKeys={selectedKeys}
          openAsset={(side, asset) => setActiveTradeModal({ type: "asset", side, asset })}
        />
      ) : null}
      {activeTradeTab === "incoming" ? (
        <TradeIncomingOffersTab
          save={save}
          incomingOffers={incomingOffers}
          reviewOffer={(candidate) => setActiveTradeModal({ type: "offer", offer: candidate })}
          loadIncomingOffer={loadIncomingOffer}
          acceptOffer={acceptOffer}
          refreshActivity={refreshActivity}
        />
      ) : null}
      {activeTradeTab === "block" ? (
        <TradeBlockTab save={save} blockPlayers={blockPlayers} userBlockIds={userBlockIds} toggleBlock={toggleBlock} />
      ) : null}
      {activeTradeTab === "market" ? (
        <TradeMarketTab
          save={save}
          boardPlayers={filteredBoardPlayers}
          marketSearch={marketSearch}
          setMarketSearch={setMarketSearch}
          marketTeamFilter={marketTeamFilter}
          setMarketTeamFilter={setMarketTeamFilter}
          targetMarketPlayer={targetMarketPlayer}
        />
      ) : null}
      {activeTradeTab === "history" ? (
        <TradeHistoryTab
          save={save}
          openHistory={(entry) => setActiveTradeModal({ type: "history", entry })}
          openNews={(item) => setActiveTradeModal({ type: "news", item })}
        />
      ) : null}
      {activeTradeModal ? (
        <TradeDetailModal
          save={save}
          modal={activeTradeModal}
          offer={offer}
          evaluation={evaluation}
          close={() => setActiveTradeModal(undefined)}
          addAsset={(side, asset) => {
            addAsset(side, asset);
            setActiveTradeModal(undefined);
          }}
          acceptOffer={acceptOffer}
          loadIncomingOffer={loadIncomingOffer}
        />
      ) : null}
    </section>
  );
}

function TradeDeskTabs({
  activeTab,
  setActiveTab,
  tabBadges
}: {
  activeTab: TradeDeskTab;
  setActiveTab: (tab: TradeDeskTab) => void;
  tabBadges: Partial<Record<TradeDeskTab, number>>;
}) {
  return (
    <div className="trade-desk-tabs" role="tablist" aria-label="Trading desk tabs">
      {tradeDeskTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "selected" : ""}
          onClick={() => setActiveTab(tab.id)}
        >
          <span>{tab.label}</span>
          {tabBadges[tab.id] ? <strong>{tabBadges[tab.id]}</strong> : null}
        </button>
      ))}
    </div>
  );
}

function TradePackageSummaryBar({
  save,
  offer,
  userTeamId,
  targetTeamId,
  gives,
  receives,
  evaluation,
  hasAssets,
  submitDisabled,
  clearBuilder,
  submitTrade,
  loadCounterOffer,
  removeAsset,
  openAnalysis
}: {
  save: GameSave;
  offer: TradeOffer;
  userTeamId: string;
  targetTeamId: string;
  gives: TradeAsset[];
  receives: TradeAsset[];
  evaluation: TradeEvaluation;
  hasAssets: boolean;
  submitDisabled: boolean;
  clearBuilder: () => void;
  submitTrade: (offer: TradeOffer) => void;
  loadCounterOffer: (offer: TradeOffer) => void;
  removeAsset: (side: TradeAssetSide, asset: TradeAsset) => void;
  openAnalysis: () => void;
}) {
  const firstMessage = evaluation.hardBlocks[0] ?? evaluation.reasons[0] ?? "Build a package to see partner interest.";
  return (
    <section className="table-card trade-summary-bar">
      <div className="trade-summary-bar-head">
        <div>
          <p className="eyebrow">Trading GM Desk</p>
          <h3>Current package</h3>
          <TradeTeamMatchup save={save} userTeamId={userTeamId} targetTeamId={targetTeamId} />
        </div>
        <div className="trade-summary-actions">
          <strong className={`trade-verdict trade-verdict-${evaluation.verdict}`}>{evaluation.verdict}</strong>
          <button type="button" onClick={openAnalysis}>Analyze Deal</button>
          <button type="button" disabled={submitDisabled} onClick={() => submitTrade({ ...offer, evaluation })}>Submit Trade</button>
          {evaluation.counterOffers?.[0] ? <button type="button" onClick={() => loadCounterOffer(evaluation.counterOffers![0])}>Load Counter</button> : null}
          <button type="button" disabled={!hasAssets} onClick={clearBuilder}>Clear</button>
        </div>
      </div>
      <div className="trade-summary-bar-grid">
        <TradePackageColumn teamId={userTeamId} save={save} assets={gives} side="gives" removeAsset={removeAsset} compact />
        <TradePackageColumn teamId={targetTeamId} save={save} assets={receives} side="receives" removeAsset={removeAsset} compact />
        <div className="trade-summary-bar-metrics">
          <article><span>Interest</span><strong>{evaluation.interest}</strong></article>
          <article><span>Value Gap</span><strong>{evaluation.valueGap >= 0 ? "+" : ""}{evaluation.valueGap}</strong></article>
          <article><span>Blocks</span><strong>{evaluation.hardBlocks.length}</strong></article>
        </div>
      </div>
      <div className="trade-interest summary">
        <span>AI interest</span>
        <div><i style={{ width: `${evaluation.interest}%` }} /></div>
        <strong>{evaluation.interest}</strong>
      </div>
      <div className="trade-reasons compact">
        <span>{firstMessage}</span>
      </div>
    </section>
  );
}

function TradeDealBuilderTab({
  save,
  userTeamId,
  targetTeamId,
  setTargetTeamId,
  assetTab,
  setAssetTab,
  positionFilter,
  setPositionFilter,
  assetSearch,
  setAssetSearch,
  userAssets,
  targetAssets,
  selectedKeys,
  openAsset
}: {
  save: GameSave;
  userTeamId: string;
  targetTeamId: string;
  setTargetTeamId: (teamId: string) => void;
  assetTab: "players" | "picks";
  setAssetTab: (tab: "players" | "picks") => void;
  positionFilter: Position | "all";
  setPositionFilter: (position: Position | "all") => void;
  assetSearch: string;
  setAssetSearch: (search: string) => void;
  userAssets: TradeAsset[];
  targetAssets: TradeAsset[];
  selectedKeys: Set<string>;
  openAsset: (side: TradeAssetSide, asset: TradeAsset) => void;
}) {
  return (
    <section className="table-card trade-tab-panel">
      <div className="trade-tab-heading">
        <div>
          <p className="eyebrow">Deal Builder</p>
          <h3>Find assets and build the package</h3>
        </div>
        <TeamScopePicker save={save} teamId={targetTeamId} setTeamId={setTargetTeamId} label="Partner" />
      </div>
      <div className="trade-builder-toolbar">
        <input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Search players or picks" />
        <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
          <option value="all">All Positions</option>
          {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
        </select>
        <div className="trade-mini-tabs">
          <button type="button" className={assetTab === "players" ? "selected" : ""} onClick={() => setAssetTab("players")}>Players</button>
          <button type="button" className={assetTab === "picks" ? "selected" : ""} onClick={() => setAssetTab("picks")}>Picks</button>
        </div>
      </div>
      <div className="trade-asset-table-grid">
        <TradeAssetTable title={`${teamById(save, userTeamId).fullName} assets`} save={save} assets={userAssets} disabledKeys={selectedKeys} actionLabel="Send" onSelect={(asset) => openAsset("gives", asset)} />
        <TradeAssetTable title={`${teamById(save, targetTeamId).fullName} assets`} save={save} assets={targetAssets} disabledKeys={selectedKeys} actionLabel="Ask" onSelect={(asset) => openAsset("receives", asset)} />
      </div>
    </section>
  );
}

function TradeAssetTable({
  title,
  save,
  assets,
  disabledKeys,
  actionLabel,
  onSelect
}: {
  title: string;
  save: GameSave;
  assets: TradeAsset[];
  disabledKeys: Set<string>;
  actionLabel: string;
  onSelect: (asset: TradeAsset) => void;
}) {
  return (
    <div className="trade-asset-table">
      <strong>{title}</strong>
      <div className="trade-asset-table-head">
        <span>Asset</span>
        <span>Pos</span>
        <span>OVR</span>
        <span>Age</span>
        <span>APY / Pick</span>
        <span>Action</span>
      </div>
      {assets.length ? assets.map((asset) => (
        <TradeAssetRow
          key={tradeAssetKey(asset)}
          save={save}
          asset={asset}
          disabled={disabledKeys.has(tradeAssetKey(asset))}
          actionLabel={actionLabel}
          onSelect={() => onSelect(asset)}
        />
      )) : <p className="roster-contract-note">No matching assets.</p>}
    </div>
  );
}

function TradeAssetRow({
  save,
  asset,
  disabled,
  actionLabel,
  onSelect
}: {
  save: GameSave;
  asset: TradeAsset;
  disabled?: boolean;
  actionLabel: string;
  onSelect: () => void;
}) {
  const player = asset.type === "player" ? save.players.find((candidate) => candidate.id === asset.id) : undefined;
  const pick = asset.type === "pick" ? save.draftPicks.find((candidate) => candidate.id === asset.id) : undefined;
  const label = tradeAssetLabel(save, asset);
  return (
    <div className="trade-asset-row">
      <span className="trade-asset-row-main" title={label}>
        <strong>{label}</strong>
        <small>{asset.type === "player" && player ? teamById(save, player.teamId).abbreviation : pick ? `Original ${teamById(save, pick.originalTeamId).abbreviation}` : "Unknown"}</small>
      </span>
      <span>{player?.position ?? "-"}</span>
      <span><strong>{player?.overall ?? "-"}</strong></span>
      <span>{player?.age ?? "-"}</span>
      <span>{player ? formatTradeMoney(player.salary) : pick ? `${pick.draftYear} R${pick.round}` : "-"}</span>
      <button type="button" disabled={disabled} onClick={onSelect}>{disabled ? "Added" : actionLabel}</button>
    </div>
  );
}

function TradeIncomingOffersTab({
  save,
  incomingOffers,
  reviewOffer,
  loadIncomingOffer,
  acceptOffer,
  refreshActivity
}: {
  save: GameSave;
  incomingOffers: TradeOffer[];
  reviewOffer: (offer: TradeOffer) => void;
  loadIncomingOffer: (offer: TradeOffer) => void;
  acceptOffer: (offerId: string) => void;
  refreshActivity: () => void;
}) {
  return (
    <section className="table-card trade-tab-panel">
      <div className="trade-tab-heading">
        <div>
          <p className="eyebrow">Incoming Offers</p>
          <h3>CPU proposals</h3>
        </div>
        <button type="button" onClick={refreshActivity}>Refresh AI Activity</button>
      </div>
      <div className="trade-offer-list">
        {incomingOffers.length ? incomingOffers.map((offer) => (
          <article key={offer.id} className="trade-offer-card compact">
            <div className="trade-offer-card-head">
              <div>
                <strong>{teamById(save, offer.fromTeamId).fullName}</strong>
                <small>Interest {offer.evaluation.interest} | Gap {offer.evaluation.valueGap >= 0 ? "+" : ""}{offer.evaluation.valueGap}</small>
              </div>
              <strong className={`trade-verdict trade-verdict-${offer.evaluation.verdict}`}>{offer.evaluation.verdict}</strong>
            </div>
            <div className="trade-offer-packages">
              <div><strong>You send</strong><TradeMiniAssetList save={save} assets={offer.receives} /></div>
              <div><strong>You receive</strong><TradeMiniAssetList save={save} assets={offer.gives} /></div>
            </div>
            <div className="trade-card-actions">
              <button type="button" onClick={() => reviewOffer(offer)}>Review</button>
              <button type="button" onClick={() => loadIncomingOffer(offer)}>Load</button>
              <button type="button" disabled={offer.evaluation.hardBlocks.length > 0} onClick={() => acceptOffer(offer.id)}>Accept</button>
            </div>
          </article>
        )) : (
          <div className="trade-empty-state">
            <strong>No incoming offers</strong>
            <span>Refresh AI activity or shop players from your block to create more conversations.</span>
            <button type="button" onClick={refreshActivity}>Refresh AI Activity</button>
          </div>
        )}
      </div>
    </section>
  );
}

function TradeBlockTab({ save, blockPlayers, userBlockIds, toggleBlock }: { save: GameSave; blockPlayers: Player[]; userBlockIds: Set<string>; toggleBlock: (playerId: string) => void }) {
  return (
    <section className="table-card trade-tab-panel">
      <div className="trade-tab-heading">
        <div>
          <p className="eyebrow">Trade Block</p>
          <h3>Set user availability</h3>
        </div>
      </div>
      <div className="trade-player-table">
        <div className="trade-player-table-head"><span>Player</span><span>Pos</span><span>OVR</span><span>Age</span><span>APY</span><span>Status</span><span>Action</span></div>
        {blockPlayers.map((player) => (
          <TradePlayerMarketRow
            key={player.id}
            save={save}
            player={player}
            status={userBlockIds.has(player.id) ? "Shopping" : "Private"}
            actionLabel={userBlockIds.has(player.id) ? "Remove" : "Shop"}
            onAction={() => toggleBlock(player.id)}
          />
        ))}
      </div>
    </section>
  );
}

function TradeMarketTab({
  save,
  boardPlayers,
  marketSearch,
  setMarketSearch,
  marketTeamFilter,
  setMarketTeamFilter,
  targetMarketPlayer
}: {
  save: GameSave;
  boardPlayers: Player[];
  marketSearch: string;
  setMarketSearch: (search: string) => void;
  marketTeamFilter: string;
  setMarketTeamFilter: (teamId: string) => void;
  targetMarketPlayer: (player: Player) => void;
}) {
  return (
    <section className="table-card trade-tab-panel">
      <div className="trade-tab-heading">
        <div>
          <p className="eyebrow">League Market</p>
          <h3>Trade-block targets</h3>
        </div>
      </div>
      <div className="trade-builder-toolbar market">
        <input value={marketSearch} onChange={(event) => setMarketSearch(event.target.value)} placeholder="Search market targets" />
        <select value={marketTeamFilter} onChange={(event) => setMarketTeamFilter(event.target.value)}>
          <option value="all">All Teams</option>
          {save.teams.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)).map((team) => (
            <option key={team.id} value={team.id}>{team.fullName}</option>
          ))}
        </select>
      </div>
      <div className="trade-player-table">
        <div className="trade-player-table-head"><span>Player</span><span>Pos</span><span>OVR</span><span>Age</span><span>APY</span><span>Team</span><span>Action</span></div>
        {boardPlayers.length ? boardPlayers.map((player) => (
          <TradePlayerMarketRow
            key={player.id}
            save={save}
            player={player}
            status={teamById(save, player.teamId).abbreviation}
            actionLabel="Target"
            onAction={() => targetMarketPlayer(player)}
          />
        )) : (
          <div className="trade-empty-state">
            <strong>No matching targets</strong>
            <span>Change the team or search filter to scan more of the market.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function TradePlayerMarketRow({
  player,
  status,
  actionLabel,
  onAction
}: {
  save: GameSave;
  player: Player;
  status: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="trade-player-market-row">
      <span title={`${player.firstName} ${player.lastName}`}><strong>{player.firstName} {player.lastName}</strong></span>
      <span>{player.position}</span>
      <span><strong>{player.overall}</strong></span>
      <span>{player.age}</span>
      <span>{formatTradeMoney(player.salary)}</span>
      <span>{status}</span>
      <button type="button" onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function TradeHistoryTab({ save, openHistory, openNews }: { save: GameSave; openHistory: (entry: TradeHistoryEntry) => void; openNews: (item: TradeNewsItem) => void }) {
  const history = (save.tradeState?.history ?? []).slice(0, 16);
  const news = (save.tradeState?.news ?? []).slice(0, 16);
  return (
    <section className="table-card trade-tab-panel">
      <div className="trade-tab-heading">
        <div>
          <p className="eyebrow">History & News</p>
          <h3>Completed trades and transaction wire</h3>
        </div>
      </div>
      <div className="trade-history-grid">
        <div className="trade-history-list">
          <strong>Completed trades</strong>
          {history.length ? history.map((entry) => (
            <button key={entry.id} type="button" className="trade-history-row" onClick={() => openHistory(entry)}>
              <span>{entry.date ?? `Week ${entry.week}`}</span>
              <strong>{entry.summary}</strong>
            </button>
          )) : <p className="roster-contract-note">No completed regular trade history yet.</p>}
        </div>
        <div className="trade-history-list">
          <strong>League news</strong>
          {news.length ? news.map((item) => (
            <button key={item.id} type="button" className="trade-history-row" onClick={() => openNews(item)}>
              <span>{item.importance}</span>
              <strong>{item.title}</strong>
            </button>
          )) : <p className="roster-contract-note">No trade news yet.</p>}
        </div>
      </div>
    </section>
  );
}

function TradeDetailModal({
  save,
  modal,
  offer,
  evaluation,
  close,
  addAsset,
  acceptOffer,
  loadIncomingOffer
}: {
  save: GameSave;
  modal: TradeModalState;
  offer: TradeOffer;
  evaluation: TradeEvaluation;
  close: () => void;
  addAsset: (side: TradeAssetSide, asset: TradeAsset) => void;
  acceptOffer: (offerId: string) => void;
  loadIncomingOffer: (offer: TradeOffer) => void;
}) {
  const title = modal.type === "asset"
    ? tradeAssetLabel(save, modal.asset)
    : modal.type === "offer"
      ? `${teamById(save, modal.offer.fromTeamId).fullName} offer`
      : modal.type === "analysis"
        ? "Deal analysis"
        : modal.type === "history"
          ? "Completed trade"
          : modal.item.title;
  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={close}>
      <article className="roster-modal trade-detail-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="roster-modal-header">
          <div>
            <p className="eyebrow">Trading GM Desk</p>
            <h3>{title}</h3>
          </div>
          <div className="roster-modal-actions">
            <button type="button" onClick={close}>Close</button>
          </div>
        </div>
        {modal.type === "asset" ? (
          <TradeAssetDetail save={save} asset={modal.asset} side={modal.side} addAsset={addAsset} close={close} />
        ) : null}
        {modal.type === "offer" ? (
          <TradeOfferDetail save={save} offer={modal.offer} acceptOffer={acceptOffer} loadIncomingOffer={loadIncomingOffer} />
        ) : null}
        {modal.type === "analysis" ? <TradeAnalysisContent save={save} offer={offer} evaluation={evaluation} /> : null}
        {modal.type === "history" ? (
          <div className="trade-modal-stack">
            <p>{modal.entry.summary}</p>
            <div className="trade-offer-packages">
              <div><strong>{teamById(save, modal.entry.fromTeamId).fullName} sent</strong><TradeMiniAssetList save={save} assets={modal.entry.gives} /></div>
              <div><strong>{teamById(save, modal.entry.toTeamId).fullName} sent</strong><TradeMiniAssetList save={save} assets={modal.entry.receives} /></div>
            </div>
          </div>
        ) : null}
        {modal.type === "news" ? (
          <div className="trade-modal-stack">
            <p>{modal.item.body}</p>
            <small>{modal.item.date ?? `Week ${modal.item.week}`} | {modal.item.importance}</small>
          </div>
        ) : null}
      </article>
    </div>
  );
}

function TradeAssetDetail({ save, asset, side, addAsset, close }: { save: GameSave; asset: TradeAsset; side: TradeAssetSide; addAsset: (side: TradeAssetSide, asset: TradeAsset) => void; close: () => void }) {
  const player = asset.type === "player" ? save.players.find((candidate) => candidate.id === asset.id) : undefined;
  const pick = asset.type === "pick" ? save.draftPicks.find((candidate) => candidate.id === asset.id) : undefined;
  return (
    <div className="trade-modal-stack">
      <div className="trade-detail-metrics">
        {player ? (
          <>
            <article><span>Team</span><strong>{teamById(save, player.teamId).fullName}</strong></article>
            <article><span>Position</span><strong>{player.position}</strong></article>
            <article><span>OVR</span><strong>{player.overall}</strong></article>
            <article><span>Age</span><strong>{player.age}</strong></article>
            <article><span>APY</span><strong>{formatTradeMoney(player.salary)}</strong></article>
          </>
        ) : pick ? (
          <>
            <article><span>Current Team</span><strong>{teamById(save, pick.currentTeamId).fullName}</strong></article>
            <article><span>Original Team</span><strong>{teamById(save, pick.originalTeamId).fullName}</strong></article>
            <article><span>Year</span><strong>{pick.draftYear}</strong></article>
            <article><span>Round</span><strong>{pick.round}</strong></article>
            <article><span>Pick</span><strong>{pick.pickInRound ?? "-"}</strong></article>
          </>
        ) : <p>Asset not found.</p>}
      </div>
      <div className="trade-modal-actions">
        <button type="button" onClick={() => addAsset(side, asset)}>{side === "gives" ? "Send Asset" : "Ask For Asset"}</button>
        <button type="button" onClick={close}>Cancel</button>
      </div>
    </div>
  );
}

function TradeOfferDetail({ save, offer, acceptOffer, loadIncomingOffer }: { save: GameSave; offer: TradeOffer; acceptOffer: (offerId: string) => void; loadIncomingOffer: (offer: TradeOffer) => void }) {
  return (
    <div className="trade-modal-stack">
      <TradeAnalysisContent save={save} offer={offer} evaluation={offer.evaluation} />
      <div className="trade-offer-packages">
        <div><strong>You send</strong><TradeMiniAssetList save={save} assets={offer.receives} /></div>
        <div><strong>You receive</strong><TradeMiniAssetList save={save} assets={offer.gives} /></div>
      </div>
      <div className="trade-modal-actions">
        <button type="button" disabled={offer.evaluation.hardBlocks.length > 0} onClick={() => acceptOffer(offer.id)}>Accept Offer</button>
        <button type="button" onClick={() => loadIncomingOffer(offer)}>Load In Builder</button>
      </div>
    </div>
  );
}

function TradeAnalysisContent({ save, offer, evaluation }: { save: GameSave; offer: TradeOffer; evaluation: TradeEvaluation }) {
  const warnings = evaluation.rosterPreview.flatMap((preview) => [...preview.warnings, ...preview.positionWarnings]).slice(0, 8);
  return (
    <div className="trade-modal-stack">
      <div className="trade-summary-metrics rail">
        <article><span>Verdict</span><strong className={`trade-verdict trade-verdict-${evaluation.verdict}`}>{evaluation.verdict}</strong></article>
        <article><span>Interest</span><strong>{evaluation.interest}</strong></article>
        <article><span>Value Gap</span><strong>{evaluation.valueGap >= 0 ? "+" : ""}{evaluation.valueGap}</strong></article>
        <article><span>Hard Blocks</span><strong>{evaluation.hardBlocks.length}</strong></article>
      </div>
      <div className="trade-reasons compact">
        {[...evaluation.hardBlocks, ...evaluation.reasons].slice(0, 8).map((reason) => <span key={reason}>{reason}</span>)}
        {!evaluation.hardBlocks.length && !evaluation.reasons.length ? <span>No issues detected yet.</span> : null}
      </div>
      <DataTable>
        <thead><tr><th>Team</th><th>Room</th><th>In</th><th>Out</th><th>Dead</th><th>Projected</th><th>Roster</th></tr></thead>
        <tbody>
          {evaluation.capPreview.map((cap) => {
            const roster = evaluation.rosterPreview.find((preview) => preview.teamId === cap.teamId);
            return (
              <tr key={cap.teamId}>
                <td>{teamById(save, cap.teamId).fullName}</td>
                <td>{formatTradeMoney(cap.currentRoom)}</td>
                <td>{formatTradeMoney(cap.incomingCap)}</td>
                <td>{formatTradeMoney(cap.outgoingCap)}</td>
                <td>{formatTradeMoney(cap.deadMoney)}</td>
                <td><strong>{formatTradeMoney(cap.projectedRoom)}</strong></td>
                <td>{roster?.rosterBefore ?? 0} to {roster?.rosterAfter ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      {warnings.length ? <div className="trade-reasons compact warnings">{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div> : null}
      <details className="trade-debug">
        <summary>Value Breakdown</summary>
        <TradeBreakdownTable title="Partner receives" rows={evaluation.outgoingBreakdown} />
        <TradeBreakdownTable title="User receives" rows={evaluation.incomingBreakdown} />
        <small>Offer ID: {offer.id}</small>
      </details>
    </div>
  );
}

function TradeMarketPane({
  save,
  userTeamId,
  targetTeamId,
  setTargetTeamId,
  activeSection,
  setActiveSection,
  sectionBadges,
  assetTab,
  setAssetTab,
  positionFilter,
  setPositionFilter,
  assetSearch,
  setAssetSearch,
  marketSearch,
  setMarketSearch,
  marketTeamFilter,
  setMarketTeamFilter,
  userAssets,
  targetAssets,
  incomingOffers,
  blockPlayers,
  boardPlayers,
  userBlockIds,
  selectedKeys,
  addAsset,
  loadIncomingOffer,
  acceptOffer,
  toggleBlock,
  targetMarketPlayer,
  refreshActivity
}: {
  save: GameSave;
  userTeamId: string;
  targetTeamId: string;
  setTargetTeamId: (teamId: string) => void;
  activeSection: TradeMarketSection;
  setActiveSection: (section: TradeMarketSection) => void;
  sectionBadges: Partial<Record<TradeMarketSection, number>>;
  assetTab: "players" | "picks";
  setAssetTab: (tab: "players" | "picks") => void;
  positionFilter: Position | "all";
  setPositionFilter: (position: Position | "all") => void;
  assetSearch: string;
  setAssetSearch: (search: string) => void;
  marketSearch: string;
  setMarketSearch: (search: string) => void;
  marketTeamFilter: string;
  setMarketTeamFilter: (teamId: string) => void;
  userAssets: TradeAsset[];
  targetAssets: TradeAsset[];
  incomingOffers: TradeOffer[];
  blockPlayers: Player[];
  boardPlayers: Player[];
  userBlockIds: Set<string>;
  selectedKeys: Set<string>;
  addAsset: (side: "gives" | "receives", asset: TradeAsset) => void;
  loadIncomingOffer: (offer: TradeOffer) => void;
  acceptOffer: (offerId: string) => void;
  toggleBlock: (playerId: string) => void;
  targetMarketPlayer: (player: Player) => void;
  refreshActivity: () => void;
}) {
  return (
    <aside className="table-card trade-market-pane">
      <div className="trade-pane-header">
        <div>
          <p className="eyebrow">Market Board</p>
          <h3>Browse the league</h3>
        </div>
        <TeamScopePicker save={save} teamId={targetTeamId} setTeamId={setTargetTeamId} label="Partner" />
      </div>

      <div className="trade-market-sections" role="tablist" aria-label="Trade market sections">
        {tradeMarketSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? "selected" : ""}
            onClick={() => setActiveSection(section.id)}
          >
            <span>{section.label}</span>
            {sectionBadges[section.id] ? <strong>{sectionBadges[section.id]}</strong> : null}
          </button>
        ))}
      </div>

      {activeSection === "assets" ? (
        <div className="trade-pane-body">
          <div className="trade-filter-grid">
            <input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Search players or picks" />
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All Pos</option>
              {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
            <div className="trade-mini-tabs">
              <button type="button" className={assetTab === "players" ? "selected" : ""} onClick={() => setAssetTab("players")}>Players</button>
              <button type="button" className={assetTab === "picks" ? "selected" : ""} onClick={() => setAssetTab("picks")}>Picks</button>
            </div>
          </div>
          <div className="trade-asset-columns compact">
            <TradeAssetList teamId={userTeamId} save={save} assets={userAssets} disabledKeys={selectedKeys} addLabel="Send" addAsset={(asset) => addAsset("gives", asset)} />
            <TradeAssetList teamId={targetTeamId} save={save} assets={targetAssets} disabledKeys={selectedKeys} addLabel="Ask" addAsset={(asset) => addAsset("receives", asset)} />
          </div>
        </div>
      ) : null}

      {activeSection === "incoming" ? (
        <div className="trade-pane-body">
          <div className="trade-inline-actions">
            <button type="button" onClick={refreshActivity}>Refresh AI Activity</button>
          </div>
          {incomingOffers.length ? incomingOffers.map((offer) => (
            <article key={offer.id} className="trade-offer-card compact">
              <div className="trade-offer-card-head">
                <TradeTeamIdentity save={save} teamId={offer.fromTeamId} size={30} compact />
                <strong className={`trade-verdict trade-verdict-${offer.evaluation.verdict}`}>{offer.evaluation.verdict}</strong>
              </div>
              <div className="trade-offer-packages">
                <div>
                  <strong>You send</strong>
                  <TradeMiniAssetList save={save} assets={offer.receives} />
                </div>
                <div>
                  <strong>You receive</strong>
                  <TradeMiniAssetList save={save} assets={offer.gives} />
                </div>
              </div>
              <div className="trade-card-actions">
                <button type="button" onClick={() => loadIncomingOffer(offer)}>Load</button>
                <button type="button" disabled={offer.evaluation.hardBlocks.length > 0} onClick={() => acceptOffer(offer.id)}>Accept</button>
              </div>
            </article>
          )) : (
            <div className="trade-empty-state">
              <strong>No incoming offers</strong>
              <span>Refresh AI activity or shop players from your block to create more conversations.</span>
              <button type="button" onClick={refreshActivity}>Refresh AI Activity</button>
            </div>
          )}
        </div>
      ) : null}

      {activeSection === "block" ? (
        <div className="trade-pane-body">
          <div className="trade-player-list">
            {blockPlayers.map((player) => (
              <TradePlayerActionRow
                key={player.id}
                save={save}
                player={player}
                status={userBlockIds.has(player.id) ? "Shopping" : "Private"}
                actionLabel={userBlockIds.has(player.id) ? "Remove" : "Shop"}
                onAction={() => toggleBlock(player.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeSection === "market" ? (
        <div className="trade-pane-body">
          <div className="trade-filter-grid market">
            <input value={marketSearch} onChange={(event) => setMarketSearch(event.target.value)} placeholder="Search market targets" />
            <select value={marketTeamFilter} onChange={(event) => setMarketTeamFilter(event.target.value)}>
              <option value="all">All Teams</option>
              {save.teams.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)).map((team) => (
                <option key={team.id} value={team.id}>{team.fullName}</option>
              ))}
            </select>
          </div>
          <div className="trade-player-list">
            {boardPlayers.length ? boardPlayers.map((player) => (
              <TradePlayerActionRow
                key={player.id}
                save={save}
                player={player}
                status={teamById(save, player.teamId).name}
                actionLabel="Target"
                onAction={() => targetMarketPlayer(player)}
              />
            )) : (
              <div className="trade-empty-state">
                <strong>No matching targets</strong>
                <span>Change the team or search filter to scan more of the market.</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeSection === "history" ? (
        <div className="trade-pane-body">
          <TradeHistoryPanel save={save} compact />
          <TradeNewsPanel save={save} compact />
        </div>
      ) : null}
    </aside>
  );
}

function TradePlayerActionRow({
  save,
  player,
  status,
  actionLabel,
  onAction
}: {
  save: GameSave;
  player: Player;
  status: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="trade-player-row">
      <div className="trade-player-main">
        <TradeTeamIdentity save={save} teamId={player.teamId} size={30} compact />
        <span>
          <strong>{player.firstName} {player.lastName}</strong>
          <small>{player.position} | {player.overall} OVR | Age {player.age} | {formatTradeMoney(player.salary)} APY</small>
        </span>
      </div>
      <span className="trade-player-status">{status}</span>
      <button type="button" onClick={onAction}>{actionLabel}</button>
    </article>
  );
}

function TradeDealBuilderPane({
  save,
  offer,
  userTeamId,
  targetTeamId,
  gives,
  receives,
  evaluation,
  hasAssets,
  submitDisabled,
  removeAsset,
  clearBuilder,
  submitTrade,
  loadCounterOffer,
  toggleBlock,
  userBlockIds
}: {
  save: GameSave;
  offer: TradeOffer;
  userTeamId: string;
  targetTeamId: string;
  gives: TradeAsset[];
  receives: TradeAsset[];
  evaluation: TradeEvaluation;
  hasAssets: boolean;
  submitDisabled: boolean;
  removeAsset: (side: "gives" | "receives", asset: TradeAsset) => void;
  clearBuilder: () => void;
  submitTrade: (offer: TradeOffer) => void;
  loadCounterOffer: (offer: TradeOffer) => void;
  toggleBlock: (playerId: string) => void;
  userBlockIds: Set<string>;
}) {
  const firstMessage = evaluation.hardBlocks[0] ?? evaluation.reasons[0] ?? "Add assets from the market board to start pricing the package.";
  const shoppablePlayers = gives
    .filter((asset) => asset.type === "player")
    .map((asset) => save.players.find((player) => player.id === asset.id))
    .filter((player): player is Player => {
      if (!player) return false;
      return !userBlockIds.has(player.id);
    });

  return (
    <main className="table-card trade-deal-builder-pane">
      <div className="trade-pane-header builder">
        <div>
          <p className="eyebrow">Deal Builder</p>
          <h3>Active package</h3>
          <TradeTeamMatchup save={save} userTeamId={userTeamId} targetTeamId={targetTeamId} />
        </div>
        <div className="trade-builder-badges">
          <span>{gives.length} for {receives.length}</span>
          <span>{evaluation.hardBlocks.length} blocks</span>
        </div>
      </div>

      <div className="trade-package-columns workbench">
        <TradePackageColumn teamId={userTeamId} save={save} assets={gives} side="gives" removeAsset={removeAsset} />
        <TradePackageColumn teamId={targetTeamId} save={save} assets={receives} side="receives" removeAsset={removeAsset} />
      </div>

      <div className="trade-builder-status">
        <div className="trade-interest">
          <span>AI interest</span>
          <div><i style={{ width: `${evaluation.interest}%` }} /></div>
          <strong>{evaluation.interest}</strong>
        </div>
        <strong className={`trade-verdict trade-verdict-${evaluation.verdict}`}>{evaluation.verdict}</strong>
      </div>

      <div className="trade-reasons builder">
        <span>{firstMessage}</span>
        {evaluation.reasons.slice(1, 4).map((reason) => <span key={reason}>{reason}</span>)}
      </div>

      <div className="trade-builder-actions">
        <button type="button" disabled={submitDisabled} onClick={() => submitTrade({ ...offer, evaluation })}>Submit Trade</button>
        {evaluation.counterOffers?.[0] ? <button type="button" onClick={() => loadCounterOffer(evaluation.counterOffers![0])}>Load Counter</button> : null}
        <button type="button" disabled={!shoppablePlayers.length} onClick={() => shoppablePlayers.forEach((player) => toggleBlock(player.id))}>Shop Selected</button>
        <button type="button" disabled={!hasAssets} onClick={clearBuilder}>Clear</button>
      </div>
    </main>
  );
}

function TradeAnalysisRail({ save, offer, evaluation }: { save: GameSave; offer: TradeOffer; evaluation: TradeEvaluation }) {
  const warnings = evaluation.rosterPreview.flatMap((preview) => [...preview.warnings, ...preview.positionWarnings]).slice(0, 8);
  return (
    <aside className="table-card trade-analysis-rail">
      <div className="trade-pane-header">
        <div>
          <p className="eyebrow">Analysis Rail</p>
          <h3>Live deal impact</h3>
        </div>
        <strong className={`trade-verdict trade-verdict-${evaluation.verdict}`}>{evaluation.verdict}</strong>
      </div>

      <div className="trade-analysis-block">
        <div className="trade-summary-metrics rail">
          <article><span>Interest</span><strong>{evaluation.interest}</strong></article>
          <article><span>Value Gap</span><strong>{evaluation.valueGap >= 0 ? "+" : ""}{evaluation.valueGap}</strong></article>
          <article><span>Hard Blocks</span><strong>{evaluation.hardBlocks.length}</strong></article>
        </div>
        <div className="trade-interest rail">
          <span>AI interest</span>
          <div><i style={{ width: `${evaluation.interest}%` }} /></div>
          <strong>{evaluation.interest}</strong>
        </div>
      </div>

      <div className="trade-analysis-block">
        <strong className="trade-block-title">Reasons</strong>
        <div className="trade-reasons compact">
          {[...evaluation.hardBlocks, ...evaluation.reasons].slice(0, 8).map((reason) => <span key={reason}>{reason}</span>)}
          {!evaluation.hardBlocks.length && !evaluation.reasons.length ? <span>No issues detected yet.</span> : null}
        </div>
      </div>

      <div className="trade-analysis-block">
        <strong className="trade-block-title">Cap / Roster Preview</strong>
        <DataTable>
          <thead><tr><th>Team</th><th>Room</th><th>In</th><th>Out</th><th>Dead</th><th>Projected</th><th>Roster</th></tr></thead>
          <tbody>
            {evaluation.capPreview.map((cap) => {
              const roster = evaluation.rosterPreview.find((preview) => preview.teamId === cap.teamId);
              return (
                <tr key={cap.teamId}>
                  <td><TradeTeamIdentity save={save} teamId={cap.teamId} size={26} compact /></td>
                  <td>{formatTradeMoney(cap.currentRoom)}</td>
                  <td>{formatTradeMoney(cap.incomingCap)}</td>
                  <td>{formatTradeMoney(cap.outgoingCap)}</td>
                  <td>{formatTradeMoney(cap.deadMoney)}</td>
                  <td><strong>{formatTradeMoney(cap.projectedRoom)}</strong></td>
                  <td>{roster?.rosterBefore ?? 0} to {roster?.rosterAfter ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {warnings.length ? (
          <div className="trade-reasons compact warnings">
            {warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>
        ) : null}
      </div>

      <details className="trade-debug">
        <summary>Value Breakdown</summary>
        <TradeBreakdownTable title="Partner receives" rows={evaluation.outgoingBreakdown} />
        <TradeBreakdownTable title="User receives" rows={evaluation.incomingBreakdown} />
        <small>Offer ID: {offer.id}</small>
      </details>
    </aside>
  );
}

function TradePackageSummary({
  save,
  offer,
  targetTeamId,
  setTargetTeamId,
  gives,
  receives,
  evaluation,
  hasAssets,
  submitDisabled,
  clearBuilder,
  submitTrade,
  refreshActivity,
  loadCounterOffer,
  removeAsset
}: {
  save: GameSave;
  offer: TradeOffer;
  targetTeamId: string;
  setTargetTeamId: (teamId: string) => void;
  gives: TradeAsset[];
  receives: TradeAsset[];
  evaluation: TradeOffer["evaluation"];
  hasAssets: boolean;
  submitDisabled: boolean;
  clearBuilder: () => void;
  submitTrade: (offer: TradeOffer) => void;
  refreshActivity: () => void;
  loadCounterOffer: (offer: TradeOffer) => void;
  removeAsset: (side: "gives" | "receives", asset: TradeAsset) => void;
}) {
  const userTeam = teamById(save, save.selectedTeamId);
  const targetTeam = teamById(save, targetTeamId);
  const firstMessage = evaluation.hardBlocks[0] ?? evaluation.reasons[0] ?? "Build a package to see partner interest.";

  return (
    <section className="table-card trade-package-summary">
      <div className="trade-summary-topline">
        <div>
          <p className="eyebrow">Trading Ops Desk</p>
          <h3>Active package</h3>
          <TradeTeamMatchup save={save} userTeamId={userTeam.id} targetTeamId={targetTeam.id} />
        </div>
        <div className="trade-summary-controls">
          <TeamScopePicker save={save} teamId={targetTeamId} setTeamId={setTargetTeamId} label="Trade partner" />
          <button type="button" onClick={refreshActivity}>Refresh AI Activity</button>
        </div>
      </div>

      <div className="trade-summary-metrics">
        <article>
          <span>Verdict</span>
          <strong className={`trade-verdict trade-verdict-${evaluation.verdict}`}>{evaluation.verdict}</strong>
        </article>
        <article>
          <span>Interest</span>
          <strong>{evaluation.interest}</strong>
        </article>
        <article>
          <span>Value Gap</span>
          <strong>{evaluation.valueGap >= 0 ? "+" : ""}{evaluation.valueGap}</strong>
        </article>
        <article>
          <span>Package</span>
          <strong>{gives.length} for {receives.length}</strong>
        </article>
        <article>
          <span>Blocks</span>
          <strong>{evaluation.hardBlocks.length}</strong>
        </article>
      </div>

      <div className="trade-summary-package">
        <TradePackageColumn teamId={userTeam.id} save={save} assets={gives} side="gives" removeAsset={removeAsset} compact />
        <TradePackageColumn teamId={targetTeam.id} save={save} assets={receives} side="receives" removeAsset={removeAsset} compact />
      </div>

      <div className="trade-interest summary">
        <span>AI interest</span>
        <div><i style={{ width: `${evaluation.interest}%` }} /></div>
        <strong>{evaluation.interest}</strong>
      </div>
      <div className="trade-summary-footer">
        <div className="trade-reasons">
          <span>{firstMessage}</span>
        </div>
        <div className="trade-modal-actions">
          <button type="button" disabled={submitDisabled} onClick={() => submitTrade({ ...offer, evaluation })}>Submit Trade</button>
          {evaluation.counterOffers?.[0] ? <button type="button" onClick={() => loadCounterOffer(evaluation.counterOffers![0])}>Load Counter</button> : null}
          <button type="button" disabled={!hasAssets} onClick={clearBuilder}>Clear Package</button>
        </div>
      </div>
    </section>
  );
}

function tradeAssetsForTeam(save: GameSave, teamId: string): TradeAsset[] {
  const playerAssets = save.players
    .filter((player) => player.teamId === teamId && !isPracticeSquadPlayer(player))
    .map((player) => ({ type: "player" as const, id: player.id }));
  const pickAssets = save.draftPicks
    .filter((pick) => pick.currentTeamId === teamId && !pick.usedByProspectId)
    .map((pick) => ({ type: "pick" as const, id: pick.id }));
  return [...playerAssets, ...pickAssets].sort((a, b) => tradeAssetSortLabel(save, a).localeCompare(tradeAssetSortLabel(save, b)));
}

function filterTradeAssets(save: GameSave, assets: TradeAsset[], tab: "players" | "picks", search: string, position: Position | "all"): TradeAsset[] {
  const query = search.trim().toLowerCase();
  return assets.filter((asset) => {
    if (tab === "players" && asset.type !== "player") return false;
    if (tab === "picks" && asset.type !== "pick") return false;
    const player = asset.type === "player" ? save.players.find((candidate) => candidate.id === asset.id) : undefined;
    if (position !== "all" && player?.position !== position) return false;
    if (!query) return true;
    return tradeAssetLabel(save, asset).toLowerCase().includes(query);
  }).slice(0, 28);
}

function TradePackageColumn({
  teamId,
  save,
  assets,
  side,
  removeAsset,
  compact = false
}: {
  teamId: string;
  save: GameSave;
  assets: TradeAsset[];
  side: "gives" | "receives";
  removeAsset: (side: "gives" | "receives", asset: TradeAsset) => void;
  compact?: boolean;
}) {
  return (
    <div className={`trade-package-column ${compact ? "compact" : ""}`}>
      <div className="trade-package-column-head">
        <TradeTeamIdentity save={save} teamId={teamId} size={compact ? 28 : 34} compact={compact} />
        <span>sends</span>
      </div>
      {assets.length ? assets.map((asset) => (
        <button key={tradeAssetKey(asset)} type="button" title={`Remove ${tradeAssetLabel(save, asset)}`} onClick={() => removeAsset(side, asset)}>
          <span className="trade-package-asset-text">
            <strong>{tradeAssetLabel(save, asset)}</strong>
            <small>{tradeAssetSecondaryLabel(save, asset) || "Selected asset"}</small>
          </span>
        </button>
      )) : <span>No assets selected</span>}
    </div>
  );
}

function TradeAssetList({ teamId, save, assets, disabledKeys, addLabel, addAsset }: { teamId: string; save: GameSave; assets: TradeAsset[]; disabledKeys: Set<string>; addLabel: string; addAsset: (asset: TradeAsset) => void }) {
  return (
    <div className="trade-asset-list">
      <TradeTeamIdentity save={save} teamId={teamId} compact />
      {assets.map((asset) => (
        <button key={tradeAssetKey(asset)} type="button" disabled={disabledKeys.has(tradeAssetKey(asset))} onClick={() => addAsset(asset)}>
          <TradeAssetContent save={save} asset={asset} />
          <em>{addLabel}</em>
        </button>
      ))}
      {!assets.length ? <p className="roster-contract-note">No matching assets.</p> : null}
    </div>
  );
}

function TradeBreakdownTable({ title, rows }: { title: string; rows: TradeOffer["evaluation"]["incomingBreakdown"] }) {
  return (
    <div className="trade-breakdown-table">
      <strong>{title}</strong>
      <DataTable>
        <thead><tr><th>Asset</th><th>Base</th><th>Need</th><th>Protect</th><th>Final</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${row.assetType}-${row.assetId}`}>
              <td>{row.label}</td>
              <td>{row.base}</td>
              <td>{row.need.toFixed(2)}</td>
              <td>{row.protection.toFixed(2)}</td>
              <td><strong>{row.final}</strong></td>
            </tr>
          )) : <tr><td colSpan={5}>No assets.</td></tr>}
        </tbody>
      </DataTable>
    </div>
  );
}

function TradePreviewPanel({ save, offer }: { save: GameSave; offer: TradeOffer }) {
  const evaluation = offer.evaluation;
  return (
    <section className="table-card">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Cap / Roster Preview</p>
          <h3>Deal impact</h3>
        </div>
      </div>
      <DataTable>
        <thead><tr><th>Team</th><th>Room</th><th>Incoming</th><th>Outgoing</th><th>Dead</th><th>Projected</th><th>Roster</th></tr></thead>
        <tbody>
          {evaluation.capPreview.map((cap) => {
            const roster = evaluation.rosterPreview.find((preview) => preview.teamId === cap.teamId);
            return (
              <tr key={cap.teamId}>
                <td><TradeTeamIdentity save={save} teamId={cap.teamId} size={28} compact /></td>
                <td>{formatTradeMoney(cap.currentRoom)}</td>
                <td>{formatTradeMoney(cap.incomingCap)}</td>
                <td>{formatTradeMoney(cap.outgoingCap)}</td>
                <td>{formatTradeMoney(cap.deadMoney)}</td>
                <td><strong>{formatTradeMoney(cap.projectedRoom)}</strong></td>
                <td>{roster?.rosterBefore ?? 0} to {roster?.rosterAfter ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <div className="trade-reasons">
        {evaluation.rosterPreview.flatMap((preview) => [...preview.warnings, ...preview.positionWarnings]).slice(0, 6).map((warning) => (
          <span key={warning}>{warning}</span>
        ))}
      </div>
    </section>
  );
}

function TradeHistoryPanel({ save, compact = false }: { save: GameSave; compact?: boolean }) {
  const history = (save.tradeState?.history ?? []).slice(0, 10);
  return (
    <section className={compact ? "trade-panel-section" : "table-card"}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">History</p>
          <h3>Completed trades</h3>
        </div>
      </div>
      <div className="trade-list-stack">
        {history.length ? history.map((entry) => (
          <article key={entry.id} className="trade-offer-card">
            <div className="trade-offer-card-head">
              <TradeTeamLogoStrip save={save} teamIds={[entry.fromTeamId, entry.toTeamId]} />
              <strong>{entry.date ?? `Week ${entry.week}`}</strong>
            </div>
            <span>{entry.summary}</span>
          </article>
        )) : <p className="roster-contract-note">No completed regular trade history yet.</p>}
      </div>
    </section>
  );
}

function TradeNewsPanel({ save, compact = false }: { save: GameSave; compact?: boolean }) {
  const news = (save.tradeState?.news ?? []).slice(0, 10);
  return (
    <section className={compact ? "trade-panel-section" : "table-card"}>
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">News</p>
          <h3>League transaction wire</h3>
        </div>
      </div>
      <div className="trade-list-stack">
        {news.length ? news.map((item) => (
          <article key={item.id} className="trade-offer-card">
            <div className="trade-offer-card-head">
              <TradeTeamLogoStrip save={save} teamIds={item.teamIds} />
              <strong>{item.title}</strong>
            </div>
            <span>{item.body}</span>
            <small>{item.importance}</small>
          </article>
        )) : <p className="roster-contract-note">No trade news yet.</p>}
      </div>
    </section>
  );
}

type FreeAgentsTab = "available" | "pending" | "recent" | "offers";
const FREE_AGENT_PAGE_SIZE = 120;

interface FreeAgentMarketRow {
  player: Player;
  name: string;
  school?: CollegeProgram;
  teamLabel?: string;
  ask: number;
  years: number;
  role: FreeAgentRolePromise;
  interest: number;
  existingOffer?: FreeAgentOffer;
  compLabel: string;
  statusLabel: string;
  projectedMarketLabel: string;
}

function sortFreeAgentRows(rows: FreeAgentMarketRow[], sort: SortState<FreeAgentSortKey>): FreeAgentMarketRow[] {
  return rows.slice().sort((a, b) => {
    const values: Record<FreeAgentSortKey, [string | number, string | number]> = {
      name: [a.name, b.name],
      position: [a.player.position, b.player.position],
      age: [a.player.age, b.player.age],
      overall: [a.player.overall, b.player.overall],
      potential: [a.player.potential, b.player.potential],
      ask: [a.ask, b.ask],
      years: [a.years, b.years],
      interest: [a.interest, b.interest],
      salary: [a.player.salary, b.player.salary]
    };
    const primary = sortableValueCompare(values[sort.key][0], values[sort.key][1]) * sortMultiplier(sort.direction);
    if (primary !== 0) return primary;
    return a.name.localeCompare(b.name);
  });
}

function ShowMoreRows({
  visible,
  total,
  onShowMore
}: {
  visible: number;
  total: number;
  onShowMore: () => void;
}) {
  if (visible >= total) return null;
  return (
    <div className="table-show-more">
      <span>Showing {visible} of {total}</span>
      <button type="button" onClick={onShowMore}>Show More</button>
    </div>
  );
}

function FreeAgentsView({
  save,
  submitOffer,
  resolveWave,
  signPractice
}: {
  save: GameSave;
  submitOffer: (playerId: string, terms?: Partial<Pick<FreeAgentOffer, "years" | "apy" | "security" | "role">>) => void;
  resolveWave: () => void;
  signPractice: (playerId: string) => void;
}) {
  const [tab, setTab] = useState<FreeAgentsTab>("available");
  const [sort, setSort] = useState<SortState<FreeAgentSortKey>>({ key: "ask", direction: "desc" });
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [overallFilter, setOverallFilter] = useState<RosterRangeFilter>("all");
  const [potentialFilter, setPotentialFilter] = useState<RosterRangeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<RosterAgeFilter>("all");
  const [salaryFilter, setSalaryFilter] = useState<FreeAgentSalaryFilter>("all");
  const [experienceFilter, setExperienceFilter] = useState<RosterExperienceFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleRows, setVisibleRows] = useState(FREE_AGENT_PAGE_SIZE);
  const [activePlayerId, setActivePlayerId] = useState<string | undefined>();
  const team = selectedTeam(save);
  const teamRosterSize = rosterSize(save, team.id);
  const teamPracticeSize = practiceSquadSize(save, team.id);
  const budgetRoom = teamCapLedger(save, team.id).capRoom;
  const selectedRosterNeeds = useMemo(() => rosterNeeds(save, team.id), [save, team.id]);
  const selectedNeedsByPosition = useMemo(() => new Map(selectedRosterNeeds.map((need) => [need.position, need.grade])), [selectedRosterNeeds]);
  const selectedTeamOverall = useMemo(() => teamOverall(save, team.id), [save, team.id]);
  const needs = selectedRosterNeeds.slice(0, 4);
  const market = normalizeFreeAgencyMarket(save);
  const schoolById = useMemo(() => new Map(save.schools.map((school) => [school.id, school])), [save.schools]);
  const submittedOfferByPlayerId = useMemo(() => {
    const offers = new Map<string, FreeAgentOffer>();
    for (const offer of market.offers) {
      if (offer.teamId === team.id && offer.status === "submitted") offers.set(offer.playerId, offer);
    }
    return offers;
  }, [market.offers, team.id]);
  const freeAgentRows = useMemo(() => {
    const baseRows = freeAgentPlayers(save).filter((player) => {
      if (positionFilter !== "all" && player.position !== positionFilter) return false;
      if (!rosterRangeMatch(player.overall, overallFilter)) return false;
      if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
      if (!rosterAgeMatch(player.age, ageFilter)) return false;
      if (!freeAgentSalaryMatch(player.salary, salaryFilter)) return false;
      if (!rosterExperienceMatch(player, experienceFilter)) return false;
      return true;
    }).map((player): FreeAgentMarketRow => {
      const ask = expectedFreeAgentAsk(player);
      const years = expectedFreeAgentYears(player);
      const need = selectedNeedsByPosition.get(player.position) ?? 60;
      const role: FreeAgentRolePromise = need <= player.overall - 4 && player.overall >= 60 ? "starter" : need <= player.overall + 3 ? "rotation" : player.age <= 24 || player.potential >= player.overall + 8 ? "development" : "depth";
      const moneyScore = Math.min(42, (ask / Math.max(0.5, ask)) * 34);
      const needScore = Math.max(0, Math.min(12, (player.overall - need + 10) * 0.55));
      const contenderScore = Math.max(0, Math.min(8, (selectedTeamOverall - 55) * 0.25));
      const capScore = Math.max(0, Math.min(6, budgetRoom / Math.max(1, ask) * 1.8));
      const loyaltyPenalty = player.previousTeamId && player.previousTeamId !== team.id ? 0 : 3;
      const roleScore = role === "starter" ? 15 : role === "rotation" ? 10 : role === "development" ? 7 : 5;
      const interest = Math.round(Math.max(1, Math.min(99, moneyScore + 8 + roleScore + needScore + contenderScore + capScore + loyaltyPenalty)));
      const existingOffer = submittedOfferByPlayerId.get(player.id);
      return {
        player,
        name: playerName(player),
        school: schoolById.get(player.collegeId),
        ask,
        years,
        role,
        interest,
        existingOffer,
        compLabel: player.contract?.rights === "ufa" && player.previousTeamId ? "CFA" : "-",
        statusLabel: existingOffer ? "Offer pending" : "Available",
        projectedMarketLabel: ask >= 10 ? "Premium" : ask >= 4 ? "Starter market" : "Depth market"
      };
    });
    return sortFreeAgentRows(baseRows, sort);
  }, [ageFilter, budgetRoom, experienceFilter, overallFilter, positionFilter, potentialFilter, salaryFilter, save, schoolById, selectedNeedsByPosition, selectedTeamOverall, sort, submittedOfferByPlayerId, team.id]);
  const pendingRows = useMemo(() => {
    const baseRows = projectedPendingFreeAgents(save).filter((player) => {
    if (positionFilter !== "all" && player.position !== positionFilter) return false;
    if (!rosterRangeMatch(player.overall, overallFilter)) return false;
    if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
    if (!rosterAgeMatch(player.age, ageFilter)) return false;
    return true;
    }).map((player): FreeAgentMarketRow => {
      const ask = expectedFreeAgentAsk(player);
      const years = expectedFreeAgentYears(player);
      const need = selectedNeedsByPosition.get(player.position) ?? 60;
      const role: FreeAgentRolePromise = need <= player.overall - 4 && player.overall >= 60 ? "starter" : need <= player.overall + 3 ? "rotation" : player.age <= 24 || player.potential >= player.overall + 8 ? "development" : "depth";
      return {
        player,
        name: playerName(player),
        school: schoolById.get(player.collegeId),
        teamLabel: teamById(save, player.teamId).abbreviation,
        ask,
        years,
        role,
        interest: 0,
        compLabel: player.overall >= 58 ? "Possible CFA" : "-",
        statusLabel: player.contract?.rights?.toUpperCase() ?? "UFA",
        projectedMarketLabel: ask >= 10 ? "Premium" : ask >= 4 ? "Starter market" : "Depth market"
      };
    });
    return sortFreeAgentRows(baseRows, sort);
  }, [ageFilter, overallFilter, positionFilter, potentialFilter, save, schoolById, selectedNeedsByPosition, sort]);
  const visibleFreeAgentRows = freeAgentRows.slice(0, visibleRows);
  const visiblePendingRows = pendingRows.slice(0, visibleRows);
  const submittedOffers = market.offers.filter((offer) => offer.status === "submitted").sort((a, b) => b.expectedAsk - a.expectedAsk || b.interestScore - a.interestScore);
  const activePlayer = activePlayerId ? save.players.find((player) => player.id === activePlayerId) : undefined;
  const activeFilterItems: Array<ActiveFilter | undefined> = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    overallFilter !== "all" ? { label: `OVR ${overallFilter}`, clear: () => setOverallFilter("all") } : undefined,
    potentialFilter !== "all" ? { label: `POT ${potentialFilter}`, clear: () => setPotentialFilter("all") } : undefined,
    ageFilter !== "all" ? { label: `Age ${ageFilter}`, clear: () => setAgeFilter("all") } : undefined,
    salaryFilter !== "all" ? { label: `Salary ${salaryFilter}`, clear: () => setSalaryFilter("all") } : undefined,
    experienceFilter !== "all" ? { label: experienceFilter === "rookie" ? "Rookies" : `${experienceFilter} yrs`, clear: () => setExperienceFilter("all") } : undefined
  ];
  const activeFilters = activeFilterItems.filter(isActiveFilter);

  const tabCounts: Record<FreeAgentsTab, number> = {
    available: freeAgentRows.length,
    pending: pendingRows.length,
    recent: save.freeAgencyLog.length,
    offers: submittedOffers.length
  };

  useEffect(() => {
    setVisibleRows(FREE_AGENT_PAGE_SIZE);
  }, [ageFilter, experienceFilter, overallFilter, positionFilter, potentialFilter, salaryFilter, sort, tab]);

  return (
    <section className="view-stack roster-workspace free-agency-workspace">
      <section className="free-agency-hero free-agency-table-hero">
        <div>
          <p className="eyebrow">Open Market</p>
          <h3>Free Agents</h3>
          <p>Submit offers into weekly market waves, monitor the next free-agent class, and track recent movement.</p>
        </div>
        <div className="free-agency-hero-metrics">
          <span><small>Roster</small><strong>{teamRosterSize}/{MAX_ROSTER_SIZE}</strong></span>
          <span><small>Practice Squad</small><strong>{teamPracticeSize}/{PRACTICE_SQUAD_SIZE}</strong></span>
          <span><small>Cap Room</small><strong>${budgetRoom.toFixed(1)}M</strong></span>
          <span><small>Wave</small><strong>{market.currentWave}</strong></span>
          <span><small>Needs</small><strong>{needs.map((need) => need.position).join(", ") || "None"}</strong></span>
        </div>
      </section>

      <div className="segmented-tabs compact-tabs free-agent-tabs">
        {([
          ["available", "Available"],
          ["pending", "Pending Free Agents"],
          ["offers", "Offer Tracker"],
          ["recent", "Recently Signed"]
        ] as Array<[FreeAgentsTab, string]>).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "selected" : ""} onClick={() => setTab(id)}>
            {label} <span>{tabCounts[id]}</span>
          </button>
        ))}
        <button type="button" onClick={resolveWave}>Resolve FA Wave</button>
      </div>

      <div className="roster-command-bar free-agent-command-bar">
        <div className="roster-toolbar-group">
          <FilterButton count={activeFilters.length} onClick={() => setFiltersOpen(true)} />
        </div>
        <div className="roster-toolbar-meta">
          <span className="read-only-chip">{freeAgentRows.length} available</span>
        </div>
      </div>

      {filtersOpen ? (
        <FilterModal
          title="Free Agent Filters"
          activeFilters={activeFilters}
          clearAll={() => {
            setPositionFilter("all");
            setOverallFilter("all");
            setPotentialFilter("all");
            setAgeFilter("all");
            setSalaryFilter("all");
            setExperienceFilter("all");
          }}
          close={() => setFiltersOpen(false)}
        >
          <label className="roster-select-field">
            <span>Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </label>
          <label className="roster-select-field">
            <span>OVR</span>
            <select value={overallFilter} onChange={(event) => setOverallFilter(event.target.value as RosterRangeFilter)}>
              <option value="all">All</option>
              <option value="90+">90+</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="60-69">60-69</option>
              <option value="under-60">Under 60</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>POT</span>
            <select value={potentialFilter} onChange={(event) => setPotentialFilter(event.target.value as RosterRangeFilter)}>
              <option value="all">All</option>
              <option value="90+">90+</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="60-69">60-69</option>
              <option value="under-60">Under 60</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Age</span>
            <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value as RosterAgeFilter)}>
              <option value="all">All</option>
              <option value="24-under">24 and under</option>
              <option value="25-28">25-28</option>
              <option value="29-32">29-32</option>
              <option value="33-plus">33+</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Salary</span>
            <select value={salaryFilter} onChange={(event) => setSalaryFilter(event.target.value as FreeAgentSalaryFilter)}>
              <option value="all">All</option>
              <option value="under-2">Under $2M</option>
              <option value="2-5">$2M-$5M</option>
              <option value="5-10">$5M-$10M</option>
              <option value="10-plus">$10M+</option>
            </select>
          </label>
          <label className="roster-select-field">
            <span>Experience</span>
            <select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value as RosterExperienceFilter)}>
              <option value="all">All</option>
              <option value="rookie">Rookies</option>
              <option value="1-3">1-3 years</option>
              <option value="4-6">4-6 years</option>
              <option value="7-plus">7+ years</option>
            </select>
          </label>
        </FilterModal>
      ) : null}

      {tab === "available" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <SortableHeader label="Name" sortKey="name" sort={sort} setSort={setSort} defaultDirection="asc" />
                <SortableHeader label="Pos" sortKey="position" sort={sort} setSort={setSort} defaultDirection="asc" />
                <SortableHeader label="Age" sortKey="age" sort={sort} setSort={setSort} defaultDirection="asc" />
                <SortableHeader label="OVR" sortKey="overall" sort={sort} setSort={setSort} />
                <SortableHeader label="POT" sortKey="potential" sort={sort} setSort={setSort} />
                <SortableHeader label="Ask" sortKey="ask" sort={sort} setSort={setSort} />
                <SortableHeader label="Years" sortKey="years" sort={sort} setSort={setSort} />
                <SortableHeader label="Interest" sortKey="interest" sort={sort} setSort={setSort} />
                <th>Comp</th>
                <th>Status</th>
                <th>Offer</th>
                <th>PS</th>
              </tr>
            </thead>
            <tbody>
              {visibleFreeAgentRows.length ? visibleFreeAgentRows.map((row) => {
            const { player } = row;
            const practiceCheck = canSignFreeAgentToPracticeSquad(save, player.id, team.id);
            return (
              <tr key={player.id} className="roster-table-row" onClick={() => setActivePlayerId(player.id)} tabIndex={0}>
                <td>
                  <div className="roster-table-player">
                    <span className="roster-table-player-main"><strong>{player.firstName} {player.lastName}</strong></span>
                    <span className="roster-table-player-meta"><CollegeLogo school={row.school} size={22} /> <span>{row.school?.name ?? "Unknown College"}</span></span>
                  </div>
                </td>
                <td>{player.position}</td>
                <td>{player.age}</td>
                <td><strong>{player.overall}</strong></td>
                <td><strong>{player.potential}</strong></td>
                <td><strong>${row.ask.toFixed(1)}M</strong></td>
                <td>{row.years}</td>
                <td><span className="read-only-chip">{row.interest}</span></td>
                <td>{row.compLabel}</td>
                <td>{row.statusLabel}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="roster-row-action" disabled={Boolean(row.existingOffer)} onClick={() => setActivePlayerId(player.id)}>
                    {row.existingOffer ? "Pending" : "Offer"}
                  </button>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="roster-row-action"
                    disabled={!practiceCheck.ok}
                    title={practiceCheck.reason ?? `Sign ${player.firstName} ${player.lastName} to practice squad`}
                    onClick={() => signPractice(player.id)}
                  >
                    PS
                  </button>
                </td>
              </tr>
            );
          }) : <tr><td colSpan={12}>No free agents match the current filters.</td></tr>}
            </tbody>
          </DataTable>
          <ShowMoreRows visible={visibleFreeAgentRows.length} total={freeAgentRows.length} onShowMore={() => setVisibleRows((current) => current + FREE_AGENT_PAGE_SIZE)} />
        </section>
      ) : null}

      {tab === "pending" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <SortableHeader label="Name" sortKey="name" sort={sort} setSort={setSort} defaultDirection="asc" />
                <th>Team</th>
                <SortableHeader label="Pos" sortKey="position" sort={sort} setSort={setSort} defaultDirection="asc" />
                <SortableHeader label="Age" sortKey="age" sort={sort} setSort={setSort} defaultDirection="asc" />
                <SortableHeader label="OVR" sortKey="overall" sort={sort} setSort={setSort} />
                <SortableHeader label="POT" sortKey="potential" sort={sort} setSort={setSort} />
                <SortableHeader label="Current APY" sortKey="salary" sort={sort} setSort={setSort} />
                <SortableHeader label="Expected Ask" sortKey="ask" sort={sort} setSort={setSort} />
                <th>Rights</th>
                <th>Comp Risk</th>
                <th>Projected Market</th>
              </tr>
            </thead>
            <tbody>
              {visiblePendingRows.length ? visiblePendingRows.map((row) => {
                const { player } = row;
                return (
                  <tr key={player.id} className="roster-table-row" onClick={() => setActivePlayerId(player.id)} tabIndex={0}>
                    <td>
                      <div className="roster-table-player">
                        <span className="roster-table-player-main"><strong>{player.firstName} {player.lastName}</strong></span>
                        <span className="roster-table-player-meta"><CollegeLogo school={row.school} size={22} /> <span>{row.school?.name ?? "Unknown College"}</span></span>
                      </div>
                    </td>
                    <td>{row.teamLabel}</td>
                    <td>{player.position}</td>
                    <td>{player.age}</td>
                    <td><strong>{player.overall}</strong></td>
                    <td><strong>{player.potential}</strong></td>
                    <td>${player.salary.toFixed(1)}M</td>
                    <td><strong>${row.ask.toFixed(1)}M</strong></td>
                    <td>{row.statusLabel}</td>
                    <td>{row.compLabel}</td>
                    <td>{row.projectedMarketLabel}</td>
                  </tr>
                );
              }) : <tr><td colSpan={11}>No projected expiring free agents match the current filters.</td></tr>}
            </tbody>
          </DataTable>
          <ShowMoreRows visible={visiblePendingRows.length} total={pendingRows.length} onShowMore={() => setVisibleRows((current) => current + FREE_AGENT_PAGE_SIZE)} />
        </section>
      ) : null}

      {tab === "offers" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>APY</th>
                <th>Years</th>
                <th>Role</th>
                <th>Interest</th>
                <th>Cap Hit</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {submittedOffers.length ? submittedOffers.map((offer) => {
                const player = save.players.find((candidate) => candidate.id === offer.playerId);
                return (
                  <tr key={offer.id} className="roster-table-row" onClick={() => player && setActivePlayerId(player.id)} tabIndex={0}>
                    <td><strong>{player ? `${player.firstName} ${player.lastName}` : offer.playerId}</strong></td>
                    <td>{offer.teamId.toUpperCase()}</td>
                    <td>${offer.apy.toFixed(1)}M</td>
                    <td>{offer.years}</td>
                    <td>{offer.role}</td>
                    <td>{offer.interestScore}</td>
                    <td>${offer.projectedCapHit.toFixed(1)}M</td>
                    <td>Wave {offer.wave}</td>
                  </tr>
                );
              }) : <tr><td colSpan={8}>No unresolved offers are currently pending.</td></tr>}
            </tbody>
          </DataTable>
        </section>
      ) : null}

      {tab === "recent" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <th>Move</th>
                <th>Player</th>
                <th>Pos</th>
                <th>Team</th>
                <th>Value</th>
                <th>Week</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {(save.freeAgencyLog ?? []).length ? (save.freeAgencyLog ?? []).slice(0, 40).map((move) => (
                <tr key={move.id}>
                  <td>{move.type}</td>
                  <td><strong>{move.playerName}</strong></td>
                  <td>{move.position}</td>
                  <td>{move.teamId.toUpperCase()}</td>
                  <td>${move.salary.toFixed(1)}M</td>
                  <td>{move.week}</td>
                  <td>{move.details ?? "-"}</td>
                </tr>
              )) : <tr><td colSpan={7}>No free-agent moves yet.</td></tr>}
            </tbody>
          </DataTable>
        </section>
      ) : null}

      {activePlayer ? (
        <FreeAgentPlayerModal
          save={save}
          player={activePlayer}
          close={() => setActivePlayerId(undefined)}
          submitOffer={(terms) => {
            submitOffer(activePlayer.id, terms);
            setActivePlayerId(undefined);
          }}
        />
      ) : null}
    </section>
  );
}

function FreeAgentPlayerModal({
  save,
  player,
  close,
  submitOffer
}: {
  save: GameSave;
  player: Player;
  close: () => void;
  submitOffer: (terms: Partial<Pick<FreeAgentOffer, "years" | "apy" | "security" | "role">>) => void;
}) {
  const team = selectedTeam(save);
  const school = save.schools.find((candidate) => candidate.id === player.collegeId);
  const isAvailable = player.teamId === FREE_AGENT_TEAM_ID;
  const [years, setYears] = useState(expectedFreeAgentYears(player));
  const [apy, setApy] = useState(expectedFreeAgentAsk(player));
  const [security, setSecurity] = useState<FreeAgentSecurityLevel>("standard");
  const [role, setRole] = useState<FreeAgentRolePromise>(roleForTeamNeed(save, player, team.id));
  const interest = freeAgentInterestScore(save, player, team.id, { years, apy, security, role });
  const projectedCapHit = projectedCapHitForOffer({ ...save, selectedTeamId: team.id }, player, years, apy, security);
  const competitors = likelyFreeAgentCompetitors(save, player)
    .filter((teamId) => teamId !== team.id)
    .map((teamId) => teamById(save, teamId).abbreviation)
    .join(", ");

  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={close}>
      <article className="roster-modal free-agent-modal" role="dialog" aria-modal="true" aria-label={`${player.firstName} ${player.lastName} free-agent profile`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="roster-modal-header">
          <div>
            <p className="eyebrow">{isAvailable ? "Free-Agent Profile" : "Projected Free Agent"}</p>
            <h3>{player.firstName} {player.lastName}</h3>
            <div className="roster-player-subline">
              <span className="roster-position-tag">{player.position}</span>
              <span className="roster-college-badge"><CollegeLogo school={school} size={28} /></span>
              <span className="roster-experience-badge">{school?.name ?? "Unknown College"}</span>
              <span className="roster-experience-badge">{rosterExperienceLabel(player)}</span>
            </div>
          </div>
          <div className="roster-modal-actions">
            <button type="button" onClick={close}>Close</button>
          </div>
        </div>
        <section className="free-agent-modal-grid">
          <article className="table-card">
            <p className="eyebrow">Market Ask</p>
            <div className="cap-summary-grid compact-market-grid">
              <article><span>OVR</span><strong>{player.overall}</strong></article>
              <article><span>POT</span><strong>{player.potential}</strong></article>
              <article><span>Ask</span><strong>${expectedFreeAgentAsk(player).toFixed(1)}M</strong></article>
              <article><span>Interest</span><strong>{interest}</strong></article>
              <article><span>Yr 1 Cap</span><strong>${projectedCapHit.toFixed(1)}M</strong></article>
            </div>
            <p className="free-agent-modal-note">
              Likely competitors: {competitors || "No obvious market pressure"}. {player.contract?.rights === "ufa" && player.previousTeamId ? "This signing can affect the comp-pick ledger." : "No current CFA tag is attached."}
            </p>
          </article>
          <article className="table-card">
            <p className="eyebrow">Offer Terms</p>
            {isAvailable ? (
              <div className="offer-form-grid">
                <label className="roster-select-field">
                  <span>Years</span>
                  <select value={years} onChange={(event) => setYears(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="roster-select-field">
                  <span>APY</span>
                  <input type="number" min="0.8" step="0.1" value={apy} onChange={(event) => setApy(Number(event.target.value))} />
                </label>
                <label className="roster-select-field">
                  <span>Security</span>
                  <select value={security} onChange={(event) => setSecurity(event.target.value as FreeAgentSecurityLevel)}>
                    <option value="low">Low</option>
                    <option value="standard">Standard</option>
                    <option value="strong">Strong</option>
                  </select>
                </label>
                <label className="roster-select-field">
                  <span>Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as FreeAgentRolePromise)}>
                    <option value="starter">Starter</option>
                    <option value="rotation">Rotation</option>
                    <option value="depth">Depth</option>
                    <option value="development">Development</option>
                  </select>
                </label>
                <button type="button" onClick={() => submitOffer({ years, apy, security, role })}>
                  Submit For Wave
                </button>
              </div>
            ) : (
              <p className="free-agent-modal-note">This player is still under contract. Use the Pending Free Agents tab to monitor the next class before they reach the market.</p>
            )}
          </article>
        </section>
      </article>
    </div>
  );
}

function MedicalView({
  save,
  placeOnIr,
  designateToReturn,
  activateFromIr
}: {
  save: GameSave;
  placeOnIr: (playerId: string) => void;
  designateToReturn: (playerId: string) => void;
  activateFromIr: (playerId: string) => void;
}) {
  const team = selectedTeam(save);
  const teamPlayers = playersForTeam(save, team.id);
  const impacted = teamPlayers
    .filter((player) => player.status === "injured" || player.status === "limited" || isOnIr(player))
    .sort((a, b) => (b.injury?.severity ?? "").localeCompare(a.injury?.severity ?? "") || b.overall - a.overall);
  const irPlayers = irPlayersForTeam(save, team.id)
    .sort((a, b) => Number(Boolean(b.irReturnDesignatedWeek)) - Number(Boolean(a.irReturnDesignatedWeek)) || (a.irEligibleWeek ?? 99) - (b.irEligibleWeek ?? 99) || b.overall - a.overall);
  const riskBoard = teamPlayers
    .slice()
    .sort((a, b) => playerMedical(a) - playerMedical(b) || b.stats.snaps - a.stats.snaps)
    .slice(0, 18);
  const recent = (save.medicalHistory ?? []).filter((entry) => entry.teamId === team.id).slice(0, 14);
  return (
    <section className="view-stack">
      <MetricStrip save={save} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">Availability</p>
          <h3>Medical Board</h3>
        </div>
      </div>
      <section className="medical-summary-grid">
        <article>
          <span>Unavailable</span>
          <strong>{impacted.filter((player) => player.status === "injured").length}</strong>
        </article>
        <article>
          <span>Limited</span>
          <strong>{impacted.filter((player) => player.status === "limited").length}</strong>
        </article>
        <article>
          <span>Career-Ended Records</span>
          <strong>{(save.careerEndedRecords ?? []).filter((record) => record.teamId === team.id).length}</strong>
        </article>
        <article>
          <span>IR Returns Used</span>
          <strong>{save.irReturnUsage?.[team.id] ?? 0}/{IR_TEAM_RETURN_LIMIT}</strong>
        </article>
      </section>
      <article className="medical-panel ir-reserve-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">IR / Reserve</p>
            <h3>Return Management</h3>
          </div>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Player</th>
              <th>Injury</th>
              <th>Eligible</th>
              <th>Window</th>
              <th>Returns</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {irPlayers.length ? irPlayers.map((player) => (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong><small className="prospect-context">{player.position} | {player.overall} OVR</small></td>
                <td>{player.injury?.name ?? medicalStatusLabel(player)}</td>
                <td>{player.irEligibleWeek ? `Week ${player.irEligibleWeek}` : "-"}</td>
                <td>{player.irPracticeWindowDeadlineWeek ? `Through Wk ${player.irPracticeWindowDeadlineWeek}` : player.irReturnDesignatedWeek ? "Open" : "Closed"}</td>
                <td>{player.irReturnCount ?? 0}/2</td>
                <td>
                  <IrActionControls player={player} save={save} placeOnIr={placeOnIr} designateToReturn={designateToReturn} activateFromIr={activateFromIr} />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6}>No players currently on injured reserve.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </article>
      <DataTable>
        <thead>
          <tr>
            <th>Player</th>
            <th>Pos</th>
            <th>Status</th>
            <th>Injury</th>
            <th>Return</th>
            <th>Penalty</th>
            <th>Medical</th>
            <th>Depth Impact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {impacted.length ? impacted.map((player) => {
            const injury = player.injury;
            return (
              <tr key={player.id}>
                <td><strong>{player.firstName} {player.lastName}</strong></td>
                <td>{player.position}</td>
                <td><span className={`status-chip status-${isOnIr(player) ? "ir" : player.status}`}>{isOnIr(player) ? "IR" : player.status}</span></td>
                <td>{injury?.name ?? "Medical hold"}</td>
                <td>{player.status === "injured" ? `${player.injuryWeeks} wk` : injury?.limitedWeeksRemaining ? `${injury.limitedWeeksRemaining} limited wk` : "Day-to-day"}</td>
                <td>{injury?.ovrPenalty ? `-${injury.ovrPenalty} OVR` : "-"}</td>
                <td><span className={`medical-pill medical-${medicalRiskTier(playerMedical(player))}`}>{playerMedical(player)}</span></td>
                <td>{isOnIr(player) ? "Off active roster and depth chart" : player.status === "limited" ? "Playable if kept in depth order" : "Next eligible player promoted live"}</td>
                <td>
                  <IrActionControls player={player} save={save} placeOnIr={placeOnIr} designateToReturn={designateToReturn} activateFromIr={activateFromIr} />
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={9}>No current injuries or limited players.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <div className="medical-two-column">
        <article className="medical-panel">
          <h3>Lowest Medical Risk Watch</h3>
          {riskBoard.map((player) => (
            <div key={player.id} className="medical-watch-row">
              <span className={`medical-pill medical-${medicalRiskTier(playerMedical(player))}`}>{playerMedical(player)}</span>
              <strong>{player.firstName[0]}. {player.lastName}</strong>
              <em>{player.position} | {player.stats.snaps} snaps</em>
            </div>
          ))}
        </article>
        <article className="medical-panel">
          <h3>Recent Medical Log</h3>
          {recent.length ? recent.map((entry) => (
            <div key={entry.id} className={`medical-log-row severity-${entry.severity}`}>
              <strong>{entry.playerName}</strong>
              <span>{entry.name}</span>
              <em>Week {entry.occurredWeek} | {entry.status === "careerEnded" ? "Career-ended" : entry.status}</em>
            </div>
          )) : <p>No medical events logged yet.</p>}
        </article>
      </div>
    </section>
  );
}

type NflStatsCategory = PlayerStatTableCategory | "team-offense" | "team-defense" | "team-efficiency" | "medical";
type NflStatsBucket = "regular" | "playoffs";

function playerStatsForBucket(player: Player, bucket: NflStatsBucket): PlayerStats {
  return bucket === "playoffs" ? normalizePlayerStats(player.playoffStats) : normalizePlayerStats(player.stats);
}

function statCategoryValue(stats: PlayerStats, category: NflStatsCategory): number {
  if (category === "passing") return stats.passYards;
  if (category === "rushing") return stats.rushYards;
  if (category === "receiving") return stats.receivingYards;
  if (category === "defense") return stats.tackles + stats.sacks * 6 + stats.interceptions * 8 + stats.forcedFumbles * 5;
  if (category === "kicking") return stats.fieldGoalsMade * 3 + stats.extraPointsMade;
  if (category === "punting") return stats.punts;
  return 0;
}

function aggregateTeamStats(save: GameSave, bucket: NflStatsBucket): TeamGameStats[] {
  const rows = new Map(save.teams.map((team) => [team.id, normalizeTeamGameStats(team.id)]));
  for (const game of save.schedule) {
    if (game.status !== "final") continue;
    const seasonType = game.seasonType ?? "regular";
    if (bucket === "regular" && seasonType !== "regular") continue;
    if (bucket === "playoffs" && seasonType !== "postseason") continue;
    for (const [teamId, gameStats] of Object.entries(game.teamStats ?? {})) {
      const row = rows.get(teamId) ?? normalizeTeamGameStats(teamId);
      rows.set(teamId, mergeTeamGameStats(teamId, row, gameStats));
    }
  }
  return [...rows.values()].filter((row) => row.plays || row.punts || row.fieldGoalAttempts);
}

type TeamStatColumn = {
  key: string;
  label: string;
  value: (row: TeamGameStats) => string | number;
  sortValue: (row: TeamGameStats) => number;
};

function teamStatColumns(category: NflStatsCategory): TeamStatColumn[] {
  if (category === "team-defense") {
    return [
      { key: "team", label: "Team", value: (row) => row.teamId, sortValue: () => 0 },
      { key: "plays", label: "Def Plays", value: (row) => row.defensivePlays, sortValue: (row) => row.defensivePlays },
      { key: "takeaways", label: "Takeaways", value: (row) => row.takeaways, sortValue: (row) => row.takeaways },
      { key: "sacks", label: "Sacks", value: (row) => row.sacks, sortValue: (row) => row.sacks },
      { key: "sackYds", label: "SkYds", value: (row) => row.sackYards, sortValue: (row) => row.sackYards },
      { key: "toMargin", label: "TO Margin", value: (row) => row.takeaways - row.turnovers, sortValue: (row) => row.takeaways - row.turnovers },
      { key: "pen", label: "Pen", value: (row) => row.penalties, sortValue: (row) => row.penalties },
      { key: "penYds", label: "PenYds", value: (row) => row.penaltyYards, sortValue: (row) => row.penaltyYards }
    ];
  }
  if (category === "team-efficiency") {
    return [
      { key: "team", label: "Team", value: (row) => row.teamId, sortValue: () => 0 },
      { key: "ypp", label: "Y/Play", value: (row) => formatRate(rate(row.totalYards, row.plays), 2), sortValue: (row) => rate(row.totalYards, row.plays) ?? -1 },
      { key: "succ", label: "Succ%", value: (row) => formatRate(rate(row.successfulPlays, row.plays, 100), 1), sortValue: (row) => rate(row.successfulPlays, row.plays, 100) ?? -1 },
      { key: "3d", label: "3D%", value: (row) => formatRate(rate(row.thirdDownConversions, row.thirdDownAttempts, 100), 1), sortValue: (row) => rate(row.thirdDownConversions, row.thirdDownAttempts, 100) ?? -1 },
      { key: "4d", label: "4D%", value: (row) => formatRate(rate(row.fourthDownConversions, row.fourthDownAttempts, 100), 1), sortValue: (row) => rate(row.fourthDownConversions, row.fourthDownAttempts, 100) ?? -1 },
      { key: "rz", label: "RZ TD%", value: (row) => formatRate(rate(row.redZoneTouchdowns, row.redZoneTrips, 100), 1), sortValue: (row) => rate(row.redZoneTouchdowns, row.redZoneTrips, 100) ?? -1 },
      { key: "score", label: "Score Dr%", value: (row) => formatRate(rate(row.scoringDrives, row.drives, 100), 1), sortValue: (row) => rate(row.scoringDrives, row.drives, 100) ?? -1 },
      { key: "expl", label: "Expl", value: (row) => row.explosivePlays, sortValue: (row) => row.explosivePlays }
    ];
  }
  return [
    { key: "team", label: "Team", value: (row) => row.teamId, sortValue: () => 0 },
    { key: "plays", label: "Plays", value: (row) => row.plays, sortValue: (row) => row.plays },
    { key: "drives", label: "Drives", value: (row) => row.drives, sortValue: (row) => row.drives },
    { key: "yds", label: "Total Yds", value: (row) => row.totalYards, sortValue: (row) => row.totalYards },
    { key: "pass", label: "Pass", value: (row) => row.passingYards, sortValue: (row) => row.passingYards },
    { key: "rush", label: "Rush", value: (row) => row.rushingYards, sortValue: (row) => row.rushingYards },
    { key: "first", label: "1D", value: (row) => row.firstDowns, sortValue: (row) => row.firstDowns },
    { key: "to", label: "TO", value: (row) => row.turnovers, sortValue: (row) => -row.turnovers },
    { key: "skA", label: "SkA", value: (row) => row.sacksAllowed, sortValue: (row) => -row.sacksAllowed },
    { key: "top", label: "TOP", value: (row) => `${Math.floor(row.timeOfPossession / 60)}:${Math.round(row.timeOfPossession % 60).toString().padStart(2, "0")}`, sortValue: (row) => row.timeOfPossession }
  ];
}

function playerCategoryPositions(category: PlayerStatTableCategory): Position[] | undefined {
  if (category === "passing") return ["QB"];
  if (category === "rushing") return ["QB", "RB", "WR"];
  if (category === "receiving") return ["RB", "WR", "TE"];
  if (category === "kicking") return ["K"];
  if (category === "punting") return ["P"];
  return undefined;
}

function StatsView({ save }: { save: GameSave }) {
  const [category, setCategory] = useState<NflStatsCategory>("passing");
  const [bucket, setBucket] = useState<NflStatsBucket>("regular");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortKey, setSortKey] = useState("default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const records = save.careerEndedRecords ?? [];
  const isTeamCategory = category === "team-offense" || category === "team-defense" || category === "team-efficiency";
  const playerColumns = !isTeamCategory && category !== "medical" ? playerStatColumns(category) : [];
  const positions = !isTeamCategory && category !== "medical" ? playerCategoryPositions(category) : undefined;
  const playerRows = save.players
    .filter((player) => player.teamId !== FREE_AGENT_TEAM_ID)
    .filter((player) => teamFilter === "all" || player.teamId === teamFilter)
    .filter((player) => !positions || positions.includes(player.position))
    .map((player) => ({ player, stats: playerStatsForBucket(player, bucket) }))
    .filter(({ stats }) => statCategoryValue(stats, category) > 0)
    .map(({ player, stats }) => ({
      player,
      row: {
        id: player.id,
        season: `${save.seasonYear}`,
        age: player.age,
        team: teamAbbreviationFor(save, player.teamId),
        league: "NFL",
        position: player.position,
        stats,
        awards: []
      } satisfies StatDisplayRow
    }))
    .sort((a, b) => {
      const column = playerColumns.find((candidate) => candidate.key === sortKey);
      const av = column?.sortValue?.(a.row) ?? statCategoryValue(a.row.stats, category);
      const bv = column?.sortValue?.(b.row) ?? statCategoryValue(b.row.stats, category);
      return sortDirection === "asc" ? av - bv : bv - av;
    })
    .slice(0, 75);
  const teamColumns = isTeamCategory ? teamStatColumns(category) : [];
  const teamRows = aggregateTeamStats(save, bucket)
    .filter((row) => teamFilter === "all" || row.teamId === teamFilter)
    .sort((a, b) => {
      const column = teamColumns.find((candidate) => candidate.key === sortKey);
      const av = column?.sortValue(a) ?? a.totalYards;
      const bv = column?.sortValue(b) ?? b.totalYards;
      return sortDirection === "asc" ? av - bv : bv - av;
    });
  const leaderCards = playerRows.slice(0, 3);
  const setSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };
  const tabs: Array<[NflStatsCategory, string]> = [
    ["passing", "Passing"],
    ["rushing", "Rushing"],
    ["receiving", "Receiving"],
    ["defense", "Defense"],
    ["kicking", "Kicking"],
    ["punting", "Punting"],
    ["team-offense", "Team Offense"],
    ["team-defense", "Team Defense"],
    ["team-efficiency", "Efficiency"],
    ["medical", "Medical Archive"]
  ];
  return (
    <section className="view-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NFL Stats</p>
          <h3>{save.seasonYear} League Production</h3>
        </div>
      </div>
      <div className="segmented-tabs compact-tabs stats-category-tabs">
        {tabs.map(([nextMode, label]) => (
            <button key={nextMode} type="button" className={category === nextMode ? "selected" : ""} onClick={() => { setCategory(nextMode); setSortKey("default"); }}>
              {label}
            </button>
        ))}
      </div>
      {category !== "medical" ? (
        <div className="view-command-row">
          <select value={bucket} onChange={(event) => setBucket(event.target.value as NflStatsBucket)}>
            <option value="regular">Regular Season</option>
            <option value="playoffs">Playoffs</option>
          </select>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">All Teams</option>
            {save.teams.map((team) => <option key={team.id} value={team.id}>{team.fullName}</option>)}
          </select>
        </div>
      ) : null}
      {!isTeamCategory && category !== "medical" ? (
        <>
          <div className="stats-leader-strip">
            {leaderCards.map(({ player, row }, index) => (
              <article key={player.id} className="stats-leader-card">
                <span>#{index + 1}</span>
                <strong>{playerDisplayName(player)}</strong>
                <small>{teamAbbreviationFor(save, player.teamId)} | {primaryStatLine(row.stats, player.position)}</small>
              </article>
            ))}
          </div>
          <div className="stat-table-scroll">
            <table className="stat-reference-table">
              <thead>
                <tr>
                  <th className="sticky-col">Rank</th>
                  <th>Player</th>
                  {playerColumns.map((column) => (
                    <th key={column.key}>
                      <button type="button" className="stat-sort-button" onClick={() => setSort(column.key)}>{column.label}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerRows.length ? playerRows.map(({ player, row }, index) => (
                  <tr key={player.id}>
                    <td className="sticky-col">#{index + 1}</td>
                    <td><strong>{playerDisplayName(player)}</strong></td>
                    {playerColumns.map((column) => <td key={column.key}>{column.value(row)}</td>)}
                  </tr>
                )) : (
                  <tr><td colSpan={playerColumns.length + 2}>No stats recorded for this filter yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {isTeamCategory ? (
        <div className="stat-table-scroll">
          <table className="stat-reference-table">
            <thead>
              <tr>
                {teamColumns.map((column, index) => (
                  <th key={column.key} className={index === 0 ? "sticky-col" : ""}>
                    <button type="button" className="stat-sort-button" onClick={() => setSort(column.key)}>{column.label}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamRows.length ? teamRows.map((row) => (
                <tr key={row.teamId}>
                  {teamColumns.map((column, index) => (
                    <td key={column.key} className={index === 0 ? "sticky-col" : ""}>
                      {column.key === "team" ? <strong>{teamAbbreviationFor(save, row.teamId)}</strong> : column.value(row)}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={teamColumns.length}>No team stats recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {category === "medical" ? (
        <DataTable>
          <thead>
            <tr>
              <th>Week</th>
              <th>Player</th>
              <th>Team</th>
              <th>Pos</th>
              <th>Age</th>
              <th>Injury</th>
              <th>Medical</th>
              <th>OVR/POT Before</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? records.map((record) => (
              <tr key={record.id}>
                <td>{record.week}</td>
                <td><strong>{record.playerName}</strong></td>
                <td>{teamAbbreviationFor(save, record.teamId)}</td>
                <td>{record.position}</td>
                <td>{record.age}</td>
                <td>{record.injuryName}</td>
                <td><span className={`medical-pill medical-${medicalRiskTier(record.medical)}`}>{record.medical}</span></td>
                <td>{record.overallBefore}/{record.potentialBefore}</td>
                <td>{record.summary}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9}>No career-ending injury records yet.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      ) : null}
    </section>
  );
}

function DepthView({
  save,
  moveDepthPlayer,
  autoSortDepth,
  assignDepthPlayer,
  autoSortDepthUnit
}: {
  save: GameSave;
  moveDepthPlayer: (position: Position, player: Player, direction: -1 | 1) => void;
  autoSortDepth: (position: Position) => void;
  assignDepthPlayer: (position: Position, playerId: string) => void;
  autoSortDepthUnit: (positions: Position[]) => void;
}) {
  const [viewTeamId, setViewTeamId] = useState(save.selectedTeamId);
  const [activeUnit, setActiveUnit] = useState<DepthUnit>("offense");
  const [offensePresetId, setOffensePresetId] = useState<OffenseFormationId>("11");
  const [defensePresetId, setDefensePresetId] = useState<DefenseFormationId>("Nickel");
  const [showRotation, setShowRotation] = useState(false);
  const [showFullDepth, setShowFullDepth] = useState(false);
  const [collegeView, setCollegeView] = useState(false);
  const [listView, setListView] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<Position | undefined>();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | undefined>();

  const team = teamById(save, viewTeamId);
  const readOnly = viewTeamId !== save.selectedTeamId;
  const chart = buildDisplayDepthChart(save, viewTeamId);
  const plan = calculateSnapPlan(save, viewTeamId);
  const offensePreset = offenseFormations.find((preset) => preset.id === offensePresetId) ?? offenseFormations[0];
  const defensePreset = defenseFormations.find((preset) => preset.id === defensePresetId) ?? defenseFormations[0];
  const activePreset: FormationPreset = activeUnit === "offense" ? offensePreset : activeUnit === "defense" ? defensePreset : specialTeamsFormation;
  const assignments = buildFormationAssignments(chart, plan, activePreset.slots, { showRotation, showFullDepth });
  const expandedPlayer = save.players.find((player) => player.id === expandedPlayerId);
  const extraFieldHeight = showFullDepth ? (activeUnit === "special" ? 180 : 720) : showRotation ? (activeUnit === "special" ? 80 : 180) : 0;
  const expandedField = showRotation || showFullDepth;
  const fieldStyle = {
    "--depth-canvas-width": `${activePreset.canvasWidth}px`,
    "--depth-canvas-height": `${activePreset.canvasHeight + extraFieldHeight}px`
  } as CSSProperties & Record<string, string>;

  if (listView) {
    return (
      <section className="view-stack depth-workspace">
        <div className="view-command-row">
          <TeamScopePicker save={save} teamId={viewTeamId} setTeamId={setViewTeamId} label="Depth chart team" />
          {readOnly ? <span className="read-only-chip">Read-only depth view</span> : null}
        </div>
        <DepthToolbar
          activeUnit={activeUnit}
          setActiveUnit={setActiveUnit}
          activePreset={activePreset}
          offensePresetId={offensePresetId}
          setOffensePresetId={setOffensePresetId}
          defensePresetId={defensePresetId}
          setDefensePresetId={setDefensePresetId}
          showRotation={showRotation}
          setShowRotation={setShowRotation}
          showFullDepth={showFullDepth}
          setShowFullDepth={setShowFullDepth}
          collegeView={collegeView}
          setCollegeView={setCollegeView}
          listView={listView}
          setListView={setListView}
          autoSortDepthUnit={() => autoSortDepthUnit(unitPositions[activeUnit])}
          readOnly={readOnly}
        />
        <LegacyDepthList chart={chart} plan={plan} moveDepthPlayer={moveDepthPlayer} autoSortDepth={autoSortDepth} readOnly={readOnly} />
      </section>
    );
  }

  return (
    <section className="view-stack depth-workspace">
      <div className="view-command-row">
        <TeamScopePicker save={save} teamId={viewTeamId} setTeamId={setViewTeamId} label="Depth chart team" />
        {readOnly ? <span className="read-only-chip">Read-only depth view</span> : null}
      </div>
      <DepthToolbar
        activeUnit={activeUnit}
        setActiveUnit={setActiveUnit}
        activePreset={activePreset}
        offensePresetId={offensePresetId}
        setOffensePresetId={setOffensePresetId}
        defensePresetId={defensePresetId}
        setDefensePresetId={setDefensePresetId}
        showRotation={showRotation}
        setShowRotation={setShowRotation}
        showFullDepth={showFullDepth}
        setShowFullDepth={setShowFullDepth}
        collegeView={collegeView}
        setCollegeView={setCollegeView}
        listView={listView}
        setListView={setListView}
        autoSortDepthUnit={() => autoSortDepthUnit(unitPositions[activeUnit])}
        readOnly={readOnly}
      />
      <div className={`depth-field-shell depth-field-shell-${activeUnit} ${expandedField ? "depth-field-shell-expanded" : "depth-field-shell-starters"}`}>
        <div className={`depth-field depth-field-${activeUnit}`} style={fieldStyle}>
          <div className="depth-field-markings">
            <span className="depth-hash depth-hash-left" />
            <span className="depth-hash depth-hash-middle-left" />
            <span className="depth-hash depth-hash-middle-right" />
            <span className="depth-hash depth-hash-right" />
            <span className="depth-line-scrimmage" />
          </div>
          <div className="depth-logo-watermark">
            <TeamLogo save={save} teamId={team.id} size={280} />
          </div>
          {assignments.map((assignment) => (
            <FormationStack
              key={assignment.slot.id}
              assignment={assignment}
              save={save}
              collegeView={collegeView}
              expandedPosition={expandedPosition}
              setExpandedPosition={setExpandedPosition}
              setExpandedPlayerId={setExpandedPlayerId}
              assignDepthPlayer={assignDepthPlayer}
              plan={plan}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
      <div className="depth-detail-grid">
        {expandedPosition ? (
          <PositionPool
            save={save}
            position={expandedPosition}
            players={chart[expandedPosition]}
            plan={plan}
            assignDepthPlayer={assignDepthPlayer}
            setExpandedPlayerId={setExpandedPlayerId}
            readOnly={readOnly}
          />
        ) : (
          <article className="depth-help-panel">
            <strong>{activePreset.label}</strong>
            <p>
              {readOnly
                ? "Click a position label to review its player pool."
                : "Click a position label to open its player pool. Drag playable cards onto another position to update the depth order."}
            </p>
          </article>
        )}
        {expandedPlayer ? (
          <PlayerDepthDetail player={expandedPlayer} save={save} plan={plan} />
        ) : (
          <article className="depth-help-panel">
            <strong>Player details</strong>
            <p>Click any card to review eligible positions, effective OVR, ratings, and usage.</p>
          </article>
        )}
      </div>
    </section>
  );
}

function DepthToolbar({
  activeUnit,
  setActiveUnit,
  activePreset,
  offensePresetId,
  setOffensePresetId,
  defensePresetId,
  setDefensePresetId,
  showRotation,
  setShowRotation,
  showFullDepth,
  setShowFullDepth,
  collegeView,
  setCollegeView,
  listView,
  setListView,
  autoSortDepthUnit,
  readOnly
}: {
  activeUnit: DepthUnit;
  setActiveUnit: (unit: DepthUnit) => void;
  activePreset: FormationPreset;
  offensePresetId: OffenseFormationId;
  setOffensePresetId: (id: OffenseFormationId) => void;
  defensePresetId: DefenseFormationId;
  setDefensePresetId: (id: DefenseFormationId) => void;
  showRotation: boolean;
  setShowRotation: (value: boolean) => void;
  showFullDepth: boolean;
  setShowFullDepth: (value: boolean) => void;
  collegeView: boolean;
  setCollegeView: (value: boolean) => void;
  listView: boolean;
  setListView: (value: boolean) => void;
  autoSortDepthUnit: () => void;
  readOnly: boolean;
}) {
  return (
    <div className="depth-command-bar">
      <div className="segmented-tabs depth-tabs">
        {(["offense", "defense", "special"] as DepthUnit[]).map((unit) => (
          <button key={unit} className={activeUnit === unit ? "selected" : ""} onClick={() => setActiveUnit(unit)}>
            {unit === "special" ? "Special Teams" : unit[0].toUpperCase() + unit.slice(1)}
          </button>
        ))}
      </div>
      <div className="depth-formation-select">
        {activeUnit === "offense" ? (
          <select value={offensePresetId} onChange={(event) => setOffensePresetId(event.target.value as OffenseFormationId)} aria-label="Offensive personnel">
            {offenseFormations.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        ) : activeUnit === "defense" ? (
          <select value={defensePresetId} onChange={(event) => setDefensePresetId(event.target.value as DefenseFormationId)} aria-label="Defensive personnel">
            {defenseFormations.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        ) : (
          <span>{activePreset.label}</span>
        )}
      </div>
      <label className="chip-toggle">
        <input type="checkbox" checked={showRotation} onChange={(event) => setShowRotation(event.target.checked)} />
        Rotation
      </label>
      <label className="chip-toggle">
        <input type="checkbox" checked={showFullDepth} onChange={(event) => setShowFullDepth(event.target.checked)} />
        Full depth
      </label>
      <label className="chip-toggle">
        <input type="checkbox" checked={collegeView} onChange={(event) => setCollegeView(event.target.checked)} />
        College view
      </label>
      <label className="chip-toggle">
        <input type="checkbox" checked={listView} onChange={(event) => setListView(event.target.checked)} />
        List view
      </label>
      <button className="depth-auto-button" onClick={autoSortDepthUnit} disabled={readOnly}>Auto Best Combination</button>
    </div>
  );
}

function FormationStack({
  assignment,
  save,
  collegeView,
  expandedPosition,
  setExpandedPosition,
  setExpandedPlayerId,
  assignDepthPlayer,
  plan,
  readOnly
}: {
  assignment: FormationAssignment;
  save: GameSave;
  collegeView: boolean;
  expandedPosition?: Position;
  setExpandedPosition: (position: Position | undefined) => void;
  setExpandedPlayerId: (playerId: string | undefined) => void;
  assignDepthPlayer: (position: Position, playerId: string) => void;
  plan: ReturnType<typeof calculateSnapPlan>;
  readOnly: boolean;
}) {
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("application/x-player-id") || event.dataTransfer.getData("text/plain");
    if (playerId) assignDepthPlayer(assignment.slot.position, playerId);
  }

  return (
    <div
      className="formation-stack"
      style={{ left: `${assignment.slot.x}%`, top: `${assignment.slot.y}%` }}
      onDragOver={readOnly ? undefined : (event) => event.preventDefault()}
      onDrop={readOnly ? undefined : handleDrop}
    >
      <button
        type="button"
        className={`formation-position-label ${expandedPosition === assignment.slot.position ? "active" : ""}`}
        onClick={() => setExpandedPosition(expandedPosition === assignment.slot.position ? undefined : assignment.slot.position)}
      >
        {assignment.slot.label}
      </button>
      {assignment.main ? (
        <DepthPlayerCard
          player={assignment.main}
          assignedPosition={assignment.slot.position}
          effectiveOverall={assignment.effectiveOverall}
          fitTone={assignment.fitTone}
          snapShare={assignment.snapShare}
          save={save}
          collegeView={collegeView}
          readOnly={readOnly}
          onClick={() => setExpandedPlayerId(assignment.main?.id)}
        />
      ) : (
        <div className="depth-empty-card">Empty</div>
      )}
      {assignment.stack.length ? (
        <div className="formation-rotation-stack">
          {assignment.stack.map((player) => (
            <DepthPlayerCard
              key={player.id}
              player={player}
              assignedPosition={assignment.slot.position}
              effectiveOverall={displayEffectiveOverall(player, assignment.slot.position)}
              fitTone={fitToneForPlayer(player, assignment.slot.position)}
              snapShare={plan.byPlayer[player.id]?.find((entry) => entry.position === assignment.slot.position)?.snapShare ?? 0}
              save={save}
              collegeView={collegeView}
              compact
              readOnly={readOnly}
              onClick={() => setExpandedPlayerId(player.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function depthNameClass(lastName: string): string {
  if (lastName.length >= 20) return "name-xxl";
  if (lastName.length >= 16) return "name-xl";
  if (lastName.length >= 13) return "name-lg";
  if (lastName.length >= 10) return "name-md";
  return "name-sm";
}

function DepthPlayerCard({
  player,
  assignedPosition,
  effectiveOverall,
  fitTone,
  snapShare,
  save,
  collegeView,
  compact = false,
  readOnly = false,
  onClick
}: {
  player: Player;
  assignedPosition: Position;
  effectiveOverall: number;
  fitTone: PositionFitTone;
  snapShare: number;
  save: GameSave;
  collegeView: boolean;
  compact?: boolean;
  readOnly?: boolean;
  onClick: () => void;
}) {
  const school = save.schools.find((candidate) => candidate.id === player.collegeId);
  const lastName = player.lastName || player.firstName;
  const nameClass = `depth-card-name ${depthNameClass(lastName)} fit-${fitTone}`;
  const statusText = player.status === "active" ? "" : medicalStatusLabel(player);
  const canDrag = !readOnly && isPlayableDepthStatus(player);

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("application/x-player-id", player.id);
    event.dataTransfer.setData("text/plain", player.id);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <button
      type="button"
      draggable={canDrag}
      className={`depth-player-card ${compact ? "compact" : ""} ${collegeView ? "college-card" : ""} status-${player.status} fit-${fitTone}`}
      onDragStart={canDrag ? handleDragStart : undefined}
      onClick={onClick}
      title={`${player.firstName} ${player.lastName} at ${assignedPosition}`}
    >
      {collegeView ? (
        <>
          <strong className={nameClass}>{lastName}</strong>
          <span className="depth-card-college-logo">
            <CollegeLogo school={school} size={compact ? 28 : 34} />
          </span>
          {statusText ? <small className="depth-card-status">{statusText}</small> : null}
        </>
      ) : (
        <>
          <div className="depth-card-mainline">
            <strong className={nameClass}>{lastName}</strong>
          </div>
          <div className="depth-card-metrics">
            <span className="depth-ovr">OVR {effectiveOverall}</span>
            <span>POT {player.potential}</span>
            <span>{Math.round(snapShare * 100)}%</span>
          </div>
          {statusText ? <small className="depth-card-status">{statusText}</small> : null}
        </>
      )}
    </button>
  );
}

function PositionPool({
  save,
  position,
  players,
  plan,
  assignDepthPlayer,
  setExpandedPlayerId,
  readOnly
}: {
  save: GameSave;
  position: Position;
  players: Player[];
  plan: ReturnType<typeof calculateSnapPlan>;
  assignDepthPlayer: (position: Position, playerId: string) => void;
  setExpandedPlayerId: (playerId: string | undefined) => void;
  readOnly: boolean;
}) {
  return (
    <article className="depth-side-panel">
      <header>
        <strong>{position} Player Pool</strong>
        <span>{players.length} players</span>
      </header>
      <div className="depth-pool-list">
        {players.slice(0, 12).map((player) => (
          <div className="depth-pool-row" key={player.id}>
            <button type="button" onClick={() => setExpandedPlayerId(player.id)}>
              <strong>{player.firstName[0]}. {player.lastName}</strong>
              <small>
                <span className={`fit-${fitToneForPlayer(player, position)}`}>{player.position === position ? position : `${player.position} at ${position}`}</span>
                {" | "}
                OVR {displayEffectiveOverall(player, position)}
                {" | "}
                {Math.round((plan.byPlayer[player.id]?.find((entry) => entry.position === position)?.snapShare ?? 0) * 100)}%
              </small>
            </button>
            <button onClick={() => assignDepthPlayer(position, player.id)} disabled={readOnly || player.status === "injured" || player.status === "suspended"}>
              Set
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function PlayerDepthDetail({ player, save, plan }: { player: Player; save: GameSave; plan: ReturnType<typeof calculateSnapPlan> }) {
  const school = save.schools.find((candidate) => candidate.id === player.collegeId);
  const usage = plan.byPlayer[player.id]?.[0];
  return (
    <article className="depth-side-panel player-depth-detail">
      <header>
        <strong>{player.firstName} {player.lastName}</strong>
        <span>{medicalStatusLabel(player)}</span>
      </header>
      <div className="development-line">
        <span>{player.position}</span>
        <span>{school?.name ?? "Unknown College"}</span>
        <span>OVR {player.overall}</span>
        <span>POT {player.potential}</span>
        <span>Med {playerMedical(player)}</span>
        <span>{usage ? `${usage.position} ${Math.round(usage.snapShare * 100)}%` : "Depth"}</span>
      </div>
      <div className="depth-fit-grid">
        {eligiblePositionsFor(player).map((position) => (
          <span key={position} className={`fit-${fitToneForPlayer(player, position)}`}>
            {position} <strong>{displayEffectiveOverall(player, position)}</strong>
          </span>
        ))}
      </div>
      <PlayerRatingBreakdown player={player} />
    </article>
  );
}

function LegacyDepthList({
  chart,
  plan,
  moveDepthPlayer,
  autoSortDepth,
  readOnly
}: {
  chart: Record<Position, Player[]>;
  plan: ReturnType<typeof calculateSnapPlan>;
  moveDepthPlayer: (position: Position, player: Player, direction: -1 | 1) => void;
  autoSortDepth: (position: Position) => void;
  readOnly: boolean;
}) {
  return (
    <section className="depth-grid">
      {POSITIONS.map((position) => (
        <article className="depth-card" key={position}>
          <header>
            <span>{position}</span>
            <strong>{starterCountsByPosition[position]} starter{starterCountsByPosition[position] === 1 ? "" : "s"}</strong>
            <button onClick={() => autoSortDepth(position)} disabled={readOnly}>Auto Sort</button>
          </header>
          {chart[position].slice(0, 8).map((player, index) => {
            const entries = plan.byPlayer[player.id] ?? [];
            const primaryEntry = entries.find((entry) => entry.position === position);
            const share = primaryEntry?.snapShare ?? 0;
            const usage = primaryEntry?.label ?? (index < starterCountsByPosition[position] ? "Starter" : "Depth");
            const emergency = isEmergencyAtDisplayPosition(player, position);
            const effective = displayEffectiveOverall(player, position);
            const positionLabel = isPrimaryPosition(player, position) ? `${effective} ${ratingTierLabel(effective)}` : `${player.position} | at ${position} ${effective} ${emergency ? "Emergency" : ratingTierLabel(effective)}`;
            return (
              <div className={`depth-row status-${player.status}`} key={player.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{player.firstName[0]}. {player.lastName}</strong>
                  <small>
                    {positionLabel} | {usage} | {Math.round(share * 100)}% | {medicalStatusLabel(player)}
                  </small>
                </div>
                <div className="depth-actions">
                  <button disabled={readOnly || index === 0} onClick={() => moveDepthPlayer(position, player, -1)}>Up</button>
                  <button disabled={readOnly || index === chart[position].length - 1} onClick={() => moveDepthPlayer(position, player, 1)}>Down</button>
                </div>
              </div>
            );
          })}
        </article>
      ))}
    </section>
  );
}

function StaffScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className={`staff-score score-${colorTierForStaff(value)}`}>
      {label} <strong>{value}</strong>
    </span>
  );
}

type StaffAttributeGroup = {
  title: string;
  rows: Array<{ label: string; value: number }>;
};

type StaffGroupId = "core" | "position" | "scouts";

const staffGroups: Array<{ id: StaffGroupId; label: string; description: string; slotIds: StaffSlotId[] }> = [
  {
    id: "core",
    label: "Core Staff",
    description: "Head coach, coordinators, and training.",
    slotIds: ["head-coach", "offensive-coordinator", "defensive-coordinator", "trainer"]
  },
  {
    id: "position",
    label: "Position Coaches",
    description: "Unit development and weekly prep.",
    slotIds: ["special-teams-coordinator", "qb-coach", "rb-coach", "wr-coach", "te-coach", "ol-coach", "dl-coach", "lb-coach", "db-coach"]
  },
  {
    id: "scouts",
    label: "Scouts",
    description: "Seven coverage specialists for the draft board.",
    slotIds: ["scout-1", "scout-2", "scout-3", "scout-4", "scout-5", "scout-6", "scout-7"]
  }
];

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function staffAverage(members: Array<StaffMember | StaffCandidate | undefined>): number {
  const valid = members.filter((member): member is StaffMember | StaffCandidate => Boolean(member));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((sum, member) => sum + staffOverall(member), 0) / valid.length);
}

function staffMetricPills(member: StaffMember | StaffCandidate): Array<{ label: string; value: number }> {
  const profile = member.skillProfile;
  if (profile.scout) {
    return [
      { label: "OVR", value: staffOverall(member) },
      { label: "Off", value: profile.scout.offense },
      { label: "Def", value: profile.scout.defense },
      { label: "ST", value: profile.scout.specialTeams },
      { label: "Large", value: profile.scout.largeSchool },
      { label: "Small", value: profile.scout.smallSchool }
    ];
  }
  if (profile.coach) {
    return [
      { label: "Dev", value: profile.coach.development },
      { label: "Pos", value: profile.coach.positionDevelopment },
      { label: "Plan", value: profile.coach.gamePlanning },
      { label: "Call", value: profile.coach.playCalling },
      { label: "Disc", value: profile.coach.discipline },
      { label: "Fatigue", value: profile.coach.fatigueManagement }
    ];
  }
  if (profile.health) {
    return [
      { label: "Prevent", value: profile.health.prevention },
      { label: "Recover", value: profile.health.recovery },
      { label: "Rehab", value: profile.health.rehab },
      { label: "Medical", value: profile.health.medicalEvaluation }
    ];
  }
  return [{ label: "Fit", value: member.roleFit }];
}

function recordRows(record: Record<string, number>, order?: readonly string[]): Array<{ label: string; value: number }> {
  const keys = order?.length ? order.filter((key) => key in record) : Object.keys(record).sort((a, b) => a.localeCompare(b));
  return keys.map((key) => ({ label: key, value: Math.round(record[key]) }));
}

function staffAttributeGroups(member: StaffMember | StaffCandidate): StaffAttributeGroup[] {
  const profile = member.skillProfile;
  if (profile.scout) {
    return [
      { title: "Regions", rows: recordRows(profile.scout.regions, scoutingRegions) },
      { title: "Conferences", rows: recordRows(profile.scout.conferences) },
      { title: "Positions", rows: recordRows(profile.scout.positions, POSITIONS) },
      {
        title: "School Size",
        rows: [
          { label: "Large School", value: profile.scout.largeSchool },
          { label: "Small School", value: profile.scout.smallSchool }
        ]
      },
      {
        title: "Summaries",
        rows: [
          { label: "Offense", value: profile.scout.offense },
          { label: "Defense", value: profile.scout.defense },
          { label: "Special Teams", value: profile.scout.specialTeams }
        ]
      }
    ];
  }
  if (profile.coach) {
    return [
      {
        title: "Development",
        rows: [
          { label: "Development", value: profile.coach.development },
          { label: "Position Development", value: profile.coach.positionDevelopment },
          { label: "Scheme Teaching", value: profile.coach.schemeTeaching }
        ]
      },
      {
        title: "Game",
        rows: [
          { label: "Game Planning", value: profile.coach.gamePlanning },
          { label: "Play Calling", value: profile.coach.playCalling },
          { label: "Motivation", value: profile.coach.motivation },
          { label: "Discipline", value: profile.coach.discipline },
          { label: "Fatigue Management", value: profile.coach.fatigueManagement }
        ]
      },
      {
        title: "Unit Focus",
        rows: [
          { label: "Offense", value: profile.coach.offense },
          { label: "Defense", value: profile.coach.defense },
          { label: "Special Teams", value: profile.coach.specialTeams }
        ]
      }
    ];
  }
  if (profile.health) {
    return [
      {
        title: "Health",
        rows: [
          { label: "Prevention", value: profile.health.prevention },
          { label: "Recovery", value: profile.health.recovery },
          { label: "Rehab", value: profile.health.rehab },
          { label: "Stamina Management", value: profile.health.staminaManagement },
          { label: "Availability Support", value: profile.health.durabilitySupport },
          { label: "Medical Evaluation", value: profile.health.medicalEvaluation }
        ]
      }
    ];
  }
  return [
    {
      title: "Summary",
      rows: [
        { label: "Tactics", value: member.ratings.tactics },
        { label: "Scouting", value: member.ratings.scouting },
        { label: "Medical", value: member.ratings.medical },
        { label: "Leadership", value: member.ratings.leadership },
        { label: "Advice", value: member.ratings.advice }
      ]
    }
  ];
}

function StaffCoverageTags({ member }: { member: StaffMember | StaffCandidate }) {
  const tags = member.skillProfile.scout ? scoutSpecialtyTags(member).slice(0, 6) : [];
  if (!tags.length) return null;
  return (
    <div className="staff-tags">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function StaffAttributeTables({ member }: { member: StaffMember | StaffCandidate }) {
  return (
    <div className="staff-attribute-grid">
      {staffAttributeGroups(member).map((group) => (
        <div className="staff-attribute-table" key={group.title}>
          <h4>{group.title}</h4>
          <div className="staff-attribute-rows">
            {group.rows.map((row) => {
              const tier = colorTierForStaff(row.value);
              return (
                <div className="staff-attribute-row" key={row.label}>
                  <div className="staff-attribute-row-head">
                    <span>{row.label}</span>
                    <strong className={`staff-attribute-value score-${tier}`}>{row.value}</strong>
                  </div>
                  <span className={`staff-rating-bar score-${tier}`}>
                    <i style={{ width: `${row.value}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffSlotCard({
  slotId,
  member,
  expanded,
  toggleExpanded,
  openHiring
}: {
  slotId: StaffSlotId;
  member?: StaffMember;
  expanded: boolean;
  toggleExpanded: () => void;
  openHiring: () => void;
}) {
  const slot = slotDefinitionFor(slotId);
  const overall = member ? staffOverall(member) : 0;
  return (
    <div className="staff-slot">
      <div className="staff-slot-head">
        <span>{slot.shortLabel}</span>
        <div>
          <strong>{slot.label}</strong>
          <small>{member ? `${member.firstName} ${member.lastName}` : "Vacant"}</small>
        </div>
        {member ? <StaffScorePill label="OVR" value={overall} /> : null}
      </div>
      {member ? (
        <>
          <div className="staff-slot-meta">
            <span>${member.salary.toFixed(1)}M</span>
            <span>{member.contractYears} yr</span>
            <span>Fit {member.roleFit}</span>
          </div>
          <div className="staff-score-row">
            {staffMetricPills(member).slice(0, 6).map((metric) => (
              <StaffScorePill key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
          <StaffCoverageTags member={member} />
          <div className="action-row">
            <button onClick={toggleExpanded}>{expanded ? "Hide Attributes" : "Show Attributes"}</button>
            <button onClick={openHiring}>Replace</button>
          </div>
          {expanded ? <StaffAttributeTables member={member} /> : null}
        </>
      ) : (
        <button onClick={openHiring}>Hire</button>
      )}
    </div>
  );
}

function StaffView({
  save,
  interview,
  hire
}: {
  save: GameSave;
  interview: (candidateId: string) => void;
  hire: (candidateId: string, slotId: StaffSlotId) => void;
}) {
  const [activeSlotId, setActiveSlotId] = useState<StaffSlotId | undefined>();
  const [openGroups, setOpenGroups] = useState<Set<StaffGroupId>>(() => new Set());
  const [expandedStaffIds, setExpandedStaffIds] = useState<Set<string>>(() => new Set());
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Set<string>>(() => new Set());
  const [expandedCurrentInModal, setExpandedCurrentInModal] = useState(false);
  const staff = staffForTeam(save, save.selectedTeamId);
  const staffBySlot = new Map(staff.map((member) => [member.slotId, member]));
  const activeSlot = activeSlotId ? slotDefinitionFor(activeSlotId) : undefined;
  const activeMember = activeSlot ? staffBySlot.get(activeSlot.id) : undefined;
  const candidates = activeSlot
    ? (save.staffMarket?.candidates ?? [])
        .filter((candidate) => !candidate.hired && candidate.slotId === activeSlot.id)
        .sort((a, b) => staffValueScore(b, activeSlot) - staffValueScore(a, activeSlot))
        .slice(0, 8)
    : [];

  useEffect(() => {
    setExpandedCandidateIds(new Set());
    setExpandedCurrentInModal(false);
  }, [activeSlotId]);

  function confirmHire(candidate: StaffCandidate) {
    if (!activeSlot) return;
    const verb = activeMember ? "replace" : "hire";
    if (!window.confirm(`${verb === "replace" ? "Replace" : "Hire"} ${activeMember ? `${activeMember.firstName} ${activeMember.lastName}` : activeSlot.label} with ${candidate.firstName} ${candidate.lastName}?`)) return;
    hire(candidate.id, activeSlot.id);
    setActiveSlotId(undefined);
  }

  return (
    <section className="view-stack staff-room">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Staff Payroll ${staffPayroll(save, save.selectedTeamId).toFixed(1)}M</p>
          <h3>Staff Room</h3>
        </div>
      </div>
      <div className="staff-group-stack">
        {staffGroups.map((group) => {
          const slots = group.slotIds.map((slotId) => slotDefinitionFor(slotId));
          const members = group.slotIds.map((slotId) => staffBySlot.get(slotId));
          const groupOpen = openGroups.has(group.id);
          const grade = staffAverage(members);
          return (
            <article className={`staff-group staff-group-${group.id} ${groupOpen ? "open" : ""}`} key={group.id}>
              <button className="staff-group-header" onClick={() => setOpenGroups((current) => toggleSetValue(current, group.id))}>
                <div>
                  <span>{group.label}</span>
                  <strong>{grade || "Open"}</strong>
                </div>
                <div>
                  <p>{group.description}</p>
                  <small>{members.filter(Boolean).length}/{slots.length} filled</small>
                </div>
                <em>{groupOpen ? "Collapse" : "Expand"}</em>
              </button>
              {groupOpen ? (
                <div className="staff-slot-list">
                  {group.slotIds.map((slotId) => {
                    const member = staffBySlot.get(slotId);
                    const expanded = member ? expandedStaffIds.has(member.id) : false;
                    return (
                      <StaffSlotCard
                        key={slotId}
                        slotId={slotId}
                        member={member}
                        expanded={expanded}
                        toggleExpanded={() => member && setExpandedStaffIds((current) => toggleSetValue(current, member.id))}
                        openHiring={() => setActiveSlotId(slotId)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {activeSlot ? (
        <div className="staff-modal-backdrop" role="presentation" onMouseDown={() => setActiveSlotId(undefined)}>
          <article className="staff-modal" role="dialog" aria-modal="true" aria-label={`${activeSlot.label} hiring`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="staff-modal-header">
              <div>
                <p className="eyebrow">{activeMember ? "Replace" : "Hire"}</p>
                <h3>{activeSlot.label}</h3>
              </div>
              <button onClick={() => setActiveSlotId(undefined)}>Close</button>
            </div>
            <div className="staff-modal-layout">
              <aside className="staff-current-card">
                <span>Current</span>
                {activeMember ? (
                  <>
                    <strong>{activeMember.firstName} {activeMember.lastName}</strong>
                    <div className="staff-score-row">
                      <StaffScorePill label="OVR" value={staffOverall(activeMember)} />
                      <StaffScorePill label="Fit" value={activeMember.roleFit} />
                    </div>
                    <div className="staff-slot-meta">
                      <span>${activeMember.salary.toFixed(1)}M</span>
                      <span>{activeMember.contractYears} yr</span>
                    </div>
                    <button onClick={() => setExpandedCurrentInModal((current) => !current)}>
                      {expandedCurrentInModal ? "Hide Attributes" : "Show Attributes"}
                    </button>
                    {expandedCurrentInModal ? <StaffAttributeTables member={activeMember} /> : null}
                  </>
                ) : (
                  <p>No current staff member in this slot.</p>
                )}
              </aside>
              <section className="staff-candidate-panel">
                {candidates.map((candidate) => {
                  const value = staffValueScore(candidate, activeSlot);
                  const expanded = expandedCandidateIds.has(candidate.id);
                  return (
                    <div className="candidate-card" key={candidate.id}>
                      <div className="candidate-card-head">
                        <div>
                          <span>{activeSlot.label}</span>
                          <strong>{candidate.firstName} {candidate.lastName}</strong>
                        </div>
                        <StaffScorePill label="OVR" value={staffOverall(candidate)} />
                      </div>
                      <StaffCoverageTags member={candidate} />
                      <div className="staff-score-row">
                        <StaffScorePill label="Value" value={value} />
                        <StaffScorePill label="Fit" value={candidate.roleFit} />
                        {staffMetricPills(candidate).slice(0, 4).map((metric) => (
                          <StaffScorePill key={metric.label} label={metric.label} value={metric.value} />
                        ))}
                      </div>
                      <div className="candidate-metrics">
                        <em>${candidate.demandSalary.toFixed(1)}M/{candidate.demandYears}y</em>
                        <em>{candidate.interviewed ? "Interviewed" : "Not interviewed"}</em>
                      </div>
                      <div className="action-row">
                        <button onClick={() => setExpandedCandidateIds((current) => toggleSetValue(current, candidate.id))}>
                          {expanded ? "Hide Attributes" : "Show Attributes"}
                        </button>
                        <button onClick={() => interview(candidate.id)} disabled={candidate.interviewed}>
                          {candidate.interviewed ? "Interviewed" : "Interview"}
                        </button>
                        <button onClick={() => confirmHire(candidate)}>{activeMember ? "Replace" : "Hire"}</button>
                      </div>
                      {expanded ? <StaffAttributeTables member={candidate} /> : null}
                    </div>
                  );
                })}
                {!candidates.length ? <p>No available candidates for this slot right now.</p> : null}
              </section>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function assignmentTypeLabel(type: ScoutingAssignmentType): string {
  if (type === "prospect") return "Prospect";
  if (type === "position") return "Position";
  if (type === "side") return "Side";
  if (type === "region") return "Region";
  return "Conference";
}

function fitTone(value: number): "good" | "average" | "risk" {
  if (value >= 76) return "good";
  if (value <= 54) return "risk";
  return "average";
}

function progressTone(value: number): "good" | "average" | "risk" {
  if (value >= 65) return "good";
  if (value < 35) return "risk";
  return "average";
}

function scoutingRangeText(range: [number, number]) {
  return `${range[0]}-${range[1]}`;
}

function concernShortLabel(key: keyof ScoutingRecapEntry["concernsAfter"]) {
  if (key === "workEthic") return "Work";
  return key[0].toUpperCase() + key.slice(1);
}

function ScoutingRecapRow({
  entry,
  school,
  direction,
  expanded,
  onToggle
}: {
  entry: ScoutingRecapEntry;
  school?: CollegeProgram;
  direction: "riser" | "faller";
  expanded: boolean;
  onToggle: () => void;
}) {
  const rankDelta = Math.abs(entry.teamRankBefore - entry.teamRankAfter);
  const progressDelta = entry.progressAfter - entry.progressBefore;
  const arrow = direction === "riser" ? "Up" : "Down";
  const impact = scoutingRecapImpact(entry, direction);
  return (
    <div className={`recap-prospect-row recap-${direction}`}>
      <button className="recap-row-main" onClick={onToggle}>
        <span className="recap-movement">
          <strong>{arrow}</strong>
          <small>{rankDelta}</small>
        </span>
        <span className="recap-impact">
          Impact
          <strong>{impact}</strong>
        </span>
        <span className="recap-player">
          <CollegeLogo school={school} size={30} />
          <span>
            <strong>{entry.firstName} {entry.lastName}</strong>
            <small>{entry.position}</small>
          </span>
        </span>
        <span>
          Team
          <strong>#{entry.teamRankBefore}{" -> "}#{entry.teamRankAfter}</strong>
        </span>
        <span>
          NFL
          <strong>#{entry.consensusRank}</strong>
        </span>
        <span>
          Progress
          <strong>{entry.progressBefore}%{" -> "}{entry.progressAfter}%</strong>
          <small>{progressDelta > 0 ? `+${progressDelta}` : progressDelta}%</small>
        </span>
        <span>
          OVR
          <strong>{scoutingRangeText(entry.overallAfter)}</strong>
        </span>
        <span>
          POT
          <strong>{scoutingRangeText(entry.potentialAfter)}</strong>
        </span>
      </button>
      {expanded ? (
        <div className="recap-row-detail">
          <div>
            <strong>{school?.name ?? "Unknown School"}</strong>
            <p>{entry.note}</p>
            <p>Impact weighs {rankDelta} moved spot{rankDelta === 1 ? "" : "s"} by {direction === "riser" ? `new team rank #${entry.teamRankAfter}` : `previous team rank #${entry.teamRankBefore}`}.</p>
          </div>
          <div className="recap-detail-grid">
            <span>OVR <strong>{scoutingRangeText(entry.overallBefore)}{" -> "}{scoutingRangeText(entry.overallAfter)}</strong></span>
            <span>POT <strong>{scoutingRangeText(entry.potentialBefore)}{" -> "}{scoutingRangeText(entry.potentialAfter)}</strong></span>
            <span>Value <strong>{entry.valuePickLabelBefore} {entry.valuePickScoreBefore}{" -> "}{entry.valuePickLabelAfter} {entry.valuePickScoreAfter}</strong></span>
            {(["medical", "character", "workEthic"] as const).map((key) => (
              <span key={key}>
                {concernShortLabel(key)}
                <strong>{scoutingRangeText(entry.concernsBefore[key])}{" -> "}{scoutingRangeText(entry.concernsAfter[key])}</strong>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScoutingRecapSection({
  title,
  entries,
  direction,
  schools,
  expandedIds,
  toggleExpanded
}: {
  title: string;
  entries: ScoutingRecapEntry[];
  direction: "riser" | "faller";
  schools: Map<string, CollegeProgram>;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  return (
    <section className={`recap-section recap-section-${direction}`}>
      <header>
        <strong>{title}</strong>
        <span>{entries.length}</span>
      </header>
      <div className="recap-row-list">
        {entries.map((entry) => (
          <ScoutingRecapRow
            direction={direction}
            entry={entry}
            expanded={expandedIds.has(entry.prospectId)}
            key={`${direction}-${entry.prospectId}`}
            onToggle={() => toggleExpanded(entry.prospectId)}
            school={schools.get(entry.schoolId)}
          />
        ))}
        {!entries.length ? <p>No {title.toLowerCase()} from this scouting week.</p> : null}
      </div>
    </section>
  );
}

type ScoutingDeskTab = "board" | "assignments" | "recap" | "reports";
type ScoutingModalPayload =
  | { type: "prospect"; prospect: Prospect }
  | { type: "assignment"; assignment: ScoutingAssignment }
  | { type: "recap"; entry: ScoutingRecapEntry; direction: "riser" | "faller" }
  | null;

const scoutingDeskTabs: Array<{ id: ScoutingDeskTab; label: string }> = [
  { id: "board", label: "Board" },
  { id: "assignments", label: "Assignments" },
  { id: "recap", label: "Recap" },
  { id: "reports", label: "Reports" }
];

function ScoutingModal({
  payload,
  save,
  close,
  quickFocus,
  updateBoard
}: {
  payload: ScoutingModalPayload;
  save: GameSave;
  close: () => void;
  quickFocus: (prospectId: string) => void;
  updateBoard: (prospectId: string, updates: Parameters<typeof updateProspectBoard>[2]) => void;
}) {
  if (!payload) return null;
  const schools = new Map(save.schools.map((school) => [school.id, school]));
  const title = payload.type === "prospect"
    ? `${payload.prospect.firstName} ${payload.prospect.lastName}`
    : payload.type === "assignment"
      ? "Assignment Detail"
      : `${payload.direction === "riser" ? "Riser" : "Faller"} Detail`;

  return (
    <div className="modal-backdrop roster-modal-backdrop" role="presentation" onMouseDown={close}>
      <article className="roster-modal scouting-detail-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="roster-modal-header">
          <div>
            <p className="eyebrow">Scouting</p>
            <h3>{title}</h3>
          </div>
          <button onClick={close}>Close</button>
        </div>
        {payload.type === "prospect" ? (
          <div className="scouting-modal-stack">
            <div className="scouting-modal-identity">
              <SchoolCell school={schools.get(payload.prospect.schoolId)} />
              <div className="detail-chip-row">
                <span>{payload.prospect.position}</span>
                <span>Team <strong>#{payload.prospect.teamRank}</strong></span>
                <span>NFL <strong>#{payload.prospect.consensusRank}</strong></span>
                <span>Progress <strong>{payload.prospect.scouted.progress ?? payload.prospect.scouted.confidence}%</strong></span>
              </div>
            </div>
            <section className="scouting-modal-section">
              <h4>Board Read</h4>
              <p>{payload.prospect.scoutReports?.[0] ?? payload.prospect.scouted.note}</p>
              <div className="detail-chip-row">
                <span>OVR <strong>{payload.prospect.scouted.low}-{payload.prospect.scouted.high}</strong></span>
                <span>POT <strong>{payload.prospect.scouted.potentialLow}-{payload.prospect.scouted.potentialHigh}</strong></span>
                <span>Value <strong>{payload.prospect.valuePickLabel} {payload.prospect.valuePickScore}</strong></span>
                <span>Projection <strong>R{payload.prospect.projectedRound}</strong></span>
              </div>
            </section>
            <section className="scouting-modal-section">
              <h4>Concerns</h4>
              <div className="concern-mini-stack modal-concern-stack">
                <ConcernRangePill concernType="medical" label="Medical" range={payload.prospect.scouted.concerns.medical} />
                <ConcernRangePill concernType="character" label="Character" range={payload.prospect.scouted.concerns.character} />
                <ConcernRangePill concernType="workEthic" label="Work" range={payload.prospect.scouted.concerns.workEthic} />
              </div>
            </section>
            <ProspectRatingBreakdown prospect={payload.prospect} />
            <div className="roster-modal-actions">
              <button onClick={() => updateBoard(payload.prospect.id, { favorite: !payload.prospect.favorite })}>{payload.prospect.favorite ? "Unstar" : "Star"}</button>
              <button onClick={() => updateBoard(payload.prospect.id, { hidden: !payload.prospect.hidden })}>{payload.prospect.hidden ? "Show" : "Hide"}</button>
              <button onClick={() => { quickFocus(payload.prospect.id); close(); }}>Quick Focus</button>
            </div>
          </div>
        ) : null}
        {payload.type === "assignment" ? (() => {
          const scout = save.staff.find((member) => member.id === payload.assignment.scoutId);
          const focusOptions = scoutingFocusOptions(save, payload.assignment, scout);
          const preview = scoutingAssignmentPreview(save, payload.assignment);
          return (
            <div className="scouting-modal-stack">
              <section className="scouting-modal-section">
                <h4>{scout ? `${scout.firstName} ${scout.lastName}` : "Scout"}</h4>
                <p>{preview.recommendation}</p>
                <div className="detail-chip-row">
                  <span>Type <strong>{assignmentTypeLabel(payload.assignment.type)}</strong></span>
                  <span>Focus <strong>{focusOptions.find((option) => option.value === payload.assignment.focusId)?.label ?? payload.assignment.focusId}</strong></span>
                  <span>Fit <strong>{preview.fit}</strong></span>
                  <span>Targets <strong>{preview.count}</strong></span>
                  <span>Gain <strong>{preview.minGain}-{preview.maxGain}%</strong></span>
                </div>
              </section>
              {preview.warnings.length ? (
                <div className="warning-chip-row">{preview.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
              ) : null}
              <section className="scouting-modal-section">
                <h4>Fit Ratings</h4>
                <div className="rating-chip-row">
                  {preview.ratingChips.map((chip) => (
                    <span className={`rating-chip chip-${fitTone(chip.value)}`} key={`${chip.label}-${chip.value}`}>{chip.label} <strong>{chip.value}</strong></span>
                  ))}
                </div>
              </section>
              <section className="scouting-modal-section">
                <h4>Likely Targets</h4>
                <div className="target-preview-list modal-target-list">
                  {preview.targets.map((target) => (
                    <div key={target.id}>
                      <span>#{target.teamRank} {target.position} {target.name}<small>{target.schoolName} | {target.progress}% | NFL #{target.consensusRank}</small></span>
                      <em className={`progress-delta delta-${progressTone(target.gainRange[1])}`}>+{target.gainRange[0]}-{target.gainRange[1]}%</em>
                    </div>
                  ))}
                  {!preview.targets.length ? <p>No likely targets for this focus.</p> : null}
                </div>
              </section>
            </div>
          );
        })() : null}
        {payload.type === "recap" ? (
          <div className="scouting-modal-stack">
            <section className="scouting-modal-section">
              <h4>{schools.get(payload.entry.schoolId)?.name ?? "Unknown School"}</h4>
              <p>{payload.entry.note}</p>
              <div className="detail-chip-row">
                <span>Team <strong>#{payload.entry.teamRankBefore} to #{payload.entry.teamRankAfter}</strong></span>
                <span>NFL <strong>#{payload.entry.consensusRank}</strong></span>
                <span>Progress <strong>{payload.entry.progressBefore}% to {payload.entry.progressAfter}%</strong></span>
                <span>Impact <strong>{scoutingRecapImpact(payload.entry, payload.direction)}</strong></span>
              </div>
            </section>
            <section className="scouting-modal-section">
              <h4>Before / After</h4>
              <div className="recap-detail-grid">
                <span>OVR <strong>{scoutingRangeText(payload.entry.overallBefore)}{" -> "}{scoutingRangeText(payload.entry.overallAfter)}</strong></span>
                <span>POT <strong>{scoutingRangeText(payload.entry.potentialBefore)}{" -> "}{scoutingRangeText(payload.entry.potentialAfter)}</strong></span>
                <span>Value <strong>{payload.entry.valuePickLabelBefore} {payload.entry.valuePickScoreBefore}{" -> "}{payload.entry.valuePickLabelAfter} {payload.entry.valuePickScoreAfter}</strong></span>
                {(["medical", "character", "workEthic"] as const).map((key) => (
                  <span key={key}>{concernShortLabel(key)} <strong>{scoutingRangeText(payload.entry.concernsBefore[key])}{" -> "}{scoutingRangeText(payload.entry.concernsAfter[key])}</strong></span>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </article>
    </div>
  );
}

function ScoutingView({
  save,
  updateAssignment,
  toggleAssignmentLock,
  optimizeScoutingPlan,
  quickFocus,
  updateBoard
}: {
  save: GameSave;
  updateAssignment: (assignmentId: string, updates: { type?: ScoutingAssignmentType; focusId?: string }) => void;
  toggleAssignmentLock: (assignmentId: string, locked: boolean) => void;
  optimizeScoutingPlan: () => void;
  quickFocus: (prospectId: string) => void;
  updateBoard: (prospectId: string, updates: Parameters<typeof updateProspectBoard>[2]) => void;
}) {
  const [activeScoutingTab, setActiveScoutingTab] = useState<ScoutingDeskTab>("board");
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [regionFilter, setRegionFilter] = useState<ScoutingRegion | "all">("all");
  const [sortMode, setSortMode] = useState<ProspectBoardLens>("balanced");
  const [showHidden, setShowHidden] = useState(false);
  const [expandedRecapIds, setExpandedRecapIds] = useState<Set<string>>(new Set());
  const [selectedRecapWeek, setSelectedRecapWeek] = useState<number | "latest">("latest");
  const [visibleBoardRows, setVisibleBoardRows] = useState(120);
  const [modalPayload, setModalPayload] = useState<ScoutingModalPayload>(null);
  const schools = useMemo(() => new Map(save.schools.map((school) => [school.id, school])), [save.schools]);
  const plan = ensureScoutingPlan(save);
  const recaps = useMemo(() => [...(plan.recaps ?? [])].sort((a, b) => b.week - a.week), [plan.recaps]);
  const selectedWeek = selectedRecapWeek === "latest" ? recaps[0]?.week : selectedRecapWeek;
  const selectedRecap = recaps.find((recap) => recap.week === selectedWeek) ?? recaps[0];
  const visibleProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return save.prospects
      .filter((prospect) => showHidden || !prospect.hidden)
      .filter((prospect) => matchesPositionLens(prospect, positionFilter))
      .filter((prospect) => regionFilter === "all" || prospect.region === regionFilter)
      .filter((prospect) => {
        const text = `${prospect.firstName} ${prospect.lastName} ${prospect.position} ${schools.get(prospect.schoolId)?.name ?? ""}`.toLowerCase();
        return !normalizedQuery || text.includes(normalizedQuery);
      })
      .sort((a, b) => positionFilter === "all" ? compareProspectsForLens(a, b, sortMode) : compareProspectsForPositionLens(a, b, positionFilter, sortMode));
  }, [positionFilter, query, regionFilter, save.prospects, schools, showHidden, sortMode]);
  const shownProspects = visibleProspects.slice(0, visibleBoardRows);
  const hiddenCount = save.prospects.filter((prospect) => prospect.hidden).length;
  const reportRows = [...(plan.reports ?? [])].slice().sort((a, b) => b.week - a.week).slice(0, 80);

  useEffect(() => {
    setVisibleBoardRows(120);
  }, [activeScoutingTab, positionFilter, query, regionFilter, showHidden, sortMode]);

  const tabBadges: Record<ScoutingDeskTab, number | undefined> = {
    board: visibleProspects.length,
    assignments: plan.assignments.length,
    recap: selectedRecap ? selectedRecap.risers.length + selectedRecap.fallers.length : undefined,
    reports: reportRows.length || undefined
  };
  const toggleRecapExpanded = (id: string) => setExpandedRecapIds((current) => toggleSetValue(current, id));

  return (
    <section className="view-stack scouting-desk">
      <MetricStrip save={save} />
      <article className="table-card scouting-desk-shell">
        <div className="scouting-desk-header">
          <div>
            <p className="eyebrow">Scouting Desk</p>
            <h3>Draft Intelligence</h3>
          </div>
          <div className="scouting-desk-summary">
            <span>{visibleProspects.length} prospects</span>
            <span>{plan.assignments.length} assignments</span>
            <span>{hiddenCount} hidden</span>
          </div>
        </div>
        <div className="segmented-tabs compact-tabs scouting-desk-tabs" role="tablist" aria-label="Scouting sections">
          {scoutingDeskTabs.map((tab) => (
            <button key={tab.id} className={activeScoutingTab === tab.id ? "selected" : ""} onClick={() => setActiveScoutingTab(tab.id)} type="button">
              {tab.label}{tabBadges[tab.id] !== undefined ? <span>{tabBadges[tab.id]}</span> : null}
            </button>
          ))}
        </div>
      </article>

      {activeScoutingTab === "board" ? (
        <section className="table-card scouting-board-panel">
          <div className="scouting-toolbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prospects" />
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
              <option value="all">All Positions</option>
              {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value as ScoutingRegion | "all")}>
              <option value="all">All Regions</option>
              {scoutingRegions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as ProspectBoardLens)}>
              <option value="balanced">Balanced</option>
              <option value="upside">Upside</option>
              <option value="floor">Floor</option>
              <option value="consensus">Consensus Rank</option>
              <option value="value">Value Picks</option>
              <option value="progress">Progress</option>
              <option value="position">Position</option>
              <option value="team">Team Rank</option>
            </select>
            <label className="inline-toggle scouting-hidden-toggle">
              <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
              Hidden
            </label>
          </div>
          <div className="scouting-board-count"><span>Showing {Math.min(shownProspects.length, visibleProspects.length)} of {visibleProspects.length}</span></div>
          <DataTable>
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Pos</th>
                <th>School</th>
                <th>Team</th>
                <th>NFL</th>
                <th>Value</th>
                <th>Progress</th>
                <th>OVR</th>
                <th>POT</th>
                <th>Concerns</th>
                <th>Prod</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shownProspects.map((prospect) => {
                const school = schools.get(prospect.schoolId);
                return (
                  <tr className={prospect.hidden ? "muted-row scouting-board-row" : prospect.favorite ? "favorite-row scouting-board-row" : "scouting-board-row"} key={prospect.id}>
                    <td>
                      <button className="scouting-prospect-link" onClick={() => setModalPayload({ type: "prospect", prospect })} type="button">
                        <strong>{prospect.firstName} {prospect.lastName}</strong>
                        <small className="prospect-context">{school?.conference} | {prospect.region}</small>
                      </button>
                    </td>
                    <td>{prospect.position}</td>
                    <td><SchoolCell school={school} /></td>
                    <td>#{prospect.teamRank}</td>
                    <td>#{prospect.consensusRank}</td>
                    <td><ValueBadge prospect={prospect} /></td>
                    <td><ScoutingProgressBar value={prospect.scouted.progress ?? prospect.scouted.confidence} /></td>
                    <td>{prospect.scouted.low}-{prospect.scouted.high}</td>
                    <td>{prospect.scouted.potentialLow}-{prospect.scouted.potentialHigh}</td>
                    <td>
                      <div className="concern-mini-stack scouting-concerns-compact">
                        <ConcernRangePill concernType="medical" label="Med" range={prospect.scouted.concerns.medical} />
                        <ConcernRangePill concernType="character" label="Char" range={prospect.scouted.concerns.character} />
                        <ConcernRangePill concernType="workEthic" label="Work" range={prospect.scouted.concerns.workEthic} />
                      </div>
                    </td>
                    <td>{prospect.production}</td>
                    <td>{prospect.stock > 0 ? `+${prospect.stock}` : prospect.stock}</td>
                    <td>
                      <div className="scouting-row-actions">
                        <button onClick={() => updateBoard(prospect.id, { favorite: !prospect.favorite })}>{prospect.favorite ? "Unstar" : "Star"}</button>
                        <button onClick={() => updateBoard(prospect.id, { hidden: !prospect.hidden })}>{prospect.hidden ? "Show" : "Hide"}</button>
                        <button onClick={() => quickFocus(prospect.id)}>Focus</button>
                        <button onClick={() => setModalPayload({ type: "prospect", prospect })}>Details</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!shownProspects.length ? (
                <tr><td colSpan={13}>No prospects match these filters.</td></tr>
              ) : null}
            </tbody>
          </DataTable>
          {visibleProspects.length > shownProspects.length ? (
            <div className="scouting-show-more"><button onClick={() => setVisibleBoardRows((count) => count + 120)}>Show More</button></div>
          ) : null}
        </section>
      ) : null}

      {activeScoutingTab === "assignments" ? (
        <section className="table-card scouting-assignment-panel">
          <div className="section-heading compact planner-heading scouting-panel-heading">
            <div>
              <p className="eyebrow">Assignments</p>
              <h3>Weekly Scouting Plan</h3>
            </div>
            <button className="primary-action" onClick={optimizeScoutingPlan}>Optimize All</button>
          </div>
          <div className="scouting-assignment-list">
            {plan.assignments.map((assignment) => {
              const scout = save.staff.find((member) => member.id === assignment.scoutId);
              const focusOptions = scoutingFocusOptions(save, assignment, scout);
              const preview = scoutingAssignmentPreview(save, assignment);
              return (
                <div className={`scout-assignment-row card-fit-${fitTone(preview.fit)} ${assignment.locked ? "is-locked" : ""}`} key={assignment.id}>
                  <div className="scout-assignment-main">
                    <strong>{scout ? `${scout.firstName[0]}. ${scout.lastName}` : "Scout"}</strong>
                    {scout ? <small>{scoutSpecialtyTags(scout).slice(0, 3).join(" | ")}</small> : null}
                  </div>
                  <label>
                    <span>Type</span>
                    <select value={assignment.type} onChange={(event) => updateAssignment(assignment.id, { type: event.target.value as ScoutingAssignmentType })}>
                      {assignmentTypes.map((type) => <option key={type} value={type}>{assignmentTypeLabel(type)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Focus</span>
                    <select value={assignment.focusId} onChange={(event) => updateAssignment(assignment.id, { focusId: event.target.value })}>
                      {focusOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}{option.disabled ? " - assigned" : ""}</option>)}
                    </select>
                  </label>
                  <div className="scouting-assignment-metrics">
                    <span>Targets <strong>{preview.count}</strong></span>
                    <span>Gain <strong>{preview.minGain}-{preview.maxGain}%</strong></span>
                    <span className={`fit-${fitTone(preview.fit)}`}>Fit <strong>{preview.fit}</strong></span>
                  </div>
                  <div className="scouting-assignment-actions">
                    <button className={assignment.locked ? "lock-button active" : "lock-button"} onClick={() => toggleAssignmentLock(assignment.id, !assignment.locked)}>{assignment.locked ? "Locked" : "Lock"}</button>
                    <button onClick={() => setModalPayload({ type: "assignment", assignment })}>Details</button>
                  </div>
                  {preview.warnings.length ? <div className="warning-chip-row">{preview.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeScoutingTab === "recap" ? (
        <article className="table-card scouting-recap-card scouting-recap-workspace">
          <div className="section-heading compact recap-heading scouting-panel-heading">
            <div>
              <p className="eyebrow">Weekly Results</p>
              <h3>Scouting Recap</h3>
            </div>
            <div className="recap-week-controls">
              <span>{selectedRecap ? `${selectedRecap.risers.length} risers | ${selectedRecap.fallers.length} fallers` : "No recap yet"}</span>
              <select aria-label="Scouting recap week" disabled={!recaps.length} value={selectedRecap?.week ?? ""} onChange={(event) => setSelectedRecapWeek(Number(event.target.value))}>
                {recaps.map((recap) => <option key={recap.id} value={recap.week}>Week {recap.week}</option>)}
              </select>
            </div>
          </div>
          {selectedRecap ? (
            <div className="scouting-recap-grid">
              <ScoutingRecapSection direction="riser" entries={selectedRecap.risers} expandedIds={expandedRecapIds} schools={schools} title="Risers" toggleExpanded={toggleRecapExpanded} />
              <ScoutingRecapSection direction="faller" entries={selectedRecap.fallers} expandedIds={expandedRecapIds} schools={schools} title="Fallers" toggleExpanded={toggleRecapExpanded} />
            </div>
          ) : <p className="recap-empty">Advance a week to generate scouting recap movement.</p>}
        </article>
      ) : null}

      {activeScoutingTab === "reports" ? (
        <section className="table-card scouting-reports-panel">
          <div className="section-heading compact scouting-panel-heading">
            <div>
              <p className="eyebrow">Reports</p>
              <h3>Recent Scouting Notes</h3>
            </div>
          </div>
          <div className="scouting-report-list">
            {reportRows.map((report) => {
              const primaryProspectId = report.prospectIds[0];
              const prospect = save.prospects.find((item) => item.id === primaryProspectId);
              const school = prospect ? schools.get(prospect.schoolId) : undefined;
              return (
                <div className="scouting-report-row" key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
                    <small>Week {report.week} | {school?.name ?? report.region} | {report.prospectIds.length} target{report.prospectIds.length === 1 ? "" : "s"}</small>
                  </div>
                  <p>{report.body}</p>
                </div>
              );
            })}
            {!reportRows.length ? <p className="scouting-empty-state">No scouting reports yet. Advance a week after assigning scouts to generate reports.</p> : null}
          </div>
        </section>
      ) : null}

      <ScoutingModal payload={modalPayload} save={save} close={() => setModalPayload(null)} quickFocus={quickFocus} updateBoard={updateBoard} />
    </section>
  );
}

type CalendarFilter = "all" | "nfl" | "college" | "managed" | "games" | "deadlines" | "recruiting" | "roster" | "draft" | "important";

const calendarFilters: Array<{ id: CalendarFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "nfl", label: "NFL" },
  { id: "college", label: "College" },
  { id: "managed", label: "Managed Only" },
  { id: "games", label: "Games" },
  { id: "deadlines", label: "Deadlines" },
  { id: "recruiting", label: "Recruiting" },
  { id: "roster", label: "Roster" },
  { id: "draft", label: "Draft" },
  { id: "important", label: "Important" }
];

function CalendarView({ save, openTab, openGame }: { save: GameSave; openTab: (tab: Tab) => void; openGame: (gameId: string) => void }) {
  const [calendarMonth, setCalendarMonth] = useState(save.currentDate.slice(0, 7));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(save.currentDate);
  const nextGameDate = nextDateWithGames(save);
  const activeSchool = schoolForSave(save);
  const activeTeam = selectedTeam(save);
  const filteredEvents = save.seasonCalendar.filter((event) => calendarEventMatchesFilter(event, filter));
  const eventsByDate = new Map<string, GameSave["seasonCalendar"]>();
  for (const event of filteredEvents) {
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]);
  }
  const monthDays = calendarMonthDays(calendarMonth);
  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];
  const nextNotable = filteredEvents.find((event) => event.date >= save.currentDate && (event.important || event.eventLevel === "managed")) ?? filteredEvents.find((event) => event.date >= save.currentDate);

  function openEvent(event: NonNullable<GameSave["seasonCalendar"]>[number]) {
    if (event.gameId) {
      openGame(event.gameId);
      return;
    }
    if (event.actionTab) openTab(event.actionTab as Tab);
  }

  return (
    <section className="panel calendar-page calendar-grid-page">
      <div className="calendar-console-header">
        <div className="calendar-identity">
          {save.careerType === "college" ? <CollegeLogo school={activeSchool} size={52} /> : <TeamLogo save={save} teamId={save.selectedTeamId} size={52} />}
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>{save.careerType === "college" ? activeSchool?.name ?? "College Program" : activeTeam.fullName}</h2>
            <p>{save.calendarPhase.replace(/-/g, " ")} | Football Week {save.currentWeek}</p>
          </div>
        </div>
        <div className="calendar-header-summary">
          <span>{nextNotable ? `Next: ${nextNotable.title} (${formatDateLong(nextNotable.date)})` : nextGameDate ? `Next games ${formatDateLong(nextGameDate)}` : "No upcoming events"}</span>
          <div className="calendar-month-controls">
            <button type="button" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>Prev</button>
            <strong>{monthLabel(calendarMonth)}</strong>
            <button type="button" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>Next</button>
            <button type="button" onClick={() => { setCalendarMonth(save.currentDate.slice(0, 7)); setSelectedDate(save.currentDate); }}>Today</button>
          </div>
        </div>
      </div>

      <div className="calendar-filter-bar" role="group" aria-label="Calendar filters">
        {calendarFilters.map((candidate) => (
          <button key={candidate.id} type="button" className={filter === candidate.id ? "selected" : ""} onClick={() => setFilter(candidate.id)}>
            {candidate.label}
          </button>
        ))}
      </div>

      <div className="month-calendar" data-testid="month-calendar">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
          <div className="calendar-weekday" key={day}>{day}</div>
        ))}
        {monthDays.map((date) => {
          const dayEvents = eventsByDate.get(date) ?? [];
          const inMonth = date.startsWith(calendarMonth);
          const isToday = date === save.currentDate;
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              className={`calendar-day-cell ${inMonth ? "" : "outside-month"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="calendar-day-number">{Number(date.slice(8, 10))}</span>
              <span className="calendar-day-events">
                {dayEvents.slice(0, 4).map((event) => (
                  <em key={event.id} className={`calendar-chip source-${event.source ?? "nfl"} type-${event.type} ${event.eventLevel === "managed" ? "managed" : ""}`}>
                    {event.eventLevel === "managed" ? "Managed: " : ""}{event.title}
                  </em>
                ))}
                {dayEvents.length > 4 ? <em className="calendar-chip more">+{dayEvents.length - 4} more</em> : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <CalendarDateModal
          date={selectedDate}
          events={selectedEvents}
          save={save}
          close={() => setSelectedDate(undefined)}
          openEvent={openEvent}
        />
      ) : null}
    </section>
  );
}

function CalendarDateModal({
  date,
  events,
  save,
  close,
  openEvent
}: {
  date: string;
  events: GameSave["seasonCalendar"];
  save: GameSave;
  close: () => void;
  openEvent: (event: GameSave["seasonCalendar"][number]) => void;
}) {
  const grouped = calendarModalGroups(events);
  return (
    <div className="modal-backdrop calendar-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Events for ${formatDateLong(date)}`}>
      <div className="trade-modal calendar-date-modal">
        <div className="calendar-modal-header">
          <div>
            <p className="eyebrow">{date === save.currentDate ? "Today" : "Calendar date"}</p>
            <h3>{formatDateLong(date)}</h3>
            <p>{calendarPhaseForDisplay(save, date)}</p>
          </div>
          <button type="button" onClick={close}>Close</button>
        </div>
        {grouped.length ? grouped.map((group) => (
          <section className="calendar-modal-group" key={group.label}>
            <h4>{group.label}</h4>
            {group.events.map((event) => (
              <article className={`calendar-modal-event source-${event.source ?? "nfl"}`} key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.description}</span>
                  {event.modalDetail ? <small>{event.modalDetail}</small> : null}
                  <em>{eventSourceLabel(event)} | {event.type.replace(/-/g, " ")}{event.phase ? ` | ${event.phase.replace(/-/g, " ")}` : ""}</em>
                </div>
                {event.gameId || event.actionTab ? <button type="button" onClick={() => openEvent(event)}>{event.gameId ? "Open Game" : "Open"}</button> : null}
              </article>
            ))}
          </section>
        )) : (
          <section className="calendar-modal-empty">
            <h4>No filtered events</h4>
            <p>Daily recovery, scouting, training, roster AI, waivers, offers, and college pipeline timers can still process on this date.</p>
          </section>
        )}
      </div>
    </div>
  );
}

function calendarEventMatchesFilter(event: GameSave["seasonCalendar"][number], filter: CalendarFilter): boolean {
  const source = event.source ?? "nfl";
  if (filter === "all") return true;
  if (filter === "nfl") return source === "nfl";
  if (filter === "college") return source === "college" || source === "career";
  if (filter === "managed") return event.eventLevel === "managed" || event.important === true;
  if (filter === "games") return event.type === "game" || Boolean(event.gameId);
  if (filter === "deadlines") return event.type === "deadline" || event.type === "waivers" || event.type === "practice-squad";
  if (filter === "recruiting") return event.type === "recruiting" || event.actionTab === "college-recruiting";
  if (filter === "roster") return event.type === "roster" || event.actionTab === "roster" || event.actionTab === "college-roster" || event.actionTab === "college-depth";
  if (filter === "draft") return event.type === "draft" || event.actionTab === "draft" || event.actionTab === "college-draft";
  if (filter === "important") return event.important === true;
  return true;
}

function calendarMonthDays(month: string): string[] {
  const first = parseDate(`${month}-01`);
  const start = addDays(`${month}-01`, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1, 12));
  return shifted.toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  return parseDate(`${month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function calendarModalGroups(events: GameSave["seasonCalendar"]): Array<{ label: string; events: GameSave["seasonCalendar"] }> {
  const sorted = [...events].sort((a, b) => {
    const levelGap = (a.eventLevel === "managed" ? 0 : 1) - (b.eventLevel === "managed" ? 0 : 1);
    if (levelGap) return levelGap;
    const sourceOrder = { career: 0, nfl: 1, college: 2 };
    const sourceGap = sourceOrder[a.source ?? "nfl"] - sourceOrder[b.source ?? "nfl"];
    if (sourceGap) return sourceGap;
    return a.title.localeCompare(b.title);
  });
  const groups: Array<{ label: string; events: GameSave["seasonCalendar"] }> = [];
  for (const event of sorted) {
    const label = event.eventLevel === "managed" ? "Managed Organization" : event.source === "college" ? "College World" : event.source === "career" ? "Career" : "NFL";
    const group = groups.find((candidate) => candidate.label === label);
    if (group) group.events.push(event);
    else groups.push({ label, events: [event] });
  }
  return groups;
}

function eventSourceLabel(event: GameSave["seasonCalendar"][number]): string {
  if (event.eventLevel === "managed") return "Managed";
  if (event.source === "college") return "College";
  if (event.source === "career") return "Career";
  return "NFL";
}

function calendarPhaseForDisplay(save: GameSave, date: string): string {
  const phase = calendarPhaseForDate(save.seasonYear, date);
  const dayLabel = date === save.currentDate ? "Current date" : date < save.currentDate ? "Past date" : "Future date";
  return `${dayLabel} | ${phase.replace(/-/g, " ")}`;
}

type ScheduleTableRow =
  | { kind: "game"; game: GameSave["schedule"][number] }
  | { kind: "bye"; week: number };

function regularSeasonGames(save: GameSave): GameSave["schedule"] {
  return save.schedule.filter((game) => (game.seasonType ?? "regular") === "regular");
}

function teamRegularScheduleRows(save: GameSave, teamId: string): ScheduleTableRow[] {
  const games = regularSeasonGames(save)
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week || (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
  const gameByWeek = new Map(games.map((game) => [game.week, game]));
  const maxWeek = Math.max(18, ...regularSeasonGames(save).map((game) => game.week));
  return Array.from({ length: maxWeek }, (_, index) => {
    const week = index + 1;
    const game = gameByWeek.get(week);
    return game ? { kind: "game" as const, game } : { kind: "bye" as const, week };
  });
}

function ScheduleView({ save, openGame }: { save: GameSave; openGame: (gameId: string) => void }) {
  const [viewTeamId, setViewTeamId] = useState(save.selectedTeamId);
  const [mode, setMode] = useState<"team" | "week">("team");
  const [viewWeek, setViewWeek] = useState(save.currentWeek);
  const teamRows = teamRegularScheduleRows(save, viewTeamId);
  const schedule: ScheduleTableRow[] = mode === "team"
    ? teamRows
    : regularSeasonGames(save)
      .filter((game) => game.week === viewWeek)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((game) => ({ kind: "game", game }));
  const viewedTeam = teamById(save, viewTeamId);
  const maxWeek = Math.max(18, ...regularSeasonGames(save).map((game) => game.week));
  const teamGames = teamRows.flatMap((row) => (row.kind === "game" ? [row.game] : []));
  const difficulty =
    mode === "team"
      ? Math.round(
          teamGames.reduce((sum, game) => {
            const opponentId = game.homeTeamId === viewTeamId ? game.awayTeamId : game.homeTeamId;
            return sum + teamOverall(save, opponentId);
          }, 0) / Math.max(1, teamGames.length)
        )
      : undefined;
  return (
    <section className="view-stack">
      <div className="league-toolbar schedule-toolbar">
        <div className="segmented-tabs compact-tabs">
          <button className={mode === "team" ? "selected" : ""} onClick={() => setMode("team")}>Team Schedule</button>
          <button className={mode === "week" ? "selected" : ""} onClick={() => setMode("week")}>League Week</button>
        </div>
        {mode === "team" ? (
          <TeamScopePicker save={save} teamId={viewTeamId} setTeamId={setViewTeamId} label="Schedule team" />
        ) : (
          <label className="week-picker">
            <span>Week</span>
            <select value={viewWeek} onChange={(event) => setViewWeek(Number(event.target.value))}>
              {Array.from({ length: maxWeek }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Week {week}</option>)}
            </select>
          </label>
        )}
        {mode === "team" ? <span className="schedule-difficulty">Schedule difficulty <strong>{difficulty}</strong></span> : null}
      </div>
      <div className="week-strip schedule-matchup-strip">
        {regularSeasonGames(save).filter((game) => game.week === (mode === "week" ? viewWeek : save.currentWeek)).map((game) => (
          <article key={game.id}>
            <span>Week {game.week}</span>
            <strong>
              <TeamLogo save={save} teamId={game.awayTeamId} size={26} />
              <em>at</em>
              <TeamLogo save={save} teamId={game.homeTeamId} size={26} />
            </strong>
          </article>
        ))}
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Week</th>
            <th>{mode === "team" ? "Opponent" : "Away"}</th>
            <th>{mode === "team" ? "Site" : "Home"}</th>
            <th>{mode === "team" ? "Opp Record" : "Matchup"}</th>
            <th>Status</th>
            <th>Result</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row) => {
            if (row.kind === "bye") {
              return (
                <tr key={`bye-${viewTeamId}-${row.week}`} className="schedule-bye-row">
                  <td>{row.week}</td>
                  <td><span className="schedule-team-cell schedule-bye-cell"><TeamLogo save={save} teamId={viewedTeam.id} size={34} /><strong>{viewedTeam.fullName}</strong></span></td>
                  <td>Bye</td>
                  <td>Rest week</td>
                  <td>bye</td>
                  <td>--</td>
                  <td></td>
                </tr>
              );
            }
            const game = row.game;
            const home = teamById(save, game.homeTeamId);
            const away = teamById(save, game.awayTeamId);
            const isHome = game.homeTeamId === viewTeamId;
            const opponent = teamById(save, isHome ? game.awayTeamId : game.homeTeamId);
            const teamScore = isHome ? game.homeScore : game.awayScore;
            const oppScore = isHome ? game.awayScore : game.homeScore;
            const teamResult = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T";
            return (
              <tr key={game.id}>
                <td>{game.week}</td>
                {mode === "team" ? (
                  <>
                    <td><span className="schedule-team-cell"><TeamLogo save={save} teamId={opponent.id} size={34} /><strong>{opponent.fullName}</strong></span></td>
                    <td>{isHome ? "Home" : "Away"}</td>
                    <td><RecordLine save={save} teamId={opponent.id} /></td>
                  </>
                ) : (
                  <>
                    <td><span className="schedule-team-cell"><TeamLogo save={save} teamId={away.id} size={34} /><strong>{away.fullName}</strong></span></td>
                    <td><span className="schedule-team-cell"><TeamLogo save={save} teamId={home.id} size={34} /><strong>{home.fullName}</strong></span></td>
                    <td>{away.abbreviation} at {home.abbreviation}</td>
                  </>
                )}
                <td>{game.status}</td>
                <td>{game.status === "final" ? mode === "team" ? `${teamResult} ${teamScore}-${oppScore}` : `${game.awayScore}-${game.homeScore}` : "TBD"}</td>
                <td>{game.status === "final" ? <button onClick={() => openGame(game.id)}>Open</button> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </section>
  );
}

function StandingRow({
  save,
  team,
  record,
  overall,
  seed,
  powerRank
}: {
  save: GameSave;
  team: GameSave["teams"][number];
  record: GameSave["records"][string];
  overall: number;
  seed?: number;
  powerRank: number;
}) {
  const diff = record.pointsFor - record.pointsAgainst;
  return (
    <div className={`standing-row standings-row-rich ${seed ? "playoff-row" : ""}`} key={team.id}>
      <TeamLogo save={save} teamId={team.id} size={34} />
      <div>
        <strong>{team.fullName}</strong>
        <small>{team.conference} {team.division} | PR #{powerRank}</small>
      </div>
      {seed ? <span className="playoff-seed">#{seed}</span> : <span />}
      <strong>{record.wins}-{record.losses}{record.ties ? `-${record.ties}` : ""}</strong>
      <em>{diff > 0 ? `+${diff}` : diff}</em>
      <em>{teamStreak(save, team.id)}</em>
      <b>{overall}</b>
    </div>
  );
}

function PlayoffBracket({ save, advancePostseasonRound, openGame }: { save: GameSave; advancePostseasonRound: () => void; openGame: (gameId: string) => void }) {
  const activeState = save.postseasonState;
  if (activeState) {
    const currentRound = currentPostseasonRound(save);
    const champion = activeState.championTeamId ? teamById(save, activeState.championTeamId) : undefined;
    const runnerUp = activeState.runnerUpTeamId ? teamById(save, activeState.runnerUpTeamId) : undefined;
    return (
      <section className="view-stack">
        <article className="table-card playoff-live-hero">
          <div>
            <p className="eyebrow">Playoff Bracket</p>
            <h3>{champion ? `${champion.fullName} are champions` : `${postseasonRoundLabel(activeState.currentRound)} ${save.currentWeek === 22 ? "bye week" : "round"}`}</h3>
            <p>{champion ? `Runner-up: ${runnerUp?.fullName ?? "TBD"}.` : `${currentRound?.matchups.length ?? 0} matchup${currentRound?.matchups.length === 1 ? "" : "s"} active.`}</p>
          </div>
          {save.phase === "postseason" && !champion ? (
            <button type="button" onClick={advancePostseasonRound}>
              {save.currentWeek === 22 ? "Process Bye Week" : `Advance ${currentRound ? postseasonRoundLabel(currentRound.round) : "Round"}`}
            </button>
          ) : null}
        </article>
        <section className="playoff-picture-grid playoff-live-grid">
          {activeState.rounds.map((round) => (
            <article className="playoff-conference" key={round.round}>
              <h3>{postseasonRoundLabel(round.round)}</h3>
              {round.byeTeamIds?.map((teamId) => (
                <div className="playoff-bye" key={`${round.round}-bye-${teamId}`}>
                  <span>#1 Bye</span>
                  <TeamLogo save={save} teamId={teamId} size={38} />
                  <strong>{teamById(save, teamId).fullName}</strong>
                </div>
              ))}
              {round.matchups.map((matchup) => {
                const game = save.schedule.find((candidate) => candidate.id === matchup.gameId);
                return (
                  <article className={`playoff-matchup ${game?.status === "final" ? "final" : ""}`} key={matchup.id}>
                    {[{ teamId: matchup.awayTeamId, seed: matchup.awaySeed, score: game?.awayScore }, { teamId: matchup.homeTeamId, seed: matchup.homeSeed, score: game?.homeScore }].map((row) => (
                      <div key={row.teamId} className={matchup.winnerTeamId === row.teamId ? "winner" : ""}>
                        <span>#{row.seed}</span>
                        <TeamLogo save={save} teamId={row.teamId} size={32} />
                        <strong>{teamById(save, row.teamId).fullName}</strong>
                        <em>{game?.status === "final" ? row.score : "TBD"}</em>
                      </div>
                    ))}
                    {game?.status === "final" ? <button type="button" onClick={() => openGame(game.id)}>Open Game</button> : null}
                  </article>
                );
              })}
            </article>
          ))}
        </section>
      </section>
    );
  }
  const projectedSeeds = buildPostseasonSeeds(save);
  const seeds = {
    AFC: projectedSeeds.filter((seed) => seed.conference === "AFC").map((seed) => ({ ...seed, team: teamById(save, seed.teamId), record: save.records[seed.teamId], overall: teamOverall(save, seed.teamId) })),
    NFC: projectedSeeds.filter((seed) => seed.conference === "NFC").map((seed) => ({ ...seed, team: teamById(save, seed.teamId), record: save.records[seed.teamId], overall: teamOverall(save, seed.teamId) }))
  };
  return (
    <section className="playoff-picture-grid">
      {(["AFC", "NFC"] as const).map((conference) => {
        const rows = seeds[conference];
        const matchup = (high: number, low: number) => {
          const home = rows.find((row) => row.seed === high);
          const away = rows.find((row) => row.seed === low);
          return (
            <article className="playoff-matchup" key={`${conference}-${high}-${low}`}>
              {[home, away].map((row) => row ? (
                <div key={row.team.id}>
                  <span>#{row.seed}</span>
                  <TeamLogo save={save} teamId={row.team.id} size={32} />
                  <strong>{row.team.fullName}</strong>
                  <em>{row.record.wins}-{row.record.losses}{row.record.ties ? `-${row.record.ties}` : ""}</em>
                </div>
              ) : null)}
            </article>
          );
        };
        const bye = rows.find((row) => row.seed === 1);
        return (
          <article className="playoff-conference" key={conference}>
            <h3>{conference} Bracket Projection</h3>
            {bye ? (
              <div className="playoff-bye">
                <span>#1 Bye</span>
                <TeamLogo save={save} teamId={bye.team.id} size={38} />
                <strong>{bye.team.fullName}</strong>
              </div>
            ) : null}
            {matchup(2, 7)}
            {matchup(3, 6)}
            {matchup(4, 5)}
          </article>
        );
      })}
    </section>
  );
}

function StandingsView({ save, advancePostseasonRound, openGame }: { save: GameSave; advancePostseasonRound: () => void; openGame: (gameId: string) => void }) {
  const [view, setView] = useState<"division" | "conference" | "overall" | "playoffs">("division");
  const ranked = rankedTeams(save);
  const seedRows = playoffSeeds(save);
  const seedByTeam = Object.fromEntries([...seedRows.AFC, ...seedRows.NFC].map((row) => [row.team.id, row.seed]));
  const powerRanks = powerRankByTeam(save);
  const cards =
    view === "division"
      ? (["AFC", "NFC"] as const).flatMap((conference) => (["East", "North", "South", "West"] as const).map((division) => ({
          id: `${conference}-${division}`,
          title: `${conference} ${division}`,
          rows: ranked.filter((row) => row.team.conference === conference && row.team.division === division)
        })))
      : view === "conference"
        ? (["AFC", "NFC"] as const).map((conference) => ({
            id: conference,
            title: conference,
            rows: ranked.filter((row) => row.team.conference === conference)
          }))
        : [{ id: "league", title: "NFL Overall", rows: ranked }];

  return (
    <section className="view-stack standings-workspace">
      <div className="league-toolbar">
        <div className="segmented-tabs compact-tabs">
          <button className={view === "division" ? "selected" : ""} onClick={() => setView("division")}>Division</button>
          <button className={view === "conference" ? "selected" : ""} onClick={() => setView("conference")}>Conference</button>
          <button className={view === "overall" ? "selected" : ""} onClick={() => setView("overall")}>Overall</button>
          <button className={view === "playoffs" ? "selected" : ""} onClick={() => setView("playoffs")}>Playoff Bracket</button>
        </div>
        <span className="standings-legend"><i /> Current playoff position</span>
      </div>
      {view === "playoffs" ? <PlayoffBracket save={save} advancePostseasonRound={advancePostseasonRound} openGame={openGame} /> : (
        <section className={`standings-board standings-board-${view}`}>
          {cards.map((card) => (
            <article className="standings-card standings-table-card" key={card.id}>
              <h3>{card.title}</h3>
              <div className="standing-header">
                <span>Team</span><span>Seed</span><span>Record</span><span>Diff</span><span>Stk</span><span>OVR</span>
              </div>
              {card.rows.map(({ team, record, overall }) => (
                <StandingRow key={team.id} save={save} team={team} record={record} overall={overall} seed={seedByTeam[team.id]} powerRank={powerRanks[team.id]} />
              ))}
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

type PowerMetric = "overall" | "offense" | "defense" | "specialTeams" | "futureOutlook" | "youngCore" | Position;

function PowerRankingsView({ save }: { save: GameSave }) {
  const [metric, setMetric] = useState<PowerMetric>("overall");
  const base = powerRankings(save);
  const metricValue = (row: (typeof base)[number]) => {
    if (metric === "overall") return row.score;
    if (metric === "offense" || metric === "defense" || metric === "specialTeams" || metric === "futureOutlook" || metric === "youngCore") return row[metric];
    return row.positions[metric];
  };
  const rows = base.slice().sort((a, b) => metricValue(b) - metricValue(a) || a.rank - b.rank);
  return (
    <section className="view-stack power-workspace">
      <div className="league-toolbar">
        <div>
          <p className="eyebrow">League model</p>
          <h3>Power Rankings</h3>
        </div>
        <label className="power-metric-picker">
          <span>Sort by</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as PowerMetric)}>
            <option value="overall">Overall Blend</option>
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="specialTeams">Special Teams</option>
            <option value="futureOutlook">Future Outlook</option>
            <option value="youngCore">Young Core</option>
            {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
        </label>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Record</th>
            <th>{metric === "overall" ? "Power" : metric}</th>
            <th>OVR</th>
            <th>Off</th>
            <th>Def</th>
            <th>ST</th>
            <th>Future</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.id} className={row.team.id === save.selectedTeamId ? "selected-team-row" : ""}>
              <td><strong>#{index + 1}</strong>{metric !== "overall" ? <small className="overall-rank-note"> Overall #{row.rank}</small> : null}</td>
              <td><span className="schedule-team-cell"><TeamLogo save={save} teamId={row.team.id} size={36} /><strong>{row.team.fullName}</strong></span></td>
              <td>{row.record.wins}-{row.record.losses}{row.record.ties ? `-${row.record.ties}` : ""}</td>
              <td><RatingPill value={Math.round(metricValue(row))} /></td>
              <td>{row.rosterOverall}</td>
              <td>{row.offense}</td>
              <td>{row.defense}</td>
              <td>{row.specialTeams}</td>
              <td>{row.futureOutlook}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}

function GameView({ save }: { save: GameSave }) {
  const game =
    save.schedule.find((candidate) => candidate.id === save.lastViewedGameId) ??
    teamSchedule(save, save.selectedTeamId).filter((candidate) => candidate.status === "final").at(-1) ??
    teamSchedule(save, save.selectedTeamId)[0];

  if (!game) return <p>No games available.</p>;
  const home = teamById(save, game.homeTeamId);
  const away = teamById(save, game.awayTeamId);
  const players = new Map(save.players.map((player) => [player.id, player]));
  const snapLeaders = Object.values(game.snapCounts ?? {})
    .map((count) => ({
      count,
      player: players.get(count.playerId),
      total: count.offense + count.defense + count.specialTeams
    }))
    .filter((item) => item.player && item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const gamePlayerRows = Object.entries(game.playerStats ?? {})
    .map(([playerId, stats]) => ({ player: players.get(playerId), stats: normalizePlayerStats(stats) }))
    .filter((row): row is { player: Player; stats: PlayerStats } => Boolean(row.player));
  const leadersFor = (predicate: (player: Player, stats: PlayerStats) => boolean, value: (stats: PlayerStats) => number) =>
    gamePlayerRows
      .filter(({ player, stats }) => predicate(player, stats))
      .sort((a, b) => value(b.stats) - value(a.stats))
      .slice(0, 5);
  const passingLeaders = leadersFor((player, stats) => player.position === "QB" && stats.passAttempts > 0, (stats) => stats.passYards);
  const rushingLeaders = leadersFor((_, stats) => stats.rushAttempts > 0, (stats) => stats.rushYards);
  const receivingLeaders = leadersFor((_, stats) => stats.targets > 0 || stats.receptions > 0, (stats) => stats.receivingYards);
  const defensiveLeaders = leadersFor((_, stats) => stats.tackles + stats.sacks + stats.interceptions > 0, (stats) => stats.tackles + stats.sacks * 6 + stats.interceptions * 8);
  const specialLeaders = leadersFor((_, stats) => stats.fieldGoalAttempts + stats.punts > 0, (stats) => stats.fieldGoalsMade * 3 + stats.punts);
  const homeStats = normalizeTeamGameStats(home.id, game.teamStats?.[home.id]);
  const awayStats = normalizeTeamGameStats(away.id, game.teamStats?.[away.id]);
  const boxRows: Array<[string, string | number, string | number]> = [
    ["Total yards", awayStats.totalYards, homeStats.totalYards],
    ["Passing", awayStats.passingYards, homeStats.passingYards],
    ["Rushing", awayStats.rushingYards, homeStats.rushingYards],
    ["First downs", awayStats.firstDowns, homeStats.firstDowns],
    ["Turnovers", awayStats.turnovers, homeStats.turnovers],
    ["Sacks", `${awayStats.sacks}/${awayStats.sacksAllowed}`, `${homeStats.sacks}/${homeStats.sacksAllowed}`],
    ["Third down", formatRate(rate(awayStats.thirdDownConversions, awayStats.thirdDownAttempts, 100), 1, "%"), formatRate(rate(homeStats.thirdDownConversions, homeStats.thirdDownAttempts, 100), 1, "%")],
    ["Red zone TD", formatRate(rate(awayStats.redZoneTouchdowns, awayStats.redZoneTrips, 100), 1, "%"), formatRate(rate(homeStats.redZoneTouchdowns, homeStats.redZoneTrips, 100), 1, "%")]
  ];
  const renderLeaderGroup = (title: string, rows: typeof passingLeaders, formatter: (stats: PlayerStats) => string) => (
    <article className="table-card">
      <div className="section-heading compact"><div><p className="eyebrow">Game Leaders</p><h3>{title}</h3></div></div>
      {rows.length ? rows.map(({ player, stats }) => (
        <div className="snap-row" key={`${title}-${player.id}`}>
          <span>{compactPlayerName(player)}</span>
          <em>{player.position} | {teamAbbreviationFor(save, player.teamId)}</em>
          <strong>{formatter(stats)}</strong>
        </div>
      )) : <p className="free-agency-empty-log">No {title.toLowerCase()} stats.</p>}
    </article>
  );
  return (
    <section className="game-view">
      <div className="scoreboard">
        <div>
          <TeamLogo save={save} teamId={away.id} size={54} />
          <span>{away.fullName}</span>
          <strong>{game.status === "final" ? game.awayScore : "-"}</strong>
        </div>
        <div>
          <p>Week {game.week}</p>
          <em>{game.status}</em>
        </div>
        <div>
          <TeamLogo save={save} teamId={home.id} size={54} />
          <span>{home.fullName}</span>
          <strong>{game.status === "final" ? game.homeScore : "-"}</strong>
        </div>
      </div>
      <section className="table-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Box Score</p>
            <h3>Team Stats</h3>
          </div>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Stat</th>
              <th>{away.abbreviation}</th>
              <th>{home.abbreviation}</th>
            </tr>
          </thead>
          <tbody>
            {boxRows.map(([label, awayValue, homeValue]) => (
              <tr key={label}>
                <td><strong>{label}</strong></td>
                <td>{awayValue}</td>
                <td>{homeValue}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
      <div className="budget-grid-wide">
        {renderLeaderGroup("Passing", passingLeaders, (stats) => `${stats.passCompletions}/${stats.passAttempts}, ${stats.passYards} YDS, ${stats.passTouchdowns} TD`)}
        {renderLeaderGroup("Rushing", rushingLeaders, (stats) => `${stats.rushAttempts} CAR, ${stats.rushYards} YDS, ${stats.rushTouchdowns} TD`)}
        {renderLeaderGroup("Receiving", receivingLeaders, (stats) => `${stats.receptions}/${stats.targets}, ${stats.receivingYards} YDS, ${stats.receivingTouchdowns} TD`)}
        {renderLeaderGroup("Defense", defensiveLeaders, (stats) => `${stats.tackles} TKL, ${stats.sacks} SCK, ${stats.interceptions} INT`)}
        {renderLeaderGroup("Special", specialLeaders, (stats) => stats.punts ? `${stats.punts} P, ${stats.puntYards} YDS` : `${stats.fieldGoalsMade}/${stats.fieldGoalAttempts} FG`)}
      </div>
      <div className="snap-summary">
        <h3>Snap Leaders</h3>
        {snapLeaders.length ? (
          snapLeaders.map(({ count, player, total }) => (
            <div key={count.playerId} className="snap-row">
              <span>{player?.firstName[0]}. {player?.lastName}</span>
              <em>{player?.position}</em>
              <strong>{total}</strong>
              <small>O {count.offense} | D {count.defense} | ST {count.specialTeams}</small>
            </div>
          ))
        ) : (
          <p>Advance the week to record game snaps.</p>
        )}
      </div>
      <div className="play-log">
        {game.log.length ? (
          game.log.slice(-120).reverse().map((entry, index) => (
            <article key={`${entry.clock}-${index}`} className={`log-${entry.type}`}>
              <span>Q{entry.quarter} {entry.clock}</span>
              <p>{entry.text}</p>
            </article>
          ))
        ) : (
          <article>
            <span>Pregame</span>
            <p>Advance the week to generate the play-by-play log.</p>
          </article>
        )}
      </div>
    </section>
  );
}

function BudgetView({ save, openFreeAgency, openDraftPrep }: { save: GameSave; openFreeAgency: () => void; openDraftPrep: () => void }) {
  const team = selectedTeam(save);
  const ledger = teamCapLedger(save, team.id);
  const players = playersForTeam(save, team.id).sort((a, b) => playerCapHit(b, save.seasonYear) - playerCapHit(a, save.seasonYear)).slice(0, 12);
  const expiring = playersForTeam(save, team.id)
    .filter((player) => (player.contract?.endYear ?? contractEndYear(save, player)) <= save.seasonYear)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);
  const deadMoney = (save.deadMoney ?? []).filter((charge) => charge.teamId === team.id && charge.seasonYear === save.seasonYear).slice(0, 8);
  const compLedger = save.compPickLedger;
  const compEntries = compLedger?.entries.filter((entry) => entry.teamId === team.id).slice(0, 10) ?? [];
  const compProjections = compLedger?.projections.filter((projection) => projection.teamId === team.id) ?? [];
  const canOpenFreeAgency = save.phase === "contract-decisions" && ledger.compliant;
  const canOpenDraftPrep = save.phase === "free-agency" && ledger.compliant;
  return (
    <section className="budget-cap-workspace">
      <article className={`cap-hero ${ledger.compliant ? "compliant" : "over-cap"}`}>
        <div>
          <p className="eyebrow">Cap Room</p>
          <h3>{team.fullName} Cap Desk</h3>
          <p>{ledger.compliant ? "Cap compliant" : "Over the cap"} entering {save.phase.replace(/-/g, " ")}.</p>
        </div>
        <div className="cap-room-display">
          <span>Room</span>
          <strong>${ledger.capRoom.toFixed(1)}M</strong>
          <small>Cap ${ledger.salaryCap.toFixed(1)}M</small>
        </div>
        <div className="cap-phase-actions">
          <button type="button" disabled={!canOpenFreeAgency} title={canOpenFreeAgency ? "Open free agency" : "Available during contract decisions when cap compliant"} onClick={openFreeAgency}>
            Open Free Agency
          </button>
          <button type="button" disabled={!canOpenDraftPrep} title={canOpenDraftPrep ? "Finalize comp picks and open draft prep" : "Available during free agency when cap compliant"} onClick={openDraftPrep}>
            Finalize FA / Draft Prep
          </button>
        </div>
      </article>

      <section className="cap-summary-grid">
        <article><span>Active Cap</span><strong>${ledger.activeCap.toFixed(1)}M</strong></article>
        <article><span>Practice Squad</span><strong>${ledger.practiceSquadCap.toFixed(1)}M</strong></article>
        <article><span>IR Cap</span><strong>${ledger.irCap.toFixed(1)}M</strong></article>
        <article><span>Dead Money</span><strong>${ledger.deadMoney.toFixed(1)}M</strong></article>
        <article><span>Rookie Reserve</span><strong>${ledger.rookieReserve.toFixed(1)}M</strong></article>
        <article><span>Total Commitments</span><strong>${ledger.totalCommitments.toFixed(1)}M</strong></article>
      </section>

      <section className="budget-grid-wide">
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Commitments</p>
              <h3>Top Cap Hits</h3>
            </div>
          </div>
          {players.map((player) => (
            <div className="contract-row cap-contract-row" key={player.id}>
              <span>{player.firstName[0]}. {player.lastName}</span>
              <em>{player.position}</em>
              <strong>${playerCapHit(player, save.seasonYear).toFixed(1)}M</strong>
              <small>dead ${deadMoneyIfMoved(player, save.seasonYear).toFixed(1)}M</small>
            </div>
          ))}
        </article>

        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Decisions</p>
              <h3>Expiring Rights</h3>
            </div>
          </div>
          {expiring.length ? expiring.map((player) => (
            <div className="contract-row cap-contract-row" key={player.id}>
              <span>{player.firstName[0]}. {player.lastName}</span>
              <em>{player.position}</em>
              <strong>{player.contract?.rights?.toUpperCase() ?? "UFA"}</strong>
              <small>market ${suggestedApy(player).toFixed(1)}M</small>
            </div>
          )) : <p className="free-agency-empty-log">No major expiring contracts for this phase.</p>}
        </article>
      </section>

      <section className="budget-grid-wide">
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Dead Money</p>
              <h3>Current Charges</h3>
            </div>
          </div>
          {deadMoney.length ? deadMoney.map((charge) => (
            <div className="contract-row cap-contract-row" key={charge.id}>
              <span>{charge.playerName}</span>
              <em>{charge.source}</em>
              <strong>${charge.amount.toFixed(2)}M</strong>
              <small>{charge.seasonYear}</small>
            </div>
          )) : <p className="free-agency-empty-log">No dead-money charges this season.</p>}
        </article>

        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Comp Picks</p>
              <h3>Projected Ledger</h3>
            </div>
            <span className="read-only-chip">{compProjections.length} projected</span>
          </div>
          {compProjections.map((projection) => (
            <div className="contract-row cap-contract-row" key={projection.id}>
              <span>Round {projection.round}</span>
              <em>{projection.playerName}</em>
              <strong>{projection.value.toFixed(1)}</strong>
              <small>{projection.finalized ? "final" : "projected"}</small>
            </div>
          ))}
          {!compProjections.length && compEntries.length ? <p className="free-agency-empty-log">Ledger has moves, but no net pick currently projects.</p> : null}
          {!compProjections.length && !compEntries.length ? <p className="free-agency-empty-log">No qualifying free-agent movement yet.</p> : null}
          {compEntries.map((entry) => (
            <div className="free-agency-log-row" key={entry.id}>
              <span>{entry.kind === "lost" ? "Lost CFA" : "Gained CFA"}</span>
              <strong>{entry.playerName}</strong>
              <em>R{entry.roundProjection} value {entry.value.toFixed(1)}{entry.canceledById ? " | canceled" : ""}</em>
            </div>
          ))}
        </article>
      </section>
    </section>
  );
}

type CompPicksTab = "projected" | "ledger" | "draft-picks" | "team";

function draftPickSlotLabel(pick: DraftPick): string {
  return pick.compensatory ? `R${pick.round} Comp` : `R${pick.round}.${pick.pickInRound}`;
}

function draftPickCompactLabel(pick: DraftPick): string {
  return pick.compensatory ? `R${pick.round} Comp` : `R${pick.round}`;
}

function CompPicksView({ save }: { save: GameSave }) {
  const [tab, setTab] = useState<CompPicksTab>("projected");
  const [teamId, setTeamId] = useState(save.selectedTeamId);
  const ledger = save.compPickLedger;
  const compPicks = save.draftPicks
    .filter((pick) => pick.compensatory)
    .sort((a, b) => a.draftYear - b.draftYear || a.overallPick - b.overallPick);
  const projections = [...(ledger?.projections ?? [])].sort((a, b) => a.draftYear - b.draftYear || a.round - b.round || b.value - a.value);
  const entries = [...(ledger?.entries ?? [])].sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName));
  const selectedTeamCompPicks = compPicks.filter((pick) => pick.currentTeamId === teamId || pick.originalTeamId === teamId);
  const selectedTeamEntries = entries.filter((entry) => entry.teamId === teamId);
  const selectedTeamProjections = projections.filter((projection) => projection.teamId === teamId);
  const currentDraftYear = save.draftState?.draftYear ?? save.seasonYear + 1;
  const currentYearSeeded = compPicks.filter((pick) => pick.draftYear === currentDraftYear && pick.compSource === "seeded").length;
  const selectedTeam = teamById(save, teamId);

  return (
    <section className="view-stack comp-picks-workspace">
      <article className="table-card comp-picks-hero">
        <div>
          <p className="eyebrow">Comp Picks</p>
          <h3>Compensatory Pick Desk</h3>
          <p>Projected CFA movement, finalized compensatory selections, and team-by-team draft context.</p>
        </div>
        <div className="comp-picks-summary-grid">
          <span><strong>{projections.length}</strong><small>Projected</small></span>
          <span><strong>{entries.length}</strong><small>CFA Entries</small></span>
          <span><strong>{compPicks.length}</strong><small>Loaded Picks</small></span>
          <span><strong>{currentYearSeeded}</strong><small>Year 1 Seeded</small></span>
        </div>
      </article>

      <div className="segmented-tabs compact-tabs comp-picks-tabs">
        {([
          ["projected", "Projected"],
          ["ledger", "Ledger"],
          ["draft-picks", "Draft Picks"],
          ["team", "Team View"]
        ] as Array<[CompPicksTab, string]>).map(([id, label]) => (
          <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "projected" ? (
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Projected</p>
              <h3>Projected Comp Picks</h3>
            </div>
            <span className="read-only-chip">{projections.length} projected</span>
          </div>
          {projections.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Draft</th>
                  <th>Round</th>
                  <th>Player</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((projection) => (
                  <tr key={projection.id}>
                    <td><TeamLogo save={save} teamId={projection.teamId} size={24} /> {teamById(save, projection.teamId).fullName}</td>
                    <td>{projection.draftYear}</td>
                    <td>R{projection.round}</td>
                    <td>{projection.playerName}</td>
                    <td>{projection.value.toFixed(1)}</td>
                    <td><span className="comp-source-pill">{projection.finalized ? "Finalized" : "Projected"}</span></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="free-agency-empty-log">
              {compPicks.length ? "No CFA ledger movement yet. Seeded/finalized compensatory picks are available under Draft Picks." : "No compensatory picks are loaded for this save."}
            </p>
          )}
        </article>
      ) : null}

      {tab === "ledger" ? (
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Ledger</p>
              <h3>CFA Losses And Gains</h3>
            </div>
            <span className="read-only-chip">{entries.length} entries</span>
          </div>
          {entries.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Type</th>
                  <th>Player</th>
                  <th>APY</th>
                  <th>Value</th>
                  <th>Projection</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td><TeamLogo save={save} teamId={entry.teamId} size={24} /> {teamById(save, entry.teamId).abbreviation}</td>
                    <td>{entry.kind === "lost" ? "Lost CFA" : "Gained CFA"}</td>
                    <td>{entry.position} {entry.playerName}</td>
                    <td>${entry.apy.toFixed(1)}M</td>
                    <td>{entry.value.toFixed(1)}</td>
                    <td>R{entry.roundProjection}</td>
                    <td><span className={`comp-source-pill ${entry.canceledById ? "canceled" : ""}`}>{entry.canceledById ? "Canceled" : entry.finalized ? "Final" : "Live"}</span></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="free-agency-empty-log">No CFA ledger movement yet.</p>
          )}
        </article>
      ) : null}

      {tab === "draft-picks" ? (
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Draft Picks</p>
              <h3>Compensatory Draft Order</h3>
            </div>
            <span className="read-only-chip">{compPicks.length} picks</span>
          </div>
          {compPicks.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Pick</th>
                  <th>Draft</th>
                  <th>Current Owner</th>
                  <th>Original Team</th>
                  <th>Source</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {compPicks.map((pick) => (
                  <tr key={pick.id}>
                    <td>#{pick.overallPick} <span className="comp-pick-badge">{draftPickSlotLabel(pick)}</span></td>
                    <td>{pick.draftYear}</td>
                    <td><TeamLogo save={save} teamId={pick.currentTeamId} size={24} /> {teamById(save, pick.currentTeamId).fullName}</td>
                    <td>{teamById(save, pick.originalTeamId).abbreviation}</td>
                    <td><span className="comp-source-pill">{pick.compSource === "ledger" ? "Ledger" : "Seeded"}</span></td>
                    <td>{pick.compLabel ?? "COMP"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="free-agency-empty-log">No compensatory picks are loaded for this save.</p>
          )}
        </article>
      ) : null}

      {tab === "team" ? (
        <article className="table-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Team View</p>
              <h3>{selectedTeam.fullName} Outlook</h3>
            </div>
            <TeamScopePicker save={save} teamId={teamId} setTeamId={setTeamId} label="Comp pick team" />
          </div>
          <div className="comp-team-grid">
            <div>
              <h4>Projected</h4>
              {selectedTeamProjections.length ? selectedTeamProjections.map((projection) => (
                <div className="contract-row cap-contract-row" key={projection.id}>
                  <span>Round {projection.round}</span>
                  <em>{projection.playerName}</em>
                  <strong>{projection.value.toFixed(1)}</strong>
                  <small>{projection.finalized ? "final" : "projected"}</small>
                </div>
              )) : <p className="free-agency-empty-log">No projected CFA picks for this team.</p>}
            </div>
            <div>
              <h4>Finalized / Seeded Picks</h4>
              {selectedTeamCompPicks.length ? selectedTeamCompPicks.map((pick) => (
                <div className="contract-row cap-contract-row" key={pick.id}>
                  <span>#{pick.overallPick} {draftPickSlotLabel(pick)}</span>
                  <em>{pick.draftYear}</em>
                  <strong>{pick.compSource === "ledger" ? "Ledger" : "Seeded"}</strong>
                  <small>{pick.currentTeamId === teamId ? "owned" : `original ${teamById(save, pick.originalTeamId).abbreviation}`}</small>
                </div>
              )) : <p className="free-agency-empty-log">No compensatory picks tied to this team.</p>}
            </div>
          </div>
          <div className="comp-team-ledger">
            <h4>CFA Ledger</h4>
            {selectedTeamEntries.length ? selectedTeamEntries.map((entry) => (
              <div className="free-agency-log-row" key={entry.id}>
                <span>{entry.kind === "lost" ? "Lost CFA" : "Gained CFA"}</span>
                <strong>{entry.position} {entry.playerName}</strong>
                <em>${entry.apy.toFixed(1)}M APY | R{entry.roundProjection}{entry.canceledById ? " | canceled" : ""}</em>
              </div>
            )) : <p className="free-agency-empty-log">No CFA ledger movement yet.</p>}
          </div>
        </article>
      ) : null}
    </section>
  );
}

type DraftRoomTab = "board" | "order" | "trades" | "results";
type DraftProspectModalTab = "overview" | "scouting" | "ratings";

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function draftAssetLabel(save: GameSave, asset: { type: "pick" | "player"; id: string }): string {
  if (asset.type === "pick") {
    const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
    if (!pick) return asset.id;
    return `${pick.draftYear} ${draftPickSlotLabel(pick)} ${teamById(save, pick.originalTeamId).abbreviation}`;
  }
  const player = save.players.find((candidate) => candidate.id === asset.id);
  return player ? `${player.position} ${player.firstName[0]}. ${player.lastName}` : asset.id;
}

function DraftAssetPill({ save, asset }: { save: GameSave; asset: DraftTradeAsset }) {
  if (asset.type === "pick") {
    const pick = save.draftPicks.find((candidate) => candidate.id === asset.id);
    if (!pick) return <span className="trade-asset-pill">{asset.id}</span>;
    return (
      <span className="trade-asset-pill">
        <TeamLogo save={save} teamId={pick.originalTeamId} size={22} />
        <b>{pick.draftYear} {draftPickSlotLabel(pick)}</b>
        {pick.compensatory ? <em>COMP</em> : null}
      </span>
    );
  }
  const player = save.players.find((candidate) => candidate.id === asset.id);
  if (!player) return <span className="trade-asset-pill">{asset.id}</span>;
  return (
    <span className="trade-asset-pill">
      <em>{player.position}</em>
      <b>{player.firstName[0]}. {player.lastName}</b>
    </span>
  );
}

function DraftTradePackage({ save, offer }: { save: GameSave; offer: DraftTradeOffer }) {
  const fromTeam = teamById(save, offer.fromTeamId);
  const toTeam = teamById(save, offer.toTeamId);
  const edge = offer.incomingValue - offer.outgoingValue;
  const edgeTeamId = edge >= 0 ? offer.toTeamId : offer.fromTeamId;
  return (
    <div className="trade-package-detail">
      <div className="trade-team-package">
        <header>
          <TeamLogo save={save} teamId={offer.toTeamId} size={34} />
          <span>{toTeam.fullName} receives</span>
        </header>
        <div>{offer.gives.map((asset) => <DraftAssetPill key={`${asset.type}-${asset.id}`} save={save} asset={asset} />)}</div>
      </div>
      <div className="trade-team-package">
        <header>
          <TeamLogo save={save} teamId={offer.fromTeamId} size={34} />
          <span>{fromTeam.fullName} receives</span>
        </header>
        <div>{offer.receives.map((asset) => <DraftAssetPill key={`${asset.type}-${asset.id}`} save={save} asset={asset} />)}</div>
      </div>
      <div className="trade-value-panel">
        <span>Value edge</span>
        <strong>{edge > 0 ? "+" : ""}{edge}</strong>
        <TeamLogo save={save} teamId={edgeTeamId} size={30} />
      </div>
    </div>
  );
}

function DraftView({
  save,
  openDraftRoom,
  draftProspect,
  nextDraftEvent,
  setSpeed,
  dismissEvent,
  acceptOffer,
  acceptCounterOffer,
  declineOffer,
  simToUserPick,
  simRound,
  simDraft,
  confirmTradeOffer,
  onboardRookies,
  submitUdfaOffer,
  removeUdfaOffer,
  nextUdfaWave,
  simUdfaWaves,
  revealRookieResults,
  openRookieOnboarding,
  beginNextSeason
}: {
  save: GameSave;
  openDraftRoom: () => void;
  draftProspect: (prospectId: string) => void;
  nextDraftEvent: () => void;
  setSpeed: (speed: 1 | 3 | 10) => void;
  dismissEvent: () => void;
  acceptOffer: (offerId: string) => void;
  acceptCounterOffer: (offerId: string, counterOfferId: string) => void;
  declineOffer: (offerId: string) => void;
  simToUserPick: () => void;
  simRound: () => void;
  simDraft: () => void;
  confirmTradeOffer: (offer: DraftTradeOffer) => void;
  onboardRookies: () => void;
  submitUdfaOffer: (prospectId: string, signingBonus: number, guaranteedMoney: number) => void;
  removeUdfaOffer: (offerId: string) => void;
  nextUdfaWave: () => void;
  simUdfaWaves: () => void;
  revealRookieResults: () => void;
  openRookieOnboarding: () => void;
  beginNextSeason: () => void;
}) {
  const [draftTab, setDraftTab] = useState<DraftRoomTab>("board");
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [regionFilter, setRegionFilter] = useState<ScoutingRegion | "all">("all");
  const [conferenceFilter, setConferenceFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<ProspectBoardLens>("team");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showDrafted, setShowDrafted] = useState(false);
  const [valueFilter, setValueFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [selectedProspectId, setSelectedProspectId] = useState<string>();
  const [activeProspectModalTab, setActiveProspectModalTab] = useState<DraftProspectModalTab>("overview");
  const [draftFiltersOpen, setDraftFiltersOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [tradePreview, setTradePreview] = useState<DraftTradeOffer>();
  const [tradePreviewError, setTradePreviewError] = useState<string>();
  const [udfaOfferProspectId, setUdfaOfferProspectId] = useState<string>();
  const [udfaBonus, setUdfaBonus] = useState(0.02);
  const [udfaGuarantee, setUdfaGuarantee] = useState(0.04);
  const draftSave = ensureUdfaState(ensureDraftState(save));
  const schools = new Map(save.schools.map((school) => [school.id, school]));
  const prospects = new Map(save.prospects.map((prospect) => [prospect.id, prospect]));
  const players = new Map(save.players.map((player) => [player.id, player]));
  const selectedProspectIds = new Set(draftSave.draftState.history.map((selection) => selection.prospectId));
  const udfaSignedIds = new Set(draftSave.udfaState?.signings.map((signing) => signing.prospectId) ?? []);
  const currentPick = currentDraftPick(draftSave);
  const draftYear = draftSave.draftState.draftYear;
  const futureDraftYear = draftYear + 1;
  const conferences = [...new Set(save.schools.map((school) => school.conference))].sort((a, b) => a.localeCompare(b));
  const board = save.prospects
    .filter((prospect) => showDrafted || (!selectedProspectIds.has(prospect.id) && !udfaSignedIds.has(prospect.id)))
    .filter((prospect) => showHidden || !prospect.hidden)
    .filter((prospect) => matchesPositionLens(prospect, positionFilter))
    .filter((prospect) => regionFilter === "all" || prospect.region === regionFilter)
    .filter((prospect) => conferenceFilter === "all" || schools.get(prospect.schoolId)?.conference === conferenceFilter)
    .filter((prospect) => !favoritesOnly || prospect.favorite)
    .filter((prospect) => valueFilter === "all" || prospect.valuePickScore >= Number(valueFilter))
    .filter((prospect) => roundFilter === "all" || prospect.projectedRound === Number(roundFilter))
    .filter((prospect) => {
      const school = schools.get(prospect.schoolId);
      const text = `${prospect.firstName} ${prospect.lastName} ${prospect.position} ${school?.name ?? ""} ${school?.conference ?? ""}`.toLowerCase();
      return !query.trim() || text.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => positionFilter === "all" ? compareProspectsForLens(a, b, sortMode) : compareProspectsForPositionLens(a, b, positionFilter, sortMode));
  const currentTeam = currentPick ? teamById(save, currentPick.currentTeamId) : undefined;
  const isUserPick = currentPick?.currentTeamId === save.selectedTeamId;
  const history = [...draftSave.draftState.history].sort((a, b) => a.overallPick - b.overallPick);
  const selectedSelections = history.filter((selection) => selection.teamId === save.selectedTeamId);
  const draftedRookies = selectedSelections
    .map((selection) => ({ selection, prospect: prospects.get(selection.prospectId), player: selection.signedPlayerId ? players.get(selection.signedPlayerId) : undefined }))
    .filter((item) => item.prospect || item.player);
  const needs = draftRoomNeeds(draftSave, save.selectedTeamId);
  const yearOnePickRows = [
    ...draftSave.draftPicks
      .filter((pick) => pick.draftYear === draftYear && pick.currentTeamId === save.selectedTeamId && !pick.usedByProspectId)
      .map((pick) => ({ type: "pick" as const, pick, order: pick.overallPick })),
    ...draftedRookies.map((item) => ({ type: "drafted" as const, ...item, order: item.selection.overallPick }))
  ].sort((a, b) => a.order - b.order);
  const yearTwoPicks = draftSave.draftPicks
    .filter((pick) => pick.draftYear === futureDraftYear && pick.currentTeamId === save.selectedTeamId && !pick.usedByProspectId)
    .sort((a, b) => a.overallPick - b.overallPick);
  const currentYearPicks = draftSave.draftPicks
    .filter((pick) => pick.draftYear === draftYear)
    .sort((a, b) => a.overallPick - b.overallPick);
  const pendingOffer = draftSave.draftState.pendingEvent?.offerId
    ? draftSave.draftState.tradeOffers.find((offer) => offer.id === draftSave.draftState.pendingEvent?.offerId)
    : undefined;
  const actionablePendingOffer = pendingOffer?.userFacing && pendingOffer.status === "proposed" ? pendingOffer : undefined;
  const clockPct = draftSave.draftState.pickTimeLimit
    ? Math.round((draftSave.draftState.clockSeconds / draftSave.draftState.pickTimeLimit) * 100)
    : 0;
  const topNeedLabels = needs.slice(0, 3).map((need) => need.position);
  const completedTrades = completedDraftTrades(draftSave);
  const ufaOfferProspect = udfaOfferProspectId ? draftSave.prospects.find((prospect) => prospect.id === udfaOfferProspectId) : undefined;
  const currentAiUdfaOffers = useMemo(
    () => (save.phase === "udfa" ? getCurrentAiUdfaWaveOffers(draftSave) : []),
    [save]
  );
  const udfaOffer = useMemo(
    () => (ufaOfferProspect ? activeUdfaOfferForProspect(draftSave, ufaOfferProspect.id) : undefined),
    [save, ufaOfferProspect]
  );
  const udfaRivals = useMemo(
    () => (ufaOfferProspect ? rivalUdfaOffers(draftSave, ufaOfferProspect.id, currentAiUdfaOffers) : []),
    [save, currentAiUdfaOffers, ufaOfferProspect]
  );
  const userWaveOffers = useMemo(
    () => draftSave.udfaState?.offers.filter((offer) =>
      offer.isUserOffer &&
      offer.teamId === draftSave.selectedTeamId &&
      offer.wave === draftSave.udfaState?.wave &&
      offer.status === "active"
    ) ?? [],
    [save]
  );
  const editableUdfaOfferProspectIds = useMemo(
    () => new Set((draftSave.udfaState?.offers ?? [])
      .filter((offer) =>
        offer.isUserOffer &&
        offer.teamId === draftSave.selectedTeamId &&
        (offer.status === "active" || offer.status === "countered")
      )
      .map((offer) => offer.prospectId)),
    [save]
  );
  const existingCurrentWaveOffer = ufaOfferProspect ? userWaveOffers.find((offer) => offer.prospectId === ufaOfferProspect.id) : undefined;
  const udfaOfferSlots = draftSave.udfaState?.offerSlots ?? 6;
  const udfaPoolLeft = draftSave.udfaState?.teamPools[save.selectedTeamId] ?? 0;
  const userWaveCommitment = userWaveOffers.reduce((sum, offer) => sum + offer.signingBonus + offer.guaranteedMoney, 0);
  const offerCost = Number((udfaBonus + udfaGuarantee).toFixed(3));
  const commitmentWithoutCurrentOffer = userWaveOffers
    .filter((offer) => offer.id !== existingCurrentWaveOffer?.id)
    .reduce((sum, offer) => sum + offer.signingBonus + offer.guaranteedMoney, 0);
  const offerWouldExceedSlots = Boolean(ufaOfferProspect) && !existingCurrentWaveOffer && userWaveOffers.length >= udfaOfferSlots;
  const offerWouldExceedPool = commitmentWithoutCurrentOffer + offerCost > udfaPoolLeft + 0.0001;
  const canSubmitUdfaOffer = save.phase === "udfa" && Boolean(ufaOfferProspect) && Number.isFinite(offerCost) && offerCost >= 0 && !offerWouldExceedSlots && !offerWouldExceedPool;
  const results = latestRookieResults(draftSave);
  const suggestions = save.phase === "udfa" ? udfaTargetSuggestions(draftSave) : [];
  const inboundInterest = save.phase === "udfa" ? udfaInboundInterest(draftSave) : [];
  const showForcedResults = save.phase === "rookie-results" && Boolean(results);
  const selectedProspect = selectedProspectId ? prospects.get(selectedProspectId) : undefined;
  const selectedProspectSchool = selectedProspect ? schools.get(selectedProspect.schoolId) : undefined;
  const selectedProspectDrafted = selectedProspect ? selectedProspectIds.has(selectedProspect.id) || udfaSignedIds.has(selectedProspect.id) : false;

  useEffect(() => {
    if (selectedProspectId) setActiveProspectModalTab("overview");
  }, [selectedProspectId]);
  const activeDraftFilterCount = [
    regionFilter !== "all",
    conferenceFilter !== "all",
    valueFilter !== "all",
    roundFilter !== "all",
    favoritesOnly,
    showHidden,
    showDrafted
  ].filter(Boolean).length;

  function openTradePreview(pickId: string) {
    const offer = buildTradeOfferForPick(draftSave, pickId);
    setTradePreviewError(undefined);
    if (!offer) {
      setTradePreview(undefined);
      setTradePreviewError("No realistic package is available for that pick right now.");
      return;
    }
    setTradePreview(offer);
  }

  function confirmPreviewTrade() {
    if (!tradePreview || tradePreview.verdict !== "accept") return;
    confirmTradeOffer(tradePreview);
    setTradePreview(undefined);
    setTradePreviewError(undefined);
  }

  function closeTradePreview() {
    setTradePreview(undefined);
    setTradePreviewError(undefined);
  }

  function openUdfaOffer(prospect: Prospect) {
    const existing = activeUdfaOfferForProspect(draftSave, prospect.id);
    setUdfaOfferProspectId(prospect.id);
    setUdfaBonus(existing?.counterSigningBonus ?? existing?.signingBonus ?? 0.02);
    setUdfaGuarantee(existing?.counterGuaranteedMoney ?? existing?.guaranteedMoney ?? 0.04);
  }

  function submitOfferFromModal() {
    if (!ufaOfferProspect || !canSubmitUdfaOffer) return;
    submitUdfaOffer(ufaOfferProspect.id, udfaBonus, udfaGuarantee);
    setUdfaOfferProspectId(undefined);
  }

  function clearDraftFilters() {
    setRegionFilter("all");
    setConferenceFilter("all");
    setValueFilter("all");
    setRoundFilter("all");
    setFavoritesOnly(false);
    setShowHidden(false);
    setShowDrafted(false);
  }

  return (
    <section className="draft-workspace">
      <article className="draft-command-bar">
        <div className="draft-command-main">
          {currentPick && save.phase === "draft" ? (
            <div className="draft-clock-compact">
              <span>On Clock</span>
              <strong>#{currentPick.overallPick} {currentTeam?.abbreviation}</strong>
              <em>{isUserPick ? "Your pick" : "CPU"} | {formatClock(draftSave.draftState.clockSeconds)}</em>
              <div className="clock-bar"><i style={{ width: `${clockPct}%` }} /></div>
            </div>
          ) : null}
          <div className="draft-command-actions">
            <div className="draft-action-group">
              {save.phase === "draft-prep" ? <button onClick={openDraftRoom}>Open Draft</button> : null}
              {save.phase === "udfa" ? (
                <>
                  <button type="button" onClick={nextUdfaWave} disabled={Boolean(draftSave.udfaState?.completed)}>Next UDFA Wave</button>
                  <button type="button" onClick={simUdfaWaves} disabled={Boolean(draftSave.udfaState?.completed)}>Sim Waves</button>
                  <button type="button" onClick={revealRookieResults}>Finalize Class</button>
                </>
              ) : null}
              {save.phase === "rookie-results" ? <button onClick={openRookieOnboarding}>Begin Rookie Onboarding</button> : null}
              {save.phase === "rookie-onboarding" ? <button onClick={onboardRookies}>Run Rookie Onboarding</button> : null}
              {save.phase === "offseason-complete" ? <button onClick={beginNextSeason}>Start Next Season</button> : null}
              {save.phase === "draft" ? (
                <>
                  <button onClick={nextDraftEvent}>Next Event</button>
                  <button onClick={simToUserPick}>Sim To My Pick</button>
                  <button onClick={simRound}>Sim Round</button>
                  <button onClick={simDraft}>Sim Rest</button>
                </>
              ) : null}
            </div>
            {save.phase === "draft" ? (
              <div className="speed-row compact draft-speed-control" aria-label="Draft speed">
                <span>Speed</span>
                {([1, 3, 10] as const).map((speed) => (
                  <button key={speed} className={draftSave.draftState.simSpeed === speed ? "active-mini" : ""} onClick={() => setSpeed(speed)}>
                    {speed}x
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="draft-tabs draft-tabs-compact">
          {([
            ["board", "Board"],
            ["order", "Order"],
            ["trades", "Trades"],
            ...(results ? [["results", "Results"] as [DraftRoomTab, string]] : [])
          ] as Array<[DraftRoomTab, string]>).map(([tab, label]) => (
            <button key={tab} className={draftTab === tab ? "active-mini" : ""} onClick={() => setDraftTab(tab)}>{label}</button>
          ))}
        </div>
      </article>

      <article className="draft-pick-strip">
        <span>My Picks</span>
        <div className="pick-strip-group">
          <b>Year 1</b>
          <div className="pick-chip-list">
            {yearOnePickRows.map((row) => row.type === "pick" ? (
              <span key={row.pick.id} className={`pick-chip ${row.pick.compensatory ? "comp" : ""}`}>
                #{row.pick.overallPick} {draftPickSlotLabel(row.pick)} {teamById(save, row.pick.originalTeamId).abbreviation}
                {row.pick.compensatory ? <small>COMP</small> : null}
              </span>
            ) : (
              <span key={row.selection.pickId} className="pick-chip drafted">#{row.selection.overallPick} {row.prospect?.position ?? row.player?.position} {row.prospect ? `${row.prospect.firstName[0]}. ${row.prospect.lastName}` : `${row.player?.firstName[0]}. ${row.player?.lastName}`}</span>
            ))}
            {!yearOnePickRows.length ? <em>No Year 1 picks</em> : null}
          </div>
        </div>
        <div className="pick-strip-group">
          <b>Year 2</b>
          <div className="pick-chip-list">
            {yearTwoPicks.map((pick) => (
              <span key={pick.id} className={`pick-chip future ${pick.compensatory ? "comp" : ""}`}>
                {pick.draftYear} {draftPickCompactLabel(pick)} {teamById(save, pick.originalTeamId).abbreviation}
                {pick.compensatory ? <small>COMP</small> : null}
              </span>
            ))}
            {!yearTwoPicks.length ? <em>No Year 2 picks</em> : null}
          </div>
        </div>
      </article>

      <article className="table-card draft-main-card draft-board-workspace">
        <div className="draft-board-meta">
          <button type="button" className="needs-toggle" onClick={() => setNeedsOpen((open) => !open)}>
            Needs: {topNeedLabels.join(", ") || "None"}
          </button>
          <span>{board.length} prospects</span>
          {save.phase === "udfa" ? (
            <span className="udfa-pool-readout">
              Pool ${(draftSave.udfaState?.teamPools[save.selectedTeamId] ?? 0).toFixed(3)}M | Live {userWaveOffers.length}/{draftSave.udfaState?.offerSlots ?? 6} | Committed ${userWaveCommitment.toFixed(3)}M
            </span>
          ) : null}
        </div>
        {needsOpen ? (
          <div className="draft-needs-panel">
            {needs.map((need) => (
              <span key={need.position} className={need.drafted ? "filled" : ""}>
                {need.position}
                <small>Grade {need.grade}{need.drafted ? ` | drafted ${need.drafted}` : ""}</small>
              </span>
            ))}
          </div>
        ) : null}
        {draftTab === "board" && !showForcedResults ? (
          <>
            {save.phase === "udfa" && suggestions.length ? (
              <div className="udfa-suggestion-strip">
                <strong>Suggested targets</strong>
                {suggestions.map((prospect) => (
                  <button type="button" key={prospect.id} onClick={() => openUdfaOffer(prospect)}>
                    {prospect.position} {prospect.lastName}
                    <small>TR #{prospect.teamRank} | Opp {udfaOpportunityForTeam(draftSave, save.selectedTeamId, prospect)}</small>
                  </button>
                ))}
                {inboundInterest.length ? <strong>Agent interest</strong> : null}
                {inboundInterest.map((prospect) => (
                  <button type="button" key={`interest-${prospect.id}`} className="agent-interest" onClick={() => openUdfaOffer(prospect)}>
                    {prospect.position} {prospect.lastName}
                    <small>Wants your opportunity path</small>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="draft-filter-toolbar">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prospects" />
              <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as Position | "all")}>
                <option value="all">All Positions</option>
                {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
              </select>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as ProspectBoardLens)}>
                <option value="team">Team Rank</option>
                <option value="balanced">Balanced</option>
                <option value="value">Value Picks</option>
                <option value="consensus">NFL Consensus</option>
                <option value="upside">Upside</option>
                <option value="floor">Floor</option>
                <option value="progress">Progress</option>
                <option value="position">Position</option>
              </select>
              <button type="button" className={activeDraftFilterCount ? "active-mini" : ""} onClick={() => setDraftFiltersOpen(true)}>
                Filters{activeDraftFilterCount ? ` ${activeDraftFilterCount}` : ""}
              </button>
              <span className="draft-board-count">{board.length} prospects</span>
            </div>
            <div className="draft-board-header">
              <span>Team</span>
              <span>NFL</span>
              <span>Player</span>
              <span>Pos</span>
              <span>College</span>
              <span>OVR</span>
              <span>POT</span>
              <span></span>
            </div>
            {board.map((prospect, index) => {
              const drafted = selectedProspectIds.has(prospect.id);
              const school = schools.get(prospect.schoolId);
              return (
                <Fragment key={prospect.id}>
                  <div
                    className={`board-row draft-prospect-row ${drafted ? "muted-row" : ""} ${prospect.favorite ? "favorite-row" : ""} ${prospect.hidden ? "hidden-row" : ""}`}
                    onClick={() => setSelectedProspectId(prospect.id)}
                  >
                    <strong className="draft-rank-cell">#{prospect.teamRank || index + 1}</strong>
                    <strong className="draft-rank-cell neutral">#{prospect.consensusRank}</strong>
                    <span className="draft-player-cell">
                      <strong>{prospect.firstName} {prospect.lastName}</strong>
                    </span>
                    <em>{prospect.position}</em>
                    <span className="draft-school-cell">
                      <CollegeLogo school={school} size={32} />
                      <small title={school?.name ?? "Unknown"}>{school?.name ?? "Unknown"}</small>
                    </span>
                    <b>{prospect.scouted.low}-{prospect.scouted.high}</b>
                    <small>{prospect.scouted.potentialLow}-{prospect.scouted.potentialHigh}</small>
                    <div className="draft-row-actions">
                      {save.phase === "udfa" ? (
                        <button type="button" onClick={(event) => { event.stopPropagation(); openUdfaOffer(prospect); }} disabled={drafted || udfaSignedIds.has(prospect.id)}>
                          {editableUdfaOfferProspectIds.has(prospect.id) ? "Edit Offer" : "Offer"}
                        </button>
                      ) : (
                        <button onClick={(event) => { event.stopPropagation(); draftProspect(prospect.id); }} disabled={!isUserPick || save.phase !== "draft" || drafted}>
                          {drafted ? "Drafted" : "Draft"}
                        </button>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </>
        ) : null}
        {draftTab === "order" && !showForcedResults ? (
          <>
            <div className="draft-order-header">
                <span>Pick</span>
                <span>Owner</span>
                <span>Orig</span>
              <span>Needs</span>
              <span>Selection</span>
              <span>Pos</span>
              <span>College</span>
              <span>Team</span>
              <span>NFL</span>
              <span></span>
            </div>
            {currentYearPicks.map((pick) => {
              const selection = history.find((item) => item.pickId === pick.id);
              const prospect = selection ? prospects.get(selection.prospectId) : undefined;
              const school = prospect ? schools.get(prospect.schoolId) : undefined;
              const ownerNeeds = draftRoomNeeds(draftSave, pick.currentTeamId).slice(0, 4);
              return (
                <div className={`draft-order-row ${selection ? "picked" : currentPick?.id === pick.id ? "on-clock" : ""}`} key={pick.id}>
                  <strong>
                    #{pick.overallPick} <small>{draftPickSlotLabel(pick)}</small>
                    {pick.compensatory ? <span className="comp-pick-badge">COMP</span> : null}
                  </strong>
                  <span className="draft-team-logo"><TeamLogo save={save} teamId={pick.currentTeamId} size={30} /></span>
                  <span className="draft-team-logo"><TeamLogo save={save} teamId={pick.originalTeamId} size={26} /></span>
                  <div className="need-chip-row">
                    <span>Needs: {ownerNeeds.map((need) => need.position).join(", ")}</span>
                  </div>
                  {selection && prospect ? (
                    <>
                      <span className="draft-player-cell">
                        <strong>{prospect.firstName} {prospect.lastName}</strong>
                        <small>Pick #{selection.overallPick}</small>
                      </span>
                      <em>{prospect.position}</em>
                      <span className="draft-school-cell">
                        <CollegeLogo school={school} size={32} />
                        <small title={school?.name ?? "Unknown"}>{school?.name ?? "Unknown"}</small>
                      </span>
                      <strong className="draft-rank-cell">#{prospect.teamRank}</strong>
                      <strong className="draft-rank-cell neutral">#{prospect.consensusRank}</strong>
                      <span></span>
                    </>
                  ) : (
                    <>
                      <span>-</span>
                      <em>-</em>
                      <span>-</span>
                      <strong>-</strong>
                      <strong>-</strong>
                      <button onClick={() => openTradePreview(pick.id)} disabled={save.phase !== "draft" || pick.currentTeamId === save.selectedTeamId || Boolean(pick.usedByProspectId)}>
                        Trade Up
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </>
        ) : null}
        {draftTab === "trades" && !showForcedResults ? (
          <>
            <div className="draft-trade-list">
              {completedTrades.map((offer) => (
                <div className="trade-package-card compact accepted" key={offer.id}>
                  <div className="trade-card-heading">
                    <TeamLogo save={save} teamId={offer.fromTeamId} size={32} />
                    <span>completed trade</span>
                    <TeamLogo save={save} teamId={offer.toTeamId} size={32} />
                    <strong>{teamById(save, offer.fromTeamId).fullName} with {teamById(save, offer.toTeamId).fullName}</strong>
                  </div>
                  <p>{offer.rationale ?? offer.message}</p>
                  <DraftTradePackage save={draftSave} offer={offer} />
                </div>
              ))}
              {!completedTrades.length ? <p>No completed draft trades yet.</p> : null}
            </div>
          </>
        ) : null}
        {(draftTab === "results" || showForcedResults) && results ? (
          <RookieResultsView save={draftSave} results={results} />
        ) : null}
        {save.phase === "udfa" && !showForcedResults ? (
          <UdfaRecapPanel save={draftSave} openOffer={openUdfaOffer} />
        ) : null}
      </article>
        {draftFiltersOpen ? (
          <div className="modal-backdrop draft-modal-backdrop" onMouseDown={() => setDraftFiltersOpen(false)}>
            <article className="trade-modal draft-filter-modal" role="dialog" aria-modal="true" aria-label="Draft board filters" onMouseDown={(event) => event.stopPropagation()}>
              <header className="draft-modal-header">
                <div>
                  <p className="eyebrow">Board Filters</p>
                  <h3>Draft Board Filters</h3>
                </div>
                <button type="button" onClick={() => setDraftFiltersOpen(false)}>Close</button>
              </header>
              <div className="draft-filter-modal-grid">
                <label>
                  Region
                  <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value as ScoutingRegion | "all")}>
                    <option value="all">All Regions</option>
                    {scoutingRegions.map((region) => <option key={region} value={region}>{region}</option>)}
                  </select>
                </label>
                <label>
                  Conference
                  <select value={conferenceFilter} onChange={(event) => setConferenceFilter(event.target.value)}>
                    <option value="all">All Conferences</option>
                    {conferences.map((conference) => <option key={conference} value={conference}>{conference}</option>)}
                  </select>
                </label>
                <label>
                  Value
                  <select value={valueFilter} onChange={(event) => setValueFilter(event.target.value)}>
                    <option value="all">All Values</option>
                    <option value="15">Value+</option>
                    <option value="40">Major Steals</option>
                  </select>
                </label>
                <label>
                  Round
                  <select value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)}>
                    <option value="all">All Rounds</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((round) => <option key={round} value={round}>Round {round}</option>)}
                  </select>
                </label>
              </div>
              <div className="draft-filter-toggles">
                <button type="button" className={favoritesOnly ? "active-mini" : ""} onClick={() => setFavoritesOnly((value) => !value)}>Favorites</button>
                <button type="button" className={showHidden ? "active-mini" : ""} onClick={() => setShowHidden((value) => !value)}>Hidden</button>
                <button type="button" className={showDrafted ? "active-mini" : ""} onClick={() => setShowDrafted((value) => !value)}>Drafted</button>
              </div>
              <div className="button-stack wide">
                <button type="button" onClick={clearDraftFilters} disabled={!activeDraftFilterCount}>Clear Filters</button>
                <button type="button" onClick={() => setDraftFiltersOpen(false)}>Done</button>
              </div>
            </article>
          </div>
        ) : null}
        {selectedProspect ? (
          <div className="modal-backdrop roster-modal-backdrop draft-modal-backdrop" role="presentation" onMouseDown={() => setSelectedProspectId(undefined)}>
            <article className="roster-modal draft-prospect-modal" role="dialog" aria-modal="true" aria-label={`${selectedProspect.firstName} ${selectedProspect.lastName} prospect details`} onMouseDown={(event) => event.stopPropagation()}>
              <header className="roster-modal-header">
                <div>
                  <p className="eyebrow">Draft Prospect</p>
                  <h3>{selectedProspect.firstName} {selectedProspect.lastName}</h3>
                  <div className="roster-detail-meta">
                    <span>{selectedProspect.position}</span>
                    <span>{selectedProspectSchool?.name ?? "Unknown College"}</span>
                    <span>Team #{selectedProspect.teamRank}</span>
                    <span>NFL #{selectedProspect.consensusRank}</span>
                  </div>
                </div>
                <div className="roster-modal-actions">
                  <div className="roster-primary-grades">
                    <span><small>OVR</small><strong>{selectedProspect.scouted.low}-{selectedProspect.scouted.high}</strong></span>
                    <span><small>POT</small><strong>{selectedProspect.scouted.potentialLow}-{selectedProspect.scouted.potentialHigh}</strong></span>
                  </div>
                  <button type="button" onClick={(event) => {
                    event.stopPropagation();
                    setSelectedProspectId(undefined);
                  }}>Close</button>
                </div>
              </header>
              <div className="roster-modal-tabs" role="tablist" aria-label="Draft prospect detail tabs">
                {([
                  ["overview", "Overview"],
                  ["scouting", "Scouting"],
                  ["ratings", "Ratings"]
                ] as Array<[DraftProspectModalTab, string]>).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeProspectModalTab === tab}
                    className={activeProspectModalTab === tab ? "selected" : ""}
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      setActiveProspectModalTab(tab);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveProspectModalTab(tab);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <DraftProspectDetailModal
                prospect={selectedProspect}
                school={selectedProspectSchool}
                activeTab={activeProspectModalTab}
                action={save.phase === "udfa" ? (
                  <button type="button" onClick={() => { openUdfaOffer(selectedProspect); setSelectedProspectId(undefined); }} disabled={selectedProspectDrafted}>
                    {editableUdfaOfferProspectIds.has(selectedProspect.id) ? "Edit Offer" : "Offer"}
                  </button>
                ) : (
                  <button type="button" onClick={() => { draftProspect(selectedProspect.id); setSelectedProspectId(undefined); }} disabled={!isUserPick || save.phase !== "draft" || selectedProspectDrafted}>
                    {selectedProspectDrafted ? "Drafted" : "Draft"}
                  </button>
                )}
              />
            </article>
          </div>
        ) : null}
        {save.phase === "draft" && draftSave.draftState.pendingEvent ? (
          <div className="modal-backdrop draft-modal-backdrop" onMouseDown={dismissEvent}>
            <article className="trade-modal" role="dialog" aria-modal="true" aria-label="Draft event" onMouseDown={(event) => event.stopPropagation()}>
              {pendingOffer ? (
                <>
                  <p className="eyebrow">Trade offer</p>
                  <div className="trade-card-heading">
                    <TeamLogo save={save} teamId={pendingOffer.fromTeamId} size={36} />
                    <span>draft trade</span>
                    <TeamLogo save={save} teamId={pendingOffer.toTeamId} size={36} />
                    <h3>{teamById(save, pendingOffer.fromTeamId).fullName} with {teamById(save, pendingOffer.toTeamId).fullName}</h3>
                  </div>
                  <p>{pendingOffer.rationale ?? pendingOffer.message}</p>
                  <DraftTradePackage save={draftSave} offer={pendingOffer} />
                  {actionablePendingOffer ? (
                    <div className="button-stack wide">
                      <button type="button" onClick={() => acceptOffer(actionablePendingOffer.id)}>Accept</button>
                      <button type="button" onClick={() => declineOffer(actionablePendingOffer.id)}>Decline</button>
                      {actionablePendingOffer.counterOffers?.map((counter) => (
                        <button type="button" key={counter.id} onClick={() => acceptCounterOffer(actionablePendingOffer.id, counter.id)}>
                          Counter: {counter.gives.map((asset) => draftAssetLabel(draftSave, asset)).join(", ")}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="button-stack wide">
                      <button type="button" onClick={dismissEvent}>Continue</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="eyebrow">{draftSave.draftState.pendingEvent.type}</p>
                  <h3>{draftSave.draftState.pendingEvent.title}</h3>
                  <p>{draftSave.draftState.pendingEvent.message}</p>
                  <button type="button" onClick={dismissEvent}>Continue</button>
                </>
              )}
            </article>
          </div>
        ) : null}
        {tradePreview || tradePreviewError ? (
          <div className="modal-backdrop draft-modal-backdrop" onMouseDown={closeTradePreview}>
            <article className="trade-modal trade-preview-modal" role="dialog" aria-modal="true" aria-label="Draft trade preview" onMouseDown={(event) => event.stopPropagation()}>
              <p className="eyebrow">Trade preview</p>
              {tradePreview ? (
                <>
                  <div className="trade-card-heading">
                    <TeamLogo save={save} teamId={tradePreview.fromTeamId} size={36} />
                    <span>trade up package</span>
                    <TeamLogo save={save} teamId={tradePreview.toTeamId} size={36} />
                    <h3>{teamById(save, tradePreview.fromTeamId).fullName} with {teamById(save, tradePreview.toTeamId).fullName}</h3>
                  </div>
                  <p>{tradePreview.message}</p>
                  <DraftTradePackage save={draftSave} offer={tradePreview} />
                  {tradePreview.rationale ? <p>{tradePreview.rationale}</p> : null}
                  <div className="button-stack wide">
                    <button onClick={confirmPreviewTrade} disabled={tradePreview.verdict !== "accept"}>
                      Confirm Trade
                    </button>
                    <button onClick={closeTradePreview}>Cancel</button>
                    {tradePreview.verdict !== "accept" ? <span className="trade-warning">This package is not currently acceptable.</span> : null}
                  </div>
                </>
              ) : (
                <>
                  <h3>No package available</h3>
                  <p>{tradePreviewError}</p>
                  <button onClick={closeTradePreview}>Close</button>
                </>
              )}
            </article>
          </div>
        ) : null}
        {ufaOfferProspect ? (
          <div className="modal-backdrop draft-modal-backdrop" onMouseDown={() => setUdfaOfferProspectId(undefined)}>
            <article className="trade-modal udfa-offer-modal" role="dialog" aria-modal="true" aria-label="UDFA offer" onMouseDown={(event) => event.stopPropagation()}>
              <p className="eyebrow">UDFA offer</p>
              <div className="udfa-offer-heading">
                <div>
                  <h3>{ufaOfferProspect.firstName} {ufaOfferProspect.lastName}</h3>
                  <p>{ufaOfferProspect.position} | Team Rank #{ufaOfferProspect.teamRank} | NFL #{ufaOfferProspect.consensusRank}</p>
                </div>
                <strong>Opportunity {udfaOpportunityForTeam(draftSave, save.selectedTeamId, ufaOfferProspect)}</strong>
              </div>
              <div className="udfa-offer-grid">
                <section>
                  <h4>Your terms</h4>
                  {udfaOffer?.status === "countered" ? (
                    <p className="udfa-counter-note">
                      Counter target: ${udfaOffer.counterSigningBonus?.toFixed(3)}M bonus and ${udfaOffer.counterGuaranteedMoney?.toFixed(3)}M guarantee.
                    </p>
                  ) : null}
                  <label>
                    Signing bonus
                    <input type="number" min="0" max="0.25" step="0.005" value={udfaBonus} onChange={(event) => setUdfaBonus(Number(event.target.value))} />
                  </label>
                  <label>
                    Guaranteed money
                    <input type="number" min="0" max="0.25" step="0.005" value={udfaGuarantee} onChange={(event) => setUdfaGuarantee(Number(event.target.value))} />
                  </label>
                  <div className="udfa-offer-metrics">
                    <span>Offer <strong>${offerCost.toFixed(3)}M</strong></span>
                    <span>Pool left <strong>${udfaPoolLeft.toFixed(3)}M</strong></span>
                    <span>Live slots <strong>{userWaveOffers.length}/{udfaOfferSlots}</strong></span>
                  </div>
                  <div className="button-stack wide">
                    <button type="button" onClick={submitOfferFromModal} disabled={!canSubmitUdfaOffer}>Submit Offer</button>
                    {udfaOffer?.status === "active" ? (
                      <button type="button" onClick={() => { removeUdfaOffer(udfaOffer.id); setUdfaOfferProspectId(undefined); }}>Withdraw</button>
                    ) : null}
                    <button type="button" onClick={() => setUdfaOfferProspectId(undefined)}>Close</button>
                  </div>
                </section>
                <section>
                  <h4>Live rival offers</h4>
                  <div className="udfa-rival-list">
                    {udfaRivals.map((offer) => (
                      <div key={offer.id}>
                        <TeamLogo save={draftSave} teamId={offer.teamId} size={32} />
                        <span>{teamById(draftSave, offer.teamId).fullName}</span>
                        <strong>${offer.signingBonus.toFixed(3)}M + ${offer.guaranteedMoney.toFixed(3)}M</strong>
                      </div>
                    ))}
                    {!udfaRivals.length ? <p>No rival offer is on the table right now.</p> : null}
                  </div>
                </section>
              </div>
            </article>
          </div>
        ) : null}
    </section>
  );
}

function UdfaRecapPanel({ save, openOffer }: { save: GameSave; openOffer: (prospect: Prospect) => void }) {
  const state = save.udfaState;
  if (!state) return null;
  const prospects = new Map(save.prospects.map((prospect) => [prospect.id, prospect]));
  const signings = new Map(state.signings.map((signing) => [signing.id, signing]));
  const recap = state.recaps[0];
  const remaining = undraftedProspects(save).slice().sort((a, b) => a.teamRank - b.teamRank).slice(0, 5);
  const userSignings = state.signings
    .filter((signing) => signing.teamId === save.selectedTeamId)
    .map((signing) => prospects.get(signing.prospectId))
    .filter((prospect): prospect is Prospect => Boolean(prospect));
  return (
    <section className="udfa-recap-workspace">
      <article>
        <p className="eyebrow">My UDFA class</p>
        <h4>{userSignings.length} signed</h4>
        <div className="udfa-mini-list">
          {userSignings.map((prospect) => (
            <span key={prospect.id}>{prospect.position} <strong>{prospect.firstName} {prospect.lastName}</strong></span>
          ))}
          {!userSignings.length ? <p>No undrafted rookies signed yet.</p> : null}
        </div>
      </article>
      <article>
        <p className="eyebrow">Latest wave</p>
        {recap ? (
          <>
            <h4>Wave {recap.wave}</h4>
            <div className="udfa-wave-counts">
              <span>Won <strong>{recap.userSignedIds.length}</strong></span>
              <span>Lost <strong>{recap.userLostIds.length}</strong></span>
              <span>Counters <strong>{recap.counterIds.length}</strong></span>
            </div>
            {recap.relevantCpuSigningIds.map((id) => {
              const signing = signings.get(id);
              const prospect = signing ? prospects.get(signing.prospectId) : undefined;
              return signing && prospect ? <p key={id}>{prospect.position} {prospect.lastName} signed with {teamById(save, signing.teamId).abbreviation}.</p> : null;
            })}
          </>
        ) : <p>Resolve the first wave to see signings, misses, and counters.</p>}
      </article>
      <article>
        <p className="eyebrow">Best unsigned</p>
        <div className="udfa-mini-list">
          {remaining.map((prospect) => (
            <button type="button" key={prospect.id} onClick={() => openOffer(prospect)}>
              #{prospect.teamRank} {prospect.position} <strong>{prospect.lastName}</strong>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

type RookieResultsTab = "my" | "teams" | "league";
type RookieResultLens = "best" | "overall" | "potential" | "value" | "slot" | "position";

function rookieSort(rows: RookieAcquisitionResult[], lens: RookieResultLens): RookieAcquisitionResult[] {
  return rows.slice().sort((a, b) => {
    if (lens === "overall") return b.actualOverall - a.actualOverall || b.actualPotential - a.actualPotential;
    if (lens === "potential") return b.actualPotential - a.actualPotential || b.actualOverall - a.actualOverall;
    if (lens === "value") return b.valueSpentScore - a.valueSpentScore || b.bestRookieScore - a.bestRookieScore;
    if (lens === "slot") return (a.overallPick ?? 999) - (b.overallPick ?? 999) || b.bestRookieScore - a.bestRookieScore;
    if (lens === "position") return a.position.localeCompare(b.position) || b.bestRookieScore - a.bestRookieScore;
    return b.bestRookieScore - a.bestRookieScore || b.actualPotential - a.actualPotential;
  });
}

function scoutingRevealLabel(result: RookieAcquisitionResult): string {
  if (result.actualOverall > result.scouting.overallRange[1]) return "OVR beat range";
  if (result.actualOverall < result.scouting.overallRange[0]) return "OVR missed range";
  if (result.actualPotential > result.scouting.potentialRange[1]) return "POT beat range";
  if (result.actualPotential < result.scouting.potentialRange[0]) return "POT missed range";
  return "Inside scout range";
}

function rookieLensLabel(lens: RookieResultLens): string {
  if (lens === "overall") return "Highest OVR";
  if (lens === "potential") return "Highest POT";
  if (lens === "value") return "Value Spent";
  if (lens === "slot") return "Draft Slot";
  if (lens === "position") return "Position";
  return "Best Rookie";
}

function rookieAcquisitionLabel(result: RookieAcquisitionResult): string {
  return result.source === "udfa" ? "Undrafted signing" : `Round ${result.round} pick`;
}

function rookieScoreTone(value: number): "elite" | "great" | "good" | "steady" {
  if (value >= 86) return "elite";
  if (value >= 78) return "great";
  if (value >= 70) return "good";
  return "steady";
}

function RookieResultRow({
  save,
  result,
  expanded,
  toggle
}: {
  save: GameSave;
  result: RookieAcquisitionResult;
  expanded: boolean;
  toggle: () => void;
}) {
  const school = save.schools.find((candidate) => candidate.id === result.schoolId);
  const player = save.players.find((candidate) => candidate.id === result.playerId);
  const revealTone = scoutingRevealLabel(result);
  const scoreTone = rookieScoreTone(result.bestRookieScore);
  return (
    <Fragment>
      <button className="rookie-result-row" onClick={toggle}>
        <div className="rookie-row-main">
          <span className="rookie-row-team"><TeamLogo save={save} teamId={result.teamId} size={32} /></span>
          <div className="rookie-row-player">
            <strong>{result.firstName} {result.lastName}</strong>
            <div className="rookie-row-subline">
              <span>{result.position}</span>
              <span>{rookieAcquisitionLabel(result)}</span>
              <span>{result.costLabel}</span>
            </div>
          </div>
          <div className="rookie-row-school">
            <span className="draft-college-logo"><CollegeLogo school={school} size={28} /></span>
            <span>{school?.name ?? "Unknown school"}</span>
          </div>
          <div className="rookie-row-rating-stack">
            <span><small>OVR</small><strong>{result.actualOverall}</strong></span>
            <span><small>POT</small><strong>{result.actualPotential}</strong></span>
          </div>
          <div className="rookie-row-ranks">
            <span>My #{result.userBoardRank}</span>
            <span>NFL #{result.consensusRank}</span>
            <span>Team #{result.acquiringTeamRank}</span>
          </div>
          <div className="rookie-row-scorecards">
            <span className={`rookie-score-pill ${scoreTone}`}>
              <small>Best</small>
              <strong>{result.bestRookieScore}</strong>
            </span>
            <span className="rookie-score-pill value">
              <small>Value</small>
              <strong>{result.valueSpentScore}</strong>
            </span>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="rookie-result-detail">
          <div className="rookie-detail-story">
            <span className={`rookie-detail-banner ${scoreTone}`}>{revealTone}</span>
            <p>
              Actual {result.actualOverall} OVR / {result.actualPotential} POT against draft-night
              OVR {result.scouting.overallRange[0]}-{result.scouting.overallRange[1]} and
              POT {result.scouting.potentialRange[0]}-{result.scouting.potentialRange[1]}.
            </p>
            <div className="prospect-mini-metrics rookie-detail-metrics">
              <span>Scouted <strong>{result.scouting.progress}%</strong></span>
              <span>Medical <strong>{result.scouting.concerns.medical.join("-")}</strong></span>
              <span>Character <strong>{result.scouting.concerns.character.join("-")}</strong></span>
              <span>Work <strong>{result.scouting.concerns.workEthic.join("-")}</strong></span>
              <span>Acquisition <strong>{rookieAcquisitionLabel(result)}</strong></span>
            </div>
            <p>{result.scouting.reports[0] ?? result.scouting.note}</p>
          </div>
          <div className="rookie-detail-side">
            <div className="rookie-detail-score-block">
              <span>Best Rookie Score</span>
              <strong>{result.bestRookieScore}</strong>
              <small>Value {result.valueSpentScore}</small>
            </div>
            <div>
              <h4>Position fits</h4>
              <div className="rookie-fit-grid">
              {player ? eligiblePositionsFor(player).map((position) => (
                <span key={position}>{position} <strong>{player.positionFits[position] ?? 0}</strong></span>
              )) : <span>{result.position}</span>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Fragment>
  );
}

function RookieResultList({ save, rows }: { save: GameSave; rows: RookieAcquisitionResult[] }) {
  const [expandedId, setExpandedId] = useState<string>();
  return (
    <div className="rookie-result-list">
      {rows.map((result) => (
        <RookieResultRow
          key={result.id}
          save={save}
          result={result}
          expanded={expandedId === result.id}
          toggle={() => setExpandedId((current) => current === result.id ? undefined : result.id)}
        />
      ))}
      {!rows.length ? <p>No rookie acquisitions in this view.</p> : null}
    </div>
  );
}

function RookieSpotlightCard({
  title,
  eyebrow,
  result
}: {
  title: string;
  eyebrow: string;
  result?: RookieAcquisitionResult;
}) {
  return (
    <article className="rookie-spotlight-card">
      <p className="eyebrow">{eyebrow}</p>
      <h4>{title}</h4>
      {result ? (
        <>
          <strong>{result.position} {result.firstName} {result.lastName}</strong>
          <p>{rookieAcquisitionLabel(result)} - {result.costLabel}</p>
          <div className="rookie-spotlight-metrics">
            <span>OVR <strong>{result.actualOverall}</strong></span>
            <span>POT <strong>{result.actualPotential}</strong></span>
            <span>Best <strong>{result.bestRookieScore}</strong></span>
            <span>Value <strong>{result.valueSpentScore}</strong></span>
          </div>
        </>
      ) : (
        <p>No rookie acquired.</p>
      )}
    </article>
  );
}

function RookieClassSummaryCard({
  save,
  row,
  results,
  selected,
  variant = "list"
}: {
  save: GameSave;
  row: ReturnType<typeof rookieClassScoreRows>[number];
  results: RookieClassResults;
  selected?: boolean;
  variant?: "list" | "detail";
}) {
  return (
    <div className={`rookie-class-summary-card rookie-class-summary-card-${variant} ${selected ? "selected" : ""}`}>
      <div className="rookie-class-summary-head">
        <TeamLogo save={save} teamId={row.teamId} size={36} />
        <div>
          <span>Class rank #{row.totalRank}</span>
          <strong>{teamById(save, row.teamId).fullName}</strong>
        </div>
      </div>
      <div className="rookie-class-summary-metrics">
        <span>Talent <strong>{row.totalScore}</strong></span>
        <span>Upside <strong>#{row.upsideRank}</strong></span>
        <span>Value <strong>#{row.valueRank}</strong></span>
        {variant === "detail" ? <span>Rookies <strong>{row.count}</strong></span> : null}
      </div>
    </div>
  );
}

function RookieResultsView({ save, results }: { save: GameSave; results: RookieClassResults }) {
  const [resultsTab, setResultsTab] = useState<RookieResultsTab>("my");
  const [teamId, setTeamId] = useState(save.selectedTeamId);
  const [lens, setLens] = useState<RookieResultLens>("best");
  const myRows = results.acquisitions.filter((result) => result.teamId === save.selectedTeamId);
  const drafted = myRows.filter((result) => result.source === "draft");
  const udfas = myRows.filter((result) => result.source === "udfa");
  const classes = rookieClassScoreRows(results, save.teams.map((team) => team.id));
  const selectedClassRows = results.acquisitions.filter((result) => result.teamId === teamId);
  const sortedLeague = rookieSort(results.acquisitions, lens);
  const topOvr = myRows.slice().sort((a, b) => b.actualOverall - a.actualOverall)[0];
  const topPot = myRows.slice().sort((a, b) => b.actualPotential - a.actualPotential)[0];
  const topBest = rookieSort(myRows, "best")[0];
  const topValue = rookieSort(myRows, "value")[0];
  const selectedClass = classes.find((row) => row.teamId === teamId);
  return (
    <section className="rookie-results-workspace">
      <header>
        <div className="compact-tabs rookie-results-tabs">
          {([
            ["my", "My Class"],
            ["teams", "Team Classes"],
            ["league", "League Board"]
          ] as Array<[RookieResultsTab, string]>).map(([id, label]) => (
            <button key={id} className={resultsTab === id ? "selected" : ""} onClick={() => setResultsTab(id)}>{label}</button>
          ))}
        </div>
      </header>
      {resultsTab === "my" ? (
        <>
          <div className="rookie-summary-strip">
            <span>Total <strong>{myRows.length}</strong><small>rookies added</small></span>
            <span>Top OVR <strong>{topOvr ? `${topOvr.actualOverall}` : "-"}</strong><small>{topOvr ? `${topOvr.position} ${topOvr.lastName}` : "No leader"}</small></span>
            <span>Top POT <strong>{topPot ? `${topPot.actualPotential}` : "-"}</strong><small>{topPot ? `${topPot.position} ${topPot.lastName}` : "No leader"}</small></span>
            <span>Best <strong>{topBest ? `${topBest.bestRookieScore}` : "-"}</strong><small>{topBest ? `${topBest.position} ${topBest.lastName}` : "No leader"}</small></span>
            <span>Value <strong>{topValue ? `${topValue.valueSpentScore}` : "-"}</strong><small>{topValue ? `${topValue.position} ${topValue.lastName}` : "No leader"}</small></span>
          </div>
          <div className="rookie-spotlight-grid">
            <RookieSpotlightCard title="Best Rookie" eyebrow="Class headline" result={topBest} />
            <RookieSpotlightCard title="Top Upside" eyebrow="Ceiling" result={topPot} />
            <RookieSpotlightCard title="Best Value" eyebrow="Efficiency" result={topValue} />
          </div>
          <div className="section-heading compact rookie-results-section-heading">
            <div>
              <p className="eyebrow">Draft class</p>
              <h4>Draft Picks</h4>
            </div>
            <span>{drafted.length} selections</span>
          </div>
          <RookieResultList save={save} rows={rookieSort(drafted, "slot")} />
          <div className="section-heading compact rookie-results-section-heading">
            <div>
              <p className="eyebrow">Undrafted market</p>
              <h4>Signed UDFAs</h4>
            </div>
            <span>{udfas.length} signings</span>
          </div>
          <RookieResultList save={save} rows={rookieSort(udfas, "best")} />
        </>
      ) : null}
      {resultsTab === "teams" ? (
        <div className="rookie-team-grid">
          <div className="rookie-class-table">
            {classes.map((row) => (
              <button key={row.teamId} className={teamId === row.teamId ? "selected" : ""} onClick={() => setTeamId(row.teamId)}>
                <RookieClassSummaryCard save={save} row={row} results={results} selected={teamId === row.teamId} variant="list" />
              </button>
            ))}
          </div>
          <div className="rookie-team-detail">
            {selectedClass ? (
              <RookieClassSummaryCard save={save} row={selectedClass} results={results} variant="detail" />
            ) : null}
            <div className="section-heading compact rookie-results-section-heading">
              <div>
                <p className="eyebrow">Selected class</p>
                <h4>{teamById(save, teamId).fullName} class</h4>
              </div>
              <span>{selectedClassRows.length} rookies</span>
            </div>
            <RookieResultList save={save} rows={rookieSort(selectedClassRows, "best")} />
          </div>
        </div>
      ) : null}
      {resultsTab === "league" ? (
        <>
          <div className="rookie-league-board">
            <div className="rookie-league-board-head">
              <label className="rookie-lens-picker">
                View
                <select value={lens} onChange={(event) => setLens(event.target.value as RookieResultLens)}>
                  <option value="best">Best Rookie</option>
                  <option value="overall">Highest OVR</option>
                  <option value="potential">Highest POT</option>
                  <option value="value">Value Spent</option>
                  <option value="slot">Draft Slot</option>
                  <option value="position">Position</option>
                </select>
              </label>
            </div>
            <div className="rookie-league-summary-grid">
              {classes.slice(0, 3).map((row) => (
                <RookieClassSummaryCard key={row.teamId} save={save} row={row} results={results} />
              ))}
            </div>
            <div className="section-heading compact rookie-results-section-heading">
              <div>
                <p className="eyebrow">League lens</p>
                <h4>{rookieLensLabel(lens)}</h4>
              </div>
              <span>{sortedLeague.length} rookies ranked</span>
            </div>
            <RookieResultList save={save} rows={sortedLeague} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-card">
      <table>{children}</table>
    </div>
  );
}
