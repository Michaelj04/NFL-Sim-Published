import { clamp, createRng } from "../lib/rng";
import type { CollegeRosterState, CollegeSeasonResultsState, InjurySeverity } from "../types";
import { annualRuntimeDebug } from "./annualRuntime";

function injurySeverity(score: number): InjurySeverity {
  if (score > 0.92) return "catastrophic";
  if (score > 0.78) return "major";
  if (score > 0.52) return "moderate";
  return "minor";
}

export function generateCollegeSeasonResults(seed: string, collegeRoster: CollegeRosterState | undefined, seasonYear: number): CollegeSeasonResultsState | undefined {
  if (!collegeRoster) return undefined;
  const rng = createRng(`${seed}:annual-college-season-results:${seasonYear}`);
  const activePlayers = collegeRoster.players.filter((player) => !player.graduatedSeason && !player.draftDeclaredSeason && !player.cutSeason && player.rosterStatus !== "redshirt" && player.rosterStatus !== "cut");
  const depthRankByPlayer = new Map<string, number>();
  const bySchoolPosition = new Map<string, typeof activePlayers>();
  for (const player of activePlayers) {
    const key = `${player.schoolId}:${player.position}`;
    bySchoolPosition.set(key, [...(bySchoolPosition.get(key) ?? []), player]);
  }
  for (const [, players] of bySchoolPosition.entries()) {
    players
      .sort((a, b) => b.collegeOverall - a.collegeOverall || b.collegePotential - a.collegePotential || a.id.localeCompare(b.id))
      .forEach((player, index) => depthRankByPlayer.set(player.id, index + 1));
  }
  const production = activePlayers.map((player) => {
    const playerRng = rng.fork(player.id);
    const depthRank = depthRankByPlayer.get(player.id) ?? 99;
    const roleMultiplier = depthRank === 1 ? 1 : depthRank === 2 ? 0.62 : depthRank === 3 ? 0.34 : 0.13;
    const snapShare = Math.round(clamp(((player.collegeOverall - 42) / 58) * roleMultiplier + playerRng.normal(0, 0.06), 0.02, 0.96) * 100) / 100;
    const productionScore = Math.round(clamp(player.collegeOverall * 0.72 + player.collegePotential * 0.1 + snapShare * 18 + playerRng.normal(0, 8), 10, 99));
    return {
      id: `college-production-${seasonYear}-${player.id}`,
      playerId: player.id,
      schoolId: player.schoolId,
      position: player.position,
      seasonYear,
      depthRank,
      productionScore,
      snapShare
    };
  });
  const awards = [...production]
    .sort((a, b) => b.productionScore - a.productionScore || a.id.localeCompare(b.id))
    .slice(0, Math.max(60, Math.round(production.length * 0.018)))
    .map((row, index) => ({
      id: `college-award-${seasonYear}-${index + 1}-${row.playerId}`,
      playerId: row.playerId,
      schoolId: row.schoolId,
      seasonYear,
      award: index < 12 ? "all_american" as const : index < 32 ? "position_award" as const : "all_conference" as const
    }));
  const injuries = activePlayers
    .filter((player) => rng.fork(`injury:${player.id}`).next() < 0.045)
    .map((player, index) => {
      const injuryRng = rng.fork(`injury-detail:${player.id}`);
      const severityRoll = injuryRng.next();
      const severity = injurySeverity(severityRoll);
      const missedGames = severity === "catastrophic" ? injuryRng.int(8, 12) : severity === "major" ? injuryRng.int(4, 8) : severity === "moderate" ? injuryRng.int(2, 5) : injuryRng.int(0, 2);
      return {
        id: `college-injury-${seasonYear}-${index + 1}-${player.id}`,
        playerId: player.id,
        schoolId: player.schoolId,
        seasonYear,
        severity,
        missedGames
      };
    });
  return {
    seasonYear,
    production,
    awards,
    injuries,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("production") || path.includes("injury") || path.includes("award")),
    usesYearZeroBundles: false
  };
}
