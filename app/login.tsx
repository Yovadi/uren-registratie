import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { Chip, FieldInput, FieldLabel, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Brand } from '@/constants/Colors';
import type { AppRol } from '@/domain';

export default function LoginScreen() {
  const { users, login, session } = useAuth();
  const [rolFilter, setRolFilter] = useState<AppRol | 'all'>('all');
  const [userId, setUserId] = useState(users[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => (rolFilter === 'all' ? users : users.filter((u) => u.rol === rolFilter)),
    [users, rolFilter],
  );

  const selected = users.find((u) => u.id === userId) ?? filtered[0];

  if (session) {
    // Already logged in
    router.replace('/(tabs)');
    return null;
  }

  const onLogin = () => {
    const id = selected?.id ?? userId;
    const result = login(id, pin.trim());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    router.replace('/(tabs)');
  };

  return (
    <Screen style={{ backgroundColor: Brand.header }}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Hotraco / Speria</Text>
        <Text style={styles.title}>Field Service Manager</Text>
        <Text style={styles.sub}>
          Log in als medewerker (uren & indienen) of als manager (goedkeuren).
        </Text>

        <View style={styles.card}>
          <FieldLabel>Ik ben</FieldLabel>
          <View style={styles.chips}>
            <Chip label="Iedereen" selected={rolFilter === 'all'} onPress={() => setRolFilter('all')} />
            <Chip
              label="Medewerker"
              selected={rolFilter === 'medewerker'}
              onPress={() => setRolFilter('medewerker')}
            />
            <Chip
              label="Manager"
              selected={rolFilter === 'manager'}
              onPress={() => setRolFilter('manager')}
            />
          </View>

          <FieldLabel>Account</FieldLabel>
          <View style={styles.chips}>
            {filtered.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => {
                  setUserId(u.id);
                  setPin('');
                  setError(null);
                }}
                style={[
                  styles.userCard,
                  userId === u.id && styles.userCardSelected,
                ]}>
                <Text style={[styles.userName, userId === u.id && { color: '#fff' }]}>
                  {u.naam}
                </Text>
                <Text style={[styles.userMeta, userId === u.id && { color: 'rgba(255,255,255,0.85)' }]}>
                  {u.functie} · {u.rol}
                </Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel>PIN</FieldLabel>
          <FieldInput
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            placeholder={selected?.rol === 'manager' ? '9999' : '1234'}
          />
          <Text style={styles.hint}>
            Demo: medewerkers PIN <Text style={{ fontWeight: '700' }}>1234</Text> · managers{' '}
            <Text style={{ fontWeight: '700' }}>9999</Text>
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Inloggen" onPress={onLogin} />
        </View>

        <Text style={styles.footer}>
          Medewerker kiest bij indienen TVT of uitbetalen. De manager ziet de week op
          weeknummer in de wachtrij en kan alleen accepteren of afwijzen.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  brand: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 6 },
  sub: { color: 'rgba(255,255,255,0.8)', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  card: {
    backgroundColor: Brand.background,
    borderRadius: 16,
    padding: 18,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  userCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  userCardSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  userName: { fontWeight: '800', fontSize: 15, color: Brand.text },
  userMeta: { fontSize: 12, color: Brand.textMuted, marginTop: 2 },
  hint: { fontSize: 12, color: Brand.textMuted, marginTop: 6 },
  error: { color: Brand.danger, marginTop: 8, fontWeight: '600' },
  footer: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 20,
  },
});
