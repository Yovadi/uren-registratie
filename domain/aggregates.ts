import { buitenlandToelageEuro, isBuitenland } from './allowances';
import {
  computeOverurenKlok,
  isTravelActivity,
  isWorkActivity,
  round2,
} from './compensation';
import type {
  AppSettings,
  CompensatieBankRegel,
  DashboardFilters,
  DashboardKpis,
  WerkRegistratie,
} from './types';

export function applyFilters(
  rows: WerkRegistratie[],
  f: DashboardFilters,
): WerkRegistratie[] {
  return rows.filter((r) => {
    const [y, m] = r.Datum.split('-').map(Number);
    if (f.jaar !== 'all' && y !== f.jaar) return false;
    if (f.maand !== 'all' && m !== f.maand) return false;
    if (f.klant !== 'all' && r.Klant !== f.klant) return false;
    if (f.land !== 'all' && r.Land !== f.land) return false;
    if (f.medewerker !== 'all' && r.Medewerker !== f.medewerker) return false;
    return true;
  });
}

function ymNow() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function overurenForRow(r: WerkRegistratie, allSameDay: WerkRegistratie[]): number {
  const earlier = allSameDay
    .filter((x) => x.Starttijd < r.Starttijd && isWorkActivity(x.Activiteit))
    .reduce((s, x) => s + x.Uren, 0);
  return computeOverurenKlok({
    uren: r.Uren,
    activiteit: r.Activiteit,
    dagType: r.DagType,
    werkUrenEerderDieDag: earlier,
  });
}

export function computeTvtSaldo(
  registraties: WerkRegistratie[],
  bank: CompensatieBankRegel[],
): number {
  const earned = registraties.reduce((s, r) => s + r.CompensabeleUren, 0);
  // Norm credit is already inside CompensabeleUren; TVT bank tracks withdraw/deposit.
  // Spec: saldo = plus - min on bank, plus automatic compensabele from work.
  // Practical: TVT saldo = sum(CompensabeleUren) - sum(norm work hours) + bank net
  // Better interpretation: CompensabeleUren is the TVT credit; bank adjusts saldo.
  const bankNet = bank.reduce((s, b) => s + b.PlusUren - b.MinUren, 0);
  // Net TVT = overtime-weighted surplus vs 1:1 hours on work/travel + bank
  const clock = registraties
    .filter((r) => isWorkActivity(r.Activiteit) || isTravelActivity(r.Activiteit))
    .reduce((s, r) => s + r.Uren, 0);
  const surplus = earned - clock; // pure premium part + bank
  return round2(surplus + bankNet);
}

export function computeKpis(
  all: WerkRegistratie[],
  bank: CompensatieBankRegel[],
  filters: DashboardFilters,
  settings: AppSettings,
): DashboardKpis {
  const filtered = applyFilters(all, filters);
  const thuis = settings.defaultLand;
  const tarief = settings.buitenlandToelagePerDag;
  const { y: cy, m: cm } = ymNow();
  const year = filters.jaar === 'all' ? cy : filters.jaar;
  const month = filters.maand === 'all' ? cm : filters.maand;

  const byDay = (rows: WerkRegistratie[]) => {
    const m = new Map<string, WerkRegistratie[]>();
    for (const r of rows) {
      const list = m.get(r.Datum) ?? [];
      list.push(r);
      m.set(r.Datum, list);
    }
    return m;
  };

  const sumOvertime = (rows: WerkRegistratie[]) => {
    const map = byDay(rows);
    let total = 0;
    for (const r of rows) {
      total += overurenForRow(r, map.get(r.Datum) ?? []);
    }
    return round2(total);
  };

  const thisMonth = filtered.filter((r) => {
    const [y, m] = r.Datum.split('-').map(Number);
    return y === year && m === month;
  });
  const thisYear = filtered.filter((r) => Number(r.Datum.slice(0, 4)) === year);

  return {
    overurenDezeMaand: sumOvertime(thisMonth),
    overurenDitJaar: sumOvertime(thisYear),
    tvtSaldo: computeTvtSaldo(filtered, bank),
    werkurenDezeMaand: round2(
      thisMonth.filter((r) => isWorkActivity(r.Activiteit)).reduce((s, r) => s + r.Uren, 0),
    ),
    reisurenDezeMaand: round2(
      thisMonth.filter((r) => isTravelActivity(r.Activiteit)).reduce((s, r) => s + r.Uren, 0),
    ),
    hotelBinnenlandDezeMaand: thisMonth.filter(
      (r) => r.Hotelnacht && !isBuitenland(r.Land, thuis),
    ).length,
    hotelBuitenlandDezeMaand: thisMonth.filter(
      (r) => r.Hotelnacht && isBuitenland(r.Land, thuis),
    ).length,
    buitenlandToelageDezeMaand: buitenlandToelageEuro(thisMonth, thuis, tarief),
    buitenlandToelageDitJaar: buitenlandToelageEuro(thisYear, thuis, tarief),
    aantalKlanten: new Set(filtered.map((r) => r.Klant).filter(Boolean)).size,
  };
}

export type { NamedValue } from './allowances';
import type { NamedValue } from './allowances';

export function overurenPerMaand(
  rows: WerkRegistratie[],
  jaar: number,
): NamedValue[] {
  const map = new Map<string, WerkRegistratie[]>();
  for (const r of rows) {
    if (Number(r.Datum.slice(0, 4)) !== jaar) continue;
    const list = map.get(r.Datum) ?? [];
    list.push(r);
    map.set(r.Datum, list);
  }
  const months = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(2000, i, 1).toLocaleString('nl-NL', { month: 'short' }),
    value: 0,
  }));
  for (const [datum, dayRows] of map) {
    const m = Number(datum.slice(5, 7)) - 1;
    for (const r of dayRows) {
      months[m].value += overurenForRow(r, dayRows);
    }
  }
  return months.map((x) => ({ ...x, value: round2(x.value) }));
}

export function werkVsReis(rows: WerkRegistratie[]): NamedValue[] {
  const werk = round2(rows.filter((r) => isWorkActivity(r.Activiteit)).reduce((s, r) => s + r.Uren, 0));
  const reis = round2(rows.filter((r) => isTravelActivity(r.Activiteit)).reduce((s, r) => s + r.Uren, 0));
  return [
    { name: 'Werk', value: werk },
    { name: 'Reis', value: reis },
  ];
}

export function topKlanten(rows: WerkRegistratie[], n = 10): NamedValue[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.Klant) continue;
    m.set(r.Klant, (m.get(r.Klant) ?? 0) + r.Uren);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function urenPerLand(rows: WerkRegistratie[]): NamedValue[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!r.Land) continue;
    m.set(r.Land, (m.get(r.Land) ?? 0) + r.Uren);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
}

export function urenPerActiviteit(rows: WerkRegistratie[]): NamedValue[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.Activiteit, (m.get(r.Activiteit) ?? 0) + r.Uren);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value: round2(value) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function bankWithRunningSaldo(
  bank: CompensatieBankRegel[],
  opening = 0,
): Array<CompensatieBankRegel & { Saldo: number }> {
  const sorted = [...bank].sort((a, b) => a.Datum.localeCompare(b.Datum));
  let saldo = opening;
  return sorted.map((row) => {
    saldo = round2(saldo + row.PlusUren - row.MinUren);
    return { ...row, Saldo: saldo };
  });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
}
