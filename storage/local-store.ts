import * as SQLite from 'expo-sqlite';

import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type TimeEntry,
  type TimeEntryId,
} from '@/domain/types';
import type { HourStore } from './types';

const DB_NAME = 'uren-registratie.db';

/**
 * Solo offline store backed by expo-sqlite.
 * Same interface as a future SyncedStore — screens never talk to SQLite directly.
 */
export class LocalSqliteStore implements HourStore {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT,
        site_time_zone TEXT NOT NULL,
        project TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_at);
    `);

    const row = await this.db.getFirstAsync<{ json: string }>(
      'SELECT json FROM settings WHERE id = 1',
    );
    if (!row) {
      await this.db.runAsync('INSERT INTO settings (id, json) VALUES (1, ?)', [
        JSON.stringify(DEFAULT_SETTINGS),
      ]);
    }
  }

  private requireDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('LocalSqliteStore not initialized — call init() first');
    return this.db;
  }

  async getSettings(): Promise<AppSettings> {
    const row = await this.requireDb().getFirstAsync<{ json: string }>(
      'SELECT json FROM settings WHERE id = 1',
    );
    if (!row) return { ...DEFAULT_SETTINGS, workRules: { ...DEFAULT_SETTINGS.workRules } };
    try {
      const parsed = JSON.parse(row.json) as AppSettings;
      return {
        homeTimeZone: parsed.homeTimeZone ?? DEFAULT_SETTINGS.homeTimeZone,
        workRules: {
          ...DEFAULT_SETTINGS.workRules,
          ...(parsed.workRules ?? {}),
        },
      };
    } catch {
      return { ...DEFAULT_SETTINGS, workRules: { ...DEFAULT_SETTINGS.workRules } };
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.requireDb().runAsync(
      'INSERT INTO settings (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json',
      [JSON.stringify(settings)],
    );
  }

  async listEntries(): Promise<TimeEntry[]> {
    const rows = await this.requireDb().getAllAsync<EntryRow>(
      'SELECT * FROM time_entries ORDER BY start_at DESC',
    );
    return rows.map(rowToEntry);
  }

  async getEntry(id: TimeEntryId): Promise<TimeEntry | null> {
    const row = await this.requireDb().getFirstAsync<EntryRow>(
      'SELECT * FROM time_entries WHERE id = ?',
      [id],
    );
    return row ? rowToEntry(row) : null;
  }

  async upsertEntry(entry: TimeEntry): Promise<void> {
    await this.requireDb().runAsync(
      `INSERT INTO time_entries
        (id, start_at, end_at, site_time_zone, project, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        site_time_zone = excluded.site_time_zone,
        project = excluded.project,
        note = excluded.note,
        updated_at = excluded.updated_at`,
      [
        entry.id,
        entry.startAt,
        entry.endAt,
        entry.siteTimeZone,
        entry.project,
        entry.note,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
  }

  async deleteEntry(id: TimeEntryId): Promise<void> {
    await this.requireDb().runAsync('DELETE FROM time_entries WHERE id = ?', [id]);
  }
}

type EntryRow = {
  id: string;
  start_at: string;
  end_at: string | null;
  site_time_zone: string;
  project: string;
  note: string;
  created_at: string;
  updated_at: string;
};

function rowToEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    startAt: row.start_at,
    endAt: row.end_at,
    siteTimeZone: row.site_time_zone,
    project: row.project,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
