import type { AppSettings, TimeEntry, TimeEntryId } from '@/domain/types';

/**
 * Persistence boundary. v1 = device-local (SQLite).
 * Later: SyncedStore implementing the same methods (auth + remote sync).
 */
export interface HourStore {
  init(): Promise<void>;

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  listEntries(): Promise<TimeEntry[]>;
  getEntry(id: TimeEntryId): Promise<TimeEntry | null>;
  upsertEntry(entry: TimeEntry): Promise<void>;
  deleteEntry(id: TimeEntryId): Promise<void>;
}
