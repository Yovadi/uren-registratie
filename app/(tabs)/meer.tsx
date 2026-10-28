import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
import { Brand } from '@/constants/Colors';
import type { AppRol } from '@/domain';
import { useState } from 'react';

export default function MeerScreen() {
  const { settings, saveSettings, resetDemoData } = useAppData();
  const [naam, setNaam] = useState(settings.medewerkerNaam);
  const [manager, setManager] = useState(settings.managerNaam);
  const [rol, setRol] = useState<AppRol>(settings.rol ?? 'medewerker');
  const [land, setLand] = useState(settings.defaultLand);
  const [tarief, setTarief] = useState(String(settings.buitenlandToelagePerDag ?? 55));
  const [saved, setSaved] = useState(false);

  return (
    <Screen>
      <AppHeader title="Meer" subtitle="Analyses & instellingen" />
      <Content>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.section}>Analyse</Text>
          <LinkRow href="/analyse/klant" icon="business-outline" label="Klantanalyse" />
          <LinkRow href="/analyse/project" icon="folder-outline" label="Projectanalyse" />
          <LinkRow
            href="/analyse/land"
            icon="globe-outline"
            label="Hotel & buitenlandtoelage"
          />

          <Text style={styles.section}>Rol (demo)</Text>
          <View style={styles.chips}>
            <Chip
              label="Medewerker"
              selected={rol === 'medewerker'}
              onPress={() => setRol('medewerker')}
            />
            <Chip
              label="Manager"
              selected={rol === 'manager'}
              onPress={() => setRol('manager')}
            />
          </View>
          <Text style={styles.hint}>
            Medewerker dient overuren-weken in. Manager keurt goed en kiest TVT of
            uitbetaling (verwerking gebeurt in andere systemen).
          </Text>

          <Text style={styles.section}>Instellingen</Text>
          <FieldLabel>Medewerkernaam</FieldLabel>
          <FieldInput value={naam} onChangeText={setNaam} />
          <FieldLabel>Managernaam</FieldLabel>
          <FieldInput value={manager} onChangeText={setManager} />
          <FieldLabel>Thuisland</FieldLabel>
          <FieldInput value={land} onChangeText={setLand} />
          <Text style={styles.hint}>
            Thuisland bepaalt of een hotelnacht binnen- of buitenland is, en of
            buitenlandtoelage telt.
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
                rol,
                medewerkerNaam: naam.trim() || settings.medewerkerNaam,
                managerNaam: manager.trim() || settings.managerNaam,
                defaultLand: land.trim() || settings.defaultLand,
                buitenlandToelagePerDag: Number.isFinite(n) && n >= 0 ? n : 55,
              });
              setSaved(true);
            }}
          />

          <Text style={[styles.section, { marginTop: 24 }]}>Demo data</Text>
          <Text style={styles.hint}>
            De app bevat ~5 jaar seed-data voor KPI’s en grafieken. Reset herlaadt de demo.
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
  return (
    <Link href={href} asChild>
      <Pressable style={styles.linkRow}>
        <View style={styles.linkIcon}>
          <Ionicons name={icon} size={18} color={Brand.primary} />
        </View>
        <Text style={styles.linkLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
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
  hint: { color: Brand.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  reset: {
    borderWidth: 1,
    borderColor: Brand.danger,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
});
