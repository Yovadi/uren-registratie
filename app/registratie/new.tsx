import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

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
  computeUren,
  formatHours,
  isoWeekEnd,
  isoWeekLabel,
  isoWeekNumber,
  isoWeekStart,
  toelagePreview,
  validateRegistratieInput,
  type Activiteit,
} from '@/domain';
import { Brand } from '@/constants/Colors';

const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

type DayDraft = {
  enabled: boolean;
  Starttijd: string;
  Eindtijd: string;
  PauzeMinuten: string;
  Activiteit: Activiteit;
  Hotelnacht: boolean;
  Opmerking: string;
};

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function emptyDay(weekend: boolean): DayDraft {
  return {
    enabled: !weekend,
    Starttijd: weekend ? '09:00' : '08:00',
    Eindtijd: weekend ? '13:00' : '17:00',
    PauzeMinuten: weekend ? '0' : '30',
    Activiteit: 'Werken',
    Hotelnacht: false,
    Opmerking: '',
  };
}

function defaultWeek(): DayDraft[] {
  return Array.from({ length: 7 }, (_, i) => emptyDay(i >= 5));
}

export default function WeekRegistratieScreen() {
  const theme = useTheme();
  const { ready, settings, registraties, saveRegistratie } = useAppData();
  const [weekStart, setWeekStart] = useState(() =>
    isoWeekStart(new Date().toISOString().slice(0, 10)),
  );
  const [Medewerker, setMedewerker] = useState(settings.medewerkerNaam);
  const [Klant, setKlant] = useState('');
  const [Project, setProject] = useState('');
  const [Land, setLand] = useState(settings.defaultLand);
  const [Locatie, setLocatie] = useState('');
  const [days, setDays] = useState<DayDraft[]>(defaultWeek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekHours = useMemo(
    () =>
      days.reduce((sum, d, i) => {
        if (!d.enabled) return sum;
        return sum + computeUren(d.Starttijd, d.Eindtijd, Number(d.PauzeMinuten) || 0);
      }, 0),
    [days],
  );

  const updateDay = (index: number, patch: Partial<DayDraft>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const applyWerkweek = () => {
    setDays((prev) =>
      prev.map((d, i) =>
        i < 5
          ? {
              ...d,
              enabled: true,
              Starttijd: '08:00',
              Eindtijd: '17:00',
              PauzeMinuten: '30',
              Activiteit: 'Werken',
            }
          : { ...d, enabled: false },
      ),
    );
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!Klant.trim()) {
        setError('Klant is verplicht voor de week.');
        return;
      }
      const enabled = days
        .map((d, i) => ({ d, datum: dates[i] }))
        .filter((x) => x.d.enabled);
      if (enabled.length === 0) {
        setError('Zet minstens één dag aan in de week.');
        return;
      }

      for (let i = 0; i < days.length; i++) {
        const d = days[i];
        if (!d.enabled) continue;
        const datum = dates[i];
        const issues = validateRegistratieInput(
          {
            Datum: datum,
            Starttijd: d.Starttijd,
            Eindtijd: d.Eindtijd,
            PauzeMinuten: Number(d.PauzeMinuten) || 0,
            Activiteit: d.Activiteit,
            Klant,
            Land,
            Hotelnacht: d.Hotelnacht,
          },
          registraties,
          settings.defaultLand,
        );
        const blocking = issues.filter((x) => x.level === 'error');
        if (blocking.length) {
          setError(`${DAY_NAMES[i]}: ${blocking[0].message}`);
          return;
        }
      }

      for (const { d, datum } of enabled) {
        await saveRegistratie({
          Datum: datum,
          Medewerker: Medewerker.trim() || settings.medewerkerNaam,
          Klant: Klant.trim(),
          Project: Project.trim(),
          Land: Land.trim() || settings.defaultLand,
          Locatie: Locatie.trim(),
          Activiteit: d.Activiteit,
          Starttijd: d.Starttijd,
          Eindtijd: d.Eindtijd,
          PauzeMinuten: Number(d.PauzeMinuten) || 0,
          Hotelnacht: d.Hotelnacht,
          Opmerking: d.Opmerking.trim(),
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  const toelageHint = toelagePreview(Land, settings.defaultLand, settings.buitenlandToelagePerDag, []);

  return (
    <Screen>
      <Content>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.hero, { color: theme.text }]}>
            Week {isoWeekNumber(weekStart)}
          </Text>
          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>
            {isoWeekLabel(weekStart)}
          </Text>

          <View style={styles.weekNav}>
            <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))}>
              <Text style={styles.navBtn}>Vorige week</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setWeekStart(isoWeekStart(new Date().toISOString().slice(0, 10)))
              }>
              <Text style={styles.navBtn}>Deze week</Text>
            </Pressable>
            <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))}>
              <Text style={styles.navBtn}>Volgende week</Text>
            </Pressable>
          </View>

          <FieldLabel>Sjabloon</FieldLabel>
          <View style={styles.chips}>
            <Chip label="Standaard werkweek ma–vr 08–17" onPress={applyWerkweek} />
          </View>

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

          {toelageHint ? (
            <Text style={styles.toelage}>{toelageHint}</Text>
          ) : (
            <Text style={{ color: theme.textMuted, marginTop: 8 }}>
              Geen buitenlandtoelage (thuisland).
            </Text>
          )}

          <Text style={[styles.section, { color: theme.text }]}>Dagen in de week</Text>
          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>
            Zet dagen aan/uit en pas tijden per dag aan. Totaal: {formatHours(weekHours)}.
          </Text>

          {days.map((day, i) => (
            <View
              key={dates[i]}
              style={[
                styles.dayCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: day.enabled ? Brand.primary : theme.border,
                  opacity: day.enabled ? 1 : 0.72,
                },
              ]}>
              <View style={styles.dayHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayTitle, { color: theme.text }]}>
                    {DAY_NAMES[i]}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{dates[i]}</Text>
                </View>
                <Switch
                  value={day.enabled}
                  onValueChange={(enabled) => updateDay(i, { enabled })}
                  trackColor={{ true: Brand.primary, false: theme.border }}
                />
              </View>

              {day.enabled ? (
                <View style={{ gap: 4 }}>
                  <View style={styles.chips}>
                    {ACTIVITEITEN.slice(0, 6).map((a) => (
                      <Chip
                        key={a}
                        label={a}
                        selected={day.Activiteit === a}
                        onPress={() => updateDay(i, { Activiteit: a })}
                      />
                    ))}
                  </View>
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel>Start</FieldLabel>
                      <FieldInput
                        value={day.Starttijd}
                        onChangeText={(Starttijd) => updateDay(i, { Starttijd })}
                        placeholder="HH:mm"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FieldLabel>Eind</FieldLabel>
                      <FieldInput
                        value={day.Eindtijd}
                        onChangeText={(Eindtijd) => updateDay(i, { Eindtijd })}
                        placeholder="HH:mm"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FieldLabel>Pauze</FieldLabel>
                      <FieldInput
                        value={day.PauzeMinuten}
                        onChangeText={(PauzeMinuten) => updateDay(i, { PauzeMinuten })}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={{ fontWeight: '600', color: theme.text }}>Hotelnacht</Text>
                    <Switch
                      value={day.Hotelnacht}
                      onValueChange={(Hotelnacht) => updateDay(i, { Hotelnacht })}
                      trackColor={{ true: Brand.secondary, false: theme.border }}
                    />
                  </View>
                  <FieldLabel>Opmerking</FieldLabel>
                  <FieldInput
                    value={day.Opmerking}
                    onChangeText={(Opmerking) => updateDay(i, { Opmerking })}
                  />
                  <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                    {formatHours(
                      computeUren(
                        day.Starttijd,
                        day.Eindtijd,
                        Number(day.PauzeMinuten) || 0,
                      ),
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}

          {error ? (
            <Text style={{ color: theme.danger, marginTop: 8, fontWeight: '700' }}>
              {error}
            </Text>
          ) : null}

          <PrimaryButton
            label={
              busy
                ? 'Opslaan…'
                : `Week ${isoWeekNumber(weekStart)} opslaan (${days.filter((d) => d.enabled).length} dagen)`
            }
            onPress={onSave}
            disabled={busy}
          />
          <Text style={{ color: theme.textMuted, marginTop: 8, fontSize: 12 }}>
            Week t/m {isoWeekEnd(weekStart)}
          </Text>
        </ScrollView>
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  hero: { fontSize: 28, fontWeight: '800' },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  navBtn: { color: Brand.primary, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { marginTop: 18, fontSize: 16, fontWeight: '800' },
  dayCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dayTitle: { fontWeight: '800', fontSize: 16 },
  timeRow: { flexDirection: 'row', gap: 8 },
  switchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toelage: { marginTop: 8, color: Brand.accent, fontWeight: '700' },
});
