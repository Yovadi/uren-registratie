import { Link } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text, View as ThemedView } from '@/components/Themed';
import { useAppData } from '@/context/AppDataContext';
import { entryHours, formatInTimeZone, roundHours, type TimeEntry } from '@/domain';

export default function EntriesScreen() {
  const { ready, entries, settings, removeEntry } = useAppData();

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Uren</Text>
        <Link href="/entry/new" asChild>
          <Pressable style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Toevoegen</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nog geen registraties. Voeg je eerste uren toe — met site-tijdzone.
          </Text>
        }
        renderItem={({ item }) => (
          <EntryRow
            entry={item}
            homeTz={settings.homeTimeZone}
            onDelete={() => removeEntry(item.id)}
          />
        )}
      />
    </ThemedView>
  );
}

function EntryRow({
  entry,
  homeTz,
  onDelete,
}: {
  entry: TimeEntry;
  homeTz: string;
  onDelete: () => void;
}) {
  const hours = roundHours(entryHours(entry));
  const siteStart = formatInTimeZone(entry.startAt, entry.siteTimeZone);
  const homeStart = formatInTimeZone(entry.startAt, homeTz);

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.project}>{entry.project || 'Zonder project'}</Text>
        <Text style={styles.detail}>
          {hours} u · site {entry.siteTimeZone}
        </Text>
        <Text style={styles.detail}>Site: {siteStart}</Text>
        <Text style={styles.detailMuted}>Thuis ({homeTz}): {homeStart}</Text>
        {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={styles.delete}>Verwijder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '700' },
  addBtn: {
    backgroundColor: '#1f6f8b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  emptyList: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  empty: { opacity: 0.6, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.35)',
  },
  rowMain: { flex: 1, gap: 2 },
  project: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 13, opacity: 0.8 },
  detailMuted: { fontSize: 12, opacity: 0.55 },
  note: { fontSize: 13, marginTop: 4, opacity: 0.7 },
  delete: { color: '#b00020', fontSize: 13, paddingTop: 2 },
});
