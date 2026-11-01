import type { AppRol } from './types';

export type DemoUser = {
  id: string;
  naam: string;
  rol: AppRol;
  /** Demo PIN — not production security */
  pin: string;
  functie: string;
};

/** Demo accounts for login (local / Expo Go). */
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'eng_jan',
    naam: 'Jan de Vries',
    rol: 'medewerker',
    pin: '1234',
    functie: 'Field Service Engineer',
  },
  {
    id: 'eng_sara',
    naam: 'Sara Bakker',
    rol: 'medewerker',
    pin: '1234',
    functie: 'Field Service Engineer',
  },
  {
    id: 'eng_tom',
    naam: 'Tom Jansen',
    rol: 'medewerker',
    pin: '1234',
    functie: 'Field Service Engineer',
  },
  {
    id: 'mgr_service',
    naam: 'Service Manager',
    rol: 'manager',
    pin: '9999',
    functie: 'Service Manager',
  },
  {
    id: 'mgr_planning',
    naam: 'Planning Lead',
    rol: 'manager',
    pin: '9999',
    functie: 'Planning',
  },
];

export type AuthSession = {
  userId: string;
  naam: string;
  rol: AppRol;
  loggedInAt: string;
};

export function authenticate(userId: string, pin: string): AuthSession | null {
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user || user.pin !== pin) return null;
  return {
    userId: user.id,
    naam: user.naam,
    rol: user.rol,
    loggedInAt: new Date().toISOString(),
  };
}
