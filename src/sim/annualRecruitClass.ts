import manifestText from "../../sports_sim_player_pipeline/data/active_file_manifest.json?raw";
import athConversionRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/ath_conversion_rules.csv?raw";
import formulaInputDefaultsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/formula_input_defaults.csv?raw";
import positionDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_distribution.csv?raw";
import positionDistributionRulesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_distribution_rules.csv?raw";
import positionGroupConversionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_group_conversion.csv?raw";
import positionSelectorAliasesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/position_selector_aliases.csv?raw";
import ratingAliasesText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/rating_aliases.csv?raw";
import ratingInputMappingText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/rating_input_mapping.csv?raw";
import starDistributionText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/star_distribution.csv?raw";
import stateTalentWeightsText from "../../sports_sim_player_pipeline/data/active_runtime_csvs/state_talent_weights.csv?raw";
import { generatedName } from "../data/names";
import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruit, AnnualRecruitClassState, Position, ScoutingRegion } from "../types";

const ANNUAL_RECRUIT_CLASS_FILES = [
  "data/active_runtime_csvs/star_distribution.csv",
  "data/active_runtime_csvs/state_talent_weights.csv",
  "data/active_runtime_csvs/position_distribution.csv",
  "data/active_runtime_csvs/position_distribution_rules.csv",
  "data/active_runtime_csvs/position_selector_aliases.csv",
  "data/active_runtime_csvs/position_group_conversion.csv",
  "data/active_runtime_csvs/ath_conversion_rules.csv",
  "data/active_runtime_csvs/rating_input_mapping.csv",
  "data/active_runtime_csvs/rating_aliases.csv",
  "data/active_runtime_csvs/formula_input_defaults.csv"
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

interface ConversionRow {
  sourceGroup: string;
  weights: Array<[Position, number]>;
}

interface PositionDistributionRule {
  tier: string;
  minimums: Record<string, number>;
  athTarget: number;
}

interface RatingInputRow {
  positionGroup: string;
  ratingKey: string;
  weight: number;
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
  const distributionRule = loadPositionDistributionRule("national_class");
  const selectorAliases = loadPositionSelectorAliases();
  const positionPlan = buildPositionPlan(starCounts, positions, distributionRule, selectorAliases, rng.fork("position-plan"));
  const conversions = loadConversionRows();
  const ratingMappings = loadRatingInputRows();
  const aliases = loadRatingAliases();
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
    const positionRow = positionPlan[index] ?? weightedPick(positions, (row) => row.weight, rng.fork(`position:${index}`));
    const home = weightedPick(states, (row) => row.weight, rng.fork(`state:${index}`));
    const finalPosition = convertGenerationPosition(positionRow.group, positionRow.heightMu, positionRow.weightMu, conversions, rng.fork(`convert:${index}`));
    const trueOverall = recruitOverallForStars(stars, rng.fork(`overall:${index}`));
    const truePotential = Math.round(clamp(trueOverall + rng.normal(stars >= 4 ? 16 : 20, stars === 5 ? 7 : 10), 45, 99));
    const ratingInputs = generateRatingInputs(positionRow.group, finalPosition, trueOverall, ratingMappings, aliases, rng.fork(`ratings:${index}`));
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
      ratingInputs,
      nationalRank: 0,
      stateRank: 0,
      positionRank: 0,
      developmentTrait: rng.pick(["early", "steady", "late", "volatile"] as const),
      personality: rng.pick(["competitor", "homebody", "spotlight", "developer", "academic"] as const),
      debug: `${stars}-star ${positionRow.group}->${finalPosition} from ${home.state}; confidence ${Math.round(confidence * 100)} via active annual recruit CSVs; ${distributionRule.tier} mins active; ratings ${Object.keys(ratingInputs).slice(0, 4).join("/")}.`
    });
  }
  assignRecruitRanks(recruits);
  const positionMinimumsSatisfied = positionMinimumsSatisfiedFor(recruits.map((recruit) => recruit.generationPosition), distributionRule, selectorAliases);
  return {
    seasonYear,
    recruits,
    classSize: recruits.length,
    starCounts,
    positionMinimumsSatisfied,
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

function loadPositionDistributionRule(tier: string): PositionDistributionRule {
  const rows = parseCsv(positionDistributionRulesText);
  const header = rows[0];
  const row = rows.slice(1).find((candidate) => candidate[header.indexOf("tier")] === tier);
  if (!row) throw new Error(`Annual recruit class requires position_distribution_rules tier ${tier}.`);
  return {
    tier,
    minimums: {
      QB: Number(row[header.indexOf("qb_min")]) || 0,
      RB: Number(row[header.indexOf("rb_min")]) || 0,
      WR: Number(row[header.indexOf("wr_min")]) || 0,
      TE: Number(row[header.indexOf("te_min")]) || 0,
      OL: Number(row[header.indexOf("ol_min")]) || 0,
      DL: Number(row[header.indexOf("dl_min")]) || 0,
      LB: Number(row[header.indexOf("lb_min")]) || 0,
      DB: Number(row[header.indexOf("db_min")]) || 0,
      SPEC: Number(row[header.indexOf("spec_min")]) || 0
    },
    athTarget: Number(row[header.indexOf("ath_target")]) || 0
  };
}

function loadPositionSelectorAliases(): Map<string, string[]> {
  const rows = parseCsv(positionSelectorAliasesText);
  const header = rows[0];
  const aliases = new Map<string, string[]>();
  for (const row of rows.slice(1)) {
    const alias = row[header.indexOf("alias")];
    const selectors = (row[header.indexOf("canonical_selector")] ?? "").split("|").filter(Boolean);
    if (alias && selectors.length > 0) aliases.set(alias, selectors);
  }
  return aliases;
}

function buildPositionPlan(
  starCounts: Record<string, number>,
  positions: PositionDistributionRow[],
  rule: PositionDistributionRule,
  selectorAliases: Map<string, string[]>,
  rng: ReturnType<typeof createRng>
): PositionDistributionRow[] {
  const classSize = Object.values(starCounts).reduce((sum, count) => sum + count, 0);
  const plan = Array.from({ length: classSize }, (_, index) => weightedPick(positions, (row) => row.weight, rng.fork(`initial:${index}`)));
  for (const [group, minimum] of Object.entries({ ...rule.minimums, ATH: rule.athTarget })) {
    const selectors = selectorsForGroup(group, selectorAliases);
    const matchingRows = positions.filter((row) => selectors.includes(row.group));
    while (countMatchingGroups(plan.map((row) => row.group), selectors) < minimum && matchingRows.length > 0) {
      const replacementIndex = findReplaceablePositionIndex(plan, group, rule, selectorAliases);
      if (replacementIndex < 0) break;
      plan[replacementIndex] = weightedPick(matchingRows, (row) => row.weight, rng.fork(`minimum:${group}:${replacementIndex}`));
    }
  }
  return rng.shuffle(plan);
}

function findReplaceablePositionIndex(
  plan: PositionDistributionRow[],
  targetGroup: string,
  rule: PositionDistributionRule,
  selectorAliases: Map<string, string[]>
): number {
  const groups = plan.map((row) => row.group);
  for (let index = plan.length - 1; index >= 0; index -= 1) {
    const currentGroup = broadDistributionGroup(plan[index].group, selectorAliases);
    if (currentGroup === targetGroup) continue;
    const minimum = currentGroup === "ATH" ? rule.athTarget : rule.minimums[currentGroup] ?? 0;
    if (countMatchingGroups(groups, selectorsForGroup(currentGroup, selectorAliases)) > minimum) return index;
  }
  return -1;
}

function positionMinimumsSatisfiedFor(groups: string[], rule: PositionDistributionRule, selectorAliases: Map<string, string[]>): boolean {
  for (const [group, minimum] of Object.entries({ ...rule.minimums, ATH: rule.athTarget })) {
    if (countMatchingGroups(groups, selectorsForGroup(group, selectorAliases)) < minimum) return false;
  }
  return true;
}

function selectorsForGroup(group: string, selectorAliases: Map<string, string[]>): string[] {
  if (group === "SPEC") return selectorAliases.get("SPEC") ?? selectorAliases.get("ST") ?? ["ST", "K", "P"];
  return selectorAliases.get(group) ?? [group];
}

function broadDistributionGroup(group: string, selectorAliases: Map<string, string[]>): string {
  if (group === "ST" || selectorsForGroup("SPEC", selectorAliases).includes(group)) return "SPEC";
  for (const broad of ["OL", "DL", "DB"] as const) {
    if (selectorsForGroup(broad, selectorAliases).includes(group)) return broad;
  }
  return group;
}

function countMatchingGroups(groups: string[], selectors: string[]): number {
  return groups.filter((group) => selectors.includes(group)).length;
}

function loadConversionRows(): Map<string, ConversionRow> {
  const rows = parseCsv(positionGroupConversionText);
  const header = rows[0];
  const sourceIndex = header.indexOf("source_group");
  const weightsIndex = header.indexOf("default_weights_json");
  const conversions = new Map<string, ConversionRow>();
  for (const row of rows.slice(1)) {
    const parsed = JSON.parse(row[weightsIndex] || "{}") as Record<string, number>;
    conversions.set(row[sourceIndex], {
      sourceGroup: row[sourceIndex],
      weights: Object.entries(parsed).map(([position, weight]) => [position as Position, Number(weight) || 0])
    });
  }
  return conversions;
}

function loadRatingAliases(): Map<string, string> {
  const rows = parseCsv(ratingAliasesText);
  const header = rows[0];
  return new Map(rows.slice(1).map((row) => [row[header.indexOf("alias")], row[header.indexOf("canonical_rating")]]));
}

function loadRatingInputRows(): Map<string, RatingInputRow[]> {
  const rows = parseCsv(ratingInputMappingText);
  const header = rows[0];
  const groupIndex = header.indexOf("position_group");
  const groups = new Map<string, RatingInputRow[]>();
  for (const row of rows.slice(1)) {
    const group = row[groupIndex];
    const list = groups.get(group) ?? [];
    groups.set(group, list);
    list.push({
      positionGroup: group,
      ratingKey: row[header.indexOf("rating_key")],
      weight: Number(row[header.indexOf("weight")]) || 0
    });
  }
  return groups;
}

function recruitOverallForStars(stars: 2 | 3 | 4 | 5, rng: ReturnType<typeof createRng>): number {
  const mean = stars === 5 ? 78 : stars === 4 ? 70 : stars === 3 ? 61 : 52;
  const deviation = stars === 5 ? 5 : stars === 4 ? 6 : 7;
  return Math.round(clamp(rng.normal(mean, deviation), 38, 92));
}

function convertGenerationPosition(group: string, height: number, weight: number, conversions: Map<string, ConversionRow>, rng: ReturnType<typeof createRng>): Position {
  if (group === "ATH") {
    const athWeights = athConversionWeights(height, weight);
    return weightedPick(athWeights.map(([position, positionWeight]) => ({ position, positionWeight })), (row) => row.positionWeight, rng).position;
  }
  const conversion = conversions.get(group);
  if (conversion) return weightedPick(conversion.weights.map(([position, positionWeight]) => ({ position, positionWeight })), (row) => row.positionWeight, rng).position;
  const allowed: Position[] = ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "EDGE", "DL", "LB", "CB", "S", "K", "P"];
  if (allowed.includes(group as Position)) return group as Position;
  return "WR";
}

function athConversionWeights(height: number, weight: number): Array<[Position, number]> {
  const rows = parseCsv(athConversionRulesText);
  const header = rows[0];
  const candidates: Array<[Position, number]> = [];
  for (const row of rows.slice(1)) {
    const minHeight = Number(row[header.indexOf("height_min_in")]) || 0;
    const maxHeight = Number(row[header.indexOf("height_max_in")]) || 99;
    const minWeight = Number(row[header.indexOf("weight_min_lb")]) || 0;
    const maxWeight = Number(row[header.indexOf("weight_max_lb")]) || 999;
    if (height < minHeight || height > maxHeight || weight < minWeight || weight > maxWeight) continue;
    const bias = Number(row[header.indexOf("speed_bias")]) || 0.5;
    for (const position of (row[header.indexOf("primary_map")] ?? "").split("|").filter(Boolean)) {
      candidates.push([position === "IDL" ? "DL" : position as Position, bias]);
    }
  }
  return candidates.length ? candidates : [["WR", 0.24], ["CB", 0.18], ["S", 0.18], ["RB", 0.18], ["LB", 0.14], ["TE", 0.08]];
}

function generateRatingInputs(
  generationGroup: string,
  finalPosition: Position,
  trueOverall: number,
  mappings: Map<string, RatingInputRow[]>,
  aliases: Map<string, string>,
  rng: ReturnType<typeof createRng>
): Record<string, number> {
  const group = generationGroup === "LT" || generationGroup === "RT" ? "OT" : generationGroup === "LG" || generationGroup === "C" || generationGroup === "RG" ? "IOL" : generationGroup === "DL" ? "IDL" : generationGroup;
  const rows = mappings.get(group) ?? mappings.get(finalPosition) ?? mappings.get("DEFAULT") ?? [];
  const defaults = formulaDefaults("overall");
  const inputs: Record<string, number> = {};
  for (const row of rows) {
    const key = aliases.get(row.ratingKey) ?? row.ratingKey;
    const noise = rng.normal(0, 7 + (1 - row.weight) * 5);
    inputs[key] = Math.round(clamp(trueOverall + noise, 25, 99));
  }
  if (!Object.keys(inputs).length && defaults.allowedFallback) inputs.missing_rating = defaults.defaultValue;
  if (!Object.keys(inputs).length) throw new Error(`Missing rating input mapping for ${generationGroup}/${finalPosition}.`);
  return inputs;
}

function formulaDefaults(formula: string): { defaultValue: number; allowedFallback: boolean } {
  const rows = parseCsv(formulaInputDefaultsText);
  const header = rows[0];
  const row = rows.slice(1).find((candidate) => candidate[header.indexOf("formula")] === formula && candidate[header.indexOf("input_name")] === "missing_rating");
  return {
    defaultValue: Number(row?.[header.indexOf("default_value")]) || 50,
    allowedFallback: ["1", "true", "yes"].includes(String(row?.[header.indexOf("allowed_fallback")]).toLowerCase())
  };
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
