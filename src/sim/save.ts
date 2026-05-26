import type { GameSave } from "../types";

const DB_NAME = "franchise-war-room";
const DB_VERSION = 1;
export const LEGACY_STORAGE_KEY = "franchise-war-room-save";
const ACTIVE_CAREER_KEY = "franchise-war-room-active-career-id";
const BACKUP_LIMIT = 5;

export interface CareerSlot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  selectedTeamId: string;
  teamName: string;
  mode: GameSave["mode"];
  scenario: GameSave["scenario"];
  seed: string;
  currentWeek: number;
  currentDate?: string;
  phase: GameSave["phase"];
  recordSummary: string;
}

export interface CareerRecord {
  id: string;
  slot: CareerSlot;
  save: GameSave;
}

export interface CareerBackup {
  id: string;
  careerId: string;
  createdAt: string;
  save: GameSave;
}

export interface SaveWriteResult {
  ok: boolean;
  slot?: CareerSlot;
  error?: string;
  prunedBackups?: number;
}

export interface MigrationResult {
  migrated: boolean;
  record?: CareerRecord;
  error?: string;
}

export interface SaveStorageDriver {
  listCareerRecords(): Promise<CareerRecord[]>;
  getCareer(id: string): Promise<CareerRecord | undefined>;
  putCareer(record: CareerRecord): Promise<void>;
  deleteCareer(id: string): Promise<void>;
  listBackups(careerId: string): Promise<CareerBackup[]>;
  putBackup(backup: CareerBackup): Promise<void>;
  deleteBackup(id: string): Promise<void>;
  getMetadata(key: string): Promise<string | undefined>;
  setMetadata(key: string, value: string): Promise<void>;
  deleteMetadata(key: string): Promise<void>;
}

interface MetadataRecord {
  key: string;
  value: string;
}

export interface SaveRepository {
  listCareers(): Promise<CareerSlot[]>;
  loadCareer(id: string): Promise<CareerRecord | undefined>;
  saveCareer(id: string, save: GameSave): Promise<SaveWriteResult>;
  createCareer(save: GameSave, name?: string): Promise<CareerRecord>;
  renameCareer(id: string, name: string): Promise<CareerSlot | undefined>;
  deleteCareer(id: string): Promise<void>;
  setActiveCareer(id: string): Promise<void>;
  loadActiveCareer(): Promise<CareerRecord | undefined>;
  createBackup(id: string, save: GameSave): Promise<void>;
  migrateLegacyLocalSave(normalize?: (save: GameSave) => GameSave): Promise<MigrationResult>;
}

let defaultRepository: SaveRepository | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function activeStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function slotName(save: GameSave): string {
  const team = save.teams.find((candidate) => candidate.id === save.selectedTeamId);
  return `${team?.fullName ?? "Franchise"} 2026`;
}

function recordSummary(save: GameSave): string {
  const record = save.records[save.selectedTeamId];
  if (!record) return "0-0";
  return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`;
}

function careerSlotFromSave(save: GameSave, id: string, name?: string, previous?: CareerSlot): CareerSlot {
  const team = save.teams.find((candidate) => candidate.id === save.selectedTeamId);
  const timestamp = nowIso();
  return {
    id,
    name: name?.trim() || previous?.name || slotName(save),
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    selectedTeamId: save.selectedTeamId,
    teamName: team?.fullName ?? save.selectedTeamId,
    mode: save.mode,
    scenario: save.scenario,
    seed: save.seed,
    currentWeek: save.currentWeek,
    currentDate: save.currentDate,
    phase: save.phase,
    recordSummary: recordSummary(save)
  };
}

function withCareerId(save: GameSave, id: string): GameSave {
  return { ...save, careerId: id };
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error || error instanceof DOMException)) return false;
  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.message.toLowerCase().includes("quota");
}

function sortSlots(records: CareerRecord[]): CareerSlot[] {
  return records.map((record) => record.slot).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function pruneBackups(driver: SaveStorageDriver, careerId: string, keep: number): Promise<number> {
  const backups = (await driver.listBackups(careerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const stale = backups.slice(Math.max(0, keep));
  await Promise.all(stale.map((backup) => driver.deleteBackup(backup.id)));
  return stale.length;
}

export function createSaveRepository(driver: SaveStorageDriver, localStorage: Storage | undefined = activeStorage()): SaveRepository {
  async function setActiveCareer(id: string): Promise<void> {
    await driver.setMetadata(ACTIVE_CAREER_KEY, id);
    localStorage?.setItem(ACTIVE_CAREER_KEY, id);
  }

  async function activeCareerId(): Promise<string | undefined> {
    return (await driver.getMetadata(ACTIVE_CAREER_KEY)) ?? localStorage?.getItem(ACTIVE_CAREER_KEY) ?? undefined;
  }

  async function createBackup(id: string, save: GameSave): Promise<void> {
    await driver.putBackup({
      id: newId(`backup-${id}`),
      careerId: id,
      createdAt: nowIso(),
      save: clone(withCareerId(save, id))
    });
    await pruneBackups(driver, id, BACKUP_LIMIT);
  }

  async function putCareerWithRetry(record: CareerRecord): Promise<SaveWriteResult> {
    try {
      await driver.putCareer(record);
      return { ok: true, slot: record.slot };
    } catch (error) {
      if (!isQuotaError(error)) {
        return { ok: false, error: error instanceof Error ? error.message : "Save failed." };
      }
      const prunedBackups = await pruneBackups(driver, record.id, 0);
      try {
        await driver.putCareer(record);
        return { ok: true, slot: record.slot, prunedBackups };
      } catch (retryError) {
        return {
          ok: false,
          prunedBackups,
          error: retryError instanceof Error ? retryError.message : "Save failed after pruning backups."
        };
      }
    }
  }

  return {
    async listCareers() {
      return sortSlots(await driver.listCareerRecords());
    },

    async loadCareer(id) {
      return driver.getCareer(id);
    },

    async saveCareer(id, save) {
      const existing = await driver.getCareer(id);
      if (existing) {
        try {
          await createBackup(id, existing.save);
        } catch {
          await pruneBackups(driver, id, 0);
        }
      }
      const slot = careerSlotFromSave(save, id, undefined, existing?.slot);
      const record: CareerRecord = { id, slot, save: clone(withCareerId(save, id)) };
      return putCareerWithRetry(record);
    },

    async createCareer(save, name) {
      const id = (save as GameSave & { careerId?: string }).careerId ?? newId("career");
      const slot = careerSlotFromSave(save, id, name);
      const record: CareerRecord = { id, slot, save: clone(withCareerId(save, id)) };
      await driver.putCareer(record);
      await setActiveCareer(id);
      return record;
    },

    async renameCareer(id, name) {
      const record = await driver.getCareer(id);
      if (!record) return undefined;
      const slot = {
        ...record.slot,
        name: name.trim() || record.slot.name,
        updatedAt: nowIso()
      };
      await driver.putCareer({ ...record, slot });
      return slot;
    },

    async deleteCareer(id) {
      await driver.deleteCareer(id);
      const backups = await driver.listBackups(id);
      await Promise.all(backups.map((backup) => driver.deleteBackup(backup.id)));
      if ((await activeCareerId()) === id) {
        await driver.deleteMetadata(ACTIVE_CAREER_KEY);
        localStorage?.removeItem(ACTIVE_CAREER_KEY);
      }
    },

    setActiveCareer,

    async loadActiveCareer() {
      const id = await activeCareerId();
      return id ? driver.getCareer(id) : undefined;
    },

    createBackup,

    async migrateLegacyLocalSave(normalize) {
      const raw = localStorage?.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return { migrated: false };
      try {
        const parsed = parseSave(raw);
        const save = normalize ? normalize(parsed) : parsed;
        const record = await this.createCareer(save);
        localStorage?.removeItem(LEGACY_STORAGE_KEY);
        return { migrated: true, record };
      } catch (error) {
        return {
          migrated: false,
          error: error instanceof Error ? error.message : "Legacy save migration failed."
        };
      }
    }
  };
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

let dbPromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("careers")) {
        db.createObjectStore("careers", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("backups")) {
        db.createObjectStore("backups", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

export function createIndexedDbSaveDriver(): SaveStorageDriver {
  return {
    async listCareerRecords() {
      const db = await openDatabase();
      const transaction = db.transaction("careers", "readonly");
      return requestToPromise<CareerRecord[]>(transaction.objectStore("careers").getAll());
    },

    async getCareer(id) {
      const db = await openDatabase();
      const transaction = db.transaction("careers", "readonly");
      return requestToPromise<CareerRecord | undefined>(transaction.objectStore("careers").get(id));
    },

    async putCareer(record) {
      const db = await openDatabase();
      const transaction = db.transaction("careers", "readwrite");
      transaction.objectStore("careers").put(clone(record));
      await transactionDone(transaction);
    },

    async deleteCareer(id) {
      const db = await openDatabase();
      const transaction = db.transaction("careers", "readwrite");
      transaction.objectStore("careers").delete(id);
      await transactionDone(transaction);
    },

    async listBackups(careerId) {
      const db = await openDatabase();
      const transaction = db.transaction("backups", "readonly");
      const backups = await requestToPromise<CareerBackup[]>(transaction.objectStore("backups").getAll());
      return backups.filter((backup) => backup.careerId === careerId);
    },

    async putBackup(backup) {
      const db = await openDatabase();
      const transaction = db.transaction("backups", "readwrite");
      transaction.objectStore("backups").put(clone(backup));
      await transactionDone(transaction);
    },

    async deleteBackup(id) {
      const db = await openDatabase();
      const transaction = db.transaction("backups", "readwrite");
      transaction.objectStore("backups").delete(id);
      await transactionDone(transaction);
    },

    async getMetadata(key) {
      const db = await openDatabase();
      const transaction = db.transaction("metadata", "readonly");
      const record = await requestToPromise<MetadataRecord | undefined>(transaction.objectStore("metadata").get(key));
      return record?.value;
    },

    async setMetadata(key, value) {
      const db = await openDatabase();
      const transaction = db.transaction("metadata", "readwrite");
      transaction.objectStore("metadata").put({ key, value });
      await transactionDone(transaction);
    },

    async deleteMetadata(key) {
      const db = await openDatabase();
      const transaction = db.transaction("metadata", "readwrite");
      transaction.objectStore("metadata").delete(key);
      await transactionDone(transaction);
    }
  };
}

export function createMemorySaveDriver(options: { failCareerPuts?: number } = {}): SaveStorageDriver {
  const careers = new Map<string, CareerRecord>();
  const backups = new Map<string, CareerBackup>();
  const metadata = new Map<string, string>();
  let failCareerPuts = options.failCareerPuts ?? 0;

  const maybeFail = () => {
    if (failCareerPuts <= 0) return;
    failCareerPuts -= 1;
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };

  return {
    async listCareerRecords() {
      return [...careers.values()].map(clone);
    },
    async getCareer(id) {
      const record = careers.get(id);
      return record ? clone(record) : undefined;
    },
    async putCareer(record) {
      maybeFail();
      careers.set(record.id, clone(record));
    },
    async deleteCareer(id) {
      careers.delete(id);
    },
    async listBackups(careerId) {
      return [...backups.values()].filter((backup) => backup.careerId === careerId).map(clone);
    },
    async putBackup(backup) {
      backups.set(backup.id, clone(backup));
    },
    async deleteBackup(id) {
      backups.delete(id);
    },
    async getMetadata(key) {
      return metadata.get(key);
    },
    async setMetadata(key, value) {
      metadata.set(key, value);
    },
    async deleteMetadata(key) {
      metadata.delete(key);
    }
  };
}

function defaultSaveRepository(): SaveRepository {
  defaultRepository ??= createSaveRepository(createIndexedDbSaveDriver());
  return defaultRepository;
}

export function listCareers(): Promise<CareerSlot[]> {
  return defaultSaveRepository().listCareers();
}

export function loadCareer(id: string): Promise<CareerRecord | undefined> {
  return defaultSaveRepository().loadCareer(id);
}

export function saveCareer(id: string, save: GameSave): Promise<SaveWriteResult> {
  return defaultSaveRepository().saveCareer(id, save);
}

export function createCareer(save: GameSave, name?: string): Promise<CareerRecord> {
  return defaultSaveRepository().createCareer(save, name);
}

export function renameCareer(id: string, name: string): Promise<CareerSlot | undefined> {
  return defaultSaveRepository().renameCareer(id, name);
}

export function deleteCareer(id: string): Promise<void> {
  return defaultSaveRepository().deleteCareer(id);
}

export function setActiveCareer(id: string): Promise<void> {
  return defaultSaveRepository().setActiveCareer(id);
}

export function loadActiveCareer(): Promise<CareerRecord | undefined> {
  return defaultSaveRepository().loadActiveCareer();
}

export function createBackup(id: string, save: GameSave): Promise<void> {
  return defaultSaveRepository().createBackup(id, save);
}

export function migrateLegacyLocalSave(normalize?: (save: GameSave) => GameSave): Promise<MigrationResult> {
  return defaultSaveRepository().migrateLegacyLocalSave(normalize);
}

function isUserTeamGame(save: GameSave, homeTeamId: string, awayTeamId: string): boolean {
  return homeTeamId === save.selectedTeamId || awayTeamId === save.selectedTeamId;
}

export function compactSaveForStorage(save: GameSave): GameSave {
  return {
    ...save,
    schedule: save.schedule.map((game) => {
      const keepFullGame = isUserTeamGame(save, game.homeTeamId, game.awayTeamId) || game.id === save.lastViewedGameId;
      if (keepFullGame) return game;
      return {
        ...game,
        log: [],
        snapCounts: {}
      };
    })
  };
}

export function serializedSizeBytes(save: GameSave): number {
  return new TextEncoder().encode(JSON.stringify(save)).length;
}

export interface SavePersistenceResult {
  ok: boolean;
  compacted: boolean;
  save: GameSave;
  error?: string;
}

export function saveToLocal(save: GameSave): SavePersistenceResult {
  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(save));
    return { ok: true, compacted: false, save };
  } catch {
    const compacted = compactSaveForStorage(save);
    try {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(compacted));
      return { ok: true, compacted: true, save: compacted };
    } catch (error) {
      return {
        ok: false,
        compacted: true,
        save,
        error: error instanceof Error ? error.message : "Could not write emergency localStorage save."
      };
    }
  }
}

export function loadFromLocal(): GameSave | undefined {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as GameSave;
    return parsed.version ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function clearLocalSave(): void {
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.localStorage.removeItem(ACTIVE_CAREER_KEY);
}

export function serializeSave(save: GameSave): string {
  return JSON.stringify(save, null, 2);
}

export function parseSave(raw: string): GameSave {
  const save = JSON.parse(raw) as GameSave;
  if (!save.version || !save.teams || !save.players || !save.schedule) {
    throw new Error("This does not look like a Franchise War Room save file.");
  }
  return save;
}

export function downloadSave(save: GameSave): void {
  const blob = new Blob([serializeSave(save)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `franchise-war-room-${save.selectedTeamId}-${save.currentDate ?? `week-${save.currentWeek}`}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
