/** Travel planner helpers — timezone-aware duration. */

export function computeReistijdMinuten(
  vertrekIso: string,
  aankomstIso: string,
): number {
  const a = Date.parse(vertrekIso);
  const b = Date.parse(aankomstIso);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 60000);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} u`;
  return `${h} u ${m} min`;
}

export const COMMON_TRAVEL_ZONES = [
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Warsaw',
  'Asia/Dubai',
  'Asia/Singapore',
  'America/Chicago',
  'America/New_York',
  'UTC',
];
