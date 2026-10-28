import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text, View as ThemedView } from '@/components/Themed';
import { useAppData } from '@/context/AppDataContext';
import { COMMON_TIME_ZONES, detectDeviceTimeZone, type AppSettings } from '@/domain';

export default function SettingsScreen() {
  const { ready, settings, saveSettings } = useAppData();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const onSave = async () => {
    setBusy(true);
    try {
      await saveSettings(draft);
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Instellingen</Text>
        <Text style={styles.sub}>
          Thuis-tijdzone en standaard werkuren voor overurenberekening. Solo-device; sync komt
          later achter dezelfde storage-interface.
        </Text>

        <Text style={styles.label}>Thuis-tijdzone</Text>
        <View style={styles.chipWrap}>
          {COMMON_TIME_ZONES.map((z) => {
            const selected = draft.homeTimeZone === z.id;
            return (
              <Pressable
                key={z.id}
                onPress={() => setDraft((d) => ({ ...d, homeTimeZone: z.id }))}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {z.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() =>
            setDraft((d) => ({ ...d, homeTimeZone: detectDeviceTimeZone() }))
          }>
          <Text style={styles.link}>Gebruik apparaat-tijdzone ({detectDeviceTimeZone()})</Text>
        </Pressable>

        <Text style={[styles.label, styles.spaced]}>Uren per dag</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={String(draft.workRules.hoursPerDay)}
          onChangeText={(t) => {
            const n = Number(t.replace(',', '.'));
            if (!Number.isFinite(n)) return;
            setDraft((d) => ({
              ...d,
              workRules: { ...d.workRules, hoursPerDay: n },
            }));
          }}
        />

        <Text style={styles.label}>Uren per week</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={String(draft.workRules.hoursPerWeek)}
          onChangeText={(t) => {
            const n = Number(t.replace(',', '.'));
            if (!Number.isFinite(n)) return;
            setDraft((d) => ({
              ...d,
              workRules: { ...d.workRules, hoursPerWeek: n },
            }));
          }}
        />

        <Pressable
          style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={busy}>
          <Text style={styles.saveBtnText}>{busy ? 'Opslaan…' : 'Opslaan'}</Text>
        </Pressable>
        {savedAt ? <Text style={styles.saved}>Opgeslagen om {savedAt}</Text> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingBottom: 48, gap: 8 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.65, lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  spaced: { marginTop: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  chipSelected: { backgroundColor: '#1f6f8b' },
  chipText: { fontSize: 12 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  link: { color: '#1f6f8b', fontSize: 13, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#1f6f8b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  saved: { marginTop: 8, fontSize: 13, opacity: 0.6 },
});
