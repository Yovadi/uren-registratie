# Hotraco / Speria Field Service Manager

Expo-app (web + iOS/Android) voor Field Service Engineers, Service Managers en Planning.

## Functies
- **Werkregistraties** met automatische uren- en compensatieberekening
- **Overuren-weken**: indienen (i.p.v. Excel) → manager goedkeuring → verwerking **TVT** of **uitbetaling** (saldo in ander pakket)
- **Dashboard** met KPI’s, filters en grafieken
- **Hotel binnen-/buitenland** + **buitenlandtoelage**
- **Reisplanner**
- Analyses: klant, project, hotel & toelage

## Starten
```bash
npm install
npx expo start --web --clear
```

Onder **Meer** kun je wisselen tussen rol *Medewerker* en *Manager*.

## Compensatiefactoren (berekening)
- Norm: 8 u/dag
- Weekdag werk: eerste 8u ×1,0 · overuren ×1,4654 · reizen ×1,0
- Zaterdag: ×1,4654 · Zondag: ×1,8441

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
