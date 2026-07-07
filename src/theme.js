/* ============ styles ============ */
export const DISPLAY = `'Barlow Condensed','Arial Narrow',system-ui,sans-serif`;
export const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap');`;

export const styles = {
  app: {
    minHeight: "100vh",
    background: "#14181F",
    color: "#E8EBF0",
    fontFamily: "system-ui,-apple-system,sans-serif",
    maxWidth: 520,
    margin: "0 auto",
    paddingBottom: 24,
  },
  header: { padding: "28px 20px 14px" },
  eyebrow: { fontSize: 13, letterSpacing: 2, color: "#8A93A3", textTransform: "uppercase" },
  title: { fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, letterSpacing: 3, lineHeight: 1.1 },
  sub: { fontSize: 14, color: "#8A93A3", marginTop: 4 },
  card: { background: "#1B212B", borderRadius: 12, padding: 12, cursor: "pointer" },
  pill: { border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  startBtn: {
    width: "100%", border: "none", borderRadius: 12, padding: "16px 0",
    fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: 2,
    background: "#E8EBF0", color: "#14181F", cursor: "pointer",
  },
  ghostBtn: { background: "none", border: "none", color: "#8A93A3", fontSize: 15, cursor: "pointer", padding: 6 },
  settingsLabel: { fontSize: 11, letterSpacing: 1.5, color: "#8A93A3", fontWeight: 700, marginTop: 8 },
  textarea: {
    width: "100%", boxSizing: "border-box", background: "#161B23", color: "#C6CDD8",
    border: "1px solid #2A313D", borderRadius: 10, padding: 10,
    fontFamily: "ui-monospace,monospace", fontSize: 12, resize: "vertical",
  },
};
