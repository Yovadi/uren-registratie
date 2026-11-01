import {
  computeCompensabeleUren,
  computeUren,
  dagTypeFromWeekday,
  weekdagnummer,
} from './compensation';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(computeUren('08:00', '17:00', 30) === 8.5, 'uren calc');
assert(weekdagnummer('2026-10-28') === 3, 'wednesday');
assert(dagTypeFromWeekday(6) === 'Zaterdag', 'sat');
assert(dagTypeFromWeekday(7) === 'Zondag', 'sun');

assert(
  computeCompensabeleUren({ uren: 8, activiteit: 'Werken', dagType: 'Weekdag' }) === 8,
  '8h weekday',
);
assert(
  Math.abs(
    computeCompensabeleUren({ uren: 10, activiteit: 'Werken', dagType: 'Weekdag' }) -
      (8 + 2 * 1.4654),
  ) < 0.01,
  'weekday OT',
);
assert(
  Math.abs(
    computeCompensabeleUren({ uren: 4, activiteit: 'Reizen', dagType: 'Zaterdag' }) -
      4 * 1.4654,
  ) < 0.01,
  'sat travel',
);
assert(
  Math.abs(
    computeCompensabeleUren({ uren: 5, activiteit: 'Werken', dagType: 'Zondag' }) -
      5 * 1.8441,
  ) < 0.01,
  'sun work',
);

console.log('compensation tests OK');
