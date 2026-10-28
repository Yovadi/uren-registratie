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
  type OverurenWeek,
  type OverurenWeekStatus,
  type WerkRegistratie,
} from '@/domain';
import { Brand } from '@/constants/Colors';

type TeamGroup = {
  medewerker: string;
  teControleren: OverurenWeek[];
  afgehandeld: OverurenWeek[];
};

export default function OverurenScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { ready, registraties, overurenWeken, settings, saveOverurenWeek } = useAppData();
  const isManager = session?.rol === 'manager' || settings.rol === 'manager';
  const myName = session?.naam ?? settings.medewerkerNaam;

  const [showAfgehandeld, setShowAfgehandeld] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [confirmSnapKey, setConfirmSnapKey] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [actionWeekId, setActionWeekId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'reject' | 'info' | 'gemengd' | null>(null);
  const [actionText, setActionText] = useState('');

  /** Engineer: snapshots of own overtime weeks (incl. not yet submitted). */
  const engineerWeeks = useMemo(() => {
    const rows = registraties.filter((r) => r.Medewerker === myName);
    const snaps = buildWeekSnapshots(rows);
    return mergeWeeksWithSubmissions(snaps, overurenWeken);
  }, [registraties, overurenWeken, myName]);

  /**
   * Manager: only weeks that were actually submitted, grouped per team member.
   * Default focus = still need review (ingediend).
   */
  const teamGroups: TeamGroup[] = useMemo(() => {
    const submitted = overurenWeken.filter((w) =>
      ['ingediend', 'info_gevraagd', 'goedgekeurd', 'afgewezen'].includes(w.status),
    );
    const byMember = new Map<string, OverurenWeek[]>();
    for (const w of submitted) {
      const list = byMember.get(w.medewerker) ?? [];
      list.push(w);
      byMember.set(w.medewerker, list);
    }
    return [...byMember.entries()]
      .map(([medewerker, weeks]) => {
        const sorted = [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
        return {
          medewerker,
          teControleren: sorted.filter((w) => w.status === 'ingediend'),
          afgehandeld: sorted.filter((w) => w.status !== 'ingediend'),
        };
      })
      .filter((g) => g.teControleren.length > 0 || g.afgehandeld.length > 0)
      .sort((a, b) => {
        // Members with pending review first
        if (a.teControleren.length !== b.teControleren.length) {
          return b.teControleren.length - a.teControleren.length;
        }
        return a.medewerker.localeCompare(b.medewerker, 'nl');
      });
  }, [overurenWeken]);

  const pendingCount = useMemo(
    () => overurenWeken.filter((w) => w.status === 'ingediend').length,
    [overurenWeken],
  );

  const membersWithPending = useMemo(
    () => teamGroups.filter((g) => g.teControleren.length > 0).length,
    [teamGroups],
  );

  const regsById = useMemo(() => {
    const m = new Map<number, WerkRegistratie>();
    for (const r of registraties) m.set(r.RegistratieID, r);
    return m;
  }, [registraties]);

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  if (isManager) {
    return (
      <Screen>
        <AppHeader
          title="Controle overuren"
          subtitle={`${session?.naam ?? 'Manager'} · ${pendingCount} week(en) te controleren bij ${membersWithPending} teamlid(leden)`}
        />
        <Content>
          <View style={styles.procedure}>
            <Text style={styles.procedureTitle}>Per teamlid</Text>
            <Text style={styles.procedureStep}>
              Je ziet alleen weken die medewerkers hebben ingeleverd. Open een
              teamlid om de weken te controleren die nog openstaan.
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <Chip
              label="Alleen te controleren"
              selected={!showAfgehandeld}
              onPress={() => setShowAfgehandeld(false)}
            />
            <Chip
              label="Ook afgehandeld tonen"
              selected={showAfgehandeld}
              onPress={() => setShowAfgehandeld(true)}
            />
          </View>

          <FlatList
            data={
              showAfgehandeld
                ? teamGroups
                : teamGroups.filter((g) => g.teControleren.length > 0)
            }
            keyExtractor={(g) => g.medewerker}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 40 }}>
                {showAfgehandeld
                  ? 'Nog geen ingeleverde weken.'
                  : 'Geen weken die nu gecontroleerd moeten worden.'}
              </Text>
            }
            renderItem={({ item: group }) => {
              const open = expandedMember === group.medewerker;
              const weeksToShow = showAfgehandeld
                ? [...group.teControleren, ...group.afgehandeld]
                : group.teControleren;
              return (
                <View style={styles.memberCard}>
                  <Pressable
                    onPress={() =>
                      setExpandedMember(open ? null : group.medewerker)
                    }
                    style={styles.memberHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{group.medewerker}</Text>
                      <Text style={styles.meta}>
                        {group.teControleren.length > 0
                          ? `${group.teControleren.length} week(en) te controleren`
                          : 'Niets openstaand'}
                        {showAfgehandeld && group.afgehandeld.length > 0
                          ? ` · ${group.afgehandeld.length} afgehandeld`
                          : ''}
                      </Text>
                    </View>
                    {group.teControleren.length > 0 ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {group.teControleren.length}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
                  </Pressable>

                  {open
                    ? weeksToShow.map((week) => (
                        <ManagerWeekCard
                          key={week.id}
                          week={week}
                          regsById={regsById}
                          expanded={expandedWeekId === week.id}
                          onToggleExpand={() =>
                            setExpandedWeekId(
                              expandedWeekId === week.id ? null : week.id,
                            )
                          }
                          onApprove={async (verwerking) => {
                            await saveOverurenWeek(
                              approveWeek(
                                week,
                                session?.naam ?? settings.managerNaam,
                                verwerking,
                              ),
                            );
                          }}
                          onOpenAction={(mode) => {
                            setActionWeekId(week.id);
                            setActionMode(mode);
                            setActionText('');
                          }}
                        />
                      ))
                    : null}
                </View>
              );
            }}
          />
        </Content>

        <ManagerActionModal
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
                requestWeekInfo(
                  week,
                  mgr,
                  actionText.trim() || 'Graag toelichting',
                ),
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
          }}
        />
      </Screen>
    );
  }

  // ——— Engineer view ———
  return (
    <Screen>
      <AppHeader
        title="Overuren indienen"
        subtitle={`Ingelogd als ${myName} · stuur weken door naar je manager`}
      />
      <Content>
        <View style={styles.procedure}>
          <Text style={styles.procedureTitle}>Wat gebeurt er bij indienen?</Text>
          {INDIEN_PROCEDURE.map((step, i) => (
            <Text key={step} style={styles.procedureStep}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        <FlatList
          data={engineerWeeks}
          keyExtractor={(item) => `${item.weekStart}_${item.medewerker}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 32 }}>
              Geen weken met overuren voor jouw account.
            </Text>
          }
          renderItem={({ item }) => {
            const sub = item.submission;
            const status: OverurenWeekStatus = sub?.status ?? 'concept';
            const key = `${item.weekStart}_${item.medewerker}`;
            return (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{isoWeekLabel(item.weekStart)}</Text>
                  <StatusBadge status={status} />
                </View>
                <Text style={styles.hours}>
                  Overuren {formatHours(item.overurenKlok)} · compensabel{' '}
                  {formatHours(item.compensabeleUren)}
                </Text>
                <Text style={styles.meta}>
                  {item.registratieIds.length} registratie(s)
                </Text>
                {sub?.managerOpmerking ? (
                  <Text style={styles.mgrNote}>Manager: {sub.managerOpmerking}</Text>
                ) : null}
                {sub?.afwijzingsReden ? (
                  <Text style={{ color: Brand.danger, marginTop: 4 }}>
                    Afgewezen: {sub.afwijzingsReden}
                  </Text>
                ) : null}
                {sub?.verwerking ? (
                  <Text style={styles.verwerking}>Verwerking: {sub.verwerking}</Text>
                ) : null}

                {(status === 'concept' ||
                  status === 'afgewezen' ||
                  status === 'info_gevraagd') && (
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
                )}
                {status === 'ingediend' ? (
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    Ingediend — je manager ziet deze week bij jouw naam in de
                    controlijst.
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
            <Text style={styles.modalTitle}>Week indienen?</Text>
            <Text style={styles.modalBody}>
              Je manager ziet deze week onder jouw naam als “te controleren”.
              TVT-saldo wordt niet in deze app bijgewerkt.
            </Text>
            <FieldLabel>Optionele toelichting</FieldLabel>
            <FieldInput
              value={submitNote}
              onChangeText={setSubmitNote}
              placeholder="Bijv. weekend storing"
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
                  const snap = engineerWeeks.find(
                    (w) => `${w.weekStart}_${w.medewerker}` === confirmSnapKey,
                  );
                  if (!snap) return;
                  await saveOverurenWeek(
                    createSubmissionFromSnapshot(snap, submitNote.trim()),
                  );
                  setConfirmSnapKey(null);
                  Alert.alert(
                    'Ingediend',
                    'Je manager ziet de week nu per teamlid in de controlijst.',
                  );
                }}>
                <Text style={styles.primaryText}>Bevestig indienen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ManagerWeekCard({
  week,
  regsById,
  expanded,
  onToggleExpand,
  onApprove,
  onOpenAction,
}: {
  week: OverurenWeek;
  regsById: Map<number, WerkRegistratie>;
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove: (v: 'TVT' | 'Uitbetaling') => Promise<void>;
  onOpenAction: (mode: 'reject' | 'info' | 'gemengd') => void;
}) {
  const needsReview = week.status === 'ingediend';
  return (
    <View style={[styles.weekCard, needsReview && styles.weekCardPending]}>
      <View style={styles.cardHead}>
        <Text style={styles.title}>{isoWeekLabel(week.weekStart)}</Text>
        <StatusBadge status={week.status} />
      </View>
      <Text style={styles.hours}>
        Overuren {formatHours(week.overurenKlok)} · compensabel{' '}
        {formatHours(week.compensabeleUren)}
      </Text>
      <Text style={styles.meta}>
        Ingeleverd{' '}
        {week.ingediendOp
          ? new Date(week.ingediendOp).toLocaleString('nl-NL')
          : '—'}{' '}
        · {week.registratieIds.length} registratie(s)
      </Text>
      {week.opmerking ? (
        <Text style={styles.note}>Toelichting: {week.opmerking}</Text>
      ) : null}
      {week.verwerking ? (
        <Text style={styles.verwerking}>Verwerking: {week.verwerking}</Text>
      ) : null}

      <Pressable onPress={onToggleExpand} style={styles.detailToggle}>
        <Text style={{ color: Brand.primary, fontWeight: '700' }}>
          {expanded ? 'Verberg registraties' : 'Toon registraties'}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.detailBox}>
          {week.registratieIds.map((id) => {
            const r = regsById.get(id);
            if (!r) return null;
            return (
              <Text key={id} style={styles.detailLine}>
                #{id} {r.Datum} {r.Activiteit} {r.Starttijd}–{r.Eindtijd} ·{' '}
                {formatHours(r.Uren)} · {r.Klant}
              </Text>
            );
          })}
        </View>
      ) : null}

      {needsReview ? (
        <View style={styles.managerActions}>
          <Text style={styles.actionLabel}>Controle afronden</Text>
          <View style={styles.rowBtns}>
            <Pressable style={styles.secondary} onPress={() => onApprove('TVT')}>
              <Text style={styles.secondaryText}>TVT</Text>
            </Pressable>
            <Pressable
              style={[styles.secondary, styles.accentBtn]}
              onPress={() => onApprove('Uitbetaling')}>
              <Text style={styles.secondaryText}>Uitbetalen</Text>
            </Pressable>
          </View>
          <View style={styles.rowBtns}>
            <Pressable style={styles.outlineBtn} onPress={() => onOpenAction('gemengd')}>
              <Text style={styles.outlineText}>Gemengd…</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => onOpenAction('info')}>
              <Text style={styles.outlineText}>Info…</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => onOpenAction('reject')}>
              <Text style={[styles.outlineText, { color: Brand.danger }]}>Afwijzen…</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ManagerActionModal({
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
                : 'Toelichting'}
          </FieldLabel>
          <FieldInput
            value={actionText}
            onChangeText={setActionText}
            placeholder="Typ hier…"
            multiline
            style={{ minHeight: 72 }}
          />
          <View style={styles.rowBtns}>
            <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={onCancel}>
              <Text style={styles.outlineText}>Annuleren</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primary,
                { flex: 1, marginTop: 0 },
                actionMode === 'reject' && { backgroundColor: Brand.danger },
              ]}
              onPress={onConfirm}>
              <Text style={styles.primaryText}>Bevestigen</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  memberCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  memberHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  memberName: { fontSize: 16, fontWeight: '800' },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { color: '#fff', fontWeight: '800' },
  chevron: { fontSize: 18, color: Brand.textMuted, width: 20 },
  weekCard: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    padding: 14,
    gap: 4,
    backgroundColor: Brand.background,
  },
  weekCardPending: {
    backgroundColor: 'rgba(237,125,49,0.06)',
  },
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
    backgroundColor: '#fff',
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
