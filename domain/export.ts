import type { OverurenWeek, WerkRegistratie } from './types';
import { isoWeekLabel } from './overtime-weeks';

/** Build CSV for a week (Excel-compatible). */
export function weekToCsv(
  week: Pick<OverurenWeek, 'weekStart' | 'weekEnd' | 'medewerker' | 'overurenKlok' | 'compensabeleUren'>,
  rows: WerkRegistratie[],
): string {
  const header = [
    'RegistratieID',
    'Datum',
    'Medewerker',
    'Klant',
    'Project',
    'Land',
    'Locatie',
    'Activiteit',
    'Starttijd',
    'Eindtijd',
    'PauzeMinuten',
    'Hotelnacht',
    'Uren',
    'CompensabeleUren',
    'Opmerking',
  ];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.RegistratieID,
        r.Datum,
        csv(r.Medewerker),
        csv(r.Klant),
        csv(r.Project),
        csv(r.Land),
        csv(r.Locatie),
        r.Activiteit,
        r.Starttijd,
        r.Eindtijd,
        r.PauzeMinuten,
        r.Hotelnacht ? 'Ja' : 'Nee',
        String(r.Uren).replace('.', ','),
        String(r.CompensabeleUren).replace('.', ','),
        csv(r.Opmerking),
      ].join(';'),
    );
  }
  lines.push('');
  lines.push(`Week;${isoWeekLabel(week.weekStart)}`);
  lines.push(`Medewerker;${csv(week.medewerker)}`);
  lines.push(`Overuren;${String(week.overurenKlok).replace('.', ',')}`);
  lines.push(`Compensabel;${String(week.compensabeleUren).replace('.', ',')}`);
  return '\uFEFF' + lines.join('\n');
}

function csv(s: string): string {
  const v = s.replace(/"/g, '""');
  return `"${v}"`;
}

export function downloadCsv(filename: string, content: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
