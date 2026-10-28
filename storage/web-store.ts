import {
  DEFAULT_SETTINGS,
  buildSeedOverurenWeken,
  buildSeedRegistraties,
  recomputeDayCompensation,
} from '@/domain';
import type {
  AppSettings,
  OverurenWeek,
  ReisPlan,
  WerkRegistratie,
} from '@/domain/types';
import type { FieldServiceStore } from './types';

const KEY = 'hotraco-speria-fsm:v2';

type Snapshot = {
  version: 2;
  settings: AppSettings;
  registraties: WerkRegistratie[];
  overurenWeken: OverurenWeek[];
  reizen: ReisPlan[];
  seeded?: boolean;
};

export class WebLocalStore implements FieldServiceStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private registraties: WerkRegistratie[] = [];
  private overurenWeken: OverurenWeek[] = [];
  private reizen: ReisPlan[] = [];

  async init(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      this.seedIfEmpty();
      return;
    }
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        this.seedIfEmpty();
        this.persist();
        return;
      }
      const parsed = JSON.parse(raw) as Snapshot;
      this.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
      this.registraties = recomputeDayCompensation(parsed.registraties ?? []);
      this.overurenWeken = parsed.overurenWeken ?? [];
      this.reizen = parsed.reizen ?? [];
      if (!parsed.seeded && this.registraties.length === 0) {
        this.seedIfEmpty();
        this.persist();
      }
    } catch {
      this.seedIfEmpty();
      this.persist();
    }
  }

  private seedIfEmpty() {
    this.registraties = buildSeedRegistraties();
    this.overurenWeken = buildSeedOverurenWeken(this.registraties);
    this.reizen = [];
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    const snap: Snapshot = {
      version: 2,
      settings: this.settings,
      registraties: this.registraties,
      overurenWeken: this.overurenWeken,
      reizen: this.reizen,
      seeded: true,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(snap));
    } catch (e) {
      console.warn('[storage] persist failed', e);
    }
  }

  async getSettings() {
    return { ...this.settings };
  }
  async saveSettings(settings: AppSettings) {
    this.settings = { ...settings };
    this.persist();
  }

  async listRegistraties() {
    return [...this.registraties];
  }
  async nextRegistratieId() {
    return this.registraties.reduce((m, r) => Math.max(m, r.RegistratieID), 0) + 1;
  }
  async upsertRegistratie(row: WerkRegistratie) {
    const idx = this.registraties.findIndex((r) => r.RegistratieID === row.RegistratieID);
    if (idx >= 0) this.registraties[idx] = row;
    else this.registraties.push(row);
    this.registraties = recomputeDayCompensation(this.registraties);
    this.persist();
  }
  async deleteRegistratie(id: number) {
    this.registraties = recomputeDayCompensation(
      this.registraties.filter((r) => r.RegistratieID !== id),
    );
    this.persist();
  }

  async listOverurenWeken() {
    return [...this.overurenWeken];
  }
  async upsertOverurenWeek(row: OverurenWeek) {
    const idx = this.overurenWeken.findIndex((w) => w.id === row.id);
    if (idx >= 0) this.overurenWeken[idx] = row;
    else this.overurenWeken.push(row);
    this.persist();
  }
  async deleteOverurenWeek(id: string) {
    this.overurenWeken = this.overurenWeken.filter((w) => w.id !== id);
    this.persist();
  }

  async listReizen() {
    return [...this.reizen];
  }
  async upsertReis(row: ReisPlan) {
    const idx = this.reizen.findIndex((r) => r.id === row.id);
    if (idx >= 0) this.reizen[idx] = row;
    else this.reizen.push(row);
    this.persist();
  }
  async deleteReis(id: string) {
    this.reizen = this.reizen.filter((r) => r.id !== id);
    this.persist();
  }
}
