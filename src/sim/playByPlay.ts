import { clamp, createRng, type Rng } from "../lib/rng";
import type { Game, GameLogEntry, GameResult, GameSave, Player, PlayerSnapCount, Position } from "../types";
import { calculateSnapPlan, type SnapPhase, type SnapPlan, type SnapPlanEntry, weightedEntryPick } from "./personnel";
import { buildMedicalEvent, injuryRiskWeight, pickInjuryCandidate } from "./medical";
import { ratingValue } from "./ratings";
import { depthChart, medicalQuality, teamById, teamOverall, unitGrade } from "./selectors";
import { staffGameModifier } from "./staffModel";

const coreOffensePositions = new Set<Position>(["QB", "LT", "LG", "C", "RG", "RT"]);
const runPositionWeights: Partial<Record<Position, number>> = { RB: 72, QB: 7, WR: 4, TE: 3 };
const targetPositionWeights: Partial<Record<Position, number>> = { WR: 76, TE: 52, RB: 28 };
const defenderPositionWeights: Partial<Record<Position, number>> = { EDGE: 50, DL: 42, LB: 44, CB: 34, S: 30 };
const GAME_INJURY_BASE_CHANCE = 0.0075;
const GAME_INJURY_MIN_CHANCE = 0.0018;
const GAME_INJURY_MAX_CHANCE = 0.022;

function clockText(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function offensiveGrade(save: GameSave, teamId: string): number {
  const qbPlayer = depthChart(save, teamId).QB[0];
  const qb = qbPlayer?.overall ?? 55;
  const skill = unitGrade(save, teamId, ["RB", "WR", "TE"]);
  const line = unitGrade(save, teamId, ["LT", "LG", "C", "RG", "RT"]);
  return Math.round(qb * 0.36 + skill * 0.34 + line * 0.3 + staffGameModifier(save.staff, teamId, "offense"));
}

function defensiveGrade(save: GameSave, teamId: string): number {
  const front = unitGrade(save, teamId, ["EDGE", "DL", "LB"]);
  const coverage = unitGrade(save, teamId, ["CB", "S"]);
  return Math.round(front * 0.52 + coverage * 0.48 + staffGameModifier(save.staff, teamId, "defense"));
}

function kickerGrade(save: GameSave, teamId: string): number {
  const kicker = depthChart(save, teamId).K[0];
  return (kicker?.overall ?? 62) + staffGameModifier(save.staff, teamId, "special");
}

function punterGrade(save: GameSave, teamId: string): number {
  const punter = depthChart(save, teamId).P[0];
  return (punter?.overall ?? 62) + staffGameModifier(save.staff, teamId, "special");
}

function fieldText(yardLine: number): string {
  const clamped = Math.round(clamp(yardLine, 1, 99));
  if (clamped === 50) return "midfield";
  if (clamped < 50) return `own ${clamped}`;
  return `opponent ${100 - clamped}`;
}

function chooseBallCarrier(entries: SnapPlanEntry[], rng: Rng): SnapPlanEntry | undefined {
  return weightedEntryPick(entries, rng, runPositionWeights);
}

function chooseReceiver(entries: SnapPlanEntry[], rng: Rng): SnapPlanEntry | undefined {
  return weightedEntryPick(entries, rng, targetPositionWeights);
}

function chooseDefender(entries: SnapPlanEntry[], rng: Rng): SnapPlanEntry | undefined {
  return weightedEntryPick(entries, rng, defenderPositionWeights);
}

function entryGrade(entry: SnapPlanEntry | undefined, fallback = 60): number {
  return entry?.effectiveOverall ?? entry?.player?.overall ?? fallback;
}

function averagePositionGrade(entries: SnapPlanEntry[], positions: Position[], fallback = 60): number {
  const matching = entries.filter((entry) => entry.player && positions.includes(entry.position));
  if (!matching.length) return fallback;
  return Math.round(matching.reduce((sum, entry) => sum + entryGrade(entry, fallback), 0) / matching.length);
}

function qbDecisionGrade(qb: Player | undefined): number {
  if (!qb) return 58;
  return Math.round(
    (ratingValue(qb.ratings, "shortAccuracy") +
      ratingValue(qb.ratings, "mediumAccuracy") +
      ratingValue(qb.ratings, "timing") +
      ratingValue(qb.ratings, "pocketPresence") +
      ratingValue(qb.ratings, "pressureSense") +
      ratingValue(qb.ratings, "composure")) /
      6
  );
}

function receiverSkill(receiver: Player | undefined): number {
  if (!receiver) return 58;
  return Math.round(
    (ratingValue(receiver.ratings, "passCatching") +
      ratingValue(receiver.ratings, "separation") +
      ratingValue(receiver.ratings, "shortRoute") +
      ratingValue(receiver.ratings, "mediumRoute") +
      ratingValue(receiver.ratings, "yardsAfterCatch")) /
      5
  );
}

function runnerSecurity(runner: Player | undefined): number {
  if (!runner) return 58;
  return Math.round((ratingValue(runner.ratings, "ballSecurity") + ratingValue(runner.ratings, "contactBalance") + ratingValue(runner.ratings, "composure")) / 3);
}

export interface PassMatchupInput {
  qbGrade: number;
  targetGrade: number;
  defenderGrade: number;
  passBlock: number;
  passRush: number;
  pressureSense: number;
  composure: number;
}

export function passMatchupChances(input: PassMatchupInput): { sackChance: number; interceptionChance: number; yardsMean: number } {
  const pressureDiff = input.passRush - input.passBlock;
  const coverageDiff = input.defenderGrade - (input.qbGrade * 0.58 + input.targetGrade * 0.42);
  return {
    sackChance: clamp(0.052 + pressureDiff * 0.0022 - input.pressureSense * 0.00035, 0.014, 0.13),
    interceptionChance: clamp(0.024 + coverageDiff * 0.0014 - input.composure * 0.00016, 0.006, 0.072),
    yardsMean: 6.8 + (input.qbGrade * 0.45 + input.targetGrade * 0.4 - input.defenderGrade * 0.55 - pressureDiff * 0.18 - 18) * 0.08
  };
}

function consumeClock(clock: number, rng: Rng, playType: "run" | "pass" | "kick" | "punt"): number {
  const burn =
    playType === "run" ? rng.int(28, 43) : playType === "pass" ? rng.int(8, 38) : playType === "punt" ? rng.int(7, 14) : rng.int(5, 9);
  return clock - burn;
}

function maybeInjury(
  save: GameSave,
  offenseTeamId: string,
  defenseTeamId: string,
  rng: Rng,
  quarter: number,
  clock: number,
  log: GameLogEntry[],
  injuries: GameResult["injuries"],
  activeEntries: SnapPlanEntry[],
  snapCounts: Record<string, PlayerSnapCount>,
  gameId: string
): GameResult["injuries"][number] | undefined {
  const pool = activeEntries.map((entry) => entry.player).filter(Boolean) as Player[];
  if (pool.length === 0) return undefined;
  const averageRisk =
    pool.reduce((sum, player) => sum + injuryRiskWeight(player, medicalQuality(save, player.teamId), ((snapCounts[player.id]?.offense ?? 0) + (snapCounts[player.id]?.defense ?? 0)) / 72), 0) /
    pool.length;
  if (!rng.bool(clamp(GAME_INJURY_BASE_CHANCE * averageRisk, GAME_INJURY_MIN_CHANCE, GAME_INJURY_MAX_CHANCE))) return undefined;
  const player = pickInjuryCandidate(
    pool,
    rng,
    (teamId) => medicalQuality(save, teamId),
    (playerId) => ((snapCounts[playerId]?.offense ?? 0) + (snapCounts[playerId]?.defense ?? 0) + (snapCounts[playerId]?.specialTeams ?? 0)) / 72
  );
  if (!player) return undefined;
  const event = buildMedicalEvent(save, player, rng, {
    week: save.currentWeek,
    source: "game",
    gameId,
    trainerQuality: medicalQuality(save, player.teamId)
  });
  injuries.push(event);
  log.push({
    quarter,
    clock: clockText(clock),
    offenseTeamId,
    defenseTeamId,
    down: 1,
    distance: 10,
    yardLine: 25,
    type: "injury" as GameLogEntry["type"],
    text:
      event.status === "limited"
        ? `${event.playerName} is limited by a ${event.name}. Medical staff expects a temporary OVR penalty of ${event.ovrPenalty}.`
        : event.careerEnding
          ? `${event.playerName} suffers a severe ${event.name}. The medical staff fears this is career-ending.`
          : `${event.playerName} leaves with a ${event.name}. Training staff estimates ${event.weeksRemaining} week${event.weeksRemaining === 1 ? "" : "s"}.`
  });
  return event;
}

function touchdownText(save: GameSave, offenseTeamId: string, player: Player | undefined, playType: "run" | "pass"): string {
  const team = teamById(save, offenseTeamId);
  if (!player) return `${team.fullName} touchdown.`;
  return playType === "run"
    ? `${player.lastName} finishes the drive. Touchdown ${team.abbreviation}.`
    : `${player.lastName} hauls it in. Touchdown ${team.abbreviation}.`;
}

export function simulateGame(save: GameSave, game: Game): GameResult {
  const rng = createRng(`${save.seed}:${game.id}`);
  const home = teamById(save, game.homeTeamId);
  const away = teamById(save, game.awayTeamId);
  const score: Record<string, number> = { [home.id]: 0, [away.id]: 0 };
  const log: GameLogEntry[] = [];
  const injuries: GameResult["injuries"] = [];
  const snapCounts: Record<string, PlayerSnapCount> = {};
  const medicalOverrides = new Map<string, Partial<Player>>();
  let simSave: GameSave = save;
  const rebuildSimSave = () => {
    simSave = {
      ...save,
      players: save.players.map((player) => {
        const override = medicalOverrides.get(player.id);
        return override ? { ...player, ...override } : player;
      })
    };
  };
  const snapPlans: Record<string, SnapPlan> = {};
  const gameGrades: Record<string, { offense: number; defense: number; kicker: number; punter: number }> = {};
  const rebuildSnapPlan = (teamId: string) => {
    rebuildSimSave();
    snapPlans[teamId] = calculateSnapPlan(simSave, teamId);
    gameGrades[teamId] = {
      offense: offensiveGrade(simSave, teamId),
      defense: defensiveGrade(simSave, teamId),
      kicker: kickerGrade(simSave, teamId),
      punter: punterGrade(simSave, teamId)
    };
  };
  rebuildSnapPlan(home.id);
  rebuildSnapPlan(away.id);

  let quarter = 1;
  let clock = 15 * 60;
  let offenseTeamId = rng.bool(0.5) ? home.id : away.id;
  let defenseTeamId = offenseTeamId === home.id ? away.id : home.id;
  let yardLine = 25;
  let down = 1;
  let distance = 10;
  let playCount = 0;

  const switchPossession = (newYardLine = 25) => {
    [offenseTeamId, defenseTeamId] = [defenseTeamId, offenseTeamId];
    yardLine = newYardLine;
    down = 1;
    distance = Math.min(10, 100 - yardLine);
  };

  const addScore = (teamId: string, points: number) => {
    score[teamId] += points;
  };

  const recordSnap = (playerId: string | undefined, phase: SnapPhase) => {
    if (!playerId) return;
    snapCounts[playerId] ??= { playerId, offense: 0, defense: 0, specialTeams: 0 };
    if (phase === "offense") snapCounts[playerId].offense += 1;
    if (phase === "defense") snapCounts[playerId].defense += 1;
    if (phase === "special") snapCounts[playerId].specialTeams += 1;
  };

  const activeSnapEntries = (teamId: string, phase: SnapPhase): SnapPlanEntry[] => {
    const entries = snapPlans[teamId].entries.filter((entry) => entry.phase === phase && entry.player && entry.snapShare > 0);
    const active = entries.filter((entry) => (phase === "offense" && coreOffensePositions.has(entry.position)) || (phase === "defense" && entry.starter) || entry.snapShare >= 0.995 || rng.bool(entry.snapShare));
    if (active.length > 0) return active;
    return entries.slice(0, 1);
  };

  const recordEntries = (entries: SnapPlanEntry[], phase: SnapPhase) => {
    entries.forEach((entry) => recordSnap(entry.playerId, phase));
  };

  const recordSpecialPosition = (teamId: string, position: Position) => {
    const entry = snapPlans[teamId].entries.find((candidate) => candidate.position === position && candidate.starter);
    recordSnap(entry?.playerId, "special");
  };

  log.push({
    quarter,
    clock: clockText(clock),
    offenseTeamId,
    defenseTeamId,
    down,
    distance,
    yardLine,
    type: "note",
    text: `${away.fullName} at ${home.fullName}. ${teamById(save, offenseTeamId).abbreviation} receives the opening kick.`
  });

  while (playCount < 210) {
    if (clock <= 0) {
      quarter += 1;
      if (quarter === 5 && score[home.id] !== score[away.id]) break;
      if (quarter === 5 && score[home.id] === score[away.id]) {
        clock = 10 * 60;
        log.push({
          quarter,
          clock: clockText(clock),
          offenseTeamId,
          defenseTeamId,
          down,
          distance,
          yardLine,
          type: "note",
          text: "Regulation ends tied. Overtime begins."
        });
      } else if (quarter > 5) {
        break;
      } else {
        clock = 15 * 60;
        log.push({
          quarter,
          clock: clockText(clock),
          offenseTeamId,
          defenseTeamId,
          down,
          distance,
          yardLine,
          type: "note",
          text: `Start of quarter ${quarter}.`
        });
      }
    }

    playCount += 1;
    const offense = teamById(save, offenseTeamId);
    const defense = teamById(save, defenseTeamId);
    const offenseGrade = gameGrades[offenseTeamId]?.offense ?? offensiveGrade(simSave, offenseTeamId);
    const defenseGradeValue = gameGrades[defenseTeamId]?.defense ?? defensiveGrade(simSave, defenseTeamId);
    const gradeDiff = offenseGrade - defenseGradeValue;

    if (down === 4) {
      const fieldGoalDistance = 100 - yardLine + 17;
      const trailingLate = quarter >= 4 && score[offenseTeamId] < score[defenseTeamId];
      const shouldKick = fieldGoalDistance <= 56 && (!trailingLate || distance > 3);
      const shouldGo = trailingLate && distance <= 4 && yardLine > 38;

      if (shouldKick) {
        recordSpecialPosition(offenseTeamId, "K");
        const kicker = gameGrades[offenseTeamId]?.kicker ?? kickerGrade(simSave, offenseTeamId);
        const chance = clamp(0.92 - Math.max(0, fieldGoalDistance - 35) * 0.018 + (kicker - 60) * 0.004, 0.28, 0.97);
        clock = consumeClock(clock, rng, "kick");
        if (rng.bool(chance)) {
          addScore(offenseTeamId, 3);
          log.push({
            quarter,
            clock: clockText(clock),
            offenseTeamId,
            defenseTeamId,
            down,
            distance,
            yardLine,
            type: "kick",
            text: `${offense.abbreviation} converts from ${fieldGoalDistance} yards. ${offense.abbreviation} ${score[offenseTeamId]}, ${defense.abbreviation} ${score[defenseTeamId]}.`
          });
          switchPossession(25);
        } else {
          log.push({
            quarter,
            clock: clockText(clock),
            offenseTeamId,
            defenseTeamId,
            down,
            distance,
            yardLine,
            type: "kick",
            text: `${offense.abbreviation} misses from ${fieldGoalDistance}. ${defense.abbreviation} takes over.`
          });
          switchPossession(Math.round(clamp(100 - yardLine + 7, 20, 80)));
        }
        if (quarter === 5 && score[home.id] !== score[away.id]) break;
        continue;
      }

      if (!shouldGo) {
        recordSpecialPosition(offenseTeamId, "P");
        const punt = Math.round(clamp(rng.normal(42 + ((gameGrades[offenseTeamId]?.punter ?? punterGrade(simSave, offenseTeamId)) - 60) * 0.25, 8), 24, 64));
        const returnYards = Math.round(clamp(rng.normal(7 - gradeDiff * 0.03, 5), 0, 24));
        const newSpot = Math.round(clamp(100 - Math.min(99, yardLine + punt - returnYards), 3, 82));
        clock = consumeClock(clock, rng, "punt");
        log.push({
          quarter,
          clock: clockText(clock),
          offenseTeamId,
          defenseTeamId,
          down,
          distance,
          yardLine,
          type: "punt",
          text: `${offense.abbreviation} punts ${punt} yards. ${defense.abbreviation} starts at ${fieldText(newSpot)}.`
        });
        switchPossession(newSpot);
        continue;
      }
    }

    const passBias = down >= 3 || distance >= 7 ? 0.62 : 0.48;
    const playType: "run" | "pass" = rng.bool(passBias) ? "pass" : "run";
    const offensiveSnapEntries = activeSnapEntries(offenseTeamId, "offense");
    const defensiveSnapEntries = activeSnapEntries(defenseTeamId, "defense");
    recordEntries(offensiveSnapEntries, "offense");
    recordEntries(defensiveSnapEntries, "defense");
    const ballCarrierEntry = playType === "run" ? chooseBallCarrier(offensiveSnapEntries, rng) : chooseReceiver(offensiveSnapEntries, rng);
    const defenderEntry = chooseDefender(defensiveSnapEntries, rng);
    const ballCarrier = ballCarrierEntry?.player;
    const defender = defenderEntry?.player;
    const qb = offensiveSnapEntries.find((entry) => entry.position === "QB" && entry.starter)?.player;
    const passBlock = averagePositionGrade(offensiveSnapEntries, ["LT", "LG", "C", "RG", "RT"], offenseGrade);
    const runBlock = averagePositionGrade(offensiveSnapEntries, ["LT", "LG", "C", "RG", "RT", "TE"], offenseGrade);
    const passRush = averagePositionGrade(defensiveSnapEntries, ["EDGE", "DL"], defenseGradeValue);
    const runDefense = averagePositionGrade(defensiveSnapEntries, ["EDGE", "DL", "LB", "S"], defenseGradeValue);
    const coverage = averagePositionGrade(defensiveSnapEntries, ["CB", "S", "LB"], defenseGradeValue);
    let yards = 0;
    let text = "";
    let type: GameLogEntry["type"] = playType;

    if (playType === "pass") {
      const qbGrade = qbDecisionGrade(qb);
      const targetGrade = receiverSkill(ballCarrier);
      const defenderGrade = Math.max(entryGrade(defenderEntry, coverage), coverage);
      const pressureDiff = passRush - passBlock;
      const matchup = passMatchupChances({
        qbGrade,
        targetGrade,
        defenderGrade,
        passBlock,
        passRush,
        pressureSense: ratingValue(qb?.ratings, "pressureSense", 58),
        composure: ratingValue(qb?.ratings, "composure", 58)
      });
      if (rng.bool(matchup.sackChance)) {
        yards = -rng.int(3, 11);
        text = `${defender?.lastName ?? defense.abbreviation} gets home for a ${Math.abs(yards)}-yard sack.`;
      } else if (rng.bool(matchup.interceptionChance)) {
        yards = Math.round(clamp(rng.normal(8 + (qbGrade + targetGrade - defenderGrade - pressureDiff * 0.45) * 0.045, 9), -4, 34));
        yardLine += yards;
        type = "turnover";
        text = `${defense.abbreviation} intercepts the throw near ${fieldText(yardLine)}.`;
        clock = consumeClock(clock, rng, playType);
        log.push({ quarter, clock: clockText(clock), offenseTeamId, defenseTeamId, down, distance, yardLine, type, text });
        switchPossession(Math.round(clamp(100 - yardLine + rng.int(-8, 18), 5, 90)));
        continue;
      } else {
        yards = Math.round(clamp(rng.normal(matchup.yardsMean, 8.2), -4, 52));
        text = yards >= distance
          ? `${offense.abbreviation} complete to ${ballCarrier?.lastName ?? "the receiver"} for ${yards} yards.`
          : `${offense.abbreviation} gains ${yards} through the air.`;
      }
    } else {
      const runnerGrade = entryGrade(ballCarrierEntry, offenseGrade);
      const defenderGrade = Math.max(entryGrade(defenderEntry, runDefense), runDefense);
      const runDiff = runnerGrade * 0.58 + runBlock * 0.42 - defenderGrade;
      const fumbleChance = clamp(0.018 + (defenderGrade - runnerSecurity(ballCarrier)) * 0.00065, 0.004, 0.04);
      yards = Math.round(clamp(rng.normal(4.2 + runDiff * 0.052, 4.8), -5, 38));
      if (rng.bool(fumbleChance)) {
        yardLine += yards;
        type = "turnover";
        text = `${ballCarrier?.lastName ?? offense.abbreviation} loses the ball. ${defense.abbreviation} recovers.`;
        clock = consumeClock(clock, rng, playType);
        log.push({ quarter, clock: clockText(clock), offenseTeamId, defenseTeamId, down, distance, yardLine, type, text });
        switchPossession(Math.round(clamp(100 - yardLine, 4, 95)));
        continue;
      }
      text = `${ballCarrier?.lastName ?? offense.abbreviation} runs for ${yards} yard${Math.abs(yards) === 1 ? "" : "s"}.`;
    }

    yardLine += yards;
    clock = consumeClock(clock, rng, playType);

    if (yardLine <= 0) {
      addScore(defenseTeamId, 2);
      log.push({
        quarter,
        clock: clockText(clock),
        offenseTeamId,
        defenseTeamId,
        down,
        distance,
        yardLine,
        type: "score",
        text: `${defense.abbreviation} safety. ${defense.abbreviation} ${score[defenseTeamId]}, ${offense.abbreviation} ${score[offenseTeamId]}.`
      });
      switchPossession(30);
      continue;
    }

    if (yardLine >= 100) {
      addScore(offenseTeamId, 7);
      log.push({
        quarter,
        clock: clockText(clock),
        offenseTeamId,
        defenseTeamId,
        down,
        distance,
        yardLine: 100,
        type: "score",
        text: `${touchdownText(simSave, offenseTeamId, ballCarrier, playType)} ${offense.abbreviation} ${score[offenseTeamId]}, ${defense.abbreviation} ${score[defenseTeamId]}.`
      });
      switchPossession(25);
      if (quarter === 5 && score[home.id] !== score[away.id]) break;
      continue;
    }

    log.push({ quarter, clock: clockText(clock), offenseTeamId, defenseTeamId, down, distance, yardLine, type, text });
    const injury = maybeInjury(simSave, offenseTeamId, defenseTeamId, rng, quarter, clock, log, injuries, [...offensiveSnapEntries, ...defensiveSnapEntries], snapCounts, game.id);
    if (injury) {
      medicalOverrides.set(injury.playerId, {
        status: injury.status === "limited" ? "limited" : "injured",
        injuryWeeks: injury.weeksRemaining,
        injury: { ...injury }
      });
      rebuildSnapPlan(injury.teamId);
    }

    if (yards >= distance) {
      down = 1;
      distance = Math.min(10, 100 - yardLine);
    } else {
      down += 1;
      distance -= yards;
      if (down > 4) {
        log.push({
          quarter,
          clock: clockText(clock),
          offenseTeamId,
          defenseTeamId,
          down: 4,
          distance,
          yardLine,
          type: "note",
          text: `${defense.abbreviation} holds on downs.`
        });
        switchPossession(Math.round(clamp(100 - yardLine, 2, 98)));
      }
    }
  }

  if ((game.seasonType ?? "regular") === "postseason" && score[home.id] === score[away.id]) {
    const homeEdge = teamOverall(simSave, home.id) + rng.float(-8, 8);
    const awayEdge = teamOverall(simSave, away.id) + rng.float(-8, 8);
    const winnerId = homeEdge >= awayEdge ? home.id : away.id;
    score[winnerId] += 3;
    log.push({
      quarter: 5,
      clock: "0:00",
      offenseTeamId: winnerId,
      defenseTeamId: winnerId === home.id ? away.id : home.id,
      down: 1,
      distance: 10,
      yardLine: 35,
      type: "score",
      text: `${teamById(save, winnerId).fullName} breaks the postseason tie with a walk-off field goal.`
    });
  }

  return {
    homeScore: score[home.id],
    awayScore: score[away.id],
    log,
    snapCounts,
    injuries
  };
}
