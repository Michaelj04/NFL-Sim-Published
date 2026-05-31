import { clamp, createRng } from "../lib/rng";
import type { CollegeProgram, DraftEvaluationState, Prospect } from "../types";
import { annualRuntimeDebug } from "./annualRuntime";
import { rankProspectBoard } from "./scouting";

export function generateDraftEvaluationState(seed: string, draftYear: number, prospects: Prospect[], generatedWeek = 1): DraftEvaluationState {
  const rng = createRng(`${seed}:annual-draft-evaluation:${draftYear}`);
  const results = prospects.slice(0, 460).map((prospect, index) => {
    const prospectRng = rng.fork(prospect.id);
    const athleticBase = (prospect.combine.speed + prospect.combine.strength + prospect.combine.agility + prospect.combine.explosion) / 4;
    const allStarInvite = index < 120 || prospect.production >= 78 || prospect.projectedRound <= 3;
    const allStarSignal = allStarInvite ? Math.round(clamp(prospect.production * 0.55 + prospect.trueOverall * 0.35 + prospectRng.normal(0, 8), 1, 99)) : 0;
    const combineScore = Math.round(clamp(athleticBase * 0.72 + prospect.trueOverall * 0.18 + prospectRng.normal(0, 7), 1, 99));
    const proDayScore = Math.round(clamp(combineScore * 0.65 + prospect.production * 0.2 + prospectRng.normal(0, 6), 1, 99));
    const medicalGrade = Math.round(clamp(prospect.medical - (prospect.riskFlags.includes("Medical") ? 8 : 0) + prospectRng.normal(0, 4), 1, 99));
    return {
      prospectId: prospect.id,
      allStarInvite,
      allStarSignal,
      combineScore,
      proDayScore,
      medicalGrade,
      evaluationSummary: `${allStarInvite ? "All-star invite" : "No all-star invite"}; combine ${combineScore}; pro day ${proDayScore}; medical ${medicalGrade}.`
    };
  });
  return {
    draftYear,
    generatedWeek,
    results,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("all_star") || path.includes("combine") || path.includes("pro_day") || path.includes("draft_stock")),
    usesYearZeroBundles: false
  };
}

export function applyDraftEvaluationToProspects(prospects: Prospect[], evaluation: DraftEvaluationState, schools: CollegeProgram[], seed: string): Prospect[] {
  const resultByProspectId = new Map(evaluation.results.map((result) => [result.prospectId, result]));
  const evaluated = prospects.map((prospect) => {
    const result = resultByProspectId.get(prospect.id);
    if (!result) return prospect;
    const athleticSignal = Math.round((result.combineScore + result.proDayScore) / 2);
    const stockDelta = Math.round(clamp((athleticSignal - 62) * 0.16 + (result.allStarSignal ? (result.allStarSignal - 62) * 0.08 : 0) + (result.medicalGrade - prospect.medical) * 0.1, -12, 12));
    const medicalConcern = result.medicalGrade < 45 && !prospect.riskFlags.includes("Medical") ? ["Medical"] : [];
    const progress = Math.round(clamp(prospect.scouted.progress + (result.allStarInvite ? 4 : 1) + (athleticSignal >= 75 ? 3 : 0), 1, 100));
    return {
      ...prospect,
      stock: Math.round(clamp(prospect.stock + stockDelta, -50, 50)),
      medical: result.medicalGrade,
      riskFlags: [...prospect.riskFlags, ...medicalConcern],
      combine: {
        ...prospect.combine,
        speed: Math.round(clamp((prospect.combine.speed * 0.8 + result.combineScore * 0.2), 1, 99)),
        strength: Math.round(clamp((prospect.combine.strength * 0.8 + result.combineScore * 0.2), 1, 99)),
        agility: Math.round(clamp((prospect.combine.agility * 0.75 + result.proDayScore * 0.25), 1, 99)),
        explosion: Math.round(clamp((prospect.combine.explosion * 0.75 + result.proDayScore * 0.25), 1, 99))
      },
      scoutReports: [result.evaluationSummary, ...(prospect.scoutReports ?? [])].slice(0, 6),
      scouted: {
        ...prospect.scouted,
        confidence: progress,
        progress,
        watchedTape: prospect.scouted.watchedTape || result.allStarInvite,
        concerns: {
          ...prospect.scouted.concerns,
          medical: [result.medicalGrade, result.medicalGrade] as [number, number]
        },
        note: `${prospect.scouted.note} Evaluation bridge: ${result.evaluationSummary}`
      }
    };
  });
  return rankProspectBoard(evaluated, schools, seed);
}
