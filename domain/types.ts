/** Domain types — no UI dependency. Ready for solo offline use and later sync. */

/** IANA timezone id, e.g. "Europe/Amsterdam" or "Asia/Dubai". */
export type TimeZoneId = string;

export type TimeEntryId = string;

/**
 * One work period logged on site.
 * Times are stored as ISO-8601 instants (UTC). Site timezone is kept so
 * local wall-clock and overtime rules stay correct when traveling.
 */
export interface TimeEntry {
  id: TimeEntryId;
  /** Instant when work started (UTC ISO string). */
  startAt: string;
  /** Instant when work ended (UTC ISO string). Null = still running. */
  endAt: string | null;
  /** Timezone of the work site / airport for this entry. */
  siteTimeZone: TimeZoneId;
  /** Free-text client or project label. */
  project: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/** Standard workweek rules used to compute overtime. */
export interface WorkRules {
  /** Expected paid hours per calendar day (e.g. 8). */
  hoursPerDay: number;
  /** Expected paid hours per week (e.g. 40). */
  hoursPerWeek: number;
  /** Week starts on: 1 = Monday … 7 = Sunday (ISO). */
  weekStartsOn: 1 | 7;
}

/** Solo-device settings. Home TZ is where “local vs home” display is relative to. */
export interface AppSettings {
  homeTimeZone: TimeZoneId;
  workRules: WorkRules;
}

export const DEFAULT_WORK_RULES: WorkRules = {
  hoursPerDay: 8,
  hoursPerWeek: 40,
  weekStartsOn: 1,
};

export const DEFAULT_SETTINGS: AppSettings = {
  homeTimeZone: 'Europe/Amsterdam',
  workRules: DEFAULT_WORK_RULES,
};

export function createEmptyEntry(
  partial: Partial<Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>> & {
    siteTimeZone: TimeZoneId;
  },
): Omit<TimeEntry, 'id'> {
  const now = new Date().toISOString();
  return {
    startAt: partial.startAt ?? now,
    endAt: partial.endAt ?? null,
    siteTimeZone: partial.siteTimeZone,
    project: partial.project ?? '',
    note: partial.note ?? '',
    createdAt: now,
    updatedAt: now,
  };
}
