import React from "react";
import { DISPLAY } from "./theme";

/* Outline icons that inherit the tab's text color (stroke=currentColor) so the
   house and gear match the labels instead of rendering as colored emoji. */
const HomeIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);
const GearIcon = ({ size = 19 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* Solid tab bar shown at the top of every main screen. The house tab always
   returns to the home page; the current screen is highlighted. Tabs stretch to
   fill the bar. */
export default function NavBar({ current, onNav, weighDue }) {
  const items = [
    ["home", "home", null],
    ["weigh", null, "WEIGH"],
    ["stats", null, "STATS"],
    ["library", null, "LIBRARY"],
    ["settings", "gear", null],
  ];
  return (
    <div style={{
      display: "flex",
      background: "linear-gradient(135deg, #4F7DF0 0%, #5E8BF2 55%, #6E7DEA 100%)",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      {items.map(([scr, icon, label]) => {
        const on = current === scr;
        const due = scr === "weigh" && weighDue;
        return (
          <button key={scr} onClick={() => onNav(scr)}
            style={{
              flex: 1, border: "none", cursor: "pointer",
              padding: "13px 4px",
              background: on ? "rgba(255,255,255,0.20)" : "transparent",
              color: on ? "#FFFFFF" : due ? "#9BF3C8" : "rgba(255,255,255,0.82)",
              fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: 0.8,
              borderBottom: on ? "3px solid #FFFFFF" : "3px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, lineHeight: 1,
            }}>
            {icon === "home" && <HomeIcon />}
            {icon === "gear" && <GearIcon />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
