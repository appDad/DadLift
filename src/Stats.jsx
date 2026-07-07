import React, { useMemo } from "react";
import { GROUPS } from "./exercises";
import { styles, DISPLAY, FONT_CSS } from "./theme";
import { computeSummary } from "./summary";

export function BarChart({ title, weeks, counts, color }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
        {counts.map((c, i) => (
          <div key={weeks[i]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            {c > 0 && <div style={{ fontSize: 10, color: "#6C7686", marginBottom: 3 }}>{c}</div>}
            <div style={{
              width: "100%", borderRadius: "4px 4px 0 0",
              height: `${(c / max) * 82}%`, minHeight: c > 0 ? 4 : 2,
              background: c > 0 ? color : "#E4E7EC",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {weeks.map((w, i) => (
          <div key={w} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#9AA3B0" }}>
            {(i === 0 || i === weeks.length - 1 || i === Math.floor(weeks.length / 2))
              ? new Date(w + "T00:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummaryBody({ m }) {
  const bigStats = [
    ["WORKOUTS", m.totals.workouts],
    ["STREAK", m.totals.streak + "d"],
    ["BEST STREAK", m.totals.best + "d"],
    ["EXERCISES", m.totals.totalEx],
    ["TOTAL REPS", m.totals.totalReps],
    ["TIMED WORK", Math.round(m.totals.totalSecs / 60) + "m"],
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {bigStats.map(([k, v]) => (
          <div key={k} style={{ background: "#FFFFFF", borderRadius: 10, padding: "12px 0", textAlign: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.2, color: "#6C7686" }}>{k}</div>
          </div>
        ))}
      </div>

      <BarChart title="Workouts per week" weeks={m.weeks} counts={m.workoutsPerWeek} color="#46C98B" />
      <BarChart title="Exercises per week" weeks={m.weeks} counts={m.exercisesPerWeek} color="#5B8DEF" />
      <BarChart title="Reps per week" weeks={m.weeks} counts={m.repsPerWeek} color="#E85D5D" />

      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          Muscle group split (sets completed)
        </div>
        {Object.keys(GROUPS).map((g) => {
          const c = m.groupTotals[g] || 0;
          return (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 74, fontSize: 12, color: GROUPS[g].color, fontWeight: 700 }}>{GROUPS[g].label}</div>
              <div style={{ flex: 1, height: 14, background: "#E4E7EC", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: `${(c / m.groupMax) * 100}%`, height: "100%", background: GROUPS[g].color, borderRadius: 7 }} />
              </div>
              <div style={{ width: 34, textAlign: "right", fontSize: 12, color: "#6C7686" }}>{c}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
          Recent sessions
        </div>
        {m.recent.length === 0 && (
          <div style={{ fontSize: 13, color: "#9AA3B0" }}>No workouts logged yet.</div>
        )}
        {m.recent.map((h) => (
          <div key={h.d} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #E4E7EC", fontSize: 13 }}>
            <div style={{ color: "#3D4756" }}>
              {new Date(h.d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div style={{ color: "#6C7686" }}>
              {h.mode} · {h.ex} sets{h.reps ? ` · ${h.reps} reps` : ""}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Stats({ history, onBack, shareOn, shareLink, onToggleShare, onCopyShare, shareCopied }) {
  const S = styles;
  const m = useMemo(() => computeSummary(history), [history]);

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={S.ghostBtn}>‹ back</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>STATS</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, textTransform: "uppercase" }}>
                Public progress page
              </div>
              <div style={{ fontSize: 12, color: "#9AA3B0", marginTop: 3 }}>
                {shareOn ? "Live — anyone with the link can see this page, no login." : "Off — the link shows nothing until you turn it on."}
              </div>
            </div>
            <button onClick={() => onToggleShare(!shareOn)}
              style={{ ...S.pill, background: shareOn ? "#2FA671" : "#E4E7EC", color: shareOn ? "#FFFFFF" : "#6C7686" }}>
              {shareOn ? "LIVE" : "OFF"}
            </button>
          </div>
          {shareOn && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, fontSize: 11, color: "#6C7686", fontFamily: "ui-monospace,monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {shareLink}
              </div>
              <button onClick={onCopyShare} style={{ ...S.pill, background: "#1B2430", color: "#F5F6F8", flexShrink: 0 }}>
                {shareCopied ? "COPIED ✓" : "copy link"}
              </button>
            </div>
          )}
        </div>

        <SummaryBody m={m} />
      </div>
    </div>
  );
}
