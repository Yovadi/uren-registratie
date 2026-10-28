# Hotraco / Speria Field Service Manager

Expo-app (web + iOS/Android) voor Field Service Engineers, Service Managers en Planning.

## Inloggen (demo)
| Rol | Voorbeelden | PIN |
|-----|-------------|-----|
| Medewerker | Jan de Vries, Sara Bakker, Tom Jansen | `1234` |
| Manager | Service Manager, Planning Lead | `9999` |

## Procedure overuren
1. Medewerker registreert uren (sjablonen, weekkalender, validaties).
2. Weken mét overuren verschijnen onder **Overuren** (badge + herinnering).
3. **Week indienen** = doorsturen naar manager (samenvatting + CSV-export).
4. Manager ziet één platte wachtrij (één service team), bulk-goedkeuren, tijdlijn/audit.
5. Manager kiest: **TVT**, **Uitbetalen**, **Gemengd**, **Info vragen** of **Afwijzen**.
6. TVT-saldo / loonstrook blijven in andere systemen.

## Starten
```bash
npm install
npx expo start --web --clear
```

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
