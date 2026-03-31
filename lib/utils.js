import { STEPS, STEP_COLORS, STEP_SUBTITLES, FORM_SECTIONS } from "./constants";

const MIN_SESSIONS_FOR_PROGRESSION = 4;
const RECENT_WINDOW = 3; // look at last 3 sessions
const MIN_AVG_TO_PROGRESS = 3.0;
const MIN_FLOOR_SCORE = 2.0; // no session in window can drop below this

export function getLatestStage(sessions) {
  if (!sessions?.length) return "Reset";
  const latest = [...sessions].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  )[0];
  const avgs = latest?.step_averages || latest?.stepAverages || {};
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const avg = parseFloat(avgs[STEPS[i]]);
    if (avg && avg >= 3) return STEPS[i];
  }
  return "Reset";
}

export function getLatestScores(sessions) {
  if (!sessions?.length) return {};
  const latest = [...sessions].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  )[0];
  return latest?.step_averages || latest?.stepAverages || {};
}

// Get the average of a step across the last N sessions
function getRecentStepAvg(sessions, stepName, window = RECENT_WINDOW) {
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, window);
  const vals = recent
    .map(s => parseFloat((s.step_averages || s.stepAverages || {})[stepName]))
    .filter(v => !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Check if any recent session dropped below the floor
function hasRecentDip(sessions, stepName, window = RECENT_WINDOW) {
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, window);
  return recent.some(s => {
    const val = parseFloat((s.step_averages || s.stepAverages || {})[stepName]);
    return !isNaN(val) && val < MIN_FLOOR_SCORE;
  });
}

// Count how many sessions have scored this step
function sessionsWithStep(sessions, stepName) {
  return sessions.filter(s => {
    const val = parseFloat((s.step_averages || s.stepAverages || {})[stepName]);
    return !isNaN(val) && val > 0;
  }).length;
}

// Get trend direction for a step
function getTrend(sessions, stepName) {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const vals = sorted
    .map(s => parseFloat((s.step_averages || s.stepAverages || {})[stepName]))
    .filter(v => !isNaN(v));
  if (vals.length < 2) return "insufficient";
  const firstHalf = vals.slice(0, Math.ceil(vals.length / 2));
  const secondHalf = vals.slice(Math.floor(vals.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  if (avgSecond - avgFirst > 0.3) return "improving";
  if (avgFirst - avgSecond > 0.3) return "declining";
  return "stable";
}

export function getProgressionStatus(sessions) {
  const stage = getLatestStage(sessions);
  const stageIdx = STEPS.indexOf(stage);
  const totalSessions = sessions?.length || 0;

  if (stageIdx >= STEPS.length - 1) {
    return { ready: false, eligible: false, stage: "Rise", nextStage: null, note: "Rise is mastery — ongoing", reasons: [] };
  }

  const nextStage = STEPS[stageIdx + 1];
  const sessionsAtStage = sessionsWithStep(sessions, stage);
  const recentAvg = getRecentStepAvg(sessions, stage);
  const hasDip = hasRecentDip(sessions, stage);
  const trend = getTrend(sessions, stage);

  // Build criteria checklist
  const criteria = [];
  const enoughSessions = sessionsAtStage >= MIN_SESSIONS_FOR_PROGRESSION;
  criteria.push({
    met: enoughSessions,
    label: `${sessionsAtStage}/${MIN_SESSIONS_FOR_PROGRESSION} sessions at ${stage}`,
  });

  const avgMet = recentAvg !== null && recentAvg >= MIN_AVG_TO_PROGRESS;
  criteria.push({
    met: avgMet,
    label: recentAvg !== null
      ? `Last ${RECENT_WINDOW} avg: ${recentAvg.toFixed(1)}/5 (need ≥ ${MIN_AVG_TO_PROGRESS})`
      : `Not enough recent data`,
  });

  const noDips = !hasDip;
  criteria.push({
    met: noDips,
    label: noDips ? `No recent sessions below ${MIN_FLOOR_SCORE}` : `Recent session dropped below ${MIN_FLOOR_SCORE}`,
  });

  const trendOk = trend === "improving" || trend === "stable";
  criteria.push({
    met: trendOk,
    label: trend === "improving" ? "Trend: improving" : trend === "stable" ? "Trend: stable" : trend === "declining" ? "Trend: declining" : "Not enough data for trend",
  });

  // Also check that prerequisite stages are solid
  for (let i = 0; i < stageIdx; i++) {
    const prereq = STEPS[i];
    const prereqAvg = getRecentStepAvg(sessions, prereq);
    const prereqMet = prereqAvg !== null && prereqAvg >= MIN_AVG_TO_PROGRESS;
    criteria.push({
      met: prereqMet,
      label: prereqAvg !== null
        ? `${prereq}: ${prereqAvg.toFixed(1)} (need ≥ ${MIN_AVG_TO_PROGRESS})`
        : `${prereq}: no recent data`,
    });
  }

  const allMet = criteria.every(c => c.met);
  const eligible = enoughSessions && avgMet && noDips; // eligible = data criteria met, might still need mentor recommendation

  // Summary note
  let note;
  if (allMet) {
    note = `Criteria met — mentor can recommend progression to ${nextStage}`;
  } else if (eligible) {
    note = `Close — ${criteria.filter(c => !c.met).map(c => c.label).join("; ")}`;
  } else if (!enoughSessions) {
    note = `${sessionsAtStage} of ${MIN_SESSIONS_FOR_PROGRESSION} sessions needed at ${stage}`;
  } else if (!avgMet) {
    note = `Recent average ${recentAvg?.toFixed(1) || "?"} — needs ≥ ${MIN_AVG_TO_PROGRESS} consistently`;
  } else {
    note = criteria.filter(c => !c.met).map(c => c.label).join("; ");
  }

  return {
    ready: false, // never auto-ready — always requires mentor recommendation
    eligible: allMet,
    stage,
    nextStage,
    note,
    criteria,
    sessionsAtStage,
    recentAvg,
    trend,
  };
}

export function computeStepAverages(scores) {
  const avgs = {};
  STEPS.forEach((step) => {
    const section = FORM_SECTIONS[step];
    if (!section) return;
    const vals = section.subsections
      .map((_, si) => scores[`${step}_${si}`])
      .filter(Boolean);
    avgs[step] = vals.length
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : null;
  });
  return avgs;
}

export function exportSessionsCSV(sessions, filename) {
  const headers = [
    "Date", "Mentor", "Young Person", "Focus Step", "Session Length",
    "Partner Org", "Group Session", "Regulation", "Engagement", "Overall",
    "Confidence", "Relational Connection", "Adapted Agenda",
    ...STEPS.map((s) => s + " Avg"),
    "Notes", "Mentor Reflection", "Safeguarding",
  ];
  const rows = sessions.map((s) => {
    const q = s.quick || {};
    const sa = s.step_averages || s.stepAverages || {};
    return [
      s.date,
      s.mentor_name || s.mentor,
      s.young_person_name || s.youngPerson,
      s.focus_step || s.focusStep,
      s.session_length || s.sessionLength,
      s.partner_org || s.partnerOrg,
      s.is_group || s.isGroup ? "Yes" : "No",
      q.regulation || "",
      q.engagement || "",
      q.overall || "",
      q.confidence || "",
      q.relationalConnection || "",
      q.adaptedAgenda || "",
      ...STEPS.map((st) => sa[st] || ""),
      `"${(s.notes || "").replace(/"/g, "'")}"`,
      `"${(s.mentor_reflection || s.mentorReflection || "").replace(/"/g, "'")}"`,
      `"${(s.safeguarding || "").replace(/"/g, "'")}"`,
    ];
  });
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "silkfutures-export.csv";
  a.click();
}

export function exportSummaryCSV(youngPeople, sessionsByYP, filename) {
  const headers = [
    "Young Person", "Total Sessions", "Current Stage", "Latest Date",
    ...STEPS.map((s) => s + " Score"),
    "Latest Notes",
  ];
  const rows = youngPeople.map((yp) => {
    const ypSessions = sessionsByYP[yp.name] || [];
    if (!ypSessions.length) return null;
    const sorted = ypSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    const sa = latest.step_averages || latest.stepAverages || {};
    const stage = getLatestStage(ypSessions);
    return [
      yp.name,
      ypSessions.length,
      stage,
      latest.date,
      ...STEPS.map((s) => sa[s] || ""),
      `"${(latest.notes || "").replace(/"/g, "'").slice(0, 200)}"`,
    ];
  }).filter(Boolean);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "silkfutures-summary.csv";
  a.click();
}
