import type { Activiteit } from './types';

export type RegistratieTemplate = {
  id: string;
  label: string;
  Activiteit: Activiteit;
  Starttijd: string;
  Eindtijd: string;
  PauzeMinuten: number;
  Hotelnacht: boolean;
};

/** Quick-fill templates for field engineers. */
export const REGISTRATIE_TEMPLATES: RegistratieTemplate[] = [
  {
    id: 'werkdag',
    label: 'Standaard werkdag 08–17',
    Activiteit: 'Werken',
    Starttijd: '08:00',
    Eindtijd: '17:00',
    PauzeMinuten: 30,
    Hotelnacht: false,
  },
  {
    id: 'halve-ochtend',
    label: 'Halve dag ochtend',
    Activiteit: 'Werken',
    Starttijd: '08:00',
    Eindtijd: '12:00',
    PauzeMinuten: 0,
    Hotelnacht: false,
  },
  {
    id: 'service-hotel',
    label: 'Service + hotelnacht',
    Activiteit: 'Service',
    Starttijd: '08:00',
    Eindtijd: '17:00',
    PauzeMinuten: 30,
    Hotelnacht: true,
  },
  {
    id: 'reis',
    label: 'Reisdag (geen pauze)',
    Activiteit: 'Reizen',
    Starttijd: '06:00',
    Eindtijd: '14:00',
    PauzeMinuten: 0,
    Hotelnacht: false,
  },
  {
    id: 'storing',
    label: 'Storing avond',
    Activiteit: 'Storing',
    Starttijd: '17:00',
    Eindtijd: '22:00',
    PauzeMinuten: 0,
    Hotelnacht: false,
  },
];
