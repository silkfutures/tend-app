"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as db from "@/lib/db";
import { STEPS, STEP_COLORS, STEP_SUBTITLES, FORM_SECTIONS, PARTNER_ORGS, QUICK_FIELDS, SCALE_LABELS, ONBOARDING_QUESTIONS, YP_FEEDBACK_QUESTIONS, PULSE_CARDS_64, SPARK_CARDS_CORE, SIGNAL_CARDS_CORE } from "@/lib/constants";
import { getLatestStage, getLatestScores, getProgressionStatus, computeStepAverages, exportSessionsCSV, exportSummaryCSV } from "@/lib/utils";
import LiveSession from "@/components/LiveSession";
import SetPaceSession from "@/components/SetPaceSession";

// ─── STYLE TOKENS ────────────────────────────
const C = {
  bg: "#FFFFFF", surface: "#FFFFFF", surfaceAlt: "#F5F5F5",
  border: "#E5E5E5", borderStrong: "#D4D4D4",
  accent: "#2563EB", accentDim: "#444444",
  text: "#0A0A0A", muted: "#888888", light: "#BBBBBB",
  danger: "#DC2626",
  gradient: "linear-gradient(135deg, #059669, #0D9488, #2563EB, #4F46E5)",
  green: "#059669",
};

// ─── SHARED UI ───────────────────────────────

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
      ...(onClick ? { cursor: "pointer", transition: "border-color 0.15s" } : {}), ...style,
    }}>{children}</div>
  );
}

function StepBadge({ step, size = "sm" }) {
  const color = STEP_COLORS[step] || C.accent;
  return (
    <span style={{
      background: color + "12", color, border: `1px solid ${color}35`, borderRadius: 4,
      padding: size === "lg" ? "5px 14px" : "3px 9px",
      fontSize: size === "lg" ? 12 : 10, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", fontFamily: "'DM Mono', monospace",
    }}>{step}</span>
  );
}

function ScoreBar({ value, color, max = 4 }) {
  const pct = value ? (parseFloat(value) / max) * 100 : 0;
  return (
    <div style={{ background: C.border, borderRadius: 2, height: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function RatingInput({ value, onChange, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 38, height: 38, borderRadius: "50%",
          border: `1.5px solid ${value === n ? C.accent : C.border}`,
          background: value === n ? C.accent : "transparent",
          color: value === n ? C.surface : C.muted,
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>{n}</button>
      ))}
      {value && max === 5 && <span style={{ fontSize: 11, color: C.muted, marginLeft: 6, fontStyle: "italic" }}>{SCALE_LABELS[value]}</span>}
    </div>
  );
}

function GroupBadge() {
  return <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, background: "#7C3AED15", color: "#7C3AED", fontFamily: "'DM Mono', monospace" }}>Group</span>;
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, background: isAdmin ? C.accent + "15" : "#04785715", color: isAdmin ? C.accent : "#047857", fontFamily: "'DM Mono', monospace" }}>{isAdmin ? "Admin" : "Mentor"}</span>;
}

function InfoPopup({ title, description, color, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", borderTop: `4px solid ${color}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: C.accentDim, lineHeight: 1.7, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}

function AccessCardsModal({ onClose, youngPerson, stage, preselectedType }) {
  const [cardType, setCardType] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [picked, setPicked] = useState(null);
  const stageColor = STEP_COLORS[stage] || C.accent;
  const cardColors = { spark: "#F59E0B", signal: "#2563EB", pulse: "#047857", unpack: "#7C3AED" };

  // Auto-load if a type was preselected
  useEffect(() => {
    if (preselectedType && !cardType) loadCards(preselectedType);
  }, [preselectedType]);

  const loadCards = async (type) => {
    setCardType(type);
    setLoading(true);
    setFlipped({});
    setPicked(null);
    try {
      if (type === "pulse") {
        const shuffled = [...PULSE_CARDS_64].sort(() => Math.random() - 0.5);
        setCards(shuffled.slice(0, 1));
      } else if (type === "spark") {
        const shuffled = [...SPARK_CARDS_CORE].sort(() => Math.random() - 0.5);
        setCards(shuffled.slice(0, 1));
      } else if (type === "signal") {
        const shuffled = [...SIGNAL_CARDS_CORE].sort(() => Math.random() - 0.5);
        setCards(shuffled.slice(0, 1));
      } else {
        const res = await fetch("/api/live-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "cards", youngPerson: youngPerson || "Young Person", stage: stage || "Reset", cardType: type, recentNotes: "", previousResponses: "", isGroup: false, participants: "" }),
        });
        const data = await res.json();
        setCards((data.cards || []).slice(0, 1));
      }
    } catch { setCards([{ question: "Couldn't load cards. Try again." }]); }
    setLoading(false);
  };

  const refresh = () => loadCards(cardType);
  const cardImages = { spark: "/spark-card.png", signal: "/signal-card.png", pulse: "/pulse-card.png", unpack: "/pulse-card.png" };
  const cardBgs = { spark: "#FFFFFF", signal: "#1A1A1A", pulse: "#FF4500", unpack: "#7C3AED" };
  const activeColor = cardColors[cardType] || stageColor;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 20, maxWidth: 520, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Access Cards</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>
          {!cardType ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 8px" }}>Choose a deck — you'll get 3 cards to flip and pick from.</p>
              {[
                { type: "pulse", label: "Pulse Cards", desc: "Unpack, Spark, or Go Deeper — shift the energy of the room.", color: "#000", textColor: "#fff", bg: "#FF4500", img: "/pulse-card.png" },
                { type: "spark", label: "Spark Cards", desc: "Creative prompts to ignite ideas — song titles, themes, directions.", color: "#000", textColor: "#1A1A1A", bg: "#FFFFFF", img: "/spark-card.png" },
                { type: "signal", label: "Signal Cards", desc: "Go deeper into the bars — interrogate what they've made.", color: "#fff", textColor: "#fff", bg: "#1A1A1A", img: "/signal-card.png" },
              ].map(c => (
                <div key={c.type} onClick={() => loadCards(c.type)} style={{
                  cursor: "pointer", borderRadius: 14, overflow: "hidden",
                  background: c.bg, border: c.bg === "#FFFFFF" ? `1px solid ${C.border}` : "none",
                  padding: "18px 20px",
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  <img src={c.img} alt={c.label} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: c.textColor, marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: c.textColor, opacity: 0.7, lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: activeColor, margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: C.muted }}>Drawing a card...</div>
            </div>
          ) : cards.length > 0 ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <button onClick={() => { setCardType(null); setCards([]); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: 0 }}>← Choose deck</button>
                <span style={{ fontSize: 10, fontWeight: 700, color: activeColor, background: activeColor + "15", padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{cardType}</span>
              </div>

              {cards.map((card, i) => {
                const isFlipped = !!flipped[i];
                const q = card.question || card.prompt || (typeof card === "string" ? card : "");
                return (
                  <div key={i} onClick={() => {
                    if (!isFlipped) setFlipped(f => ({ ...f, [i]: true }));
                  }} style={{
                    cursor: isFlipped ? "default" : "pointer",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: isFlipped ? `1px solid ${C.border}` : "none",
                    background: isFlipped ? C.surface : (cardBgs[cardType] || "#FF4500"),
                    textAlign: "center",
                    transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
                    minHeight: 200,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!isFlipped ? (
                      <div style={{ padding: "50px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <img src={cardImages[cardType] || "/pulse-card.png"} alt="" style={{ width: 72, height: 72, objectFit: "contain" }} />
                        <div style={{ fontSize: 16, fontWeight: 700, color: cardType === "spark" ? C.muted : "#fff" }}>Tap to reveal</div>
                      </div>
                    ) : (
                      <div style={{ padding: "32px 28px", width: "100%" }}>
                        {card.theme && <div style={{ fontSize: 11, fontWeight: 800, color: activeColor, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>{card.theme}</div>}
                        <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, margin: "0 0 12px", color: C.text }}>{q}</p>
                        {card.hint && <p style={{ fontSize: 13, color: C.muted, margin: "0 0 6px", fontStyle: "italic", lineHeight: 1.5 }}>{card.hint}</p>}
                        {card.mantra && <p style={{ fontSize: 12, color: activeColor, margin: "12px 0 0", fontStyle: "italic", fontWeight: 600 }}>{card.mantra}</p>}
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={refresh} style={{
                width: "100%", padding: "16px 0", borderRadius: 12, marginTop: 16,
                border: `1.5px solid ${activeColor}`, background: "transparent",
                color: activeColor, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>↺ Draw another card</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────

function LoginScreen({ mentors, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(null); setAttempts(0); setLockCountdown(0); setError(""); }
      else setLockCountdown(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const handleLogin = async () => {
    if (!selected || pin.length < 4 || isLocked) return;
    setLoading(true);
    const user = await db.loginMentor(selected.name, pin);
    setLoading(false);
    if (user) { setAttempts(0); onLogin(user); }
    else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 5 * 60 * 1000); // 5 minute lockout
        setError("Too many attempts. Try again in 5 minutes.");
      } else {
        setError(`Incorrect PIN (${newAttempts}/5 attempts)`);
      }
    }
  };

  const handlePinKey = (d) => {
    if (pin.length < 6) { setPin(p => p + d); setError(""); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #059669 0%, #0D9488 30%, #2563EB 70%, #4F46E5 100%)", backgroundSize: "200% 200%", animation: "splashGradientShift 6s ease infinite", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", animation: "splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
          <img src="/logo.png" alt="SilkFutures" style={{ width: 100, height: "auto", marginBottom: 12, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Pathways
          </div>
        </div>

        {!selected ? (
          <div style={{ animation: "splashTextIn 0.5s ease 0.2s both" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Who's logging in?</div>
            <div style={{ display: "grid", gap: 8 }}>
              {mentors.map(u => (
                <div key={u.id} onClick={() => setSelected(u)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                  background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>{u.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{u.name}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, background: u.role === "admin" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", fontFamily: "'DM Mono', monospace" }}>{u.role === "admin" ? "Admin" : "Mentor"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ animation: "splashTextIn 0.4s ease both" }}>
            <button onClick={() => { setSelected(null); setPin(""); setError(""); setAttempts(0); setLockedUntil(null); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0 }}>← Back</button>
            <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, padding: 28 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{selected.name[0]}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{selected.name}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Enter PIN</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${pin.length > i ? "#fff" : "rgba(255,255,255,0.3)"}`, background: pin.length > i ? "#fff" : "transparent", transition: "all 0.15s" }} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 240, margin: "0 auto" }}>
                {[1,2,3,4,5,6,7,8,9,null,0,"←"].map((d, i) => d === null ? <div key={i} /> : (
                  <button key={i} onClick={() => d === "←" ? setPin(p => p.slice(0,-1)) : handlePinKey(String(d))} style={{
                    width: "100%", height: 48, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)",
                    fontSize: d === "←" ? 18 : 16, fontWeight: 600, color: "#fff", cursor: "pointer",
                  }}>{d}</button>
                ))}
              </div>
              {error && <div style={{ textAlign: "center", color: "#FCA5A5", fontSize: 12, marginTop: 12, fontWeight: 600 }}>{error}{isLocked ? ` (${Math.floor(lockCountdown / 60)}:${String(lockCountdown % 60).padStart(2, "0")})` : ""}</div>}
              <button onClick={handleLogin} disabled={pin.length < 4 || loading || isLocked} style={{
                width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                background: isLocked ? "rgba(220,38,38,0.3)" : pin.length >= 4 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
                color: isLocked ? "#FCA5A5" : pin.length >= 4 ? "#0D9488" : "rgba(255,255,255,0.4)",
                fontSize: 14, fontWeight: 700, cursor: pin.length >= 4 && !isLocked ? "pointer" : "default", marginTop: 16,
              }}>{isLocked ? "Locked" : loading ? "Signing in..." : "Sign In"}</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Forgot your PIN? Ask Nathan or Toni.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ASSESSMENT FORM ─────────────────────────

function AssessmentForm({ onSubmit, youngPeople, mentors, currentUser, startAsGroup, savedGroups, onGroupsChanged }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedSavedGroup, setSelectedSavedGroup] = useState(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [enhancingNotes, setEnhancingNotes] = useState(false);
  const voiceRecRef = useRef(null);
  const [locationNames, setLocationNames] = useState([]);
  const [form, setForm] = useState({
    youngPersonId: "", youngPersonName: "", newYoungPerson: "",
    date: new Date().toISOString().split("T")[0],
    startTime: new Date().toTimeString().slice(0, 5),
    sessionLength: "1 Hour", partnerOrg: "SilkFutures", focusStep: "Reset",
    scores: {}, quick: {}, notes: "", mentorReflection: "", safeguarding: "", sensitiveNotes: "",
    isGroup: startAsGroup || false, groupYoungPeople: [], coMentors: [],
  });

  // Load locations from DB — single source of truth
  useEffect(() => {
    db.getLocations().then(locs => {
      if (locs?.length) {
        setLocationNames(locs.map(l => l.name).sort());
      }
    }).catch(() => {});
  }, []);

  const setQuick = (key, val) => setForm(f => ({ ...f, quick: { ...f.quick, [key]: val } }));
  const otherMentors = mentors.filter(m => m.id !== currentUser.id);

  const canProceed = () => {
    if (step === 0) {
      if (form.isGroup) return form.groupYoungPeople.length > 0;
      return form.youngPersonId || form.newYoungPerson.trim();
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Pathway step scores are now AI-derived after submission — start with empty averages
    const stepAverages = {};

    // Resolve session length — if "Other", use custom minutes
    const resolvedLength = form.sessionLength === "Other" && form.customLengthMins
      ? `${form.customLengthMins} mins`
      : form.sessionLength;

    let savedSessionIds = [];

    if (form.isGroup) {
      const groupId = crypto.randomUUID();

      // Save group if named
      if (groupName.trim() && form.groupYoungPeople.length > 0) {
        const memberIds = form.groupYoungPeople.map(yp => yp.id);
        if (selectedSavedGroup) {
          await db.updateSavedGroup(selectedSavedGroup.id, memberIds);
        } else {
          await db.createSavedGroup(groupName.trim(), memberIds);
        }
        if (onGroupsChanged) onGroupsChanged();
      }

      for (const yp of form.groupYoungPeople) {
        const result = await db.createSession({
          mentorId: currentUser.id, youngPersonId: yp.id,
          date: form.date, startTime: form.startTime, focusStep: form.focusStep,
          sessionLength: resolvedLength, partnerOrg: form.partnerOrg,
          isGroup: true, groupId, scores: form.scores, quick: form.quick,
          stepAverages, notes: form.notes, mentorReflection: form.mentorReflection,
          safeguarding: form.safeguarding, sensitiveNotes: form.sensitiveNotes,
          coMentorIds: form.coMentors.map(m => m.id),
        });
        if (result?.data?.id) savedSessionIds.push(result.data.id);
      }
    } else {
      let ypId = form.youngPersonId;
      if (!ypId && form.newYoungPerson.trim()) {
        const { data } = await db.createYoungPerson(form.newYoungPerson.trim());
        if (data) ypId = data.id;
      }
      if (ypId) {
        // Check for a same-day completed check-in questionnaire and merge it into notes
        let mergedNotes = form.notes;
        try {
          const checkins = await db.getCheckinsForYP(ypId);
          const todayCheckin = checkins.find(c => c.status === "completed" && c.completed_at && c.completed_at.split("T")[0] === form.date);
          if (todayCheckin && todayCheckin.questions?.length && todayCheckin.responses) {
            const checkinSummary = todayCheckin.questions.map(q => {
              const answer = todayCheckin.responses[q.id];
              if (answer === undefined || answer === null) return null;
              const displayAnswer = typeof answer === "object" ? (answer.label || answer.emoji || JSON.stringify(answer)) : answer;
              return `${q.question || q.text}: ${displayAnswer}`;
            }).filter(Boolean).join("\n");
            if (checkinSummary) {
              mergedNotes = `${form.notes}\n\n--- Check-In Questionnaire (${todayCheckin.completed_at.split("T")[0]}) ---\n${checkinSummary}`;
            }
          }
        } catch (e) { console.warn("Checkin merge failed:", e); }

        const result = await db.createSession({
          mentorId: currentUser.id, youngPersonId: ypId,
          date: form.date, startTime: form.startTime, focusStep: form.focusStep,
          sessionLength: resolvedLength, partnerOrg: form.partnerOrg,
          isGroup: false, groupId: null, scores: form.scores, quick: form.quick,
          stepAverages, notes: mergedNotes, mentorReflection: form.mentorReflection,
          safeguarding: form.safeguarding, sensitiveNotes: form.sensitiveNotes, coMentorIds: [],
        });
        if (result?.data?.id) savedSessionIds.push(result.data.id);
      }
    }
    // Send notifications (safeguarding + sheets backup)
    const ypName = form.isGroup
      ? form.groupYoungPeople.map(yp => yp.name).join(", ")
      : (youngPeople.find(y => y.id === form.youngPersonId)?.name || form.newYoungPerson);
    db.sendSessionNotifications({
      mentorName: currentUser.name, youngPersonName: ypName,
      date: form.date, startTime: form.startTime, focusStep: form.focusStep,
      sessionLength: resolvedLength, partnerOrg: form.partnerOrg,
      isGroup: form.isGroup, quick: form.quick, stepAverages,
      notes: form.notes, mentorReflection: form.mentorReflection,
      safeguarding: form.safeguarding,
    });

    // Create safeguarding case once (not per-YP) — use first YP as the reference
    if (form.safeguarding?.trim()) {
      const firstYpId = form.isGroup ? form.groupYoungPeople[0]?.id : form.youngPersonId;
      db.createSafeguardingCaseIfNeeded({
        sessionId: null, youngPersonId: firstYpId, mentorId: currentUser.id,
        date: form.date, safeguarding: form.safeguarding, notes: form.notes,
      });
    }

    // Fire background AI call to derive pathway step scores from notes + indicators
    if (savedSessionIds.length > 0 && (form.notes.trim() || form.mentorReflection.trim())) {
      fetch("/api/ai-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "derive-pathway-scores",
          sessionIds: savedSessionIds,
          focusStep: form.focusStep,
          notes: form.notes,
          mentorReflection: form.mentorReflection,
          quick: form.quick,
          ypName: form.isGroup
            ? form.groupYoungPeople.map(yp => yp.name).join(", ")
            : (youngPeople.find(y => y.id === form.youngPersonId)?.name || form.newYoungPerson || "Young person"),
        }),
      }).catch(e => console.warn("Background AI scoring failed:", e));
    }

    setSubmitting(false);
    onSubmit();
  };

  const renderAdmin = () => (
    <div>
      <h2 style={{ color: C.accent, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{form.isGroup ? "New Group Session" : "New Session"}</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>SilkFutures Pathways — Session Log</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ label: "1:1 Session", val: false }, { label: "Group Session", val: true }].map(({ label, val }) => (
          <button key={label} onClick={() => setForm(f => ({ ...f, isGroup: val, groupYoungPeople: [], coMentors: [], youngPersonId: "" }))} style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            border: `2px solid ${form.isGroup === val ? C.accent : C.border}`,
            background: form.isGroup === val ? C.accent + "10" : "transparent",
            color: form.isGroup === val ? C.accent : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {!form.isGroup ? (
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Young Person</label>
            <div style={{ position: "relative" }}>
              <input
                value={form.youngPersonId === "__new__" ? form.newYoungPerson : (form._ypSearch !== undefined ? form._ypSearch : (youngPeople.find(y => y.id === form.youngPersonId)?.name || ""))}
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, _ypSearch: val, youngPersonId: "", newYoungPerson: val, _ypDropdownOpen: true }));
                }}
                onFocus={() => setForm(f => ({ ...f, _ypDropdownOpen: true }))}
                placeholder="Type to search or add new..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              {form._ypDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                  {youngPeople
                    .filter(yp => !form._ypSearch || yp.name.toLowerCase().includes((form._ypSearch || "").toLowerCase()))
                    .map(yp => (
                      <div key={yp.id} onClick={() => setForm(f => ({ ...f, youngPersonId: yp.id, newYoungPerson: "", _ypSearch: undefined, _ypDropdownOpen: false }))}
                        style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: `1px solid ${C.border}08` }}
                        onMouseEnter={e => e.target.style.background = C.surfaceAlt}
                        onMouseLeave={e => e.target.style.background = "transparent"}
                      >{yp.name}</div>
                    ))}
                  {form._ypSearch?.trim() && !youngPeople.some(yp => yp.name.toLowerCase() === (form._ypSearch || "").toLowerCase()) && (
                    <div onClick={() => setForm(f => ({ ...f, youngPersonId: "__new__", newYoungPerson: form._ypSearch?.trim() || "", _ypSearch: undefined, _ypDropdownOpen: false }))}
                      style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.accent, fontWeight: 600, borderTop: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.target.style.background = C.surfaceAlt}
                      onMouseLeave={e => e.target.style.background = "transparent"}
                    >+ Add "{form._ypSearch?.trim()}" as new person</div>
                  )}
                  {!form._ypSearch?.trim() && youngPeople.length === 0 && (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>No young people yet. Type a name to add one.</div>
                  )}
                </div>
              )}
              {/* Click outside to close */}
              {form._ypDropdownOpen && <div onClick={() => setForm(f => ({ ...f, _ypDropdownOpen: false }))} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
            </div>
            {form.youngPersonId === "__new__" && form.newYoungPerson && (
              <div style={{ fontSize: 11, color: C.accent, marginTop: 6, fontWeight: 600 }}>New person: {form.newYoungPerson} — will be created on submit</div>
            )}
            {form.youngPersonId && form.youngPersonId !== "__new__" && (
              <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>✓ {youngPeople.find(y => y.id === form.youngPersonId)?.name}</div>
            )}
          </div>
        ) : (
          <div>
            {/* Load saved group */}
            {savedGroups?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Load a Saved Group</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {savedGroups.map(g => {
                    const isSel = selectedSavedGroup?.id === g.id;
                    return (
                      <button key={g.id} onClick={() => {
                        if (isSel) {
                          setSelectedSavedGroup(null);
                          setGroupName("");
                          setForm(f => ({ ...f, groupYoungPeople: [] }));
                        } else {
                          setSelectedSavedGroup(g);
                          setGroupName(g.name);
                          const members = youngPeople.filter(yp => g.member_ids.includes(yp.id));
                          setForm(f => ({ ...f, groupYoungPeople: members }));
                        }
                      }} style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: `1.5px solid ${isSel ? "#7C3AED" : C.border}`,
                        background: isSel ? "#7C3AED15" : "transparent",
                        color: isSel ? "#7C3AED" : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>{g.name} ({g.member_ids.length})</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Group Name {selectedSavedGroup ? "(editing)" : "(optional — save for next time)"}
              </label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Monday Grangetown, Thursday Set Pace..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Selected members */}
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Today's Group ({form.groupYoungPeople.length} people)
            </label>
            {form.groupYoungPeople.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {form.groupYoungPeople.map(yp => (
                  <span key={yp.id} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 10px 6px 14px", borderRadius: 100,
                    background: C.accent, color: C.bg, fontSize: 12, fontWeight: 600,
                  }}>
                    {yp.name}
                    <button onClick={() => setForm(f => ({ ...f, groupYoungPeople: f.groupYoungPeople.filter(g => g.id !== yp.id) }))} style={{
                      background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "50%",
                      width: 18, height: 18, fontSize: 11, color: C.bg, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Add from existing */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {youngPeople.filter(yp => !form.groupYoungPeople.some(g => g.id === yp.id)).map(yp => (
                <button key={yp.id} onClick={() => setForm(f => ({ ...f, groupYoungPeople: [...f.groupYoungPeople, yp] }))} style={{
                  padding: "6px 14px", borderRadius: 100,
                  border: `1.5px solid ${C.border}`, background: "transparent",
                  color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>+ {yp.name}</button>
              ))}
            </div>

            {/* Add new person */}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)}
                placeholder="Add someone new..."
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newPersonName.trim()) {
                    const { data } = await db.createYoungPerson(newPersonName.trim());
                    if (data) {
                      setForm(f => ({ ...f, groupYoungPeople: [...f.groupYoungPeople, data] }));
                      setNewPersonName("");
                    }
                  }
                }}
                style={{ flex: 1, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <button onClick={async () => {
                if (newPersonName.trim()) {
                  const { data } = await db.createYoungPerson(newPersonName.trim());
                  if (data) {
                    setForm(f => ({ ...f, groupYoungPeople: [...f.groupYoungPeople, data] }));
                    setNewPersonName("");
                  }
                }
              }} style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: newPersonName.trim() ? C.accent : C.border,
                color: newPersonName.trim() ? C.bg : C.muted,
                fontSize: 12, fontWeight: 700, cursor: newPersonName.trim() ? "pointer" : "default",
              }}>Add</button>
            </div>
          </div>
        )}

        {form.isGroup && otherMentors.length > 0 && (
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Co-Mentors</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {otherMentors.map(m => {
                const sel = form.coMentors.some(c => c.id === m.id);
                return (
                  <button key={m.id} onClick={() => setForm(f => ({
                    ...f, coMentors: sel ? f.coMentors.filter(c => c.id !== m.id) : [...f.coMentors, m],
                  }))} style={{
                    padding: "6px 14px", borderRadius: 100,
                    border: `1.5px solid ${sel ? "#7C3AED" : C.border}`, background: sel ? "#7C3AED18" : "transparent",
                    color: sel ? "#7C3AED" : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>{m.name}</button>
                );
              })}
            </div>
          </div>
        )}

        {[
          { label: "Partner Organisation", key: "partnerOrg", options: locationNames },
          { label: "Session Length", key: "sessionLength", options: ["30 mins", "1 Hour", "1.5 Hours", "2 Hours", "Other"] },
          { label: "Focus Step", key: "focusStep", options: STEPS },
        ].map(({ label, key, options }) => (
          <div key={key}>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
            <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", appearance: "none" }}>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {form.sessionLength === "Other" && (
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Custom Length (minutes)</label>
            <input type="number" min="15" max="300" step="15" placeholder="e.g. 90" value={form.customLengthMins || ""} onChange={e => setForm(f => ({ ...f, customLengthMins: e.target.value }))}
              style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Start Time</label>
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPathwayStep = () => {
    const stepName = form.focusStep;
    const section = FORM_SECTIONS[stepName];
    const color = STEP_COLORS[stepName];
    const vals = section.subsections.map((_, si) => form.scores[`${stepName}_${si}`]).filter(Boolean);
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <StepBadge step={stepName} size="lg" />
          {avg && <span style={{ fontSize: 13, color, fontWeight: 700 }}>{avg} avg</span>}
        </div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Slide each indicator</p>
        <div style={{ display: "grid", gap: 16 }}>
          {section.subsections.map((sub, si) => {
            const val = form.scores[`${stepName}_${si}`] || 0;
            const palette = ["#4A7C59", "#E8A44A", "#6BAF7C", "#C97070", "#7C3AED", "#2563EB", "#B45309"];
            const indColor = palette[si % palette.length];
            return (
              <div key={si}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{sub.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val ? val.toFixed(1) : "—"}</span>
                </div>
                <input type="range" min={1} max={5} step={0.5} value={val || 3}
                  onChange={e => setForm(f => ({ ...f, scores: { ...f.scores, [`${stepName}_${si}`]: parseFloat(e.target.value) } }))}
                  style={{ width: "100%", accentColor: indColor, cursor: "pointer" }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuick = () => (
    <div>
      <h2 style={{ color: C.accent, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Session Indicators</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Five indicators — slide to score</p>
      <div style={{ display: "grid", gap: 16 }}>
        {QUICK_FIELDS.map(({ key, label, labels, color: fieldColor }) => {
          const val = form.quick[key] || 0;
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val ? val.toFixed(1) : "—"}</span>
              </div>
              <input type="range" min={1} max={5} step={0.5} value={val || 2.5}
                onChange={e => setQuick(key, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: fieldColor || C.accent, cursor: "pointer" }} />
              {val > 0 && <div style={{ fontSize: 10, color: C.light, marginTop: 2 }}>{labels[Math.round(val)]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const enhanceNotes = async () => {
    if (!form.notes.trim() && !form.mentorReflection.trim()) return;
    setEnhancingNotes(true);
    try {
      const ypName = form.isGroup
        ? form.groupYoungPeople.map(yp => yp.name).join(", ")
        : (youngPeople.find(y => y.id === form.youngPersonId)?.name || form.newYoungPerson || "Young person");
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "enhance-notes",
          name: ypName,
          stage: form.focusStep,
          rawNotes: form.notes,
          rawReflection: form.mentorReflection,
          focusStep: form.focusStep,
        }),
      });
      const data = await res.json();
      if (data.enhancedNotes) setForm(f => ({ ...f, notes: data.enhancedNotes }));
      if (data.enhancedReflection) setForm(f => ({ ...f, mentorReflection: data.enhancedReflection }));
    } catch (e) { console.error("Enhancement failed:", e); }
    setEnhancingNotes(false);
  };

  const renderNotes = () => {
    const startVoice = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { alert("Speech recognition not supported. Try Chrome or Safari."); return; }
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = "en-GB";
      let final = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        setVoiceTranscript(final + interim);
      };
      rec.onerror = () => stopVoice();
      rec.onend = () => { if (voiceRecording) rec.start(); };
      rec.start();
      voiceRecRef.current = rec;
      setVoiceRecording(true);
    };

    const stopVoice = async () => {
      if (voiceRecRef.current) { voiceRecRef.current.onend = null; voiceRecRef.current.stop(); }
      setVoiceRecording(false);
      const transcript = voiceTranscript.trim();
      if (!transcript) return;
      setVoiceProcessing(true);
      try {
        const ypName = form.isGroup
          ? form.groupYoungPeople.map(yp => yp.name).join(", ")
          : (youngPeople.find(y => y.id === form.youngPersonId)?.name || form.newYoungPerson || "Young person");
        const res = await fetch("/api/ai-summary", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "voice-reflection", transcript, name: ypName, stage: form.focusStep }),
        });
        const data = await res.json();
        if (data.notes) setForm(f => ({ ...f, notes: f.notes ? f.notes + "\n\n" + data.notes : data.notes }));
        if (data.reflection) setForm(f => ({ ...f, mentorReflection: f.mentorReflection ? f.mentorReflection + "\n\n" + data.reflection : data.reflection }));
        if (data.safeguarding) setForm(f => ({ ...f, safeguarding: f.safeguarding ? f.safeguarding + "\n\n" + data.safeguarding : data.safeguarding }));
      } catch { setForm(f => ({ ...f, notes: f.notes ? f.notes + "\n\n" + transcript : transcript })); }
      setVoiceProcessing(false);
      setVoiceTranscript("");
    };

    return (
    <div>
      <h2 style={{ color: C.accent, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Notes & Observations</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Session narrative, breakthroughs, challenges</p>

      {/* Voice Reflection */}
      <Card style={{ marginBottom: 16, borderLeft: `3px solid ${voiceRecording ? "#DC2626" : "#7C3AED"}40`, background: voiceRecording ? "#FEF2F2" : voiceProcessing ? "#F5F3FF" : C.surface }}>
        {voiceProcessing ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: "#7C3AED", margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />
            <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
            <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>Processing your reflection into notes, reflection, and safeguarding...</div>
          </div>
        ) : voiceRecording ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#DC2626", animation: "pulse 1.5s infinite" }} />
                <style dangerouslySetInnerHTML={{ __html: "@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }" }} />
                <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>Recording...</span>
              </div>
              <button onClick={stopVoice} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Stop & Process ✓</button>
            </div>
            {voiceTranscript && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, maxHeight: 80, overflow: "auto", padding: 8, background: C.surfaceAlt, borderRadius: 6 }}>{voiceTranscript}</div>}
          </div>
        ) : (
          <button onClick={startVoice} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: `1.5px dashed #7C3AED40`, background: "transparent", color: "#7C3AED", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🎙 Record Voice Reflection
          </button>
        )}
      </Card>

      <div style={{ display: "grid", gap: 16 }}>
        <Card>
          <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Key Notes / Breakthroughs / Challenges</label>
          <div style={{ fontSize: 11, color: "#047857", marginBottom: 8, padding: "6px 10px", background: "#ECFDF5", borderRadius: 6 }}>👁 Other mentors can see AI summaries of these notes (not the full text) when they view this young person's profile</div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Include anything significant..." rows={6}
            style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </Card>
        <Card>
          <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Mentor Reflection</label>
          <textarea value={form.mentorReflection} onChange={e => setForm(f => ({ ...f, mentorReflection: e.target.value }))} placeholder="How did you show up today?..." rows={4}
            style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </Card>
        <Card style={{ borderColor: "#ff444420" }}>
          <label style={{ display: "block", fontSize: 12, color: "#ff6b6b", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Safeguarding Concerns</label>
          <div style={{ fontSize: 11, color: "#B91C1C", marginBottom: 8, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6 }}>🔒 Director-only — only Nathan and Toni can see this</div>
          <textarea value={form.safeguarding} onChange={e => setForm(f => ({ ...f, safeguarding: e.target.value }))} placeholder="Note any safeguarding concerns..." rows={3}
            style={{ width: "100%", background: "#FFF5F5", border: "1px solid #F8A5A5", borderRadius: 8, padding: 12, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </Card>
        <Card style={{ borderColor: "#7C3AED30" }}>
          <label style={{ display: "block", fontSize: 12, color: "#7C3AED", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Sensitive / Director-Only Notes</label>
          <div style={{ fontSize: 11, color: "#6D28D9", marginBottom: 8, padding: "6px 10px", background: "#F5F3FF", borderRadius: 6 }}>🔒 Only Nathan and Toni can see this. Use for anything the young person shared in confidence that other mentors shouldn't read directly.</div>
          <textarea value={form.sensitiveNotes} onChange={e => setForm(f => ({ ...f, sensitiveNotes: e.target.value }))} placeholder="Sensitive disclosures, private context, anything director-only..." rows={3}
            style={{ width: "100%", background: "#FAFAFE", border: "1px solid #C4B5FD", borderRadius: 8, padding: 12, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </Card>
      </div>

      {/* AI Enhance button */}
      {(form.notes.trim() || form.mentorReflection.trim()) && (
        <button onClick={enhanceNotes} disabled={enhancingNotes} style={{
          width: "100%", padding: "14px 0", borderRadius: 10, marginTop: 16,
          border: `1.5px solid ${C.accent}`, background: C.accent + "08",
          color: C.accent, fontSize: 13, fontWeight: 700, cursor: enhancingNotes ? "default" : "pointer",
          opacity: enhancingNotes ? 0.7 : 1,
        }}>
          {enhancingNotes ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.accent}40`, borderTopColor: C.accent, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              AI is enhancing your notes...
            </span>
          ) : "✨ AI Enhance — make my notes proper"}
        </button>
      )}
    </div>
    );
  };

  const steps = [
    { label: "Admin", render: renderAdmin },
    { label: "Indicators", render: renderQuick },
    { label: "Notes", render: renderNotes },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Step {step + 1} of {steps.length}</span>
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{steps[step].label}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.accent : C.border }} />)}
        </div>
      </div>
      <div style={{ minHeight: 400 }}>{steps[step].render()}</div>
      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "space-between" }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
          padding: "12px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
          color: step === 0 ? C.border : C.muted, fontSize: 14, cursor: step === 0 ? "default" : "pointer",
        }}>Back</button>
        {step < steps.length - 1 ? (
          <button onClick={() => canProceed() && setStep(s => s + 1)} style={{
            padding: "12px 32px", borderRadius: 8, border: "none",
            background: canProceed() ? C.accent : C.border, color: canProceed() ? C.bg : C.muted,
            fontSize: 14, fontWeight: 700, cursor: canProceed() ? "pointer" : "default",
          }}>Continue →</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: "12px 32px", borderRadius: 8, border: "none", background: C.accent, color: C.bg,
            fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1,
          }}>{submitting ? "Saving..." : "Submit Session ✓"}</button>
        )}
      </div>
    </div>
  );
}

// ─── SESSION PLAN MODAL ──────────────────────

function SessionPlanModal({ yp, stage, scores, recentNotes, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const stageColor = STEP_COLORS[stage] || C.accent;
  const cacheKey = `sf_plan_${yp}`;

  useEffect(() => {
    // Try to load cached plan first
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached?.plan && cached?.timestamp) {
        setPlan(cached.plan);
        setIsCached(true);
        setLoading(false);
        return;
      }
    } catch {}
    generate();
  }, []);

  const generate = async () => {
    setLoading(true); setError(null); setPlan(null); setIsCached(false);
    const avgs = scores || {};
    const scoreLines = STEPS.map(s => { const v = parseFloat(avgs[s]); if (!v) return null; return `${s}: ${v.toFixed(1)}/4`; }).filter(Boolean).join(", ");
    const weakAreas = STEPS.filter(s => { const v = parseFloat(avgs[s]); return v && v < 3; });
    const weak = weakAreas.length > 0 ? weakAreas.join(", ") : "No clear weak areas — focus on current stage";

    try {
      const res = await fetch("/api/session-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youngPerson: yp, stage, scores: scoreLines, weakAreas: weak, recentNotes, generateThree: false }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newPlan = data.plans ? data.plans[0] : data;
      setPlan(newPlan);
      // Save to localStorage
      try { localStorage.setItem(cacheKey, JSON.stringify({ plan: newPlan, timestamp: Date.now(), stage })); } catch {}
    } catch { setError("Couldn't generate plan. Try again."); }
    finally { setLoading(false); }
  };

  const PC = { Unpack: "#2563EB", Spark: "#7C3AED", "Go Deeper": "#047857" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,18,16,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Next Session Focus</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{yp}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <StepBadge step={stage} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isCached && <span style={{ padding: "6px 12px", borderRadius: 100, background: "#05966915", color: "#059669", fontSize: 11, fontWeight: 600 }}>Saved plan</span>}
            <button onClick={generate} style={{ padding: "6px 12px", borderRadius: 100, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{isCached ? "Generate fresh" : "↺ Regenerate"}</button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "20px 24px 28px", flex: 1 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: stageColor, margin: "0 auto 16px" }} className="animate-spin" />
              <div style={{ fontSize: 13, color: C.muted }}>Reading {yp}'s history and designing a tailored session...</div>
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 13, color: STEP_COLORS.Release, marginBottom: 12 }}>{error}</div>
              <button onClick={generate} style={{ padding: "8px 18px", borderRadius: 100, border: `1px solid ${STEP_COLORS.Release}`, background: "transparent", color: STEP_COLORS.Release, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Try again</button>
            </div>
          )}
          {plan && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: stageColor + "0D", borderLeft: `3px solid ${stageColor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: stageColor, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Session Aim</div>
                  {plan.focusArea && <span style={{ fontSize: 10, fontWeight: 700, color: stageColor, background: stageColor + "12", padding: "2px 8px", borderRadius: 100, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{plan.focusArea}</span>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{plan.sessionAim}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Activities</div>
                {[{ label: "Opening", data: plan.openingActivity }, { label: "Main", data: plan.mainActivity }, { label: "Closing", data: plan.closingActivity }].map(({ label, data }) => data && (
                  <div key={label} style={{ padding: "13px 15px", borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{data.title}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{label} · {data.duration}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{data.description}</div>
                  </div>
                ))}
              </div>
              {plan.pulseCards?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Pulse Cards</div>
                  {plan.pulseCards.map((card, i) => (
                    <div key={i} style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${(PC[card.type] || C.accent) + "30"}`, background: (PC[card.type] || C.accent) + "08", display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: PC[card.type] || C.accent, background: (PC[card.type] || C.accent) + "18", padding: "2px 7px", borderRadius: 4, fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{card.type}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{card.prompt}</span>
                    </div>
                  ))}
                </div>
              )}
              {plan.mentorNote && (
                <div style={{ padding: "12px 14px", borderRadius: 8, background: C.surfaceAlt, borderTop: `2px solid ${C.borderStrong}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Mentor Note</div>
                  <div style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, fontStyle: "italic" }}>{plan.mentorNote}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI SUMMARY CARD ────────────────────────

function AISummaryCard({ name, sessions, stage, avgs, currentUser }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  const generate = async () => {
    setLoading(true);
    setExpanded(true);
    try {
      const recentSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      const sessionSummaries = recentSessions.map(s =>
        `${s.date} (${s.focus_step}): ${s.notes || "No notes"}${s.mentor_reflection ? "\nMentor: " + s.mentor_reflection : ""}${s.safeguarding?.trim() ? "\n⚠️ SG: " + s.safeguarding : ""}${s.quick ? `\nQuick: Reg=${s.quick?.regulation || "?"} Eng=${s.quick?.engagement || "?"} Overall=${s.quick?.overall || "?"}` : ""}`
      ).join("\n\n");
      const scoreStr = STEPS.map(s => avgs?.[s] ? `${s}: ${avgs[s]}` : null).filter(Boolean).join(", ");

      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "yp-summary",
          name,
          stage,
          sessionNotes: `Scores: ${scoreStr || "No scores yet"}\nTotal sessions: ${sessions.length}\n\nRecent sessions:\n${sessionSummaries}`,
        }),
      });
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      setSummary({ summary: "Couldn't generate summary. Try again." });
    }
    setLoading(false);
  };

  if (!expanded) {
    return (
      <Card onClick={generate} style={{ marginBottom: 20, cursor: "pointer", borderLeft: `3px solid ${STEP_COLORS[stage]}40`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Where {name} is at</div>
            <div style={{ fontSize: 12, color: C.muted }}>Tap to generate an AI overview of {name}'s journey</div>
          </div>
          <span style={{ fontSize: 18, color: STEP_COLORS[stage] }}>✦</span>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 20, borderLeft: `3px solid ${STEP_COLORS[stage]}40` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Where {name} is at</h3>
        <button onClick={generate} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>↺ Refresh</button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: STEP_COLORS[stage], margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 12, color: C.muted }}>Analysing sessions...</div>
        </div>
      ) : summary ? (
        <div>
          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: "0 0 16px", whiteSpace: "pre-line" }}>{summary.summary || "No summary generated."}</p>
          {summary.patterns?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Patterns</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {summary.patterns.map((p, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 100, background: STEP_COLORS[stage] + "12", color: STEP_COLORS[stage], fontWeight: 600, border: `1px solid ${STEP_COLORS[stage]}25` }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {summary.concerns && isAdmin && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", borderLeft: "3px solid #DC2626", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Concerns</div>
              <div style={{ fontSize: 12, color: "#B91C1C" }}>{summary.concerns}</div>
            </div>
          )}
          {summary.recommendation && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: C.surfaceAlt, borderTop: `2px solid ${STEP_COLORS[stage]}40` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Next Session Focus</div>
              <div style={{ fontSize: 12, color: C.accentDim, fontStyle: "italic" }}>{summary.recommendation}</div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ─── THEIR VOICE (unified YP perspective) ────

function TheirVoice({ youngPersonId, name, stageColor, stage }) {
  const [voiceData, setVoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (youngPersonId) {
      db.getTheirVoiceData(youngPersonId).then(d => { setVoiceData(d); setLoading(false); });
    }
  }, [youngPersonId]);

  if (loading || !voiceData) return null;
  const { onboarding, checkins, feedback } = voiceData;
  const hasContent = onboarding || checkins.length > 0 || feedback.length > 0;
  if (!hasContent) return null;

  // Compute feedback averages using actual field IDs from YP_FEEDBACK_QUESTIONS
  const feedbackAvgs = {};
  YP_FEEDBACK_QUESTIONS.filter(q => q.type === "emoji").forEach(q => {
    const vals = feedback.map(fb => {
      const resp = fb.responses?.[q.id];
      if (typeof resp === "number") return resp;
      if (resp?.value !== undefined) return resp.value;
      return null;
    }).filter(v => v !== null && !isNaN(v));
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const bestOpt = q.options.reduce((best, opt) => Math.abs(opt.value - avg) < Math.abs(best.value - avg) ? opt : best);
      feedbackAvgs[q.id] = { avg: avg.toFixed(1), emoji: bestOpt.emoji, label: q.question.replace("?", ""), max: q.options.length >= 5 ? 5 : 4 };
    }
  });

  return (
    <Card style={{ marginBottom: 20, borderLeft: `3px solid #7C3AED40` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: "#7C3AED" }}>Their Voice</div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {[
              onboarding ? "Onboarding" : null,
              checkins.length > 0 ? `${checkins.length} check-in${checkins.length !== 1 ? "s" : ""}` : null,
              feedback.length > 0 ? `${feedback.length} session feedback${feedback.length !== 1 ? "s" : ""}` : null,
            ].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span style={{ fontSize: 14, color: C.muted, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 14 }}>

          {/* Onboarding Assessment */}
          {onboarding && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Onboarding Assessment</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Suggested stage: <StepBadge step={onboarding.suggested_stage} /> · {new Date(onboarding.created_at).toLocaleDateString()}
              </div>
              {onboarding.responses && (() => {
                const contact = onboarding.responses._contact || {};
                const questionResponses = Object.entries(onboarding.responses).filter(([k]) => !k.startsWith("_"));
                return (
                  <div>
                    {(contact.dob || contact.phone || contact.postcode) && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        {contact.dob && <span style={{ fontSize: 11, color: C.muted }}>DOB: {contact.dob}</span>}
                        {contact.phone && <span style={{ fontSize: 11, color: C.muted }}>Phone: {contact.phone}</span>}
                        {contact.postcode && <span style={{ fontSize: 11, color: C.muted }}>Area: {contact.postcode}</span>}
                      </div>
                    )}
                    {questionResponses.length > 0 && (
                      <div style={{ display: "grid", gap: 6 }}>
                        {ONBOARDING_QUESTIONS.map(q => {
                          const resp = onboarding.responses[q.id];
                          if (!resp) return null;
                          return (
                            <div key={q.id} style={{ paddingLeft: 10, borderLeft: `2px solid ${stageColor}30` }}>
                              <div style={{ fontSize: 10, color: C.muted }}>{q.question}</div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{resp.label || resp}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {onboarding.notes && (
                      <div style={{ marginTop: 8, fontSize: 12, color: C.accentDim, fontStyle: "italic" }}>{onboarding.notes}</div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Check-In Questionnaires */}
          {checkins.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Check-In History</div>
              {checkins.map((ci, idx) => (
                <div key={ci.id} style={{ marginBottom: 12, padding: "10px 14px", background: idx === 0 ? "#F5F3FF" : C.surfaceAlt, borderRadius: 10, border: `1px solid ${idx === 0 ? "#C4B5FD40" : C.border}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                    {new Date(ci.completed_at).toLocaleDateString()} · Stage: {ci.stage}
                    {idx === 0 && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: "#7C3AED", background: "#7C3AED15", padding: "2px 6px", borderRadius: 100 }}>Latest</span>}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {(ci.questions || []).map(q => {
                      const answer = ci.responses?.[q.id];
                      if (answer === undefined || answer === null) return null;
                      let displayAnswer = answer;
                      if (q.type === "emoji") {
                        const opt = (q.options || []).find(o => o.value === answer);
                        displayAnswer = opt ? `${opt.emoji} ${opt.label}` : answer;
                      } else if (q.type === "scale") {
                        displayAnswer = `${answer}/4`;
                      }
                      return (
                        <div key={q.id} style={{ paddingLeft: 10, borderLeft: "2px solid #7C3AED30" }}>
                          <div style={{ fontSize: 10, color: C.muted }}>{q.question}</div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{displayAnswer}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Session Feedback */}
          {feedback.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Session Feedback ({feedback.length})</div>
              {/* Emoji averages */}
              {Object.keys(feedbackAvgs).length > 0 && (
                <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                  {Object.entries(feedbackAvgs).map(([field, data]) => (
                    <div key={field} style={{ textAlign: "center", flex: 1, minWidth: 60 }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{data.emoji}</div>
                      <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.3 }}>{data.label}</div>
                      <div style={{ fontSize: 10, color: "#7C3AED", fontWeight: 700, marginTop: 2 }}>{data.avg}/{data.max} avg</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Individual feedback entries */}
              {feedback.slice(0, 5).map((fb, idx) => {
                const r = fb.responses || {};
                const emojiEntries = YP_FEEDBACK_QUESTIONS.filter(q => q.type === "emoji").map(q => {
                  const resp = r[q.id];
                  if (!resp) return null;
                  const val = typeof resp === "number" ? resp : resp?.value;
                  const opt = q.options.find(o => o.value === val);
                  return opt ? { question: q.question.replace("?", ""), emoji: opt.emoji, label: opt.label } : null;
                }).filter(Boolean);

                return (
                  <div key={fb.id || idx} style={{ marginBottom: 10, padding: "10px 14px", background: idx === 0 ? "#F5F3FF" : C.surfaceAlt, borderRadius: 10, border: `1px solid ${idx === 0 ? "#C4B5FD40" : C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
                      {new Date(fb.created_at).toLocaleDateString()}
                      {idx === 0 && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: "#7C3AED", background: "#7C3AED15", padding: "2px 6px", borderRadius: 100 }}>Latest</span>}
                    </div>
                    {emojiEntries.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {emojiEntries.map((e, i) => (
                          <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#7C3AED10", color: "#6D28D9" }}>
                            {e.emoji} {e.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.yp_takeaway && (
                      <div style={{ paddingLeft: 10, borderLeft: `2px solid ${stageColor}40`, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: C.muted }}>Taking away</div>
                        <div style={{ fontSize: 12, fontStyle: "italic" }}>"{r.yp_takeaway}"</div>
                      </div>
                    )}
                    {r.yp_next && (
                      <div style={{ paddingLeft: 10, borderLeft: `2px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted }}>Next time</div>
                        <div style={{ fontSize: 12, fontStyle: "italic" }}>"{r.yp_next}"</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function OnboardingDataCard({ youngPersonId, name, stageColor }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (youngPersonId && !loaded) {
      db.getOnboardingForYP(youngPersonId).then(d => { setData(d); setLoaded(true); });
    }
  }, [youngPersonId, loaded]);

  if (!data) return null;

  const contact = data.responses?._contact || {};
  const questionResponses = Object.entries(data.responses || {}).filter(([k]) => !k.startsWith("_"));

  return (
    <Card style={{ marginBottom: 20, borderLeft: `3px solid ${stageColor}40` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Onboarding Assessment</div>
          <div style={{ fontSize: 11, color: C.muted }}>Suggested stage: {data.suggested_stage} · {new Date(data.created_at).toLocaleDateString()}</div>
        </div>
        <span style={{ fontSize: 14, color: C.muted, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
          {contact.dob && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>DOB: {contact.dob}</div>}
          {contact.phone && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Phone: {contact.phone}</div>}
          {contact.postcode && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Area: {contact.postcode}</div>}
          {questionResponses.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Questionnaire Responses</div>
              {ONBOARDING_QUESTIONS.map(q => {
                const resp = data.responses?.[q.id];
                if (!resp) return null;
                return (
                  <div key={q.id} style={{ marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${stageColor}30` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{q.question}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{resp.label || resp}</div>
                  </div>
                );
              })}
            </div>
          )}
          {data.notes && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Mentor Notes</div>
              <p style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── YOUNG PERSON PROFILE ────────────────────

function YoungPersonProfile({ name, sessions: passedSessions, onBack, currentUser, onRefresh }) {
  const isAdmin = currentUser?.role === "admin";
  // For mentors, the passed sessions only include their own — we need ALL sessions for this YP
  const [allSessions, setAllSessions] = useState(passedSessions);
  const [loadingAllSessions, setLoadingAllSessions] = useState(!isAdmin);

  // Mentors: fetch all sessions for this YP from the server
  useEffect(() => {
    if (isAdmin) {
      setAllSessions(passedSessions);
      setLoadingAllSessions(false);
      return;
    }
    db.getSessionsForYP(name).then(allYpSessions => {
      setAllSessions(allYpSessions);
      setLoadingAllSessions(false);
    });
  }, [isAdmin, name, passedSessions]);

  // Apply access filtering — directors see everything, mentors see redacted versions
  const filteredSessions = isAdmin ? allSessions : allSessions.map(s => db.redactSessionForMentor(s, currentUser.id));
  const sorted = [...filteredSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  const musicSessions = sorted.filter(s => (s.partner_org || "") !== "Set Pace");
  const latestMusic = musicSessions[0];
  const [planOpen, setPlanOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [ypFeedback, setYpFeedback] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [mentorSummaries, setMentorSummaries] = useState({});
  const stage = getLatestStage(allSessions); // Use unfiltered for accurate stage
  const stageColor = STEP_COLORS[stage];
  const avgs = latest?.step_averages || {};

  // Load YP feedback
  useEffect(() => {
    if (latest?.young_person_id) {
      db.getYPFeedbackByYoungPerson(latest.young_person_id).then(setYpFeedback);
    }
  }, [latest?.young_person_id]);

  // For mentors: load AI summaries for other mentors' sessions that need them
  useEffect(() => {
    if (isAdmin || !sorted.length) return;
    const needsSummary = sorted.filter(s => s._redacted && s.notes === "Summary not yet available — ask Nathan or Toni for context.");
    if (!needsSummary.length) return;

    setLoadingSummaries(true);
    fetch("/api/mentor-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youngPersonName: name,
        requestingMentorName: currentUser.name,
        requestingMentorId: currentUser.id,
      }),
    })
      .then(r => r.json())
      .then(data => {
        const map = {};
        (data.summaries || []).forEach(s => { map[s.sessionId] = s; });
        setMentorSummaries(map);
      })
      .catch(() => {})
      .finally(() => setLoadingSummaries(false));
  }, [isAdmin, name, currentUser?.id, currentUser?.name, sorted.length]);

  const handleDelete = async (sessionId) => {
    if (!confirm("Delete this session? You can restore it from Settings within 30 days.")) return;
    setDeleting(sessionId);
    await db.deleteSession(sessionId);
    if (onRefresh) await onRefresh();
    setDeleting(null);
  };

  // Map feedback session IDs to session dates
  const feedbackBySession = {};
  ypFeedback.forEach(fb => { feedbackBySession[fb.session_id] = fb; });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {planOpen && <SessionPlanModal yp={name} stage={stage} scores={avgs} recentNotes={latestMusic?.notes || ""} onClose={() => setPlanOpen(false)} />}
      {cardsOpen && <AccessCardsModal onClose={() => setCardsOpen(false)} youngPerson={name} stage={stage} />}
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back</button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: stageColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: stageColor }}>{name[0]}</div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <StepBadge step={stage} />
              <span style={{ fontSize: 12, color: C.muted }}>{allSessions.length} session{allSessions.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setCardsOpen(true)} style={{
            padding: "9px 18px", borderRadius: 100, border: `1.5px solid #7C3AED`, background: "#7C3AED10",
            color: "#7C3AED", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Cards</button>
          <button onClick={() => setPlanOpen(true)} style={{
            padding: "9px 18px", borderRadius: 100, border: `1.5px solid ${stageColor}`, background: stageColor + "10",
            color: stageColor, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Prepare next session →</button>
        </div>
      </div>

      {/* AI Summary */}
      <AISummaryCard name={name} sessions={filteredSessions} stage={stage} avgs={avgs} currentUser={currentUser} />

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, marginTop: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pathway Progress</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {STEPS.map(s => {
            const avg = avgs[s]; const color = STEP_COLORS[s];
            return (
              <div key={s}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{STEP_SUBTITLES[s]}</span>
                  </div>
                  <span style={{ fontSize: 13, color: avg ? color : C.muted, fontWeight: 700 }}>{avg ? `${avg}/5` : "—"}</span>
                </div>
                <ScoreBar value={avg ? parseFloat(avg) : 0} color={color} />
              </div>
            );
          })}
        </div>
      </Card>


      {/* Their Voice — unified YP perspective section */}
      <TheirVoice youngPersonId={latest?.young_person_id} name={name} stageColor={stageColor} stage={stage} />

      {/* Session History */}
      {!isAdmin && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#F5F3FF", borderRadius: 10, border: "1px solid #C4B5FD40" }}>
          <div style={{ fontSize: 12, color: "#6D28D9", fontWeight: 600, marginBottom: 4 }}>Mentor View</div>
          <div style={{ fontSize: 11, color: "#7C3AED", lineHeight: 1.5 }}>
            You can see your own session notes in full. Other mentors' sessions show AI-generated summaries to protect anything shared in confidence. For full details, speak to Nathan or Toni.
          </div>
        </div>
      )}
      {loadingSummaries && (
        <div style={{ textAlign: "center", padding: "12px 0", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>Generating session summaries...</div>
        </div>
      )}
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Session History</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {sorted.map((s, i) => {
          const isExpanded = expandedSession === s.id;
          const isRedacted = !!s._redacted;
          const mentorSum = mentorSummaries[s.id];
          // For redacted sessions, prefer the freshly loaded AI summary over the placeholder
          const displayNotes = isRedacted
            ? (mentorSum?.summary || s.mentor_summary || s.notes)
            : s.notes;
          return (
          <Card key={i} onClick={() => setExpandedSession(isExpanded ? null : s.id)} style={{ cursor: "pointer", ...(isRedacted ? { borderLeft: "3px solid #C4B5FD" } : {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.date}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>with {s._original_mentor || s.mentor_name} · {s.session_length}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {isRedacted && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, background: "#7C3AED15", color: "#7C3AED", fontFamily: "'DM Mono', monospace" }}>Summary</span>}
                {s.is_group && <GroupBadge />}
                <StepBadge step={s.focus_step} />
                <span style={{ fontSize: 14, color: C.muted, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
              </div>
            </div>
            {s.quick && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {[{ label: "Emotional", val: s.quick.emotionalState || s.quick.regulation }, { label: "Engagement", val: s.quick.engagement }, { label: "Confidence", val: s.quick.confidence }].map(({ label, val }) => val ? (
                  <span key={label} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: C.accent + "20", color: C.accent, fontWeight: 600 }}>{label}: {val}/4</span>
                ) : null)}
              </div>
            )}
            {!isExpanded && displayNotes && (() => {
              if (isRedacted) {
                // Show AI summary directly for redacted sessions
                return <p style={{ fontSize: 13, color: "#7C3AED", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{displayNotes.length > 200 ? displayNotes.slice(0, 200) + "..." : displayNotes}</p>;
              }
              const clean = displayNotes.replace(/\r\n/g, "\n").split("\n").filter(l => {
                const t = l.trim();
                return !(/^(photo|video):/i.test(t)) && !t.startsWith("Title:") && !(t.startsWith("URL:") && t.includes("http")) && t !== "--- Media ---";
              }).join("\n").trim();
              return clean ? <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{clean.length > 200 ? clean.slice(0, 200) + "..." : clean}</p> : null;
            })()}

            {isExpanded && (
              <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                {/* REDACTED SESSION VIEW — mentor seeing another mentor's session */}
                {isRedacted ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Session Summary (AI Generated)</div>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>{displayNotes}</p>
                    </div>
                    {(mentorSum?.hasSafeguarding || s.safeguarding) && (
                      <div style={{ marginBottom: 16, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Safeguarding</div>
                        <p style={{ fontSize: 12, color: "#B91C1C", margin: 0 }}>There are active safeguarding notes for this session — check with Nathan or Toni before your next session with {name}.</p>
                      </div>
                    )}
                    {s.step_averages && Object.keys(s.step_averages).some(k => s.step_averages[k]) && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pathway Scores</div>
                        <div style={{ display: "flex", gap: 12 }}>
                          {STEPS.map(st => {
                            const val = s.step_averages[st];
                            return val ? (
                              <div key={st} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: STEP_COLORS[st] }}>{val}</div>
                                <div style={{ fontSize: 9, color: C.muted }}>{st}</div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <>
                {/* FULL SESSION VIEW — admin or mentor's own session */}
                {s.notes?.includes("--- Check-in ---") && (() => {
                  const checkInBlock = s.notes.split("--- Check-in ---\n")[1]?.split("\n\n")[0] || "";
                  // Handle both · and , separators
                  const items = checkInBlock.split(/\s*[·,]\s*/).filter(Boolean);
                  const emojiMap = { "Low energy": "😴", "Neutral": "😐", "Alright": "🙂", "Buzzing": "⚡", "Stressed": "😤", "Down": "😔", "Calm": "😶", "Good": "😊", "Not really": "🤷", "Maybe": "🤔", "Yeah": "👍", "Let's go": "🔥" };
                  return (
                    <div style={{ marginBottom: 16, padding: "12px 14px", background: "#F0F7FF", borderRadius: 10, borderLeft: "3px solid #2563EB" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>How They Arrived</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {items.map((item, idx) => {
                          const colonIdx = item.indexOf(": ");
                          const label = colonIdx > -1 ? item.slice(0, colonIdx).trim() : item;
                          const val = colonIdx > -1 ? item.slice(colonIdx + 2).trim() : "";
                          // Extract the text label from format like "Buzzing (4/4)"
                          const textLabel = val.replace(/\s*\(\d\/\d\)\s*$/, "");
                          const emoji = emojiMap[textLabel] || "";
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#2563EB10", border: "1px solid #2563EB20" }}>
                              {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
                              <div>
                                <div style={{ fontSize: 10, color: "#2563EB", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                                <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 700 }}>{val}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {s.notes && (() => {
                  // Parse media and songs from notes, and filter them out of displayed text
                  const rawLines = s.notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
                  const mediaItems = [];
                  const songItems = [];
                  const mediaLineIndices = new Set();
                  for (let i = 0; i < rawLines.length; i++) {
                    const line = rawLines[i].trim();
                    // Photos/videos
                    if (/^(photo|video):/i.test(line)) {
                      const isVideo = line.toLowerCase().startsWith("video");
                      let url = line.replace(/^(photo|video):\s*/i, "").trim();
                      mediaLineIndices.add(i);
                      if (!url.startsWith("http") && i + 1 < rawLines.length) {
                        url = rawLines[i + 1].trim();
                        if (url.startsWith("http")) { mediaLineIndices.add(i + 1); i++; }
                      }
                      if (url.startsWith("http")) mediaItems.push({ url, isVideo });
                    }
                    // Songs: "Title: X" followed by "URL: X"
                    if (line.startsWith("Title:") && i + 1 < rawLines.length) {
                      const title = line.replace("Title:", "").trim();
                      const next = rawLines[i + 1].trim();
                      if (next.startsWith("URL:")) {
                        const url = next.replace("URL:", "").trim();
                        if (url.startsWith("http")) {
                          songItems.push({ title, url });
                          mediaLineIndices.add(i);
                          mediaLineIndices.add(i + 1);
                          i++; // skip URL line
                        }
                      }
                    }
                  }
                  // Build clean notes text (without media/song lines AND without check-in block)
                  let cleanNotes = rawLines.filter((_, idx) => !mediaLineIndices.has(idx)).join("\n").trim();
                  // Strip the "--- Check-in ---" block since it's shown as pills above
                  cleanNotes = cleanNotes.replace(/---\s*Check-in\s*---\n[^\n]*(\n[^\n]*)*?\n\n?/i, "").trim();
                  // Also strip any remaining "Energy: ... Mood: ... Ready: ..." lines
                  cleanNotes = cleanNotes.replace(/^Energy:.*?Ready:.*$/im, "").trim();
                  return (
                    <>
                      {cleanNotes && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Session Notes</div>
                          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{cleanNotes}</p>
                        </div>
                      )}
                      {(songItems.length > 0 || mediaItems.length > 0) && (
                        <div style={{ marginBottom: 16 }}>
                          {songItems.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🎵 Tracks</div>
                              {songItems.map((song, mi) => (
                                <div key={mi} style={{ padding: "10px 12px", background: C.surfaceAlt, borderRadius: 10, marginBottom: 6, border: `1px solid ${C.border}` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{song.title || `Track ${mi + 1}`}</div>
                                    <a href={song.url} download={`${s.young_person_name || "Track"} - ${song.title || "Untitled"}.mp3`} target="_blank" rel="noopener" style={{ fontSize: 10, color: C.accent, textDecoration: "none", fontWeight: 600 }}>Download ↓</a>
                                  </div>
                                  <audio controls src={song.url} preload="metadata" style={{ width: "100%", height: 40, borderRadius: 8 }} />
                                </div>
                              ))}
                            </div>
                          )}
                          {mediaItems.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>📸 Media</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                                {mediaItems.map((m, mi) => (
                                  <div key={mi} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surfaceAlt }}>
                                    {m.isVideo ? (
                                      <video controls src={m.url} preload="metadata" style={{ width: "100%", display: "block", borderRadius: 10 }} />
                                    ) : (
                                      <a href={m.url} target="_blank" rel="noopener" style={{ display: "block" }}>
                                        <img src={m.url} alt="" loading="lazy" onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", cursor: "pointer" }} />
                                      </a>
                                    )}
                                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 8px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.5))", display: "flex", justifyContent: "flex-end" }}>
                                      <a href={m.url} download target="_blank" rel="noopener" style={{ fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.4)", padding: "3px 8px", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>↓</a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                {s.mentor_reflection && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Mentor Reflection</div>
                    <p style={{ fontSize: 13, color: C.accentDim, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>{s.mentor_reflection}</p>
                  </div>
                )}
                {isAdmin && s.sensitive_notes?.trim() && (
                  <div style={{ marginBottom: 16, padding: "10px 12px", background: "#F5F3FF", borderRadius: 8, borderLeft: "3px solid #7C3AED" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>🔒 Sensitive Notes (Director Only)</div>
                    <p style={{ fontSize: 12, color: "#6D28D9", margin: 0, lineHeight: 1.6 }}>{s.sensitive_notes}</p>
                  </div>
                )}
                {s.safeguarding?.trim() && (
                  <div style={{ marginBottom: 16, padding: "10px 12px", background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #DC2626" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Safeguarding</div>
                    <p style={{ fontSize: 12, color: "#B91C1C", margin: 0 }}>{s.safeguarding}</p>
                  </div>
                )}
                {s.step_averages && Object.keys(s.step_averages).some(k => s.step_averages[k]) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pathway Scores</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {STEPS.map(st => {
                        const val = s.step_averages[st];
                        return val ? (
                          <div key={st} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: STEP_COLORS[st] }}>{val}</div>
                            <div style={{ fontSize: 9, color: C.muted }}>{st}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                </>
                )}
              </div>
            )}
            {/* YP Feedback for this session */}
            {feedbackBySession[s.id] && (() => {
              const fb = feedbackBySession[s.id].responses;
              const emojiQuestions = YP_FEEDBACK_QUESTIONS.filter(q => q.type === "emoji");
              return (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Young Person Feedback</div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                    {emojiQuestions.map(q => {
                      const raw = fb[q.id];
                      if (!raw) return null;
                      const val = typeof raw === "number" ? raw : raw?.value;
                      const opt = val !== undefined ? q.options.find(o => o.value === val) : null;
                      if (!opt) return null;
                      return (
                        <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8 }}>
                          <div style={{ fontSize: 22 }}>{opt.emoji}</div>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.3 }}>{q.question}</div>
                            <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{opt.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {fb.yp_takeaway && (
                    <div style={{ padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8, borderLeft: `3px solid ${stageColor}40`, marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>One thing you're taking away from today?</div>
                      <div style={{ fontSize: 12, color: C.accent, fontStyle: "italic" }}>"{fb.yp_takeaway}"</div>
                    </div>
                  )}
                  {fb.yp_next && (
                    <div style={{ padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8, borderLeft: `3px solid ${C.border}`, marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>Anything you want to do differently next time?</div>
                      <div style={{ fontSize: 12, color: C.accentDim, fontStyle: "italic" }}>"{fb.yp_next}"</div>
                    </div>
                  )}
                </div>
              );
            })()}
            {isAdmin && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: 11, color: deleting === s.id ? C.light : C.danger,
                  cursor: deleting === s.id ? "default" : "pointer",
                  fontWeight: 600, opacity: 0.7,
                }}>{deleting === s.id ? "Deleting..." : "Delete session"}</button>
              </div>
            )}
          </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────

function AdminPanel({ mentors, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("mentor");
  const [deleting, setDeleting] = useState(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    await db.createMentor({ name: newName.trim(), pin: randomPin, role: newRole });
    alert(`${newName.trim()} added with PIN: ${randomPin}\n\nMake sure they write this down — you can change it later in Settings.`);
    setNewName(""); setShowAdd(false); onRefresh();
  };

  const handleStartEdit = (mentor) => {
    setEditing(mentor.id);
    setEditEmail(mentor.email || "");
    setSaving(false);
  };

  const handleDoneEdit = async (mentor) => {
    setSaving(true);
    // Save email if changed
    if (editEmail !== (mentor.email || "")) {
      await db.updateMentor(mentor.id, { email: editEmail });
    }
    // Brief visual confirmation
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    setEditing(null);
    onRefresh();
  };

  const handleUpdatePin = async (id, pin) => {
    await db.updateMentor(id, { pin });
    onRefresh();
  };

  const handleToggleRole = async (id, currentRole) => {
    await db.updateMentor(id, { role: currentRole === "admin" ? "mentor" : "admin" });
    onRefresh();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name} from the team? This can't be undone.`)) return;
    setDeleting(id);
    const { error } = await db.deleteMentor(id);
    if (error) {
      alert(error.message || "Failed to delete mentor.");
    }
    setDeleting(null);
    onRefresh();
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Team Management</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Manage mentors, set PINs & roles</p>
      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        {mentors.map(u => (
          <Card key={u.id} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editing === u.id ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: (u.role === "admin" ? C.accent : "#047857") + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: u.role === "admin" ? C.accent : "#047857" }}>{u.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <RoleBadge role={u.role} />
                <button disabled={saving} onClick={() => editing === u.id ? handleDoneEdit(u) : handleStartEdit(u)} style={{ padding: "5px 12px", borderRadius: 100, border: `1px solid ${editing === u.id && saving ? "#059669" : C.border}`, background: editing === u.id && saving ? "#05966915" : "transparent", color: editing === u.id && saving ? "#059669" : C.muted, fontSize: 11, cursor: saving ? "wait" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>{editing === u.id ? (saving ? "Saving ✓" : "Done") : "Edit"}</button>
              </div>
            </div>
            {editing === u.id && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>PIN</label>
                    <input defaultValue={u.pin} onBlur={e => handleUpdatePin(u.id, e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", width: 120 }} />
                  </div>
                  <button onClick={() => handleToggleRole(u.id, u.role)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, cursor: "pointer" }}>
                    {u.role === "admin" ? "Switch to Mentor" : "Switch to Admin"}
                  </button>
                  <button onClick={() => handleDelete(u.id, u.name)} disabled={deleting === u.id} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", fontSize: 12, cursor: "pointer", color: "#DC2626", fontWeight: 600, opacity: deleting === u.id ? 0.5 : 1 }}>
                    {deleting === u.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Email (for session notifications)</label>
                  <div style={{ position: "relative" }}>
                    <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="mentor@example.com" style={{ background: C.surfaceAlt, border: `1px solid ${editEmail && editEmail !== (u.email || "") ? "#D97706" : C.border}`, borderRadius: 6, padding: "8px 10px", paddingRight: 36, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" }} />
                    {editEmail && editEmail === (u.email || "") && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#059669", fontSize: 14 }}>✓</span>
                    )}
                    {editEmail && editEmail !== (u.email || "") && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#D97706", fontSize: 10, fontWeight: 600 }}>unsaved</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", width: "100%", fontWeight: 600 }}>+ Add Mentor</button>
      ) : (
        <Card style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
              <option value="mentor">Mentor</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleAdd} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── FUNDER EXPORT ───────────────────────────

function FunderExport({ sessions, youngPeople }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [org, setOrg] = useState("All");

  const filtered = sessions.filter(s => {
    if (dateFrom && s.date < dateFrom) return false;
    if (dateTo && s.date > dateTo) return false;
    if (org !== "All" && (s.partner_org || s.partnerOrg) !== org) return false;
    return true;
  });

  const uniqueYP = [...new Set(filtered.map(s => s.young_person_name))].length;
  const avgEng = filtered.length ? (filtered.reduce((a, s) => a + (s.quick?.engagement || 0), 0) / filtered.length).toFixed(1) : "—";
  const sgCount = filtered.filter(s => s.safeguarding?.trim()).length;

  const sessionsByYP = {};
  filtered.forEach(s => {
    const name = s.young_person_name;
    if (!sessionsByYP[name]) sessionsByYP[name] = [];
    sessionsByYP[name].push(s);
  });

  const stageDistribution = {};
  Object.entries(sessionsByYP).forEach(([name, sess]) => {
    const stage = getLatestStage(sess);
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Funder Export</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Filter, review, and export data for reporting</p>
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Organisation</label>
            <select value={org} onChange={e => setOrg(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
              <option value="All">All</option>
              {[...new Set(sessions.map(s => s.partner_org).filter(Boolean))].sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Sessions", value: filtered.length },
          { label: "Young People", value: uniqueYP },
          { label: "Avg Engagement", value: avgEng + "/5" },
          { label: "Group Sessions", value: filtered.filter(s => s.is_group).length },
          { label: "Safeguarding Flags", value: sgCount },
          { label: "Mentors Active", value: [...new Set(filtered.map(s => s.mentor_name))].length },
        ].map(({ label, value }) => (
          <Card key={label} style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.accent, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Stage Distribution</div>
        <div style={{ display: "flex", gap: 12 }}>
          {STEPS.map(s => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: stageDistribution[s] ? STEP_COLORS[s] : C.light }}>{stageDistribution[s] || 0}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => exportSessionsCSV(filtered, `silkfutures-full-${new Date().toISOString().split("T")[0]}.csv`)} style={{
          flex: 1, padding: "14px 20px", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>Export Full Data (CSV)</button>
        <button onClick={() => exportSummaryCSV(youngPeople, sessionsByYP, `silkfutures-summary-${new Date().toISOString().split("T")[0]}.csv`)} style={{
          flex: 1, padding: "14px 20px", borderRadius: 10, border: `1.5px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>Export Summary (CSV)</button>
      </div>
    </div>
  );
}

// ─── CHECK-IN FLOW (replaces Onboarding) ──────────────────

function CheckInFlow({ youngPeople, currentUser, sessions, onComplete, onStartCheckin }) {
  const [mode, setMode] = useState(null); // null = choose, "onboard" or "checkin"
  const [selectedYP, setSelectedYP] = useState("");
  const [newYPName, setNewYPName] = useState("");
  const [ciSearch, setCiSearch] = useState("");
  const [ciDropdownOpen, setCiDropdownOpen] = useState(false);
  const selectedYPData = youngPeople.find(y => y.id === selectedYP);

  // Check if selected YP has been onboarded
  const [hasOnboarding, setHasOnboarding] = useState(null);
  useEffect(() => {
    if (selectedYP && selectedYP !== "__new__") {
      db.getOnboardingForYP(selectedYP).then(d => setHasOnboarding(!!d));
    } else {
      setHasOnboarding(null);
    }
  }, [selectedYP]);

  // Signal to parent when a checkin is actively in progress
  useEffect(() => {
    if (mode && onStartCheckin) onStartCheckin();
  }, [mode]);

  const handleAddNewYP = async () => {
    if (!newYPName.trim()) return;
    const { data } = await db.createYoungPerson(newYPName.trim());
    if (data) {
      setSelectedYP(data.id);
      setNewYPName("");
      setMode("onboard"); // New person — go straight to onboarding
    }
  };

  if (mode === "onboard") {
    // Pass the pre-selected YP so OnboardingFlow doesn't ask to select/create again
    const preselectedYPData = youngPeople.find(y => y.id === selectedYP);
    return <OnboardingFlow youngPeople={youngPeople} currentUser={currentUser} onComplete={onComplete} preselectedYP={preselectedYPData || (selectedYP ? { id: selectedYP, name: selectedYPData?.name || newYPName } : null)} />;
  }

  if (mode === "checkin" && selectedYPData) {
    const ypSessions = sessions.filter(s => s.young_person_id === selectedYP || s.young_person_name === selectedYPData.name);
    const stage = getLatestStage(ypSessions);
    return <AICheckinFlow youngPerson={selectedYPData} stage={stage} currentUser={currentUser} onComplete={onComplete} />;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Check-In</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        Onboard a new young person or run an AI-generated check-in with an existing one.
      </p>

      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Young person</label>
        <div style={{ position: "relative" }}>
          <input
            value={selectedYPData ? selectedYPData.name : ciSearch}
            onChange={e => { setCiSearch(e.target.value); setSelectedYP(""); setCiDropdownOpen(true); setMode(null); }}
            onFocus={() => setCiDropdownOpen(true)}
            placeholder="Type to search or add new..."
            style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          {ciDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
              {youngPeople
                .filter(yp => !ciSearch || yp.name.toLowerCase().includes(ciSearch.toLowerCase()))
                .map(yp => (
                  <div key={yp.id} onClick={() => { setSelectedYP(yp.id); setCiSearch(""); setCiDropdownOpen(false); setMode(null); }}
                    style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: `1px solid ${C.border}08` }}
                    onMouseEnter={e => e.target.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.target.style.background = "transparent"}
                  >{yp.name}</div>
                ))}
              {ciSearch.trim() && !youngPeople.some(yp => yp.name.toLowerCase() === ciSearch.toLowerCase()) && (
                <div onClick={async () => {
                  const { data } = await db.createYoungPerson(ciSearch.trim());
                  if (data) { setSelectedYP(data.id); setCiSearch(""); setCiDropdownOpen(false); setMode("onboard"); }
                }}
                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: C.accent, fontWeight: 600, borderTop: `1px solid ${C.border}` }}
                  onMouseEnter={e => e.target.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.target.style.background = "transparent"}
                >+ Add "{ciSearch.trim()}" as new person</div>
              )}
            </div>
          )}
          {ciDropdownOpen && <div onClick={() => setCiDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
        </div>
        {selectedYPData && <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>✓ {selectedYPData.name}</div>}
      </Card>

      {selectedYP && hasOnboarding === false && (
        <Card onClick={() => setMode("onboard")} style={{ cursor: "pointer", borderLeft: `3px solid ${STEP_COLORS.Reset}`, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Run Onboarding Assessment</div>
              <div style={{ fontSize: 12, color: C.muted }}>{selectedYPData?.name} hasn't been onboarded yet — start here</div>
            </div>
            <span style={{ fontSize: 18 }}>→</span>
          </div>
        </Card>
      )}

      {selectedYP && hasOnboarding !== null && (
        <Card onClick={() => setMode("checkin")} style={{ cursor: "pointer", borderLeft: "3px solid #7C3AED", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>AI Check-In Questionnaire</div>
              <div style={{ fontSize: 12, color: C.muted }}>Generate questions tailored to where {selectedYPData?.name} is at right now</div>
            </div>
            <span style={{ fontSize: 18, color: "#7C3AED" }}>✦</span>
          </div>
        </Card>
      )}

      {selectedYP && hasOnboarding && (
        <Card onClick={() => setMode("onboard")} style={{ cursor: "pointer", marginBottom: 12, opacity: 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Re-run Onboarding Assessment</div>
              <div style={{ fontSize: 11, color: C.muted }}>Already completed — run again if needed</div>
            </div>
            <span style={{ fontSize: 14 }}>→</span>
          </div>
        </Card>
      )}

      {!selectedYP && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>
          Select a young person above to get started
        </div>
      )}
    </div>
  );
}

// ─── AI CHECK-IN QUESTIONNAIRE ──────────────

function AICheckinFlow({ youngPerson, stage, currentUser, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [checkinId, setCheckinId] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const stageColor = STEP_COLORS[stage] || C.accent;

  // Generate questions on mount
  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch("/api/checkin-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youngPersonId: youngPerson.id,
            youngPersonName: youngPerson.name,
            stage,
            mentorId: currentUser.id,
            mentorName: currentUser.name,
          }),
        });
        const data = await res.json();
        if (data.questions?.length) {
          setQuestions(data.questions);
          if (data.id) setCheckinId(data.id);
        } else {
          setError("Couldn't generate questions. Try again.");
        }
      } catch {
        setError("Failed to connect. Check your internet.");
      }
      setLoading(false);
    };
    generate();
  }, [youngPerson.id, youngPerson.name, stage, currentUser.id, currentUser.name]);

  const handleSubmit = async () => {
    setSubmitting(true);
    if (checkinId) {
      await db.saveCheckinResponses(checkinId, responses);
      // Sync to Google Sheets
      fetch("/api/sheets-sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataType: "checkin",
          date: new Date().toISOString().split("T")[0],
          mentor: currentUser.name,
          youngPerson: youngPerson.name,
          stage,
          questions,
          responses,
        }),
      }).catch(() => {});
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(() => onComplete(), 2000);
  };

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#7C3AED15", border: "1.5px solid #7C3AED40", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22, color: "#7C3AED" }}>✓</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Check-in complete</h2>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Responses saved to {youngPerson.name}'s profile. Returning...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #C4B5FD", borderTopColor: "#7C3AED", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Generating check-in for {youngPerson.name}</div>
        <div style={{ fontSize: 12, color: C.muted }}>Tailoring questions to their journey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 14, color: C.danger, marginBottom: 12 }}>{error}</div>
        <button onClick={onComplete} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Back</button>
      </div>
    );
  }

  const q = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const hasAnswer = responses[q?.id] !== undefined && responses[q?.id] !== "";

  const renderQuestion = () => {
    if (!q) return null;

    if (q.type === "emoji") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {(q.options || []).map((opt, i) => {
            const isSel = responses[q.id] === opt.value;
            return (
              <Card key={i} onClick={() => setResponses(r => ({ ...r, [q.id]: opt.value }))} style={{
                padding: "16px 14px", cursor: "pointer", textAlign: "center",
                border: `2px solid ${isSel ? "#7C3AED" : C.border}`,
                background: isSel ? "#7C3AED08" : C.surface,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? "#7C3AED" : C.text }}>{opt.label}</div>
              </Card>
            );
          })}
        </div>
      );
    }

    if (q.type === "scale") {
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{q.minLabel || "Low"}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{q.maxLabel || "High"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map(v => {
              const isSel = responses[q.id] === v;
              return (
                <button key={v} onClick={() => setResponses(r => ({ ...r, [q.id]: v }))} style={{
                  flex: 1, height: 48, borderRadius: 10,
                  border: `2px solid ${isSel ? "#7C3AED" : C.border}`,
                  background: isSel ? "#7C3AED" : "transparent",
                  color: isSel ? "#fff" : C.text,
                  fontSize: 18, fontWeight: 700, cursor: "pointer",
                }}>{v}</button>
              );
            })}
          </div>
        </div>
      );
    }

    if (q.type === "choice") {
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {(q.options || []).map((opt, i) => {
            const optVal = typeof opt === "string" ? opt : opt.label;
            const isSel = responses[q.id] === optVal;
            return (
              <Card key={i} onClick={() => setResponses(r => ({ ...r, [q.id]: optVal }))} style={{
                padding: "14px 18px", cursor: "pointer",
                border: `2px solid ${isSel ? "#7C3AED" : C.border}`,
                background: isSel ? "#7C3AED08" : C.surface,
              }}>
                <div style={{ fontSize: 14, fontWeight: isSel ? 700 : 500, color: isSel ? "#7C3AED" : C.text }}>{optVal}</div>
              </Card>
            );
          })}
        </div>
      );
    }

    // text type
    return (
      <textarea
        value={responses[q.id] || ""}
        onChange={e => setResponses(r => ({ ...r, [q.id]: e.target.value }))}
        placeholder={q.placeholder || "Whatever comes to mind..."}
        rows={4}
        style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 15, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
      />
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Question {currentQ + 1} of {questions.length}</span>
          <span style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>{youngPerson.name}'s check-in</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {questions.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= currentQ ? "#7C3AED" : C.border }} />)}
        </div>
      </div>

      {/* Hand-to-YP notice */}
      {currentQ === 0 && (
        <div style={{ marginBottom: 20, padding: "10px 14px", background: "#F5F3FF", borderRadius: 10, border: "1px solid #C4B5FD40" }}>
          <div style={{ fontSize: 12, color: "#6D28D9", fontWeight: 600 }}>Hand the device to {youngPerson.name}</div>
          <div style={{ fontSize: 11, color: "#7C3AED" }}>These questions are for them to answer directly.</div>
        </div>
      )}

      {/* Question */}
      <div style={{ minHeight: 300 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, lineHeight: 1.4 }}>{q?.question}</h2>
        {renderQuestion()}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "space-between" }}>
        <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0} style={{
          padding: "12px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
          color: currentQ === 0 ? C.border : C.muted, fontSize: 14, cursor: currentQ === 0 ? "default" : "pointer",
        }}>Back</button>
        {!isLast ? (
          <button onClick={() => hasAnswer && setCurrentQ(c => c + 1)} style={{
            padding: "12px 32px", borderRadius: 8, border: "none",
            background: hasAnswer ? "#7C3AED" : C.border, color: hasAnswer ? "#fff" : C.muted,
            fontSize: 14, fontWeight: 700, cursor: hasAnswer ? "pointer" : "default",
          }}>Next →</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !hasAnswer} style={{
            padding: "12px 32px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting || !hasAnswer ? 0.6 : 1,
          }}>{submitting ? "Saving..." : "Complete Check-In ✓"}</button>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING FLOW (original, now called from CheckInFlow) ──

function OnboardingFlow({ youngPeople, currentUser, onComplete, preselectedYP }) {
  const [step, setStep] = useState(0); // Always start at intro to allow updating YP details
  const [ypName, setYpName] = useState(preselectedYP?.name || "");
  const [ypId, setYpId] = useState(preselectedYP?.id || "");
  const [selectedExisting, setSelectedExisting] = useState(preselectedYP?.id || "");
  const [ypPhone, setYpPhone] = useState(preselectedYP?.phone || "");
  const [ypDob, setYpDob] = useState(preselectedYP?.dob || "");
  const [ypEmail, setYpEmail] = useState(preselectedYP?.email || "");
  const [ypPostcode, setYpPostcode] = useState(preselectedYP?.postcode || "");
  const [parentName, setParentName] = useState(preselectedYP?.parent_name || "");
  const [parentPhone, setParentPhone] = useState(preselectedYP?.parent_phone || "");
  const [parentEmail, setParentEmail] = useState(preselectedYP?.parent_email || "");
  const [parentRelationship, setParentRelationship] = useState(preselectedYP?.parent_relationship || "");
  const [responses, setResponses] = useState({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const questions = ONBOARDING_QUESTIONS;
  const totalSteps = questions.length + 2; // intro + questions + summary

  const computeSuggestedStage = () => {
    const stageScores = { Reset: [], Reframe: [], Rebuild: [], Release: [], Rise: [] };
    Object.values(responses).forEach(r => {
      if (r.scores) {
        Object.entries(r.scores).forEach(([stage, score]) => {
          stageScores[stage].push(score);
        });
      }
    });
    const avgs = {};
    STEPS.forEach(s => {
      const vals = stageScores[s];
      avgs[s] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    // Suggested stage = highest stage where avg >= 2.5
    let suggested = "Reset";
    for (let i = STEPS.length - 1; i >= 0; i--) {
      if (avgs[STEPS[i]] >= 2.5) { suggested = STEPS[i]; break; }
    }
    return { suggested, avgs };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let personId = ypId;
    if (!personId && ypName.trim()) {
      const { data } = await db.createYoungPerson(ypName.trim());
      if (data) personId = data.id;
    }
    if (personId) {
      // Update YP details (phone, DOB, email, postcode, parent info) if provided
      const ypUpdates = {};
      if (ypPhone.trim()) ypUpdates.phone = ypPhone.trim();
      if (ypDob) ypUpdates.dob = ypDob;
      if (ypEmail.trim()) ypUpdates.email = ypEmail.trim();
      if (ypPostcode.trim()) ypUpdates.postcode = ypPostcode.trim();
      if (parentName.trim()) ypUpdates.parent_name = parentName.trim();
      if (parentPhone.trim()) ypUpdates.parent_phone = parentPhone.trim();
      if (parentEmail.trim()) ypUpdates.parent_email = parentEmail.trim();
      if (parentRelationship) ypUpdates.parent_relationship = parentRelationship;
      if (Object.keys(ypUpdates).length > 0) {
        await db.updateYoungPerson(personId, ypUpdates);
      }
      
      const { suggested } = computeSuggestedStage();
      await db.createOnboardingAssessment({
        youngPersonId: personId, mentorId: currentUser.id,
        responses: { 
          ...responses, 
          _contact: { phone: ypPhone, dob: ypDob, email: ypEmail, postcode: ypPostcode },
          _parent: { name: parentName, phone: parentPhone, email: parentEmail, relationship: parentRelationship }
        },
        suggestedStage: suggested, notes,
      });
      // Sync onboarding to Google Sheets
      fetch("/api/sheets-sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataType: "onboard", date: new Date().toISOString().split("T")[0],
          mentor: currentUser.name, youngPerson: ypName || "Unknown",
          suggestedStage: suggested,
          onboardingResponses: JSON.stringify({ 
            ...responses, 
            _contact: { phone: ypPhone, dob: ypDob, email: ypEmail, postcode: ypPostcode },
            _parent: { name: parentName, phone: parentPhone, email: parentEmail, relationship: parentRelationship }
          }),
        }),
      }).catch(() => {});
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(() => onComplete(), 2000);
  };

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: STEP_COLORS.Rebuild + "15", border: `1.5px solid ${STEP_COLORS.Rebuild}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22, color: STEP_COLORS.Rebuild }}>✓</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Onboarding complete</h2>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Baseline recorded. Returning to overview...</p>
      </div>
    );
  }

  const renderIntro = () => (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Onboard a New Young Person</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        Work through these questions naturally in your first session. They're designed to feel like a conversation, not a test — the answers help set a starting baseline.
      </p>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Select existing or add new</label>
          <select value={selectedExisting} onChange={e => {
            setSelectedExisting(e.target.value);
            if (e.target.value && e.target.value !== "__new__") {
              const yp = youngPeople.find(y => y.id === e.target.value);
              setYpId(e.target.value);
              setYpName(yp?.name || "");
              // Load existing details
              setYpPhone(yp?.phone || "");
              setYpDob(yp?.dob || "");
              setYpEmail(yp?.email || "");
              setYpPostcode(yp?.postcode || "");
              setParentName(yp?.parent_name || "");
              setParentPhone(yp?.parent_phone || "");
              setParentEmail(yp?.parent_email || "");
              setParentRelationship(yp?.parent_relationship || "");
            } else {
              setYpId("");
              setYpName("");
              setYpPhone("");
              setYpDob("");
              setYpEmail("");
              setYpPostcode("");
              setParentName("");
              setParentPhone("");
              setParentEmail("");
              setParentRelationship("");
            }
          }} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", appearance: "none" }}>
            <option value="">Select...</option>
            {youngPeople.map(yp => <option key={yp.id} value={yp.id}>{yp.name}</option>)}
            <option value="__new__">+ New young person</option>
          </select>
        </div>
        {(selectedExisting === "__new__" || (selectedExisting && selectedExisting !== "")) && (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Name</label>
              <input value={ypName} onChange={e => setYpName(e.target.value)} placeholder="Full name..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Date of Birth</label>
              <input type="date" value={ypDob} onChange={e => setYpDob(e.target.value)}
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Phone Number</label>
              <input type="tel" value={ypPhone} onChange={e => setYpPhone(e.target.value)} placeholder="07..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Email (optional)</label>
              <input type="email" value={ypEmail} onChange={e => setYpEmail(e.target.value)} placeholder="email@..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Postcode / Area</label>
              <input value={ypPostcode} onChange={e => setYpPostcode(e.target.value)} placeholder="e.g. CF5, Ely, Grangetown..."
                style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Parent/Guardian Details - Optional */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Parent / Guardian / Primary Carer (Optional)
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Name</label>
                  <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Full name..."
                    style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Relationship</label>
                  <select value={parentRelationship} onChange={e => setParentRelationship(e.target.value)}
                    style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", appearance: "none" }}>
                    <option value="">Select...</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Foster Carer">Foster Carer</option>
                    <option value="Social Worker">Social Worker</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Phone</label>
                  <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="07..."
                    style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Email</label>
                  <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="email@..."
                    style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuestion = (qIdx) => {
    const q = questions[qIdx];
    const selected = responses[q.id];
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>
          Question {qIdx + 1} of {questions.length}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, lineHeight: 1.4 }}>{q.question}</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24, fontStyle: "italic" }}>{q.context}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {q.options.map((opt, oi) => {
            const isSel = selected?.label === opt.label;
            return (
              <Card key={oi} onClick={() => setResponses(r => ({ ...r, [q.id]: opt }))} style={{
                padding: "14px 18px", cursor: "pointer",
                border: `2px solid ${isSel ? C.accent : C.border}`,
                background: isSel ? C.accent + "08" : C.surface,
              }}>
                <div style={{ fontSize: 14, fontWeight: isSel ? 700 : 500, color: isSel ? C.accent : C.text }}>{opt.label}</div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    return (
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Assessment Complete</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
          {ypName || "This young person"}'s onboarding responses have been recorded. Add any first-impression notes below.
        </p>

        <Card style={{ marginBottom: 20, borderLeft: `4px solid #059669`, background: "#05966908" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>Responses saved</div>
              <div style={{ fontSize: 12, color: C.muted }}>Pathway stage and baseline scores have been calculated — you can review them in the young person's profile.</div>
            </div>
          </div>
        </Card>

        <Card>
          <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Mentor Notes — First Impressions
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Anything you noticed about how they engaged, what they said, body language, what stood out..."
            rows={4} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </Card>
      </div>
    );
  };

  const canProceed = () => {
    if (step === 0) return ypId || ypName.trim();
    if (step <= questions.length) return !!responses[questions[step - 1]?.id];
    return true;
  };

  const currentRender = () => {
    if (step === 0) return renderIntro();
    if (step <= questions.length) return renderQuestion(step - 1);
    return renderSummary();
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Step {step + 1} of {totalSteps}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.accent : C.border }} />
          ))}
        </div>
      </div>

      <div style={{ minHeight: 400 }}>{currentRender()}</div>

      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "space-between" }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
          padding: "12px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
          color: step === 0 ? C.border : C.muted, fontSize: 14, cursor: step === 0 ? "default" : "pointer",
        }}>Back</button>
        {step < totalSteps - 1 ? (
          <button onClick={() => canProceed() && setStep(s => s + 1)} style={{
            padding: "12px 32px", borderRadius: 8, border: "none",
            background: canProceed() ? C.accent : C.border, color: canProceed() ? C.bg : C.muted,
            fontSize: 14, fontWeight: 700, cursor: canProceed() ? "pointer" : "default",
          }}>Continue →</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: "12px 32px", borderRadius: 8, border: "none", background: C.accent, color: C.bg,
            fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1,
          }}>{submitting ? "Saving..." : "Complete Onboarding ✓"}</button>
        )}
      </div>
    </div>
  );
}

// ─── HOME VIEW ──────────────────────────────

function HomeView({ sessions, youngPeople, mentors, currentUser, onSelectYP, onNavigate, onStartScheduledSession }) {
  const [schedule, setSchedule] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [allUpcomingSessions, setAllUpcomingSessions] = useState([]); // For admin view - all mentors' sessions
  const [prepNotes, setPrepNotes] = useState({});
  const [prepLoading, setPrepLoading] = useState({});
  const [planModal, setPlanModal] = useState(null);
  const [expandedPrep, setExpandedPrep] = useState({});
  const [dismissedSessions, setDismissedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sf_dismissed_sessions") || "{}"); } catch { return {}; }
  });
  const [swipeState, setSwipeState] = useState({});
  const [cardsModal, setCardsModal] = useState(false);
  const [cardsModalType, setCardsModalType] = useState(null);
  // Mentor Coach state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const coachEndRef = useRef(null);
  const isAdmin = currentUser.role === "admin";
  const isMentorAdmin = isAdmin && mentors.some(m => m.id === currentUser.id);

  // Persist dismissed sessions
  useEffect(() => {
    try { localStorage.setItem("sf_dismissed_sessions", JSON.stringify(dismissedSessions)); } catch {}
  }, [dismissedSessions]);
  useEffect(() => {
    if (coachEndRef.current) coachEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [coachMessages, coachLoading]);

  const sendCoachMessage = async () => {
    if (!coachInput.trim() || coachLoading) return;
    const userMsg = { role: "user", content: coachInput.trim() };
    const newMessages = [...coachMessages, userMsg];
    setCoachMessages(newMessages);
    setCoachInput("");
    setCoachLoading(true);
    try {
      const res = await fetch("/api/mentor-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          mentorName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setCoachMessages(prev => [...prev, { role: "coach", content: data.reply }]);
      }
    } catch (e) {
      setCoachMessages(prev => [...prev, { role: "coach", content: "Sorry, I couldn't connect. Try again in a moment." }]);
    }
    setCoachLoading(false);
  };

  // Load schedule
  useEffect(() => {
    const load = async () => {
      // For mentor-admins and mentors: load personal schedule
      // For non-mentor admins (like Toni): load ALL schedules for team view
      if (!isAdmin || isMentorAdmin) {
        const sched = await db.getScheduleForMentor(currentUser.id);
        setSchedule(sched);
        const upcoming = db.getUpcomingSessions(sched, [], 14);
        setUpcomingSessions(upcoming);
        // Prep notes for upcoming
        if (upcoming.length > 0) {
          const next3 = upcoming.slice(0, 3);
          for (const s of next3) {
            const yp = youngPeople.find(y => y.name === s.young_person_name);
            if (!yp) continue;
            const ypSessions = sessions.filter(ss => ss.young_person_name === s.young_person_name);
            const stage = getLatestStage(ypSessions);
            const prepKey = s.young_person_name + s.date;
            setPrepLoading(prev => ({ ...prev, [prepKey]: true }));
            try {
              const res = await fetch("/api/session-prep", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mentorName: currentUser.name, youngPersonName: s.young_person_name, youngPersonId: yp.id, stage }),
              });
              const data = await res.json();
              if (data.prep) setPrepNotes(prev => ({ ...prev, [prepKey]: data.prep }));
            } catch {}
            setPrepLoading(prev => ({ ...prev, [prepKey]: false }));
          }
        }
      }
      
      // For all admins: load team schedule (next 2 weeks)
      if (isAdmin) {
        const allSched = await db.getSchedule(); // Get ALL schedule items
        const allUp = db.getUpcomingSessions(allSched, [], 14); // Next 2 weeks
        setAllUpcomingSessions(allUp);
      }
    };
    load();
  }, [currentUser.id, isAdmin, isMentorAdmin]);

  // Derive data
  const byYP = {};
  sessions.forEach(s => { if (!byYP[s.young_person_name]) byYP[s.young_person_name] = []; byYP[s.young_person_name].push(s); });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = currentUser.name?.split(" ")[0] || currentUser.name;

  // Swipe handlers
  const handleTouchStart = (key, e) => {
    setSwipeState(prev => ({ ...prev, [key]: { startX: e.touches[0].clientX, offsetX: 0 } }));
  };
  const handleTouchMove = (key, e) => {
    const state = swipeState[key];
    if (!state) return;
    const diff = e.touches[0].clientX - state.startX;
    if (diff < 0) setSwipeState(prev => ({ ...prev, [key]: { ...prev[key], offsetX: Math.max(diff, -120) } }));
  };
  const handleTouchEnd = async (key, session) => {
    const state = swipeState[key];
    if (!state) return;
    if (state.offsetX < -60) {
      // Animate out
      setSwipeState(prev => ({ ...prev, [key]: { ...prev[key], offsetX: -400 } }));
      setTimeout(async () => {
        setDismissedSessions(prev => ({ ...prev, [key]: true }));
        // Persist: delete one-offs, skip-this-week for recurring
        if (session?.schedule_id) {
          try {
            if (session.schedule_type === "one_off") {
              await db.deleteScheduleSlot(session.schedule_id);
            } else {
              await db.createScheduleOverride({
                scheduleId: session.schedule_id,
                originalDate: session.date,
                action: "skip",
                reason: "Dismissed from Home",
              });
            }
          } catch (e) { console.warn("Swipe action failed:", e); }
        }
      }, 200);
    } else {
      setSwipeState(prev => ({ ...prev, [key]: { ...prev[key], offsetX: 0 } }));
    }
  };

  const visibleSessions = upcomingSessions.filter((s) => !dismissedSessions[s.young_person_name + s.date + (s.time || "")]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {planModal && <SessionPlanModal yp={planModal.name} stage={planModal.stage} scores={planModal.scores} recentNotes={planModal.notes} onClose={() => setPlanModal(null)} />}
      {cardsModal && <AccessCardsModal onClose={() => setCardsModal(false)} stage="Reset" preselectedType={cardsModalType} />}

      {/* ── Hero greeting ── */}
      <div className="animate-slide-up" style={{ marginBottom: 32, paddingTop: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.green, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", margin: "0 0 8px" }}>
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 400, margin: "0 0 6px", lineHeight: 1.1, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          {upcomingSessions.length > 0
            ? `You have ${upcomingSessions.filter(s => s.isToday).length > 0 ? upcomingSessions.filter(s => s.isToday).length + " session" + (upcomingSessions.filter(s => s.isToday).length !== 1 ? "s" : "") + " today" : upcomingSessions.length + " upcoming session" + (upcomingSessions.length !== 1 ? "s" : "") + " this fortnight"}.`
            : "No upcoming sessions scheduled."}
        </p>
      </div>

      {/* ── Session Prep Brief ── */}
      {(() => {
        // Get next upcoming session
        const nextSession = visibleSessions.find(s => !s.isPast);
        if (!nextSession) return null;
        
        const prepKey = nextSession.young_person_name + nextSession.date;
        const prep = prepNotes[prepKey];
        const ypSessions = byYP[nextSession.young_person_name] || [];
        const stage = getLatestStage(ypSessions);
        const color = STEP_COLORS[stage] || C.accent;
        const loading = prepLoading[prepKey];
        
        return (
          <Card className="animate-slide-up stagger-1" style={{ marginBottom: 28, padding: "16px 18px", borderLeft: `3px solid ${color}40` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Next Session Brief
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{nextSession.young_person_name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
              {nextSession.date} · {nextSession.time} · {nextSession.location}
            </div>
            
            {prep ? (
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, padding: "12px 14px", background: color + "08", borderRadius: 8, borderLeft: `2px solid ${color}30` }}>
                {prep}
              </div>
            ) : loading ? (
              <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Preparing briefing…
              </div>
            ) : (
              <button onClick={async () => {
                setPrepLoading(prev => ({ ...prev, [prepKey]: true }));
                try {
                  const recentSessions = ypSessions.slice(-3);
                  const recentSummary = recentSessions.map(s => `[${s.date}] ${s.stage || stage}: ${(s.notes || "").slice(0, 200)}`).join("\n");
                  const averageScore = recentSessions.length > 0 ? (recentSessions.reduce((acc, s) => acc + (parseFloat(s.quick?.engagement) || 0), 0) / recentSessions.length).toFixed(1) : "N/A";
                  const res = await fetch("/api/ai-summary", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "session-prep",
                      name: nextSession.young_person_name,
                      stage,
                      sessionNotes: `${nextSession.young_person_name} is at ${stage}. Recent avg engagement: ${averageScore}/5.\n\n${recentSummary}\n\nWrite a brief 2-3 sentence prep for ${firstName} ahead of their session today with ${nextSession.young_person_name}. What went well last time? What to focus on or be mindful of? Address the mentor directly as 'you'.`,
                    }),
                  });
                  const data = await res.json();
                  setPrepNotes(prev => ({ ...prev, [prepKey]: data.summary || "Could not generate prep brief" }));
                } catch { setPrepNotes(prev => ({ ...prev, [prepKey]: "Failed to generate prep — try again" })); }
                setPrepLoading(prev => ({ ...prev, [prepKey]: false }));
              }} style={{
                width: "100%", padding: "8px 0", borderRadius: 6,
                border: `1.5px solid ${color}40`, background: color + "06",
                color, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
                ✦ Generate Briefing
              </button>
            )}
          </Card>
        );
      })()}

      {/* ── Upcoming Sessions ── */}
      {visibleSessions.length > 0 && (
        <div className="animate-slide-up stagger-1" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Sessions</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {visibleSessions.slice(0, 5).map((s, i) => {
              const key = s.young_person_name + s.date + (s.time || "");
              const prepKey = s.young_person_name + s.date;
              const prep = prepNotes[prepKey];
              const ypSessions = byYP[s.young_person_name] || [];
              const color = STEP_COLORS[getLatestStage(ypSessions)] || C.accent;
              const isPrepExpanded = expandedPrep[key];
              const sessionDateTime = new Date(s.date + "T" + (s.time || "23:59"));
              // Parse duration from session_length (e.g. "1 Hour", "1.5 Hours", "30 Minutes")
              const durationMs = (() => {
                const len = (s.session_length || "1 Hour").toLowerCase();
                const num = parseFloat(len) || 1;
                if (len.includes("min")) return num * 60 * 1000;
                return num * 60 * 60 * 1000; // default to hours
              })();
              const isPast = (sessionDateTime.getTime() + durationMs) < now.getTime();
              const sSwipe = swipeState[key];
              const offsetX = sSwipe?.offsetX || 0;

              return (
                <div key={key} style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
                  {/* Swipe reveal */}
                  <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: 100,
                    background: s.schedule_type === "one_off" ? C.danger : "#D97706", display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 2,
                    borderRadius: "0 12px 12px 0", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                    opacity: offsetX < -20 ? 1 : 0, transition: "opacity 0.15s",
                  }}>
                    <span style={{ fontSize: 16 }}>{s.schedule_type === "one_off" ? "🗑" : "⏭"}</span>
                    {s.schedule_type === "one_off" ? "Delete" : "Skip week"}
                  </div>

                  <div
                    onTouchStart={(e) => handleTouchStart(key, e)}
                    onTouchMove={(e) => handleTouchMove(key, e)}
                    onTouchEnd={() => handleTouchEnd(key, s)}
                    style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 || offsetX < -200 ? "transform 0.25s cubic-bezier(.4,0,.2,1)" : "none", position: "relative", zIndex: 1 }}
                  >
                    <Card style={{ borderLeft: `3px solid ${color}`, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{s.young_person_name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
                          color: s.isToday && !isPast ? "#fff" : s.isTomorrow ? "#D97706" : C.muted,
                          background: s.isToday && !isPast ? "#059669" : "transparent",
                          padding: s.isToday && !isPast ? "3px 10px" : 0, borderRadius: 100,
                        }}>
                          {s.isToday ? (isPast ? "Earlier today" : "Today") : s.isTomorrow ? "Tomorrow" : s.dayName} · {s.time}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{s.location} · {s.session_length}</div>

                      {prep && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, padding: "10px 12px", background: color + "08", borderRadius: 8, borderLeft: `2px solid ${color}30` }}>
                            {prep}
                          </div>
                        </div>
                      )}
                      {prepLoading[prepKey] && (
                        <div style={{ marginBottom: 10, fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          Preparing briefing…
                        </div>
                      )}

                      <button onClick={() => {
                        if (isPast) {
                          onNavigate("session");
                        } else if (onStartScheduledSession) {
                          onStartScheduledSession({ ypName: s.young_person_name, location: s.location, time: s.time, sessionLength: s.session_length });
                        } else {
                          onNavigate("start");
                        }
                      }} style={{
                        width: "100%", padding: "9px 0", borderRadius: 8, border: "none",
                        background: isPast ? C.surfaceAlt : color, color: isPast ? color : C.bg,
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        ...(isPast ? { border: `1px solid ${color}30` } : {}),
                      }}>
                        {isPast ? "Log Session →" : "Start Session →"}
                      </button>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="animate-slide-up stagger-2" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Card onClick={() => onNavigate("start")} style={{ cursor: "pointer", padding: "16px 18px", borderLeft: `3px solid ${C.accent}40`, transition: "border-color 0.15s" }}>
            <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.6 }}>✎</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Log Session</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Live or log a past session</div>
          </Card>
          <Card onClick={() => onNavigate("onboard")} style={{ cursor: "pointer", padding: "16px 18px", borderLeft: "3px solid #7C3AED40", transition: "border-color 0.15s" }}>
            <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.6 }}>+</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Check-In</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Quick check-in with a young person</div>
          </Card>
        </div>
      </div>

      {/* ── Access Cards ── */}
      <div className="animate-slide-up stagger-3" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>Access Cards</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { type: "spark", label: "Spark", icon: "✦", bg: "#F5F5F5", color: "#1A1A1A", accent: "#F59E0B" },
            { type: "signal", label: "Signal", icon: "◈", bg: "#1A1A1A", color: "#FFFFFF", accent: "#2563EB" },
            { type: "pulse", label: "Pulse", icon: "⟡", bg: "#FF4500", color: "#FFFFFF", accent: "#FF4500" },
          ].map((card) => (
            <button key={card.type} onClick={() => { setCardsModalType(card.type); setCardsModal(true); }} style={{
              flex: 1, cursor: "pointer", borderRadius: 10, overflow: "hidden",
              background: card.bg, border: card.bg === "#F5F5F5" ? `1px solid ${C.border}` : "none",
              padding: "14px 8px", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, color: card.color, opacity: 0.5 }}>{card.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: card.color, letterSpacing: "0.02em" }}>{card.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mentor Coach ── */}
      <div className="animate-slide-up stagger-4" style={{ marginBottom: 24 }}>
        {!coachOpen ? (
          <div onClick={() => {
            setCoachOpen(true);
            if (coachMessages.length === 0) {
              setCoachMessages([{ role: "coach", content: `Hey ${currentUser.name?.split(" ")[0] || ""}. How did today's session go? Tell me what happened and I'll help you think it through.` }]);
            }
          }} style={{
            cursor: "pointer", borderRadius: 12, overflow: "hidden",
            background: "linear-gradient(135deg, #059669 0%, #0D9488 50%, #2563EB 100%)",
            padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Mentor Coach</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Reflect on a session — get Pathways-grounded advice</div>
            </div>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.8)" }}>💬</span>
          </div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: C.surface }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #059669 0%, #0D9488 50%, #2563EB 100%)",
              padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Mentor Coach</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Powered by the Pathways framework</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCoachMessages([]); setCoachMessages([{ role: "coach", content: `Fresh start. How did the session go, ${currentUser.name?.split(" ")[0]}?` }]); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 10px", color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>New chat</button>
                <button onClick={() => setCoachOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, width: 28, height: 28, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "16px 16px 8px" }}>
              {coachMessages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}>
                  <div style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? C.accent : C.surfaceAlt,
                    color: msg.role === "user" ? "#fff" : C.text,
                    fontSize: 13, lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {coachLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                  <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: C.surfaceAlt }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `splashPulse 1s ease ${i * 0.15}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={coachEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input
                value={coachInput}
                onChange={e => setCoachInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCoachMessage(); } }}
                placeholder="Tell me about the session..."
                style={{ flex: 1, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={sendCoachMessage} disabled={!coachInput.trim() || coachLoading} style={{
                width: 40, height: 40, borderRadius: 10, border: "none",
                background: coachInput.trim() ? C.accent : C.border,
                color: coachInput.trim() ? "#fff" : C.muted,
                fontSize: 16, cursor: coachInput.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>↑</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Safeguarding notice for mentors ── */}
      {(() => {
        const sgFlags = sessions.filter(s => s.safeguarding?.trim()).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        if (sgFlags.length === 0) return null;
        return (
          <div className="animate-slide-up stagger-5" style={{ marginBottom: 24, padding: "12px 16px", background: "#FEF2F2", borderRadius: 10, borderLeft: "3px solid #f87171" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>Safeguarding</div>
            <div style={{ fontSize: 12, color: "#B91C1C" }}>
              {sgFlags.length} safeguarding note{sgFlags.length !== 1 ? "s" : ""} recorded recently for {[...new Set(sgFlags.map(s => s.young_person_name))].join(", ")}. Speak to Nathan or Toni for details before your next session.
            </div>
          </div>
        );
      })()}

      {/* ── ADMIN: Team Schedule Overview (2 weeks ahead) ── */}
      {isAdmin && allUpcomingSessions.length > 0 && (() => {
        // Group by mentor
        const byMentor = {};
        allUpcomingSessions.forEach(s => {
          const mentor = mentors.find(m => m.id === s.mentor_id);
          const mentorName = mentor?.name || "Unassigned";
          if (!byMentor[mentorName]) byMentor[mentorName] = [];
          byMentor[mentorName].push(s);
        });
        
        return (
          <div className="animate-slide-up stagger-6" style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Team Schedule — Next 2 Weeks</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {Object.entries(byMentor).sort(([a], [b]) => a.localeCompare(b)).map(([mentorName, mentorSessions]) => (
                <Card key={mentorName} style={{ padding: 16, borderLeft: "3px solid #7C3AED40" }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{mentorName}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{mentorSessions.length} session{mentorSessions.length !== 1 ? "s" : ""} scheduled</div>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {mentorSessions.slice(0, 5).map((s, i) => {
                      const color = STEP_COLORS[getLatestStage(byYP[s.young_person_name] || [])] || C.accent;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.young_person_name}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{s.location}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: s.isToday ? "#059669" : s.isTomorrow ? "#D97706" : C.text }}>
                              {s.isToday ? "Today" : s.isTomorrow ? "Tomorrow" : s.dayName}
                            </div>
                            <div style={{ fontSize: 10, color: C.muted }}>{s.time}</div>
                          </div>
                        </div>
                      );
                    })}
                    {mentorSessions.length > 5 && (
                      <div style={{ fontSize: 10, color: C.muted, textAlign: "center", fontStyle: "italic", marginTop: 2 }}>
                        +{mentorSessions.length - 5} more session{mentorSessions.length - 5 !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────

function Dashboard({ sessions, youngPeople, mentors, onSelectYP, currentUser, savedGroups, onRefresh }) {
  const [planModal, setPlanModal] = useState(null);
  const [infoPopup, setInfoPopup] = useState(null);
  const [progressionModal, setProgressionModal] = useState(false);
  const [progressingYP, setProgressingYP] = useState(null);
  const [cardsModal, setCardsModal] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [sgCases, setSgCases] = useState([]);
  const [sgView, setSgView] = useState(null);
  const [sgResolving, setSgResolving] = useState(null);
  const [sgWitness, setSgWitness] = useState("");
  const [sgAction, setSgAction] = useState("");
  const [sgSubmitting, setSgSubmitting] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [prepNotes, setPrepNotes] = useState({});
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [aiBrief, setAiBrief] = useState(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const isAdmin = currentUser.role === "admin";

  // Load safeguarding cases
  useEffect(() => {
    if (isAdmin) {
      db.getSafeguardingCases().then(cases => setSgCases(cases));
    }
  }, [isAdmin]);

  // Load schedule and compute upcoming sessions
  useEffect(() => {
    const loadSchedule = async () => {
      // For admins who are NOT mentors (like Toni), don't load personal schedule
      // For admins who ARE mentors, load their schedule
      // For regular mentors, load their schedule
      const isMentorAdmin = isAdmin && mentors.some(m => m.id === currentUser.id);
      const sched = !isAdmin || isMentorAdmin 
        ? await db.getScheduleForMentor(currentUser.id)
        : []; // Non-mentor admins get no personal schedule
      setSchedule(sched);
      const upcoming = db.getUpcomingSessions(sched, [], isAdmin ? 14 : 7);
      setUpcomingSessions(upcoming);

      // Load prep notes for next 3 upcoming sessions (mentor only)
      if (!isAdmin && upcoming.length > 0) {
        const next3 = upcoming.slice(0, 3);
        for (const s of next3) {
          const yp = youngPeople.find(y => y.name === s.young_person_name);
          if (!yp) continue;
          const ypSessions = sessions.filter(ss => ss.young_person_name === s.young_person_name);
          const stage = getLatestStage(ypSessions);
          try {
            const res = await fetch("/api/session-prep", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mentorName: currentUser.name, youngPersonName: s.young_person_name, youngPersonId: yp.id, stage }),
            });
            const data = await res.json();
            if (data.prep) setPrepNotes(prev => ({ ...prev, [s.young_person_name + s.date]: data.prep }));
          } catch {}
        }
      }
    };
    loadSchedule();
  }, [currentUser.id, isAdmin, mentors]);

  // Load monthly report for current month (mentor view)
  useEffect(() => {
    if (!isAdmin) {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // Previous month
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      db.getMonthlyReport(currentUser.id, prevYear, prevMonth, "mentor").then(r => {
        if (r?.content) setMonthlyReport(r.content);
      });
    }
  }, [currentUser.id, isAdmin]);

  const openSgCases = sgCases.filter(c => c.status === "open");
  const resolvedSgCases = sgCases.filter(c => c.status === "resolved");

  const handleResolveSg = async () => {
    if (!sgResolving || !sgWitness || !sgAction.trim()) return;
    setSgSubmitting(true);
    const { data } = await db.resolveSafeguardingCase({
      caseId: sgResolving.id,
      resolvedBy: currentUser.id,
      witnessId: sgWitness,
      actionTaken: sgAction,
    });
    if (data) {
      // Build timeline for email — all cases for this YP
      const ypCases = sgCases.filter(c => c.young_person_id === sgResolving.young_person_id);
      const timeline = ypCases.map(c => ({
        date: c.date,
        mentor: c.mentor_name,
        concern: c.concern,
      }));
      // Send resolution email
      fetch("/api/safeguarding-resolved", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youngPerson: (sgResolving._involvedNames || [sgResolving.young_person_name]).join(", "),
          resolvedBy: currentUser.name,
          witness: mentors.find(m => m.id === sgWitness)?.name || "Unknown",
          actionTaken: sgAction,
          originalConcern: sgResolving.concern,
          date: sgResolving.date,
          mentor: sgResolving.mentor_name,
          sessionNotes: sgResolving.session_notes,
          timeline,
        }),
      }).catch(() => {});
      // Refresh cases
      const updated = await db.getSafeguardingCases();
      setSgCases(updated);
      setSgResolving(null);
      setSgWitness("");
      setSgAction("");
    }
    setSgSubmitting(false);
  };

  // Group sessions by young person
  const byYP = {};
  sessions.forEach(s => {
    const name = s.young_person_name;
    if (!byYP[name]) byYP[name] = [];
    byYP[name].push(s);
  });

  const ypNames = Object.keys(byYP).sort((a, b) => {
    const aLatest = byYP[a].sort((x, y) => new Date(y.date) - new Date(x.date))[0]?.date || "";
    const bLatest = byYP[b].sort((x, y) => new Date(y.date) - new Date(x.date))[0]?.date || "";
    return bLatest.localeCompare(aLatest);
  });
  const safeguardingFlags = sessions.filter(s => s.safeguarding?.trim()).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const stageCount = {};
  STEPS.forEach(s => { stageCount[s] = 0; });
  ypNames.forEach(name => {
    const stage = getLatestStage(byYP[name]);
    stageCount[stage] = (stageCount[stage] || 0) + 1;
  });

  const readyNames = ypNames.filter(name => getProgressionStatus(byYP[name]).eligible);
  const needFocusNames = ypNames.filter(name => {
    const avgs = getLatestScores(byYP[name]);
    return (parseFloat(avgs.Reset) || 0) <= 2;
  });

  if (ypNames.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>👋</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Welcome, {currentUser.name}</div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {isAdmin ? "No sessions logged yet. Start by logging your first session." : "You haven't worked with any young people yet. Log your first session to get started."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {planModal && <SessionPlanModal yp={planModal.name} stage={planModal.stage} scores={planModal.scores} recentNotes={planModal.notes} onClose={() => setPlanModal(null)} />}
      {infoPopup && <InfoPopup title={infoPopup.title} description={infoPopup.description} color={infoPopup.color} onClose={() => setInfoPopup(null)} />}
      {cardsModal && <AccessCardsModal onClose={() => setCardsModal(false)} stage="Reset" />}

      {/* Progression Modal */}
      {progressionModal && (
        <div onClick={() => { setProgressionModal(false); setProgressingYP(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", borderTop: `4px solid ${STEP_COLORS.Rebuild}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Progression</h3>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>These young people have met all criteria. Confirm to move them to their next stage.</p>

            {progressingYP ? (
              <div>
                {(() => {
                  const ypSessions = byYP[progressingYP] || [];
                  const progression = getProgressionStatus(ypSessions);
                  return (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: STEP_COLORS[progression.stage] + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: STEP_COLORS[progression.stage] }}>{progressingYP[0]}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{progressingYP}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{progression.stage} → {progression.nextStage}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {progression.criteria?.map((c, i) => (
                          <div key={i} style={{ fontSize: 12, color: c.met ? STEP_COLORS.Rebuild : C.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span>{c.met ? "✓" : "○"}</span>
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setProgressingYP(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Back</button>
                        <button onClick={async () => {
                          // Create a "progression" session entry that moves the YP to the next stage
                          const ypObj = youngPeople.find(y => y.name === progressingYP);
                          if (ypObj && progression.nextStage) {
                            await db.createSession({
                              mentorId: currentUser.id, youngPersonId: ypObj.id,
                              date: new Date().toISOString().split("T")[0],
                              focusStep: progression.nextStage, sessionLength: "—", partnerOrg: "SilkFutures",
                              isGroup: false, groupId: null, scores: {}, quick: {},
                              stepAverages: { [progression.nextStage]: "3.0" },
                              notes: `Progressed from ${progression.stage} to ${progression.nextStage}. All criteria met and approved by ${currentUser.name}.`,
                              mentorReflection: "", safeguarding: "", coMentorIds: [],
                            });
                          }
                          setProgressingYP(null);
                          setProgressionModal(false);
                          // Trigger data refresh
                          if (onRefresh) await onRefresh();
                        }} style={{ flex: 2, padding: "12px 0", borderRadius: 8, border: "none", background: STEP_COLORS.Rebuild, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm — Progress to {progression.nextStage}</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {readyNames.map(name => {
                  const ypSessions = byYP[name] || [];
                  const progression = getProgressionStatus(ypSessions);
                  return (
                    <Card key={name} onClick={() => setProgressingYP(name)} style={{ cursor: "pointer", borderLeft: `3px solid ${STEP_COLORS[progression.stage]}`, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{progression.stage} → {progression.nextStage}</div>
                        </div>
                        <span style={{ fontSize: 12, color: STEP_COLORS.Rebuild, fontWeight: 700 }}>Progress →</span>
                      </div>
                    </Card>
                  );
                })}
                {readyNames.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>No young people currently eligible.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{isAdmin ? "Director Dashboard" : `${currentUser.name}'s Dashboard`}</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>{isAdmin ? (() => {
          const uniqueSessions = sessions.filter((s, i, arr) => !s.group_id || arr.findIndex(x => x.group_id === s.group_id && x.date === s.date) === i);
          return `${uniqueSessions.length} sessions · ${ypNames.length} young people`;
        })() : (() => {
          const mySessions = sessions.filter(s => s.mentor_id === currentUser.id);
          const unique = mySessions.filter((s, i, arr) => !s.group_id || arr.findIndex(x => x.group_id === s.group_id && x.date === s.date) === i);
          return `${unique.length} sessions this programme`;
        })()}</p>
      </div>

      {/* ── MENTOR VIEW: This Week's Sessions ── */}
      {!isAdmin && upcomingSessions.length > 0 && (
        <>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>This Week's Sessions</h3>
          <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
            {upcomingSessions.slice(0, 5).map((s, i) => {
              const key = s.young_person_name + s.date;
              const prep = prepNotes[key];
              const color = STEP_COLORS[getLatestStage(byYP[s.young_person_name] || [])] || C.accent;
              return (
                <Card key={i} style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{s.young_person_name}</span>
                    <span style={{ fontSize: 11, color: s.isToday ? "#059669" : s.isTomorrow ? "#D97706" : C.muted, fontWeight: 600 }}>
                      {s.isToday ? "Today" : s.isTomorrow ? "Tomorrow" : s.dayName} · {s.time}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: prep ? 8 : 0 }}>{s.location} · {s.session_length}</div>
                  {prep && <div style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, padding: "8px 10px", background: color + "08", borderRadius: 6, marginTop: 6 }}>{prep}</div>}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── MENTOR VIEW: Your Impact This Month ── */}
      {!isAdmin && (() => {
        const now = new Date();
        const thisMonth = sessions.filter(s => {
          const d = new Date(s.date);
          return s.mentor_id === currentUser.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        // Deduplicate group sessions (count each unique group_id + date combo once)
        const uniqueThisMonth = thisMonth.filter((s, i, arr) => !s.group_id || arr.findIndex(x => x.group_id === s.group_id && x.date === s.date) === i);
        const myYPs = [...new Set(thisMonth.map(s => s.young_person_name))];
        // Calculate avg engagement only from sessions that have engagement scores
        const sessionsWithEngagement = thisMonth.filter(s => s.quick?.engagement);
        const avgEng = sessionsWithEngagement.length ? (sessionsWithEngagement.reduce((a, s) => a + (parseFloat(s.quick?.engagement) || 0), 0) / sessionsWithEngagement.length).toFixed(1) : "—";
        return (
          <>
          </>
        );
      })()}

      {/* ── MENTOR VIEW: Monthly Feedback ── */}
      {!isAdmin && monthlyReport && (
        <Card style={{ marginBottom: 24, padding: 18, borderLeft: "3px solid #7C3AED40" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Your Monthly Impact</div>
          {monthlyReport.greeting && <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", lineHeight: 1.5 }}>{monthlyReport.greeting}</p>}
          {monthlyReport.impact && <p style={{ fontSize: 13, color: C.accentDim, margin: "0 0 10px", lineHeight: 1.6 }}>{monthlyReport.impact}</p>}
          {monthlyReport.numbers && <p style={{ fontSize: 12, color: "#059669", margin: "0 0 10px", lineHeight: 1.5, padding: "8px 10px", background: "#05966908", borderRadius: 6 }}>{monthlyReport.numbers}</p>}
          {monthlyReport.growth && <p style={{ fontSize: 12, color: C.muted, margin: "0 0 6px", lineHeight: 1.5, fontStyle: "italic" }}>{monthlyReport.growth}</p>}
          {monthlyReport.closing && <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{monthlyReport.closing}</p>}
        </Card>
      )}

      {/* ── ADMIN VIEW: Stats Cards ── */}
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Eligible for progression", value: readyNames.length, names: readyNames.slice(0, 5).join(", ") + (readyNames.length > 5 ? ` +${readyNames.length - 5} more` : ""), color: STEP_COLORS.Rebuild, onClick: readyNames.length > 0 ? () => setProgressionModal(true) : undefined, description: "No young people currently eligible for progression." },
          { label: "Need focus (Reset ≤ 2)", value: needFocusNames.length, names: needFocusNames.slice(0, 5).join(", ") + (needFocusNames.length > 5 ? ` +${needFocusNames.length - 5} more` : ""), color: STEP_COLORS.Release, description: "Young people whose Reset scores are at 2 or below — they may need extra attention and relational work." },
          { label: "Safeguarding flags", value: openSgCases.length, names: [...new Set(openSgCases.map(c => c.young_person_name))].join(", "), color: "#f87171", description: "Click to open safeguarding case management.", onClick: () => setSgView("list") },
        ].map(({ label, value, names, color, description, onClick }) => (
          <Card key={label} onClick={onClick || (() => setInfoPopup({ title: label, description, color }))} style={{ borderTop: `3px solid ${color}`, cursor: "pointer" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{names || "—"}</div>
            <div style={{ fontSize: 9, color: C.light, marginTop: 6, fontStyle: "italic" }}>Tap to learn more</div>
          </Card>
        ))}
        </div>
      )}

      {/* Quick Summary — recent activity overview */}
      {(() => {
        // Check if current user is a mentor (either non-admin mentor OR admin who is also in mentors list)
        const isMentor = !isAdmin || mentors.some(m => m.id === currentUser.id);
        const myRecentSessions = isMentor ? sessions.filter(s => s.mentor_id === currentUser.id) : [];
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const recent = myRecentSessions.filter(s => new Date(s.date) >= twoWeeksAgo);
        const recentYPs = [...new Set(recent.map(s => s.young_person_name))];
        const avgEng = recent.length ? (recent.reduce((a, s) => a + (parseFloat(s.quick?.engagement) || 0), 0) / recent.length).toFixed(1) : "—";

        // For non-mentor admins (like Toni), show team overview instead
        if (!isMentor) {
          const allRecent = sessions.filter(s => new Date(s.date) >= twoWeeksAgo);
          const allRecentYPs = [...new Set(allRecent.map(s => s.young_person_name))];
          const teamAvgEng = allRecent.length ? (allRecent.reduce((a, s) => a + (parseFloat(s.quick?.engagement) || 0), 0) / allRecent.length).toFixed(1) : "—";
          
          return (
            <Card style={{ marginBottom: 20, padding: 16, borderLeft: `3px solid ${C.accent}40` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Team Overview — Last 14 days</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{allRecent.length}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Sessions</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: STEP_COLORS.Rebuild }}>{allRecentYPs.length}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Young people</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: STEP_COLORS.Reframe }}>{teamAvgEng}/5</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Avg engagement</div>
                </div>
              </div>
              {allRecent.length === 0 && <div style={{ fontSize: 12, color: C.light, fontStyle: "italic" }}>No sessions in the last 2 weeks.</div>}
              {allRecent.length > 0 && !aiBrief && (
                <button onClick={async () => {
                  setLoadingBrief(true);
                  try {
                    // Generate team summary for non-mentor admin
                    const mentorStats = {};
                    mentors.forEach(m => { mentorStats[m.name] = { sessions: 0, yps: new Set() }; });
                    allRecent.forEach(s => {
                      if (mentorStats[s.mentor_name]) {
                        mentorStats[s.mentor_name].sessions++;
                        mentorStats[s.mentor_name].yps.add(s.young_person_name);
                      }
                    });
                    const mentorSummary = Object.entries(mentorStats)
                      .filter(([_, stats]) => stats.sessions > 0)
                      .map(([name, stats]) => `${name}: ${stats.sessions} sessions with ${stats.yps.size} young people`)
                      .join("\n");
                    
                    const res = await fetch("/api/ai-summary", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "team-summary",
                        name: currentUser.name,
                        stage: "Team Brief",
                        sessionNotes: `TEAM OVERVIEW — LAST 14 DAYS\nTotal sessions: ${allRecent.length}\nYoung people reached: ${allRecentYPs.length}\nAvg engagement: ${teamAvgEng}/5\n\nMENTOR ACTIVITY:\n${mentorSummary}\n\nWrite a brief 2-paragraph team summary. Highlight what's going well, any patterns across mentors, and what might need attention. Address ${currentUser.name.split(" ")[0]} directly as the MD.`,
                      }),
                    });
                    const data = await res.json();
                    setAiBrief(data.summary || data.error || "Could not generate brief");
                  } catch { setAiBrief("Failed to generate brief — try again"); }
                  setLoadingBrief(false);
                }} disabled={loadingBrief} style={{
                  width: "100%", padding: "10px 0", borderRadius: 8,
                  border: `1.5px solid ${C.accent}40`, background: C.accent + "06",
                  color: C.accent, fontSize: 12, fontWeight: 600, cursor: loadingBrief ? "default" : "pointer",
                  opacity: loadingBrief ? 0.6 : 1,
                }}>{loadingBrief ? "Generating team brief..." : "✦ Check Team Progress"}</button>
              )}
              {aiBrief && (
                <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 8, background: C.surfaceAlt, borderLeft: `3px solid ${C.accent}40` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Team Brief</div>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{aiBrief}</p>
                </div>
              )}
            </Card>
          );
        }

        // For mentors (including mentor-admins), removed from Dashboard - now in Settings
        return null;
      })()}

      {/* ── MENTOR JOURNEY / MILESTONES ── */}
      {(() => {
        const mySessions = sessions.filter(s => s.mentor_id === currentUser.id);
        const uniqueMySessions = mySessions.filter((s, i, arr) => !s.group_id || arr.findIndex(x => x.group_id === s.group_id && x.date === s.date) === i);
        const myYPs = [...new Set(mySessions.map(s => s.young_person_name))];
        const sessionCount = uniqueMySessions.length;

        // Calculate streak — consecutive weeks with at least 1 session
        const weeksSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const sessionWeeks = [...new Set(mySessions.map(s => {
          const d = new Date(s.date);
          const start = new Date(d.getFullYear(), 0, 1);
          return Math.floor((d - start) / (7 * 24 * 60 * 60 * 1000));
        }))].sort((a, b) => b - a);
        let streak = 0;
        const currentWeek = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        for (let i = 0; i <= sessionWeeks.length; i++) {
          if (sessionWeeks.includes(currentWeek - i)) streak++;
          else break;
        }

        // Deep work — most sessions with a single YP
        const ypCounts = {};
        mySessions.forEach(s => { ypCounts[s.young_person_name] = (ypCounts[s.young_person_name] || 0) + 1; });
        const deepestYP = Object.entries(ypCounts).sort((a, b) => b[1] - a[1])[0];

        // Milestone definitions
        const milestones = [
          { id: "first", label: "First Session", icon: "🎯", desc: "Logged your first session", earned: sessionCount >= 1 },
          { id: "5", label: "Getting Started", icon: "🔥", desc: "5 sessions delivered", earned: sessionCount >= 5 },
          { id: "10", label: "In the Flow", icon: "⚡", desc: "10 sessions delivered", earned: sessionCount >= 10 },
          { id: "25", label: "Quarter Century", icon: "💎", desc: "25 sessions delivered", earned: sessionCount >= 25 },
          { id: "50", label: "Half Ton", icon: "🏆", desc: "50 sessions delivered", earned: sessionCount >= 50 },
          { id: "trusted", label: "Trusted", icon: "🤝", desc: "Worked with 5+ young people", earned: myYPs.length >= 5 },
          { id: "deep", label: "Deep Work", icon: "🔗", desc: "10+ sessions with one YP", earned: deepestYP && deepestYP[1] >= 10 },
          { id: "streak4", label: "Consistent", icon: "📅", desc: "4-week streak", earned: streak >= 4 },
          { id: "streak8", label: "Relentless", icon: "🔥", desc: "8-week streak", earned: streak >= 8 },
          { id: "sg", label: "Safeguarding Aware", icon: "🛡", desc: "Raised a safeguarding concern", earned: mySessions.some(s => s.safeguarding?.trim()) },
        ];
        const earned = milestones.filter(m => m.earned);
        const nextUp = milestones.find(m => !m.earned);

        // Admin team view
        if (isAdmin) {
          const teamData = mentors.map(m => {
            const ms = sessions.filter(s => s.mentor_id === m.id);
            const unique = ms.filter((s, i, arr) => !s.group_id || arr.findIndex(x => x.group_id === s.group_id && x.date === s.date) === i);
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const recentCount = ms.filter(s => new Date(s.date) >= twoWeeksAgo).length;
            const lastDate = ms.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
            const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
            return { ...m, sessionCount: unique.length, recentCount, lastDate, daysSince, ypCount: [...new Set(ms.map(s => s.young_person_name))].length };
          }).filter(m => m.sessionCount > 0).sort((a, b) => b.recentCount - a.recentCount);

          return (
            <Card style={{ marginBottom: 20, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Team</div>
              <div style={{ display: "grid", gap: 10 }}>
                {teamData.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}08` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.daysSince > 14 ? "#f8717120" : "#05966920", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: m.daysSince > 14 ? "#f87171" : "#059669" }}>{m.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{m.sessionCount} sessions · {m.ypCount} YPs{m.daysSince > 14 ? ` · ${m.daysSince}d since last session` : ""}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: m.recentCount > 0 ? "#059669" : C.light }}>{m.recentCount}</div>
                      <div style={{ fontSize: 9, color: C.muted }}>14d</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        }

        // Mentor view - removed from Dashboard, now in Settings
        return null;
      })()}

      {isAdmin && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, marginTop: 0 }}>Pathway Pipeline</h3>
          <div style={{ display: "flex" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i < STEPS.length - 1 && <div style={{ position: "absolute", right: 0, top: 20, width: 1, height: 40, background: C.border }} />}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: stageCount[s] ? STEP_COLORS[s] : C.border,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 900, color: stageCount[s] ? C.bg : C.muted, marginBottom: 8, zIndex: 1,
                }}>{stageCount[s]}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: stageCount[s] ? STEP_COLORS[s] : C.muted }}>{s}</div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, width: "100%", padding: "0 4px" }}>
                  {(() => {
                    const stageYPs = ypNames.filter(name => getLatestStage(byYP[name]) === s);
                    const shown = stageYPs.slice(0, 5);
                    const remaining = stageYPs.length - shown.length;
                    return (
                      <>
                        {shown.map(name => (
                          <div key={name} onClick={() => onSelectYP(name)} style={{
                            padding: "4px 8px", borderRadius: 20, background: STEP_COLORS[s] + "20", color: STEP_COLORS[s],
                            fontSize: 11, fontWeight: 600, textAlign: "center", cursor: "pointer", border: `1px solid ${STEP_COLORS[s]}40`,
                          }}>{name}</div>
                        ))}
                        {remaining > 0 && (
                          <div style={{ fontSize: 10, color: C.muted, textAlign: "center", padding: "2px 0" }}>+{remaining} more</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SAVED GROUPS ── */}
      {savedGroups?.length > 0 && (() => {
        // Sort groups by most recent group session date
        const sortedGroups = [...savedGroups].map(group => {
          const memberNames = (group.member_ids || []).map(id => youngPeople.find(y => y.id === id)?.name).filter(Boolean);
          // For mentors: only include groups they've actually delivered sessions with
          const groupSessions = isAdmin 
            ? sessions.filter(s => s.is_group && memberNames.includes(s.young_person_name))
            : sessions.filter(s => s.is_group && memberNames.includes(s.young_person_name) && s.mentor_id === currentUser.id);
          const uniqueDates = [...new Set(groupSessions.map(s => s.date))];
          const latestDate = uniqueDates.sort().reverse()[0] || "";
          const memberStages = memberNames.map(name => {
            const ypSess = sessions.filter(s => s.young_person_name === name);
            return ypSess.length > 0 ? getLatestStage(ypSess) : null;
          }).filter(Boolean);
          return { ...group, memberNames, uniqueDates, latestDate, memberStages, groupSessions };
        }).filter(group => group.groupSessions.length > 0) // Only show groups with sessions
          .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

        if (sortedGroups.length === 0) return null;

        return (
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setGroupsExpanded(!groupsExpanded)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8, marginBottom: groupsExpanded ? 12 : 0, width: "100%",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Groups ({sortedGroups.length})
              </span>
              <span style={{ fontSize: 14, color: "#7C3AED", transition: "transform 0.2s", transform: groupsExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▸</span>
              {!groupsExpanded && sortedGroups[0] && (
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>· Latest: {sortedGroups[0].name}{sortedGroups[0].latestDate ? ` (${sortedGroups[0].latestDate})` : ""}</span>
              )}
            </button>
            {groupsExpanded && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {sortedGroups.map(group => {
                  const latestGroupSession = sessions.filter(s => s.is_group && group.memberNames.includes(s.young_person_name)).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                  return (
                  <Card key={group.id} style={{ borderLeft: `3px solid #7C3AED`, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#7C3AED25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>{group.memberNames.length}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{group.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{group.uniqueDates.length} group session{group.uniqueDates.length !== 1 ? "s" : ""}{group.latestDate ? ` · Last: ${group.latestDate}` : ""}</div>
                        </div>
                      </div>
                      <GroupBadge />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {group.memberNames.map(name => {
                        const ypSess = sessions.filter(s => s.young_person_name === name);
                        const st = ypSess.length > 0 ? getLatestStage(ypSess) : "Reset";
                        return (
                          <span key={name} onClick={(e) => { e.stopPropagation(); onSelectYP(name); }} style={{
                            padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            background: STEP_COLORS[st] + "15", color: STEP_COLORS[st], border: `1px solid ${STEP_COLORS[st]}30`,
                          }}>{name}</span>
                        );
                      })}
                    </div>
                    {/* Last session summary */}
                    {latestGroupSession?.notes && (
                      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>"{latestGroupSession.notes.slice(0, 120)}{latestGroupSession.notes.length > 120 ? "..." : ""}"</p>
                    )}
                    {latestGroupSession && (
                      <div style={{ fontSize: 10, color: C.light }}>
                        {latestGroupSession.focus_step && <StepBadge step={latestGroupSession.focus_step} />}
                        {" "}{latestGroupSession.mentor_name ? `with ${latestGroupSession.mentor_name}` : ""}{latestGroupSession.partner_org ? ` · ${latestGroupSession.partner_org}` : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                      {STEPS.map(s => {
                        const count = group.memberStages.filter(ms => ms === s).length;
                        return (
                          <div key={s} style={{ flex: 1 }}>
                            <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
                              <div style={{ width: count > 0 ? "100%" : "0%", height: "100%", background: STEP_COLORS[s], opacity: count > 0 ? 0.7 : 0.15, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 9, color: count > 0 ? STEP_COLORS[s] : C.light, textAlign: "center", marginTop: 2 }}>{count > 0 ? count : ""}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <h3 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {isAdmin ? "All Young People" : "My Young People"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {ypNames.map(name => {
          const ypSessions = byYP[name];
          const stage = getLatestStage(ypSessions);
          const color = STEP_COLORS[stage];
          const avgs = getLatestScores(ypSessions);
          const progression = getProgressionStatus(ypSessions);
          const latest = ypSessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          const latestMusicSession = ypSessions.filter(s => (s.partner_org || "") !== "Set Pace").sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          const hasSG = latest?.safeguarding?.trim();

          return (
            <Card key={name} onClick={() => onSelectYP(name)} style={{ borderLeft: `3px solid ${color}`, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: color + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color }}>{name[0]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ypSessions.length} session{ypSessions.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <StepBadge step={stage} />
                  {hasSG && isAdmin && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600, background: "#f8717115", padding: "2px 6px", borderRadius: 10 }}>⚠ SG</span>}
                  {hasSG && !isAdmin && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600, background: "#f8717115", padding: "2px 6px", borderRadius: 10 }} title="Safeguarding notes exist — speak to Nathan or Toni">⚠</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {STEPS.map(s => {
                  const val = parseFloat(avgs[s]) || 0;
                  return (
                    <div key={s} style={{ flex: 1 }}>
                      <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
                        <div style={{ width: `${(val / 4) * 100}%`, height: "100%", background: val >= 3 ? STEP_COLORS[s] : STEP_COLORS[s] + "60", borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 9, color: C.muted, textAlign: "center", marginTop: 2 }}>{s[0]}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                padding: "6px 10px", borderRadius: 8,
                background: progression.eligible ? STEP_COLORS.Rebuild + "15" : C.surfaceAlt,
                border: `1px solid ${progression.eligible ? STEP_COLORS.Rebuild + "40" : C.border}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: progression.eligible ? STEP_COLORS.Rebuild : C.muted, marginBottom: 2 }}>
                  {progression.eligible ? `Eligible — recommend for ${progression.nextStage}` : progression.nextStage ? `Working towards ${progression.nextStage}` : "Rise — ongoing"}
                </div>
                {progression.criteria && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    {progression.criteria.slice(0, 3).map((c, ci) => (
                      <div key={ci} style={{ fontSize: 9, color: c.met ? STEP_COLORS.Rebuild : C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>{c.met ? "✓" : "○"}</span>
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {latest?.notes && (
                <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>"{latest.notes.slice(0, 100)}{latest.notes.length > 100 ? "..." : ""}"</p>
              )}

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <button onClick={e => { e.stopPropagation(); setPlanModal({ name, stage, scores: avgs, notes: latestMusicSession?.notes || "" }); }} style={{
                  background: "none", border: "none", padding: 0, fontSize: 11, fontWeight: 700, color,
                  cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                }}>View next session plan →</button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── SAFEGUARDING DASHBOARD (admin only) ── */}
      {sgView === "list" && isAdmin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,18,16,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => { setSgView(null); setSgResolving(null); }}>
          <div style={{ background: C.surface, borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Safeguarding</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>Case Management</div>
              </div>
              <button onClick={() => { setSgView(null); setSgResolving(null); }} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: "20px 24px 28px", flex: 1 }}>
              {/* Resolving a case */}
              {sgResolving && (
                <div style={{ marginBottom: 24 }}>
                  <button onClick={() => setSgResolving(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 12 }}>← Back to cases</button>
                  <Card style={{ borderLeft: "3px solid #f87171", padding: 18, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{sgResolving.young_person_name}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{sgResolving.mentor_name} · {sgResolving.date}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#B91C1C", lineHeight: 1.6, margin: "0 0 8px" }}>{sgResolving.concern}</p>
                    {sgResolving.session_notes && <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}><strong>Session context:</strong> {sgResolving.session_notes.substring(0, 300)}{sgResolving.session_notes.length > 300 ? "..." : ""}</p>}
                  </Card>

                  {/* People Involved */}
                  <Card style={{ padding: 16, marginBottom: 16, borderLeft: "3px solid #f8717130" }}>
                    <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>People Involved</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {(sgResolving._involvedNames || [sgResolving.young_person_name]).map(name => (
                        <span key={name} style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 100, background: "#f8717115", color: "#f87171", border: "1px solid #f8717130" }}>{name}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {youngPeople.filter(yp => !(sgResolving._involvedNames || [sgResolving.young_person_name]).includes(yp.name)).map(yp => (
                        <button key={yp.id} onClick={() => {
                          const current = sgResolving._involvedNames || [sgResolving.young_person_name];
                          setSgResolving({ ...sgResolving, _involvedNames: [...current, yp.name] });
                        }} style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 100, border: `1px solid ${C.border}`,
                          background: "transparent", color: C.muted, cursor: "pointer",
                        }}>+ {yp.name}</button>
                      ))}
                    </div>
                  </Card>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Action Taken</label>
                      <textarea value={sgAction} onChange={e => setSgAction(e.target.value)} placeholder="Describe what action was taken to address this concern..." rows={3}
                        style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>Select Witness</label>
                      <select value={sgWitness} onChange={e => setSgWitness(e.target.value)}
                        style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", appearance: "none" }}>
                        <option value="">Select a witness...</option>
                        {mentors.filter(m => m.id !== currentUser.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <button onClick={handleResolveSg} disabled={sgSubmitting || !sgWitness || !sgAction.trim()} style={{
                      padding: "14px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700, cursor: sgWitness && sgAction.trim() ? "pointer" : "not-allowed",
                      background: sgWitness && sgAction.trim() ? "#059669" : C.border,
                      color: sgWitness && sgAction.trim() ? "#fff" : C.muted,
                    }}>{sgSubmitting ? "Submitting..." : "Mark as Resolved ✓"}</button>
                  </div>
                </div>
              )}
              {/* Case lists */}
              {!sgResolving && (
                <>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Open Cases ({openSgCases.length})</h3>
                  {openSgCases.length === 0 && <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>No open safeguarding cases. All clear.</p>}
                  <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
                    {openSgCases.map(c => (
                      <Card key={c.id} style={{ borderLeft: "3px solid #f87171", padding: "14px 16px", cursor: "pointer" }} onClick={() => setSgResolving(c)}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{c.young_person_name}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>{c.mentor_name} · {c.date}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.6, margin: "0 0 6px" }}>{c.concern}</p>
                        <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>Tap to review and resolve →</span>
                      </Card>
                    ))}
                  </div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Resolved ({resolvedSgCases.length})</h3>
                  {resolvedSgCases.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>No resolved cases yet.</p>}
                  <div style={{ display: "grid", gap: 10 }}>
                    {resolvedSgCases.map(c => (
                      <Card key={c.id} style={{ borderLeft: "3px solid #05966940", padding: "14px 16px", opacity: 0.8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{c.young_person_name}</span>
                          <span style={{ fontSize: 10, color: "#059669", fontWeight: 600, background: "#05966912", padding: "2px 8px", borderRadius: 100 }}>Resolved</span>
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 4px" }}>{c.concern}</p>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          Resolved by {c.resolved_by_name} · Witness: {c.witness_name} · {new Date(c.resolved_at).toLocaleDateString("en-GB")}
                        </div>
                        {c.action_taken && <p style={{ fontSize: 11, color: "#059669", margin: "4px 0 0", fontStyle: "italic" }}>Action: {c.action_taken}</p>}
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {safeguardingFlags.length > 0 && isAdmin && (
        <>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Safeguarding Notes</h3>
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            {safeguardingFlags.slice(0, 3).map((s, i) => (
              <Card key={i} style={{ borderLeft: "3px solid #f87171", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{s.young_person_name}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{s.mentor_name} · {s.date}</span>
                </div>
                <p style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.6, margin: 0 }}>{s.safeguarding}</p>
              </Card>
            ))}
          </div>
          <button onClick={() => setSgView("list")} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid #f8717140`, background: "#f8717108", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 24 }}>
            Open Safeguarding Dashboard ({openSgCases.length} open) →
          </button>
        </>
      )}
      {safeguardingFlags.length > 0 && !isAdmin && (
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "#FEF2F2", borderRadius: 10, borderLeft: "3px solid #f87171" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>Safeguarding</div>
          <div style={{ fontSize: 12, color: "#B91C1C" }}>
            {safeguardingFlags.length} safeguarding note{safeguardingFlags.length !== 1 ? "s" : ""} recorded recently for {[...new Set(safeguardingFlags.map(s => s.young_person_name))].join(", ")}. Speak to Nathan or Toni for details before your next session.
          </div>
        </div>
      )}
    </div>
  );
}


// ─── PROGRAMME SELECTOR ──────────────────────

function ProgrammeSelector({ youngPeople, mentors, currentUser, sessions, savedGroups, onComplete, onCancel, onSessionStart, onGroupsChanged, scheduleContext }) {
  const [programme, setProgramme] = useState(null);

  // If we have schedule context, auto-select SilkFutures programme
  useEffect(() => {
    if (scheduleContext && !programme) {
      setProgramme("silkfutures");
    }
  }, [scheduleContext]);

  // Notify parent when session starts (via effect, not during render)
  useEffect(() => {
    if ((programme === "silkfutures" || programme === "setpace") && onSessionStart) {
      onSessionStart();
    }
  }, [programme, onSessionStart]);

  if (programme === "silkfutures") {
    return <LiveSession youngPeople={youngPeople} mentors={mentors} currentUser={currentUser} sessions={sessions} savedGroups={savedGroups} onComplete={onComplete} onCancel={() => setProgramme(null)} onGroupsChanged={onGroupsChanged} scheduleContext={scheduleContext} />;
  }
  if (programme === "setpace") {
    return <SetPaceSession youngPeople={youngPeople} mentors={mentors} currentUser={currentUser} sessions={sessions} savedGroups={savedGroups} onComplete={onComplete} onCancel={() => setProgramme(null)} />;
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", paddingTop: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Start a Session</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Choose your programme</p>
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
        <Card onClick={() => setProgramme("silkfutures")} style={{
          padding: 24, cursor: "pointer", borderLeft: "4px solid #1A1A1A",
          transition: "all 0.15s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo-small.png" alt="" style={{ height: 36, width: "auto" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>SilkFutures</div>
              <div style={{ fontSize: 12, color: C.muted }}>Rap & music production mentoring</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.light, marginTop: 10 }}>Reconnect → Spark/Signal Cards → Session Plan → Wrap Up</div>
        </Card>

        <Card onClick={() => setProgramme("setpace")} style={{
          padding: 24, cursor: "pointer", borderLeft: "4px solid #FF4500",
          transition: "all 0.15s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/setpace-logo-small.png" alt="Set Pace" style={{ height: 28, width: "auto" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Set Pace</div>
              <div style={{ fontSize: 12, color: C.muted }}>Sports, meditation & inner work</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.light, marginTop: 10 }}>Meditation → Circuit Training → Pulse Cards → Wrap Up</div>
        </Card>
      </div>

      <button onClick={onCancel} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
    </div>
  );
}

// ─── SETTINGS PAGE ───────────────────────────

function SettingsPage({ currentUser, isAdmin, onNavigate, sessions, youngPeople, mentors, onRefreshMentors, onLogout, onRefreshData, onSelectYP, savedGroups, onRefreshGroups }) {
  const [activeSection, setActiveSection] = useState(null);
  const [ypFilter, setYpFilter] = useState({ search: "", stage: "All", sort: "name" });
  const [deletingYP, setDeletingYP] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddYP, setShowAddYP] = useState(false);
  const [newYPName, setNewYPName] = useState("");
  const [newYPStep, setNewYPStep] = useState("Reset");
  const [newYPPhone, setNewYPPhone] = useState("");
  const [newYPDob, setNewYPDob] = useState("");
  const [newYPEmail, setNewYPEmail] = useState("");
  const [newYPPostcode, setNewYPPostcode] = useState("");
  const [newYPParentEmail, setNewYPParentEmail] = useState("");
  const [newYPParentName, setNewYPParentName] = useState("");
  const [newYPParentPhone, setNewYPParentPhone] = useState("");
  const [newYPParentRelationship, setNewYPParentRelationship] = useState("");
  const [consentRecords, setConsentRecords] = useState({});
  const [expandedYP, setExpandedYP] = useState(null);
  const [editYP, setEditYP] = useState({});
  const [savingYP, setSavingYP] = useState(false);

  // Group management state
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupMembers, setEditGroupMembers] = useState([]);
  const [deletingGroup, setDeletingGroup] = useState(null);

  // Deleted sessions state
  const [deletedSessions, setDeletedSessions] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState(null);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", funder: "", description: "", locations: [], startDate: "", endDate: "", budget: "", status: "active", objectives: [], fundingBrief: "" });
  const [newObjective, setNewObjective] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [report, setReport] = useState(null);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  // Locations state
  const [locs, setLocs] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [newLocName, setNewLocName] = useState("");
  const [newLocArea, setNewLocArea] = useState("");
  const [editingLoc, setEditingLoc] = useState(null);
  const [editLocName, setEditLocName] = useState("");
  const [editLocArea, setEditLocArea] = useState("");

  // Email log state
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [emailLogFilter, setEmailLogFilter] = useState("all"); // all, weekly_admin, fortnightly_mentor, reminder

  // Load data when sections open
  useEffect(() => {
    if (activeSection === "deleted") {
      setLoadingDeleted(true);
      db.getDeletedSessions().then(data => { setDeletedSessions(data); setLoadingDeleted(false); });
      db.cleanupOldDeletedSessions();
    }
    if (activeSection === "projects") {
      setLoadingProjects(true);
      db.getProjects().then(p => { setProjects(p); setLoadingProjects(false); });
    }
    if (activeSection === "locations" || activeSection === "schedule") {
      if (!locs.length) {
        setLoadingLocs(true);
        db.getLocations().then(l => { setLocs(l); setLoadingLocs(false); }).catch(() => setLoadingLocs(false));
      }
    }
    if (activeSection === "ypdb") {
      // Load consent records for all YPs
      db.getAllConsentRecords().then(records => {
        const byYPId = {};
        (records || []).forEach(r => {
          if (!byYPId[r.young_person_id] || r.created_at > byYPId[r.young_person_id].created_at) {
            byYPId[r.young_person_id] = r;
          }
        });
        setConsentRecords(byYPId);
      }).catch(() => {});
    }
    if (activeSection === "emaillog") {
      setLoadingEmailLogs(true);
      db.getEmailLogs().then(logs => { setEmailLogs(logs || []); setLoadingEmailLogs(false); }).catch(() => setLoadingEmailLogs(false));
    }
  }, [activeSection]);

  // Build YP data with session info
  const byYP = {};
  sessions.forEach(s => {
    const name = s.young_person_name;
    if (!byYP[name]) byYP[name] = [];
    byYP[name].push(s);
  });

  const ypWithData = youngPeople.map(yp => {
    const ypSessions = byYP[yp.name] || [];
    const stage = ypSessions.length > 0 ? getLatestStage(ypSessions) : "—";
    const lastSession = ypSessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return { ...yp, sessionCount: ypSessions.length, stage, lastDate: lastSession?.date || "Never", location: lastSession?.partner_org || "—", consentStatus: consentRecords[yp.id]?.status || null };
  });

  const filteredYP = ypWithData.filter(yp => {
    if (ypFilter.search && !yp.name.toLowerCase().includes(ypFilter.search.toLowerCase())) return false;
    if (ypFilter.stage !== "All" && yp.stage !== ypFilter.stage) return false;
    return true;
  }).sort((a, b) => {
    if (ypFilter.sort === "name") return a.name.localeCompare(b.name);
    if (ypFilter.sort === "sessions") return b.sessionCount - a.sessionCount;
    if (ypFilter.sort === "recent") return (b.lastDate || "").localeCompare(a.lastDate || "");
    return 0;
  });

  const handleDeleteYP = async (yp) => {
    setDeletingYP(yp.id);
    await db.deleteYoungPerson(yp.id);
    setDeletingYP(null);
    setConfirmDelete(null);
    if (onRefreshData) await onRefreshData();
  };

  const sections = [
    ...(isAdmin ? [
      { id: "schedule", label: "Session Schedule", desc: "Schedule one-off or recurring sessions and notify mentors", icon: "📅" },
      { id: "reports", label: "Monthly Reports", desc: "Generate mentor performance and impact reports", icon: "📈" },
      { id: "projects", label: "Projects & Impact", desc: "Manage funding projects, generate impact reports", icon: "📊" },
      { id: "export", label: "Funder Export", desc: "Filter and download session data as CSV", icon: "↓" },
      { id: "gallery", label: "Media Gallery", desc: "All session photos and videos", icon: "📸" },
      { id: "songs", label: "Song Database", desc: "All recorded tracks across sessions", icon: "🎵" },
      { id: "locations", label: "Locations", desc: "Manage session locations and areas", icon: "📍" },
      { id: "team", label: "Team Management", desc: "Manage mentors, PINs, and roles", icon: "👥" },
      { id: "ypdb", label: "Young People Database", desc: "View, filter, and manage all young people", icon: "📋" },
      { id: "analytics", label: "Mentor Analytics", desc: "Session stats, mentor activity, and trends", icon: "📊" },
      { id: "deleted", label: "Deleted Sessions", desc: "Recover or permanently remove deleted sessions", icon: "🗑" },
      { id: "emaillog", label: "Email Log", desc: "View all automated emails sent to mentors and admins", icon: "📧" },
    ] : []),
    { id: "about", label: "About Pathways", desc: "The framework and how it works", icon: "ℹ" },
  ];

  // ── SCHEDULE MANAGEMENT ──
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ mentorId: "", youngPersonId: "", dayOfWeek: 1, startTime: "14:00", sessionLength: "1 Hour", location: "SilkFutures", scheduleType: "one_off", oneOffDate: new Date().toISOString().split("T")[0] });
  const [notifySending, setNotifySending] = useState(false);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ── MONTHLY REPORTS ──
  const [reportMentorId, setReportMentorId] = useState("");
  const [mentorReportFrom, setMentorReportFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [mentorReportTo, setMentorReportTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [generatedReports, setGeneratedReports] = useState({});
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportEmailSending, setReportEmailSending] = useState(false);

  if (activeSection === "schedule") {
    if (!scheduleLoaded && !scheduleLoading) {
      setScheduleLoading(true);
      db.getSchedule().then(d => { setScheduleData(d); setScheduleLoading(false); setScheduleLoaded(true); });
    }

    // Separate one-off and recurring for display
    const oneOffs = scheduleData.filter(s => s.schedule_type === "one_off").sort((a, b) => (a.one_off_date || "").localeCompare(b.one_off_date || ""));
    const recurringSlots = scheduleData.filter(s => s.schedule_type !== "one_off");
    const grouped = {};
    recurringSlots.forEach(s => {
      const day = dayNames[s.day_of_week];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(s);
    });

    const isOneOff = newSlot.scheduleType === "one_off";
    const inputStyle = { width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" };
    const labelStyle = { display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 };

    // Compute upcoming sessions for the notify button
    const upcomingForNotify = db.getUpcomingSessions(scheduleData, [], 7);

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 8 }}>← Settings</button>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Session Schedule</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>Schedule one-off or recurring sessions</p>
        </div>

        {/* Notify Mentors button */}
        {upcomingForNotify.length > 0 && (
          <button
            disabled={notifySending}
            onClick={async () => {
              setNotifySending(true);
              try {
                // Group upcoming by mentor
                const byMentor = {};
                upcomingForNotify.forEach(s => {
                  if (!byMentor[s.mentor_id]) byMentor[s.mentor_id] = { email: s.mentor_email, name: s.mentor_name, sessions: [] };
                  byMentor[s.mentor_id].sessions.push(s);
                });
                let sent = 0;
                let errors = [];
                const mentorsWithEmail = Object.keys(byMentor).filter(mid => byMentor[mid].email);
                const mentorsWithoutEmail = Object.keys(byMentor).filter(mid => !byMentor[mid].email);
                for (const mid of mentorsWithEmail) {
                  const m = byMentor[mid];
                  try {
                    const res = await fetch("/api/session-notify", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ mentorName: m.name, mentorEmail: m.email, sessions: m.sessions }),
                    });
                    const data = await res.json();
                    if (data.sent) sent++;
                    else errors.push(`${m.name}: ${data.error || "Send failed"}`);
                  } catch (e) { errors.push(`${m.name}: Network error`); }
                }
                let msg = "";
                if (sent > 0) msg += `Notified ${sent} mentor${sent !== 1 ? "s" : ""} via email with calendar invites.`;
                if (errors.length > 0) msg += `${msg ? "\n\n" : ""}Failed to send to:\n${errors.join("\n")}`;
                if (mentorsWithoutEmail.length > 0) msg += `${msg ? "\n\n" : ""}No email set for: ${mentorsWithoutEmail.map(mid => byMentor[mid].name).join(", ")}. Add emails in Settings → Mentors.`;
                if (!msg) msg = "No mentors with email addresses found. Add emails in Settings → Mentors.";
                alert(msg);
              } catch { alert("Failed to send notifications."); }
              setNotifySending(false);
            }}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
              background: "#059669", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: notifySending ? "wait" : "pointer", marginBottom: 20,
              opacity: notifySending ? 0.6 : 1,
            }}
          >{notifySending ? "Sending…" : `📧 Notify Mentors — ${upcomingForNotify.length} session${upcomingForNotify.length !== 1 ? "s" : ""} this week`}</button>
        )}

        {/* Add new slot */}
        {!showAddSlot ? (
          <button onClick={() => setShowAddSlot(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", fontWeight: 600, marginBottom: 20 }}>+ Add Session</button>
        ) : (
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {/* Type toggle */}
              <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <button onClick={() => setNewSlot(s => ({ ...s, scheduleType: "one_off" }))} style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: isOneOff ? C.accent : "transparent", color: isOneOff ? C.bg : C.muted,
                }}>One-off</button>
                <button onClick={() => setNewSlot(s => ({ ...s, scheduleType: "recurring" }))} style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: !isOneOff ? C.accent : "transparent", color: !isOneOff ? C.bg : C.muted, borderLeft: `1px solid ${C.border}`,
                }}>Recurring</button>
              </div>

              {/* Session type: Single YP or Group */}
              <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <button onClick={() => setNewSlot(s => ({ ...s, isGroup: false, groupId: "" }))} style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: !newSlot.isGroup ? C.accent : "transparent", color: !newSlot.isGroup ? C.bg : C.muted,
                }}>Single YP</button>
                <button onClick={() => setNewSlot(s => ({ ...s, isGroup: true, youngPersonId: "" }))} style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: newSlot.isGroup ? C.accent : "transparent", color: newSlot.isGroup ? C.bg : C.muted, borderLeft: `1px solid ${C.border}`,
                }}>Group</button>
              </div>

              {/* Mentor + YP/Group */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={labelStyle}>Mentor</label>
                  <select value={newSlot.mentorId} onChange={e => setNewSlot(s => ({ ...s, mentorId: e.target.value }))} style={inputStyle}>
                    <option value="">Select...</option>
                    {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={labelStyle}>Session Type</label>
                  <select value={newSlot.isGroup ? "group" : "single"} onChange={e => setNewSlot(s => ({ ...s, isGroup: e.target.value === "group", youngPersonId: "", groupId: "" }))} style={inputStyle}>
                    <option value="single">Single YP</option>
                    <option value="group">Group</option>
                  </select>
                </div>
              </div>

              {/* YP or Group Selection */}
              <div>
                <label style={labelStyle}>{newSlot.isGroup ? "Group" : "Young Person"}</label>
                {newSlot.isGroup ? (
                  <select value={newSlot.groupId || ""} onChange={e => setNewSlot(s => ({ ...s, groupId: e.target.value }))} style={inputStyle}>
                    <option value="">Select group...</option>
                    {(savedGroups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                ) : (
                  <select value={newSlot.youngPersonId} onChange={e => setNewSlot(s => ({ ...s, youngPersonId: e.target.value }))} style={inputStyle}>
                    <option value="">Select...</option>
                    {youngPeople.map(yp => <option key={yp.id} value={yp.id}>{yp.name}</option>)}
                  </select>
                )}
              </div>

              {/* Date/Day + Time + Length */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {isOneOff ? (
                  <div style={{ flex: 1, minWidth: 130 }}>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={newSlot.oneOffDate} onChange={e => setNewSlot(s => ({ ...s, oneOffDate: e.target.value }))} style={inputStyle} />
                  </div>
                ) : (
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label style={labelStyle}>Day</label>
                    <select value={newSlot.dayOfWeek} onChange={e => setNewSlot(s => ({ ...s, dayOfWeek: parseInt(e.target.value) }))} style={inputStyle}>
                      {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 80 }}>
                  <label style={labelStyle}>Time</label>
                  <input type="time" value={newSlot.startTime} onChange={e => setNewSlot(s => ({ ...s, startTime: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 80 }}>
                  <label style={labelStyle}>Length</label>
                  <select value={newSlot.sessionLength} onChange={e => setNewSlot(s => ({ ...s, sessionLength: e.target.value }))} style={inputStyle}>
                    {["30 mins", "1 Hour", "1.5 Hours", "2 Hours"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <select value={newSlot.location} onChange={e => setNewSlot(s => ({ ...s, location: e.target.value }))} style={inputStyle}>
                  {locs.map(l => l.name).sort().map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddSlot(false)} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={async () => {
                  if (!newSlot.mentorId) return;
                  if (!newSlot.isGroup && !newSlot.youngPersonId) return;
                  if (newSlot.isGroup && !newSlot.groupId) return;
                  if (isOneOff && !newSlot.oneOffDate) return;
                  
                  // If group is selected, create a schedule slot for each member
                  if (newSlot.isGroup && newSlot.groupId) {
                    const group = savedGroups.find(g => g.id === newSlot.groupId);
                    if (group && group.member_ids) {
                      for (const ypId of group.member_ids) {
                        await db.createScheduleSlot({ ...newSlot, youngPersonId: ypId, isGroup: true });
                      }
                    }
                  } else {
                    await db.createScheduleSlot(newSlot);
                  }
                  
                  const updated = await db.getSchedule();
                  setScheduleData(updated);
                  setNewSlot({ mentorId: "", youngPersonId: "", groupId: "", isGroup: false, dayOfWeek: 1, startTime: "14:00", sessionLength: "1 Hour", location: "SilkFutures", scheduleType: "one_off", oneOffDate: new Date().toISOString().split("T")[0] });
                  setShowAddSlot(false);
                }} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
            </div>
          </Card>
        )}

        {/* ── One-off sessions ── */}
        {oneOffs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>One-off Sessions</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {oneOffs.map(s => {
                const d = new Date(s.one_off_date + "T12:00");
                const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                const isPast = new Date(s.one_off_date + "T23:59") < new Date();
                return (
                  <Card key={s.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isPast ? 0.5 : 1 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.mentor_name} → {s.young_person_name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{label} · {s.start_time} · {s.session_length} · {s.location}</div>
                    </div>
                    <button onClick={async () => {
                      await db.deleteScheduleSlot(s.id);
                      const updated = await db.getSchedule();
                      setScheduleData(updated);
                    }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recurring sessions by day ── */}
        {scheduleLoading ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Loading schedule...</p>
        ) : recurringSlots.length > 0 && (
          <>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recurring Sessions</h3>
            {dayNames.map(day => {
              const slots = grouped[day];
              if (!slots?.length) return null;
              return (
                <div key={day} style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{day}</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {slots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => (
                      <Card key={s.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{s.mentor_name} → {s.young_person_name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{s.start_time} · {s.session_length} · {s.location}</div>
                        </div>
                        <button onClick={async () => {
                          await db.deleteScheduleSlot(s.id);
                          const updated = await db.getSchedule();
                          setScheduleData(updated);
                        }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!scheduleLoading && scheduleData.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13 }}>No sessions scheduled yet. Add one above.</p>
        )}
      </div>
    );
  }

  if (activeSection === "reports") {
    const formatDateLabel = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr + "T12:00");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };
    const dateRangeLabel = `${formatDateLabel(mentorReportFrom)} — ${formatDateLabel(mentorReportTo)}`;

    const generateReport = async (type) => {
      if (!reportMentorId) return;
      setReportGenerating(type); // Track which report is generating
      const mentor = mentors.find(m => m.id === reportMentorId);
      try {
        const res = await fetch("/api/monthly-report", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mentorId: reportMentorId, mentorName: mentor?.name || "Unknown", dateFrom: mentorReportFrom, dateTo: mentorReportTo, type }),
        });
        const data = await res.json();
        if (data.report) setGeneratedReports(prev => ({ ...prev, [`${reportMentorId}-${type}`]: data.report }));
        if (data.error) alert(data.error);
      } catch { alert("Failed to generate report"); }
      setReportGenerating(null);
    };

    const emailReport = async (type) => {
      const mentor = mentors.find(m => m.id === reportMentorId);
      const report = generatedReports[`${reportMentorId}-${type}`];
      if (!report) return;
      const recipientEmail = type === "mentor" ? mentor?.email : currentUser?.email;
      const recipientName = type === "mentor" ? mentor?.name : currentUser?.name;
      if (!recipientEmail) {
        alert(type === "mentor"
          ? `No email set for ${mentor?.name || "this mentor"}. Add one in Settings → Mentors.`
          : "No email set on your profile. Add one in Settings → Mentors.");
        return;
      }
      setReportEmailSending(true);
      try {
        const res = await fetch("/api/email-report", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, report, recipientEmail, recipientName: recipientName || "Team", mentorName: mentor?.name || "Unknown", dateRange: dateRangeLabel }),
        });
        const data = await res.json();
        if (data.sent) alert(`Report emailed to ${recipientEmail}`);
        else alert(data.error || "Failed to send email");
      } catch { alert("Failed to send email"); }
      setReportEmailSending(false);
    };

    const adminReport = generatedReports[`${reportMentorId}-admin`];
    const mentorReport = generatedReports[`${reportMentorId}-mentor`];
    const rptInputStyle = { width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" };
    const rptLabelStyle = { display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" };
    const sectionHeadStyle = (color) => ({ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, marginTop: 16 });

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 8 }}>← Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Reports</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Generate performance and impact reports per mentor</p>

        <Card style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={rptLabelStyle}>Mentor</label>
            <select value={reportMentorId} onChange={e => { setReportMentorId(e.target.value); setGeneratedReports({}); }} style={rptInputStyle}>
              <option value="">Select mentor...</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={rptLabelStyle}>From</label>
              <input type="date" value={mentorReportFrom} onChange={e => { setMentorReportFrom(e.target.value); setGeneratedReports({}); }} style={rptInputStyle} />
            </div>
            <div>
              <label style={rptLabelStyle}>To</label>
              <input type="date" value={mentorReportTo} onChange={e => { setMentorReportTo(e.target.value); setGeneratedReports({}); }} style={rptInputStyle} />
            </div>
          </div>
        </Card>

        {reportMentorId && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={() => generateReport("admin")} disabled={reportGenerating === "admin"} style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
              background: reportGenerating === "admin" ? C.border : C.accent, color: reportGenerating === "admin" ? C.muted : C.bg,
              fontSize: 13, fontWeight: 700, cursor: reportGenerating === "admin" ? "default" : "pointer",
            }}>{reportGenerating === "admin" ? "Generating..." : "Director Report"}</button>
            <button onClick={() => generateReport("mentor")} disabled={reportGenerating === "mentor"} style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
              background: reportGenerating === "mentor" ? C.border : "#7C3AED", color: reportGenerating === "mentor" ? C.muted : "#fff",
              fontSize: 13, fontWeight: 700, cursor: reportGenerating === "mentor" ? "default" : "pointer",
            }}>{reportGenerating === "mentor" ? "Generating..." : "Mentor Feedback"}</button>
          </div>
        )}

        {/* Director Report Display */}
        {adminReport && (
          <Card style={{ padding: 20, marginBottom: 16, borderLeft: `3px solid ${C.accent}`, overflow: "hidden" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>Director Report — {dateRangeLabel}</div>
            {adminReport.stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                {[
                  { label: "Sessions", value: adminReport.stats.totalSessions },
                  { label: "Young People", value: adminReport.stats.ypNames?.length || 0 },
                  { label: "Avg Engagement", value: adminReport.stats.avgEng + "/5" },
                  { label: "SG Flags", value: adminReport.stats.sgFlags },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", background: C.surfaceAlt, borderRadius: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {adminReport.overview && <><div style={sectionHeadStyle(C.muted)}>Overview</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.overview}</p></>}
            {adminReport.strengths && <><div style={sectionHeadStyle("#059669")}>Strengths</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.strengths}</p></>}
            {adminReport.patterns && <><div style={sectionHeadStyle("#7C3AED")}>Patterns</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.patterns}</p></>}
            {adminReport.development && <><div style={sectionHeadStyle("#D97706")}>Development Areas</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.development}</p></>}
            {adminReport.ypHighlights && <><div style={sectionHeadStyle(C.muted)}>Young Person Highlights</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.ypHighlights}</p></>}
            {adminReport.consistency && <><div style={sectionHeadStyle(C.muted)}>Consistency</div><p style={{ fontSize: 13, lineHeight: 1.7, margin: "0 0 4px", color: C.text }}>{adminReport.consistency}</p></>}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => emailReport("admin")} disabled={reportEmailSending} style={{
                width: "100%", padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.accent}`,
                background: C.accent + "08", color: C.accent, fontSize: 12, fontWeight: 700,
                cursor: reportEmailSending ? "default" : "pointer", opacity: reportEmailSending ? 0.6 : 1,
              }}>{reportEmailSending ? "Sending..." : `📧 Email this report to me (${currentUser?.email || "no email set"})`}</button>
            </div>
          </Card>
        )}

        {/* Mentor Feedback Display */}
        {mentorReport && (() => {
          const mentor = mentors.find(m => m.id === reportMentorId);
          return (
            <Card style={{ padding: 20, marginBottom: 16, borderLeft: "3px solid #7C3AED", overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>Mentor Feedback — {dateRangeLabel}</div>
              {mentorReport.greeting && <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", lineHeight: 1.5, color: C.text }}>{mentorReport.greeting}</p>}
              {mentorReport.impact && <p style={{ fontSize: 13, color: C.text, margin: "0 0 16px", lineHeight: 1.7 }}>{mentorReport.impact}</p>}
              {mentorReport.numbers && <div style={{ padding: "12px 14px", background: "#05966910", borderRadius: 8, marginBottom: 16, border: "1px solid #05966920" }}><p style={{ fontSize: 13, color: "#059669", margin: 0, lineHeight: 1.6 }}>{mentorReport.numbers}</p></div>}
              {mentorReport.growth && <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px", lineHeight: 1.6, fontStyle: "italic" }}>{mentorReport.growth}</p>}
              {mentorReport.closing && <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: C.text }}>{mentorReport.closing}</p>}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => emailReport("mentor")} disabled={reportEmailSending} style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, border: "1.5px solid #7C3AED",
                  background: "#7C3AED08", color: "#7C3AED", fontSize: 12, fontWeight: 700,
                  cursor: reportEmailSending ? "default" : "pointer", opacity: reportEmailSending ? 0.6 : 1,
                }}>{reportEmailSending ? "Sending..." : `📧 Email feedback to ${mentor?.name || "mentor"}${mentor?.email ? ` (${mentor.email})` : " — no email set"}`}</button>
              </div>
            </Card>
          );
        })()}
      </div>
    );
  }

  if (activeSection === "export") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <FunderExport sessions={sessions} youngPeople={youngPeople} />
      </div>
    );
  }

  if (activeSection === "team") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <AdminPanel mentors={mentors} onRefresh={onRefreshMentors} />
      </div>
    );
  }

  if (activeSection === "ypdb") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Young People Database</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{youngPeople.length} young people registered</p>

        {/* Delete confirmation modal */}
        {confirmDelete && (
          <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", borderTop: `4px solid ${C.danger}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: C.danger }}>Delete {confirmDelete.name}?</h3>
              <p style={{ fontSize: 13, color: C.accentDim, lineHeight: 1.7, margin: "0 0 8px" }}>
                This will permanently remove {confirmDelete.name} and all their data including:
              </p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 20px" }}>
                {confirmDelete.sessionCount} session{confirmDelete.sessionCount !== 1 ? "s" : ""}, onboarding data, and feedback responses. This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => handleDeleteYP(confirmDelete)} disabled={deletingYP === confirmDelete.id} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: deletingYP ? 0.6 : 1 }}>
                  {deletingYP === confirmDelete.id ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Search</label>
              <input value={ypFilter.search} onChange={e => setYpFilter(f => ({ ...f, search: e.target.value }))} placeholder="Search by name..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Stage</label>
              <select value={ypFilter.stage} onChange={e => setYpFilter(f => ({ ...f, stage: e.target.value }))} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                <option value="All">All Stages</option>
                {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="—">No sessions</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Sort by</label>
              <select value={ypFilter.sort} onChange={e => setYpFilter(f => ({ ...f, sort: e.target.value }))} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }}>
                <option value="name">Name</option>
                <option value="sessions">Most Sessions</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Quick actions — always visible at the top */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setShowAddYP(!showAddYP)} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            border: showAddYP ? `1.5px solid ${C.accent}` : `1.5px dashed ${C.border}`,
            background: showAddYP ? C.accent + "08" : "transparent",
            color: showAddYP ? C.accent : C.muted, fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>{showAddYP ? "Cancel" : "+ Add Young Person"}</button>
          <button onClick={() => {
            const el = document.getElementById("sf-groups-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }} style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>Groups ({savedGroups?.length || 0}) ↓</button>
        </div>

        {/* Add YP form — expands at top */}
        {showAddYP && (
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 150 }}>
                  <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Name *</label>
                  <input value={newYPName} onChange={e => setNewYPName(e.target.value)} placeholder="Full name..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Starting Step</label>
                  <select value={newYPStep} onChange={e => setNewYPStep(e.target.value)} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                    {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddYP(false)} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={async () => {
                  if (!newYPName.trim()) return;
                  const { data } = await db.createYoungPerson(newYPName.trim(), { phone: newYPPhone, dob: newYPDob, email: newYPEmail, postcode: newYPPostcode });
                  if (data) {
                    const parentUpdates = {};
                    if (newYPParentEmail.trim()) parentUpdates.parent_email = newYPParentEmail.trim();
                    if (newYPParentName.trim()) parentUpdates.parent_name = newYPParentName.trim();
                    if (newYPParentPhone.trim()) parentUpdates.parent_phone = newYPParentPhone.trim();
                    if (newYPParentRelationship) parentUpdates.parent_relationship = newYPParentRelationship;
                    if (Object.keys(parentUpdates).length > 0) await db.updateYoungPerson(data.id, parentUpdates);
                    // NOTE: Consent form NOT sent automatically - admins must manually trigger via "Send Consent Form" button in YP edit view
                  }
                  setNewYPName(""); setNewYPStep("Reset"); setNewYPPhone(""); setNewYPDob(""); setNewYPEmail(""); setNewYPPostcode(""); setNewYPParentEmail(""); setNewYPParentName(""); setNewYPParentPhone(""); setNewYPParentRelationship(""); setShowAddYP(false);
                  if (onRefreshData) await onRefreshData();
                }} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Young Person</button>
              </div>
            </div>
          </Card>
        )}

        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Showing {filteredYP.length} of {youngPeople.length}</div>

        <div style={{ display: "grid", gap: 8 }}>
          {filteredYP.map(yp => {
            const isExpanded = expandedYP === yp.id;
            const edit = editYP[yp.id] || {};
            return (
            <Card key={yp.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div onClick={() => onSelectYP && onSelectYP(yp.name)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: onSelectYP ? "pointer" : "default", flex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: (yp.stage !== "—" ? STEP_COLORS[yp.stage] : C.muted) + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: yp.stage !== "—" ? STEP_COLORS[yp.stage] : C.muted }}>{yp.name[0]}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>{yp.name}</div>
                      {/* Consent status badge */}
                      {yp.parent_email && yp.consentStatus === "signed" && (
                        <div style={{ padding: "2px 6px", borderRadius: 4, background: "#05966915", border: "1px solid #05966930", fontSize: 9, fontWeight: 700, color: "#059669", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                          ✓ Consent
                        </div>
                      )}
                      {yp.parent_email && yp.consentStatus === "pending" && (
                        <div style={{ padding: "2px 6px", borderRadius: 4, background: "#F59E0B15", border: "1px solid #F59E0B30", fontSize: 9, fontWeight: 700, color: "#D97706", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                          ⏳ Pending
                        </div>
                      )}
                      {yp.parent_email && !yp.consentStatus && (
                        <div style={{ padding: "2px 6px", borderRadius: 4, background: "#DC262615", border: "1px solid #DC262630", fontSize: 9, fontWeight: 700, color: "#DC2626", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                          ⚠ No consent
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {yp.sessionCount} session{yp.sessionCount !== 1 ? "s" : ""} · Last: {yp.lastDate} · {yp.location}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => {
                    if (isExpanded) { setExpandedYP(null); }
                    else {
                      setExpandedYP(yp.id);
                      setEditYP(prev => ({ ...prev, [yp.id]: {
                        nickname: yp.nickname || "",
                        full_name: yp.full_name || "",
                        parent_email: yp.parent_email || "",
                        parent_name: yp.parent_name || "",
                        parent_relationship: yp.parent_relationship || "",
                        parent_phone: yp.parent_phone || "",
                        phone: yp.phone || "",
                        email: yp.email || "",
                        postcode: yp.postcode || "",
                        dob: yp.dob || "",
                      }}));
                    }
                  }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: isExpanded ? C.accent + "10" : "transparent", color: isExpanded ? C.accent : C.muted, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Edit details">✎</button>
                  {yp.stage !== "—" && <StepBadge step={yp.stage} />}
                  <button onClick={() => {
                    const ypSessions = sessions.filter(s => s.young_person_name === yp.name);
                    exportSessionsCSV(ypSessions, `${yp.name.replace(/\s+/g, "-")}-sessions.csv`);
                  }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Export data">↓</button>
                  <button onClick={() => setConfirmDelete(yp)} style={{
                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
                    background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} title={`Delete ${yp.name}`}>×</button>
                </div>
              </div>

              {/* Expandable edit panel */}
              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, animation: "slideUp 0.2s ease" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Display Name / Nickname</label>
                        <input value={edit.nickname || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], nickname: e.target.value } }))} placeholder={yp.name} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Full Legal Name</label>
                        <input value={edit.full_name || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], full_name: e.target.value } }))} placeholder="Full name for records..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Phone</label>
                        <input value={edit.phone || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], phone: e.target.value } }))} placeholder="07..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>DOB</label>
                        <input type="date" value={edit.dob || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], dob: e.target.value } }))} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 2, minWidth: 150 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Email</label>
                        <input value={edit.email || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], email: e.target.value } }))} placeholder="YP email..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Postcode</label>
                        <input value={edit.postcode || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], postcode: e.target.value } }))} placeholder="CF5 1AB" style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>

                    {/* Parent / Guardian section */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Parent / Guardian Details</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <div style={{ flex: 2, minWidth: 150 }}>
                          <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Name</label>
                          <input value={edit.parent_name || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], parent_name: e.target.value } }))} placeholder="Parent / guardian name..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Relationship</label>
                          <select value={edit.parent_relationship || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], parent_relationship: e.target.value } }))} style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                            <option value="">Select...</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Grandparent">Grandparent</option>
                            <option value="Carer">Carer</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Phone</label>
                          <input value={edit.parent_phone || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], parent_phone: e.target.value } }))} placeholder="Parent phone..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Email</label>
                          <input value={edit.parent_email || ""} onChange={e => setEditYP(prev => ({ ...prev, [yp.id]: { ...prev[yp.id], parent_email: e.target.value } }))} placeholder="Parent email..." style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                    </div>

                    {/* Consent tracking info */}
                    {(() => {
                      const consentRecord = consentRecords[yp.id];
                      const hasParentEmail = edit.parent_email?.trim() || yp.parent_email?.trim();
                      
                      if (!hasParentEmail && !consentRecord) return null;
                      
                      return (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                            Consent Status
                          </div>
                          {!consentRecord && hasParentEmail && (
                            <div style={{ padding: "10px 12px", borderRadius: 6, background: "#FEF2F215", border: "1px solid #DC262630", display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: 18 }}>⚠️</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginBottom: 2 }}>No consent form sent</div>
                                <div style={{ fontSize: 11, color: "#B91C1C" }}>Click "Send Consent Form" below to email parent</div>
                              </div>
                            </div>
                          )}
                          {consentRecord?.status === "pending" && (
                            <div style={{ padding: "10px 12px", borderRadius: 6, background: "#FEF9E715", border: "1px solid #F59E0B30", display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: 18 }}>⏳</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#D97706", marginBottom: 2 }}>Consent pending</div>
                                <div style={{ fontSize: 11, color: "#B45309" }}>
                                  Sent: {new Date(consentRecord.created_at).toLocaleDateString("en-GB")} to {consentRecord.parent_email}
                                </div>
                                <button onClick={async () => {
                                  const emailToUse = consentRecord.parent_email;
                                  try {
                                    await fetch("/api/consent", {
                                      method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "send", youngPersonId: yp.id, youngPersonName: yp.name, parentEmail: emailToUse }),
                                    });
                                    alert(`Consent form re-sent to ${emailToUse}`);
                                    if (onRefreshData) await onRefreshData();
                                  } catch { alert("Failed to send consent form"); }
                                }} style={{ marginTop: 6, padding: "4px 10px", borderRadius: 4, border: "1px solid #D9770630", background: "#D9770610", color: "#D97706", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                                  Resend Form
                                </button>
                              </div>
                            </div>
                          )}
                          {consentRecord?.status === "signed" && (
                            <div style={{ padding: "10px 12px", borderRadius: 6, background: "#05966910", border: "1px solid #05966930", display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: 18 }}>✅</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", marginBottom: 2 }}>Consent signed</div>
                                <div style={{ fontSize: 11, color: "#047857" }}>
                                  Signed: {new Date(consentRecord.signed_at).toLocaleDateString("en-GB")} by {consentRecord.signature_name}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {/* Send Consent Form button — show if parent email exists (saved OR edited) */}
                        {(edit.parent_email?.trim() || yp.parent_email?.trim()) && (
                          <button onClick={async () => {
                            const emailToUse = edit.parent_email?.trim() || yp.parent_email?.trim();
                            try {
                              await fetch("/api/consent", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "send", youngPersonId: yp.id, youngPersonName: yp.name, parentEmail: emailToUse }),
                              });
                              alert(`Consent form sent to ${emailToUse}`);
                            } catch { alert("Failed to send consent form"); }
                          }} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid #7C3AED30`, background: "#7C3AED08", color: "#7C3AED", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            📧 Send Consent Form
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setExpandedYP(null)} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        <button onClick={async () => {
                          setSavingYP(true);
                          const updates = {};
                          if (edit.nickname !== undefined) updates.nickname = edit.nickname;
                          if (edit.full_name !== undefined) updates.full_name = edit.full_name;
                          if (edit.phone !== undefined) updates.phone = edit.phone;
                          if (edit.email !== undefined) updates.email = edit.email;
                          if (edit.postcode !== undefined) updates.postcode = edit.postcode;
                          if (edit.dob !== undefined) updates.dob = edit.dob;
                          if (edit.parent_email !== undefined) updates.parent_email = edit.parent_email;
                          if (edit.parent_name !== undefined) updates.parent_name = edit.parent_name;
                          if (edit.parent_relationship !== undefined) updates.parent_relationship = edit.parent_relationship;
                          if (edit.parent_phone !== undefined) updates.parent_phone = edit.parent_phone;
                          // If nickname changed, update the display name
                          if (edit.nickname && edit.nickname.trim() && edit.nickname.trim() !== yp.name) {
                            updates.name = edit.nickname.trim();
                          }
                          await db.updateYoungPerson(yp.id, updates);
                          setSavingYP(false);
                          setExpandedYP(null);
                          if (onRefreshData) await onRefreshData();
                        }} disabled={savingYP} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingYP ? 0.6 : 1 }}>
                          {savingYP ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
          })}
        </div>

        {/* ── Groups Management ── */}
        <div id="sf-groups-section" style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Groups</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{savedGroups?.length || 0} groups · Used for group sessions</p>

          {savedGroups?.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {savedGroups.map(group => {
                const memberNames = (group.member_ids || []).map(id => youngPeople.find(y => y.id === id)?.name).filter(Boolean);
                const isEditing = editingGroup === group.id;
                return (
                  <Card key={group.id} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7C3AED20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#7C3AED" }}>{memberNames.length}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{group.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{memberNames.join(", ") || "No members"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => {
                          if (isEditing) { setEditingGroup(null); }
                          else { setEditingGroup(group.id); setEditGroupMembers(group.member_ids || []); }
                        }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: isEditing ? "#7C3AED10" : "transparent", color: isEditing ? "#7C3AED" : C.muted, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
                        <button onClick={async () => {
                          if (deletingGroup === group.id) {
                            const { supabase } = await import("@/lib/supabase");
                            await supabase.from("saved_groups").delete().eq("id", group.id);
                            setDeletingGroup(null);
                            if (onRefreshGroups) await onRefreshGroups();
                          } else { setDeletingGroup(group.id); setTimeout(() => setDeletingGroup(null), 3000); }
                        }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${deletingGroup === group.id ? C.danger + "40" : C.border}`, background: deletingGroup === group.id ? C.danger + "10" : "transparent", color: deletingGroup === group.id ? C.danger : C.muted, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{deletingGroup === group.id ? "✓" : "×"}</button>
                      </div>
                    </div>
                    {isEditing && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Members (tap to toggle)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {youngPeople.map(yp => {
                            const isMember = editGroupMembers.includes(yp.id);
                            return (
                              <button key={yp.id} onClick={() => setEditGroupMembers(prev => isMember ? prev.filter(id => id !== yp.id) : [...prev, yp.id])} style={{
                                padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: isMember ? "#7C3AED15" : "transparent", color: isMember ? "#7C3AED" : C.muted, border: `1px solid ${isMember ? "#7C3AED40" : C.border}`,
                              }}>{isMember ? "✓ " : ""}{yp.name}</button>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => setEditingGroup(null)} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          <button onClick={async () => {
                            await db.updateSavedGroup(group.id, editGroupMembers);
                            setEditingGroup(null);
                            if (onRefreshGroups) await onRefreshGroups();
                          }} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Members</button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {!showAddGroup ? (
            <button onClick={() => setShowAddGroup(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed #7C3AED40`, background: "transparent", color: "#7C3AED", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+ Add Group</button>
          ) : (
            <Card style={{ padding: 16 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Group Name</label>
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Tuesday Ely Group" style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Select Members</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {youngPeople.map(yp => {
                      const isMember = newGroupMembers.includes(yp.id);
                      return (
                        <button key={yp.id} onClick={() => setNewGroupMembers(prev => isMember ? prev.filter(id => id !== yp.id) : [...prev, yp.id])} style={{
                          padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: isMember ? "#7C3AED15" : "transparent", color: isMember ? "#7C3AED" : C.muted, border: `1px solid ${isMember ? "#7C3AED40" : C.border}`,
                        }}>{isMember ? "✓ " : ""}{yp.name}</button>
                      );
                    })}
                  </div>
                  {newGroupMembers.length > 0 && <div style={{ fontSize: 11, color: "#7C3AED", marginTop: 6 }}>{newGroupMembers.length} selected</div>}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowAddGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={async () => {
                    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
                    await db.createSavedGroup(newGroupName.trim(), newGroupMembers);
                    setNewGroupName(""); setNewGroupMembers([]); setShowAddGroup(false);
                    if (onRefreshGroups) await onRefreshGroups();
                  }} disabled={!newGroupName.trim() || newGroupMembers.length === 0} style={{
                    padding: "8px 20px", borderRadius: 6, border: "none",
                    background: newGroupName.trim() && newGroupMembers.length > 0 ? "#7C3AED" : C.border,
                    color: newGroupName.trim() && newGroupMembers.length > 0 ? "#fff" : C.muted,
                    fontSize: 13, fontWeight: 700, cursor: newGroupName.trim() && newGroupMembers.length > 0 ? "pointer" : "default",
                  }}>Create Group</button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === "analytics") {
    // Calculate analytics
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo);
    
    const mentorStats = {};
    mentors.forEach(m => { mentorStats[m.name] = { total: 0, recent: 0, yps: new Set(), lastSession: null }; });
    sessions.forEach(s => {
      if (mentorStats[s.mentor_name]) {
        mentorStats[s.mentor_name].total++;
        mentorStats[s.mentor_name].yps.add(s.young_person_name);
        if (new Date(s.date) >= thirtyDaysAgo) mentorStats[s.mentor_name].recent++;
        if (!mentorStats[s.mentor_name].lastSession || s.date > mentorStats[s.mentor_name].lastSession) mentorStats[s.mentor_name].lastSession = s.date;
      }
    });

    const avgEngagement = recentSessions.length ? (recentSessions.reduce((a, s) => a + (s.quick?.engagement || 0), 0) / recentSessions.length).toFixed(1) : "—";
    const avgRegulation = recentSessions.length ? (recentSessions.reduce((a, s) => a + (s.quick?.emotionalState || s.quick?.regulation || 0), 0) / recentSessions.length).toFixed(1) : "—";
    const sgCount = recentSessions.filter(s => s.safeguarding?.trim()).length;
    const weeklyAvg = recentSessions.length ? (recentSessions.length / 4.3).toFixed(1) : "0";

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Mentor Analytics</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Last 30 days overview</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Sessions (30d)", value: recentSessions.length, color: STEP_COLORS.Rebuild },
            { label: "Weekly Average", value: weeklyAvg, color: STEP_COLORS.Reframe },
            { label: "Avg Engagement", value: avgEngagement + "/5", color: STEP_COLORS.Release },
            { label: "Avg Regulation", value: avgRegulation + "/5", color: STEP_COLORS.Reset },
            { label: "Safeguarding Flags", value: sgCount, color: "#f87171" },
            { label: "Active YP", value: [...new Set(recentSessions.map(s => s.young_person_name))].length, color: STEP_COLORS.Rise },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ padding: "14px 16px", textAlign: "center", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
            </Card>
          ))}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mentor Activity</h3>
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {Object.entries(mentorStats).sort((a, b) => b[1].recent - a[1].recent).map(([name, stats]) => {
            const mentorObj = mentors.find(m => m.name === name);
            return (
            <Card key={name} onClick={() => { if (mentorObj) { setReportMentorId(mentorObj.id); setGeneratedReports({}); setActiveSection("reports"); } }} style={{ padding: "14px 16px", cursor: mentorObj ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accent + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.accent }}>{name[0]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{stats.yps.size} young people · Last: {stats.lastSession || "Never"}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: stats.recent > 0 ? STEP_COLORS.Rebuild : C.light }}>{stats.recent}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>THIS MONTH</div>
                </div>
              </div>
              {/* Activity bar */}
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (stats.recent / Math.max(1, ...Object.values(mentorStats).map(s => s.recent))) * 100)}%`, height: "100%", background: STEP_COLORS.Rebuild, borderRadius: 2 }} />
              </div>
            </Card>
            );
          })}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Session Types (30d)</h3>
        <Card style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 16 }}>
            {STEPS.map(s => {
              const count = recentSessions.filter(sess => sess.focus_step === s).length;
              return (
                <div key={s} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: count ? STEP_COLORS[s] : C.light }}>{count}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  if (activeSection === "deleted") {
    const handleRestore = async (sessionId) => {
      setRestoringId(sessionId);
      await db.restoreSession(sessionId);
      setDeletedSessions(prev => prev.filter(s => s.id !== sessionId));
      setRestoringId(null);
      if (onRefreshData) await onRefreshData();
    };

    const handlePermanentDelete = async (sessionId) => {
      setPermanentDeleteId(sessionId);
      await db.permanentDeleteSession(sessionId);
      setDeletedSessions(prev => prev.filter(s => s.id !== sessionId));
      setPermanentDeleteId(null);
      setConfirmPermanentDelete(null);
    };

    const daysUntilAutoDelete = (deletedAt) => {
      const deleted = new Date(deletedAt);
      const expiry = new Date(deleted);
      expiry.setDate(expiry.getDate() + 30);
      const remaining = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      return Math.max(0, remaining);
    };

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Deleted Sessions</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Sessions are kept for 30 days before auto-deleting permanently</p>

        {/* Permanent delete confirmation modal */}
        {confirmPermanentDelete && (
          <div onClick={() => setConfirmPermanentDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%", borderTop: `4px solid ${C.danger}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: C.danger }}>Delete Forever?</h3>
              <p style={{ fontSize: 13, color: C.accentDim, lineHeight: 1.7, margin: "0 0 20px" }}>
                This will permanently remove this session. It cannot be recovered after this.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmPermanentDelete(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => handlePermanentDelete(confirmPermanentDelete)} disabled={permanentDeleteId === confirmPermanentDelete} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: permanentDeleteId ? 0.6 : 1 }}>
                  {permanentDeleteId === confirmPermanentDelete ? "Deleting..." : "Delete forever"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingDeleted ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
        ) : deletedSessions.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No deleted sessions</div>
            <div style={{ fontSize: 12, color: C.muted }}>Deleted sessions will appear here for 30 days</div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {deletedSessions.map(s => {
              const daysLeft = daysUntilAutoDelete(s.deleted_at);
              return (
                <Card key={s.id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.young_person_name || s.young_people?.name || "Unknown YP"}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s.date} · with {s.mentor_name || s.mentors?.name || "Unknown"} · {s.session_length}</div>
                    </div>
                    <StepBadge step={s.focus_step} />
                  </div>
                  <div style={{ fontSize: 11, color: daysLeft <= 7 ? C.danger : C.muted, marginBottom: 10 }}>
                    {daysLeft <= 0 ? "Expiring soon" : `Auto-deletes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`} · Deleted {new Date(s.deleted_at).toLocaleDateString()}
                  </div>
                  {s.notes && <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "0 0 12px" }}>{s.notes.length > 150 ? s.notes.slice(0, 150) + "..." : s.notes}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleRestore(s.id)} disabled={restoringId === s.id} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                      background: STEP_COLORS.Rebuild, color: "#fff",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      opacity: restoringId === s.id ? 0.6 : 1,
                    }}>{restoringId === s.id ? "Restoring..." : "Restore"}</button>
                    <button onClick={() => setConfirmPermanentDelete(s.id)} style={{
                      padding: "10px 16px", borderRadius: 8,
                      border: `1px solid ${C.danger}40`, background: "transparent",
                      color: C.danger, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Delete forever</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── EMAIL LOG ──
  if (activeSection === "emaillog") {
    const filteredLogs = emailLogFilter === "all" 
      ? emailLogs 
      : emailLogs.filter(log => log.email_type === emailLogFilter);

    const emailTypeLabels = {
      weekly_admin: "Weekly Admin Summary",
      fortnightly_mentor: "Fortnightly Mentor Summary",
      reminder: "Session Reminder",
      safeguarding: "Safeguarding Alert",
    };

    const emailTypeColors = {
      weekly_admin: "#7C3AED",
      fortnightly_mentor: "#047857",
      reminder: "#D97706",
      safeguarding: "#DC2626",
    };

    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Email Log</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>All automated emails sent to mentors and admins</p>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All" },
            { id: "weekly_admin", label: "Weekly Summaries" },
            { id: "fortnightly_mentor", label: "Mentor Reports" },
            { id: "reminder", label: "Reminders" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setEmailLogFilter(f.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: emailLogFilter === f.id ? "none" : `1px solid ${C.border}`,
                background: emailLogFilter === f.id ? C.accent : "transparent",
                color: emailLogFilter === f.id ? C.bg : C.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loadingEmailLogs ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading email logs...</div>
        ) : filteredLogs.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No emails yet</div>
            <div style={{ fontSize: 12, color: C.muted }}>Automated emails will appear here once sent</div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredLogs.map(log => {
              const typeColor = emailTypeColors[log.email_type] || C.accent;
              const typeLabel = emailTypeLabels[log.email_type] || log.email_type;
              const sentDate = new Date(log.created_at);
              const isSuccess = log.sent_successfully;

              return (
                <Card key={log.id} style={{ padding: 16, borderLeft: `3px solid ${typeColor}`, opacity: isSuccess ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: typeColor, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", background: typeColor + "15", borderRadius: 4 }}>
                          {typeLabel}
                        </div>
                        {!isSuccess && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", background: C.danger + "15", borderRadius: 4 }}>
                            FAILED
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{log.subject}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        To: {log.recipient_name || log.recipient_email}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div>{sentDate.toLocaleDateString("en-GB")}</div>
                      <div>{sentDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>

                  {log.error_message && (
                    <div style={{ fontSize: 11, color: C.danger, padding: "8px 10px", background: C.danger + "10", borderRadius: 6, marginTop: 8 }}>
                      Error: {log.error_message}
                    </div>
                  )}

                  {log.metadata && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <details style={{ fontSize: 11, color: C.muted }}>
                        <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>Metadata</summary>
                        <pre style={{ fontSize: 10, lineHeight: 1.5, margin: "8px 0 0", padding: "8px 10px", background: C.surfaceAlt, borderRadius: 6, overflow: "auto", maxHeight: 200 }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── PROJECTS & IMPACT ──
  if (activeSection === "projects") {

    const handleCreateProject = async () => {
      const { data } = await db.createProject(newProject);
      if (data) { setProjects(prev => [data, ...prev]); setShowCreate(false); setNewProject({ name: "", funder: "", description: "", locations: [], startDate: "", endDate: "", budget: "", status: "active" }); }
    };

    const generateImpactReport = async (project) => {
      setGeneratingReport(project?.id || "quick"); setReport(null);
      const projLocations = project?.locations || [];
      const dateFrom = reportDateFrom || project?.start_date || "";
      const dateTo = reportDateTo || project?.end_date || "";
      const filtered = sessions.filter(s => {
        if (dateFrom && s.date < dateFrom) return false;
        if (dateTo && s.date > dateTo) return false;
        if (projLocations.length > 0 && !projLocations.includes(s.partner_org)) return false;
        return true;
      });
      const uniqueYPNames = [...new Set(filtered.map(s => s.young_person_name))];
      const sessionsByYP = {};
      filtered.forEach(s => { if (!sessionsByYP[s.young_person_name]) sessionsByYP[s.young_person_name] = []; sessionsByYP[s.young_person_name].push(s); });

      // Stage distribution
      const stageDistribution = {};
      uniqueYPNames.forEach(name => { const stage = getLatestStage(sessionsByYP[name]); stageDistribution[stage] = (stageDistribution[stage] || 0) + 1; });

      // Quick score averages
      const quickKeys = ["emotionalState", "engagement", "confidence", "relationalConnection", "reflection"];
      const quickAvgs = {};
      quickKeys.forEach(k => {
        const vals = filtered.map(s => s.quick?.[k]).filter(v => v && v > 0);
        quickAvgs[k] = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
      });

      // Per-YP progression journeys (stage movement over time + score trends)
      const ypJourneys = uniqueYPNames.slice(0, 15).map(name => {
        const yps = (sessionsByYP[name] || []).sort((a, b) => a.date.localeCompare(b.date));
        const stages = yps.map(s => s.focus_step);
        const firstStage = stages[0];
        const lastStage = stages[stages.length - 1];
        const moved = STEPS.indexOf(lastStage) > STEPS.indexOf(firstStage);

        // Score trends: first 3 sessions vs last 3 sessions
        const first3 = yps.slice(0, 3);
        const last3 = yps.slice(-3);
        const avgQuick = (arr, key) => { const vals = arr.map(s => s.quick?.[key]).filter(v => v > 0); return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "n/a"; };
        const scoreTrend = {};
        quickKeys.forEach(k => { scoreTrend[k] = { early: avgQuick(first3, k), recent: avgQuick(last3, k) }; });

        // Key notes — most recent 5 sessions, with mentor reflections
        const recentSessions = yps.slice(-5);
        const notesSummary = recentSessions.map(s => `[${s.date}] ${(s.notes || "").slice(0, 300)}`).join("\n");
        const reflections = recentSessions.filter(s => s.mentor_reflection?.trim()).map(s => `[${s.date}] ${s.mentor_reflection.slice(0, 200)}`).join("\n");

        return {
          name, sessions: yps.length, firstStage, lastStage, moved,
          scoreTrend, notesSummary: notesSummary.slice(0, 1500), reflections: reflections.slice(0, 800),
        };
      });

      // Safeguarding summary
      const sgSessions = filtered.filter(s => s.safeguarding?.trim());
      const sgCount = sgSessions.length;

      // All session notes for qualitative mining (up to 40 sessions, 400 chars each)
      const allNotes = filtered
        .filter(s => s.notes?.trim())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 40)
        .map(s => `[${s.date}] ${s.young_person_name} (${s.focus_step}): ${s.notes.slice(0, 400)}`)
        .join("\n\n");

      // Objectives
      const objectives = project?.objectives || [];
      const fundingBrief = project?.funding_brief || "";

      try {
        const res = await fetch("/api/ai-summary", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "impact-report",
            projectName: project?.name || "All Sessions",
            funder: project?.funder || "",
            dateRange: `${dateFrom || "all time"} to ${dateTo || "present"}`,
            totalSessions: filtered.length,
            uniqueYP: uniqueYPNames.length,
            stageDistribution: JSON.stringify(stageDistribution),
            quickScoreAverages: JSON.stringify(quickAvgs),
            safeguardingFlags: sgCount,
            mentorsActive: [...new Set(filtered.map(s => s.mentor_name))].length,
            locations: projLocations.join(", ") || "All",
            notesSnippets: allNotes,
            ypJourneys: JSON.stringify(ypJourneys),
            objectives: JSON.stringify(objectives),
            fundingBrief,
          }),
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        // Email the report to the current user
        let emailSent = false;
        if (data && !data.error && currentUser?.email) {
          try {
            const emailRes = await fetch("/api/session-notify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "impact-report-email",
                mentorEmail: currentUser.email,
                mentorName: currentUser.name,
                report: data,
                projectName: project?.name || "Quick Report",
                dateRange: `${dateFrom || "all time"} to ${dateTo || "present"}`,
              }),
            });
            const emailData = await emailRes.json();
            emailSent = emailData.sent === true;
          } catch (e) { console.warn("Report email failed:", e); }
        }
        setReport({ ...data, _emailSent: emailSent });
      } catch (e) { setReport({ error: "Failed to generate report: " + e.message }); }
      setGeneratingReport(null);
    };

    const allLocationNames = [...new Set(sessions.map(s => s.partner_org).filter(Boolean))].sort();

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => { setActiveSection(null); setSelectedProject(null); setReport(null); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Projects & Impact</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Manage funding projects and generate impact reports</p>

        {/* Quick Impact Report (any date range) */}
        <Card style={{ marginBottom: 20, padding: 16, borderLeft: `3px solid #7C3AED40` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Quick Impact Report</div>
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>Generate a report for any date range — not tied to a specific project</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>From</label>
              <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>To</label>
              <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <button onClick={() => generateImpactReport(null)} disabled={generatingReport} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: generatingReport ? 0.6 : 1 }}>
            {generatingReport === "quick" ? "Generating..." : "Generate Impact Report"}
          </button>
        </Card>

        {/* AI Report Display */}
        {report && !report.error && (
          <Card style={{ marginBottom: 20, padding: 20, borderTop: `4px solid #7C3AED` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em" }}>Impact Report</div>
              <button onClick={() => {
                const sections = [
                  report.title || "Impact Report",
                  report.subtitle || "",
                  "",
                  "EXECUTIVE SUMMARY",
                  report.executiveSummary || "",
                  "",
                  "KEY METRICS",
                  report.keyMetrics || "",
                  "",
                  "OUTCOMES EVIDENCE",
                  report.outcomesEvidence || report.outcomes || "",
                  "",
                  "CASE STUDIES",
                  report.caseStudies || "",
                  "",
                  "CHALLENGES",
                  report.challenges || "",
                  "",
                  "RECOMMENDATIONS",
                  report.recommendations || "",
                  "",
                  `Generated by SilkFutures Pathways — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
                ].join("\n\n");
                const blob = new Blob([sections], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `impact-report-${new Date().toISOString().split("T")[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>↓ Download</button>
            </div>
            {report._emailSent ? (
              <div style={{ fontSize: 11, color: "#059669", marginBottom: 12, padding: "6px 10px", background: "#05966908", borderRadius: 6 }}>📧 A copy has been emailed to {currentUser?.email}</div>
            ) : currentUser?.email ? (
              <div style={{ fontSize: 11, color: "#B45309", marginBottom: 12, padding: "6px 10px", background: "#B4530908", borderRadius: 6 }}>📧 Email delivery failed — use the download button above to save a copy. Email will work once your domain is verified in Resend.</div>
            ) : (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: "6px 10px", background: C.surfaceAlt, borderRadius: 6 }}>No email set on your mentor profile — add one in Settings → Mentors to receive reports by email.</div>
            )}
            {report.title && <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>{report.title}</h3>}
            {report.subtitle && <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>{report.subtitle}</p>}
            {report.executiveSummary && <div><div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Executive Summary</div><div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{report.executiveSummary}</div></div>}
            {report.keyMetrics && <div><div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Key Metrics</div><div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{report.keyMetrics}</div></div>}
            {(report.outcomesEvidence || report.outcomes) && <div><div style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Outcomes Evidence</div><div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{report.outcomesEvidence || report.outcomes}</div></div>}
            {report.caseStudies && <div><div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Case Studies</div><div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{report.caseStudies}</div></div>}
            {report.challenges && <div><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Challenges</div><div style={{ fontSize: 13, color: C.accentDim, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{report.challenges}</div></div>}
            {report.recommendations && <div><div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recommendations</div><div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, whiteSpace: "pre-line" }}>{report.recommendations}</div></div>}
          </Card>
        )}
        {report?.error && <Card style={{ padding: 16, marginBottom: 20, borderLeft: `3px solid ${C.danger}` }}><p style={{ color: C.danger, fontSize: 13, margin: 0 }}>{report.error}</p></Card>}

        {/* Create Project */}
        {showCreate ? (
          <Card style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>New Project</div>
            <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
              <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="Project name..." style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
              <input value={newProject.funder} onChange={e => setNewProject(p => ({ ...p, funder: e.target.value }))} placeholder="Funder (e.g. The Ashley Family Foundation)..." style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
              <textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder="Description..." rows={2} style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none", resize: "vertical" }} />

              {/* Funding Objectives */}
              <div>
                <div style={{ fontSize: 10, color: "#7C3AED", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>Funding Objectives / Outcomes to Evidence</div>
                {newProject.objectives.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {newProject.objectives.map((obj, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, background: "#7C3AED08", border: "1px solid #7C3AED20" }}>
                        <span style={{ fontSize: 12, color: "#7C3AED", fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 12 }}>{obj}</span>
                        <button onClick={() => setNewProject(p => ({ ...p, objectives: p.objectives.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newObjective} onChange={e => setNewObjective(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newObjective.trim()) { setNewProject(p => ({ ...p, objectives: [...p.objectives, newObjective.trim()] })); setNewObjective(""); } }} placeholder="e.g. Increase in Confidence..." style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, outline: "none" }} />
                  {newObjective.trim() && <button onClick={() => { setNewProject(p => ({ ...p, objectives: [...p.objectives, newObjective.trim()] })); setNewObjective(""); }} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add</button>}
                </div>
                <p style={{ fontSize: 10, color: C.light, margin: "4px 0 0" }}>Add each outcome the funder needs you to evidence. The AI will map data to each one.</p>
              </div>

              {/* Funding Brief */}
              <div>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Funding Brief (optional — paste from funder docs)</div>
                <textarea value={newProject.fundingBrief} onChange={e => setNewProject(p => ({ ...p, fundingBrief: e.target.value }))} placeholder="Paste the funder's objectives, criteria, or brief here. The AI will use their language and framing..." rows={4} style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, outline: "none", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Start</label><input type="date" value={newProject.startDate} onChange={e => setNewProject(p => ({ ...p, startDate: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>End</label><input type="date" value={newProject.endDate} onChange={e => setNewProject(p => ({ ...p, endDate: e.target.value }))} style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} /></div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Locations</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allLocationNames.map(loc => {
                    const sel = newProject.locations.includes(loc);
                    return <button key={loc} onClick={() => setNewProject(p => ({ ...p, locations: sel ? p.locations.filter(l => l !== loc) : [...p.locations, loc] }))} style={{ padding: "5px 12px", borderRadius: 100, border: `1.5px solid ${sel ? C.accent : C.border}`, background: sel ? C.accent + "15" : "transparent", color: sel ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{loc}</button>;
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowCreate(false); setNewObjective(""); }} style={{ padding: "10px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { handleCreateProject(); setNewObjective(""); }} disabled={!newProject.name.trim()} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: newProject.name.trim() ? 1 : 0.5 }}>Create Project</button>
            </div>
          </Card>
        ) : (
          <button onClick={() => setShowCreate(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>+ New Project</button>
        )}

        {/* Project List */}
        {loadingProjects ? <div style={{ textAlign: "center", padding: 20, color: C.muted }}>Loading...</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {projects.map(p => {
              const projSessions = sessions.filter(s => {
                if (p.locations?.length && !p.locations.includes(s.partner_org)) return false;
                if (p.start_date && s.date < p.start_date) return false;
                if (p.end_date && s.date > p.end_date) return false;
                return true;
              });
              return (
                <Card key={p.id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                      {p.funder && <div style={{ fontSize: 12, color: C.muted }}>Funded by {p.funder}</div>}
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: p.status === "active" ? "#10B98120" : C.surfaceAlt, color: p.status === "active" ? "#10B981" : C.muted, fontWeight: 700 }}>{p.status}</span>
                  </div>
                  {p.description && <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px", lineHeight: 1.5 }}>{p.description}</p>}
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.accentDim, marginBottom: 8 }}>
                    <span>{projSessions.length} sessions</span>
                    <span>{[...new Set(projSessions.map(s => s.young_person_name))].length} YP</span>
                    {p.start_date && <span>{p.start_date} → {p.end_date || "ongoing"}</span>}
                  </div>
                  {p.objectives?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Objectives ({p.objectives.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {p.objectives.map((obj, i) => (
                          <div key={i} style={{ fontSize: 11, color: C.accentDim, paddingLeft: 8, borderLeft: "2px solid #7C3AED30" }}>{i + 1}. {obj}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.funding_brief && (
                    <div style={{ fontSize: 10, color: C.light, marginBottom: 8, fontStyle: "italic" }}>📄 Funding brief attached</div>
                  )}
                  {p.locations?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                      {p.locations.map(l => <span key={l} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: C.surfaceAlt, color: C.muted, fontWeight: 600 }}>{l}</span>)}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => { setReportDateFrom(p.start_date || ""); setReportDateTo(p.end_date || ""); generateImpactReport(p); }} disabled={generatingReport} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#7C3AED", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: generatingReport === p.id ? 0.6 : 1 }}>{generatingReport === p.id ? "Generating..." : "Generate Impact Report"}</button>
                    <button onClick={async () => {
                      const newStatus = p.status === "active" ? "completed" : "active";
                      await db.updateProject(p.id, { status: newStatus });
                      setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: newStatus } : pr));
                    }} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {p.status === "active" ? "Archive" : "Reactivate"}
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
                      await db.deleteProject(p.id);
                      setProjects(prev => prev.filter(pr => pr.id !== p.id));
                    }} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.danger}30`, background: "transparent", color: C.danger, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── MEDIA GALLERY ──
  if (activeSection === "gallery") {
    let allMedia = [];
    try { allMedia = db.getMediaFromSessions(sessions || []); } catch (e) { console.error("Gallery parse error:", e); }
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Media Gallery</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{allMedia.length} photo{allMedia.length !== 1 ? "s" : ""} and video{allMedia.length !== 1 ? "s" : ""} across all sessions</p>
        {allMedia.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 8 }}>📸</div><div style={{ color: C.muted, fontSize: 13 }}>No media uploaded yet</div></Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {allMedia.filter(m => m && m.url).map((m, i) => (
              <a key={i} href={m.url} target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surfaceAlt }}>
                  {m.type === "video" ? (
                    <video src={m.url} preload="metadata" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  ) : (
                    <img src={m.url} alt="" loading="lazy" onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                    <div style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{m.ypName || ""}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{m.date || ""}</div>
                  </div>
                  {m.type === "video" && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, padding: "2px 6px", background: "rgba(0,0,0,0.5)", color: "#fff", borderRadius: 4 }}>🎬</div>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── SONG DATABASE ──
  if (activeSection === "songs") {
    let allSongs = [];
    try { allSongs = db.getSongsFromSessions(sessions || []); } catch (e) { console.error("Songs parse error:", e); }
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Song Database</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{allSongs.length} track{allSongs.length !== 1 ? "s" : ""} recorded across all sessions</p>
        {allSongs.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div><div style={{ color: C.muted, fontSize: 13 }}>No tracks uploaded yet</div></Card>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {allSongs.filter(s => s && s.url).map((s, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title || "Untitled"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{s.ypName || ""} · {s.date || ""} · with {s.mentorName || ""}</div>
                  </div>
                  <a href={s.url} download={`${s.ypName || "Track"} - ${s.title || "Untitled"}.mp3`} target="_blank" rel="noopener" style={{ fontSize: 10, color: C.accent, textDecoration: "none", fontWeight: 700, padding: "4px 10px", borderRadius: 100, border: `1px solid ${C.border}` }}>↓</a>
                </div>
                <audio controls src={s.url} preload="metadata" style={{ width: "100%", height: 36, borderRadius: 8 }} />
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── LOCATIONS ──
  if (activeSection === "locations") {

    const handleAddLocation = async () => {
      if (!newLocName.trim()) return;
      const { data } = await db.createLocation({ name: newLocName.trim(), area: newLocArea.trim() });
      if (data) { setLocs(prev => [...prev, data]); setNewLocName(""); setNewLocArea(""); }
    };

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Locations</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Manage where sessions happen</p>

        <Card style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Add Location</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="Location name..." style={{ flex: 2, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
            <input value={newLocArea} onChange={e => setNewLocArea(e.target.value)} placeholder="Area..." style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
            <button onClick={handleAddLocation} disabled={!newLocName.trim()} style={{ padding: "10px 16px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: newLocName.trim() ? 1 : 0.5 }}>Add</button>
          </div>
        </Card>

        {loadingLocs ? <div style={{ textAlign: "center", padding: 20, color: C.muted }}>Loading...</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {locs.map(l => {
              const locSessions = sessions.filter(s => s.partner_org === l.name);
              const isEditing = editingLoc === l.id;
              return (
                <Card key={l.id} style={{ padding: "12px 16px" }}>
                  {isEditing ? (
                    <div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={editLocName} onChange={e => setEditLocName(e.target.value)} placeholder="Name..." style={{ flex: 2, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
                        <input value={editLocArea} onChange={e => setEditLocArea(e.target.value)} placeholder="Area..." style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingLoc(null)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        <button onClick={async () => {
                          if (!editLocName.trim()) return;
                          const oldName = l.name;
                          const { data } = await db.updateLocation(l.id, { name: editLocName.trim(), area: editLocArea.trim() });
                          if (data) {
                            setLocs(prev => prev.map(x => x.id === l.id ? data : x));
                            // If name changed, update existing sessions that reference the old name
                            if (oldName !== editLocName.trim()) {
                              const { supabase } = await import("@/lib/supabase");
                              await supabase.from("sessions").update({ partner_org: editLocName.trim() }).eq("partner_org", oldName);
                            }
                          }
                          setEditingLoc(null);
                        }} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{l.area || "—"} · {locSessions.length} session{locSessions.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setEditingLoc(l.id); setEditLocName(l.name); setEditLocArea(l.area || ""); }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Edit</button>
                        <button onClick={async () => {
                          if (!confirm(`Remove "${l.name}"?`)) return;
                          await db.deleteLocation(l.id);
                          setLocs(prev => prev.filter(x => x.id !== l.id));
                        }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.danger}30`, background: "transparent", color: C.danger, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Remove</button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeSection === "about") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setActiveSection(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back to Settings</button>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="SilkFutures" style={{ width: 80, height: "auto", marginBottom: 8 }} />
          <div style={{ fontSize: 9, color: C.light, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Pathways v29</div>
        </div>
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>The Pathways Framework</h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
            Pathways is SilkFutures' five-stage framework for tracking the development of young people through music mentoring. Each stage builds on the last.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {STEPS.map(s => {
              const details = {
                Reset: { desc: "The young person is stabilising. Sessions focus on building safety, trust, and consistency. Music is the anchor — showing up, being in the room, having a space that's theirs.", themes: "Arrival, belonging, safe expression, managing frustration, showing up consistently, learning to trust the process and the mentor" },
                Reframe: { desc: "Starting to see themselves differently. Lyrics begin to shift from surface to substance. They're naming emotions, questioning old patterns, and exploring who they want to become.", themes: "Self-awareness, accountability, identity vs persona, emotional honesty in bars, separating past from present, recognising triggers and patterns" },
                Rebuild: { desc: "Discipline kicks in. They're committing to their craft — finishing songs, developing skills, pushing through creative blocks. The work ethic starts matching the ambition.", themes: "Commitment, follow-through, creative discipline, taking feedback, building a body of work, technical development in writing/recording/production" },
                Release: { desc: "Their voice has weight and responsibility. They're making music that says something real — not performing, not imitating. The bars carry truth and they know it.", themes: "Authentic creative voice, purposeful expression, vulnerability without performance, message over image, music as contribution not just outlet" },
                Rise: { desc: "Leading others. Supporting younger participants. Representing the programme. Their growth becomes visible and they're paying it forward — in and out of the studio.", themes: "Mentoring peers, leadership under pressure, community responsibility, positive influence, integrity, representing SilkFutures values publicly" },
              }[s];
              return (
                <Card key={s} style={{ borderLeft: `3px solid ${STEP_COLORS[s]}40`, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <StepBadge step={s} size="lg" />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{STEP_SUBTITLES[s]}</div>
                  </div>
                  <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, margin: "0 0 10px" }}>{details.desc}</p>
                  <div style={{ fontSize: 10, fontWeight: 700, color: STEP_COLORS[s], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Key themes in their music</div>
                  <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, margin: 0 }}>{details.themes}</p>
                </Card>
              );
            })}
          </div>
        </Card>
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Progression</h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
            Young people don't progress after one good session. The system requires a minimum of 4 sessions scored at their current stage, a consistent average of 3.0+ across their last 3 sessions, no recent dips below 2.0, and a stable or improving trend. Even when all criteria are met, a mentor must formally recommend progression and an admin approves it.
          </p>
        </Card>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Built for SilkFutures CIC</h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
            Cardiff-based community interest company running rap and music production sessions with young people from high-deprivation areas.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Settings</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Signed in as {currentUser.name} · {isAdmin ? "Admin" : "Mentor"}</p>

      <div style={{ display: "grid", gap: 10, marginBottom: 32 }}>
        {sections.map(s => (
          <Card key={s.id} onClick={() => setActiveSection(s.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      <button onClick={onLogout} style={{
        width: "100%", padding: "14px 0", borderRadius: 10,
        border: `1.5px solid ${C.danger}`, background: "transparent",
        color: C.danger, fontSize: 14, fontWeight: 700, cursor: "pointer",
        marginBottom: 24,
      }}>Sign Out</button>

      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 10, color: C.light, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>SILKFUTURES PATHWAYS v40</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────

export default function Page() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [youngPeople, setYoungPeople] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState("home");
  const [selectedYP, setSelectedYP] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedGroups, setSavedGroups] = useState([]);
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [checkinInProgress, setCheckinInProgress] = useState(false);
  const [sessionMode, setSessionMode] = useState(null); // null = choose, "log" = assessment form
  const [scheduleSessionContext, setScheduleSessionContext] = useState(null); // { ypName, location, time } from schedule card
  const [showNavWarning, setShowNavWarning] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);

  // ── PWA / Offline State ──
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null); // { syncing, synced, failed }
  const syncCleanupRef = useRef(null);

  // Register service worker & setup sync
  useEffect(() => {
    // Track online/offline status
    const goOffline = () => setIsOffline(true);
    const goOnline = () => { setIsOffline(false); };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    setIsOffline(!navigator.onLine);

    // Unregister any existing service workers (no more cache issues after deploys)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      // Clear all caches
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
    }

    // Start auto-sync
    import("@/lib/syncManager").then(sm => {
      syncCleanupRef.current = sm.startAutoSync();
      sm.onSyncChange((status) => {
        // Only show syncing banner if there are actually sessions to sync
        if (status.syncing && status.pendingCount > 0) {
          setSyncStatus(status);
          setPendingCount(status.pendingCount);
        } else if (!status.syncing) {
          // Sync finished — update pending count and show brief success or clear
          if (status.pendingCount !== undefined) setPendingCount(status.pendingCount);
          if (status.synced > 0) {
            setSyncStatus(status);
            setTimeout(() => setSyncStatus(null), 2000);
            loadData();
          } else {
            setSyncStatus(null);
          }
        }
      });
    });

    // Check pending count on mount (for offline indicator only)
    import("@/lib/offlineDb").then(odb => {
      odb.getAllPendingCount().then(count => setPendingCount(count || 0));
    }).catch(() => setPendingCount(0));

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (syncCleanupRef.current) syncCleanupRef.current();
    };
  }, []);

  // Safe navigation that checks for active live session
  const safeNavigate = (newView) => {
    if (liveSessionActive && newView !== "live") {
      setPendingNav(newView);
      setShowNavWarning(true);
      return;
    }
    // Guard check-in/onboarding flow from accidental navigation
    if (view === "onboard" && newView !== "onboard" && checkinInProgress) {
      if (!confirm("You have a check-in in progress. Leave and lose your progress?")) return;
      setCheckinInProgress(false);
    }
    setView(newView);
    setSelectedYP(null);
    setSubmitted(false);
    setSessionMode(null);
    if (newView !== "start") setScheduleSessionContext(null);
  };

  const confirmNavAway = () => {
    setLiveSessionActive(false);
    setShowNavWarning(false);
    setSessionMode(null);
    if (pendingNav) {
      setView(pendingNav);
      setSelectedYP(null);
      setSubmitted(false);
      setPendingNav(null);
    }
  };

  const loadMentors = async () => {
    try {
      const data = await db.getMentors();
      if (data?.length) {
        setMentors(data);
        db.cacheAppData("mentors", data);
        return data;
      }
      throw new Error("empty");
    } catch {
      // Offline fallback
      const cached = await db.getCachedAppData("mentors");
      if (cached) setMentors(cached);
      return cached || [];
    }
  };

  const loadGroups = async () => {
    try {
      const data = await db.getSavedGroups();
      setSavedGroups(data);
      if (data?.length) db.cacheAppData("groups", data);
    } catch {
      const cached = await db.getCachedAppData("groups");
      if (cached) setSavedGroups(cached);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [yp, sess, groups] = await Promise.all([
        db.getYoungPeople(),
        currentUser.role === "admin"
          ? db.getSessions()
          : db.getSessionsForMentor(currentUser.id),
        db.getSavedGroups(),
      ]);
      setYoungPeople(yp);
      setSessions(sess);
      setSavedGroups(groups);
      // Cache for offline
      db.cacheAppData("youngPeople", yp);
      db.cacheAppData(`sessions_${currentUser.id}`, sess);
      db.cacheAppData("groups", groups);
    } catch {
      // Offline — use cached data
      const [yp, sess, groups] = await Promise.all([
        db.getCachedAppData("youngPeople"),
        db.getCachedAppData(`sessions_${currentUser.id}`),
        db.getCachedAppData("groups"),
      ]);
      if (yp) setYoungPeople(yp);
      if (sess) setSessions(sess);
      if (groups) setSavedGroups(groups);
    }
    // Update pending count
    try {
      const offlineDb = await import("@/lib/offlineDb");
      setPendingCount(await offlineDb.getAllPendingCount());
    } catch {}
  }, [currentUser]);

  // Load mentors on mount (for login screen)
  useEffect(() => {
    loadMentors().then(() => setLoading(false));
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      loadData().then(() => setLoading(false));
    }
  }, [currentUser, loadData]);

  const handleSessionSubmit = async () => {
    setSubmitted(true);
    setSessionMode(null);
    // Clear cached session plans for all YPs (they'll get fresh ones next time)
    try {
      Object.keys(localStorage).filter(k => k.startsWith("sf_plan_")).forEach(k => localStorage.removeItem(k));
    } catch {}
    await loadData();
    setTimeout(() => { setSubmitted(false); setView("home"); }, 2000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("home");
    setSelectedYP(null);
    setSessions([]);
    setSessionMode(null);
    try { localStorage.removeItem("sf_last_activity"); } catch {}
  };

  // ── Session timeout: auto-logout after 24 hours of inactivity ──
  useEffect(() => {
    if (!currentUser) return;
    const TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
    const ACTIVITY_KEY = "sf_last_activity";

    // Check if session has expired on mount
    try {
      const lastActivity = localStorage.getItem(ACTIVITY_KEY);
      if (lastActivity && (Date.now() - parseInt(lastActivity)) > TIMEOUT_MS) {
        handleLogout();
        return;
      }
    } catch {}

    // Record activity
    const recordActivity = () => {
      try { localStorage.setItem(ACTIVITY_KEY, Date.now().toString()); } catch {}
    };
    recordActivity(); // Record on mount

    // Listen for user interactions
    const events = ["touchstart", "mousedown", "keydown", "scroll"];
    const throttledRecord = (() => {
      let last = 0;
      return () => { const now = Date.now(); if (now - last > 60000) { last = now; recordActivity(); } };
    })();
    events.forEach(e => window.addEventListener(e, throttledRecord, { passive: true }));

    // Check every 5 minutes if we've timed out
    const interval = setInterval(() => {
      try {
        const lastActivity = localStorage.getItem(ACTIVITY_KEY);
        if (lastActivity && (Date.now() - parseInt(lastActivity)) > TIMEOUT_MS) {
          handleLogout();
        }
      } catch {}
    }, 5 * 60 * 1000);

    // Also check on visibility change (coming back after phone was locked for hours)
    const checkOnResume = () => {
      if (document.visibilityState === "visible") {
        try {
          const lastActivity = localStorage.getItem(ACTIVITY_KEY);
          if (lastActivity && (Date.now() - parseInt(lastActivity)) > TIMEOUT_MS) {
            handleLogout();
          }
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", checkOnResume);

    return () => {
      events.forEach(e => window.removeEventListener(e, throttledRecord));
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkOnResume);
    };
  }, [currentUser]);

  if (loading && !currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #059669 0%, #0D9488 30%, #2563EB 70%, #4F46E5 100%)", backgroundSize: "200% 200%", animation: "splashGradientShift 6s ease infinite", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <img src="/logo.png" alt="SilkFutures" style={{ width: 120, height: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", animation: "splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginTop: 14, animation: "splashTextIn 0.6s ease 0.3s both" }}>Pathways</div>
        <div style={{ marginTop: 32, display: "flex", gap: 6, animation: "splashTextIn 0.5s ease 0.6s both" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.6)", animation: `splashPulse 1.2s ease ${i * 0.2}s infinite` }} />)}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen mentors={mentors} onLogin={setCurrentUser} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #059669 0%, #0D9488 30%, #2563EB 70%, #4F46E5 100%)", backgroundSize: "200% 200%", animation: "splashGradientShift 6s ease infinite", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <img src="/logo.png" alt="SilkFutures" style={{ width: 120, height: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", animation: "splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginTop: 14, animation: "splashTextIn 0.6s ease 0.3s both" }}>Pathways</div>
        <div style={{ marginTop: 32, display: "flex", gap: 6, animation: "splashTextIn 0.5s ease 0.6s both" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.6)", animation: `splashPulse 1.2s ease ${i * 0.2}s infinite` }} />)}
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";

  // Desktop nav shows everything
  const desktopNavItems = [
    { label: "Home", val: "home", show: true },
    { label: "Dashboard", val: "dashboard", show: true },
    { label: "Start Session", val: "start", show: true },
    { label: "Check-In", val: "onboard", show: true },
    { label: "Settings", val: "settings", show: true },
  ];

  // Mobile nav - 5 items with Log Session in the centre
  const mobileNavItems = [
    { label: "Home", val: "home", icon: "⌂" },
    { label: "Dashboard", val: "dashboard", icon: "◉" },
    { label: "Log", val: "start", icon: "✎", isCenter: true },
    { label: "Check-In", val: "onboard", icon: "+" },
    { label: "Settings", val: "settings", icon: "⚙" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "0 0 80px" }}>
      {/* Offline / Sync indicator — only shows when offline or when genuinely syncing/synced */}
      {(isOffline || (syncStatus && (syncStatus.syncing ? pendingCount > 0 : syncStatus.synced > 0))) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 400,
          padding: "8px 16px",
          background: isOffline ? "#FEF3C7" : syncStatus?.syncing ? "#EDE9FE" : "#ECFDF5",
          borderBottom: `1px solid ${isOffline ? "#F59E0B40" : syncStatus?.syncing ? "#7C3AED30" : "#10B98130"}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontSize: 12, fontWeight: 600,
          color: isOffline ? "#92400E" : syncStatus?.syncing ? "#6D28D9" : "#065F46",
        }}>
          {isOffline ? (
            <>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
              Offline — {pendingCount > 0 ? `${pendingCount} session${pendingCount !== 1 ? "s" : ""} saved locally` : "sessions will be saved locally"}
            </>
          ) : syncStatus?.syncing ? (
            <>
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #7C3AED40", borderTopColor: "#7C3AED", animation: "spin 0.8s linear infinite" }} />
              Syncing {pendingCount} session{pendingCount !== 1 ? "s" : ""}...
            </>
          ) : (
            <>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
              {syncStatus?.synced ? `${syncStatus.synced} session${syncStatus.synced !== 1 ? "s" : ""} synced ✓` : `${pendingCount} pending`}
            </>
          )}
        </div>
      )}

      {/* Navigation warning when live session is active */}
      {showNavWarning && (
        <div onClick={() => setShowNavWarning(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", borderTop: `4px solid ${C.danger}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: C.danger }}>Leave live session?</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>You have an active session in progress. Leaving will lose all unsaved data.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNavWarning(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Stay in session</button>
              <button onClick={confirmNavAway} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Leave anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: "0 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)", zIndex: 100, height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-small.png" alt="SilkFutures" style={{ height: 40, width: "auto" }} />
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.1, textTransform: "uppercase", background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SILKFUTURES</div>
            <div style={{ fontSize: 9, color: C.light, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Pathways</div>
          </div>
        </div>

        {/* Desktop nav - hidden on mobile */}
        <div className="sf-desktop-nav" style={{ display: "flex", gap: 3, overflowX: "auto" }}>
          {desktopNavItems.filter(n => n.show).map(({ label, val }) => (
            <button key={val} onClick={() => safeNavigate(val)} style={{
              padding: "6px 13px", borderRadius: 100,
              border: `1px solid ${view === val ? C.accent : "transparent"}`,
              background: view === val ? C.gradient : "transparent",
              color: view === val ? "#fff" : C.muted,
              fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{isAdmin ? "Admin" : "Mentor"}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Sign out">↪</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 16px 100px", maxWidth: 1100, margin: "0 auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", paddingTop: 100 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: STEP_COLORS.Rebuild + "15", border: `1.5px solid ${STEP_COLORS.Rebuild}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22, color: STEP_COLORS.Rebuild }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Session logged</h2>
            <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Returning to home...</p>
          </div>
        ) : view === "start" ? (
          /* Start Session — choose Live or Log */
          liveSessionActive ? (
            <ProgrammeSelector
              youngPeople={youngPeople} mentors={mentors} currentUser={currentUser}
              sessions={sessions} savedGroups={savedGroups}
              onComplete={() => { setLiveSessionActive(false); setScheduleSessionContext(null); handleSessionSubmit(); }}
              onCancel={() => { setLiveSessionActive(false); setScheduleSessionContext(null); setView("home"); }}
              onSessionStart={() => setLiveSessionActive(true)}
              onGroupsChanged={loadGroups}
              scheduleContext={scheduleSessionContext}
            />
          ) : sessionMode === "log" ? (
            <AssessmentForm onSubmit={handleSessionSubmit} youngPeople={youngPeople} mentors={mentors} currentUser={currentUser} savedGroups={savedGroups} onGroupsChanged={loadGroups} />
          ) : (
            <div style={{ maxWidth: 500, margin: "0 auto", paddingTop: 40 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Start a Session</h2>
              <p style={{ color: C.muted, fontSize: 13, textAlign: "center", marginBottom: 28 }}>Choose how you want to record today's work</p>
              <div style={{ display: "grid", gap: 12 }}>
                <Card onClick={() => { setLiveSessionActive(true); }} style={{ cursor: "pointer", borderLeft: `4px solid ${C.accent}`, padding: "20px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Live Session</div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Guided flow — check-in, cards, session plan, feedback, wrap up. Use this during or right after a session.</div>
                    </div>
                    <span style={{ fontSize: 28, opacity: 0.4 }}>▶</span>
                  </div>
                </Card>
                <Card onClick={() => setSessionMode("log")} style={{ cursor: "pointer", borderLeft: "4px solid #7C3AED", padding: "20px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Log a Past Session</div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Quick form — enter scores, notes, and reflections. Use this to log a session after the fact.</div>
                    </div>
                    <span style={{ fontSize: 28, opacity: 0.4 }}>✎</span>
                  </div>
                </Card>
              </div>
            </div>
          )
        ) : view === "live" ? (
          <ProgrammeSelector
            youngPeople={youngPeople} mentors={mentors} currentUser={currentUser}
            sessions={sessions} savedGroups={savedGroups}
            onComplete={() => { setLiveSessionActive(false); handleSessionSubmit(); }}
            onCancel={() => { setLiveSessionActive(false); setView("home"); }}
            onSessionStart={() => setLiveSessionActive(true)}
            onGroupsChanged={loadGroups}
          />
        ) : view === "session" ? (
          <AssessmentForm onSubmit={handleSessionSubmit} youngPeople={youngPeople} mentors={mentors} currentUser={currentUser} savedGroups={savedGroups} onGroupsChanged={loadGroups} />
        ) : view === "onboard" ? (
          <CheckInFlow youngPeople={youngPeople} currentUser={currentUser} sessions={sessions} onComplete={() => { setCheckinInProgress(false); loadData(); setView("home"); }} onStartCheckin={() => setCheckinInProgress(true)} />
        ) : view === "export" && isAdmin ? (
          <FunderExport sessions={sessions} youngPeople={youngPeople} />
        ) : view === "admin" && isAdmin ? (
          <AdminPanel mentors={mentors} onRefresh={loadMentors} />
        ) : view === "settings" ? (
          <SettingsPage currentUser={currentUser} isAdmin={isAdmin} onNavigate={safeNavigate} sessions={sessions} youngPeople={youngPeople} mentors={mentors} onRefreshMentors={loadMentors} onLogout={handleLogout} onRefreshData={loadData} onSelectYP={(name) => { setSelectedYP(name); setView("dashboard"); }} savedGroups={savedGroups} onRefreshGroups={loadGroups} />
        ) : view === "home" ? (
          <HomeView sessions={sessions} youngPeople={youngPeople} mentors={mentors} currentUser={currentUser} onSelectYP={(name) => { setSelectedYP(name); setView("dashboard"); }} onNavigate={safeNavigate} onStartScheduledSession={(ctx) => { setScheduleSessionContext(ctx); setLiveSessionActive(true); setView("start"); }} />
        ) : selectedYP ? (
          <YoungPersonProfile
            name={selectedYP}
            sessions={sessions.filter(s => s.young_person_name === selectedYP)}
            onBack={() => setSelectedYP(null)}
            currentUser={currentUser}
            onRefresh={loadData}
          />
        ) : (
          <Dashboard sessions={sessions} youngPeople={youngPeople} mentors={mentors} onSelectYP={setSelectedYP} currentUser={currentUser} savedGroups={savedGroups} onRefresh={loadData} />
        )}
      </div>

      {/* Mobile bottom nav — clean 5 items, Start is centre */}
      <div className="sf-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)",
        borderTop: `1px solid ${C.border}`, zIndex: 100,
        display: "none", alignItems: "flex-end",
        padding: "0 8px calc(env(safe-area-inset-bottom, 8px) + 4px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", width: "100%", maxWidth: 400, margin: "0 auto" }}>
          {mobileNavItems.map(({ label, val, icon, isCenter }) => {
            const active = view === val;
            if (isCenter) {
              return (
                <button key={val} onClick={() => safeNavigate(val)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "8px 6px 4px", minWidth: 48,
                  color: active ? C.accent : C.muted,
                  opacity: active ? 1 : 0.7,
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                  <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>{label}</span>
                </button>
              );
            }
            return (
              <button key={val} onClick={() => safeNavigate(val)} style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "8px 6px 4px", minWidth: 48,
                color: active ? C.accent : C.muted,
                opacity: active ? 1 : 0.5,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
