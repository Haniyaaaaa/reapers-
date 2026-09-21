import type { TeamCompensation, TeamStage, TeamWorkMode } from '../services/supabase/types';
import type { TeamRequestFilters } from '../services/supabase/network';
import type { TeamRequest } from '../types/extra';

export const STAGE_OPTIONS: { value: TeamStage; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'vertical_slice', label: 'Vertical slice' },
  { value: 'production', label: 'Production' },
  { value: 'live', label: 'Live' },
];

export const COMPENSATION_OPTIONS: { value: TeamCompensation; label: string; short: string }[] = [
  { value: 'paid', label: 'Paid', short: 'PAID' },
  { value: 'revenue_share', label: 'Revenue share', short: 'REV SHARE' },
  { value: 'unpaid', label: 'Unpaid', short: 'UNPAID' },
];

export const ENGINE_OPTIONS = ['Unity', 'Unreal', 'Godot', 'Custom'];

/** "Role needed" presets — people can also type their own. */
export const ROLE_OPTIONS = ['Programmer', 'Artist', 'Sound Designer', 'Writer', 'Animator', 'Designer'];

export const WORK_MODE_OPTIONS: { value: TeamWorkMode; label: string }[] = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

export function workModeLabel(mode?: TeamWorkMode): string | undefined {
  return WORK_MODE_OPTIONS.find((o) => o.value === mode)?.label;
}

/** Typed roles are stored Title Cased so "sound designer" and "Sound Designer" are the same tag. */
export function titleCase(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export type TeamDateOption = 'TODAY' | 'THIS WEEK' | 'THIS MONTH' | 'CUSTOM';
export const TEAM_DATE_OPTIONS: TeamDateOption[] = ['THIS WEEK', 'TODAY', 'THIS MONTH', 'CUSTOM'];

export type TeamFilterSelection = {
  date: TeamDateOption | null;
  /** ISO date, only meaningful when date === 'CUSTOM'. */
  customDate?: string;
  workModes: TeamWorkMode[];
  city: string;
  roles: string[];
  engines: string[];
};
export const EMPTY_TEAM_FILTERS: TeamFilterSelection = { date: null, workModes: [], city: '', roles: [], engines: [] };

export function teamFilterCount(f: TeamFilterSelection): number {
  return (f.date ? 1 : 0) + f.workModes.length + (f.city.trim() ? 1 : 0) + f.roles.length + f.engines.length;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "When is this role needed" window: roles needed from today up to the end of the chosen period
 * (or exactly on the custom day). */
export function teamFiltersToApi(f: TeamFilterSelection): TeamRequestFilters {
  const out: TeamRequestFilters = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (f.date === 'TODAY') {
    out.neededFrom = out.neededTo = toDateKey(today);
  } else if (f.date === 'THIS WEEK') {
    const end = new Date(today);
    end.setDate(today.getDate() + 6);
    out.neededFrom = toDateKey(today);
    out.neededTo = toDateKey(end);
  } else if (f.date === 'THIS MONTH') {
    out.neededFrom = toDateKey(today);
    out.neededTo = toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  } else if (f.date === 'CUSTOM' && f.customDate) {
    out.neededFrom = out.neededTo = toDateKey(new Date(f.customDate));
  }
  if (f.workModes.length) out.workModes = f.workModes;
  if (f.city.trim()) out.city = f.city.trim();
  if (f.roles.length) out.roles = f.roles;
  if (f.engines.length) out.engines = f.engines;
  return out;
}

export function stageLabel(stage?: TeamStage): string | undefined {
  return STAGE_OPTIONS.find((o) => o.value === stage)?.label;
}

/** "ASHFALL STUDIO · 4 PEOPLE" — only the parts the poster actually provided. */
export function formatStudioLine(team: Pick<TeamRequest, 'studio' | 'teamSize'>): string | undefined {
  const parts = [team.studio?.toUpperCase(), team.teamSize ? `${team.teamSize} ${team.teamSize === 1 ? 'PERSON' : 'PEOPLE'}` : undefined];
  const line = parts.filter(Boolean).join(' · ');
  return line || undefined;
}

/** "~10 HRS/WEEK · REV SHARE" — only the parts the poster actually provided. */
export function formatCommitment(team: Pick<TeamRequest, 'hoursPerWeek' | 'compensation'>): string | undefined {
  const parts = [
    team.hoursPerWeek ? `~${team.hoursPerWeek} HRS/WEEK` : undefined,
    COMPENSATION_OPTIONS.find((o) => o.value === team.compensation)?.short,
  ];
  const line = parts.filter(Boolean).join(' · ');
  return line || undefined;
}


/** Same criteria teamFiltersToApi sends to the database, applied to requests already in memory
 * (used on "My team requests", which loads all of the poster's own requests at once). */
export function matchesTeamFilters(team: TeamRequest, f: TeamFilterSelection): boolean {
  const api = teamFiltersToApi(f);
  if (api.neededFrom || api.neededTo) {
    if (!team.neededBy) return false;
    if (api.neededFrom && team.neededBy < api.neededFrom) return false;
    if (api.neededTo && team.neededBy > api.neededTo) return false;
  }
  if (api.workModes?.length && (!team.workMode || !api.workModes.includes(team.workMode))) return false;
  if (api.city && !(team.location ?? '').toLowerCase().includes(api.city.toLowerCase())) return false;
  if (api.roles?.length && !team.roles.some((r) => api.roles!.some((x) => x.toLowerCase() === r.toLowerCase()))) return false;
  if (api.engines?.length && (!team.engine || !api.engines.includes(team.engine))) return false;
  return true;
}
