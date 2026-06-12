import rawTierRankings from "../../prospect tier rankings.txt?raw";
import type { Rng } from "../lib/rng";
import type { CollegeProgram } from "../types";

export interface ProspectSchoolTier {
  school: string;
  subdivision: string;
  tier: string;
  weight: number;
}

export type ProspectSchoolTalentContext = "elite" | "starter" | "rotation" | "depth" | "practice" | "free-agent";

export const prospectSchoolTiers: ProspectSchoolTier[] = rawTierRankings
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [school, subdivision, tier, weight] = line.split(",");
    return {
      school,
      subdivision,
      tier,
      weight: Number(weight)
    };
  })
  .filter((row) => row.school && Number.isFinite(row.weight));

function normalizeSchoolKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ʻ’'`]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const schoolTierAliases = new Map<string, string>([
  [normalizeSchoolKey("Hawaii"), normalizeSchoolKey("Hawaiʻi")],
  [normalizeSchoolKey("ETSU"), normalizeSchoolKey("East Tennessee State")],
  [normalizeSchoolKey("UAPB"), normalizeSchoolKey("Arkansas-Pine Bluff")],
  [normalizeSchoolKey("St Thomas"), normalizeSchoolKey("St. Thomas")]
]);

const exactTierBySchool = new Map(prospectSchoolTiers.map((row) => [row.school.toLowerCase(), row]));
const tierBySchool = new Map(prospectSchoolTiers.map((row) => [normalizeSchoolKey(row.school), row]));

export function prospectTierForSchool(name: string): ProspectSchoolTier | undefined {
  const key = normalizeSchoolKey(name);
  return tierBySchool.get(key) ?? tierBySchool.get(schoolTierAliases.get(key) ?? "");
}

export function prospectSchoolWeight(name: string, fallback = 1): number {
  return exactTierBySchool.get(name.toLowerCase())?.weight ?? fallback;
}

function fallbackSchoolWeight(school: CollegeProgram): number {
  const subdivisionBase = school.subdivision === "FBS" ? 0.55 : 0.16;
  const prestigeBump = Math.max(0, (school.prestige - 45) / 120);
  return Math.max(0.08, Math.min(0.75, subdivisionBase + prestigeBump));
}

function tierAmplification(weight: number, context: ProspectSchoolTalentContext): number {
  const premium = weight >= 3.25 ? 1 : weight >= 2.25 ? 0.55 : weight >= 1.25 ? 0.2 : 0;
  const power = {
    elite: 1.48,
    starter: 1.28,
    rotation: 1.08,
    depth: 0.96,
    practice: 0.88,
    "free-agent": 0.92
  }[context];
  const premiumBoost = {
    elite: 1.55,
    starter: 0.88,
    rotation: 0.35,
    depth: 0.08,
    practice: 0,
    "free-agent": 0.04
  }[context];
  return Math.pow(Math.max(0.01, weight), power) * (1 + premium * premiumBoost);
}

export function weightedProspectSchool(
  schools: CollegeProgram[],
  rng: Rng,
  context: ProspectSchoolTalentContext = "rotation"
): CollegeProgram {
  if (schools.length === 0) throw new Error("weightedProspectSchool requires at least one school.");
  const weights = schools.map((school) => tierAmplification(prospectTierForSchool(school.name)?.weight ?? fallbackSchoolWeight(school), context));
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return schools[0];
  let roll = rng.float(0, total);
  for (let index = 0; index < schools.length; index += 1) {
    roll -= Math.max(0, weights[index]);
    if (roll <= 0) return schools[index];
  }
  return schools[schools.length - 1];
}
