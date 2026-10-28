import { Link } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { AppHeader, Content, Screen, useTheme } from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { formatHours, type WerkRegistratie } from '@/domain';
import { Brand } from '@/constants/Colors';

export default function RegistratiesScreen() {
  const theme = useTheme();
  const { ready, registraties, removeRegistratie } = useAppData();

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
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            {registraties.length} records
          </Text>
        </View>
        <FlatList
          data={registraties.slice(0, 200)}
          keyExtractor={(item) => String(item.RegistratieID)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 40 }}>
              Nog geen registraties.
            </Text>
          }
          renderItem={({ item }) => (
            <RegRow item={item} onDelete={() => removeRegistratie(item.RegistratieID)} />
          )}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
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
