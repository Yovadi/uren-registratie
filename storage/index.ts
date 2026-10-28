import { LocalSqliteStore } from './local-store';
import { MemoryStore } from './memory-store';
import type { HourStore } from './types';

export type { HourStore } from './types';
export { LocalSqliteStore } from './local-store';
export { MemoryStore } from './memory-store';

let singleton: HourStore | null = null;

/**
 * Prefer SQLite; fall back to memory if open/init fails (e.g. restricted web).
 * Swap this factory later for a SyncedStore without changing screens.
 */
export async function getHourStore(): Promise<HourStore> {
  if (singleton) return singleton;

  try {
    const store = new LocalSqliteStore();
    await store.init();
    singleton = store;
    return store;
  } catch (err) {
    console.warn('[storage] SQLite unavailable, using MemoryStore', err);
    const store = new MemoryStore();
    await store.init();
    singleton = store;
    return store;
  }
}
