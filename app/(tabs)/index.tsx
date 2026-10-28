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
  computeKpis,
  formatHours,
  overurenPerMaand,
  topKlanten,
  uniqueSorted,
  urenPerActiviteit,
  urenPerLand,
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
  const { ready, error, registraties, bank, filters, setFilters } = useAppData();

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
    () => computeKpis(registraties, bank, filters),
    [registraties, bank, filters],
  );
  const chartYear = filters.jaar === 'all' ? new Date().getFullYear() : filters.jaar;

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
        subtitle="Werkuren · reizen · TVT · analyses"
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
              label="TVT saldo"
              value={formatHours(kpis.tvtSaldo)}
              icon="wallet-outline"
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
              label="Hotelnachten"
              value={String(kpis.hotelnachtenDezeMaand)}
              icon="bed-outline"
              tone="secondary"
            />
            <KpiTile
              label="Klanten bezocht"
              value={String(kpis.aantalKlanten)}
              icon="business-outline"
            />
            <KpiTile
              label="Landen bezocht"
              value={String(kpis.aantalLanden)}
              icon="globe-outline"
            />
          </View>

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
              <DonutChart data={werkVsReis(filtered)} />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top 10 klanten</Text>
              <BarChart data={topKlanten(filtered)} horizontal />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Uren per land</Text>
              <BarChart data={urenPerLand(filtered)} horizontal />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Uren per activiteit</Text>
              <DonutChart data={urenPerActiviteit(filtered)} />
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
});
