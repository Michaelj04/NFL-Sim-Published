import { createRng, type Rng } from "../lib/rng";
import type { Conference, Division, Game, NFLTeam, Player, TeamRecord } from "../types";
import { addDatesToRegularSchedule, generatePreseasonSchedule } from "./calendar";

const divisions: Division[] = ["East", "North", "South", "West"];

interface Matchup {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  divisionGame: boolean;
}

function groupKey(conference: Conference, division: Division): string {
  return `${conference}:${division}`;
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join(":");
}

function recordPct(record?: TeamRecord): number {
  if (!record) return 0;
  const games = record.wins + record.losses + record.ties;
  return games ? (record.wins + record.ties * 0.5) / games : 0;
}

function rankGroups(teams: NFLTeam[], scoreFor: (team: NFLTeam) => number): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const conference of ["AFC", "NFC"] as Conference[]) {
    for (const division of divisions) {
      teams
        .filter((team) => team.conference === conference && team.division === division)
        .sort((a, b) => scoreFor(b) - scoreFor(a) || a.id.localeCompare(b.id))
        .forEach((team, index) => {
          ranks[team.id] = index + 1;
        });
    }
  }
  return ranks;
}

export function divisionRanksFromRecords(teams: NFLTeam[], records: Record<string, TeamRecord>): Record<string, number> {
  return rankGroups(teams, (team) => {
    const record = records[team.id];
    const pointDiff = (record?.pointsFor ?? 0) - (record?.pointsAgainst ?? 0);
    return recordPct(record) * 1000 + pointDiff;
  });
}

export function divisionRanksFromPlayers(teams: NFLTeam[], players: Player[], seed: string): Record<string, number> {
  const byTeam = new Map<string, number>();
  for (const team of teams) {
    const core = players
      .filter((player) => player.teamId === team.id)
      .map((player) => player.overall)
      .sort((a, b) => b - a)
      .slice(0, 28);
    const grade = core.length ? core.reduce((sum, overall) => sum + overall, 0) / core.length : team.marketSize / 2;
    byTeam.set(team.id, grade + createRng(`${seed}:prior-rank:${team.id}`).float(-0.08, 0.08));
  }
  return rankGroups(teams, (team) => byTeam.get(team.id) ?? 0);
}

function seededDivisionRanks(teams: NFLTeam[], seed: string): Record<string, number> {
  return rankGroups(teams, (team) => team.marketSize + createRng(`${seed}:schedule-rank:${team.id}`).float(-8, 8));
}

function normalizedRanks(teams: NFLTeam[], seed: string, ranks?: Record<string, number>): Record<string, number> {
  if (!ranks || teams.some((team) => !ranks[team.id])) return seededDivisionRanks(teams, seed);
  return ranks;
}

function teamAtRank(teams: NFLTeam[], conference: Conference, division: Division, ranks: Record<string, number>, rank: number): NFLTeam | undefined {
  return teams.find((team) => team.conference === conference && team.division === division && ranks[team.id] === rank);
}

function rotationPartner(division: Division, seasonYear: number): Division {
  const round = Math.abs(seasonYear - 2026) % 3;
  const pairs: Array<Record<Division, Division>> = [
    { East: "North", North: "East", South: "West", West: "South" },
    { East: "South", South: "East", North: "West", West: "North" },
    { East: "West", West: "East", North: "South", South: "North" }
  ];
  return pairs[round][division];
}

function interconferenceDivision(division: Division, seasonYear: number, offset = 0): Division {
  const index = divisions.indexOf(division);
  return divisions[(index + Math.abs(seasonYear - 2026) + offset) % divisions.length];
}

function makeMatchups(teams: NFLTeam[], seed: string, ranks: Record<string, number>, seasonYear: number): Matchup[] {
  const groups = new Map<string, NFLTeam[]>();
  for (const team of teams) {
    const key = groupKey(team.conference, team.division);
    groups.set(key, [...(groups.get(key) ?? []), team].sort((a, b) => (ranks[a.id] ?? 9) - (ranks[b.id] ?? 9)));
  }

  const rng = createRng(`${seed}:opponents:${seasonYear}`);
  const matchups: Matchup[] = [];
  const once = new Set<string>();

  const add = (tag: string, home: NFLTeam, away: NFLTeam, divisionGame = false) => {
    const key = `${tag}:${home.id}:${away.id}`;
    if (once.has(key)) return;
    once.add(key);
    matchups.push({ id: key, homeTeamId: home.id, awayTeamId: away.id, divisionGame });
  };

  const addCrossSet = (tag: string, left: NFLTeam[], right: NFLTeam[]) => {
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
        const leftHome = (leftIndex + rightIndex + seasonYear) % 2 === 0;
        add(tag, leftHome ? left[leftIndex] : right[rightIndex], leftHome ? right[rightIndex] : left[leftIndex]);
      }
    }
  };

  for (const members of groups.values()) {
    for (let first = 0; first < members.length; first += 1) {
      for (let second = first + 1; second < members.length; second += 1) {
        add("division-home", members[first], members[second], true);
        add("division-away", members[second], members[first], true);
      }
    }
  }

  for (const conference of ["AFC", "NFC"] as Conference[]) {
    const seenDivisionPairs = new Set<string>();
    for (const division of divisions) {
      const partner = rotationPartner(division, seasonYear);
      const divisionPair = pairKey(division, partner);
      if (seenDivisionPairs.has(divisionPair)) continue;
      seenDivisionPairs.add(divisionPair);
      addCrossSet(
        `conference-rotation-${conference}-${divisionPair}`,
        groups.get(groupKey(conference, division)) ?? [],
        groups.get(groupKey(conference, partner)) ?? []
      );
    }
  }

  for (const division of divisions) {
    addCrossSet(
      `interconference-rotation-${division}`,
      groups.get(groupKey("AFC", division)) ?? [],
      groups.get(groupKey("NFC", interconferenceDivision(division, seasonYear))) ?? []
    );
  }

  const samePlacePairs = new Set<string>();
  for (const team of teams) {
    const conferenceTeams = divisions.filter((division) => division !== team.division && division !== rotationPartner(team.division, seasonYear));
    for (const division of conferenceTeams) {
      const opponent = teamAtRank(teams, team.conference, division, ranks, ranks[team.id]);
      if (!opponent) continue;
      const key = pairKey(team.id, opponent.id);
      if (samePlacePairs.has(key)) continue;
      samePlacePairs.add(key);
      const teamHome = (ranks[team.id] + divisions.indexOf(team.division) + divisions.indexOf(division) + seasonYear) % 2 === 0;
      add("conference-place", teamHome ? team : opponent, teamHome ? opponent : team);
    }
  }

  const seventeenthHomeConference: Conference = seasonYear % 2 === 0 ? "AFC" : "NFC";
  for (const division of divisions) {
    const afc = groups.get(groupKey("AFC", division)) ?? [];
    const nfcDivision = interconferenceDivision(division, seasonYear, 1);
    for (const afcTeam of afc) {
      const nfcTeam = teamAtRank(teams, "NFC", nfcDivision, ranks, ranks[afcTeam.id]);
      if (!nfcTeam) continue;
      const home = seventeenthHomeConference === "AFC" ? afcTeam : nfcTeam;
      const away = home.id === afcTeam.id ? nfcTeam : afcTeam;
      add("seventeenth", home, away);
    }
  }

  return rng.shuffle(matchups);
}

function matchupScore(matchup: Matchup, week: number, rng: Rng): number {
  const lateDivisionBump = matchup.divisionGame ? (week >= 14 ? -6 : week <= 4 ? -1.3 : 0.4) : week >= 14 ? 0.8 : 0;
  return lateDivisionBump + rng.float(-1, 1);
}

function bucketMatching(matchups: Matchup[], activeTeamIds: Set<string>, week: number, rng: Rng): Matchup[] | undefined {
  const byTeam = new Map<string, Matchup[]>();
  for (const teamId of activeTeamIds) byTeam.set(teamId, []);
  for (const matchup of matchups) {
    byTeam.get(matchup.homeTeamId)?.push(matchup);
    byTeam.get(matchup.awayTeamId)?.push(matchup);
  }

  function search(open: Set<string>, chosen: Matchup[]): Matchup[] | undefined {
    if (!open.size) return chosen;
    const teamId = [...open].sort((a, b) => {
      const count = (candidate: string) =>
        (byTeam.get(candidate) ?? []).filter((matchup) => open.has(matchup.homeTeamId) && open.has(matchup.awayTeamId)).length;
      return count(a) - count(b) || a.localeCompare(b);
    })[0];
    const options = rng
      .shuffle(byTeam.get(teamId) ?? [])
      .filter((matchup) => open.has(matchup.homeTeamId) && open.has(matchup.awayTeamId))
      .sort((a, b) => matchupScore(a, week, rng) - matchupScore(b, week, rng));
    for (const option of options) {
      const next = new Set(open);
      next.delete(option.homeTeamId);
      next.delete(option.awayTeamId);
      const result = search(next, [...chosen, option]);
      if (result) return result;
    }
    return undefined;
  }

  return search(new Set(activeTeamIds), []);
}

function colorMatchupBucket(matchups: Matchup[], weeks: number[], seed: string): Array<{ matchup: Matchup; week: number }> | undefined {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const rng = createRng(`${seed}:bucket:${attempt}`);
    let remaining = rng.shuffle(matchups);
    const placed: Array<{ matchup: Matchup; week: number }> = [];
    let failed = false;
    for (const week of weeks) {
      const active = new Set(remaining.flatMap((matchup) => [matchup.homeTeamId, matchup.awayTeamId]));
      const matching = bucketMatching(remaining, active, week, rng);
      if (!matching) {
        failed = true;
        break;
      }
      const ids = new Set(matching.map((matchup) => matchup.id));
      remaining = remaining.filter((matchup) => !ids.has(matchup.id));
      placed.push(...matching.map((matchup) => ({ matchup, week })));
    }
    if (!failed && !remaining.length) return placed;
  }
  return undefined;
}

function scheduleMatchups(matchups: Matchup[], seed: string): Array<{ matchup: Matchup; week: number }> {
  const buckets: Array<{ id: string; weeks: number[] }> = [
    { id: "division-home:", weeks: [1, 4, 8] },
    { id: "division-away:", weeks: [13, 17, 18] },
    { id: "conference-rotation-", weeks: [2, 3, 5, 6] },
    { id: "interconference-rotation-", weeks: [7, 10, 11, 12] },
    { id: "conference-place:", weeks: [14, 15] },
    { id: "seventeenth:", weeks: [16] }
  ];
  const placed: Array<{ matchup: Matchup; week: number }> = [];

  for (const bucket of buckets) {
    const bucketMatchups = matchups.filter((matchup) => matchup.id.startsWith(bucket.id));
    const scheduled = colorMatchupBucket(bucketMatchups, bucket.weeks, `${seed}:${bucket.id}`);
    if (!scheduled) throw new Error(`Unable to lay out ${bucket.id} matchups.`);
    placed.push(...scheduled);
  }

  if (placed.length !== matchups.length) {
    throw new Error("Unable to lay out NFL schedule matchups.");
  }
  return placed;
}

export function generateSchedule(teams: NFLTeam[], seed: string, ranks?: Record<string, number>, seasonYear = 2026): Game[] {
  const scheduleRanks = normalizedRanks(teams, seed, ranks);
  const matchups = makeMatchups(teams, seed, scheduleRanks, seasonYear);
  const regular: Game[] = scheduleMatchups(matchups, `${seed}:${seasonYear}`).map(({ matchup, week }) => ({
    id: `week-${week}-${matchup.awayTeamId}-at-${matchup.homeTeamId}`,
    week,
    homeTeamId: matchup.homeTeamId,
    awayTeamId: matchup.awayTeamId,
    seasonType: "regular",
    status: "scheduled",
    homeScore: 0,
    awayScore: 0,
    log: [],
    injuries: [],
    snapCounts: {}
  }));
  return addDatesToRegularSchedule(regular, seasonYear);
}

export function generateLeagueSchedule(teams: NFLTeam[], seed: string, ranks?: Record<string, number>, seasonYear = 2026): Game[] {
  return [
    ...generatePreseasonSchedule(teams.map((team) => team.id), seed, seasonYear),
    ...generateSchedule(teams, seed, ranks, seasonYear)
  ].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.week - b.week || a.id.localeCompare(b.id));
}
