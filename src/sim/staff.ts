import type { GameSave, StaffCandidate, StaffDepartment, StaffMember, StaffSlotId } from "../types";
import { generateStaffMarket } from "./generate";
import { selectedTeam, staffForTeam } from "./selectors";
import {
  coachDevelopmentGrade,
  colorTierForStaff,
  conferenceRatingsForScout,
  normalizeStaffForTeams,
  scoutSpecialtyTags,
  staffDepartmentFor,
  staffGameModifier,
  staffOverall,
  staffSlotDefinitions,
  staffValueScore,
  slotDefinitionFor
} from "./staffModel";

export {
  coachDevelopmentGrade,
  colorTierForStaff,
  conferenceRatingsForScout,
  normalizeStaffForTeams,
  scoutSpecialtyTags,
  staffGameModifier,
  staffOverall,
  staffSlotDefinitions,
  staffValueScore,
  slotDefinitionFor
};

export function staffPayroll(save: GameSave, teamId: string): number {
  return Number(staffForTeam(save, teamId).reduce((sum, member) => sum + member.salary, 0).toFixed(1));
}

export function departmentGrade(staff: StaffMember[], department: StaffDepartment): number {
  const members = staff.filter((member) => member.department === department);
  if (!members.length) return 50;
  return Math.round(members.reduce((sum, member) => sum + staffOverall(member), 0) / members.length);
}

export function ensureStaffMarket(save: GameSave): GameSave {
  if (
    save.staffMarket?.candidates?.length &&
    save.staffMarket.candidates.every((candidate) => candidate.slotId && candidate.skillProfile && Number.isFinite(candidate.valueScore))
  ) {
    return save;
  }
  return {
    ...save,
    staffMarket: generateStaffMarket(save.teams, save.seed, save.currentWeek)
  };
}

export function interviewStaffCandidate(save: GameSave, candidateId: string): GameSave {
  const next = ensureStaffMarket(save);
  const candidate = next.staffMarket.candidates.find((item) => item.id === candidateId);
  if (!candidate) return next;
  return {
    ...next,
    staffMarket: {
      ...next.staffMarket,
      candidates: next.staffMarket.candidates.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              interviewed: true,
              roleFit: Math.min(99, item.roleFit + 6),
              valueScore: Math.min(99, item.valueScore + 3),
              interestedTeamIds: item.interestedTeamIds.includes(next.selectedTeamId)
                ? item.interestedTeamIds
                : [next.selectedTeamId, ...item.interestedTeamIds]
            }
          : item
      )
    },
    inbox: [
      {
        id: `staff-interview-${candidateId}-${next.currentWeek}-${next.inbox.length}`,
        week: next.currentWeek,
        category: "staff",
        title: `${candidate.role} interview completed`,
        body: `${candidate.firstName} ${candidate.lastName} completed the interview. Role fit improved to ${Math.min(99, candidate.roleFit + 6)} and value improved to ${Math.min(99, candidate.valueScore + 3)}.`,
        priority: "low",
        read: false
      },
      ...next.inbox
    ]
  };
}

export function hireStaffCandidate(save: GameSave, candidateId: string, slotId?: StaffSlotId): GameSave {
  const next = ensureStaffMarket(save);
  const candidate = next.staffMarket.candidates.find((item) => item.id === candidateId);
  if (!candidate || candidate.hired) return next;
  const team = selectedTeam(next);
  const targetSlot = slotDefinitionFor(slotId ?? candidate.slotId);
  const existing = next.staff.find((member) => member.teamId === team.id && member.slotId === targetSlot.id);
  const staffMember: StaffMember = {
    ...candidate,
    id: `${team.id}-${targetSlot.id}-${candidate.lastName.toLowerCase()}`,
    role: targetSlot.role,
    slotId: targetSlot.id,
    teamId: team.id,
    salary: candidate.demandSalary,
    contractYears: candidate.demandYears,
    department: targetSlot.department,
    roleFit: Math.max(candidate.roleFit, staffOverall(candidate))
  };
  const budgetDelta = Number(((existing?.salary ?? 0) - candidate.demandSalary).toFixed(1));
  const staff = existing
    ? next.staff.map((member) => (member.id === existing.id ? staffMember : member))
    : [...next.staff, staffMember];
  return {
    ...next,
    staff,
    budget: {
      ...next.budget,
      [team.id]: Number(((next.budget[team.id] ?? 0) + budgetDelta).toFixed(1))
    },
    staffMarket: {
      ...next.staffMarket,
      candidates: next.staffMarket.candidates.map((item) =>
        item.id === candidateId ? { ...item, hired: true, teamId: team.id } : item
      )
    },
    inbox: [
      {
        id: `staff-hire-${candidateId}-${next.currentWeek}-${next.inbox.length}`,
        week: next.currentWeek,
        category: "staff",
        title: `${targetSlot.label} hire completed`,
        body: `${candidate.firstName} ${candidate.lastName} joins as ${targetSlot.label} for $${candidate.demandSalary.toFixed(1)}M over ${candidate.demandYears} year${candidate.demandYears === 1 ? "" : "s"}. Value score: ${candidate.valueScore}.`,
        priority: "normal",
        read: false
      },
      ...next.inbox
    ]
  };
}

export function refreshStaffMarket(save: GameSave): GameSave {
  return {
    ...save,
    staffMarket: generateStaffMarket(save.teams, save.seed, save.currentWeek + save.inbox.length),
    inbox: [
      {
        id: `staff-market-refresh-${save.currentWeek}-${save.inbox.length}`,
        week: save.currentWeek,
        category: "staff",
        title: "Staff search refreshed",
        body: "The candidate pool was refreshed with new coaches, scouts, and training staff.",
        priority: "low",
        read: false
      },
      ...save.inbox
    ]
  };
}
