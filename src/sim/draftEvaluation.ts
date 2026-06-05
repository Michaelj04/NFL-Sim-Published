import { clamp, createRng } from "../lib/rng";
import type { CollegeProgram, DraftEvaluationState, Prospect } from "../types";
import { annualAllStarEffect, annualAllStarEvents, annualCombineAthleticWeight, annualCompetitionTranslation, annualDraftStockWeight, annualProDayAdjustment, annualRuntimeDebug } from "./annualRuntime";
import { rankProspectBoard } from "./scouting";

export function generateDraftEvaluationState(seed: string, draftYear: number, prospects: Prospect[], generatedWeek = 1, schools: CollegeProgram[] = []): DraftEvaluationState {
  const rng = createRng(`${seed}:annual-draft-evaluation:${draftYear}`);
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const allStarEvents = annualAllStarEvents();
  const results = prospects.slice(0, 460).map((prospect, index) => {
    const prospectRng = rng.fork(prospect.id);
    const school = schoolById.get(prospect.schoolId);
    const competitionTier = competitionTierForSchool(school);
    const competition = annualCompetitionTranslation(competitionTier);
    const athleticBase = (prospect.combine.speed + prospect.combine.strength + prospect.combine.agility + prospect.combine.explosion) / 4;
    const athleticWeight = annualCombineAthleticWeight(prospect.position);
    const proDayAdjustment = annualProDayAdjustment();
    const allStarEvent = chooseAllStarEvent(prospect, index, school, allStarEvents);
    const allStarInvite = Boolean(allStarEvent);
    const allStarEffect = allStarEvent ? annualAllStarEffect(allStarEvent.eventId) : undefined;
    const competitionAdjustedProduction = prospect.production * competition.draftEvalMult;
    const smallSchoolBonus = school?.subdivision === "FCS" && allStarEvent ? allStarEvent.smallSchoolValidationBonus : 0;
    const scoutedOverall = (prospect.scouted.low + prospect.scouted.high) / 2;
    const practiceWinner = allStarInvite && prospectRng.next() < clamp((prospect.scouted.high - 58) / 55, 0.04, 0.38);
    const gameMvp = practiceWinner && prospectRng.next() < clamp((prospect.production - 62) / 90, 0.01, 0.16);
    const allStarSignal = allStarInvite ? Math.round(clamp(
      competitionAdjustedProduction * 0.5
      + scoutedOverall * 0.32
      + (allStarEffect?.inviteBonus ?? 0)
      + (practiceWinner ? allStarEffect?.practiceWinnerBonus ?? 0 : 0)
      + (gameMvp ? allStarEffect?.gameMvpBonus ?? 0 : 0)
      + smallSchoolBonus
      + prospectRng.normal(0, 8),
      1,
      99
    )) : 0;
    const combineScore = Math.round(clamp(athleticBase * athleticWeight + scoutedOverall * (1 - Math.min(0.9, athleticWeight)) + prospectRng.normal(0, 7), 1, 99));
    const proDayScore = Math.round(clamp(combineScore * 0.65 + competitionAdjustedProduction * 0.2 + proDayAdjustment.bias * 10 + prospectRng.normal(proDayAdjustment.maxPositiveDelta + proDayAdjustment.maxNegativeDelta, 6), 1, 99));
    const medicalGrade = Math.round(clamp(prospect.medical - (prospect.riskFlags.includes("Medical") ? 8 : 0) + prospectRng.normal(0, 4), 1, 99));
    return {
      prospectId: prospect.id,
      allStarInvite,
      allStarEvent: allStarEvent?.eventId,
      allStarSignal,
      competitionTier,
      competitionMultiplier: competition.draftEvalMult,
      combineScore,
      proDayScore,
      medicalGrade,
      evaluationSummary: `${allStarInvite ? `${allStarEvent?.eventName ?? "All-star"} invite` : "No all-star invite"}; competition ${competitionTier} x${competition.draftEvalMult}; combine ${combineScore}; pro day ${proDayScore}; medical ${medicalGrade}.`
    };
  });
  return {
    draftYear,
    generatedWeek,
    results,
    runtimeCsvs: annualRuntimeDebug().loadedRuntimeCsvs.filter((path) => path.includes("all_star") || path.includes("allstar") || path.includes("combine") || path.includes("competition") || path.includes("pro_day") || path.includes("draft_stock")),
    usesYearZeroBundles: false
  };
}

export function applyDraftEvaluationToProspects(prospects: Prospect[], evaluation: DraftEvaluationState, schools: CollegeProgram[], seed: string): Prospect[] {
  const resultByProspectId = new Map(evaluation.results.map((result) => [result.prospectId, result]));
  const evaluated = prospects.map((prospect) => {
    const result = resultByProspectId.get(prospect.id);
    if (!result) return prospect;
    const athleticSignal = Math.round((result.combineScore + result.proDayScore) / 2);
    const stockDelta = Math.round(clamp(
      (athleticSignal - 62) * annualDraftStockWeight(prospect.position, "traits", 0.16)
      + (prospect.production * (result.competitionMultiplier ?? 1) - 62) * annualDraftStockWeight(prospect.position, "production", 0.12)
      + (result.allStarSignal ? (result.allStarSignal - 62) * annualDraftStockWeight(prospect.position, "film", 0.08) : 0)
      + (result.medicalGrade - prospect.medical) * annualDraftStockWeight(prospect.position, "medical", 0.1),
      -12,
      12
    ));
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

function chooseAllStarEvent(prospect: Prospect, index: number, school: CollegeProgram | undefined, events: ReturnType<typeof annualAllStarEvents>) {
  const classKey = prospect.classYear === "JR" ? "declared_JR" : prospect.classYear.replace("-", "_");
  const eligible = events.filter((event) => event.eligibleClasses.includes(classKey) || event.eligibleClasses.includes(prospect.classYear));
  return eligible.find((event) => {
    const productionGate = prospect.production >= (event.levelFocus === "national" ? 70 : 64);
    const rankGate = index < event.targetInvites;
    const smallSchoolGate = school?.subdivision === "FCS" && prospect.scouted.high >= 62 && index < event.targetInvites + 90;
    return rankGate || productionGate || smallSchoolGate || prospect.projectedRound <= 4;
  });
}

function competitionTierForSchool(school: CollegeProgram | undefined): string {
  if (!school) return "OTHER";
  if (school.subdivision === "FCS") return school.prestige >= 62 || school.competition >= 62 ? "FCS_TOP" : "FCS_LOW";
  if (school.prestige >= 80 || school.competition >= 78) return "FBS_POWER";
  return "FBS_G5";
}
