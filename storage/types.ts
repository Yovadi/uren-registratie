import type {
  AppSettings,
  OverurenWeek,
  ReisPlan,
  WerkRegistratie,
} from '@/domain/types';

export type StoreSnapshot = {
  settings: AppSettings;
  registraties: WerkRegistratie[];
  overurenWeken: OverurenWeek[];
  reizen: ReisPlan[];
};

export interface FieldServiceStore {
  init(): Promise<void>;

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  listRegistraties(): Promise<WerkRegistratie[]>;
  upsertRegistratie(row: WerkRegistratie): Promise<void>;
  deleteRegistratie(id: number): Promise<void>;
  nextRegistratieId(): Promise<number>;

  listOverurenWeken(): Promise<OverurenWeek[]>;
  upsertOverurenWeek(row: OverurenWeek): Promise<void>;
  deleteOverurenWeek(id: string): Promise<void>;

  listReizen(): Promise<ReisPlan[]>;
  upsertReis(row: ReisPlan): Promise<void>;
  deleteReis(id: string): Promise<void>;

  /** Full replace for backup import */
  replaceAll(snap: StoreSnapshot): Promise<void>;
  exportSnapshot(): Promise<StoreSnapshot>;
}
