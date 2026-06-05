import { clamp, createRng } from "../lib/rng";
import type { Game, GameSave, Player, PlayerStats, TeamRecord } from "../types";
import { advanceToDraftPrep, normalizeCapState, openOffseasonContracts, recalculateBudgets, teamCapLedger } from "./cap";
import { generateAnnualTransferPortalState } from "./annualTransfer";
import { applyAnnualRosterImportPlan, generateAnnualRosterImportPlan } from "./annualRosterImport";
import { finalizeAnnualRecruitingState } from "./annualRecruiting";
import { activeRosterLimitForDate, addDays, buildSeasonCalendar, calendarPhaseForDate, currentFootballWeek, finalCutdownDate, gamesOnDate, leagueYearStartDate, refreshCalendar, regularSeasonStartDate } from "./calendar";
import { normalizePlayerMakeup } from "./concerns";
import { ensureDraftState } from "./draft";
import { FREE_AGENT_TEAM_ID, releasePlayerToFreeAgency, rosterSize } from "./freeAgents";
import { clearIrState, processIrWindows } from "./ir";
import { autoManageCpuPracticeSquads, clearPracticeSquadState, fillPracticeSquadsFromFreeAgency, isPracticeSquadPlayer, processPracticeSquadWeek } from "./practiceSquad";
import { autoManageCpuRoster } from "./rosterAi";
import { createDraftState, createRecords, generateSeasonDraftAssets } from "./generate";
import { progressAnnualCollegeRoster } from "./collegeRoster";
import { generateCollegeSeasonResults } from "./collegeSeasonResults";
import { generateCollegeMoraleState } from "./collegeMorale";
import { generateCollegeTrainingBanks } from "./collegeTraining";
import { buildSchoolProfileState } from "./schoolProfiles";
import { applyMedicalEvents, dailyPracticeMedicalEvents, tickMedicalRecovery, weeklyPracticeMedicalEvents } from "./medical";
import { runWeeklyTraining } from "./playerModel";
import { simulateGame } from "./playByPlay";
import { completeCurrentPostseasonRound, createNextPostseasonRound, currentPostseasonRound, postseasonRoundLabel, startPostseason } from "./postseason";
import { divisionRanksFromRecords, generateLeagueSchedule } from "./schedule";
import { applyWeeklyScoutingPlan } from "./scouting";
import { processWaiversForDate } from "./waivers";
import { resolveFreeAgencyWave } from "./freeAgentMarket";
import { refreshTradeActivity } from "./trade";
import { medicalQuality, payroll, rosterNeeds, scoutingQuality, selectedTeam, teamById, teamSchedule, teamOverall } from "./selectors";
import { addGameStatsToPlayer, archivePlayerSeasonStats, emptyPlayerStats } from "./stats";

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

export function applyCharacterEvents(save: GameSave): GameSave {
  const players = save.players.map((player) => {
    if (player.teamId === FREE_AGENT_TEAM_ID) return player;
    if (player.status !== "active" && player.status !== "limited") return player;
    const makeup = normalizePlayerMakeup(player, save.seed);
    const chance = characterEventChance(makeup.character);
    if (chance <= 0) return { ...player, makeup };
    const rngSeed = `${save.seed}:character-event:${save.currentWeek}:${player.id}`;
    const rng = createRng(rngSeed);
    if (!rng.bool(chance)) return { ...player, makeup };

    const lowCharacter = makeup.character < 45;
    const weeks = Math.round(clamp(rng.normal(lowCharacter ? 4 : 2, lowCharacter ? 1.5 : 0.75), 1, lowCharacter ? 8 : 3));
    return {
      ...player,
      makeup,
      status: "suspended" as const,
      suspensionWeeks: weeks,
      injuryWeeks: 0
    };
  });

  return { ...save, players, inbox: [] };
}

function emptyStats() {
  return emptyPlayerStats();
}

function applyGameStats(player: Player, stats: PlayerStats | undefined, bucket: "stats" | "playoffStats" = "stats"): Player {
  return stats ? addGameStatsToPlayer(player, stats, bucket) : player;
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

function processCutdowns(save: GameSave): GameSave {
  if (save.currentDate < finalCutdownDate(save.seasonYear)) return save;
  let next = save;
  for (const team of next.teams) {
    const limit = activeRosterLimitForDate(next.seasonYear, next.currentDate);
    const count = rosterSize(next, team.id);
    if (count <= limit) continue;
    if (team.id === next.selectedTeamId) {
      return next;
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

function selectedTeamOverActiveLimit(save: GameSave): boolean {
  if (save.currentDate < finalCutdownDate(save.seasonYear)) return false;
  return rosterSize(save, save.selectedTeamId) > activeRosterLimitForDate(save.seasonYear, save.currentDate);
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
    target.playerStats = result.playerStats;
    target.teamStats = result.teamStats;

    if ((target.seasonType ?? "regular") === "regular") {
      next.records[target.homeTeamId] = updateRecord(next.records[target.homeTeamId], result.homeScore, result.awayScore);
      next.records[target.awayTeamId] = updateRecord(next.records[target.awayTeamId], result.awayScore, result.homeScore);
    }

    next = applyMedicalEvents(next, result.injuries.map((event) => ({ ...event, occurredDate: next.currentDate })));
    next.players = next.players.map((player) => {
      const stats = result.playerStats[player.id];
      if (!stats) return player;
      if (target.seasonType === "postseason") return applyGameStats(player, stats, "playoffStats");
      if (target.seasonType === "preseason") return player;
      return applyGameStats(player, stats);
    });

    if (target.homeTeamId === next.selectedTeamId || target.awayTeamId === next.selectedTeamId) {
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
    next = openOffseasonContracts(next);
    next = ensureDraftState(next);
    return refreshCalendar(next);
  }
  next = createNextPostseasonRound(next);
  return refreshCalendar(next);
}

export function advanceDay(save: GameSave): GameSave {
  let next = refreshCalendar(cloneSave(save));
  next = processCalendarDeadlines(next);
  if (selectedTeamOverActiveLimit(next)) return next;
  next = processDailyRoster(next);
  next = resolveFreeAgencyWave(next, { includeCpuOffers: ["free-agency", "training-camp", "preseason", "regular-season"].includes(next.calendarPhase) });
  next = refreshTradeActivity(next);
  next = generateInjuryReports(next);
  next = simulateGamesForDate(next);
  next = progressPostseasonAfterGames(next);
  next.budget = budgetRefresh(next);
  next.goals = updateGoals(next);
  next = processCalendarDeadlines(next);
  if (selectedTeamOverActiveLimit(next)) return next;
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
    target.playerStats = result.playerStats;
    target.teamStats = result.teamStats;

    next.records[target.homeTeamId] = updateRecord(next.records[target.homeTeamId], result.homeScore, result.awayScore);
    next.records[target.awayTeamId] = updateRecord(next.records[target.awayTeamId], result.awayScore, result.homeScore);

    next = applyMedicalEvents(next, result.injuries);

    next.players = next.players.map((player) => {
      return applyGameStats(player, result.playerStats[player.id]);
    });

    if (target.homeTeamId === next.selectedTeamId || target.awayTeamId === next.selectedTeamId) {
      next.lastViewedGameId = target.id;
    }
  }

  next = applyWeeklyScoutingPlan(next);
  next = autoManageCpuPracticeSquads(processPracticeSquadWeek(processIrWindows(autoManageCpuRoster(next))));
  next.budget = budgetRefresh(next);
  next.goals = updateGoals(next);

  if (next.currentWeek >= 18) {
    next = startPostseason(next);
  } else {
    next.currentWeek += 1;
    next = processPracticeSquadWeek(next);
  }

  return next;
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
    next.inbox = [];
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
    target.playerStats = result.playerStats;
    target.teamStats = result.teamStats;
    next = applyMedicalEvents(next, result.injuries);
    next.players = next.players.map((player) => {
      return applyGameStats(player, result.playerStats[player.id], "playoffStats");
    });
    if (target.homeTeamId === next.selectedTeamId || target.awayTeamId === next.selectedTeamId) {
      next.lastViewedGameId = target.id;
    }
  }

  next = autoManageCpuPracticeSquads(processPracticeSquadWeek(processIrWindows(autoManageCpuRoster(next))));
  next.budget = budgetRefresh(next);
  next = completeCurrentPostseasonRound(next);
  if (next.postseasonState?.championTeamId) {
    next = openOffseasonContracts(next);
    next = ensureDraftState(next);
    next.inbox = [];
    return next;
  }

  next = createNextPostseasonRound(next);
  const upcoming = currentPostseasonRound(next);
  next.currentWeek = upcoming?.round === "super-bowl" ? 22 : upcoming?.week ?? next.currentWeek + 1;
  next.inbox = [];
  return next;
}

function resetSeasonStats(player: Player, save: Pick<GameSave, "seasonYear" | "teams">): Player {
  const practice = isPracticeSquadPlayer(player);
  const archived = archivePlayerSeasonStats(player, save);
  const reset = clearIrState({
    ...archived,
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
  const recruitingFinalizedSave = {
    ...save,
    annualRecruiting: finalizeAnnualRecruitingState(save.annualRecruiting, save.seed)
  };
  const importReadySave = {
    ...recruitingFinalizedSave,
    annualRosterImportPlan: generateAnnualRosterImportPlan(recruitingFinalizedSave, recruitingFinalizedSave.seasonYear)
  };
  const importedSave = applyAnnualRosterImportPlan(importReadySave);
  const currentSeasonYear = importedSave.seasonYear ?? ((importedSave.draftState?.draftYear ?? 2027) - 1);
  const seasonYear = currentSeasonYear + 1;
  const draftYear = seasonYear + 1;
  const previousSeasonRanks = divisionRanksFromRecords(importedSave.teams, importedSave.records);
  const players = importedSave.players.map((player) => resetSeasonStats(player, importedSave));
  const previousCollegeResults = importedSave.collegeSeasonResults;
  const trainingReadySave = {
    ...importedSave,
    collegeTraining: generateCollegeTrainingBanks(importedSave.seed, currentSeasonYear, importedSave.collegeRoster, importedSave.collegeSeasonResults, importedSave.collegeManagement)
  };
  const collegeRoster = progressAnnualCollegeRoster(trainingReadySave, seasonYear, draftYear);
  const schoolProfiles = importedSave.schoolProfiles ? { ...importedSave.schoolProfiles, seasonYear } : buildSchoolProfileState(importedSave.schools, importedSave.seed, seasonYear);
  const assets = generateSeasonDraftAssets(importedSave.teams, importedSave.schools, importedSave.staff, importedSave.selectedTeamId, importedSave.seed, draftYear, collegeRoster, previousCollegeResults, schoolProfiles);
  const carriedCurrentPicks = new Map(
    importedSave.draftPicks
      .filter((pick) => pick.draftYear === draftYear)
      .map((pick) => [pick.id, { ...pick, usedByProspectId: undefined }])
  );
  const draftPicks = assets.draftPicks.map((pick) => (pick.draftYear === draftYear ? carriedCurrentPicks.get(pick.id) ?? pick : pick));
  const collegeSeasonResults = generateCollegeSeasonResults(importedSave.seed, collegeRoster, seasonYear);
  const collegeTraining = generateCollegeTrainingBanks(importedSave.seed, seasonYear, collegeRoster, collegeSeasonResults, importedSave.collegeManagement);
  const collegeMorale = generateCollegeMoraleState(importedSave.seed, seasonYear, collegeRoster, collegeSeasonResults, assets.annualRecruiting, collegeTraining, importedSave.collegeManagement);
  const next: GameSave = {
    ...importedSave,
    ...assets,
    draftPicks,
    draftState: createDraftState(draftPicks),
    udfaState: undefined,
    postseasonState: undefined,
    seasonYear,
    schoolProfiles,
    collegeRoster: collegeRoster ? {
      ...collegeRoster,
      seasonYear
    } : undefined,
    collegeSeasonResults,
    collegeTraining,
    collegeMorale,
    previousSeasonRanks,
    currentWeek: 1,
    currentDate: regularSeasonStartDate(seasonYear),
    leagueYearStartDate: leagueYearStartDate(seasonYear),
    calendarPhase: "regular-season",
    seasonCalendar: [],
    phase: "regular",
    players,
    annualTransferPortal: generateAnnualTransferPortalState({ ...importedSave, seasonYear, currentWeek: 1, players, collegeRoster, collegeMorale }, seasonYear),
    schedule: generateLeagueSchedule(importedSave.teams, `${importedSave.seed}:season-${seasonYear}`, previousSeasonRanks, seasonYear),
    records: createRecords(importedSave.teams),
    irReturnUsage: Object.fromEntries(importedSave.teams.map((team) => [team.id, 0])),
    capSettings: Object.fromEntries(importedSave.teams.map((team) => [team.id, {
      ...(importedSave.capSettings?.[team.id] ?? { salaryCap: 301.2, rookieReserve: 0 }),
      salaryCap: 301.2 + Math.max(0, seasonYear - 2026) * 10,
      rookieReserve: 0,
      franchiseTagUsed: false,
      transitionTagUsed: false
    }])),
    compPickLedger: { seasonYear, entries: [], projections: [] },
    lastViewedGameId: undefined,
    inbox: []
  };
  const planned = {
    ...next,
    annualRosterImportPlan: generateAnnualRosterImportPlan(next, seasonYear)
  };
  return refreshCalendar(recalculateBudgets(normalizeCapState(fillPracticeSquadsFromFreeAgency(planned, { includeSelectedTeam: true }))));
}
