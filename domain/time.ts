import type { TimeEntry, WorkRules } from './types';

/** Duration of an entry in hours. Open entries use `now` as end. */
export function entryHours(entry: TimeEntry, now: Date = new Date()): number {
  const start = Date.parse(entry.startAt);
  const end = entry.endAt ? Date.parse(entry.endAt) : now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

export function roundHours(hours: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(hours * f) / f;
}

/** Monday 00:00 UTC of the ISO week that contains `date`. */
export function startOfIsoWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfIsoWeekUtc(date: Date): Date {
  const start = startOfIsoWeekUtc(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

export interface WeekTotals {
  weekStartIso: string;
  totalHours: number;
  expectedHours: number;
  overtimeHours: number;
  entryCount: number;
}

/**
 * Placeholder week totals: sum entry hours in the ISO week of `reference`,
 * overtime = max(0, total − hoursPerWeek). Site TZ / home TZ display comes later.
 */
export function computeWeekTotals(
  entries: TimeEntry[],
  rules: WorkRules,
  reference: Date = new Date(),
): WeekTotals {
  const start = startOfIsoWeekUtc(reference);
  const end = endOfIsoWeekUtc(reference);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const inWeek = entries.filter((e) => {
    const t = Date.parse(e.startAt);
    return !Number.isNaN(t) && t >= startMs && t < endMs;
  });

  const totalHours = roundHours(inWeek.reduce((sum, e) => sum + entryHours(e), 0));
  const expectedHours = rules.hoursPerWeek;
  const overtimeHours = roundHours(Math.max(0, totalHours - expectedHours));

  return {
    weekStartIso: start.toISOString(),
    totalHours,
    expectedHours,
    overtimeHours,
    entryCount: inWeek.length,
  };
}
