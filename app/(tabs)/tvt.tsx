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
  Content,
  FieldInput,
  FieldLabel,
  PrimaryButton,
  Screen,
  useTheme,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { bankWithRunningSaldo, computeTvtSaldo, formatHours } from '@/domain';
import { Brand } from '@/constants/Colors';

export default function TvtScreen() {
  const theme = useTheme();
  const { ready, bank, registraties, saveBank, removeBank } = useAppData();
  const [Datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [Omschrijving, setOmschrijving] = useState('');
  const [PlusUren, setPlus] = useState('0');
  const [MinUren, setMin] = useState('0');

  const rows = useMemo(() => bankWithRunningSaldo(bank), [bank]);
  const saldo = useMemo(
    () => computeTvtSaldo(registraties, bank),
    [registraties, bank],
  );

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </Screen>
    );
  }

  const onAdd = async () => {
    await saveBank({
      id: `bank_${Date.now()}`,
      Datum,
      Omschrijving: Omschrijving.trim() || 'TVT mutatie',
      PlusUren: Number(PlusUren) || 0,
      MinUren: Number(MinUren) || 0,
    });
    setOmschrijving('');
    setPlus('0');
    setMin('0');
  };

  return (
    <Screen>
      <AppHeader title="Compensatiebank" subtitle={`TVT saldo: ${formatHours(saldo)}`} />
      <Content>
        <View style={styles.form}>
          <FieldLabel>Datum</FieldLabel>
          <FieldInput value={Datum} onChangeText={setDatum} />
          <FieldLabel>Omschrijving</FieldLabel>
          <FieldInput value={Omschrijving} onChangeText={setOmschrijving} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Plus uren</FieldLabel>
              <FieldInput value={PlusUren} onChangeText={setPlus} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Min uren</FieldLabel>
              <FieldInput value={MinUren} onChangeText={setMin} keyboardType="decimal-pad" />
            </View>
          </View>
          <PrimaryButton label="Mutatie toevoegen" onPress={onAdd} />
        </View>

        <FlatList
          data={[...rows].reverse()}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.tableHead}>Datum · Omschrijving · +/− · Saldo</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.Datum}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>{item.Omschrijving}</Text>
                <Text style={{ marginTop: 4, fontWeight: '600' }}>
                  +{item.PlusUren} / −{item.MinUren} → saldo {formatHours(item.Saldo)}
                </Text>
              </View>
              <Pressable onPress={() => removeBank(item.id)}>
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
  form: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  row2: { flexDirection: 'row', gap: 10 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  tableHead: { fontWeight: '700', marginBottom: 4, color: Brand.textMuted },
  row: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: 14,
  },
  title: { fontWeight: '700' },
});
