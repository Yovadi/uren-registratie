# Hotraco / Speria Field Service Manager

Web-app voor Field Service Engineers, Service Managers en Planning.

## Simpele link (aanbevolen)

Open de app in de browser — geen Node, geen terminal:

**https://yovadi.github.io/uren-registratie/**

### Eenmalig aanzetten (repo-eigenaar)
GitHub Pages staat nog niet aan. Doe dit **één keer**:

1. Open https://github.com/Yovadi/uren-registratie/settings/pages  
2. Onder **Build and deployment** → **Source**: kies **Deploy from a branch**  
3. Branch: **`gh-pages`** / map **`/` (root)** → Save  

Daarna werkt de link hierboven overal (ook in het buitenland).  
Data blijft bewaard in de browser + via **Meer → Exporteer back-up**.

### Login (demo)
| Rol | PIN |
|-----|-----|
| Medewerker (Jan / Sara / Tom) | `1234` |
| Manager | `9999` |

## Back-up onderweg
**Meer → Exporteer alle gegevens** → zet JSON in OneDrive/Teams.  
Andere laptop: **Importeer back-up…**

## Lokaal ontwikkelen (optioneel)
```bash
git clone https://github.com/Yovadi/uren-registratie.git
cd uren-registratie
npm install
npx expo start --web
```

## Overuren-procedure
1. Week invoeren → medewerker kiest TVT of uitbetalen  
2. Manager accepteert of wijst af (weeknummer + naam)
