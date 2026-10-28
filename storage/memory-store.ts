import { DEFAULT_SETTINGS, buildSeedBank, buildSeedRegistraties, recomputeDayCompensation } from '@/domain';
import type {
  AppSettings,
  CompensatieBankRegel,
  ReisPlan,
  WerkRegistratie,
} from '@/domain/types';
import type { FieldServiceStore } from './types';

/** In-memory store (native fallback / tests). Seeds demo data. */
export class MemoryStore implements FieldServiceStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private registraties: WerkRegistratie[] = [];
  private bank: CompensatieBankRegel[] = [];
  private reizen: ReisPlan[] = [];

  async init() {
    this.registraties = buildSeedRegistraties();
    this.bank = buildSeedBank();
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
  async listBank() {
    return [...this.bank];
  }
  async upsertBank(row: CompensatieBankRegel) {
    const i = this.bank.findIndex((b) => b.id === row.id);
    if (i >= 0) this.bank[i] = row;
    else this.bank.push(row);
  }
  async deleteBank(id: string) {
    this.bank = this.bank.filter((b) => b.id !== id);
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
}
