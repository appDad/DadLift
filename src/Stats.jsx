import React, { useState, useEffect, useMemo } from "react";
import { loadJSON } from "./storage";
import { GROUPS } from "./exercises";
import { styles, DISPLAY, FONT_CSS } from "./theme";
import { ymd, calcStreak } from "./DadLift.jsx";

/* week bucket = the Monday that starts that week */
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - day);
  return ymd(d);
}
function lastWeeks(n) {
  const weeks = [];
  const cur = new Date(mondayOf(ymd(new Date())) + "T00:00:00");
  for (let i = 0; i < n; i++) {
    weeks.unshift(ymd(cur));
    cur.setDate(cur.getDate() - 7);
  }
  return weeks;
}
function bestStreakOf(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    if (prev) {
      const p = new Date(prev + "T00:00:00");
      p.setDate(p.getDate() + 1);
      run = ymd(p) === d ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function BarChart({ title, weeks, counts, color }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ background: "#1B212B", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#8A93A3", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
        {counts.map((c, i) => (
          <div key={weeks[i]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            {c > 0 && <div style={{ fontSize: 10, color: "#8A93A3", marginBottom: 3 }}>{c}</div>}
            <div style={{
              width: "100%", borderRadius: "4px 4px 0 0",
              height: `${(c / max) * 82}%`, minHeight: c > 0 ? 4 : 2,
              background: c > 0 ? color : "#232A35",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {weeks.map((w, i) => (
          <div key={w} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#5C6575" }}>
            {(i === 0 || i === weeks.length - 1 || i === Math.floor(weeks.length / 2))
              ? new Date(w + "T00:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Stats({ history, onBack }) {
  const [logins, setLogins] = useState([]);
  useEffect(() => { loadJSON("logins", []).then(setLogins); }, []);
  const S = styles;

  const m = useMemo(() => {
    const weeks = lastWeeks(12);
    const wIdx = Object.fromEntries(weeks.map((w, i) => [w, i]));
    const workoutsPerWeek = weeks.map(() => 0);
    const exercisesPerWeek = weeks.map(() => 0);
    const loginsPerWeek = weeks.map(() => 0);
    const groupTotals = {};
    let totalEx = 0, totalReps = 0;

    for (const h of history) {
      totalEx += (h.n || 0) * (h.rounds || 1);
      totalReps += h.totalReps || 0;
      const wk = wIdx[mondayOf(h.d)];
      if (wk !== undefined) {
        workoutsPerWeek[wk]++;
        exercisesPerWeek[wk] += (h.n || 0) * (h.rounds || 1);
      }
      for (const [g, c] of Object.entries(h.groups || {})) {
        groupTotals[g] = (groupTotals[g] || 0) + c * (h.rounds || 1);
      }
    }
    for (const d of logins) {
      const wk = wIdx[mondayOf(d)];
      if (wk !== undefined) loginsPerWeek[wk]++;
    }

    return {
      weeks, workoutsPerWeek, exercisesPerWeek, loginsPerWeek, groupTotals, totalEx, totalReps,
      best: bestStreakOf(history.map((h) => h.d)),
      groupMax: Math.max(1, ...Object.values(groupTotals)),
    };
  }, [history, logins]);

  const bigStats = [
    ["WORKOUTS", history.length],
    ["STREAK", calcStreak(history) + "d"],
    ["BEST STREAK", m.best + "d"],
    ["EXERCISES", m.totalEx],
    ["REPS COUNTED", m.totalReps],
    ["DAYS OPENED", logins.length],
  ];

  const recent = [...history].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 10);

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={S.ghostBtn}>‹ back</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>STATS</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {bigStats.map(([k, v]) => (
            <div key={k} style={{ background: "#1B212B", borderRadius: 10, padding: "12px 0", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 9, letterSpacing: 1.2, color: "#8A93A3" }}>{k}</div>
            </div>
          ))}
        </div>

        <BarChart title="Workouts per week" weeks={m.weeks} counts={m.workoutsPerWeek} color="#46C98B" />
        <BarChart title="Exercises per week" weeks={m.weeks} counts={m.exercisesPerWeek} color="#5B8DEF" />
        <BarChart title="Days opened per week" weeks={m.weeks} counts={m.loginsPerWeek} color="#F2B134" />

        <div style={{ background: "#1B212B", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#8A93A3", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            Muscle group split (exercise slots)
          </div>
          {Object.keys(GROUPS).map((g) => {
            const c = m.groupTotals[g] || 0;
            return (
              <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 74, fontSize: 12, color: GROUPS[g].color, fontWeight: 700 }}>{GROUPS[g].label}</div>
                <div style={{ flex: 1, height: 14, background: "#232A35", borderRadius: 7, overflow: "hidden" }}>
                  <div style={{ width: `${(c / m.groupMax) * 100}%`, height: "100%", background: GROUPS[g].color, borderRadius: 7 }} />
                </div>
                <div style={{ width: 34, textAlign: "right", fontSize: 12, color: "#8A93A3" }}>{c}</div>
              </div>
            );
          })}
          <div style={{ fontSize: 10, color: "#5C6575", marginTop: 4 }}>
            Counted per completed workout × rounds. Reps are only totalled in circuit mode (HIIT is AMRAP).
          </div>
        </div>

        <div style={{ background: "#1B212B", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#8A93A3", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            Recent sessions
          </div>
          {recent.length === 0 && (
            <div style={{ fontSize: 13, color: "#5C6575" }}>No workouts logged yet. Go lift something.</div>
          )}
          {recent.map((h) => (
            <div key={h.d} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #232A35", fontSize: 13 }}>
              <div style={{ color: "#C6CDD8" }}>
                {new Date(h.d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div style={{ color: "#8A93A3" }}>
                {h.mode || "circuit"} · {h.rounds}r · {h.n} ex{h.totalReps ? ` · ${h.totalReps} reps` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
