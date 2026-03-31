export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { youngPerson, mentor, date, safeguarding, notes } = await request.json();

    if (!safeguarding?.trim()) {
      return NextResponse.json({ skipped: true });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const recipients = process.env.ALERT_EMAILS || "";

    if (!resendKey || !recipients) {
      console.log("Safeguarding alert: no email config — logging only");
      console.log(`⚠️ SAFEGUARDING: ${youngPerson} (${date}, ${mentor}): ${safeguarding}`);
      return NextResponse.json({ logged: true });
    }

    const subject = `⚠️ Safeguarding Flag — ${youngPerson}`;
    const body = `SAFEGUARDING CONCERN RAISED

Young person: ${youngPerson}
Mentor: ${mentor}
Date: ${date}

CONCERN:
${safeguarding}

SESSION NOTES:
${notes || "None"}

—
This is an automated alert from SilkFutures Pathways.
Please review and take appropriate action.`;

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
    console.error("Safeguarding alert error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
