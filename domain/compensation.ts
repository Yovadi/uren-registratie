import type { Activiteit, DagType, WerkRegistratie } from './types';

/** Spec factors */
export const FACTOR_NORMAAL = 1.0;
export const FACTOR_OVERUREN_WEEK = 1.4654;
export const FACTOR_ZATERDAG = 1.4654;
export const FACTOR_ZONDAG = 1.8441;
export const NORM_UREN_PER_DAG = 8;

const WORK_LIKE: Activiteit[] = [
  'Werken',
  'Commissioning',
  'Service',
  'Storing',
  'Training',
];

export function isWorkActivity(a: Activiteit): boolean {
  return WORK_LIKE.includes(a);
}

export function isTravelActivity(a: Activiteit): boolean {
  return a === 'Reizen';
}

/** Parse HH:mm → minutes from midnight. Supports overnight (end < start → +24h). */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function computeUren(start: string, eind: string, pauzeMinuten: number): number {
  let startM = timeToMinutes(start);
  let eindM = timeToMinutes(eind);
  if (eindM < startM) eindM += 24 * 60;
  const raw = Math.max(0, eindM - startM - Math.max(0, pauzeMinuten));
  return round2(raw / 60);
}

/** ISO weekday 1=Mon … 7=Sun from YYYY-MM-DD */
export function weekdagnummer(datum: string): number {
  const d = new Date(`${datum}T12:00:00`);
  const js = d.getDay(); // 0=Sun
  return js === 0 ? 7 : js;
}

export function dagTypeFromWeekday(isoWeekday: number): DagType {
  if (isoWeekday === 6) return 'Zaterdag';
  if (isoWeekday === 7) return 'Zondag';
  return 'Weekdag';
}

/**
 * Compensabele uren per registratie (spec).
 * Weekday work: first 8h ×1.0, overtime ×1.4654; travel ×1.0
 * Sat: all work+travel ×1.4654; Sun: ×1.8441
 * Stand-by / Verlof / Ziek: no compensation credit (0) unless work/travel-like.
 */
export function computeCompensabeleUren(input: {
  uren: number;
  activiteit: Activiteit;
  dagType: DagType;
  /** Other work hours already logged same calendar day (for 8h split across rows) */
  werkUrenEerderDieDag?: number;
}): number {
  const { uren, activiteit, dagType } = input;
  if (uren <= 0) return 0;

  const work = isWorkActivity(activiteit);
  const travel = isTravelActivity(activiteit);
  if (!work && !travel) return 0;

  if (dagType === 'Zaterdag') return round2(uren * FACTOR_ZATERDAG);
  if (dagType === 'Zondag') return round2(uren * FACTOR_ZONDAG);

  // Weekday
  if (travel) return round2(uren * FACTOR_NORMAAL);

  const earlier = Math.max(0, input.werkUrenEerderDieDag ?? 0);
  const remainingNorm = Math.max(0, NORM_UREN_PER_DAG - earlier);
  const normalPart = Math.min(uren, remainingNorm);
  const overtimePart = Math.max(0, uren - normalPart);
  return round2(normalPart * FACTOR_NORMAAL + overtimePart * FACTOR_OVERUREN_WEEK);
}

/** Overtime hours (clock) on weekdays above 8 work hours that day; weekend work+travel count fully as overtime clock. */
export function computeOverurenKlok(input: {
  uren: number;
  activiteit: Activiteit;
  dagType: DagType;
  werkUrenEerderDieDag?: number;
}): number {
  const { uren, activiteit, dagType } = input;
  if (uren <= 0) return 0;
  const work = isWorkActivity(activiteit);
  const travel = isTravelActivity(activiteit);
  if (!work && !travel) return 0;

  if (dagType === 'Zaterdag' || dagType === 'Zondag') {
    return work || travel ? round2(uren) : 0;
  }
  if (!work) return 0;
  const earlier = Math.max(0, input.werkUrenEerderDieDag ?? 0);
  const remainingNorm = Math.max(0, NORM_UREN_PER_DAG - earlier);
  return round2(Math.max(0, uren - remainingNorm));
}

export function enrichRegistratie(
  base: Omit<
    WerkRegistratie,
    'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType'
  > & { Uren?: number; CompensabeleUren?: number },
  werkUrenEerderDieDag = 0,
): WerkRegistratie {
  const Weekdagnummer = weekdagnummer(base.Datum);
  const DagType = dagTypeFromWeekday(Weekdagnummer);
  const Uren = computeUren(base.Starttijd, base.Eindtijd, base.PauzeMinuten);
  const CompensabeleUren = computeCompensabeleUren({
    uren: Uren,
    activiteit: base.Activiteit,
    dagType: DagType,
    werkUrenEerderDieDag,
  });
  return { ...base, Uren, CompensabeleUren, Weekdagnummer, DagType };
}

/** Recompute compensabele uren for a day after sort by start time (8h split). */
export function recomputeDayCompensation(rows: WerkRegistratie[]): WerkRegistratie[] {
  const byDay = new Map<string, WerkRegistratie[]>();
  for (const r of rows) {
    const list = byDay.get(r.Datum) ?? [];
    list.push(r);
    byDay.set(r.Datum, list);
  }
  const out: WerkRegistratie[] = [];
  for (const [, list] of byDay) {
    list.sort((a, b) => a.Starttijd.localeCompare(b.Starttijd));
    let workEarlier = 0;
    for (const r of list) {
      const Uren = computeUren(r.Starttijd, r.Eindtijd, r.PauzeMinuten);
      const Weekdagnummer = weekdagnummer(r.Datum);
      const DagType = dagTypeFromWeekday(Weekdagnummer);
      const CompensabeleUren = computeCompensabeleUren({
        uren: Uren,
        activiteit: r.Activiteit,
        dagType: DagType,
        werkUrenEerderDieDag: workEarlier,
      });
      out.push({ ...r, Uren, CompensabeleUren, Weekdagnummer, DagType });
      if (isWorkActivity(r.Activiteit)) workEarlier += Uren;
    }
  }
  return out.sort((a, b) => {
    const d = b.Datum.localeCompare(a.Datum);
    if (d !== 0) return d;
    return b.Starttijd.localeCompare(a.Starttijd);
  });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatHours(n: number): string {
  return `${round2(n).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} u`;
}
