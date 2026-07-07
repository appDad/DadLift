import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadJSON, saveJSON } from "./storage";
import { coachModel } from "./firebase";
import { POSES, GROUPS, BUILTIN, ADD_PROMPT, validateExercise, resolveFrames } from "./exercises";
import { styles, DISPLAY, FONT_CSS } from "./theme";
import Stats from "./Stats.jsx";
import Users from "./Users.jsx";

/* ============ deterministic daily RNG ============ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dateSeed = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ============ daily workout builder ============ */
function buildWorkout(date, allEx, emphasis) {
  const rng = mulberry32(dateSeed(date));
  const groups = Object.keys(GROUPS);
  // balanced = 2 per group; a focus day gives that group 4 of the 8 slots
  let counts = Object.fromEntries(groups.map((g) => [g, 2]));
  if (emphasis && GROUPS[emphasis]) {
    const others = groups.filter((g) => g !== emphasis);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    counts = { [emphasis]: 4, [others[0]]: 2, [others[1]]: 1, [others[2]]: 1 };
  }
  const picks = [];
  for (const g of groups) {
    const pool = allEx.filter((e) => e.grp === g).slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    picks.push(...pool.slice(0, counts[g]));
  }
  const reps = [10, 12, 15][Math.floor(rng() * 3)];
  return { exercises: picks, reps };
}

/* ============ streak math ============ */
export function calcStreak(history) {
  if (!history.length) return 0;
  const days = new Set(history.map((h) => h.d));
  let streak = 0;
  const cur = new Date();
  if (!days.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(ymd(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

/* ============ figure ============ */
function Dumbbell({ x, y, ang = 0 }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${ang})`}>
      <line x1={-5} y1={0} x2={5} y2={0} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <rect x={-6.5} y={-2.6} width={3} height={5.2} rx={1} fill="currentColor" />
      <rect x={3.5} y={-2.6} width={3} height={5.2} rx={1} fill="currentColor" />
    </g>
  );
}

export function Figure({ frames, color, size = 160 }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setF((v) => 1 - v), 850);
    return () => clearInterval(t);
  }, []);
  if (!frames || !frames[f]) return null;
  const fr = frames[f];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ color }}>
      {fr.floor && <line x1={8} y1={90} x2={92} y2={90} stroke="currentColor" strokeWidth={1.2} opacity={0.25} />}
      {fr.L.map((l, i) => (
        <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" style={{ transition: "all .35s ease" }} />
      ))}
      <circle cx={fr.head[0]} cy={fr.head[1]} r={5.2} fill="none" stroke="currentColor" strokeWidth={3} style={{ transition: "all .35s ease" }} />
      {(fr.db || []).map((d, i) => <Dumbbell key={"d" + i} x={d[0]} y={d[1]} ang={d[2] || 0} />)}
      {(fr.ball || []).map((b, i) => (
        <circle key={"b" + i} cx={b[0]} cy={b[1]} r={b[2]} fill="currentColor" opacity={0.85} style={{ transition: "all .35s ease" }} />
      ))}
    </svg>
  );
}

/* ============ audio / voice ============ */
function useBeep() {
  const ctxRef = useRef(null);
  return (freq = 880, dur = 0.12) => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch (e) { /* no audio */ }
  };
}
function speak(txt) {
  try {
    const u = new SpeechSynthesisUtterance(txt);
    u.rate = 1.15;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) { /* no tts */ }
}

/* ============ AI coach — Firebase AI Logic (Gemini) ============ */
async function fetchCoachLine(history, todaySummary) {
  try {
    const recent = history.slice(-14).map((h) => `${h.d}: ${h.rounds} rounds`).join("; ") || "first ever workout";
    const streak = calcStreak(history);
    const result = await coachModel.generateContent(
      `You are a gruff, dryly funny gym coach for a busy dad of three who works out at home with dumbbells and a med ball. He just finished: ${todaySummary}. Current streak: ${streak} days. Recent log: ${recent}. Write ONE punchy motivational line, max 20 words. No emojis, no generic fitness-poster language. Reply with the line only.`
    );
    const txt = result.response.text().trim();
    return txt || null;
  } catch (e) { return null; }
}

/* ============ timer ring ============ */
function Ring({ total, left, color, children }) {
  const R = 84, C = 2 * Math.PI * R;
  const frac = total > 0 ? left / total : 0;
  return (
    <div style={{ position: "relative", width: 210, height: 210 }}>
      <svg viewBox="0 0 200 200" width={210} height={210} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={100} cy={100} r={R} fill="none" stroke="#2A313D" strokeWidth={10} />
        <circle cx={100} cy={100} r={R} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ============ settings screen ============ */
function Stepper({ label, value, unit, min, max, step, onChange }) {
  const S = styles;
  const btn = { ...S.pill, width: 44, padding: "8px 0", fontSize: 18, fontWeight: 700, background: "#232A35", color: "#E8EBF0" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1B212B", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 14, color: "#C6CDD8" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={btn} onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}>−</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, minWidth: 58, textAlign: "center" }}>
          {value}{unit}
        </div>
        <button style={btn} onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}>+</button>
      </div>
    </div>
  );
}

function Settings({ tempo, setTempo, restSecs, setRestSecs, roundRest, setRoundRest, hiit, setHiit, voiceOn, setVoiceOn, onBack, userEmail, onSignOut }) {
  const S = styles;
  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={S.ghostBtn}>‹ back</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>SETTINGS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px" }}>
        <div style={S.settingsLabel}>CIRCUIT MODE</div>
        <Stepper label="Rep cadence" value={tempo} unit="s" min={1} max={6} step={0.5} onChange={setTempo} />
        <Stepper label="Rest between exercises" value={restSecs} unit="s" min={5} max={60} step={5} onChange={setRestSecs} />
        <div style={S.settingsLabel}>HIIT MODE</div>
        <Stepper label="Work interval" value={hiit[0]} unit="s" min={10} max={90} step={5} onChange={(v) => setHiit([v, hiit[1]])} />
        <Stepper label="Rest interval" value={hiit[1]} unit="s" min={5} max={60} step={5} onChange={(v) => setHiit([hiit[0], v])} />
        <div style={S.settingsLabel}>BOTH MODES</div>
        <Stepper label="Rest between rounds" value={roundRest} unit="s" min={15} max={180} step={15} onChange={setRoundRest} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1B212B", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 14, color: "#C6CDD8" }}>Voice (rep counting + announcements)</div>
          <button onClick={() => setVoiceOn(!voiceOn)}
            style={{ ...S.pill, background: voiceOn ? "#E8EBF0" : "#232A35", color: voiceOn ? "#14181F" : "#C6CDD8" }}>
            {voiceOn ? "ON" : "OFF"}
          </button>
        </div>
        <div style={S.settingsLabel}>ACCOUNT</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1B212B", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, color: "#8A93A3", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
          <button onClick={onSignOut} style={{ ...S.pill, background: "#232A35", color: "#E85D5D" }}>sign out</button>
        </div>
      </div>
    </div>
  );
}

/* ============ library screen ============ */
function Library({ allEx, custom, onAdd, onRemove, onBack }) {
  const [tab, setTab] = useState("browse"); // browse | add | export
  const [pasteVal, setPasteVal] = useState("");
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(null);
  const S = styles;

  const copyText = async (txt, which) => {
    try { await navigator.clipboard.writeText(txt); setCopied(which); setTimeout(() => setCopied(null), 1500); }
    catch (e) { setMsg("Copy blocked — select the text manually."); }
  };

  const doImport = () => {
    setMsg(null);
    const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let raw = pasteVal.replace(/```json|```/g, "").trim();
    // allow several JSON arrays/objects pasted back to back
    raw = raw.replace(/\]\s*\[/g, ",").replace(/\}\s*\{/g, "},{");
    if (!raw.startsWith("[")) raw = "[" + raw + "]";
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { setMsg("Not valid JSON."); return; }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const ids = new Set(allEx.map((e) => e.id));
    const names = new Set(allEx.map((e) => norm(e.name)));
    const good = [], bad = [];
    for (const e of arr) {
      const errs = validateExercise(e);
      if (ids.has(e.id)) errs.push(`duplicate id "${e.id}"`);
      if (names.has(norm(e.name))) errs.push(`"${e.name}" already in library`);
      if (errs.length) bad.push(`${e.name || e.id || "?"}: ${errs.join(", ")}`);
      else { good.push(e); ids.add(e.id); names.add(norm(e.name)); }
    }
    if (good.length) { onAdd(good); setPasteVal(""); }
    setMsg(`${good.length} added.${bad.length ? " Skipped — " + bad.join(" | ") : ""}`);
  };

  const exportJSON = JSON.stringify(
    allEx.map((e) => ({ ...e, frames: resolveFrames(e), pose: undefined })),
    null, 1
  );

  return (
    <div style={S.app}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={S.ghostBtn}>‹ back</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>EXERCISE LIBRARY</div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
        {["browse", "add", "export"].map((t) => (
          <button key={t} onClick={() => { setTab(t); setMsg(null); }}
            style={{ ...S.pill, background: tab === t ? "#E8EBF0" : "#232A35", color: tab === t ? "#14181F" : "#C6CDD8" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "browse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 20px" }}>
          {Object.keys(GROUPS).map((g) => (
            <div key={g}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: GROUPS[g].color, fontWeight: 700, textTransform: "uppercase", margin: "10px 0 6px" }}>
                {GROUPS[g].label} · {allEx.filter((e) => e.grp === g).length}
              </div>
              {allEx.filter((e) => e.grp === g).map((e) => {
                const isCustom = custom.some((c) => c.id === e.id);
                return (
                  <div key={e.id} style={{ ...S.card, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <Figure frames={resolveFrames(e)} color={GROUPS[g].color} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>
                        {e.name} {isCustom && <span style={{ fontSize: 10, color: "#8A93A3", letterSpacing: 1 }}>CUSTOM</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#8A93A3" }}>{e.type === "time" ? `${e.secs}s hold/work` : "rep-counted"}</div>
                    </div>
                    {isCustom && (
                      <button onClick={() => onRemove(e.id)} style={{ ...S.ghostBtn, color: "#E85D5D" }}>remove</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === "add" && (
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#C6CDD8", lineHeight: 1.5 }}>
            Copy the prompt, give it to Claude or Gemini with the muscle group and count you want, then paste the JSON below. Paste several batches at once if you want — duplicates (by id or name) are skipped automatically, everything valid gets added.
          </div>
          <button onClick={() => copyText(ADD_PROMPT, "prompt")} style={{ ...S.startBtn, fontSize: 16, padding: "12px 0" }}>
            {copied === "prompt" ? "COPIED" : "COPY GENERATION PROMPT"}
          </button>
          <textarea value={pasteVal} onChange={(ev) => setPasteVal(ev.target.value)}
            placeholder='Paste exercise JSON here — single object or array'
            style={S.textarea} rows={10} />
          <button onClick={doImport} style={S.startBtn}>VALIDATE + ADD</button>
          {msg && <div style={{ fontSize: 13, color: "#F2B134", lineHeight: 1.4 }}>{msg}</div>}
        </div>
      )}

      {tab === "export" && (
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#C6CDD8" }}>
            Full library ({allEx.length} exercises) with frames inlined — portable to any future version of this app.
          </div>
          <button onClick={() => copyText(exportJSON, "export")} style={{ ...S.startBtn, fontSize: 16, padding: "12px 0" }}>
            {copied === "export" ? "COPIED" : "COPY FULL LIBRARY JSON"}
          </button>
          <textarea readOnly value={exportJSON} style={{ ...S.textarea, fontSize: 10 }} rows={14}
            onFocus={(ev) => ev.target.select()} />
        </div>
      )}
    </div>
  );
}

/* ============ main app ============ */
export default function DadLift({ user, isAdmin, onSignOut }) {
  const today = useMemo(() => new Date(), []);
  const beep = useBeep();

  const [screen, setScreen] = useState("home"); // home | player | summary | done | library | settings | stats | users
  const [customEx, setCustomEx] = useState([]);
  const [rounds, setRounds] = useState(2);
  const [tempo, setTempo] = useState(3);
  const [mode, setMode] = useState("circuit"); // circuit | hiit
  const [emphasis, setEmphasis] = useState("balanced"); // balanced | back | shoulders | arms | core
  const [hiit, setHiit] = useState([40, 20]); // [work secs, rest secs]
  const [restSecs, setRestSecs] = useState(15);
  const [roundRest, setRoundRest] = useState(45);
  const [voiceOn, setVoiceOn] = useState(true);
  const [round, setRound] = useState(1);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("work");
  const [timeLeft, setTimeLeft] = useState(0);
  const [rep, setRep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [coachLine, setCoachLine] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [summaryRows, setSummaryRows] = useState([]);
  const [lastEntry, setLastEntry] = useState(null);
  const savedRef = useRef(false);
  // live counters mirrored into refs so advance() (called from timer closures) sees fresh values
  const repRef = useRef(0);
  const timeLeftRef = useRef(0);
  const sessionLogRef = useRef([]);

  const allEx = useMemo(() => [...BUILTIN, ...customEx], [customEx]);
  const workout = useMemo(
    () => buildWorkout(today, allEx, emphasis === "balanced" ? null : emphasis),
    [today, allEx, emphasis]
  );
  const exList = workout.exercises;
  const ex = exList[idx];
  const say = (t) => { if (voiceOn) speak(t); };

  useEffect(() => {
    (async () => {
      setHistory(await loadJSON("history", []));
      setCustomEx(await loadJSON("customex", []));
      const s = await loadJSON("settings", null);
      if (s) {
        setRounds(s.rounds ?? 2); setTempo(s.tempo ?? 3); setVoiceOn(s.voiceOn ?? true);
        setMode(s.mode ?? "circuit"); setHiit(s.hiit ?? [40, 20]);
        setRestSecs(s.restSecs ?? 15); setRoundRest(s.roundRest ?? 45);
        setEmphasis(s.emphasis ?? "balanced");
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveJSON("settings", { rounds, tempo, voiceOn, mode, hiit, restSecs, roundRest, emphasis }, { debounce: 600 });
  }, [loaded, rounds, tempo, voiceOn, mode, hiit, restSecs, roundRest, emphasis]);

  /* screen wake lock while working out — counting used to die when the phone locked */
  useEffect(() => {
    if (screen !== "player") return;
    let lock = null, released = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch (e) { /* unsupported or denied — timers still run while visible */ }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible" && !released) acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVis);
      try { lock && lock.release(); } catch (e) { /* already gone */ }
    };
  }, [screen]);

  const addCustom = (arr) => {
    const next = [...customEx, ...arr];
    setCustomEx(next);
    saveJSON("customex", next);
  };
  const removeCustom = (id) => {
    const next = customEx.filter((e) => e.id !== id);
    setCustomEx(next);
    saveJSON("customex", next);
  };

  /* record what actually happened for one work slot — feeds the editable summary */
  const logDone = () => {
    const last = sessionLogRef.current[sessionLogRef.current.length - 1];
    if (last && last.name === ex.name && last.round === round) return; // DONE pressed as the auto-counter fired
    const total = mode === "hiit" ? hiit[0] : ex.type === "time" ? ex.secs : 0;
    let value;
    if (ex.type === "reps") value = mode === "hiit" ? 0 : repRef.current; // HIIT reps are AMRAP — filled in on the summary
    else value = Math.max(0, total - (timeLeftRef.current || 0));
    sessionLogRef.current.push({ name: ex.name, grp: ex.grp, unit: ex.type === "time" ? "s" : "reps", value, round });
  };

  const advance = () => {
    logDone();
    beep(1200, 0.25);
    if (idx + 1 < exList.length) {
      setPhase("rest"); setTimeLeft(mode === "hiit" ? hiit[1] : restSecs);
      say(`Rest. Next up: ${exList[idx + 1].name}`);
    } else if (round < rounds) {
      setPhase("rest"); setTimeLeft(roundRest);
      say(`Round ${round} done. Long rest.`);
    } else {
      finish();
    }
  };

  const startNext = () => {
    if (idx + 1 < exList.length) setIdx(idx + 1);
    else { setRound(round + 1); setIdx(0); }
    setPhase("work"); setRep(0); repRef.current = 0;
  };

  /* build the editable summary: one row per planned slot, prefilled from the session log
     (the log is always a prefix of the plan since exercises run in order) */
  const openSummary = () => {
    const log = sessionLogRef.current;
    const rows = [];
    let k = 0;
    for (let r = 1; r <= rounds; r++) {
      for (const e of exList) {
        rows.push({
          name: e.name,
          grp: e.grp,
          unit: e.type === "time" ? "s" : "reps",
          target: e.type === "time" ? (mode === "hiit" ? hiit[0] : e.secs) : (mode === "hiit" ? "max" : workout.reps),
          round: r,
          value: k < log.length ? log[k].value : 0,
        });
        k++;
      }
    }
    setSummaryRows(rows);
    setScreen("summary");
  };

  const finish = () => {
    say("Workout complete.");
    openSummary();
  };

  const quitWorkout = () => {
    if (phase === "work") {
      const total = mode === "hiit" ? hiit[0] : ex.type === "time" ? ex.secs : 0;
      const elapsed = total - (timeLeftRef.current || 0);
      const progress = ex.type === "reps" && mode !== "hiit" ? repRef.current > 0 : elapsed > 0;
      if (progress) logDone();
    }
    if (sessionLogRef.current.length === 0) { setScreen("home"); return; }
    openSummary();
  };

  const saveSummary = () => {
    if (savedRef.current) return;
    savedRef.current = true;
    const done = summaryRows.filter((r) => r.value > 0);
    const groups = {};
    done.forEach((r) => { groups[r.grp] = (groups[r.grp] || 0) + 1; });
    const entry = {
      d: ymd(today), ts: Date.now(), rounds, reps: workout.reps, n: exList.length, mode,
      exDone: done.length,
      totalReps: done.filter((r) => r.unit === "reps").reduce((s, r) => s + r.value, 0),
      totalSecs: done.filter((r) => r.unit === "s").reduce((s, r) => s + r.value, 0),
      groups,
      exercises: [...new Set(done.map((r) => r.name))],
    };
    const newHist = [...history.filter((h) => h.d !== entry.d), entry];
    setHistory(newHist);
    saveJSON("history", newHist);
    setLastEntry(entry);
    setScreen("done");
    const summary = `${entry.exDone} exercise sets, ${entry.totalReps} reps total (${entry.exercises.join(", ") || "nothing finished"})`;
    fetchCoachLine(newHist, summary).then(setCoachLine);
  };

  useEffect(() => {
    if (screen !== "player") return;
    const timed = phase === "rest" || mode === "hiit" || (ex && ex.type === "time");
    if (!timed) return;
    if (phase === "work" && timeLeft === 0) {
      const v0 = mode === "hiit" ? hiit[0] : ex.secs;
      timeLeftRef.current = v0;
      setTimeLeft(v0);
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          timeLeftRef.current = 0;
          if (phase === "work") advance(); else startNext();
          return 0;
        }
        if (v <= 4) beep(880, 0.1);
        timeLeftRef.current = v - 1;
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, phase, idx, round, mode, timeLeft === 0]);

  useEffect(() => {
    if (screen !== "player" || phase !== "work" || mode === "hiit" || !ex || ex.type !== "reps") return;
    const target = workout.reps;
    const t = setInterval(() => {
      setRep((r) => {
        const next = r + 1;
        if (next > target) return r;
        say(String(next));
        beep(next === target ? 1100 : 740, 0.08);
        if (next === target) {
          clearInterval(t);
          setTimeout(advance, tempo * 500);
        }
        repRef.current = next;
        return next;
      });
    }, tempo * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, phase, idx, round, mode]);

  const start = () => {
    setRound(1); setIdx(0); setPhase("work"); setRep(0);
    savedRef.current = false; setCoachLine(null); setLastEntry(null);
    repRef.current = 0; sessionLogRef.current = [];
    const t0 = mode === "hiit" ? hiit[0] : exList[0].type === "time" ? exList[0].secs : 0;
    timeLeftRef.current = t0;
    setTimeLeft(t0);
    setScreen("player");
    beep(660, 0.15);
    say(`First up: ${exList[0].name}`);
  };

  const S = styles;
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const streak = calcStreak(history);
  const week = history.filter((h) => (new Date() - new Date(h.d)) / 86400000 < 7).length;

  if (screen === "library") {
    return <Library allEx={allEx} custom={customEx} onAdd={addCustom} onRemove={removeCustom} onBack={() => setScreen("home")} />;
  }
  if (screen === "settings") {
    return <Settings tempo={tempo} setTempo={setTempo} restSecs={restSecs} setRestSecs={setRestSecs}
      roundRest={roundRest} setRoundRest={setRoundRest} hiit={hiit} setHiit={setHiit}
      voiceOn={voiceOn} setVoiceOn={setVoiceOn} onBack={() => setScreen("home")}
      userEmail={user.email} onSignOut={onSignOut} />;
  }
  if (screen === "stats") {
    return <Stats history={history} onBack={() => setScreen("home")} />;
  }
  if (screen === "users" && isAdmin) {
    return <Users onBack={() => setScreen("home")} />;
  }

  /* ---------- SUMMARY (editable — honest numbers make honest charts) ---------- */
  if (screen === "summary") {
    const setVal = (i, v) => {
      const next = summaryRows.slice();
      next[i] = { ...next[i], value: Math.max(0, Math.min(999, Math.round(v) || 0)) };
      setSummaryRows(next);
    };
    const doneCount = summaryRows.filter((r) => r.value > 0).length;
    return (
      <div style={S.app}>
        <style>{FONT_CSS}</style>
        <div style={{ padding: "20px 20px 4px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>HOW'D IT GO?</div>
          <div style={{ fontSize: 13, color: "#8A93A3", marginTop: 4, lineHeight: 1.4 }}>
            Prefilled with what the counter saw. Fix anything you didn't finish — or did extra.
            {mode === "hiit" && " HIIT rep sets were max-effort: punch in what you got."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 16px 16px" }}>
          {summaryRows.map((r, i) => (
            <React.Fragment key={i}>
              {rounds > 1 && i % exList.length === 0 && (
                <div style={{ ...S.settingsLabel, marginTop: i === 0 ? 0 : 12 }}>ROUND {r.round}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1B212B", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: GROUPS[r.grp].color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 14, color: r.value > 0 ? "#E8EBF0" : "#5C6575" }}>{r.name}</div>
                <input
                  type="number" min={0} max={999} value={r.value}
                  onChange={(ev) => setVal(i, +ev.target.value)}
                  onFocus={(ev) => ev.target.select()}
                  style={{
                    width: 56, textAlign: "center", background: "#161B23", color: "#E8EBF0",
                    border: "1px solid #2A313D", borderRadius: 8, padding: "8px 4px",
                    fontFamily: DISPLAY, fontSize: 18, fontWeight: 700,
                  }}
                />
                <div style={{ width: 52, fontSize: 11, color: "#8A93A3" }}>{r.unit} <span style={{ color: "#5C6575" }}>/ {r.target}</span></div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={saveSummary} style={S.startBtn}>
            SAVE WORKOUT — {doneCount} SET{doneCount === 1 ? "" : "S"}
          </button>
          <button onClick={() => setScreen("home")} style={{ ...S.ghostBtn, color: "#E85D5D" }}>discard, save nothing</button>
        </div>
      </div>
    );
  }

  /* ---------- HOME ---------- */
  if (screen === "home") {
    return (
      <div style={S.app}>
        <style>{FONT_CSS}</style>
        <div style={{ ...S.header, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={S.eyebrow}>{dateStr}</div>
            <div style={S.title}>DADLIFT</div>
            <div style={S.sub}>
              {allEx.length} in library · {mode === "hiit" ? `HIIT ${hiit[0]}s on / ${hiit[1]}s off` : `reps today: ${workout.reps} · ${tempo}s/rep`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setScreen("stats")} style={{ ...S.pill, background: "#232A35", color: "#C6CDD8" }}>
              stats
            </button>
            <button onClick={() => setScreen("library")} style={{ ...S.pill, background: "#232A35", color: "#C6CDD8" }}>
              library
            </button>
            {isAdmin && (
              <button onClick={() => setScreen("users")} style={{ ...S.pill, background: "#232A35", color: "#C6CDD8" }}>
                users
              </button>
            )}
            <button onClick={() => setScreen("settings")} style={{ ...S.pill, background: "#232A35", color: "#C6CDD8" }}>
              ⚙
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 16px 14px" }}>
          {[["STREAK", streak + "d"], ["THIS WEEK", week], ["TOTAL", history.length]].map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: "#1B212B", borderRadius: 10, padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#8A93A3" }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px" }}>
          {exList.map((e) => {
            const g = GROUPS[e.grp];
            const open = preview === e.id;
            return (
              <div key={e.id} onClick={() => setPreview(open ? null : e.id)}
                style={{ ...S.card, borderLeft: `4px solid ${g.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#161B23", borderRadius: 10 }}>
                    <Figure frames={resolveFrames(e)} color={g.color} size={52} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: g.color, fontWeight: 700, textTransform: "uppercase" }}>{g.label}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: 0.5 }}>{e.name}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#8A93A3", flexShrink: 0 }}>
                    {mode === "hiit" ? `${hiit[0]}s` : e.type === "time" ? `${e.secs}s` : `×${workout.reps}`}
                  </div>
                </div>
                {open && (
                  <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center" }}>
                    <Figure frames={resolveFrames(e)} color={g.color} size={120} />
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: "#C6CDD8" }}>{e.cue}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#5C6575", fontWeight: 700 }}>FOCUS</span>
            {["balanced", ...Object.keys(GROUPS)].map((g) => (
              <button key={g} onClick={() => setEmphasis(g)}
                style={{
                  ...S.pill, padding: "6px 12px", fontSize: 12,
                  background: emphasis === g ? (GROUPS[g] ? GROUPS[g].color : "#E8EBF0") : "#232A35",
                  color: emphasis === g ? "#14181F" : "#C6CDD8",
                }}>
                {GROUPS[g] ? GROUPS[g].label.toLowerCase() : "balanced"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {["circuit", "hiit"].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ ...S.pill, background: mode === m ? "#E8EBF0" : "#232A35", color: mode === m ? "#14181F" : "#C6CDD8", textTransform: "uppercase", letterSpacing: 1 }}>
                {m}
              </button>
            ))}
            {[1, 2, 3].map((r) => (
              <button key={r} onClick={() => setRounds(r)}
                style={{ ...S.pill, background: rounds === r ? "#E8EBF0" : "#232A35", color: rounds === r ? "#14181F" : "#C6CDD8" }}>
                {r} round{r > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <button onClick={start} style={S.startBtn}>START WORKOUT</button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#5C6575" }}>
            Same day = same workout, drawn from the full library. Tap an exercise for form.
          </div>
        </div>
      </div>
    );
  }

  /* ---------- DONE ---------- */
  if (screen === "done") {
    return (
      <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <style>{FONT_CSS}</style>
        <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 700, letterSpacing: 2 }}>DONE</div>
        <div style={{ color: "#8A93A3" }}>
          {lastEntry
            ? <>{lastEntry.exDone} sets · {lastEntry.totalReps} reps{lastEntry.totalSecs ? ` · ${Math.round(lastEntry.totalSecs / 60)}min timed` : ""} · streak {calcStreak(history)}d</>
            : <>{rounds} round{rounds > 1 ? "s" : ""} · {exList.length} exercises · streak {calcStreak(history)}d</>}
        </div>
        <div style={{ minHeight: 48, maxWidth: 380, fontSize: 16, lineHeight: 1.5, fontStyle: "italic" }}>
          {coachLine || "…"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setScreen("home")} style={{ ...S.startBtn, width: "auto", padding: "14px 32px" }}>BACK</button>
          <button onClick={() => setScreen("stats")} style={{ ...S.startBtn, width: "auto", padding: "14px 32px", background: "#232A35", color: "#E8EBF0" }}>STATS</button>
        </div>
      </div>
    );
  }

  /* ---------- PLAYER ---------- */
  const g = GROUPS[ex.grp];
  const isRest = phase === "rest";
  const nextEx = idx + 1 < exList.length ? exList[idx + 1] : round < rounds ? exList[0] : null;
  const shown = isRest && nextEx ? nextEx : ex;
  const shownG = GROUPS[shown.grp];
  const total = isRest
    ? (idx + 1 < exList.length ? (mode === "hiit" ? hiit[1] : restSecs) : roundRest)
    : (mode === "hiit" ? hiit[0] : ex.secs || 0);

  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column" }}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={quitWorkout} style={S.ghostBtn}>✕ end</button>
        <div style={{ fontSize: 13, color: "#8A93A3", letterSpacing: 1 }}>
          ROUND {round}/{rounds} · {idx + 1}/{exList.length}
        </div>
        <button onClick={() => (isRest ? startNext() : advance())} style={S.ghostBtn}>skip ›</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, color: shownG.color, textTransform: "uppercase" }}>
          {isRest ? "REST — UP NEXT" : shownG.label}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: 0.5 }}>{shown.name}</div>

        {isRest || mode === "hiit" || ex.type === "time" ? (
          <Ring total={total} left={timeLeft} color={isRest ? "#8A93A3" : g.color}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{timeLeft}</div>
            <div style={{ fontSize: 12, color: "#8A93A3", letterSpacing: 1 }}>
              {isRest ? "REST" : mode === "hiit" && ex.type === "reps" ? "MAX REPS" : "SECONDS"}
            </div>
          </Ring>
        ) : (
          <Ring total={workout.reps} left={workout.reps - rep} color={g.color}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1, color: g.color }}>{rep}</div>
            <div style={{ fontSize: 12, color: "#8A93A3", letterSpacing: 1 }}>OF {workout.reps} REPS</div>
          </Ring>
        )}

        <Figure frames={resolveFrames(shown)} color={shownG.color} size={160} />
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "#C6CDD8", maxWidth: 420 }}>{shown.cue}</div>

        {!isRest && (
          nextEx ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1B212B", borderRadius: 10, padding: "6px 14px", marginTop: 6 }}>
              <Figure frames={resolveFrames(nextEx)} color={GROUPS[nextEx.grp].color} size={40} />
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#5C6575", fontWeight: 700 }}>UP NEXT</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>{nextEx.name}</div>
            </div>
          ) : (
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#5C6575", marginTop: 6 }}>LAST ONE — EMPTY THE TANK</div>
          )
        )}
      </div>

      <div style={{ padding: 20 }}>
        {!isRest && mode !== "hiit" && ex.type === "reps" && (
          <button onClick={advance} style={S.startBtn}>DONE — NEXT</button>
        )}
        {isRest && (
          <button onClick={startNext} style={{ ...S.startBtn, background: "#232A35", color: "#E8EBF0" }}>SKIP REST</button>
        )}
      </div>
    </div>
  );
}
