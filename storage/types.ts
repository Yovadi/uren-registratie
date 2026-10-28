import type {
  AppSettings,
  CompensatieBankRegel,
  ReisPlan,
  WerkRegistratie,
} from '@/domain/types';

export interface FieldServiceStore {
  init(): Promise<void>;

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  listRegistraties(): Promise<WerkRegistratie[]>;
  upsertRegistratie(row: WerkRegistratie): Promise<void>;
  deleteRegistratie(id: number): Promise<void>;
  nextRegistratieId(): Promise<number>;

  listBank(): Promise<CompensatieBankRegel[]>;
  upsertBank(row: CompensatieBankRegel): Promise<void>;
  deleteBank(id: string): Promise<void>;

  listReizen(): Promise<ReisPlan[]>;
  upsertReis(row: ReisPlan): Promise<void>;
  deleteReis(id: string): Promise<void>;
}
