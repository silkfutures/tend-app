"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { STEPS, STEP_COLORS, STEP_SUBTITLES, FORM_SECTIONS, PARTNER_ORGS, QUICK_FIELDS, SCALE_LABELS, SPARK_CARDS_CORE, SIGNAL_CARDS_CORE, PULSE_CARDS_64, ARRIVAL_QUESTIONS, YP_FEEDBACK_QUESTIONS, WRITING_PROMPTS, SESSION_ACTIVITIES, SIGNAL_CATEGORIES } from "@/lib/constants";
import { getLatestStage, computeStepAverages } from "@/lib/utils";
import * as db from "@/lib/db";

const C = {
  bg: "#FFFFFF", surface: "#FFFFFF", surfaceAlt: "#F5F5F5",
  border: "#E5E5E5", borderStrong: "#D4D4D4",
  accent: "#2563EB", accentDim: "#444444",
  text: "#0A0A0A", muted: "#888888", light: "#BBBBBB",
  danger: "#DC2626",
};

// ── PHASES ──
const PHASES = ["setup", "roll-call", "arrival", "session-type", "connect", "plan", "in-session", "feedback", "wrapup"];
const PHASE_LABELS = { setup: "Setup", "roll-call": "Roll Call", arrival: "Check-in", "session-type": "Session Type", connect: "Connect", plan: "Session Plan", "in-session": "In Session", feedback: "Feedback", wrapup: "Wrap Up" };

// ── Small UI ──
function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}
function StepBadge({ step }) {
  const color = STEP_COLORS[step] || C.accent;
  return <span style={{ background: color + "12", color, border: `1px solid ${color}35`, borderRadius: 4, padding: "3px 9px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{step}</span>;
}
function Spinner({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: C.accent, margin: "0 auto 14px", animation: "spin 0.8s linear infinite" }} />
      <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
      <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
    </div>
  );
}
function PhaseIndicator({ current, phases, onEndSession, showConfirm, onCancelEnd, onConfirmEnd }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {showConfirm && (
        <div onClick={onCancelEnd} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", borderTop: "4px solid #DC2626", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#DC2626" }}>End session?</h3>
            <p style={{ fontSize: 13, color: "#8A8278", lineHeight: 1.6, margin: "0 0 20px" }}>You'll lose your progress. Any data not yet saved will be lost.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onCancelEnd} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #E5E0D8", background: "transparent", color: "#8A8278", fontSize: 13, cursor: "pointer" }}>Keep going</button>
              <button onClick={onConfirmEnd} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>End session</button>
            </div>
          </div>
        </div>
      )}
      {onEndSession && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onEndSession} style={{ padding: "4px 12px", borderRadius: 100, border: "1px solid #DC262640", background: "transparent", color: "#DC2626", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>End Session</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        {phases.map((p, i) => (
          <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: 3, borderRadius: 2, background: i <= PHASES.indexOf(current) ? C.accent : C.border, transition: "background 0.3s" }} />
            <span style={{ fontSize: 9, color: i <= PHASES.indexOf(current) ? C.accent : C.light, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{PHASE_LABELS[p]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RATING INPUT (for wrap-up) ──
function RatingInput({ value, onChange, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 36, height: 36, borderRadius: "50%",
          border: `1.5px solid ${value === n ? C.accent : C.border}`,
          background: value === n ? C.accent : "transparent",
          color: value === n ? C.surface : C.muted,
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>{n}</button>
      ))}
      {value && max === 5 && <span style={{ fontSize: 10, color: C.muted, marginLeft: 4, fontStyle: "italic" }}>{SCALE_LABELS[value]}</span>}
    </div>
  );
}

// ════════════════════════════════════════════
// LIVE SESSION COMPONENT
// ════════════════════════════════════════════

export default function LiveSession({ youngPeople, mentors, currentUser, sessions, savedGroups, onComplete, onCancel, onGroupsChanged, scheduleContext }) {
  const [phase, setPhase] = useState("setup");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [crashError, setCrashError] = useState(null);

  // ── Session persistence (survives phone lock / tab kill) ──
  const SAVE_KEY = "sf_live_session_" + currentUser.id;

  // ── Setup state ──
  const [isGroup, setIsGroup] = useState(false);
  const [selectedYP, setSelectedYP] = useState([]);
  const [coMentors, setCoMentors] = useState([]);
  const [location, setLocation] = useState(scheduleContext?.location || "");
  const [selectedSavedGroup, setSelectedSavedGroup] = useState(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [allYP, setAllYP] = useState(youngPeople);
  const [groupName, setGroupName] = useState("");
  const [ypSearchFilter, setYPSearchFilter] = useState("");

  // Auto-select YP from schedule context on mount
  useEffect(() => {
    if (scheduleContext?.ypName && selectedYP.length === 0 && phase === "setup" && !showResumePrompt) {
      const match = youngPeople.find(yp => yp.name === scheduleContext.ypName);
      if (match) {
        setSelectedYP([match]);
        if (scheduleContext.location) setLocation(scheduleContext.location);
      }
    }
  }, [scheduleContext, youngPeople, showResumePrompt]);

  // ── Session state ──
  const [startTime, setStartTime] = useState(new Date());
  const [customStartTime, setCustomStartTime] = useState("");
  const [focusStep, setFocusStep] = useState("Reset");
  const [reconnectData, setReconnectData] = useState(null);
  const [connectData, setConnectData] = useState(null); // merged reconnect + card data
  const [planData, setPlanData] = useState(null);
  const [cardType, setCardType] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardResponses, setCardResponses] = useState([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [arrivalData, setArrivalData] = useState({});
  const [currentArrivalIdx, setCurrentArrivalIdx] = useState(0);
  const [sessionType, setSessionType] = useState(null);
  const [selectedSignalCategory, setSelectedSignalCategory] = useState(null);
  const [writingPrompt, setWritingPrompt] = useState(null);
  const [sessionActivity, setSessionActivity] = useState(null);

  // ── In-Session presence mode state ──
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [liveNotes, setLiveNotes] = useState("");
  const [showPlanRef, setShowPlanRef] = useState(false);
  const [showSignalDrawer, setShowSignalDrawer] = useState(false);
  const [drawnSignalCards, setDrawnSignalCards] = useState([]);
  const [signalResponse, setSignalResponse] = useState("");

  // ── In-session timer (must be top-level, not conditional) ──
  useEffect(() => {
    if (!sessionStartTime || phase !== "in-session") return;
    const interval = setInterval(() => setSessionElapsed(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, phase]);

  // ── Wrapup state ──
  const [scores, setScores] = useState({});
  const [quick, setQuick] = useState({});
  const [notes, setNotes] = useState("");
  const [mentorReflection, setMentorReflection] = useState("");
  const [safeguarding, setSafeguarding] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enhancingNotes, setEnhancingNotes] = useState(false);
  const [wrapStep, setWrapStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef(null);

  // ── Song upload state ──
  const [songs, setSongs] = useState([]);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongFile, setNewSongFile] = useState(null);
  const [songUploading, setSongUploading] = useState(false);

  // ── Media state ──
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  // ── Feedback state ──
  const [savedSessionIds, setSavedSessionIds] = useState([]);
  const [ypFeedback, setYpFeedback] = useState({});
  const [currentFeedbackIdx, setCurrentFeedbackIdx] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const saveSessionState = useCallback(() => {
    // Only save once we've moved past setup
    if (phase === "setup") return;
    try {
      const state = {
        phase, selectedYP: selectedYP.map(y => ({ id: y.id, name: y.name })),
        isGroup, coMentors: coMentors.map(m => ({ id: m.id, name: m.name })),
        location, startTime: startTime.toISOString(), customStartTime,
        focusStep, sessionType, cardType,
        cardResponses, currentCardIdx, currentAnswer,
        arrivalData, currentArrivalIdx,
        scores, quick, notes, mentorReflection, safeguarding,
        wrapStep, writingPrompt, selectedSignalCategory,
        reconnectData, planData, groupName,
        songs: songs.filter(s => s.url).map(s => ({ title: s.title, url: s.url })),
        mediaFiles: mediaFiles.filter(m => m.url).map(m => ({ url: m.url, mediaType: m.mediaType, caption: m.caption })),
        ypFeedback, feedbackSubmitted,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) { console.warn("Session save failed:", e); }
  }, [phase, selectedYP, isGroup, coMentors, location, startTime, customStartTime,
      focusStep, sessionType, cardType, cardResponses, currentCardIdx, currentAnswer,
      arrivalData, currentArrivalIdx, scores, quick, notes, mentorReflection,
      safeguarding, wrapStep, writingPrompt, selectedSignalCategory,
      reconnectData, planData, songs, mediaFiles, ypFeedback, feedbackSubmitted, groupName, SAVE_KEY]);

  const clearSavedSession = useCallback(() => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  }, [SAVE_KEY]);

  // Check for saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only offer resume if saved within last 12 hours
        const savedAt = new Date(state.savedAt);
        const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12 && state.phase !== "setup") {
          setPendingRestore(state);
          setShowResumePrompt(true);
        } else {
          clearSavedSession();
        }
      }
    } catch (e) {
      console.error("[LiveSession] Failed to load saved session:", e);
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      clearSavedSession();
    }
  }, []);

  // Auto-save whenever phase or key data changes (debounced via effect)
  useEffect(() => {
    if (phase === "setup" || showResumePrompt) return;
    const timer = setTimeout(() => saveSessionState(), 500);
    return () => clearTimeout(timer);
  }, [phase, scores, quick, notes, mentorReflection, safeguarding, cardResponses,
      arrivalData, ypFeedback, wrapStep, currentCardIdx, saveSessionState, showResumePrompt]);

  // Restore saved session
  const restoreSession = () => {
    if (!pendingRestore) return;
    const s = pendingRestore;
    // Rehydrate selected YP from current youngPeople list
    const restoredYP = s.selectedYP.map(saved => youngPeople.find(yp => yp.id === saved.id) || saved).filter(Boolean);
    setSelectedYP(restoredYP);
    setIsGroup(s.isGroup || false);
    setCoMentors((s.coMentors || []).map(saved => mentors.find(m => m.id === saved.id) || saved).filter(Boolean));
    setLocation(s.location || "");
    setStartTime(new Date(s.startTime));
    setCustomStartTime(s.customStartTime || "");
    setFocusStep(s.focusStep || "Reset");
    setSessionType(s.sessionType || null);
    setCardType(s.cardType || null);
    setCardResponses(s.cardResponses || []);
    setCurrentCardIdx(s.currentCardIdx || 0);
    setCurrentAnswer(s.currentAnswer || "");
    setArrivalData(s.arrivalData || {});
    setCurrentArrivalIdx(s.currentArrivalIdx || 0);
    setScores(s.scores || {});
    setQuick(s.quick || {});
    setNotes(s.notes || "");
    setMentorReflection(s.mentorReflection || "");
    setSafeguarding(s.safeguarding || "");
    setWrapStep(s.wrapStep || 0);
    setWritingPrompt(s.writingPrompt || null);
    setSelectedSignalCategory(s.selectedSignalCategory || null);
    setReconnectData(s.reconnectData || null);
    setPlanData(s.planData || null);
    setGroupName(s.groupName || "");
    setSongs((s.songs || []).map(song => ({ ...song, file: null, uploading: false })));
    setMediaFiles(s.mediaFiles || []);
    setYpFeedback(s.ypFeedback || {});
    setFeedbackSubmitted(s.feedbackSubmitted || false);
    setPhase(s.phase);
    setShowResumePrompt(false);
    setPendingRestore(null);
  };

  const discardSavedSession = () => {
    clearSavedSession();
    setShowResumePrompt(false);
    setPendingRestore(null);
  };

  // Wrap onCancel to clear saved state
  const handleCancel = () => {
    clearSavedSession();
    onCancel();
  };

  // Prevent accidental navigation away during active session
  useEffect(() => {
    if (phase !== "setup") {
      const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
      window.addEventListener("beforeunload", handler);
      // Save on visibility change (phone lock) and pagehide (tab kill)
      const saveOnHide = () => { if (document.visibilityState === "hidden") saveSessionState(); };
      const saveOnPageHide = () => saveSessionState();
      document.addEventListener("visibilitychange", saveOnHide);
      window.addEventListener("pagehide", saveOnPageHide);
      return () => {
        window.removeEventListener("beforeunload", handler);
        document.removeEventListener("visibilitychange", saveOnHide);
        window.removeEventListener("pagehide", saveOnPageHide);
      };
    }
  }, [phase, saveSessionState]);

  // ── Auto-detect focus step based on selected young people ──
  useEffect(() => {
    if (selectedYP.length === 0) return;
    // Use the lowest stage among selected YP
    const stages = selectedYP.map(yp => {
      const ypSessions = sessions.filter(s => s.young_person_name === yp.name);
      return getLatestStage(ypSessions);
    });
    const stageIndices = stages.map(s => STEPS.indexOf(s));
    const lowestIdx = Math.min(...stageIndices);
    setFocusStep(STEPS[lowestIdx] || "Reset");
  }, [selectedYP, sessions]);

  // ── SETUP PHASE ──
  const toggleYP = (yp) => {
    setSelectedYP(prev => prev.find(p => p.id === yp.id) ? prev.filter(p => p.id !== yp.id) : [...prev, yp]);
  };

  const addNewPerson = async () => {
    if (!newPersonName.trim()) return;
    const { data } = await db.createYoungPerson(newPersonName.trim());
    if (data) {
      setAllYP(prev => [...prev, data]);
      setSelectedYP(prev => [...prev, data]);
      setNewPersonName("");
    }
  };

  const loadSavedGroup = (group) => {
    if (selectedSavedGroup?.id === group.id) {
      setSelectedSavedGroup(null);
      setGroupName("");
      setSelectedYP([]);
    } else {
      setSelectedSavedGroup(group);
      setGroupName(group.name);
      const members = allYP.filter(yp => group.member_ids?.includes(yp.id));
      setSelectedYP(members);
    }
  };

  const canStartSession = selectedYP.length > 0 && location.trim();
  const [startingSession, setStartingSession] = useState(false);

  const startSession = async () => {
    if (!canStartSession || startingSession) return;
    setStartingSession(true);
    // If custom start time set, use it
    if (customStartTime) {
      const [h, m] = customStartTime.split(":");
      const d = new Date(); d.setHours(parseInt(h), parseInt(m), 0, 0);
      setStartTime(d);
    }
    // Save or update group if named
    if (isGroup && groupName.trim() && selectedYP.length > 0) {
      const memberIds = selectedYP.map(yp => yp.id);
      try {
        if (selectedSavedGroup) {
          await db.updateSavedGroup(selectedSavedGroup.id, memberIds);
        } else {
          await db.createSavedGroup(groupName.trim(), memberIds);
        }
        if (onGroupsChanged) onGroupsChanged();
      } catch (e) { console.warn("Group save failed:", e); }
    }
    // For group sessions, go to roll call first
    if (isGroup && selectedYP.length > 1) {
      setPhase("roll-call");
    } else {
      setPhase("arrival");
    }
    setStartingSession(false);
  };

  // Move from arrival to reconnect
  const finishArrival = async () => {
    setPhase("session-type");
  };

  const finishSessionType = async (type) => {
    setSessionType(type);
    if (type === "non-music") {
      // Non-music: show conversation points based on pathway stage, then feedback → wrap up
      setPhase("connect");
      setCardType("non-music-convo");
      return;
    }
    // For YP-led, proceed through normal connect flow (don't set cardType to reading-signal)
    // Signal themes will be available in In Session phase instead
    setLoading(true);
    setPhase("connect");

    // Get latest session data for the primary YP (or first in group)
    const primaryYP = selectedYP[0];
    const musicSessions = sessions.filter(s => s.young_person_name === primaryYP.name && (s.partner_org || s.partnerOrg || "") !== "Set Pace");
    const lastSession = musicSessions.length > 0 ? musicSessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : await db.getLatestSessionForYP(primaryYP.name);
    const ypSessions = sessions.filter(s => s.young_person_name === primaryYP.name);
    const sessionCount = ypSessions.length;
    const stage = getLatestStage(ypSessions);
    setFocusStep(stage);

    const isFirstSession = !lastSession || sessionCount <= 1;

    // Pick a session activity based on focus step
    const activities = SESSION_ACTIVITIES[stage] || SESSION_ACTIVITIES.Reset;
    const weights = {
      Reset: { conversation: 4, listening: 3, "voice-note": 2, freewrite: 2, "pulse-card": 1, songwriting: 1 },
      Reframe: { conversation: 3, "pulse-card": 3, listening: 2, freewrite: 2, songwriting: 2 },
      Rebuild: { songwriting: 4, recording: 3, freewrite: 2, collaboration: 2, conversation: 1 },
      Release: { songwriting: 3, review: 3, recording: 2, "peer-work": 2, conversation: 2 },
      Rise: { "peer-work": 4, songwriting: 2, review: 2, recording: 2, conversation: 2 },
    };
    const stageWeights = weights[stage] || weights.Reset;
    const weighted = [];
    activities.forEach(a => { const w = stageWeights[a.type] || 1; for (let i = 0; i < w; i++) weighted.push(a); });
    const picked = weighted[Math.floor(Math.random() * weighted.length)];
    setSessionActivity(picked);
    setWritingPrompt(picked.prompt);

    // Fetch merged connect data from API
    try {
      const data = await db.fetchReconnectPrompts({
        youngPerson: isGroup ? selectedYP.map(y => y.name).join(", ") : primaryYP.name,
        stage,
        lastNotes: lastSession?.notes || "",
        lastDate: lastSession?.date || "",
        lastMentorReflection: lastSession?.mentor_reflection || "",
        isGroup,
        participants: isGroup ? selectedYP.map(y => y.name) : undefined,
      });
      // For first sessions, limit talking points; for established, include more context
      if (isFirstSession) {
        setConnectData({ ...data, talkingPoints: data.talkingPoints?.slice(0, 2), sessionCount: 0 });
      } else if (sessionCount <= 5) {
        setConnectData({ ...data, talkingPoints: data.talkingPoints?.slice(0, 1), sessionCount });
      } else {
        setConnectData({ ...data, talkingPoints: data.talkingPoints?.slice(0, 2), sessionCount });
      }
    } catch (e) {
      setConnectData({
        talkingPoints: isFirstSession ? ["What kind of music are you into right now?"] : ["How have things been?"],
        mentorReminder: isFirstSession ? "First session — just connect, no pressure." : "Follow their lead.",
        sessionCount,
      });
    }
    setLoading(false);
  };

  // ── PLAN PHASE ──
  const loadPlan = async (withCardResponses) => {
    setLoading(true);
    const primaryYP = selectedYP[0];
    const ypSessions = sessions.filter(s => s.young_person_name === primaryYP.name && (s.partner_org || s.partnerOrg || "") !== "Set Pace");
    const latestScores = ypSessions[0]?.step_averages || {};
    const scoreStr = STEPS.map(s => latestScores[s] ? `${s}: ${latestScores[s]}` : null).filter(Boolean).join(", ");

    // Build context: prioritise TODAY'S writing prompt + unpacking answers
    let contextNotes = "";
    if (writingPrompt) {
      contextNotes = `TODAY'S WRITING PROMPT: "${writingPrompt}"\n`;
      const promptAnswers = (withCardResponses || []).filter(r => r.cardType === "prompt");
      if (promptAnswers.length > 0) {
        contextNotes += "YOUNG PERSON'S RESPONSES TO UNPACKING QUESTIONS:\n";
        contextNotes += promptAnswers.map(r => `Q: ${r.question}\nA: "${r.answer}"`).join("\n");
        contextNotes += "\n\nIMPORTANT: Build the session plan around this writing prompt and their answers. The session should help them write and record a song based on this prompt.";
      } else {
        contextNotes += "IMPORTANT: Build the session plan around this writing prompt. The session should help them explore this theme and write/record a song about it.";
      }
    } else {
      // Fallback to recent session notes for YP-led or other session types
      contextNotes = ypSessions.slice(0, 3).map(s => `${s.date}: ${(s.notes || "").slice(0, 300)}`).join("\n") || "No recent session notes";
    }

    // Add signal reading responses if YP-led
    const signalAnswers = (withCardResponses || []).filter(r => r.cardType === "signal-reading");
    if (signalAnswers.length > 0) {
      contextNotes += "\n\nSIGNAL READING RESPONSES (from listening to their prepared work):\n";
      contextNotes += signalAnswers.map(r => `Q: ${r.question}\nA: "${r.answer}"`).join("\n");
      contextNotes += "\n\nIMPORTANT: The young person brought prepared work. Build the session around refining what they've already made based on these signal responses.";
    }

    try {
      const data = await db.fetchSessionPlan({
        youngPerson: isGroup ? selectedYP.map(y => y.name).join(", ") : primaryYP.name,
        stage: focusStep,
        scores: scoreStr || "No scores yet",
        recentNotes: contextNotes,
        cardResponses: withCardResponses || [],
        isGroup,
        participants: isGroup ? selectedYP.map(y => y.name) : undefined,
      });
      setPlanData(data);
    } catch (e) {
      setPlanData({ sessionAim: "Work with where they are today", theme: "Follow the thread", openingActivity: { title: "Free flow", duration: "10 mins", description: "Start with what feels natural" }, mainActivity: { title: "Studio time", duration: "30 mins", description: "Build on whatever emerges" }, closingActivity: { title: "Wind down", duration: "5 mins", description: "Reflect and close" }, mentorNote: "Stay present." });
    }
    setLoading(false);
  };

  const moveToCards = () => {
    setPhase("connect");
    setCardType(null);
    setCards([]);
    setCurrentCardIdx(0);
    setCardResponses([]);
  };

  // ── CARDS PHASE ──
  const loadCards = async (type) => {
    setCardType(type);
    setLoading(true);

    let coreDeck;
    if (type === "pulse") {
      coreDeck = [...PULSE_CARDS_64];
    } else if (type === "signal") {
      coreDeck = SIGNAL_CARDS_CORE.filter(c => {
        const stageIdx = STEPS.indexOf(focusStep);
        const cardStageIdx = STEPS.indexOf(c.stage);
        return cardStageIdx <= stageIdx;
      });
    } else {
      coreDeck = [...SPARK_CARDS_CORE];
    }

    // Shuffle and pick 3 to present as choices
    const shuffled = coreDeck.sort(() => Math.random() - 0.5);
    const selection = shuffled.slice(0, 3);

    // Also get AI-generated contextual cards
    if (type !== "pulse") {
      const primaryYP = selectedYP[0];
      const ypSessions = sessions.filter(s => s.young_person_name === primaryYP.name);
      try {
        const data = await db.fetchCards({
          youngPerson: isGroup ? selectedYP.map(y => y.name).join(", ") : primaryYP.name,
          stage: focusStep, cardType: type,
          recentNotes: ypSessions[0]?.notes || "",
          previousResponses: cardResponses,
          isGroup, participants: isGroup ? selectedYP.map(y => y.name) : undefined,
        });
        const aiCards = (data.cards || []).slice(0, 2);
        setCards([...selection, ...aiCards]);
      } catch (e) { setCards(selection); }
    } else {
      setCards(selection);
    }

    setCurrentCardIdx(0);
    setCurrentAnswer("");
    setLoading(false);
  };

  const refreshCards = () => {
    if (cardType) loadCards(cardType);
  };

  const submitCardAnswer = () => {
    if (!currentAnswer.trim()) return;
    const card = cards[currentCardIdx];
    setCardResponses(prev => [...prev, { question: card.question, answer: currentAnswer.trim(), cardType, mapsTo: card.mapsTo }]);
    setCurrentAnswer("");
    if (currentCardIdx < cards.length - 1) {
      setCurrentCardIdx(prev => prev + 1);
    }
  };

  const finishCards = () => {
    setPhase("plan");
    loadPlan(cardResponses);
  };

  const skipToWrapup = () => { setPhase("wrapup"); setWrapStep(0); };

  // ── AI ENHANCE NOTES ──
  const enhanceNotes = async () => {
    if (!notes.trim() && !mentorReflection.trim()) return;
    setEnhancingNotes(true);
    try {
      const cardSummary = cardResponses.length > 0
        ? cardResponses.map(r => `[${r.cardType.toUpperCase()}] ${r.question} → "${r.answer}"`).join("\n")
        : "";
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "enhance-notes",
          name: selectedYP.map(yp => yp.name).join(", "),
          stage: focusStep,
          rawNotes: notes,
          rawReflection: mentorReflection,
          cardResponses: cardSummary,
          focusStep,
        }),
      });
      const data = await res.json();
      if (data.enhancedNotes) setNotes(data.enhancedNotes);
      if (data.enhancedReflection) setMentorReflection(data.enhancedReflection);
    } catch (e) { console.error("Enhancement failed:", e); }
    setEnhancingNotes(false);
  };

  // ── VOICE REFLECTION ──
  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition not supported in this browser. Try Chrome or Safari."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    let finalTranscript = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setVoiceTranscript(finalTranscript + interim);
    };
    recognition.onerror = (e) => { console.warn("Speech error:", e.error); if (e.error !== "no-speech") stopVoiceRecording(); };
    recognition.onend = () => { if (isRecording) recognition.start(); }; // Keep going until manually stopped
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setVoiceTranscript("");
  };

  const stopVoiceRecording = async () => {
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); }
    setIsRecording(false);
    const transcript = voiceTranscript.trim();
    if (!transcript) return;
    // Send to AI to split into the 3 boxes
    setVoiceProcessing(true);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "voice-reflection",
          transcript,
          name: selectedYP.map(yp => yp.name).join(", "),
          stage: focusStep,
        }),
      });
      const data = await res.json();
      if (data.notes) setNotes(prev => prev ? prev + "\n\n" + data.notes : data.notes);
      if (data.reflection) setMentorReflection(prev => prev ? prev + "\n\n" + data.reflection : data.reflection);
      if (data.safeguarding) setSafeguarding(prev => prev ? prev + "\n\n" + data.safeguarding : data.safeguarding);
    } catch (e) { console.error("Voice processing failed:", e); setNotes(prev => prev ? prev + "\n\n" + transcript : transcript); }
    setVoiceProcessing(false);
    setVoiceTranscript("");
  };

  // ── WRAPUP / SUBMIT ──
  const handleSubmit = async () => {
    // Prevent submit while song is uploading
    if (songUploading) {
      alert("Please wait for the track upload to finish.");
      return;
    }
    // Require all uploaded songs to be named by the mentor
    // (Removed — tracks auto-named from filename, mentor can rename if they want)
    setSubmitting(true);
    const stepAverages = computeStepAverages(scores);
    const endTime = new Date();
    const durationMins = Math.round((endTime - startTime) / 60000);
    const sessionLength = durationMins < 45 ? "30 mins" : durationMins < 75 ? "1 Hour" : durationMins < 105 ? "1.5 Hours" : "2 Hours";

    let enrichedNotes = "";
    // Add arrival check-in data (per-YP for groups)
    const arrivalKeys = Object.keys(arrivalData);
    if (arrivalKeys.length > 0) {
      const isGroupArrival = selectedYP.length > 1;
      if (isGroupArrival) {
        const arrivalLines = selectedYP.map(yp => {
          const ypData = arrivalData[yp.id] || {};
          if (Object.keys(ypData).length === 0) return null;
          const summary = Object.entries(ypData).map(([k, v]) => {
            const label = k.replace("arrival_", "").charAt(0).toUpperCase() + k.replace("arrival_", "").slice(1);
            return `${label}: ${v?.label || v?.emoji || v} (${v?.value || "?"}/4)`;
          }).join(" · ");
          return `${yp.name}: ${summary}`;
        }).filter(Boolean).join("\n");
        if (arrivalLines) enrichedNotes = `--- Check-in ---\n${arrivalLines}\n\n`;
      } else {
        // Single YP — use __single__ key or flat data
        const singleData = arrivalData["__single__"] || arrivalData;
        const arrivalSummary = Object.entries(singleData).map(([k, v]) => {
          const label = k.replace("arrival_", "").charAt(0).toUpperCase() + k.replace("arrival_", "").slice(1);
          return `${label}: ${v?.label || v?.emoji || v} (${v?.value || "?"}/4)`;
        }).join(" · ");
        if (arrivalSummary) enrichedNotes = `--- Check-in ---\n${arrivalSummary}\n\n`;
      }
    }
    enrichedNotes += notes;
    if (cardResponses.length > 0) {
      const cardSummary = cardResponses.map(r => `[${r.cardType.toUpperCase()}] ${r.question} → "${r.answer}"`).join("\n");
      enrichedNotes = `${notes}\n\n--- Card Responses ---\n${cardSummary}`;
    }
    if (songs.length > 0) {
      const songList = songs.filter(s => s.url).map(s => `Title: ${s.title || "Untitled"}\nURL: ${s.url}`).join("\n\n");
      enrichedNotes = `${enrichedNotes}\n\n--- Songs (${songs.filter(s => s.url).length}) ---\n${songList}`;
    }
    if (mediaFiles.length > 0) {
      const mediaList = mediaFiles.map(m => `${m.mediaType}: ${m.url}${m.caption ? " — " + m.caption : ""}`).join("\n");
      enrichedNotes = `${enrichedNotes}\n\n--- Media ---\n${mediaList}`;
    }

    const ids = [];
    const groupId = selectedYP.length > 1 ? crypto.randomUUID() : null;
    const isGroupSave = selectedYP.length > 1;

    // Merge same-day check-in questionnaires into notes
    if (!isGroupSave && selectedYP[0]) {
      try {
        const checkins = await db.getCheckinsForYP(selectedYP[0].id);
        const sessionDate = startTime.toISOString().split("T")[0];
        const todayCheckin = checkins.find(c => c.status === "completed" && c.completed_at && c.completed_at.split("T")[0] === sessionDate);
        if (todayCheckin && todayCheckin.questions?.length && todayCheckin.responses) {
          const checkinSummary = todayCheckin.questions.map(q => {
            const answer = todayCheckin.responses[q.id];
            if (answer === undefined || answer === null) return null;
            const displayAnswer = typeof answer === "object" ? (answer.label || answer.emoji || JSON.stringify(answer)) : answer;
            return `${q.question || q.text}: ${displayAnswer}`;
          }).filter(Boolean).join("\n");
          if (checkinSummary) {
            enrichedNotes = `${enrichedNotes}\n\n--- Check-In Questionnaire ---\n${checkinSummary}`;
          }
        }
      } catch (e) { console.warn("Checkin merge failed:", e); }
    }

    for (const yp of selectedYP) {
      const ypArrival = isGroupSave ? (arrivalData[yp.id] || {}) : (arrivalData["__single__"] || arrivalData);
      const ypFb = isGroupSave ? (ypFeedback[yp.id] || {}) : (ypFeedback["__single__"] || ypFeedback);
      const sessionPayload = {
        mentorId: currentUser.id,
        youngPersonId: yp.id,
        date: startTime.toISOString().split("T")[0],
        focusStep,
        sessionLength,
        partnerOrg: location,
        isGroup: isGroupSave,
        groupId,
        scores,
        quick,
        stepAverages,
        notes: enrichedNotes,
        mentorReflection,
        safeguarding,
        coMentorIds: coMentors.map(m => m.id),
        notificationPayload: {
          mentorName: currentUser.name,
          youngPersonName: yp.name,
          date: startTime.toISOString().split("T")[0],
          focusStep, sessionLength, partnerOrg: location,
          isGroup: isGroupSave,
          quick, stepAverages,
          notes: enrichedNotes, mentorReflection, safeguarding,
          songUrl: songs[0]?.url || "", songTitle: songs[0]?.title || "",
          sessionType: sessionType || "",
          arrivalData: ypArrival,
          feedbackData: ypFb,
        },
        ypFeedback: Object.keys(ypFb).length > 0 ? ypFb : null,
      };
      const { data, queued } = await db.createSessionOfflineAware(sessionPayload);
      if (data?.id) ids.push({ sessionId: data.id, ypId: yp.id, ypName: yp.name, offline: queued });
    }

    // Send notifications only for online saves
    if (ids.length > 0 && !ids[0].offline) {
      db.sendSessionNotifications({
        mentorName: currentUser.name,
        youngPersonName: selectedYP.map(yp => yp.name).join(", "),
        date: startTime.toISOString().split("T")[0],
        focusStep, sessionLength, partnerOrg: location,
        isGroup: selectedYP.length > 1,
        quick, stepAverages,
        notes: enrichedNotes, mentorReflection, safeguarding,
        songUrl: songs[0]?.url || "", songTitle: songs[0]?.title || "",
        sessionType: sessionType || "",
        arrivalData: arrivalData || {},
        feedbackData: ypFeedback || {},
      });
    }

    // Create safeguarding case once (not per-YP)
    if (safeguarding?.trim() && ids.length > 0 && !ids[0].offline) {
      db.createSafeguardingCaseIfNeeded({
        sessionId: ids[0].sessionId, youngPersonId: ids[0].ypId, mentorId: currentUser.id,
        date: startTime.toISOString().split("T")[0], safeguarding, notes: enrichedNotes,
      });
    }

    setSavedSessionIds(ids);

    // Save YP feedback if collected (only for online saves — offline ones bundle it)
    const hasYPFeedback = Object.keys(ypFeedback).length > 0;
    if (hasYPFeedback && ids.length > 0 && !ids[0].offline) {
      const isGroupFb = selectedYP.length > 1;
      for (const { sessionId, ypId } of ids) {
        // Get the right feedback data for this YP
        const fbData = isGroupFb ? (ypFeedback[ypId] || {}) : (ypFeedback["__single__"] || ypFeedback);
        if (Object.keys(fbData).length > 0) {
          try {
            await db.saveYPFeedback({ sessionId, youngPersonId: ypId, responses: fbData });
          } catch (e) { console.error("Failed to save YP feedback:", e); }
        }
      }
    }

    // Save arrival data as part of session metadata
    if (Object.keys(arrivalData).length > 0 && ids.length > 0) {
      // Arrival data is already captured — could extend session table later
      console.log("Arrival data captured:", arrivalData);
    }

    setSubmitting(false);
    clearSavedSession();
    onComplete();
  };

  // ── SUBMIT YP FEEDBACK ──
  const handleFeedbackSubmit = async () => {
    // Just save feedback data in state — it gets persisted when session is saved in wrapup
    setFeedbackSubmitted(true);
    setTimeout(() => { setPhase("wrapup"); setWrapStep(0); }, 500);
  };

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  const stageColor = STEP_COLORS[focusStep] || C.accent;

  // End session confirmation modal
  const EndSessionModal = () => showEndConfirm ? (
    <div onClick={() => setShowEndConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%", borderTop: `4px solid ${C.danger}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: C.danger }}>End session?</h3>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>You'll lose your progress. Any data not yet saved will be lost.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowEndConfirm(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Keep going</button>
          <button onClick={handleCancel} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>End session</button>
        </div>
      </div>
    </div>
  ) : null;

  // Floating end session button (shows after setup)
  const EndSessionButton = () => phase !== "setup" ? (
    <button onClick={() => setShowEndConfirm(true)} style={{
      position: "fixed", top: 12, right: 12, zIndex: 150,
      padding: "6px 14px", borderRadius: 100,
      background: "rgba(247,245,242,0.95)", backdropFilter: "blur(8px)",
      border: `1px solid ${C.border}`, color: C.danger,
      fontSize: 11, fontWeight: 700, cursor: "pointer",
    }}>End Session</button>
  ) : null;

  // ── RESUME PROMPT ──
  if (showResumePrompt && pendingRestore) {
    const savedAt = new Date(pendingRestore.savedAt);
    const ypNames = (pendingRestore.selectedYP || []).map(y => y.name).join(", ");
    const phaseName = PHASE_LABELS[pendingRestore.phase] || pendingRestore.phase;
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#7C3AED15", border: "1.5px solid #7C3AED40", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>↻</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Resume session?</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: "0 0 6px" }}>
          You have an unfinished session with <strong style={{ color: C.text }}>{ypNames}</strong>
        </p>
        <p style={{ fontSize: 12, color: C.light, margin: "0 0 28px" }}>
          Saved at {savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · Phase: {phaseName}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={discardSavedSession} style={{
            padding: "14px 28px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer",
          }}>Start Fresh</button>
          <button onClick={restoreSession} style={{
            padding: "14px 28px", borderRadius: 10, border: "none",
            background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>Resume →</button>
        </div>
      </div>
    );
  }

  // ── SETUP ──
  if (phase === "setup") {
    const otherMentors = mentors.filter(m => m.id !== currentUser.id);
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Start Session</h2>
          <button onClick={handleCancel} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
        </div>

        {/* Individual or Group */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[{ label: "Individual", val: false }, { label: "Group", val: true }].map(({ label, val }) => (
            <button key={label} onClick={() => { setIsGroup(val); setSelectedYP([]); setSelectedSavedGroup(null); }} style={{
              flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `2px solid ${isGroup === val ? C.accent : C.border}`,
              background: isGroup === val ? C.accent : "transparent",
              color: isGroup === val ? C.bg : C.muted,
            }}>{label}</button>
          ))}
        </div>

        {/* Location */}
        <Card style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Location / Partner Org</label>
          <select value={location} onChange={e => setLocation(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, appearance: "none", outline: "none" }}>
            <option value="">Select location...</option>
            {PARTNER_ORGS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Card>

        {/* Start time */}
        <Card style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Start time</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCustomStartTime("")} style={{
              padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${!customStartTime ? C.accent : C.border}`,
              background: !customStartTime ? C.accent + "12" : "transparent",
              color: !customStartTime ? C.accent : C.muted,
            }}>Now</button>
            <input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${customStartTime ? C.accent : C.border}`,
              background: C.surfaceAlt, fontSize: 14, outline: "none",
            }} />
          </div>
        </Card>

        {/* Saved groups (if group mode) */}
        {isGroup && savedGroups.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Load a saved group</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {savedGroups.map(g => (
                <button key={g.id} onClick={() => loadSavedGroup(g)} style={{
                  padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${selectedSavedGroup?.id === g.id ? C.accent : C.border}`,
                  background: selectedSavedGroup?.id === g.id ? C.accent + "15" : "transparent",
                  color: selectedSavedGroup?.id === g.id ? C.accent : C.muted,
                }}>{g.name}</button>
              ))}
            </div>
          </Card>
        )}

        {/* Group name (save for next time) */}
        {isGroup && (
          <Card style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              {selectedSavedGroup ? "Group Name (editing)" : "Group Name (optional — save for next time)"}
            </label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Monday Grangetown, Thursday Set Pace..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </Card>
        )}

        {/* Young people selection */}
        <Card style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{isGroup ? "Who's here today?" : "Young person"}</label>
          
          {/* Search filter (only show for groups or if many YPs) */}
          {(isGroup || allYP.length > 8) && (
            <input
              value={ypSearchFilter}
              onChange={e => setYPSearchFilter(e.target.value)}
              placeholder="Type to filter names..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
          )}
          
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {allYP.filter(yp => !ypSearchFilter || yp.name.toLowerCase().includes(ypSearchFilter.toLowerCase())).map(yp => {
              const active = selectedYP.find(p => p.id === yp.id);
              return (
                <button key={yp.id} onClick={() => isGroup ? toggleYP(yp) : setSelectedYP([yp])} style={{
                  padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${active ? stageColor : C.border}`,
                  background: active ? stageColor + "15" : "transparent",
                  color: active ? stageColor : C.muted,
                }}>{yp.name}{active && !isGroup ? " ✓" : ""}</button>
              );
            })}
          </div>
          {/* Add new */}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Add someone new..." onKeyDown={e => e.key === "Enter" && addNewPerson()} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
            {newPersonName.trim() && <button onClick={addNewPerson} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.accent, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>}
          </div>
        </Card>

        {/* Co-mentors */}
        {otherMentors.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Co-mentor (optional)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {otherMentors.map(m => {
                const active = coMentors.find(c => c.id === m.id);
                return (
                  <button key={m.id} onClick={() => setCoMentors(prev => active ? prev.filter(c => c.id !== m.id) : [...prev, m])} style={{
                    padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${active ? C.accent : C.border}`,
                    background: active ? C.accent + "15" : "transparent",
                    color: active ? C.accent : C.muted,
                  }}>{m.name}</button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Focus step (auto-detected but overridable) */}
        {selectedYP.length > 0 && (
          <Card style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Focus step (auto-detected)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STEPS.map(s => (
                <button key={s} onClick={() => setFocusStep(s)} style={{
                  padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${focusStep === s ? STEP_COLORS[s] : C.border}`,
                  background: focusStep === s ? STEP_COLORS[s] + "15" : "transparent",
                  color: focusStep === s ? STEP_COLORS[s] : C.muted,
                }}>{s}</button>
              ))}
            </div>
          </Card>
        )}

        {/* Start button */}
        <button onClick={startSession} disabled={!canStartSession || startingSession} style={{
          width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
          background: canStartSession ? stageColor : C.border,
          color: canStartSession ? "#FFFFFF" : C.muted,
          fontSize: 16, fontWeight: 800, cursor: canStartSession && !startingSession ? "pointer" : "default",
          transition: "all 0.2s", opacity: startingSession ? 0.7 : 1,
        }}>
          {startingSession ? "Starting..." : "Start Session →"}
        </button>
      </div>
    );
  }

  // ── ROLL CALL (group sessions only) ──
  if (phase === "roll-call") {
    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accent + "12", border: `1.5px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>👥</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Roll Call</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Is everyone here? Remove anyone who didn't show up.</p>
          {groupName && <p style={{ color: C.light, fontSize: 11, margin: "6px 0 0" }}>{groupName}</p>}
        </div>

        {/* Present members */}
        <Card style={{ marginBottom: 16, padding: 20 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Here today ({selectedYP.length})
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedYP.map(yp => (
              <div key={yp.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: 10, background: C.accent + "08",
                border: `1px solid ${C.accent}20`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{yp.name}</span>
                </div>
                <button onClick={() => setSelectedYP(prev => prev.filter(p => p.id !== yp.id))} style={{
                  padding: "4px 12px", borderRadius: 100, border: `1px solid ${C.danger}30`,
                  background: "transparent", color: C.danger, fontSize: 11, fontWeight: 700,
                  cursor: "pointer",
                }}>Absent</button>
              </div>
            ))}
          </div>
        </Card>

        {/* Add someone who wasn't in the group */}
        <Card style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Add someone else
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {allYP.filter(yp => !selectedYP.find(p => p.id === yp.id)).map(yp => (
              <button key={yp.id} onClick={() => setSelectedYP(prev => [...prev, yp])} style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${C.border}`, background: "transparent", color: C.muted,
              }}>+ {yp.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Add someone new..." onKeyDown={e => e.key === "Enter" && addNewPerson()} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }} />
            {newPersonName.trim() && <button onClick={addNewPerson} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.accent, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>}
          </div>
        </Card>

        {selectedYP.length === 0 && (
          <div style={{ textAlign: "center", padding: "12px 0", marginBottom: 16 }}>
            <p style={{ color: C.danger, fontSize: 13, fontWeight: 600, margin: 0 }}>No young people selected — add at least one to continue.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setPhase("setup")} style={{
            padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
          }}>← Back</button>
          <button onClick={() => {
            if (selectedYP.length === 0) return;
            // If only one person left, switch to individual mode
            if (selectedYP.length === 1) setIsGroup(false);
            setPhase("arrival");
          }} disabled={selectedYP.length === 0} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
            background: selectedYP.length > 0 ? C.accent : C.border,
            color: selectedYP.length > 0 ? "#FFFFFF" : C.muted,
            fontSize: 14, fontWeight: 700, cursor: selectedYP.length > 0 ? "pointer" : "default",
          }}>Everyone's here — let's go →</button>
        </div>
      </div>
    );
  }

  // ── ARRIVAL CHECK-IN ──
  if (phase === "arrival") {
    const isGroupSession = selectedYP.length > 1;
    const currentYP = isGroupSession ? selectedYP[currentArrivalIdx] : null;
    const ypKey = isGroupSession ? currentYP?.id : "__single__";
    const currentData = arrivalData[ypKey] || {};

    const setCurrentArrival = (qId, opt) => {
      setArrivalData(prev => ({
        ...prev,
        [ypKey]: { ...(prev[ypKey] || {}), [qId]: opt },
      }));
    };

    const handleArrivalNext = () => {
      if (isGroupSession && currentArrivalIdx < selectedYP.length - 1) {
        setCurrentArrivalIdx(currentArrivalIdx + 1);
      } else {
        finishArrival();
      }
    };

    const handleArrivalBack = () => {
      if (isGroupSession && currentArrivalIdx > 0) {
        setCurrentArrivalIdx(currentArrivalIdx - 1);
      } else {
        setPhase("setup");
      }
    };

    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="arrival" phases={PHASES} />
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Quick Check-in</h2>
          {isGroupSession ? (
            <>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 4px" }}>How is <strong>{currentYP?.name}</strong> arriving?</p>
              <p style={{ color: C.light, fontSize: 11, margin: 0 }}>{currentArrivalIdx + 1} of {selectedYP.length}</p>
            </>
          ) : (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>How are they arriving? (Skippable)</p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ARRIVAL_QUESTIONS.map(q => (
            <Card key={q.id} style={{ padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, textAlign: "center" }}>{q.question}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {q.options.map(opt => (
                  <button key={opt.value} onClick={() => setCurrentArrival(q.id, opt)} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "12px 10px", borderRadius: 12, minWidth: 60, cursor: "pointer",
                    border: `2px solid ${currentData[q.id]?.value === opt.value ? C.accent : C.border}`,
                    background: currentData[q.id]?.value === opt.value ? C.accent + "12" : "transparent",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 10, color: currentData[q.id]?.value === opt.value ? C.accent : C.muted, fontWeight: 600 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={handleArrivalBack} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>← Back</button>
          {isGroupSession && (
            <button onClick={handleArrivalNext} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Skip {currentYP?.name?.split(" ")[0]} →</button>
          )}
          {!isGroupSession && (
            <button onClick={() => finishArrival()} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Skip</button>
          )}
          <button onClick={handleArrivalNext} style={{ flex: 2, padding: "14px 0", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {isGroupSession && currentArrivalIdx < selectedYP.length - 1 ? `Next → ${selectedYP[currentArrivalIdx + 1]?.name?.split(" ")[0]}` : "Continue →"}
          </button>
        </div>
      </div>
    );
  }

  // ── SESSION TYPE ──
  if (phase === "session-type") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="session-type" phases={PHASES} />
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>What kind of session is this?</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>This shapes the flow for today</p>

        <div style={{ display: "grid", gap: 12 }}>
          <Card onClick={() => finishSessionType("pathway")} style={{ cursor: "pointer", borderLeft: `4px solid ${stageColor}`, padding: "18px 20px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>5 Step Pathway</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Structured session with writing prompts based on where they are on the pathway. Reconnect → Cards → Session Plan → Record → Wrap Up.</div>
          </Card>

          <Card onClick={() => finishSessionType("yp-led")} style={{ cursor: "pointer", borderLeft: "4px solid #7C3AED", padding: "18px 20px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>YP-Led / Recording Session</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Young person leads — they've already written something or want to record. You'll use Reading the Signal cards to help them go deeper into what they've made.</div>
          </Card>

          <Card onClick={() => finishSessionType("non-music")} style={{ cursor: "pointer", borderLeft: "4px solid #047857", padding: "18px 20px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Non-Music Session</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Fishing, food, a walk, hanging out. No formal structure — just capture what came up, any breakthroughs, any disclosures.</div>
          </Card>
        </div>
        <button onClick={() => setPhase("arrival")} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", marginTop: 8 }}>← Back</button>
      </div>
    );
  }

  // ── RECONNECT ──
  if (phase === "connect") {
    // ── NON-MUSIC SESSION ──
    if (cardType === "non-music-convo") {
      const convoPoints = {
        Reset: ["How have you been feeling this week — any moments where you felt properly calm?", "Has anything knocked you off balance recently? How did you handle it?", "What's one thing that's been helping you feel grounded lately?", "Is there anyone you've felt safe around this week?"],
        Reframe: ["Have you noticed yourself thinking differently about anything recently?", "Is there a belief about yourself you've started to question?", "What's something you used to think was true about you that you're not so sure about anymore?", "Who do you want to become — not what, but who?"],
        Rebuild: ["What have you been consistent with this week — anything you showed up for?", "What's something you've been working on that's starting to feel different?", "Where do you need more discipline and where do you need more grace?", "What does commitment look like in your life right now?"],
        Release: ["Have you said anything honest to someone this week that felt hard but right?", "What's something you've been holding back that you might be ready to express?", "Is there a conversation you need to have that you keep avoiding?", "What does your voice sound like when it's really yours — not performing?"],
        Rise: ["Who's looking up to you right now — do you know?", "What's one thing you could teach someone younger from what you've been through?", "Where do you see yourself contributing to something bigger than yourself?", "What legacy are you building — even in small ways?"],
      };
      const points = convoPoints[focusStep] || convoPoints.Reset;

      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="connect" phases={PHASES} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Conversation Points</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: "0 0 6px" }}>No pressure — use these as natural touchpoints during your time together.</p>
          <p style={{ color: C.light, fontSize: 11, margin: "0 0 20px", fontStyle: "italic" }}>Based on {focusStep} — {STEP_SUBTITLES[focusStep]}</p>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {points.map((p, i) => (
              <Card key={i} style={{ borderLeft: `3px solid ${stageColor}30`, padding: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, margin: "0 0 10px" }}>{p}</p>
                <textarea placeholder="What came up..." rows={2} onChange={e => {
                  if (e.target.value.trim()) {
                    setCardResponses(prev => {
                      const existing = prev.filter(r => r.question !== p);
                      return [...existing, { cardType: "conversation", question: p, answer: e.target.value }];
                    });
                  }
                }} style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </Card>
            ))}
          </div>
          <button onClick={async () => { setSessionStartTime(Date.now()); setPhase("in-session"); if (!planData) loadPlan(cardResponses); }} style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Begin session →</button>
        </div>
      );
    }

    // ── PATHWAY SESSION: MERGED CONNECT (reconnect + activity + unpacking) ──
    const actType = sessionActivity?.type || "songwriting";
    const isFirstSession = connectData?.sessionCount <= 1;

    const getTalkingPoints = () => {
      if (actType === "conversation" || actType === "pulse-card") return ["What comes to mind when you think about that?", "Has anything like that come up for you recently?", "What would change if that was different?"];
      if (actType === "listening") return ["What track do you want to play — and why that one?", "What does this track make you feel?", "Is there a line in there that says something you can't say yourself yet?"];
      if (actType === "freewrite") return ["What's sitting at the top of your head right now?", "If you could only write about one thing today, what would it be?", "What's the feeling you want to get out?"];
      if (actType === "voice-note") return ["What do you want to say that you haven't said yet?", "If nobody was listening, what would you tell the truth about?", "How are you really doing — not the polite answer?"];
      if (actType === "review") return ["What do you hear now that you didn't notice before?", "Is there a line you'd change now?", "Who did you write this for — and does it land the way you wanted?"];
      if (actType === "peer-work") return ["What do you think they need from you today?", "What's something you've learned that you could pass on?", "How do you want them to feel after working with you?"];
      if (actType === "recording" || actType === "collaboration") return ["What's the energy you want this to have?", "What's the one thing you want to get right today?", "How do you want it to sound vs how it sounds right now?"];
      return ["What does this prompt bring up for you first?", "If you had to describe this in one image or scene, what would it look like?", "What's the feeling underneath — not the obvious one, the deeper one?"];
    };

    const talkingPoints = writingPrompt ? getTalkingPoints() : [];

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="connect" phases={PHASES} />

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{isFirstSession ? "First Session" : "Connect"}</h2>
            <StepBadge step={focusStep} />
          </div>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{isFirstSession ? "No history yet — find the thread and see what they're drawn to." : "Reconnect, then find today's direction."}</p>
        </div>

        {loading ? <Spinner label="Preparing your session..." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Mentor reminder */}
            {connectData?.mentorReminder && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: stageColor + "0A", borderLeft: `3px solid ${stageColor}`, marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: stageColor, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Hold in mind</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontStyle: "italic" }}>{connectData.mentorReminder}</div>
              </div>
            )}

            {/* Reconnect talking points — only for returning YPs */}
            {!isFirstSession && connectData?.talkingPoints?.length > 0 && (
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Reconnect</div>
                {connectData.talkingPoints.map((tp, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < connectData.talkingPoints.length - 1 ? 8 : 0 }}>
                    <span style={{ color: stageColor, fontSize: 14, marginTop: 1, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{tp}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* Session activity card */}
            {writingPrompt && (
              <Card style={{ borderLeft: `4px solid ${stageColor}`, padding: "20px 22px" }}>
                {sessionActivity && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: stageColor, background: stageColor + "15", padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'DM Mono', monospace" }}>
                      {sessionActivity.type === "songwriting" ? "Write" : sessionActivity.type === "recording" ? "Record" : sessionActivity.type === "conversation" ? "Talk" : sessionActivity.type === "listening" ? "Listen" : sessionActivity.type === "freewrite" ? "Freewrite" : sessionActivity.type === "voice-note" ? "Voice Note" : sessionActivity.type === "pulse-card" ? "Pulse" : sessionActivity.type === "review" ? "Review" : sessionActivity.type === "peer-work" ? "Peer Work" : sessionActivity.type === "collaboration" ? "Collab" : sessionActivity.type}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>·</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'DM Mono', monospace" }}>{focusStep}</span>
                  </div>
                )}
                <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, margin: "0 0 10px", color: C.text }}>{writingPrompt}</p>
                {sessionActivity?.mentorNote && (
                  <div style={{ fontSize: 12, color: "#B45309", background: "#FFFBEB", padding: "8px 12px", borderRadius: 8, lineHeight: 1.5, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700 }}>Mentor note:</span> {sessionActivity.mentorNote}
                  </div>
                )}
                <button onClick={() => {
                  const activities = SESSION_ACTIVITIES[focusStep] || SESSION_ACTIVITIES.Reset;
                  const picked = activities[Math.floor(Math.random() * activities.length)];
                  setSessionActivity(picked);
                  setWritingPrompt(picked.prompt);
                }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>↺ Different activity</button>
              </Card>
            )}

            {/* Unpacking questions */}
            {talkingPoints.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                {talkingPoints.map((q, i) => (
                  <Card key={i} style={{ borderLeft: `3px solid ${stageColor}30`, padding: 16 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, margin: "0 0 10px", color: C.text }}>{q}</p>
                    <textarea placeholder="Their answer (optional)..." rows={2} onChange={e => {
                      if (e.target.value.trim()) {
                        setCardResponses(prev => {
                          const existing = prev.filter(r => r.question !== q);
                          return [...existing, { cardType: "prompt", question: q, answer: e.target.value }];
                        });
                      }
                    }} style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                  </Card>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setPhase("session-type")} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { 
                if (sessionType === "yp-led") {
                  // YP-led skips plan generation - go straight to in-session
                  setPhase("in-session");
                } else {
                  setPhase("plan"); 
                  loadPlan(cardResponses);
                }
              }} style={{ flex: 2, padding: "14px 0", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {sessionType === "yp-led" ? "Start In-Session →" : "Generate Session Plan →"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PLAN ──
  if (phase === "plan") {
    const PC = { Unpack: "#2563EB", Spark: "#7C3AED", "Go Deeper": "#047857" };
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="plan" phases={PHASES} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Session Plan</h2>
          <StepBadge step={focusStep} />
          {planData?.theme && <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>{planData.theme}</span>}
        </div>

        {loading ? <Spinner label={cardResponses.length > 0 ? "Adapting plan based on their responses..." : "Building session plan..."} /> : planData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Aim */}
            <div style={{ padding: "14px 16px", borderRadius: 10, background: stageColor + "0D", borderLeft: `3px solid ${stageColor}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: stageColor, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Session Aim</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{planData.sessionAim}</div>
            </div>

            {/* Activities */}
            {[{ label: "Opening", data: planData.openingActivity }, { label: "Main", data: planData.mainActivity }, { label: "Closing", data: planData.closingActivity }].map(({ label, data }) => data && (
              <Card key={label} style={{ borderLeft: `3px solid ${stageColor}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{data.title}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{label} · {data.duration}</div>
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{data.description}</div>
              </Card>
            ))}

            {/* Mentor note */}
            {planData.mentorNote && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: C.surfaceAlt, borderTop: `2px solid ${C.borderStrong}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>Mentor Note</div>
                <div style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, fontStyle: "italic" }}>{planData.mentorNote}</div>
              </div>
            )}

            {/* Card responses summary (if re-generated after cards) */}
            {cardResponses.length > 0 && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#7C3AED08", border: "1px solid #7C3AED20" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Adapted from card responses</div>
                <div style={{ fontSize: 11, color: C.muted }}>{cardResponses.length} responses captured — plan adjusted accordingly</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setPhase("connect")} style={{ padding: "14px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>← Back</button>
              <button onClick={() => loadPlan(cardResponses)} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>↺ New plan</button>
              <button onClick={() => { setSessionStartTime(Date.now()); setPhase("in-session"); }} style={{ flex: 2, padding: "14px 0", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Begin session →</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── IN SESSION (Presence Mode) ──
  if (phase === "in-session") {
    const mins = Math.floor(sessionElapsed / 60);
    const secs = sessionElapsed % 60;
    const ypName = isGroup ? selectedYP.map(y => y.name).join(", ") : selectedYP[0]?.name || "";
    const isYPLed = sessionType === "yp-led";

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="in-session" phases={PHASES} />

        {/* Minimal presence header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 42, fontWeight: 300, color: C.text, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 4 }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>In session with <span style={{ fontWeight: 700, color: stageColor }}>{ypName}</span></div>
        </div>

        {/* Session plan section — HIDE for YP-led sessions */}
        {!isYPLed && (
          <>
            {planData ? (
              <div style={{ padding: "14px 18px", borderRadius: 12, background: stageColor + "08", borderLeft: `3px solid ${stageColor}`, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: stageColor, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                  {sessionActivity?.type ? (sessionActivity.type === "songwriting" ? "Writing" : sessionActivity.type === "recording" ? "Recording" : sessionActivity.type === "conversation" ? "Conversation" : sessionActivity.type === "listening" ? "Listening" : sessionActivity.type === "freewrite" ? "Freewrite" : sessionActivity.type === "review" ? "Review" : sessionActivity.type === "peer-work" ? "Peer work" : sessionActivity.type) : "Session"} · {focusStep}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: C.text }}>{planData.sessionAim}</div>
              </div>
            ) : loading ? (
              <div style={{ padding: "14px 18px", borderRadius: 12, background: C.surfaceAlt, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: stageColor, animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12, color: C.muted }}>Generating session plan...</span>
              </div>
            ) : (
              <button onClick={() => loadPlan(cardResponses)} style={{
                width: "100%", padding: "12px 18px", borderRadius: 12,
                border: `1px solid ${stageColor}40`, background: stageColor + "08",
                color: stageColor, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
                textAlign: "left",
              }}>Generate session plan →</button>
            )}

            {/* Expandable plan reference — hidden by default */}
            <button onClick={() => setShowPlanRef(!showPlanRef)} style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: showPlanRef ? 12 : 20,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ transition: "transform 0.2s", transform: showPlanRef ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▸</span>
              {showPlanRef ? "Hide plan" : "Glance at plan"}
            </button>

            {showPlanRef && planData && (
              <Card style={{ marginBottom: 20, padding: 16 }}>
                {[{ label: "Opening", data: planData.openingActivity }, { label: "Main", data: planData.mainActivity }, { label: "Closing", data: planData.closingActivity }].map(({ label, data }) => data && (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>{label} · {data.duration}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{data.description}</div>
                  </div>
                ))}
                {planData.mentorNote && (
                  <div style={{ fontSize: 11, color: "#B45309", fontStyle: "italic", paddingTop: 8, borderTop: `1px solid ${C.border}` }}>{planData.mentorNote}</div>
                )}
              </Card>
            )}
          </>
        )}

        {/* Quick notes — jot something down without leaving the moment */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Quick notes (optional — jot as you go)</div>
          <textarea
            value={liveNotes}
            onChange={e => setLiveNotes(e.target.value)}
            placeholder="Anything you want to remember..."
            rows={3}
            style={{ width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
          />
        </div>

        {/* For YP-led: Signal theme categories + Spark card option */}
        {isYPLed && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Reading the Signal — Unpack themes as they emerge</div>
              <div style={{ display: "grid", gap: 8 }}>
                {SIGNAL_CATEGORIES.map(cat => {
                  const isOpen = selectedSignalCategory?.id === cat.id;
                  return (
                    <div key={cat.id}>
                      <button onClick={() => setSelectedSignalCategory(isOpen ? null : cat)} style={{
                        width: "100%", padding: "12px 16px", borderRadius: 10, textAlign: "left",
                        border: `1.5px solid ${isOpen ? "#2563EB" : C.border}`,
                        background: isOpen ? "#2563EB08" : "transparent",
                        color: isOpen ? "#2563EB" : C.text,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span>{cat.title}</span>
                        <span style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", fontSize: 11 }}>▸</span>
                      </button>
                      
                      {isOpen && (
                        <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 8, background: "#2563EB05", border: `1px solid #2563EB20` }}>
                          <div style={{ fontSize: 11, color: "#2563EB", marginBottom: 10, lineHeight: 1.5, fontStyle: "italic" }}>"{cat.signal}"</div>
                          <div style={{ display: "grid", gap: 10 }}>
                            {cat.questions.map((q, i) => (
                              <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, lineHeight: 1.5 }}>{q}</div>
                                <textarea
                                  placeholder="Their response..."
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val.trim()) {
                                      setCardResponses(prev => {
                                        const existing = prev.filter(r => r.question !== q);
                                        return [...existing, { cardType: "signal-theme", category: cat.title, question: q, answer: val }];
                                      });
                                    } else {
                                      setCardResponses(prev => prev.filter(r => r.question !== q));
                                    }
                                  }}
                                  rows={2}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                                />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 6, background: "#2563EB15", borderLeft: "3px solid #2563EB" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", marginBottom: 2 }}>The real signal might be</div>
                            <div style={{ fontSize: 12, fontStyle: "italic", color: C.text }}>{cat.realSignal}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spark card option for YP-led — when they need inspiration */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>If they need inspiration</div>
              <button onClick={() => {
                if (!showSignalDrawer) {
                  // Draw a Spark card
                  const shuffled = [...SPARK_CARDS_CORE].sort(() => Math.random() - 0.5);
                  setDrawnSignalCards(shuffled.slice(0, 1));
                  setSignalResponse("");
                }
                setShowSignalDrawer(!showSignalDrawer);
              }} style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                border: `1.5px solid ${showSignalDrawer ? "#F59E0B40" : C.border}`,
                background: showSignalDrawer ? "#F59E0B08" : "transparent",
                color: showSignalDrawer ? "#F59E0B" : C.muted,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <span style={{ transition: "transform 0.2s", transform: showSignalDrawer ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▸</span>
                {showSignalDrawer ? "Close Spark card" : "Pull a Spark card"}
              </button>

              {showSignalDrawer && drawnSignalCards.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {drawnSignalCards.map((card, i) => (
                    <Card key={i} style={{ borderLeft: "4px solid #F59E0B", padding: "18px 20px", marginBottom: 10 }}>
                      {card.theme && <div style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>{card.theme}</div>}
                      <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, margin: "0 0 12px", color: C.text }}>{card.question}</p>
                      <textarea
                        value={signalResponse}
                        onChange={e => setSignalResponse(e.target.value)}
                        placeholder="What came up..."
                        rows={3}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => { const shuffled = [...SPARK_CARDS_CORE].sort(() => Math.random() - 0.5); setDrawnSignalCards(shuffled.slice(0, 1)); setSignalResponse(""); }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Draw another</button>
                        <button onClick={() => { if (signalResponse.trim()) { setCardResponses(prev => [...prev, { cardType: "spark", question: card.question, answer: signalResponse, theme: card.theme }]); setSignalResponse(""); setShowSignalDrawer(false); } }} disabled={!signalResponse.trim()} style={{ flex: 1, padding: "6px 12px", borderRadius: 6, border: "none", background: signalResponse.trim() ? "#F59E0B" : C.border, color: signalResponse.trim() ? "#fff" : C.muted, fontSize: 11, fontWeight: 700, cursor: signalResponse.trim() ? "pointer" : "default" }}>Save response</button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* For non-YP-led: Keep the existing Signal Card drawer (for Spark cards) */}
        {!isYPLed && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => {
              if (!showSignalDrawer) {
                // Draw a fresh signal card — no stage filter for in-session use, mentors need all cards
                const shuffled = [...SIGNAL_CARDS_CORE].sort(() => Math.random() - 0.5);
                setDrawnSignalCards(shuffled.slice(0, 1));
                setSignalResponse("");
              }
              setShowSignalDrawer(!showSignalDrawer);
            }} style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: `1.5px solid ${showSignalDrawer ? "#2563EB40" : C.border}`,
              background: showSignalDrawer ? "#2563EB08" : "transparent",
              color: showSignalDrawer ? "#2563EB" : C.muted,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ transition: "transform 0.2s", transform: showSignalDrawer ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▸</span>
              {showSignalDrawer ? "Close Signal card" : "Pull a Signal card"}
            </button>

            {showSignalDrawer && drawnSignalCards.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {drawnSignalCards.map((card, i) => (
                  <Card key={i} style={{ borderLeft: "4px solid #2563EB", padding: "18px 20px", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#2563EB15", padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'DM Mono', monospace" }}>Signal</span>
                      {card.stage && <span style={{ fontSize: 10, color: STEP_COLORS[card.stage], fontWeight: 600 }}>{card.stage}</span>}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, margin: "0 0 10px", color: C.text }}>{card.question}</p>
                    {card.context && <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic" }}>{card.context}</p>}
                    <textarea
                      value={signalResponse}
                      onChange={e => setSignalResponse(e.target.value)}
                      placeholder="Their response (optional)..."
                      rows={2}
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${signalResponse ? "#2563EB" : C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {signalResponse.trim() && (
                        <button onClick={() => {
                          setCardResponses(prev => [...prev, { cardType: "signal-in-session", question: card.question, answer: signalResponse.trim() }]);
                          setSignalResponse("");
                          setDrawnSignalCards([...SIGNAL_CARDS_CORE].sort(() => Math.random() - 0.5).slice(0, 1));
                        }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "#2563EB", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Capture & draw another</button>
                      )}
                      <button onClick={() => {
                        setDrawnSignalCards([...SIGNAL_CARDS_CORE].sort(() => Math.random() - 0.5).slice(0, 1));
                        setSignalResponse("");
                      }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>↺ Different card</button>
                    </div>
                  </Card>
                ))}
                {cardResponses.filter(r => r.cardType === "signal-in-session").length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Signal responses captured</div>
                    {cardResponses.filter(r => r.cardType === "signal-in-session").map((r, i) => (
                      <div key={i} style={{ padding: "6px 10px", borderRadius: 6, background: C.surfaceAlt, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: C.muted }}>{r.question}</div>
                        <div style={{ fontSize: 12, color: C.text }}>"{r.answer}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* End session — goes to feedback/wrapup AFTER the session */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.light, marginBottom: 12, fontStyle: "italic" }}>When the session is done, or the young person has left:</div>
          <button onClick={() => {
            // Carry live notes into the main notes field
            if (liveNotes.trim()) setNotes(prev => prev ? prev + "\n\n" + liveNotes : liveNotes);
            setPhase("feedback");
          }} style={{
            width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
            background: C.accent, color: C.bg, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Session complete — wrap up →</button>
        </div>
      </div>
    );
  }

  // ── WRAPUP ──
  if (phase === "wrapup") {
    const section = FORM_SECTIONS[focusStep];
    const stepColor = STEP_COLORS[focusStep];
    const wrapSteps = ["YP Assessment", "Mentor Summary", "Media & Submit"];

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="wrapup" phases={PHASES} />
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Wrap Up</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "0 0 8px" }}>{wrapSteps[wrapStep]}</p>

        {/* Sub-step progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {wrapSteps.map((ws, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i <= wrapStep ? C.accent : C.border, marginBottom: 4 }} />
              <span style={{ fontSize: 9, color: i <= wrapStep ? C.accent : C.light, fontWeight: 600 }}>{ws}</span>
            </div>
          ))}
        </div>

        {wrapStep === 0 && (
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Score what you observed — not what you hoped for.</div>

            {/* Session indicators only — pathway scores are AI-derived from notes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Session Indicators</div>
              <div style={{ display: "grid", gap: 16 }}>
                {QUICK_FIELDS.map(({ key, label, labels, color: fieldColor }) => {
                  const val = quick[key] || 0;
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val ? val.toFixed(1) : "—"}</span>
                      </div>
                      <input type="range" min={1} max={5} step={0.5} value={val || 2.5}
                        onChange={e => setQuick(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                        style={{ width: "100%", accentColor: fieldColor || C.accent, cursor: "pointer" }} />
                      {val > 0 && <div style={{ fontSize: 10, color: C.light, marginTop: 2 }}>{labels[Math.round(val)]}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setWrapStep(1)} style={{
                padding: "12px 28px", borderRadius: 8, border: "none",
                background: C.accent, color: C.bg,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Continue to Mentor Summary →</button>
            </div>
          </div>
        )}

        {wrapStep === 1 && (
          <div>
            {/* Voice Reflection */}
            <Card style={{ padding: 16, marginBottom: 12, borderLeft: `3px solid ${isRecording ? C.danger : "#7C3AED"}40`, background: isRecording ? "#FEF2F2" : voiceProcessing ? "#F5F3FF" : C.surface }}>
              {voiceProcessing ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid #7C3AED40`, borderTopColor: "#7C3AED", margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 600 }}>AI is sorting your reflection into the boxes below...</div>
                </div>
              ) : isRecording ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.danger, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>Recording...</span>
                    </div>
                    <button onClick={stopVoiceRecording} style={{
                      padding: "8px 20px", borderRadius: 8, border: "none",
                      background: C.danger, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>Stop & Process</button>
                  </div>
                  {voiceTranscript && (
                    <div style={{ fontSize: 12, color: C.accentDim, lineHeight: 1.6, fontStyle: "italic", maxHeight: 120, overflow: "auto", padding: "8px 10px", background: "#fff", borderRadius: 6, border: `1px solid ${C.border}` }}>
                      {voiceTranscript}
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: C.muted, margin: "8px 0 0" }}>Talk about what happened, how you showed up, anything concerning. AI will split it into the right boxes.</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Voice Reflection</div>
                  <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                    {[
                      { icon: "📝", text: "What happened in the session today?" },
                      { icon: "🤝", text: "How did the young person respond / relate to you?" },
                      { icon: "⚠️", text: "Anything you're concerned about — wellbeing, safety, home life?" },
                    ].map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", background: "#7C3AED08", borderRadius: 6, fontSize: 12, color: C.accentDim }}>
                        <span>{p.icon}</span> {p.text}
                      </div>
                    ))}
                  </div>
                  <button onClick={startVoiceRecording} style={{
                    width: "100%", padding: "14px 0", borderRadius: 8, border: "none",
                    background: "#7C3AED", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>🎙</span> Start Recording
                  </button>
                  <p style={{ fontSize: 10, color: C.muted, margin: "6px 0 0", textAlign: "center" }}>Just talk naturally — AI will sort it into the boxes below</p>
                </div>
              )}
            </Card>

            {/* Mentor notes with AI enhancement */}
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              <Card style={{ padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Session Notes</label>
                <p style={{ fontSize: 11, color: C.light, margin: "0 0 8px", fontStyle: "italic" }}>Write as much detail as you can — what happened, key moments, breakthroughs, challenges. AI will help polish it.</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key moments, breakthroughs, what happened..." rows={5} style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </Card>
              <Card style={{ padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Mentor Reflection</label>
                <textarea value={mentorReflection} onChange={e => setMentorReflection(e.target.value)} placeholder="How did you show up today?..." rows={3} style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </Card>
              <Card style={{ padding: 16, borderColor: "#ff444420" }}>
                <label style={{ display: "block", fontSize: 11, color: C.danger, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Safeguarding (if any)</label>
                <textarea value={safeguarding} onChange={e => setSafeguarding(e.target.value)} placeholder="Note any concerns..." rows={2} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #F8A5A5", background: "#FFF5F5", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </Card>
            </div>

            {/* AI Enhance button */}
            {(notes.trim() || mentorReflection.trim()) && (
              <button onClick={enhanceNotes} disabled={enhancingNotes} style={{
                width: "100%", padding: "14px 0", borderRadius: 10, marginBottom: 16,
                border: `1.5px solid ${stageColor}`, background: stageColor + "08",
                color: stageColor, fontSize: 13, fontWeight: 700, cursor: enhancingNotes ? "default" : "pointer",
                opacity: enhancingNotes ? 0.7 : 1,
              }}>
                {enhancingNotes ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${stageColor}40`, borderTopColor: stageColor, display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    AI is enhancing your notes...
                  </span>
                ) : "✨ AI Enhance — make my notes proper"}
              </button>
            )}

            {/* Card responses summary */}
            {cardResponses.length > 0 && (
              <Card style={{ marginBottom: 20, padding: 16, borderLeft: "3px solid #7C3AED40" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Card responses ({cardResponses.length} captured)</div>
                {cardResponses.map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{r.question}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>"{r.answer}"</div>
                  </div>
                ))}
              </Card>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
              <button onClick={() => setWrapStep(0)} style={{
                padding: "12px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontSize: 14, cursor: "pointer",
              }}>Back</button>
              <button onClick={() => setWrapStep(2)} style={{
                padding: "12px 28px", borderRadius: 8, border: "none",
                background: C.accent, color: C.bg,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Continue →</button>
            </div>
          </div>
        )}

        {wrapStep === 2 && (
          <div>
            {/* Media uploads — songs, photos, videos */}
            <Card style={{ marginBottom: 20, padding: 16, borderLeft: `3px solid ${stageColor}40` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Session Media (optional)</div>

              {/* Song upload — multiple */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🎵 Track Recordings</div>
                {songs.filter(s => s.url).map((song, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.surfaceAlt, borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>✓</span>
                    <input value={song.title || ""} onChange={e => setSongs(prev => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))} placeholder="Name this track..." style={{ flex: 1, fontSize: 12, fontWeight: 600, background: "transparent", border: "none", outline: "none", padding: 0 }} />
                    <button onClick={() => setSongs(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                ))}
                {songUploading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: stageColor + "08", borderRadius: 6, marginBottom: 6, border: `1px solid ${stageColor}30` }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${stageColor}40`, borderTopColor: stageColor, animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 12, color: stageColor, fontWeight: 600 }}>Uploading track...</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 600, cursor: songUploading ? "default" : "pointer", textAlign: "center", opacity: songUploading ? 0.5 : 1 }}>
                    {songUploading ? "Uploading..." : "+ Upload track"}
                    <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" disabled={songUploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      e.target.value = "";
                      setSongUploading(true);
                      try {
                        const title = file.name.replace(/\.[^.]+$/, "") || "untitled";
                        const result = await db.uploadSongDirect(file, selectedYP[0]?.name || "unknown", startTime.toISOString().split("T")[0], title);
                        if (result.url) {
                          setSongs(prev => [...prev, { title, url: result.url, namedByMentor: false }]);
                        } else if (result.error) {
                          alert("Upload failed: " + result.error + "\n\nMake sure the 'pathways-songs' storage bucket exists in Supabase and has a public access policy.");
                        }
                      } catch (err) {
                        console.error("Song upload error:", err);
                        alert("Upload failed — check your connection and try again.");
                      }
                      setSongUploading(false);
                    }} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              {/* Photo/video upload */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📸 Photos & Videos</div>
                {mediaFiles.length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    {mediaFiles.map((m, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        {m.mediaType === "photo" ? (
                          <img src={m.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 6, background: C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎬</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.mediaType === "photo" ? "Photo" : "Video"} uploaded</div>
                          <div style={{ fontSize: 10, color: C.muted }}>✓ Saved</div>
                        </div>
                        <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))} style={{
                          background: "none", border: "none", color: C.muted, fontSize: 16,
                          cursor: "pointer", padding: "4px 8px", flexShrink: 0,
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{
                    flex: 1, padding: "10px 0", borderRadius: 6, textAlign: "center",
                    border: `1.5px dashed ${C.border}`, color: C.muted,
                    fontSize: 11, fontWeight: 600, cursor: mediaUploading ? "default" : "pointer",
                    opacity: mediaUploading ? 0.5 : 1,
                  }}>
                    {mediaUploading ? "Uploading..." : "+ Add photo or video"}
                    <input type="file" accept="image/*,video/*,.mp4,.mov,.jpg,.jpeg,.png,.heic" multiple disabled={mediaUploading} onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      setMediaUploading(true);
                      for (const file of files) {
                        try {
                          const mediaType = file.type.startsWith("video") ? "video" : "photo";
                          const result = await db.uploadMediaDirect(file, selectedYP[0]?.name || "session", startTime.toISOString().split("T")[0], mediaType);
                          if (result.url) setMediaFiles(prev => [...prev, { url: result.url, mediaType, caption: "" }]);
                        } catch (err) { console.error(err); }
                      }
                      setMediaUploading(false);
                      e.target.value = "";
                    }} style={{ display: "none" }} />
                  </label>
                </div>
              </div>
            </Card>

            {/* Submit */}
            <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
              <button onClick={() => setWrapStep(1)} style={{
                padding: "12px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontSize: 14, cursor: "pointer",
              }}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} style={{
                padding: "14px 32px", borderRadius: 12, border: "none",
                background: submitting ? C.border : C.accent,
                color: submitting ? C.muted : C.bg,
                fontSize: 16, fontWeight: 800, cursor: submitting ? "default" : "pointer",
              }}>{submitting ? "Saving session..." : "Complete Session ✓"}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── YP FEEDBACK ──
  if (phase === "feedback") {
    if (feedbackSubmitted) {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: STEP_COLORS.Rebuild + "15", border: `1.5px solid ${STEP_COLORS.Rebuild}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22, color: STEP_COLORS.Rebuild }}>✓</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Feedback captured</h2>
          <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Moving to wrap up...</p>
        </div>
      );
    }

    const isGroupSession = selectedYP.length > 1;
    const currentYP = isGroupSession ? selectedYP[currentFeedbackIdx] : null;
    const ypKey = isGroupSession ? currentYP?.id : "__single__";
    const currentFb = ypFeedback[ypKey] || {};

    const setCurrentFeedback = (qId, val) => {
      setYpFeedback(prev => ({
        ...prev,
        [ypKey]: { ...(prev[ypKey] || {}), [qId]: val },
      }));
    };

    const handleFeedbackNext = () => {
      if (isGroupSession && currentFeedbackIdx < selectedYP.length - 1) {
        setCurrentFeedbackIdx(currentFeedbackIdx + 1);
      } else {
        handleFeedbackSubmit();
      }
    };

    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <PhaseIndicator onEndSession={() => setShowEndConfirm(true)} showConfirm={showEndConfirm} onCancelEnd={() => setShowEndConfirm(false)} onConfirmEnd={handleCancel} current="feedback" phases={PHASES} />
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Quick Feedback</h2>
          {isGroupSession ? (
            <>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 4px" }}>Hand the phone to <strong>{currentYP?.name}</strong></p>
              <p style={{ color: C.light, fontSize: 11, margin: 0 }}>{currentFeedbackIdx + 1} of {selectedYP.length}</p>
            </>
          ) : (
            <>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Hand the phone to the young person — takes 1 minute</p>
              <p style={{ color: C.light, fontSize: 11, margin: "8px 0 0" }}>This is optional — tap Skip if it doesn't feel right today</p>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {YP_FEEDBACK_QUESTIONS.map((q) => (
            <Card key={q.id} style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, lineHeight: 1.4 }}>{q.question}</div>
              {q.type === "emoji" ? (
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {q.options.map(opt => (
                    <button key={opt.value} onClick={() => setCurrentFeedback(q.id, opt)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "12px 10px", borderRadius: 12, minWidth: 60, cursor: "pointer",
                      border: `2px solid ${currentFb[q.id]?.value === opt.value ? C.accent : C.border}`,
                      background: currentFb[q.id]?.value === opt.value ? C.accent + "12" : "transparent",
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                      <span style={{ fontSize: 10, color: currentFb[q.id]?.value === opt.value ? C.accent : C.muted, fontWeight: 600 }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={currentFb[q.id] || ""}
                  onChange={e => setCurrentFeedback(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={2}
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box" }}
                />
              )}
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {isGroupSession ? (
            <>
              <button onClick={handleFeedbackNext} style={{
                flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer",
              }}>Skip {currentYP?.name?.split(" ")[0]} →</button>
              <button onClick={() => {
                // Record whatever they've entered so far, then move to next or submit
                handleFeedbackNext();
              }} style={{
                flex: 2, padding: "14px 0", borderRadius: 10, border: "none",
                background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>{currentFeedbackIdx < selectedYP.length - 1 ? `Done → ${selectedYP[currentFeedbackIdx + 1]?.name?.split(" ")[0]}` : "Submit Feedback ✓"}</button>
            </>
          ) : (
            <>
              <button onClick={() => { setPhase("wrapup"); setWrapStep(0); }} style={{
                flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
              }}>Skip feedback</button>
              <button onClick={handleFeedbackNext} style={{
                flex: 2, padding: "14px 0", borderRadius: 10, border: "none",
                background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Submit Feedback ✓</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // If component crashed, show recovery UI
  if (crashError) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Session failed to load</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This is usually caused by saved data from a previous session. Clearing it should fix things.</div>
        <button onClick={() => {
          try { localStorage.removeItem(SAVE_KEY); } catch {}
          setCrashError(null);
        }} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>Clear & Retry</button>
        <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Go Back</button>
      </div>
    );
  }

  // All phases should have returned by now - this is a fallback
  return (<><EndSessionModal /><EndSessionButton /></>);
}
