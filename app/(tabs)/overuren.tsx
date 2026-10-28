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
  isoWeekNumber,
  mergeWeeksWithSubmissions,
  rejectWeek,
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function OverurenScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { ready, registraties, overurenWeken, settings, saveOverurenWeek } = useAppData();
  const isManager = session?.rol === 'manager' || settings.rol === 'manager';
  const myName = session?.naam ?? settings.medewerkerNaam;

  const [showDone, setShowDone] = useState(false);
  const [filterPerson, setFilterPerson] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmSnapKey, setConfirmSnapKey] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [submitKeuze, setSubmitKeuze] = useState<VerwerkingKeuze>('TVT');
  const [rejectWeekId, setRejectWeekId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState('');

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

  const managerBase = useMemo(() => {
    return overurenWeken.filter((w) =>
      showDone
        ? ['ingediend', 'info_gevraagd', 'goedgekeurd', 'afgewezen'].includes(w.status)
        : w.status === 'ingediend',
    );
  }, [overurenWeken, showDone]);

  const medewerkersInQueue = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of managerBase) {
      counts.set(w.medewerker, (counts.get(w.medewerker) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'nl'));
  }, [managerBase]);

  const managerQueue = useMemo(() => {
    return managerBase
      .filter((w) => filterPerson === 'all' || w.medewerker === filterPerson)
      .sort((a, b) => {
        const byName = a.medewerker.localeCompare(b.medewerker, 'nl');
        if (byName !== 0) return byName;
        if (a.status === 'ingediend' && b.status !== 'ingediend') return -1;
        if (b.status === 'ingediend' && a.status !== 'ingediend') return 1;
        return b.weekStart.localeCompare(a.weekStart);
      });
  }, [managerBase, filterPerson]);

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

  const bulkAccept = async () => {
    const mgr = session?.naam ?? settings.managerNaam;
    for (const id of selected) {
      const week = overurenWeken.find((w) => w.id === id && w.status === 'ingediend');
      if (week) await saveOverurenWeek(approveWeek(week, mgr));
    }
    setSelected(new Set());
  };

  const exportWeek = (week: OverurenWeek) => {
    const rows = week.registratieIds
      .map((id) => regsById.get(id))
      .filter(Boolean) as WerkRegistratie[];
    const csv = weekToCsv(week, rows);
    const ok = downloadCsv(
      `overuren-w${isoWeekNumber(week.weekStart)}-${week.medewerker.replace(/\s+/g, '_')}.csv`,
      csv,
    );
    if (!ok) Alert.alert('Export', 'CSV-download werkt in de browser (web).');
  };

  if (isManager) {
    return (
      <Screen>
        <AppHeader
          title="Controle overuren"
          subtitle={`${session?.naam ?? 'Manager'} · ${pending} week(en) te controleren`}
        />
        <Content>
          <View style={[styles.procedure, { backgroundColor: theme.tintSoft }]}>
            <Text style={styles.procedureTitle}>Ingeleverde weken</Text>
            <Text style={[styles.procedureStep, { color: theme.text }]}>
              Medewerker heeft al TVT of uitbetalen gekozen. Jij controleert alleen:
              accepteren of afwijzen. Filter op naam of accepteer meerdere tegelijk.
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

          <View style={styles.toggleRow}>
            <Chip
              label={`Iedereen (${managerBase.length})`}
              selected={filterPerson === 'all'}
              onPress={() => setFilterPerson('all')}
            />
            {medewerkersInQueue.map(([naam, count]) => (
              <Chip
                key={naam}
                label={`${naam} (${count})`}
                selected={filterPerson === naam}
                onPress={() => setFilterPerson(naam)}
              />
            ))}
          </View>

          {selected.size > 0 ? (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selected.size} geselecteerd</Text>
              <Pressable style={styles.bulkBtn} onPress={bulkAccept}>
                <Text style={styles.bulkBtnText}>Bulk accepteren</Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={managerQueue}
            keyExtractor={(w) => w.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {showDone ? 'Nog geen ingeleverde weken' : 'Niets te controleren'}
                </Text>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Zodra een medewerker een overuren-week indient, verschijnt die hier.
                </Text>
              </View>
            }
            renderItem={({ item: week, index }) => {
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
              const prev = managerQueue[index - 1];
              const showNameHeader = !prev || prev.medewerker !== week.medewerker;
              return (
                <View style={{ gap: 8 }}>
                  {showNameHeader ? (
                    <View style={styles.personHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(week.medewerker)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personName, { color: theme.text }]}>
                          {week.medewerker}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          {
                            managerQueue.filter((w) => w.medewerker === week.medewerker)
                              .length
                          }{' '}
                          week(en) in deze lijst
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: pendingWeek ? Brand.accent : theme.border,
                      },
                      pendingWeek && styles.cardPending,
                    ]}>
                    <View style={styles.cardHead}>
                      {pendingWeek ? (
                        <Pressable
                          onPress={() => toggleSelect(week.id)}
                          style={[
                            styles.checkbox,
                            {
                              borderColor: theme.border,
                              backgroundColor: theme.surface,
                            },
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
                        <Text style={[styles.nameLine, { color: theme.text }]}>
                          {week.medewerker}
                        </Text>
                        <Text style={styles.weekNum}>
                          Week {isoWeekNumber(week.weekStart)}
                        </Text>
                        <Text style={[styles.meta, { color: theme.textMuted }]}>
                          {isoWeekLabel(week.weekStart)}
                        </Text>
                      </View>
                      <StatusBadge status={week.status} />
                    </View>

                    <Text style={styles.hours}>
                      Overuren {formatHours(summary.overurenKlok)} · keuze{' '}
                      {week.verwerking ?? '—'} · hotel {summary.hotelBinnenland}/
                      {summary.hotelBuitenland} · toelage €
                      {Math.round(summary.buitenlandToelageEuro)}
                    </Text>
                    {week.opmerking ? (
                      <Text style={[styles.note, { color: theme.text }]}>
                        Toelichting: {week.opmerking}
                      </Text>
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
                      <View
                        style={[
                          styles.detailBox,
                          { backgroundColor: theme.background },
                        ]}>
                        {rows.map((r) => (
                          <Text
                            key={r.RegistratieID}
                            style={[styles.detailLine, { color: theme.text }]}>
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
                                ),
                              )
                            }>
                            <Text style={styles.secondaryText}>Accepteren</Text>
                          </Pressable>
                          <Pressable
                            style={styles.rejectBtn}
                            onPress={() => {
                              setRejectWeekId(week.id);
                              setRejectText('');
                            }}>
                            <Text style={styles.secondaryText}>Afwijzen…</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        </Content>

        <Modal visible={!!rejectWeekId} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Week afwijzen</Text>
              <FieldInput
                value={rejectText}
                onChangeText={setRejectText}
                placeholder="Reden…"
                multiline
                style={{ minHeight: 72 }}
              />
              <View style={styles.rowBtns}>
                <Pressable
                  style={[styles.outlineBtn, { flex: 1 }]}
                  onPress={() => setRejectWeekId(null)}>
                  <Text style={styles.outlineText}>Annuleren</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectBtn, { flex: 1 }]}
                  onPress={async () => {
                    const week = overurenWeken.find((w) => w.id === rejectWeekId);
                    if (!week) return;
                    await saveOverurenWeek(
                      rejectWeek(
                        week,
                        session?.naam ?? settings.managerNaam,
                        rejectText.trim() || 'Afgewezen',
                      ),
                    );
                    setRejectWeekId(null);
                  }}>
                  <Text style={styles.secondaryText}>Afwijzen</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Overuren indienen" subtitle={`Ingelogd als ${myName}`} />
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
                · Week {isoWeekNumber(r.weekStart)} — {formatHours(r.overurenKlok)}{' '}
                overuren
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
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.weekNum}>
                      Week {isoWeekNumber(item.weekStart)}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                      {isoWeekLabel(item.weekStart)}
                    </Text>
                  </View>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.hours}>
                  Overuren {formatHours(summary.overurenKlok)} · hotel{' '}
                  {summary.hotelBinnenland + summary.hotelBuitenland} · toelage €
                  {Math.round(summary.buitenlandToelageEuro)}
                </Text>
                {sub?.verwerking ? (
                  <Text style={styles.meta}>Keuze: {sub.verwerking}</Text>
                ) : null}
                {sub ? <Timeline week={sub} /> : null}
                {sub?.afwijzingsReden ? (
                  <Text style={styles.mgrNote}>Afwijzing: {sub.afwijzingsReden}</Text>
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
                      setSubmitKeuze(sub?.verwerking ?? 'TVT');
                    }}>
                    <Text style={styles.primaryText}>
                      {status === 'concept' ? 'Week indienen' : 'Opnieuw indienen'}
                    </Text>
                  </Pressable>
                )}
                {status === 'ingediend' ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    Ingediend ({sub?.verwerking}) — wacht op acceptatie van de manager.
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      </Content>

      <Modal visible={!!confirmSnapKey} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Week indienen</Text>
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
                  <Text style={styles.weekNum}>
                    Week {isoWeekNumber(snap.weekStart)}
                  </Text>
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
                </View>
              );
            })()}

            <FieldLabel>Verwerking (jouw keuze)</FieldLabel>
            <View style={styles.keuzeRow}>
              <Chip
                label="TVT"
                selected={submitKeuze === 'TVT'}
                onPress={() => setSubmitKeuze('TVT')}
              />
              <Chip
                label="Uitbetalen"
                selected={submitKeuze === 'Uitbetaling'}
                onPress={() => setSubmitKeuze('Uitbetaling')}
              />
            </View>
            <Text style={[styles.meta, { marginBottom: 8 }]}>
              De manager accepteert of wijst af — jij bepaalt TVT of uitbetalen.
            </Text>

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
                    createSubmissionFromSnapshot(
                      snap,
                      submitNote.trim(),
                      myName,
                      submitKeuze,
                    ),
                  );
                  setConfirmSnapKey(null);
                  Alert.alert(
                    'Ingediend',
                    `Week ${isoWeekNumber(snap.weekStart)} staat bij de manager (${submitKeuze}).`,
                  );
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
                actie: `Ingediend (${week.verwerking ?? ''})`,
              }
            : null,
          week.beoordeeldOp
            ? {
                at: week.beoordeeldOp,
                door: week.beoordeeldDoor ?? 'Manager',
                actie: statusLabel(week.status),
                detail: week.afwijzingsReden ?? undefined,
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
    backgroundColor: Brand.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { textAlign: 'center', color: Brand.textMuted, lineHeight: 20 },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  personName: { fontSize: 20, fontWeight: '800' },
  nameLine: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  cardPending: { backgroundColor: 'rgba(237,125,49,0.08)' },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  checkboxOn: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  weekNum: { fontWeight: '800', fontSize: 17, color: Brand.primary },
  meta: { fontSize: 12 },
  hours: { fontSize: 14, fontWeight: '700', color: Brand.primary, marginTop: 4 },
  note: { fontStyle: 'italic', fontSize: 13 },
  mgrNote: { color: Brand.danger, fontWeight: '600', fontSize: 13 },
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
  keuzeRow: { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  secondary: {
    flex: 1,
    backgroundColor: Brand.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: Brand.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineText: { fontWeight: '700', color: Brand.primary, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalBody: { fontSize: 14, marginBottom: 4 },
});
