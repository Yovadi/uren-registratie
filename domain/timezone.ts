import type { TimeZoneId } from './types';

/** Common zones for a traveling service engineer (extend as needed). */
export const COMMON_TIME_ZONES: { id: TimeZoneId; label: string }[] = [
  { id: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { id: 'Europe/London', label: 'London (GMT/BST)' },
  { id: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { id: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { id: 'America/New_York', label: 'New York (ET)' },
  { id: 'America/Chicago', label: 'Chicago (CT)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { id: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { id: 'Australia/Sydney', label: 'Sydney (AET)' },
  { id: 'Pacific/Auckland', label: 'Auckland (NZT)' },
  { id: 'UTC', label: 'UTC' },
];

/** Best-effort device timezone (falls back to Amsterdam). */
export function detectDeviceTimeZone(): TimeZoneId {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string') return tz;
  } catch {
    /* ignore */
  }
  return 'Europe/Amsterdam';
}

export function formatInTimeZone(
  isoInstant: string,
  timeZone: TimeZoneId,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  },
): string {
  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function labelForTimeZone(id: TimeZoneId): string {
  return COMMON_TIME_ZONES.find((z) => z.id === id)?.label ?? id;
}
