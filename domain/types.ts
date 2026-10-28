/** Hotraco / Speria Field Service Manager — domain types (no UI). */

export type RegistratieID = number;

export type Activiteit =
  | 'Werken'
  | 'Reizen'
  | 'Commissioning'
  | 'Service'
  | 'Storing'
  | 'Training'
  | 'Stand-by'
  | 'Verlof'
  | 'Ziek';

export const ACTIVITEITEN: Activiteit[] = [
  'Werken',
  'Reizen',
  'Commissioning',
  'Service',
  'Storing',
  'Training',
  'Stand-by',
  'Verlof',
  'Ziek',
];

export type DagType = 'Weekdag' | 'Zaterdag' | 'Zondag';

/** Primary entity: WerkRegistraties */
export type WerkRegistratie = {
  RegistratieID: RegistratieID;
  Datum: string; // YYYY-MM-DD
  Medewerker: string;
  Klant: string;
  Project: string;
  Land: string;
  Locatie: string;
  Activiteit: Activiteit;
  Starttijd: string; // HH:mm
  Eindtijd: string; // HH:mm
  PauzeMinuten: number;
  Hotelnacht: boolean;
  Opmerking: string;
  /** Auto: (einde - start) - pauze, in hours */
  Uren: number;
  /** Auto: weighted compensation hours (TVT credit) */
  CompensabeleUren: number;
  /** Auto helpers */
  Weekdagnummer: number; // 1=Mon … 7=Sun (ISO)
  DagType: DagType;
};

export type CompensatieBankRegel = {
  id: string;
  Datum: string;
  Omschrijving: string;
  PlusUren: number;
  MinUren: number;
};

export type ReisPlan = {
  id: string;
  VertrekLocatie: string;
  AankomstLocatie: string;
  TijdzoneVertrek: string;
  TijdzoneAankomst: string;
  Vertrektijd: string; // ISO instant
  Aankomsttijd: string; // ISO instant
  /** Auto minutes */
  ReistijdMinuten: number;
};

export type AppSettings = {
  medewerkerNaam: string;
  defaultLand: string;
  /** Normuren per dag (spec: 8) */
  normUrenPerDag: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  medewerkerNaam: 'Field Service Engineer',
  defaultLand: 'Nederland',
  normUrenPerDag: 8,
};

export type DashboardFilters = {
  jaar: number | 'all';
  maand: number | 'all'; // 1-12
  klant: string | 'all';
  land: string | 'all';
  medewerker: string | 'all';
};

export type DashboardKpis = {
  overurenDezeMaand: number;
  overurenDitJaar: number;
  tvtSaldo: number;
  werkurenDezeMaand: number;
  reisurenDezeMaand: number;
  hotelnachtenDezeMaand: number;
  aantalKlanten: number;
  aantalLanden: number;
};
