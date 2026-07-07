import React, { useState, useEffect } from "react";
import { styles, DISPLAY, FONT_CSS } from "./theme";
import { fetchSnapshot } from "./share";
import { SummaryBody } from "./Stats.jsx";

/* Public, login-free progress page at /s/{token}. Renders the snapshot the
   owner last published — nothing here can read or touch their account. */
export default function SharedPage({ token }) {
  const [data, setData] = useState(undefined); // undefined = loading, null = not live
  useEffect(() => { fetchSnapshot(token).then(setData); }, [token]);
  const S = styles;

  if (data === undefined) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{FONT_CSS}</style>
        <div style={{ color: "#9AA3B0", fontSize: 13, letterSpacing: 2 }}>LOADING…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <style>{FONT_CSS}</style>
        <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>DADLIFT</div>
        <div style={{ color: "#6C7686", fontSize: 14, maxWidth: 300, lineHeight: 1.5 }}>
          This progress page isn't live right now. The owner may have turned sharing off.
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "28px 20px 14px" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: "#6C7686", textTransform: "uppercase" }}>
          Shared progress · updated {new Date(data.updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 700, letterSpacing: 2, lineHeight: 1.1 }}>
          {(data.name || "SOMEONE").toUpperCase()}'S DADLIFT
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        <SummaryBody m={data} />
        <div style={{ textAlign: "center", fontSize: 11, color: "#9AA3B0", paddingTop: 6 }}>
          Read-only snapshot · powered by DadLift
        </div>
      </div>
    </div>
  );
}
