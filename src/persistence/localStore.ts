import { apiFetch } from '../api/apiFetch.js';
import type { Investigation } from '../types/vendor.js';
import type { Vendor } from '../types/domain.js';
import type { MonitoringConfig, RunComparisonReport } from '../types/monitoringDiff.js';
import { removeSyntheticDemoData } from '../utils/workspaceData.js';

export const STORAGE_KEY = 'tinytrace.workspace';
const LEGACY_STORAGE_KEY = 'vendortrace.workspace';
export const STORAGE_VERSION = 1;
let storageReadError: string | null = null;
export const getStorageReadError = () => storageReadError;
let remotePersistenceReady = false;
let remoteSaveQueue: Promise<void> = Promise.resolve();

export interface WorkspaceSnapshot {
  investigations: Investigation[];
  vendors: Vendor[];
  comparisons: RunComparisonReport[];
  monitoringConfigs: Record<string, MonitoringConfig>;
  preferences: Record<string, unknown>;
  searchHistory: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const emptyWorkspace = (): WorkspaceSnapshot => ({
  investigations: [], vendors: [], comparisons: [], monitoringConfigs: {}, preferences: {}, searchHistory: [],
});

let workspaceCache = emptyWorkspace();

function validWorkspace(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<WorkspaceSnapshot>;
  return Array.isArray(v.investigations) && v.investigations.every((i) => !!i && typeof i.id === 'string' && typeof i.targetName === 'string')
    && Array.isArray(v.vendors) && Array.isArray(v.comparisons)
    && !!v.monitoringConfigs && typeof v.monitoringConfigs === 'object'
    && !!v.preferences && typeof v.preferences === 'object' && Array.isArray(v.searchHistory);
}

export function migrateWorkspace(raw: unknown): WorkspaceSnapshot {
  if (!raw || typeof raw !== 'object') return emptyWorkspace();
  const envelope = raw as { version?: unknown; data?: unknown };
  if (envelope.version === STORAGE_VERSION && validWorkspace(envelope.data)) return removeSyntheticDemoData(envelope.data);
  // v0 migration accepts the early unversioned snapshot without discarding records.
  if (envelope.version === undefined && validWorkspace(raw)) return removeSyntheticDemoData(raw);
  throw new Error('Unsupported or malformed TinyTrace storage. Existing data was left untouched.');
}

function loadWorkspaceFromStorage(storage: StorageLike): WorkspaceSnapshot {
  const target = storage;
  const serialized = target.getItem(STORAGE_KEY) ?? target.getItem(LEGACY_STORAGE_KEY);
  if (!serialized) return emptyWorkspace();
  try { return migrateWorkspace(JSON.parse(serialized)); }
  catch (error) {
    storageReadError = error instanceof Error ? error.message : 'Unable to read saved workspace.';
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tinytrace-storage-error', { detail: storageReadError }));
    return emptyWorkspace();
  }
}

export function loadWorkspace(storage?: StorageLike): WorkspaceSnapshot {
  return storage ? loadWorkspaceFromStorage(storage) : workspaceCache;
}

export function resetWorkspaceCache(): void {
  workspaceCache = emptyWorkspace();
  storageReadError = null;
  // A cleared in-memory cache is not an authoritative server snapshot and must
  // never be queued back to Supabase while the next account is loading.
  remotePersistenceReady = false;
}

export function hydrateWorkspace(snapshot: WorkspaceSnapshot): void {
  workspaceCache = removeSyntheticDemoData(migrateWorkspace(snapshot));
  // A prior session's 401 may have been surfaced as a save warning. A successful
  // server hydration confirms the new session can access its workspace.
  storageReadError = null;
  remotePersistenceReady = true;
}

export function readLegacyWorkspaceForMigration(): { snapshot: WorkspaceSnapshot | null; error: string | null } {
  if (typeof window === 'undefined') return { snapshot: null, error: null };
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return serialized ? { snapshot: migrateWorkspace(JSON.parse(serialized)), error: null } : { snapshot: null, error: null };
  } catch (error) {
    return {
      snapshot: null,
      error: error instanceof Error ? error.message : 'The old browser workspace could not be read. Export or repair it before migration.',
    };
  }
}

export function clearLegacyBrowserWorkspace(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function reportRemoteSaveError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Workspace changes could not be saved to Supabase.';
  storageReadError = message;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tinytrace-storage-error', { detail: message }));
}

function enqueueRemoteSave(snapshot: WorkspaceSnapshot): void {
  remoteSaveQueue = remoteSaveQueue.then(async () => {
    const response = await apiFetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot }),
    });
    if (!response.ok) {
      // apiFetch clears an invalid session and AuthGate returns to sign-in.
      // Don't persist an authentication failure as a storage/backup warning.
      if (response.status === 401 || response.status === 403) return;
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || `Supabase workspace save failed (HTTP ${response.status}).`);
    }
  }).catch(reportRemoteSaveError);
}

export function saveWorkspace(snapshot: WorkspaceSnapshot, storage?: StorageLike): boolean {
  snapshot = removeSyntheticDemoData(snapshot);
  if (!storage) {
    workspaceCache = snapshot;
    if (remotePersistenceReady) enqueueRemoteSave(snapshot);
    return true;
  }
  const target = storage;
  try {
    const existing = target.getItem(STORAGE_KEY);
    if (existing) {
      try { migrateWorkspace(JSON.parse(existing)); }
      catch (error) {
        storageReadError = error instanceof Error ? error.message : 'Saved workspace data is malformed and was preserved.';
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tinytrace-storage-error', { detail: storageReadError }));
        return false;
      }
    }
    target.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data: snapshot }));
    return true;
  } catch (error) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tinytrace-storage-error', {
      detail: error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        ? 'Local storage is full. Export a workspace backup and free browser storage before continuing.'
        : 'Workspace changes could not be saved to this browser.',
    }));
    return false;
  }
}

export function updateWorkspace(update: (current: WorkspaceSnapshot) => WorkspaceSnapshot, storage?: StorageLike): boolean {
  return saveWorkspace(update(loadWorkspace(storage)), storage);
}

export function exportWorkspaceBackup(storage?: StorageLike): void {
  const snapshot = loadWorkspace(storage);
  const blob = new Blob([JSON.stringify({ version: STORAGE_VERSION, data: snapshot }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `tinytrace-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  URL.revokeObjectURL(url);
}

export function clearWorkspace(storage?: StorageLike): void | Promise<void> {
  if (storage) {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  workspaceCache = emptyWorkspace();
  if (remotePersistenceReady) {
    const clearRequest = remoteSaveQueue.then(async () => {
      const response = await apiFetch('/api/workspace', { method: 'DELETE' });
      if (!response.ok) throw new Error(`Supabase workspace clear failed (HTTP ${response.status}).`);
    });
    remoteSaveQueue = clearRequest.catch(reportRemoteSaveError);
    return clearRequest;
  }
}
