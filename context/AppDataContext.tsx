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
  type DashboardFilters,
  type OverurenWeek,
  type ReisPlan,
  type WerkRegistratie,
} from '@/domain';
import { useAuth } from '@/context/AuthContext';
import { getStore, type FieldServiceStore } from '@/storage';

type Ctx = {
  ready: boolean;
  error: string | null;
  settings: AppSettings;
  registraties: WerkRegistratie[];
  overurenWeken: OverurenWeek[];
  reizen: ReisPlan[];
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
  refresh: () => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveRegistratie: (
    input: Omit<
      WerkRegistratie,
      'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType' | 'RegistratieID'
    > & { RegistratieID?: number },
  ) => Promise<WerkRegistratie>;
  removeRegistratie: (id: number) => Promise<void>;
  saveOverurenWeek: (row: OverurenWeek) => Promise<void>;
  removeOverurenWeek: (id: string) => Promise<void>;
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
  const { session } = useAuth();
  const [store, setStore] = useState<FieldServiceStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [registraties, setRegistraties] = useState<WerkRegistratie[]>([]);
  const [overurenWeken, setOverurenWeken] = useState<OverurenWeek[]>([]);
  const [reizen, setReizen] = useState<ReisPlan[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const hydrate = useCallback(async (s: FieldServiceStore) => {
    const [st, regs, ow, rz] = await Promise.all([
      s.getSettings(),
      s.listRegistraties(),
      s.listOverurenWeken(),
      s.listReizen(),
    ]);
    setSettings({
      ...DEFAULT_SETTINGS,
      ...st,
      thema: st.thema === 'dark' ? 'dark' : 'light',
    });
    setRegistraties(regs);
    setOverurenWeken(ow);
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

  /** Login session drives rol + display names used across screens. */
  useEffect(() => {
    if (!session || !store || !ready) return;
    const next: AppSettings = {
      ...settings,
      rol: session.rol,
      medewerkerNaam:
        session.rol === 'medewerker' ? session.naam : settings.medewerkerNaam,
      managerNaam: session.rol === 'manager' ? session.naam : settings.managerNaam,
    };
    if (
      next.rol === settings.rol &&
      next.medewerkerNaam === settings.medewerkerNaam &&
      next.managerNaam === settings.managerNaam
    ) {
      return;
    }
    void store.saveSettings(next).then(() => setSettings(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on session change
  }, [session?.userId, session?.rol, store, ready]);

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
      input: Omit<
        WerkRegistratie,
        'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType' | 'RegistratieID'
      > & { RegistratieID?: number },
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

  const saveOverurenWeek = useCallback(
    async (row: OverurenWeek) => {
      if (!store) throw new Error('Store not ready');
      await store.upsertOverurenWeek(row);
      setOverurenWeken(await store.listOverurenWeken());
    },
    [store],
  );

  const removeOverurenWeek = useCallback(
    async (id: string) => {
      if (!store) throw new Error('Store not ready');
      await store.deleteOverurenWeek(id);
      setOverurenWeken(await store.listOverurenWeken());
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
      localStorage.removeItem('hotraco-speria-fsm:v2');
      localStorage.removeItem('hotraco-speria-fsm:v1');
    }
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
      overurenWeken,
      reizen,
      filters,
      setFilters,
      refresh,
      saveSettings,
      saveRegistratie,
      removeRegistratie,
      saveOverurenWeek,
      removeOverurenWeek,
      saveReis,
      removeReis,
      resetDemoData,
    }),
    [
      ready,
      error,
      settings,
      registraties,
      overurenWeken,
      reizen,
      filters,
      refresh,
      saveSettings,
      saveRegistratie,
      removeRegistratie,
      saveOverurenWeek,
      removeOverurenWeek,
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
