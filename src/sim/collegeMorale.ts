import { clamp, createRng } from "../lib/rng";
import type { AnnualRecruitingState, CollegeMoraleState, CollegeRosterState, CollegeSeasonResultsState } from "../types";

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
      if (promisedSchoolIds.has(player.schoolId) && depthRank > 2) reasons.push("promise_pressure");
      const promisePressure = Math.round(clamp((promisedSchoolIds.has(player.schoolId) ? 18 : 4) + Math.max(0, depthRank - 2) * 4 + rng.normal(0, 3), 0, 100));
      const morale = Math.round(clamp(70 + snapShare * 22 + (production?.productionScore ?? player.collegeOverall) * 0.08 - promisePressure * 0.36 - (injuryIds.has(player.id) ? 7 : 0) + rng.normal(0, 6), 1, 100));
      const transferRisk = Math.round(clamp(100 - morale + promisePressure * 0.34 + (snapShare < 0.18 ? 14 : 0), 1, 100));
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
    usesYearZeroBundles: false
  };
}
