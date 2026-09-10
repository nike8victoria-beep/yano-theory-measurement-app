// IndexedDB wrapper for the 大地の再生 measurement app.
// Object stores follow spec section 5 (sites / observations).
// users are not stored locally in stage 1 (single anonymous local user).

const DB_NAME = 'yano-theory-db';
const DB_VERSION = 1;

const STORE_SITES = 'sites';
const STORE_OBSERVATIONS = 'observations';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_SITES)) {
        const sites = db.createObjectStore(STORE_SITES, { keyPath: 'id' });
        sites.createIndex('created_at', 'created_at');
      }

      if (!db.objectStoreNames.contains(STORE_OBSERVATIONS)) {
        const observations = db.createObjectStore(STORE_OBSERVATIONS, { keyPath: 'id' });
        observations.createIndex('site_id', 'site_id');
        observations.createIndex('phase', 'phase');
        observations.createIndex('synced', 'synced');
        observations.createIndex('site_phase', ['site_id', 'phase']);
        observations.createIndex('created_at', 'created_at');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

// ---- sites ----

/**
 * @param {{ id?: string, user_id?: string, label?: string|null, lat: number, lng: number, synced?: boolean }} site
 */
async function addSite(site) {
  const record = {
    id: site.id || uuid(),
    user_id: site.user_id ?? null,
    label: site.label ?? null,
    lat: site.lat,
    lng: site.lng,
    // Not part of the spec section 5 schema (Supabase's `sites` table has no
    // such column) — this is local-only bookkeeping so a new site can be
    // synced before the observations that reference it (see sync.js).
    synced: site.synced ?? false,
    created_at: site.created_at || nowIso(),
  };
  const store = await tx(STORE_SITES, 'readwrite');
  await promisifyRequest(store.add(record));
  return record;
}

async function getSite(id) {
  const store = await tx(STORE_SITES, 'readonly');
  return promisifyRequest(store.get(id));
}

async function getAllSites() {
  const store = await tx(STORE_SITES, 'readonly');
  return promisifyRequest(store.getAll());
}

async function getUnsyncedSites() {
  const all = await getAllSites();
  return all.filter((s) => !s.synced);
}

async function updateSite(id, patch) {
  const store = await tx(STORE_SITES, 'readwrite');
  const existing = await promisifyRequest(store.get(id));
  if (!existing) throw new Error(`site not found: ${id}`);
  const updated = { ...existing, ...patch, id };
  await promisifyRequest(store.put(updated));
  return updated;
}

async function deleteSite(id) {
  const store = await tx(STORE_SITES, 'readwrite');
  await promisifyRequest(store.delete(id));
}

// ---- observations ----

/**
 * @param {{
 *   id?: string, site_id: string, phase: 'BEFORE'|'AFTER', user_id?: string,
 *   lat: number, lng: number, gps_accuracy_m?: number|null,
 *   photo_blob?: Blob|null, photo_url?: string|null, texture?: 'HARD'|'NORMAL'|'SOFT',
 *   sunlight?: 'SUNNY'|'HALF_SHADE'|'SHADE', infiltration_time_sec: number,
 *   flag_review?: boolean, synced?: boolean
 * }} observation
 */
async function addObservation(observation) {
  const record = {
    id: observation.id || uuid(),
    site_id: observation.site_id,
    phase: observation.phase,
    user_id: observation.user_id ?? null,
    lat: observation.lat,
    lng: observation.lng,
    gps_accuracy_m: observation.gps_accuracy_m ?? null,
    photo_blob: observation.photo_blob ?? null,
    // Filled in by sync.js once the photo has been uploaded to Supabase Storage.
    photo_url: observation.photo_url ?? null,
    texture: observation.texture ?? null,
    sunlight: observation.sunlight ?? null,
    infiltration_time_sec: observation.infiltration_time_sec,
    flag_review: observation.flag_review ?? false,
    synced: observation.synced ?? false,
    created_at: observation.created_at || nowIso(),
  };
  const store = await tx(STORE_OBSERVATIONS, 'readwrite');
  await promisifyRequest(store.add(record));
  return record;
}

async function getObservation(id) {
  const store = await tx(STORE_OBSERVATIONS, 'readonly');
  return promisifyRequest(store.get(id));
}

async function getAllObservations() {
  const store = await tx(STORE_OBSERVATIONS, 'readonly');
  return promisifyRequest(store.getAll());
}

async function getObservationsBySite(siteId) {
  const store = await tx(STORE_OBSERVATIONS, 'readonly');
  const index = store.index('site_id');
  return promisifyRequest(index.getAll(siteId));
}

async function getUnsyncedObservations() {
  const all = await getAllObservations();
  return all.filter((o) => !o.synced);
}

async function updateObservation(id, patch) {
  const store = await tx(STORE_OBSERVATIONS, 'readwrite');
  const existing = await promisifyRequest(store.get(id));
  if (!existing) throw new Error(`observation not found: ${id}`);
  const updated = { ...existing, ...patch, id };
  await promisifyRequest(store.put(updated));
  return updated;
}

async function deleteObservation(id) {
  const store = await tx(STORE_OBSERVATIONS, 'readwrite');
  await promisifyRequest(store.delete(id));
}

export const db = {
  openDB,
  addSite,
  getSite,
  getAllSites,
  getUnsyncedSites,
  updateSite,
  deleteSite,
  addObservation,
  getObservation,
  getAllObservations,
  getObservationsBySite,
  getUnsyncedObservations,
  updateObservation,
  deleteObservation,
};
