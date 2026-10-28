import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { BarChart, DonutChart } from '@/components/charts';
import { Text } from '@/components/Themed';
import {
  AppHeader,
  Card,
  Chip,
  Content,
  KpiTile,
  Screen,
  useTheme,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  applyFilters,
  buitenlandToelagePerMaand,
  computeKpis,
  formatHours,
  hotelBinnenVsBuiten,
  kostenOverzichtPerMaand,
  overurenPerMaand,
  topKlanten,
  uniqueSorted,
  urenPerActiviteit,
  werkVsReis,
} from '@/domain';
import { Brand } from '@/constants/Colors';

const MONTHS = [
  'Jan',
  'Feb',
  'Mrt',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
];

export default function DashboardScreen() {
  const theme = useTheme();
  const { ready, error, registraties, overurenWeken, filters, setFilters, settings } =
    useAppData();

  const years = useMemo(() => {
    const ys = uniqueSorted(registraties.map((r) => r.Datum.slice(0, 4)));
    return ys.length ? ys.map(Number) : [new Date().getFullYear()];
  }, [registraties]);

  const klanten = useMemo(
    () => uniqueSorted(registraties.map((r) => r.Klant)),
    [registraties],
  );
  const landen = useMemo(
    () => uniqueSorted(registraties.map((r) => r.Land)),
    [registraties],
  );
  const medewerkers = useMemo(
    () => uniqueSorted(registraties.map((r) => r.Medewerker)),
    [registraties],
  );

  const filtered = useMemo(
    () => applyFilters(registraties, filters),
    [registraties, filters],
  );
  const kpis = useMemo(
    () => computeKpis(registraties, overurenWeken, filters, settings),
    [registraties, overurenWeken, filters, settings],
  );
  const chartYear = filters.jaar === 'all' ? new Date().getFullYear() : filters.jaar;
  const kosten = useMemo(
    () =>
      kostenOverzichtPerMaand(
        filtered,
        chartYear,
        settings.defaultLand,
        settings.buitenlandToelagePerDag,
      ),
    [filtered, chartYear, settings.defaultLand, settings.buitenlandToelagePerDag],
  );
  const kostenTotaal = useMemo(
    () => ({
      toelage: Math.round(kosten.reduce((s, m) => s + m.toelageEuro, 0)),
      hotelIn: kosten.reduce((s, m) => s + m.hotelBinnenland, 0),
      hotelUit: kosten.reduce((s, m) => s + m.hotelBuitenland, 0),
    }),
    [kosten],
  );

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
        <Text style={{ color: theme.textMuted }}>Dashboard laden…</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={styles.centered}>
        <Text style={{ color: theme.danger }}>{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Field Service Manager"
        subtitle="Werkuren · overuren-goedkeuring · reizen · analyses"
      />
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.section}>Filters</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.chips}>
              {years.map((y) => (
                <Chip
                  key={y}
                  label={String(y)}
                  selected={filters.jaar === y}
                  onPress={() => setFilters({ ...filters, jaar: y })}
                />
              ))}
              <Chip
                label="Alle jaren"
                selected={filters.jaar === 'all'}
                onPress={() => setFilters({ ...filters, jaar: 'all' })}
              />
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.chips}>
              <Chip
                label="Alle maanden"
                selected={filters.maand === 'all'}
                onPress={() => setFilters({ ...filters, maand: 'all' })}
              />
              {MONTHS.map((m, i) => (
                <Chip
                  key={m}
                  label={m}
                  selected={filters.maand === i + 1}
                  onPress={() => setFilters({ ...filters, maand: i + 1 })}
                />
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.chips}>
              <Chip
                label="Alle klanten"
                selected={filters.klant === 'all'}
                onPress={() => setFilters({ ...filters, klant: 'all' })}
              />
              {klanten.map((k) => (
                <Chip
                  key={k}
                  label={k}
                  selected={filters.klant === k}
                  onPress={() => setFilters({ ...filters, klant: k })}
                />
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.chips}>
              <Chip
                label="Alle landen"
                selected={filters.land === 'all'}
                onPress={() => setFilters({ ...filters, land: 'all' })}
              />
              {landen.map((l) => (
                <Chip
                  key={l}
                  label={l}
                  selected={filters.land === l}
                  onPress={() => setFilters({ ...filters, land: l })}
                />
              ))}
            </View>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.chips}>
              <Chip
                label="Alle medewerkers"
                selected={filters.medewerker === 'all'}
                onPress={() => setFilters({ ...filters, medewerker: 'all' })}
              />
              {medewerkers.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={filters.medewerker === m}
                  onPress={() => setFilters({ ...filters, medewerker: m })}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.section}>KPI’s</Text>
          <View style={styles.kpiGrid}>
            <KpiTile
              label="Overuren deze maand"
              value={formatHours(kpis.overurenDezeMaand)}
              icon="flash-outline"
              tone="accent"
            />
            <KpiTile
              label="Overuren dit jaar"
              value={formatHours(kpis.overurenDitJaar)}
              icon="trending-up-outline"
              tone="accent"
            />
            <KpiTile
              label="Weken ter goedkeuring"
              value={String(kpis.wekenTeBeoordelen)}
              icon="hourglass-outline"
              tone="accent"
            />
            <KpiTile
              label="Weken geaccepteerd"
              value={String(kpis.wekenGoedgekeurd)}
              icon="checkmark-circle-outline"
              tone="secondary"
            />
            <KpiTile
              label="Werkuren deze maand"
              value={formatHours(kpis.werkurenDezeMaand)}
              icon="construct-outline"
            />
            <KpiTile
              label="Reisuren deze maand"
              value={formatHours(kpis.reisurenDezeMaand)}
              icon="airplane-outline"
            />
            <KpiTile
              label="Hotel binnenland"
              value={String(kpis.hotelBinnenlandDezeMaand)}
              icon="home-outline"
              tone="secondary"
            />
            <KpiTile
              label="Hotel buitenland"
              value={String(kpis.hotelBuitenlandDezeMaand)}
              icon="bed-outline"
              tone="secondary"
            />
            <KpiTile
              label="Buitenlandtoelage (mnd)"
              value={`€ ${Math.round(kpis.buitenlandToelageDezeMaand)}`}
              icon="cash-outline"
              tone="accent"
            />
            <KpiTile
              label="Buitenlandtoelage (jaar)"
              value={`€ ${Math.round(kpis.buitenlandToelageDitJaar)}`}
              icon="globe-outline"
              tone="accent"
            />
            <KpiTile
              label="Klanten bezocht"
              value={String(kpis.aantalKlanten)}
              icon="business-outline"
            />
          </View>

          <Text style={styles.section}>Kostenoverzicht ({chartYear})</Text>
          <Card style={styles.costCard}>
            <Text style={styles.chartHint}>
              Planning: buitenlandtoelage + hotelnachten (geen hotelprijs in deze app)
            </Text>
            <Text style={styles.costTotal}>
              Toelage €{kostenTotaal.toelage.toLocaleString('nl-NL')} · hotel in/uit{' '}
              {kostenTotaal.hotelIn}/{kostenTotaal.hotelUit}
            </Text>
            {kosten.map((m) => (
              <View key={m.name} style={styles.costRow}>
                <Text style={styles.costMonth}>{m.name}</Text>
                <Text style={styles.costCell}>€{Math.round(m.toelageEuro)}</Text>
                <Text style={styles.costCell}>
                  H {m.hotelBinnenland}/{m.hotelBuitenland}
                </Text>
                <Text style={styles.costCell}>{m.buitenlandDagen}d uit</Text>
              </View>
            ))}
          </Card>

          <Text style={styles.section}>Grafieken</Text>
          <View style={styles.charts}>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Overuren per maand ({chartYear})</Text>
              <ScrollView horizontal>
                <BarChart data={overurenPerMaand(filtered, chartYear)} />
              </ScrollView>
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Werkuren versus reisuren</Text>
              <DonutChart data={werkVsReis(filtered)} centerSuffix="u" />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top 10 klanten</Text>
              <BarChart data={topKlanten(filtered)} horizontal />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                Hotelnachten binnen- vs buitenland
              </Text>
              <Text style={styles.chartHint}>
                Thuisland: {settings.defaultLand}
              </Text>
              <DonutChart
                data={hotelBinnenVsBuiten(filtered, settings.defaultLand)}
                centerSuffix="nachten"
              />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                Buitenlandtoelage per maand ({chartYear})
              </Text>
              <Text style={styles.chartHint}>
                €{settings.buitenlandToelagePerDag}/dag buitenland
              </Text>
              <ScrollView horizontal>
                <BarChart
                  data={buitenlandToelagePerMaand(
                    filtered,
                    chartYear,
                    settings.defaultLand,
                    settings.buitenlandToelagePerDag,
                  )}
                />
              </ScrollView>
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Uren per activiteit</Text>
              <DonutChart data={urenPerActiviteit(filtered)} centerSuffix="u" />
            </Card>
          </View>
        </ScrollView>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  section: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  filterRow: { marginBottom: 4 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  charts: {
    gap: 12,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
  },
  chartCard: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? '48%' : '100%',
    minWidth: Platform.OS === 'web' ? 320 : undefined,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  chartHint: { fontSize: 12, color: Brand.textMuted, marginBottom: 6 },
  costCard: { padding: 14, gap: 6 },
  costTotal: { fontWeight: '800', color: Brand.accent, marginBottom: 4 },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  costMonth: { width: 44, fontWeight: '700', color: Brand.text },
  costCell: { flex: 1, fontSize: 13, color: Brand.textMuted },
});
