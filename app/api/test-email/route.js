export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY;
  const recipients = process.env.ALERT_EMAILS;

  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" });
  }
  if (!recipients) {
    return NextResponse.json({ error: "ALERT_EMAILS not set" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "SilkFutures Pathways <pathways@silkfutures.com>",
        to: recipients.split(",").map(e => e.trim()),
        subject: "Test — SilkFutures Pathways Email",
        text: "This is a test email from SilkFutures Pathways.\n\nIf you're reading this, email notifications are working.\n\nYou'll receive:\n- Instant safeguarding alerts when a mentor flags a concern\n- Weekly session summaries every Friday at 5pm",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Resend returned an error", status: res.status, details: data });
    }

    return NextResponse.json({ success: true, sent_to: recipients, resend_response: data });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
