import { useAppColorScheme } from '@/context/ThemeContext';

/** Web: same preference as native (not forced to light). */
export function useColorScheme(): 'light' | 'dark' {
  return useAppColorScheme();
}
