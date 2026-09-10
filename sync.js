import { db } from './db.js';
import { getSupabaseClient, ensureAnonymousUserId } from './supabaseClient.js';
import { PHOTO_BUCKET, isSupabaseConfigured } from './supabaseConfig.js';

const RETRY_INTERVAL_MS = 2 * 60 * 1000;

let syncing = false;

/**
 * Uploads every locally unsynced site/observation to Supabase. Safe to call
 * repeatedly — it no-ops while offline, unconfigured, or already running,
 * and anything that fails simply stays `synced: false` so the next call
 * (from the 'online' event, the retry interval, or after the next
 * measurement is saved) picks it up again.
 */
export async function syncPendingData() {
  if (!isSupabaseConfigured() || !navigator.onLine || syncing) return;

  syncing = true;
  try {
    const client = await getSupabaseClient();
    const userId = await ensureAnonymousUserId(client);

    // Sites must land before observations that reference them (FK constraint).
    await syncSites(client, userId);
    await syncObservations(client, userId);
  } catch (err) {
    console.error('Supabase sync failed:', err);
  } finally {
    syncing = false;
  }
}

async function syncSites(client, userId) {
  const pending = await db.getUnsyncedSites();

  for (const site of pending) {
    try {
      const { error } = await client.from('sites').upsert({
        id: site.id,
        user_id: site.user_id || userId,
        label: site.label,
        lat: site.lat,
        lng: site.lng,
        created_at: site.created_at,
      });
      if (error) throw error;

      await db.updateSite(site.id, { synced: true, user_id: site.user_id || userId });
    } catch (err) {
      console.error('Site sync failed, will retry later:', site.id, err);
    }
  }
}

async function syncObservations(client, userId) {
  const pending = await db.getUnsyncedObservations();

  for (const obs of pending) {
    try {
      const photoUrl = await uploadPhotoIfNeeded(client, obs);

      const { error } = await client.from('observations').upsert({
        id: obs.id,
        site_id: obs.site_id,
        phase: obs.phase,
        user_id: obs.user_id || userId,
        lat: obs.lat,
        lng: obs.lng,
        gps_accuracy_m: obs.gps_accuracy_m,
        photo_url: photoUrl,
        texture: obs.texture,
        sunlight: obs.sunlight,
        infiltration_time_sec: obs.infiltration_time_sec,
        flag_review: obs.flag_review,
        created_at: obs.created_at,
      });
      if (error) throw error;

      await db.updateObservation(obs.id, { synced: true, user_id: obs.user_id || userId, photo_url: photoUrl });
    } catch (err) {
      console.error('Observation sync failed, will retry later:', obs.id, err);
    }
  }
}

const EXTENSION_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

async function uploadPhotoIfNeeded(client, obs) {
  if (obs.photo_url) return obs.photo_url;
  if (!obs.photo_blob) return null;

  const contentType = obs.photo_blob.type || 'image/jpeg';
  const extension = EXTENSION_BY_MIME[contentType] || 'jpg';
  const path = `${obs.site_id}/${obs.id}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(path, obs.photo_blob, { upsert: true, contentType });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Wires up sync to run on load (if already online), whenever the device
 * comes back online, and on a slow interval as a safety net for failures
 * that an 'online' event wouldn't catch (e.g. a transient server error).
 */
export function startAutoSync() {
  if (!isSupabaseConfigured()) return;

  syncPendingData();
  window.addEventListener('online', syncPendingData);
  setInterval(syncPendingData, RETRY_INTERVAL_MS);
}
