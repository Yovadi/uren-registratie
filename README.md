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

## Op je PC (aanbevolen: web in de browser)

Data blijft bewaard in **browser-localStorage** (zelfde browser + zelfde adres).  
Dat overleeft herstarten van de PC en opnieuw starten van de app — zolang je geen browserdata wist.

### Eenmalig
1. Installeer [Node.js LTS](https://nodejs.org/) (18+)
2. Clone de repo en open de map:
```bash
git clone https://github.com/Yovadi/uren-registratie.git
cd uren-registratie
git checkout cursor/hotraco-speria-fsm-d046   # of main als de PR gemerged is
npm install
```

### Elke keer starten
```bash
npx expo start --web
```
- Browser opent meestal automatisch (anders: `http://localhost:8081`)
- Inloggen: medewerker PIN `1234` · manager PIN `9999`

`--clear` is alleen nodig bij rare cache-problemen. Dat wist **niet** je opgeslagen uren.

### Wat bewaart data — en wat niet
| Situatie | Data blijft |
|----------|-------------|
| App opnieuw starten / PC herstarten | Ja |
| Zelfde browser, zelfde localhost-poort | Ja |
| Andere browser / Incognito / privévenster | Nee (aparte of lege opslag) |
| Browsergeschiedenis/cookies/sitegegevens wissen | Nee |
| Knop **Reset demo-data** in Meer | Nee (bewust wissen) |
| Expo Go op telefoon (native) | Nee — daar is opslag nu alleen in geheugen |

**Tip:** werk altijd in dezelfde browser (bijv. Chrome) op `localhost:8081`.  
Er is nog geen cloud-sync tussen PC’s; export CSV per week kan als back-up.

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
