import { supabase } from "./supabase";

// ── AUTH ──────────────────────────────────────

export async function loginMentor(name, pin) {
  const { data, error } = await supabase
    .from("mentors")
    .select("*")
    .eq("name", name)
    .eq("pin", pin)
    .single();
  if (error || !data) return null;
  return data;
}

export async function getMentors() {
  const { data } = await supabase
    .from("mentors")
    .select("*")
    .order("name");
  return data || [];
}

export async function updateMentor(id, updates) {
  const { data, error } = await supabase
    .from("mentors")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function createMentor({ name, pin, role }) {
  const { data, error } = await supabase
    .from("mentors")
    .insert({ name, pin: pin || "1234", role: role || "mentor" })
    .select()
    .single();
  return { data, error };
}

export async function deleteMentor(id) {
  // Check if mentor has sessions — prevent deletion if they do
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("mentor_id", id)
    .limit(1);
  if (sessions?.length > 0) {
    return { error: { message: "Cannot delete a mentor who has logged sessions. Reassign or delete their sessions first." } };
  }
  // Remove co-mentor entries
  await supabase.from("session_co_mentors").delete().eq("mentor_id", id);
  // Delete the mentor
  const { error } = await supabase.from("mentors").delete().eq("id", id);
  return { error };
}

// ── YOUNG PEOPLE ─────────────────────────────

export async function getYoungPeople() {
  const { data } = await supabase
    .from("young_people")
    .select("*")
    .order("name");
  return data || [];
}

export async function createYoungPerson(name, contact = {}) {
  const insertData = { name };
  if (contact.phone) insertData.phone = contact.phone;
  if (contact.dob) insertData.dob = contact.dob;
  if (contact.email) insertData.email = contact.email;
  if (contact.postcode) insertData.postcode = contact.postcode;
  const { data, error } = await supabase
    .from("young_people")
    .insert(insertData)
    .select()
    .single();
  return { data, error };
}

export async function updateYoungPerson(id, updates) {
  const { data, error } = await supabase
    .from("young_people")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteYoungPerson(id) {
  // Delete related sessions first
  await supabase.from("sessions").delete().eq("young_person_id", id);
  // Delete onboarding assessments
  await supabase.from("onboarding_assessments").delete().eq("young_person_id", id);
  // Delete YP feedback
  await supabase.from("yp_feedback").delete().eq("young_person_id", id);
  // Delete the young person
  const { error } = await supabase.from("young_people").delete().eq("id", id);
  return { error };
}

// ── SESSIONS ─────────────────────────────────

export async function getSessions() {
  const { data } = await supabase
    .from("sessions_full")
    .select("*")
    .order("date", { ascending: false });
  // Filter out soft-deleted sessions (works even if column doesn't exist yet)
  return (data || []).filter(s => !s.deleted_at);
}

export async function getSessionsForMentor(mentorId) {
  // Step 1: Get this mentor's own sessions (primary + co-mentored)
  const [primary, coMentored] = await Promise.all([
    supabase
      .from("sessions_full")
      .select("*")
      .eq("mentor_id", mentorId)
      .order("date", { ascending: false }),
    supabase
      .from("session_co_mentors")
      .select("session_id")
      .eq("mentor_id", mentorId),
  ]);

  let ownSessions = (primary.data || []).filter(s => !s.deleted_at);

  if (coMentored.data?.length) {
    const coIds = coMentored.data.map((c) => c.session_id);
    const { data: coSessions } = await supabase
      .from("sessions_full")
      .select("*")
      .in("id", coIds);
    if (coSessions) {
      const existingIds = new Set(ownSessions.map((s) => s.id));
      ownSessions = [
        ...ownSessions,
        ...coSessions.filter((s) => !s.deleted_at && !existingIds.has(s.id)),
      ];
    }
  }

  // Step 2: Get ALL sessions for young people this mentor has worked with
  // so other mentors' sessions show (redacted) on YP profiles
  const ypIds = [...new Set(ownSessions.map(s => s.young_person_id))];
  if (ypIds.length === 0) return ownSessions;

  const { data: allYPSessions } = await supabase
    .from("sessions_full")
    .select("*")
    .in("young_person_id", ypIds)
    .order("date", { ascending: false });

  // Merge: own sessions + other mentors' sessions (deduped)
  const existingIds = new Set(ownSessions.map(s => s.id));
  const otherSessions = (allYPSessions || []).filter(
    s => !s.deleted_at && !existingIds.has(s.id)
  );

  return [...ownSessions, ...otherSessions];
}

export async function createSession({
  mentorId,
  youngPersonId,
  date,
  startTime,
  focusStep,
  sessionLength,
  partnerOrg,
  isGroup,
  groupId,
  scores,
  quick,
  stepAverages,
  notes,
  mentorReflection,
  safeguarding,
  sensitiveNotes,
  coMentorIds,
}) {
  const insertData = {
    mentor_id: mentorId,
    young_person_id: youngPersonId,
    date,
    start_time: startTime || "",
    focus_step: focusStep,
    session_length: sessionLength,
    partner_org: partnerOrg,
    is_group: isGroup || false,
    group_id: groupId || null,
    scores: scores || {},
    quick: quick || {},
    step_averages: stepAverages || {},
    notes: notes || "",
    mentor_reflection: mentorReflection || "",
    safeguarding: safeguarding || "",
  };
  // Only include sensitive_notes if present — avoids error if DB column doesn't exist yet
  if (sensitiveNotes?.trim()) {
    insertData.sensitive_notes = sensitiveNotes;
  }
  const { data, error } = await supabase
    .from("sessions")
    .insert(insertData)
    .select()
    .single();

  if (error) return { data: null, error };

  // Add co-mentors if any
  if (coMentorIds?.length && data) {
    const coRows = coMentorIds.map((mid) => ({
      session_id: data.id,
      mentor_id: mid,
    }));
    await supabase.from("session_co_mentors").insert(coRows);
  }

  return { data, error: null };
}

// Create a single safeguarding case (called once per session/group, not per-YP)
export async function createSafeguardingCaseIfNeeded({ sessionId, youngPersonId, mentorId, date, safeguarding, notes }) {
  if (!safeguarding?.trim()) return;
  try {
    // Check if a case already exists for this exact concern on this date by this mentor
    const { data: existing } = await supabase
      .from("safeguarding_cases")
      .select("id")
      .eq("mentor_id", mentorId)
      .eq("date", date)
      .eq("concern", safeguarding)
      .limit(1);
    if (existing?.length > 0) return; // Already exists — skip (group dedup)
    
    await supabase.from("safeguarding_cases").insert({
      session_id: sessionId,
      young_person_id: youngPersonId,
      mentor_id: mentorId,
      date,
      concern: safeguarding,
      session_notes: (notes || "").substring(0, 1000),
      status: "open",
    });
  } catch (e) { console.error("Failed to create safeguarding case:", e); }
}

// Fire-and-forget notifications — call from frontend after session save
export function sendSessionNotifications({ mentorName, youngPersonName, date, startTime, focusStep, sessionLength, partnerOrg, isGroup, quick, stepAverages, notes, mentorReflection, safeguarding, songUrl, songTitle, sessionType, arrivalData, feedbackData }) {
  // Safeguarding alert
  if (safeguarding?.trim()) {
    fetch("/api/safeguarding-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youngPerson: youngPersonName, mentor: mentorName, date, safeguarding, notes }),
    }).catch(() => {});
  }

  // Google Sheets backup — session data
  fetch("/api/sheets-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataType: partnerOrg === "Set Pace" ? "setpace" : "session",
      date, startTime: startTime || "", mentor: mentorName, youngPerson: youngPersonName,
      focusStep, sessionType: sessionType || "", sessionLength, partnerOrg, isGroup, quick, stepAverages,
      notes, mentorReflection, safeguarding, songUrl, songTitle,
      arrivalData: arrivalData || {},
      feedbackData: feedbackData || {},
    }),
  }).catch(() => {});
}

// ── DELETE SESSION (soft delete — admin only) ──────────────

export async function deleteSession(sessionId) {
  // Try soft delete first — verify it actually set deleted_at
  try {
    const { data, error } = await supabase
      .from("sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", sessionId)
      .select("id, deleted_at")
      .single();
    // Verify the column was actually set (not silently ignored)
    if (!error && data?.deleted_at) {
      return { error: null, softDeleted: true };
    }
  } catch {}
  // Fall back to hard delete if soft delete failed
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);
  return { error, softDeleted: false };
}

// ── RESTORE SESSION ──────────────

export async function restoreSession(sessionId) {
  const { error } = await supabase
    .from("sessions")
    .update({ deleted_at: null })
    .eq("id", sessionId);
  return { error };
}

// ── GET DELETED SESSIONS ──────────────

export async function getDeletedSessions() {
  try {
    const { data, error } = await supabase
      .from("sessions_full")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) {
      console.warn("[Pathways] getDeletedSessions error:", error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn("[Pathways] getDeletedSessions exception:", e);
    return [];
  }
}

// ── PERMANENT DELETE SESSION ──────────────

export async function permanentDeleteSession(sessionId) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);
  return { error };
}

// ── CLEANUP OLD DELETED SESSIONS (>30 days) ──────────────

export async function cleanupOldDeletedSessions() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { error } = await supabase
      .from("sessions")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", thirtyDaysAgo.toISOString());
    return { error };
  } catch {
    return { error: null };
  }
}

// ── ACCESS CONTROL ───────────────────────────

// Get the young people a specific mentor has worked with
export async function getMentorYoungPeople(mentorId) {
  const { data } = await supabase
    .from("mentor_young_people")
    .select("*")
    .eq("mentor_id", mentorId);
  return data || [];
}

// ── SAVED GROUPS ─────────────────────────────

export async function getSavedGroups() {
  const { data } = await supabase
    .from("saved_groups")
    .select("*")
    .order("name");
  return data || [];
}

export async function createSavedGroup(name, memberIds) {
  const { data, error } = await supabase
    .from("saved_groups")
    .insert({ name, member_ids: memberIds })
    .select()
    .single();
  return { data, error };
}

export async function updateSavedGroup(id, memberIds) {
  const { data, error } = await supabase
    .from("saved_groups")
    .update({ member_ids: memberIds })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

// ── PROGRESSION RECOMMENDATIONS ──────────────

export async function getProgressionRecommendations() {
  const { data } = await supabase
    .from("progression_recommendations")
    .select("*, young_people(name), mentors!progression_recommendations_mentor_id_fkey(name)")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createProgressionRecommendation({ youngPersonId, mentorId, fromStage, toStage, reason }) {
  const { data, error } = await supabase
    .from("progression_recommendations")
    .insert({ young_person_id: youngPersonId, mentor_id: mentorId, from_stage: fromStage, to_stage: toStage, reason })
    .select()
    .single();
  return { data, error };
}

export async function reviewProgressionRecommendation(id, { status, reviewedBy, reviewNote }) {
  const { data, error } = await supabase
    .from("progression_recommendations")
    .update({ status, reviewed_by: reviewedBy, review_note: reviewNote, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

// ── ONBOARDING ───────────────────────────────

export async function createOnboardingAssessment({ youngPersonId, mentorId, responses, suggestedStage, notes }) {
  const { data, error } = await supabase
    .from("onboarding_assessments")
    .insert({ young_person_id: youngPersonId, mentor_id: mentorId, responses, suggested_stage: suggestedStage, notes })
    .select()
    .single();
  return { data, error };
}

export async function getOnboardingForYP(youngPersonId) {
  const { data } = await supabase
    .from("onboarding_assessments")
    .select("*")
    .eq("young_person_id", youngPersonId)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

// ── LIVE SESSION HELPERS ────────────────────

export async function getLatestSessionForYP(youngPersonName) {
  const { data } = await supabase
    .from("sessions_full")
    .select("*")
    .eq("young_person_name", youngPersonName)
    .order("date", { ascending: false });
  const active = (data || []).filter(s => !s.deleted_at);
  return active[0] || null;
}

export async function getSessionsForYP(youngPersonName) {
  const { data } = await supabase
    .from("sessions_full")
    .select("*")
    .eq("young_person_name", youngPersonName)
    .order("date", { ascending: false });
  return (data || []).filter(s => !s.deleted_at);
}

// Live session API calls (to our server-side route)
export async function fetchReconnectPrompts({ youngPerson, stage, lastNotes, lastDate, lastMentorReflection, isGroup, participants }) {
  const res = await fetch("/api/live-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "reconnect", youngPerson, stage, lastNotes, lastDate, lastMentorReflection, isGroup, participants }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSessionPlan({ youngPerson, stage, scores, recentNotes, cardResponses, isGroup, participants }) {
  const res = await fetch("/api/live-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "plan", youngPerson, stage, scores, recentNotes, cardResponses, isGroup, participants }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchCards({ youngPerson, stage, cardType, recentNotes, previousResponses, isGroup, participants }) {
  const res = await fetch("/api/live-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "cards", youngPerson, stage, cardType, recentNotes, previousResponses, isGroup, participants }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── YP FEEDBACK ─────────────────────────────

export async function saveYPFeedback({ sessionId, youngPersonId, responses }) {
  const { data, error } = await supabase
    .from("yp_feedback")
    .insert({ session_id: sessionId, young_person_id: youngPersonId, responses })
    .select()
    .single();
  return { data, error };
}

export async function getYPFeedbackForSession(sessionId) {
  const { data } = await supabase
    .from("yp_feedback")
    .select("*")
    .eq("session_id", sessionId);
  return data || [];
}

export async function getYPFeedbackByYoungPerson(youngPersonId) {
  const { data } = await supabase
    .from("yp_feedback")
    .select("*")
    .eq("young_person_id", youngPersonId)
    .order("created_at", { ascending: false });
  return data || [];
}

// ── OFFLINE-AWARE SESSION CREATION ──────────────
// Tries Supabase first. If offline or fails, queues to IndexedDB.

export async function createSessionOfflineAware(sessionPayload) {
  // Dynamic import to avoid SSR issues
  const offlineDb = await import("./offlineDb");

  if (!offlineDb.isOnline()) {
    // Definitely offline — queue immediately
    const record = await offlineDb.queueSession(sessionPayload);
    return { data: { id: record.offlineId, offline: true }, error: null, queued: true };
  }

  // Try online first
  try {
    const { data, error } = await createSession(sessionPayload);
    if (error) throw error;
    return { data, error: null, queued: false };
  } catch (err) {
    // Network failed — queue offline
    console.warn("[Pathways] Online save failed, queuing offline:", err);
    const record = await offlineDb.queueSession(sessionPayload);
    return { data: { id: record.offlineId, offline: true }, error: null, queued: true };
  }
}

// ── OFFLINE DATA CACHING ──────────────
// Cache data for offline reads

export async function cacheAppData(key, data) {
  try {
    const offlineDb = await import("./offlineDb");
    await offlineDb.cacheData(key, data);
  } catch {}
}

export async function getCachedAppData(key) {
  try {
    const offlineDb = await import("./offlineDb");
    return await offlineDb.getCachedData(key);
  } catch {
    return null;
  }
}

// ── PROJECTS ─────────────────────────────

export async function getProjects() {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createProject({ name, funder, description, locations, startDate, endDate, budget, status, objectives, fundingBrief }) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, funder, description, locations: locations || [], start_date: startDate, end_date: endDate, budget, status: status || "active", objectives: objectives || [], funding_brief: fundingBrief || "" })
    .select()
    .single();
  return { data, error };
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteProject(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return { error };
}

// ── CONSENT RECORDS ─────────────────────────────

export async function getAllConsentRecords() {
  const { data } = await supabase
    .from("consent_records")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getConsentForYP(youngPersonId) {
  const { data } = await supabase
    .from("consent_records")
    .select("*")
    .eq("young_person_id", youngPersonId)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

// ── LOCATIONS ─────────────────────────────

export async function getLocations() {
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("name");
  return data || [];
}

export async function createLocation({ name, area, address }) {
  const { data, error } = await supabase
    .from("locations")
    .insert({ name, area, address })
    .select()
    .single();
  return { data, error };
}

export async function updateLocation(id, updates) {
  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteLocation(id) {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  return { error };
}

// ── MEDIA GALLERY ─────────────────────────

export function getMediaFromSessions(sessions) {
  const media = [];
  try {
    (sessions || []).forEach(s => {
      if (!s.notes || typeof s.notes !== "string") return;
      // Normalise line endings (handle \r\n from different platforms)
      const lines = s.notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/^(photo|video):/i.test(line)) {
          const isVideo = line.toLowerCase().startsWith("video");
          // URL might be on same line or next line
          let url = line.replace(/^(photo|video):\s*/i, "").trim();
          if (!url.startsWith("http") && i + 1 < lines.length) {
            url = lines[i + 1].trim();
            if (url.startsWith("http")) i++; // skip the URL line
          }
          if (url.startsWith("http")) {
            media.push({ url, type: isVideo ? "video" : "photo", date: s.date || "", ypName: s.young_person_name || "", mentorName: s.mentor_name || "", sessionId: s.id });
          }
        }
      }
    });
  } catch (e) { console.error("getMediaFromSessions error:", e); }
  return media;
}

export function getSongsFromSessions(sessions) {
  const songs = [];
  try {
    (sessions || []).forEach(s => {
      if (!s.notes || typeof s.notes !== "string") return;
      // Normalise line endings
      const lines = s.notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match "Title: Something" followed by "URL: https://..."
        if (line.startsWith("Title:") && i + 1 < lines.length) {
          const title = line.replace("Title:", "").trim();
          const nextLine = lines[i + 1].trim();
          if (nextLine.startsWith("URL:")) {
            const url = nextLine.replace("URL:", "").trim();
            if (url.startsWith("http")) {
              songs.push({ title: title || "Untitled", url, date: s.date || "", ypName: s.young_person_name || "", mentorName: s.mentor_name || "", sessionId: s.id });
              i++; // skip URL line
            }
          }
        }
        // Also match standalone "URL: https://...pathways-songs..."
        if (line.startsWith("URL:") && line.includes("pathways-songs")) {
          const url = line.replace("URL:", "").trim();
          if (url.startsWith("http") && !songs.find(sg => sg.url === url)) {
            songs.push({ title: "Track", url, date: s.date || "", ypName: s.young_person_name || "", mentorName: s.mentor_name || "", sessionId: s.id });
          }
        }
      }
    });
  } catch (e) { console.error("getSongsFromSessions error:", e); }
  return songs;
}

// ── ACCESS CONTROL: VISIBILITY TIERS ──────────────

/**
 * Redact a session for mentor view.
 * - If the session belongs to this mentor: show everything EXCEPT sensitive_notes and safeguarding
 * - If the session belongs to another mentor: redact notes, mentor_reflection, sensitive_notes, safeguarding
 *   and replace with mentor_summary if available
 * Directors (admin) always get the full, unredacted version via the normal getSessions() path.
 */
export function redactSessionForMentor(session, currentMentorId) {
  // If this is the mentor's own session, show their notes but hide sensitive fields
  if (session.mentor_id === currentMentorId) {
    return {
      ...session,
      sensitive_notes: undefined, // Never show to non-directors
      safeguarding: session.safeguarding?.trim()
        ? "⚠️ Safeguarding notes recorded — check with Nathan or Toni"
        : "",
    };
  }

  // Another mentor's session — redact everything sensitive
  return {
    ...session,
    notes: session.mentor_summary || "Summary not yet available — ask Nathan or Toni for context.",
    mentor_reflection: "",
    sensitive_notes: undefined,
    safeguarding: session.safeguarding?.trim()
      ? "⚠️ Safeguarding notes recorded — check with Nathan or Toni"
      : "",
    _redacted: true, // Flag so UI can show differently
    _original_mentor: session.mentor_name, // Keep for display
  };
}

/**
 * Get sessions for a young person, filtered by the requesting user's role.
 * - Admin: full data
 * - Mentor: own sessions in full (minus sensitive_notes), other mentors' sessions redacted
 */
export function filterSessionsForUser(sessions, currentUser) {
  if (currentUser.role === "admin") {
    return sessions; // Directors see everything
  }

  return sessions.map(s => redactSessionForMentor(s, currentUser.id));
}

/**
 * Get all sessions (for admin) or filtered sessions (for mentor)
 * that relate to a specific young person, with appropriate redaction.
 */
export async function getSessionsForYPFiltered(youngPersonName, currentUser) {
  // Always fetch ALL sessions for this YP (we need them for AI context)
  const { data } = await supabase
    .from("sessions_full")
    .select("*")
    .eq("young_person_name", youngPersonName)
    .order("date", { ascending: false });

  const active = (data || []).filter(s => !s.deleted_at);
  return filterSessionsForUser(active, currentUser);
}

/**
 * Generate and cache mentor-safe summaries for sessions that don't have one yet.
 * Called from the client when a mentor views a YP profile with un-summarised sessions.
 */
export async function generateMentorSummaries(sessionIds, youngPersonName, requestingMentorName) {
  try {
    const res = await fetch("/api/mentor-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // We send session IDs — the API route fetches full data server-side
        sessionIds,
        youngPersonName,
        requestingMentorName,
      }),
    });
    const data = await res.json();
    return data.summaries || [];
  } catch {
    return [];
  }
}

/**
 * Save a generated mentor summary back to the session record for caching.
 */
export async function saveMentorSummary(sessionId, summary) {
  const { error } = await supabase
    .from("sessions")
    .update({ mentor_summary: summary })
    .eq("id", sessionId);
  return { error };
}

/**
 * Create a session with the new sensitive_notes field.
 */
export async function createSessionWithSensitive({
  mentorId, youngPersonId, date, startTime, focusStep, sessionLength, partnerOrg,
  isGroup, groupId, scores, quick, stepAverages, notes, mentorReflection,
  safeguarding, sensitiveNotes, coMentorIds,
}) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      mentor_id: mentorId,
      young_person_id: youngPersonId,
      date,
      start_time: startTime || "",
      focus_step: focusStep,
      session_length: sessionLength,
      partner_org: partnerOrg,
      is_group: isGroup || false,
      group_id: groupId || null,
      scores: scores || {},
      quick: quick || {},
      step_averages: stepAverages || {},
      notes: notes || "",
      mentor_reflection: mentorReflection || "",
      safeguarding: safeguarding || "",
      sensitive_notes: sensitiveNotes || "",
    })
    .select()
    .single();

  if (error) return { data: null, error };

  if (coMentorIds?.length && data) {
    const coRows = coMentorIds.map((mid) => ({
      session_id: data.id,
      mentor_id: mid,
    }));
    await supabase.from("session_co_mentors").insert(coRows);
  }

  return { data, error: null };
}

// ── CHECK-IN QUESTIONNAIRES ──────────────

export async function getCheckinsForYP(youngPersonId) {
  const { data } = await supabase
    .from("checkin_questionnaires")
    .select("*")
    .eq("young_person_id", youngPersonId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function saveCheckinResponses(checkinId, responses) {
  const { data, error } = await supabase
    .from("checkin_questionnaires")
    .update({
      responses,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", checkinId)
    .select()
    .single();
  return { data, error };
}

// ── THEIR VOICE — UNIFIED YP PERSPECTIVE DATA ──────────────

export async function getTheirVoiceData(youngPersonId) {
  const [onboarding, checkins, feedback, sessions] = await Promise.all([
    supabase
      .from("onboarding_assessments")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("checkin_questionnaires")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    supabase
      .from("yp_feedback")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, deleted_at")
      .eq("young_person_id", youngPersonId),
  ]);

  const activeSessionIds = new Set(
    (sessions.data || []).filter(s => !s.deleted_at).map(s => s.id)
  );

  const activeFeedback = (feedback.data || []).filter(fb =>
    activeSessionIds.has(fb.session_id)
  );

  return {
    onboarding: onboarding.data?.[0] || null,
    checkins: checkins.data || [],
    feedback: activeFeedback,
  };
}

// ── SAFEGUARDING CASE MANAGEMENT ──────────────

export async function createSafeguardingCase({ sessionId, youngPersonId, mentorId, date, concern, sessionNotes }) {
  const { data, error } = await supabase
    .from("safeguarding_cases")
    .insert({
      session_id: sessionId,
      young_person_id: youngPersonId,
      mentor_id: mentorId,
      date,
      concern: concern || "",
      session_notes: sessionNotes || "",
      status: "open",
    })
    .select()
    .single();
  return { data, error };
}

export async function getSafeguardingCases() {
  const { data, error } = await supabase
    .from("safeguarding_cases_full")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function resolveSafeguardingCase({ caseId, resolvedBy, witnessId, actionTaken }) {
  const { data, error } = await supabase
    .from("safeguarding_cases")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      witness_id: witnessId,
      action_taken: actionTaken || "",
    })
    .eq("id", caseId)
    .select()
    .single();
  return { data, error };
}

// ── SCHEDULING ──────────────

export async function getSchedule() {
  try {
    const { data, error } = await supabase
      .from("schedule_full")
      .select("*")
      .eq("is_active", true)
      .order("day_of_week", { ascending: true });
    if (error) { console.error("[getSchedule]", error); return []; }
    return data || [];
  } catch (e) { console.error("[getSchedule]", e); return []; }
}

export async function getScheduleForMentor(mentorId) {
  try {
    const { data, error } = await supabase
      .from("schedule_full")
      .select("*")
      .eq("mentor_id", mentorId)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true });
    if (error) { console.error("[getScheduleForMentor]", error); return []; }
    return data || [];
  } catch (e) { console.error("[getScheduleForMentor]", e); return []; }
}

export async function createScheduleSlot({ mentorId, youngPersonId, dayOfWeek, startTime, sessionLength, location, notes, scheduleType, oneOffDate }) {
  const isOneOff = scheduleType === "one_off";
  const { data, error } = await supabase
    .from("session_schedule")
    .insert({
      mentor_id: mentorId,
      young_person_id: youngPersonId,
      day_of_week: isOneOff ? new Date(oneOffDate + "T12:00").getDay() : dayOfWeek,
      start_time: startTime || "14:00",
      session_length: sessionLength || "1 Hour",
      location: location || "SilkFutures",
      notes: notes || "",
      is_active: true,
      schedule_type: isOneOff ? "one_off" : "recurring",
      one_off_date: isOneOff ? oneOffDate : null,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateScheduleSlot(id, updates) {
  const { data, error } = await supabase
    .from("session_schedule")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteScheduleSlot(id) {
  const { error } = await supabase
    .from("session_schedule")
    .update({ is_active: false })
    .eq("id", id);
  return { error };
}

export async function getScheduleOverrides(scheduleId, fromDate) {
  const { data } = await supabase
    .from("schedule_overrides")
    .select("*")
    .eq("schedule_id", scheduleId)
    .gte("original_date", fromDate);
  return data || [];
}

export async function createScheduleOverride({ scheduleId, originalDate, action, newDate, newTime, reason }) {
  const { data, error } = await supabase
    .from("schedule_overrides")
    .insert({
      schedule_id: scheduleId,
      original_date: originalDate,
      action,
      new_date: newDate || null,
      new_time: newTime || null,
      reason: reason || "",
    })
    .select()
    .single();
  return { data, error };
}

// ── MONTHLY REPORTS ──────────────

export async function getMonthlyReport(mentorId, year, month, type) {
  const { data } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("mentor_id", mentorId)
    .eq("year", year)
    .eq("month", month)
    .eq("report_type", type)
    .single();
  return data;
}

export async function saveMonthlyReport({ mentorId, year, month, type, content }) {
  // Upsert - replace if exists
  const existing = await getMonthlyReport(mentorId, year, month, type);
  if (existing) {
    const { data, error } = await supabase
      .from("monthly_reports")
      .update({ content })
      .eq("id", existing.id)
      .select()
      .single();
    return { data, error };
  }
  const { data, error } = await supabase
    .from("monthly_reports")
    .insert({ mentor_id: mentorId, year, month, report_type: type, content })
    .select()
    .single();
  return { data, error };
}

export async function getAllMonthlyReports(year, month, type) {
  const { data } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .eq("report_type", type);
  return data || [];
}

// ── HELPER: Get upcoming sessions from schedule ──────────────

export function getUpcomingSessions(schedule, overrides, daysAhead = 14) {
  const today = new Date();
  const upcoming = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Separate one-off and recurring
  const recurring = schedule.filter(s => s.schedule_type !== "one_off");
  const oneOffs = schedule.filter(s => s.schedule_type === "one_off");

  // Process recurring sessions
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dow = date.getDay();
    const dateStr = date.toISOString().split("T")[0];

    for (const slot of recurring) {
      if (slot.day_of_week !== dow) continue;

      // Check for overrides
      const override = (overrides || []).find(o => o.schedule_id === slot.id && o.original_date === dateStr);
      if (override?.action === "cancel") continue;

      upcoming.push({
        ...slot,
        date: dateStr,
        dayName: dayNames[dow],
        time: override?.new_time || slot.start_time,
        isToday: d === 0,
        isTomorrow: d === 1,
        daysAway: d,
      });
    }
  }

  // Process one-off sessions
  const todayStr = today.toISOString().split("T")[0];
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + daysAhead);
  const futureStr = futureDate.toISOString().split("T")[0];

  for (const slot of oneOffs) {
    const d = slot.one_off_date;
    if (!d || d < todayStr || d >= futureStr) continue;

    // Check for overrides
    const override = (overrides || []).find(o => o.schedule_id === slot.id && o.original_date === d);
    if (override?.action === "cancel") continue;

    const slotDate = new Date(d + "T12:00");
    const diffDays = Math.round((slotDate - new Date(todayStr + "T12:00")) / (1000 * 60 * 60 * 24));

    upcoming.push({
      ...slot,
      date: d,
      dayName: dayNames[slotDate.getDay()],
      time: override?.new_time || slot.start_time,
      isToday: diffDays === 0,
      isTomorrow: diffDays === 1,
      daysAway: diffDays,
    });
  }

  // Sort by date then time
  upcoming.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return (a.time || "").localeCompare(b.time || "");
  });

  return upcoming;
}

// ── DIRECT STORAGE UPLOADS (bypasses Vercel serverless body limit) ──────────────

export async function uploadSongDirect(file, youngPersonName, date, title) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const cleanName = `${(youngPersonName || "unknown").replace(/\s+/g, "-").toLowerCase()}_${date}_${(title || "untitled").replace(/\s+/g, "-").toLowerCase()}_${Date.now()}.${ext}`;
  const path = `songs/${date}/${cleanName}`;

  const { data, error } = await supabase.storage
    .from("pathways-songs")
    .upload(path, file, { contentType: file.type || "audio/mpeg", upsert: true });

  if (error) {
    console.error("[uploadSongDirect] Failed:", error);
    return { url: null, error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from("pathways-songs")
    .getPublicUrl(path);

  return { url: urlData?.publicUrl || null, path, title, error: null };
}

export async function uploadMediaDirect(file, youngPersonName, date, mediaType) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const cleanName = `${date}_${(youngPersonName || "session").replace(/\s+/g, "-").toLowerCase()}_${Date.now()}.${ext}`;
  const folder = mediaType === "video" ? "videos" : "photos";
  const path = `${folder}/${date}/${cleanName}`;

  const { data, error } = await supabase.storage
    .from("pathways-media")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[uploadMediaDirect] Failed:", error);
    return { url: null, error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from("pathways-media")
    .getPublicUrl(path);

  return { url: urlData?.publicUrl || null, path, mediaType, error: null };
}

export async function getEmailLogs(limit = 100) {
  const { data, error } = await supabase
    .from("email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error("[getEmailLogs] Failed:", error);
    return [];
  }
  
  return data || [];
}

