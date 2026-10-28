import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { AppHeader, Chip, Content, Screen, useTheme } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  formatHours,
  isoWeekEnd,
  isoWeekNumber,
  isoWeekStart,
  type WerkRegistratie,
} from '@/domain';
import { Brand } from '@/constants/Colors';

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export default function RegistratiesScreen() {
  const theme = useTheme();
  const { ready, registraties, removeRegistratie } = useAppData();
  const [mode, setMode] = useState<'lijst' | 'kalender'>('kalender');
  const [weekStart, setWeekStart] = useState(() => isoWeekStart(new Date().toISOString().slice(0, 10)));
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, WerkRegistratie[]>();
    for (const r of registraties) {
      const list = m.get(r.Datum) ?? [];
      list.push(r);
      m.set(r.Datum, list);
    }
    return m;
  }, [registraties]);

  const dayRows = byDay.get(selectedDay) ?? [];
  const weekEnd = isoWeekEnd(weekStart);

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Werkregistraties" subtitle="Uren, reizen, hotelnachten" />
      <Content>
        <View style={styles.toolbar}>
          <Link href="/registratie/new" asChild>
            <Pressable style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Nieuwe registratie</Text>
            </Pressable>
          </Link>
          <View style={styles.modeRow}>
            <Chip
              label="Kalender"
              selected={mode === 'kalender'}
              onPress={() => setMode('kalender')}
            />
            <Chip
              label="Lijst"
              selected={mode === 'lijst'}
              onPress={() => setMode('lijst')}
            />
          </View>
        </View>

        {mode === 'kalender' ? (
          <ScrollView contentContainerStyle={styles.calScroll}>
            <View style={styles.weekNav}>
              <Pressable
                onPress={() => {
                  const next = addDays(weekStart, -7);
                  setWeekStart(next);
                  setSelectedDay(next);
                }}>
                <Text style={styles.navBtn}>← Vorige</Text>
              </Pressable>
              <Text style={styles.weekLabel}>
                Week {isoWeekNumber(weekStart)} · {formatDay(weekStart)} –{' '}
                {formatDay(weekEnd)}
              </Text>
              <Pressable
                onPress={() => {
                  const next = addDays(weekStart, 7);
                  setWeekStart(next);
                  setSelectedDay(next);
                }}>
                <Text style={styles.navBtn}>Volgende →</Text>
              </Pressable>
            </View>

            <View style={styles.weekGrid}>
              {days.map((day, i) => {
                const rows = byDay.get(day) ?? [];
                const hours = rows.reduce((s, r) => s + r.Uren, 0);
                const selected = day === selectedDay;
                const hasHotel = rows.some((r) => r.Hotelnacht);
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[styles.dayCell, selected && styles.dayCellOn]}>
                    <Text style={[styles.dayName, selected && styles.dayOnText]}>
                      {DAY_LABELS[i]}
                    </Text>
                    <Text style={[styles.dayNum, selected && styles.dayOnText]}>
                      {day.slice(8)}
                    </Text>
                    <Text style={[styles.dayHours, selected && styles.dayOnText]}>
                      {rows.length ? formatHours(hours) : '—'}
                    </Text>
                    {hasHotel ? (
                      <Text style={[styles.hotelDot, selected && styles.dayOnText]}>H</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.dayTitle}>
              {formatDay(selectedDay)} · {dayRows.length} registratie(s)
            </Text>
            {dayRows.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Geen uren op deze dag</Text>
                <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
                  Voeg een registratie toe of kies een andere dag.
                </Text>
              </View>
            ) : (
              dayRows.map((item) => (
                <RegRow
                  key={item.RegistratieID}
                  item={item}
                  onDelete={() => removeRegistratie(item.RegistratieID)}
                />
              ))
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={registraties.slice(0, 200)}
            keyExtractor={(item) => String(item.RegistratieID)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nog geen registraties</Text>
                <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
                  Start met “+ Nieuwe registratie” of een sjabloon.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <RegRow item={item} onDelete={() => removeRegistratie(item.RegistratieID)} />
            )}
          />
        )}
      </Content>
    </Screen>
  );
}

function RegRow({ item, onDelete }: { item: WerkRegistratie; onDelete: () => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>
          #{item.RegistratieID} · {item.Datum} · {item.Activiteit}
        </Text>
        <Text style={styles.meta}>
          {item.Klant} · {item.Project}
        </Text>
        <Text style={styles.meta}>
          {item.Land} · {item.Starttijd}–{item.Eindtijd} · pauze {item.PauzeMinuten}m
        </Text>
        <Text style={styles.hours}>
          {formatHours(item.Uren)} · compensabel {formatHours(item.CompensabeleUren)} ·{' '}
          {item.DagType}
          {item.Hotelnacht ? ' · hotel' : ''}
        </Text>
        <Text style={styles.meta}>{item.Medewerker}</Text>
      </View>
      <Pressable onPress={onDelete}>
        <Text style={{ color: Brand.danger, fontWeight: '600' }}>Verwijder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  calScroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { color: Brand.primary, fontWeight: '700' },
  weekLabel: { fontWeight: '700', color: Brand.text },
  weekGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    minHeight: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#fff',
    padding: 6,
    alignItems: 'center',
  },
  dayCellOn: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  dayName: { fontSize: 11, color: Brand.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 16, fontWeight: '800', color: Brand.text },
  dayHours: { fontSize: 10, color: Brand.primary, fontWeight: '700', marginTop: 2 },
  dayOnText: { color: '#fff' },
  hotelDot: { fontSize: 10, marginTop: 2 },
  dayTitle: { marginTop: 8, fontWeight: '800', fontSize: 15 },
  empty: { paddingVertical: 28, gap: 6, alignItems: 'center' },
  emptyTitle: { fontWeight: '800', fontSize: 16, color: Brand.text },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: 14,
  },
  title: { fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 12, color: Brand.textMuted },
  hours: { fontSize: 13, fontWeight: '600', color: Brand.primary, marginTop: 2 },
});
