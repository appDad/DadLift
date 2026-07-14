/* Admin-managed exercise property overrides. One doc (config/exercises)
   readable by every roster member, writable only by the admin — so the admin
   (as validator) can fix an exercise's type/timing/family/both-sides flag once
   and it applies for everyone. Shape: { [exerciseId]: { type?, secs?, fam?, uni? } } */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function loadExOverrides() {
  try {
    const snap = await getDoc(doc(db, "config", "exercises"));
    return snap.exists() ? JSON.parse(snap.data().value || "{}") : {};
  } catch (e) {
    return {};
  }
}

export function saveExOverrides(all) {
  return setDoc(doc(db, "config", "exercises"), {
    value: JSON.stringify(all),
    updated: Date.now(),
  }).catch(() => {});
}
