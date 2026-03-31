export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authToken = searchParams.get("auth");
  const mentorEmail = searchParams.get("mentor");
  const ypName = searchParams.get("yp");
  const date = searchParams.get("date");

  // Verify auth token
  if (authToken !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mentorEmail || !ypName || !date) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    // Get mentor details
    const { data: mentor } = await supabase
      .from("mentors")
      .select("*")
      .eq("email", mentorEmail)
      .single();

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const mentorFirstName = mentor.name?.split(" ")[0] || mentor.name;

    // Build email
    const subject = `Pathways — Session log needed: ${ypName}`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F7F5F2;margin:0;padding:24px">
<div style="max-width:500px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E0D8">

  <div style="background:#1A1A1A;padding:20px 24px">
    <div style="color:#F7F5F2;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">SilkFutures Pathways</div>
  </div>

  <div style="padding:24px">
    <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:#1A1A1A">Hi ${mentorFirstName},</h2>
    
    <p style="font-size:14px;line-height:1.6;color:#1A1A1A;margin:0 0 16px">
      We noticed your scheduled session with <strong>${ypName}</strong> on <strong>${new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</strong> hasn't been logged yet.
    </p>

    <p style="font-size:14px;line-height:1.6;color:#1A1A1A;margin:0 0 20px">
      If the session went ahead, please take a moment to log it so we can track impact and support the young people effectively.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tend-app-murex.vercel.app'}/dashboard" 
       style="display:inline-block;padding:12px 24px;background:#047857;color:#FFFFFF;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:16px">
      Log Session Now
    </a>

    <p style="font-size:12px;line-height:1.5;color:#8A8278;margin:16px 0 0">
      If the session was cancelled or rescheduled, you can dismiss this reminder — we just want to make sure nothing gets missed.
    </p>

    <p style="font-size:12px;line-height:1.5;color:#8A8278;margin:12px 0 0">
      Thanks,<br>Nathan & Toni
    </p>
  </div>

  <div style="background:#F0EDE8;padding:12px 24px;text-align:center">
    <p style="font-size:10px;color:#B5B0A8;margin:0">Sent from SilkFutures Pathways</p>
  </div>
</div>
</body>
</html>`;

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "SilkFutures Pathways <pathways@silkfutures.com>",
        to: mentorEmail,
        subject,
        html: htmlBody,
      }),
    });

    // Log to database
    await supabase.from("email_log").insert({
      email_type: "reminder",
      recipient_email: mentorEmail,
      recipient_name: mentor.name,
      subject,
      body_html: htmlBody,
      metadata: {
        young_person: ypName,
        session_date: date,
        triggered_by: "weekly_summary",
        sent_at: new Date().toISOString(),
      },
      sent_successfully: true,
    });

    return NextResponse.json({ 
      sent: true, 
      mentor: mentor.name,
      session: { yp: ypName, date }
    });

  } catch (error) {
    console.error("Send reminder error:", error);
    
    // Log failure
    await supabase.from("email_log").insert({
      email_type: "reminder",
      recipient_email: mentorEmail,
      subject: `Pathways — Session log needed: ${ypName}`,
      metadata: { young_person: ypName, session_date: date },
      sent_successfully: false,
      error_message: error.message,
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
