import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { Text } from '@/components/Themed';
import {
  AppHeader,
  Chip,
  Content,
  FieldInput,
  FieldLabel,
  PrimaryButton,
  Screen,
  useTheme,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Brand } from '@/constants/Colors';
import type { AppThema } from '@/domain';

export default function MeerScreen() {
  const theme = useTheme();
  const { session, logout } = useAuth();
  const { settings, saveSettings, resetDemoData } = useAppData();
  const [land, setLand] = useState(settings.defaultLand);
  const [tarief, setTarief] = useState(String(settings.buitenlandToelagePerDag ?? 55));
  const [saved, setSaved] = useState(false);

  const setThema = async (thema: AppThema) => {
    await saveSettings({ ...settings, thema });
  };

  return (
    <Screen>
      <AppHeader
        title="Meer"
        subtitle={
          session
            ? `${session.naam} · ${session.rol}`
            : 'Analyses & instellingen'
        }
      />
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.account}>
            <Text style={[styles.section, { color: theme.text }]}>Account</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Ingelogd als <Text style={{ fontWeight: '700' }}>{session?.naam}</Text> (
              {session?.rol}). Managers zien de goedkeuringswachtrij; medewerkers dienen
              weken in.
            </Text>
            <Pressable
              style={[styles.logout, { borderColor: Brand.primary }]}
              onPress={() => {
                logout();
                router.replace('/login');
              }}>
              <Text style={{ color: Brand.primary, fontWeight: '700' }}>
                Uitloggen / wissel gebruiker
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.section, { color: theme.text }]}>Weergave</Text>
          <View
            style={[
              styles.themeRow,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.text }}>Donker thema</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                Beter leesbaar bij weinig licht / veldwerk ’s avonds
              </Text>
            </View>
            <Switch
              value={settings.thema === 'dark'}
              onValueChange={(on) => setThema(on ? 'dark' : 'light')}
              trackColor={{ true: Brand.primary, false: theme.border }}
            />
          </View>
          <View style={styles.chips}>
            <Chip
              label="Licht"
              selected={settings.thema === 'light'}
              onPress={() => setThema('light')}
            />
            <Chip
              label="Donker"
              selected={settings.thema === 'dark'}
              onPress={() => setThema('dark')}
            />
          </View>

          <Text style={[styles.section, { color: theme.text }]}>Analyse</Text>
          <LinkRow href="/analyse/klant" icon="business-outline" label="Klantanalyse" />
          <LinkRow href="/analyse/project" icon="folder-outline" label="Projectanalyse" />
          <LinkRow
            href="/analyse/land"
            icon="globe-outline"
            label="Hotel & buitenlandtoelage"
          />

          <Text style={[styles.section, { color: theme.text }]}>Instellingen</Text>
          <FieldLabel>Thuisland</FieldLabel>
          <FieldInput value={land} onChangeText={setLand} />
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Bepaalt hotel binnen-/buitenland en buitenlandtoelage.
          </Text>
          <FieldLabel>Buitenlandtoelage (€ / dag)</FieldLabel>
          <FieldInput
            value={tarief}
            onChangeText={setTarief}
            keyboardType="decimal-pad"
          />
          <PrimaryButton
            label={saved ? 'Opgeslagen' : 'Instellingen opslaan'}
            onPress={async () => {
              const n = Number(String(tarief).replace(',', '.'));
              await saveSettings({
                ...settings,
                defaultLand: land.trim() || settings.defaultLand,
                buitenlandToelagePerDag: Number.isFinite(n) && n >= 0 ? n : 55,
              });
              setSaved(true);
            }}
          />

          <Text style={[styles.section, { marginTop: 24, color: theme.text }]}>
            Demo data
          </Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Reset herlaadt ~5 jaar seed-data en wist lokale demo-opslag.
          </Text>
          <Pressable style={styles.reset} onPress={() => resetDemoData()}>
            <Text style={{ color: Brand.danger, fontWeight: '700' }}>Reset demo-data</Text>
          </Pressable>
        </ScrollView>
      </Content>
    </Screen>
  );
}

function LinkRow({
  href,
  icon,
  label,
}: {
  href: '/analyse/klant' | '/analyse/project' | '/analyse/land';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        style={[
          styles.linkRow,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <View style={styles.linkIcon}>
          <Ionicons name={icon} size={18} color={Brand.primary} />
        </View>
        <Text style={[styles.linkLabel, { color: theme.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  account: { marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(15,76,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { flex: 1, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  logout: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  reset: {
    borderWidth: 1,
    borderColor: Brand.danger,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
});
