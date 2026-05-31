import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruit, AnnualRecruitingBoardEntry, AnnualRecruitingState, CollegeProgram, CollegeRosterState, Position, SchoolProfileState } from "../types";
import { annualRecruitingConfig, annualRuntimeDebug } from "./annualRuntime";
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
    const boardSize = Math.round(clamp((profile?.subdivisionLevel === "FBS_POWER" ? 30 : profile?.subdivisionLevel === "FCS_TOP" ? 24 : 22) + basePower / 10, 18, 42));
    const schoolNeeds = needsBySchool.get(school.id) ?? new Map<Position, number>();
    const schoolProspects = rng.shuffle(recruits).map((prospect) => {
      const pipelineType = pipelineTypeFor(school, prospect);
      const pipeline = config.pipelineWeights.find((row) => row.pipelineType === pipelineType);
      const positionNeed = schoolNeeds.get(prospect.position) ?? 45;
      const nilScore = Math.round(clamp((profile?.nilPower ?? basePower) * (prospect.stars / 4.2) + rng.normal(0, 5), 1, 100));
      const visitImpact = currentWeek >= 8 && currentWeek <= 13 ? Math.round(clamp(rng.normal(pipelineType === "primary" ? 7 : 3, 3), -6, 14)) : 0;
      const componentScore = config.interestWeights.reduce((sum, component) => {
        const effect = rng.float(component.minEffect, component.maxEffect);
        return sum + component.weight * effect * 100;
      }, 0);
      const pipelineBonus = pipelineType === "national" ? (pipeline?.nationalPenalty ?? 0) : (pipeline?.regionalBonus ?? 0);
      const academicFit = Math.round(clamp(100 - Math.abs((profile?.academicStrictness ?? 55) - (prospect.personality === "academic" ? 82 : 55)), 1, 100));
      const interestScore = Math.round(clamp(basePower * 0.36 + prospect.trueOverall * 0.18 + prospect.truePotential * 0.12 + positionNeed * 0.12 + nilScore * 0.08 + academicFit * 0.05 + componentScore + pipelineBonus * 100 + visitImpact + rng.normal(0, 6), 1, 100));
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
        visitImpact,
        promiseType,
        debugFactors: [
          `power ${basePower}`,
          `need ${positionNeed}`,
          `nil ${nilScore}`,
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
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("recruit")),
    usesYearZeroBundles: false
  };
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
  const bestByProspect = new Map<string, AnnualRecruitingBoardEntry>();
  for (const entry of state.board) {
    if (entry.status !== "offered" && entry.status !== "visited" && entry.status !== "committed" && entry.status !== "signed") continue;
    const current = bestByProspect.get(entry.prospectId);
    if (!current || entry.interestScore > current.interestScore || entry.interestScore === current.interestScore && entry.id.localeCompare(current.id) < 0) {
      bestByProspect.set(entry.prospectId, entry);
    }
  }
  const signedIds = new Set<string>();
  for (const entry of bestByProspect.values()) {
    const commitChance = clamp((entry.interestScore - 72) / 30 + entry.visitImpact / 100 + (entry.promiseType ? 0.04 : 0) + (entry.pipelineType === "primary" ? 0.12 : entry.pipelineType === "secondary" ? 0.04 : -0.08), 0.05, 0.96);
    if (entry.status === "signed" || entry.status === "committed" || rng.fork(entry.id).next() < commitChance) signedIds.add(entry.id);
  }
  return {
    ...state,
    currentPhase: "signing_day",
    board: state.board.map((entry) => {
      if (signedIds.has(entry.id)) return { ...entry, status: "signed" as const };
      if (bestByProspect.get(entry.prospectId)?.id === entry.id && entry.status === "offered" && entry.interestScore >= 78) return { ...entry, status: "committed" as const };
      return entry;
    })
  };
}
