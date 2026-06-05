import { clamp, createRng } from "../lib/rng";
import type { CollegeRosterPlayer, CollegeRosterState, GameSave, YearZeroBootstrapState } from "../types";
import { annualAcademicEligibilityWeight, annualRosterPositionTargets, annualRosterTemplate, annualRuntimeDebug, annualSchoolClassSizeRange, annualWalkOnRuleForSubdivision } from "./annualRuntime";

export function createInitialCollegeRosterState(yearZero: YearZeroBootstrapState, seasonYear: number): CollegeRosterState {
  const productionByPlayerId = new Map<string, typeof yearZero.productionHistory>();
  for (const row of yearZero.productionHistory.filter((entry) => !entry.level || entry.level === "college")) {
    productionByPlayerId.set(row.playerId, [...(productionByPlayerId.get(row.playerId) ?? []), row]);
  }
  const injuriesByPlayerId = new Map<string, typeof yearZero.injuryHistory>();
  for (const row of yearZero.injuryHistory.filter((entry) => entry.level === "college")) {
    injuriesByPlayerId.set(row.playerId, [...(injuriesByPlayerId.get(row.playerId) ?? []), row]);
  }
  return {
    seasonYear,
    players: yearZero.collegePlayers.map((player): CollegeRosterPlayer => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      schoolId: player.schoolId,
      position: player.position,
      classYear: player.classYear,
      age: player.age,
      collegeOverall: player.collegeOverall,
      collegePotential: player.collegePotential,
      ratingScaleContext: "college",
      source: "year_zero_college_roster",
      rosterStatus: "active",
      academicRisk: 0,
      academicEligible: true,
      productionHistory: productionByPlayerId.get(player.id) ?? [],
      injuryHistory: injuriesByPlayerId.get(player.id) ?? []
    })),
    runtimeCsvs: yearZero.debugSummary.loadedRuntimeBundles,
    usesYearZeroBundles: true
  };
}

export function ensureCollegeRosterState(save: GameSave): CollegeRosterState | undefined {
  if (save.collegeRoster) return save.collegeRoster;
  if (!save.yearZero) return undefined;
  return createInitialCollegeRosterState(save.yearZero, save.seasonYear);
}

export function collegeRosterCountsBySchool(state: CollegeRosterState | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of state?.players ?? []) {
    counts.set(player.schoolId, (counts.get(player.schoolId) ?? 0) + 1);
  }
  return counts;
}

function activeCollegePlayers(players: CollegeRosterPlayer[]): CollegeRosterPlayer[] {
  return players.filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason);
}

function nextClassYear(classYear: CollegeRosterPlayer["classYear"]): CollegeRosterPlayer["classYear"] {
  if (classYear === "FR") return "SO";
  if (classYear === "SO") return "JR";
  if (classYear === "RS-SO") return "JR";
  if (classYear === "JR") return "SR";
  return "SR";
}

function shouldDeclare(player: CollegeRosterPlayer, save: GameSave, draftYear: number): boolean {
  if (player.graduatedSeason || player.draftDeclaredSeason) return false;
  if (player.classYear === "SR") return true;
  if (player.classYear !== "JR" && player.classYear !== "RS-SO") return false;
  const rng = createRng(`${save.seed}:annual-college-declare:${draftYear}:${player.id}`);
  const training = save.collegeTraining?.entries.find((entry) => entry.playerId === player.id);
  const morale = save.collegeMorale?.entries.find((entry) => entry.playerId === player.id);
  const production = save.collegeSeasonResults?.production.find((entry) => entry.playerId === player.id);
  const awards = save.collegeSeasonResults?.awards.filter((entry) => entry.playerId === player.id) ?? [];
  const injuries = save.collegeSeasonResults?.injuries.filter((entry) => entry.playerId === player.id) ?? [];
  const profile = save.schoolProfiles?.profiles.find((entry) => entry.schoolId === player.schoolId);
  const nilRetention = profile?.nilPower ?? 50;
  const projectedDraftGrade = player.collegeOverall * 0.58
    + player.collegePotential * 0.18
    + (production?.productionScore ?? player.collegeOverall) * 0.16
    + awards.reduce((sum, award) => sum + award.draftBoardBonus, 0) * 1.5
    - injuries.reduce((sum, injury) => sum + injury.draftMedicalPenalty * 0.12 + injury.longTermWear * 0.08, 0);
  const personalityPush = ((training?.earlyDeclareAggression ?? 0.5) - 0.5) * 12;
  const schoolRetention = (nilRetention - 50) * -0.08 + ((morale?.morale ?? 65) - 65) * -0.05;
  const schoolSituation = (morale?.transferRisk ?? 35) * 0.04 + (morale?.promisePressure ?? 0) * 0.04;
  const classBonus = player.classYear === "JR" ? 2 : -5;
  const declarationScore = projectedDraftGrade + personalityPush + schoolRetention + schoolSituation + classBonus + rng.normal(0, 6);
  return declarationScore >= 80;
}

export function progressAnnualCollegeRoster(save: GameSave, seasonYear: number, draftYear = seasonYear + 1): CollegeRosterState | undefined {
  const current = ensureCollegeRosterState(save);
  if (!current) return undefined;
  if (current.lastProgression?.seasonYear === seasonYear) return current;
  let draftDeclarations = 0;
  let graduatedPlayers = 0;
  let redshirtedPlayers = 0;
  let cutPlayers = 0;
  let academicIneligiblePlayers = 0;
  const trainingByPlayerId = new Map((save.collegeTraining?.entries ?? []).map((entry) => [entry.playerId, entry]));
  let players = current.players.map((player) => {
    if (player.graduatedSeason) return player;
    const rng = createRng(`${save.seed}:annual-college-progression:${seasonYear}:${player.id}`);
    const declared = shouldDeclare(player, save, draftYear);
    if (declared) draftDeclarations += 1;
    const training = trainingByPlayerId.get(player.id);
    const bankGain = training
      ? (training.athleticBank * 0.006 + training.technicalBank * 0.01 + training.mentalBank * 0.006 + training.recoveryBank * 0.004 - training.fatigue * 0.006 - training.regressionPressure * 0.008)
      : 0;
    const progressedOverall = Math.round(clamp(player.collegeOverall + rng.int(0, 3) + bankGain + (player.collegePotential - player.collegeOverall > 8 ? 1 : 0), 35, player.collegePotential));
    const graduated = player.classYear === "SR";
    if (graduated) graduatedPlayers += 1;
    const academic = academicEligibilityForPlayer(save, player, seasonYear);
    if (!academic.eligible && !declared && !graduated) academicIneligiblePlayers += 1;
    return {
      ...player,
      age: player.age + 1,
      classYear: nextClassYear(player.classYear),
      collegeOverall: progressedOverall,
      collegePotential: Math.round(clamp(player.collegePotential + rng.int(-1, 1), progressedOverall, 99)),
      draftDeclaredSeason: declared ? draftYear : player.draftDeclaredSeason,
      graduatedSeason: graduated ? seasonYear : player.graduatedSeason,
      academicRisk: academic.risk,
      academicEligible: declared || graduated ? true : academic.eligible,
      rosterStatus: declared ? "declared" as const : graduated ? "graduated" as const : player.rosterStatus === "cut" ? "cut" as const : "active" as const
    };
  });
  const playersBySchool = new Map<string, CollegeRosterPlayer[]>();
  for (const player of activeCollegePlayers(players)) {
    playersBySchool.set(player.schoolId, [...(playersBySchool.get(player.schoolId) ?? []), player]);
  }
  players = players.map((player) => {
    if (player.rosterStatus !== "active" || player.classYear !== "FR" || player.redshirted) return player;
    const rng = createRng(`${save.seed}:annual-redshirt:${seasonYear}:${player.id}`);
    if (rng.next() > 0.16 || player.collegeOverall >= 72) return player;
    redshirtedPlayers += 1;
    return { ...player, rosterStatus: "redshirt" as const, redshirted: true };
  });
  const targets = annualRosterPositionTargets();
  for (const [schoolId, roster] of playersBySchool.entries()) {
    const school = save.schools.find((candidate) => candidate.id === schoolId);
    const profile = save.schoolProfiles?.profiles.find((candidate) => candidate.schoolId === schoolId);
    const template = annualRosterTemplate(profile?.subdivisionLevel ?? (school?.subdivision === "FCS" ? "FCS_LOW" : "FBS_G5"));
    const excess = roster.length - Math.max(template.rosterSize, template.scholarshipLimit);
    if (excess <= 0) continue;
    const counts = countActiveByPosition(roster);
    const cutIds = new Set(roster
      .sort((a, b) => cutPriority(a, counts, targets) - cutPriority(b, counts, targets) || a.id.localeCompare(b.id))
      .filter((player) => (counts.get(player.position) ?? 0) > (targets.get(player.position)?.minCount ?? 1))
      .slice(0, excess)
      .map((player) => player.id));
    players = players.map((player) => {
      if (player.schoolId !== schoolId || !cutIds.has(player.id)) return player;
      cutPlayers += 1;
      return { ...player, rosterStatus: "cut" as const, cutSeason: seasonYear };
    });
  }
  const walkOns = save.schools.flatMap((school) => {
    const count = activeCollegePlayers(players).filter((player) => player.schoolId === school.id).length;
    const profile = save.schoolProfiles?.profiles.find((candidate) => candidate.schoolId === school.id);
    const subdivisionLevel = profile?.subdivisionLevel ?? (school.subdivision === "FCS" ? "FCS_LOW" : "FBS_G5");
    const template = annualRosterTemplate(subdivisionLevel);
    const classRange = annualSchoolClassSizeRange(subdivisionLevel);
    const needed = Math.max(0, template.rosterSize + Math.min(template.walkonSoftCap, classRange.walkonTarget) - count);
    const walkOnRule = annualWalkOnRuleForSubdivision(subdivisionLevel);
    const positionCounts = countActiveByPosition(activeCollegePlayers(players).filter((player) => player.schoolId === school.id));
    const priorityPositions = [...targets.values()]
      .sort((a, b) => ((positionCounts.get(a.position) ?? 0) - a.targetCount) - ((positionCounts.get(b.position) ?? 0) - b.targetCount))
      .map((target) => target.position);
    return Array.from({ length: Math.min(needed, Math.max(1, Math.ceil(classRange.walkonTarget / 4))) }, (_, index): CollegeRosterPlayer => {
      const rng = createRng(`${save.seed}:annual-walk-on:${seasonYear}:${school.id}:${index + 1}`);
      const collegeOverall = Math.round(clamp(rng.normal(walkOnRule.qualityMean, walkOnRule.qualitySigma), 30, 62));
      return {
        id: `walk-on-${seasonYear}-${school.id}-${index + 1}`,
        firstName: `Walk`,
        lastName: `On${index + 1}`,
        schoolId: school.id,
        position: priorityPositions[index % priorityPositions.length] ?? rng.pick(["LB", "WR", "DL", "CB", "RB"]),
        classYear: "FR",
        age: 18,
        collegeOverall,
        collegePotential: Math.round(clamp(collegeOverall + rng.int(4, 12), collegeOverall, 68)),
        ratingScaleContext: "college",
        source: "annual_recruiting",
        rosterStatus: "walk_on",
        academicRisk: 0,
        academicEligible: true,
        signedSeason: seasonYear
      };
    });
  });
  players = [...players, ...walkOns];
  return {
    ...current,
    seasonYear,
    players,
    runtimeCsvs: [...new Set([...current.runtimeCsvs, ...(save.collegeTraining?.runtimeCsvs ?? []), ...annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("roster") || path.includes("walk_on") || path.includes("school_class_size") || path.includes("academic_eligibility"))])],
    lastProgression: {
      seasonYear,
      draftYear,
      progressedPlayers: players.length,
      draftDeclarations,
      graduatedPlayers,
      redshirtedPlayers,
      walkOnsAdded: walkOns.length,
      cutPlayers,
      academicIneligiblePlayers
    }
  };
}

function academicEligibilityForPlayer(save: GameSave, player: CollegeRosterPlayer, seasonYear: number): { risk: number; eligible: boolean } {
  const rng = createRng(`${save.seed}:academic-eligibility:${seasonYear}:${player.id}`);
  const profile = save.schoolProfiles?.profiles.find((candidate) => candidate.schoolId === player.schoolId);
  const gpa = annualAcademicEligibilityWeight("gpa_proxy");
  const testScore = annualAcademicEligibilityWeight("test_score_proxy");
  const strictness = annualAcademicEligibilityWeight("school_strictness");
  const discipline = annualAcademicEligibilityWeight("character_discipline");
  const support = annualAcademicEligibilityWeight("support_staff");
  const classRisk = player.classYear === "FR" ? 8 : player.classYear === "SO" ? 5 : player.classYear === "JR" || player.classYear === "RS-SO" ? 3 : 1;
  const disciplineProxy = clamp(player.collegeOverall * 0.45 + player.collegePotential * 0.25 + rng.normal(18, 10), 1, 100);
  const gpaProxy = clamp(player.collegeOverall * 0.35 + player.collegePotential * 0.2 + rng.normal(28, 12), 1, 100);
  const testProxy = clamp(player.collegePotential * 0.3 + rng.normal(36, 14), 1, 100);
  const strictnessPressure = (profile?.academicStrictness ?? 50) * strictness.weight;
  const supportMitigation = (profile?.development ?? 50) * support.weight * 0.35;
  const shortfall =
    Math.max(0, gpa.requiredValue - gpaProxy) * gpa.weight
    + Math.max(0, testScore.requiredValue - testProxy) * testScore.weight
    + Math.max(0, discipline.requiredValue - disciplineProxy) * discipline.weight;
  const risk = Math.round(clamp(shortfall + strictnessPressure - supportMitigation + classRisk + rng.normal(0, 4), 0, 100));
  return { risk, eligible: risk < 38 };
}

function countActiveByPosition(players: CollegeRosterPlayer[]): Map<CollegeRosterPlayer["position"], number> {
  const counts = new Map<CollegeRosterPlayer["position"], number>();
  for (const player of players) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  return counts;
}

function cutPriority(
  player: CollegeRosterPlayer,
  counts: Map<CollegeRosterPlayer["position"], number>,
  targets: ReturnType<typeof annualRosterPositionTargets>
): number {
  const target = targets.get(player.position);
  const positionExcess = Math.max(0, (counts.get(player.position) ?? 0) - (target?.targetCount ?? 4));
  const scholarshipProtection = player.source === "annual_recruiting" && player.rosterStatus !== "walk_on" ? 8 : 0;
  return player.collegeOverall - positionExcess * 3 + scholarshipProtection;
}
