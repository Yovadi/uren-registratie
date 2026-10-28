import { recomputeDayCompensation } from './compensation';
import { DEFAULT_SETTINGS, type AppSettings, type OverurenWeek, type ReisPlan, type WerkRegistratie } from './types';

/** Portable full-app backup — save to OneDrive/Teams/USB for use abroad. */
export const BACKUP_FORMAT = 'hotraco-speria-fsm-backup' as const;
export const BACKUP_VERSION = 1 as const;

export type AppBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  settings: AppSettings;
  registraties: WerkRegistratie[];
  overurenWeken: OverurenWeek[];
  reizen: ReisPlan[];
};

export type AppSnapshot = {
  settings: AppSettings;
  registraties: WerkRegistratie[];
  overurenWeken: OverurenWeek[];
  reizen: ReisPlan[];
};

export function buildBackup(snap: AppSnapshot): AppBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...snap.settings },
    registraties: snap.registraties,
    overurenWeken: snap.overurenWeken,
    reizen: snap.reizen,
  };
}

export function parseBackup(raw: string): AppBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Bestand is geen geldige JSON-back-up.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ongeldige back-up.');
  }
  const obj = parsed as Record<string, unknown>;
  // Accept both our backup format and raw localStorage snapshots
  const settings = (obj.settings ?? {}) as AppSettings;
  const registraties = (obj.registraties ?? []) as WerkRegistratie[];
  const overurenWeken = (obj.overurenWeken ?? []) as OverurenWeek[];
  const reizen = (obj.reizen ?? []) as ReisPlan[];
  if (!Array.isArray(registraties) || !Array.isArray(overurenWeken) || !Array.isArray(reizen)) {
    throw new Error('Back-up mist registraties / overuren / reizen.');
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    registraties: recomputeDayCompensation(registraties),
    overurenWeken,
    reizen,
  };
}

export function backupToJson(backup: AppBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function downloadBackupJson(backup: AppBackup): boolean {
  if (typeof document === 'undefined') return false;
  const stamp = backup.exportedAt.slice(0, 10);
  const blob = new Blob([backupToJson(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hotraco-speria-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function pickBackupFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Bestand kiezen werkt in de browser.'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('Geen bestand gekozen.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Bestand lezen mislukt.'));
      reader.readAsText(file);
    };
    input.click();
  });
}
