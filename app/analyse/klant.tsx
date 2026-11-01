import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BarChart } from '@/components/charts';
import { Text } from '@/components/Themed';
import { Card, Content, Screen } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { applyFilters, isTravelActivity, round2, topKlanten } from '@/domain';
import { Brand } from '@/constants/Colors';

export default function KlantAnalyseScreen() {
  const { registraties, filters } = useAppData();
  const rows = useMemo(() => applyFilters(registraties, filters), [registraties, filters]);

  const hours = topKlanten(rows, 20);
  const travel = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.Klant || !isTravelActivity(r.Activiteit)) continue;
      m.set(r.Klant, (m.get(r.Klant) ?? 0) + r.Uren);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: round2(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows]);
  const hotels = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.Klant || !r.Hotelnacht) continue;
      m.set(r.Klant, (m.get(r.Klant) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows]);

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.lead}>
            Filters van het dashboard gelden ook hier (jaar/maand/land/medewerker).
          </Text>
          <Card>
            <Text style={styles.title}>Uren per klant</Text>
            <BarChart data={hours} horizontal />
          </Card>
          <Card>
            <Text style={styles.title}>Reisuren per klant</Text>
            <BarChart data={travel} horizontal />
          </Card>
          <Card>
            <Text style={styles.title}>Hotelnachten per klant</Text>
            <BarChart data={hotels} horizontal />
          </Card>
        </ScrollView>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  lead: { color: Brand.textMuted, marginBottom: 4 },
  title: { fontWeight: '800', fontSize: 15 },
});
