import { formatHours } from './compensation';
import { isoWeekLabel, isoWeekNumber, isoWeekYear, statusLabel } from './overtime-weeks';
import type { WeekSummary } from './week-summary';
import type { OverurenWeek, WerkRegistratie } from './types';

/** Build plain-text lines for the week PDF (Dutch). */
export function buildWeekPdfLines(
  week: OverurenWeek,
  rows: WerkRegistratie[],
  summary: WeekSummary,
  opts?: { generatedBy?: string },
): string[] {
  const n = isoWeekNumber(week.weekStart);
  const y = isoWeekYear(week.weekStart);
  const sorted = [...rows].sort((a, b) =>
    a.Datum === b.Datum
      ? a.Starttijd.localeCompare(b.Starttijd)
      : a.Datum.localeCompare(b.Datum),
  );
  const lines: string[] = [
    'Hotraco / Speria — Field Service Manager',
    'Overuren weekrapport',
    '',
    `Weeknummer: ${n} (${y})`,
    `Periode: ${isoWeekLabel(week.weekStart)}`,
    `Medewerker: ${week.medewerker}`,
    `Status: ${statusLabel(week.status)}`,
    `Keuze medewerker: ${verwerkingLabel(week.verwerking)}`,
    '',
    '— Samenvatting —',
    `Overuren (klok): ${formatHours(summary.overurenKlok)}`,
    `Compensabel: ${formatHours(week.compensabeleUren)}`,
    `Totaal uren: ${formatHours(summary.urenTotaal)}`,
    `Registraties: ${summary.registratieCount}`,
    `Hotel binnenland / buitenland: ${summary.hotelBinnenland} / ${summary.hotelBuitenland}`,
    `Buitenland-dagen: ${summary.buitenlandDagen}`,
    `Buitenlandtoelage: EUR ${Math.round(summary.buitenlandToelageEuro)}`,
    '',
  ];
  if (week.opmerking) {
    lines.push(`Toelichting medewerker: ${week.opmerking}`, '');
  }
  if (week.ingediendOp) {
    lines.push(`Ingediend op: ${fmtDt(week.ingediendOp)}`);
  }
  if (week.beoordeeldOp) {
    lines.push(
      `Beoordeeld op: ${fmtDt(week.beoordeeldOp)} door ${week.beoordeeldDoor ?? '—'}`,
    );
  }
  if (week.afwijzingsReden) {
    lines.push(`Afwijzingsreden: ${week.afwijzingsReden}`);
  }
  lines.push('', '— Urenregistraties —');
  for (const r of sorted) {
    lines.push(
      `${r.Datum} ${r.Starttijd}-${r.Eindtijd} ${r.Activiteit} ${formatHours(r.Uren)} | ${r.Klant} | ${r.Land}${r.Hotelnacht ? ' | hotel' : ''}`,
    );
  }
  const signed =
    week.status === 'goedgekeurd'
      ? {
          naam: week.beoordeeldDoor ?? '………………',
          datum: week.beoordeeldOp ? fmtDt(week.beoordeeldOp) : '………………',
        }
      : { naam: '………………', datum: '………………' };
  lines.push(
    '',
    '— Handtekening / archief —',
    `Manager akkoord (naam): ${signed.naam}`,
    `Datum: ${signed.datum}`,
    'Handtekening: ………………',
    '',
    `Gegenereerd: ${new Date().toLocaleString('nl-NL')}${opts?.generatedBy ? ` door ${opts.generatedBy}` : ''}`,
    'L1-archief — geen cloud-sync; bewaar PDF/weekpakket in Teams/OneDrive indien nodig.',
  );
  return lines;
}

function verwerkingLabel(v: OverurenWeek['verwerking']): string {
  if (v === 'TVT') return 'TVT';
  if (v === 'Uitbetaling') return 'Uitbetalen';
  return '—';
}

function fmtDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('nl-NL');
  } catch {
    return iso;
  }
}

/** Minimal PDF 1.4 (WinAnsi text). Returns false if not in browser. */
export function downloadWeekPdf(
  week: OverurenWeek,
  rows: WerkRegistratie[],
  summary: WeekSummary,
  opts?: { generatedBy?: string },
): boolean {
  if (typeof document === 'undefined') return false;
  const lines = buildWeekPdfLines(week, rows, summary, opts);
  const pdf = linesToPdf(lines);
  const n = isoWeekNumber(week.weekStart);
  const y = isoWeekYear(week.weekStart);
  const who = week.medewerker.replace(/\s+/g, '_');
  const copy = new Uint8Array(pdf.byteLength);
  copy.set(pdf);
  const blob = new Blob([copy.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overuren-W${n}-${y}-${who}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function pdfEscape(s: string): string {
  // Map common Dutch chars to WinAnsi where possible; strip others
  const map: Record<string, string> = {
    'á': '\xe1',
    'à': '\xe0',
    'ä': '\xe4',
    'â': '\xe2',
    'é': '\xe9',
    'è': '\xe8',
    'ë': '\xeb',
    'ê': '\xea',
    'í': '\xed',
    'ï': '\xef',
    'ó': '\xf3',
    'ö': '\xf6',
    'ú': '\xfa',
    'ü': '\xfc',
    'ñ': '\xf1',
    'ç': '\xe7',
    'Á': '\xc1',
    'É': '\xc9',
    'Ë': '\xcb',
    'Ö': '\xd6',
    'Ü': '\xdc',
    '—': '-',
    '–': '-',
    '€': 'EUR ',
  };
  let out = '';
  for (const ch of s) {
    if (map[ch]) out += map[ch];
    else if (ch.charCodeAt(0) < 128) out += ch;
    else out += '?';
  }
  return out.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function linesToPdf(lines: string[]): Uint8Array {
  const fontSize = 10;
  const leading = 13;
  const marginLeft = 50;
  const pageHeight = 842; // A4
  const marginTop = 50;
  const maxY = pageHeight - 40;
  const pages: string[][] = [];
  let current: string[] = [];
  let y = pageHeight - marginTop;
  for (const line of lines) {
    if (y < 60) {
      pages.push(current);
      current = [];
      y = pageHeight - marginTop;
    }
    current.push(
      `BT /F1 ${fontSize} Tf ${marginLeft} ${y} Td (${pdfEscape(line)}) Tj ET`,
    );
    y -= leading;
  }
  if (current.length) pages.push(current);
  if (!pages.length) pages.push(['BT /F1 10 Tf 50 800 Td (Leeg rapport) Tj ET']);

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;
  const push = (s: string | Uint8Array) => {
    const bytes = typeof s === 'string' ? encoder.encode(s) : s;
    parts.push(bytes);
    offset += bytes.length;
  };

  push('%PDF-1.4\n');
  // 1: catalog
  offsets.push(offset);
  push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  // 2: pages (placeholder filled later — write kids after knowing page objs)
  const pageObjStart = 3;
  const fontObj = pageObjStart + pages.length * 2;
  const kids = pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(' ');
  offsets.push(offset);
  push(
    `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`,
  );

  for (let i = 0; i < pages.length; i++) {
    const pageObj = pageObjStart + i * 2;
    const contentObj = pageObj + 1;
    const content = pages[i].join('\n') + '\n';
    const contentBytes = encoder.encode(content);
    offsets.push(offset);
    push(
      `${pageObj} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>endobj\n`,
    );
    offsets.push(offset);
    push(
      `${contentObj} 0 obj<< /Length ${contentBytes.length} >>stream\n`,
    );
    push(contentBytes);
    push('\nendstream\nendobj\n');
  }

  offsets.push(offset);
  push(
    `${fontObj} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>endobj\n`,
  );

  const xrefStart = offset;
  const objCount = fontObj + 1;
  push(`xref\n0 ${objCount}\n`);
  push('0000000000 65535 f \n');
  for (let i = 1; i < objCount; i++) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
