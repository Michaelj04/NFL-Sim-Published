import rawTierRankings from "../../prospect tier rankings.txt?raw";

export interface ProspectSchoolTier {
  school: string;
  subdivision: string;
  tier: string;
  weight: number;
}

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

const tierBySchool = new Map(prospectSchoolTiers.map((row) => [row.school.toLowerCase(), row]));

export function prospectTierForSchool(name: string): ProspectSchoolTier | undefined {
  return tierBySchool.get(name.toLowerCase());
}

export function prospectSchoolWeight(name: string, fallback = 1): number {
  return prospectTierForSchool(name)?.weight ?? fallback;
}
