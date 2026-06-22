import { supabase } from './supabase.js';
import { photoSet, photoGetAll } from './db.js';

const BUCKET = 'photos';

// ── base64 ↔ Blob helpers ──────────────────────────────────────────────────
function base64ToBlob(base64) {
  const [header, data] = base64.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsDataURL(blob);
  });
}

// ── URL-safe base64 for storage filenames ──────────────────────────────────
const encodeKey = key =>
  btoa(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const decodeKey = enc => {
  const pad = enc.length % 4 ? '='.repeat(4 - enc.length % 4) : '';
  return atob((enc + pad).replace(/-/g, '+').replace(/_/g, '/'));
};

// ── Upload one photo to Supabase Storage ──────────────────────────────────
export async function storageUpload(userId, idbKey, base64) {
  if (!userId || !base64) return;
  try {
    const blob = base64ToBlob(base64);
    const { error } = await supabase.storage.from(BUCKET).upload(
      `${userId}/${encodeKey(idbKey)}`,
      blob,
      { upsert: true, contentType: blob.type }
    );
    if (error) console.error('[Storage] upload error:', error);
  } catch (e) {
    console.error('[Storage] upload exception:', e);
  }
}

// ── Delete one photo from Supabase Storage ────────────────────────────────
export async function storageDelete(userId, idbKey) {
  if (!userId) return;
  try {
    await supabase.storage.from(BUCKET).remove([`${userId}/${encodeKey(idbKey)}`]);
  } catch {}
}

// ── Sync all missing cloud photos down into IndexedDB ─────────────────────
// Returns updated { slots, meals } photo state, or null if nothing changed.
export async function storageSync(userId) {
  if (!userId) return null;
  try {
    const { data: files, error } = await supabase.storage
      .from(BUCKET).list(userId, { limit: 1000 });
    if (error || !files?.length) return null;

    // Compare against what's already in IndexedDB
    const cached = await photoGetAll();
    const missing = files.filter(f => {
      try {
        const idbKey = decodeKey(f.name);
        const [type, ...rest] = idbKey.split(':');
        if (type === 'slot') return !cached.slots[rest[0]]?.[rest[1]];
        if (type === 'meal') return !cached.meals[rest[0]];
        return false;
      } catch { return false; }
    });

    if (!missing.length) return null;

    await Promise.all(missing.map(async f => {
      try {
        const idbKey = decodeKey(f.name);
        const { data: blob } = await supabase.storage
          .from(BUCKET).download(`${userId}/${f.name}`);
        if (!blob) return;
        const base64 = await blobToBase64(blob);
        await photoSet(idbKey, base64);
      } catch {}
    }));

    return photoGetAll();
  } catch (e) {
    console.error('[Storage] sync error:', e);
    return null;
  }
}

// ── Upload every photo in an { slots, meals } object ─────────────────────
export async function storageUploadAll(userId, allPhotos) {
  if (!userId) return;
  const uploads = [];
  Object.entries(allPhotos.slots || {}).forEach(([date, slotMap]) =>
    Object.entries(slotMap).forEach(([slot, photo]) =>
      uploads.push(storageUpload(userId, `slot:${date}:${slot}`, photo))
    )
  );
  Object.entries(allPhotos.meals || {}).forEach(([id, photo]) =>
    uploads.push(storageUpload(userId, `meal:${id}`, photo))
  );
  await Promise.all(uploads);
}
