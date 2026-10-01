const DB_NAME = "voicemaster_local";
const STORE = "tracks";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type LocalTrack = { ownerId: string;
  id: string; title: string; voice: string; style: string; createdAt: number; kind: "narration" | "podcast";
  sourceText?: string; blob: Blob;
};

export async function saveTrack(track: LocalTrack) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(track);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function getTracks(ownerId: string): Promise<LocalTrack[]> {
  const db = await openDb();
  const result = await new Promise<LocalTrack[]>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
  });
  db.close(); return result.filter(t => t.ownerId === ownerId).sort((a,b) => b.createdAt-a.createdAt);
}
export async function deleteTrack(ownerId: string, id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(`${ownerId}:${id}`);
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
export async function clearTracks(ownerId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE); const req = store.getAllKeys();
    req.onsuccess = () => req.result.forEach(k => { if (String(k).startsWith(ownerId + ":")) store.delete(k); });
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
