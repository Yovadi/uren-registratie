import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { COMMON_TIME_ZONES, detectDeviceTimeZone } from '@/domain';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export default function NewEntryScreen() {
  const { ready, addEntry, settings } = useAppData();
  const defaultTz = useMemo(
    () => detectDeviceTimeZone() || settings.homeTimeZone,
    [settings.homeTimeZone],
  );

  const [project, setProject] = useState('');
  const [note, setNote] = useState('');
  const [siteTimeZone, setSiteTimeZone] = useState(defaultTz);
  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  });
  const [endLocal, setEndLocal] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 8);
    return toLocalInputValue(d);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const startAt = fromLocalInputValue(startLocal);
      const endAt = fromLocalInputValue(endLocal);
      if (Date.parse(endAt) < Date.parse(startAt)) {
        setError('Eindtijd moet na starttijd liggen.');
        return;
      }
      await addEntry({
        project: project.trim(),
        note: note.trim(),
        siteTimeZone,
        startAt,
        endAt,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Project / klant</Text>
        <TextInput
          style={styles.input}
          value={project}
          onChangeText={setProject}
          placeholder="Bijv. Site Dubai — compressor"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Start (apparaat-lokaal)</Text>
        <TextInput
          style={styles.input}
          value={startLocal}
          onChangeText={setStartLocal}
          autoCapitalize="none"
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Einde (apparaat-lokaal)</Text>
        <TextInput
          style={styles.input}
          value={endLocal}
          onChangeText={setEndLocal}
          autoCapitalize="none"
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Site-tijdzone</Text>
        <View style={styles.chipWrap}>
          {COMMON_TIME_ZONES.map((z) => {
            const selected = siteTimeZone === z.id;
            return (
              <Pressable
                key={z.id}
                onPress={() => setSiteTimeZone(z.id)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {z.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Notitie</Text>
        <TextInput
          style={[styles.input, styles.note]}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Optioneel"
          placeholderTextColor="#999"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
          onPress={onSubmit}
          disabled={busy}>
          <Text style={styles.saveBtnText}>{busy ? 'Opslaan…' : 'Opslaan'}</Text>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingBottom: 48, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  note: { minHeight: 80, textAlignVertical: 'top' },
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
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#1f6f8b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#b00020', marginTop: 8 },
});
