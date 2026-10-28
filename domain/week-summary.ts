import { buitenlandDagen, isBuitenland } from './allowances';
import { round2 } from './compensation';
import type { WerkRegistratie } from './types';

export type WeekSummary = {
  overurenKlok: number;
  urenTotaal: number;
  hotelBinnenland: number;
  hotelBuitenland: number;
  buitenlandDagen: number;
  buitenlandToelageEuro: number;
  registratieCount: number;
};

export function summarizeWeekRows(
  rows: WerkRegistratie[],
  overurenKlok: number,
  thuisLand: string,
  tariefPerDag: number,
): WeekSummary {
  return {
    overurenKlok,
    urenTotaal: round2(rows.reduce((s, r) => s + r.Uren, 0)),
    hotelBinnenland: rows.filter((r) => r.Hotelnacht && !isBuitenland(r.Land, thuisLand))
      .length,
    hotelBuitenland: rows.filter((r) => r.Hotelnacht && isBuitenland(r.Land, thuisLand))
      .length,
    buitenlandDagen: buitenlandDagen(rows, thuisLand),
    buitenlandToelageEuro: round2(buitenlandDagen(rows, thuisLand) * tariefPerDag),
    registratieCount: rows.length,
  };
}
