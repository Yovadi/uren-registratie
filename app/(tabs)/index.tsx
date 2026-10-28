import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text, View as ThemedView } from '@/components/Themed';
import { useAppData } from '@/context/AppDataContext';
import { computeWeekTotals, formatInTimeZone } from '@/domain';

/** Week overview placeholder — totals + overtime vs work rules. */
export default function WeekScreen() {
  const { ready, error, settings, entries } = useAppData();

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </ThemedView>
    );
  }

  const week = computeWeekTotals(entries, settings.workRules);
  const weekLabel = formatInTimeZone(week.weekStartIso, settings.homeTimeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.heading}>Deze week</Text>
      <Text style={styles.sub}>
        Week vanaf {weekLabel} · thuis-TZ {settings.homeTimeZone}
      </Text>

      <View style={styles.row}>
        <Stat label="Totaal" value={`${week.totalHours} u`} />
        <Stat label="Verwacht" value={`${week.expectedHours} u`} />
        <Stat label="Overuren" value={`${week.overtimeHours} u`} emphasize />
      </View>

      <Text style={styles.meta}>
        {week.entryCount} registratie{week.entryCount === 1 ? '' : 's'} deze week
      </Text>
      <Text style={styles.hint}>
        Overuren = max(0, weektotaal − uren/week). Site- vs thuis-tijdzone volgt in een latere
        iteratie.
      </Text>
    </ThemedView>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, emphasize && styles.statEmphasize]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  sub: {
    fontSize: 14,
    opacity: 0.65,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stat: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
  },
  statEmphasize: {
    color: '#c45c26',
  },
  meta: {
    marginTop: 16,
    fontSize: 15,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.55,
    lineHeight: 18,
  },
  error: {
    color: '#b00020',
  },
});
