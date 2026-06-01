import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruitingState, CollegeMoraleState, CollegeRosterState, CollegeSeasonResultsState } from "../types";
import { annualMoraleWeight, annualPromiseParams, annualPromiseType, annualRuntimeDebug } from "./annualRuntime";

export function generateCollegeMoraleState(
  seed: string,
  seasonYear: number,
  collegeRoster: CollegeRosterState | undefined,
  results: CollegeSeasonResultsState | undefined,
  recruiting: AnnualRecruitingState | undefined
): CollegeMoraleState | undefined {
  if (!collegeRoster || !results) return undefined;
  const productionByPlayerId = new Map(results.production.map((row) => [row.playerId, row]));
  const injuryIds = new Set(results.injuries.map((row) => row.playerId));
  const promisedSchoolIds = new Set((recruiting?.board ?? []).filter((entry) => entry.status === "signed" || entry.status === "committed").map((entry) => entry.schoolId));
  const entries = collegeRoster.players
    .filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason)
    .map((player) => {
      const rng = createRng(`${seed}:annual-college-morale:${seasonYear}:${player.id}`);
      const production = productionByPlayerId.get(player.id);
      const snapShare = production?.snapShare ?? 0;
      const depthRank = production?.depthRank ?? 99;
      const reasons: string[] = [];
      if (snapShare < 0.18 && player.rosterStatus !== "redshirt") reasons.push("playing_time");
      if (player.rosterStatus === "redshirt") reasons.push("redshirt");
      if (injuryIds.has(player.id)) reasons.push("injury");
      const promiseEvaluation = evaluatePlayerPromise(player.recruitingPromiseType, player.recruitingPromiseTarget, snapShare, depthRank);
      if (promiseEvaluation.broken) reasons.push("broken_promise");
      else if (promiseEvaluation.active) reasons.push("promise_monitoring");
      if (promisedSchoolIds.has(player.schoolId) && depthRank > 2) reasons.push("team_promise_pressure");
      const playingTime = annualMoraleWeight("playing_time");
      const promises = annualMoraleWeight("promises");
      const development = annualMoraleWeight("development");
      const coachTrust = annualMoraleWeight("coach_trust");
      const playingTimeEffect = clamp((snapShare - 0.32) * 100, playingTime.minEffect, playingTime.maxEffect) * playingTime.weight;
      const promiseEffect = promiseEvaluation.impact + (promisedSchoolIds.has(player.schoolId) && depthRank > 2 ? promises.minEffect * promises.weight * 0.5 : promises.maxEffect * promises.weight * 0.2);
      const developmentEffect = clamp((player.collegePotential - player.collegeOverall) * 0.8, development.minEffect, development.maxEffect) * development.weight;
      const coachTrustEffect = clamp((production?.productionScore ?? player.collegeOverall) - 58, coachTrust.minEffect, coachTrust.maxEffect) * coachTrust.weight;
      const promisePressure = Math.round(clamp((promiseEvaluation.active ? 18 : promisedSchoolIds.has(player.schoolId) ? 10 : 4) + Math.max(0, depthRank - 2) * 4 - promiseEffect + rng.normal(0, 3), 0, 100));
      const morale = Math.round(clamp(70 + playingTimeEffect + developmentEffect + coachTrustEffect - promisePressure * 0.32 - (injuryIds.has(player.id) ? 7 : 0) + rng.normal(0, 6), 1, 100));
      const transferRisk = Math.round(clamp(100 - morale + promisePressure * 0.34 + promiseEvaluation.portalBonus + (snapShare < 0.18 ? 14 : 0), 1, 100));
      return {
        playerId: player.id,
        schoolId: player.schoolId,
        morale,
        promisePressure,
        transferRisk,
        reasons
      };
    });
  return {
    seasonYear,
    entries,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("morale") || path.includes("promise")),
    usesYearZeroBundles: false
  };
}

function evaluatePlayerPromise(
  promiseType: string | undefined,
  target: number | undefined,
  snapShare: number,
  depthRank: number
): { active: boolean; broken: boolean; impact: number; portalBonus: number } {
  const promise = annualPromiseType(promiseType);
  if (!promise) return { active: false, broken: false, impact: 0, portalBonus: 0 };
  const brokenMajor = annualPromiseParams("broken_major_promise");
  const lowSnap = annualPromiseParams("low_snap_share");
  const depthBlocked = annualPromiseParams("depth_chart_blocked");
  const targetValue = target ?? promise.targetValue;
  const fulfilled = promise.fulfillmentRule === "snap_share_threshold"
    ? snapShare >= targetValue
    : promise.fulfillmentRule === "starter_status"
      ? depthRank <= targetValue
      : promise.fulfillmentRule === "nil_deal_minimum"
        ? true
        : true;
  if (fulfilled) {
    return {
      active: true,
      broken: false,
      impact: Math.abs(promise.moraleImpact) * 0.2,
      portalBonus: 0
    };
  }
  const snapPenalty = snapShare <= lowSnap.badThreshold ? lowSnap.transferTriggerBonus * 100 : 0;
  const depthPenalty = depthRank >= depthBlocked.badThreshold ? depthBlocked.transferTriggerBonus * 100 : 0;
  return {
    active: true,
    broken: true,
    impact: promise.moraleImpact * brokenMajor.weight,
    portalBonus: promise.portalImpact * 100 + snapPenalty + depthPenalty
  };
}
