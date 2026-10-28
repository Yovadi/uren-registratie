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
  const day = d.getDay();
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

function pushAudit(
  week: OverurenWeek,
  door: string,
  actie: string,
  detail?: string,
): OverurenWeek {
  const audit = [...(week.audit ?? []), { at: new Date().toISOString(), door, actie, detail }];
  return { ...week, audit };
}

export function createSubmissionFromSnapshot(
  snap: WeekSnapshot,
  note = '',
  door = snap.medewerker,
): OverurenWeek {
  const now = new Date().toISOString();
  const base: OverurenWeek = {
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
    verwerkingToelichting: null,
    opmerking: note,
    managerOpmerking: null,
    audit: [],
  };
  return pushAudit(base, door, 'Ingediend', note || undefined);
}

export function approveWeek(
  week: OverurenWeek,
  managerNaam: string,
  verwerking: VerwerkingKeuze,
  toelichting: string | null = null,
): OverurenWeek {
  return pushAudit(
    {
      ...week,
      status: 'goedgekeurd',
      verwerking,
      verwerkingToelichting: toelichting,
      beoordeeldOp: new Date().toISOString(),
      beoordeeldDoor: managerNaam,
      afwijzingsReden: null,
      managerOpmerking: week.managerOpmerking,
    },
    managerNaam,
    `Goedgekeurd (${verwerking})`,
    toelichting ?? undefined,
  );
}

export function rejectWeek(
  week: OverurenWeek,
  managerNaam: string,
  reden: string,
): OverurenWeek {
  return pushAudit(
    {
      ...week,
      status: 'afgewezen',
      verwerking: null,
      verwerkingToelichting: null,
      beoordeeldOp: new Date().toISOString(),
      beoordeeldDoor: managerNaam,
      afwijzingsReden: reden,
    },
    managerNaam,
    'Afgewezen',
    reden,
  );
}

/** Manager asks engineer to clarify / correct — week returns to engineer. */
export function requestWeekInfo(
  week: OverurenWeek,
  managerNaam: string,
  vraag: string,
): OverurenWeek {
  return pushAudit(
    {
      ...week,
      status: 'info_gevraagd',
      beoordeeldOp: new Date().toISOString(),
      beoordeeldDoor: managerNaam,
      managerOpmerking: vraag,
      afwijzingsReden: null,
      verwerking: null,
      verwerkingToelichting: null,
    },
    managerNaam,
    'Info gevraagd',
    vraag,
  );
}

/** Weeks with overtime not yet submitted for completed past weeks (reminder). */
export function unsubmittedPastWeeks(
  snapshots: WeekSnapshot[],
  submissions: OverurenWeek[],
  today = new Date(),
): WeekSnapshot[] {
  const todayStr = today.toISOString().slice(0, 10);
  return snapshots.filter((s) => {
    if (s.weekEnd >= todayStr) return false; // current/future week
    const sub = submissions.find(
      (w) => w.weekStart === s.weekStart && w.medewerker === s.medewerker,
    );
    return !sub || sub.status === 'concept';
  });
}

export function statusLabel(status: OverurenWeekStatus): string {
  switch (status) {
    case 'concept':
      return 'Nog niet ingediend';
    case 'ingediend':
      return 'Wacht op manager';
    case 'info_gevraagd':
      return 'Info gevraagd';
    case 'goedgekeurd':
      return 'Goedgekeurd';
    case 'afgewezen':
      return 'Afgewezen';
  }
}

export function countByStatus(weeks: OverurenWeek[]) {
  return {
    ingediend: weeks.filter((w) => w.status === 'ingediend').length,
    info_gevraagd: weeks.filter((w) => w.status === 'info_gevraagd').length,
    goedgekeurd: weeks.filter((w) => w.status === 'goedgekeurd').length,
    afgewezen: weeks.filter((w) => w.status === 'afgewezen').length,
  };
}

export function hasWorkOrTravel(rows: WerkRegistratie[]): boolean {
  return rows.some((r) => isWorkActivity(r.Activiteit) || isTravelActivity(r.Activiteit));
}

/** Procedure steps for UI */
export const INDIEN_PROCEDURE = [
  'Je registreert uren in de app (zoals voorheen in Excel).',
  'Alleen weken mét overuren verschijnen hier.',
  'Met “Week indienen” stuur je die week naar je manager.',
  'De manager controleert en kiest: TVT, uitbetaling, info vragen of afwijzen.',
  'TVT-saldo / loonstrook worden in andere systemen verwerkt — niet in deze app.',
] as const;
