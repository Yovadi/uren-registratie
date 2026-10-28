import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { Text } from '@/components/Themed';
import { Card, Content, Screen } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { applyFilters, formatHours, round2, urenPerLand } from '@/domain';
import { Brand } from '@/constants/Colors';

export default function LandAnalyseScreen() {
  const { registraties, filters } = useAppData();
  const rows = useMemo(() => applyFilters(registraties, filters), [registraties, filters]);
  const hours = urenPerLand(rows);

  const visits = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.Land) continue;
      const set = m.get(r.Land) ?? new Set();
      set.add(r.Datum);
      m.set(r.Land, set);
    }
    return [...m.entries()]
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card>
            <Text style={styles.title}>Uren per land</Text>
            <BarChart data={hours} horizontal />
          </Card>
          <Card>
            <Text style={styles.title}>Bezoekdagen per land</Text>
            <BarChart data={visits} horizontal />
            {hours.map((h) => (
              <View key={h.name} style={styles.row}>
                <Text style={{ flex: 1 }}>{h.name}</Text>
                <Text style={styles.meta}>{formatHours(h.value)}</Text>
                <Text style={styles.meta}>
                  {visits.find((v) => v.name === h.name)?.value ?? 0} dagen
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
  title: { fontWeight: '800', fontSize: 15 },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  meta: { color: Brand.textMuted, fontSize: 13 },
});
