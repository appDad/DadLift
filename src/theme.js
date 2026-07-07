/* ============ styles ============ */
export const DISPLAY = `'Barlow Condensed','Arial Narrow',system-ui,sans-serif`;
export const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap');`;

export const styles = {
  app: {
    minHeight: "100vh",
    background: "#F5F6F8",
    color: "#1B2430",
    fontFamily: "system-ui,-apple-system,sans-serif",
    maxWidth: 520,
    margin: "0 auto",
    paddingBottom: 24,
  },
  header: { padding: "28px 20px 14px" },
  eyebrow: { fontSize: 13, letterSpacing: 2, color: "#6C7686", textTransform: "uppercase" },
  title: { fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, letterSpacing: 3, lineHeight: 1.1 },
  sub: { fontSize: 14, color: "#6C7686", marginTop: 4 },
  card: { background: "#FFFFFF", borderRadius: 12, padding: 12, cursor: "pointer" },
  pill: { border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  startBtn: {
    width: "100%", border: "none", borderRadius: 12, padding: "16px 0",
    fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: 2,
    background: "#1B2430", color: "#F5F6F8", cursor: "pointer",
  },
  ghostBtn: { background: "none", border: "none", color: "#6C7686", fontSize: 15, cursor: "pointer", padding: 6 },
  settingsLabel: { fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, marginTop: 8 },
  textarea: {
    width: "100%", boxSizing: "border-box", background: "#EFF1F5", color: "#3D4756",
    border: "1px solid #DDE2E9", borderRadius: 10, padding: 10,
    fontFamily: "ui-monospace,monospace", fontSize: 12, resize: "vertical",
  },
};
