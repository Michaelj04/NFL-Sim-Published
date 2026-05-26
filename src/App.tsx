import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { collegeImageFor } from "./data/collegeImages";
import { nflTeams } from "./data/nflTeams";
import { careerScenarioLabels, createNewSave, generateFreeAgentPool } from "./sim/generate";
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
import { markInboxRead, advanceDay, advancePostseasonRound, startNextSeason } from "./sim/season";
import { formatDateLong, gamesOnDate, leagueYearStartDate, nextDateWithGames, refreshCalendar } from "./sim/calendar";
import {
  advanceToDraftPrep,
  advanceToFreeAgency,
  applyTagOrTender,
  capSavingsIfMoved,
  deadMoneyIfMoved,
  playerCapHit,
  normalizeCapState,
  recalculateBudgets,
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
  rosterSize,
  sortFreeAgents,
  type FreeAgentSort
} from "./sim/freeAgents";
import {
  expectedFreeAgentAsk,
  expectedFreeAgentYears,
  freeAgentInterestScore,
  likelyFreeAgentCompetitors,
  normalizeFreeAgencyMarket,
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
import { normalizePlayerModel, normalizeProspectModel, updatePlayerTrainingSettings } from "./sim/playerModel";
import { medicalRiskTier, medicalStatusLabel, normalizePlayerMedical, playerMedical } from "./sim/medical";
import { submitWaiverClaim } from "./sim/waivers";
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
import type { CareerScenario, CollegeProgram, Conference, DraftPick, DraftTradeAsset, DraftTradeOffer, FreeAgentOffer, FreeAgentRolePromise, FreeAgentSecurityLevel, GameSave, Player, Position, Prospect, ProspectBoardLens, ProspectConcernKey, RookieAcquisitionResult, RookieClassResults, RosterMoveRecommendation, SaveMode, ScoutingAssignmentType, ScoutingRecapEntry, ScoutingRegion, StaffCandidate, StaffMember, StaffSlotId, TrainingBodyPlan, TrainingSkillPlan, UdfaOffer } from "./types";
import { POSITIONS } from "./types";

type Tab = "inbox" | "roster" | "training" | "free-agents" | "depth" | "medical" | "staff" | "scouting" | "comp-picks" | "calendar" | "schedule" | "standings" | "power" | "game" | "budget" | "draft" | "stats";
type SaveStatus = "Saved" | "Saving" | "Unsaved" | "Save failed";

const navGroups: Array<{ label: string; tabs: Array<{ id: Tab; label: string }> }> = [
  {
    label: "Team",
    tabs: [
      { id: "inbox", label: "Inbox" },
      { id: "roster", label: "Roster" },
      { id: "training", label: "Training" },
      { id: "free-agents", label: "Free Agents" },
      { id: "medical", label: "Medical" }
    ]
  },
  {
    label: "Football Ops",
    tabs: [
      { id: "depth", label: "Depth Chart" },
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

const scenarioCards: Array<{ id: CareerScenario; description: string }> = [
  { id: "worst", description: "Rebuild from the bottom." },
  { id: "neutral", description: "Balanced starting point." },
  { id: "contender", description: "Win-now pressure." },
  { id: "random", description: "Unknown roster quality for your selected team." }
];

function randomCareerSeed(): string {
  return `career-${Math.random().toString(36).slice(2, 7)}-${Date.now().toString(36)}`;
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
  const schoolById = new Map(normalizedSchools.map((school) => [school.id, school]));
  const statDefaults = {
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
          stats: { ...statDefaults, ...player.stats },
          playoffStats: { ...statDefaults, ...player.playoffStats }
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
      snapCounts: game.snapCounts ?? {}
    })),
    inbox: save.inbox.map((item) => ({ ...item, important: item.important ?? false, blocking: item.blocking ?? false })),
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
  return refreshCalendar(ensureStaffMarket({ ...ensureUdfaState(ensureDraftState(normalizeCapState(ranked))), scoutingPlan: ensureScoutingPlan(ranked) }));
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
  const [setupTeamId, setSetupTeamId] = useState("chi");
  const [setupMode, setSetupMode] = useState<SaveMode>("goals");
  const [setupScenario, setSetupScenario] = useState<CareerScenario>("neutral");
  const [setupSeed, setSetupSeed] = useState(() => randomCareerSeed());
  const [teamSearch, setTeamSearch] = useState("");
  const [teamConference, setTeamConference] = useState<Conference | "all">("all");
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
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
    if (!activeTeam) return {};
    return {
      "--team-primary": activeTeam.colors.primary,
      "--team-secondary": activeTeam.colors.secondary
    } as CSSProperties & Record<string, string>;
  }, [activeTeam]);

  const selectedSetupTeam = useMemo(
    () => nflTeams.find((team) => team.id === setupTeamId) ?? nflTeams[0],
    [setupTeamId]
  );

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

  async function refreshCareerSlots() {
    setCareerSlots(await listCareers());
  }

  async function loadCareerSlot(slotId: string) {
    const record = await loadCareer(slotId);
    if (!record) return;
    await setActiveCareer(slotId);
    skipNextAutosaveRef.current = true;
    setSave(normalizeSave(record.save));
    setActiveCareerId(record.id);
    setActiveCareerName(record.slot.name);
    setSaveStatus("Saved");
    setSaveFailure(undefined);
    setActiveTab("inbox");
    await refreshCareerSlots();
  }

  async function startCareer() {
    const seed = setupSeed.trim() || randomCareerSeed();
    setSetupSeed(seed);
    const newSave = normalizeSave(createNewSave({ selectedTeamId: setupTeamId, mode: setupMode, seed, scenario: setupScenario }));
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
    setActiveTab("inbox");
  }

  function newCareer() {
    setSave(undefined);
    setActiveCareerId(undefined);
    setActiveCareerName("Unsaved Career");
    setSaveStatus("Unsaved");
    setSaveFailure(undefined);
    setActiveTab("inbox");
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

  function markRead(itemId: string) {
    setSave((current) => (current ? markInboxRead(current, itemId) : current));
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

  function restructureRosterPlayer(playerId: string) {
    setSave((current) => (current ? restructurePlayerContract(current, playerId, current.selectedTeamId) : current));
  }

  function tagOrTenderRosterPlayer(playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) {
    setSave((current) => (current ? applyTagOrTender(current, playerId, current.selectedTeamId, kind) : current));
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
    setSave((current) => {
      if (!current) return current;
      return {
        ...current,
        players: current.players.map((player) => (
          player.id === playerId
            ? updatePlayerTrainingSettings(player, updates, current.seed)
            : player
        ))
      };
    });
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
    setActiveTab("inbox");
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
    setActiveTab("inbox");
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

  if (!save) {
    return (
      <div
        className="setup-screen"
        style={
          {
            "--team-primary": selectedSetupTeam.colors.primary,
            "--team-secondary": selectedSetupTeam.colors.secondary
          } as CSSProperties & Record<string, string>
        }
      >
        <section className="setup-panel">
          <div className="setup-hero">
            <div>
              <p className="eyebrow">2026 NFL GM sim</p>
              <h1>New Career Setup</h1>
              <p className="setup-copy">
                Choose the pressure level, mode, franchise, and visible seed. Rosters, staff, prospects, schedules, budgets, and draft
                state are generated fresh when the career begins.
              </p>
            </div>
            <div className="setup-summary">
              <TeamLogo save={{ teams: nflTeams } as GameSave} teamId={selectedSetupTeam.id} size={58} />
              <div>
                <strong>{selectedSetupTeam.fullName}</strong>
                <span>
                  {careerScenarioLabels[setupScenario]} | {setupMode === "goals" ? "Goals" : "Sandbox"}
                </span>
              </div>
            </div>
          </div>

          <section className="setup-step career-manager">
            <div className="setup-step-heading">
              <span>0</span>
              <div>
                <h2>Career Slots</h2>
                <p>Load, rename, export, or delete existing careers. Saves use browser database storage.</p>
              </div>
            </div>
            {careerSlots.length ? (
              <div className="career-slot-grid">
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
              <p className="empty-slots">No saved careers yet.</p>
            )}
            <div className="action-row">
              <button onClick={() => fileInputRef.current?.click()}>Import Save</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => void importSave(event.target.files?.[0])}
              />
            </div>
          </section>

          <div className="setup-layout">
            <section className="setup-step">
              <div className="setup-step-heading">
                <span>1</span>
                <div>
                  <h2>Scenario</h2>
                  <p>Shape only your selected franchise. The actual roster and staff stay hidden until kickoff.</p>
                </div>
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

            <section className="setup-step">
              <div className="setup-step-heading">
                <span>2</span>
                <div>
                  <h2>Mode</h2>
                  <p>Goals mode tracks owner pressure. Sandbox keeps the front office loose.</p>
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
            </section>

            <section className="setup-step team-browser-step">
              <div className="setup-step-heading">
                <span>3</span>
                <div>
                  <h2>Team</h2>
                  <p>Real NFL identities, generated career data.</p>
                </div>
              </div>
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
            </section>

            <section className="setup-step">
              <div className="setup-step-heading">
                <span>4</span>
                <div>
                  <h2>Seed</h2>
                  <p>Use the same seed and options to recreate the same career.</p>
                </div>
              </div>
              <div className="seed-row">
                <input value={setupSeed} onChange={(event) => setSetupSeed(event.target.value)} aria-label="Career seed" />
                <button onClick={() => setSetupSeed(randomCareerSeed())}>Randomize Seed</button>
                <button onClick={() => void copySeed()}>Copy Seed</button>
              </div>
            </section>
          </div>

          <button className="primary-action" onClick={() => void startCareer()}>
            Start Career
          </button>
        </section>
      </div>
    );
  }

  const unread = save.inbox.filter((item) => !item.read).length;
  const blockingInbox = save.inbox.filter((item) => item.blocking && !item.read).length;

  return (
    <div className="app-shell" style={appStyle}>
      <aside className="side-nav">
        <div className="club-block">
          <TeamLogo save={save} teamId={save.selectedTeamId} size={58} />
          <div>
            <p className="eyebrow">{formatDateLong(save.currentDate)}</p>
            <h1>{activeTeam?.name}</h1>
            <p>
              <RecordLine save={save} teamId={save.selectedTeamId} /> | {save.calendarPhase}
            </p>
          </div>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.tabs.map((tab) => (
                <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
                  {tab.label}
                  {tab.id === "inbox" && unread > 0 ? <span className="badge">{unread}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div>
            <p className="eyebrow">GM desk</p>
            <h2>{activeTeam?.fullName}</h2>
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
            <button onClick={handleAdvanceDay} disabled={blockingInbox > 0} title={blockingInbox > 0 ? "Read Important inbox items before advancing." : undefined}>
              {blockingInbox > 0 ? `Important Inbox (${blockingInbox})` : "Advance Day"}
            </button>
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

        {activeTab === "inbox" && <InboxView save={save} markRead={markRead} />}
        {activeTab === "roster" && (
          <RosterView
            save={save}
            releasePlayer={releaseRosterPlayer}
            restructurePlayer={restructureRosterPlayer}
            tagOrTenderPlayer={tagOrTenderRosterPlayer}
            placeOnIr={placeRosterPlayerOnIr}
            designateToReturn={designateRosterPlayerToReturn}
            activateFromIr={activateRosterPlayerFromIr}
            promotePractice={promotePracticePlayer}
            elevatePractice={elevatePracticePlayer}
            protectPractice={protectPracticePlayer}
            releasePractice={releasePracticePlayer}
          />
        )}
        {activeTab === "training" && <TrainingView save={save} updateTrainingPlan={updateTrainingPlan} />}
        {activeTab === "free-agents" && (
          <FreeAgentsView
            save={save}
            submitOffer={submitFreeAgentPlayerOffer}
            resolveWave={resolveFreeAgentOffers}
            signPractice={signFreeAgentPracticeSquadPlayer}
            claimWaiver={claimWaiverPlayer}
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

type InboxFilter = "all" | "important" | "medical" | "staff" | "scouting" | "game" | "draft" | "other";

function InboxView({ save, markRead }: { save: GameSave; markRead: (itemId: string) => void }) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const filters: Array<{ id: InboxFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "important", label: "Important" },
    { id: "medical", label: "Medical" },
    { id: "staff", label: "Staff" },
    { id: "scouting", label: "Scouting" },
    { id: "game", label: "Game" },
    { id: "draft", label: "Draft" },
    { id: "other", label: "Other" }
  ];
  const shown = save.inbox.filter((item) => {
    if (filter === "all") return true;
    if (filter === "important") return item.important || item.blocking || item.priority === "high";
    if (filter === "medical") return item.category === "injury" || item.category === "discipline";
    if (filter === "other") return !["staff", "scouting", "game", "draft", "injury", "discipline"].includes(item.category);
    return item.category === filter;
  });
  return (
    <section className="view-stack">
      <MetricStrip save={save} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">Staff reports</p>
          <h3>GM Inbox</h3>
        </div>
      </div>
      <div className="inbox-filter-tabs">
        {filters.map((candidate) => {
          const count = save.inbox.filter((item) => {
            if (candidate.id === "all") return true;
            if (candidate.id === "important") return item.important || item.blocking || item.priority === "high";
            if (candidate.id === "medical") return item.category === "injury" || item.category === "discipline";
            if (candidate.id === "other") return !["staff", "scouting", "game", "draft", "injury", "discipline"].includes(item.category);
            return item.category === candidate.id;
          }).length;
          return (
            <button key={candidate.id} className={filter === candidate.id ? "selected" : ""} onClick={() => setFilter(candidate.id)}>
              {candidate.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="inbox-list">
        {shown.slice(0, 36).map((item) => (
          <article key={item.id} className={`inbox-item ${item.read ? "read" : ""} priority-${item.priority}`}>
            <div>
              <span>{item.blocking ? "important" : item.category}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
            <button onClick={() => markRead(item.id)} disabled={item.read}>
              {item.read ? "Read" : "Mark Read"}
            </button>
          </article>
        ))}
      </div>
    </section>
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
  const reports = (save.developmentReports ?? []).filter((report) => report.teamId === save.selectedTeamId).slice(0, 10);
  if (!reports.length) return null;
  return (
    <article className="development-panel">
      <h3>Offseason Development</h3>
      {reports.map((report) => (
        <div key={report.id} className={`development-row dev-${report.category}`}>
          <span>{report.position}</span>
          <strong>{report.playerName}</strong>
          <em>
            {`${report.previousOverall}->${report.newOverall} OVR`}
            {report.deltaOverall ? ` (${report.deltaOverall > 0 ? "+" : ""}${report.deltaOverall})` : ""}
          </em>
          <small>
            {`POT ${report.previousPotential}->${report.newPotential}`}
            {report.deltaPotential ? ` (${report.deltaPotential > 0 ? "+" : ""}${report.deltaPotential})` : ""} | {report.summary}
          </small>
        </div>
      ))}
    </article>
  );
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

type RosterSort = "overall" | "potential" | "age" | "position";
type RosterRangeFilter = "all" | "90+" | "80-89" | "70-79" | "60-69" | "under-60";
type RosterAgeFilter = "all" | "24-under" | "25-28" | "29-32" | "33-plus";
type RosterStatusFilter = "all" | "healthy" | "limited" | "injured" | "ir" | "suspended" | "practice";
type RosterExperienceFilter = "all" | "rookie" | "1-3" | "4-6" | "7-plus";
type FreeAgentSalaryFilter = "all" | "under-2" | "2-5" | "5-10" | "10-plus";

const bodyPlanOptions: Array<{ value: TrainingBodyPlan; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "maintain", label: "Maintain" },
  { value: "lean-bulk", label: "Lean Bulk" },
  { value: "power-bulk", label: "Power Bulk" },
  { value: "cut", label: "Cut" },
  { value: "conditioning", label: "Conditioning" },
  { value: "mobility", label: "Mobility" }
];

const skillPlanOptions: Array<{ value: TrainingSkillPlan; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "maintain", label: "Maintain" },
  { value: "position-technique", label: "Position Tech" },
  { value: "athlete", label: "Athlete" },
  { value: "passing", label: "Passing" },
  { value: "ball-skills", label: "Ball Skills" },
  { value: "trench", label: "Trench" },
  { value: "coverage", label: "Coverage" },
  { value: "pass-rush", label: "Pass Rush" },
  { value: "specialist", label: "Specialist" }
];

type TrainingTab = "configure" | "results";
type TrainingResultsLens = "summary" | "risers" | "conversions" | "body-risk";
type RosterModalTab = "overview" | "contract" | "ratings" | "medical";

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

function rosterSortPlayers(players: Player[], sort: RosterSort): Player[] {
  return players.slice().sort((a, b) => {
    if (sort === "potential") return b.potential - a.potential || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "age") return a.age - b.age || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    if (sort === "position") return a.position.localeCompare(b.position) || b.overall - a.overall || a.lastName.localeCompare(b.lastName);
    return b.overall - a.overall || b.potential - a.potential || a.lastName.localeCompare(b.lastName);
  });
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
      label: index === 0 ? "Current year" : `Year ${index + 1}`
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

function trainingBodyForecast(player: Player): { title: string; summary: string; tone: "up" | "steady" | "risk" } {
  const plan = player.training.bodyPlan;
  if (plan === "lean-bulk") return { title: "Body outlook", summary: "Add lean mass with a modest readiness lift if recovery stays on track.", tone: "up" };
  if (plan === "power-bulk") return { title: "Body outlook", summary: "Push strength and size fastest, with a higher chance of conditioning drag.", tone: "risk" };
  if (plan === "cut") return { title: "Body outlook", summary: "Trim body fat and improve movement if the player responds well to volume.", tone: "up" };
  if (plan === "conditioning") return { title: "Body outlook", summary: "Improve conditioning and recovery more than size or composition.", tone: "up" };
  if (plan === "mobility") return { title: "Body outlook", summary: "Target flexibility and readiness gains over major weight change.", tone: "up" };
  if (player.development.workEthic < 50) return { title: "Body outlook", summary: "Low work ethic may blunt body gains even on a safe maintenance plan.", tone: "risk" };
  return { title: "Body outlook", summary: "Steady maintenance focus with lower variance and fewer physical swings.", tone: "steady" };
}

function trainingFootballForecast(player: Player): { title: string; summary: string; tone: "up" | "steady" | "risk" } {
  const plan = player.training.skillPlan;
  const target = player.training.targetPosition ?? player.position;
  if (plan === "position-technique") return { title: "Football outlook", summary: `Sharpen ${player.position} fundamentals and reinforce the current role.`, tone: "up" };
  if (plan === "passing") return { title: "Football outlook", summary: "Invest reps into delivery, accuracy, and timing more than broad athletic work.", tone: "up" };
  if (plan === "ball-skills") return { title: "Football outlook", summary: "Push hands, route craft, and finishing more than trench or processing traits.", tone: "up" };
  if (plan === "trench") return { title: "Football outlook", summary: "Lean into leverage, protection, and blocking growth rather than open-field polish.", tone: "up" };
  if (plan === "coverage") return { title: "Football outlook", summary: "Shift practice time into range, reaction, and coverage skill growth.", tone: "up" };
  if (plan === "pass-rush") return { title: "Football outlook", summary: "Emphasize burst, counters, and rush sequencing for front-seven upside.", tone: "up" };
  if (plan === "specialist") return { title: "Football outlook", summary: "Refine specialist operation and consistency rather than broad football crossover.", tone: "steady" };
  if (target !== player.position) return { title: "Football outlook", summary: `General work stays flexible, but progress will bend toward the ${target} target over time.`, tone: "steady" };
  return { title: "Football outlook", summary: "Balanced maintenance work should keep the skill base stable without a sharp specialty push.", tone: "steady" };
}

function trainingConversionForecast(player: Player): { title: string; summary: string; tone: "up" | "steady" | "risk" } {
  const target = player.training.targetPosition ?? player.position;
  const progress = player.training.conversionProgress[target] ?? 0;
  if (target === player.position) return { title: "Conversion outlook", summary: "No active position switch. Training reinforces the current primary role.", tone: "steady" };
  if (progress >= 80) return { title: "Conversion outlook", summary: `${target} is close to becoming a real option if the current plan stays in place.`, tone: "up" };
  if (progress >= 55) return { title: "Conversion outlook", summary: `${target} is viable, but the player still needs more reps before the role feels natural.`, tone: "steady" };
  const bodyMismatch = target !== player.position && ["LT", "LG", "C", "RG", "RT", "DL"].includes(target) && player.body.weightLbs < 250;
  if (bodyMismatch) return { title: "Conversion outlook", summary: `${target} is a long-term project because the current frame is light for the target role.`, tone: "risk" };
  return { title: "Conversion outlook", summary: `${target} is in an early conversion stage and likely needs more time before a meaningful fit shift.`, tone: "risk" };
}

function trainingRiskSummary(player: Player): string {
  if (player.training.bodyPlan === "power-bulk") return "Higher conditioning risk";
  if (player.development.workEthic < 50) return "Low buy-in risk";
  if (player.status === "injured" || player.status === "limited") return "Health management risk";
  if ((player.training.targetPosition ?? player.position) !== player.position && (player.training.conversionProgress[player.training.targetPosition ?? player.position] ?? 0) < 45) return "Slow conversion risk";
  return "Risk manageable";
}

function clampPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

function RosterFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="roster-filter-chip" onClick={onClear}>
      {label}
      <span aria-hidden="true">x</span>
    </button>
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

function RosterContractTab({
  player,
  save,
  restructurePlayer,
  tagOrTenderPlayer
}: {
  player: Player;
  save: GameSave;
  restructurePlayer?: (playerId: string) => void;
  tagOrTenderPlayer?: (playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) => void;
}) {
  const deadMoney = deadMoneyIfMoved(player, save.seasonYear);
  const savings = capSavingsIfMoved(player, save.seasonYear);
  const rights = player.contract?.rights ?? "none";
  const canTender = save.phase === "contract-decisions" && (rights === "rfa" || rights === "erfa");
  const canTag = save.phase === "contract-decisions" && rights === "ufa";
  return (
    <div className="roster-detail-panel roster-detail-panel-single">
      <section className="roster-dossier-card roster-overview-card">
        <div className="training-section-heading">
          <p className="eyebrow">Contract</p>
          <strong>Cap Table And Control</strong>
        </div>
        <div className="roster-detail-meta">
          <span>{contractSummary(save, player)}</span>
          <span>{player.contract?.years ?? player.contractYears} year{(player.contract?.years ?? player.contractYears) === 1 ? "" : "s"} total</span>
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
          <button type="button" disabled={!restructurePlayer || (player.contract?.seasons.filter((season) => season.seasonYear >= save.seasonYear).length ?? 0) < 2} onClick={() => restructurePlayer?.(player.id)}>
            Restructure
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || !canTag} onClick={() => tagOrTenderPlayer?.(player.id, "franchise")}>
            Franchise Tag
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || !canTag} onClick={() => tagOrTenderPlayer?.(player.id, "transition")}>
            Transition Tag
          </button>
          <button type="button" disabled={!tagOrTenderPlayer || !canTender} onClick={() => tagOrTenderPlayer?.(player.id, rights === "erfa" ? "erfa" : "second-round")}>
            {rights === "erfa" ? "ERFA Tender" : "RFA Tender"}
          </button>
        </div>
        <p className="roster-contract-note">Future clauses, no-trade language, incentives, and void-year engineering are intentionally out of v1.</p>
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
  restructurePlayer,
  tagOrTenderPlayer,
  placeOnIr,
  designateToReturn,
  activateFromIr,
  promotePractice,
  elevatePractice,
  protectPractice,
  releasePractice
}: {
  save: GameSave;
  releasePlayer: (playerId: string) => void;
  restructurePlayer: (playerId: string) => void;
  tagOrTenderPlayer: (playerId: string, kind: Parameters<typeof applyTagOrTender>[3]) => void;
  placeOnIr: (playerId: string) => void;
  designateToReturn: (playerId: string) => void;
  activateFromIr: (playerId: string) => void;
  promotePractice: (playerId: string) => void;
  elevatePractice: (playerId: string) => void;
  protectPractice: (playerId: string) => void;
  releasePractice: (playerId: string) => void;
}) {
  const [viewTeamId, setViewTeamId] = useState(save.selectedTeamId);
  const [sortBy, setSortBy] = useState<RosterSort>("overall");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [overallFilter, setOverallFilter] = useState<RosterRangeFilter>("all");
  const [potentialFilter, setPotentialFilter] = useState<RosterRangeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<RosterAgeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  const [experienceFilter, setExperienceFilter] = useState<RosterExperienceFilter>("all");
  const [activePlayerId, setActivePlayerId] = useState<string>();
  const [tradePlaceholderPlayerId, setTradePlaceholderPlayerId] = useState<string>();
  const [activeModalTab, setActiveModalTab] = useState<RosterModalTab>("overview");
  const team = teamById(save, viewTeamId);
  const players = useMemo(() => playersForTeam(save, team.id), [save, team.id]);
  const squadPlayers = useMemo(() => practiceSquadPlayers(save, team.id).sort((a, b) => b.potential - a.potential || b.overall - a.overall), [save, team.id]);
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
    return rosterSortPlayers(filtered, sortBy);
  }, [ageFilter, experienceFilter, overallFilter, players, positionFilter, potentialFilter, sortBy, statusFilter]);
  const activeFilters = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    overallFilter !== "all" ? { label: `OVR ${overallFilter}`, clear: () => setOverallFilter("all") } : undefined,
    potentialFilter !== "all" ? { label: `POT ${potentialFilter}`, clear: () => setPotentialFilter("all") } : undefined,
    ageFilter !== "all" ? { label: `Age ${ageFilter}`, clear: () => setAgeFilter("all") } : undefined,
    statusFilter !== "all" ? { label: statusFilter === "healthy" ? "Healthy only" : statusFilter, clear: () => setStatusFilter("all") } : undefined,
    experienceFilter !== "all" ? { label: experienceFilter === "rookie" ? "Rookies" : `${experienceFilter} yrs`, clear: () => setExperienceFilter("all") } : undefined
  ].filter((item): item is { label: string; clear: () => void } => Boolean(item));
  const activePlayer = activePlayerId ? players.find((player) => player.id === activePlayerId) : undefined;
  const tradePlaceholderPlayer = tradePlaceholderPlayerId ? players.find((player) => player.id === tradePlaceholderPlayerId) : undefined;
  const canManageRoster = viewTeamId === save.selectedTeamId;

  useEffect(() => {
    if (activePlayerId && !players.some((player) => player.id === activePlayerId)) {
      setActivePlayerId(undefined);
    }
    if (tradePlaceholderPlayerId && !players.some((player) => player.id === tradePlaceholderPlayerId)) {
      setTradePlaceholderPlayerId(undefined);
    }
  }, [activePlayerId, players, tradePlaceholderPlayerId]);

  useEffect(() => {
    if (activePlayerId) {
      setActiveModalTab("overview");
    }
  }, [activePlayerId]);

  return (
    <section className="view-stack roster-workspace">
      <div className="view-command-row">
        <TeamScopePicker save={save} teamId={viewTeamId} setTeamId={setViewTeamId} label="Roster team" />
        {viewTeamId !== save.selectedTeamId ? <span className="read-only-chip">Read-only roster view</span> : null}
      </div>
      <div className="roster-command-bar">
        <div className="roster-toolbar-group">
          <label className="roster-select-field">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as RosterSort)}>
              <option value="overall">Overall</option>
              <option value="potential">Potential</option>
              <option value="age">Age</option>
              <option value="position">Position</option>
            </select>
          </label>
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
        </div>
        <div className="roster-toolbar-meta">
          <span className="read-only-chip">Active {rosterSize(save, team.id)}/{MAX_ROSTER_SIZE}</span>
          <span className="read-only-chip">PS {practiceSquadSize(save, team.id)}/{PRACTICE_SQUAD_SIZE}</span>
          <span className="read-only-chip">{filteredPlayers.length} players shown</span>
          {activeFilters.length ? <button type="button" onClick={() => {
            setPositionFilter("all");
            setOverallFilter("all");
            setPotentialFilter("all");
            setAgeFilter("all");
            setStatusFilter("all");
            setExperienceFilter("all");
          }}>Clear Filters</button> : null}
        </div>
      </div>
      {activeFilters.length ? (
        <div className="roster-active-filters">
          {activeFilters.map((filter) => (
            <RosterFilterChip key={filter.label} label={filter.label} onClear={filter.clear} />
          ))}
        </div>
      ) : null}
      <DataTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Pos</th>
            <th>Age</th>
            <th>OVR</th>
            <th>POT</th>
            <th>Contract</th>
            <th>YWT</th>
            <th>EXP</th>
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
                onClick={() => setActivePlayerId(player.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActivePlayerId(player.id);
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
                      onClick={() => setTradePlaceholderPlayerId(player.id)}
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
              <th>Name</th>
              <th>Pos</th>
              <th>Age</th>
              <th>OVR</th>
              <th>POT</th>
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
                <tr key={player.id} className="roster-table-row roster-status-practice" onClick={() => setActivePlayerId(player.id)} tabIndex={0}>
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
            className="roster-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activePlayer.firstName} ${activePlayer.lastName} player details`}
            onMouseDown={(event) => event.stopPropagation()}
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
                <button type="button" onClick={() => setActivePlayerId(undefined)}>Close</button>
              </div>
            </div>
            <div className="roster-modal-tabs" role="tablist" aria-label="Player detail tabs">
              {([
                ["overview", "Overview"],
                ["contract", "Contract"],
                ["ratings", "Ratings"],
                ["medical", "Medical"]
              ] as Array<[RosterModalTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeModalTab === tab}
                  className={activeModalTab === tab ? "selected" : ""}
                  onClick={() => setActiveModalTab(tab)}
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
                restructurePlayer={canManageRoster ? restructurePlayer : undefined}
                tagOrTenderPlayer={canManageRoster ? tagOrTenderPlayer : undefined}
              />
            ) : null}
            {activeModalTab === "ratings" ? <RosterRatingsTab player={activePlayer} /> : null}
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
      {tradePlaceholderPlayer ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setTradePlaceholderPlayerId(undefined)}>
          <article className="trade-modal roster-trade-placeholder" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Trade Desk Coming Soon</h3>
            <p>
              {tradePlaceholderPlayer.firstName} {tradePlaceholderPlayer.lastName} can be marked for future roster trade workflows,
              but live roster trades are not wired into this screen yet.
            </p>
            <p>
              This slot is reserved so the roster table already has a front-office action lane when full trade functionality is added.
            </p>
            <div className="trade-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setActivePlayerId(tradePlaceholderPlayer.id);
                  setTradePlaceholderPlayerId(undefined);
                }}
              >
                Open Player File
              </button>
              <button type="button" onClick={() => setTradePlaceholderPlayerId(undefined)}>Close</button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function TrainingView({
  save,
  updateTrainingPlan
}: {
  save: GameSave;
  updateTrainingPlan: (playerId: string, updates: Parameters<typeof updatePlayerTrainingSettings>[1]) => void;
}) {
  const [trainingTab, setTrainingTab] = useState<TrainingTab>("configure");
  const [resultsLens, setResultsLens] = useState<TrainingResultsLens>("summary");
  const [sortBy, setSortBy] = useState<RosterSort>("overall");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [overallFilter, setOverallFilter] = useState<RosterRangeFilter>("all");
  const [potentialFilter, setPotentialFilter] = useState<RosterRangeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<RosterAgeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  const [bodyPlanFilter, setBodyPlanFilter] = useState<TrainingBodyPlan | "all">("all");
  const [skillPlanFilter, setSkillPlanFilter] = useState<TrainingSkillPlan | "all">("all");
  const [targetPositionFilter, setTargetPositionFilter] = useState<Position | "all">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const team = selectedTeam(save);
  const allPlayers = useMemo(() => playersForTeam(save, save.selectedTeamId), [save]);
  const filteredPlayers = useMemo(() => rosterSortPlayers(
    allPlayers.filter((player) => {
      if (positionFilter !== "all" && player.position !== positionFilter) return false;
      if (!rosterRangeMatch(player.overall, overallFilter)) return false;
      if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
      if (!rosterAgeMatch(player.age, ageFilter)) return false;
      if (!rosterStatusMatch(player, statusFilter)) return false;
      if (bodyPlanFilter !== "all" && player.training.bodyPlan !== bodyPlanFilter) return false;
      if (skillPlanFilter !== "all" && player.training.skillPlan !== skillPlanFilter) return false;
      if (targetPositionFilter !== "all" && (player.training.targetPosition ?? player.position) !== targetPositionFilter) return false;
      return true;
    }),
    sortBy
  ), [ageFilter, allPlayers, bodyPlanFilter, overallFilter, positionFilter, potentialFilter, skillPlanFilter, sortBy, statusFilter, targetPositionFilter]);

  useEffect(() => {
    if (!filteredPlayers.length) {
      setSelectedPlayerId(undefined);
      return;
    }
    if (!selectedPlayerId || !filteredPlayers.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(filteredPlayers[0].id);
    }
  }, [filteredPlayers, selectedPlayerId]);

  const selectedPlayer = filteredPlayers.find((player) => player.id === selectedPlayerId) ?? filteredPlayers[0];
  const activeFilters = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    overallFilter !== "all" ? { label: `OVR ${overallFilter}`, clear: () => setOverallFilter("all") } : undefined,
    potentialFilter !== "all" ? { label: `POT ${potentialFilter}`, clear: () => setPotentialFilter("all") } : undefined,
    ageFilter !== "all" ? { label: `Age ${ageFilter}`, clear: () => setAgeFilter("all") } : undefined,
    statusFilter !== "all" ? { label: statusFilter === "healthy" ? "Healthy only" : statusFilter, clear: () => setStatusFilter("all") } : undefined,
    bodyPlanFilter !== "all" ? { label: `Body ${bodyPlanOptions.find((option) => option.value === bodyPlanFilter)?.label ?? bodyPlanFilter}`, clear: () => setBodyPlanFilter("all") } : undefined,
    skillPlanFilter !== "all" ? { label: `Skill ${skillPlanOptions.find((option) => option.value === skillPlanFilter)?.label ?? skillPlanFilter}`, clear: () => setSkillPlanFilter("all") } : undefined,
    targetPositionFilter !== "all" ? { label: `Target ${targetPositionFilter}`, clear: () => setTargetPositionFilter("all") } : undefined
  ].filter((item): item is { label: string; clear: () => void } => Boolean(item));

  const playerResults = useMemo(() => allPlayers.map((player) => {
    const report = player.training.lastReport;
    const target = player.training.targetPosition ?? player.position;
    const targetProgress = player.training.conversionProgress[target] ?? (target === player.position ? 100 : 0);
    return {
      player,
      report,
      readinessDelta: report?.readinessDelta ?? 0,
      changedPrimaryPosition: Boolean(report?.changedPrimaryPosition),
      target,
      targetProgress,
      bodyShiftScore: Math.abs(player.body.musclePct - 50) + Math.abs(player.body.bodyFatPct - 12) + Math.abs(player.body.conditioning - 70) * 0.35,
      risk: trainingRiskSummary(player)
    };
  }), [allPlayers]);
  const risers = playerResults
    .slice()
    .sort((a, b) => (b.player.overall - a.player.overall) - (a.player.overall - a.player.potential) || b.readinessDelta - a.readinessDelta)
    .slice(0, 10);
  const conversions = playerResults
    .filter((entry) => entry.target !== entry.player.position || entry.changedPrimaryPosition)
    .sort((a, b) => b.targetProgress - a.targetProgress || Number(b.changedPrimaryPosition) - Number(a.changedPrimaryPosition))
    .slice(0, 10);
  const bodyRisk = playerResults
    .slice()
    .sort((a, b) => b.bodyShiftScore - a.bodyShiftScore || b.readinessDelta - a.readinessDelta)
    .slice(0, 10);
  const latestReports = playerResults.filter((entry) => entry.report);
  const summary = {
    avgConditioning: Math.round(allPlayers.reduce((sum, player) => sum + player.body.conditioning, 0) / Math.max(1, allPlayers.length)),
    avgFlexibility: Math.round(allPlayers.reduce((sum, player) => sum + player.body.flexibility, 0) / Math.max(1, allPlayers.length)),
    conversionProjects: playerResults.filter((entry) => entry.target !== entry.player.position).length,
    primaryRoleChanges: playerResults.filter((entry) => entry.changedPrimaryPosition).length,
    elevatedRisk: playerResults.filter((entry) => entry.risk !== "Risk manageable").length,
    latestWeek: latestReports[0]?.report?.week
  };

  function clearTrainingFilters() {
    setPositionFilter("all");
    setOverallFilter("all");
    setPotentialFilter("all");
    setAgeFilter("all");
    setStatusFilter("all");
    setBodyPlanFilter("all");
    setSkillPlanFilter("all");
    setTargetPositionFilter("all");
  }

  return (
    <section className="view-stack training-workspace">
      <div className="training-page-tabs">
        <button type="button" className={trainingTab === "configure" ? "selected" : ""} onClick={() => setTrainingTab("configure")}>Configure</button>
        <button type="button" className={trainingTab === "results" ? "selected" : ""} onClick={() => setTrainingTab("results")}>Training Results</button>
      </div>

      {trainingTab === "configure" ? (
        <>
          <div className="roster-command-bar training-command-bar">
            <div className="roster-toolbar-group training-toolbar-grid">
              <label className="roster-select-field">
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as RosterSort)}>
                  <option value="overall">Overall</option>
                  <option value="potential">Potential</option>
                  <option value="age">Age</option>
                  <option value="position">Position</option>
                </select>
              </label>
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
                <span>Body Plan</span>
                <select value={bodyPlanFilter} onChange={(event) => setBodyPlanFilter(event.target.value as TrainingBodyPlan | "all")}>
                  <option value="all">All</option>
                  {bodyPlanOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="roster-select-field">
                <span>Skill Plan</span>
                <select value={skillPlanFilter} onChange={(event) => setSkillPlanFilter(event.target.value as TrainingSkillPlan | "all")}>
                  <option value="all">All</option>
                  {skillPlanOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="roster-select-field">
                <span>Target</span>
                <select value={targetPositionFilter} onChange={(event) => setTargetPositionFilter(event.target.value as Position | "all")}>
                  <option value="all">All</option>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="roster-toolbar-meta">
              <span className="read-only-chip">{filteredPlayers.length} players</span>
              {activeFilters.length ? <button type="button" onClick={clearTrainingFilters}>Clear Filters</button> : null}
            </div>
          </div>

          {activeFilters.length ? (
            <div className="roster-active-filters">
              {activeFilters.map((filter) => (
                <RosterFilterChip key={filter.label} label={filter.label} onClear={filter.clear} />
              ))}
            </div>
          ) : null}

          <div className="training-config-layout">
            <aside className="training-player-list">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={`training-player-row ${selectedPlayer?.id === player.id ? "selected" : ""}`}
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <div className="training-player-row-main">
                    <strong>{player.firstName} {player.lastName}</strong>
                    <span>{player.position}</span>
                  </div>
                  <div className="training-player-row-metrics">
                    <span>OVR <strong>{player.overall}</strong></span>
                    <span>POT <strong>{player.potential}</strong></span>
                  </div>
                </button>
              ))}
              {!filteredPlayers.length ? (
                <article className="roster-empty-state">
                  <strong>No players match the current filters.</strong>
                  <p>Try clearing a filter or widening one of the ranges.</p>
                </article>
              ) : null}
            </aside>

            <div className="training-detail-pane">
              {selectedPlayer ? (() => {
                const school = save.schools.find((candidate) => candidate.id === selectedPlayer.collegeId);
                const report = selectedPlayer.training.lastReport;
                const bodyForecast = trainingBodyForecast(selectedPlayer);
                const footballForecast = trainingFootballForecast(selectedPlayer);
                const conversionForecast = trainingConversionForecast(selectedPlayer);
                const target = selectedPlayer.training.targetPosition ?? selectedPlayer.position;
                const targetProgress = selectedPlayer.training.conversionProgress[target] ?? (target === selectedPlayer.position ? 100 : 0);
                const schoolName = school?.name ?? "Unknown College";
                return (
                  <article className={`training-detail-card roster-status-${selectedPlayer.status}`}>
                    <header className="training-detail-header">
                      <div className="training-hero-identity">
                        <div className="roster-player-heading">
                          <strong>{selectedPlayer.firstName} {selectedPlayer.lastName}</strong>
                          {rosterStatusSymbol(selectedPlayer) ? <span className={`roster-status-dot roster-status-dot-${selectedPlayer.status}`}>{rosterStatusSymbol(selectedPlayer)?.symbol}</span> : null}
                        </div>
                        <div className="roster-player-subline">
                          <span className="roster-position-tag">{selectedPlayer.position}</span>
                          <span className="roster-college-badge" title={school?.name ?? "Unknown College"}>
                            <CollegeLogo school={school} size={28} />
                          </span>
                          <span className="roster-experience-badge">{rosterExperienceLabel(selectedPlayer)}</span>
                        </div>
                        <p className="training-identity-note">{schoolName} | {selectedPlayer.development.style}</p>
                      </div>
                      <div className="training-detail-header-metrics">
                        <span><small>OVR</small><strong>{selectedPlayer.overall}</strong></span>
                        <span><small>POT</small><strong>{selectedPlayer.potential}</strong></span>
                      </div>
                    </header>

                    <section className="training-section">
                      <div className="training-section-heading">
                        <p className="eyebrow">Training Setup</p>
                        <strong>Plans</strong>
                      </div>
                      <div className="training-detail-controls">
                        <label className="roster-select-field">
                          <span>Body Plan</span>
                          <select value={selectedPlayer.training.bodyPlan} onChange={(event) => updateTrainingPlan(selectedPlayer.id, { bodyPlan: event.target.value as TrainingBodyPlan })}>
                            {bodyPlanOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="roster-select-field">
                          <span>Skill Plan</span>
                          <select value={selectedPlayer.training.skillPlan} onChange={(event) => updateTrainingPlan(selectedPlayer.id, { skillPlan: event.target.value as TrainingSkillPlan })}>
                            {skillPlanOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="roster-select-field">
                          <span>Target Position</span>
                          <select value={target} onChange={(event) => updateTrainingPlan(selectedPlayer.id, { targetPosition: event.target.value as Position })}>
                            {POSITIONS.map((position) => (
                              <option key={position} value={position}>{position}</option>
                            ))}
                          </select>
                        </label>
                        <label className="training-toggle">
                          <input
                            type="checkbox"
                            checked={selectedPlayer.training.autoPosition}
                            onChange={(event) => updateTrainingPlan(selectedPlayer.id, { autoPosition: event.target.checked })}
                          />
                          <span>Auto-update primary position</span>
                        </label>
                      </div>
                    </section>

                    <section className="training-section">
                      <div className="training-section-heading">
                        <p className="eyebrow">Expected Outcome</p>
                        <strong>Forecast</strong>
                      </div>
                      <div className="training-forecast-grid">
                        {[bodyForecast, footballForecast, conversionForecast].map((item) => (
                          <article key={item.title} className={`training-forecast-card tone-${item.tone}`}>
                            <span>{item.title}</span>
                            <p>{item.summary}</p>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="training-section">
                      <div className="training-section-heading">
                        <p className="eyebrow">Body Profile</p>
                        <strong>Frame</strong>
                      </div>
                      <div className="training-vitals training-vitals-compact">
                        <span><small>Height</small><strong>{formatHeight(selectedPlayer.body.heightInches)}</strong></span>
                        <span><small>Weight</small><strong>{selectedPlayer.body.weightLbs}</strong></span>
                      </div>
                    </section>

                    <section className="training-section training-role-grid">
                      <div>
                        <div className="training-section-heading">
                          <p className="eyebrow">Role Fit</p>
                          <strong>Conversion</strong>
                        </div>
                        <div className="training-conversion-stack">
                          <span>Primary role <strong>{selectedPlayer.position}</strong></span>
                          <span>Target role <strong>{target}</strong></span>
                          <span>Target progress <strong>{clampPercent(targetProgress)}</strong></span>
                          <span>Work ethic <strong>{selectedPlayer.development.workEthic}</strong></span>
                          <span>Learning <strong>{selectedPlayer.development.learning}</strong></span>
                          <span>{trainingRiskSummary(selectedPlayer)}</span>
                          {report?.changedPrimaryPosition ? <span>Latest shift: <strong>{report.previousPrimaryPosition} to {report.nextPrimaryPosition}</strong></span> : null}
                        </div>
                      </div>
                      {report ? (
                        <div className="training-latest-report">
                          <div className="training-section-heading">
                            <p className="eyebrow">Latest Result</p>
                            <strong>Week {report.week}</strong>
                          </div>
                          <p>{report.summary}</p>
                          <small>{report.bodySummary} {report.footballSummary} {report.risk}</small>
                        </div>
                      ) : (
                        <div className="training-latest-report">
                          <div className="training-section-heading">
                            <p className="eyebrow">Latest Result</p>
                            <strong>No weekly report yet</strong>
                          </div>
                          <p>Advance a week to generate the first training result for this player.</p>
                        </div>
                      )}
                    </section>

                    <section className="training-section training-lab-grid">
                      <div className="training-lab-card">
                        <div className="training-section-heading">
                          <p className="eyebrow">Body Lab</p>
                          <strong>Training Indicators</strong>
                        </div>
                        <div className="training-vitals training-vitals-detail">
                          <span><small>Muscle</small><strong>{selectedPlayer.body.musclePct}%</strong></span>
                          <span><small>Body Fat</small><strong>{selectedPlayer.body.bodyFatPct}%</strong></span>
                          <span><small>Conditioning</small><strong>{selectedPlayer.body.conditioning}</strong></span>
                          <span><small>Flexibility</small><strong>{selectedPlayer.body.flexibility}</strong></span>
                          <span><small>Recovery</small><strong>{selectedPlayer.body.recovery}</strong></span>
                          <span><small>Readiness</small><strong>{selectedPlayer.body.explosiveReadiness}</strong></span>
                        </div>
                      </div>
                      <div className="training-lab-card">
                        <div className="training-section-heading">
                          <p className="eyebrow">Deeper Profile</p>
                          <strong>Role Context</strong>
                        </div>
                        <div className="roster-detail-meta training-detail-meta">
                          <span>Work Ethic {selectedPlayer.development.workEthic}</span>
                          <span>Learning {selectedPlayer.development.learning}</span>
                          <span>Peak {selectedPlayer.development.peakAge}</span>
                          <span>Decline {selectedPlayer.development.declineAge}</span>
                          <span>{trainingRiskSummary(selectedPlayer)}</span>
                        </div>
                        <PlayerRatingsDetails player={selectedPlayer} summary="Ratings" />
                      </div>
                    </section>
                  </article>
                );
              })() : (
                <article className="roster-empty-state">
                  <strong>No player selected.</strong>
                  <p>Adjust the filters or pick a player from the list.</p>
                </article>
              )}
            </div>
          </div>
        </>
      ) : (
        <section className="training-results-workspace">
          <div className="training-results-header">
            <div className="training-results-lenses">
              <button type="button" className={resultsLens === "summary" ? "selected" : ""} onClick={() => setResultsLens("summary")}>Summary</button>
              <button type="button" className={resultsLens === "risers" ? "selected" : ""} onClick={() => setResultsLens("risers")}>Risers</button>
              <button type="button" className={resultsLens === "conversions" ? "selected" : ""} onClick={() => setResultsLens("conversions")}>Conversions</button>
              <button type="button" className={resultsLens === "body-risk" ? "selected" : ""} onClick={() => setResultsLens("body-risk")}>Body / Risk</button>
            </div>
            <span className="read-only-chip">
              {summary.latestWeek ? `Week ${summary.latestWeek} latest` : "Season view"}
            </span>
          </div>

          {resultsLens === "summary" ? (
            <>
              <div className="training-summary-grid">
                <article className="training-summary-card">
                  <span>Conditioning</span>
                  <strong>{summary.avgConditioning}</strong>
                  <small>Average roster conditioning</small>
                </article>
                <article className="training-summary-card">
                  <span>Flexibility</span>
                  <strong>{summary.avgFlexibility}</strong>
                  <small>Average roster flexibility</small>
                </article>
                <article className="training-summary-card">
                  <span>Conversions</span>
                  <strong>{summary.conversionProjects}</strong>
                  <small>Active role-change projects</small>
                </article>
                <article className="training-summary-card">
                  <span>Role Shifts</span>
                  <strong>{summary.primaryRoleChanges}</strong>
                  <small>Latest primary-position changes</small>
                </article>
                <article className="training-summary-card">
                  <span>Risk Flags</span>
                  <strong>{summary.elevatedRisk}</strong>
                  <small>Players needing closer management</small>
                </article>
              </div>

              <div className="training-results-columns">
                <section className="training-results-panel">
                  <div className="training-section-heading">
                    <p className="eyebrow">Top Risers</p>
                    <strong>Who looks strongest now</strong>
                  </div>
                  {risers.slice(0, 5).map(({ player, report }) => (
                    <article key={player.id} className="training-results-row">
                      <div>
                        <strong>{player.firstName} {player.lastName}</strong>
                        <small>{player.position} | OVR {player.overall} | POT {player.potential}</small>
                      </div>
                      <span>{report?.summary ?? "Stable weekly outlook"}</span>
                    </article>
                  ))}
                </section>
                <section className="training-results-panel">
                  <div className="training-section-heading">
                    <p className="eyebrow">Conversion Watch</p>
                    <strong>Closest role changes</strong>
                  </div>
                  {conversions.slice(0, 5).map(({ player, target, targetProgress, changedPrimaryPosition }) => (
                    <article key={player.id} className="training-results-row">
                      <div>
                        <strong>{player.firstName} {player.lastName}</strong>
                        <small>{player.position} to {target}</small>
                      </div>
                      <span>{changedPrimaryPosition ? "Role shifted" : clampPercent(targetProgress)}</span>
                    </article>
                  ))}
                </section>
                <section className="training-results-panel">
                  <div className="training-section-heading">
                    <p className="eyebrow">Body / Risk</p>
                    <strong>Where management matters</strong>
                  </div>
                  {bodyRisk.slice(0, 5).map(({ player, risk }) => (
                    <article key={player.id} className="training-results-row">
                      <div>
                        <strong>{player.firstName} {player.lastName}</strong>
                        <small>{player.body.weightLbs} lbs | {player.body.musclePct}% muscle | {player.body.bodyFatPct}% fat</small>
                      </div>
                      <span>{risk}</span>
                    </article>
                  ))}
                </section>
              </div>
            </>
          ) : null}

          {resultsLens === "risers" ? (
            <section className="training-results-panel training-results-board">
              {risers.map(({ player, report, readinessDelta, risk }) => (
                <article key={player.id} className="training-results-row board">
                  <div>
                    <strong>{player.firstName} {player.lastName}</strong>
                    <small>{player.position} | OVR {player.overall} | POT {player.potential}</small>
                  </div>
                  <span>{report?.summary ?? "Stable weekly outlook"}</span>
                  <span>Readiness {readinessDelta > 0 ? "+" : ""}{readinessDelta}</span>
                  <span>{risk}</span>
                </article>
              ))}
            </section>
          ) : null}

          {resultsLens === "conversions" ? (
            <section className="training-results-panel training-results-board">
              {conversions.length ? conversions.map(({ player, target, targetProgress, changedPrimaryPosition, report }) => (
                <article key={player.id} className="training-results-row board">
                  <div>
                    <strong>{player.firstName} {player.lastName}</strong>
                    <small>{player.position} | target {target}</small>
                  </div>
                  <span>{changedPrimaryPosition ? "Primary role changed" : clampPercent(targetProgress)}</span>
                  <span>{report?.summary ?? "Conversion work active"}</span>
                </article>
              )) : <article className="roster-empty-state"><strong>No active conversion projects.</strong><p>Set a target position in Configure to start one.</p></article>}
            </section>
          ) : null}

          {resultsLens === "body-risk" ? (
            <section className="training-results-panel training-results-board">
              {bodyRisk.map(({ player, report, risk }) => (
                <article key={player.id} className="training-results-row board">
                  <div>
                    <strong>{player.firstName} {player.lastName}</strong>
                    <small>{player.position} | {player.body.weightLbs} lbs | {player.body.musclePct}% muscle | {player.body.bodyFatPct}% fat</small>
                  </div>
                  <span>Cond {player.body.conditioning} | Flex {player.body.flexibility}</span>
                  <span>{risk}</span>
                  <span>{report?.bodySummary ?? "No weekly body note yet"}</span>
                </article>
              ))}
            </section>
          ) : null}
        </section>
      )}
    </section>
  );
}

type FreeAgentsTab = "available" | "pending" | "recent" | "offers";

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
  const [sortBy, setSortBy] = useState<FreeAgentSort>("ask");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [overallFilter, setOverallFilter] = useState<RosterRangeFilter>("all");
  const [potentialFilter, setPotentialFilter] = useState<RosterRangeFilter>("all");
  const [ageFilter, setAgeFilter] = useState<RosterAgeFilter>("all");
  const [salaryFilter, setSalaryFilter] = useState<FreeAgentSalaryFilter>("all");
  const [experienceFilter, setExperienceFilter] = useState<RosterExperienceFilter>("all");
  const [activePlayerId, setActivePlayerId] = useState<string | undefined>();
  const team = selectedTeam(save);
  const teamRosterSize = rosterSize(save, team.id);
  const teamPracticeSize = practiceSquadSize(save, team.id);
  const budgetRoom = teamCapLedger(save, team.id).capRoom;
  const needs = rosterNeeds(save, team.id).slice(0, 4);
  const market = normalizeFreeAgencyMarket(save);
  const candidates = useMemo(() => {
    const filtered = freeAgentPlayers(save).filter((player) => {
      if (positionFilter !== "all" && player.position !== positionFilter) return false;
      if (!rosterRangeMatch(player.overall, overallFilter)) return false;
      if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
      if (!rosterAgeMatch(player.age, ageFilter)) return false;
      if (!freeAgentSalaryMatch(player.salary, salaryFilter)) return false;
      if (!rosterExperienceMatch(player, experienceFilter)) return false;
      return true;
    });
    if (sortBy === "ask") {
      return filtered.slice().sort((a, b) => expectedFreeAgentAsk(b) - expectedFreeAgentAsk(a) || b.overall - a.overall || a.lastName.localeCompare(b.lastName));
    }
    return sortFreeAgents(filtered, sortBy);
  }, [ageFilter, experienceFilter, overallFilter, positionFilter, potentialFilter, salaryFilter, save, sortBy]);
  const pendingClass = useMemo(() => projectedPendingFreeAgents(save).filter((player) => {
    if (positionFilter !== "all" && player.position !== positionFilter) return false;
    if (!rosterRangeMatch(player.overall, overallFilter)) return false;
    if (!rosterRangeMatch(player.potential, potentialFilter)) return false;
    if (!rosterAgeMatch(player.age, ageFilter)) return false;
    return true;
  }), [ageFilter, overallFilter, positionFilter, potentialFilter, save]);
  const submittedOffers = market.offers.filter((offer) => offer.status === "submitted").sort((a, b) => b.expectedAsk - a.expectedAsk || b.interestScore - a.interestScore);
  const activePlayer = activePlayerId ? save.players.find((player) => player.id === activePlayerId) : undefined;
  const activeFilters = [
    positionFilter !== "all" ? { label: positionFilter, clear: () => setPositionFilter("all") } : undefined,
    overallFilter !== "all" ? { label: `OVR ${overallFilter}`, clear: () => setOverallFilter("all") } : undefined,
    potentialFilter !== "all" ? { label: `POT ${potentialFilter}`, clear: () => setPotentialFilter("all") } : undefined,
    ageFilter !== "all" ? { label: `Age ${ageFilter}`, clear: () => setAgeFilter("all") } : undefined,
    salaryFilter !== "all" ? { label: `Salary ${salaryFilter}`, clear: () => setSalaryFilter("all") } : undefined,
    experienceFilter !== "all" ? { label: experienceFilter === "rookie" ? "Rookies" : `${experienceFilter} yrs`, clear: () => setExperienceFilter("all") } : undefined
  ].filter((item): item is { label: string; clear: () => void } => Boolean(item));

  const tabCounts: Record<FreeAgentsTab, number> = {
    available: candidates.length,
    pending: pendingClass.length,
    recent: save.freeAgencyLog.length,
    offers: submittedOffers.length
  };

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
          <label className="roster-select-field">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as FreeAgentSort)}>
              <option value="ask">Asking Price</option>
              <option value="overall">Overall</option>
              <option value="potential">Potential</option>
              <option value="age">Age</option>
              <option value="salary">Salary</option>
              <option value="position">Position</option>
            </select>
          </label>
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
        </div>
        <div className="roster-toolbar-meta">
          <span className="read-only-chip">{candidates.length} available</span>
          {activeFilters.length ? <button type="button" onClick={() => {
            setPositionFilter("all");
            setOverallFilter("all");
            setPotentialFilter("all");
            setAgeFilter("all");
            setSalaryFilter("all");
            setExperienceFilter("all");
          }}>Clear Filters</button> : null}
        </div>
      </div>

      {activeFilters.length ? (
        <div className="roster-active-filters">
          {activeFilters.map((filter) => (
            <RosterFilterChip key={filter.label} label={filter.label} onClear={filter.clear} />
          ))}
        </div>
      ) : null}

      {tab === "available" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Pos</th>
                <th>Age</th>
                <th>OVR</th>
                <th>POT</th>
                <th>Ask</th>
                <th>Years</th>
                <th>Interest</th>
                <th>Comp</th>
                <th>Status</th>
                <th>Offer</th>
                <th>PS</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length ? candidates.map((player) => {
            const school = save.schools.find((candidate) => candidate.id === player.collegeId);
            const practiceCheck = canSignFreeAgentToPracticeSquad(save, player.id, team.id);
            const ask = suggestedApy(player);
            const interest = freeAgentInterestScore(save, player, team.id, {
              years: expectedFreeAgentYears(player),
              apy: ask,
              security: "standard",
              role: roleForTeamNeed(save, player, team.id)
            });
            const existingOffer = market.offers.find((offer) => offer.playerId === player.id && offer.teamId === team.id && offer.status === "submitted");
            return (
              <tr key={player.id} className="roster-table-row" onClick={() => setActivePlayerId(player.id)} tabIndex={0}>
                <td>
                  <div className="roster-table-player">
                    <span className="roster-table-player-main"><strong>{player.firstName} {player.lastName}</strong></span>
                    <span className="roster-table-player-meta"><CollegeLogo school={school} size={22} /> <span>{school?.name ?? "Unknown College"}</span></span>
                  </div>
                </td>
                <td>{player.position}</td>
                <td>{player.age}</td>
                <td><strong>{player.overall}</strong></td>
                <td><strong>{player.potential}</strong></td>
                <td><strong>${ask.toFixed(1)}M</strong></td>
                <td>{expectedFreeAgentYears(player)}</td>
                <td><span className="read-only-chip">{interest}</span></td>
                <td>{player.contract?.rights === "ufa" && player.previousTeamId ? "CFA" : "-"}</td>
                <td>{existingOffer ? "Offer pending" : "Available"}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="roster-row-action" disabled={Boolean(existingOffer)} onClick={() => setActivePlayerId(player.id)}>
                    {existingOffer ? "Pending" : "Offer"}
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
        </section>
      ) : null}

      {tab === "pending" ? (
        <section className="table-card free-agent-table-card">
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Pos</th>
                <th>Age</th>
                <th>OVR</th>
                <th>POT</th>
                <th>Current APY</th>
                <th>Expected Ask</th>
                <th>Rights</th>
                <th>Comp Risk</th>
                <th>Projected Market</th>
              </tr>
            </thead>
            <tbody>
              {pendingClass.length ? pendingClass.map((player) => {
                const school = save.schools.find((candidate) => candidate.id === player.collegeId);
                const playerTeam = teamById(save, player.teamId);
                return (
                  <tr key={player.id} className="roster-table-row" onClick={() => setActivePlayerId(player.id)} tabIndex={0}>
                    <td>
                      <div className="roster-table-player">
                        <span className="roster-table-player-main"><strong>{player.firstName} {player.lastName}</strong></span>
                        <span className="roster-table-player-meta"><CollegeLogo school={school} size={22} /> <span>{school?.name ?? "Unknown College"}</span></span>
                      </div>
                    </td>
                    <td>{playerTeam.abbreviation}</td>
                    <td>{player.position}</td>
                    <td>{player.age}</td>
                    <td><strong>{player.overall}</strong></td>
                    <td><strong>{player.potential}</strong></td>
                    <td>${player.salary.toFixed(1)}M</td>
                    <td><strong>${expectedFreeAgentAsk(player).toFixed(1)}M</strong></td>
                    <td>{player.contract?.rights?.toUpperCase() ?? "UFA"}</td>
                    <td>{player.overall >= 58 ? "Possible CFA" : "-"}</td>
                    <td>{expectedFreeAgentAsk(player) >= 10 ? "Premium" : expectedFreeAgentAsk(player) >= 4 ? "Starter market" : "Depth market"}</td>
                  </tr>
                );
              }) : <tr><td colSpan={11}>No projected expiring free agents match the current filters.</td></tr>}
            </tbody>
          </DataTable>
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

function StatsView({ save }: { save: GameSave }) {
  const records = save.careerEndedRecords ?? [];
  return (
    <section className="view-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">League archive</p>
          <h3>Career-Ending Medical Records</h3>
        </div>
      </div>
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
          {records.length ? records.map((record) => {
            const team = teamById(save, record.teamId);
            return (
              <tr key={record.id}>
                <td>{record.week}</td>
                <td><strong>{record.playerName}</strong></td>
                <td><TeamLogo save={save} teamId={team.id} size={30} /></td>
                <td>{record.position}</td>
                <td>{record.age}</td>
                <td>{record.injuryName}</td>
                <td><span className={`medical-pill medical-${medicalRiskTier(record.medical)}`}>{record.medical}</span></td>
                <td>{record.overallBefore}/{record.potentialBefore}</td>
                <td>{record.summary}</td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={9}>No career-ending injury records yet.</td>
            </tr>
          )}
        </tbody>
      </DataTable>
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
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "all">("all");
  const [regionFilter, setRegionFilter] = useState<ScoutingRegion | "all">("all");
  const [sortMode, setSortMode] = useState<ProspectBoardLens>("balanced");
  const [showHidden, setShowHidden] = useState(false);
  const [expandedProspectId, setExpandedProspectId] = useState<string | undefined>();
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [expandedRecapIds, setExpandedRecapIds] = useState<Set<string>>(new Set());
  const [selectedRecapWeek, setSelectedRecapWeek] = useState<number | "latest">("latest");
  const schools = new Map(save.schools.map((school) => [school.id, school]));
  const plan = ensureScoutingPlan(save);
  const recaps = [...(plan.recaps ?? [])].sort((a, b) => b.week - a.week);
  const selectedWeek = selectedRecapWeek === "latest" ? recaps[0]?.week : selectedRecapWeek;
  const selectedRecap = recaps.find((recap) => recap.week === selectedWeek) ?? recaps[0];
  const assignmentGroups = assignmentTypes
    .map((type) => ({
      type,
      assignments: plan.assignments.filter((assignment) => assignment.type === type)
    }))
    .filter((group) => group.assignments.length);
  const visibleProspects = save.prospects
    .filter((prospect) => showHidden || !prospect.hidden)
    .filter((prospect) => matchesPositionLens(prospect, positionFilter))
    .filter((prospect) => regionFilter === "all" || prospect.region === regionFilter)
    .filter((prospect) => {
      const text = `${prospect.firstName} ${prospect.lastName} ${prospect.position} ${schools.get(prospect.schoolId)?.name ?? ""}`.toLowerCase();
      return !query.trim() || text.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => positionFilter === "all" ? compareProspectsForLens(a, b, sortMode) : compareProspectsForPositionLens(a, b, positionFilter, sortMode));
  const toggleRecapExpanded = (id: string) => setExpandedRecapIds((current) => toggleSetValue(current, id));
  return (
    <section className="view-stack">
      <MetricStrip save={save} />
      <article className="table-card scouting-recap-card scouting-recap-workspace">
        <div className="section-heading compact recap-heading">
          <div>
            <p className="eyebrow">Weekly Results</p>
            <h3>Scouting Recap</h3>
          </div>
          <div className="recap-week-controls">
            <span>{selectedRecap ? `${selectedRecap.risers.length} risers | ${selectedRecap.fallers.length} fallers` : "No recap yet"}</span>
            <select
              aria-label="Scouting recap week"
              disabled={!recaps.length}
              value={selectedRecap?.week ?? ""}
              onChange={(event) => setSelectedRecapWeek(Number(event.target.value))}
            >
              {recaps.map((recap) => (
                <option key={recap.id} value={recap.week}>Week {recap.week}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedRecap ? (
          <div className="scouting-recap-grid">
            <ScoutingRecapSection
              direction="riser"
              entries={selectedRecap.risers}
              expandedIds={expandedRecapIds}
              schools={schools}
              title="Risers"
              toggleExpanded={toggleRecapExpanded}
            />
            <ScoutingRecapSection
              direction="faller"
              entries={selectedRecap.fallers}
              expandedIds={expandedRecapIds}
              schools={schools}
              title="Fallers"
              toggleExpanded={toggleRecapExpanded}
            />
          </div>
        ) : (
          <p className="recap-empty">Advance a week to generate scouting recap movement.</p>
        )}
      </article>
      <section className="scout-command scouting-war-room">
        <article className="table-card scouting-planner-card">
          <div className="section-heading compact planner-heading">
            <div>
              <p className="eyebrow">Assignments</p>
              <h3>Weekly Scouting Plan</h3>
            </div>
            <button className="primary-action" onClick={optimizeScoutingPlan}>Optimize All</button>
          </div>
          <div className="assignment-card-groups">
            {assignmentGroups.map((group) => (
              <div className="assignment-card-group" key={group.type}>
                <div className="assignment-group-title">
                  <strong>{assignmentTypeLabel(group.type)}</strong>
                  <span>{group.assignments.length} scout{group.assignments.length === 1 ? "" : "s"}</span>
                </div>
                <div className="assignment-card-grid">
                  {group.assignments.map((assignment) => {
                    const scout = save.staff.find((member) => member.id === assignment.scoutId);
                    const focusOptions = scoutingFocusOptions(save, assignment, scout);
                    const preview = scoutingAssignmentPreview(save, assignment);
                    const expanded = expandedAssignments.has(assignment.id);
                    return (
                      <div className={`scout-assignment-card card-fit-${fitTone(preview.fit)} ${assignment.locked ? "is-locked" : ""}`} key={assignment.id}>
                        <div className="scout-card-head">
                          <div>
                            <strong>{scout ? `${scout.firstName[0]}. ${scout.lastName}` : "Scout"}</strong>
                            {scout ? (
                              <div className="scout-chip-row">
                                {scoutSpecialtyTags(scout).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                              </div>
                            ) : null}
                          </div>
                          <button
                            className={assignment.locked ? "lock-button active" : "lock-button"}
                            onClick={() => toggleAssignmentLock(assignment.id, !assignment.locked)}
                          >
                            {assignment.locked ? "Locked" : "Lock"}
                          </button>
                        </div>
                        {preview.warnings.length ? (
                          <div className="warning-chip-row">
                            {preview.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                          </div>
                        ) : null}
                        <div className="assignment-controls">
                          <label>
                            Type
                            <select value={assignment.type} onChange={(event) => updateAssignment(assignment.id, { type: event.target.value as ScoutingAssignmentType })}>
                              {assignmentTypes.map((type) => <option key={type} value={type}>{assignmentTypeLabel(type)}</option>)}
                            </select>
                          </label>
                          <label>
                            Focus
                            <select value={assignment.focusId} onChange={(event) => updateAssignment(assignment.id, { focusId: event.target.value })}>
                              {focusOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}{option.disabled ? " - assigned" : ""}</option>)}
                            </select>
                          </label>
                        </div>
                        <div className="assignment-impact-grid">
                          <span>
                            Targets
                            <strong>{preview.count}</strong>
                          </span>
                          <span>
                            Gain
                            <strong>{preview.minGain}-{preview.maxGain}%</strong>
                          </span>
                          <span className={`impact-fit fit-${fitTone(preview.fit)}`}>
                            Fit
                            <strong>{preview.fit}</strong>
                          </span>
                        </div>
                        <div className="rating-chip-row">
                          {preview.ratingChips.map((chip) => (
                            <span className={`rating-chip chip-${fitTone(chip.value)}`} key={`${chip.label}-${chip.value}`}>
                              {chip.label} <strong>{chip.value}</strong>
                            </span>
                          ))}
                        </div>
                        <div className="target-preview-list">
                          {preview.targets.map((target) => (
                            <div key={target.id}>
                              <span>
                                #{target.teamRank} {target.position} {target.name}
                                <small>{target.schoolName} | {target.progress}%</small>
                              </span>
                              <em className={`progress-delta delta-${progressTone(target.gainRange[1])}`}>+{target.gainRange[0]}-{target.gainRange[1]}%</em>
                            </div>
                          ))}
                          {!preview.targets.length ? <p>No likely targets for this focus.</p> : null}
                        </div>
                        <button className="text-button" onClick={() => setExpandedAssignments((current) => toggleSetValue(current, assignment.id))}>
                          {expanded ? "Hide Detail" : "More Detail"}
                        </button>
                        {expanded ? (
                          <div className="assignment-expanded">
                            <p>{preview.recommendation}</p>
                            <div className="detail-chip-row">
                              <span>Type <strong>{assignmentTypeLabel(assignment.type)}</strong></span>
                              <span>Focus <strong>{focusOptions.find((option) => option.value === assignment.focusId)?.label ?? assignment.focusId}</strong></span>
                              <span>Scout OVR <strong>{scout ? staffOverall(scout) : 55}</strong></span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
      <div className="board-toolbar">
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
        <label className="inline-toggle">
          <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
          Hidden
        </label>
      </div>
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
            <th>Grade</th>
            <th>POT</th>
            <th>Concerns</th>
            <th>Prod</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleProspects.map((prospect) => {
            const school = schools.get(prospect.schoolId);
            const expanded = expandedProspectId === prospect.id;
            return (
              <Fragment key={prospect.id}>
                <tr className={prospect.hidden ? "muted-row" : prospect.favorite ? "favorite-row" : ""} onClick={() => setExpandedProspectId(expanded ? undefined : prospect.id)}>
                  <td>
                    <strong>{prospect.firstName} {prospect.lastName}</strong>
                    <small className="prospect-context">{school?.conference} | {prospect.region}</small>
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
                    <div className="concern-mini-stack">
                      <ConcernRangePill concernType="medical" label="Med" range={prospect.scouted.concerns.medical} />
                      <ConcernRangePill concernType="character" label="Char" range={prospect.scouted.concerns.character} />
                      <ConcernRangePill concernType="workEthic" label="Work" range={prospect.scouted.concerns.workEthic} />
                    </div>
                  </td>
                  <td>{prospect.production}</td>
                  <td>{prospect.stock > 0 ? `+${prospect.stock}` : prospect.stock}</td>
                  <td>
                    <div className="button-stack">
                      <button onClick={(event) => { event.stopPropagation(); updateBoard(prospect.id, { favorite: !prospect.favorite }); }}>
                        {prospect.favorite ? "Unstar" : "Star"}
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); updateBoard(prospect.id, { hidden: !prospect.hidden }); }}>
                        {prospect.hidden ? "Show" : "Hide"}
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); quickFocus(prospect.id); }}>
                        Quick Focus
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); setExpandedProspectId(expanded ? undefined : prospect.id); }}>
                        {expanded ? "Hide" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded ? (
                  <tr className="prospect-detail-row">
                    <td colSpan={13}>
                      <div className="prospect-detail-panel">
                        <div>
                          <h4>Board Read</h4>
                          <p>{prospect.scoutReports?.[0] ?? prospect.scouted.note}</p>
                          <div className="detail-chip-row">
                            <span>Team Grade <strong>{prospect.teamGrade.toFixed(1)}</strong></span>
                            <span>Consensus <strong>{prospect.consensusGrade.toFixed(1)}</strong></span>
                            <span>Projection <strong>R{prospect.projectedRound}</strong></span>
                            <span>Trend <strong>{prospect.productionTrend > 0 ? `+${prospect.productionTrend}` : prospect.productionTrend}</strong></span>
                          </div>
                        </div>
                        <ProspectRatingBreakdown prospect={prospect} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </DataTable>
    </section>
  );
}

function CalendarView({ save, openTab, openGame }: { save: GameSave; openTab: (tab: Tab) => void; openGame: (gameId: string) => void }) {
  const [view, setView] = useState<"today" | "month" | "league" | "team">("today");
  const todayEvents = save.seasonCalendar.filter((event) => event.date === save.currentDate);
  const upcoming = save.seasonCalendar.filter((event) => event.date > save.currentDate).slice(0, 12);
  const teamGames = teamSchedule(save, save.selectedTeamId).filter((game) => game.date);
  const month = save.currentDate.slice(0, 7);
  const monthEvents = save.seasonCalendar.filter((event) => event.date.startsWith(month));
  const nextGameDate = nextDateWithGames(save);
  const todaysGames = gamesOnDate(save);

  function openEvent(event: NonNullable<GameSave["seasonCalendar"]>[number]) {
    if (event.gameId) {
      openGame(event.gameId);
      return;
    }
    if (event.actionTab) openTab(event.actionTab as Tab);
  }

  return (
    <section className="panel calendar-page">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">League calendar</p>
          <h2>{formatDateLong(save.currentDate)}</h2>
          <p>{save.calendarPhase.replace(/-/g, " ")} | Football Week {save.currentWeek}</p>
        </div>
        <span className="read-only-chip">{nextGameDate ? `Next games ${formatDateLong(nextGameDate)}` : "No scheduled games"}</span>
      </div>
      <div className="segmented-tabs compact-tabs">
        {(["today", "month", "league", "team"] as const).map((candidate) => (
          <button key={candidate} type="button" className={view === candidate ? "selected" : ""} onClick={() => setView(candidate)}>
            {candidate === "today" ? "Today" : candidate === "month" ? "Month" : candidate === "league" ? "League Year" : "Team Schedule"}
          </button>
        ))}
      </div>

      {view === "today" ? (
        <div className="calendar-today-grid">
          <section className="calendar-card">
            <h3>Today</h3>
            {todayEvents.length ? todayEvents.map((event) => <CalendarEventRow key={event.id} event={event} openEvent={openEvent} />) : <p>No major league events today. Daily recovery, scouting, training, roster AI, waivers, and offer timers still process.</p>}
          </section>
          <section className="calendar-card">
            <h3>Games Today</h3>
            {todaysGames.length ? todaysGames.map((game) => (
              <button key={game.id} className="calendar-event-row" type="button" onClick={() => openGame(game.id)}>
                <span>{game.awayTeamId.toUpperCase()} at {game.homeTeamId.toUpperCase()}</span>
                <strong>{game.kickoffSlot ?? "TBD"}</strong>
              </button>
            )) : <p>No games today.</p>}
          </section>
          <section className="calendar-card">
            <h3>Upcoming</h3>
            {upcoming.slice(0, 8).map((event) => <CalendarEventRow key={event.id} event={event} openEvent={openEvent} />)}
          </section>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="calendar-list">
          {monthEvents.length ? monthEvents.map((event) => <CalendarEventRow key={event.id} event={event} openEvent={openEvent} />) : <p>No major events this month.</p>}
        </div>
      ) : null}

      {view === "league" ? (
        <div className="calendar-list">
          {save.seasonCalendar.filter((event) => event.important || event.type !== "game").map((event) => <CalendarEventRow key={event.id} event={event} openEvent={openEvent} />)}
        </div>
      ) : null}

      {view === "team" ? (
        <div className="calendar-list">
          {teamGames.map((game) => (
            <button key={game.id} className="calendar-event-row" type="button" onClick={() => openGame(game.id)}>
              <span>{game.date ? formatDateLong(game.date) : `Week ${game.week}`} | {game.awayTeamId.toUpperCase()} at {game.homeTeamId.toUpperCase()}</span>
              <strong>{game.status === "final" ? `${game.awayScore}-${game.homeScore}` : game.kickoffSlot ?? "TBD"}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CalendarEventRow({ event, openEvent }: { event: GameSave["seasonCalendar"][number]; openEvent: (event: GameSave["seasonCalendar"][number]) => void }) {
  return (
    <button className={`calendar-event-row calendar-event-${event.type}`} type="button" onClick={() => openEvent(event)}>
      <span>
        <strong>{formatDateLong(event.date)}</strong>
        {event.title}
        {event.description ? <small>{event.description}</small> : null}
      </span>
      <em>{event.type.replace(/-/g, " ")}</em>
    </button>
  );
}

function ScheduleView({ save, openGame }: { save: GameSave; openGame: (gameId: string) => void }) {
  const [viewTeamId, setViewTeamId] = useState(save.selectedTeamId);
  const [mode, setMode] = useState<"team" | "week">("team");
  const [viewWeek, setViewWeek] = useState(save.currentWeek);
  const schedule = mode === "team" ? teamSchedule(save, viewTeamId) : weekGames(save, viewWeek);
  const viewedTeam = teamById(save, viewTeamId);
  const maxWeek = Math.max(18, ...save.schedule.map((game) => game.week));
  const difficulty =
    mode === "team"
      ? Math.round(
          teamSchedule(save, viewTeamId).reduce((sum, game) => {
            const opponentId = game.homeTeamId === viewTeamId ? game.awayTeamId : game.homeTeamId;
            return sum + teamOverall(save, opponentId);
          }, 0) / Math.max(1, teamSchedule(save, viewTeamId).length)
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
        {weekGames(save, mode === "week" ? viewWeek : save.currentWeek).map((game) => (
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
          {schedule.map((game) => {
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
  const [expandedProspectId, setExpandedProspectId] = useState<string>();
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

  return (
    <section className="draft-workspace">
      <article className="draft-command-bar">
        <div className="draft-command-title">
          <p className="eyebrow">{save.phase}</p>
          <h3>Draft Room</h3>
          <small>
            {save.phase === "regular"
              ? "Board is available. Draft actions unlock after the season."
              : save.phase === "draft-prep"
                ? "Draft room is ready to open."
                : save.phase === "udfa"
                  ? `UDFA wave ${draftSave.udfaState?.wave ?? 1} of ${draftSave.udfaState?.totalWaves ?? 3}. Offer the undrafted board before the class reveal.`
                  : save.phase === "rookie-results"
                    ? "Rookie class results are revealed. Review the class before onboarding."
                : save.phase === "rookie-onboarding"
                  ? "Draft complete. Rookie onboarding is ready."
                  : save.phase === "offseason-complete"
                    ? "Rookie onboarding is complete."
                    : "Phones are live. Manage the clock, offers, and board."}
          </small>
        </div>
        {currentPick && save.phase === "draft" ? (
          <div className="draft-clock-compact">
            <span>On Clock</span>
            <strong>#{currentPick.overallPick} {currentTeam?.abbreviation}</strong>
            <em>{isUserPick ? "Your pick" : "CPU"} | {formatClock(draftSave.draftState.clockSeconds)}</em>
            <div className="clock-bar"><i style={{ width: `${clockPct}%` }} /></div>
          </div>
        ) : null}
        <div className="draft-command-actions">
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
            <div className="speed-row compact">
              {([1, 3, 10] as const).map((speed) => (
                <button key={speed} className={draftSave.draftState.simSpeed === speed ? "active-mini" : ""} onClick={() => setSpeed(speed)}>
                  {speed}x
                </button>
              ))}
            </div>
            </>
          ) : null}
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
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value as ScoutingRegion | "all")}>
                <option value="all">All Regions</option>
                {scoutingRegions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
              <select value={conferenceFilter} onChange={(event) => setConferenceFilter(event.target.value)}>
                <option value="all">All Conferences</option>
                {conferences.map((conference) => <option key={conference} value={conference}>{conference}</option>)}
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
              <select value={valueFilter} onChange={(event) => setValueFilter(event.target.value)}>
                <option value="all">All Values</option>
                <option value="15">Value+</option>
                <option value="40">Major Steals</option>
              </select>
              <select value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)}>
                <option value="all">All Rounds</option>
                {[1, 2, 3, 4, 5, 6, 7].map((round) => <option key={round} value={round}>Round {round}</option>)}
              </select>
              <button type="button" className={favoritesOnly ? "active-mini" : ""} onClick={() => setFavoritesOnly((value) => !value)}>Favorites</button>
              <button type="button" className={showHidden ? "active-mini" : ""} onClick={() => setShowHidden((value) => !value)}>Hidden</button>
              <button type="button" className={showDrafted ? "active-mini" : ""} onClick={() => setShowDrafted((value) => !value)}>Drafted</button>
            </div>
            <div className="draft-board-header">
              <span>Team</span>
              <span>NFL</span>
              <span>Player</span>
              <span>Pos</span>
              <span>College</span>
              <span>OVR</span>
              <span>POT</span>
              <span>Value</span>
              <span></span>
            </div>
            {board.map((prospect, index) => {
              const drafted = selectedProspectIds.has(prospect.id);
              const school = schools.get(prospect.schoolId);
              const expanded = expandedProspectId === prospect.id;
              return (
                <Fragment key={prospect.id}>
                  <div
                    className={`board-row draft-prospect-row ${drafted ? "muted-row" : ""} ${prospect.favorite ? "favorite-row" : ""} ${prospect.hidden ? "hidden-row" : ""}`}
                    onClick={() => setExpandedProspectId(expanded ? undefined : prospect.id)}
                  >
                    <strong className="draft-rank-cell">#{prospect.teamRank || index + 1}</strong>
                    <strong className="draft-rank-cell neutral">#{prospect.consensusRank}</strong>
                    <span>{prospect.firstName} {prospect.lastName}</span>
                    <em>{prospect.position}</em>
                    <small className="draft-college-logo"><CollegeLogo school={school} size={28} /></small>
                    <b>{prospect.scouted.low}-{prospect.scouted.high}</b>
                    <small>{prospect.scouted.potentialLow}-{prospect.scouted.potentialHigh}</small>
                    <ValueBadge prospect={prospect} />
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
                  {expanded ? (
                    <div className="draft-prospect-detail slim">
                      <div>
                        <p>{prospect.scoutReports?.[0] ?? prospect.scouted.note}</p>
                        <div className="prospect-mini-metrics">
                          <span>School <strong>{school?.name ?? "Unknown"}</strong></span>
                          <span>Conference <strong>{school?.conference ?? "Unknown"}</strong></span>
                          <span>Region <strong>{prospect.region}</strong></span>
                          <span>Projected <strong>R{prospect.projectedRound}</strong></span>
                          <span>Production <strong>{prospect.production}</strong></span>
                          <span>Trend <strong>{prospect.productionTrend > 0 ? `+${prospect.productionTrend}` : prospect.productionTrend}</strong></span>
                        </div>
                        <div className="concern-pills">
                          <ConcernRangePill concernType="medical" label="Medical" range={prospect.scouted.concerns.medical} />
                          <ConcernRangePill concernType="character" label="Character" range={prospect.scouted.concerns.character} />
                          <ConcernRangePill concernType="workEthic" label="Work" range={prospect.scouted.concerns.workEthic} />
                        </div>
                      </div>
                      <ProspectRatingBreakdown prospect={prospect} showProgress={false} />
                    </div>
                  ) : null}
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
              <span>Value</span>
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
                      <span>{prospect.firstName} {prospect.lastName}</span>
                      <em>{prospect.position}</em>
                      <span className="draft-college-logo"><CollegeLogo school={school} size={26} /></span>
                      <strong className="draft-rank-cell">#{prospect.teamRank}</strong>
                      <strong className="draft-rank-cell neutral">#{prospect.consensusRank}</strong>
                      <ValueBadge prospect={prospect} />
                      <span></span>
                    </>
                  ) : (
                    <>
                      <span>-</span>
                      <em>-</em>
                      <span>-</span>
                      <strong>-</strong>
                      <strong>-</strong>
                      <span>-</span>
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
        {save.phase === "draft" && draftSave.draftState.pendingEvent ? (
          <div className="modal-backdrop">
            <article className="trade-modal">
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
          <div className="modal-backdrop">
            <article className="trade-modal trade-preview-modal">
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
          <div className="modal-backdrop">
            <article className="trade-modal udfa-offer-modal">
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
      </article>
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
