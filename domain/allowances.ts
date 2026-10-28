import { round2 } from './compensation';
import type { WerkRegistratie } from './types';

export type NamedValue = { name: string; value: number };

export function isBuitenland(land: string, thuisLand: string): boolean {
  return land.trim().toLowerCase() !== thuisLand.trim().toLowerCase();
}

/** Unique calendar days with at least one registration abroad. */
export function buitenlandDagen(rows: WerkRegistratie[], thuisLand: string): number {
  const days = new Set<string>();
  for (const r of rows) {
    if (isBuitenland(r.Land, thuisLand)) days.add(r.Datum);
  }
  return days.size;
}

/** Buitenlandtoelage = buitenland-dagen × tarief per dag. */
export function buitenlandToelageEuro(
  rows: WerkRegistratie[],
  thuisLand: string,
  tariefPerDag: number,
): number {
  return round2(buitenlandDagen(rows, thuisLand) * tariefPerDag);
}

export function hotelBinnenVsBuiten(
  rows: WerkRegistratie[],
  thuisLand: string,
): NamedValue[] {
  let binnen = 0;
  let buiten = 0;
  for (const r of rows) {
    if (!r.Hotelnacht) continue;
    if (isBuitenland(r.Land, thuisLand)) buiten += 1;
    else binnen += 1;
  }
  return [
    { name: 'Hotel binnenland', value: binnen },
    { name: 'Hotel buitenland', value: buiten },
  ];
}

export function buitenlandToelagePerMaand(
  rows: WerkRegistratie[],
  jaar: number,
  thuisLand: string,
  tariefPerDag: number,
): NamedValue[] {
  const months = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(2000, i, 1).toLocaleString('nl-NL', { month: 'short' }),
    days: new Set<string>(),
  }));
  for (const r of rows) {
    if (Number(r.Datum.slice(0, 4)) !== jaar) continue;
    if (!isBuitenland(r.Land, thuisLand)) continue;
    const m = Number(r.Datum.slice(5, 7)) - 1;
    months[m].days.add(r.Datum);
  }
  return months.map((x) => ({
    name: x.name,
    value: round2(x.days.size * tariefPerDag),
  }));
}

export function hotelPerLand(
  rows: WerkRegistratie[],
  thuisLand: string,
): Array<{ land: string; binnenland: number; buitenland: number; toelageDagen: number }> {
  const hotel = new Map<string, { binnenland: number; buitenland: number }>();
  const dagen = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.Land) continue;
    if (isBuitenland(r.Land, thuisLand)) {
      const set = dagen.get(r.Land) ?? new Set();
      set.add(r.Datum);
      dagen.set(r.Land, set);
    }
    if (r.Hotelnacht) {
      const cur = hotel.get(r.Land) ?? { binnenland: 0, buitenland: 0 };
      if (isBuitenland(r.Land, thuisLand)) cur.buitenland += 1;
      else cur.binnenland += 1;
      hotel.set(r.Land, cur);
    }
  }
  const lands = new Set([...hotel.keys(), ...dagen.keys()]);
  return [...lands]
    .map((land) => ({
      land,
      binnenland: hotel.get(land)?.binnenland ?? 0,
      buitenland: hotel.get(land)?.buitenland ?? 0,
      toelageDagen: dagen.get(land)?.size ?? 0,
    }))
    .sort((a, b) => b.toelageDagen + b.buitenland - (a.toelageDagen + a.buitenland));
}
