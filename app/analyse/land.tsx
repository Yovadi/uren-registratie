import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarChart, DonutChart } from '@/components/charts';
import { Text } from '@/components/Themed';
import { Card, Content, Screen } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  applyFilters,
  buitenlandDagen,
  buitenlandToelageEuro,
  hotelBinnenVsBuiten,
  hotelPerLand,
} from '@/domain';
import { Brand } from '@/constants/Colors';

export default function LandAnalyseScreen() {
  const { registraties, filters, settings } = useAppData();
  const rows = useMemo(() => applyFilters(registraties, filters), [registraties, filters]);
  const thuis = settings.defaultLand;
  const tarief = settings.buitenlandToelagePerDag;

  const hotels = hotelBinnenVsBuiten(rows, thuis);
  const perLand = hotelPerLand(rows, thuis);
  const dagen = buitenlandDagen(rows, thuis);
  const toelage = buitenlandToelageEuro(rows, thuis, tarief);

  const toelageBars = perLand
    .filter((r) => r.toelageDagen > 0)
    .map((r) => ({ name: r.land, value: r.toelageDagen * tarief }));

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.lead}>
            Focus op hotelnachten (binnen- vs buitenland) en buitenlandtoelage. Thuisland:{' '}
            <Text style={{ fontWeight: '700' }}>{thuis}</Text> · tarief €{tarief}/dag.
          </Text>

          <Card>
            <Text style={styles.title}>Samenvatting (gefilterd)</Text>
            <Text style={styles.meta}>Buitenland-dagen: {dagen}</Text>
            <Text style={styles.meta}>
              Buitenlandtoelage: € {Math.round(toelage).toLocaleString('nl-NL')}
            </Text>
          </Card>

          <Card>
            <Text style={styles.title}>Hotelnachten binnen- vs buitenland</Text>
            <DonutChart data={hotels} centerSuffix="nachten" />
          </Card>

          <Card>
            <Text style={styles.title}>Buitenlandtoelage per land (€)</Text>
            <BarChart data={toelageBars} horizontal />
          </Card>

          <Card>
            <Text style={styles.title}>Detail per land</Text>
            {perLand.map((r) => (
              <View key={r.land} style={styles.row}>
                <Text style={{ flex: 1, fontWeight: '600' }}>{r.land}</Text>
                <Text style={styles.meta}>H-in {r.binnenland}</Text>
                <Text style={styles.meta}>H-uit {r.buitenland}</Text>
                <Text style={styles.cost}>
                  €{Math.round(r.toelageDagen * tarief)}
                </Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  lead: { color: Brand.textMuted, marginBottom: 4, lineHeight: 20 },
  title: { fontWeight: '800', fontSize: 15 },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  meta: { color: Brand.textMuted, fontSize: 13 },
  cost: { fontWeight: '700', color: Brand.primary, minWidth: 56, textAlign: 'right' },
});
