/* Public progress snapshots. shares/{token} is readable by ANYONE with the
   link (unguessable token, no login) but only writable by its owner. The doc
   holds a JSON snapshot, so viewers see exactly what was last published —
   nothing live, nothing private. */
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { computeSummary } from "./summary";

export function newShareId() {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch (e) {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export const shareUrl = (id) => `${window.location.origin}/s/${id}`;

export function publishSnapshot(uid, name, history, shareId) {
  const payload = { name, updated: Date.now(), ...computeSummary(history) };
  return setDoc(doc(db, "shares", shareId), {
    uid,
    value: JSON.stringify(payload),
    updated: Date.now(),
  }).catch(() => {});
}

export function removeSnapshot(shareId) {
  return deleteDoc(doc(db, "shares", shareId)).catch(() => {});
}

export async function fetchSnapshot(shareId) {
  try {
    const snap = await getDoc(doc(db, "shares", shareId));
    if (!snap.exists()) return null;
    return JSON.parse(snap.data().value);
  } catch (e) {
    return null;
  }
}
