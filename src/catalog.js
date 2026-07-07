/* Admin-managed equipment catalog extensions. One doc (config/equipment)
   readable by every roster member, writable only by the admin — so new gear
   can be added without touching code, and everyone shares the same canonical
   keys. */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { extendEquipment } from "./exercises";

export async function loadEquipExtensions() {
  try {
    const snap = await getDoc(doc(db, "config", "equipment"));
    const extra = snap.exists() ? JSON.parse(snap.data().value || "{}") : {};
    extendEquipment(extra);
    return extra;
  } catch (e) {
    return {};
  }
}

export function saveEquipExtensions(extra) {
  return setDoc(doc(db, "config", "equipment"), {
    value: JSON.stringify(extra),
    updated: Date.now(),
  }).catch(() => {});
}
