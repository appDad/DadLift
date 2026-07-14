import React from "react";
import { DISPLAY } from "./theme";

/* Solid tab bar shown at the top of every main screen. The house tab always
   returns to the home page; the current screen is highlighted. */
export default function NavBar({ current, onNav, weighDue }) {
  const items = [
    ["home", "🏠", null],
    ["weigh", null, "WEIGH"],
    ["stats", null, "STATS"],
    ["library", null, "LIBRARY"],
    ["settings", "⚙", null],
  ];
  return (
    <div style={{
      display: "flex", gap: 2, overflowX: "auto", background: "#1B2430",
      WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      {items.map(([scr, icon, label]) => {
        const on = current === scr;
        const due = scr === "weigh" && weighDue;
        return (
          <button key={scr} onClick={() => onNav(scr)}
            style={{
              flexShrink: 0, border: "none", cursor: "pointer",
              padding: "13px 18px",
              background: on ? "rgba(255,255,255,0.12)" : "transparent",
              color: on ? "#FFFFFF" : due ? "#4FD79E" : "#AEB6C2",
              fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: 1,
              borderBottom: on ? "3px solid #5B8DEF" : "3px solid transparent",
              display: "flex", alignItems: "center", gap: 6, lineHeight: 1,
            }}>
            {icon && <span style={{ fontSize: 17 }}>{icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}
