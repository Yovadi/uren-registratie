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

export class MemoryStore implements FieldServiceStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private registraties: WerkRegistratie[] = [];
  private overurenWeken: OverurenWeek[] = [];
  private reizen: ReisPlan[] = [];

  async init() {
    this.registraties = buildSeedRegistraties();
    this.overurenWeken = buildSeedOverurenWeken(this.registraties);
  }

  async getSettings() {
    return { ...this.settings };
  }
  async saveSettings(s: AppSettings) {
    this.settings = { ...s };
  }
  async listRegistraties() {
    return [...this.registraties];
  }
  async nextRegistratieId() {
    return this.registraties.reduce((m, r) => Math.max(m, r.RegistratieID), 0) + 1;
  }
  async upsertRegistratie(row: WerkRegistratie) {
    const i = this.registraties.findIndex((r) => r.RegistratieID === row.RegistratieID);
    if (i >= 0) this.registraties[i] = row;
    else this.registraties.push(row);
    this.registraties = recomputeDayCompensation(this.registraties);
  }
  async deleteRegistratie(id: number) {
    this.registraties = recomputeDayCompensation(
      this.registraties.filter((r) => r.RegistratieID !== id),
    );
  }
  async listOverurenWeken() {
    return [...this.overurenWeken];
  }
  async upsertOverurenWeek(row: OverurenWeek) {
    const i = this.overurenWeken.findIndex((w) => w.id === row.id);
    if (i >= 0) this.overurenWeken[i] = row;
    else this.overurenWeken.push(row);
  }
  async deleteOverurenWeek(id: string) {
    this.overurenWeken = this.overurenWeken.filter((w) => w.id !== id);
  }
  async listReizen() {
    return [...this.reizen];
  }
  async upsertReis(row: ReisPlan) {
    const i = this.reizen.findIndex((r) => r.id === row.id);
    if (i >= 0) this.reizen[i] = row;
    else this.reizen.push(row);
  }
  async deleteReis(id: string) {
    this.reizen = this.reizen.filter((r) => r.id !== id);
  }

  async exportSnapshot() {
    return {
      settings: { ...this.settings },
      registraties: [...this.registraties],
      overurenWeken: [...this.overurenWeken],
      reizen: [...this.reizen],
    };
  }

  async replaceAll(snap: {
    settings: AppSettings;
    registraties: WerkRegistratie[];
    overurenWeken: OverurenWeek[];
    reizen: ReisPlan[];
  }) {
    this.settings = { ...DEFAULT_SETTINGS, ...snap.settings };
    this.registraties = recomputeDayCompensation(snap.registraties ?? []);
    this.overurenWeken = [...(snap.overurenWeken ?? [])];
    this.reizen = [...(snap.reizen ?? [])];
  }
}
