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

/** Weekly overtime package — replaces Excel week-send + manager check */
export type OverurenWeekStatus =
  | 'concept'
  | 'ingediend'
  | 'info_gevraagd'
  | 'goedgekeurd'
  | 'afgewezen';

/** After manager approval: TVT bank (other system) or payout allowance */
export type VerwerkingKeuze = 'TVT' | 'Uitbetaling' | 'Gemengd';

export type OverurenWeek = {
  id: string;
  weekStart: string; // Monday YYYY-MM-DD
  weekEnd: string;
  medewerker: string;
  status: OverurenWeekStatus;
  overurenKlok: number;
  compensabeleUren: number;
  registratieIds: number[];
  ingediendOp: string | null;
  beoordeeldOp: string | null;
  beoordeeldDoor: string | null;
  afwijzingsReden: string | null;
  /** Set when manager approves */
  verwerking: VerwerkingKeuze | null;
  /** Optional split note when verwerking = Gemengd */
  verwerkingToelichting: string | null;
  /** Engineer note on submit */
  opmerking: string;
  /** Manager question / comment (e.g. info_gevraagd) */
  managerOpmerking: string | null;
};

export type AppRol = 'medewerker' | 'manager';

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
  /** Thuisland — bepaalt hotel binnen/buitenland + buitenlandtoelage */
  defaultLand: string;
  /** Normuren per dag (spec: 8) */
  normUrenPerDag: number;
  /** Buitenlandtoelage in euro per buitenland-dag */
  buitenlandToelagePerDag: number;
  /** UI-rol: medewerker dient weken in; manager keurt goed */
  rol: AppRol;
  managerNaam: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  medewerkerNaam: 'Jan de Vries',
  defaultLand: 'Nederland',
  normUrenPerDag: 8,
  buitenlandToelagePerDag: 55,
  rol: 'medewerker',
  managerNaam: 'Service Manager',
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
  wekenTeBeoordelen: number;
  wekenGoedgekeurd: number;
  werkurenDezeMaand: number;
  reisurenDezeMaand: number;
  hotelBinnenlandDezeMaand: number;
  hotelBuitenlandDezeMaand: number;
  buitenlandToelageDezeMaand: number;
  buitenlandToelageDitJaar: number;
  aantalKlanten: number;
};
