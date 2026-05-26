import { clamp, createRng, type Rng } from "../lib/rng";
import type {
  GameSave,
  Player,
  PlayerDevelopmentProfile,
  PlayerDevelopmentReport,
  Position,
  RatingVector
} from "../types";
import {
  calibrateOverall,
  calibratePotential,
  calculateOverallFromRatings,
  legacyAttributesFromRatings,
  ratingRegistry,
  ratingValue,
  type RatingKey
} from "./ratings";
import { normalizePlayerMakeup } from "./concerns";
import { syncPlayerModelFromRatings } from "./playerModel";
import { coachDevelopmentGrade } from "./staffModel";

const physicalKeys: RatingKey[] = [
  "speed",
  "acceleration",
  "agility",
  "changeOfDirection",
  "explosiveness",
  "strength",
  "stamina",
  "burst",
  "closingSpeed"
];

const mentalKeys: RatingKey[] = ["awareness", "playRecognition", "discipline", "composure", "consistency", "leadership"];

const technicalKeysByPosition: Record<Position, RatingKey[]> = {
  QB: ["throwPower", "shortAccuracy", "mediumAccuracy", "deepAccuracy", "timing", "pocketPresence", "pressureSense", "throwOnRun", "ballSecurity"],
  RB: ["rushingVision", "elusiveness", "powerRun", "contactBalance", "breakTackle", "ballSecurity", "passCatching", "blitzPickup"],
  WR: ["passCatching", "release", "shortRoute", "mediumRoute", "deepRoute", "contestedCatch", "yardsAfterCatch", "separation", "ballSecurity"],
  TE: ["passCatching", "release", "shortRoute", "mediumRoute", "contestedCatch", "runBlock", "passBlock", "anchor", "handTechnique"],
  LT: ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup", "secondLevel"],
  LG: ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup", "secondLevel"],
  C: ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup", "secondLevel"],
  RG: ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup", "secondLevel"],
  RT: ["runBlock", "passBlock", "passBlockFootwork", "runBlockPower", "anchor", "handTechnique", "blitzPickup", "secondLevel"],
  EDGE: ["edgeSetting", "powerRush", "finesseRush", "passRushPlan", "blockShedding", "runDefense", "tackling", "pursuit"],
  DL: ["anchor", "blockShedding", "gapDiscipline", "runDefense", "powerRush", "passRushPlan", "tackling", "hitPower"],
  LB: ["tackling", "pursuit", "blockShedding", "gapDiscipline", "runDefense", "zoneCoverage", "manCoverage", "hitPower", "closingSpeed"],
  CB: ["manCoverage", "zoneCoverage", "pressCoverage", "ballSkills", "playRecognition", "takeaways", "tackling", "pursuit"],
  S: ["zoneCoverage", "manCoverage", "ballSkills", "playRecognition", "tackling", "pursuit", "hitPower", "takeaways", "gapDiscipline"],
  K: ["kickPower", "kickAccuracy", "composure", "consistency"],
  P: ["puntPower", "puntAccuracy", "composure", "consistency"]
};

const ratingIndex = new Map<string, number>(ratingRegistry.map((rating, index) => [rating.key, index]));

function updateKeys(ratings: RatingVector, keys: RatingKey[], delta: number, rng: Rng, noise = 0.35): void {
  for (const key of keys) {
    const index = ratingIndex.get(key);
    if (index === undefined) continue;
    ratings[index] = calibrateOverall((ratings[index] ?? 50) + delta + rng.normal(0, noise));
  }
}

export function generateDevelopmentProfile(age: number, workEthic: number, rng: Rng): PlayerDevelopmentProfile {
  const style = rng.pick(["Early Bloomer", "Steady Climber", "Late Bloomer", "Boom/Bust"] as const);
  const stylePeak = style === "Early Bloomer" ? -1 : style === "Late Bloomer" ? 2 : 0;
  const styleVolatility = style === "Boom/Bust" ? 16 : style === "Steady Climber" ? -8 : 0;
  return {
    workEthic: Math.round(clamp(workEthic + rng.int(-5, 5), 20, 99)),
    learning: Math.round(clamp(rng.normal(workEthic, 10), 20, 99)),
    volatility: Math.round(clamp(rng.normal(50 + styleVolatility, 14), 8, 95)),
    peakAge: Math.round(clamp(rng.normal(26 + stylePeak, 1.4), 23, 31)),
    declineAge: Math.round(clamp(rng.normal(30 + stylePeak, 1.8), Math.max(27, age), 36)),
    style
  };
}

export function ensureDevelopmentProfile(
  profile: PlayerDevelopmentProfile | undefined,
  seed: string,
  age: number,
  workEthic = 60
): PlayerDevelopmentProfile {
  if (
    profile &&
    Number.isFinite(profile.workEthic) &&
    Number.isFinite(profile.learning) &&
    Number.isFinite(profile.volatility) &&
    Number.isFinite(profile.peakAge) &&
    Number.isFinite(profile.declineAge) &&
    profile.style
  ) {
    return {
      ...profile,
      workEthic: Math.round(clamp(profile.workEthic, 20, 99)),
      learning: Math.round(clamp(profile.learning, 20, 99)),
      volatility: Math.round(clamp(profile.volatility, 8, 95)),
      peakAge: Math.round(clamp(profile.peakAge, 23, 31)),
      declineAge: Math.round(clamp(profile.declineAge, 27, 36))
    };
  }
  return generateDevelopmentProfile(age, workEthic, createRng(`${seed}:development-profile:${age}:${workEthic}`));
}

export function playerPotentialFor(overall: number, age: number, profile: PlayerDevelopmentProfile, rng: Rng): number {
  const youngWindow = age <= 22 ? 10 : age <= 24 ? 7 : age <= 26 ? 4 : age <= 28 ? 2 : age <= 30 ? 1 : 0;
  const makeup = (profile.workEthic - 60) * 0.07 + (profile.learning - 60) * 0.06;
  const volatility = rng.normal(0, 2 + profile.volatility * 0.025);
  const rareUpside = age <= 25 && rng.bool(clamp((profile.volatility - 40) * 0.0015 + (profile.workEthic - 58) * 0.0012, 0.006, 0.08)) ? rng.int(4, 10) : 0;
  return calibratePotential(overall, overall + youngWindow + makeup + volatility + rareUpside);
}

export function prospectPotentialFor(overall: number, age: number, profile: PlayerDevelopmentProfile, rng: Rng): number {
  const upside = 9 + (profile.learning - 60) * 0.08 + (profile.workEthic - 60) * 0.05 + rng.normal(0, 4.2);
  const projectionSpike = rng.bool(clamp((profile.volatility - 45) * 0.002 + (age <= 21 ? 0.018 : 0.006), 0.006, 0.095)) ? rng.int(6, 15) : 0;
  return calibratePotential(overall, overall + upside + projectionSpike);
}

function ageCurve(player: Player, profile: PlayerDevelopmentProfile): number {
  if (player.age <= profile.peakAge - 3) return 1.25;
  if (player.age <= profile.peakAge) return 0.8;
  if (player.age < profile.declineAge) return 0.2;
  return -0.8 - Math.max(0, player.age - profile.declineAge) * 0.24;
}

function updatePlayerRatings(player: Player, rawDelta: number, injuryDrag: number, rng: Rng): RatingVector {
  const ratings = [...player.ratings];
  const tech = technicalKeysByPosition[player.position];
  if (rawDelta > 0) {
    updateKeys(ratings, tech, rawDelta, rng);
    updateKeys(ratings, mentalKeys, rawDelta * 0.58, rng);
    updateKeys(ratings, physicalKeys, player.age <= 27 ? rawDelta * 0.42 : rawDelta * 0.18, rng);
  } else if (rawDelta < 0) {
    updateKeys(ratings, physicalKeys, rawDelta * 0.95 - injuryDrag * 0.35, rng);
    updateKeys(ratings, tech, rawDelta * 0.48, rng);
    updateKeys(ratings, mentalKeys, player.age >= 31 ? rawDelta * 0.12 : rawDelta * 0.2, rng);
  }

  if (injuryDrag > 0) updateKeys(ratings, ["stamina"], -injuryDrag, rng, 0.2);

  return ratings;
}

function reportCategory(deltaOverall: number, deltaPotential: number, injuryDrag: number): PlayerDevelopmentReport["category"] {
  if (deltaOverall >= 3 || deltaPotential >= 3) return "breakout";
  if (deltaOverall > 0) return "improved";
  if (deltaOverall < 0 && injuryDrag > 0) return "injury";
  if (deltaOverall < 0) return "decline";
  return "steady";
}

export function runAnnualDevelopment(save: GameSave): GameSave {
  const seasonYear = save.draftState?.draftYear ?? 2027;
  const reports: PlayerDevelopmentReport[] = [];
  const players = save.players.map((player) => {
    const rng = createRng(`${save.seed}:annual-development:${seasonYear}:${player.id}`);
    const makeup = normalizePlayerMakeup(player, save.seed);
    const baseProfile = ensureDevelopmentProfile(player.development, `${save.seed}:${player.id}`, player.age, ratingValue(player.ratings, "workEthic"));
    const profile: PlayerDevelopmentProfile = {
      ...baseProfile,
      workEthic: Math.round(clamp(baseProfile.workEthic * 0.45 + makeup.workEthic * 0.55, 20, 99)),
      learning: Math.round(clamp(baseProfile.learning * 0.72 + makeup.workEthic * 0.28, 20, 99))
    };
    const staffGrade = coachDevelopmentGrade(save.staff, player.teamId, player.position);
    const snapTarget = player.position === "K" || player.position === "P" ? 85 : 850;
    const snapFactor = clamp((player.stats.snaps ?? 0) / snapTarget, 0, 1);
    const potentialGap = Math.max(0, player.potential - player.overall);
    const healthDrag = player.injuryWeeks > 0 || player.status === "injured" ? clamp(player.injuryWeeks || 3, 1, 8) * 0.25 : 0;
    const medicalDrag = player.status === "injured" ? clamp((70 - makeup.medical) * 0.018, -0.18, 0.65) : 0;
    const injuryDrag = Math.max(0, healthDrag + medicalDrag);
    const variance = rng.normal(0, 0.55 + profile.volatility * 0.018);
    const makeupWork = clamp((makeup.workEthic - 70) * 0.032, -0.9, 0.75);
    let rawDelta =
      potentialGap * 0.12 +
      (staffGrade - 60) * 0.045 +
      (profile.learning - 60) * 0.042 +
      (profile.workEthic - 60) * 0.035 +
      makeupWork +
      snapFactor * 0.75 +
      ageCurve(player, profile) -
      injuryDrag +
      variance;

    if (player.age >= profile.declineAge && rawDelta > 0) rawDelta *= 0.35;
    const targetDelta = Math.round(clamp(rawDelta, -5, 6));
    const ratings = updatePlayerRatings(player, targetDelta, injuryDrag, rng);
    const newOverall = calculateOverallFromRatings(player.position, ratings);
    let newPotential = player.potential;
    const breakoutChance = clamp((profile.volatility - 38) * 0.0025 + (profile.workEthic - 58) * 0.0015 + (newOverall >= player.potential - 1 ? 0.05 : 0.01), 0.004, 0.16);
    if (targetDelta >= 3 && rng.bool(breakoutChance)) {
      newPotential += rng.int(1, 4);
    }
    if (player.age > profile.declineAge && newPotential > newOverall + 2) {
      newPotential -= rng.int(0, Math.min(2, Math.max(0, player.age - profile.declineAge)));
    }
    newPotential = calibratePotential(newOverall, newPotential);

    const deltaOverall = newOverall - player.overall;
    const deltaPotential = newPotential - player.potential;
    const category = reportCategory(deltaOverall, deltaPotential, injuryDrag);
    if (player.teamId === save.selectedTeamId || category === "breakout" || Math.abs(deltaOverall) >= 2 || Math.abs(deltaPotential) >= 2) {
      reports.push({
        id: `dev-${seasonYear}-${player.id}`,
        seasonYear,
        week: save.currentWeek,
        playerId: player.id,
        teamId: player.teamId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        previousOverall: player.overall,
        newOverall,
        previousPotential: player.potential,
        newPotential,
        deltaOverall,
        deltaPotential,
        category,
        summary:
          category === "breakout"
            ? `${player.lastName} flashed a new ceiling during offseason work.`
            : category === "improved"
              ? `${player.lastName} made steady gains with the staff.`
              : category === "injury"
                ? `${player.lastName}'s offseason was slowed by health and recovery work.`
                : category === "decline"
                  ? `${player.lastName} lost ground physically entering the offseason.`
                  : `${player.lastName} held steady through offseason evaluation.`
      });
    }

    return syncPlayerModelFromRatings({
      ...player,
      ratings,
      overall: newOverall,
      potential: newPotential,
      development: profile,
      makeup,
      attributes: legacyAttributesFromRatings(player.position, ratings)
    }, save.seed);
  });

  const reportImpact = (report: PlayerDevelopmentReport) => Math.abs(report.deltaOverall) + Math.abs(report.deltaPotential);
  const selectedReports = reports.filter((report) => report.teamId === save.selectedTeamId).sort((a, b) => reportImpact(b) - reportImpact(a));
  const leagueReports = reports.filter((report) => report.teamId !== save.selectedTeamId).sort((a, b) => reportImpact(b) - reportImpact(a));
  const sortedReports = [...selectedReports, ...leagueReports].slice(0, 120);

  return {
    ...save,
    players,
    developmentReports: [...sortedReports, ...(save.developmentReports ?? [])].slice(0, 180)
  };
}
