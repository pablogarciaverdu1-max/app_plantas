// Almacenamiento local: IndexedDB para fotos y fichas, localStorage sólo para ajustes.
// Las fotos del iPhone pesan megas, así que no caben en localStorage (límite ~5 MB).

const DB_NAME = 'plantas-db';
const DB_VERSION = 1;
const STORE_PLANTS = 'plants';
const STORE_PHOTOS = 'photos';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PLANTS)) {
        const s = db.createObjectStore(STORE_PLANTS, { keyPath: 'id' });
        s.createIndex('creada', 'creada');
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

// --- Fotos ---------------------------------------------------------------

export function savePhoto(id, blob) {
  return tx(STORE_PHOTOS, 'readwrite', (s) => s.put({ id, blob }));
}

export async function getPhotoURL(id) {
  if (!id) return null;
  const row = await tx(STORE_PHOTOS, 'readonly', (s) => s.get(id));
  return row ? URL.createObjectURL(row.blob) : null;
}

export function deletePhoto(id) {
  return tx(STORE_PHOTOS, 'readwrite', (s) => s.delete(id));
}

// --- Plantas -------------------------------------------------------------

export function savePlant(plant) {
  return tx(STORE_PLANTS, 'readwrite', (s) => s.put(plant));
}

export function getPlant(id) {
  return tx(STORE_PLANTS, 'readonly', (s) => s.get(id));
}

export async function allPlants() {
  const list = await tx(STORE_PLANTS, 'readonly', (s) => s.getAll());
  return (list || []).sort((a, b) => (b.creada || '').localeCompare(a.creada || ''));
}

export async function deletePlant(id) {
  const plant = await getPlant(id);
  if (plant) {
    const ids = [plant.fotoId, ...(plant.historial || []).map((h) => h.fotoId)];
    for (const fid of ids.filter(Boolean)) await deletePhoto(fid);
  }
  return tx(STORE_PLANTS, 'readwrite', (s) => s.delete(id));
}

export async function wipeAll() {
  await tx(STORE_PLANTS, 'readwrite', (s) => s.clear());
  await tx(STORE_PHOTOS, 'readwrite', (s) => s.clear());
  localStorage.clear();
}

// --- Ajustes -------------------------------------------------------------

const AJUSTES_KEY = 'plantas.ajustes';

export const ajustesPorDefecto = {
  apiKey: '',
  ubicacion: '',
  notas: '',
};

export function getAjustes() {
  try {
    return { ...ajustesPorDefecto, ...JSON.parse(localStorage.getItem(AJUSTES_KEY) || '{}') };
  } catch {
    return { ...ajustesPorDefecto };
  }
}

export function setAjustes(parcial) {
  const nuevo = { ...getAjustes(), ...parcial };
  localStorage.setItem(AJUSTES_KEY, JSON.stringify(nuevo));
  return nuevo;
}
