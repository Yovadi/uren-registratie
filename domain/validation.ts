import { timeToMinutes } from './compensation';
import { isBuitenland } from './allowances';
import type { Activiteit, WerkRegistratie } from './types';

export type ValidationIssue = {
  level: 'error' | 'warning';
  message: string;
};

export function validateRegistratieInput(
  input: {
    Datum: string;
    Starttijd: string;
    Eindtijd: string;
    PauzeMinuten: number;
    Activiteit: Activiteit;
    Klant: string;
    Land: string;
    Hotelnacht: boolean;
  },
  existing: WerkRegistratie[],
  thuisLand: string,
  excludeId?: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.Klant.trim()) {
    issues.push({ level: 'error', message: 'Klant is verplicht.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.Datum)) {
    issues.push({ level: 'error', message: 'Datum moet YYYY-MM-DD zijn.' });
  }
  if (!/^\d{2}:\d{2}$/.test(input.Starttijd) || !/^\d{2}:\d{2}$/.test(input.Eindtijd)) {
    issues.push({ level: 'error', message: 'Start/eindtijd moeten HH:mm zijn.' });
  }

  let start = timeToMinutes(input.Starttijd);
  let end = timeToMinutes(input.Eindtijd);
  if (end < start) end += 24 * 60;
  const net = end - start - Math.max(0, input.PauzeMinuten);
  if (net <= 0) {
    issues.push({ level: 'error', message: 'Netto-uren moeten groter dan 0 zijn.' });
  }
  if (end - start >= 6 * 60 && input.PauzeMinuten < 30 && input.Activiteit !== 'Reizen') {
    issues.push({
      level: 'warning',
      message: 'Dienst ≥ 6 uur: controleer of 30+ min pauze klopt.',
    });
  }

  const sameDay = existing.filter(
    (r) => r.Datum === input.Datum && r.RegistratieID !== excludeId,
  );
  for (const r of sameDay) {
    let rs = timeToMinutes(r.Starttijd);
    let re = timeToMinutes(r.Eindtijd);
    if (re < rs) re += 24 * 60;
    const overlap = start < re && end > rs;
    if (overlap) {
      issues.push({
        level: 'error',
        message: `Overlapt met #${r.RegistratieID} (${r.Starttijd}–${r.Eindtijd}, ${r.Activiteit}).`,
      });
    }
  }

  if (input.Hotelnacht) {
    const hotelSameDay = sameDay.some((r) => r.Hotelnacht);
    if (hotelSameDay) {
      issues.push({
        level: 'error',
        message: 'Maximaal 1 hotelnacht per kalenderdag.',
      });
    }
  }

  if (input.Activiteit === 'Reizen' && !input.Land.trim()) {
    issues.push({ level: 'warning', message: 'Reis zonder land — vul land/route in.' });
  }

  if (input.Hotelnacht && !isBuitenland(input.Land, thuisLand)) {
    issues.push({
      level: 'warning',
      message: 'Hotelnacht in thuisland (binnenland).',
    });
  }

  return issues;
}

/** Preview text: does this day add buitenlandtoelage? */
export function toelagePreview(
  land: string,
  thuisLand: string,
  tariefPerDag: number,
  existingSameDay: WerkRegistratie[],
): string | null {
  if (!land.trim() || !isBuitenland(land, thuisLand)) {
    return null;
  }
  const alreadyCounted = existingSameDay.some((r) =>
    isBuitenland(r.Land, thuisLand),
  );
  if (alreadyCounted) {
    return `Buitenland-dag al geteld — toelage €${tariefPerDag} blijft gelijk.`;
  }
  return `Telt mee als buitenland-dag → toelage +€${tariefPerDag}.`;
}
