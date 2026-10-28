import { DEFAULT_SETTINGS, buildSeedBank, buildSeedRegistraties, recomputeDayCompensation } from '@/domain';
import type {
  AppSettings,
  CompensatieBankRegel,
  ReisPlan,
  WerkRegistratie,
} from '@/domain/types';
import type { FieldServiceStore } from './types';

const KEY = 'hotraco-speria-fsm:v1';

type Snapshot = {
  version: 1;
  settings: AppSettings;
  registraties: WerkRegistratie[];
  bank: CompensatieBankRegel[];
  reizen: ReisPlan[];
  seeded?: boolean;
};

export class WebLocalStore implements FieldServiceStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private registraties: WerkRegistratie[] = [];
  private bank: CompensatieBankRegel[] = [];
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
      this.bank = parsed.bank ?? [];
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
    this.bank = buildSeedBank();
    this.reizen = [];
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    const snap: Snapshot = {
      version: 1,
      settings: this.settings,
      registraties: this.registraties,
      bank: this.bank,
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
    const max = this.registraties.reduce((m, r) => Math.max(m, r.RegistratieID), 0);
    return max + 1;
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

  async listBank() {
    return [...this.bank];
  }
  async upsertBank(row: CompensatieBankRegel) {
    const idx = this.bank.findIndex((b) => b.id === row.id);
    if (idx >= 0) this.bank[idx] = row;
    else this.bank.push(row);
    this.persist();
  }
  async deleteBank(id: string) {
    this.bank = this.bank.filter((b) => b.id !== id);
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
