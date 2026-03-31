export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
); }

export async function GET(request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK;
  if (!webhookUrl) {
    return NextResponse.json({ error: "No GOOGLE_SHEETS_WEBHOOK configured" }, { status: 500 });
  }

  // Check for ?clear=true to wipe sheet data before backfill
  const { searchParams } = new URL(request.url);
  const shouldClear = searchParams.get("clear") === "true";

  const results = { cleared: false, sessions: 0, safeguarding: 0, feedback: 0, onboarding: 0, checkins: 0, errors: [] };

  try {
    // ── STEP 0: Clear existing sheet data if requested ──
    if (shouldClear) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataType: "clear_all" }),
        });
        results.cleared = true;
        // Wait for clear to complete
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        results.errors.push(`Clear failed: ${err.message}`);
      }
    }

    // ── STEP 1: Fetch all sessions ──
    const { data: sessions } = await getSupabase()
      .from("sessions_full")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: true });

    // ── Group consolidation ──
    // Group sessions share a group_id — consolidate into single rows with comma-separated names
    const groupMap = new Map(); // group_id -> { first session data, names[] }
    const soloSessions = [];

    for (const s of (sessions || [])) {
      if (s.is_group && s.group_id) {
        if (!groupMap.has(s.group_id)) {
          groupMap.set(s.group_id, { session: s, names: [s.young_person_name] });
        } else {
          groupMap.get(s.group_id).names.push(s.young_person_name);
        }
      } else {
        soloSessions.push(s);
      }
    }

    // Convert grouped sessions into single entries
    const consolidatedSessions = [
      ...soloSessions,
      ...Array.from(groupMap.values()).map(({ session, names }) => ({
        ...session,
        young_person_name: names.join(", "),
      })),
    ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    for (const s of consolidatedSessions) {
      const isSetPace = s.partner_org === "Set Pace";
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataType: isSetPace ? "setpace" : "session",
            date: s.date,
            startTime: s.start_time || "",
            mentor: s.mentor_name,
            youngPerson: s.young_person_name,
            focusStep: s.focus_step,
            sessionLength: s.session_length,
            partnerOrg: s.partner_org,
            isGroup: s.is_group ? "Yes" : "No",
            regulation: s.quick?.regulation || "",
            engagement: s.quick?.engagement || "",
            overall: s.quick?.overall || "",
            confidence: s.quick?.confidence || "",
            relationalConnection: s.quick?.relationalConnection || "",
            adaptedAgenda: s.quick?.adaptedAgenda || "",
            resetAvg: s.step_averages?.Reset || "",
            reframeAvg: s.step_averages?.Reframe || "",
            rebuildAvg: s.step_averages?.Rebuild || "",
            releaseAvg: s.step_averages?.Release || "",
            riseAvg: s.step_averages?.Rise || "",
            notes: s.notes || "",
            mentorReflection: s.mentor_reflection || "",
            safeguarding: s.safeguarding || "",
            sensitiveNotes: s.sensitive_notes || "",
            songUrl: "",
            songTitle: "",
            arrivalEnergy: "",
            arrivalMood: "",
            arrivalReady: "",
            feedbackFeel: "",
            feedbackTakeaway: "",
            timestamp: s.created_at,
          }),
        });
        results.sessions++;
        if (s.safeguarding?.trim()) results.safeguarding++;
      } catch (err) {
        results.errors.push(`Session ${s.id}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // ── STEP 2: Fetch all YP feedback ──
    const { data: feedback } = await getSupabase()
      .from("yp_feedback")
      .select("*, sessions!inner(date, mentor_id, young_person_id, deleted_at)")
      .order("created_at", { ascending: true });

    const { data: mentors } = await getSupabase().from("mentors").select("id, name");
    const { data: youngPeople } = await getSupabase().from("young_people").select("id, name");
    const mentorMap = {};
    (mentors || []).forEach(m => { mentorMap[m.id] = m.name; });
    const ypMap = {};
    (youngPeople || []).forEach(y => { ypMap[y.id] = y.name; });

    for (const fb of (feedback || [])) {
      if (fb.sessions?.deleted_at) continue;
      const r = fb.responses || {};
      const getFbVal = (key) => {
        const v = r[key];
        if (!v) return "";
        if (typeof v === "number") return String(v);
        if (v.value !== undefined) return String(v.value);
        if (v.label) return v.label;
        return String(v);
      };
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataType: "feedback",
            date: fb.sessions?.date || "",
            mentor: mentorMap[fb.sessions?.mentor_id] || "",
            youngPerson: ypMap[fb.young_person_id] || "",
            feedbackFeel: getFbVal("yp_feel"),
            feedbackHeard: getFbVal("yp_heard"),
            feedbackCreative: getFbVal("yp_creative"),
            feedbackSafe: getFbVal("yp_safe"),
            feedbackTakeaway: r.yp_takeaway || "",
            feedbackNext: r.yp_next || "",
            timestamp: fb.created_at,
          }),
        });
        results.feedback++;
      } catch (err) {
        results.errors.push(`Feedback ${fb.id}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // ── STEP 3: Fetch all onboarding assessments ──
    const { data: onboarding } = await getSupabase()
      .from("onboarding_assessments")
      .select("*")
      .order("created_at", { ascending: true });

    for (const ob of (onboarding || [])) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataType: "onboard",
            date: new Date(ob.created_at).toISOString().split("T")[0],
            mentor: mentorMap[ob.mentor_id] || "",
            youngPerson: ypMap[ob.young_person_id] || "",
            suggestedStage: ob.suggested_stage || "",
            onboardingResponses: JSON.stringify(ob.responses || {}),
            timestamp: ob.created_at,
          }),
        });
        results.onboarding++;
      } catch (err) {
        results.errors.push(`Onboarding ${ob.id}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // ── STEP 4: Fetch all completed check-ins ──
    const { data: checkins } = await getSupabase()
      .from("checkin_questionnaires")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: true });

    for (const ci of (checkins || [])) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataType: "checkin",
            date: ci.completed_at ? new Date(ci.completed_at).toISOString().split("T")[0] : "",
            mentor: mentorMap[ci.mentor_id] || "",
            youngPerson: ypMap[ci.young_person_id] || "",
            stage: ci.stage || "",
            questions: ci.questions || [],
            responses: ci.responses || {},
            timestamp: ci.completed_at || ci.created_at,
          }),
        });
        results.checkins++;
      } catch (err) {
        results.errors.push(`Checkin ${ci.id}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete.${results.cleared ? " Sheet cleared first." : ""} ${results.sessions} sessions, ${results.safeguarding} safeguarding entries, ${results.feedback} feedback, ${results.onboarding} onboarding, ${results.checkins} check-ins.`,
      results,
    });
  } catch (err) {
    console.error("Backfill error:", err);
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}
