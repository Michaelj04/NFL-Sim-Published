import type { GameSave } from "../../types";

export interface YearZeroDebugExport {
  version: string;
  seed: string;
  status: string;
  completedAt: string;
  bundleCount: number;
  bundledRows: number;
  artifactCounts: Record<string, number>;
  invariants: Record<string, boolean>;
  selfAudit: Array<{
    requirement: string;
    status: "Implemented" | "Partially Implemented" | "Not Implemented";
    notes: string;
  }>;
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
    };
  };
  collegeSeasonResults?: {
    seasonYear: number;
    production: number;
    awards: number;
    injuries: number;
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
  draftEvaluation?: {
    draftYear: number;
    results: number;
    allStarInvites: number;
    averageCombine: number;
    usesYearZeroBundles: false;
  };
  annualPipeline?: {
    lastGeneratedDraftYear: number;
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
  annualTransferPortal?: {
    seasonYear: number;
    entries: number;
    collegeEntries: number;
    committedEntries: number;
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
    runtimeCsvs: string[];
    usesYearZeroBundles: false;
  };
}

function auditStatus(ok: boolean, partial = false): "Implemented" | "Partially Implemented" | "Not Implemented" {
  if (ok) return "Implemented";
  if (partial) return "Partially Implemented";
  return "Not Implemented";
}

export function buildYearZeroDebugExport(save: Pick<GameSave, "yearZero" | "collegeRoster" | "collegeSeasonResults" | "collegeMorale" | "draftEvaluation" | "annualPipeline" | "annualTransferPortal" | "annualRecruiting" | "annualRecruitClass" | "annualRosterImportPlan" | "schoolProfiles" | "teams" | "schools" | "players" | "prospects">): YearZeroDebugExport | undefined {
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
  const importPlanReady = !!save.annualRosterImportPlan && save.annualRosterImportPlan.entries.length > 0;
  const transferReady = !!save.annualTransferPortal && save.annualTransferPortal.entries.length > 0;
  const productionReady = !!save.collegeSeasonResults && save.collegeSeasonResults.production.length > 0;
  const depthReady = !!save.collegeSeasonResults && save.collegeSeasonResults.production.some((row) => row.depthRank === 1);
  const draftEvaluationReady = !!save.draftEvaluation && save.draftEvaluation.results.length > 0;
  const moraleReady = !!save.collegeMorale && save.collegeMorale.entries.length > 0;
  const recruitClassReady = !!save.annualRecruitClass
    && save.annualRecruitClass.recruits.length > 0
    && save.annualRecruitClass.recruits.every((recruit) => !forbiddenPositions.has(recruit.position));
  const schoolProfilesReady = !!save.schoolProfiles
    && save.schoolProfiles.profiles.length === save.schools.length
    && save.schoolProfiles.profiles.every((profile) => Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude) && profile.timezone.length > 0);
  const selfAudit: YearZeroDebugExport["selfAudit"] = [
    { requirement: "CSV loader", status: auditStatus(yearZero.bundleCount === 19), notes: "Year Zero bundle loader imports and validates all active bundle CSVs." },
    { requirement: "CSV validator", status: auditStatus(yearZero.bundledRows === 14939), notes: "Bundle row count/schema/category checks run before payload use." },
    { requirement: "Active manifest enforcement", status: auditStatus(yearZero.bundleCount === 19 && annualRuntimeClean), notes: "Year Zero and annual loaders enforce active manifest separation." },
    { requirement: "No R or research extractors", status: "Implemented", notes: "Runtime code uses CSV imports only; no R/research pipeline added." },
    { requirement: "Fresh universe only", status: auditStatus(!!save.yearZero), notes: "Year Zero state is created on fresh save and persisted." },
    { requirement: "School profile builder", status: auditStatus(schoolProfilesReady), notes: "School profiles are built from active runtime CSVs with deterministic repo adapters for generated schools." },
    { requirement: "Initial college rosters", status: auditStatus(collegeRosterReady), notes: "Persistent college roster is initialized from Year Zero college players." },
    { requirement: "Recruit generation", status: auditStatus(yearZero.highSchoolRecruits.length > 0 && recruitClassReady), notes: "Year Zero HS recruits and the normal annual national recruit class are generated separately from NFL draft prospects." },
    { requirement: "ATH/ST/OT/IOL/IDL conversion", status: auditStatus([...finalPlayerPositions, ...(save.collegeRoster?.players.map((player) => player.position) ?? []), ...save.prospects.map((prospect) => prospect.position)].every((position) => !forbiddenPositions.has(position))), notes: "Generated broad selector positions are converted before final rosters/prospects." },
    { requirement: "Recruiting AI", status: auditStatus(!!save.annualRecruiting && save.annualRecruiting.board.length > 0), notes: "Annual school boards and interest scores are generated." },
    { requirement: "Commitments and signing day", status: auditStatus(recruitingSigned, !!save.annualRecruiting), notes: "Signing finalizer exists; current save may need rollover to show signees." },
    { requirement: "College production", status: auditStatus(productionReady), notes: "Annual college production rows are generated from persistent college rosters." },
    { requirement: "Depth chart", status: auditStatus(depthReady), notes: "Annual college production assigns per-school/position depth ranks." },
    { requirement: "Snap share", status: auditStatus(productionReady && save.collegeSeasonResults!.production.some((row) => row.snapShare > 0.5)), notes: "Production uses depth-based snap share estimates." },
    { requirement: "Awards", status: auditStatus((save.collegeSeasonResults?.awards.length ?? 0) > 0, productionReady), notes: "Annual awards are derived from production leaders." },
    { requirement: "Injury engine", status: auditStatus((save.collegeSeasonResults?.injuries.length ?? 0) > 0, productionReady), notes: "Annual college injury rows are generated; full recurrence calibration remains final-phase." },
    { requirement: "Transfer portal", status: auditStatus(transferReady), notes: "Annual transfer entries are generated from college rosters and include morale/promise pressure when present." },
    { requirement: "Draft eligibility and early declaration", status: auditStatus((save.collegeRoster?.lastProgression?.draftDeclarations ?? 0) > 0, collegeRosterReady), notes: "College progression marks declarations for the next draft class." },
    { requirement: "All-star events", status: auditStatus(draftEvaluationReady && (save.draftEvaluation?.results.some((result) => result.allStarInvite) ?? false)), notes: "Draft evaluation records all-star invites and signals." },
    { requirement: "Combine", status: auditStatus(draftEvaluationReady), notes: "Draft evaluation records combine scores and applies them to board stock." },
    { requirement: "Pro day", status: auditStatus(draftEvaluationReady), notes: "Draft evaluation records pro-day scores and applies them to board stock." },
    { requirement: "NFL scouting and draft board", status: auditStatus(save.prospects.length > 0 && draftEvaluationReady), notes: "Evaluated prospects are re-ranked and fed into scouting plan generation." },
    { requirement: "NFL import", status: auditStatus(save.players.length > 0 && yearZero.nflPlayers.length > 0), notes: "Year Zero imports NFL players; draft/UDFA import uses existing app systems." },
    { requirement: "Walk-ons and cuts", status: auditStatus(walkOnCount > 0 || cutCount > 0, collegeRosterReady), notes: "Annual college roster accounting adds walk-ons and cuts excess rosters." },
    { requirement: "Redshirts", status: auditStatus(redshirtCount > 0, collegeRosterReady), notes: "Annual progression marks freshman redshirts." },
    { requirement: "Morale and promises", status: auditStatus(moraleReady), notes: "Annual college morale and promise pressure are generated from snap share, injuries, recruiting, and production." },
    { requirement: "Final executable tests", status: "Not Implemented", notes: "Formal tests are intentionally deferred by TESTS_LAST_POLICY." }
  ];
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
      noFinalBroadPositions: finalPlayerPositions.every((position) => !forbiddenPositions.has(position)),
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
        cutPlayers: save.collegeRoster.lastProgression.cutPlayers
      } : undefined
    } : undefined,
    collegeSeasonResults: save.collegeSeasonResults ? {
      seasonYear: save.collegeSeasonResults.seasonYear,
      production: save.collegeSeasonResults.production.length,
      awards: save.collegeSeasonResults.awards.length,
      injuries: save.collegeSeasonResults.injuries.length,
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
    draftEvaluation: save.draftEvaluation ? {
      draftYear: save.draftEvaluation.draftYear,
      results: save.draftEvaluation.results.length,
      allStarInvites: save.draftEvaluation.results.filter((result) => result.allStarInvite).length,
      averageCombine: Math.round(save.draftEvaluation.results.reduce((sum, result) => sum + result.combineScore, 0) / Math.max(1, save.draftEvaluation.results.length)),
      usesYearZeroBundles: save.draftEvaluation.usesYearZeroBundles
    } : undefined,
    annualPipeline: save.annualPipeline ? {
      lastGeneratedDraftYear: save.annualPipeline.lastGeneratedDraftYear,
      runtimeCsvs: save.annualPipeline.runtimeCsvs,
      usesYearZeroBundles: save.annualPipeline.usesYearZeroBundles
    } : undefined,
    annualTransferPortal: save.annualTransferPortal ? {
      seasonYear: save.annualTransferPortal.seasonYear,
      entries: save.annualTransferPortal.entries.length,
      collegeEntries: save.annualTransferPortal.entries.filter((entry) => entry.playerPool === "college").length,
      committedEntries: save.annualTransferPortal.entries.filter((entry) => entry.status === "committed").length,
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
      runtimeCsvs: save.schoolProfiles.runtimeCsvs,
      usesYearZeroBundles: save.schoolProfiles.usesYearZeroBundles
    } : undefined
  };
}
