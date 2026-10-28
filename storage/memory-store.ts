import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type TimeEntry,
  type TimeEntryId,
} from '@/domain/types';
import type { HourStore } from './types';

/** In-memory fallback (tests / when SQLite cannot open). Same HourStore contract. */
export class MemoryStore implements HourStore {
  private settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    workRules: { ...DEFAULT_SETTINGS.workRules },
  };
  private entries = new Map<TimeEntryId, TimeEntry>();

  async init(): Promise<void> {
    /* no-op */
  }

  async getSettings(): Promise<AppSettings> {
    return {
      homeTimeZone: this.settings.homeTimeZone,
      workRules: { ...this.settings.workRules },
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = {
      homeTimeZone: settings.homeTimeZone,
      workRules: { ...settings.workRules },
    };
  }

  async listEntries(): Promise<TimeEntry[]> {
    return [...this.entries.values()].sort((a, b) => b.startAt.localeCompare(a.startAt));
  }

  async getEntry(id: TimeEntryId): Promise<TimeEntry | null> {
    return this.entries.get(id) ?? null;
  }

  async upsertEntry(entry: TimeEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry });
  }

  async deleteEntry(id: TimeEntryId): Promise<void> {
    this.entries.delete(id);
  }
}
