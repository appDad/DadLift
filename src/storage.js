/* Persistence layer — same loadJSON/saveJSON signatures as the original artifact,
   backed by Firestore docs users/{uid}/kv/{key} with a single `value` JSON-string field.
   Firestore's persistentLocalCache makes both work offline. */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

const timers = {};

export async function loadJSON(key, fallback) {
  try {
    const uid = auth.currentUser.uid;
    const snap = await getDoc(doc(db, "users", uid, "kv", key));
    const v = snap.exists() ? snap.data().value : null;
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function saveJSON(key, val, { debounce = 0 } = {}) {
  const uid = auth.currentUser && auth.currentUser.uid;
  if (!uid) return;
  const write = () =>
    setDoc(doc(db, "users", uid, "kv", key), {
      value: JSON.stringify(val),
      updated: Date.now(),
    }).catch(() => {
      /* offline — Firestore queues it anyway; swallow hard failures */
    });
  if (debounce) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(write, debounce);
  } else {
    write();
  }
}
