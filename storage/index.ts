import { MemoryStore } from './memory-store';
import type { FieldServiceStore } from './types';

export type { FieldServiceStore } from './types';
export { MemoryStore } from './memory-store';

let singleton: FieldServiceStore | null = null;

/**
 * Native: memory + seed for Expo Go (SQLite schema can be layered later).
 * Web uses `index.web.ts` (localStorage).
 */
export async function getStore(): Promise<FieldServiceStore> {
  if (singleton) return singleton;
  const store = new MemoryStore();
  await store.init();
  singleton = store;
  return store;
}
