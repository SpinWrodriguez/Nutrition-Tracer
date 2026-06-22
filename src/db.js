const DB_NAME = 'nt-media';
const STORE   = 'photos';
let _db = null;

async function open() {
  if (_db) return _db;
  return (_db = await new Promise((ok, fail) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
    req.onsuccess = e => ok(e.target.result);
    req.onerror = e => fail(e.target.error);
  }));
}

function idb(mode, fn) {
  return open().then(db => new Promise((ok, fail) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => ok(req.result);
    req.onerror = e => fail(e.target.error);
  }));
}

export const photoSet   = (key, val) => idb('readwrite', s => s.put(val, key));
export const photoDel   = (key)      => idb('readwrite', s => s.delete(key));
export const photoClear = ()         => idb('readwrite', s => s.clear());

// Returns { slots: { date: { slotKey: base64 } }, meals: { mealId: base64 } }
export function photoGetAll() {
  return open().then(db => new Promise((ok, fail) => {
    const slots = {}, meals = {};
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    req.onsuccess = e => {
      const cur = e.target.result;
      if (!cur) return ok({ slots, meals });
      const [type, ...rest] = cur.key.split(':');
      if (type === 'meal') {
        meals[rest[0]] = cur.value;
      } else if (type === 'slot') {
        if (!slots[rest[0]]) slots[rest[0]] = {};
        slots[rest[0]][rest[1]] = cur.value;
      }
      cur.continue();
    };
    req.onerror = e => fail(e.target.error);
  }));
}
