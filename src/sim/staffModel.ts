import { generatedName } from "../data/names";
import { clamp, createRng, slugify, type Rng } from "../lib/rng";
import {
  POSITIONS,
  type CoachRatings,
  type CollegeProgram,
  type HealthRatings,
  type NFLTeam,
  type Position,
  type ScoutRatings,
  type ScoutingRegion,
  type StaffCandidate,
  type StaffDepartment,
  type StaffMember,
  type StaffRatings,
  type StaffRole,
  type StaffSkillProfile,
  type StaffSlotDefinition,
  type StaffSlotId
} from "../types";
import { scoutingRegionList } from "./regions";

export const staffDepartments: StaffDepartment[] = ["Coaching", "Scouting", "Health"];

export const staffSlotDefinitions: StaffSlotDefinition[] = [
  { id: "head-coach", department: "Coaching", role: "Head Coach", label: "Head Coach", shortLabel: "HC" },
  { id: "offensive-coordinator", department: "Coaching", role: "Offensive Coordinator", label: "Offensive Coordinator", shortLabel: "OC", positionFocus: ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"] },
  { id: "defensive-coordinator", department: "Coaching", role: "Defensive Coordinator", label: "Defensive Coordinator", shortLabel: "DC", positionFocus: ["EDGE", "DL", "LB", "CB", "S"] },
  { id: "special-teams-coordinator", department: "Coaching", role: "Special Teams Coordinator", label: "Special Teams Coordinator", shortLabel: "ST" },
  { id: "qb-coach", department: "Coaching", role: "QB Coach", label: "QB Coach", shortLabel: "QB", positionFocus: ["QB"] },
  { id: "rb-coach", department: "Coaching", role: "RB Coach", label: "RB Coach", shortLabel: "RB", positionFocus: ["RB"] },
  { id: "wr-coach", department: "Coaching", role: "WR Coach", label: "WR Coach", shortLabel: "WR", positionFocus: ["WR"] },
  { id: "te-coach", department: "Coaching", role: "TE Coach", label: "TE Coach", shortLabel: "TE", positionFocus: ["TE"] },
  { id: "ol-coach", department: "Coaching", role: "OL Coach", label: "OL Coach", shortLabel: "OL", positionFocus: ["LT", "LG", "C", "RG", "RT"] },
  { id: "dl-coach", department: "Coaching", role: "DL Coach", label: "DL Coach", shortLabel: "DL", positionFocus: ["EDGE", "DL"] },
  { id: "lb-coach", department: "Coaching", role: "LB Coach", label: "LB Coach", shortLabel: "LB", positionFocus: ["LB"] },
  { id: "db-coach", department: "Coaching", role: "DB Coach", label: "DB Coach", shortLabel: "DB", positionFocus: ["CB", "S"] },
  { id: "scout-1", department: "Scouting", role: "Scout", label: "Scout 1", shortLabel: "S1" },
  { id: "scout-2", department: "Scouting", role: "Scout", label: "Scout 2", shortLabel: "S2" },
  { id: "scout-3", department: "Scouting", role: "Scout", label: "Scout 3", shortLabel: "S3" },
  { id: "scout-4", department: "Scouting", role: "Scout", label: "Scout 4", shortLabel: "S4" },
  { id: "scout-5", department: "Scouting", role: "Scout", label: "Scout 5", shortLabel: "S5" },
  { id: "scout-6", department: "Scouting", role: "Scout", label: "Scout 6", shortLabel: "S6" },
  { id: "scout-7", department: "Scouting", role: "Scout", label: "Scout 7", shortLabel: "S7" },
  { id: "trainer", department: "Health", role: "Trainer", label: "Trainer", shortLabel: "TR" }
];

const slotById = new Map(staffSlotDefinitions.map((slot) => [slot.id, slot]));
const coachingPositionSlots: Partial<Record<Position, StaffSlotId[]>> = {
  QB: ["qb-coach", "offensive-coordinator", "head-coach"],
  RB: ["rb-coach", "offensive-coordinator", "head-coach"],
  WR: ["wr-coach", "offensive-coordinator", "head-coach"],
  TE: ["te-coach", "offensive-coordinator", "head-coach"],
  LT: ["ol-coach", "offensive-coordinator", "head-coach"],
  LG: ["ol-coach", "offensive-coordinator", "head-coach"],
  C: ["ol-coach", "offensive-coordinator", "head-coach"],
  RG: ["ol-coach", "offensive-coordinator", "head-coach"],
  RT: ["ol-coach", "offensive-coordinator", "head-coach"],
  EDGE: ["dl-coach", "defensive-coordinator", "head-coach"],
  DL: ["dl-coach", "defensive-coordinator", "head-coach"],
  LB: ["lb-coach", "defensive-coordinator", "head-coach"],
  CB: ["db-coach", "defensive-coordinator", "head-coach"],
  S: ["db-coach", "defensive-coordinator", "head-coach"],
  K: ["special-teams-coordinator", "head-coach"],
  P: ["special-teams-coordinator", "head-coach"]
};

const regionList: ScoutingRegion[] = scoutingRegionList;
const offensePositions = new Set<Position>(["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const defensePositions = new Set<Position>(["EDGE", "DL", "LB", "CB", "S"]);
const specialPositions = new Set<Position>(["K", "P"]);

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 50;
}

function staffValue(base: number, rng: Rng, bias = 0, dev = 11): number {
  return Math.round(clamp(rng.normal(base + bias, dev), 25, 99));
}

function keyedRatings<T extends string>(keys: readonly T[], base: number, rng: Rng, bias = 0): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, staffValue(base, rng, bias)])) as Record<T, number>;
}

export function collegeConferences(schools: CollegeProgram[]): string[] {
  return [...new Set(schools.map((school) => school.conference).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function slotDefinitionFor(slotId: StaffSlotId): StaffSlotDefinition {
  return slotById.get(slotId) ?? staffSlotDefinitions[0];
}

export function staffDepartmentFor(role: StaffRole): StaffDepartment {
  if (role === "Scout" || role.includes("Scout")) return "Scouting";
  if (role === "Trainer") return "Health";
  return "Coaching";
}

export function legacySlotFor(role: StaffRole, scoutIndex = 0): StaffSlotId {
  const direct = staffSlotDefinitions.find((slot) => slot.role === role && slot.department !== "Scouting");
  if (direct) return direct.id;
  if (role === "Scout" || role.includes("Scout")) return `scout-${Math.min(7, Math.max(1, scoutIndex + 1))}` as StaffSlotId;
  return "head-coach";
}

export function generateStaffSkillProfile(
  slot: StaffSlotDefinition,
  rng: Rng,
  staffBias: number,
  conferences: string[],
  legacyBase?: StaffRatings
): StaffSkillProfile {
  const base = Math.round(clamp((legacyBase ? Object.values(legacyBase).reduce((sum, value) => sum + value, 0) / 6 : rng.int(48, 88)) + staffBias, 25, 99));
  if (slot.department === "Scouting") {
    const positions = keyedRatings(POSITIONS, base, rng);
    const regions = keyedRatings(regionList, base, rng);
    const confs = keyedRatings(conferences, base, rng);
    const scout: ScoutRatings = {
      regions,
      positions,
      conferences: confs,
      largeSchool: staffValue(base, rng),
      smallSchool: staffValue(base, rng),
      offense: average(POSITIONS.filter((position) => offensePositions.has(position)).map((position) => positions[position])),
      defense: average(POSITIONS.filter((position) => defensePositions.has(position)).map((position) => positions[position])),
      specialTeams: average(POSITIONS.filter((position) => specialPositions.has(position)).map((position) => positions[position]))
    };
    return { type: "Scouting", scout };
  }

  if (slot.department === "Health") {
    const health: HealthRatings = {
      prevention: staffValue(base, rng, 5),
      recovery: staffValue(base, rng, 5),
      rehab: staffValue(base, rng, 4),
      staminaManagement: staffValue(base, rng),
      durabilitySupport: staffValue(base, rng, 2),
      medicalEvaluation: staffValue(base, rng, 3)
    };
    return { type: "Health", health };
  }

  const positionBump = slot.positionFocus?.length ? 4 : 0;
  const coach: CoachRatings = {
    development: staffValue(base, rng, 4),
    positionDevelopment: staffValue(base, rng, positionBump),
    schemeTeaching: staffValue(base, rng, 2),
    gamePlanning: staffValue(base, rng, slot.role.includes("Coordinator") || slot.role === "Head Coach" ? 5 : 0),
    playCalling: staffValue(base, rng, slot.role.includes("Coordinator") ? 6 : -1),
    motivation: staffValue(base, rng, slot.role === "Head Coach" ? 6 : 0),
    discipline: staffValue(base, rng),
    fatigueManagement: staffValue(base, rng),
    offense: staffValue(base, rng, slot.id === "offensive-coordinator" ? 8 : slot.positionFocus?.some((position) => offensePositions.has(position)) ? 5 : -3),
    defense: staffValue(base, rng, slot.id === "defensive-coordinator" ? 8 : slot.positionFocus?.some((position) => defensePositions.has(position)) ? 5 : -3),
    specialTeams: staffValue(base, rng, slot.id === "special-teams-coordinator" ? 10 : -4)
  };
  return { type: "Coaching", coach };
}

export function genericRatingsFromProfile(profile: StaffSkillProfile): StaffRatings {
  if (profile.scout) {
    const scout = profile.scout;
    const region = average(Object.values(scout.regions));
    const conference = average(Object.values(scout.conferences));
    const position = average(Object.values(scout.positions));
    const schoolSize = average([scout.largeSchool, scout.smallSchool]);
    const coverage = average([region, conference, position, schoolSize, scout.offense, scout.defense, scout.specialTeams]);
    return {
      tactics: average([scout.offense, scout.defense, scout.specialTeams]),
      scouting: coverage,
      medical: schoolSize,
      negotiation: coverage,
      leadership: average([region, conference]),
      advice: average([position, schoolSize, coverage])
    };
  }
  if (profile.health) {
    const health = profile.health;
    return {
      tactics: average([health.staminaManagement, health.medicalEvaluation]),
      scouting: health.medicalEvaluation,
      medical: average(Object.values(health)),
      negotiation: health.medicalEvaluation,
      leadership: average([health.rehab, health.staminaManagement]),
      advice: average([health.prevention, health.medicalEvaluation])
    };
  }
  const coach = profile.coach;
  if (!coach) return { tactics: 50, scouting: 50, medical: 50, negotiation: 50, leadership: 50, advice: 50 };
  return {
    tactics: average([coach.gamePlanning, coach.playCalling, coach.schemeTeaching]),
    scouting: average([coach.positionDevelopment, coach.schemeTeaching]),
    medical: coach.fatigueManagement,
    negotiation: coach.discipline,
    leadership: average([coach.motivation, coach.discipline]),
    advice: average([coach.gamePlanning, coach.motivation, coach.schemeTeaching])
  };
}

export function staffOverall(member: Pick<StaffMember, "department" | "skillProfile" | "ratings" | "development" | "roleFit">): number {
  const profile = member.skillProfile;
  if (profile?.scout) return genericRatingsFromProfile(profile).scouting;
  if (profile?.coach) return average([profile.coach.development, profile.coach.positionDevelopment, profile.coach.gamePlanning, profile.coach.motivation]);
  if (profile?.health) return genericRatingsFromProfile(profile).medical;
  if (member.department === "Coaching") return member.development;
  if (member.department === "Scouting") return member.ratings.scouting;
  if (member.department === "Health") return member.ratings.medical;
  return member.roleFit;
}

function staffSalaryFor(slot: StaffSlotDefinition, overall: number, rng: Rng): number {
  const departmentPremium = slot.department === "Coaching" ? 1.12 : slot.department === "Scouting" ? 0.72 : 0.78;
  const leaderPremium = slot.id === "head-coach" ? 1.55 : slot.role.includes("Coordinator") ? 1.16 : 1;
  const base = Math.pow(clamp((overall - 34) / 48, 0.08, 1.4), 1.9) * 7.2 * departmentPremium * leaderPremium;
  return Number(clamp(0.85 + base + rng.float(-0.2, 0.7), 0.8, 14).toFixed(1));
}

export function staffValueScore(candidate: Pick<StaffCandidate, "demandSalary" | "demandYears" | "skillProfile" | "ratings" | "development" | "roleFit" | "department">, slot?: StaffSlotDefinition): number {
  const overall = staffOverall(candidate);
  const expected = Math.max(1, (overall - 35) * (slot?.department === "Coaching" ? 0.16 : slot?.department === "Scouting" ? 0.1 : 0.12));
  const costDrag = candidate.demandSalary / expected + Math.max(0, candidate.demandYears - 3) * 0.08;
  return Math.round(clamp(overall * 1.35 - costDrag * 18, 20, 99));
}

export function colorTierForStaff(value: number): "poor" | "ok" | "good" | "great" | "elite" {
  if (value >= 85) return "elite";
  if (value >= 75) return "great";
  if (value >= 65) return "good";
  if (value >= 52) return "ok";
  return "poor";
}

export function scoutSpecialtyTags(member: Pick<StaffMember, "skillProfile">): string[] {
  const scout = member.skillProfile?.scout;
  if (!scout) return [];
  const topRegion = Object.entries(scout.regions).sort((a, b) => b[1] - a[1])[0];
  const topConference = Object.entries(scout.conferences).sort((a, b) => b[1] - a[1])[0];
  const topPositions = Object.entries(scout.positions).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const schoolTag = scout.largeSchool >= scout.smallSchool ? `Large ${scout.largeSchool}` : `Small ${scout.smallSchool}`;
  const unit = [
    ["Offense", scout.offense],
    ["Defense", scout.defense],
    ["ST", scout.specialTeams]
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  return [
    topRegion ? `${topRegion[0]} ${topRegion[1]}` : undefined,
    topConference ? `${topConference[0]} ${topConference[1]}` : undefined,
    ...topPositions.map(([position, score]) => `${position} ${score}`),
    schoolTag,
    unit ? `${unit[0]}+ ${unit[1]}` : undefined
  ].filter((tag): tag is string => Boolean(tag)).slice(0, 6);
}

export function conferenceRatingsForScout(member: StaffMember): Record<string, number> {
  return member.skillProfile.scout?.conferences ?? {};
}

export function createStaffMemberForSlot(
  team: NFLTeam,
  slot: StaffSlotDefinition,
  rng: Rng,
  staffBias: number,
  conferences: string[],
  usedNames?: Set<string>
): StaffMember {
  const identity = generatedName(rng, usedNames);
  const skillProfile = generateStaffSkillProfile(slot, rng, staffBias, conferences);
  const ratings = genericRatingsFromProfile(skillProfile);
  const overall = staffOverall({ department: slot.department, skillProfile, ratings, development: ratings.tactics, roleFit: ratings.advice });
  const salary = staffSalaryFor(slot, overall, rng);
  const development = skillProfile.coach ? average([skillProfile.coach.development, skillProfile.coach.positionDevelopment, skillProfile.coach.schemeTeaching]) : ratings.tactics;
  return {
    id: `${team.id}-${slot.id}-${slugify(identity.firstName)}-${slugify(identity.lastName)}`,
    ...identity,
    role: slot.role,
    slotId: slot.id,
    department: slot.department,
    teamId: team.id,
    age: rng.int(31, 69),
    salary,
    contractYears: rng.int(1, 5),
    ratings,
    skillProfile,
    development,
    roleFit: Math.round(clamp(overall + rng.int(-6, 7), 25, 99))
  };
}

function normalizeMemberForSlot(
  member: Partial<StaffMember> | undefined,
  team: NFLTeam,
  slot: StaffSlotDefinition,
  seed: string,
  conferences: string[]
): StaffMember {
  if (!member) {
    return createStaffMemberForSlot(team, slot, createRng(`${seed}:${team.id}:${slot.id}:missing-staff`), 0, conferences);
  }
  const rng = createRng(`${seed}:${team.id}:${slot.id}:${member.id ?? member.lastName ?? "legacy-staff"}`);
  const identity = member.firstName && member.lastName ? { firstName: member.firstName, lastName: member.lastName } : generatedName(rng);
  const skillProfile =
    member.skillProfile?.type === slot.department
      ? {
          ...member.skillProfile,
          scout: member.skillProfile.scout ? normalizeScoutRatings(member.skillProfile.scout, member.ratings, rng, conferences) : undefined
        }
      : generateStaffSkillProfile(slot, rng, 0, conferences, member.ratings);
  const ratings = genericRatingsFromProfile(skillProfile);
  const overall = staffOverall({ department: slot.department, skillProfile, ratings, development: member.development ?? ratings.tactics, roleFit: member.roleFit ?? ratings.advice });
  const salary = Number((member.salary ?? staffSalaryFor(slot, overall, rng)).toFixed(1));
  return {
    id: member.id?.includes(team.id) ? member.id : `${team.id}-${slot.id}-${slugify(identity.firstName)}-${slugify(identity.lastName)}`,
    firstName: identity.firstName,
    lastName: identity.lastName,
    role: slot.role,
    slotId: slot.id,
    department: slot.department,
    teamId: team.id,
    age: member.age ?? rng.int(31, 69),
    salary,
    contractYears: member.contractYears ?? rng.int(1, 5),
    ratings,
    skillProfile,
    development: skillProfile.coach ? average([skillProfile.coach.development, skillProfile.coach.positionDevelopment, skillProfile.coach.schemeTeaching]) : (member.development ?? ratings.tactics),
    roleFit: Math.round(clamp(member.roleFit ?? overall, 25, 99))
  };
}

function normalizeScoutRatings(scout: ScoutRatings, legacy: StaffRatings | undefined, rng: Rng, conferences: string[]): ScoutRatings {
  const legacyScout = scout as Partial<ScoutRatings> & {
    reportAccuracy?: number;
    projection?: number;
    discovery?: number;
    medical?: number;
    character?: number;
    analytics?: number;
  };
  const base =
    legacy?.scouting ??
    average([
      legacyScout.reportAccuracy ?? 50,
      legacyScout.projection ?? 50,
      legacyScout.discovery ?? 50,
      average(Object.values(legacyScout.positions ?? {}) as number[]),
      average(Object.values(legacyScout.regions ?? {}) as number[])
    ]);
  const positions = { ...keyedRatings(POSITIONS, base, rng), ...(legacyScout.positions ?? {}) };
  const legacyRegions = Object.fromEntries(
    Object.entries(legacyScout.regions ?? {}).filter(([region]) => regionList.includes(region as ScoutingRegion))
  ) as Partial<Record<ScoutingRegion, number>>;
  return {
    regions: { ...keyedRatings(regionList, base, rng), ...legacyRegions },
    positions,
    conferences: { ...keyedRatings(conferences, base, rng), ...(legacyScout.conferences ?? {}) },
    largeSchool: Math.round(clamp(legacyScout.largeSchool ?? base, 25, 99)),
    smallSchool: Math.round(clamp(legacyScout.smallSchool ?? base, 25, 99)),
    offense: legacyScout.offense ?? average(POSITIONS.filter((position) => offensePositions.has(position)).map((position) => positions[position] ?? base)),
    defense: legacyScout.defense ?? average(POSITIONS.filter((position) => defensePositions.has(position)).map((position) => positions[position] ?? base)),
    specialTeams: legacyScout.specialTeams ?? average(POSITIONS.filter((position) => specialPositions.has(position)).map((position) => positions[position] ?? base))
  };
}

export function normalizeStaffForTeams(staff: StaffMember[], teams: NFLTeam[], seed: string, schools: CollegeProgram[]): StaffMember[] {
  const conferences = collegeConferences(schools);
  return teams.flatMap((team) => {
    const teamStaff = staff.filter((member) => member.teamId === team.id);
    const usedLegacy = new Set<string>();
    const legacyScouts = teamStaff
      .filter((member) => member.department === "Scouting" || staffDepartmentFor(member.role) === "Scouting")
      .sort((a, b) => (b.ratings?.scouting ?? b.roleFit ?? 50) - (a.ratings?.scouting ?? a.roleFit ?? 50));
    return staffSlotDefinitions.map((slot) => {
      let match = teamStaff.find((member) => member.slotId === slot.id && !usedLegacy.has(member.id));
      if (!match && slot.department === "Scouting") {
        const scoutIndex = Number(slot.id.split("-")[1]) - 1;
        match = legacyScouts[scoutIndex];
      }
      if (!match && slot.department !== "Scouting") {
        match = teamStaff.find((member) => member.role === slot.role && !usedLegacy.has(member.id));
      }
      if (match?.id) usedLegacy.add(match.id);
      return normalizeMemberForSlot(match, team, slot, seed, conferences);
    });
  });
}

export function coachDevelopmentGrade(staff: StaffMember[], teamId: string, position: Position): number {
  const slots = coachingPositionSlots[position] ?? ["head-coach"];
  const teamStaff = staff.filter((member) => member.teamId === teamId && member.department === "Coaching");
  if (!teamStaff.length) return 58;
  const specialists = teamStaff.filter((member) => slots.includes(member.slotId));
  const specialist = specialists.length
    ? average(specialists.map((member) => average([member.skillProfile.coach?.development ?? member.development, member.skillProfile.coach?.positionDevelopment ?? member.development])))
    : 58;
  const room = average(teamStaff.map((member) => member.skillProfile.coach?.development ?? member.development));
  return Math.round(specialist * 0.65 + room * 0.35);
}

export function staffGameModifier(staff: StaffMember[], teamId: string, phase: "offense" | "defense" | "special"): number {
  const teamStaff = staff.filter((member) => member.teamId === teamId && member.department === "Coaching");
  const coordinatorId = phase === "offense" ? "offensive-coordinator" : phase === "defense" ? "defensive-coordinator" : "special-teams-coordinator";
  const head = teamStaff.find((member) => member.slotId === "head-coach")?.skillProfile.coach;
  const coordinator = teamStaff.find((member) => member.slotId === coordinatorId)?.skillProfile.coach;
  const score = average([
    coordinator?.gamePlanning ?? 58,
    coordinator?.playCalling ?? 58,
    head?.discipline ?? 58,
    head?.motivation ?? 58
  ]);
  return clamp((score - 60) * 0.08, -3.5, 3.5);
}
