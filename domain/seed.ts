import { enrichRegistratie, recomputeDayCompensation } from './compensation';
import type { CompensatieBankRegel, WerkRegistratie } from './types';

const KLANTEN = [
  'FarmPlus NL',
  'AgriTech DE',
  'PoultryCare PL',
  'ClimateSys UK',
  'BarnSense US',
  'AquaFeed DK',
  'Speria Demo',
];
const LANDEN = ['Nederland', 'Duitsland', 'Polen', 'Verenigd Koninkrijk', 'Verenigde Staten', 'Denemarken', 'VAE'];
const PROJECTEN = ['Commissioning L12', 'Service contract', 'Storing compressor', 'Upgrade climate', 'Training operators'];
const MEDEWERKERS = ['Jan de Vries', 'Sara Bakker', 'Tom Jansen'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Deterministic demo dataset spanning ~5 years for dashboards / charts.
 * Safe to regenerate; IDs start at 1.
 */
export function buildSeedRegistraties(now = new Date()): WerkRegistratie[] {
  const rows: Omit<WerkRegistratie, 'Uren' | 'CompensabeleUren' | 'Weekdagnummer' | 'DagType'>[] =
    [];
  let id = 1;
  const endY = now.getFullYear();
  const startY = endY - 4;

  for (let y = startY; y <= endY; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === endY && m > now.getMonth() + 1) break;
      // ~6–10 registrations per month
      const count = 6 + ((y + m) % 5);
      for (let i = 0; i < count; i++) {
        const day = 1 + ((i * 3 + m) % 26);
        const datum = dateStr(y, m, day);
        const d = new Date(`${datum}T12:00:00`);
        const dow = d.getDay();
        const medewerker = MEDEWERKERS[(id + i) % MEDEWERKERS.length];
        const klant = KLANTEN[(id + m) % KLANTEN.length];
        const land = LANDEN[(id + m) % LANDEN.length];
        const project = PROJECTEN[(id + i) % PROJECTEN.length];

        // Weekday work block
        if (dow !== 0 && dow !== 6) {
          rows.push({
            RegistratieID: id++,
            Datum: datum,
            Medewerker: medewerker,
            Klant: klant,
            Project: project,
            Land: land,
            Locatie: `${land} site`,
            Activiteit: i % 4 === 0 ? 'Service' : i % 5 === 0 ? 'Commissioning' : 'Werken',
            Starttijd: '08:00',
            Eindtijd: i % 3 === 0 ? '18:30' : '17:00',
            PauzeMinuten: 30,
            Hotelnacht: land !== 'Nederland' && i % 2 === 0,
            Opmerking: '',
          });
          if (i % 2 === 0) {
            rows.push({
              RegistratieID: id++,
              Datum: datum,
              Medewerker: medewerker,
              Klant: klant,
              Project: project,
              Land: land,
              Locatie: 'Airport / onderweg',
              Activiteit: 'Reizen',
              Starttijd: '06:00',
              Eindtijd: '07:45',
              PauzeMinuten: 0,
              Hotelnacht: false,
              Opmerking: 'Heenreis',
            });
          }
        } else if (dow === 6 && i % 2 === 0) {
          rows.push({
            RegistratieID: id++,
            Datum: datum,
            Medewerker: medewerker,
            Klant: klant,
            Project: project,
            Land: land,
            Locatie: `${land} site`,
            Activiteit: 'Storing',
            Starttijd: '09:00',
            Eindtijd: '15:00',
            PauzeMinuten: 30,
            Hotelnacht: true,
            Opmerking: 'Weekend storing',
          });
        } else if (dow === 0 && i % 3 === 0) {
          rows.push({
            RegistratieID: id++,
            Datum: datum,
            Medewerker: medewerker,
            Klant: klant,
            Project: project,
            Land: land,
            Locatie: 'Onderweg',
            Activiteit: 'Reizen',
            Starttijd: '14:00',
            Eindtijd: '20:00',
            PauzeMinuten: 0,
            Hotelnacht: false,
            Opmerking: 'Zondag reis',
          });
        }
      }
    }
  }

  const enriched = rows.map((r) => enrichRegistratie(r));
  return recomputeDayCompensation(enriched);
}

export function buildSeedBank(): CompensatieBankRegel[] {
  const y = new Date().getFullYear();
  return [
    {
      id: 'bank_1',
      Datum: `${y - 1}-12-15`,
      Omschrijving: 'Opname TVT feestdagen',
      PlusUren: 0,
      MinUren: 16,
    },
    {
      id: 'bank_2',
      Datum: `${y}-01-10`,
      Omschrijving: 'Correctie stand-by weekend',
      PlusUren: 4,
      MinUren: 0,
    },
    {
      id: 'bank_3',
      Datum: `${y}-03-01`,
      Omschrijving: 'Opname TVT privé',
      PlusUren: 0,
      MinUren: 8,
    },
  ];
}
