# Hotraco / Speria Field Service Manager

Expo-app (web) voor Field Service Engineers, Service Managers en Planning.

## Inloggen (demo)
| Rol | Voorbeelden | PIN |
|-----|-------------|-----|
| Medewerker | Jan de Vries, Sara Bakker, Tom Jansen | `1234` |
| Manager | Service Manager, Planning Lead | `9999` |

## Procedure overuren
1. Medewerker voert een **hele week** in.
2. Bij indienen: **TVT** of **Uitbetalen**.
3. Manager ziet weken op **weeknummer** + naam en kan alleen **accepteren** of **afwijzen**.
4. TVT-saldo / loonstrook blijven in andere systemen.

## Op je PC / in het buitenland

### Lokaal starten (ontwikkeling)
```bash
git clone https://github.com/Yovadi/uren-registratie.git
cd uren-registratie
git checkout cursor/hotraco-speria-fsm-d046   # of main na merge
npm install
npx expo start --web
```
Open `http://localhost:8081`.

### Waar blijven gegevens?
- **Automatisch** in de browser (localStorage) op **dit apparaat**.
- Werkt offline zodra de app geladen is (veldwerk / hotel-wifi).
- Zelfde laptop + dezelfde browser = data blijft na herstart.

### Back-up (belangrijk onderweg)
In **Meer → Back-up & onderweg**:
1. **Exporteer alle gegevens** → JSON-bestand  
2. Bewaar dat in **OneDrive / Teams / USB**  
3. Op een andere PC: **Importeer back-up…**

Zo raak je niets kwijt als je van laptop wisselt of browserdata wist.  
Manager en medewerker op verschillende devices: wissel via dit back-upbestand (gedeelde Teams-map), tot er cloud-sync is.

### Wat wist data?
| Actie | Data weg? |
|-------|-----------|
| PC / app herstarten | Nee |
| Andere browser / Incognito | Ja (andere opslag) |
| Browser sitegegevens wissen | Ja |
| **Reset demo-data** | Ja |
| Nieuwe laptop zonder import | Ja — eerst back-up importeren |

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
