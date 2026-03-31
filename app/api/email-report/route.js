export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(request) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "No email API key configured", sent: false });

  try {
    const { type, report, recipientEmail, recipientName, mentorName, dateRange } = await request.json();

    if (!recipientEmail) return NextResponse.json({ error: "No recipient email", sent: false });

    let subject, htmlBody;

    if (type === "admin") {
      subject = `Director Report — ${mentorName} — ${dateRange}`;
      htmlBody = buildAdminEmailHTML(report, mentorName, dateRange);
    } else {
      subject = `Your Impact Feedback — ${dateRange}`;
      htmlBody = buildMentorEmailHTML(report, mentorName, dateRange);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "SilkFutures Pathways <pathways@silkfutures.com>",
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (data.id) return NextResponse.json({ sent: true });
    return NextResponse.json({ error: data.message || "Send failed", sent: false });
  } catch (err) {
    console.error("Email report error:", err);
    return NextResponse.json({ error: err.message, sent: false });
  }
}

function buildAdminEmailHTML(report, mentorName, dateRange) {
  const stats = report.stats || {};
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="padding:24px 24px 0;border-bottom:3px solid #2563EB;">
      <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Director Report</div>
      <h1 style="font-size:20px;font-weight:800;margin:0 0 4px;color:#1a1a1a;">${mentorName}</h1>
      <p style="font-size:13px;color:#888;margin:0 0 20px;">${dateRange}</p>
    </div>
    ${stats.totalSessions ? `
    <div style="display:flex;padding:16px 24px;background:#f8f9fa;gap:12px;">
      <div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1a1a1a;">${stats.totalSessions}</div><div style="font-size:9px;color:#888;text-transform:uppercase;">Sessions</div></div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1a1a1a;">${stats.ypNames?.length || 0}</div><div style="font-size:9px;color:#888;text-transform:uppercase;">Young People</div></div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1a1a1a;">${stats.avgEng}/5</div><div style="font-size:9px;color:#888;text-transform:uppercase;">Avg Engagement</div></div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:800;color:#1a1a1a;">${stats.sgFlags}</div><div style="font-size:9px;color:#888;text-transform:uppercase;">SG Flags</div></div>
    </div>` : ""}
    <div style="padding:24px;">
      ${report.overview ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px;">Overview</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.overview}</p></div>` : ""}
      ${report.strengths ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;margin-bottom:6px;">Strengths</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.strengths}</p></div>` : ""}
      ${report.patterns ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;margin-bottom:6px;">Patterns</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.patterns}</p></div>` : ""}
      ${report.development ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;margin-bottom:6px;">Development Areas</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.development}</p></div>` : ""}
      ${report.ypHighlights ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px;">Young Person Highlights</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.ypHighlights}</p></div>` : ""}
      ${report.consistency ? `<div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px;">Consistency</div><p style="font-size:14px;line-height:1.7;margin:0;color:#333;">${report.consistency}</p></div>` : ""}
    </div>
  </div>
  <p style="font-size:11px;color:#aaa;text-align:center;margin:20px 0 0;">Generated by SilkFutures Pathways</p>
</div>
</body>
</html>`;
}

function buildMentorEmailHTML(report, mentorName, dateRange) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="padding:24px 24px 0;border-bottom:3px solid #7C3AED;">
      <div style="font-size:10px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Mentor Feedback</div>
      <h1 style="font-size:18px;font-weight:800;margin:0 0 4px;color:#1a1a1a;">${mentorName}</h1>
      <p style="font-size:13px;color:#888;margin:0 0 20px;">${dateRange}</p>
    </div>
    <div style="padding:24px;">
      ${report.greeting ? `<p style="font-size:16px;font-weight:600;line-height:1.5;margin:0 0 16px;color:#1a1a1a;">${report.greeting}</p>` : ""}
      ${report.impact ? `<p style="font-size:14px;line-height:1.7;margin:0 0 16px;color:#333;">${report.impact}</p>` : ""}
      ${report.numbers ? `<div style="padding:14px 16px;background:#05966910;border-radius:8px;margin-bottom:16px;border-left:3px solid #059669;"><p style="font-size:14px;color:#059669;margin:0;line-height:1.6;">${report.numbers}</p></div>` : ""}
      ${report.growth ? `<p style="font-size:14px;color:#666;margin:0 0 16px;line-height:1.6;font-style:italic;">${report.growth}</p>` : ""}
      ${report.closing ? `<p style="font-size:15px;font-weight:600;margin:0;color:#1a1a1a;">${report.closing}</p>` : ""}
    </div>
  </div>
  <p style="font-size:11px;color:#aaa;text-align:center;margin:20px 0 0;">From the SilkFutures team</p>
</div>
</body>
</html>`;
}
