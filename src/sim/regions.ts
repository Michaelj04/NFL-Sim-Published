import type { CollegeProgram, ScoutingRegion } from "../types";

export const scoutingRegionList: ScoutingRegion[] = ["National", "East", "South", "Midwest", "West"];

export function isScoutingRegion(value: unknown): value is ScoutingRegion {
  return scoutingRegionList.includes(value as ScoutingRegion);
}

export function geographicRegionForSchool(school?: Pick<CollegeProgram, "name" | "conference">): ScoutingRegion {
  const text = `${school?.name ?? ""} ${school?.conference ?? ""}`.toLowerCase();
  if (/(sec|sun belt|american|acc|south|florida|georgia|alabama|mississippi|tennessee|carolina|texas)/.test(text)) return "South";
  if (/(big ten|mac|mid|iowa|ohio|michigan|wisconsin|minnesota|illinois|indiana|missouri|dakota)/.test(text)) return "Midwest";
  if (/(pac|mountain|west|california|oregon|washington|arizona|utah|colorado|nevada|hawaii)/.test(text)) return "West";
  return "East";
}

export function normalizeScoutingRegion(value: unknown, school?: Pick<CollegeProgram, "name" | "conference">): ScoutingRegion {
  if (isScoutingRegion(value)) return value;
  return school ? geographicRegionForSchool(school) : "National";
}
