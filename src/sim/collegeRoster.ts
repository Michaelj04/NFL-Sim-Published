import { clamp, createRng } from "../lib/rng";
import type { CollegeRosterPlayer, CollegeRosterState, GameSave, YearZeroBootstrapState } from "../types";
import { annualRosterPositionTargets, annualRosterTemplate, annualRuntimeDebug, annualSchoolClassSizeRange, annualWalkOnRuleForSubdivision } from "./annualRuntime";

export function createInitialCollegeRosterState(yearZero: YearZeroBootstrapState, seasonYear: number): CollegeRosterState {
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
      rosterStatus: "active"
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

function shouldDeclare(player: CollegeRosterPlayer, rngKey: string): boolean {
  if (player.graduatedSeason || player.draftDeclaredSeason) return false;
  if (player.classYear === "SR") return true;
  if (player.classYear !== "JR" && player.classYear !== "RS-SO") return false;
  const rng = createRng(rngKey);
  const declarationScore = player.collegeOverall * 0.72 + player.collegePotential * 0.28 + (player.classYear === "JR" ? 2 : -4) + rng.normal(0, 7);
  return declarationScore >= 82;
}

export function progressAnnualCollegeRoster(save: GameSave, seasonYear: number, draftYear = seasonYear + 1): CollegeRosterState | undefined {
  const current = ensureCollegeRosterState(save);
  if (!current) return undefined;
  if (current.lastProgression?.seasonYear === seasonYear) return current;
  let draftDeclarations = 0;
  let graduatedPlayers = 0;
  let redshirtedPlayers = 0;
  let cutPlayers = 0;
  const trainingByPlayerId = new Map((save.collegeTraining?.entries ?? []).map((entry) => [entry.playerId, entry]));
  let players = current.players.map((player) => {
    if (player.graduatedSeason) return player;
    const rng = createRng(`${save.seed}:annual-college-progression:${seasonYear}:${player.id}`);
    const declared = shouldDeclare(player, `${save.seed}:annual-college-declare:${draftYear}:${player.id}`);
    if (declared) draftDeclarations += 1;
    const training = trainingByPlayerId.get(player.id);
    const bankGain = training
      ? (training.athleticBank * 0.006 + training.technicalBank * 0.01 + training.mentalBank * 0.006 + training.recoveryBank * 0.004 - training.fatigue * 0.006 - training.regressionPressure * 0.008)
      : 0;
    const progressedOverall = Math.round(clamp(player.collegeOverall + rng.int(0, 3) + bankGain + (player.collegePotential - player.collegeOverall > 8 ? 1 : 0), 35, player.collegePotential));
    const graduated = player.classYear === "SR";
    if (graduated) graduatedPlayers += 1;
    return {
      ...player,
      age: player.age + 1,
      classYear: nextClassYear(player.classYear),
      collegeOverall: progressedOverall,
      collegePotential: Math.round(clamp(player.collegePotential + rng.int(-1, 1), progressedOverall, 99)),
      draftDeclaredSeason: declared ? draftYear : player.draftDeclaredSeason,
      graduatedSeason: graduated ? seasonYear : player.graduatedSeason,
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
        signedSeason: seasonYear
      };
    });
  });
  players = [...players, ...walkOns];
  return {
    ...current,
    seasonYear,
    players,
    runtimeCsvs: [...new Set([...current.runtimeCsvs, ...(save.collegeTraining?.runtimeCsvs ?? []), ...annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("roster") || path.includes("walk_on") || path.includes("school_class_size"))])],
    lastProgression: {
      seasonYear,
      draftYear,
      progressedPlayers: players.length,
      draftDeclarations,
      graduatedPlayers,
      redshirtedPlayers,
      walkOnsAdded: walkOns.length,
      cutPlayers
    }
  };
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
