import React, { useState, useEffect } from "react";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db, ADMIN_EMAIL } from "./firebase";
import { styles, DISPLAY, FONT_CSS } from "./theme";

/* Admin-only roster. Each doc in /allowlist is keyed by lowercase email;
   Firestore rules let those accounts read/write their own /users/{uid} data. */
export default function Users({ onBack }) {
  const [list, setList] = useState(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const S = styles;

  const refresh = async () => {
    try {
      const snap = await getDocs(collection(db, "allowlist"));
      setList(snap.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => a.email.localeCompare(b.email)));
    } catch (e) {
      setMsg("Couldn't load the roster: " + (e.message || e));
      setList([]);
    }
  };
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setMsg("That doesn't look like an email."); return; }
    if (em === ADMIN_EMAIL) { setMsg("You're the admin — you're always in."); return; }
    try {
      await setDoc(doc(db, "allowlist", em), { added: Date.now() });
      setEmail("");
      refresh();
    } catch (e) {
      setMsg("Add failed: " + (e.message || e));
    }
  };

  const remove = async (em) => {
    setMsg(null);
    try {
      await deleteDoc(doc(db, "allowlist", em));
      refresh();
    } catch (e) {
      setMsg("Remove failed: " + (e.message || e));
    }
  };

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={S.ghostBtn}>‹ back</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>USERS</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        <div style={{ fontSize: 13, color: "#C6CDD8", lineHeight: 1.5 }}>
          Anyone on this list can sign in with their Google account and gets their own
          private workouts, streaks, and stats. Removing someone locks them out but
          doesn't delete their data.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="their-email@gmail.com"
            type="email"
            style={{
              flex: 1, boxSizing: "border-box", background: "#161B23", color: "#E8EBF0",
              border: "1px solid #2A313D", borderRadius: 10, padding: "12px 12px", fontSize: 14,
            }}
          />
          <button onClick={add} style={{ ...S.startBtn, width: "auto", padding: "0 22px", fontSize: 16 }}>ADD</button>
        </div>
        {msg && <div style={{ fontSize: 13, color: "#F2B134" }}>{msg}</div>}

        <div style={{ ...S.card, cursor: "default", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#E8EBF0" }}>{ADMIN_EMAIL}</div>
            <div style={{ fontSize: 11, color: "#8A93A3" }}>admin — always allowed</div>
          </div>
        </div>

        {list === null && <div style={{ fontSize: 13, color: "#5C6575" }}>Loading roster…</div>}
        {list && list.map((u) => (
          <div key={u.email} style={{ ...S.card, cursor: "default", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "#E8EBF0" }}>{u.email}</div>
              {u.added && (
                <div style={{ fontSize: 11, color: "#8A93A3" }}>
                  added {new Date(u.added).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
            <button onClick={() => remove(u.email)} style={{ ...S.ghostBtn, color: "#E85D5D" }}>remove</button>
          </div>
        ))}
        {list && list.length === 0 && (
          <div style={{ fontSize: 13, color: "#5C6575" }}>No extra users yet — add an email above.</div>
        )}
      </div>
    </div>
  );
}
