import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_SETTINGS,
  createEmptyEntry,
  type AppSettings,
  type TimeEntry,
  type TimeEntryId,
} from '@/domain';
import { getHourStore, type HourStore } from '@/storage';

type AppDataContextValue = {
  ready: boolean;
  error: string | null;
  settings: AppSettings;
  entries: TimeEntry[];
  refresh: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  addEntry: (
    input: Partial<Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>> & {
      siteTimeZone: string;
    },
  ) => Promise<TimeEntry>;
  updateEntry: (entry: TimeEntry) => Promise<void>;
  removeEntry: (id: TimeEntryId) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function newId(): string {
  return `te_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<HourStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const refresh = useCallback(async () => {
    const s = store ?? (await getHourStore());
    if (!store) setStore(s);
    const [nextSettings, nextEntries] = await Promise.all([s.getSettings(), s.listEntries()]);
    setSettings(nextSettings);
    setEntries(nextEntries);
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getHourStore();
        if (cancelled) return;
        setStore(s);
        const [nextSettings, nextEntries] = await Promise.all([
          s.getSettings(),
          s.listEntries(),
        ]);
        if (cancelled) return;
        setSettings(nextSettings);
        setEntries(nextEntries);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to open store');
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = useCallback(
    async (next: AppSettings) => {
      if (!store) throw new Error('Store not ready');
      await store.saveSettings(next);
      setSettings(next);
    },
    [store],
  );

  const addEntry = useCallback(
    async (
      input: Partial<Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>> & {
        siteTimeZone: string;
      },
    ) => {
      if (!store) throw new Error('Store not ready');
      const base = createEmptyEntry(input);
      const entry: TimeEntry = { ...base, id: newId() };
      await store.upsertEntry(entry);
      setEntries((prev) => [entry, ...prev].sort((a, b) => b.startAt.localeCompare(a.startAt)));
      return entry;
    },
    [store],
  );

  const updateEntry = useCallback(
    async (entry: TimeEntry) => {
      if (!store) throw new Error('Store not ready');
      const next = { ...entry, updatedAt: new Date().toISOString() };
      await store.upsertEntry(next);
      setEntries((prev) =>
        prev
          .map((e) => (e.id === next.id ? next : e))
          .sort((a, b) => b.startAt.localeCompare(a.startAt)),
      );
    },
    [store],
  );

  const removeEntry = useCallback(
    async (id: TimeEntryId) => {
      if (!store) throw new Error('Store not ready');
      await store.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [store],
  );

  const value = useMemo(
    () => ({
      ready,
      error,
      settings,
      entries,
      refresh,
      saveSettings,
      addEntry,
      updateEntry,
      removeEntry,
    }),
    [
      ready,
      error,
      settings,
      entries,
      refresh,
      saveSettings,
      addEntry,
      updateEntry,
      removeEntry,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
