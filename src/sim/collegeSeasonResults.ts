import { clamp, createRng } from "../lib/rng";
import type { CollegeRosterState, CollegeSeasonResultsState, InjurySeverity } from "../types";
import {
  annualAwardImpact,
  annualDepthChartWeightsForPosition,
  annualInjuryFamilyParam,
  annualInjuryRateForPosition,
  annualInjuryRecurrence,
  annualInjurySeverityRows,
  annualPositionStatProfileForPosition,
  annualProductionParam,
  annualProductionWeightsForPosition,
  annualRuntimeDebug,
  annualSnapShareRuleForPosition,
  annualStatGenerationCurvesForPosition
} from "./annualRuntime";

function injurySeverity(score: number): InjurySeverity {
  if (score > 0.92) return "catastrophic";
  if (score > 0.78) return "major";
  if (score > 0.52) return "moderate";
  return "minor";
}

function mapCsvSeverity(severity: string): InjurySeverity {
  if (severity === "severe") return "catastrophic";
  if (severity === "major" || severity === "moderate" || severity === "minor") return severity;
  return "minor";
}

export function generateCollegeSeasonResults(seed: string, collegeRoster: CollegeRosterState | undefined, seasonYear: number): CollegeSeasonResultsState | undefined {
  if (!collegeRoster) return undefined;
  const rng = createRng(`${seed}:annual-college-season-results:${seasonYear}`);
  const activePlayers = collegeRoster.players.filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason && player.rosterStatus !== "redshirt" && player.rosterStatus !== "cut" && player.academicEligible !== false);
  const depthRankByPlayer = new Map<string, number>();
  const bySchoolPosition = new Map<string, typeof activePlayers>();
  for (const player of activePlayers) {
    const key = `${player.schoolId}:${player.position}`;
    bySchoolPosition.set(key, [...(bySchoolPosition.get(key) ?? []), player]);
  }
  for (const [, players] of bySchoolPosition.entries()) {
    players
      .sort((a, b) => depthScore(b, seed, seasonYear) - depthScore(a, seed, seasonYear) || a.id.localeCompare(b.id))
      .forEach((player, index) => depthRankByPlayer.set(player.id, index + 1));
  }
  const production = activePlayers.map((player) => {
    const playerRng = rng.fork(player.id);
    const depthRank = depthRankByPlayer.get(player.id) ?? 99;
    const snapRule = annualSnapShareRuleForPosition(player.position);
    const productionWeights = annualProductionWeightsForPosition(player.position);
    const roleMultiplier = depthRank === 1
      ? snapRule.starterShare
      : depthRank <= snapRule.rotationDepth
        ? snapRule.starterShare * Math.max(0.22, 1 - (depthRank - 1) / Math.max(1, snapRule.rotationDepth) - snapRule.fatigueSensitivity)
        : snapRule.blowoutBackupShare * 0.45;
    const snapShare = Math.round(clamp(((player.collegeOverall - 42) / 58) * roleMultiplier + playerRng.normal(0, 0.04), 0.01, 0.98) * 100) / 100;
    const classModifier = player.classYear === "FR"
      ? annualProductionParam("freshman_penalty", -4)
      : player.classYear === "SR"
        ? annualProductionParam("senior_experience_bonus", 3)
        : 0;
    const sigma = annualProductionParam("randomness_sigma", 6);
    const productionScore = Math.round(clamp(
      player.collegeOverall * productionWeights.overallWeight
      + snapShare * 100 * productionWeights.snapShareWeight
      + player.collegePotential * productionWeights.schemeUsageWeight
      + 62 * productionWeights.teamQualityWeight
      + classModifier
      + playerRng.normal(0, sigma * Math.max(0.35, productionWeights.randomnessWeight * 5)),
      annualProductionParam("production_score_min", 0),
      annualProductionParam("production_score_max", 100)
    ));
    const stats = generatePositionStats(player.position, snapShare, productionScore, playerRng);
    return {
      id: `college-production-${seasonYear}-${player.id}`,
      playerId: player.id,
      schoolId: player.schoolId,
      position: player.position,
      seasonYear,
      depthRank,
      productionScore,
      snapShare,
      stats
    };
  });
  const awards = [...production]
    .sort((a, b) => b.productionScore - a.productionScore || a.id.localeCompare(b.id))
    .slice(0, Math.max(60, Math.round(production.length * 0.018)))
    .map((row, index) => {
      const award = index === 0
        ? "national_player_of_year"
        : index < 12
          ? "all_american"
          : index < 32
            ? "conference_player_of_year"
            : row.position === "QB" || row.position === "RB" || row.position === "WR"
              ? "all_conference_first"
              : "academic_all_conference";
      const impact = annualAwardImpact(award);
      return {
        id: `college-award-${seasonYear}-${index + 1}-${row.playerId}`,
        playerId: row.playerId,
        schoolId: row.schoolId,
        seasonYear,
        award,
        awardGroup: impact.awardGroup,
        draftBoardBonus: impact.draftBoardBonus,
        nilBonusPct: impact.nilBonusPct,
        mediaBonus: impact.mediaBonus
      };
    });
  const severityRows = annualInjurySeverityRows();
  const injuries = activePlayers
    .filter((player) => {
      const productionRow = production.find((row) => row.playerId === player.id);
      const rate = annualInjuryRateForPosition(player.position, "game");
      const seasonRisk = rate.baseDailyRisk * 14 * (1 + (productionRow?.snapShare ?? 0.2) * rate.loadSensitivity * 8);
      return rng.fork(`injury:${player.id}`).next() < clamp(seasonRisk, 0.005, 0.12);
    })
    .map((player, index) => {
      const injuryRng = rng.fork(`injury-detail:${player.id}`);
      const severityRow = weightedPick(severityRows, (row) => row.probability, injuryRng) ?? { injuryFamily: "generic_minor", severity: "minor", probability: 1, minDays: 1, maxDays: 14, seasonEndingProb: 0 };
      const severity = mapCsvSeverity(severityRow.severity) || injurySeverity(injuryRng.next());
      const missedDays = injuryRng.int(severityRow.minDays, severityRow.maxDays);
      const missedGames = Math.round(clamp(missedDays / 7, severity === "catastrophic" ? 8 : 0, 12));
      const injuryFamily = severityRow.injuryFamily ?? "generic_major";
      const family = annualInjuryFamilyParam(injuryFamily);
      const recurrence = annualInjuryRecurrence(injuryFamily);
      const positionSensitive = isPositionSensitive(family.positionSensitivity, player.position) || isPositionSensitive(recurrence.positionSensitivity, player.position);
      const severityMult = severity === "catastrophic" ? 1.65 : severity === "major" ? 1.25 : severity === "moderate" ? 0.85 : 0.45;
      const sensitivityMult = positionSensitive ? 1.18 : 1;
      const recurrenceRisk = Number(clamp(family.baseRecurrencePct * recurrence.recurrenceMult * severityMult * sensitivityMult, 0, 0.85).toFixed(3));
      const permanentLossRoll = injuryRng.next();
      const potentialLoss = permanentLossRoll < recurrence.permanentAthleticLossChance * severityMult
        ? injuryRng.int(recurrence.potentialLossMin, Math.max(recurrence.potentialLossMin, recurrence.potentialLossMax))
        : 0;
      const longTermWear = Number(clamp(
        family.durabilityPenalty
        + potentialLoss
        + (missedGames / Math.max(1, family.gamesMissedMean || 6)) * 4
        + (positionSensitive ? 2 : 0),
        0,
        35
      ).toFixed(2));
      const draftMedicalPenalty = Math.round(clamp(
        family.draftMedicalPenalty
        + injuryRng.float(recurrence.draftMedicalPenaltyMin, recurrence.draftMedicalPenaltyMax)
        + longTermWear * 0.2,
        0,
        35
      ));
      return {
        id: `college-injury-${seasonYear}-${index + 1}-${player.id}`,
        playerId: player.id,
        schoolId: player.schoolId,
        seasonYear,
        injuryFamily,
        severity,
        missedGames,
        recurrenceRisk,
        longTermWear,
        potentialLoss,
        speedPenalty: Number((family.permSpeedPenalty * severityMult * sensitivityMult).toFixed(2)),
        strengthPenalty: Number((family.permStrengthPenalty * severityMult * sensitivityMult).toFixed(2)),
        awarenessPenalty: Number((family.permAwarenessPenalty * severityMult).toFixed(2)),
        durabilityPenalty: Number((family.durabilityPenalty * severityMult).toFixed(2)),
        recoveryBankMult: recurrence.recoveryBankMult,
        draftMedicalPenalty,
        positionSensitive
      };
    });
  return {
    seasonYear,
    production,
    awards,
    injuries,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("production") || path.includes("injury") || path.includes("award") || path.includes("depth") || path.includes("snap")),
    usesYearZeroBundles: false
  };
}

function isPositionSensitive(positionSensitivity: string[], position: CollegeRosterState["players"][number]["position"]): boolean {
  return positionSensitivity.includes("ALL") || positionSensitivity.includes(position);
}

function weightedPick<T>(items: T[], weightFor: (item: T) => number, rng: ReturnType<typeof createRng>): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightFor(item)), 0);
  if (total <= 0) return items[0];
  let cursor = rng.float(0, total);
  for (const item of items) {
    cursor -= Math.max(0, weightFor(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function generatePositionStats(
  position: CollegeRosterState["players"][number]["position"],
  snapShare: number,
  productionScore: number,
  rng: ReturnType<typeof createRng>
): Record<string, number> {
  const curves = annualStatGenerationCurvesForPosition(position);
  const profile = annualPositionStatProfileForPosition(position);
  const snaps = Math.round(780 * snapShare);
  const stats: Record<string, number> = { snaps };
  for (const curve of curves) {
    const raw = curve.basePer100Snaps * (snaps / 100) * (0.55 + productionScore / 100 * curve.productionMult) + rng.normal(0, curve.randomSigma);
    stats[curve.statCurveId] = Math.max(0, Number(raw.toFixed(curve.basePer100Snaps < 2 ? 1 : 0)));
  }
  for (const stat of profile?.primaryStats ?? []) {
    if (stats[stat] !== undefined) continue;
    if (stat.includes("td")) stats[stat] = Math.max(0, Math.round((productionScore - 45) / 12 * snapShare + rng.float(0, 2)));
    else if (stat.includes("att") || stat === "targets") stats[stat] = Math.max(0, Math.round(snaps * 0.18 * clamp(productionScore / 70, 0.4, 1.4)));
    else if (stat === "rec") stats[stat] = Math.max(0, Math.round((stats.targets ?? snaps * 0.12) * clamp(0.48 + productionScore / 220, 0.35, 0.82)));
    else if (stat.includes("yds")) stats[stat] = Math.max(0, Math.round(snaps * 0.55 * clamp(productionScore / 70, 0.3, 1.6)));
    else stats[stat] = Math.max(0, Math.round(snaps / 100 * clamp(productionScore / 60, 0.3, 1.6)));
  }
  return stats;
}

function depthScore(player: CollegeRosterState["players"][number], seed: string, seasonYear: number): number {
  const weights = annualDepthChartWeightsForPosition(player.position);
  const rng = createRng(`${seed}:college-depth:${seasonYear}:${player.id}`);
  const experience = player.classYear === "SR" ? 95 : player.classYear === "JR" || player.classYear === "RS-SO" ? 78 : player.classYear === "SO" ? 58 : 38;
  const recentForm = clamp(player.collegeOverall + rng.normal(0, 8), 1, 100);
  const promisePressure = player.source === "annual_recruiting" && player.signedSeason === seasonYear ? 62 : 45;
  const injuryReadiness = 92;
  return player.collegeOverall * weights.overall
    + experience * weights.experience
    + recentForm * weights.recentForm
    + promisePressure * weights.promisePressure
    + injuryReadiness * weights.injuryReadiness
    + player.collegePotential * 0.08;
}
