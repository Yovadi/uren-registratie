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
  enrichRegistratie,
  type AppSettings,
  type CompensatieBankRegel,
  type DashboardFilters,
  type ReisPlan,
  type WerkRegistratie,
} from '@/domain';
import { getStore, type FieldServiceStore } from '@/storage';

type Ctx = {
  ready: boolean;
  error: string | null;
  settings: AppSettings;
  registraties: WerkRegistratie[];
  bank: CompensatieBankRegel[];
  reizen: ReisPlan[];
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
  refresh: () => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveRegistratie: (
    input: Omit<WerkRegistratie, 'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType' | 'RegistratieID'> & {
      RegistratieID?: number;
    },
  ) => Promise<WerkRegistratie>;
  removeRegistratie: (id: number) => Promise<void>;
  saveBank: (row: CompensatieBankRegel) => Promise<void>;
  removeBank: (id: string) => Promise<void>;
  saveReis: (row: ReisPlan) => Promise<void>;
  removeReis: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
};

const AppDataContext = createContext<Ctx | null>(null);

function defaultFilters(): DashboardFilters {
  const now = new Date();
  return {
    jaar: now.getFullYear(),
    maand: 'all',
    klant: 'all',
    land: 'all',
    medewerker: 'all',
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<FieldServiceStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [registraties, setRegistraties] = useState<WerkRegistratie[]>([]);
  const [bank, setBank] = useState<CompensatieBankRegel[]>([]);
  const [reizen, setReizen] = useState<ReisPlan[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const hydrate = useCallback(async (s: FieldServiceStore) => {
    const [st, regs, bk, rz] = await Promise.all([
      s.getSettings(),
      s.listRegistraties(),
      s.listBank(),
      s.listReizen(),
    ]);
    setSettings(st);
    setRegistraties(regs);
    setBank(bk);
    setReizen(rz);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getStore();
        if (cancelled) return;
        setStore(s);
        await hydrate(s);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Store openen mislukt');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const refresh = useCallback(async () => {
    const s = store ?? (await getStore());
    if (!store) setStore(s);
    await hydrate(s);
  }, [store, hydrate]);

  const saveSettings = useCallback(
    async (next: AppSettings) => {
      if (!store) throw new Error('Store not ready');
      await store.saveSettings(next);
      setSettings(next);
    },
    [store],
  );

  const saveRegistratie = useCallback(
    async (
      input: Omit<WerkRegistratie, 'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType' | 'RegistratieID'> & {
        RegistratieID?: number;
      },
    ) => {
      if (!store) throw new Error('Store not ready');
      const id = input.RegistratieID ?? (await store.nextRegistratieId());
      const row = enrichRegistratie({ ...input, RegistratieID: id });
      await store.upsertRegistratie(row);
      const regs = await store.listRegistraties();
      setRegistraties(regs);
      return regs.find((r) => r.RegistratieID === id) ?? row;
    },
    [store],
  );

  const removeRegistratie = useCallback(
    async (id: number) => {
      if (!store) throw new Error('Store not ready');
      await store.deleteRegistratie(id);
      setRegistraties(await store.listRegistraties());
    },
    [store],
  );

  const saveBank = useCallback(
    async (row: CompensatieBankRegel) => {
      if (!store) throw new Error('Store not ready');
      await store.upsertBank(row);
      setBank(await store.listBank());
    },
    [store],
  );

  const removeBank = useCallback(
    async (id: string) => {
      if (!store) throw new Error('Store not ready');
      await store.deleteBank(id);
      setBank(await store.listBank());
    },
    [store],
  );

  const saveReis = useCallback(
    async (row: ReisPlan) => {
      if (!store) throw new Error('Store not ready');
      await store.upsertReis(row);
      setReizen(await store.listReizen());
    },
    [store],
  );

  const removeReis = useCallback(
    async (id: string) => {
      if (!store) throw new Error('Store not ready');
      await store.deleteReis(id);
      setReizen(await store.listReizen());
    },
    [store],
  );

  const resetDemoData = useCallback(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hotraco-speria-fsm:v1');
    }
    // Force re-init by recreating — simplest: reload page on web
    if (typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      error,
      settings,
      registraties,
      bank,
      reizen,
      filters,
      setFilters,
      refresh,
      saveSettings,
      saveRegistratie,
      removeRegistratie,
      saveBank,
      removeBank,
      saveReis,
      removeReis,
      resetDemoData,
    }),
    [
      ready,
      error,
      settings,
      registraties,
      bank,
      reizen,
      filters,
      refresh,
      saveSettings,
      saveRegistratie,
      removeRegistratie,
      saveBank,
      removeBank,
      saveReis,
      removeReis,
      resetDemoData,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): Ctx {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
