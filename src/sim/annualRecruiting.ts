import { clamp, createRng } from "../lib/rng";
import type {
  AnnualRecruit,
  AnnualRecruitEvaluation,
  AnnualRecruitingBoardEntry,
  AnnualRecruitingClassSummary,
  AnnualRecruitingHistoryEntry,
  AnnualRecruitingScoutAssignment,
  AnnualRecruitingState,
  CollegeProgram,
  CollegeRosterState,
  GameSave,
  Position,
  SchoolProfileState
} from "../types";
import { annualAcademicEligibilityWeight, annualNilBudgetShare, annualNilDemandWeight, annualNilMarketProxy, annualRecruitingConfig, annualRuntimeDebug, annualSchoolClassSizeRange } from "./annualRuntime";
import { geographicRegionForSchool } from "./regions";

const RECRUITING_STATUSES = ["evaluating", "offered", "visited", "committed", "decommitted", "signed", "withdrawn"] as const;
const VISIT_LIMIT = 8;
const PROMISE_LIMIT = 12;

function trueStarsForRecruit(recruit: AnnualRecruit): 2 | 3 | 4 | 5 {
  const grade = recruit.trueOverall * 0.55 + recruit.truePotential * 0.45;
  if (grade >= 84) return 5;
  if (grade >= 74) return 4;
  if (grade >= 58) return 3;
  return 2;
}

function clampStars(value: number): 2 | 3 | 4 | 5 {
  return Math.round(clamp(value, 2, 5)) as 2 | 3 | 4 | 5;
}

function weeklyPointBudget(school: CollegeProgram): number {
  return Math.round(clamp(240 + school.prestige * 3.6 + school.competition * 1.2, 320, 780));
}

function pointEffect(points = 0): number {
  return Math.sqrt(Math.max(0, points)) * 0.74;
}

function commitPatienceWeek(stars: number): number {
  if (stars >= 5) return 12;
  if (stars >= 4) return 9;
  if (stars >= 3) return 6;
  return 4;
}

function normalizeStatus(status: AnnualRecruitingBoardEntry["status"] | undefined): AnnualRecruitingBoardEntry["status"] {
  return status && RECRUITING_STATUSES.includes(status) ? status : "evaluating";
}

function pipelineTypeFor(school: CollegeProgram, recruit: AnnualRecruit): AnnualRecruitingBoardEntry["pipelineType"] {
  if (recruit.homeRegion === geographicRegionForSchool(school)) return "primary";
  if (school.subdivision === "FBS" && recruit.stars >= 4) return "secondary";
  return "national";
}

function createEvaluation(seed: string, seasonYear: number, schoolId: string, recruit: AnnualRecruit, week = 1): AnnualRecruitEvaluation {
  const rng = createRng(`${seed}:recruit-eval:${seasonYear}:${schoolId}:${recruit.id}`);
  const trueStars = trueStarsForRecruit(recruit);
  const progress = Math.round(clamp(12 + recruit.stars * 5 + rng.normal(0, 5), 8, 52));
  const confidence = Math.round(clamp(progress * 0.72 + rng.normal(0, 4), 8, 62));
  const variance = Math.max(0, Math.round((100 - confidence) / 34));
  const evaluatedStars = clampStars(trueStars + rng.pick([-1, 0, 0, 0, 1]));
  const overallSpread = Math.max(4, Math.round((100 - confidence) / 8));
  const potentialSpread = Math.max(5, Math.round((100 - confidence) / 7));
  const notes = [
    `${recruit.homeState} evaluation`,
    `${recruit.developmentTrait} development curve`,
    recruit.stars !== trueStars ? `${recruit.stars}-star consensus may be ${recruit.stars > trueStars ? "high" : "low"}` : "consensus broadly matches film"
  ];
  const riskFlags = [
    ...(recruit.developmentTrait === "volatile" ? ["volatile projection"] : []),
    ...(recruit.personality === "spotlight" ? ["NIL-sensitive"] : []),
    ...(recruit.stars > trueStars ? ["possible overrank"] : []),
    ...(recruit.stars < trueStars ? ["possible sleeper"] : [])
  ];
  return {
    id: `recruit-eval-${seasonYear}-${schoolId}-${recruit.id}`,
    schoolId,
    prospectId: recruit.id,
    evaluatedStars,
    evaluatedStarsLow: clampStars(evaluatedStars - variance),
    evaluatedStarsHigh: clampStars(evaluatedStars + variance),
    confidence,
    progress,
    projectedOverallRange: [
      Math.round(clamp(recruit.trueOverall - overallSpread, 35, 99)),
      Math.round(clamp(recruit.trueOverall + overallSpread, 35, 99))
    ],
    projectedPotentialRange: [
      Math.round(clamp(recruit.truePotential - potentialSpread, 40, 99)),
      Math.round(clamp(recruit.truePotential + potentialSpread, 40, 99))
    ],
    notes,
    riskFlags,
    lastUpdatedWeek: week
  };
}

function defaultScoutAssignments(seed: string, seasonYear: number, schools: CollegeProgram[], recruits: AnnualRecruit[]): AnnualRecruitingScoutAssignment[] {
  const recruitStates = [...new Set(recruits.map((recruit) => recruit.homeState))].sort();
  return schools.flatMap((school) => {
    const rng = createRng(`${seed}:recruit-scouts:${seasonYear}:${school.id}`);
    const homeLike = rng.shuffle(recruitStates).slice(0, 3);
    return homeLike.map((state, index) => ({
      id: `recruit-scout-${seasonYear}-${school.id}-${index + 1}`,
      schoolId: school.id,
      scoutName: `${["Regional", "Area", "Film"][index] ?? "Area"} Scout ${index + 1}`,
      stateFocus: state,
      positionFocus: "all" as const,
      effectiveness: Math.round(clamp(48 + school.prestige * 0.26 + rng.normal(0, 8), 35, 92)),
      coverage: 0,
      lastReport: "No report this week."
    }));
  });
}

function targetIdsFromBoard(board: AnnualRecruitingBoardEntry[]): Record<string, string[]> {
  const targets: Record<string, string[]> = {};
  for (const entry of board) {
    if (!["offered", "visited", "committed", "signed"].includes(entry.status)) continue;
    targets[entry.schoolId] = [...(targets[entry.schoolId] ?? []), entry.prospectId];
  }
  return Object.fromEntries(Object.entries(targets).map(([schoolId, ids]) => [schoolId, [...new Set(ids)].slice(0, 60)]));
}

function weeklyBudgetsForSchools(schools: CollegeProgram[]): Record<string, number> {
  return Object.fromEntries(schools.map((school) => [school.id, weeklyPointBudget(school)]));
}

export function classSummariesForRecruiting(
  state: AnnualRecruitingState | undefined,
  recruits: AnnualRecruit[] = [],
  schools: CollegeProgram[] = []
): AnnualRecruitingClassSummary[] {
  if (!state) return [];
  const recruitById = new Map(recruits.map((recruit) => [recruit.id, recruit]));
  const summaries = schools.map((school) => {
    const entries = state.board.filter((entry) => entry.schoolId === school.id && (entry.status === "committed" || entry.status === "signed"));
    const positionCounts: Partial<Record<Position, number>> = {};
    let stars = 0;
    let blueChips = 0;
    let points = 0;
    for (const entry of entries) {
      const recruit = recruitById.get(entry.prospectId);
      if (!recruit) continue;
      stars += recruit.stars;
      points += recruit.stars * 95 + recruit.nationalRank * -0.08 + entry.interestScore;
      if (recruit.stars >= 4) blueChips += 1;
      positionCounts[recruit.position] = (positionCounts[recruit.position] ?? 0) + 1;
    }
    return {
      schoolId: school.id,
      rank: 0,
      commits: entries.filter((entry) => entry.status === "committed").length,
      signees: entries.filter((entry) => entry.status === "signed").length,
      averageStars: entries.length ? Number((stars / entries.length).toFixed(2)) : 0,
      blueChips,
      points: Math.round(points),
      positionCounts
    };
  }).sort((a, b) => b.points - a.points || b.blueChips - a.blueChips || a.schoolId.localeCompare(b.schoolId));
  return summaries.map((summary, index) => ({ ...summary, rank: index + 1 }));
}

function addRecruitingStateDefaults(
  state: AnnualRecruitingState,
  seed: string,
  schools: CollegeProgram[],
  recruits: AnnualRecruit[],
  currentWeek = 1
): AnnualRecruitingState {
  const recruitById = new Map(recruits.map((recruit) => [recruit.id, recruit]));
  const existingEvalIds = new Set(state.evaluations?.map((evaluation) => `${evaluation.schoolId}:${evaluation.prospectId}`) ?? []);
  const boardEvaluations = state.board.flatMap((entry) => {
    const recruit = recruitById.get(entry.prospectId);
    if (!recruit || existingEvalIds.has(`${entry.schoolId}:${entry.prospectId}`)) return [];
    return [createEvaluation(seed, state.seasonYear, entry.schoolId, recruit, currentWeek)];
  });
  const normalized: AnnualRecruitingState = {
    ...state,
    board: state.board.map((entry) => ({
      ...entry,
      status: normalizeStatus(entry.status),
      weeklyPoints: Math.round(clamp(entry.weeklyPoints ?? 0, 0, 120)),
      scholarshipOffered: entry.scholarshipOffered ?? (entry.status === "offered" || entry.status === "visited" || entry.status === "committed" || entry.status === "signed"),
      nilOffer: Math.round(clamp(entry.nilOffer ?? 0, 0, 100)),
      debugFactors: entry.debugFactors ?? []
    })),
    evaluations: [...(state.evaluations ?? []), ...boardEvaluations],
    scoutAssignments: state.scoutAssignments?.length ? state.scoutAssignments : defaultScoutAssignments(seed, state.seasonYear, schools, recruits),
    weeklyPointsBySchool: { ...weeklyBudgetsForSchools(schools), ...(state.weeklyPointsBySchool ?? {}) },
    targetIdsBySchool: { ...targetIdsFromBoard(state.board), ...(state.targetIdsBySchool ?? {}) },
    removedTargetIdsBySchool: state.removedTargetIdsBySchool ?? {},
    history: state.history ?? [],
    lastResolvedWeek: state.lastResolvedWeek
  };
  return {
    ...normalized,
    classSummaries: classSummariesForRecruiting(normalized, recruits, schools)
  };
}

export function generateAnnualRecruitingState(
  seed: string,
  seasonYear: number,
  schools: CollegeProgram[],
  recruits: AnnualRecruit[],
  currentWeek = 1,
  schoolProfiles?: SchoolProfileState,
  collegeRoster?: CollegeRosterState
): AnnualRecruitingState {
  const config = annualRecruitingConfig();
  const rng = createRng(`${seed}:annual-recruiting:${seasonYear}`);
  const profileBySchool = new Map(schoolProfiles?.profiles.map((profile) => [profile.schoolId, profile]) ?? []);
  const needsBySchool = buildRosterNeeds(collegeRoster);
  const phase = config.calendar.find((row) => {
    const [start, end] = row.week.split("-").map(Number);
    return currentWeek >= start && currentWeek <= (end || start);
  }) ?? config.calendar[0];
  const board: AnnualRecruitingBoardEntry[] = [];
  for (const school of schools) {
    const power = config.schoolPower.get(school.id);
    const profile = profileBySchool.get(school.id);
    const basePower = profile?.recruitingPower ?? power?.recruitingPower ?? Math.round(school.prestige * 0.7 + school.competition * 0.25);
    const classRange = annualSchoolClassSizeRange(profile?.subdivisionLevel ?? (school.subdivision === "FCS" ? "FCS_LOW" : "FBS_G5"));
    const boardSize = Math.round(clamp(classRange.targetSignings + classRange.walkonTarget * 0.5 + basePower / 10, classRange.minSignings, classRange.maxSignings + 12));
    const nilMarket = annualNilMarketProxy(school.id);
    const schoolNeeds = needsBySchool.get(school.id) ?? new Map<Position, number>();
    const candidatePool = sampleRecruitPool(recruits, Math.max(boardSize * 2, 50), rng.fork(`pool:${school.id}`));
    const schoolProspects = candidatePool.map((prospect) => {
      const visibleOverall = (prospect.visibleOverallRange[0] + prospect.visibleOverallRange[1]) / 2;
      const visiblePotential = (prospect.visiblePotentialRange[0] + prospect.visiblePotentialRange[1]) / 2;
      const pipelineType = pipelineTypeFor(school, prospect);
      const pipeline = config.pipelineWeights.find((row) => row.pipelineType === pipelineType);
      const positionNeed = schoolNeeds.get(prospect.position) ?? 45;
      const positionMarketShare = annualNilBudgetShare(prospect.position);
      const nilDemand = Math.round(clamp(
        prospect.stars * 20 * annualNilDemandWeight("star_level")
        + positionMarketShare * 100 * annualNilDemandWeight("position_value")
        + prospect.visibleOverallRange[1] * annualNilDemandWeight("visible_overall")
        + prospect.visiblePotentialRange[1] * annualNilDemandWeight("visible_potential")
        + (nilMarket?.nilProxyScore ?? profile?.nilPower ?? basePower) * annualNilDemandWeight("school_market")
        + (prospect.personality === "spotlight" ? 88 : prospect.personality === "homebody" ? 42 : 60) * annualNilDemandWeight("personality_nil_sensitivity")
        + rng.normal(0, 4),
        1,
        100
      ));
      const nilScore = Math.round(clamp((profile?.nilPower ?? nilMarket?.nilProxyScore ?? basePower) * 0.55 + nilDemand * 0.45 + rng.normal(0, 5), 1, 100));
      const visitImpact = currentWeek >= 8 && currentWeek <= 13 ? Math.round(clamp(rng.normal(pipelineType === "primary" ? 7 : 3, 3), -6, 14)) : 0;
      const componentScore = config.interestWeights.reduce((sum, component) => {
        const effect = rng.float(component.minEffect, component.maxEffect);
        return sum + component.weight * effect * 100;
      }, 0);
      const pipelineBonus = pipelineType === "national" ? (pipeline?.nationalPenalty ?? 0) : (pipeline?.regionalBonus ?? 0);
      const academicFit = academicFitScore(profile?.academicStrictness ?? 55, prospect);
      const interestScore = Math.round(clamp(basePower * 0.32 + visibleOverall * 0.17 + visiblePotential * 0.12 + positionNeed * 0.12 + nilScore * 0.12 + academicFit * 0.06 + componentScore + pipelineBonus * 100 + visitImpact + rng.normal(0, 6), 1, 100));
      const targetPriority = Math.round(clamp(interestScore * 0.7 + positionNeed * 0.3 + (prospect.stars - 2) * 4, 1, 100));
      const promiseType = positionNeed >= 76 ? "early_playing_time" : nilScore >= 78 ? "nil_pathway" : academicFit >= 78 ? "academic_fit" : undefined;
      return {
        id: `annual-recruit-${seasonYear}-${school.id}-${prospect.id}`,
        prospectId: prospect.id,
        schoolId: school.id,
        interestScore,
        targetPriority,
        positionNeed,
        nilScore,
        nilDemand,
        academicFit,
        targetClassSize: classRange.targetSignings,
        visitImpact,
        promiseType,
        debugFactors: [
          `power ${basePower}`,
          `need ${positionNeed}`,
          `nil ${nilScore}`,
          `nilDemand ${nilDemand}`,
          `academic ${academicFit}`,
          `classTarget ${classRange.targetSignings}`,
          `pipeline ${pipelineType}`,
          `visit ${visitImpact}`
        ],
        pipelineType,
        status: interestScore > 88 && visitImpact > 0 ? "visited" as const : interestScore > 82 ? "offered" as const : "evaluating" as const
      };
    }).sort((a, b) => b.targetPriority - a.targetPriority || b.interestScore - a.interestScore || a.id.localeCompare(b.id)).slice(0, boardSize);
    board.push(...schoolProspects);
  }
  return addRecruitingStateDefaults({
    seasonYear,
    currentPhase: phase?.phase ?? "board_setup",
    board,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("recruit") || path.includes("nil_") || path.includes("academic_eligibility") || path.includes("school_class_size")),
    usesYearZeroBundles: false
  }, seed, schools, recruits, currentWeek);
}

function sampleRecruitPool(recruits: AnnualRecruit[], count: number, rng: ReturnType<typeof createRng>): AnnualRecruit[] {
  if (count >= recruits.length) return rng.shuffle(recruits);
  const selected = new Set<number>();
  while (selected.size < count) selected.add(rng.int(0, recruits.length - 1));
  return [...selected].map((index) => recruits[index]);
}

function academicFitScore(academicStrictness: number, prospect: AnnualRecruit): number {
  const gpa = annualAcademicEligibilityWeight("gpa_proxy");
  const test = annualAcademicEligibilityWeight("test_score_proxy");
  const schoolStrictness = annualAcademicEligibilityWeight("school_strictness");
  const character = annualAcademicEligibilityWeight("character_discipline");
  const support = annualAcademicEligibilityWeight("support_staff");
  const academicProfile = prospect.personality === "academic" ? 84 : prospect.personality === "competitor" ? 58 : prospect.personality === "spotlight" ? 50 : 64;
  const characterDiscipline = prospect.developmentTrait === "steady" || prospect.developmentTrait === "late" ? 68 : prospect.developmentTrait === "volatile" ? 42 : 58;
  const weighted =
    (100 - Math.abs(academicProfile - gpa.requiredValue) * 1.1) * gpa.weight +
    (100 - Math.abs(academicProfile - test.requiredValue) * 0.9) * test.weight +
    (100 - Math.max(0, academicStrictness - academicProfile)) * schoolStrictness.weight +
    (100 - Math.abs(characterDiscipline - character.requiredValue)) * character.weight +
    (100 - Math.max(0, academicStrictness - 70) * 0.35) * support.weight;
  const weightTotal = gpa.weight + test.weight + schoolStrictness.weight + character.weight + support.weight;
  return Math.round(clamp(weighted / Math.max(0.01, weightTotal), 1, 100));
}

function buildRosterNeeds(collegeRoster?: CollegeRosterState): Map<string, Map<Position, number>> {
  const targets = new Map<Position, number>([
    ["QB", 5], ["RB", 8], ["WR", 14], ["TE", 6], ["LT", 5], ["LG", 5], ["C", 4], ["RG", 5], ["RT", 5],
    ["EDGE", 9], ["DL", 9], ["LB", 10], ["CB", 10], ["S", 8], ["K", 2], ["P", 2]
  ]);
  const needs = new Map<string, Map<Position, number>>();
  if (!collegeRoster) return needs;
  for (const player of collegeRoster.players) {
    if (player.rosterStatus === "cut" || player.rosterStatus === "graduated" || player.rosterStatus === "declared") continue;
    const schoolNeeds = needs.get(player.schoolId) ?? new Map<Position, number>();
    needs.set(player.schoolId, schoolNeeds);
    schoolNeeds.set(player.position, (schoolNeeds.get(player.position) ?? 0) + 1);
  }
  for (const schoolNeeds of needs.values()) {
    for (const [position, target] of targets) {
      const count = schoolNeeds.get(position) ?? 0;
      schoolNeeds.set(position, Math.round(clamp(45 + (target - count) * 8, 10, 95)));
    }
  }
  return needs;
}

export function normalizeAnnualRecruitingState(
  state: AnnualRecruitingState | undefined,
  seed: string,
  seasonYear: number,
  schools: CollegeProgram[],
  recruits: AnnualRecruit[],
  currentWeek = 1
): AnnualRecruitingState | undefined {
  if (!state) return undefined;
  return addRecruitingStateDefaults({
    ...state,
    seasonYear: state.seasonYear ?? seasonYear,
    currentPhase: state.currentPhase ?? "board_setup",
    board: state.board ?? [],
    runtimeCsvs: state.runtimeCsvs ?? [],
    usesYearZeroBundles: false
  }, seed, schools, recruits, currentWeek);
}

function defaultEntryForRecruit(
  save: Pick<GameSave, "seed" | "seasonYear" | "schoolProfiles" | "collegeRoster">,
  school: CollegeProgram,
  recruit: AnnualRecruit,
  existingCount: number
): AnnualRecruitingBoardEntry {
  const profile = save.schoolProfiles?.profiles.find((candidate) => candidate.schoolId === school.id);
  const schoolNeeds = buildRosterNeeds(save.collegeRoster).get(school.id) ?? new Map<Position, number>();
  const pipelineType = pipelineTypeFor(school, recruit);
  const rng = createRng(`${save.seed}:manual-recruit-entry:${save.seasonYear}:${school.id}:${recruit.id}`);
  const visibleOverall = (recruit.visibleOverallRange[0] + recruit.visibleOverallRange[1]) / 2;
  const positionNeed = schoolNeeds.get(recruit.position) ?? 48;
  const basePower = profile?.recruitingPower ?? Math.round(school.prestige * 0.7 + school.competition * 0.25);
  const nilDemand = Math.round(clamp(recruit.stars * 16 + visibleOverall * 0.35 + rng.normal(0, 5), 1, 100));
  const nilScore = Math.round(clamp((profile?.nilPower ?? basePower) * 0.5 + nilDemand * 0.42 + rng.normal(0, 4), 1, 100));
  const academicFit = academicFitScore(profile?.academicStrictness ?? 55, recruit);
  const interestScore = Math.round(clamp(basePower * 0.34 + visibleOverall * 0.18 + positionNeed * 0.16 + nilScore * 0.1 + academicFit * 0.05 + (pipelineType === "primary" ? 12 : pipelineType === "secondary" ? 4 : -8) + rng.normal(0, 5), 1, 100));
  return {
    id: `annual-recruit-${save.seasonYear}-${school.id}-${recruit.id}`,
    prospectId: recruit.id,
    schoolId: school.id,
    interestScore,
    targetPriority: Math.round(clamp(interestScore * 0.7 + positionNeed * 0.3 + (recruit.stars - 2) * 4, 1, 100)),
    positionNeed,
    nilScore,
    nilDemand,
    academicFit,
    targetClassSize: Math.max(18, Math.min(32, existingCount + 1)),
    visitImpact: 0,
    debugFactors: [`manual target`, `need ${positionNeed}`, `nil ${nilScore}`, `academic ${academicFit}`, `pipeline ${pipelineType}`],
    pipelineType,
    status: "evaluating",
    weeklyPoints: 0,
    scholarshipOffered: false,
    nilOffer: 0
  };
}

function ensureSchoolRecruitEntry(save: GameSave, state: AnnualRecruitingState, schoolId: string, prospectId: string): AnnualRecruitingState {
  if (state.board.some((entry) => entry.schoolId === schoolId && entry.prospectId === prospectId)) return state;
  const school = save.schools.find((candidate) => candidate.id === schoolId);
  const recruit = save.annualRecruitClass?.recruits.find((candidate) => candidate.id === prospectId);
  if (!school || !recruit) return state;
  const entry = defaultEntryForRecruit(save, school, recruit, state.board.filter((row) => row.schoolId === schoolId).length);
  const evaluation = createEvaluation(save.seed, state.seasonYear, schoolId, recruit, save.currentWeek);
  return addRecruitingStateDefaults({
    ...state,
    board: [...state.board, entry],
    evaluations: [...(state.evaluations ?? []), evaluation],
    targetIdsBySchool: {
      ...(state.targetIdsBySchool ?? {}),
      [schoolId]: [...new Set([...(state.targetIdsBySchool?.[schoolId] ?? []), prospectId])]
    }
  }, save.seed, save.schools, save.annualRecruitClass?.recruits ?? [], save.currentWeek);
}

export function updateRecruitingPitch(
  save: GameSave,
  prospectId: string,
  updates: Partial<Pick<AnnualRecruitingBoardEntry, "weeklyPoints" | "status" | "scholarshipOffered" | "nilOffer" | "promiseType" | "visitScheduledWeek">> & { target?: boolean; removeTarget?: boolean }
): GameSave {
  if (!save.annualRecruiting || !save.annualRecruitClass || !save.selectedSchoolId) return save;
  const schoolId = save.selectedSchoolId;
  const needsNormalization = !save.annualRecruiting.weeklyPointsBySchool || !save.annualRecruiting.scoutAssignments || !save.annualRecruiting.evaluations || !save.annualRecruiting.targetIdsBySchool || !save.annualRecruiting.removedTargetIdsBySchool;
  let state = needsNormalization
    ? normalizeAnnualRecruitingState(save.annualRecruiting, save.seed, save.seasonYear, save.schools, save.annualRecruitClass.recruits, save.currentWeek)!
    : save.annualRecruiting;
  state = ensureSchoolRecruitEntry(save, state, schoolId, prospectId);
  const pointBudget = state.weeklyPointsBySchool?.[schoolId] ?? weeklyPointBudget(save.schools.find((school) => school.id === schoolId) ?? save.schools[0]);
  const currentPoints = updates.weeklyPoints === undefined ? 0 : state.board
    .filter((entry) => entry.schoolId === schoolId && entry.prospectId !== prospectId)
    .reduce((sum, entry) => sum + (entry.weeklyPoints ?? 0), 0);
  const cappedPoints = updates.weeklyPoints === undefined ? undefined : Math.round(clamp(updates.weeklyPoints, 0, Math.max(0, pointBudget - currentPoints)));
  const wantsVisitRequest = updates.status === "visited" || updates.visitScheduledWeek !== undefined;
  const wantsPromiseRequest = updates.promiseType !== undefined && updates.promiseType !== "";
  const visitsUsed = wantsVisitRequest ? state.board.filter((entry) => entry.schoolId === schoolId && entry.visitScheduledWeek !== undefined).length : 0;
  const promisesUsed = wantsPromiseRequest ? state.board.filter((entry) => entry.schoolId === schoolId && entry.promiseType).length : 0;
  const originalEntry = state.board.find((entry) => entry.schoolId === schoolId && entry.prospectId === prospectId);
  let boardChanged = false;
  const nextBoard = state.board.map((entry) => {
    if (entry.schoolId !== schoolId || entry.prospectId !== prospectId) return entry;
    const wantsVisit = updates.status === "visited" || updates.visitScheduledWeek !== undefined;
    const visitAllowed = !wantsVisit || entry.visitScheduledWeek !== undefined || visitsUsed < VISIT_LIMIT;
    const wantsPromise = updates.promiseType !== undefined && updates.promiseType !== "";
    const promiseAllowed = !wantsPromise || Boolean(entry.promiseType) || promisesUsed < PROMISE_LIMIT;
    const nilOffer = updates.nilOffer === undefined ? entry.nilOffer ?? 0 : Math.round(clamp(updates.nilOffer, 0, 100));
    const status = normalizeStatus(updates.status ?? entry.status);
    const nextEntry = {
      ...entry,
      weeklyPoints: cappedPoints ?? entry.weeklyPoints ?? 0,
      scholarshipOffered: updates.scholarshipOffered ?? entry.scholarshipOffered ?? (status === "offered" || status === "visited"),
      nilOffer,
      promiseType: promiseAllowed ? updates.promiseType ?? entry.promiseType : entry.promiseType,
      visitScheduledWeek: visitAllowed ? updates.visitScheduledWeek ?? (wantsVisit ? save.currentWeek : entry.visitScheduledWeek) : entry.visitScheduledWeek,
      status: visitAllowed && status === "visited" ? "visited" : status === "visited" ? entry.status : status,
      interestScore: Math.round(clamp(entry.interestScore + (updates.scholarshipOffered && !entry.scholarshipOffered ? 4 : 0) + (nilOffer > (entry.nilOffer ?? 0) ? 2 : 0), 1, 100))
    };
    boardChanged = boardChanged
      || nextEntry.weeklyPoints !== entry.weeklyPoints
      || nextEntry.scholarshipOffered !== entry.scholarshipOffered
      || nextEntry.nilOffer !== entry.nilOffer
      || nextEntry.promiseType !== entry.promiseType
      || nextEntry.visitScheduledWeek !== entry.visitScheduledWeek
      || nextEntry.status !== entry.status
      || nextEntry.interestScore !== entry.interestScore;
    return nextEntry;
  });
  const existingTargets = state.targetIdsBySchool?.[schoolId] ?? [];
  const existingRemoved = state.removedTargetIdsBySchool?.[schoolId] ?? [];
  const targetIds = updates.removeTarget ? existingTargets.filter((id) => id !== prospectId) : [...new Set([...existingTargets, prospectId])];
  const removedIds = updates.removeTarget ? [...new Set([...existingRemoved, prospectId])] : existingRemoved.filter((id) => id !== prospectId);
  const sameIds = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
  const targetsChanged = !sameIds(existingTargets, targetIds) || !sameIds(existingRemoved, removedIds);
  if (!needsNormalization && !boardChanged && !targetsChanged && state === save.annualRecruiting) return save;
  const classStatuses = new Set<AnnualRecruitingBoardEntry["status"]>(["committed", "signed"]);
  const nextEntry = nextBoard.find((entry) => entry.schoolId === schoolId && entry.prospectId === prospectId);
  const classSummaryChanged = Boolean(originalEntry && nextEntry && originalEntry.status !== nextEntry.status && (classStatuses.has(originalEntry.status) || classStatuses.has(nextEntry.status)));
  const nextState: AnnualRecruitingState = {
    ...state,
    board: nextBoard,
    targetIdsBySchool: { ...(state.targetIdsBySchool ?? {}), [schoolId]: targetIds },
    removedTargetIdsBySchool: { ...(state.removedTargetIdsBySchool ?? {}), [schoolId]: removedIds }
  };
  return {
    ...save,
    annualRecruiting: classSummaryChanged
      ? { ...nextState, classSummaries: classSummariesForRecruiting(nextState, save.annualRecruitClass.recruits, save.schools) }
      : nextState
  };
}

function improveEvaluation(evaluation: AnnualRecruitEvaluation, recruit: AnnualRecruit, amount: number, week: number): AnnualRecruitEvaluation {
  const trueStars = trueStarsForRecruit(recruit);
  const progress = Math.round(clamp(evaluation.progress + amount, 0, 100));
  const confidence = Math.round(clamp(evaluation.confidence + amount * 0.75, 0, 100));
  const blend = confidence / 100;
  const evaluatedStars = clampStars(evaluation.evaluatedStars * (1 - blend) + trueStars * blend);
  const variance = Math.max(0, Math.round((100 - confidence) / 34));
  const overallSpread = Math.max(2, Math.round((100 - confidence) / 10));
  const potentialSpread = Math.max(3, Math.round((100 - confidence) / 9));
  return {
    ...evaluation,
    evaluatedStars,
    evaluatedStarsLow: clampStars(evaluatedStars - variance),
    evaluatedStarsHigh: clampStars(evaluatedStars + variance),
    confidence,
    progress,
    projectedOverallRange: [
      Math.round(clamp(recruit.trueOverall - overallSpread, 35, 99)),
      Math.round(clamp(recruit.trueOverall + overallSpread, 35, 99))
    ],
    projectedPotentialRange: [
      Math.round(clamp(recruit.truePotential - potentialSpread, 40, 99)),
      Math.round(clamp(recruit.truePotential + potentialSpread, 40, 99))
    ],
    notes: [...evaluation.notes.slice(-3), confidence >= 80 ? "Grade is close to final board value." : "More scouting can still shift the grade."],
    riskFlags: [...new Set([
      ...evaluation.riskFlags,
      ...(recruit.stars > trueStars && confidence >= 60 ? ["overrank confirmed"] : []),
      ...(recruit.stars < trueStars && confidence >= 60 ? ["sleeper confirmed"] : [])
    ])],
    lastUpdatedWeek: week
  };
}

export function updateRecruitingScoutAssignment(
  save: GameSave,
  assignmentId: string,
  updates: Partial<Pick<AnnualRecruitingScoutAssignment, "stateFocus" | "positionFocus" | "targetProspectId">>
): GameSave {
  if (!save.annualRecruiting || !save.annualRecruitClass) return save;
  const needsNormalization = !save.annualRecruiting.weeklyPointsBySchool || !save.annualRecruiting.scoutAssignments || !save.annualRecruiting.evaluations || !save.annualRecruiting.targetIdsBySchool || !save.annualRecruiting.removedTargetIdsBySchool;
  const state = needsNormalization
    ? normalizeAnnualRecruitingState(save.annualRecruiting, save.seed, save.seasonYear, save.schools, save.annualRecruitClass.recruits, save.currentWeek)!
    : save.annualRecruiting;
  let changed = false;
  const scoutAssignments = (state.scoutAssignments ?? []).map((assignment) => {
    if (assignment.id !== assignmentId) return assignment;
    const nextAssignment = { ...assignment, ...updates };
    changed = changed
      || nextAssignment.stateFocus !== assignment.stateFocus
      || nextAssignment.positionFocus !== assignment.positionFocus
      || nextAssignment.targetProspectId !== assignment.targetProspectId;
    return nextAssignment;
  });
  if (!needsNormalization && !changed) return save;
  return {
    ...save,
    annualRecruiting: {
      ...state,
      scoutAssignments
    }
  };
}

export function resolveWeeklyRecruiting(save: GameSave): GameSave {
  if (!save.annualRecruiting || !save.annualRecruitClass) return save;
  const currentWeek = save.currentWeek ?? 1;
  const normalized = normalizeAnnualRecruitingState(save.annualRecruiting, save.seed, save.seasonYear, save.schools, save.annualRecruitClass.recruits, currentWeek);
  if (!normalized || normalized.lastResolvedWeek === currentWeek) return { ...save, annualRecruiting: normalized };
  const recruitById = new Map(save.annualRecruitClass.recruits.map((recruit) => [recruit.id, recruit]));
  const schoolById = new Map(save.schools.map((school) => [school.id, school]));
  const rng = createRng(`${save.seed}:weekly-recruiting:${save.seasonYear}:${currentWeek}`);
  const histories: AnnualRecruitingHistoryEntry[] = [];
  const board = normalized.board.map((entry) => {
    if (entry.status === "signed" || entry.status === "withdrawn" || entry.status === "decommitted") return entry;
    const recruit = recruitById.get(entry.prospectId);
    const school = schoolById.get(entry.schoolId);
    if (!recruit || !school) return entry;
    const isUser = entry.schoolId === save.selectedSchoolId;
    const aiPoints = isUser ? entry.weeklyPoints ?? 0 : Math.round(clamp(entry.targetPriority * 0.34 + recruit.stars * 8 + rng.normal(0, 8), 0, 90));
    const offerBonus = entry.scholarshipOffered || entry.status === "offered" || entry.status === "visited" ? 1.8 : 0;
    const visitBonus = entry.visitScheduledWeek !== undefined && currentWeek >= entry.visitScheduledWeek ? 3.8 : 0;
    const nilBonus = (entry.nilOffer ?? 0) > 0 ? Math.min(5, (entry.nilOffer ?? 0) / 18) : 0;
    const promiseBonus = entry.promiseType ? 1.4 : 0;
    const patiencePenalty = currentWeek < commitPatienceWeek(recruit.stars) ? recruit.stars * 0.34 : 0;
    const delta = Math.round(clamp(pointEffect(aiPoints) + offerBonus + visitBonus + nilBonus + promiseBonus - patiencePenalty + rng.normal(0, 1.7), -5, 11));
    const interestScore = Math.round(clamp(entry.interestScore + delta, 1, 100));
    return {
      ...entry,
      interestScore,
      weeklyPoints: isUser ? entry.weeklyPoints ?? 0 : aiPoints,
      lastInterestDelta: delta,
      status: entry.status === "evaluating" && interestScore >= 82 ? "offered" as const : entry.status
    };
  });

  const byProspect = new Map<string, AnnualRecruitingBoardEntry[]>();
  for (const entry of board) byProspect.set(entry.prospectId, [...(byProspect.get(entry.prospectId) ?? []), entry]);
  const claimed = new Set<string>();
  const resolvedBoard = board.map((entry) => {
    if (entry.status === "signed" || entry.status === "withdrawn" || entry.status === "decommitted") return entry;
    const recruit = recruitById.get(entry.prospectId);
    if (!recruit) return entry;
    const contenders = (byProspect.get(entry.prospectId) ?? []).sort((a, b) => b.interestScore - a.interestScore || a.id.localeCompare(b.id));
    const leader = contenders[0];
    const second = contenders[1];
    if (!leader || leader.id !== entry.id || claimed.has(entry.prospectId)) return entry;
    const leadGap = leader.interestScore - (second?.interestScore ?? 0);
    const eligibleWeek = currentWeek >= commitPatienceWeek(recruit.stars) || rng.next() < 0.08;
    const commitChance = eligibleWeek
      ? clamp((leader.interestScore - 78) / 38 + leadGap * 0.012 + (leader.status === "visited" ? 0.06 : 0) + (leader.promiseType ? 0.03 : 0), 0, 0.78)
      : clamp((leader.interestScore - 94) / 80, 0, 0.08);
    if ((leader.status === "offered" || leader.status === "visited" || leader.status === "committed") && rng.fork(`commit:${entry.id}`).next() < commitChance) {
      claimed.add(entry.prospectId);
      histories.push({
        id: `recruit-history-${save.seasonYear}-${currentWeek}-${entry.id}-commit`,
        week: currentWeek,
        prospectId: entry.prospectId,
        schoolId: entry.schoolId,
        type: "commit",
        summary: `${recruit.firstName} ${recruit.lastName} committed to ${schoolById.get(entry.schoolId)?.name ?? entry.schoolId}.`
      });
      return { ...entry, status: "committed" as const, committedWeek: currentWeek };
    }
    return entry;
  });

  const evaluationsByKey = new Map((normalized.evaluations ?? []).map((evaluation) => [`${evaluation.schoolId}:${evaluation.prospectId}`, evaluation]));
  const scoutReports: AnnualRecruitingScoutAssignment[] = (normalized.scoutAssignments ?? []).map((assignment) => {
    const candidates = save.annualRecruitClass!.recruits
      .filter((recruit) => recruit.homeState === assignment.stateFocus)
      .filter((recruit) => assignment.positionFocus === "all" || recruit.position === assignment.positionFocus);
    const target = assignment.targetProspectId ? recruitById.get(assignment.targetProspectId) : candidates.sort((a, b) => a.nationalRank - b.nationalRank)[0];
    if (!target) return { ...assignment, coverage: Math.round(clamp(assignment.coverage + 2, 0, 100)), lastReport: "No matching recruits in this state." };
    const key = `${assignment.schoolId}:${target.id}`;
    const current = evaluationsByKey.get(key) ?? createEvaluation(save.seed, normalized.seasonYear, assignment.schoolId, target, currentWeek);
    const gain = Math.round(clamp(4 + assignment.effectiveness / 18 + (assignment.targetProspectId ? 5 : 0), 3, 16));
    evaluationsByKey.set(key, improveEvaluation(current, target, gain, currentWeek));
    histories.push({
      id: `recruit-history-${save.seasonYear}-${currentWeek}-${assignment.id}-scout`,
      week: currentWeek,
      prospectId: target.id,
      schoolId: assignment.schoolId,
      type: "scout",
      summary: `${assignment.scoutName} updated ${target.firstName} ${target.lastName} in ${assignment.stateFocus}.`
    });
    return {
      ...assignment,
      coverage: Math.round(clamp(assignment.coverage + gain, 0, 100)),
      lastReport: `${target.firstName} ${target.lastName}: ${gain}% new coverage.`
    };
  });

  const nextState: AnnualRecruitingState = {
    ...normalized,
    currentPhase: currentWeek >= 15 ? "signing" : currentWeek >= 8 ? "official_visits" : currentWeek >= 4 ? "evaluation" : "board_setup",
    board: resolvedBoard,
    evaluations: [...evaluationsByKey.values()],
    scoutAssignments: scoutReports,
    history: [...histories, ...(normalized.history ?? [])].slice(0, 400),
    lastResolvedWeek: currentWeek
  };
  return {
    ...save,
    annualRecruiting: {
      ...nextState,
      classSummaries: classSummariesForRecruiting(nextState, save.annualRecruitClass.recruits, save.schools)
    }
  };
}

export function finalizeAnnualRecruitingState(state: AnnualRecruitingState | undefined, seed: string): AnnualRecruitingState | undefined {
  if (!state) return undefined;
  const rng = createRng(`${seed}:annual-recruiting-finalize:${state.seasonYear}`);
  const config = annualRecruitingConfig();
  const signingPhase = config.calendar.find((row) => row.phase === "signing") ?? config.calendar[config.calendar.length - 1];
  const bestByProspect = new Map<string, AnnualRecruitingBoardEntry>();
  for (const entry of state.board) {
    if (entry.status !== "offered" && entry.status !== "visited" && entry.status !== "committed" && entry.status !== "signed") continue;
    const current = bestByProspect.get(entry.prospectId);
    if (!current || entry.interestScore > current.interestScore || entry.interestScore === current.interestScore && entry.id.localeCompare(current.id) < 0) {
      bestByProspect.set(entry.prospectId, entry);
    }
  }
  const signedIds = new Set<string>();
  const decommittedIds = new Set<string>();
  for (const entry of bestByProspect.values()) {
    const commitChance = clamp((entry.interestScore - 72) / 30 + entry.visitImpact / 100 + (entry.promiseType ? 0.04 : 0) + (entry.pipelineType === "primary" ? 0.12 : entry.pipelineType === "secondary" ? 0.04 : -0.08), 0.05, 0.96);
    const decommitChance = entry.status === "committed"
      ? clamp((1 - signingPhase.commitmentPressure) * 0.12 + Math.max(0, 82 - entry.interestScore) * 0.006 + (entry.promiseType ? -0.025 : 0), 0.015, 0.28)
      : 0;
    const entryRng = rng.fork(entry.id);
    if (decommitChance > 0 && entryRng.next() < decommitChance) {
      decommittedIds.add(entry.id);
      continue;
    }
    if (entry.status === "signed" || entry.status === "committed" || entryRng.next() < commitChance) signedIds.add(entry.id);
  }
  const finalized = {
    ...state,
    currentPhase: "signing_day",
    board: state.board.map((entry) => {
      if (decommittedIds.has(entry.id)) return {
        ...entry,
        status: "decommitted" as const,
        lastInterestDelta: 0,
        debugFactors: [...entry.debugFactors, "decommit signing-day pressure"]
      };
      if (signedIds.has(entry.id)) return { ...entry, status: "signed" as const, signedWeek: 99 };
      if (bestByProspect.get(entry.prospectId)?.id === entry.id && entry.status === "offered" && entry.interestScore >= 78) return { ...entry, status: "committed" as const, committedWeek: entry.committedWeek ?? 99 };
      return entry;
    }),
    history: [
      ...[...signedIds].map((entryId): AnnualRecruitingHistoryEntry | undefined => {
        const entry = state.board.find((candidate) => candidate.id === entryId);
        if (!entry) return undefined;
        return {
          id: `recruit-history-${state.seasonYear}-99-${entry.id}-sign`,
          week: 99,
          prospectId: entry.prospectId,
          schoolId: entry.schoolId,
          type: "sign",
          summary: `${entry.prospectId} signed on signing day.`
        };
      }).filter(Boolean) as AnnualRecruitingHistoryEntry[],
      ...(state.history ?? [])
    ].slice(0, 400)
  };
  return finalized;
}
