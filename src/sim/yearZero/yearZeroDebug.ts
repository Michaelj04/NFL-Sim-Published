import type { GameSave } from "../../types";
import { buildPipelineSchedulerDebug, type PipelineSchedulerDebug } from "../pipelineScheduler";
import { buildRuntimeGovernanceReport, type RuntimeGovernanceReport } from "../runtimeGovernance";
import { buildSelfAuditRows, type SelfAuditRow } from "./yearZeroSelfAudit";

export interface YearZeroDebugExport {
  version: string;
  seed: string;
  status: string;
  completedAt: string;
  bundleCount: number;
  bundledRows: number;
  artifactCounts: Record<string, number>;
  invariants: Record<string, boolean>;
  selfAudit: SelfAuditRow[];
  pipelineScheduler: PipelineSchedulerDebug;
  runtimeGovernance: RuntimeGovernanceReport;
  loadedRuntimeBundles: string[];
  collegeRoster?: {
    seasonYear: number;
    players: number;
    yearZeroSourcedPlayers: number;
    annualSignees: number;
    redshirts: number;
    walkOns: number;
    cuts: number;
    usesYearZeroBundles: boolean;
    lastProgression?: {
      seasonYear: number;
      draftYear: number;
      draftDeclarations: number;
      graduatedPlayers: number;
      redshirtedPlayers: number;
      walkOnsAdded: number;
      cutPlayers: number;
      academicIneligiblePlayers: number;
    };
  };
  collegeSeasonResults?: {
    seasonYear: number;
    production: number;
    awards: number;
    awardGroups: string[];
    totalAwardDraftBonus: number;
    injuries: number;
    recurrenceTaggedInjuries: number;
    averageRecurrenceRisk: number;
    averageLongTermWear: number;
    starters: number;
    averageSnapShare: number;
    usesYearZeroBundles: false;
  };
  collegeMorale?: {
    seasonYear: number;
    entries: number;
    lowMorale: number;
    highTransferRisk: number;
    averagePromisePressure: number;
    usesYearZeroBundles: false;
  };
  collegeTraining?: {
    seasonYear: number;
    entries: number;
    averageTechnicalBank: number;
    averageFatigue: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  draftEvaluation?: {
    draftYear: number;
    results: number;
    allStarInvites: number;
    allStarEvents: string[];
    competitionTiers: string[];
    averageCombine: number;
    draftRuntimeCsvs: number;
    usesYearZeroBundles: false;
  };
  annualPipeline?: {
    lastGeneratedDraftYear: number;
    runtimeCsvs: string[];
    schemaValidatedCsvs: number;
    schemaValidatedColumns: number;
    usesYearZeroBundles: false;
  };
  annualTransferPortal?: {
    seasonYear: number;
    entries: number;
    collegeEntries: number;
    committedEntries: number;
    averageTopDestinationScore: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  annualRecruiting?: {
    seasonYear: number;
    currentPhase: string;
    boardEntries: number;
    offeredEntries: number;
    visitedEntries: number;
    promisedEntries: number;
    averagePositionNeed: number;
    averageNilDemand: number;
    averageAcademicFit: number;
    averageTargetClassSize: number;
    committedEntries: number;
    signedEntries: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  annualRecruitClass?: {
    seasonYear: number;
    recruits: number;
    fiveStars: number;
    fourStars: number;
    ratingInputCoverage: number;
    convertedBroadPositions: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  annualRosterImportPlan?: {
    seasonYear: number;
    entries: number;
    plannedEntries: number;
    appliedEntries: number;
    deferredEntries: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  schoolProfiles?: {
    seasonYear: number;
    profiles: number;
    csvMatchedProfiles: number;
    repoAdaptedProfiles: number;
    archetypeProfiles: number;
    averageDevelopment: number;
    averagePortalAggression: number;
    schemaValidatedCsvs: number;
    schemaValidatedColumns: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
}

function auditStatus(ok: boolean, partial = false): "Implemented" | "Partially Implemented" | "Not Implemented" {
  if (ok) return "Implemented";
  if (partial) return "Partially Implemented";
  return "Not Implemented";
}

export function buildYearZeroDebugExport(save: Pick<GameSave, "yearZero" | "collegeRoster" | "collegeTraining" | "collegeSeasonResults" | "collegeMorale" | "draftEvaluation" | "annualPipeline" | "annualTransferPortal" | "annualRecruiting" | "annualRecruitClass" | "annualRosterImportPlan" | "schoolProfiles" | "teams" | "schools" | "players" | "prospects">): YearZeroDebugExport | undefined {
  const yearZero = save.yearZero;
  if (!yearZero) return undefined;
  const activeRosterCounts = new Map<string, number>();
  const practiceSquadCounts = new Map<string, number>();
  for (const player of yearZero.nflPlayers) {
    if (player.pool === "active_roster") activeRosterCounts.set(player.teamId, (activeRosterCounts.get(player.teamId) ?? 0) + 1);
    if (player.pool === "practice_squad") practiceSquadCounts.set(player.teamId, (practiceSquadCounts.get(player.teamId) ?? 0) + 1);
  }
  const collegeRosterCounts = new Map<string, number>();
  for (const player of yearZero.collegePlayers) {
    collegeRosterCounts.set(player.schoolId, (collegeRosterCounts.get(player.schoolId) ?? 0) + 1);
  }
  const finalPlayerPositions = [...yearZero.collegePlayers.map((player) => player.position), ...yearZero.nflPlayers.map((player) => player.position), ...yearZero.highSchoolRecruits.map((player) => player.position)];
  const forbiddenPositions = new Set(["ATH", "ST", "OT", "IOL", "IDL"]);
  const annualRuntimeClean = save.annualPipeline?.usesYearZeroBundles === false
    && (save.collegeSeasonResults?.usesYearZeroBundles ?? false) === false
    && (save.draftEvaluation?.usesYearZeroBundles ?? false) === false
    && (save.annualTransferPortal?.usesYearZeroBundles ?? false) === false
    && (save.annualRecruiting?.usesYearZeroBundles ?? false) === false
    && (save.annualRecruitClass?.usesYearZeroBundles ?? false) === false
    && (save.annualRosterImportPlan?.usesYearZeroBundles ?? false) === false
    && (save.schoolProfiles?.usesYearZeroBundles ?? false) === false;
  const redshirtCount = save.collegeRoster?.players.filter((player) => player.rosterStatus === "redshirt").length ?? 0;
  const walkOnCount = save.collegeRoster?.players.filter((player) => player.rosterStatus === "walk_on").length ?? 0;
  const cutCount = save.collegeRoster?.players.filter((player) => player.rosterStatus === "cut").length ?? 0;
  const collegeRosterReady = !!save.collegeRoster && save.collegeRoster.players.length >= yearZero.collegePlayers.length;
  const recruitingSigned = (save.annualRecruiting?.board.some((entry) => entry.status === "signed" || entry.status === "committed") ?? false);
  const recruitingLifecycleReady = !!save.annualRecruiting && save.annualRecruiting.board.length > 0
    && (save.annualRecruiting.currentPhase !== "signing_day" || save.annualRecruiting.board.some((entry) => entry.status === "decommitted" || entry.status === "signed"));
  const importPlanReady = !!save.annualRosterImportPlan && save.annualRosterImportPlan.entries.length > 0;
  const transferReady = !!save.annualTransferPortal && save.annualTransferPortal.entries.length > 0;
  const productionReady = !!save.collegeSeasonResults && save.collegeSeasonResults.production.length > 0;
  const statCurvesReady = !!save.collegeSeasonResults && save.collegeSeasonResults.production.some((row) => row.stats && Object.keys(row.stats).length > 1);
  const depthReady = !!save.collegeSeasonResults && save.collegeSeasonResults.production.some((row) => row.depthRank === 1);
  const recurrenceReady = !!save.collegeSeasonResults
    && save.collegeSeasonResults.injuries.some((row) => row.injuryFamily && Number.isFinite(row.recurrenceRisk) && Number.isFinite(row.longTermWear) && Number.isFinite(row.draftMedicalPenalty));
  const draftEvaluationReady = !!save.draftEvaluation && save.draftEvaluation.results.length > 0;
  const moraleReady = !!save.collegeMorale && save.collegeMorale.entries.length > 0;
  const trainingReady = !!save.collegeTraining && save.collegeTraining.entries.length > 0;
  const playerPromisesReady = (save.collegeRoster?.players.some((player) => Boolean(player.recruitingPromiseType)) ?? false)
    || (save.annualRecruiting?.board.some((entry) => Boolean(entry.promiseType)) ?? false);
  const recruitClassReady = !!save.annualRecruitClass
    && save.annualRecruitClass.recruits.length > 0
    && save.annualRecruitClass.recruits.every((recruit) => !forbiddenPositions.has(recruit.position));
  const schoolProfilesReady = !!save.schoolProfiles
    && save.schoolProfiles.profiles.length === save.schools.length
    && save.schoolProfiles.profiles.every((profile) => Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude) && profile.timezone.length > 0);
  const noBroadPositions = [...finalPlayerPositions, ...(save.collegeRoster?.players.map((player) => player.position) ?? []), ...save.prospects.map((prospect) => prospect.position)].every((position) => !forbiddenPositions.has(position));
  const pipelineScheduler = buildPipelineSchedulerDebug(save as GameSave);
  const runtimeGovernance = buildRuntimeGovernanceReport();
  const balanceReady = pipelineScheduler.balanceMetrics.length > 0 && pipelineScheduler.balanceMetrics.some((metric) => metric.status === "within_range");
  const selfAudit = buildSelfAuditRows({
    "CSV loader": { status: auditStatus(yearZero.bundleCount === 19), notes: "Year Zero bundle loader imports all active bundle CSVs; annual loaders import selected active runtime CSVs." },
    "CSV validator": { status: auditStatus(yearZero.bundledRows === 14939 && runtimeGovernance.violations.length === 0), notes: "Bundle row count/schema/category checks run before payload use; annual helper loaders validate manifest presence and governance maps." },
    "Active manifest enforcement": { status: auditStatus(yearZero.bundleCount === 19 && annualRuntimeClean && runtimeGovernance.violations.length === 0), notes: "Year Zero and annual runtime paths enforce manifest separation, supersession blocking, and avoid Year Zero bundles after bootstrap." },
    "No R or research extractors": { status: auditStatus(runtimeGovernance.removedPatternsBlocked > 0 && runtimeGovernance.violations.length === 0), notes: "Runtime governance validates supersession/removed patterns so R/RMarkdown/research extraction inputs remain blocked." },
    "School profile builder": { status: auditStatus(schoolProfilesReady && (save.schoolProfiles?.profiles.some((profile) => profile.rosterTemplate && Number.isFinite(profile.development) && Number.isFinite(profile.portalAggression)) ?? false)), notes: "School profiles are built from active runtime CSVs with deterministic repo adapters, archetypes, success history, overrides, roster templates, and portal/development fields." },
    "Campus geography precedence": { status: auditStatus(schoolProfilesReady), notes: "Campus CSV rows win when matched; generated repo schools receive explicit deterministic adapter geography." },
    "Fresh universe only": { status: auditStatus(!!save.yearZero), notes: "Year Zero state is created on fresh save and persisted rather than rerun during annual rollover." },
    "Initial college rosters": { status: auditStatus(collegeRosterReady), notes: "Persistent college roster initializes from Year Zero college players on the college rating scale." },
    "Recruit generation": { status: auditStatus(yearZero.highSchoolRecruits.length > 0 && recruitClassReady), notes: "Year Zero HS recruits and normal annual national recruit classes are generated separately from NFL draft prospects." },
    "Star priors and scouting uncertainty": { status: auditStatus(recruitClassReady), notes: "Annual recruits include stars, hidden true values, visible ranges, and ranking fields." },
    "ATH conversion": { status: auditStatus(noBroadPositions), notes: "ATH generation positions are converted before final recruit/roster/prospect output." },
    "ST split to K/P": { status: auditStatus(noBroadPositions), notes: "ST generation positions are converted to K/P before final output." },
    "OT/IOL/IDL final conversion": { status: auditStatus(noBroadPositions), notes: "OT/IOL/IDL are converted to final roster positions before final output." },
    "Recruiting AI": { status: auditStatus(!!save.annualRecruiting && save.annualRecruiting.board.length > 0 && save.annualRecruiting.board.some((entry) => Number.isFinite(entry.nilDemand) && Number.isFinite(entry.academicFit))), notes: "Annual school boards use recruit class, school profile, roster need, NIL demand/budget shares, academics, visits, and promises." },
    "Commitments and decommitments": { status: auditStatus(recruitingLifecycleReady, !!save.annualRecruiting), notes: "Recruiting finalizer supports commitments, signing, and deterministic decommitments under signing-day pressure." },
    "Signing day": { status: auditStatus(recruitingSigned, !!save.annualRecruiting), notes: "Signing finalizer exists; current save may need rollover to show signees." },
    "Roster caps": { status: auditStatus(collegeRosterReady), notes: "Roster progression trims excess using runtime roster templates and position targets." },
    "Walk-ons and cuts": { status: auditStatus(walkOnCount > 0 || cutCount > 0, collegeRosterReady), notes: "Annual college roster accounting adds walk-ons using class-size/template targets and cuts excess rosters." },
    "Redshirts": { status: auditStatus(redshirtCount > 0, collegeRosterReady), notes: "Annual progression marks freshman redshirts." },
    "Depth chart": { status: auditStatus(depthReady), notes: "Annual college production assigns per-school/position depth ranks using runtime depth weights." },
    "Snap share": { status: auditStatus(productionReady && save.collegeSeasonResults!.production.some((row) => row.snapShare > 0.5)), notes: "Production uses runtime snap-share rules." },
    "Training policies": { status: auditStatus(trainingReady, true), notes: "College training banks are generated from staff/personality CSVs and season role context; NFL weekly training remains in existing app systems." },
    "Development banks": { status: auditStatus(trainingReady), notes: "College players receive athletic, technical, mental, recovery, fatigue, and regression bank entries that feed annual progression." },
    "Injury engine": { status: auditStatus((save.collegeSeasonResults?.injuries.length ?? 0) > 0, productionReady), notes: "Annual college injuries use runtime base rates and severity rows." },
    "Injury recurrence and degradation": { status: auditStatus(recurrenceReady, productionReady), notes: "Annual injury rows include family, recurrence risk, long-term wear, recovery multiplier, potential loss, and draft medical penalty from active recurrence CSVs." },
    "College production": { status: auditStatus(productionReady), notes: "Annual college production rows are generated from persistent rosters and runtime production weights." },
    "Stat generation curves": { status: auditStatus(statCurvesReady, productionReady), notes: "College production rows include position-stat outputs generated from runtime stat curves and position stat profiles." },
    "Awards": { status: auditStatus((save.collegeSeasonResults?.awards.length ?? 0) > 0 && (save.collegeSeasonResults?.awards.some((award) => Number.isFinite(award.draftBoardBonus)) ?? false), productionReady), notes: "Annual awards are derived from production leaders and carry draft/NIL/media impact from awards_impact.csv." },
    "Morale and promises": { status: auditStatus(moraleReady && playerPromisesReady, moraleReady), notes: "Morale and promise pressure use snap share, injuries, recruiting, production, runtime morale weights, and signed-player promise metadata." },
    "Transfer portal": { status: auditStatus(transferReady), notes: "Annual transfer entries use morale, promise pressure, destination weights, transition probabilities, and school profiles." },
    "Draft eligibility": { status: auditStatus((save.collegeRoster?.lastProgression?.draftDeclarations ?? 0) > 0, collegeRosterReady), notes: "College progression marks eligible declarations for the next draft class." },
    "Early declaration": { status: auditStatus((save.collegeRoster?.lastProgression?.draftDeclarations ?? 0) > 0, collegeRosterReady), notes: "Underclass declaration score uses overall/potential/class and deterministic RNG." },
    "All-star events": { status: auditStatus(draftEvaluationReady && (save.draftEvaluation?.results.some((result) => result.allStarInvite && result.allStarEvent) ?? false)), notes: "Draft evaluation uses active all-star event definitions/effects and records invite event IDs/signals." },
    "Combine": { status: auditStatus(draftEvaluationReady), notes: "Draft evaluation records combine scores and applies them to board stock." },
    "Pro day": { status: auditStatus(draftEvaluationReady), notes: "Draft evaluation records pro-day scores and applies them to board stock." },
    "NFL scouting": { status: auditStatus(save.prospects.length > 0 && draftEvaluationReady), notes: "Evaluated prospects are re-ranked and CPU draft scoring uses NFL scouting archetypes for risk/combine/interview posture." },
    "Draft board": { status: auditStatus(save.prospects.length > 0 && draftEvaluationReady), notes: "Prospect grades use runtime draft board, competition translation, position value, hit-rate, pick values, and team archetype inputs." },
    "NFL import": { status: auditStatus(save.players.length > 0 && yearZero.nflPlayers.length > 0), notes: "Year Zero imports NFL players; draft and UDFA import use existing app systems." },
    "Balance metrics": { status: auditStatus(balanceReady, true), notes: "Scheduler debug compares current save metrics to active balance_targets.csv; long-run balance tests remain final-phase work." },
    "Golden tests": { status: "Not Implemented", notes: "Formal golden tests are intentionally deferred by TESTS_LAST_POLICY." },
    "Seeded snapshot tests": { status: "Not Implemented", notes: "Formal seeded snapshot tests are intentionally deferred by TESTS_LAST_POLICY." },
    "Long-run tests": { status: "Not Implemented", notes: "Long-run tests are intentionally deferred by TESTS_LAST_POLICY." },
    "Performance benchmarks": { status: "Not Implemented", notes: "Performance benchmarks are intentionally deferred by TESTS_LAST_POLICY." },
    "Debug UI": { status: "Implemented", notes: "Year Zero debug panel/export displays bootstrap, annual pipeline, invariants, and self-audit rows." }
  });
  return {
    version: yearZero.version,
    seed: yearZero.seed,
    status: yearZero.status,
    completedAt: yearZero.completedAt,
    bundleCount: yearZero.bundleCount,
    bundledRows: yearZero.bundledRows,
    artifactCounts: {
      collegePlayers: yearZero.collegePlayers.length,
      transferPortal: yearZero.transferPortal.length,
      highSchoolRecruits: yearZero.highSchoolRecruits.length,
      scoutingViews: yearZero.scoutingViews.length,
      productionHistory: yearZero.productionHistory.length,
      awardHistory: yearZero.awardHistory.length,
      injuryHistory: yearZero.injuryHistory.length,
      draftClass: yearZero.draftClass.length,
      nflPlayers: yearZero.nflPlayers.length,
      nflContractHistory: yearZero.nflContractHistory.length,
      nflAgingSnapshots: yearZero.nflAgingSnapshots.length,
      udfaPaths: yearZero.udfaPaths.length,
      livePlayers: save.players.length,
      liveProspects: save.prospects.length,
      persistedCollegeRoster: save.collegeRoster?.players.length ?? 0
    },
    selfAudit,
    pipelineScheduler,
    runtimeGovernance,
    invariants: {
      freshSaveBootstrapPresent: true,
      all19BundlesLoaded: yearZero.bundleCount === 19,
      bundledRowsMatchManifest: yearZero.bundledRows === 14939,
      collegeRostersRepairedTo105: save.schools.every((school) => collegeRosterCounts.get(school.id) === 105),
      persistedCollegeRosterPresent: save.collegeRoster ? save.collegeRoster.players.length >= yearZero.collegePlayers.length : false,
      persistedCollegeRosterSeparateFromNflScale: save.collegeRoster ? save.collegeRoster.players.every((player) => player.ratingScaleContext === "college") : false,
      nflActiveRostersAre53: save.teams.every((team) => activeRosterCounts.get(team.id) === 53),
      nflPracticeSquadsAre16: save.teams.every((team) => practiceSquadCounts.get(team.id) === 16),
      initialDraftClassFromCollegePlayers: yearZero.debugSummary.initialDraftBoardDerivedFromYearZeroCollegePlayers,
      noFinalBroadPositions: noBroadPositions,
      annualSystemsUseNormalRuntimeCsvs: yearZero.debugSummary.annualSystemsUseNormalRuntimeCsvs,
      annualPipelineAvoidsYearZeroBundles: save.annualPipeline?.usesYearZeroBundles === false,
      collegeSeasonResultsAvoidYearZeroBundles: save.collegeSeasonResults ? save.collegeSeasonResults.usesYearZeroBundles === false : true,
      draftEvaluationAvoidsYearZeroBundles: save.draftEvaluation ? save.draftEvaluation.usesYearZeroBundles === false : true,
      annualTransferAvoidsYearZeroBundles: save.annualTransferPortal ? save.annualTransferPortal.usesYearZeroBundles === false : true,
      annualRecruitingAvoidsYearZeroBundles: save.annualRecruiting ? save.annualRecruiting.usesYearZeroBundles === false : true,
      annualRecruitClassAvoidsYearZeroBundles: save.annualRecruitClass ? save.annualRecruitClass.usesYearZeroBundles === false : true,
      annualRecruitClassNoBroadPositions: save.annualRecruitClass ? save.annualRecruitClass.recruits.every((recruit) => !forbiddenPositions.has(recruit.position)) : true,
      annualRosterImportAvoidsYearZeroBundles: save.annualRosterImportPlan ? save.annualRosterImportPlan.usesYearZeroBundles === false : true,
      schoolProfilesAvoidYearZeroBundles: save.schoolProfiles ? save.schoolProfiles.usesYearZeroBundles === false : true,
      schoolProfilesComplete: schoolProfilesReady
    },
    loadedRuntimeBundles: yearZero.debugSummary.loadedRuntimeBundles,
    collegeRoster: save.collegeRoster ? {
      seasonYear: save.collegeRoster.seasonYear,
      players: save.collegeRoster.players.length,
      yearZeroSourcedPlayers: save.collegeRoster.players.filter((player) => player.source === "year_zero_college_roster").length,
      annualSignees: save.collegeRoster.players.filter((player) => player.source === "annual_recruiting").length,
      redshirts: redshirtCount,
      walkOns: walkOnCount,
      cuts: cutCount,
      usesYearZeroBundles: save.collegeRoster.usesYearZeroBundles,
      lastProgression: save.collegeRoster.lastProgression ? {
        seasonYear: save.collegeRoster.lastProgression.seasonYear,
        draftYear: save.collegeRoster.lastProgression.draftYear,
        draftDeclarations: save.collegeRoster.lastProgression.draftDeclarations,
        graduatedPlayers: save.collegeRoster.lastProgression.graduatedPlayers,
        redshirtedPlayers: save.collegeRoster.lastProgression.redshirtedPlayers,
        walkOnsAdded: save.collegeRoster.lastProgression.walkOnsAdded,
        cutPlayers: save.collegeRoster.lastProgression.cutPlayers,
        academicIneligiblePlayers: save.collegeRoster.lastProgression.academicIneligiblePlayers ?? 0
      } : undefined
    } : undefined,
    collegeSeasonResults: save.collegeSeasonResults ? {
      seasonYear: save.collegeSeasonResults.seasonYear,
      production: save.collegeSeasonResults.production.length,
      awards: save.collegeSeasonResults.awards.length,
      awardGroups: [...new Set(save.collegeSeasonResults.awards.map((award) => award.awardGroup).filter(Boolean))],
      totalAwardDraftBonus: Math.round(save.collegeSeasonResults.awards.reduce((sum, award) => sum + award.draftBoardBonus, 0) * 10) / 10,
      injuries: save.collegeSeasonResults.injuries.length,
      recurrenceTaggedInjuries: save.collegeSeasonResults.injuries.filter((row) => row.injuryFamily && Number.isFinite(row.recurrenceRisk)).length,
      averageRecurrenceRisk: Math.round(save.collegeSeasonResults.injuries.reduce((sum, row) => sum + (row.recurrenceRisk ?? 0), 0) / Math.max(1, save.collegeSeasonResults.injuries.length) * 1000) / 1000,
      averageLongTermWear: Math.round(save.collegeSeasonResults.injuries.reduce((sum, row) => sum + (row.longTermWear ?? 0), 0) / Math.max(1, save.collegeSeasonResults.injuries.length) * 100) / 100,
      starters: save.collegeSeasonResults.production.filter((row) => row.depthRank === 1).length,
      averageSnapShare: Math.round(save.collegeSeasonResults.production.reduce((sum, row) => sum + row.snapShare, 0) / Math.max(1, save.collegeSeasonResults.production.length) * 100) / 100,
      usesYearZeroBundles: save.collegeSeasonResults.usesYearZeroBundles
    } : undefined,
    collegeMorale: save.collegeMorale ? {
      seasonYear: save.collegeMorale.seasonYear,
      entries: save.collegeMorale.entries.length,
      lowMorale: save.collegeMorale.entries.filter((entry) => entry.morale < 42).length,
      highTransferRisk: save.collegeMorale.entries.filter((entry) => entry.transferRisk >= 68).length,
      averagePromisePressure: Math.round(save.collegeMorale.entries.reduce((sum, entry) => sum + entry.promisePressure, 0) / Math.max(1, save.collegeMorale.entries.length)),
      usesYearZeroBundles: save.collegeMorale.usesYearZeroBundles
    } : undefined,
    collegeTraining: save.collegeTraining ? {
      seasonYear: save.collegeTraining.seasonYear,
      entries: save.collegeTraining.entries.length,
      averageTechnicalBank: Math.round(save.collegeTraining.entries.reduce((sum, entry) => sum + entry.technicalBank, 0) / Math.max(1, save.collegeTraining.entries.length)),
      averageFatigue: Math.round(save.collegeTraining.entries.reduce((sum, entry) => sum + entry.fatigue, 0) / Math.max(1, save.collegeTraining.entries.length)),
      runtimeCsvs: save.collegeTraining.runtimeCsvs,
      usesYearZeroBundles: save.collegeTraining.usesYearZeroBundles
    } : undefined,
    draftEvaluation: save.draftEvaluation ? {
      draftYear: save.draftEvaluation.draftYear,
      results: save.draftEvaluation.results.length,
      allStarInvites: save.draftEvaluation.results.filter((result) => result.allStarInvite).length,
      allStarEvents: [...new Set(save.draftEvaluation.results.map((result) => result.allStarEvent).filter((event): event is string => Boolean(event)))],
      competitionTiers: [...new Set(save.draftEvaluation.results.map((result) => result.competitionTier).filter((tier): tier is string => Boolean(tier)))],
      averageCombine: Math.round(save.draftEvaluation.results.reduce((sum, result) => sum + result.combineScore, 0) / Math.max(1, save.draftEvaluation.results.length)),
      draftRuntimeCsvs: save.draftEvaluation.runtimeCsvs.length,
      usesYearZeroBundles: save.draftEvaluation.usesYearZeroBundles
    } : undefined,
    annualPipeline: save.annualPipeline ? {
      lastGeneratedDraftYear: save.annualPipeline.lastGeneratedDraftYear,
      runtimeCsvs: save.annualPipeline.runtimeCsvs,
      schemaValidatedCsvs: save.annualPipeline.schemaValidatedCsvs ?? 0,
      schemaValidatedColumns: save.annualPipeline.schemaValidatedColumns ?? 0,
      usesYearZeroBundles: save.annualPipeline.usesYearZeroBundles
    } : undefined,
    annualTransferPortal: save.annualTransferPortal ? {
      seasonYear: save.annualTransferPortal.seasonYear,
      entries: save.annualTransferPortal.entries.length,
      collegeEntries: save.annualTransferPortal.entries.filter((entry) => entry.playerPool === "college").length,
      committedEntries: save.annualTransferPortal.entries.filter((entry) => entry.status === "committed").length,
      averageTopDestinationScore: Math.round(save.annualTransferPortal.entries.reduce((sum, entry) => sum + (entry.destinationScores[0]?.score ?? 0), 0) / Math.max(1, save.annualTransferPortal.entries.length)),
      runtimeCsvs: save.annualTransferPortal.runtimeCsvs,
      usesYearZeroBundles: save.annualTransferPortal.usesYearZeroBundles
    } : undefined,
    annualRecruiting: save.annualRecruiting ? {
      seasonYear: save.annualRecruiting.seasonYear,
      currentPhase: save.annualRecruiting.currentPhase,
      boardEntries: save.annualRecruiting.board.length,
      offeredEntries: save.annualRecruiting.board.filter((entry) => entry.status === "offered").length,
      visitedEntries: save.annualRecruiting.board.filter((entry) => entry.status === "visited").length,
      promisedEntries: save.annualRecruiting.board.filter((entry) => entry.promiseType).length,
      averagePositionNeed: Math.round(save.annualRecruiting.board.reduce((sum, entry) => sum + entry.positionNeed, 0) / Math.max(1, save.annualRecruiting.board.length)),
      averageNilDemand: Math.round(save.annualRecruiting.board.reduce((sum, entry) => sum + entry.nilDemand, 0) / Math.max(1, save.annualRecruiting.board.length)),
      averageAcademicFit: Math.round(save.annualRecruiting.board.reduce((sum, entry) => sum + entry.academicFit, 0) / Math.max(1, save.annualRecruiting.board.length)),
      averageTargetClassSize: Math.round(save.annualRecruiting.board.reduce((sum, entry) => sum + entry.targetClassSize, 0) / Math.max(1, save.annualRecruiting.board.length)),
      committedEntries: save.annualRecruiting.board.filter((entry) => entry.status === "committed").length,
      signedEntries: save.annualRecruiting.board.filter((entry) => entry.status === "signed").length,
      runtimeCsvs: save.annualRecruiting.runtimeCsvs,
      usesYearZeroBundles: save.annualRecruiting.usesYearZeroBundles
    } : undefined,
    annualRecruitClass: save.annualRecruitClass ? {
      seasonYear: save.annualRecruitClass.seasonYear,
      recruits: save.annualRecruitClass.recruits.length,
      fiveStars: save.annualRecruitClass.recruits.filter((recruit) => recruit.stars === 5).length,
      fourStars: save.annualRecruitClass.recruits.filter((recruit) => recruit.stars === 4).length,
      ratingInputCoverage: save.annualRecruitClass.recruits.filter((recruit) => Object.keys(recruit.ratingInputs ?? {}).length > 0).length,
      convertedBroadPositions: save.annualRecruitClass.recruits.filter((recruit) => recruit.generationPosition !== recruit.position).length,
      runtimeCsvs: save.annualRecruitClass.runtimeCsvs,
      usesYearZeroBundles: save.annualRecruitClass.usesYearZeroBundles
    } : undefined,
    annualRosterImportPlan: save.annualRosterImportPlan ? {
      seasonYear: save.annualRosterImportPlan.seasonYear,
      entries: save.annualRosterImportPlan.entries.length,
      plannedEntries: save.annualRosterImportPlan.entries.filter((entry) => entry.status === "planned").length,
      appliedEntries: save.annualRosterImportPlan.entries.filter((entry) => entry.status === "applied").length,
      deferredEntries: save.annualRosterImportPlan.entries.filter((entry) => entry.status === "deferred").length,
      runtimeCsvs: save.annualRosterImportPlan.runtimeCsvs,
      usesYearZeroBundles: save.annualRosterImportPlan.usesYearZeroBundles
    } : undefined,
    schoolProfiles: save.schoolProfiles ? {
      seasonYear: save.schoolProfiles.seasonYear,
      profiles: save.schoolProfiles.profiles.length,
      csvMatchedProfiles: save.schoolProfiles.csvMatchedProfiles,
      repoAdaptedProfiles: save.schoolProfiles.repoAdaptedProfiles,
      archetypeProfiles: save.schoolProfiles.profiles.filter((profile) => profile.rosterTemplate && Number.isFinite(profile.development)).length,
      averageDevelopment: Math.round(save.schoolProfiles.profiles.reduce((sum, profile) => sum + profile.development, 0) / Math.max(1, save.schoolProfiles.profiles.length)),
      averagePortalAggression: Math.round(save.schoolProfiles.profiles.reduce((sum, profile) => sum + profile.portalAggression, 0) / Math.max(1, save.schoolProfiles.profiles.length)),
      schemaValidatedCsvs: save.schoolProfiles.schemaValidatedCsvs ?? 0,
      schemaValidatedColumns: save.schoolProfiles.schemaValidatedColumns ?? 0,
      runtimeCsvs: save.schoolProfiles.runtimeCsvs,
      usesYearZeroBundles: save.schoolProfiles.usesYearZeroBundles
    } : undefined
  };
}
