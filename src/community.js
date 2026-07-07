/* Shared exercise pool. Docs live at /community/{exerciseId} with the exercise
   JSON-stringified in `data` (Firestore can't store the nested frame arrays raw).
   Rules: any allowlisted user can read/publish; only the contributor or the
   admin can overwrite/delete a doc. */
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { validateExercise, resolveFrames } from "./exercises";

export async function loadCommunity() {
  try {
    const snap = await getDocs(collection(db, "community"));
    return snap.docs
      .map((d) => {
        try {
          const raw = d.data();
          const ex = JSON.parse(raw.data);
          if (!ex || ex.id !== d.id || validateExercise(ex).length) return null;
          return { ex, by: raw.by || "someone" };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function publishExercise(ex, byEmail) {
  const clean = { ...ex, frames: resolveFrames(ex), pose: undefined };
  return setDoc(doc(db, "community", ex.id), {
    data: JSON.stringify(clean),
    name: ex.name,
    by: byEmail,
    ts: Date.now(),
  }).catch(() => { /* offline or someone else's id — sharing is best-effort */ });
}

export function unpublishExercise(id) {
  return deleteDoc(doc(db, "community", id)).catch(() => {});
}
