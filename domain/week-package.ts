import { summarizeWeekRows, type WeekSummary } from './week-summary';
import { isoWeekNumber, isoWeekYear, statusLabel } from './overtime-weeks';
import type { AppSettings, OverurenWeek, WerkRegistratie } from './types';

export const WEEK_PACKAGE_FORMAT = 'hotraco-speria-week-package' as const;
export const WEEK_PACKAGE_VERSION = 1 as const;

/** Portable single-week file for L1 multi-PC (mail / OneDrive / USB). */
export type WeekPackage = {
  format: typeof WEEK_PACKAGE_FORMAT;
  version: typeof WEEK_PACKAGE_VERSION;
  exportedAt: string;
  week: OverurenWeek;
  registraties: WerkRegistratie[];
  summary: WeekSummary;
  thuisLand: string;
  buitenlandToelagePerDag: number;
};

export function buildWeekPackage(
  week: OverurenWeek,
  allRegs: WerkRegistratie[],
  settings: Pick<AppSettings, 'defaultLand' | 'buitenlandToelagePerDag'>,
): WeekPackage {
  const registraties = week.registratieIds
    .map((id) => allRegs.find((r) => r.RegistratieID === id))
    .filter(Boolean) as WerkRegistratie[];
  const summary = summarizeWeekRows(
    registraties,
    week.overurenKlok,
    settings.defaultLand,
    settings.buitenlandToelagePerDag,
  );
  return {
    format: WEEK_PACKAGE_FORMAT,
    version: WEEK_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    week: { ...week, audit: [...(week.audit ?? [])] },
    registraties,
    summary,
    thuisLand: settings.defaultLand,
    buitenlandToelagePerDag: settings.buitenlandToelagePerDag,
  };
}

export function parseWeekPackage(raw: string): WeekPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Bestand is geen geldige JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Ongeldig weekpakket.');
  const obj = parsed as Record<string, unknown>;
  if (obj.format !== WEEK_PACKAGE_FORMAT && !obj.week) {
    throw new Error('Dit is geen Hotraco weekpakket-bestand.');
  }
  const week = obj.week as OverurenWeek | undefined;
  const registraties = obj.registraties as WerkRegistratie[] | undefined;
  if (!week || !week.weekStart || !week.medewerker) {
    throw new Error('Weekpakket mist weekgegevens.');
  }
  if (!Array.isArray(registraties)) {
    throw new Error('Weekpakket mist registraties.');
  }
  const thuisLand = String(obj.thuisLand ?? 'Nederland');
  const tarief = Number(obj.buitenlandToelagePerDag ?? 55);
  const summary =
    (obj.summary as WeekSummary | undefined) ??
    summarizeWeekRows(registraties, week.overurenKlok, thuisLand, tarief);
  return {
    format: WEEK_PACKAGE_FORMAT,
    version: WEEK_PACKAGE_VERSION,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    week: {
      ...week,
      audit: Array.isArray(week.audit) ? week.audit : [],
    },
    registraties,
    summary,
    thuisLand,
    buitenlandToelagePerDag: Number.isFinite(tarief) ? tarief : 55,
  };
}

export function weekPackageFilename(week: OverurenWeek): string {
  const n = isoWeekNumber(week.weekStart);
  const y = isoWeekYear(week.weekStart);
  const who = week.medewerker.replace(/\s+/g, '_');
  return `weekpakket-W${n}-${y}-${who}.json`;
}

export function downloadWeekPackage(pkg: WeekPackage): boolean {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = weekPackageFilename(pkg.week);
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function pickWeekPackageFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Bestand kiezen werkt in de browser.'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('Geen bestand gekozen.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Bestand lezen mislukt.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * Remap package registration IDs so they don't collide with existing store IDs.
 * Keeps week.registratieIds in sync.
 */
export function remapPackageForImport(
  pkg: WeekPackage,
  nextIdStart: number,
): { week: OverurenWeek; registraties: WerkRegistratie[] } {
  let next = nextIdStart;
  const idMap = new Map<number, number>();
  const registraties = pkg.registraties.map((r) => {
    const newId = next++;
    idMap.set(r.RegistratieID, newId);
    return { ...r, RegistratieID: newId };
  });
  const week: OverurenWeek = {
    ...pkg.week,
    registratieIds: pkg.week.registratieIds.map(
      (id) => idMap.get(id) ?? id,
    ),
    audit: [
      ...(pkg.week.audit ?? []),
      {
        at: new Date().toISOString(),
        door: 'Systeem',
        actie: 'Geïmporteerd (weekpakket)',
        detail: `Bron-export ${pkg.exportedAt}`,
      },
    ],
  };
  return { week, registraties };
}

export function weekPackageLabel(week: OverurenWeek): string {
  return `Week ${isoWeekNumber(week.weekStart)} · ${week.medewerker} · ${statusLabel(week.status)}`;
}
