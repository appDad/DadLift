import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadJSON, saveJSON } from "./storage";
import { coachModel } from "./firebase";
import { POSES, GROUPS, BUILTIN, EQUIPMENT, DEFAULT_EQUIP, normalizeEquip, inferEquip, extendEquipment, equipSlug, buildAddPrompt, validateExercise, resolveFrames } from "./exercises";
import { loadEquipExtensions, saveEquipExtensions } from "./catalog";
import { loadCommunity, publishExercise, unpublishExercise } from "./community";
import { ymd, calcStreak } from "./summary";
import { newShareId, shareUrl, publishSnapshot, removeSnapshot } from "./share";
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

/* unilateral exercises: declared via "per side" in the cue, or detected from
   one-arm/one-leg wording in name+cue. Alternating exercises are excluded —
   they switch sides within a single count. */
const isUnilateral = (e) => {
  const t = `${(e && e.name) || ""} ${(e && e.cue) || ""}`;
  if (/alternat/i.test(t)) return false;
  return /per side|single[- ](arm|leg)|one (arm|leg|hand|side)|each (side|arm|leg)/i.test(t);
};
/* default two-pass flag (user can override per exercise from the library) */
const autoUnilateral = (e) => {
  if (!e) return false;
  if (e.type === "time") {
    const t = `${e.name || ""} ${e.cue || ""}`;
    if (/alternat/i.test(t)) return false;
    return /halfway|do both sides|per side/i.test(t);
  }
  return isUnilateral(e);
};

/* ============ daily workout builder ============ */
/* thumbs bias the deterministic picker: 👍 3x weight, 👎 0.4x, neutral 1x */
function weightedPick(pool, count, rng, ratings) {
  const out = [];
  const items = pool.slice();
  while (out.length < count && items.length) {
    let total = 0;
    const w = items.map((e) => {
      const r = ratings[e.id] || 0;
      const wt = r > 0 ? 3 : r < 0 ? 0.4 : 1;
      total += wt;
      return wt;
    });
    let roll = rng() * total;
    let pick = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      roll -= w[i];
      if (roll <= 0) { pick = i; break; }
    }
    out.push(items.splice(pick, 1)[0]);
  }
  return out;
}

function buildWorkout(date, allEx, emphasis, ratings = {}, nonce = 0) {
  const rng = mulberry32(dateSeed(date) + nonce * 131071); // reshuffles re-roll deterministically
  const groups = Object.keys(GROUPS);
  // 8 slots total: every group gets at least 1; a focus day gives that group 4,
  // otherwise the leftover slots rotate deterministically with the date
  let counts;
  if (emphasis && GROUPS[emphasis]) {
    counts = Object.fromEntries(groups.map((g) => [g, g === emphasis ? 4 : 1]));
  } else {
    counts = Object.fromEntries(groups.map((g) => [g, 1]));
    const order = groups.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < 8 - groups.length; i++) counts[order[i % order.length]]++;
  }
  const picks = [];
  for (const g of groups) {
    const pool = allEx.filter((e) => e.grp === g);
    picks.push(...weightedPick(pool, counts[g], rng, ratings));
  }
  const reps = [10, 12, 15][Math.floor(rng() * 3)];
  return { exercises: picks, reps };
}

/* ============ adaptive rep targets ============
   Look at the last 4 honestly-recorded circuit sets of an exercise (partial
   sets from mid-exercise quits are excluded at save time). Consistently over
   target -> raise it, consistently under -> lower it. */
function adaptTarget(exId, base, history) {
  const recent = [];
  for (let i = history.length - 1; i >= 0 && recent.length < 4; i--) {
    for (const s of history[i].sets || []) {
      if (s[0] === exId) recent.push(s); // [id, value, target]
      if (recent.length >= 4) break;
    }
  }
  if (recent.length < 2) return base;
  const avgDelta = recent.reduce((t, s) => t + (s[1] - s[2]), 0) / recent.length;
  let adj = 0;
  if (avgDelta >= 5) adj = 4; else if (avgDelta >= 2) adj = 2;
  else if (avgDelta <= -5) adj = -4; else if (avgDelta <= -2) adj = -2;
  return Math.max(6, Math.min(25, base + adj));
}

/* ============ thumbs rating control ============ */
function Thumbs({ value, onChange, size = 15 }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
      {[[1, "👍"], [0, "–"], [-1, "👎"]].map(([v, icon]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{
            border: "none", borderRadius: 8, width: 30, height: 28, cursor: "pointer",
            fontSize: v === 0 ? size + 2 : size, lineHeight: 1,
            background: value === v ? (v > 0 ? "#D8F3E5" : v < 0 ? "#FBE2E2" : "#DDE2E9") : "#EFF1F5",
            color: "#3D4756",
            outline: value === v ? "2px solid " + (v > 0 ? "#2FA671" : v < 0 ? "#E85D5D" : "#6C7686") : "none",
          }}>
          {icon}
        </button>
      ))}
    </div>
  );
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

/* parse "14", "fourteen", "twenty five" … from speech transcripts */
const WORDNUMS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
function parseRepCount(transcripts) {
  for (const t of transcripts) {
    const m = t.match(/\d{1,3}/);
    if (m) { const n = +m[0]; if (n > 0 && n < 300) return n; }
    let total = 0, found = false;
    for (const w of t.toLowerCase().split(/\s+/)) {
      if (WORDNUMS[w] != null) { total += WORDNUMS[w]; found = true; }
    }
    if (found && total > 0 && total < 300) return total;
  }
  return null;
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
        <circle cx={100} cy={100} r={R} fill="none" stroke="#DDE2E9" strokeWidth={10} />
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
  const btn = { ...S.pill, width: 44, padding: "8px 0", fontSize: 18, fontWeight: 700, background: "#E4E7EC", color: "#1B2430" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 14, color: "#3D4756" }}>{label}</div>
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

function Settings({ tempo, setTempo, restSecs, setRestSecs, roundRest, setRoundRest, hiit, setHiit, voiceOn, setVoiceOn, micOn, setMicOn, readySecs, setReadySecs, customEquip, onAddEquip, onRemoveEquip, focusEquip, isAdmin, extEquip, onAddCatalog, onRemoveCatalog, onClearHistory, onBack, userEmail, onSignOut }) {
  const S = styles;
  const [armClear, setArmClear] = useState(false); // two-tap confirm for the destructive bit
  const [catLabel, setCatLabel] = useState("");
  const [catAliases, setCatAliases] = useState("");
  const [catMsg, setCatMsg] = useState(null);
  const equipRef = useRef(null);
  useEffect(() => {
    if (focusEquip && equipRef.current) equipRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusEquip]);
  const addable = Object.keys(EQUIPMENT).filter((k) => !DEFAULT_EQUIP.includes(k) && !customEquip.includes(k));
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
        <Stepper label="Get-set countdown before each set" value={readySecs} unit="s" min={0} max={20} step={5} onChange={setReadySecs} />
        <div style={S.settingsLabel}>HIIT MODE</div>
        <Stepper label="Work interval" value={hiit[0]} unit="s" min={10} max={90} step={5} onChange={(v) => setHiit([v, hiit[1]])} />
        <Stepper label="Rest interval" value={hiit[1]} unit="s" min={5} max={60} step={5} onChange={(v) => setHiit([hiit[0], v])} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 14, color: "#3D4756" }}>Mic: say your rep count after max-effort sets</div>
          <button onClick={() => setMicOn(!micOn)}
            style={{ ...S.pill, background: micOn ? "#1B2430" : "#E4E7EC", color: micOn ? "#F5F6F8" : "#3D4756" }}>
            {micOn ? "ON" : "OFF"}
          </button>
        </div>
        <div style={S.settingsLabel}>BOTH MODES</div>
        <Stepper label="Rest between rounds" value={roundRest} unit="s" min={15} max={180} step={15} onChange={setRoundRest} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 14, color: "#3D4756" }}>Voice (rep counting + announcements)</div>
          <button onClick={() => setVoiceOn(!voiceOn)}
            style={{ ...S.pill, background: voiceOn ? "#1B2430" : "#E4E7EC", color: voiceOn ? "#F5F6F8" : "#3D4756" }}>
            {voiceOn ? "ON" : "OFF"}
          </button>
        </div>
        <div style={S.settingsLabel} ref={equipRef}>EQUIPMENT</div>
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#6C7686", lineHeight: 1.4 }}>
            Dumbbells and med ball are built in. Tap gear you own to add it — it's a fixed
            list so community exercises never end up tagged with misspelled equipment.
            Toggle what's on hand for today from the home screen.
          </div>
          {customEquip.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, marginBottom: 6 }}>YOUR GEAR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {customEquip.map((k) => (
                  <span key={k} style={{ ...S.pill, padding: "6px 10px", fontSize: 12, background: "#1B2430", color: "#F5F6F8", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {EQUIPMENT[k] ? EQUIPMENT[k].label : k}
                    <button onClick={() => onRemoveEquip(k)} style={{ border: "none", background: "none", color: "#E85D5D", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {addable.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, marginBottom: 6 }}>TAP TO ADD</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {addable.map((k) => (
                  <button key={k} onClick={() => onAddEquip(k)}
                    style={{ ...S.pill, padding: "6px 10px", fontSize: 12, background: "#EFF1F5", color: "#3D4756", border: "1px dashed #DDE2E9" }}>
                    + {EQUIPMENT[k].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isAdmin && (
          <>
            <div style={S.settingsLabel}>CATALOG (ADMIN ONLY)</div>
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#6C7686", lineHeight: 1.4 }}>
                Add equipment to the shared catalog — every user gets it as a tap-to-add
                option, and imports/prompts accept it. Aliases catch alternate spellings.
              </div>
              <input
                value={catLabel}
                onChange={(e) => setCatLabel(e.target.value)}
                placeholder="equipment name — e.g. cable machine"
                style={{
                  boxSizing: "border-box", background: "#EFF1F5", color: "#1B2430",
                  border: "1px solid #DDE2E9", borderRadius: 10, padding: "10px 12px", fontSize: 14,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={catAliases}
                  onChange={(e) => setCatAliases(e.target.value)}
                  placeholder="aliases, comma-separated (optional)"
                  style={{
                    flex: 1, boxSizing: "border-box", background: "#EFF1F5", color: "#1B2430",
                    border: "1px solid #DDE2E9", borderRadius: 10, padding: "10px 12px", fontSize: 14,
                  }}
                />
                <button
                  onClick={() => {
                    const err = onAddCatalog(catLabel, catAliases);
                    setCatMsg(err);
                    if (!err) { setCatLabel(""); setCatAliases(""); }
                  }}
                  style={{ ...S.pill, background: "#1B2430", color: "#F5F6F8" }}>
                  ADD
                </button>
              </div>
              {catMsg && <div style={{ fontSize: 12, color: "#B47E10" }}>{catMsg}</div>}
              {Object.keys(extEquip).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(extEquip).map(([k, v]) => (
                    <span key={k} style={{ ...S.pill, padding: "6px 10px", fontSize: 12, background: "#E4E7EC", color: "#3D4756", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {v.label} <span style={{ color: "#9AA3B0" }}>({k})</span>
                      <button onClick={() => onRemoveCatalog(k)} style={{ border: "none", background: "none", color: "#E85D5D", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        <div style={S.settingsLabel}>DATA</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 14, color: "#3D4756" }}>
            {armClear ? "Really wipe all workout history?" : "Clear workout history (stats start fresh)"}
          </div>
          <button
            onClick={() => {
              if (!armClear) { setArmClear(true); setTimeout(() => setArmClear(false), 4000); return; }
              onClearHistory();
              setArmClear(false);
            }}
            style={{ ...S.pill, background: armClear ? "#E85D5D" : "#E4E7EC", color: armClear ? "#FFFFFF" : "#E85D5D" }}>
            {armClear ? "YES, WIPE IT" : "clear"}
          </button>
        </div>
        <div style={S.settingsLabel}>ACCOUNT</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, color: "#6C7686", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
          <button onClick={onSignOut} style={{ ...S.pill, background: "#E4E7EC", color: "#E85D5D" }}>sign out</button>
        </div>
      </div>
    </div>
  );
}

/* ============ library screen ============ */
function Library({ allEx, custom, onAdd, onRemove, onBack, ratings, onRate, communityBy, onHide, ownedEquip, onSetEq, uniOf, onToggleUni }) {
  const [tab, setTab] = useState("browse"); // browse | add | export
  const [pasteVal, setPasteVal] = useState("");
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(null);
  const [gearOnly, setGearOnly] = useState(true); // hide exercises needing gear that's toggled off
  const fitsGear = (e) => !e.eq || ownedEquip.includes(e.eq);
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
      // normalize equipment spellings/aliases to catalog keys before validating
      if (e && e.eq != null) {
        const key = normalizeEquip(e.eq);
        if (key) e.eq = key;
      } else if (e) {
        const guess = inferEquip(e);
        if (guess) e.eq = guess; // untagged import — infer from name/cue
      }
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
            style={{ ...S.pill, background: tab === t ? "#1B2430" : "#E4E7EC", color: tab === t ? "#F5F6F8" : "#3D4756" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "browse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 20px" }}>
          <button onClick={() => setGearOnly(!gearOnly)}
            style={{ ...S.pill, alignSelf: "flex-start", padding: "6px 12px", fontSize: 12, background: gearOnly ? "#1B2430" : "#E4E7EC", color: gearOnly ? "#F5F6F8" : "#3D4756" }}>
            {gearOnly ? "showing my gear only ✓" : "showing everything"}
          </button>
          {Object.keys(GROUPS).map((g) => {
            const groupAll = allEx.filter((e) => e.grp === g);
            const shown = gearOnly ? groupAll.filter(fitsGear) : groupAll;
            const hidden = groupAll.length - shown.length;
            return (
            <div key={g}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: GROUPS[g].color, fontWeight: 700, textTransform: "uppercase", margin: "10px 0 6px" }}>
                {GROUPS[g].label} · {shown.length}{hidden > 0 ? ` (+${hidden} hidden)` : ""}
              </div>
              {shown.map((e) => {
                const isCustom = custom.some((c) => c.id === e.id);
                const commBy = !isCustom && communityBy[e.id];
                return (
                  <div key={e.id} style={{ ...S.card, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <Figure frames={resolveFrames(e)} color={GROUPS[g].color} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>
                        {e.name} {isCustom && <span style={{ fontSize: 10, color: "#6C7686", letterSpacing: 1 }}>CUSTOM</span>}
                        {commBy && <span style={{ fontSize: 10, color: "#9B7EDE", letterSpacing: 1 }}>COMMUNITY · {String(commBy).split("@")[0]}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#6C7686", display: "flex", alignItems: "center", gap: 4 }}>
                        {e.type === "time" ? `${e.secs}s hold/work` : "rep-counted"} ·
                        {isCustom ? (
                          <select
                            value={e.eq || ""}
                            onClick={(ev) => ev.stopPropagation()}
                            onChange={(ev) => onSetEq(e.id, ev.target.value || null)}
                            style={{ border: "1px solid #DDE2E9", borderRadius: 6, background: "#EFF1F5", color: "#3D4756", fontSize: 11, padding: "2px 4px" }}>
                            <option value="">bodyweight</option>
                            {Object.keys(EQUIPMENT).map((k) => (
                              <option key={k} value={k}>{EQUIPMENT[k].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span>{e.eq ? (EQUIPMENT[e.eq] ? EQUIPMENT[e.eq].label : e.eq) : "bodyweight"}</span>
                        )}
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onToggleUni(e); }}
                          title="Run this exercise twice — once per side/direction"
                          style={{
                            border: "none", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
                            background: uniOf(e) ? "#DCE7FB" : "#EFF1F5",
                            color: uniOf(e) ? "#2456B3" : "#6C7686",
                            outline: uniOf(e) ? "1.5px solid #5B8DEF" : "none",
                          }}>
                          {uniOf(e) ? "per-side ✓" : "per-side"}
                        </button>
                      </div>
                    </div>
                    <Thumbs value={ratings[e.id] || 0} onChange={(v) => onRate(e.id, v)} />
                    {isCustom && (
                      <button onClick={() => onRemove(e.id)} style={{ ...S.ghostBtn, color: "#E85D5D" }}>remove</button>
                    )}
                    {commBy && (
                      <button onClick={() => onHide(e.id)} style={{ ...S.ghostBtn, color: "#E85D5D" }}>hide</button>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      )}

      {tab === "add" && (
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#3D4756", lineHeight: 1.5 }}>
            Copy the prompt, give it to Claude or Gemini with the muscle group and count you want, then paste the JSON below. The prompt already lists every exercise in your library so you won't get duplicates. Anything valid gets added — and shared to the community for the other DadLifters.
          </div>
          <button onClick={() => copyText(buildAddPrompt(allEx, ownedEquip), "prompt")} style={{ ...S.startBtn, fontSize: 16, padding: "12px 0" }}>
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
          <div style={{ fontSize: 13, color: "#3D4756" }}>
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
  const [sessionRounds, setSessionRounds] = useState(2); // rounds for the RUNNING session (quick = 1)
  const [quickEx, setQuickEx] = useState(null); // active do-anywhere list, null = today's workout
  const [phase, setPhase] = useState("work"); // work | rest | ready (get-set countdown, circuit only)
  const [timeLeft, setTimeLeft] = useState(0);
  const [rep, setRep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [side, setSide] = useState(null); // "L" | "R" while counting a per-side exercise
  const [readySecs, setReadySecs] = useState(5); // get-set countdown before each circuit set
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [coachLine, setCoachLine] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [summaryRows, setSummaryRows] = useState([]);
  const [lastEntry, setLastEntry] = useState(null);
  const [doneExList, setDoneExList] = useState([]); // snapshot for the DONE screen — rating changes re-roll the picker
  const [micOn, setMicOn] = useState(true);
  const [heard, setHeard] = useState(null); // last spoken rep count picked up by the mic
  const [manualReps, setManualReps] = useState(""); // typed fallback when the mic mishears
  const [relisten, setRelisten] = useState(false); // re-record tapped — show the listening hint
  const [ratings, setRatings] = useState({}); // exercise id -> 1 | 0 | -1
  const [uniOverride, setUniOverride] = useState({}); // exercise id -> true/false two-pass override
  const [community, setCommunity] = useState([]); // [{ex, by}] shared by other users
  const [hiddenComm, setHiddenComm] = useState([]); // community ids hidden from MY instance
  const [equip, setEquip] = useState({}); // equipment key -> false when I don't have it (default: have it)
  const [customEquip, setCustomEquip] = useState([]); // user-added equipment names
  const [share, setShare] = useState({ id: null, on: false }); // public progress page
  const [shareCopied, setShareCopied] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState(null); // "equip" scrolls settings to that section
  const [extEquip, setExtEquip] = useState({}); // admin-added catalog entries (config/equipment)
  const [shuffleN, setShuffleN] = useState(0); // today's reshuffle count — new seed each press
  const [excluded, setExcluded] = useState([]); // exercises thumbed out of TODAY'S workout
  const savedRef = useRef(false);
  const recRef = useRef(null);
  // live counters mirrored into refs so advance() (called from timer closures) sees fresh values
  const repRef = useRef(0);
  const timeLeftRef = useRef(0);
  const sideRef = useRef(null);
  const sessionLogRef = useRef([]);

  const allEx = useMemo(() => {
    const taken = new Set([...BUILTIN, ...customEx].map((e) => e.id));
    const comm = community
      .filter((c) => !hiddenComm.includes(c.ex.id) && !taken.has(c.ex.id))
      .map((c) => c.ex);
    // imports that arrived without an eq tag get one inferred from name/cue,
    // otherwise "dumbbell" exercises sail through the bodyweight filter
    const tagEq = (e) => {
      if (e.eq) return e;
      const g = inferEquip(e);
      return g ? { ...e, eq: g } : e;
    };
    return [...BUILTIN, ...comm.map(tagEq), ...customEx.map(tagEq)];
  }, [customEx, community, hiddenComm, extEquip]);
  const communityBy = useMemo(
    () => Object.fromEntries(community.map((c) => [c.ex.id, c.by])),
    [community]
  );
  /* equipment shown as chips: the two defaults, gear you added, and anything
     a library exercise requires (all canonical catalog keys) */
  const equipKeys = useMemo(() => {
    const keys = [...DEFAULT_EQUIP, ...customEquip.filter((k) => !DEFAULT_EQUIP.includes(k))];
    for (const e of allEx) if (e.eq && !keys.includes(e.eq)) keys.push(e.eq);
    return keys;
  }, [allEx, customEquip]);
  const haveEquip = (key) => equip[key] !== false; // unknown gear defaults to available
  /* only build workouts from exercises whose equipment is on hand */
  const availEx = useMemo(() => allEx.filter((e) => !e.eq || haveEquip(e.eq)), [allEx, equip]);
  const workout = useMemo(
    () => buildWorkout(
      today,
      availEx.filter((e) => !excluded.includes(e.id)),
      emphasis === "balanced" ? null : emphasis,
      ratings,
      shuffleN
    ),
    [today, availEx, emphasis, ratings, shuffleN, excluded]
  );
  const exList = quickEx || workout.exercises;
  const ex = exList[idx];
  const repTargets = useMemo(() => {
    const t = {};
    for (const e of exList) if (e.type === "reps") t[e.id] = adaptTarget(e.id, workout.reps, history);
    return t;
  }, [exList, workout.reps, history]);
  const repTargetOf = (e) => repTargets[e.id] || workout.reps;
  const say = (t) => { if (voiceOn) speak(t); };

  useEffect(() => {
    (async () => {
      setHistory(await loadJSON("history", []));
      setRatings(await loadJSON("ratings", {}));
      setUniOverride(await loadJSON("unilateral", {}));
      setHiddenComm(await loadJSON("hiddencomm", []));
      setShare(await loadJSON("share", { id: null, on: false }));
      // merge admin catalog extensions BEFORE community loads — community
      // exercises tagged with admin-added gear must pass validation
      setExtEquip(await loadEquipExtensions());
      // per-day workout tweaks: reshuffle count + thumbed-out exercises
      const tweaks = await loadJSON("daytweaks", null);
      if (tweaks && tweaks.d === ymd(today)) {
        setShuffleN(tweaks.n || 0);
        setExcluded(tweaks.out || []);
      }

      // one-shot migration: persist equipment tags onto any of MY custom
      // exercises that predate the eq field (idempotent — noop once tagged)
      const rawCustom = await loadJSON("customex", []);
      const taggedCustom = rawCustom.map((e) => {
        if (e.eq) return e;
        const g = inferEquip(e);
        return g ? { ...e, eq: g } : e;
      });
      setCustomEx(taggedCustom);
      if (taggedCustom.some((e, i) => e.eq !== rawCustom[i].eq)) {
        saveJSON("customex", taggedCustom);
        const em = (user.email || "").toLowerCase();
        taggedCustom.forEach((e, i) => { if (e.eq !== rawCustom[i].eq) publishExercise(e, em); });
      }

      loadCommunity().then((comm) => {
        // same migration for shared exercises; only the admin may rewrite
        // other people's docs (rules), everyone else just tags in memory
        const fixed = comm.map((c) => {
          if (c.ex.eq) return c;
          const g = inferEquip(c.ex);
          return g ? { ...c, ex: { ...c.ex, eq: g } } : c;
        });
        setCommunity(fixed);
        if (isAdmin) {
          fixed.forEach((c, i) => {
            if (c.ex.eq && !comm[i].ex.eq) publishExercise(c.ex, c.by); // keeps original contributor
          });
        }
      });
      const s = await loadJSON("settings", null);
      if (s) {
        setRounds(s.rounds ?? 2); setTempo(s.tempo ?? 3); setVoiceOn(s.voiceOn ?? true);
        setMode(s.mode ?? "circuit"); setHiit(s.hiit ?? [40, 20]);
        setRestSecs(s.restSecs ?? 15); setRoundRest(s.roundRest ?? 45);
        setEmphasis(s.emphasis ?? "balanced");
        setMicOn(s.micOn ?? true);
        setReadySecs(s.readySecs ?? 5);
        setEquip(s.equip ?? {});
        // normalize any legacy free-text equipment into catalog keys
        setCustomEquip([...new Set((s.customEquip ?? []).map(normalizeEquip).filter(Boolean))]);
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveJSON("settings", { rounds, tempo, voiceOn, mode, hiit, restSecs, roundRest, emphasis, micOn, readySecs, equip, customEquip }, { debounce: 600 });
  }, [loaded, rounds, tempo, voiceOn, mode, hiit, restSecs, roundRest, emphasis, micOn, readySecs, equip, customEquip]);

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

  const rate = (id, v) => {
    const next = { ...ratings };
    if (v === 0) delete next[id]; else next[id] = v;
    setRatings(next);
    saveJSON("ratings", next);
  };

  /* two-pass (per-side) control. Precedence: my personal override, then the
     exercise's own `uni` property (set on customs, travels with community
     shares/exports), then auto-detection from the wording. */
  const effUni = (e) => {
    if (!e) return false;
    if (uniOverride[e.id] != null) return uniOverride[e.id];
    if (e.uni != null) return e.uni;
    return autoUnilateral(e);
  };
  const toggleUni = (exObj) => {
    const next = !effUni(exObj);
    if (customEx.some((c) => c.id === exObj.id)) {
      // my exercise — persist the flag as an exercise property and re-share it
      const nextCustom = customEx.map((c) => (c.id === exObj.id ? { ...c, uni: next } : c));
      setCustomEx(nextCustom);
      saveJSON("customex", nextCustom);
      const changed = nextCustom.find((c) => c.id === exObj.id);
      if (changed) publishExercise(changed, (user.email || "").toLowerCase());
      if (uniOverride[exObj.id] != null) {
        const o = { ...uniOverride }; delete o[exObj.id]; // property is the source of truth now
        setUniOverride(o); saveJSON("unilateral", o);
      }
    } else {
      // built-in or someone else's community exercise — personal preference
      const o = { ...uniOverride, [exObj.id]: next };
      const dflt = exObj.uni != null ? exObj.uni : autoUnilateral(exObj);
      if (o[exObj.id] === dflt) delete o[exObj.id]; // matches default — drop the override
      setUniOverride(o);
      saveJSON("unilateral", o);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    saveJSON("history", []);
    saveJSON("logins", []); // stale key from the old visit tracking
    if (share.on && share.id) publishSnapshot(user.uid, firstName(), [], share.id);
  };

  /* ----- today's-workout tweaks: reshuffle + thumb-out ----- */
  const reshuffle = () => {
    const n = shuffleN + 1;
    setShuffleN(n);
    saveJSON("daytweaks", { d: ymd(today), n, out: excluded });
  };
  const banExercise = (id) => {
    rate(id, -1); // remember the dislike — future picks avoid it too
    const out = [...excluded, id];
    setExcluded(out);
    saveJSON("daytweaks", { d: ymd(today), n: shuffleN, out });
  };

  /* ----- admin: extend the equipment catalog without code changes ----- */
  const addCatalogEquip = (label, aliasesStr) => {
    const clean = (label || "").trim().toLowerCase();
    const key = equipSlug(clean);
    if (!key) return "Give it a name first.";
    if (EQUIPMENT[key]) return `"${EQUIPMENT[key].label}" is already in the catalog.`;
    const entry = { label: clean, aliases: (aliasesStr || "").split(",").map((s) => s.trim()).filter(Boolean) };
    const next = { ...extEquip, [key]: entry };
    extendEquipment({ [key]: entry });
    setExtEquip(next);
    saveEquipExtensions(next);
    return null;
  };
  const removeCatalogEquip = (key) => {
    const next = { ...extEquip };
    delete next[key];
    if (EQUIPMENT[key] && EQUIPMENT[key].custom) delete EQUIPMENT[key];
    setExtEquip(next);
    saveEquipExtensions(next);
    setCustomEquip(customEquip.filter((k) => k !== key));
  };

  /* ----- public progress page ----- */
  const firstName = () => (user.displayName || user.email || "someone").split(" ")[0].split("@")[0];
  const setSharing = (on) => {
    const id = share.id || newShareId();
    const next = { id, on };
    setShare(next);
    saveJSON("share", next);
    if (on) publishSnapshot(user.uid, firstName(), history, id);
    else removeSnapshot(id); // deleting the doc kills the link immediately
    return next;
  };
  const copyShareLink = async () => {
    const s = share.on ? share : setSharing(true);
    try {
      await navigator.clipboard.writeText(shareUrl(s.id));
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) { /* clipboard blocked — the stats screen shows the link */ }
  };

  const addCustom = (arr) => {
    const next = [...customEx, ...arr];
    setCustomEx(next);
    saveJSON("customex", next);
    // share with the community — best-effort, tagged with the contributor
    arr.forEach((e) => publishExercise(e, (user.email || "").toLowerCase()));
  };
  const removeCustom = (id) => {
    const next = customEx.filter((e) => e.id !== id);
    setCustomEx(next);
    saveJSON("customex", next);
    unpublishExercise(id); // it was ours — pull it from the community too
    setCommunity((prev) => prev.filter((c) => c.ex.id !== id));
  };
  const hideCommunity = (id) => {
    const next = [...hiddenComm, id];
    setHiddenComm(next);
    saveJSON("hiddencomm", next);
  };
  const setCustomEq = (id, eq) => {
    const next = customEx.map((e) => (e.id === id ? { ...e, eq: eq || undefined } : e));
    setCustomEx(next);
    saveJSON("customex", next);
    const changed = next.find((e) => e.id === id);
    if (changed) publishExercise(changed, (user.email || "").toLowerCase()); // keep the shared copy in sync
  };

  /* listen for a spoken rep count (HIIT AMRAP sets) and write it into the session log */
  const stopListening = () => {
    try { recRef.current && recRef.current.abort(); } catch (e) { /* already stopped */ }
    recRef.current = null;
  };
  /* If followUp is set (HIIT flow), the next-exercise announcement is held back
     until the user answers or ~7s passes — so speech and mic never fight. */
  const listenForReps = (slotIndex, followUp = null) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { if (followUp) say(followUp); return; }
    stopListening();
    let rec;
    try { rec = new SR(); } catch (e) { if (followUp) say(followUp); return; }
    recRef.current = rec;
    let settled = false;
    const settle = (spoken) => {
      if (settled) return;
      settled = true;
      if (recRef.current !== rec) return; // aborted because the workout moved on
      if (followUp) say(spoken != null ? `${spoken}. Logged. ${followUp}` : followUp);
      else if (spoken != null) say(`${spoken}. Logged.`);
    };
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0]).map((a) => a.transcript);
      const n = parseRepCount(alts);
      if (n == null) { settle(null); return; }
      const slot = sessionLogRef.current[slotIndex];
      if (slot) slot.value = n;
      setSummaryRows((prev) => (prev.length > slotIndex ? prev.map((r, i) => (i === slotIndex ? { ...r, value: n } : r)) : prev));
      setHeard(n);
      settle(n);
    };
    rec.onerror = () => settle(null); // no mic / denied — summary editing still works
    rec.onend = () => settle(null);
    try { rec.start(); } catch (e) { settle(null); }
    setTimeout(() => {
      if (!settled) { try { rec.abort(); } catch (e) { /* gone */ } settle(null); }
    }, 7000);
  };

  /* typed rep entry during rest — the fallback when speech doesn't register */
  const applyManualReps = (n) => {
    stopListening(); // no point letting the mic overwrite a typed number
    const slotIndex = sessionLogRef.current.length - 1;
    const slot = sessionLogRef.current[slotIndex];
    if (slot) slot.value = n;
    setSummaryRows((prev) => (prev.length > slotIndex ? prev.map((r, i) => (i === slotIndex ? { ...r, value: n } : r)) : prev));
    setHeard(n); // reuse the "logged ✓" confirmation
    setManualReps("");
  };

  /* reopen the mic for another attempt at the rep count */
  const rerecord = () => {
    const slotIndex = sessionLogRef.current.length - 1;
    setHeard(null);
    setRelisten(true);
    listenForReps(slotIndex);
  };

  /* flip the CURRENT exercise's both-sides mode mid-workout */
  const togglePlayerUni = () => {
    const next = !effUni(ex);
    toggleUni(ex);
    if (mode !== "hiit" && (phase === "work" || phase === "ready")) {
      if (next && !sideRef.current) setSideBoth("L"); // this pass becomes side 1
      if (!next && sideRef.current) setSideBoth(null); // finish as a single pass
    }
  };

  /* record what actually happened for one work slot — feeds the editable summary */
  const logDone = (partial = false) => {
    const last = sessionLogRef.current[sessionLogRef.current.length - 1];
    if (last && last.name === ex.name && last.round === round) return; // DONE pressed as the auto-counter fired
    const inReady = phase === "ready"; // skipped before the set even started
    const total = mode === "hiit" ? hiit[0] : ex.type === "time" ? ex.secs : 0;
    let value;
    if (ex.type === "reps") value = mode === "hiit" || inReady ? 0 : repRef.current; // HIIT reps are AMRAP — filled in on the summary
    else value = inReady ? 0 : Math.max(0, total - (timeLeftRef.current || 0));
    sessionLogRef.current.push({ id: ex.id, name: ex.name, grp: ex.grp, unit: ex.type === "time" ? "s" : "reps", value, round, partial });
  };

  /* enter a work slot: circuit gets a GET SET countdown first; HIIT flows straight in */
  const setSideBoth = (v) => { sideRef.current = v; setSide(v); };
  const beginSet = (exObj) => {
    setRep(0); repRef.current = 0;
    // two-pass applies to reps AND timed sets in circuit (HIIT stays interval-based)
    setSideBoth(mode !== "hiit" && effUni(exObj) ? "L" : null);
    if (mode !== "hiit" && readySecs > 0) {
      setPhase("ready");
      timeLeftRef.current = readySecs;
      setTimeLeft(readySecs);
    } else {
      setPhase("work");
      const t0 = mode === "hiit" ? hiit[0] : exObj.type === "time" ? exObj.secs : 0;
      timeLeftRef.current = t0;
      setTimeLeft(t0);
    }
  };

  /* per-side exercises: left side done -> get set -> right side */
  const switchToRight = () => {
    setSideBoth("R");
    setRep(0); repRef.current = 0;
    if (readySecs > 0) {
      setPhase("ready");
      timeLeftRef.current = readySecs;
      setTimeLeft(readySecs);
      say("Switch sides.");
    } else {
      say("Switch sides. Right side. Go.");
    }
  };

  const advance = (partial = false) => {
    logDone(partial);
    beep(1200, 0.25);
    // both modes: ask FIRST, hold the announcement until answered (or ~7s)
    const askReps = ex.type === "reps" && micOn;
    const slot = sessionLogRef.current.length - 1;

    const goRest = (announceText, secs) => {
      setPhase("rest"); setTimeLeft(secs);
      setManualReps(""); setRelisten(false);
      if (askReps) {
        setHeard(null);
        say("How many reps?");
        setTimeout(() => listenForReps(slot, announceText), 900);
      } else {
        say(announceText);
      }
    };

    if (idx + 1 < exList.length) {
      goRest(`Rest. Next up: ${exList[idx + 1].name}`, mode === "hiit" ? hiit[1] : restSecs);
    } else if (round < sessionRounds) {
      goRest(`Round ${round} done. Long rest.`, roundRest);
    } else if (askReps) {
      // final set: ask for the count, summary opens underneath and gets the answer
      setHeard(null);
      say("How many reps?");
      setTimeout(() => listenForReps(slot, "Workout complete."), 900);
      finish(true);
    } else {
      finish();
    }
  };

  const startNext = () => {
    stopListening(); setHeard(null);
    let nextExObj;
    if (idx + 1 < exList.length) { setIdx(idx + 1); nextExObj = exList[idx + 1]; }
    else { setRound(round + 1); setIdx(0); nextExObj = exList[0]; }
    beginSet(nextExObj);
  };

  /* build the editable summary: one row per planned slot, prefilled from the session log
     (the log is always a prefix of the plan since exercises run in order) */
  const openSummary = () => {
    const log = sessionLogRef.current;
    const rows = [];
    let k = 0;
    for (let r = 1; r <= sessionRounds; r++) {
      for (const e of exList) {
        rows.push({
          id: e.id,
          name: e.name,
          grp: e.grp,
          unit: e.type === "time" ? "s" : "reps",
          target: e.type === "time" ? (mode === "hiit" ? hiit[0] : e.secs) : (mode === "hiit" ? "max" : repTargetOf(e)),
          round: r,
          value: k < log.length ? log[k].value : 0,
          partial: k < log.length ? !!log[k].partial : false,
        });
        k++;
      }
    }
    setSummaryRows(rows);
    setScreen("summary");
  };

  const finish = (quiet = false) => {
    if (!quiet) say("Workout complete.");
    openSummary();
  };

  const quitWorkout = () => {
    if (phase === "work") {
      const total = mode === "hiit" ? hiit[0] : ex.type === "time" ? ex.secs : 0;
      const elapsed = total - (timeLeftRef.current || 0);
      const progress = ex.type === "reps" && mode !== "hiit" ? repRef.current > 0 : elapsed > 0;
      if (progress) logDone(true); // partial — excluded from target adaptation
    }
    if (sessionLogRef.current.length === 0) { setQuickEx(null); setScreen("home"); return; }
    openSummary();
  };

  const saveSummary = () => {
    if (savedRef.current) return;
    savedRef.current = true;
    stopListening();
    const done = summaryRows.filter((r) => r.value > 0);
    const groups = {};
    done.forEach((r) => { groups[r.grp] = (groups[r.grp] || 0) + 1; });
    const entry = {
      d: ymd(today), ts: Date.now(), rounds: sessionRounds, reps: workout.reps, n: exList.length, mode,
      quick: quickEx ? true : undefined,
      exDone: done.length,
      totalReps: done.filter((r) => r.unit === "reps").reduce((s, r) => s + r.value, 0),
      totalSecs: done.filter((r) => r.unit === "s").reduce((s, r) => s + r.value, 0),
      groups,
      exercises: [...new Set(done.map((r) => r.name))],
      // per-set results that feed target adaptation: circuit rep sets only,
      // skipping partial (quit/skipped mid-exercise) sets
      sets: summaryRows
        .filter((r) => r.unit === "reps" && r.value > 0 && !r.partial && typeof r.target === "number")
        .map((r) => [r.id, r.value, r.target]),
    };
    const newHist = [...history.filter((h) => h.d !== entry.d), entry];
    setHistory(newHist);
    saveJSON("history", newHist);
    if (share.on && share.id) publishSnapshot(user.uid, firstName(), newHist, share.id);
    setLastEntry(entry);
    setDoneExList(exList);
    setQuickEx(null); // session over — home shows today's regular workout again
    setScreen("done");
    const summary = `${entry.exDone} exercise sets, ${entry.totalReps} reps total (${entry.exercises.join(", ") || "nothing finished"})`;
    fetchCoachLine(newHist, summary).then(setCoachLine);
  };

  useEffect(() => {
    if (screen !== "player" || paused) return;
    const timed = phase === "rest" || phase === "ready" || mode === "hiit" || (ex && ex.type === "time");
    if (!timed) return;
    if (phase === "work" && timeLeft === 0) {
      const v0 = mode === "hiit" ? hiit[0] : ex.secs;
      timeLeftRef.current = v0;
      setTimeLeft(v0);
      return;
    }
    // halfway switch call: only when a set is NOT running as two-pass —
    // circuit timed sets whose cue says halfway, and any HIIT unilateral set
    const workTotal = mode === "hiit" ? hiit[0] : (ex && ex.secs) || 0;
    const halfSwitch = phase === "work" && ex && !sideRef.current && (
      mode === "hiit" ? effUni(ex) : (ex.type === "time" && /halfway|do both sides/i.test(ex.cue || ""))
    );
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          timeLeftRef.current = 0;
          if (phase === "ready") {
            // countdown done — go (the work-init branch above refills timed sets)
            setPhase("work");
            const s = sideRef.current;
            const timedSet = ex && ex.type === "time";
            say(s === "L" ? (timedSet ? "First side. Go." : "Left side. Go.")
              : s === "R" ? (timedSet ? "Second side. Go." : "Right side. Go.")
              : "Go.");
            return 0;
          }
          if (phase === "work") {
            // two-pass timed set: first side done -> switch, second side -> advance
            if (sideRef.current === "L") switchToRight(); else advance();
          } else {
            startNext();
          }
          return 0;
        }
        if (v <= 4) beep(880, 0.1);
        if (halfSwitch && v - 1 === Math.floor(workTotal / 2) && v - 1 > 2) {
          say("Switch sides.");
          beep(990, 0.15);
        }
        timeLeftRef.current = v - 1;
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, phase, idx, round, mode, paused, timeLeft === 0]);

  useEffect(() => {
    if (screen !== "player" || paused || phase !== "work" || mode === "hiit" || !ex || ex.type !== "reps") return;
    const target = repTargetOf(ex);
    const t = setInterval(() => {
      setRep((r) => {
        const next = r + 1;
        if (next > target) return r;
        say(String(next));
        beep(next === target ? 1100 : 740, 0.08);
        if (next === target) {
          clearInterval(t);
          // per-side sets run the count twice: left, then right
          if (sideRef.current === "L") setTimeout(switchToRight, tempo * 500);
          else setTimeout(advance, tempo * 500);
        }
        repRef.current = next;
        return next;
      });
    }, tempo * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, phase, idx, round, mode, paused, side]);

  const launch = (list) => {
    setRound(1); setIdx(0);
    savedRef.current = false; setCoachLine(null); setLastEntry(null);
    stopListening(); setHeard(null); setPaused(false); setManualReps(""); setRelisten(false);
    sessionLogRef.current = [];
    beginSet(list[0]);
    setScreen("player");
    beep(660, 0.15);
    say(`First up: ${list[0].name}.${mode !== "hiit" && readySecs > 0 ? " Get set." : ""}`);
  };

  const start = () => {
    setQuickEx(null);
    setSessionRounds(rounds);
    launch(workout.exercises);
  };

  /* do-anywhere: one bodyweight exercise per group, single round —
     transient session, saved equipment/settings untouched */
  const startAnywhere = () => {
    const rng = mulberry32(dateSeed(today) * 7 + 13 + shuffleN * 131071);
    const picks = [];
    for (const g of Object.keys(GROUPS)) {
      const gp = allEx.filter((e) => e.grp === g && !e.eq && !excluded.includes(e.id));
      picks.push(...weightedPick(gp, 1, rng, ratings));
    }
    if (!picks.length) return;
    setQuickEx(picks);
    setSessionRounds(1);
    launch(picks);
  };

  const S = styles;
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const streak = calcStreak(history);
  const week = history.filter((h) => (new Date() - new Date(h.d)) / 86400000 < 7).length;

  if (screen === "library") {
    return <Library allEx={allEx} custom={customEx} onAdd={addCustom} onRemove={removeCustom}
      ratings={ratings} onRate={rate} communityBy={communityBy} onHide={hideCommunity}
      ownedEquip={equipKeys.filter(haveEquip)} onSetEq={setCustomEq}
      uniOf={effUni} onToggleUni={toggleUni}
      onBack={() => setScreen("home")} />;
  }
  if (screen === "settings") {
    return <Settings tempo={tempo} setTempo={setTempo} restSecs={restSecs} setRestSecs={setRestSecs}
      roundRest={roundRest} setRoundRest={setRoundRest} hiit={hiit} setHiit={setHiit}
      voiceOn={voiceOn} setVoiceOn={setVoiceOn} micOn={micOn} setMicOn={setMicOn}
      readySecs={readySecs} setReadySecs={setReadySecs}
      customEquip={customEquip}
      onAddEquip={(key) => { if (EQUIPMENT[key] && !customEquip.includes(key) && !DEFAULT_EQUIP.includes(key)) setCustomEquip([...customEquip, key]); }}
      onRemoveEquip={(key) => {
        setCustomEquip(customEquip.filter((k) => k !== key));
        const nextEquip = { ...equip }; delete nextEquip[key]; setEquip(nextEquip);
      }}
      focusEquip={settingsFocus === "equip"}
      isAdmin={isAdmin} extEquip={extEquip} onAddCatalog={addCatalogEquip} onRemoveCatalog={removeCatalogEquip}
      onClearHistory={clearHistory} onBack={() => { setSettingsFocus(null); setScreen("home"); }}
      userEmail={user.email} onSignOut={onSignOut} />;
  }
  if (screen === "stats") {
    return <Stats history={history} onBack={() => setScreen("home")}
      shareOn={share.on} shareLink={share.id ? shareUrl(share.id) : ""}
      onToggleShare={setSharing} onCopyShare={copyShareLink} shareCopied={shareCopied} />;
  }
  if (screen === "users" && isAdmin) {
    return <Users onBack={() => setScreen("home")} />;
  }

  /* ---------- SUMMARY (editable — honest numbers make honest charts) ---------- */
  if (screen === "summary") {
    const setVal = (i, v) => {
      const next = summaryRows.slice();
      // a hand-corrected number is intentional — it counts toward adaptation again
      next[i] = { ...next[i], value: Math.max(0, Math.min(999, Math.round(v) || 0)), partial: false };
      setSummaryRows(next);
    };
    const doneCount = summaryRows.filter((r) => r.value > 0).length;
    return (
      <div style={S.app}>
        <style>{FONT_CSS}</style>
        <div style={{ padding: "20px 20px 4px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>HOW'D IT GO?</div>
          <div style={{ fontSize: 13, color: "#6C7686", marginTop: 4, lineHeight: 1.4 }}>
            Prefilled with what the counter saw. Fix anything you didn't finish — or did extra.
            {mode === "hiit" && " HIIT rep sets were max-effort: punch in what you got."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 16px 16px" }}>
          {summaryRows.map((r, i) => (
            <React.Fragment key={i}>
              {sessionRounds > 1 && i % exList.length === 0 && (
                <div style={{ ...S.settingsLabel, marginTop: i === 0 ? 0 : 12 }}>ROUND {r.round}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: GROUPS[r.grp].color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 14, color: r.value > 0 ? "#1B2430" : "#9AA3B0" }}>{r.name}</div>
                <input
                  type="number" min={0} max={999} value={r.value}
                  onChange={(ev) => setVal(i, +ev.target.value)}
                  onFocus={(ev) => ev.target.select()}
                  style={{
                    width: 56, textAlign: "center", background: "#EFF1F5", color: "#1B2430",
                    border: "1px solid #DDE2E9", borderRadius: 8, padding: "8px 4px",
                    fontFamily: DISPLAY, fontSize: 18, fontWeight: 700,
                  }}
                />
                <div style={{ width: 52, fontSize: 11, color: "#6C7686" }}>{r.unit} <span style={{ color: "#9AA3B0" }}>/ {r.target}</span></div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={saveSummary} style={S.startBtn}>
            SAVE WORKOUT — {doneCount} SET{doneCount === 1 ? "" : "S"}
          </button>
          <button onClick={() => { stopListening(); setQuickEx(null); setScreen("home"); }} style={{ ...S.ghostBtn, color: "#E85D5D" }}>discard, save nothing</button>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/icons/dadlift-icon-192.png" alt="" width={56} height={56} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <div>
              <div style={S.eyebrow}>{dateStr}</div>
              <div style={S.title}>DADLIFT</div>
              <div style={S.sub}>
                {allEx.length} in library · {mode === "hiit" ? `HIIT ${hiit[0]}s on / ${hiit[1]}s off` : `reps today: ${workout.reps} · ${tempo}s/rep`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setScreen("stats")} style={{ ...S.pill, background: "#E4E7EC", color: "#3D4756" }}>
              stats
            </button>
            <button onClick={() => setScreen("library")} style={{ ...S.pill, background: "#E4E7EC", color: "#3D4756" }}>
              library
            </button>
            {isAdmin && (
              <button onClick={() => setScreen("users")} style={{ ...S.pill, background: "#E4E7EC", color: "#3D4756" }}>
                users
              </button>
            )}
            <button onClick={() => setScreen("settings")} style={{ ...S.pill, background: "#E4E7EC", color: "#3D4756" }}>
              ⚙
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 16px 14px" }}>
          {[["STREAK", streak + "d"], ["THIS WEEK", week], ["TOTAL", history.length]].map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: "#FFFFFF", borderRadius: 10, padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#6C7686" }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "10px 14px", margin: "0 16px 14px" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, marginBottom: 8 }}>
            TODAY'S EQUIPMENT — TAP WHAT YOU HAVE
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...S.pill, padding: "6px 12px", fontSize: 12, background: "#1B2430", color: "#F5F6F8", cursor: "default" }}>
              bodyweight ✓
            </span>
            {equipKeys.map((k) => (
              <button key={k} onClick={() => setEquip({ ...equip, [k]: haveEquip(k) ? false : true })}
                style={{
                  ...S.pill, padding: "6px 12px", fontSize: 12,
                  background: haveEquip(k) ? "#1B2430" : "#E4E7EC",
                  color: haveEquip(k) ? "#F5F6F8" : "#6C7686",
                  textDecoration: haveEquip(k) ? "none" : "line-through",
                }}>
                {(EQUIPMENT[k] ? EQUIPMENT[k].label : k)}{haveEquip(k) ? " ✓" : ""}
              </button>
            ))}
            <button onClick={() => { setSettingsFocus("equip"); setScreen("settings"); }}
              style={{ ...S.pill, padding: "6px 12px", fontSize: 12, background: "#EFF1F5", color: "#3D4756", border: "1px dashed #DDE2E9", fontWeight: 700 }}>
              +
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#9AA3B0", marginTop: 6 }}>
            {availEx.length} of {allEx.length} exercises fit today's gear. Add new equipment in settings.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 8px" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700 }}>TODAY'S WORKOUT</div>
          <button onClick={reshuffle}
            style={{ ...S.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, background: "#5B8DEF", color: "#FFFFFF" }}>
            ⟳ RESHUFFLE
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px" }}>
          {exList.map((e) => {
            const g = GROUPS[e.grp];
            const open = preview === e.id;
            return (
              <div key={e.id} onClick={() => setPreview(open ? null : e.id)}
                style={{ ...S.card, borderLeft: `4px solid ${g.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#EFF1F5", borderRadius: 10 }}>
                    <Figure frames={resolveFrames(e)} color={g.color} size={52} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: g.color, fontWeight: 700, textTransform: "uppercase" }}>{g.label}</div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: 0.5 }}>{e.name}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: "#6C7686" }}>
                      {mode === "hiit" ? `${hiit[0]}s` : e.type === "time" ? `${e.secs}s` : (
                        <>
                          ×{repTargetOf(e)}
                          {repTargetOf(e) > workout.reps && <span style={{ color: "#2FA671", fontWeight: 700 }}> ↑</span>}
                          {repTargetOf(e) < workout.reps && <span style={{ color: "#B47E10", fontWeight: 700 }}> ↓</span>}
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); toggleUni(e); }}
                        title="Both sides — run the set twice, once per side/direction"
                        style={{
                          border: "none", borderRadius: 8, padding: "2px 8px", cursor: "pointer",
                          fontSize: 12, fontWeight: 700, lineHeight: 1.5,
                          background: effUni(e) ? "#DCE7FB" : "#EFF1F5",
                          color: effUni(e) ? "#2456B3" : "#6C7686",
                          outline: effUni(e) ? "1.5px solid #5B8DEF" : "none",
                        }}>
                        ×2
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); rate(e.id, ratings[e.id] === 1 ? 0 : 1); }}
                        title="Favorite — show this more often"
                        style={{ border: "none", background: ratings[e.id] === 1 ? "#D8F3E5" : "#EFF1F5", outline: ratings[e.id] === 1 ? "2px solid #2FA671" : "none", borderRadius: 8, padding: "2px 9px", cursor: "pointer", fontSize: 13, lineHeight: 1.4 }}>
                        👍
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); banExercise(e.id); }}
                        title="Swap it out — and show it less often"
                        style={{ border: "none", background: "#EFF1F5", borderRadius: 8, padding: "2px 9px", cursor: "pointer", fontSize: 13, lineHeight: 1.4 }}>
                        👎
                      </button>
                    </div>
                  </div>
                </div>
                {open && (
                  <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center" }}>
                    <Figure frames={resolveFrames(e)} color={g.color} size={120} />
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: "#3D4756" }}>{e.cue}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#9AA3B0", fontWeight: 700 }}>FOCUS</span>
            {["balanced", ...Object.keys(GROUPS)].map((g) => (
              <button key={g} onClick={() => setEmphasis(g)}
                style={{
                  ...S.pill, padding: "6px 12px", fontSize: 12,
                  background: emphasis === g ? (GROUPS[g] ? GROUPS[g].color : "#1B2430") : "#E4E7EC",
                  color: emphasis === g ? (GROUPS[g] ? "#1B2430" : "#F5F6F8") : "#3D4756",
                }}>
                {GROUPS[g] ? GROUPS[g].label.toLowerCase() : "balanced"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#9AA3B0", fontWeight: 700 }}>MODE</span>
            {["circuit", "hiit"].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ ...S.pill, background: mode === m ? "#1B2430" : "#E4E7EC", color: mode === m ? "#F5F6F8" : "#3D4756", textTransform: "uppercase", letterSpacing: 1 }}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: "#9AA3B0", fontWeight: 700 }}>ROUNDS</span>
            {[1, 2, 3].map((r) => (
              <button key={r} onClick={() => setRounds(r)}
                style={{ ...S.pill, background: rounds === r ? "#5B8DEF" : "#E4E7EC", color: rounds === r ? "#FFFFFF" : "#3D4756", fontWeight: 700 }}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={start} style={S.startBtn}>START WORKOUT</button>
          <button onClick={startAnywhere}
            style={{ ...S.startBtn, fontSize: 16, padding: "12px 0", background: "#E4E7EC", color: "#1B2430" }}>
            ⚡ DO-ANYWHERE — QUICK BODYWEIGHT, 1 ROUND
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#9AA3B0" }}>
            Same day = same workout — tap ⟳ RESHUFFLE for a new draw. 👍 favorites an exercise (shows more), 👎 swaps it out (shows less). Tap a card for form.
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
        <div style={{ color: "#6C7686" }}>
          {lastEntry
            ? <>{lastEntry.exDone} sets · {lastEntry.totalReps} reps{lastEntry.totalSecs ? ` · ${Math.round(lastEntry.totalSecs / 60)}min timed` : ""} · streak {calcStreak(history)}d</>
            : <>{rounds} round{rounds > 1 ? "s" : ""} · {exList.length} exercises · streak {calcStreak(history)}d</>}
        </div>
        <div style={{ minHeight: 48, maxWidth: 380, fontSize: 16, lineHeight: 1.5, fontStyle: "italic" }}>
          {coachLine || "…"}
        </div>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "left" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7686", fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
            RATE TODAY'S EXERCISES — FAVORITES SHOW UP MORE OFTEN
          </div>
          {doneExList.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: 10, padding: "6px 12px", marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: GROUPS[e.grp].color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>{e.name}</div>
              <Thumbs value={ratings[e.id] || 0} onChange={(v) => rate(e.id, v)} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => setScreen("home")} style={{ ...S.startBtn, width: "auto", padding: "14px 32px" }}>BACK</button>
          <button onClick={() => setScreen("stats")} style={{ ...S.startBtn, width: "auto", padding: "14px 32px", background: "#E4E7EC", color: "#1B2430" }}>STATS</button>
          <button onClick={copyShareLink} style={{ ...S.startBtn, width: "auto", padding: "14px 32px", background: "#E4E7EC", color: "#1B2430" }}>
            {shareCopied ? "LINK COPIED ✓" : "SHARE MY SUMMARY"}
          </button>
        </div>
        {shareCopied && (
          <div style={{ fontSize: 11, color: "#2FA671" }}>
            Your public progress page is live — the link is on your clipboard.
          </div>
        )}
      </div>
    );
  }

  /* ---------- PLAYER ---------- */
  const g = GROUPS[ex.grp];
  const isRest = phase === "rest";
  const isReady = phase === "ready";
  const lastRec = sessionLogRef.current[sessionLogRef.current.length - 1];
  const nextEx = idx + 1 < exList.length ? exList[idx + 1] : round < sessionRounds ? exList[0] : null;
  const shown = isRest && nextEx ? nextEx : ex;
  const shownG = GROUPS[shown.grp];
  const total = isRest
    ? (idx + 1 < exList.length ? (mode === "hiit" ? hiit[1] : restSecs) : roundRest)
    : isReady
      ? readySecs
      : (mode === "hiit" ? hiit[0] : ex.secs || 0);

  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column" }}>
      <style>{FONT_CSS}</style>
      <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={quitWorkout} style={S.ghostBtn}>✕ end</button>
        <div style={{ fontSize: 13, color: paused ? "#B47E10" : "#6C7686", letterSpacing: 1, fontWeight: paused ? 700 : 400 }}>
          {paused ? "PAUSED" : <>{quickEx ? "DO-ANYWHERE · " : ""}ROUND {round}/{sessionRounds} · {idx + 1}/{exList.length}</>}
        </div>
        <button onClick={() => (isRest ? startNext() : advance(true))} style={S.ghostBtn}>skip ›</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, color: shownG.color, textTransform: "uppercase" }}>
          {isRest ? "REST — UP NEXT"
            : isReady ? "GET SET" + (side === "L" ? (ex.type === "time" ? " — SIDE 1" : " — LEFT SIDE") : side === "R" ? (ex.type === "time" ? " — SIDE 2" : " — RIGHT SIDE") : "")
            : shownG.label}
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: 0.5 }}>{shown.name}</div>

        {isRest && lastRec && lastRec.unit === "reps" && (
          <>
            {(micOn || relisten) && (
              <div style={{ fontSize: 13, fontWeight: 600, color: heard != null ? "#2FA671" : "#B47E10" }}>
                {heard != null ? `Got ${heard} reps — logged ✓` : "🎤 Say how many reps you got"}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number" min={0} max={999}
                value={manualReps}
                placeholder={String(lastRec.value || 0)}
                onChange={(ev) => setManualReps(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === "Enter" && manualReps !== "") applyManualReps(Math.max(0, Math.min(999, Math.round(+manualReps) || 0))); }}
                style={{
                  width: 74, textAlign: "center", background: "#FFFFFF", color: "#1B2430",
                  border: "1px solid #DDE2E9", borderRadius: 10, padding: "8px 4px",
                  fontFamily: DISPLAY, fontSize: 18, fontWeight: 700,
                }}
              />
              <button
                onClick={() => { if (manualReps !== "") applyManualReps(Math.max(0, Math.min(999, Math.round(+manualReps) || 0))); }}
                style={{ ...S.pill, background: "#1B2430", color: "#F5F6F8", fontSize: 12 }}>
                SET REPS
              </button>
              <button
                onClick={rerecord}
                title="Open the mic again and say the number"
                style={{ ...S.pill, background: "#E4E7EC", color: "#3D4756", fontSize: 12 }}>
                🎤 SAY IT
              </button>
            </div>
          </>
        )}

        {isRest || isReady || mode === "hiit" || ex.type === "time" ? (
          <Ring total={total} left={timeLeft} color={isRest ? "#6C7686" : isReady ? "#B47E10" : g.color}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{timeLeft}</div>
            <div style={{ fontSize: 12, color: "#6C7686", letterSpacing: 1 }}>
              {isRest ? "REST" : isReady ? "GET SET" : mode === "hiit" && ex.type === "reps" ? "MAX REPS"
                : `${side === "L" ? "SIDE 1 · " : side === "R" ? "SIDE 2 · " : ""}SECONDS`}
            </div>
          </Ring>
        ) : (
          <Ring total={repTargetOf(ex)} left={repTargetOf(ex) - rep} color={g.color}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1, color: g.color }}>{rep}</div>
            <div style={{ fontSize: 12, color: "#6C7686", letterSpacing: 1 }}>
              {side === "L" ? "LEFT · " : side === "R" ? "RIGHT · " : ""}OF {repTargetOf(ex)} REPS
            </div>
          </Ring>
        )}

        <Figure frames={resolveFrames(shown)} color={shownG.color} size={160} />
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "#3D4756", maxWidth: 420 }}>{shown.cue}</div>

        {!isRest && (
          nextEx ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: 10, padding: "6px 14px", marginTop: 6 }}>
              <Figure frames={resolveFrames(nextEx)} color={GROUPS[nextEx.grp].color} size={40} />
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#9AA3B0", fontWeight: 700 }}>UP NEXT</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }}>{nextEx.name}</div>
            </div>
          ) : (
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#9AA3B0", marginTop: 6 }}>LAST ONE — EMPTY THE TANK</div>
          )
        )}
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => setPaused((p) => !p)}
          style={{ ...S.startBtn, background: paused ? "#2FA671" : "#E4E7EC", color: paused ? "#FFFFFF" : "#1B2430" }}>
          {paused ? "▶ RESUME" : "❚❚ PAUSE"}
        </button>
        {!isRest && mode !== "hiit" && (
          <button onClick={togglePlayerUni}
            style={{
              ...S.startBtn, fontSize: 16, padding: "12px 0",
              background: effUni(ex) ? "#DCE7FB" : "#EFF1F5",
              color: effUni(ex) ? "#2456B3" : "#6C7686",
            }}>
            {effUni(ex) ? "×2 BOTH SIDES ✓" : "×2 BOTH SIDES — OFF"}
          </button>
        )}
        {!isRest && !isReady && mode !== "hiit" && ex.type === "reps" && (
          <button onClick={() => (side === "L" ? switchToRight() : advance())} style={S.startBtn}>
            {side === "L" ? "LEFT DONE — SWITCH SIDES" : "DONE — NEXT"}
          </button>
        )}
        {isRest && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setTimeLeft((v) => { timeLeftRef.current = v + 15; return v + 15; })}
              style={{ ...S.startBtn, flex: 1, background: "#E4E7EC", color: "#1B2430" }}>
              +15s REST
            </button>
            <button onClick={startNext} style={{ ...S.startBtn, flex: 1, background: "#E4E7EC", color: "#1B2430" }}>SKIP REST</button>
          </div>
        )}
      </div>
    </div>
  );
}
