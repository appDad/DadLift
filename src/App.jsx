import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider, ADMIN_EMAIL } from "./firebase";
import DadLift from "./DadLift.jsx";

const S = {
  splash: {
    minHeight: "100vh", background: "#F5F6F8", color: "#1B2430",
    fontFamily: "system-ui,-apple-system,sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 18, padding: 24, textAlign: "center",
  },
  title: {
    fontFamily: `'Barlow Condensed','Arial Narrow',system-ui,sans-serif`,
    fontSize: 56, fontWeight: 700, letterSpacing: 4, lineHeight: 1,
  },
  googleBtn: {
    display: "flex", alignItems: "center", gap: 12,
    border: "none", borderRadius: 12, padding: "14px 26px",
    background: "#1B2430", color: "#F5F6F8",
    fontSize: 16, fontWeight: 600, cursor: "pointer",
  },
  ghost: { background: "none", border: "none", color: "#6C7686", fontSize: 14, cursor: "pointer", padding: 8 },
};

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap');`;

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [allowed, setAllowed] = useState(null); // null = checking
  const [err, setErr] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    let dead = false;
    (async () => {
      const email = (user.email || "").toLowerCase();
      let ok = email === ADMIN_EMAIL;
      if (!ok && email) {
        try {
          const snap = await getDoc(doc(db, "allowlist", email));
          ok = snap.exists();
        } catch (e) {
          ok = false;
        }
      }
      if (dead) return;
      setAllowed(ok);
    })();
    return () => { dead = true; };
  }, [user]);

  const doSignIn = async () => {
    setErr(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      // popup blocked (common in installed PWAs) — fall back to redirect
      try { await signInWithRedirect(auth, googleProvider); }
      catch (e2) { setErr(e2.message || "Sign-in failed."); }
    }
  };

  if (user === undefined || (user && allowed === null)) {
    return (
      <div style={S.splash}>
        <style>{FONT_CSS}</style>
        <div style={S.title}>DADLIFT</div>
        <div style={{ color: "#9AA3B0", fontSize: 13, letterSpacing: 2 }}>LOADING…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={S.splash}>
        <style>{FONT_CSS}</style>
        <img src="/icons/dadlift-icon-192.png" alt="" width={110} height={110} style={{ borderRadius: "50%" }} />
        <div style={S.title}>DADLIFT</div>
        <div style={{ color: "#6C7686", fontSize: 14, maxWidth: 280 }}>
          Daily dumbbell + med ball workouts. Sign in to sync your streak everywhere.
        </div>
        <button style={S.googleBtn} onClick={doSignIn}>
          <GoogleG /> Sign in with Google
        </button>
        {err && <div style={{ color: "#E85D5D", fontSize: 13, maxWidth: 320 }}>{err}</div>}
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={S.splash}>
        <style>{FONT_CSS}</style>
        <div style={S.title}>DADLIFT</div>
        <div style={{ color: "#3D4756", fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>
          Signed in as <b>{user.email}</b>, but this account isn't on the roster yet.
          Ask the admin to add you from the Users screen.
        </div>
        <button style={S.ghost} onClick={() => signOut(auth)}>sign out</button>
      </div>
    );
  }

  return (
    <DadLift
      user={user}
      isAdmin={(user.email || "").toLowerCase() === ADMIN_EMAIL}
      onSignOut={() => signOut(auth)}
    />
  );
}
