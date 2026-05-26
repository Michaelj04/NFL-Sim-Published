import { clamp, createRng } from "../lib/rng";
import type { Game, GameSave, InboxItem, Player, TeamRecord } from "../types";
import { advanceToDraftPrep, normalizeCapState, openOffseasonContracts, recalculateBudgets, teamCapLedger } from "./cap";
import { activeRosterLimitForDate, addDays, buildSeasonCalendar, calendarPhaseForDate, currentFootballWeek, finalCutdownDate, gamesOnDate, leagueYearStartDate, refreshCalendar, regularSeasonStartDate } from "./calendar";
import { normalizePlayerMakeup } from "./concerns";
import { ensureDraftState } from "./draft";
import { FREE_AGENT_TEAM_ID, releasePlayerToFreeAgency, rosterSize } from "./freeAgents";
import { clearIrState, processIrWindows } from "./ir";
import { autoManageCpuPracticeSquads, clearPracticeSquadState, fillPracticeSquadsFromFreeAgency, isPracticeSquadPlayer, processPracticeSquadWeek } from "./practiceSquad";
import { autoManageCpuRoster } from "./rosterAi";
import { createDraftState, createRecords, generateSeasonDraftAssets } from "./generate";
import { applyMedicalEvents, dailyPracticeMedicalEvents, tickMedicalRecovery, weeklyPracticeMedicalEvents } from "./medical";
import { runWeeklyTraining } from "./playerModel";
import { simulateGame } from "./playByPlay";
import { completeCurrentPostseasonRound, createNextPostseasonRound, currentPostseasonRound, postseasonRoundLabel, startPostseason } from "./postseason";
import { divisionRanksFromRecords, generateLeagueSchedule } from "./schedule";
import { applyWeeklyScoutingPlan } from "./scouting";
import { processWaiversForDate } from "./waivers";
import { resolveFreeAgencyWave } from "./freeAgentMarket";
import { medicalQuality, payroll, rosterNeeds, scoutingQuality, selectedTeam, teamById, teamSchedule, teamOverall } from "./selectors";

function cloneSave(save: GameSave): GameSave {
  return JSON.parse(JSON.stringify(save)) as GameSave;
}

function updateRecord(record: TeamRecord, scored: number, allowed: number): TeamRecord {
  return {
    wins: record.wins + (scored > allowed ? 1 : 0),
    losses: record.losses + (scored < allowed ? 1 : 0),
    ties: record.ties + (scored === allowed ? 1 : 0),
    pointsFor: record.pointsFor + scored,
    pointsAgainst: record.pointsAgainst + allowed
  };
}

function availabilityTick(player: Player): Player {
  const recovered = tickMedicalRecovery(player);
  if (recovered.status !== "suspended") return recovered;
  const weeks = Math.max(0, player.suspensionWeeks - 1);
  return {
    ...recovered,
    suspensionWeeks: weeks,
    status: weeks === 0 ? "active" : "suspended"
  };
}

function availabilityDailyTick(player: Player): Player {
  const recovered = tickMedicalRecoveryDaily(player);
  if (recovered.status !== "suspended") return recovered;
  const weeks = Math.max(0, Number((player.suspensionWeeks - 1 / 7).toFixed(3)));
  return {
    ...recovered,
    suspensionWeeks: weeks,
    status: weeks <= 0 ? "active" : "suspended"
  };
}

function tickMedicalRecoveryDaily(player: Player): Player {
  if (!player.injury) {
    if (player.status === "injured") {
      const weeks = Math.max(0, Number((player.injuryWeeks - 1 / 7).toFixed(3)));
      return { ...player, injuryWeeks: weeks, status: weeks <= 0 ? "active" : "injured" };
    }
    return player;
  }
  if (player.status === "injured") {
    const weeks = Math.max(0, Number((player.injury.weeksRemaining - 1 / 7).toFixed(3)));
    if (weeks > 0) {
      return { ...player, injuryWeeks: weeks, injury: { ...player.injury, weeksRemaining: weeks } };
    }
    if (player.injury.limitedWeeksRemaining > 0) {
      return {
        ...player,
        status: "limited",
        injuryWeeks: 0,
        injury: { ...player.injury, status: "limited", weeksRemaining: 0 }
      };
    }
    return { ...player, status: "active", injuryWeeks: 0, injury: undefined };
  }
  if (player.status === "limited") {
    const limitedWeeks = Math.max(0, Number((player.injury.limitedWeeksRemaining - 1 / 7).toFixed(3)));
    if (limitedWeeks > 0) {
      return { ...player, injury: { ...player.injury, limitedWeeksRemaining: limitedWeeks } };
    }
    return { ...player, status: "active", injuryWeeks: 0, injury: undefined };
  }
  return player;
}

export function characterEventChance(character: number): number {
  if (character >= 80) return 0;
  if (character >= 60) return 0.00004;
  if (character >= 45) return 0.00075 + (60 - character) * 0.000015;
  return clamp(0.0035 + (45 - character) * 0.00022, 0.0035, 0.0085);
}

function characterIncidentLabel(player: Player, rngSeed: string): string {
  const makeup = player.makeup?.character ?? 70;
  const rng = createRng(rngSeed);
  const severe = makeup < 45;
  return rng.pick(
    severe
      ? ["DUI arrest", "gambling suspension", "conduct investigation", "legal issue", "public altercation", "team rules violation"]
      : ["team rules violation", "conduct investigation", "public altercation"]
  );
}

export function applyCharacterEvents(save: GameSave): GameSave {
  const events: InboxItem[] = [];
  const players = save.players.map((player) => {
    if (player.teamId === FREE_AGENT_TEAM_ID) return player;
    if (player.status !== "active" && player.status !== "limited") return player;
    const makeup = normalizePlayerMakeup(player, save.seed);
    const chance = characterEventChance(makeup.character);
    if (chance <= 0) return { ...player, makeup };
    const rngSeed = `${save.seed}:character-event:${save.currentWeek}:${player.id}`;
    const rng = createRng(rngSeed);
    if (!rng.bool(chance)) return { ...player, makeup };

    const incident = characterIncidentLabel({ ...player, makeup }, rngSeed);
    const lowCharacter = makeup.character < 45;
    const weeks = Math.round(clamp(rng.normal(lowCharacter ? 4 : 2, lowCharacter ? 1.5 : 0.75), 1, lowCharacter ? 8 : 3));
    const team = teamById(save, player.teamId);
    events.push({
      id: `discipline-${save.currentWeek}-${player.id}`,
      week: save.currentWeek,
      category: "discipline",
      title: `${player.position} suspended: ${player.firstName} ${player.lastName}`,
      body: `${team.fullName} ${player.position} ${player.firstName} ${player.lastName} will miss ${weeks} week${weeks === 1 ? "" : "s"} after a ${incident}.`,
      priority: player.teamId === save.selectedTeamId || weeks >= 4 ? "high" : "normal",
      read: false
    });
    return {
      ...player,
      makeup,
      status: "suspended" as const,
      suspensionWeeks: weeks,
      injuryWeeks: 0
    };
  });

  if (!events.length) return { ...save, players };
  return {
    ...save,
    players,
    inbox: [...events.reverse(), ...save.inbox]
  };
}

function emptyStats() {
  return {
    games: 0,
    snaps: 0,
    offenseSnaps: 0,
    defenseSnaps: 0,
    specialTeamsSnaps: 0,
    passYards: 0,
    rushYards: 0,
    receivingYards: 0,
    tackles: 0,
    sacks: 0,
    interceptions: 0,
    touchdowns: 0
  };
}

function applySnapCounts(player: Player, counts: { offense: number; defense: number; specialTeams: number }, bucket: "stats" | "playoffStats" = "stats"): Player {
  const total = counts.offense + counts.defense + counts.specialTeams;
  const stats = player[bucket] ?? emptyStats();
  return {
    ...player,
    [bucket]: {
      ...stats,
      games: stats.games + (total > 0 ? 1 : 0),
      snaps: (stats.snaps ?? 0) + total,
      offenseSnaps: (stats.offenseSnaps ?? 0) + counts.offense,
      defenseSnaps: (stats.defenseSnaps ?? 0) + counts.defense,
      specialTeamsSnaps: (stats.specialTeamsSnaps ?? 0) + counts.specialTeams
    }
  };
}

function selectedGameRecap(save: GameSave, game: Game): InboxItem | undefined {
  const team = selectedTeam(save);
  if (game.homeTeamId !== team.id && game.awayTeamId !== team.id) return undefined;
  const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
  const opponent = teamById(save, opponentId);
  const teamScore = game.homeTeamId === team.id ? game.homeScore : game.awayScore;
  const opponentScore = game.homeTeamId === team.id ? game.awayScore : game.homeScore;
  const result = teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "tie";
  const record = save.records[team.id];
  return {
    id: `game-${game.id}`,
    week: save.currentWeek,
    category: "game",
    title: `Week ${save.currentWeek}: ${team.abbreviation} ${result} vs ${opponent.abbreviation}`,
    body: `${team.fullName} ${teamScore}, ${opponent.fullName} ${opponentScore}. Current record: ${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}.`,
    priority: result === "loss" ? "high" : "normal",
    read: false
  };
}

function scoutingInbox(save: GameSave): InboxItem {
  const team = selectedTeam(save);
  const needs = rosterNeeds(save, team.id).slice(0, 3);
  const needPositions = new Set(needs.map((need) => need.position));
  const latestReport = save.scoutingPlan?.reports?.[0];
  const fits = save.prospects
    .filter((prospect) => needPositions.has(prospect.position))
    .slice(0, 4)
    .map((prospect) => `${prospect.firstName} ${prospect.lastName} (${prospect.position}, team #${prospect.teamRank})`)
    .join("; ");

  return {
    id: `scouting-week-${save.currentWeek}`,
    week: save.currentWeek,
    category: "scouting",
    title: latestReport ? latestReport.title : "Scouting board progress updated",
    body: `${latestReport ? `${latestReport.body} ` : ""}Primary needs: ${needs.map((need) => `${need.position} ${need.grade}`).join(", ")}. Recommended targets: ${fits || "continue broad board work"}.`,
    priority: "normal",
    read: false
  };
}

function staffInbox(save: GameSave): InboxItem {
  const team = selectedTeam(save);
  const nextGame = teamSchedule(save, team.id).find((game) => game.status === "scheduled");
  const opponent = nextGame ? teamById(save, nextGame.homeTeamId === team.id ? nextGame.awayTeamId : nextGame.homeTeamId) : undefined;
  const teamGrade = teamOverall(save, team.id);
  const opponentGrade = opponent ? teamOverall(save, opponent.id) : 0;
  const lean = opponent ? (teamGrade >= opponentGrade ? "lean on balanced tempo" : "shorten the game and protect field position") : "prepare for draft meetings";
  return {
    id: `staff-week-${save.currentWeek}`,
    week: save.currentWeek,
    category: "staff",
    title: opponent ? `Coach prep: ${opponent.abbreviation} next` : "Staff prep: season wrap",
    body: opponent
      ? `Staff model: ${teamGrade} team grade vs ${opponentGrade}. Recommendation: ${lean}.`
      : "No regular-season opponent remains. Staff is shifting to player evaluations and draft board sorting.",
    priority: "normal",
    read: false
  };
}

function goalsInbox(save: GameSave): InboxItem | undefined {
  if (save.mode !== "goals") return undefined;
  const team = selectedTeam(save);
  const record = save.records[team.id];
  const played = record.wins + record.losses + record.ties;
  if (played === 0 || save.currentWeek % 4 !== 0) return undefined;
  const pace = Math.round((record.wins / played) * 17);
  const trust = pace >= save.goals.targetWins ? "steady" : "under pressure";
  return {
    id: `goals-week-${save.currentWeek}`,
    week: save.currentWeek,
    category: "goal",
    title: "Owner goal checkpoint",
    body: `Win pace is ${pace}. Target is ${save.goals.targetWins}. Owner trust is ${trust}; cap room is $${save.budget[team.id].toFixed(1)}M.`,
    priority: pace >= save.goals.targetWins ? "low" : "high",
    read: false
  };
}

function budgetRefresh(save: GameSave): Record<string, number> {
  return Object.fromEntries(save.teams.map((team) => [team.id, teamCapLedger(save, team.id).capRoom]));
}

function processRosterWeek(save: GameSave): GameSave {
  let next = processPracticeSquadWeek(save);
  next.players = next.players.map(availabilityTick);
  next = processIrWindows(next);
  next = autoManageCpuPracticeSquads(autoManageCpuRoster(next));
  next = runWeeklyTraining(next);
  next = applyCharacterEvents(next);
  next = applyMedicalEvents(next, weeklyPracticeMedicalEvents(next, (teamId) => medicalQuality(next, teamId)));
  return next;
}

function shouldRunWeeklyReportProcessors(save: GameSave): boolean {
  const day = new Date(`${save.currentDate}T12:00:00.000Z`).getUTCDay();
  return day === 1;
}

function processDailyRoster(save: GameSave): GameSave {
  let next = refreshCalendar(save);
  next = processPracticeSquadWeek(next);
  next.players = next.players.map(availabilityDailyTick);
  next = processIrWindows(next);
  next = processWaiversForDate(next);
  next = autoManageCpuPracticeSquads(autoManageCpuRoster(next));
  if (shouldRunWeeklyReportProcessors(next)) {
    next = runWeeklyTraining(next);
    next = applyCharacterEvents(next);
    next = applyWeeklyScoutingPlan(next);
  }
  const phase = calendarPhaseForDate(next.seasonYear, next.currentDate);
  if (["training-camp", "preseason", "regular-season", "postseason"].includes(phase)) {
    next = applyMedicalEvents(next, dailyPracticeMedicalEvents(next, (teamId) => medicalQuality(next, teamId)));
  }
  return next;
}

function cutdownInbox(save: GameSave, count: number): InboxItem {
  return {
    id: `cutdown-block-${save.seasonYear}-${save.currentDate}-${count}`,
    week: save.currentWeek,
    date: save.currentDate,
    category: "staff",
    title: "Final cutdown required",
    body: `Active roster is at ${count}. Release or move players until the roster reaches 53 before advancing past cutdown.`,
    priority: "high",
    read: false,
    important: true,
    blocking: true
  };
}

function processCutdowns(save: GameSave): GameSave {
  if (save.currentDate < finalCutdownDate(save.seasonYear)) return save;
  let next = save;
  for (const team of next.teams) {
    const limit = activeRosterLimitForDate(next.seasonYear, next.currentDate);
    const count = rosterSize(next, team.id);
    if (count <= limit) continue;
    if (team.id === next.selectedTeamId) {
      const alreadyBlocked = next.inbox.some((item) => item.id.startsWith(`cutdown-block-${next.seasonYear}-${next.currentDate}`) && !item.read);
      return alreadyBlocked ? next : { ...next, inbox: [cutdownInbox(next, count), ...next.inbox] };
    }
    const cuttable = next.players
      .filter((player) => player.teamId === team.id && player.status !== "injured" && player.reserveStatus !== "ir" && !isPracticeSquadPlayer(player))
      .sort((a, b) => a.overall - b.overall || a.potential - b.potential);
    for (const player of cuttable) {
      if (rosterSize(next, team.id) <= limit) break;
      next = releasePlayerToFreeAgency(next, player.id, team.id);
    }
  }
  return next;
}

function injuryReportStatus(player: Player): { practiceStatus: "full" | "limited" | "did-not-practice"; gameStatus: "available" | "questionable" | "doubtful" | "out" } {
  if (player.status === "injured" || player.status === "suspended") return { practiceStatus: "did-not-practice", gameStatus: "out" };
  if (player.status === "limited") {
    const weeks = player.injury?.limitedWeeksRemaining ?? player.injuryWeeks;
    return { practiceStatus: "limited", gameStatus: weeks > 0.55 ? "doubtful" : "questionable" };
  }
  return { practiceStatus: "full", gameStatus: "available" };
}

function generateInjuryReports(save: GameSave): GameSave {
  const upcoming = save.schedule.filter((game) => game.date && game.date >= save.currentDate && game.date <= addDays(save.currentDate, 3) && game.status === "scheduled");
  if (!upcoming.length) return save;
  const existing = new Set((save.injuryReports ?? []).map((report) => `${report.gameId}:${report.reportDate}`));
  const reports = [...(save.injuryReports ?? [])];
  for (const game of upcoming) {
    if (existing.has(`${game.id}:${save.currentDate}`)) continue;
    for (const teamId of [game.homeTeamId, game.awayTeamId]) {
      const players = save.players
        .filter((player) => player.teamId === teamId && (player.status === "injured" || player.status === "limited" || player.status === "suspended"))
        .map((player) => {
          const status = injuryReportStatus(player);
          return {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            position: player.position,
            practiceStatus: status.practiceStatus,
            gameStatus: status.gameStatus,
            injuryName: player.injury?.name ?? (player.status === "suspended" ? "Suspension" : undefined)
          };
        });
      if (!players.length) continue;
      reports.unshift({
        id: `injury-report-${save.currentDate}-${game.id}-${teamId}`,
        teamId,
        gameId: game.id,
        week: game.week,
        date: game.date ?? save.currentDate,
        reportDate: save.currentDate,
        players
      });
    }
  }
  return { ...save, injuryReports: reports.slice(0, 240) };
}

function processCalendarDeadlines(save: GameSave): GameSave {
  let next = refreshCalendar(save);
  next = processCutdowns(next);
  if (next.currentDate === `${next.seasonYear}-04-23` && next.phase === "free-agency") {
    next = advanceToDraftPrep(next);
  }
  if (next.currentDate === `${next.seasonYear}-08-13` && next.phase === "offseason-complete") {
    next = { ...next, phase: "preseason" };
  }
  if (next.currentDate === regularSeasonStartDate(next.seasonYear) && next.phase !== "regular") {
    next = { ...next, phase: "regular", records: next.records };
  }
  if (next.currentDate >= addDays(regularWeekSundayCompat(next.seasonYear, 18), 1) && next.phase === "regular") {
    const regularScheduled = next.schedule.some((game) => (game.seasonType ?? "regular") === "regular" && game.status === "scheduled");
    if (!regularScheduled) next = startPostseason(next);
  }
  return refreshCalendar(next);
}

function regularWeekSundayCompat(seasonYear: number, week: number): string {
  return addDays(regularSeasonStartDate(seasonYear), 4 + (week - 1) * 7);
}

function simulateGamesForDate(save: GameSave): GameSave {
  let next = save;
  const todaysGames = gamesOnDate(next, next.currentDate).filter((game) => game.status === "scheduled");
  for (const game of todaysGames) {
    const result = simulateGame(next, game);
    const target = next.schedule.find((candidate) => candidate.id === game.id);
    if (!target) continue;
    target.status = "final";
    target.homeScore = result.homeScore;
    target.awayScore = result.awayScore;
    target.log = result.log;
    target.injuries = result.injuries;
    target.snapCounts = result.snapCounts;

    if ((target.seasonType ?? "regular") === "regular") {
      next.records[target.homeTeamId] = updateRecord(next.records[target.homeTeamId], result.homeScore, result.awayScore);
      next.records[target.awayTeamId] = updateRecord(next.records[target.awayTeamId], result.awayScore, result.homeScore);
    }

    next = applyMedicalEvents(next, result.injuries.map((event) => ({ ...event, occurredDate: next.currentDate })));
    next.players = next.players.map((player) => {
      const counts = result.snapCounts[player.id];
      if (!counts) return player;
      if (target.seasonType === "postseason") return applySnapCounts(player, counts, "playoffStats");
      if (target.seasonType === "preseason") return player;
      return applySnapCounts(player, counts);
    });

    const recap = target.seasonType === "postseason" ? postseasonGameRecap(next, target) : selectedGameRecap(next, target);
    if (recap) {
      next.inbox.unshift({ ...recap, date: next.currentDate });
      next.lastViewedGameId = target.id;
    }
  }
  return next;
}

function progressPostseasonAfterGames(save: GameSave): GameSave {
  if (save.phase !== "postseason" || !save.postseasonState) return save;
  const round = currentPostseasonRound(save);
  if (!round) return save;
  const roundGames = save.schedule.filter((game) => game.seasonType === "postseason" && game.playoffRound === round.round);
  if (!roundGames.length || roundGames.some((game) => game.status !== "final")) return save;
  let next = completeCurrentPostseasonRound(save);
  if (next.postseasonState?.championTeamId) {
    const champion = teamById(next, next.postseasonState.championTeamId);
    const runnerUp = next.postseasonState.runnerUpTeamId ? teamById(next, next.postseasonState.runnerUpTeamId) : undefined;
    const superBowl = next.schedule.find((game) => game.playoffRound === "super-bowl" && game.status === "final");
    next = openOffseasonContracts(next);
    next = ensureDraftState(next);
    next.inbox.unshift({
      id: `super-bowl-complete-${next.seasonYear}`,
      week: next.currentWeek,
      date: next.currentDate,
      category: "staff",
      title: `${champion.fullName} win the Super Bowl`,
      body: `${champion.fullName} defeated ${runnerUp?.fullName ?? "the conference champion"}${superBowl ? ` ${Math.max(superBowl.homeScore, superBowl.awayScore)}-${Math.min(superBowl.homeScore, superBowl.awayScore)}` : ""}. The league now moves to offseason contract decisions.`,
      priority: "high",
      read: false
    });
    return refreshCalendar(next);
  }
  next = createNextPostseasonRound(next);
  const upcoming = currentPostseasonRound(next);
  if (upcoming) {
    next.inbox.unshift({
      id: `postseason-round-ready-${next.seasonYear}-${upcoming.round}`,
      week: upcoming.week,
      date: upcoming.date ?? next.currentDate,
      category: "staff",
      title: `${postseasonRoundLabel(upcoming.round)} is set`,
      body: `${upcoming.matchups.length} matchup${upcoming.matchups.length === 1 ? "" : "s"} are ready in the playoff bracket.`,
      priority: "normal",
      read: false
    });
  }
  return refreshCalendar(next);
}

export function advanceDay(save: GameSave): GameSave {
  let next = refreshCalendar(cloneSave(save));
  next = processCalendarDeadlines(next);
  if (next.inbox.some((item) => item.blocking && !item.read)) return next;
  next = processDailyRoster(next);
  next = resolveFreeAgencyWave(next, { includeCpuOffers: ["free-agency", "training-camp", "preseason", "regular-season"].includes(next.calendarPhase) });
  next = generateInjuryReports(next);
  next = simulateGamesForDate(next);
  next = progressPostseasonAfterGames(next);
  next.budget = budgetRefresh(next);
  next.goals = updateGoals(next);
  next = processCalendarDeadlines(next);
  if (next.inbox.some((item) => item.blocking && !item.read)) return next;
  next.currentDate = addDays(next.currentDate, 1);
  next = refreshCalendar(next);
  return next;
}

function updateGoals(save: GameSave): GameSave["goals"] {
  if (save.mode !== "goals") return save.goals;
  const team = selectedTeam(save);
  const record = save.records[team.id];
  const played = Math.max(1, record.wins + record.losses + record.ties);
  const pace = (record.wins / played) * 17;
  const budgetRoom = save.budget[team.id] ?? 0;
  return {
    ...save.goals,
    fanApproval: Math.round(clamp(52 + pace * 2.8 + (record.pointsFor - record.pointsAgainst) * 0.03, 10, 99)),
    ownerTrust: Math.round(clamp(48 + (pace - save.goals.targetWins) * 4 + Math.min(8, budgetRoom * 0.2), 5, 99)),
    budgetDiscipline: Math.round(clamp(70 + Math.min(20, budgetRoom * 0.35), 5, 99))
  };
}

export function advanceWeek(save: GameSave): GameSave {
  if (save.currentWeek > 18) return save;

  let next = cloneSave({ ...save, phase: "regular" });
  next = processRosterWeek(next);

  const weekGames = next.schedule.filter((game) => (game.seasonType ?? "regular") === "regular" && game.week === next.currentWeek && game.status === "scheduled");

  for (const game of weekGames) {
    const result = simulateGame(next, game);
    const target = next.schedule.find((candidate) => candidate.id === game.id);
    if (!target) continue;
    target.status = "final";
    target.homeScore = result.homeScore;
    target.awayScore = result.awayScore;
    target.log = result.log;
    target.injuries = result.injuries;
    target.snapCounts = result.snapCounts;

    next.records[target.homeTeamId] = updateRecord(next.records[target.homeTeamId], result.homeScore, result.awayScore);
    next.records[target.awayTeamId] = updateRecord(next.records[target.awayTeamId], result.awayScore, result.homeScore);

    next = applyMedicalEvents(next, result.injuries);

    next.players = next.players.map((player) => {
      const counts = result.snapCounts[player.id];
      return counts ? applySnapCounts(player, counts) : player;
    });

    const recap = selectedGameRecap(next, target);
    if (recap) {
      next.inbox.unshift(recap);
      next.lastViewedGameId = target.id;
    }
  }

  next = applyWeeklyScoutingPlan(next);
  next = autoManageCpuPracticeSquads(processPracticeSquadWeek(processIrWindows(autoManageCpuRoster(next))));
  next.budget = budgetRefresh(next);
  next.goals = updateGoals(next);
  next.inbox.unshift(scoutingInbox(next), staffInbox(next));
  const goals = goalsInbox(next);
  if (goals) next.inbox.unshift(goals);

  if (next.currentWeek >= 18) {
    next = startPostseason(next);
    next.inbox.unshift({
      id: "season-complete",
      week: next.currentWeek,
      category: "staff",
      title: "Regular season complete",
      body: "The regular season is complete and the playoff bracket is set. Advance playoff rounds from the Standings playoff bracket.",
      priority: "high",
      read: false
    });
  } else {
    next.currentWeek += 1;
    next = processPracticeSquadWeek(next);
  }

  return next;
}

function postseasonGameRecap(save: GameSave, game: Game): InboxItem | undefined {
  const team = selectedTeam(save);
  if (game.homeTeamId !== team.id && game.awayTeamId !== team.id) return undefined;
  const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
  const opponent = teamById(save, opponentId);
  const teamScore = game.homeTeamId === team.id ? game.homeScore : game.awayScore;
  const opponentScore = game.homeTeamId === team.id ? game.awayScore : game.homeScore;
  const won = teamScore > opponentScore;
  return {
    id: `postseason-game-${game.id}`,
    week: save.currentWeek,
    category: "game",
    title: `${postseasonRoundLabel(game.playoffRound ?? "wild-card")}: ${team.abbreviation} ${won ? "advance" : "eliminated"}`,
    body: `${team.fullName} ${teamScore}, ${opponent.fullName} ${opponentScore}. ${won ? "The playoff run continues." : "The season ends here."}`,
    priority: "high",
    read: false
  };
}

export function advancePostseasonRound(save: GameSave): GameSave {
  if (save.phase !== "postseason" || !save.postseasonState) return save;
  const round = currentPostseasonRound(save);
  if (!round || round.completed) return save;

  let next = cloneSave(save);
  if (next.currentWeek < round.week) {
    next = processRosterWeek(next);
    next.currentWeek = round.week;
    next.budget = budgetRefresh(next);
    next.inbox.unshift({
      id: `postseason-bye-${next.seasonYear}-${round.round}`,
      week: 22,
      category: "staff",
      title: "Super Bowl bye week complete",
      body: "Recovery, training, injury windows, and roster upkeep have processed. The Super Bowl is ready.",
      priority: "normal",
      read: false
    });
    return next;
  }

  next = processRosterWeek(next);
  const roundGames = next.schedule.filter((game) => game.seasonType === "postseason" && game.playoffRound === round.round && game.status === "scheduled");
  for (const game of roundGames) {
    const result = simulateGame(next, game);
    const target = next.schedule.find((candidate) => candidate.id === game.id);
    if (!target) continue;
    target.status = "final";
    target.homeScore = result.homeScore;
    target.awayScore = result.awayScore;
    target.log = result.log;
    target.injuries = result.injuries;
    target.snapCounts = result.snapCounts;
    next = applyMedicalEvents(next, result.injuries);
    next.players = next.players.map((player) => {
      const counts = result.snapCounts[player.id];
      return counts ? applySnapCounts(player, counts, "playoffStats") : player;
    });
    const recap = postseasonGameRecap(next, target);
    if (recap) {
      next.inbox.unshift(recap);
      next.lastViewedGameId = target.id;
    }
  }

  next = autoManageCpuPracticeSquads(processPracticeSquadWeek(processIrWindows(autoManageCpuRoster(next))));
  next.budget = budgetRefresh(next);
  next = completeCurrentPostseasonRound(next);
  if (next.postseasonState?.championTeamId) {
    const champion = teamById(next, next.postseasonState.championTeamId);
    const runnerUp = next.postseasonState.runnerUpTeamId ? teamById(next, next.postseasonState.runnerUpTeamId) : undefined;
    const superBowl = next.schedule.find((game) => game.playoffRound === "super-bowl" && game.status === "final");
    next = openOffseasonContracts(next);
    next = ensureDraftState(next);
    next.inbox.unshift({
      id: `super-bowl-complete-${next.seasonYear}`,
      week: 23,
      category: "staff",
      title: `${champion.fullName} win the Super Bowl`,
      body: `${champion.fullName} defeated ${runnerUp?.fullName ?? "the conference champion"}${superBowl ? ` ${Math.max(superBowl.homeScore, superBowl.awayScore)}-${Math.min(superBowl.homeScore, superBowl.awayScore)}` : ""}. The league now moves to offseason contract decisions.`,
      priority: "high",
      read: false
    });
    return next;
  }

  next = createNextPostseasonRound(next);
  const upcoming = currentPostseasonRound(next);
  next.currentWeek = upcoming?.round === "super-bowl" ? 22 : upcoming?.week ?? next.currentWeek + 1;
  if (upcoming) {
    next.inbox.unshift({
      id: `postseason-round-ready-${next.seasonYear}-${upcoming.round}`,
      week: next.currentWeek,
      category: "staff",
      title: `${postseasonRoundLabel(upcoming.round)} is set`,
      body: `${upcoming.matchups.length} matchup${upcoming.matchups.length === 1 ? "" : "s"} are ready in the playoff bracket.`,
      priority: "normal",
      read: false
    });
  }
  return next;
}

export function markInboxRead(save: GameSave, itemId: string): GameSave {
  return {
    ...save,
    inbox: save.inbox.map((item) => (item.id === itemId ? { ...item, read: true } : item))
  };
}

function resetSeasonStats(player: Player): Player {
  const practice = isPracticeSquadPlayer(player);
  const reset = clearIrState({
    ...player,
    age: player.age + 1,
    contractYears: Math.max(0, player.contractYears - 1),
    status: practice ? "practice" as const : "active" as const,
    practiceSquadElevatedWeek: undefined,
    practiceSquadProtectedWeek: undefined,
    practiceSquadElevations: practice ? 0 : undefined,
    injuryWeeks: 0,
    injury: undefined,
    suspensionWeeks: 0,
    stats: emptyStats(),
    playoffStats: emptyStats()
  });
  return practice ? reset : clearPracticeSquadState(reset);
}

export function startNextSeason(save: GameSave): GameSave {
  if (save.phase !== "offseason-complete") return save;
  const currentSeasonYear = save.seasonYear ?? ((save.draftState?.draftYear ?? 2027) - 1);
  const seasonYear = currentSeasonYear + 1;
  const previousSeasonRanks = divisionRanksFromRecords(save.teams, save.records);
  const players = save.players.map(resetSeasonStats);
  const assets = generateSeasonDraftAssets(save.teams, save.schools, save.staff, save.selectedTeamId, save.seed, seasonYear + 1);
  const carriedCurrentPicks = new Map(
    save.draftPicks
      .filter((pick) => pick.draftYear === seasonYear + 1)
      .map((pick) => [pick.id, { ...pick, usedByProspectId: undefined }])
  );
  const draftPicks = assets.draftPicks.map((pick) => (pick.draftYear === seasonYear + 1 ? carriedCurrentPicks.get(pick.id) ?? pick : pick));
  const next: GameSave = {
    ...save,
    ...assets,
    draftPicks,
    draftState: createDraftState(draftPicks),
    udfaState: undefined,
    postseasonState: undefined,
    seasonYear,
    previousSeasonRanks,
    currentWeek: 1,
    currentDate: regularSeasonStartDate(seasonYear),
    leagueYearStartDate: leagueYearStartDate(seasonYear),
    calendarPhase: "regular-season",
    seasonCalendar: [],
    phase: "regular",
    players,
    schedule: generateLeagueSchedule(save.teams, `${save.seed}:season-${seasonYear}`, previousSeasonRanks, seasonYear),
    records: createRecords(save.teams),
    irReturnUsage: Object.fromEntries(save.teams.map((team) => [team.id, 0])),
    capSettings: Object.fromEntries(save.teams.map((team) => [team.id, {
      ...(save.capSettings?.[team.id] ?? { salaryCap: 301.2, rookieReserve: 0 }),
      salaryCap: 301.2 + Math.max(0, seasonYear - 2026) * 10,
      rookieReserve: 0,
      franchiseTagUsed: false,
      transitionTagUsed: false
    }])),
    compPickLedger: { seasonYear, entries: [], projections: [] },
    lastViewedGameId: undefined,
    inbox: [
      {
        id: `season-open-${seasonYear}-${save.inbox.length}`,
        week: 1,
        category: "staff",
        title: `${seasonYear} season plan opened`,
        body: "Records, schedule, prospect board, scouting plan, and draft capital have rolled into the new season.",
        priority: "high",
        read: false
      },
      ...save.inbox
    ]
  };
  return refreshCalendar(recalculateBudgets(normalizeCapState(fillPracticeSquadsFromFreeAgency(next, { includeSelectedTeam: true }))));
}
