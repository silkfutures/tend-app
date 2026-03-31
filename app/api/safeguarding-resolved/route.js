export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { youngPerson, resolvedBy, witness, actionTaken, originalConcern, date, mentor, sessionNotes, timeline } = await request.json();

    const resendKey = process.env.RESEND_API_KEY;
    const recipients = process.env.ALERT_EMAILS || "";

    if (!resendKey || !recipients) {
      console.log("Safeguarding resolved: no email config — logging only");
      console.log(`✓ SAFEGUARDING RESOLVED: ${youngPerson} — by ${resolvedBy}, witness: ${witness}`);
      return NextResponse.json({ logged: true });
    }

    const subject = `✓ Safeguarding Resolved — ${youngPerson}`;

    let timelineSection = "";
    if (timeline && timeline.length > 0) {
      timelineSection = "\n\nCASE TIMELINE:\n" + timeline.map(t =>
        `[${t.date}] ${t.mentor} — ${t.concern}`
      ).join("\n");
    }

    const body = `SAFEGUARDING CASE RESOLVED

Young person: ${youngPerson}
Original date: ${date}
Flagged by: ${mentor}

ORIGINAL CONCERN:
${originalConcern}

SESSION NOTES AT TIME OF FLAG:
${sessionNotes || "None"}
${timelineSection}

RESOLUTION:
Resolved by: ${resolvedBy}
Witness: ${witness}
Action taken: ${actionTaken}
Resolved at: ${new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}

—
This is an automated notification from SilkFutures Pathways.
This safeguarding case has been marked as addressed.`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "SilkFutures Pathways <pathways@silkfutures.com>",
        to: recipients.split(",").map(e => e.trim()),
        subject,
        text: body,
      }),
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Safeguarding resolved email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
