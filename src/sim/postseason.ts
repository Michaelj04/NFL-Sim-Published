import type { Conference, Game, GameSave, NFLTeam, PostseasonMatchup, PostseasonRound, PostseasonRoundId, PostseasonSeed, TeamRecord } from "../types";
import { addDays, superBowlDate } from "./calendar";
import { teamById, teamOverall, winningPct } from "./selectors";

const divisions = ["East", "North", "South", "West"] as const;
const conferences = ["AFC", "NFC"] as const;

export function postseasonRoundLabel(round: PostseasonRoundId): string {
  if (round === "wild-card") return "Wild Card";
  if (round === "divisional") return "Divisional";
  if (round === "conference") return "Conference Championship";
  return "Super Bowl";
}

function recordGames(record: TeamRecord): number {
  return record.wins + record.losses + record.ties;
}

function recordPct(record: TeamRecord): number {
  return winningPct(record);
}

function pointDiff(record: TeamRecord): number {
  return record.pointsFor - record.pointsAgainst;
}

function regularFinals(save: GameSave): Game[] {
  return save.schedule.filter((game) => (game.seasonType ?? "regular") === "regular" && game.status === "final");
}

function teamResultInGame(game: Game, teamId: string): 1 | 0 | -1 {
  const teamScore = game.homeTeamId === teamId ? game.homeScore : game.awayScore;
  const oppScore = game.homeTeamId === teamId ? game.awayScore : game.homeScore;
  return teamScore > oppScore ? 1 : teamScore < oppScore ? -1 : 0;
}

function headToHeadScore(save: GameSave, a: NFLTeam, b: NFLTeam): number {
  return regularFinals(save)
    .filter((game) => (game.homeTeamId === a.id && game.awayTeamId === b.id) || (game.homeTeamId === b.id && game.awayTeamId === a.id))
    .reduce((sum, game) => sum + teamResultInGame(game, a.id), 0);
}

function scopedRecord(save: GameSave, team: NFLTeam, scope: "division" | "conference"): TeamRecord {
  return regularFinals(save)
    .filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id)
    .filter((game) => {
      const opponent = teamById(save, game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId);
      return scope === "division"
        ? opponent.conference === team.conference && opponent.division === team.division
        : opponent.conference === team.conference;
    })
    .reduce<TeamRecord>((record, game) => {
      const result = teamResultInGame(game, team.id);
      return {
        wins: record.wins + (result === 1 ? 1 : 0),
        losses: record.losses + (result === -1 ? 1 : 0),
        ties: record.ties + (result === 0 ? 1 : 0),
        pointsFor: record.pointsFor + (game.homeTeamId === team.id ? game.homeScore : game.awayScore),
        pointsAgainst: record.pointsAgainst + (game.homeTeamId === team.id ? game.awayScore : game.homeScore)
      };
    }, { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
}

export function compareTeamsForPostseason(save: GameSave, a: NFLTeam, b: NFLTeam): number {
  const aRecord = save.records[a.id];
  const bRecord = save.records[b.id];
  const pct = recordPct(bRecord) - recordPct(aRecord);
  if (pct !== 0) return pct;
  const h2h = headToHeadScore(save, b, a);
  if (h2h !== 0) return h2h;
  if (a.conference === b.conference && a.division === b.division) {
    const divisionPct = recordPct(scopedRecord(save, b, "division")) - recordPct(scopedRecord(save, a, "division"));
    if (divisionPct !== 0) return divisionPct;
  }
  if (a.conference === b.conference) {
    const conferencePct = recordPct(scopedRecord(save, b, "conference")) - recordPct(scopedRecord(save, a, "conference"));
    if (conferencePct !== 0) return conferencePct;
  }
  const diff = pointDiff(bRecord) - pointDiff(aRecord);
  if (diff !== 0) return diff;
  const overall = teamOverall(save, b.id) - teamOverall(save, a.id);
  if (overall !== 0) return overall;
  return a.id.localeCompare(b.id);
}

function compareTeamsForDraft(save: GameSave, a: NFLTeam, b: NFLTeam): number {
  const aRecord = save.records[a.id];
  const bRecord = save.records[b.id];
  const pct = recordPct(aRecord) - recordPct(bRecord);
  if (pct !== 0) return pct;
  const diff = pointDiff(aRecord) - pointDiff(bRecord);
  if (diff !== 0) return diff;
  const overall = teamOverall(save, a.id) - teamOverall(save, b.id);
  if (overall !== 0) return overall;
  return a.id.localeCompare(b.id);
}

export function buildPostseasonSeeds(save: GameSave): PostseasonSeed[] {
  return conferences.flatMap((conference) => {
    const teams = save.teams.filter((team) => team.conference === conference);
    const divisionWinners = divisions
      .map((division) => teams.filter((team) => team.division === division).sort((a, b) => compareTeamsForPostseason(save, a, b))[0])
      .filter(Boolean)
      .sort((a, b) => compareTeamsForPostseason(save, a, b));
    const winnerIds = new Set(divisionWinners.map((team) => team.id));
    const wildcards = teams
      .filter((team) => !winnerIds.has(team.id))
      .sort((a, b) => compareTeamsForPostseason(save, a, b))
      .slice(0, 3);
    return [...divisionWinners, ...wildcards].map((team, index) => {
      const record = save.records[team.id];
      return {
        conference,
        seed: index + 1,
        teamId: team.id,
        kind: index < 4 ? "division" as const : "wildcard" as const,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties
      };
    });
  });
}

function playoffDate(save: GameSave, round: PostseasonRoundId): string {
  const superDate = superBowlDate(save.seasonYear);
  if (round === "super-bowl") return superDate;
  if (round === "conference") return addDays(superDate, -14);
  if (round === "divisional") return addDays(superDate, -22);
  return addDays(superDate, -29);
}

function gameForMatchup(save: GameSave, matchup: Omit<PostseasonMatchup, "gameId">, week: number, neutralSite = false): Game {
  return {
    id: `post-${save.seasonYear}-${matchup.round}-${matchup.id}`,
    week,
    date: playoffDate(save, matchup.round),
    kickoffSlot: matchup.round === "super-bowl" ? "SNF" : "SAT",
    homeTeamId: matchup.homeTeamId,
    awayTeamId: matchup.awayTeamId,
    seasonType: "postseason",
    playoffRound: matchup.round,
    neutralSite,
    playoffConference: matchup.conference,
    playoffSlot: matchup.id,
    homeSeed: matchup.homeSeed,
    awaySeed: matchup.awaySeed,
    status: "scheduled",
    homeScore: 0,
    awayScore: 0,
    log: [],
    injuries: [],
    snapCounts: {}
  };
}

function seedByTeam(seeds: PostseasonSeed[]): Map<string, PostseasonSeed> {
  return new Map(seeds.map((seed) => [seed.teamId, seed]));
}

function makeMatchup(save: GameSave, round: PostseasonRoundId, home: PostseasonSeed, away: PostseasonSeed, slot: string, week: number, neutralSite = false): { matchup: PostseasonMatchup; game: Game } {
  const base = {
    id: slot,
    round,
    conference: round === "super-bowl" ? undefined : home.conference,
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    homeSeed: home.seed,
    awaySeed: away.seed
  };
  const game = gameForMatchup(save, base, week, neutralSite);
  return { matchup: { ...base, gameId: game.id }, game };
}

export function startPostseason(save: GameSave): GameSave {
  const seeds = buildPostseasonSeeds(save);
  const games: Game[] = [];
  const matchups: PostseasonMatchup[] = [];
  for (const conference of conferences) {
    const conferenceSeeds = seeds.filter((seed) => seed.conference === conference);
    for (const [high, low] of [[2, 7], [3, 6], [4, 5]] as Array<[number, number]>) {
      const home = conferenceSeeds.find((seed) => seed.seed === high);
      const away = conferenceSeeds.find((seed) => seed.seed === low);
      if (!home || !away) continue;
      const created = makeMatchup(save, "wild-card", home, away, `${conference}-${high}-${low}`, 19);
      matchups.push(created.matchup);
      games.push(created.game);
    }
  }
  const byeTeamIds = seeds.filter((seed) => seed.seed === 1).map((seed) => seed.teamId);
  const userSeed = seeds.find((seed) => seed.teamId === save.selectedTeamId);
  return {
    ...save,
    phase: "postseason",
    currentWeek: 19,
    schedule: [...save.schedule.filter((game) => (game.seasonType ?? "regular") === "regular"), ...games],
    postseasonState: {
      seasonYear: save.seasonYear,
      currentRound: "wild-card",
      seeds,
      rounds: [{ round: "wild-card", week: 19, date: playoffDate(save, "wild-card"), completed: false, matchups, byeTeamIds }],
      eliminatedTeamIds: [],
      userTeamResult: userSeed ? "active" : "missed"
    }
  };
}

export function currentPostseasonRound(save: GameSave): PostseasonRound | undefined {
  const state = save.postseasonState;
  return state?.rounds.find((round) => round.round === state.currentRound);
}

export function completeCurrentPostseasonRound(save: GameSave): GameSave {
  const state = save.postseasonState;
  const round = currentPostseasonRound(save);
  if (!state || !round || round.completed) return save;
  const completedMatchups = round.matchups.map((matchup) => {
    const game = save.schedule.find((candidate) => candidate.id === matchup.gameId);
    if (!game || game.status !== "final" || game.homeScore === game.awayScore) return matchup;
    const winnerTeamId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
    const loserTeamId = winnerTeamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
    return { ...matchup, winnerTeamId, loserTeamId };
  });
  if (completedMatchups.some((matchup) => !matchup.winnerTeamId)) return save;
  const eliminatedTeamIds = [...state.eliminatedTeamIds, ...completedMatchups.map((matchup) => matchup.loserTeamId!)];
  const winnerIds = completedMatchups.map((matchup) => matchup.winnerTeamId!);
  const userTeamResult = completedMatchups.some((matchup) => matchup.loserTeamId === save.selectedTeamId)
    ? round.round
    : state.userTeamResult;
  const rounds = state.rounds.map((candidate) => candidate.round === round.round ? { ...candidate, completed: true, matchups: completedMatchups } : candidate);
  if (round.round === "super-bowl") {
    return {
      ...save,
      postseasonState: {
        ...state,
        rounds,
        eliminatedTeamIds,
        championTeamId: winnerIds[0],
        runnerUpTeamId: completedMatchups[0]?.loserTeamId,
        userTeamResult: winnerIds[0] === save.selectedTeamId ? "champion" : userTeamResult
      }
    };
  }
  return {
    ...save,
    postseasonState: {
      ...state,
      rounds,
      eliminatedTeamIds,
      userTeamResult
    }
  };
}

function remainingSeeds(state: NonNullable<GameSave["postseasonState"]>, conference: Conference): PostseasonSeed[] {
  const eliminated = new Set(state.eliminatedTeamIds);
  return state.seeds.filter((seed) => seed.conference === conference && !eliminated.has(seed.teamId)).sort((a, b) => a.seed - b.seed);
}

export function createNextPostseasonRound(save: GameSave): GameSave {
  const state = save.postseasonState;
  if (!state || state.championTeamId) return save;
  const current = currentPostseasonRound(save);
  if (!current?.completed) return save;
  const existing = new Set(state.rounds.map((round) => round.round));
  const nextRound: PostseasonRoundId =
    state.currentRound === "wild-card" ? "divisional" :
      state.currentRound === "divisional" ? "conference" :
        state.currentRound === "conference" ? "super-bowl" : "super-bowl";
  if (existing.has(nextRound)) {
    return { ...save, postseasonState: { ...state, currentRound: nextRound } };
  }

  const games: Game[] = [];
  const matchups: PostseasonMatchup[] = [];
  if (nextRound === "divisional") {
    for (const conference of conferences) {
      const remaining = remainingSeeds(state, conference);
      const pairs = [[remaining[0], remaining[3]], [remaining[1], remaining[2]]];
      pairs.forEach(([home, away], index) => {
        if (!home || !away) return;
        const created = makeMatchup(save, "divisional", home, away, `${conference}-div-${index + 1}`, 20);
        matchups.push(created.matchup);
        games.push(created.game);
      });
    }
  } else if (nextRound === "conference") {
    for (const conference of conferences) {
      const remaining = remainingSeeds(state, conference);
      const home = remaining[0];
      const away = remaining[1];
      if (!home || !away) continue;
      const created = makeMatchup(save, "conference", home, away, `${conference}-championship`, 21);
      matchups.push(created.matchup);
      games.push(created.game);
    }
  } else {
    const afc = remainingSeeds(state, "AFC")[0];
    const nfc = remainingSeeds(state, "NFC")[0];
    const home = save.seasonYear % 2 === 0 ? afc : nfc;
    const away = home?.conference === "AFC" ? nfc : afc;
    if (home && away) {
      const created = makeMatchup(save, "super-bowl", home, away, "super-bowl", 23, true);
      matchups.push(created.matchup);
      games.push(created.game);
    }
  }

  const week = nextRound === "divisional" ? 20 : nextRound === "conference" ? 21 : 23;
  return {
    ...save,
    schedule: [...save.schedule, ...games],
    postseasonState: {
      ...state,
      currentRound: nextRound,
      rounds: [...state.rounds, { round: nextRound, week, date: playoffDate(save, nextRound), completed: false, matchups }]
    }
  };
}

export function postseasonDraftRank(save: GameSave): string[] {
  const state = save.postseasonState;
  if (!state) return [];
  const seededIds = new Set(state.seeds.map((seed) => seed.teamId));
  const byRound = (round: PostseasonRoundId) => state.rounds
    .flatMap((entry) => entry.round === round ? entry.matchups.map((matchup) => matchup.loserTeamId).filter(Boolean) as string[] : []);
  const sortIds = (ids: string[]) => ids
    .map((teamId) => teamById(save, teamId))
    .sort((a, b) => compareTeamsForDraft(save, a, b))
    .map((team) => team.id);
  return [
    ...sortIds(save.teams.filter((team) => !seededIds.has(team.id)).map((team) => team.id)),
    ...sortIds(byRound("wild-card")),
    ...sortIds(byRound("divisional")),
    ...sortIds(byRound("conference")),
    ...(state.runnerUpTeamId ? [state.runnerUpTeamId] : []),
    ...(state.championTeamId ? [state.championTeamId] : [])
  ];
}
