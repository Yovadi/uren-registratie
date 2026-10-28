import React, { createContext, useContext, useMemo } from 'react';

import { useAppData } from '@/context/AppDataContext';
import type { AppThema } from '@/domain';

const ThemeContext = createContext<AppThema>('light');

function resolveThema(value: unknown): AppThema {
  return value === 'dark' ? 'dark' : 'light';
}

/** Bridges AppSettings.thema into useColorScheme / Themed components. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useAppData();
  const scheme = useMemo<AppThema>(() => {
    if (!ready) return 'light';
    return resolveThema(settings?.thema);
  }, [ready, settings?.thema]);

  return <ThemeContext.Provider value={scheme}>{children}</ThemeContext.Provider>;
}

export function useAppColorScheme(): AppThema {
  return resolveThema(useContext(ThemeContext));
}
