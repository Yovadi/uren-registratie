# Hotraco / Speria Field Service Manager

Expo-app (web + iOS/Android) voor Field Service Engineers, Service Managers en Planning.

## Functies
- **Werkregistraties** met automatische uren- en TVT-compensatieberekening
- **Dashboard** met KPI’s, filters en grafieken
- **Compensatiebank (TVT)**
- **Reisplanner** (tijdzones + reistijd)
- **Analyses**: klant, project, land
- Lokale opslag (~5 jaar seed-data voor demo); geschikt voor langdurige historie

## Starten
```bash
npm install
npx expo start --web
```

## Compensatieregels (samenvatting)
- Norm: 8 u/dag
- Weekdag werk: eerste 8u ×1,0 · overuren ×1,4654 · reizen ×1,0
- Zaterdag: ×1,4654 · Zondag: ×1,8441

## Kleuren
Primair `#0F4C81` · secundair `#70AD47` · accent `#ED7D31`
