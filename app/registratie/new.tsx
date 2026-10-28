import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Themed';
import {
  Chip,
  Content,
  FieldInput,
  FieldLabel,
  PrimaryButton,
  Screen,
  useTheme,
} from '@/components/ui';
import { useAppData } from '@/context/AppDataContext';
import {
  ACTIVITEITEN,
  REGISTRATIE_TEMPLATES,
  computeUren,
  formatHours,
  toelagePreview,
  validateRegistratieInput,
  type Activiteit,
} from '@/domain';
import { Brand } from '@/constants/Colors';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewRegistratieScreen() {
  const theme = useTheme();
  const { ready, settings, registraties, saveRegistratie } = useAppData();
  const [Datum, setDatum] = useState(today);
  const [Medewerker, setMedewerker] = useState(settings.medewerkerNaam);
  const [Klant, setKlant] = useState('');
  const [Project, setProject] = useState('');
  const [Land, setLand] = useState(settings.defaultLand);
  const [Locatie, setLocatie] = useState('');
  const [Activiteit, setActiviteit] = useState<Activiteit>('Werken');
  const [Starttijd, setStart] = useState('08:00');
  const [Eindtijd, setEind] = useState('17:00');
  const [PauzeMinuten, setPauze] = useState('30');
  const [Hotelnacht, setHotel] = useState(false);
  const [Opmerking, setOpmerking] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUren = useMemo(
    () => computeUren(Starttijd, Eindtijd, Number(PauzeMinuten) || 0),
    [Starttijd, Eindtijd, PauzeMinuten],
  );

  const issues = useMemo(
    () =>
      validateRegistratieInput(
        {
          Datum,
          Starttijd,
          Eindtijd,
          PauzeMinuten: Number(PauzeMinuten) || 0,
          Activiteit,
          Klant,
          Land,
          Hotelnacht,
        },
        registraties,
        settings.defaultLand,
      ),
    [
      Datum,
      Starttijd,
      Eindtijd,
      PauzeMinuten,
      Activiteit,
      Klant,
      Land,
      Hotelnacht,
      registraties,
      settings.defaultLand,
    ],
  );

  const sameDay = useMemo(
    () => registraties.filter((r) => r.Datum === Datum),
    [registraties, Datum],
  );

  const toelageHint = useMemo(
    () =>
      toelagePreview(
        Land,
        settings.defaultLand,
        settings.buitenlandToelagePerDag,
        sameDay,
      ),
    [Land, settings.defaultLand, settings.buitenlandToelagePerDag, sameDay],
  );

  const applyTemplate = (id: string) => {
    const t = REGISTRATIE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setActiviteit(t.Activiteit);
    setStart(t.Starttijd);
    setEind(t.Eindtijd);
    setPauze(String(t.PauzeMinuten));
    setHotel(t.Hotelnacht);
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const blocking = issues.filter((i) => i.level === 'error');
      if (blocking.length) {
        setError(blocking[0].message);
        return;
      }
      await saveRegistratie({
        Datum,
        Medewerker: Medewerker.trim() || settings.medewerkerNaam,
        Klant: Klant.trim(),
        Project: Project.trim(),
        Land: Land.trim() || settings.defaultLand,
        Locatie: Locatie.trim(),
        Activiteit,
        Starttijd,
        Eindtijd,
        PauzeMinuten: Number(PauzeMinuten) || 0,
        Hotelnacht,
        Opmerking: Opmerking.trim(),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FieldLabel>Sjabloon</FieldLabel>
          <View style={styles.chips}>
            {REGISTRATIE_TEMPLATES.map((t) => (
              <Chip key={t.id} label={t.label} onPress={() => applyTemplate(t.id)} />
            ))}
          </View>

          <FieldLabel>Datum</FieldLabel>
          <FieldInput value={Datum} onChangeText={setDatum} placeholder="YYYY-MM-DD" />

          <FieldLabel>Medewerker</FieldLabel>
          <FieldInput value={Medewerker} onChangeText={setMedewerker} />

          <FieldLabel>Klant</FieldLabel>
          <FieldInput value={Klant} onChangeText={setKlant} placeholder="Klantnaam" />

          <FieldLabel>Project</FieldLabel>
          <FieldInput value={Project} onChangeText={setProject} />

          <FieldLabel>Land</FieldLabel>
          <FieldInput value={Land} onChangeText={setLand} />

          <FieldLabel>Locatie</FieldLabel>
          <FieldInput value={Locatie} onChangeText={setLocatie} />

          <FieldLabel>Activiteit</FieldLabel>
          <View style={styles.chips}>
            {ACTIVITEITEN.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={Activiteit === a}
                onPress={() => setActiviteit(a)}
              />
            ))}
          </View>

          <FieldLabel>Starttijd</FieldLabel>
          <FieldInput value={Starttijd} onChangeText={setStart} placeholder="HH:mm" />

          <FieldLabel>Eindtijd</FieldLabel>
          <FieldInput value={Eindtijd} onChangeText={setEind} placeholder="HH:mm" />

          <FieldLabel>Pauze (minuten)</FieldLabel>
          <FieldInput
            value={PauzeMinuten}
            onChangeText={setPauze}
            keyboardType="number-pad"
          />

          <View style={styles.switchRow}>
            <Text style={{ fontWeight: '600' }}>Hotelnacht</Text>
            <Switch
              value={Hotelnacht}
              onValueChange={setHotel}
              trackColor={{ true: Brand.secondary }}
            />
          </View>

          <FieldLabel>Opmerking</FieldLabel>
          <FieldInput
            value={Opmerking}
            onChangeText={setOpmerking}
            multiline
            style={{ minHeight: 72 }}
          />

          <View style={styles.previewBox}>
            <Text style={{ color: theme.textMuted }}>
              Berekende uren: {formatHours(previewUren)} (compensatie volgt bij opslaan)
            </Text>
            {toelageHint ? (
              <Text style={styles.toelageHint}>{toelageHint}</Text>
            ) : (
              <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                Geen buitenlandtoelage (thuisland of leeg land).
              </Text>
            )}
          </View>

          {issues.map((issue, i) => (
            <Text
              key={`${issue.level}-${i}`}
              style={{
                color: issue.level === 'error' ? theme.danger : Brand.accent,
                marginTop: 6,
                fontWeight: '600',
              }}>
              {issue.level === 'error' ? '✗ ' : '⚠ '}
              {issue.message}
            </Text>
          ))}

          {error ? <Text style={{ color: theme.danger, marginTop: 8 }}>{error}</Text> : null}

          <PrimaryButton
            label={busy ? 'Opslaan…' : 'Registratie Opslaan'}
            onPress={onSave}
            disabled={busy || issues.some((i) => i.level === 'error')}
          />
        </ScrollView>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EEF4FA',
    borderWidth: 1,
    borderColor: Brand.border,
  },
  toelageHint: {
    marginTop: 6,
    color: Brand.accent,
    fontWeight: '700',
  },
});
