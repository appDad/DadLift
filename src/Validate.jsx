import React, { useState, useEffect } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { styles, DISPLAY, FONT_CSS } from "./theme";

/* Admin-only review queue: aggregates the tweaks people made to exercises on
   their own (difficulty, counted/timed, both-sides) and lets the head validator
   promote the ones worth keeping to the global default for everyone. */
const PROP_LABEL = { level: "Difficulty", type: "Counted / timed", uni: "Both sides" };
const LEVEL_NAME = { beg: "Beginner", int: "Intermediate", adv: "Advanced" };

export default function Validate({ allEx, exOverrides, onMakeGlobal, nav }) {
  const S = styles;
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState({});
  const nameOf = (id) => (allEx.find((e) => e.id === id) || {}).name || id;

  useEffect(() => {
    (async () => {
      try {
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
          if (d.id === "levelover") {
            for (const [id, lv] of Object.entries(val))
              if (LEVEL_NAME[lv]) bump(id, "level", { level: lv }, LEVEL_NAME[lv], uid);
          } else if (d.id === "unilateral") {
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
        // hide anything that already matches the current global default
        const list = Object.values(agg)
          .map((s) => ({ ...s, count: s.users.size }))
          .filter((s) => {
            const cur = exOverrides[s.exId] || {};
            return Object.entries(s.patch).some(([k, v]) => cur[k] !== v);
          })
          .sort((a, b) => b.count - a.count || nameOf(a.exId).localeCompare(nameOf(b.exId)));
        setRows(list);
      } catch (e) {
        setErr(e.message || String(e));
        setRows([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const applied = done[k];
          return (
            <div key={k} style={{ ...S.card, cursor: "default", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>{nameOf(s.exId)}</div>
                <div style={{ fontSize: 12, color: "#6C7686", marginTop: 2 }}>
                  {PROP_LABEL[s.prop]} → <b style={{ color: "#3D4756" }}>{s.label}</b>
                  <span style={{ color: "#9AA3B0" }}> · {s.count} {s.count === 1 ? "person" : "people"}</span>
                </div>
              </div>
              <button disabled={applied}
                onClick={() => { onMakeGlobal(s.exId, s.patch); setDone((d) => ({ ...d, [k]: true })); }}
                style={{ ...S.pill, flexShrink: 0, background: applied ? "#DFF5EA" : "#1B2430", color: applied ? "#2FA671" : "#F5F6F8" }}>
                {applied ? "✓ global" : "make global"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
