# Urenregistratie

Expo-app (TypeScript + Expo Router) voor een reizende service engineer: **uren, overuren en tijdzones** — één codebase voor **web, iOS en Android**.

Solo offline nu (lokale SQLite achter een `HourStore`-interface); later uitbreidbaar naar sync/multi-user zonder de schermen te herschrijven.

## Vereisten

- Node.js 20+ (aanbevolen)
- [Expo](https://docs.expo.dev/) / `npx`

## Starten

```bash
npm install
npx expo start
```

Daarna:

| Doel | Commando / actie |
|------|------------------|
| Web | `npx expo start --web` of druk `w` in de Expo CLI |
| Android | `npx expo start --android` of druk `a` |
| iOS | `npx expo start --ios` (macOS) of Expo Go-app |
| Expo Go | Scan de QR-code met de Expo Go-app |

## Wat zit er in deze scaffold

| Onderdeel | Locatie |
|-----------|---------|
| Domain: `TimeEntry`, `WorkRules`, settings | `domain/` |
| Overuren / weektotalen (placeholder) | `domain/time.ts` |
| Tijdzone-helpers + common zones | `domain/timezone.ts` |
| Storage-interface + SQLite + memory fallback | `storage/` |
| React context boven de store | `context/AppDataContext.tsx` |
| Week-overzicht | `app/(tabs)/index.tsx` |
| Lijst + toevoegen uren | `app/(tabs)/entries.tsx`, `app/entry/new.tsx` |
| Instellingen (thuis-TZ, uren/dag/week) | `app/(tabs)/settings.tsx` |

## Productrichting (v1)

1. Dagboek met start/eind, project, notitie, **site-tijdzone** per entry  
2. **Thuis-tijdzone** in settings; weergave site vs thuis  
3. Overuren t.o.v. standaard werkweek  
4. Week/maand-overzicht; later CSV-export  

Niet in v1: team, goedkeuring, expenses, GPS, facturatie.

## Architectuur

```
UI (Expo Router screens)
        ↓
AppDataContext
        ↓
HourStore  ←── LocalSqliteStore (nu)
           └── SyncedStore (later)
        ↓
domain/ (puur TypeScript, geen UI)
```

## Licentie

Zie `LICENSE` (template van create-expo-app). Pas aan indien gewenst.
