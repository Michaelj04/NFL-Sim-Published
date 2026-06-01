import type { AnnualRecruit, AnnualRosterImportPlan, AnnualRosterImportPlanEntry, CollegeRosterPlayer, GameSave } from "../types";
import { annualPromiseType } from "./annualRuntime";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueRuntimeCsvs(save: GameSave): string[] {
  return [...new Set([
    ...(save.annualRecruiting?.runtimeCsvs ?? []),
    ...(save.annualTransferPortal?.runtimeCsvs ?? [])
  ])].sort();
}

export function generateAnnualRosterImportPlan(save: GameSave, seasonYear = save.seasonYear): AnnualRosterImportPlan {
  const recruitsById = new Map(save.annualRecruitClass?.recruits.map((recruit) => [recruit.id, recruit]) ?? []);
  const playersById = new Map(save.players.map((player) => [player.id, player]));
  const recruitingEntries: AnnualRosterImportPlanEntry[] = (save.annualRecruiting?.board ?? [])
    .filter((entry) => entry.status === "committed" || entry.status === "signed" || entry.status === "offered")
    .sort((a, b) => b.interestScore - a.interestScore || a.id.localeCompare(b.id))
    .slice(0, Math.max(64, save.schools.length))
    .flatMap((entry, index) => {
      const prospect = recruitsById.get(entry.prospectId);
      if (!prospect) return [];
      return [{
        id: `annual-import-${seasonYear}-recruiting-${index + 1}-${entry.prospectId}`,
        source: "recruiting" as const,
        prospectId: entry.prospectId,
        targetTeamId: entry.schoolId,
        position: prospect.position,
        priority: Math.round(entry.interestScore),
        status: entry.status === "signed" || entry.status === "committed" ? "planned" as const : "deferred" as const,
        summary: `${prospect.firstName} ${prospect.lastName} is queued from annual recruiting at ${entry.interestScore} interest, ${entry.positionNeed} position need, ${entry.nilScore} NIL fit${entry.promiseType ? `, promise ${entry.promiseType}` : ""}. ${entry.debugFactors.join("; ")}.`
      }];
    });
  const transferEntries: AnnualRosterImportPlanEntry[] = (save.annualTransferPortal?.entries ?? [])
    .filter((entry) => entry.status === "open" || entry.status === "committed")
    .flatMap((entry, index) => {
      const player = playersById.get(entry.playerId);
      const destination = entry.destinationScores[0];
      if (!player || !destination) return [];
      return [{
        id: `annual-import-${seasonYear}-transfer-${index + 1}-${entry.playerId}`,
        source: "transfer" as const,
        playerId: entry.playerId,
        fromTeamId: entry.fromTeamId,
        targetTeamId: destination.teamId,
        position: entry.position,
        priority: destination.score,
        status: entry.status === "committed" ? "planned" as const : "deferred" as const,
        summary: `${entry.playerName} has ${entry.reason} transfer interest; top destination fit is ${destination.score}.`
      }];
    });
  return {
    seasonYear,
    generatedWeek: save.currentWeek,
    entries: [...recruitingEntries, ...transferEntries].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)),
    runtimeCsvs: uniqueRuntimeCsvs(save),
    usesYearZeroBundles: false
  };
}

export function applyAnnualRosterImportPlan(save: GameSave): GameSave {
  const plan = save.annualRosterImportPlan;
  if (!plan) return save;
  const transferEntries = plan.entries.filter((entry) => entry.status === "planned" && entry.source === "transfer" && entry.playerId);
  const recruitingEntries = plan.entries.filter((entry) => entry.status === "planned" && entry.source === "recruiting" && entry.prospectId);
  if (transferEntries.length === 0 && recruitingEntries.length === 0) return save;
  const collegePlayerIds = new Set(save.collegeRoster?.players.map((player) => player.id) ?? []);
  const collegeTargetByPlayerId = new Map(transferEntries.filter((entry) => collegePlayerIds.has(entry.playerId!)).map((entry) => [entry.playerId!, entry.targetTeamId]));
  const nflTargetByPlayerId = new Map(transferEntries.filter((entry) => !collegePlayerIds.has(entry.playerId!)).map((entry) => [entry.playerId!, entry.targetTeamId]));
  const existingCollegeIds = new Set(save.collegeRoster?.players.map((player) => player.id) ?? []);
  const recruitsById = new Map(save.annualRecruitClass?.recruits.map((recruit) => [recruit.id, recruit]) ?? []);
  const signedProspectIds = new Set<string>();
  const movedCollegePlayerIds = new Set(collegeTargetByPlayerId.keys());
  const signedRecruits = recruitingEntries.flatMap((entry): CollegeRosterPlayer[] => {
    const prospect = recruitsById.get(entry.prospectId!);
    if (!prospect || existingCollegeIds.has(`college-${entry.targetTeamId}-${prospect.id}`)) return [];
    signedProspectIds.add(prospect.id);
    return [prospectToCollegeRosterPlayer(prospect, entry.targetTeamId, save.seasonYear, findRecruitingPromise(save, entry.prospectId!, entry.targetTeamId))];
  });
  const players = save.players.map((player) => {
    const targetTeamId = nflTargetByPlayerId.get(player.id);
    if (!targetTeamId || player.teamId === "FA") return player;
    return {
      ...player,
      teamId: targetTeamId,
      teamStartSeason: save.seasonYear,
      status: "active" as const,
      practiceSquadElevatedWeek: undefined,
      practiceSquadProtectedWeek: undefined,
      practiceSquadElevations: undefined
    };
  });
  const movedPlayerIds = new Set([...nflTargetByPlayerId.keys(), ...movedCollegePlayerIds]);
  return {
    ...save,
    players,
    collegeRoster: save.collegeRoster ? {
      ...save.collegeRoster,
      players: [
        ...save.collegeRoster.players.map((player) => {
          const targetSchoolId = collegeTargetByPlayerId.get(player.id);
          if (!targetSchoolId) return player;
          return {
            ...player,
            schoolId: targetSchoolId,
            source: "annual_transfer" as const
          };
        }),
        ...signedRecruits
      ]
    } : save.collegeRoster,
    annualRosterImportPlan: {
      ...plan,
      entries: plan.entries.map((entry) => (entry.playerId && movedPlayerIds.has(entry.playerId)) || (entry.prospectId && signedProspectIds.has(entry.prospectId)) ? {
        ...entry,
        status: "applied" as const,
        summary: `${entry.summary} Applied to the live roster handoff.`
      } : entry)
    },
    annualTransferPortal: save.annualTransferPortal ? {
      ...save.annualTransferPortal,
      entries: save.annualTransferPortal.entries.map((entry) => movedPlayerIds.has(entry.playerId) ? {
        ...entry,
        status: "committed" as const
      } : entry)
    } : undefined
  };
}

function findRecruitingPromise(save: GameSave, prospectId: string, schoolId: string): { promiseType?: string; target?: number } {
  const entry = save.annualRecruiting?.board.find((candidate) => candidate.prospectId === prospectId && candidate.schoolId === schoolId);
  const promise = annualPromiseType(entry?.promiseType);
  return { promiseType: promise?.promiseType, target: promise?.targetValue };
}

function prospectToCollegeRosterPlayer(prospect: AnnualRecruit, schoolId: string, seasonYear: number, promise: { promiseType?: string; target?: number }): CollegeRosterPlayer {
  return {
    id: `college-${schoolId}-${prospect.id}`,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    schoolId,
    position: prospect.position,
    classYear: "FR",
    age: 18,
    collegeOverall: Math.round(clamp(prospect.trueOverall + 8, 35, 99)),
    collegePotential: Math.round(clamp(prospect.truePotential + 6, 40, 99)),
    ratingScaleContext: "college",
    source: "annual_recruiting",
    rosterStatus: "active",
    signedSeason: seasonYear,
    recruitingPromiseType: promise.promiseType,
    recruitingPromiseTarget: promise.target,
    recruitingPromiseSeason: promise.promiseType ? seasonYear : undefined
  };
}
