import { useAppColorScheme } from '@/context/ThemeContext';

/** Resolves to the user-selected app theme (light/dark). */
export function useColorScheme(): 'light' | 'dark' {
  return useAppColorScheme();
}
