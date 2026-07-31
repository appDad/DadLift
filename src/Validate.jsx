import React, { useState, useEffect, useRef } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { loadJSON, saveJSON } from "./storage";
import { styles, DISPLAY, FONT_CSS } from "./theme";

/* Admin-only review queue: aggregates the tweaks people made to exercises on
   their own (difficulty, counted/timed, both-sides) and lets the head validator
   promote the ones worth keeping to the global default for everyone. */
const PROP_LABEL = { type: "Counted / timed", uni: "Both sides" };

/* stable id for a suggestion (exercise + property + value) so discards persist */
const keyOf = (s) => {
  const v = s.prop === "uni" ? String(s.patch.uni)
    : s.patch.type === "time" ? `time${s.patch.secs || ""}` : "reps";
  return `${s.exId}|${s.prop}|${v}`;
};

/* Shared aggregator used by the screen AND the home-screen review badge:
   reads everyone's tweaks, drops ones already global or discarded, returns the
   pending suggestion list (sorted by headcount). */
export async function fetchValidations(exOverrides, dismissedSet) {
  const dset = dismissedSet || new Set(await loadJSON("validatedismiss", []));
  const snap = await getDocs(collectionGroup(db, "kv"));
  const agg = {};
  const bump = (exId, prop, patch, label, uid) => {
    const k = `${exId}|${prop}|${label}`;
    if (!agg[k]) agg[k] = { exId, prop, patch, label, users: new Set() };
    agg[k].users.add(uid);
  };
  snap.forEach((d) => {
    const uid = d.ref.parent.parent ? d.ref.parent.parent.id : "?";
    let val; try { val = JSON.parse(d.data().value); } catch (e) { return; }
    if (!val || typeof val !== "object") return;
    if (d.id === "unilateral") {
      for (const [id, u] of Object.entries(val))
        bump(id, "uni", { uni: !!u }, u ? "Per side (R/L)" : "No sides", uid);
    } else if (d.id === "typeover") {
      for (const [id, t] of Object.entries(val)) {
        if (!t || !t.type) continue;
        bump(id, "type", t.type === "time" ? { type: "time", secs: t.secs } : { type: "reps" },
          t.type === "time" ? `Timed ${t.secs || 40}s` : "Counted", uid);
      }
    }
  });
  return Object.values(agg)
    .map((s) => ({ ...s, count: s.users.size }))
    .filter((s) => {
      if (dset.has(keyOf(s))) return false;
      const cur = exOverrides[s.exId] || {};
      return Object.entries(s.patch).some(([k, v]) => cur[k] !== v);
    })
    .sort((a, b) => b.count - a.count);
}

export default function Validate({ allEx, exOverrides, onMakeGlobal, onCount, nav }) {
  const S = styles;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const dismissedRef = useRef([]); // persisted keys the admin has discarded
  const nameOf = (id) => (allEx.find((e) => e.id === id) || {}).name || id;
  // promote to global; drop this row (it now matches the default, so it's also
  // hidden on reload). A competing value for the same exercise stays — it still
  // differs from the new default, so it's a real "someone disagrees" item.
  const makeGlobal = (s) => {
    onMakeGlobal(s.exId, s.patch);
    const key = keyOf(s);
    const next = [...dismissedRef.current, key]; // also record it so it never re-nags
    dismissedRef.current = next;
    saveJSON("validatedismiss", next);
    setRows((rs) => rs.filter((r) => keyOf(r) !== key));
  };
  // reject a suggestion — persist it so it stays gone; leftover rows = unreviewed
  const discard = (s) => {
    const key = keyOf(s);
    const next = [...dismissedRef.current, key];
    dismissedRef.current = next;
    saveJSON("validatedismiss", next);
    setRows((rs) => rs.filter((r) => keyOf(r) !== key));
  };

  useEffect(() => {
    (async () => {
      try {
        dismissedRef.current = await loadJSON("validatedismiss", []);
        const list = await fetchValidations(exOverrides, new Set(dismissedRef.current));
        list.sort((a, b) => b.count - a.count || nameOf(a.exId).localeCompare(nameOf(b.exId)));
        setRows(list);
      } catch (e) {
        setErr(e.message || String(e));
        setRows([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the home-screen badge in sync as rows are promoted / discarded
  useEffect(() => { if (rows && onCount) onCount(rows.length); }, [rows, onCount]);

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      {nav}
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>VALIDATE</div>
        <div style={{ fontSize: 13, color: "#6C7686", marginTop: 4, lineHeight: 1.5 }}>
          Tweaks people made to exercises on their own. Promote the ones you agree with to the global default — it becomes everyone's starting point (their own picks still win for them).
        </div>
      </div>
      {err && <div style={{ padding: "0 16px 8px", color: "#E85D5D", fontSize: 13 }}>Couldn't load: {err}</div>}
      {rows === null && <div style={{ padding: 16, color: "#9AA3B0", fontSize: 13 }}>Loading changes…</div>}
      {rows && rows.length === 0 && !err && (
        <div style={{ padding: 16, color: "#9AA3B0", fontSize: 13 }}>Nothing to review — no personal tweaks differ from the current defaults.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 16px 24px" }}>
        {rows && rows.map((s) => {
          const k = `${s.exId}|${s.prop}|${s.label}`;
          return (
            <div key={k} style={{ ...S.card, cursor: "default", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>{nameOf(s.exId)}</div>
                <div style={{ fontSize: 12, color: "#6C7686", marginTop: 2 }}>
                  {PROP_LABEL[s.prop]} → <b style={{ color: "#3D4756" }}>{s.label}</b>
                  <span style={{ color: "#9AA3B0" }}> · {s.count} {s.count === 1 ? "person" : "people"}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "stretch" }}>
                <button onClick={() => makeGlobal(s)}
                  style={{ ...S.pill, background: "#1B2430", color: "#F5F6F8", fontSize: 12, padding: "6px 14px" }}>
                  make global
                </button>
                <button onClick={() => discard(s)}
                  style={{ border: "none", background: "none", color: "#9AA3B0", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                  discard
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
