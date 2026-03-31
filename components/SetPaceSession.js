"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { STEPS, STEP_COLORS, STEP_SUBTITLES, FORM_SECTIONS, PARTNER_ORGS, QUICK_FIELDS, SCALE_LABELS, SP_FEEDBACK_QUESTIONS } from "@/lib/constants";
import { getLatestStage, computeStepAverages } from "@/lib/utils";
import * as db from "@/lib/db";

const C = {
  bg: "#FFFFFF", surface: "#FFFFFF", surfaceAlt: "#F5F5F5",
  border: "#E5E5E5", borderStrong: "#D4D4D4",
  accent: "#2563EB", accentDim: "#444444",
  text: "#0A0A0A", muted: "#888888", light: "#BBBBBB",
  danger: "#DC2626",
  setpace: "#FF4500",
};

function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}

function StepBadge({ step }) {
  const color = STEP_COLORS[step] || C.accent;
  return <span style={{ background: color + "12", color, border: `1px solid ${color}35`, borderRadius: 4, padding: "3px 9px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{step}</span>;
}

// ── MEDITATION SCRIPTS ──
const MEDITATIONS = [
  {
    id: "grounding",
    title: "Grounding & Presence",
    sections: [
      "Let's begin. Take a moment to settle into the ground beneath you. Feel your weight pressing down. Your body supported by the floor. Let your hands rest wherever feels natural.",
      "Take a deep breath in through your nose... and out through your mouth. Again, breathe in... and out. One more time, in... and out.",
      "Now let your breathing find its natural rhythm. Notice the air moving in and out of your body. Feel your chest rise and fall. Your breath is always with you, steady and reliable, just like the pace you'll find in your training.",
      "As thoughts come into your mind—things that happened earlier today, things you need to do later—just notice them, and let them pass like clouds moving across the sky. This moment right now is yours. You don't need to be anywhere else. You're exactly where you need to be.",
      "Bring your attention to how your body feels in this moment. Notice any tension in your shoulders, your jaw, your hands. Without judgment, just notice. Then let it soften. Let your body relax into the floor.",
      "Now, with each breath, I want you to imagine yourself becoming more focused, more present. The distractions of the day are fading. You're tuning in to yourself, to this space, to what we're about to do together.",
      "Picture yourself—not as you were yesterday, not as you might be tomorrow—but the best version of yourself. The version that shows up fully. The version that pushes through when things get hard. The version that encourages others. The version that doesn't quit on themselves.",
      "See that person clearly. How do they stand? How do they move? What's the look in their eyes? How do they treat their body? How do they respond when challenged?",
      "This version of you isn't far away. They're not in the future. They're right here, right now, in this moment. With every breath you take, you're stepping into them.",
      "Over the next hour and a half, everything we do builds this person. Every drill, every exercise, every choice you make is either moving you toward this version of yourself or away from it. You get to decide.",
      "Take one more deep breath in... and out.",
      "When you take off your blindfold in a few moments, bring this focus with you. Bring this version of yourself with you. Let's build something today."
    ]
  },
  {
    id: "focus_identity",
    title: "Focus & Identity",
    sections: [
      "Alright everyone, lets come back into this moment.\nWeight planted on the floor.\nBody relaxed.",
      "Start by bringing your attention to your breathing.\nBreathe in slowly through your nose.\nAnd out through your mouth.\n\nAgain.\nIn through the nose…\nout through the mouth.\n\nLet your breathing become natural.\nSteady.\nCalm.\nControlled.",
      "Now, I want you to think about anything you've been carrying.\nAnything that's been sitting in your head.\nAny worries.\nAny pressure.\nAny stress.\nAny bad moments from the last week.\nAnything that's been heavy.\n\nYou don't need to explain it.\nYou don't need to analyse it.\nJust notice it.",
      "Now imagine each breath out is letting it go.\nEvery exhale releases it.\nEvery breath out creates space.\nYou don't carry it into this session.\nYou don't carry it into this training.\n\nLet it go.",
      "Bring your focus fully into the present moment.\nYour body.\nYour breath.\nThis room.\nThis time.\nRight now.\n\nNow shift your attention.",
      "I want you to picture the strongest version of you.\nThe most powerful version of you.\nThe most focused version of you.\nThe version of you that doesn't quit.\nThe version of you that doesn't doubt.\nThe version of you that doesn't fold under pressure.",
      "See them clearly.\nHow they move.\nHow they stand.\nHow they carry themselves.\nHow they think.\nHow they breathe.\nHow they handle challenge.\nHow they handle pressure.\nHow they handle noise.\n\nStrong.\nFocused.\nFast.\nCalm.\nControlled.\nPowerful.\nAbove the noise.",
      "Today, you are becoming them.\nThis session is not just training.\nThis is building identity.\nOver the next hour, you are building that version of you.\n\nFeel what it's like to be them.\nStrong in your body.\nClear in your mind.\nCalm in pressure.\nFocused in chaos.\nConfident without noise.\nGrounded without approval.",
      "Other people can talk.\nOther people can doubt.\nOther people can have opinions.\n\nBut your value comes from your actions.\nNot their words.\nNot their noise.\nNot their judgement.\nYour proof is what you do.\nYour proof is how you show up.\nYour proof is how you train.\nYour proof is how you move.\nYour proof is how you handle hard moments.",
      "Now hold that feeling.\nThat identity.\nThat version of you.\n\nImagine that stronger version of you is all around you.\nLike energy.\nLike presence.\nLike power.\n\nAnd every time you breathe in through your nose,\nyou become more like them.\nEvery breath in builds that version.\nEvery breath in strengthens that identity.\nEvery breath in locks it in.",
      "And anytime today feels hard,\nanytime you feel tired,\nanytime you feel pressure,\nanytime you feel doubt —\nyou come back to your breath.\n\nIn through the nose.\nOut through the mouth.\n\nAnd you become that version again.",
      "Now slowly bring your awareness back to the room.\nFeel your weight on the ground.\nFeel your body.\nFeel the space around you.\n\nWhen you take off your blindfold in a few moments, understand this:\n\nToday there are tasks to complete.\nTraining to do.\nChallenges to face.\nWork to put in.\n\nAnd every task is moving you closer\nto that higher version of you.",
      "We are about to go on a journey.\nThe more focused you are,\nthe faster you become him.\nThe more disciplined you are,\nthe stronger he gets.\nThe more present you are,\nthe quicker the transformation happens.\n\nTake one final deep breath in.\nSlow breath out.\n\nAnd when you're ready…\n\nTake off your blind folds and let's begin."
    ]
  },
];

// ── EXERCISE DATABASE ──
const EQUIPMENT = {
  bodyweight: ["Press-ups", "Squats", "Burpees", "Mountain climbers", "Lunges", "Plank", "Sit-ups", "Jumping jacks", "Tuck jumps", "Tricep dips", "Wall sit"],
  freeweights: ["Dumbbell curls", "Shoulder press", "Goblet squats", "Deadlifts", "Bent-over rows", "Chest press", "Lateral raises", "Farmers walk"],
  bags: ["Bag work — jab cross", "Bag work — hooks", "Bag work — combos", "Bag work — body shots", "Bag work — freestyle rounds"],
  padwork: ["Pad work — basic combos", "Pad work — defence + counter", "Pad work — freestyle"],
  cardio: ["Bike sprint", "Rowing sprint", "Treadmill run", "Skipping"],
};

// ── TIMER COMPONENT ──
function CircuitTimer({ duration, onComplete, exerciseName, stationNumber, totalStations }) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(duration);
    setRunning(false);
    setCompleted(false);
  }, [duration, exerciseName]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setCompleted(true);
            // Vibrate if available
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = ((duration - remaining) / duration) * 100;
  const isLow = remaining <= 10 && remaining > 0;

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
        Station {stationNumber} of {totalStations}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 16 }}>{exerciseName}</div>

      {/* Circular progress */}
      <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 20px" }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke={C.border} strokeWidth="6" />
          <circle cx="90" cy="90" r="80" fill="none"
            stroke={completed ? STEP_COLORS.Rebuild : isLow ? C.danger : C.setpace}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={`${2 * Math.PI * 80 * (1 - pct / 100)}`}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 0.5s" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            fontSize: 48, fontWeight: 900, fontFamily: "'DM Mono', monospace",
            color: completed ? STEP_COLORS.Rebuild : isLow ? C.danger : C.text,
          }}>
            {completed ? "✓" : `${mins}:${secs.toString().padStart(2, "0")}`}
          </div>
          {!completed && <div style={{ fontSize: 11, color: C.muted }}>{running ? "GO" : "Ready"}</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {!completed ? (
          <>
            <button onClick={() => setRunning(!running)} style={{
              padding: "14px 32px", borderRadius: 10, border: "none",
              background: running ? C.danger : C.setpace, color: "#fff",
              fontSize: 16, fontWeight: 800, cursor: "pointer",
            }}>{running ? "Pause" : remaining < duration ? "Resume" : "Start"}</button>
            {running && (
              <button onClick={() => { setRemaining(0); setRunning(false); setCompleted(true); }} style={{
                padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer",
              }}>Skip</button>
            )}
          </>
        ) : (
          <button onClick={onComplete} style={{
            padding: "14px 32px", borderRadius: 10, border: "none",
            background: C.accent, color: C.bg,
            fontSize: 16, fontWeight: 800, cursor: "pointer",
          }}>{stationNumber < totalStations ? "Next Station →" : "Circuit Complete ✓"}</button>
        )}
      </div>
    </div>
  );
}

// ── PULSE CARDS — all 27 from the physical deck ──
const PULSE_CARDS = [
  { theme: "PURE POTENTIAL", question: "Where in my life am I holding back my full power — and what would it look like to finally let it out?", mantra: "I am the force that begins" },
  { theme: "OPENNESS", question: "Where do I need to stop forcing an outcome and trust that things will unfold exactly as they should?", mantra: "In stillness, I receive what is mine" },
  { theme: "PERSEVERANCE", question: "What new thing in my life feels messy and hard right now — and can I find the courage to stay with it anyway?", mantra: "Every breakthrough begins in chaos" },
  { theme: "LEARNING", question: "Where am I too proud to ask for help or admit I don't know — and what would humility open up for me?", mantra: "Not knowing is where learning begins" },
  { theme: "PATIENCE", question: "What am I rushing toward out of anxiety rather than readiness — and what would it feel like to truly wait?", mantra: "The right moment knows my name" },
  { theme: "INNER PEACE", question: "What argument or tension inside me keeps repeating — and what truth am I avoiding that could end it?", mantra: "I release the need to be right" },
  { theme: "DISCIPLINE", question: "What would my life look like if I showed up with full commitment to the one thing that matters most right now?", mantra: "I lead myself with quiet strength" },
  { theme: "BELONGING", question: "Who in my life truly sees me — and am I showing up as honestly for them as they are for me?", mantra: "I am strengthened by those I choose" },
  { theme: "RESTRAINT", question: "Where am I trying to change too much too fast — and what small, steady step could I take today instead?", mantra: "Small acts carried faithfully become great" },
  { theme: "INTEGRITY", question: "Am I living in a way I would be proud of if everyone could see — and if not, what needs to change?", mantra: "I walk lightly and with intention" },
  { theme: "FLOW", question: "Where in my life are things flowing beautifully right now — and how can I honour that without clinging to it?", mantra: "I move with the current of life" },
  { theme: "ACCEPTANCE", question: "Where do I feel completely stuck — and what is this stillness asking me to look at within myself?", mantra: "Even winter prepares the ground for spring" },
  { theme: "COMMUNITY", question: "Where am I isolating when I most need connection — and what one person could I reach out to today?", mantra: "I belong to something larger than myself" },
  { theme: "ABUNDANCE", question: "What do I already have — in gifts, love, or possibility — that I keep overlooking in my search for more?", mantra: "My richness lives in what I already hold" },
  { theme: "HUMILITY", question: "Where am I performing or exaggerating to be seen — and what would I be like if I let myself simply be enough?", mantra: "I shine more when I need to less" },
  { theme: "JOY", question: "What activity or purpose fills me with such aliveness that time disappears — and how often do I allow myself that?", mantra: "My joy is direction, not distraction" },
  { theme: "TIMING", question: "Where am I resisting what life is clearly pointing me toward — and what fear is underneath that resistance?", mantra: "I trust the current more than my map" },
  { theme: "HEALING", question: "What old pattern, wound, or belief am I carrying from my family that no longer belongs to me?", mantra: "I break what was broken before me" },
  { theme: "OPENNESS", question: "Who or what is coming toward me right now that I have been too guarded or distracted to notice?", mantra: "I open my arms to what is arriving" },
  { theme: "PERSPECTIVE", question: "If I could step back and look at my life as a whole right now, what would I see that I cannot see up close?", mantra: "Distance brings the truth I need" },
  { theme: "DECISIVENESS", question: "What decision have I been avoiding that, if made now, would finally free me to move forward?", mantra: "One clear choice clears the path" },
  { theme: "AUTHENTICITY", question: "Where am I using appearance or performance to hide something real — and what would it feel like to drop the mask?", mantra: "My truth is more beautiful than my image" },
  { theme: "LETTING GO", question: "What belief, relationship, or version of myself is falling away right now — and can I let it go without grief?", mantra: "What falls away makes room for what matters" },
  { theme: "RENEWAL", question: "After this difficult season, what part of the real me is slowly finding its way back — and how can I welcome it?", mantra: "I return to myself again and again" },
  { theme: "PRESENCE", question: "Where in my life do I need to act without agenda — purely because it is right, not because of what I'll get?", mantra: "I act from the heart, not the outcome" },
  { theme: "INNER POWER", question: "What powerful energy inside me needs to be channelled rather than suppressed — and how do I do that wisely?", mantra: "Mastery lives in what I hold, not what I release" },
  { theme: "SELF-CARE", question: "What am I feeding my mind, body, and spirit daily — and is it actually making me more alive or more numb?", mantra: "I choose what nourishes, not what numbs" },
  { theme: "LIMITS", question: "Where am I carrying more than I should alone — and who or what could help share the weight right now?", mantra: "Asking for help is not weakness; it is wisdom" },
  { theme: "COURAGE", question: "What feels like the deepest, darkest challenge in my life right now — and what hidden strength has it revealed in me?", mantra: "I am deepened by what I have endured" },
  { theme: "CLARITY", question: "What do I need to be completely honest about with myself — even though it would be more comfortable not to look?", mantra: "My light grows when I choose to see clearly" },
  { theme: "CONNECTION", question: "Who am I influencing right now without realising it — and is the energy I carry something I'd want to pass on?", mantra: "I move others most when I am most myself" },
  { theme: "CONSISTENCY", question: "What commitment in my life has required the most persistence — and what has staying the course taught me about who I am?", mantra: "Steadiness is its own kind of power" },
  { theme: "BOUNDARIES", question: "Where am I staying in a situation, relationship, or habit that is draining me — and what would it mean to lovingly step back?", mantra: "Retreating wisely is not giving up" },
  { theme: "RESPONSIBILITY", question: "Where do I have more power than I admit — and am I using it to build or to protect myself from feeling vulnerable?", mantra: "True power comes from knowing when not to use it" },
  { theme: "GROWTH", question: "What part of me has genuinely grown in the past year — and do I allow myself to acknowledge and celebrate that?", mantra: "I recognise how far I have come" },
  { theme: "RESILIENCE", question: "Where am I having to hide my light or true self to survive a situation — and how do I protect my inner flame?", mantra: "Even covered, my light does not go out" },
  { theme: "ROOTS", question: "What have I inherited from my family — values, wounds, or patterns — that I now need to consciously examine and choose?", mantra: "I choose what I carry forward" },
  { theme: "DIFFERENCE", question: "Where do I feel most misunderstood — and is there a way that my difference might actually be my gift?", mantra: "What makes me different makes me necessary" },
  { theme: "OBSTACLES", question: "What obstacle keeps appearing in my path — and what might it be trying to teach me rather than stop me?", mantra: "Every wall asks me which direction to turn" },
  { theme: "RELEASE", question: "What tension, resentment, or burden am I carrying that I could actually put down today — and what would that freedom feel like?", mantra: "I am lighter than I know" },
  { theme: "SIMPLICITY", question: "What could I let go of — possession, habit, or need for approval — that would actually make my life feel richer?", mantra: "Less of the unreal makes room for the real" },
  { theme: "GENEROSITY", question: "Where could I offer more of my time, energy, or genuine self — and who in my life most needs what I have to give?", mantra: "In giving I discover what I truly have" },
  { theme: "TRUTH", question: "What truth do I know I need to speak — to myself or someone else — that I have been too afraid to say out loud?", mantra: "Speaking my truth clears the air I breathe" },
  { theme: "DISCERNMENT", question: "Who or what is entering my life right now that looks like an opportunity but might be pulling me off my path?", mantra: "I choose what I let in with wisdom" },
  { theme: "PURPOSE", question: "What do I believe in deeply enough to gather others around — and am I living in a way that reflects that belief?", mantra: "My conviction becomes a place people gather" },
  { theme: "AMBITION", question: "What am I genuinely working toward — and is it something that comes from my own deep longing or from what others expect of me?", mantra: "I grow toward what is truly mine" },
  { theme: "REST", question: "Where have I pushed past my limits for so long that I've forgotten what it feels like to be rested and whole?", mantra: "Rest is not a reward — it is a requirement" },
  { theme: "INNER SOURCE", question: "What is the deepest source of my energy, creativity, or meaning — and am I visiting it regularly enough?", mantra: "I draw from a source that never runs dry" },
  { theme: "CHANGE", question: "What old way of seeing myself or the world is ready to be overthrown — and what new version wants to take its place?", mantra: "I shed what I have outgrown without shame" },
  { theme: "TRANSFORMATION", question: "What life experience has transformed me most — and what wisdom has been cooked out of that difficulty?", mantra: "I am made new by what I have survived" },
  { theme: "SHOCK", question: "What unexpected event or shock in my life has woken me up to something I was sleepwalking through?", mantra: "I am shaken awake into what matters" },
  { theme: "STILLNESS", question: "Where in my life do I need to choose presence over speed — and what am I afraid I might feel if I actually slowed down?", mantra: "Stillness of the body brings clarity of the heart" },
  { theme: "PROCESS", question: "Where am I so focused on the destination that I am completely missing the beauty or lessons of the journey?", mantra: "Each step taken honestly is the path" },
  { theme: "ROLES", question: "Where am I playing a role — in relationships, family, or work — that no longer fits who I'm actually becoming?", mantra: "I grow into my truest self, not the role assigned" },
  { theme: "FULLNESS", question: "When did I last feel truly full — not just busy — and what conditions make that feeling possible for me?", mantra: "I let myself be full without needing it to last" },
  { theme: "IDENTITY", question: "Where do I feel like I don't fully belong — and could that outsider perspective actually be a strength rather than a wound?", mantra: "My roots travel with me wherever I go" },
  { theme: "INFLUENCE", question: "Where would a soft, persistent approach work better than force — and what am I trying to push through that needs patience instead?", mantra: "Gentle and consistent, I shape what matters" },
  { theme: "DELIGHT", question: "When did I last feel genuine, uncomplicated joy — and what conditions, people, or choices bring that alive in me?", mantra: "Joy is not frivolous — it is fuel" },
  { theme: "DISSOLVING BARRIERS", question: "What wall between myself and another person — or between myself and my own feelings — is it time to gently dissolve?", mantra: "I let the boundaries soften that no longer protect me" },
  { theme: "STRUCTURE", question: "Where in my life would a healthy boundary or structure actually set me free rather than confine me?", mantra: "The right limits create the right freedom" },
  { theme: "SINCERITY", question: "Where am I saying what people want to hear instead of what I truly feel — and what is that costing me?", mantra: "My sincerity is the most powerful thing I carry" },
  { theme: "DETAIL", question: "Where have I been thinking too big and missing the small, careful actions that would actually move things forward?", mantra: "Today's small thing is tomorrow's turning point" },
  { theme: "INTEGRATION", question: "What chapter of my life has just ended — and am I taking time to truly integrate what it taught me before rushing into the next?", mantra: "I honour endings before I begin again" },
  { theme: "THRESHOLD", question: "I am standing at the edge of something new — what do I most need to remember about who I am as I step into it?", mantra: "I cross every threshold carrying my whole self" },
];

// ── WARM-UP / STRETCH EXERCISES ──
const WARMUP_EXERCISES = [
  { name: "Arm circles (forward & back)", icon: "🔄", body: "Upper", tip: "20 each direction — big controlled circles" },
  { name: "Leg swings (front & side)", icon: "🦵", body: "Lower", tip: "15 each leg — hold a wall for balance" },
  { name: "High knees", icon: "🏃", body: "Full", tip: "30 seconds — drive knees to hip height" },
  { name: "Butt kicks", icon: "💨", body: "Lower", tip: "30 seconds — heels touch glutes each rep" },
  { name: "Jumping jacks", icon: "⭐", body: "Full", tip: "30 seconds — full arm extension overhead" },
  { name: "Neck rolls", icon: "🔃", body: "Upper", tip: "10 each direction — slow and controlled" },
  { name: "Hip circles", icon: "🔵", body: "Core", tip: "15 each direction — hands on hips, wide circles" },
  { name: "Inchworms", icon: "🐛", body: "Full", tip: "8 reps — walk hands out to plank, walk back" },
  { name: "Lateral shuffles", icon: "↔️", body: "Lower", tip: "30 seconds — stay low, 4 steps each side" },
  { name: "Light jog on spot", icon: "🏃‍♂️", body: "Full", tip: "60 seconds — easy pace, loosen everything up" },
];

const STRETCH_EXERCISES = [
  { name: "Quad stretch", icon: "🦵", body: "Lower", tip: "30s each leg — pull heel to glute, knees together", side: true },
  { name: "Hamstring stretch", icon: "🧎", body: "Lower", tip: "30s each leg — foot forward, hinge at hips" },
  { name: "Calf stretch", icon: "🦶", body: "Lower", tip: "30s each leg — wall press, back heel down" },
  { name: "Hip flexor stretch", icon: "🏋️", body: "Lower", tip: "30s each side — deep lunge, back knee on floor" },
  { name: "Shoulder stretch (across body)", icon: "💪", body: "Upper", tip: "20s each arm — pull elbow across chest" },
  { name: "Tricep stretch (overhead)", icon: "🙆", body: "Upper", tip: "20s each arm — reach behind head, press elbow" },
  { name: "Child's pose", icon: "🧒", body: "Full", tip: "45s — sit back on heels, arms extended, breathe" },
  { name: "Cat-cow stretch", icon: "🐈", body: "Core", tip: "10 reps — alternate arching and rounding spine" },
  { name: "Seated forward fold", icon: "🧘", body: "Lower", tip: "45s — legs straight, reach for toes, relax neck" },
  { name: "Pigeon stretch", icon: "🐦", body: "Lower", tip: "45s each side — front shin across, fold forward", side: true },
];

// ── MAIN COMPONENT ──
const PHASES = ["setup", "meditation", "activity_select", "circuit", "pulse", "feedback", "wrapup"];

export default function SetPaceSession({ youngPeople, mentors, currentUser, sessions, savedGroups, onComplete, onCancel }) {
  // ── State ──
  const [phase, setPhase] = useState("setup");
  const [selectedYP, setSelectedYP] = useState([]);
  const [coMentors, setCoMentors] = useState([]);
  const [location, setLocation] = useState("Set Pace");
  const [newPersonName, setNewPersonName] = useState("");
  const [allYP, setAllYP] = useState(youngPeople);
  const [selectedSavedGroup, setSelectedSavedGroup] = useState(null);
  const [startTime] = useState(new Date());
  const [focusStep, setFocusStep] = useState("Reset");

  // Activity hub
  const [completedActivities, setCompletedActivities] = useState([]);
  const [activeActivity, setActiveActivity] = useState(null);
  // Interval timer state
  const [timerWorkDuration, setTimerWorkDuration] = useState(45);
  const [timerRestDuration, setTimerRestDuration] = useState(15);
  const [timerRounds, setTimerRounds] = useState(5);
  const [timerCurrentRound, setTimerCurrentRound] = useState(1);
  const [timerIsRest, setTimerIsRest] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(45);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [warmupChecked, setWarmupChecked] = useState({});
  const [stretchChecked, setStretchChecked] = useState({});

  // Meditation
  const [selectedMeditation, setSelectedMeditation] = useState(0);
  const [meditationSection, setMeditationSection] = useState(0);

  // Circuit
  const [exercises, setExercises] = useState([]);
  const [stationDuration, setStationDuration] = useState(45);
  const [restDuration, setRestDuration] = useState(15);
  const [rounds, setRounds] = useState(3);
  const [currentStation, setCurrentStation] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRest, setIsRest] = useState(false);
  const [circuitStarted, setCircuitStarted] = useState(false);
  const [circuitComplete, setCircuitComplete] = useState(false);

  // Outdoor games
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameElapsed, setGameElapsed] = useState(0);
  const [gameTimerRunning, setGameTimerRunning] = useState(false);
  const gameTimerRef = useRef(null);

  // Pulse cards
  const [pulseCards, setPulseCards] = useState([]);
  const [pulseIdx, setPulseIdx] = useState(0);
  const [pulseResponses, setPulseResponses] = useState([]);
  const [currentPulseAnswer, setCurrentPulseAnswer] = useState("");
  const [cardRevealed, setCardRevealed] = useState(false);
  const [pulseRespondent, setPulseRespondent] = useState("");

  // Wrapup
  const [scores, setScores] = useState({});
  const [quick, setQuick] = useState({});
  const [notes, setNotes] = useState("");
  const [mentorReflection, setMentorReflection] = useState("");
  const [safeguarding, setSafeguarding] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const spRecognitionRef = useRef(null);

  // Feedback
  const [savedSessionIds, setSavedSessionIds] = useState([]);
  const [ypFeedback, setYpFeedback] = useState({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackYP, setFeedbackYP] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  // ── Session persistence (survives phone lock / tab kill) ──
  const SP_SAVE_KEY = "sf_setpace_session_" + currentUser.id;

  const saveSessionState = useCallback(() => {
    if (phase === "setup") return;
    try {
      const state = {
        phase, selectedYP: selectedYP.map(y => ({ id: y.id, name: y.name })),
        coMentors: coMentors.map(m => ({ id: m.id, name: m.name })),
        location, startTime: startTime.toISOString(), focusStep,
        completedActivities, scores, quick, notes, mentorReflection, safeguarding,
        pulseResponses, ypFeedback, feedbackSubmitted,
        mediaFiles: mediaFiles.filter(m => m.url).map(m => ({ url: m.url, mediaType: m.mediaType, caption: m.caption })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SP_SAVE_KEY, JSON.stringify(state));
    } catch (e) { console.warn("SetPace session save failed:", e); }
  }, [phase, selectedYP, coMentors, location, startTime, focusStep,
      completedActivities, scores, quick, notes, mentorReflection, safeguarding,
      pulseResponses, ypFeedback, feedbackSubmitted, mediaFiles, SP_SAVE_KEY]);

  const clearSavedSession = useCallback(() => {
    try { localStorage.removeItem(SP_SAVE_KEY); } catch {}
  }, [SP_SAVE_KEY]);

  // Check for saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SP_SAVE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        const savedAt = new Date(state.savedAt);
        const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 12 && state.phase !== "setup") {
          setPendingRestore(state);
          setShowResumePrompt(true);
        } else { clearSavedSession(); }
      }
    } catch { clearSavedSession(); }
  }, []);

  // Auto-save on key changes
  useEffect(() => {
    if (phase === "setup" || showResumePrompt) return;
    const timer = setTimeout(() => saveSessionState(), 500);
    return () => clearTimeout(timer);
  }, [phase, scores, quick, notes, mentorReflection, safeguarding, completedActivities,
      pulseResponses, ypFeedback, saveSessionState, showResumePrompt]);

  // Save on visibility change (phone lock)
  useEffect(() => {
    if (phase === "setup") return;
    const saveOnHide = () => { if (document.visibilityState === "hidden") saveSessionState(); };
    const saveOnPageHide = () => saveSessionState();
    document.addEventListener("visibilitychange", saveOnHide);
    window.addEventListener("pagehide", saveOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", saveOnHide);
      window.removeEventListener("pagehide", saveOnPageHide);
    };
  }, [phase, saveSessionState]);

  const restoreSession = () => {
    if (!pendingRestore) return;
    const s = pendingRestore;
    setSelectedYP((s.selectedYP || []).map(saved => youngPeople.find(yp => yp.id === saved.id) || saved).filter(Boolean));
    setCoMentors((s.coMentors || []).map(saved => mentors.find(m => m.id === saved.id) || saved).filter(Boolean));
    setLocation(s.location || "Set Pace");
    setFocusStep(s.focusStep || "Reset");
    setCompletedActivities(s.completedActivities || []);
    setScores(s.scores || {});
    setQuick(s.quick || {});
    setNotes(s.notes || "");
    setMentorReflection(s.mentorReflection || "");
    setSafeguarding(s.safeguarding || "");
    setPulseResponses(s.pulseResponses || []);
    setYpFeedback(s.ypFeedback || {});
    setFeedbackSubmitted(s.feedbackSubmitted || false);
    setMediaFiles(s.mediaFiles || []);
    setPhase(s.phase);
    setShowResumePrompt(false);
    setPendingRestore(null);
  };

  const discardSavedSession = () => {
    clearSavedSession();
    setShowResumePrompt(false);
    setPendingRestore(null);
  };

  const handleCancel = () => { clearSavedSession(); onCancel(); };

  // ── Helpers ──
  // Sound system — uses refs so sounds fire outside React state updaters
  const timerRemainingRef = useRef(45);
  const timerIsRestRef = useRef(false);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (mobile browsers require user gesture)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((freq = 800, duration = 150, vol = 0.3) => {
    try {
      const ctx = ensureAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) { console.warn("beep failed:", e); }
  }, [ensureAudioCtx]);

  // Boxing bell tap — short percussive hit at 10s warning
  const playTap = useCallback(() => {
    try {
      const ctx = ensureAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1800;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { console.warn("tap failed:", e); }
  }, [ensureAudioCtx]);

  // End of work/rest — boxing bell triple
  const playEndSound = useCallback(() => {
    playBeep(880, 200, 0.5);
    setTimeout(() => playBeep(1100, 200, 0.5), 250);
    setTimeout(() => playBeep(1320, 400, 0.6), 500);
  }, [playBeep]);

  // Interval timer effect — restart interval on phase changes
  useEffect(() => {
    if (!timerRunning || timerRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        const next = prev - 1;
        timerRemainingRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timerIsRest, timerCurrentRound]);

  // Separate effect for sounds — reacts to timerRemaining changes
  useEffect(() => {
    if (!timerRunning) return;
    const r = timerRemaining;
    // 10 second warning — double tap
    if (r === 10) { playTap(); setTimeout(() => playTap(), 150); }
    // 5 second warning — single tap
    if (r === 5) playTap();
    // Countdown beeps at 3, 2, 1 — square wave, loud and sharp
    if (r === 3) playBeep(700, 180, 0.5);
    if (r === 2) playBeep(900, 180, 0.55);
    if (r === 1) playBeep(1100, 250, 0.6);
    // Phase complete
    if (r <= 0) {
      clearInterval(timerRef.current);
      playEndSound();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      // Auto-advance
      if (!timerIsRest) {
        if (timerCurrentRound < timerRounds) {
          setTimerIsRest(true);
          timerIsRestRef.current = true;
          setTimerRemaining(timerRestDuration);
          timerRemainingRef.current = timerRestDuration;
        } else {
          setTimerRunning(false);
          setTimerComplete(true);
        }
      } else {
        setTimerIsRest(false);
        timerIsRestRef.current = false;
        setTimerCurrentRound(rnd => rnd + 1);
        setTimerRemaining(timerWorkDuration);
        timerRemainingRef.current = timerWorkDuration;
      }
    }
  }, [timerRemaining, timerRunning, timerIsRest, timerCurrentRound, timerRounds, timerWorkDuration, timerRestDuration, playBeep, playTap, playEndSound]);

  // ── Voice Reflection ──
  const startSpVoiceRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Try Chrome or Safari."); return; }
    const recognition = new SR();
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
    recognition.onerror = (e) => { if (e.error !== "no-speech") stopSpVoiceRecording(); };
    recognition.onend = () => { if (isRecording) recognition.start(); };
    spRecognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setVoiceTranscript("");
  };

  const stopSpVoiceRecording = async () => {
    if (spRecognitionRef.current) { spRecognitionRef.current.onend = null; spRecognitionRef.current.stop(); }
    setIsRecording(false);
    const transcript = voiceTranscript.trim();
    if (!transcript) return;
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

  const toggleYP = (yp) => setSelectedYP(prev => prev.find(p => p.id === yp.id) ? prev.filter(p => p.id !== yp.id) : [...prev, yp]);
  const participantCount = selectedYP.length;

  // Generate circuit based on participant count
  const generateCircuit = () => {
    const numStations = Math.min(participantCount + 2, 8); // 2 more stations than people for rotation
    const allExercises = [...EQUIPMENT.bodyweight, ...EQUIPMENT.freeweights, ...EQUIPMENT.bags, ...EQUIPMENT.padwork, ...EQUIPMENT.cardio];
    const shuffled = allExercises.sort(() => Math.random() - 0.5);

    // Ensure variety — at least one from each category
    const circuit = [];
    const categories = Object.entries(EQUIPMENT);
    categories.forEach(([cat, exs]) => {
      if (circuit.length < numStations) {
        circuit.push(exs[Math.floor(Math.random() * exs.length)]);
      }
    });
    // Fill remaining with random
    while (circuit.length < numStations) {
      const ex = shuffled.find(e => !circuit.includes(e));
      if (ex) circuit.push(ex);
      else break;
    }
    setExercises(circuit);
  };

  const startCircuit = () => {
    if (exercises.length === 0) generateCircuit();
    setCircuitStarted(true);
    setCurrentStation(0);
    setCurrentRound(1);
    setIsRest(false);
  };

  const handleStationComplete = () => {
    if (isRest) {
      setIsRest(false);
      if (currentStation < exercises.length - 1) {
        setCurrentStation(prev => prev + 1);
      } else if (currentRound < rounds) {
        setCurrentRound(prev => prev + 1);
        setCurrentStation(0);
      } else {
        setCircuitComplete(true);
      }
    } else {
      // Just finished an exercise, go to rest
      if (currentStation < exercises.length - 1 || currentRound < rounds) {
        setIsRest(true);
      } else {
        setCircuitComplete(true);
      }
    }
  };

  // Pulse cards setup
  const startPulse = () => {
    const shuffled = [...PULSE_CARDS].sort(() => Math.random() - 0.5);
    setPulseCards(shuffled.slice(0, 5));
    setPulseIdx(0);
    setCardRevealed(false);
    setPhase("pulse");
  };

  // ── SUBMIT ──
  const handleSubmit = async () => {
    setSubmitting(true);
    const stepAverages = computeStepAverages(scores);
    const endTime = new Date();
    const durationMins = Math.round((endTime - startTime) / 60000);
    const sessionLength = durationMins < 45 ? "30 mins" : durationMins < 90 ? "1 Hour" : "2 Hours";

    let enrichedNotes = `[SET PACE SESSION]\n${notes}`;
    if (exercises.length > 0) {
      enrichedNotes += `\n\n--- Circuit (${rounds} rounds × ${stationDuration}s work / ${restDuration}s rest) ---\n${exercises.map((e, i) => `${i + 1}. ${e}`).join("\n")}`;
    }
    if (pulseResponses.length > 0) {
      enrichedNotes += `\n\n--- Pulse Card Responses ---\n${pulseResponses.map(r => `[${r.theme}] ${r.question}\nA: "${r.answer}"\nMantra: ${PULSE_CARDS.find(c => c.theme === r.theme)?.mantra || ""}`).join("\n\n")}`;
    }
    if (mediaFiles.length > 0) {
      enrichedNotes += `\n\n--- Media ---\n${mediaFiles.map(m => `${m.mediaType}: ${m.url}`).join("\n")}`;
    }

    const ids = [];
    const groupId = selectedYP.length > 1 ? crypto.randomUUID() : null;
    for (const yp of selectedYP) {
      const sessionPayload = {
        mentorId: currentUser.id, youngPersonId: yp.id,
        date: startTime.toISOString().split("T")[0],
        focusStep, sessionLength, partnerOrg: "Set Pace",
        isGroup: selectedYP.length > 1, groupId,
        scores, quick, stepAverages,
        notes: enrichedNotes, mentorReflection, safeguarding,
        coMentorIds: coMentors.map(m => m.id),
        notificationPayload: {
          mentorName: currentUser.name,
          youngPersonName: yp.name,
          date: startTime.toISOString().split("T")[0],
          focusStep, sessionLength, partnerOrg: "Set Pace",
          isGroup: selectedYP.length > 1, quick, stepAverages,
          notes: enrichedNotes, mentorReflection, safeguarding,
        },
        ypFeedback: Object.keys(ypFeedback).length > 0 ? ypFeedback : null,
      };
      const { data, queued } = await db.createSessionOfflineAware(sessionPayload);
      if (data?.id) ids.push({ sessionId: data.id, ypId: yp.id, ypName: yp.name, offline: queued });
    }

    // Notifications only for online saves
    if (ids.length > 0 && !ids[0].offline) {
      db.sendSessionNotifications({
        mentorName: currentUser.name,
        youngPersonName: selectedYP.map(yp => yp.name).join(", "),
        date: startTime.toISOString().split("T")[0],
        focusStep, sessionLength, partnerOrg: "Set Pace",
        isGroup: selectedYP.length > 1, quick, stepAverages,
        notes: enrichedNotes, mentorReflection, safeguarding,
      });
    }

    setSavedSessionIds(ids);

    // Save YP feedback only for online saves
    const hasYPFeedback = Object.keys(ypFeedback).length > 0;
    if (hasYPFeedback && ids.length > 0 && !ids[0].offline) {
      for (const { sessionId, ypId } of ids) {
        try { await db.saveYPFeedback({ sessionId, youngPersonId: ypId, responses: ypFeedback }); } catch {}
      }
    }

    setSubmitting(false);
    clearSavedSession();
    onComplete();
  };

  const handleFeedbackSubmit = async () => {
    setFeedbackSubmitted(true);
    setTimeout(() => { setPhase("wrapup"); }, 600);
  };

  const RatingInput = ({ value, onChange, max = 5 }) => (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 36, height: 36, borderRadius: "50%",
          border: `1.5px solid ${value === n ? C.setpace : C.border}`,
          background: value === n ? C.setpace : "transparent",
          color: value === n ? "#fff" : C.muted,
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>{n}</button>
      ))}
    </div>
  );

  // ════════════════════════════════════
  // RENDER
  // ════════════════════════════════════

  // ── RESUME PROMPT ──
  if (showResumePrompt && pendingRestore) {
    const savedAt = new Date(pendingRestore.savedAt);
    const ypNames = (pendingRestore.selectedYP || []).map(y => y.name).join(", ");
    return (
      <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.setpace + "15", border: `1.5px solid ${C.setpace}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>↻</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Resume Set Pace session?</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: "0 0 6px" }}>
          You have an unfinished session with <strong style={{ color: C.text }}>{ypNames || "your group"}</strong>
        </p>
        <p style={{ fontSize: 12, color: C.light, margin: "0 0 28px" }}>
          Saved at {savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={discardSavedSession} style={{ padding: "14px 28px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer" }}>Start Fresh</button>
          <button onClick={restoreSession} style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: C.setpace, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Resume →</button>
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
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.setpace }}>Set Pace Session</h2>
            <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>Meditation → Circuit → Pulse Cards → Summary</p>
          </div>
          <button onClick={handleCancel} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
        </div>

        {/* Saved groups */}
        {savedGroups?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Load Group</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {savedGroups.map(g => (
                <button key={g.id} onClick={() => {
                  setSelectedSavedGroup(g);
                  const members = allYP.filter(yp => g.member_ids.includes(yp.id));
                  setSelectedYP(members);
                }} style={{
                  padding: "6px 14px", borderRadius: 100,
                  border: `1.5px solid ${selectedSavedGroup?.id === g.id ? C.setpace : C.border}`,
                  background: selectedSavedGroup?.id === g.id ? C.setpace + "15" : "transparent",
                  color: selectedSavedGroup?.id === g.id ? C.setpace : C.muted,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>{g.name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Young people */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>
            Who's here? ({selectedYP.length})
          </div>
          {selectedYP.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {selectedYP.map(yp => (
                <span key={yp.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 12px", borderRadius: 100, background: C.setpace, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                  {yp.name}
                  <button onClick={() => toggleYP(yp)} style={{ background: "rgba(255,255,255,0.3)", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {allYP.filter(yp => !selectedYP.find(s => s.id === yp.id)).map(yp => (
              <button key={yp.id} onClick={() => toggleYP(yp)} style={{ padding: "5px 12px", borderRadius: 100, border: `1.5px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ {yp.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Add someone new..." onKeyDown={async e => {
              if (e.key === "Enter" && newPersonName.trim()) {
                const { data } = await db.createYoungPerson(newPersonName.trim());
                if (data) { setAllYP(prev => [...prev, data]); setSelectedYP(prev => [...prev, data]); setNewPersonName(""); }
              }
            }} style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Co-mentors */}
        {otherMentors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Co-Mentors</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {otherMentors.map(m => {
                const sel = coMentors.find(c => c.id === m.id);
                return <button key={m.id} onClick={() => setCoMentors(prev => sel ? prev.filter(c => c.id !== m.id) : [...prev, m])} style={{ padding: "5px 12px", borderRadius: 100, border: `1.5px solid ${sel ? C.setpace : C.border}`, background: sel ? C.setpace + "15" : "transparent", color: sel ? C.setpace : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{m.name}</button>;
              })}
            </div>
          </div>
        )}

        <button onClick={() => { if (selectedYP.length > 0) { generateCircuit(); setPhase("meditation"); } }} disabled={selectedYP.length === 0} style={{
          width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
          background: selectedYP.length > 0 ? C.setpace : C.border,
          color: selectedYP.length > 0 ? "#fff" : C.muted,
          fontSize: 16, fontWeight: 800, cursor: selectedYP.length > 0 ? "pointer" : "default",
        }}>Begin Session →</button>
      </div>
    );
  }

  // ── MEDITATION ──
  if (phase === "meditation") {
    const med = MEDITATIONS[selectedMeditation];
    const section = med.sections[meditationSection];
    const isLast = meditationSection >= med.sections.length - 1;

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
        </div>

        {/* Meditation selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {MEDITATIONS.map((m, i) => (
            <button key={m.id} onClick={() => { setSelectedMeditation(i); setMeditationSection(0); }} style={{
              flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${selectedMeditation === i ? C.setpace : C.border}`,
              background: selectedMeditation === i ? C.setpace + "12" : "transparent",
              color: selectedMeditation === i ? C.setpace : C.muted, cursor: "pointer",
            }}>{m.title}</button>
          ))}
        </div>

        <div style={{ fontSize: 10, color: C.setpace, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
          {meditationSection + 1} / {med.sections.length}
        </div>

        <Card style={{ padding: 28, minHeight: 200, borderLeft: `3px solid ${C.setpace}40` }}>
          <div style={{ fontSize: 16, lineHeight: 2, color: C.text, whiteSpace: "pre-line" }}>{section}</div>
        </Card>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={() => setMeditationSection(prev => Math.max(0, prev - 1))} disabled={meditationSection === 0} style={{
            padding: "14px 24px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: meditationSection === 0 ? C.border : C.muted,
            fontSize: 14, cursor: meditationSection === 0 ? "default" : "pointer",
          }}>← Back</button>
          <button onClick={() => {
            if (isLast) setPhase("activity_select");
            else setMeditationSection(prev => prev + 1);
          }} style={{
            flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
            background: C.setpace, color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>{isLast ? "Continue →" : "Next →"}</button>
          <button onClick={() => setPhase("activity_select")} style={{
            padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer",
          }}>Skip</button>
        </div>
      </div>
    );
  }

  // ── ACTIVITY SELECT HUB ──
  if (phase === "activity_select") {
    // If an activity is active, show its screen
    if (activeActivity === "warmup") {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🔥 Warm Up</h2>
            <button onClick={() => { setCompletedActivities(prev => prev.includes("warmup") ? prev : [...prev, "warmup"]); setActiveActivity(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Done ✓</button>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Tick off exercises as you go — {Object.values(warmupChecked).filter(Boolean).length}/{WARMUP_EXERCISES.length} done</p>
          <div style={{ display: "grid", gap: 8 }}>
            {WARMUP_EXERCISES.map((ex, i) => (
              <Card key={i} onClick={() => setWarmupChecked(prev => ({ ...prev, [i]: !prev[i] }))} style={{
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                opacity: warmupChecked[i] ? 0.5 : 1, transition: "all 0.2s",
                borderLeft: warmupChecked[i] ? `3px solid ${STEP_COLORS.Rebuild}` : "3px solid transparent",
              }}>
                <div style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: "center" }}>{ex.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: warmupChecked[i] ? C.muted : C.text, textDecoration: warmupChecked[i] ? "line-through" : "none" }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{ex.tip}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 9, color: C.light, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{ex.body}</span>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${warmupChecked[i] ? STEP_COLORS.Rebuild : C.border}`, background: warmupChecked[i] ? STEP_COLORS.Rebuild : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {warmupChecked[i] && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <button onClick={() => { setCompletedActivities(prev => prev.includes("warmup") ? prev : [...prev, "warmup"]); setActiveActivity(null); }} style={{
            width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
            background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 20,
          }}>Complete Warm Up →</button>
        </div>
      );
    }

    if (activeActivity === "stretches") {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🧘 Stretches</h2>
            <button onClick={() => { setCompletedActivities(prev => prev.includes("stretches") ? prev : [...prev, "stretches"]); setActiveActivity(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>Done ✓</button>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Hold each stretch — {Object.values(stretchChecked).filter(Boolean).length}/{STRETCH_EXERCISES.length} done</p>
          <div style={{ display: "grid", gap: 8 }}>
            {STRETCH_EXERCISES.map((ex, i) => (
              <Card key={i} onClick={() => setStretchChecked(prev => ({ ...prev, [i]: !prev[i] }))} style={{
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                opacity: stretchChecked[i] ? 0.5 : 1, transition: "all 0.2s",
                borderLeft: stretchChecked[i] ? `3px solid ${STEP_COLORS.Rebuild}` : "3px solid transparent",
              }}>
                <div style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: "center" }}>{ex.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: stretchChecked[i] ? C.muted : C.text, textDecoration: stretchChecked[i] ? "line-through" : "none" }}>
                    {ex.name}{ex.side ? " (each side)" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{ex.tip}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 9, color: C.light, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{ex.body}</span>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${stretchChecked[i] ? STEP_COLORS.Rebuild : C.border}`, background: stretchChecked[i] ? STEP_COLORS.Rebuild : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {stretchChecked[i] && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <button onClick={() => { setCompletedActivities(prev => prev.includes("stretches") ? prev : [...prev, "stretches"]); setActiveActivity(null); }} style={{
            width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
            background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginTop: 20,
          }}>Complete Stretches →</button>
        </div>
      );
    }

    if (activeActivity === "timer") {
      const tMins = Math.floor(timerRemaining / 60);
      const tSecs = timerRemaining % 60;
      const currentDuration = timerIsRest ? timerRestDuration : timerWorkDuration;
      const tPct = currentDuration > 0 ? ((currentDuration - timerRemaining) / currentDuration) * 100 : 0;
      const totalSets = timerRounds;
      const isLow = timerRemaining <= 3 && timerRemaining > 0;

      // Setup screen (before timer starts)
      if (!timerStarted) {
        const totalTime = timerRounds * (timerWorkDuration + timerRestDuration) - timerRestDuration;
        return (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>⏱ Interval Timer</h2>
              <button onClick={() => { setActiveActivity(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>← Back</button>
            </div>

            <Card style={{ marginBottom: 16, padding: 16 }}>
              <div style={{ display: "grid", gap: 16 }}>
                {/* Work duration */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: C.setpace, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Work Time</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.setpace, fontFamily: "'DM Mono', monospace" }}>{timerWorkDuration}s</div>
                  </div>
                  <input type="range" min={10} max={180} step={5} value={timerWorkDuration}
                    onChange={e => { setTimerWorkDuration(Number(e.target.value)); setTimerRemaining(Number(e.target.value)); }}
                    style={{ width: "100%", accentColor: C.setpace }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 2 }}>
                    <span>10s</span><span>60s</span><span>120s</span><span>180s</span>
                  </div>
                </div>

                {/* Rest duration */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: STEP_COLORS.Rebuild, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Rest Time</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: STEP_COLORS.Rebuild, fontFamily: "'DM Mono', monospace" }}>{timerRestDuration}s</div>
                  </div>
                  <input type="range" min={0} max={120} step={5} value={timerRestDuration}
                    onChange={e => setTimerRestDuration(Number(e.target.value))}
                    style={{ width: "100%", accentColor: STEP_COLORS.Rebuild }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.light, marginTop: 2 }}>
                    <span>0s</span><span>30s</span><span>60s</span><span>120s</span>
                  </div>
                </div>

                {/* Rounds */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Rounds</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.text, fontFamily: "'DM Mono', monospace" }}>{timerRounds}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map(r => (
                      <button key={r} onClick={() => setTimerRounds(r)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${timerRounds === r ? C.setpace : C.border}`,
                        background: timerRounds === r ? C.setpace + "15" : "transparent",
                        color: timerRounds === r ? C.setpace : C.muted,
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick presets */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "Tabata", w: 20, r: 10, rds: 8 },
                { label: "HIIT", w: 40, r: 20, rds: 6 },
                { label: "Boxing", w: 180, r: 60, rds: 3 },
                { label: "EMOM", w: 45, r: 15, rds: 10 },
              ].map(p => (
                <button key={p.label} onClick={() => { setTimerWorkDuration(p.w); setTimerRestDuration(p.r); setTimerRounds(p.rds); setTimerRemaining(p.w); }} style={{
                  padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${C.border}`, background: "transparent", color: C.muted,
                }}>{p.label} ({p.w}/{p.r}×{p.rds})</button>
              ))}
            </div>

            <Card style={{ padding: 14, marginBottom: 20, background: C.surfaceAlt }}>
              <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
                Total: {timerRounds} rounds × ({timerWorkDuration}s work + {timerRestDuration}s rest) = ~{Math.ceil(totalTime / 60)} min
              </div>
            </Card>

            <button onClick={() => {
              setTimerStarted(true);
              setTimerCurrentRound(1);
              setTimerIsRest(false);
              setTimerRemaining(timerWorkDuration);
              setTimerComplete(false);
              // Unlock audio context on user gesture (required for mobile)
              ensureAudioCtx();
              playBeep(600, 80, 0.2); // Quick confirmation beep
              setTimerRunning(true);
            }} style={{
              width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
              background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer",
            }}>Start Timer →</button>
          </div>
        );
      }

      // Complete screen
      if (timerComplete) {
        return (
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏱✓</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Timer Complete</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>{timerRounds} rounds done</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setTimerStarted(false); setTimerComplete(false); }} style={{ padding: "14px 24px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Run Again</button>
              <button onClick={() => { setCompletedActivities(prev => prev.includes("timer") ? prev : [...prev, "timer"]); setActiveActivity(null); setTimerStarted(false); setTimerComplete(false); }} style={{ padding: "14px 32px", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Back to Activities →</button>
            </div>
          </div>
        );
      }

      // Active timer
      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Round {timerCurrentRound}/{totalSets}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{
                padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 800,
                background: timerIsRest ? STEP_COLORS.Rebuild + "20" : C.setpace + "20",
                color: timerIsRest ? STEP_COLORS.Rebuild : C.setpace,
              }}>{timerIsRest ? "REST" : "WORK"}</div>
              <button onClick={() => { setTimerRunning(false); setTimerComplete(true); }} style={{
                padding: "4px 10px", borderRadius: 100, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>End</button>
            </div>
          </div>

          {/* Round indicators */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {Array.from({ length: totalSets }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i + 1 < timerCurrentRound ? STEP_COLORS.Rebuild
                  : i + 1 === timerCurrentRound ? (timerIsRest ? STEP_COLORS.Rebuild : C.setpace)
                  : C.border,
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          {/* Timer display */}
          <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto 24px" }}>
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="96" fill="none" stroke={C.border} strokeWidth="8" />
              <circle cx="110" cy="110" r="96" fill="none"
                stroke={timerIsRest ? STEP_COLORS.Rebuild : isLow ? C.danger : C.setpace}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 96}`}
                strokeDashoffset={`${2 * Math.PI * 96 * (1 - tPct / 100)}`}
                transform="rotate(-90 110 110)"
                style={{ transition: "stroke-dashoffset 0.5s, stroke 0.3s" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                fontSize: 56, fontWeight: 900, fontFamily: "'DM Mono', monospace",
                color: timerIsRest ? STEP_COLORS.Rebuild : isLow ? C.danger : C.text,
                transition: "color 0.3s",
              }}>
                {`${tMins}:${tSecs.toString().padStart(2, "0")}`}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: timerIsRest ? STEP_COLORS.Rebuild : C.setpace, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {timerIsRest ? "Rest" : "Work"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => { if (!timerRunning) ensureAudioCtx(); setTimerRunning(!timerRunning); }} style={{
              padding: "14px 48px", borderRadius: 10, border: "none",
              background: timerRunning ? C.danger : C.setpace, color: "#fff",
              fontSize: 16, fontWeight: 800, cursor: "pointer",
            }}>{timerRunning ? "Pause" : "Resume"}</button>
            {!timerRunning && (
              <button onClick={() => {
                // Skip to next phase
                if (!timerIsRest && timerCurrentRound < timerRounds) {
                  setTimerIsRest(true);
                  setTimerRemaining(timerRestDuration);
                } else if (timerIsRest) {
                  setTimerIsRest(false);
                  setTimerCurrentRound(r => r + 1);
                  setTimerRemaining(timerWorkDuration);
                } else {
                  setTimerComplete(true);
                  setTimerRunning(false);
                }
              }} style={{
                padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer",
              }}>Skip →</button>
            )}
          </div>
        </div>
      );
    }

    // ── Outdoor Games sub-activity ──
    if (activeActivity === "outdoor") {
      const OUTDOOR_GAMES = [
        {
          id: "shark-attack", name: "Shark Attack", icon: "🦈", players: "4+", time: "10 min",
          energy: "High", tags: ["Reset", "warm-up"],
          setup: "Mark two parallel lines about 20m apart — these are the 'shores'. One person starts as the shark in the middle.",
          rules: [
            "When the shark shouts 'Shark Attack!' everyone runs from one shore to the other.",
            "If the shark tags you, you become seaweed — stand still with arms out.",
            "Seaweed can tag runners who come within arm's reach.",
            "Last person standing becomes the next shark.",
          ],
          mentorTip: "Good opener. Nobody sits out — seaweed keeps everyone involved. Watch for the quiet ones who find clever routes around the edges.",
        },
        {
          id: "traffic-lights", name: "Traffic Lights", icon: "🚦", players: "3+", time: "8 min",
          energy: "Medium", tags: ["Reset", "regulation"],
          setup: "Everyone jogging freely in a marked area. One person (mentor or YP) calls the commands.",
          rules: [
            "Green = run. Amber = jog. Red = freeze completely.",
            "Reverse = change direction. Roundabout = spin 360° and keep going.",
            "Speed camera = sprint for 5 seconds. Flat tyre = drop to one knee.",
            "Anyone who moves on Red is out for that round (or does 5 star jumps to rejoin).",
          ],
          mentorTip: "Builds listening and self-regulation without anyone realising it. Let a young person take over calling after the first round — instant Rise opportunity.",
        },
        {
          id: "capture-flag", name: "Capture the Flag", icon: "🚩", players: "6+", time: "20 min",
          energy: "High", tags: ["Release", "Rise", "strategy"],
          setup: "Split into two teams. Each team has a territory (use cones to mark the halfway line) and a flag (bib or cone) placed at the back of their zone.",
          rules: [
            "Objective: steal the other team's flag and bring it back to your side.",
            "If tagged in enemy territory, you go to 'jail' (a marked spot near the flag).",
            "Jailed players can be freed if a teammate reaches them and tags them.",
            "Flag carrier can be tagged — flag returns to its original spot.",
            "First team to capture the flag wins. Play best of 3.",
          ],
          mentorTip: "Natural leaders emerge here. Watch who organises defence, who takes risks, who supports jailed teammates. Great debrief material for Rise conversations.",
        },
        {
          id: "bulldogs", name: "British Bulldogs", icon: "🐂", players: "8+", time: "15 min",
          energy: "Very High", tags: ["Reset", "courage"],
          setup: "Mark two lines about 25m apart. One or two 'bulldogs' stand in the middle. Everyone else lines up at one end.",
          rules: [
            "Bulldogs shout 'British Bulldogs!' — everyone runs to the other side.",
            "Bulldogs try to lift a runner completely off the ground (or two-hand tag for younger groups).",
            "Anyone caught becomes a bulldog for the next round.",
            "Last person uncaught wins.",
          ],
          mentorTip: "Pure courage energy. Some will hang back and go last — that's OK, notice it. Adapt to two-hand-tag if the group needs it. Not every group is ready for this one — read the room.",
        },
        {
          id: "frisbee-football", name: "Frisbee Football", icon: "🥏", players: "6+", time: "20 min",
          energy: "High", tags: ["Reframe", "Rebuild", "teamwork"],
          setup: "Two goals (use cones or bags). A frisbee instead of a ball. Standard pitch size — whatever the space allows.",
          rules: [
            "Score by getting the frisbee into the goal area (or past the goal line).",
            "Can't run with the frisbee — must throw within 3 seconds of catching it.",
            "If the frisbee hits the ground, possession switches.",
            "No contact — interceptions only.",
            "Play two halves of 8 minutes.",
          ],
          mentorTip: "The equaliser. Nobody is 'good' at frisbee football so the usual dominant players don't have their advantage. Great Reframe energy — your identity shifts when the rules change.",
        },
        {
          id: "rob-the-nest", name: "Rob the Nest", icon: "🪹", players: "8+", time: "10 min",
          energy: "Very High", tags: ["Rebuild", "strategy"],
          setup: "Four teams, each with a hoop or zone in a corner. Pile of balls/bibs/cones in the middle of the playing area.",
          rules: [
            "On go, teams run to the middle and bring items back to their nest ONE AT A TIME.",
            "Once the middle is empty, you can steal from other teams' nests.",
            "No guarding your nest — if you're at your nest you must be dropping something off or leaving.",
            "Game ends on a whistle — team with the most items wins.",
          ],
          mentorTip: "The stealing phase is where it gets wild and the real character shows. Watch who strategises, who panics, who targets the leader. Great Rebuild energy — quick decisions under pressure.",
        },
        {
          id: "minefield", name: "Minefield", icon: "💣", players: "4+", time: "15 min",
          energy: "Low–Medium", tags: ["Reset", "Reframe", "trust"],
          setup: "Scatter cones, bags, jackets across a space to create a 'minefield'. Pair everyone up. One person closes their eyes (or uses a blindfold), the other stands at the far end.",
          rules: [
            "The guide uses ONLY their voice to direct their partner through the minefield.",
            "If the blindfolded person touches any object, they start again from the beginning.",
            "No physical contact — voice only.",
            "Once through, swap roles.",
            "Fastest pair through both ways wins.",
          ],
          mentorTip: "Pure trust exercise. This is Reset and Reframe territory — listening, vulnerability, trusting someone else's direction. Watch who struggles to give up control and who struggles to trust. Both are data.",
        },
        {
          id: "firemans-relay", name: "Fireman's Carry Relay", icon: "🚒", players: "8+", time: "15 min",
          energy: "High", tags: ["Rebuild", "Rise", "teamwork"],
          setup: "Teams of 4–6. Mark a start line and a finish line about 15 metres apart.",
          rules: [
            "Carry each teammate one at a time across the distance — fireman's carry, piggyback, or however you can manage safely.",
            "Every team member must be both a carrier AND be carried.",
            "The team has to figure out the order — the strategy matters.",
            "Fastest team to get everyone across wins.",
          ],
          mentorTip: "Natural leadership and problem-solving emerge. Do they save the heaviest for last or get it done early? Who volunteers to go first? Who looks after the smallest person? Rise energy.",
        },
        {
          id: "lava-cross", name: "The Lava Cross", icon: "🌋", players: "6+", time: "15 min",
          energy: "Medium", tags: ["Rebuild", "Release", "problem-solving"],
          setup: "Mark a start zone and an end zone about 15 metres apart. The gap between is 'lava'. Teams of 6–8.",
          rules: [
            "Get every team member from start to finish — but only 3 people can be touching the ground at any time.",
            "People can be carried, piggy-backed, fireman-carried, or crab-walked across.",
            "If a 4th person touches the ground, the whole team starts again.",
            "The team must plan their approach before starting.",
            "Fastest team wins — or it's just one team against the clock.",
          ],
          mentorTip: "Forces the group to negotiate, plan, and physically depend on each other. The planning phase is as revealing as the execution. Who speaks? Who listens? Who gets carried without being asked?",
        },
      ];

      if (!selectedGame) {
        return (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
            </div>
            <button onClick={() => setActiveActivity(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0 }}>← Back to activities</button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Outdoor Games</h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Pick a game to run with the group.</p>

            <div style={{ display: "grid", gap: 10 }}>
              {OUTDOOR_GAMES.map(game => (
                <Card key={game.id} onClick={() => setSelectedGame(game)} style={{ cursor: "pointer", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{game.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{game.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{game.players} players · {game.time} · {game.energy} energy</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      }

      // Selected game detail + run screen
      const g = selectedGame;
      const gameMins = Math.floor(gameElapsed / 60);
      const gameSecs = gameElapsed % 60;

      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
          </div>
          <button onClick={() => { setSelectedGame(null); setGameStarted(false); setGameElapsed(0); setGameTimerRunning(false); if (gameTimerRef.current) clearInterval(gameTimerRef.current); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, marginBottom: 16, padding: 0 }}>← Different game</button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 36 }}>{g.icon}</span>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{g.name}</h2>
              <div style={{ fontSize: 12, color: C.muted }}>{g.players} players · {g.time} · {g.energy} energy</div>
            </div>
          </div>

          {/* Setup */}
          <Card style={{ marginBottom: 12, borderLeft: `3px solid ${C.setpace}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.setpace, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Setup</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{g.setup}</div>
          </Card>

          {/* Rules */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Rules</div>
            <div style={{ display: "grid", gap: 8 }}>
              {g.rules.map((rule, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.setpace + "15", color: C.setpace, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{rule}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Mentor tip */}
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>Mentor tip: </span>
            <span style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{g.mentorTip}</span>
          </div>

          {/* Timer */}
          {gameStarted && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 300, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", color: C.text }}>
                {String(gameMins).padStart(2, "0")}:{String(gameSecs).padStart(2, "0")}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {!gameStarted ? (
              <button onClick={() => {
                setGameStarted(true);
                setGameElapsed(0);
                setGameTimerRunning(true);
                gameTimerRef.current = setInterval(() => setGameElapsed(e => e + 1), 1000);
              }} style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: "none", background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Start Game ▶</button>
            ) : (
              <>
                <button onClick={() => {
                  if (gameTimerRunning) { clearInterval(gameTimerRef.current); setGameTimerRunning(false); }
                  else { gameTimerRef.current = setInterval(() => setGameElapsed(e => e + 1), 1000); setGameTimerRunning(true); }
                }} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {gameTimerRunning ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={() => {
                  clearInterval(gameTimerRef.current);
                  setGameTimerRunning(false);
                  setCompletedActivities(prev => [...prev, "outdoor"]);
                  setSelectedGame(null);
                  setGameStarted(false);
                  setGameElapsed(0);
                  setActiveActivity(null);
                }} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: "none", background: C.setpace, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Game Done ✓
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    // ── Hub screen ──
    const ACTIVITIES = [
      { id: "warmup", label: "Warm Up", desc: "Exercises & dynamic stretches", icon: "🔥", action: () => setActiveActivity("warmup") },
      { id: "circuit", label: "Circuits", desc: "Station-based workout with timers", icon: "⚡", action: () => { if (exercises.length === 0) generateCircuit(); setPhase("circuit"); } },
      { id: "outdoor", label: "Outdoor Games", desc: "Park games — team-based, high energy", icon: "🌳", action: () => setActiveActivity("outdoor") },
      { id: "timer", label: "Timer", desc: "General-purpose countdown", icon: "⏱", action: () => setActiveActivity("timer") },
      { id: "stretches", label: "Stretches", desc: "Cool-down & recovery stretches", icon: "🧘", action: () => setActiveActivity("stretches") },
    ];

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>What's Next?</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
          {completedActivities.length > 0 ? `${completedActivities.length} activit${completedActivities.length === 1 ? "y" : "ies"} done — pick another or move to cards` : "Choose an activity to run with the group"}
        </p>

        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {ACTIVITIES.map(a => {
            const done = completedActivities.includes(a.id);
            return (
              <Card key={a.id} onClick={a.action} style={{
                display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", cursor: "pointer",
                borderLeft: done ? `3px solid ${STEP_COLORS.Rebuild}` : `3px solid transparent`,
                opacity: done ? 0.7 : 1,
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{a.desc}</div>
                </div>
                {done && <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 100, background: STEP_COLORS.Rebuild + "15", color: STEP_COLORS.Rebuild, fontWeight: 700 }}>Done</span>}
              </Card>
            );
          })}
        </div>

        <button onClick={startPulse} style={{
          width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
          background: C.accent, color: C.bg,
          fontSize: 16, fontWeight: 800, cursor: "pointer",
        }}>{completedActivities.length > 0 ? "Go to Pulse Cards →" : "Skip to Pulse Cards →"}</button>
      </div>
    );
  }

  // ── CIRCUIT ──
  if (phase === "circuit") {
    if (!circuitStarted) {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Circuit Setup</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{selectedYP.length} people · {exercises.length} stations</p>

          {/* Timer settings */}
          <Card style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Work (seconds)</div>
                <select value={stationDuration} onChange={e => setStationDuration(Number(e.target.value))} style={{ width: "100%", padding: "10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, outline: "none" }}>
                  {[30, 40, 45, 60, 90].map(s => <option key={s} value={s}>{s}s</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Rest (seconds)</div>
                <select value={restDuration} onChange={e => setRestDuration(Number(e.target.value))} style={{ width: "100%", padding: "10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, outline: "none" }}>
                  {[10, 15, 20, 30].map(s => <option key={s} value={s}>{s}s</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Rounds</div>
                <select value={rounds} onChange={e => setRounds(Number(e.target.value))} style={{ width: "100%", padding: "10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 14, outline: "none" }}>
                  {[2, 3, 4, 5].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Total: {exercises.length} stations × {rounds} rounds = {exercises.length * rounds} sets · ~{Math.ceil((exercises.length * rounds * (stationDuration + restDuration)) / 60)} mins
            </div>
          </Card>

          {/* Exercises — editable */}
          <Card style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>Stations (tap to change)</div>
            {exercises.map((ex, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.setpace, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <select value={ex} onChange={e => { const newEx = [...exercises]; newEx[i] = e.target.value; setExercises(newEx); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, outline: "none" }}>
                  {Object.entries(EQUIPMENT).map(([cat, exs]) => (
                    <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                      {exs.map(e => <option key={e} value={e}>{e}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
              </div>
            ))}
            <button onClick={() => setExercises(prev => [...prev, EQUIPMENT.bodyweight[0]])} style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", marginTop: 4 }}>+ Add station</button>
          </Card>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPhase("activity_select"); }} style={{ padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>← Back</button>
            <button onClick={() => generateCircuit()} style={{ padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Shuffle</button>
            <button onClick={startCircuit} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: "none", background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Start Circuit →</button>
          </div>
        </div>
      );
    }

    if (circuitComplete) {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Circuit Complete</h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>{exercises.length} stations × {rounds} rounds done</p>
          <button onClick={() => { setCompletedActivities(prev => [...prev, "circuit"]); setCircuitStarted(false); setCircuitComplete(false); setPhase("activity_select"); }} style={{ padding: "16px 40px", borderRadius: 12, border: "none", background: C.setpace, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Back to Activities →</button>
        </div>
      );
    }

    // Active circuit
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted }}>Round {currentRound}/{rounds}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: C.setpace, fontWeight: 700 }}>
              {isRest ? "REST" : `${currentStation + 1}/${exercises.length}`}
            </div>
            <button onClick={() => setCircuitComplete(true)} style={{
              padding: "6px 12px", borderRadius: 100, border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>End workout</button>
          </div>
        </div>

        <CircuitTimer
          duration={isRest ? restDuration : stationDuration}
          onComplete={handleStationComplete}
          exerciseName={isRest ? "Rest" : exercises[currentStation]}
          stationNumber={currentStation + 1}
          totalStations={exercises.length}
        />
      </div>
    );
  }

  // ── PULSE CARDS ──
  if (phase === "pulse") {
    if (pulseIdx >= pulseCards.length) {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Pulse Cards Done</h2>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>{pulseResponses.length} responses captured</p>
          <button onClick={() => setPhase("feedback")} style={{ padding: "16px 40px", borderRadius: 12, border: "none", background: C.accent, color: C.bg, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Get YP Feedback →</button>
        </div>
      );
    }

    const card = pulseCards[pulseIdx];

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
        </div>

        <div style={{ fontSize: 10, color: C.setpace, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Pulse Card {pulseIdx + 1} / {pulseCards.length}
        </div>

        {!cardRevealed ? (
          <div onClick={() => setCardRevealed(true)} style={{
            borderRadius: 16, overflow: "hidden", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(255,69,0,0.25)",
            marginBottom: 16,
          }}>
            <img src="/pulse-card-back.png" alt="Tap to reveal" style={{ width: "100%", display: "block" }} />
            <div style={{ background: "#FF4500", padding: "14px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Tap to reveal your card</div>
            </div>
          </div>
        ) : (
          <>
            <Card style={{ padding: 28, borderTop: `4px solid #FF4500`, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#FF4500", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{card.theme}</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: C.text, marginBottom: 20 }}>{card.question}</div>
              <div style={{ padding: "12px 16px", background: C.surfaceAlt, borderRadius: 8, fontStyle: "italic", fontSize: 13, color: C.accentDim, lineHeight: 1.6 }}>
                <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>Mantra</span>
                {card.mantra}
              </div>
            </Card>

            <textarea value={currentPulseAnswer} onChange={e => setCurrentPulseAnswer(e.target.value)} placeholder="Their response..." rows={3} style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />

            {/* YP selector for response attribution */}
            {selectedYP.length >= 1 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: !pulseRespondent && currentPulseAnswer.trim() ? "#FF4500" : C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 600 }}>
                  Who answered? {!pulseRespondent && currentPulseAnswer.trim() ? "← select someone" : ""}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedYP.map(yp => (
                    <button key={yp.id} onClick={() => setPulseRespondent(yp.name)} style={{
                      padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${pulseRespondent === yp.name ? "#FF4500" : C.border}`,
                      background: pulseRespondent === yp.name ? "#FF450015" : "transparent",
                      color: pulseRespondent === yp.name ? "#FF4500" : C.muted,
                    }}>{yp.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {currentPulseAnswer.trim() && pulseRespondent && (
                <button onClick={() => {
                  setPulseResponses(prev => [...prev, { theme: card.theme, question: card.question, answer: currentPulseAnswer, respondent: pulseRespondent, respondentId: selectedYP.find(yp => yp.name === pulseRespondent)?.id || null }]);
                  setCurrentPulseAnswer("");
                  setPulseRespondent("");
                  setCardRevealed(false);
                  setPulseIdx(prev => prev + 1);
                }} style={{ flex: 2, padding: "14px 0", borderRadius: 10, border: "none", background: "#FF4500", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Capture →
                </button>
              )}
              {currentPulseAnswer.trim() && !pulseRespondent && (
                <div style={{ flex: 2, padding: "14px 0", borderRadius: 10, background: C.border, color: C.muted, fontSize: 14, fontWeight: 700, textAlign: "center", opacity: 0.6 }}>
                  Select who answered
                </div>
              )}
              <button onClick={() => { setCurrentPulseAnswer(""); setCardRevealed(false); setPulseIdx(prev => prev + 1); }} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Skip</button>
              <button onClick={() => setPhase("feedback")} style={{ padding: "14px 16px", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Done</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── WRAPUP ──
  if (phase === "wrapup") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {PHASES.map((p, i) => <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= PHASES.indexOf(phase) ? C.setpace : C.border }} />)}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Session Summary</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
          {selectedYP.length} participants · {exercises.length} stations × {rounds} rounds
        </p>

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          {QUICK_FIELDS.slice(0, 4).map(({ key, label, labels }) => (
            <Card key={key} style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setQuick(prev => ({ ...prev, [key]: n }))} style={{
                    flex: 1, minWidth: 70, padding: "8px 6px", borderRadius: 6,
                    border: `1.5px solid ${quick[key] === n ? C.setpace : C.border}`,
                    background: quick[key] === n ? C.setpace + "15" : "transparent",
                    color: quick[key] === n ? C.setpace : C.muted, fontSize: 10, cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{n}</div>
                    <div>{labels[n]}</div>
                  </button>
                ))}
              </div>
            </Card>
          ))}

          <Card style={{ padding: 14, borderLeft: `3px solid ${isRecording ? C.danger : "#7C3AED"}40`, background: isRecording ? "#FEF2F2" : voiceProcessing ? "#F5F3FF" : C.surface }}>
              {voiceProcessing ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid #7C3AED40`, borderTopColor: "#7C3AED", margin: "0 auto 8px", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600 }}>AI is sorting your reflection...</div>
                </div>
              ) : isRecording ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.danger, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.danger }}>Recording...</span>
                    </div>
                    <button onClick={stopSpVoiceRecording} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: C.danger, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Stop & Process</button>
                  </div>
                  {voiceTranscript && <div style={{ fontSize: 11, color: C.accentDim, fontStyle: "italic", maxHeight: 80, overflow: "auto", padding: "6px 8px", background: "#fff", borderRadius: 4, border: `1px solid ${C.border}` }}>{voiceTranscript}</div>}
                  <p style={{ fontSize: 9, color: C.muted, margin: "6px 0 0" }}>Talk about what happened. AI will fill in the boxes below.</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 10, color: "#7C3AED", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Voice Reflection</div>
                  <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                    {[
                      { icon: "📝", text: "What happened in the session?" },
                      { icon: "🤝", text: "How did the young people respond?" },
                      { icon: "⚠️", text: "Any concerns — wellbeing, safety?" },
                    ].map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "5px 8px", background: "#7C3AED08", borderRadius: 4, fontSize: 11, color: C.accentDim }}>
                        <span>{p.icon}</span> {p.text}
                      </div>
                    ))}
                  </div>
                  <button onClick={startSpVoiceRecording} style={{
                    width: "100%", padding: "12px 0", borderRadius: 6, border: "none",
                    background: "#7C3AED", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>🎙</span> Start Recording
                  </button>
                </div>
              )}
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Session Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key moments, who stood out, energy levels..." rows={4} style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </Card>

          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Mentor Reflection</div>
            <textarea value={mentorReflection} onChange={e => setMentorReflection(e.target.value)} placeholder="How did you show up?..." rows={3} style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </Card>

          <Card style={{ padding: 14, borderColor: "#ff444420" }}>
            <div style={{ fontSize: 11, color: C.danger, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Safeguarding</div>
            <textarea value={safeguarding} onChange={e => setSafeguarding(e.target.value)} placeholder="Any concerns..." rows={2} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #F8A5A5", background: "#FFF5F5", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </Card>

          {/* Pulse Card Responses */}
          {pulseResponses.length > 0 && (
            <Card style={{ padding: 14, borderTop: `3px solid #FF4500` }}>
              <div style={{ fontSize: 11, color: "#FF4500", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>Pulse Card Responses ({pulseResponses.length})</div>
              <div style={{ display: "grid", gap: 12 }}>
                {pulseResponses.map((r, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: C.surfaceAlt, borderRadius: 10, borderLeft: `3px solid #FF450040` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#FF4500", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>{r.theme}</div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{r.question}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {r.respondent && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: C.setpace + "15", color: C.setpace, flexShrink: 0, marginTop: 1 }}>{r.respondent}</span>
                      )}
                      <div style={{ fontSize: 13, color: C.accentDim, fontStyle: "italic", lineHeight: 1.5 }}>"{r.answer}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Photos */}
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>📸 Session Photos & Videos</div>
            {mediaFiles.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                {mediaFiles.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    {m.mediaType === "photo" && m.url ? (
                      <img src={m.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 6, background: C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.mediaType === "video" ? "🎬" : "📷"}</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: STEP_COLORS.Rebuild }}>✓ {m.mediaType === "photo" ? "Photo" : "Video"} uploaded</div>
                    </div>
                    <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "block", padding: "12px", borderRadius: 8, border: `1.5px dashed ${C.border}`, textAlign: "center", color: C.muted, fontSize: 12, fontWeight: 600, cursor: mediaUploading ? "default" : "pointer", opacity: mediaUploading ? 0.5 : 1 }}>
              {mediaUploading ? "Uploading..." : `+ Add photos or videos${mediaFiles.length > 0 ? ` (${mediaFiles.length} added)` : ""}`}
              <input type="file" accept="image/*,video/*,.jpg,.jpeg,.png,.heic,.mp4,.mov" multiple disabled={mediaUploading} onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                setMediaUploading(true);
                for (const file of files) {
                  try {
                    const mediaType = file.type.startsWith("video") ? "video" : "photo";
                    const result = await db.uploadMediaDirect(file, "setpace-session", startTime.toISOString().split("T")[0], mediaType);
                    if (result.url) {
                      setMediaFiles(prev => [...prev, { url: result.url, mediaType, caption: "" }]);
                    } else {
                      console.error("Upload failed:", result.error);
                      alert("Upload failed: " + (result.error || "Unknown error") + "\n\nMake sure you've created a 'pathways-media' bucket in Supabase Storage (set to Public).");
                    }
                  } catch (err) {
                    console.error("Upload error:", err);
                  }
                }
                setMediaUploading(false);
                e.target.value = "";
              }} style={{ display: "none" }} />
            </label>
          </Card>
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{
          width: "100%", padding: "16px 0", borderRadius: 12, border: "none",
          background: submitting ? C.border : C.accent, color: submitting ? C.muted : C.bg,
          fontSize: 16, fontWeight: 800, cursor: submitting ? "default" : "pointer",
        }}>{submitting ? "Saving..." : "Complete Session ✓"}</button>
      </div>
    );
  }

  // ── FEEDBACK ──
  if (phase === "feedback") {
    if (feedbackSubmitted) {
      return (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Feedback captured</h2>
          <p style={{ color: C.muted, fontSize: 13 }}>Moving to session summary...</p>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Feedback</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Hand the phone to a young person — or skip</p>

        {selectedYP.length > 1 && !feedbackYP && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Who's filling this in?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selectedYP.map(yp => (
                <button key={yp.id} onClick={() => setFeedbackYP(yp)} style={{
                  padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${C.setpace}`,
                  background: "transparent", color: C.setpace, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>{yp.name}</button>
              ))}
            </div>
          </div>
        )}

        {(selectedYP.length === 1 || feedbackYP) && (
          <>
            {feedbackYP && <div style={{ fontSize: 13, fontWeight: 700, color: C.setpace, marginBottom: 16 }}>{feedbackYP.name}'s feedback</div>}
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {SP_FEEDBACK_QUESTIONS.map(q => (
                <Card key={q.id} style={{ padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{q.question}</div>
                  {q.type === "emoji" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {q.options.map(opt => (
                        <button key={opt.value} onClick={() => setYpFeedback(prev => ({ ...prev, [q.id]: opt }))} style={{
                          flex: 1, padding: "10px 4px", borderRadius: 8, textAlign: "center",
                          border: `2px solid ${ypFeedback[q.id]?.value === opt.value ? C.setpace : C.border}`,
                          background: ypFeedback[q.id]?.value === opt.value ? C.setpace + "12" : "transparent",
                          cursor: "pointer",
                        }}>
                          <div style={{ fontSize: 22 }}>{opt.emoji}</div>
                          <div style={{ fontSize: 9, color: ypFeedback[q.id]?.value === opt.value ? C.setpace : C.muted, fontWeight: 600 }}>{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea value={ypFeedback[q.id] || ""} onChange={e => setYpFeedback(prev => ({ ...prev, [q.id]: e.target.value }))} placeholder={q.placeholder} rows={2} style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                  )}
                </Card>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {(selectedYP.length === 1 || feedbackYP) && (
            <button onClick={handleFeedbackSubmit} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: "none", background: C.accent, color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Submit</button>
          )}
          <button onClick={() => { setPhase("wrapup"); }} style={{ padding: "14px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Skip</button>
        </div>
      </div>
    );
  }

  return null;
}
