import type { FieldServiceStore } from './types';
import { WebLocalStore } from './web-store';

export type { FieldServiceStore } from './types';
export { WebLocalStore } from './web-store';
export { MemoryStore } from './memory-store';

let singleton: FieldServiceStore | null = null;

export async function getStore(): Promise<FieldServiceStore> {
  if (singleton) return singleton;
  const store = new WebLocalStore();
  await store.init();
  singleton = store;
  return store;
}
