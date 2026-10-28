import {
  computeOverurenKlok,
  isTravelActivity,
  isWorkActivity,
  round2,
} from './compensation';
import type {
  OverurenWeek,
  OverurenWeekStatus,
  VerwerkingKeuze,
  WerkRegistratie,
} from './types';

/** ISO week start (Monday) as YYYY-MM-DD */
export function isoWeekStart(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function isoWeekEnd(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function isoWeekLabel(weekStart: string): string {
  const end = isoWeekEnd(weekStart);
  const d = new Date(`${weekStart}T12:00:00`);
  // ISO week number
  const tmp = new Date(d.getTime());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `Week ${weekNo} · ${weekStart} t/m ${end}`;
}

function overurenForRows(rows: WerkRegistratie[]): number {
  const byDay = new Map<string, WerkRegistratie[]>();
  for (const r of rows) {
    const list = byDay.get(r.Datum) ?? [];
    list.push(r);
    byDay.set(r.Datum, list);
  }
  let total = 0;
  for (const r of rows) {
    const day = byDay.get(r.Datum) ?? [];
    const earlier = day
      .filter((x) => x.Starttijd < r.Starttijd && isWorkActivity(x.Activiteit))
      .reduce((s, x) => s + x.Uren, 0);
    total += computeOverurenKlok({
      uren: r.Uren,
      activiteit: r.Activiteit,
      dagType: r.DagType,
      werkUrenEerderDieDag: earlier,
    });
  }
  return round2(total);
}

export type WeekSnapshot = {
  weekStart: string;
  weekEnd: string;
  medewerker: string;
  registratieIds: number[];
  overurenKlok: number;
  compensabeleUren: number;
  urenTotaal: number;
};

/** Build overtime-eligible week snapshots from registrations (per medewerker). */
export function buildWeekSnapshots(registraties: WerkRegistratie[]): WeekSnapshot[] {
  const groups = new Map<string, WerkRegistratie[]>();
  for (const r of registraties) {
    const key = `${isoWeekStart(r.Datum)}|${r.Medewerker}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const out: WeekSnapshot[] = [];
  for (const [, rows] of groups) {
    const weekStart = isoWeekStart(rows[0].Datum);
    const overurenKlok = overurenForRows(rows);
    if (overurenKlok <= 0) continue;
    out.push({
      weekStart,
      weekEnd: isoWeekEnd(weekStart),
      medewerker: rows[0].Medewerker,
      registratieIds: rows.map((r) => r.RegistratieID),
      overurenKlok,
      compensabeleUren: round2(rows.reduce((s, r) => s + r.CompensabeleUren, 0)),
      urenTotaal: round2(rows.reduce((s, r) => s + r.Uren, 0)),
    });
  }
  return out.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function weekKey(weekStart: string, medewerker: string): string {
  return `ow_${weekStart}_${medewerker.replace(/\s+/g, '_')}`;
}

export function mergeWeeksWithSubmissions(
  snapshots: WeekSnapshot[],
  submissions: OverurenWeek[],
): Array<WeekSnapshot & { submission: OverurenWeek | null }> {
  return snapshots.map((s) => {
    const submission =
      submissions.find(
        (w) => w.weekStart === s.weekStart && w.medewerker === s.medewerker,
      ) ?? null;
    return { ...s, submission };
  });
}

export function createSubmissionFromSnapshot(
  snap: WeekSnapshot,
  note = '',
): OverurenWeek {
  const now = new Date().toISOString();
  return {
    id: weekKey(snap.weekStart, snap.medewerker),
    weekStart: snap.weekStart,
    weekEnd: snap.weekEnd,
    medewerker: snap.medewerker,
    status: 'ingediend',
    overurenKlok: snap.overurenKlok,
    compensabeleUren: snap.compensabeleUren,
    registratieIds: snap.registratieIds,
    ingediendOp: now,
    beoordeeldOp: null,
    beoordeeldDoor: null,
    afwijzingsReden: null,
    verwerking: null,
    opmerking: note,
  };
}

export function approveWeek(
  week: OverurenWeek,
  managerNaam: string,
  verwerking: VerwerkingKeuze,
): OverurenWeek {
  return {
    ...week,
    status: 'goedgekeurd',
    verwerking,
    beoordeeldOp: new Date().toISOString(),
    beoordeeldDoor: managerNaam,
    afwijzingsReden: null,
  };
}

export function rejectWeek(
  week: OverurenWeek,
  managerNaam: string,
  reden: string,
): OverurenWeek {
  return {
    ...week,
    status: 'afgewezen',
    verwerking: null,
    beoordeeldOp: new Date().toISOString(),
    beoordeeldDoor: managerNaam,
    afwijzingsReden: reden,
  };
}

export function statusLabel(status: OverurenWeekStatus): string {
  switch (status) {
    case 'concept':
      return 'Concept';
    case 'ingediend':
      return 'Ingediend';
    case 'goedgekeurd':
      return 'Goedgekeurd';
    case 'afgewezen':
      return 'Afgewezen';
  }
}

export function countByStatus(weeks: OverurenWeek[]) {
  return {
    ingediend: weeks.filter((w) => w.status === 'ingediend').length,
    goedgekeurd: weeks.filter((w) => w.status === 'goedgekeurd').length,
    afgewezen: weeks.filter((w) => w.status === 'afgewezen').length,
  };
}

/** Keep type import used for travel filter side-effects free */
export function hasWorkOrTravel(rows: WerkRegistratie[]): boolean {
  return rows.some((r) => isWorkActivity(r.Activiteit) || isTravelActivity(r.Activiteit));
}
