import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruit, AnnualRecruitingBoardEntry, AnnualRecruitingState, CollegeProgram, CollegeRosterState, Position, SchoolProfileState } from "../types";
import { annualAcademicEligibilityWeight, annualNilBudgetShare, annualNilDemandWeight, annualNilMarketProxy, annualRecruitingConfig, annualRuntimeDebug, annualSchoolClassSizeRange } from "./annualRuntime";
import { geographicRegionForSchool } from "./regions";

function pipelineTypeFor(school: CollegeProgram, recruit: AnnualRecruit): AnnualRecruitingBoardEntry["pipelineType"] {
  if (recruit.homeRegion === geographicRegionForSchool(school)) return "primary";
  if (school.subdivision === "FBS" && recruit.stars >= 4) return "secondary";
  return "national";
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
  return {
    seasonYear,
    currentPhase: phase?.phase ?? "board_setup",
    board,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("recruit") || path.includes("nil_") || path.includes("academic_eligibility") || path.includes("school_class_size")),
    usesYearZeroBundles: false
  };
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
  return {
    ...state,
    currentPhase: "signing_day",
    board: state.board.map((entry) => {
      if (decommittedIds.has(entry.id)) return {
        ...entry,
        status: "decommitted" as const,
        debugFactors: [...entry.debugFactors, "decommit signing-day pressure"]
      };
      if (signedIds.has(entry.id)) return { ...entry, status: "signed" as const };
      if (bestByProspect.get(entry.prospectId)?.id === entry.id && entry.status === "offered" && entry.interestScore >= 78) return { ...entry, status: "committed" as const };
      return entry;
    })
  };
}
