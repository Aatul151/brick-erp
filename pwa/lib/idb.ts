import { openDB, type IDBPDatabase } from "idb";

export type IdbCachedRecord<T> = {
  value: T;
  storedAt: number;
};

export type { IDBPDatabase };

const DB_NAME = "brick-erp-pwa";
const DB_VERSION = 1;

export const IDB_STORE_NAME = "kv";

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Shared IndexedDB handle (via `idb`). Safe to call from multiple places.
 */
export function getIdb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<IdbCachedRecord<T> | null> {
  const db = await getIdb();
  const result = await db.get(IDB_STORE_NAME, key);
  return result ?? null;
}

export async function idbSet<T>(key: string, record: IdbCachedRecord<T>): Promise<void> {
  const db = await getIdb();
  await db.put(IDB_STORE_NAME, record, key);
}

export async function idbDelete(key: string): Promise<void> {
  const db = await getIdb();
  await db.delete(IDB_STORE_NAME, key);
}

/**
 * Returns cached value if present and younger than ttlMs; otherwise deletes stale entry and returns null.
 */
export async function idbGetFresh<T>(key: string, ttlMs: number): Promise<T | null> {
  const record = await idbGet<T>(key);
  if (!record) return null;

  const age = Date.now() - record.storedAt;
  if (age > ttlMs) {
    await idbDelete(key);
    return null;
  }

  return record.value;
}

export async function idbSetWithTimestamp<T>(key: string, value: T): Promise<void> {
  await idbSet(key, { value, storedAt: Date.now() });
}
