import { STORAGE_KEY } from './dom';
import type {
  LayoutMode,
  StoredInfiniteScrollPreference,
  StoredLayoutPreference,
  StoredMediaPreference,
} from './types';

export const MEDIA_EXPAND_STORAGE_KEY = 'fitgirl-web-enhanced:v1:media-expand';
export const INFINITE_SCROLL_STORAGE_KEY = 'fitgirl-web-enhanced:v1:infinite-scroll';
const TIMESTAMP_KEY = `${STORAGE_KEY}:updated-at`;
const MEDIA_TIMESTAMP_KEY = `${MEDIA_EXPAND_STORAGE_KEY}:updated-at`;
const INFINITE_SCROLL_TIMESTAMP_KEY = `${INFINITE_SCROLL_STORAGE_KEY}:updated-at`;
const DATABASE_NAME = 'fitgirl-web-enhanced';
const STORE_NAME = 'preferences';

function asPreference(
  mode: string | null,
  updatedAt: string | null,
): StoredLayoutPreference | null {
  if (mode !== 'enhanced' && mode !== 'original') return null;
  const timestamp = Number(updatedAt);
  return { mode, updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0 };
}

function asMediaPreference(
  expanded: string | null,
  updatedAt: string | null,
): StoredMediaPreference | null {
  if (expanded !== 'true' && expanded !== 'false') return null;
  const timestamp = Number(updatedAt);
  return {
    expanded: expanded === 'true',
    updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0,
  };
}

function asInfiniteScrollPreference(
  enabled: string | null,
  updatedAt: string | null,
): StoredInfiniteScrollPreference | null {
  if (enabled !== 'true' && enabled !== 'false') return null;
  const timestamp = Number(updatedAt);
  return {
    enabled: enabled === 'true',
    updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0,
  };
}

function readLocal(): StoredLayoutPreference | null {
  try {
    return asPreference(
      window.localStorage.getItem(STORAGE_KEY),
      window.localStorage.getItem(TIMESTAMP_KEY),
    );
  } catch {
    return null;
  }
}

function writeLocal(value: StoredLayoutPreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value.mode);
    window.localStorage.setItem(TIMESTAMP_KEY, String(value.updatedAt));
  } catch {
    // 同源存储被禁用时，IndexedDB 仍可作为回退。
  }
}

function readLocalMedia(): StoredMediaPreference | null {
  try {
    return asMediaPreference(
      window.localStorage.getItem(MEDIA_EXPAND_STORAGE_KEY),
      window.localStorage.getItem(MEDIA_TIMESTAMP_KEY),
    );
  } catch {
    return null;
  }
}

function writeLocalMedia(value: StoredMediaPreference): void {
  try {
    window.localStorage.setItem(MEDIA_EXPAND_STORAGE_KEY, String(value.expanded));
    window.localStorage.setItem(MEDIA_TIMESTAMP_KEY, String(value.updatedAt));
  } catch {
    // 同源存储被禁用时，IndexedDB 仍可作为回退。
  }
}

function readLocalInfiniteScroll(): StoredInfiniteScrollPreference | null {
  try {
    return asInfiniteScrollPreference(
      window.localStorage.getItem(INFINITE_SCROLL_STORAGE_KEY),
      window.localStorage.getItem(INFINITE_SCROLL_TIMESTAMP_KEY),
    );
  } catch {
    return null;
  }
}

function writeLocalInfiniteScroll(value: StoredInfiniteScrollPreference): void {
  try {
    window.localStorage.setItem(INFINITE_SCROLL_STORAGE_KEY, String(value.enabled));
    window.localStorage.setItem(INFINITE_SCROLL_TIMESTAMP_KEY, String(value.updatedAt));
  } catch {
    // 同源存储被禁用时，IndexedDB 仍可作为回退。
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME))
          request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readIndexed(): Promise<StoredLayoutPreference | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(STORAGE_KEY);
      request.onsuccess = () => {
        const value = request.result as Partial<StoredLayoutPreference> | undefined;
        database.close();
        resolve(
          value &&
            (value.mode === 'enhanced' || value.mode === 'original') &&
            Number.isFinite(value.updatedAt)
            ? { mode: value.mode, updatedAt: value.updatedAt ?? 0 }
            : null,
        );
      };
      request.onerror = () => {
        database.close();
        resolve(null);
      };
    } catch {
      database.close();
      resolve(null);
    }
  });
}

async function writeIndexed(value: StoredLayoutPreference): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, STORAGE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        resolve();
      };
    } catch {
      database.close();
      resolve();
    }
  });
}

async function readIndexedMedia(): Promise<StoredMediaPreference | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(MEDIA_EXPAND_STORAGE_KEY);
      request.onsuccess = () => {
        const value = request.result as Partial<StoredMediaPreference> | undefined;
        database.close();
        resolve(
          value && typeof value.expanded === 'boolean' && Number.isFinite(value.updatedAt)
            ? { expanded: value.expanded, updatedAt: value.updatedAt ?? 0 }
            : null,
        );
      };
      request.onerror = () => {
        database.close();
        resolve(null);
      };
    } catch {
      database.close();
      resolve(null);
    }
  });
}

async function writeIndexedMedia(value: StoredMediaPreference): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, MEDIA_EXPAND_STORAGE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        resolve();
      };
    } catch {
      database.close();
      resolve();
    }
  });
}

async function readIndexedInfiniteScroll(): Promise<StoredInfiniteScrollPreference | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(INFINITE_SCROLL_STORAGE_KEY);
      request.onsuccess = () => {
        const value = request.result as Partial<StoredInfiniteScrollPreference> | undefined;
        database.close();
        resolve(
          value && typeof value.enabled === 'boolean' && Number.isFinite(value.updatedAt)
            ? { enabled: value.enabled, updatedAt: value.updatedAt ?? 0 }
            : null,
        );
      };
      request.onerror = () => {
        database.close();
        resolve(null);
      };
    } catch {
      database.close();
      resolve(null);
    }
  });
}

async function writeIndexedInfiniteScroll(value: StoredInfiniteScrollPreference): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, INFINITE_SCROLL_STORAGE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        resolve();
      };
    } catch {
      database.close();
      resolve();
    }
  });
}

export function getFastStoredLayoutMode(): LayoutMode {
  const local = readLocal();
  return local ? local.mode : 'enhanced';
}

export function getFastStoredMediaExpand(): boolean {
  const local = readLocalMedia();
  return local ? local.expanded : true;
}

export function getFastStoredInfiniteScroll(): boolean {
  const local = readLocalInfiniteScroll();
  return local ? local.enabled : true;
}

export async function readStoredLayoutMode(): Promise<LayoutMode> {
  const [local, indexed] = await Promise.all([Promise.resolve(readLocal()), readIndexed()]);
  const selected = [local, indexed]
    .filter((value): value is StoredLayoutPreference => value !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  if (!selected) return 'enhanced';
  if (!local || local.mode !== selected.mode || local.updatedAt !== selected.updatedAt)
    writeLocal(selected);
  return selected.mode;
}

export async function writeStoredLayoutMode(mode: LayoutMode): Promise<void> {
  const value = { mode, updatedAt: Date.now() } satisfies StoredLayoutPreference;
  writeLocal(value);
  await writeIndexed(value);
}

export async function readStoredMediaExpand(): Promise<boolean> {
  const [local, indexed] = await Promise.all([
    Promise.resolve(readLocalMedia()),
    readIndexedMedia(),
  ]);
  const selected = [local, indexed]
    .filter((value): value is StoredMediaPreference => value !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  if (!selected) return true;
  if (!local || local.expanded !== selected.expanded || local.updatedAt !== selected.updatedAt)
    writeLocalMedia(selected);
  return selected.expanded;
}

export async function writeStoredMediaExpand(expanded: boolean): Promise<void> {
  const value = { expanded, updatedAt: Date.now() } satisfies StoredMediaPreference;
  writeLocalMedia(value);
  await writeIndexedMedia(value);
}

export async function readStoredInfiniteScroll(): Promise<boolean> {
  const [local, indexed] = await Promise.all([
    Promise.resolve(readLocalInfiniteScroll()),
    readIndexedInfiniteScroll(),
  ]);
  const selected = [local, indexed]
    .filter((value): value is StoredInfiniteScrollPreference => value !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  if (!selected) return true;
  if (!local || local.enabled !== selected.enabled || local.updatedAt !== selected.updatedAt)
    writeLocalInfiniteScroll(selected);
  return selected.enabled;
}

export async function writeStoredInfiniteScroll(enabled: boolean): Promise<void> {
  const value = { enabled, updatedAt: Date.now() } satisfies StoredInfiniteScrollPreference;
  writeLocalInfiniteScroll(value);
  await writeIndexedInfiniteScroll(value);
}
