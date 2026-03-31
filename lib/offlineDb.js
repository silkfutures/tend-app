// ── Offline Session Storage (IndexedDB) ──
// Queues sessions when offline, syncs when back online

const DB_NAME = "pathways-offline";
const DB_VERSION = 1;
const STORE_SESSIONS = "pending_sessions";
const STORE_CACHE = "data_cache";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Pending sessions queue
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = db.createObjectStore(STORE_SESSIONS, { keyPath: "offlineId" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("synced", "synced");
      }
      // Data cache (mentors, young people, sessions for offline read)
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
    };
  });
}

// ── Pending Sessions Queue ──

export async function queueSession(sessionData) {
  const db = await openDB();
  const offlineId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    offlineId,
    ...sessionData,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    tx.objectStore(STORE_SESSIONS).add(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const store = tx.objectStore(STORE_SESSIONS);
    const index = store.index("synced");
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function markSessionSynced(offlineId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    const getReq = store.get(offlineId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        record.syncedAt = new Date().toISOString();
        store.put(record);
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncedSessions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    const index = store.index("synced");
    const request = index.openCursor(true); // synced === true
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPendingCount() {
  const pending = await getPendingSessions();
  return pending.length;
}

// ── Data Cache (for offline reads) ──

export async function cacheData(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readwrite");
    tx.objectStore(STORE_CACHE).put({ key, data, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readonly");
    const request = tx.objectStore(STORE_CACHE).get(key);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

// ── Network Status ──

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
