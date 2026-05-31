import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import positionDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_distribution.csv?raw";
import starDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/star_distribution.csv?raw";
import stateTalentWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/state_talent_weights.csv?raw";
import { generatedName } from "../data/names";
import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruit, AnnualRecruitClassState, Position, ScoutingRegion } from "../types";

const ANNUAL_RECRUIT_CLASS_FILES = [
  "data/active_runtime_csvs/star_distribution.csv",
  "data/active_runtime_csvs/state_talent_weights.csv",
  "data/active_runtime_csvs/position_distribution.csv"
] as const;

interface ActiveManifest {
  activeRuntimeCsvs: string[];
}

interface PositionDistributionRow {
  group: string;
  weight: number;
  athleteReclassPct: number;
  heightMu: number;
  heightSigma: number;
  weightMu: number;
  weightSigma: number;
}

interface StateTalentRow {
  state: string;
  weight: number;
  region: ScoutingRegion;
}

function validateRecruitClassFiles(): void {
  const manifest = JSON.parse(manifestText) as ActiveManifest;
  const active = new Set(manifest.activeRuntimeCsvs);
  const missing = ANNUAL_RECRUIT_CLASS_FILES.filter((path) => !active.has(path));
  if (missing.length > 0) throw new Error(`Annual recruit class CSV(s) missing from active manifest: ${missing.join(", ")}`);
  const accidentalYearZero = ANNUAL_RECRUIT_CLASS_FILES.filter((path) => path.includes("/year_zero/"));
  if (accidentalYearZero.length > 0) throw new Error(`Annual recruit class cannot consume Year Zero bundles: ${accidentalYearZero.join(", ")}`);
}

export function generateAnnualRecruitClass(seed: string, seasonYear: number, targetClassSize = 6000): AnnualRecruitClassState {
  validateRecruitClassFiles();
  const rng = createRng(`${seed}:annual-recruit-class:${seasonYear}`);
  const starCounts = selectStarCounts(targetClassSize);
  const states = loadStateTalentRows();
  const positions = loadPositionDistributionRows();
  const recruits: AnnualRecruit[] = [];
  const usedNames = new Set<string>();
  const starBuckets: Array<2 | 3 | 4 | 5> = [
    ...Array.from({ length: starCounts["5"] ?? 0 }, () => 5 as const),
    ...Array.from({ length: starCounts["4"] ?? 0 }, () => 4 as const),
    ...Array.from({ length: starCounts["3"] ?? 0 }, () => 3 as const),
    ...Array.from({ length: starCounts["2"] ?? 0 }, () => 2 as const)
  ];
  for (const [index, stars] of rng.shuffle(starBuckets).entries()) {
    const name = generatedName(rng.fork(`name:${index}`), usedNames);
    const positionRow = weightedPick(positions, (row) => row.weight, rng.fork(`position:${index}`));
    const home = weightedPick(states, (row) => row.weight, rng.fork(`state:${index}`));
    const finalPosition = convertGenerationPosition(positionRow.group, rng.fork(`convert:${index}`));
    const trueOverall = recruitOverallForStars(stars, rng.fork(`overall:${index}`));
    const truePotential = Math.round(clamp(trueOverall + rng.normal(stars >= 4 ? 16 : 20, stars === 5 ? 7 : 10), 45, 99));
    const confidence = clamp(0.42 + stars * 0.08 + rng.float(-0.08, 0.08), 0.3, 0.86);
    const rangeWidth = Math.round((1 - confidence) * 26);
    recruits.push({
      id: `annual-recruit-${seasonYear}-${String(index + 1).padStart(5, "0")}`,
      firstName: name.firstName,
      lastName: name.lastName,
      position: finalPosition,
      generationPosition: positionRow.group,
      secondaryPositions: secondaryPositionsFor(finalPosition, positionRow.group, rng.fork(`secondary:${index}`)),
      homeState: home.state,
      homeRegion: home.region,
      stars,
      height: Math.round(clamp(rng.normal(positionRow.heightMu, positionRow.heightSigma), 66, 82)),
      weight: Math.round(clamp(rng.normal(positionRow.weightMu, positionRow.weightSigma), 165, 340)),
      trueOverall,
      truePotential,
      visibleOverallRange: [Math.round(clamp(trueOverall - rangeWidth, 35, 99)), Math.round(clamp(trueOverall + rangeWidth, 35, 99))],
      visiblePotentialRange: [Math.round(clamp(truePotential - rangeWidth, 40, 99)), Math.round(clamp(truePotential + rangeWidth, 40, 99))],
      nationalRank: 0,
      stateRank: 0,
      positionRank: 0,
      developmentTrait: rng.pick(["early", "steady", "late", "volatile"] as const),
      personality: rng.pick(["competitor", "homebody", "spotlight", "developer", "academic"] as const),
      debug: `${stars}-star ${positionRow.group}->${finalPosition} from ${home.state}; confidence ${Math.round(confidence * 100)} via active annual recruit CSVs.`
    });
  }
  assignRecruitRanks(recruits);
  return {
    seasonYear,
    recruits,
    classSize: recruits.length,
    starCounts,
    runtimeCsvs: [...ANNUAL_RECRUIT_CLASS_FILES],
    usesYearZeroBundles: false
  };
}

function selectStarCounts(targetClassSize: number): Record<string, number> {
  const rows = parseCsv(starDistributionText);
  const header = rows[0];
  const classSizeIndex = header.indexOf("class_size");
  const candidates = rows.slice(1).map((row) => ({
    classSize: Number(row[classSizeIndex]),
    five: Number(row[header.indexOf("stars_5")]),
    four: Number(row[header.indexOf("stars_4")]),
    three: Number(row[header.indexOf("stars_3")]),
    two: Number(row[header.indexOf("stars_2_or_unranked")])
  })).filter((row) => Number.isFinite(row.classSize));
  const selected = candidates.sort((a, b) => Math.abs(a.classSize - targetClassSize) - Math.abs(b.classSize - targetClassSize))[0];
  if (!selected) throw new Error("Annual recruit class requires star_distribution rows.");
  return { "5": selected.five, "4": selected.four, "3": selected.three, "2": selected.two };
}

function loadStateTalentRows(): StateTalentRow[] {
  const rows = parseCsv(stateTalentWeightsText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    state: row[header.indexOf("state")],
    weight: Number(row[header.indexOf("talent_weight")]) || 0,
    region: regionFromCsv(row[header.indexOf("region")])
  })).filter((row) => row.state && row.weight > 0);
}

function loadPositionDistributionRows(): PositionDistributionRow[] {
  const rows = parseCsv(positionDistributionText);
  const header = rows[0];
  return rows.slice(1).map((row) => ({
    group: row[header.indexOf("position_group")],
    weight: Number(row[header.indexOf("spawn_pct")]) || 0,
    athleteReclassPct: Number(row[header.indexOf("athlete_reclass_pct")]) || 0,
    heightMu: Number(row[header.indexOf("height_mu")]) || 73,
    heightSigma: Number(row[header.indexOf("height_sigma")]) || 2,
    weightMu: Number(row[header.indexOf("weight_mu")]) || 220,
    weightSigma: Number(row[header.indexOf("weight_sigma")]) || 18
  })).filter((row) => row.group && row.weight > 0);
}

function recruitOverallForStars(stars: 2 | 3 | 4 | 5, rng: ReturnType<typeof createRng>): number {
  const mean = stars === 5 ? 78 : stars === 4 ? 70 : stars === 3 ? 61 : 52;
  const deviation = stars === 5 ? 5 : stars === 4 ? 6 : 7;
  return Math.round(clamp(rng.normal(mean, deviation), 38, 92));
}

function convertGenerationPosition(group: string, rng: ReturnType<typeof createRng>): Position {
  if (group === "OT") return rng.pick(["LT", "RT"] as const);
  if (group === "IOL") return rng.pick(["LG", "C", "RG"] as const);
  if (group === "IDL") return "DL";
  if (group === "ST") return rng.pick(["K", "P"] as const);
  if (group === "ATH") return rng.pick(["WR", "CB", "S", "RB"] as const);
  const allowed: Position[] = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DL", "LB", "CB", "S", "K", "P"];
  if (allowed.includes(group as Position)) return group as Position;
  return "WR";
}

function secondaryPositionsFor(position: Position, group: string, rng: ReturnType<typeof createRng>): Position[] {
  if (group === "ATH") return rng.shuffle(["WR", "CB", "S", "RB"] as const).filter((candidate) => candidate !== position).slice(0, 2);
  if (position === "LT") return ["RT"];
  if (position === "RT") return ["LT"];
  if (position === "LG" || position === "C" || position === "RG") return rng.shuffle(["LG", "C", "RG"] as const).filter((candidate) => candidate !== position).slice(0, 1);
  return [];
}

function assignRecruitRanks(recruits: AnnualRecruit[]): void {
  const ranked = [...recruits].sort((a, b) => b.truePotential + b.trueOverall - (a.truePotential + a.trueOverall) || a.id.localeCompare(b.id));
  ranked.forEach((recruit, index) => {
    recruit.nationalRank = index + 1;
  });
  for (const key of ["homeState", "position"] as const) {
    const groups = new Map<string, AnnualRecruit[]>();
    for (const recruit of recruits) groups.set(String(recruit[key]), [...(groups.get(String(recruit[key])) ?? []), recruit]);
    for (const group of groups.values()) {
      group.sort((a, b) => a.nationalRank - b.nationalRank).forEach((recruit, index) => {
        if (key === "homeState") recruit.stateRank = index + 1;
        else recruit.positionRank = index + 1;
      });
    }
  }
}

function regionFromCsv(region: string): ScoutingRegion {
  if (region.includes("West")) return "West";
  if (region.includes("Midwest")) return "Midwest";
  if (region.includes("South")) return "South";
  if (region.includes("Northeast") || region.includes("East")) return "East";
  return "National";
}

function weightedPick<T>(items: T[], weightFor: (item: T) => number, rng: ReturnType<typeof createRng>): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightFor(item)), 0);
  let cursor = rng.float(0, total);
  for (const item of items) {
    cursor -= Math.max(0, weightFor(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((cell) => cell.length > 0));
}
