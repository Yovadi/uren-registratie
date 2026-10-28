import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
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
import { useAuth } from '@/context/AuthContext';
import {
  INDIEN_PROCEDURE,
  approveWeek,
  buildWeekSnapshots,
  createSubmissionFromSnapshot,
  formatHours,
  isoWeekLabel,
  mergeWeeksWithSubmissions,
  rejectWeek,
  requestWeekInfo,
  statusLabel,
  type OverurenWeekStatus,
  type VerwerkingKeuze,
  type WerkRegistratie,
} from '@/domain';
import { Brand } from '@/constants/Colors';

type ManagerFilter = 'te_beoordelen' | 'info' | 'goedgekeurd' | 'afgewezen' | 'alle';

export default function OverurenScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { ready, registraties, overurenWeken, settings, saveOverurenWeek } = useAppData();
  const isManager = session?.rol === 'manager' || settings.rol === 'manager';
  const myName = session?.naam ?? settings.medewerkerNaam;

  const [mgrFilter, setMgrFilter] = useState<ManagerFilter>('te_beoordelen');
  const [filterMedewerker, setFilterMedewerker] = useState<'all' | string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmSnapKey, setConfirmSnapKey] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [actionWeekId, setActionWeekId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'reject' | 'info' | 'gemengd' | null>(null);
  const [actionText, setActionText] = useState('');

  const snapshots = useMemo(() => {
    let rows = registraties;
    if (!isManager) {
      rows = rows.filter((r) => r.Medewerker === myName);
    } else if (filterMedewerker !== 'all') {
      rows = rows.filter((r) => r.Medewerker === filterMedewerker);
    }
    return buildWeekSnapshots(rows);
  }, [registraties, isManager, myName, filterMedewerker]);

  const weeks = useMemo(
    () => mergeWeeksWithSubmissions(snapshots, overurenWeken),
    [snapshots, overurenWeken],
  );

  const visibleWeeks = useMemo(() => {
    if (!isManager) return weeks;
    return weeks.filter((w) => {
      const st = w.submission?.status ?? 'concept';
      if (mgrFilter === 'alle') return true;
      if (mgrFilter === 'te_beoordelen') return st === 'ingediend';
      if (mgrFilter === 'info') return st === 'info_gevraagd';
      if (mgrFilter === 'goedgekeurd') return st === 'goedgekeurd';
      if (mgrFilter === 'afgewezen') return st === 'afgewezen';
      return true;
    });
  }, [weeks, isManager, mgrFilter]);

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

  const regsById = useMemo(() => {
    const m = new Map<number, WerkRegistratie>();
    for (const r of registraties) m.set(r.RegistratieID, r);
    return m;
  }, [registraties]);

  return (
    <Screen>
      <AppHeader
        title={isManager ? 'Goedkeuring overuren' : 'Overuren indienen'}
        subtitle={
          isManager
            ? `Ingelogd als ${session?.naam ?? 'manager'} · ${pending} in wachtrij`
            : `Ingelogd als ${myName} · stuur weken door naar je manager`
        }
      />
      <Content>
        {!isManager ? (
          <View style={styles.procedure}>
            <Text style={styles.procedureTitle}>Wat gebeurt er bij indienen?</Text>
            {INDIEN_PROCEDURE.map((step, i) => (
              <Text key={step} style={styles.procedureStep}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>
        ) : (
          <View style={styles.procedure}>
            <Text style={styles.procedureTitle}>Manager-opties</Text>
            <Text style={styles.procedureStep}>
              • Goedkeuren als TVT (naar ander TVT-pakket){'\n'}
              • Goedkeuren als uitbetaling (overwerktoelage){'\n'}
              • Goedkeuren gemengd (met toelichting){'\n'}
              • Meer info vragen aan de medewerker{'\n'}
              • Afwijzen met reden
            </Text>
          </View>
        )}

        {isManager ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filters}>
                {(
                  [
                    ['te_beoordelen', 'Te beoordelen'],
                    ['info', 'Info gevraagd'],
                    ['goedgekeurd', 'Goedgekeurd'],
                    ['afgewezen', 'Afgewezen'],
                    ['alle', 'Alle'],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    label={label}
                    selected={mgrFilter === id}
                    onPress={() => setMgrFilter(id)}
                  />
                ))}
              </View>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
            </ScrollView>
          </>
        ) : null}

        <FlatList
          data={visibleWeeks}
          keyExtractor={(item) => `${item.weekStart}_${item.medewerker}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 32 }}>
              {isManager
                ? 'Geen weken in deze filter.'
                : 'Geen weken met overuren voor jouw account.'}
            </Text>
          }
          renderItem={({ item }) => {
            const sub = item.submission;
            const status: OverurenWeekStatus = sub?.status ?? 'concept';
            const key = `${item.weekStart}_${item.medewerker}`;
            const open = expandedId === key;
            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{isoWeekLabel(item.weekStart)}</Text>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.meta}>{item.medewerker}</Text>
                <Text style={styles.hours}>
                  Overuren {formatHours(item.overurenKlok)} · compensabel{' '}
                  {formatHours(item.compensabeleUren)}
                </Text>
                <Text style={styles.meta}>
                  {item.registratieIds.length} registratie(s)
                  {sub?.ingediendOp
                    ? ` · ingediend ${new Date(sub.ingediendOp).toLocaleString('nl-NL')}`
                    : ''}
                </Text>

                {sub?.opmerking ? (
                  <Text style={styles.note}>Medewerker: {sub.opmerking}</Text>
                ) : null}
                {sub?.managerOpmerking ? (
                  <Text style={styles.mgrNote}>Manager: {sub.managerOpmerking}</Text>
                ) : null}
                {sub?.verwerking ? (
                  <Text style={styles.verwerking}>
                    Verwerking: {sub.verwerking}
                    {sub.verwerkingToelichting ? ` — ${sub.verwerkingToelichting}` : ''}
                  </Text>
                ) : null}
                {sub?.afwijzingsReden ? (
                  <Text style={{ color: Brand.danger, marginTop: 4 }}>
                    Afgewezen: {sub.afwijzingsReden}
                  </Text>
                ) : null}

                <Pressable onPress={() => setExpandedId(open ? null : key)} style={styles.detailToggle}>
                  <Text style={{ color: Brand.primary, fontWeight: '700' }}>
                    {open ? 'Verberg weekdetails' : 'Toon weekdetails'}
                  </Text>
                </Pressable>
                {open ? (
                  <View style={styles.detailBox}>
                    {item.registratieIds.map((id) => {
                      const r = regsById.get(id);
                      if (!r) return null;
                      return (
                        <Text key={id} style={styles.detailLine}>
                          #{id} {r.Datum} {r.Activiteit} {r.Starttijd}–{r.Eindtijd} ·{' '}
                          {formatHours(r.Uren)} · {r.Klant}
                          {r.Hotelnacht ? ' · hotel' : ''}
                        </Text>
                      );
                    })}
                  </View>
                ) : null}

                {/* Engineer submit */}
                {!isManager &&
                (status === 'concept' || status === 'afgewezen' || status === 'info_gevraagd') ? (
                  <Pressable
                    style={styles.primary}
                    onPress={() => {
                      setConfirmSnapKey(key);
                      setSubmitNote(
                        status === 'info_gevraagd'
                          ? 'Reactie op manager-vraag'
                          : status === 'afgewezen'
                            ? 'Opnieuw ingediend na correctie'
                            : '',
                      );
                    }}>
                    <Text style={styles.primaryText}>
                      {status === 'concept' ? 'Week indienen' : 'Opnieuw indienen'}
                    </Text>
                  </Pressable>
                ) : null}

                {!isManager && status === 'ingediend' ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    Ingediend — je manager ziet deze week in de wachtrij.
                  </Text>
                ) : null}

                {/* Manager actions */}
                {isManager && status === 'ingediend' && sub ? (
                  <View style={styles.managerActions}>
                    <Text style={styles.actionLabel}>Beslissing</Text>
                    <View style={styles.rowBtns}>
                      <Pressable
                        style={styles.secondary}
                        onPress={async () => {
                          await saveOverurenWeek(
                            approveWeek(sub, session?.naam ?? settings.managerNaam, 'TVT'),
                          );
                        }}>
                        <Text style={styles.secondaryText}>TVT</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.secondary, styles.accentBtn]}
                        onPress={async () => {
                          await saveOverurenWeek(
                            approveWeek(
                              sub,
                              session?.naam ?? settings.managerNaam,
                              'Uitbetaling',
                            ),
                          );
                        }}>
                        <Text style={styles.secondaryText}>Uitbetalen</Text>
                      </Pressable>
                    </View>
                    <View style={styles.rowBtns}>
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={() => {
                          setActionWeekId(sub.id);
                          setActionMode('gemengd');
                          setActionText('');
                        }}>
                        <Text style={styles.outlineText}>Gemengd…</Text>
                      </Pressable>
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={() => {
                          setActionWeekId(sub.id);
                          setActionMode('info');
                          setActionText('');
                        }}>
                        <Text style={styles.outlineText}>Info vragen…</Text>
                      </Pressable>
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={() => {
                          setActionWeekId(sub.id);
                          setActionMode('reject');
                          setActionText('');
                        }}>
                        <Text style={[styles.outlineText, { color: Brand.danger }]}>
                          Afwijzen…
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </Content>

      {/* Confirm submit modal */}
      <Modal visible={!!confirmSnapKey} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Week indienen?</Text>
            <Text style={styles.modalBody}>
              Dit is hetzelfde als je Excel-week doorsturen. De week komt in de
              wachtrij van de manager. TVT-saldo wordt níet in deze app bijgewerkt —
              alleen de goedkeuring (TVT of uitbetaling) wordt vastgelegd.
            </Text>
            <FieldLabel>Optionele toelichting</FieldLabel>
            <FieldInput
              value={submitNote}
              onChangeText={setSubmitNote}
              placeholder="Bijv. weekend storing Dubai"
            />
            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.outlineBtn, { flex: 1 }]}
                onPress={() => setConfirmSnapKey(null)}>
                <Text style={styles.outlineText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, { flex: 1, marginTop: 0 }]}
                onPress={async () => {
                  const snap = weeks.find(
                    (w) => `${w.weekStart}_${w.medewerker}` === confirmSnapKey,
                  );
                  if (!snap) return;
                  await saveOverurenWeek(
                    createSubmissionFromSnapshot(snap, submitNote.trim()),
                  );
                  setConfirmSnapKey(null);
                  if (typeof Alert !== 'undefined') {
                    Alert.alert(
                      'Ingediend',
                      'Je manager kan de week nu beoordelen onder Overuren (manager-login).',
                    );
                  }
                }}>
                <Text style={styles.primaryText}>Bevestig indienen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manager text action modal */}
      <Modal visible={!!actionMode && !!actionWeekId} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionMode === 'reject'
                ? 'Week afwijzen'
                : actionMode === 'info'
                  ? 'Meer info vragen'
                  : 'Gemengde verwerking'}
            </Text>
            <FieldLabel>
              {actionMode === 'reject'
                ? 'Reden'
                : actionMode === 'info'
                  ? 'Vraag aan medewerker'
                  : 'Toelichting (welk deel TVT / uitbetaling)'}
            </FieldLabel>
            <FieldInput
              value={actionText}
              onChangeText={setActionText}
              placeholder="Typ hier…"
              multiline
              style={{ minHeight: 72 }}
            />
            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.outlineBtn, { flex: 1 }]}
                onPress={() => {
                  setActionMode(null);
                  setActionWeekId(null);
                }}>
                <Text style={styles.outlineText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primary,
                  { flex: 1, marginTop: 0 },
                  actionMode === 'reject' && { backgroundColor: Brand.danger },
                ]}
                onPress={async () => {
                  const week = overurenWeken.find((w) => w.id === actionWeekId);
                  if (!week) return;
                  const mgr = session?.naam ?? settings.managerNaam;
                  if (actionMode === 'reject') {
                    await saveOverurenWeek(
                      rejectWeek(week, mgr, actionText.trim() || 'Afgewezen'),
                    );
                  } else if (actionMode === 'info') {
                    await saveOverurenWeek(
                      requestWeekInfo(week, mgr, actionText.trim() || 'Graag toelichting'),
                    );
                  } else if (actionMode === 'gemengd') {
                    await saveOverurenWeek(
                      approveWeek(
                        week,
                        mgr,
                        'Gemengd',
                        actionText.trim() || 'Deels TVT, deels uitbetaling',
                      ),
                    );
                  }
                  setActionMode(null);
                  setActionWeekId(null);
                  setActionText('');
                }}>
                <Text style={styles.primaryText}>Bevestigen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatusBadge({ status }: { status: OverurenWeekStatus }) {
  const colors: Record<OverurenWeekStatus, string> = {
    concept: Brand.textMuted,
    ingediend: Brand.accent,
    info_gevraagd: Brand.primary,
    goedgekeurd: Brand.secondary,
    afgewezen: Brand.danger,
  };
  const bg = colors[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${bg}22`, borderColor: bg }]}>
      <Text style={{ color: bg, fontSize: 11, fontWeight: '800' }}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  procedure: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.08)',
    gap: 4,
  },
  procedureTitle: { fontWeight: '800', marginBottom: 4 },
  procedureStep: { fontSize: 13, lineHeight: 18, color: Brand.text },
  filterScroll: { marginTop: 8 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  note: { marginTop: 4, fontSize: 13, fontStyle: 'italic' },
  mgrNote: { marginTop: 4, fontSize: 13, color: Brand.primary, fontWeight: '600' },
  verwerking: { marginTop: 4, fontWeight: '700', color: Brand.secondary },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailToggle: { marginTop: 8 },
  detailBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Brand.background,
    gap: 4,
  },
  detailLine: { fontSize: 12, color: Brand.text },
  primary: {
    marginTop: 10,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  managerActions: { marginTop: 10, gap: 8 },
  actionLabel: { fontWeight: '700', fontSize: 13 },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondary: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accentBtn: { backgroundColor: Brand.accent },
  secondaryText: { color: '#fff', fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineText: { fontWeight: '700', color: Brand.primary, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalBody: { fontSize: 14, lineHeight: 20, color: Brand.textMuted, marginBottom: 8 },
});
