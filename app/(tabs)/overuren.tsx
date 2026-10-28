import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { useAuth } from '@/context/AuthContext';
import {
  INDIEN_PROCEDURE,
  approveWeek,
  buildWeekSnapshots,
  createSubmissionFromSnapshot,
  downloadCsv,
  formatHours,
  isoWeekLabel,
  mergeWeeksWithSubmissions,
  rejectWeek,
  requestWeekInfo,
  statusLabel,
  summarizeWeekRows,
  unsubmittedPastWeeks,
  weekToCsv,
  type OverurenWeek,
  type OverurenWeekStatus,
  type VerwerkingKeuze,
  type WerkRegistratie,
} from '@/domain';
import { Brand } from '@/constants/Colors';

export default function OverurenScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { ready, registraties, overurenWeken, settings, saveOverurenWeek } = useAppData();
  const isManager = session?.rol === 'manager' || settings.rol === 'manager';
  const myName = session?.naam ?? settings.medewerkerNaam;

  const [showDone, setShowDone] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmSnapKey, setConfirmSnapKey] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [actionWeekId, setActionWeekId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'reject' | 'info' | 'gemengd' | null>(null);
  const [actionText, setActionText] = useState('');

  const regsById = useMemo(() => {
    const m = new Map<number, WerkRegistratie>();
    for (const r of registraties) m.set(r.RegistratieID, r);
    return m;
  }, [registraties]);

  const engineerSnaps = useMemo(() => {
    const rows = registraties.filter((r) => r.Medewerker === myName);
    return mergeWeeksWithSubmissions(buildWeekSnapshots(rows), overurenWeken);
  }, [registraties, overurenWeken, myName]);

  const reminders = useMemo(
    () =>
      unsubmittedPastWeeks(
        buildWeekSnapshots(registraties.filter((r) => r.Medewerker === myName)),
        overurenWeken,
      ),
    [registraties, overurenWeken, myName],
  );

  /** Manager: flat list of submitted weeks only */
  const managerQueue = useMemo(() => {
    const list = overurenWeken
      .filter((w) =>
        showDone
          ? ['ingediend', 'info_gevraagd', 'goedgekeurd', 'afgewezen'].includes(w.status)
          : w.status === 'ingediend',
      )
      .sort((a, b) => {
        if (a.status === 'ingediend' && b.status !== 'ingediend') return -1;
        if (b.status === 'ingediend' && a.status !== 'ingediend') return 1;
        return b.weekStart.localeCompare(a.weekStart);
      });
    return list;
  }, [overurenWeken, showDone]);

  const pending = overurenWeken.filter((w) => w.status === 'ingediend').length;

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkApprove = async (verwerking: VerwerkingKeuze) => {
    const mgr = session?.naam ?? settings.managerNaam;
    const ids = [...selected];
    for (const id of ids) {
      const week = overurenWeken.find((w) => w.id === id && w.status === 'ingediend');
      if (week) await saveOverurenWeek(approveWeek(week, mgr, verwerking));
    }
    setSelected(new Set());
  };

  const exportWeek = (week: OverurenWeek) => {
    const rows = week.registratieIds
      .map((id) => regsById.get(id))
      .filter(Boolean) as WerkRegistratie[];
    const csv = weekToCsv(week, rows);
    const ok = downloadCsv(
      `overuren-${week.medewerker.replace(/\s+/g, '_')}-${week.weekStart}.csv`,
      csv,
    );
    if (!ok) Alert.alert('Export', 'CSV-download werkt in de browser (web).');
  };

  // ——— Manager ———
  if (isManager) {
    return (
      <Screen>
        <AppHeader
          title="Controle overuren"
          subtitle={`${session?.naam ?? 'Manager'} · ${pending} week(en) te controleren`}
        />
        <Content>
          <View style={styles.procedure}>
            <Text style={styles.procedureTitle}>Ingeleverde weken</Text>
            <Text style={styles.procedureStep}>
              Alleen weken die medewerkers hebben ingediend. Selecteer meerdere voor
              bulk-goedkeuring (TVT of uitbetalen).
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <Chip
              label="Te controleren"
              selected={!showDone}
              onPress={() => setShowDone(false)}
            />
            <Chip
              label="Inclusief afgehandeld"
              selected={showDone}
              onPress={() => setShowDone(true)}
            />
          </View>

          {selected.size > 0 ? (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selected.size} geselecteerd</Text>
              <Pressable style={styles.bulkBtn} onPress={() => bulkApprove('TVT')}>
                <Text style={styles.bulkBtnText}>Bulk TVT</Text>
              </Pressable>
              <Pressable
                style={[styles.bulkBtn, { backgroundColor: Brand.accent }]}
                onPress={() => bulkApprove('Uitbetaling')}>
                <Text style={styles.bulkBtnText}>Bulk uitbetalen</Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={managerQueue}
            keyExtractor={(w) => w.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {showDone ? 'Nog geen ingeleverde weken' : 'Niets te controleren'}
                </Text>
                <Text style={styles.emptyBody}>
                  Zodra een medewerker een overuren-week indient, verschijnt die hier.
                </Text>
              </View>
            }
            renderItem={({ item: week }) => {
              const rows = week.registratieIds
                .map((id) => regsById.get(id))
                .filter(Boolean) as WerkRegistratie[];
              const summary = summarizeWeekRows(
                rows,
                week.overurenKlok,
                settings.defaultLand,
                settings.buitenlandToelagePerDag,
              );
              const open = expandedId === week.id;
              const pendingWeek = week.status === 'ingediend';
              return (
                <View style={[styles.card, pendingWeek && styles.cardPending]}>
                  <View style={styles.cardHead}>
                    {pendingWeek ? (
                      <Pressable
                        onPress={() => toggleSelect(week.id)}
                        style={[
                          styles.checkbox,
                          selected.has(week.id) && styles.checkboxOn,
                        ]}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>
                          {selected.has(week.id) ? '✓' : ''}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={{ width: 28 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{isoWeekLabel(week.weekStart)}</Text>
                      <Text style={styles.meta}>{week.medewerker}</Text>
                    </View>
                    <StatusBadge status={week.status} />
                  </View>

                  <Text style={styles.hours}>
                    Overuren {formatHours(summary.overurenKlok)} · hotel in/uit{' '}
                    {summary.hotelBinnenland}/{summary.hotelBuitenland} · toelage €
                    {Math.round(summary.buitenlandToelageEuro)}
                  </Text>
                  {week.opmerking ? (
                    <Text style={styles.note}>Toelichting: {week.opmerking}</Text>
                  ) : null}

                  <Timeline week={week} />

                  <View style={styles.rowBtns}>
                    <Pressable onPress={() => setExpandedId(open ? null : week.id)}>
                      <Text style={styles.link}>
                        {open ? 'Verberg details' : 'Details / registraties'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => exportWeek(week)}>
                      <Text style={styles.link}>Export CSV</Text>
                    </Pressable>
                  </View>

                  {open ? (
                    <View style={styles.detailBox}>
                      {rows.map((r) => (
                        <Text key={r.RegistratieID} style={styles.detailLine}>
                          #{r.RegistratieID} {r.Datum} {r.Activiteit} {r.Starttijd}–
                          {r.Eindtijd} · {formatHours(r.Uren)} · {r.Klant}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {pendingWeek ? (
                    <View style={styles.managerActions}>
                      <View style={styles.rowBtns}>
                        <Pressable
                          style={styles.secondary}
                          onPress={() =>
                            saveOverurenWeek(
                              approveWeek(
                                week,
                                session?.naam ?? settings.managerNaam,
                                'TVT',
                              ),
                            )
                          }>
                          <Text style={styles.secondaryText}>TVT</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.secondary, styles.accentBtn]}
                          onPress={() =>
                            saveOverurenWeek(
                              approveWeek(
                                week,
                                session?.naam ?? settings.managerNaam,
                                'Uitbetaling',
                              ),
                            )
                          }>
                          <Text style={styles.secondaryText}>Uitbetalen</Text>
                        </Pressable>
                      </View>
                      <View style={styles.rowBtns}>
                        <Pressable
                          style={styles.outlineBtn}
                          onPress={() => {
                            setActionWeekId(week.id);
                            setActionMode('gemengd');
                            setActionText('');
                          }}>
                          <Text style={styles.outlineText}>Gemengd…</Text>
                        </Pressable>
                        <Pressable
                          style={styles.outlineBtn}
                          onPress={() => {
                            setActionWeekId(week.id);
                            setActionMode('info');
                            setActionText('');
                          }}>
                          <Text style={styles.outlineText}>Info…</Text>
                        </Pressable>
                        <Pressable
                          style={styles.outlineBtn}
                          onPress={() => {
                            setActionWeekId(week.id);
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
        <ActionModal
          actionMode={actionMode}
          actionText={actionText}
          setActionText={setActionText}
          onCancel={() => {
            setActionMode(null);
            setActionWeekId(null);
          }}
          onConfirm={async () => {
            const week = overurenWeken.find((w) => w.id === actionWeekId);
            if (!week || !actionMode) return;
            const mgr = session?.naam ?? settings.managerNaam;
            if (actionMode === 'reject') {
              await saveOverurenWeek(
                rejectWeek(week, mgr, actionText.trim() || 'Afgewezen'),
              );
            } else if (actionMode === 'info') {
              await saveOverurenWeek(
                requestWeekInfo(week, mgr, actionText.trim() || 'Graag toelichting'),
              );
            } else {
              await saveOverurenWeek(
                approveWeek(
                  week,
                  mgr,
                  'Gemengd',
                  actionText.trim() || 'Deels TVT / deels uitbetaling',
                ),
              );
            }
            setActionMode(null);
            setActionWeekId(null);
          }}
        />
      </Screen>
    );
  }

  // ——— Engineer ———
  return (
    <Screen>
      <AppHeader
        title="Overuren indienen"
        subtitle={`Ingelogd als ${myName}`}
      />
      <Content>
        <View style={styles.procedure}>
          <Text style={styles.procedureTitle}>Procedure</Text>
          {INDIEN_PROCEDURE.map((step, i) => (
            <Text key={step} style={styles.procedureStep}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        {reminders.length > 0 ? (
          <View style={styles.reminder}>
            <Text style={styles.reminderTitle}>
              Herinnering: {reminders.length} afgelopen week(en) met overuren nog niet
              ingediend
            </Text>
            {reminders.slice(0, 3).map((r) => (
              <Text key={r.weekStart} style={styles.reminderLine}>
                · {isoWeekLabel(r.weekStart)} — {formatHours(r.overurenKlok)} overuren
              </Text>
            ))}
          </View>
        ) : null}

        <FlatList
          data={engineerSnaps}
          keyExtractor={(i) => `${i.weekStart}_${i.medewerker}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Geen overuren-weken</Text>
              <Text style={styles.emptyBody}>
                Weken verschijnen hier zodra je registraties hebt die boven de 8-uursnorm
                (of weekend) uitkomen.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sub = item.submission;
            const status: OverurenWeekStatus = sub?.status ?? 'concept';
            const key = `${item.weekStart}_${item.medewerker}`;
            const rows = item.registratieIds
              .map((id) => regsById.get(id))
              .filter(Boolean) as WerkRegistratie[];
            const summary = summarizeWeekRows(
              rows,
              item.overurenKlok,
              settings.defaultLand,
              settings.buitenlandToelagePerDag,
            );
            const open = expandedId === key;
            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{isoWeekLabel(item.weekStart)}</Text>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.hours}>
                  Overuren {formatHours(summary.overurenKlok)} · hotel{' '}
                  {summary.hotelBinnenland + summary.hotelBuitenland} · toelage €
                  {Math.round(summary.buitenlandToelageEuro)}
                </Text>
                {sub ? <Timeline week={sub} /> : null}
                {sub?.managerOpmerking ? (
                  <Text style={styles.mgrNote}>Manager: {sub.managerOpmerking}</Text>
                ) : null}

                <View style={styles.rowBtns}>
                  <Pressable onPress={() => setExpandedId(open ? null : key)}>
                    <Text style={styles.link}>{open ? 'Verberg' : 'Samenvatting'}</Text>
                  </Pressable>
                  {sub ? (
                    <Pressable onPress={() => exportWeek(sub)}>
                      <Text style={styles.link}>Export CSV</Text>
                    </Pressable>
                  ) : null}
                </View>
                {open ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLine}>
                      Registraties: {summary.registratieCount} · Totaal uren:{' '}
                      {formatHours(summary.urenTotaal)}
                    </Text>
                    <Text style={styles.detailLine}>
                      Hotel binnenland: {summary.hotelBinnenland} · buitenland:{' '}
                      {summary.hotelBuitenland}
                    </Text>
                    <Text style={styles.detailLine}>
                      Buitenland-dagen: {summary.buitenlandDagen} · toelage €
                      {Math.round(summary.buitenlandToelageEuro)}
                    </Text>
                  </View>
                ) : null}

                {(status === 'concept' ||
                  status === 'afgewezen' ||
                  status === 'info_gevraagd') && (
                  <Pressable
                    style={styles.primary}
                    onPress={() => {
                      setConfirmSnapKey(key);
                      setSubmitNote('');
                    }}>
                    <Text style={styles.primaryText}>
                      {status === 'concept' ? 'Week indienen' : 'Opnieuw indienen'}
                    </Text>
                  </Pressable>
                )}
                {status === 'ingediend' ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    Ingediend — staat bij de manager in de controlijst.
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      </Content>

      <Modal visible={!!confirmSnapKey} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Week indienen — samenvatting</Text>
            {(() => {
              const snap = engineerSnaps.find(
                (w) => `${w.weekStart}_${w.medewerker}` === confirmSnapKey,
              );
              if (!snap) return null;
              const rows = snap.registratieIds
                .map((id) => regsById.get(id))
                .filter(Boolean) as WerkRegistratie[];
              const s = summarizeWeekRows(
                rows,
                snap.overurenKlok,
                settings.defaultLand,
                settings.buitenlandToelagePerDag,
              );
              return (
                <View style={{ gap: 4, marginBottom: 10 }}>
                  <Text style={styles.modalBody}>{isoWeekLabel(snap.weekStart)}</Text>
                  <Text style={styles.detailLine}>
                    Overuren: {formatHours(s.overurenKlok)}
                  </Text>
                  <Text style={styles.detailLine}>
                    Hotelnachten binnen/buiten: {s.hotelBinnenland}/{s.hotelBuitenland}
                  </Text>
                  <Text style={styles.detailLine}>
                    Buitenlandtoelage: €{Math.round(s.buitenlandToelageEuro)} (
                    {s.buitenlandDagen} dagen)
                  </Text>
                  <Text style={styles.detailLine}>
                    {s.registratieCount} registraties · {formatHours(s.urenTotaal)} totaal
                  </Text>
                </View>
              );
            })()}
            <FieldLabel>Optionele toelichting</FieldLabel>
            <FieldInput value={submitNote} onChangeText={setSubmitNote} />
            <View style={styles.rowBtns}>
              <Pressable
                style={[styles.outlineBtn, { flex: 1 }]}
                onPress={() => setConfirmSnapKey(null)}>
                <Text style={styles.outlineText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, { flex: 1, marginTop: 0 }]}
                onPress={async () => {
                  const snap = engineerSnaps.find(
                    (w) => `${w.weekStart}_${w.medewerker}` === confirmSnapKey,
                  );
                  if (!snap) return;
                  await saveOverurenWeek(
                    createSubmissionFromSnapshot(snap, submitNote.trim(), myName),
                  );
                  setConfirmSnapKey(null);
                  Alert.alert('Ingediend', 'De manager ziet je week nu in de controlijst.');
                }}>
                <Text style={styles.primaryText}>Bevestig</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Timeline({ week }: { week: OverurenWeek }) {
  const events =
    week.audit?.length > 0
      ? week.audit
      : [
          week.ingediendOp
            ? {
                at: week.ingediendOp,
                door: week.medewerker,
                actie: 'Ingediend',
              }
            : null,
          week.beoordeeldOp
            ? {
                at: week.beoordeeldOp,
                door: week.beoordeeldDoor ?? 'Manager',
                actie: statusLabel(week.status),
                detail: week.afwijzingsReden ?? week.managerOpmerking ?? undefined,
              }
            : null,
        ].filter(Boolean);
  if (!events.length) return null;
  return (
    <View style={styles.timeline}>
      {events.map((e, i) =>
        e ? (
          <Text key={`${e.at}-${i}`} style={styles.timelineLine}>
            {new Date(e.at).toLocaleString('nl-NL')} — {e.actie}
            {e.door ? ` (${e.door})` : ''}
            {e.detail ? `: ${e.detail}` : ''}
          </Text>
        ) : null,
      )}
    </View>
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

function ActionModal({
  actionMode,
  actionText,
  setActionText,
  onCancel,
  onConfirm,
}: {
  actionMode: 'reject' | 'info' | 'gemengd' | null;
  actionText: string;
  setActionText: (t: string) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Modal visible={!!actionMode} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {actionMode === 'reject'
              ? 'Afwijzen'
              : actionMode === 'info'
                ? 'Info vragen'
                : 'Gemengd'}
          </Text>
          <FieldInput
            value={actionText}
            onChangeText={setActionText}
            placeholder="Toelichting…"
            multiline
            style={{ minHeight: 72 }}
          />
          <View style={styles.rowBtns}>
            <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={onCancel}>
              <Text style={styles.outlineText}>Annuleren</Text>
            </Pressable>
            <Pressable
              style={[styles.primary, { flex: 1, marginTop: 0 }]}
              onPress={onConfirm}>
              <Text style={styles.primaryText}>Bevestigen</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  procedureTitle: { fontWeight: '800' },
  procedureStep: { fontSize: 13, lineHeight: 18 },
  reminder: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(237,125,49,0.15)',
  },
  reminderTitle: { fontWeight: '800', marginBottom: 4 },
  reminderLine: { fontSize: 13 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    backgroundColor: Brand.header,
    borderRadius: 10,
  },
  bulkText: { color: '#fff', fontWeight: '700', flex: 1 },
  bulkBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { textAlign: 'center', color: Brand.textMuted, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardPending: { borderColor: Brand.accent, backgroundColor: 'rgba(237,125,49,0.05)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  title: { fontWeight: '800', fontSize: 15 },
  meta: { fontSize: 12, color: Brand.textMuted },
  hours: { fontSize: 14, fontWeight: '700', color: Brand.primary, marginTop: 4 },
  note: { fontStyle: 'italic', fontSize: 13 },
  mgrNote: { color: Brand.primary, fontWeight: '600', fontSize: 13 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeline: { marginTop: 6, gap: 2 },
  timelineLine: { fontSize: 11, color: Brand.textMuted },
  link: { color: Brand.primary, fontWeight: '700', fontSize: 13 },
  detailBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Brand.background,
    gap: 4,
  },
  detailLine: { fontSize: 12 },
  primary: {
    marginTop: 10,
    backgroundColor: Brand.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  managerActions: { marginTop: 10, gap: 8 },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
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
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalBody: { fontSize: 14, color: Brand.textMuted, marginBottom: 4 },
});
