import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { Text } from '@/components/Themed';
import { Card, Content, Screen } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { applyFilters, formatHours, round2 } from '@/domain';
import { Brand } from '@/constants/Colors';

/** Indicative internal cost rate for planning (€/uur) — not invoicing. */
const RATE = 95;

export default function ProjectAnalyseScreen() {
  const { registraties, filters } = useAppData();
  const rows = useMemo(() => applyFilters(registraties, filters), [registraties, filters]);

  const byProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = r.Project || '(geen project)';
      m.set(key, (m.get(key) ?? 0) + r.Uren);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: round2(value) }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card>
            <Text style={styles.title}>Uren per project</Text>
            <BarChart data={byProject.slice(0, 12)} horizontal />
          </Card>
          <Card>
            <Text style={styles.title}>Kostenindicatie ({RATE} €/u)</Text>
            {byProject.slice(0, 12).map((p) => (
              <View key={p.name} style={styles.row}>
                <Text style={{ flex: 1 }}>{p.name}</Text>
                <Text style={styles.meta}>{formatHours(p.value)}</Text>
                <Text style={styles.cost}>
                  € {Math.round(p.value * RATE).toLocaleString('nl-NL')}
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
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  meta: { color: Brand.textMuted, width: 64, textAlign: 'right' },
  cost: { fontWeight: '700', color: Brand.primary, width: 90, textAlign: 'right' },
});
