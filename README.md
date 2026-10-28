# Hotraco / Speria Field Service Manager

Expo-app (web + iOS/Android) voor Field Service Engineers, Service Managers en Planning.

## Inloggen (demo)
| Rol | Voorbeelden | PIN |
|-----|-------------|-----|
| Medewerker | Jan de Vries, Sara Bakker, Tom Jansen | `1234` |
| Manager | Service Manager, Planning Lead | `9999` |

## Procedure overuren
1. Medewerker registreert uren (sjablonen, weekkalender, validaties).
2. Weken mét overuren verschijnen onder **Overuren** op **weeknummer** (badge + herinnering).
3. Bij **Week indienen** kiest de medewerker **TVT** of **Uitbetalen**.
4. Manager ziet één platte wachtrij en kan alleen **accepteren** of **afwijzen** (bulk-accepteren mogelijk).
5. TVT-saldo / loonstrook blijven in andere systemen.

## Starten
```bash
npm install
npx expo start --web --clear
```

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
