import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { HeaderLogout } from '@/components/HeaderLogout';
import { Text } from '@/components/Themed';
import {
  AppHeader,
  Chip,
  Content,
  FieldInput,
  FieldLabel,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  COMMON_TRAVEL_ZONES,
  computeReistijdMinuten,
  formatDuration,
} from '@/domain';
import { Brand } from '@/constants/Colors';

function toLocalInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReizenScreen() {
  const { ready, reizen, saveReis, removeReis } = useAppData();
  const [VertrekLocatie, setFrom] = useState('Eindhoven');
  const [AankomstLocatie, setTo] = useState('');
  const [TijdzoneVertrek, setTzFrom] = useState('Europe/Amsterdam');
  const [TijdzoneAankomst, setTzTo] = useState('Europe/Amsterdam');
  const [Vertrektijd, setDep] = useState(toLocalInput());
  const [Aankomsttijd, setArr] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 3);
    return toLocalInput(d);
  });

  const minutes = useMemo(
    () => computeReistijdMinuten(new Date(Vertrektijd).toISOString(), new Date(Aankomsttijd).toISOString()),
    [Vertrektijd, Aankomsttijd],
  );

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  const onSave = async () => {
    await saveReis({
      id: `reis_${Date.now()}`,
      VertrekLocatie,
      AankomstLocatie,
      TijdzoneVertrek,
      TijdzoneAankomst,
      Vertrektijd: new Date(Vertrektijd).toISOString(),
      Aankomsttijd: new Date(Aankomsttijd).toISOString(),
      ReistijdMinuten: minutes,
    });
  };

  return (
    <Screen>
      <AppHeader
        title="Reisplanner"
        subtitle="Tijdzones & automatische reistijd"
        right={<HeaderLogout />}
      />
      <Content>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FieldLabel>Vertrek locatie</FieldLabel>
          <FieldInput value={VertrekLocatie} onChangeText={setFrom} />
          <FieldLabel>Aankomst locatie</FieldLabel>
          <FieldInput value={AankomstLocatie} onChangeText={setTo} />

          <FieldLabel>Tijdzone vertrek</FieldLabel>
          <View style={styles.chips}>
            {COMMON_TRAVEL_ZONES.map((z) => (
              <Chip key={z} label={z} selected={TijdzoneVertrek === z} onPress={() => setTzFrom(z)} />
            ))}
          </View>
          <FieldLabel>Tijdzone aankomst</FieldLabel>
          <View style={styles.chips}>
            {COMMON_TRAVEL_ZONES.map((z) => (
              <Chip key={`a-${z}`} label={z} selected={TijdzoneAankomst === z} onPress={() => setTzTo(z)} />
            ))}
          </View>

          <FieldLabel>Vertrektijd</FieldLabel>
          <FieldInput value={Vertrektijd} onChangeText={setDep} placeholder="YYYY-MM-DDTHH:mm" />
          <FieldLabel>Aankomsttijd</FieldLabel>
          <FieldInput value={Aankomsttijd} onChangeText={setArr} placeholder="YYYY-MM-DDTHH:mm" />

          <Text style={styles.preview}>Berekende reistijd: {formatDuration(minutes)}</Text>
          <Text style={styles.hint}>
            Tijden worden als lokale kloktijd geïnterpreteerd en als ISO-instant opgeslagen.
            TZ-labels documenteren vertrek/aankomst context voor de engineer.
          </Text>
          <PrimaryButton label="Reis opslaan" onPress={onSave} />
        </ScrollView>

        <FlatList
          data={reizen}
          keyExtractor={(i) => i.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.listTitle}>Opgeslagen reizen</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>
                  {item.VertrekLocatie} → {item.AankomstLocatie}
                </Text>
                <Text style={styles.meta}>
                  {item.TijdzoneVertrek} → {item.TijdzoneAankomst}
                </Text>
                <Text style={styles.meta}>{formatDuration(item.ReistijdMinuten)}</Text>
              </View>
              <Pressable onPress={() => removeReis(item.id)}>
                <Text style={{ color: Brand.danger }}>Verwijder</Text>
              </Pressable>
            </View>
          )}
        />
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  form: { padding: 16, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { marginTop: 12, fontSize: 16, fontWeight: '700', color: Brand.primary },
  hint: { fontSize: 12, color: Brand.textMuted, marginTop: 4, lineHeight: 17 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  listTitle: { fontWeight: '800', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  meta: { fontSize: 12, color: Brand.textMuted },
});
