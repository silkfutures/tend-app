export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK;
  if (!webhookUrl) {
    return NextResponse.json({ skipped: true, reason: "No GOOGLE_SHEETS_WEBHOOK configured" });
  }

  try {
    const data = await request.json();
    const dataType = data.dataType || "session";

    // Extract feedback values (handle both object and primitive formats)
    const fb = data.feedbackData || {};
    const getFbValue = (key) => {
      const v = fb[key];
      if (!v) return "";
      if (typeof v === "number") return String(v);
      if (v.value !== undefined) return String(v.value);
      if (v.label) return v.label;
      return String(v);
    };

    // Extract arrival values
    const arr = data.arrivalData || {};
    const getArrValue = (key) => {
      const v = arr[key];
      if (!v) return "";
      if (v.label) return `${v.label} (${v.value}/4)`;
      return String(v);
    };

    const row = {
      dataType,
      tab: data.tab || data.focusStep || "All Sessions",
      date: data.date || "",
      startTime: data.startTime || "",
      mentor: data.mentor || "",
      youngPerson: data.youngPerson || "",
      focusStep: data.focusStep || "",
      sessionType: data.sessionType || "",
      sessionLength: data.sessionLength || "",
      partnerOrg: data.partnerOrg || "",
      isGroup: data.isGroup ? "Yes" : "No",
      regulation: data.quick?.emotionalState || data.quick?.regulation || "",
      engagement: data.quick?.engagement || "",
      confidence: data.quick?.confidence || "",
      relationalConnection: data.quick?.relationalConnection || "",
      reflection: data.quick?.reflection || "",
      resetAvg: data.stepAverages?.Reset || "",
      reframeAvg: data.stepAverages?.Reframe || "",
      rebuildAvg: data.stepAverages?.Rebuild || "",
      releaseAvg: data.stepAverages?.Release || "",
      riseAvg: data.stepAverages?.Rise || "",
      notes: data.notes || "",
      mentorReflection: data.mentorReflection || "",
      safeguarding: data.safeguarding || "",
      sensitiveNotes: data.sensitiveNotes || "",
      songUrl: data.songUrl || "",
      songTitle: data.songTitle || "",
      arrivalEnergy: getArrValue("arrival_energy"),
      arrivalMood: getArrValue("arrival_mood"),
      arrivalReady: getArrValue("arrival_ready"),
      feedbackFeel: getFbValue("yp_feel"),
      feedbackHeard: getFbValue("yp_heard"),
      feedbackCreative: getFbValue("yp_creative"),
      feedbackSafe: getFbValue("yp_safe"),
      feedbackTakeaway: fb.yp_takeaway || "",
      feedbackNext: fb.yp_next || "",
      onboardingResponses: data.onboardingResponses ? JSON.stringify(data.onboardingResponses) : "",
      suggestedStage: data.suggestedStage || "",
      // Check-in questionnaire data
      questions: data.questions || [],
      responses: data.responses || {},
      stage: data.stage || "",
      timestamp: new Date().toISOString(),
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    return NextResponse.json({ synced: true });
  } catch (err) {
    console.error("Sheets sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
