/* Date + stats math shared by the Stats screen, the workout logic, and the
   public share snapshot. */
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function calcStreak(history) {
  if (!history.length) return 0;
  const days = new Set(history.map((h) => h.d));
  let streak = 0;
  const cur = new Date();
  if (!days.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(ymd(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

/* week bucket = the Monday that starts that week */
export function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - day);
  return ymd(d);
}
export function lastWeeks(n) {
  const weeks = [];
  const cur = new Date(mondayOf(ymd(new Date())) + "T00:00:00");
  for (let i = 0; i < n; i++) {
    weeks.unshift(ymd(cur));
    cur.setDate(cur.getDate() - 7);
  }
  return weeks;
}
export function bestStreakOf(days) {
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

/* older entries assumed the full plan; newer ones carry what was actually done */
export const exDoneOf = (h) => h.exDone ?? (h.n || 0) * (h.rounds || 1);

export function computeSummary(history) {
  const weeks = lastWeeks(12);
  const wIdx = Object.fromEntries(weeks.map((w, i) => [w, i]));
  const workoutsPerWeek = weeks.map(() => 0);
  const exercisesPerWeek = weeks.map(() => 0);
  const repsPerWeek = weeks.map(() => 0);
  const groupTotals = {};
  let totalEx = 0, totalReps = 0, totalSecs = 0;

  for (const h of history) {
    const exDone = exDoneOf(h);
    totalEx += exDone;
    totalReps += h.totalReps || 0;
    totalSecs += h.totalSecs || 0;
    const wk = wIdx[mondayOf(h.d)];
    if (wk !== undefined) {
      workoutsPerWeek[wk]++;
      exercisesPerWeek[wk] += exDone;
      repsPerWeek[wk] += h.totalReps || 0;
    }
    // new entries count groups per completed set; legacy ones were per plan × rounds
    const mult = h.exDone != null ? 1 : (h.rounds || 1);
    for (const [g, c] of Object.entries(h.groups || {})) {
      groupTotals[g] = (groupTotals[g] || 0) + c * mult;
    }
  }

  const recent = [...history]
    .sort((a, b) => (a.d < b.d ? 1 : -1))
    .slice(0, 10)
    .map((h) => ({ d: h.d, mode: h.mode || "circuit", ex: exDoneOf(h), reps: h.totalReps || 0 }));

  return {
    weeks, workoutsPerWeek, exercisesPerWeek, repsPerWeek, groupTotals, recent,
    groupMax: Math.max(1, ...Object.values(groupTotals)),
    totals: {
      workouts: history.length,
      streak: calcStreak(history),
      best: bestStreakOf(history.map((h) => h.d)),
      totalEx, totalReps, totalSecs,
    },
  };
}
