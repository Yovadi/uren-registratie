import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import {
  AppHeader,
  Chip,
  Content,
  FieldInput,
  FieldLabel,
  Screen,
  useTheme,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  approveWeek,
  buildWeekSnapshots,
  createSubmissionFromSnapshot,
  formatHours,
  isoWeekLabel,
  mergeWeeksWithSubmissions,
  rejectWeek,
  statusLabel,
  type VerwerkingKeuze,
} from '@/domain';
import { Brand } from '@/constants/Colors';

export default function OverurenScreen() {
  const theme = useTheme();
  const {
    ready,
    registraties,
    overurenWeken,
    settings,
    saveOverurenWeek,
  } = useAppData();
  const [filterMedewerker, setFilterMedewerker] = useState<'all' | string>(
    settings.rol === 'medewerker' ? settings.medewerkerNaam : 'all',
  );
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const snapshots = useMemo(() => {
    let rows = registraties;
    if (filterMedewerker !== 'all') {
      rows = rows.filter((r) => r.Medewerker === filterMedewerker);
    }
    return buildWeekSnapshots(rows);
  }, [registraties, filterMedewerker]);

  const weeks = useMemo(
    () => mergeWeeksWithSubmissions(snapshots, overurenWeken),
    [snapshots, overurenWeken],
  );

  const medewerkers = useMemo(
    () => [...new Set(registraties.map((r) => r.Medewerker))].sort(),
    [registraties],
  );

  const pending = overurenWeken.filter((w) => w.status === 'ingediend').length;

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  const isManager = settings.rol === 'manager';

  return (
    <Screen>
      <AppHeader
        title="Overuren-weken"
        subtitle={
          isManager
            ? `${pending} week(en) ter beoordeling · kies TVT of uitbetaling`
            : 'Dien weken met overuren in ter goedkeuring (zoals Excel)'
        }
      />
      <Content>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            TVT-saldo zit in een ander pakket. Hier stuur je alleen overuren-weken
            door; de manager keurt goed en kiest verwerking (TVT of overwerktoelage).
          </Text>
        </View>

        {isManager ? (
          <View style={styles.filters}>
            <Chip
              label="Alle medewerkers"
              selected={filterMedewerker === 'all'}
              onPress={() => setFilterMedewerker('all')}
            />
            {medewerkers.map((m) => (
              <Chip
                key={m}
                label={m}
                selected={filterMedewerker === m}
                onPress={() => setFilterMedewerker(m)}
              />
            ))}
          </View>
        ) : null}

        <FlatList
          data={weeks}
          keyExtractor={(item) => `${item.weekStart}_${item.medewerker}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 32 }}>
              Geen weken met overuren gevonden.
            </Text>
          }
          renderItem={({ item }) => {
            const sub = item.submission;
            const status = sub?.status ?? 'concept';
            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{isoWeekLabel(item.weekStart)}</Text>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.meta}>{item.medewerker}</Text>
                <Text style={styles.hours}>
                  Overuren {formatHours(item.overurenKlok)} · compensabel{' '}
                  {formatHours(item.compensabeleUren)} · totaal{' '}
                  {formatHours(item.urenTotaal)}
                </Text>
                <Text style={styles.meta}>
                  {item.registratieIds.length} registratie(s) in deze week
                </Text>

                {sub?.verwerking ? (
                  <Text style={styles.verwerking}>
                    Verwerking: {sub.verwerking === 'TVT' ? 'TVT (ander pakket)' : 'Uitbetaling'}
                  </Text>
                ) : null}
                {sub?.afwijzingsReden ? (
                  <Text style={{ color: Brand.danger, marginTop: 4 }}>
                    Afgewezen: {sub.afwijzingsReden}
                  </Text>
                ) : null}
                {sub?.beoordeeldDoor ? (
                  <Text style={styles.meta}>
                    Beoordeeld door {sub.beoordeeldDoor}
                    {sub.beoordeeldOp
                      ? ` · ${new Date(sub.beoordeeldOp).toLocaleString('nl-NL')}`
                      : ''}
                  </Text>
                ) : null}

                {/* Medewerker: submit */}
                {!isManager && (status === 'concept' || status === 'afgewezen') ? (
                  <Pressable
                    style={styles.primary}
                    onPress={async () => {
                      await saveOverurenWeek(
                        createSubmissionFromSnapshot(
                          item,
                          status === 'afgewezen' ? 'Opnieuw ingediend na correctie' : '',
                        ),
                      );
                    }}>
                    <Text style={styles.primaryText}>
                      {status === 'afgewezen' ? 'Opnieuw indienen' : 'Week indienen'}
                    </Text>
                  </Pressable>
                ) : null}

                {!isManager && status === 'ingediend' ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    Ingediend — wacht op manager-goedkeuring
                  </Text>
                ) : null}

                {/* Manager: approve / reject */}
                {isManager && status === 'ingediend' && sub ? (
                  <View style={styles.managerActions}>
                    <Text style={styles.actionLabel}>Goedkeuren als:</Text>
                    <View style={styles.rowBtns}>
                      {(['TVT', 'Uitbetaling'] as VerwerkingKeuze[]).map((v) => (
                        <Pressable
                          key={v}
                          style={[styles.secondary, v === 'Uitbetaling' && styles.accentBtn]}
                          onPress={async () => {
                            await saveOverurenWeek(
                              approveWeek(sub, settings.managerNaam, v),
                            );
                          }}>
                          <Text style={styles.secondaryText}>
                            {v === 'TVT' ? 'TVT' : 'Uitbetalen'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {rejectId === sub.id ? (
                      <View style={{ marginTop: 8 }}>
                        <FieldLabel>Reden afwijzing</FieldLabel>
                        <FieldInput
                          value={rejectReason}
                          onChangeText={setRejectReason}
                          placeholder="Bijv. pauze corrigeren"
                        />
                        <Pressable
                          style={styles.danger}
                          onPress={async () => {
                            await saveOverurenWeek(
                              rejectWeek(
                                sub,
                                settings.managerNaam,
                                rejectReason.trim() || 'Afgewezen',
                              ),
                            );
                            setRejectId(null);
                            setRejectReason('');
                          }}>
                          <Text style={styles.primaryText}>Bevestig afwijzing</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.linkBtn}
                        onPress={() => {
                          setRejectId(sub.id);
                          setRejectReason('');
                        }}>
                        <Text style={{ color: Brand.danger, fontWeight: '700' }}>Afwijzen…</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </Content>
    </Screen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    concept: Brand.textMuted,
    ingediend: Brand.accent,
    goedgekeurd: Brand.secondary,
    afgewezen: Brand.danger,
  };
  const bg = colors[status] ?? Brand.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: `${bg}22`, borderColor: bg }]}>
      <Text style={{ color: bg, fontSize: 11, fontWeight: '800' }}>
        {statusLabel(
          (status as 'concept' | 'ingediend' | 'goedgekeurd' | 'afgewezen') || 'concept',
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.08)',
  },
  bannerText: { fontSize: 13, lineHeight: 18, color: Brand.text },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontWeight: '800', fontSize: 15, flex: 1 },
  meta: { fontSize: 12, color: Brand.textMuted },
  hours: { fontSize: 14, fontWeight: '700', color: Brand.primary, marginTop: 4 },
  verwerking: { marginTop: 4, fontWeight: '700', color: Brand.secondary },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  primary: {
    marginTop: 10,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  managerActions: { marginTop: 10, gap: 6 },
  actionLabel: { fontWeight: '700', fontSize: 13 },
  rowBtns: { flexDirection: 'row', gap: 8 },
  secondary: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accentBtn: { backgroundColor: Brand.accent },
  secondaryText: { color: '#fff', fontWeight: '700' },
  danger: {
    marginTop: 8,
    backgroundColor: Brand.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkBtn: { marginTop: 8, alignSelf: 'flex-start' },
});
