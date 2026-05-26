import { clamp, createRng, type Rng } from "../lib/rng";
import type { CollegeProgram, Player, PlayerMakeupProfile, Prospect, ProspectConcernKey, ProspectConcernRanges } from "../types";

export const CONCERN_PROFILE_VERSION = 2;
export const prospectConcernKeys: ProspectConcernKey[] = ["medical", "character", "workEthic"];

export type ConcernBand = "elite" | "good" | "neutral" | "caution" | "red";
export type ConcernTone = "good" | "average" | "risk";

export interface ConcernSignal {
  key: ProspectConcernKey;
  label: string;
  symbol: string;
  band: Exclude<ConcernBand, "neutral">;
  tone: ConcernTone;
  description: string;
}

const concernLabels: Record<ProspectConcernKey, string> = {
  medical: "Med",
  character: "Char",
  workEthic: "Work"
};

const concernSymbols: Record<ProspectConcernKey, string> = {
  medical: "+",
  character: "!",
  workEthic: "^"
};

function concernValue(rng: Rng): number {
  const roll = rng.float(0, 1);
  if (roll < 0.02) return rng.int(25, 44);
  if (roll < 0.08) return rng.int(45, 59);
  if (roll < 0.9) return rng.int(60, 79);
  if (roll < 0.98) return rng.int(80, 89);
  return rng.int(90, 99);
}

function medicalValue(rng: Rng): number {
  const roll = rng.float(0, 1);
  if (roll < 0.015) return rng.int(25, 44);
  if (roll < 0.065) return rng.int(45, 59);
  if (roll < 0.695) return rng.int(65, 79);
  if (roll < 0.92) return rng.int(80, 89);
  return rng.int(90, 99);
}

export function generateConcernProfile(seed: string, id: string): PlayerMakeupProfile {
  const rng = createRng(`${seed}:concern-profile:${id}`);
  return {
    version: CONCERN_PROFILE_VERSION,
    medical: medicalValue(rng.fork("medical")),
    character: concernValue(rng.fork("character")),
    workEthic: concernValue(rng.fork("work-ethic"))
  };
}

export function concernBandFor(value: number): ConcernBand {
  if (value >= 90) return "elite";
  if (value >= 80) return "good";
  if (value >= 60) return "neutral";
  if (value >= 45) return "caution";
  return "red";
}

export function concernDescription(key: ProspectConcernKey, band: ConcernBand): string {
  if (band === "elite") {
    if (key === "medical") return "Elite medical profile; teams expect strong availability and recovery.";
    if (key === "character") return "Elite character profile; very low off-field concern.";
    return "Elite work habits; development staff sees added growth upside.";
  }
  if (band === "good") {
    if (key === "medical") return "Good medical profile; modest availability confidence.";
    if (key === "character") return "Good character profile; modest locker-room confidence.";
    return "Good work habits; modest development confidence.";
  }
  if (band === "caution") {
    if (key === "medical") return "Medical caution; teams may shade availability expectations.";
    if (key === "character") return "Character caution; teams may shade off-field availability risk.";
    return "Work ethic caution; teams may shade development projection.";
  }
  if (key === "medical") return "Medical red flag; stock can fall if the board view confirms it.";
  if (key === "character") return "Character red flag; off-field availability risk can materially affect value.";
  return "Work ethic red flag; development projection can take a meaningful hit.";
}

export function concernSignalForRange(key: ProspectConcernKey, range: [number, number]): ConcernSignal | undefined {
  const [low, high] = range;
  const mid = (low + high) / 2;
  let band: Exclude<ConcernBand, "neutral"> | undefined;
  if (high < 50 || mid < 45) band = "red";
  else if ((mid < 60 && high < 74) || (low < 45 && mid < 64)) band = "caution";
  else if (low >= 90 || mid >= 92) band = "elite";
  else if (low >= 80 || mid >= 82) band = "good";
  if (!band) return undefined;
  const tone: ConcernTone = band === "elite" || band === "good" ? "good" : "risk";
  return {
    key,
    label: concernLabels[key],
    symbol: concernSymbols[key],
    band,
    tone,
    description: concernDescription(key, band)
  };
}

function schoolContextPenalty(school: CollegeProgram | undefined): number {
  if (!school) return 2;
  const smallSchool = school.subdivision === "FCS" ? 6 : 0;
  const competition = clamp((66 - school.competition) / 7, 0, 5);
  return smallSchool + competition;
}

export function concernRangeForValue(
  value: number,
  key: ProspectConcernKey,
  progress: number,
  seed: string,
  id: string,
  school?: CollegeProgram,
  scoutFit = 64
): [number, number] {
  const rng = createRng(`${seed}:concern-range:${id}:${key}:${Math.round(progress)}:${Math.round(scoutFit)}`);
  const context = schoolContextPenalty(school);
  const scoutPenalty = clamp((66 - scoutFit) * 0.07, -2, 5);
  const width = Math.round(clamp(40 - progress * 0.31 + context + scoutPenalty + rng.int(-3, 5), 5, 42));
  const low = Math.round(clamp(value - Math.ceil(width * rng.float(0.42, 0.62)), 20, value));
  const high = Math.round(clamp(value + Math.ceil(width * rng.float(0.38, 0.6)), value, 99));
  return [low, high];
}

export function concernRangesForProspect(prospect: Prospect, progress: number, seed: string, school?: CollegeProgram, scoutFit = 64): ProspectConcernRanges {
  return {
    medical: concernRangeForValue(prospect.medical, "medical", progress, seed, prospect.id, school, scoutFit),
    character: concernRangeForValue(prospect.character, "character", progress, seed, prospect.id, school, scoutFit),
    workEthic: concernRangeForValue(prospect.workEthic, "workEthic", progress, seed, prospect.id, school, scoutFit)
  };
}

function keyAdjustment(key: ProspectConcernKey, value: number): number {
  if (value >= 90) return key === "workEthic" ? 1.25 : 0.85;
  if (value >= 80) return key === "workEthic" ? 0.55 : 0.35;
  if (value >= 60) return 0;
  if (value >= 45) return key === "medical" ? -1.25 : key === "character" ? -1.15 : -0.95;
  return key === "medical" ? -5.5 : key === "character" ? -6.25 : -4.75;
}

export function teamConcernAdjustment(ranges: ProspectConcernRanges): number {
  const score = prospectConcernKeys.reduce((sum, key) => {
    const [low, high] = ranges[key];
    const midpoint = (low + high) / 2;
    const lowEndDrag = low < 45 ? (45 - low) * 0.08 : low < 55 ? (55 - low) * 0.025 : 0;
    return sum + keyAdjustment(key, midpoint) - lowEndDrag;
  }, 0);
  return Number(clamp(score, -9, 3).toFixed(2));
}

export function floorConcernPenalty(ranges: ProspectConcernRanges): number {
  return prospectConcernKeys.reduce((sum, key) => {
    const low = ranges[key][0];
    if (low < 45) return sum + (45 - low) * 0.18 + 2.4;
    if (low < 60) return sum + (60 - low) * 0.07;
    return sum;
  }, 0);
}

export function consensusConcernAdjustment(prospect: Prospect, school: CollegeProgram | undefined, seed: string): number {
  const rng = createRng(`${seed}:consensus-concern:${prospect.id}`);
  const profile = prospectMakeup(prospect);
  const highProfile = clamp((school?.prestige ?? 50) / 100 + (school?.competition ?? 55) / 140 + (prospect.consensusProgress ?? 45) / 170, 0.15, 1);
  const smallSchoolDrag = school?.subdivision === "FCS" ? 0.22 : 0;
  const severeSignal = Math.min(profile.medical, profile.character, profile.workEthic) < 45 ? 0.22 : 0;
  const visibility = clamp(highProfile - smallSchoolDrag + severeSignal + rng.float(-0.08, 0.08), 0.08, 0.95);
  const trueAdjustment = keyAdjustment("medical", profile.medical) + keyAdjustment("character", profile.character) + keyAdjustment("workEthic", profile.workEthic);
  return Number(clamp(trueAdjustment * visibility, -7, 2.2).toFixed(2));
}

export function prospectMakeup(prospect: Pick<Prospect, "medical" | "character" | "workEthic">): PlayerMakeupProfile {
  return {
    version: CONCERN_PROFILE_VERSION,
    medical: Math.round(clamp(prospect.medical, 20, 99)),
    character: Math.round(clamp(prospect.character, 20, 99)),
    workEthic: Math.round(clamp(prospect.workEthic, 20, 99))
  };
}

export function normalizeProspectMakeup<T extends Prospect>(prospect: T, seed: string): T {
  if (prospect.concernProfileVersion === CONCERN_PROFILE_VERSION) {
    return {
      ...prospect,
      medical: Math.round(clamp(prospect.medical, 20, 99)),
      character: Math.round(clamp(prospect.character, 20, 99)),
      workEthic: Math.round(clamp(prospect.workEthic, 20, 99))
    };
  }
  const profile = generateConcernProfile(seed, prospect.id);
  return {
    ...prospect,
    concernProfileVersion: CONCERN_PROFILE_VERSION,
    medical: profile.medical,
    character: profile.character,
    workEthic: profile.workEthic
  };
}

export function normalizePlayerMakeup(player: Pick<Player, "id"> & Partial<Pick<Player, "makeup">>, seed: string): PlayerMakeupProfile {
  if (player.makeup?.version === CONCERN_PROFILE_VERSION) {
    return {
      version: CONCERN_PROFILE_VERSION,
      medical: Math.round(clamp(player.makeup.medical, 20, 99)),
      character: Math.round(clamp(player.makeup.character, 20, 99)),
      workEthic: Math.round(clamp(player.makeup.workEthic, 20, 99))
    };
  }
  return generateConcernProfile(seed, player.id);
}
