import { createRng } from "../lib/rng";
import type { CalendarEvent, CalendarPhase, Game, GameSave, KickoffSlot } from "../types";

export const LEAGUE_YEAR_START_MONTH_DAY = "03-11";
export const REGULAR_SEASON_START_2026 = "2026-09-09";
export const WEEK_18_END_2026 = "2027-01-10";
export const SUPER_BOWL_2026_SEASON = "2027-02-14";
export const FINAL_CUTDOWN_MONTH_DAY = "08-30";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

export function addDays(date: string, days: number): string {
  return isoDate(new Date(parseDate(date).getTime() + days * MS_PER_DAY));
}

export function compareDates(a?: string, b?: string): number {
  return (a ?? "").localeCompare(b ?? "");
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / MS_PER_DAY);
}

export function leagueYearStartDate(seasonYear: number): string {
  return `${seasonYear}-${LEAGUE_YEAR_START_MONTH_DAY}`;
}

export function regularSeasonStartDate(seasonYear: number): string {
  if (seasonYear === 2026) return REGULAR_SEASON_START_2026;
  return firstWednesdayOnOrAfter(`${seasonYear}-09-08`);
}

export function superBowlDate(seasonYear: number): string {
  if (seasonYear === 2026) return SUPER_BOWL_2026_SEASON;
  return secondSundayOfFebruary(seasonYear + 1);
}

export function regularWeekSunday(seasonYear: number, week: number): string {
  return addDays(regularSeasonStartDate(seasonYear), 4 + (week - 1) * 7);
}

export function finalCutdownDate(seasonYear: number): string {
  return `${seasonYear}-${FINAL_CUTDOWN_MONTH_DAY}`;
}

export function activeRosterLimitForDate(seasonYear: number, date: string): number {
  return date < finalCutdownDate(seasonYear) ? 90 : 53;
}

export function footballWeekForDate(save: Pick<GameSave, "schedule" | "currentDate">, date = save.currentDate): number {
  const game = save.schedule
    .filter((candidate) => candidate.date && candidate.date <= date && (candidate.seasonType ?? "regular") === "regular")
    .sort((a, b) => b.week - a.week || compareDates(b.date, a.date))[0];
  if (game) return game.week;
  const upcoming = save.schedule
    .filter((candidate) => candidate.date && candidate.date >= date && (candidate.seasonType ?? "regular") === "regular")
    .sort((a, b) => a.week - b.week || compareDates(a.date, b.date))[0];
  return upcoming?.week ?? 1;
}

export function currentFootballWeek(save: GameSave): number {
  return footballWeekForDate(save, save.currentDate);
}

export function calendarPhaseForDate(seasonYear: number, date: string): CalendarPhase {
  if (date < `${seasonYear}-03-11`) return "offseason";
  if (date < `${seasonYear}-04-23`) return "free-agency";
  if (date <= `${seasonYear}-04-25`) return "draft";
  if (date < `${seasonYear}-05-11`) return "rookie-development";
  if (date < `${seasonYear}-07-15`) return "offseason-workouts";
  if (date < `${seasonYear}-08-13`) return "training-camp";
  if (date < regularSeasonStartDate(seasonYear)) return "preseason";
  if (date <= addDays(regularWeekSunday(seasonYear, 18), 1)) return "regular-season";
  if (date <= superBowlDate(seasonYear)) return "postseason";
  return "offseason";
}

export function formatDateLong(date: string): string {
  return parseDate(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function nextDateWithGames(save: GameSave, date = save.currentDate): string | undefined {
  return save.schedule
    .filter((game) => game.status === "scheduled" && game.date && game.date >= date)
    .sort((a, b) => compareDates(a.date, b.date))[0]?.date;
}

export function gamesOnDate(save: GameSave, date = save.currentDate): Game[] {
  return save.schedule
    .filter((game) => game.date === date)
    .sort((a, b) => kickoffOrder(a.kickoffSlot) - kickoffOrder(b.kickoffSlot) || a.id.localeCompare(b.id));
}

export function addDatesToRegularSchedule(games: Game[], seasonYear: number): Game[] {
  const byWeek = new Map<number, Game[]>();
  for (const game of games) byWeek.set(game.week, [...(byWeek.get(game.week) ?? []), game]);
  return games.map((game) => {
    const weekGames = [...(byWeek.get(game.week) ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    const index = weekGames.findIndex((candidate) => candidate.id === game.id);
    const { date, slot } = regularSlotForIndex(seasonYear, game.week, index);
    return { ...game, date, kickoffSlot: slot };
  });
}

export function generatePreseasonSchedule(teamIds: string[], seed: string, seasonYear: number): Game[] {
  const rng = createRng(`${seed}:preseason:${seasonYear}`);
  const dates = [`${seasonYear}-08-15`, `${seasonYear}-08-22`, `${seasonYear}-08-29`];
  const games: Game[] = [];
  dates.forEach((date, weekIndex) => {
    const shuffled = rng.shuffle(teamIds);
    for (let index = 0; index < shuffled.length; index += 2) {
      const first = shuffled[index];
      const second = shuffled[index + 1];
      if (!first || !second) continue;
      const flip = (index / 2 + weekIndex + seasonYear) % 2 === 0;
      const homeTeamId = flip ? first : second;
      const awayTeamId = flip ? second : first;
      games.push({
        id: `pre-${seasonYear}-${weekIndex + 1}-${awayTeamId}-at-${homeTeamId}`,
        week: weekIndex + 1,
        date,
        kickoffSlot: index < 4 ? "SAT" : "SUN-EARLY",
        homeTeamId,
        awayTeamId,
        seasonType: "preseason",
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
        log: [],
        injuries: [],
        snapCounts: {}
      });
    }
  });
  return games;
}

export function buildSeasonCalendar(save: Pick<GameSave, "seasonYear" | "schedule" | "selectedTeamId">): CalendarEvent[] {
  const seasonYear = save.seasonYear;
  const events: CalendarEvent[] = [
    milestone(seasonYear, `${seasonYear}-03-09`, "free-agency", "Legal negotiating window opens", "Teams can begin negotiating with pending UFAs.", "free-agency", "free-agents"),
    milestone(seasonYear, `${seasonYear}-03-11`, "free-agency", "League year and free agency open", "Contracts expire, free agency opens, and trades can begin.", "league-year", "free-agents", true),
    milestone(seasonYear, `${seasonYear}-04-17`, "deadline", "RFA offer-sheet deadline", "Restricted free agents must sign offer sheets by this deadline.", "free-agency", "budget"),
    milestone(seasonYear, `${seasonYear}-04-23`, "draft", "NFL Draft begins", "Draft room opens for Round 1.", "draft", "draft", true),
    milestone(seasonYear, `${seasonYear}-04-25`, "draft", "NFL Draft concludes", "Late rounds finish and UDFA prep begins.", "draft", "draft"),
    milestone(seasonYear, `${seasonYear}-05-01`, "deadline", "Fifth-year option deadline", "Teams finalize first-round option decisions.", "rookie-development", "budget"),
    milestone(seasonYear, `${seasonYear}-05-08`, "draft", "Rookie minicamp window", "Rookie minicamp and onboarding work begin.", "rookie-development", "draft"),
    milestone(seasonYear, `${seasonYear}-05-11`, "training", "Rookie development program begins", "Rookies enter the development program.", "rookie-development", "training"),
    milestone(seasonYear, `${seasonYear}-06-08`, "training", "Mandatory minicamp window", "Veteran minicamp work and medical reviews intensify.", "offseason-workouts", "training"),
    milestone(seasonYear, `${seasonYear}-07-15`, "deadline", "Franchise-tag extension deadline", "Tagged players can no longer sign multiyear extensions after this deadline.", "training-camp", "budget", true),
    milestone(seasonYear, `${seasonYear}-07-22`, "deadline", "UFA tender signing deadline", "Tendered UFAs hit the late-summer rights deadline.", "training-camp", "free-agents"),
    milestone(seasonYear, `${seasonYear}-07-25`, "training", "Training camp opens", "Camp roster work, conditioning, and position battles begin.", "training-camp", "training", true),
    milestone(seasonYear, `${seasonYear}-08-30`, "roster", "Final roster cutdown", "Active rosters must reach 53 before waiver processing.", "preseason", "roster", true),
    milestone(seasonYear, `${seasonYear}-08-31`, "waivers", "Cutdown waivers process", "Waiver claims process before practice squads form.", "preseason", "roster", true),
    milestone(seasonYear, `${seasonYear}-09-01`, "practice-squad", "Practice squads form", "Teams can fill 16-player practice squads.", "preseason", "roster"),
    milestone(seasonYear, regularSeasonStartDate(seasonYear), "game", "Regular season kicks off", "The regular season begins.", "regular-season", "schedule", true),
    milestone(seasonYear, addDays(regularWeekSunday(seasonYear, 18), 1), "postseason", "Regular season complete", "Playoff bracket locks after Week 18.", "regular-season", "standings", true),
    milestone(seasonYear, superBowlDate(seasonYear), "postseason", "Super Bowl", "The league champion is crowned.", "postseason", "standings", true)
  ];

  const gameEvents = save.schedule.flatMap((game) => {
    if (!game.date) return [];
    const teamGame = game.homeTeamId === save.selectedTeamId || game.awayTeamId === save.selectedTeamId;
    return [{
      id: `cal-game-${game.id}`,
      date: game.date,
      type: "game" as const,
      title: `${game.seasonType === "preseason" ? "Preseason" : game.seasonType === "postseason" ? "Playoff" : "Week"} ${game.week}: ${game.awayTeamId.toUpperCase()} at ${game.homeTeamId.toUpperCase()}`,
      phase: game.seasonType === "preseason" ? "preseason" as const : game.seasonType === "postseason" ? "postseason" as const : "regular-season" as const,
      gameId: game.id,
      actionTab: "schedule",
      footballWeek: game.week,
      important: teamGame
    }];
  });
  return [...events, ...gameEvents].sort((a, b) => compareDates(a.date, b.date) || a.title.localeCompare(b.title));
}

export function refreshCalendar(save: GameSave): GameSave {
  return {
    ...save,
    calendarPhase: calendarPhaseForDate(save.seasonYear, save.currentDate),
    currentWeek: currentFootballWeek(save),
    seasonCalendar: buildSeasonCalendar(save)
  };
}

function milestone(
  seasonYear: number,
  date: string,
  type: CalendarEvent["type"],
  title: string,
  description: string,
  phase: CalendarPhase,
  actionTab: string,
  important = false
): CalendarEvent {
  return {
    id: `cal-${seasonYear}-${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    date,
    type,
    title,
    description,
    phase,
    actionTab,
    important
  };
}

function regularSlotForIndex(seasonYear: number, week: number, index: number): { date: string; slot: KickoffSlot } {
  const sunday = regularWeekSunday(seasonYear, week);
  if (week === 1) {
    if (index === 0) return { date: regularSeasonStartDate(seasonYear), slot: "WED" };
    if (index === 1) return { date: addDays(regularSeasonStartDate(seasonYear), 1), slot: "THU" };
    if (index === 15) return { date: addDays(sunday, 1), slot: "MNF" };
    return { date: sunday, slot: index >= 12 ? "SUN-LATE" : "SUN-EARLY" };
  }
  if (week === 18) {
    if (index < 3) return { date: addDays(sunday, -1), slot: "SAT" };
    return { date: sunday, slot: index >= 12 ? "SUN-LATE" : "SUN-EARLY" };
  }
  if (week >= 16 && index < 2) return { date: addDays(sunday, -1), slot: "SAT" };
  if (index === 0) return { date: addDays(sunday, -3), slot: "THU" };
  if (index === 15) return { date: addDays(sunday, 1), slot: "MNF" };
  return { date: sunday, slot: index >= 12 ? "SUN-LATE" : "SUN-EARLY" };
}

function kickoffOrder(slot?: KickoffSlot): number {
  return ["WED", "THU", "FRI", "SAT", "SUN-EARLY", "SUN-LATE", "SNF", "MNF", "HOLIDAY", "TBD"].indexOf(slot ?? "TBD");
}

function firstWednesdayOnOrAfter(date: string): string {
  let cursor = date;
  while (parseDate(cursor).getUTCDay() !== 3) cursor = addDays(cursor, 1);
  return cursor;
}

function secondSundayOfFebruary(year: number): string {
  let cursor = `${year}-02-01`;
  let count = 0;
  while (true) {
    if (parseDate(cursor).getUTCDay() === 0) count += 1;
    if (count === 2) return cursor;
    cursor = addDays(cursor, 1);
  }
}
