export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── SEND CONSENT EMAIL ──
    if (action === "send") {
      const { youngPersonId, youngPersonName, parentEmail } = body;
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return NextResponse.json({ error: "Email not configured" }, { status: 500 });
      if (!parentEmail) return NextResponse.json({ error: "Parent email required" }, { status: 400 });

      // Generate a unique token
      const token = crypto.randomUUID();

      // Save consent record
      const { error: dbError } = await getSupabase()
        .from("consent_records")
        .insert({ young_person_id: youngPersonId, token, parent_email: parentEmail, status: "pending" });
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

      // Also save parent_email on the YP record
      await getSupabase().from("young_people").update({ parent_email: parentEmail }).eq("id", youngPersonId);

      // Build consent URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pathways.silkfutures.com";
      const consentUrl = `${baseUrl}/consent/${token}`;

      const emailHtml = `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="border-bottom:2px solid #1A1A1A;padding-bottom:12px;margin-bottom:24px;">
            <strong style="font-size:18px;">SilkFutures</strong>
          </div>
          
          <h2 style="font-size:22px;margin:0 0 12px;color:#1A1A1A;">Consent Form</h2>
          <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 16px;">
            Hi there,
          </p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 16px;">
            <strong>${youngPersonName}</strong> has been registered for mentoring sessions with SilkFutures. We run music-based mentoring programmes in Cardiff, working with young people through rap, songwriting, and music production.
          </p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
            Before we start collecting session data, we need your consent as their parent or guardian. Please review and sign the form using the button below — it takes about 2 minutes.
          </p>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${consentUrl}" style="display:inline-block;padding:14px 36px;background:#1A1A1A;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
              Review & Sign Consent Form
            </a>
          </div>
          
          <p style="font-size:12px;color:#999;line-height:1.6;margin:24px 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${consentUrl}" style="color:#2563EB;">${consentUrl}</a>
          </p>
          
          <p style="font-size:12px;color:#999;line-height:1.6;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px;">
            SilkFutures CIC · Company No. 12461003 · Cardiff, Wales
          </p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "SilkFutures Pathways <pathways@silkfutures.com>",
          to: [parentEmail],
          subject: `SilkFutures — Consent Form for ${youngPersonName}`,
          html: emailHtml,
        }),
      });
      const emailResult = await res.json();
      if (!res.ok) return NextResponse.json({ error: "Email send failed", details: emailResult }, { status: 500 });

      return NextResponse.json({ sent: true, token });
    }

    // ── GET CONSENT RECORD BY TOKEN ──
    if (action === "get") {
      const { token } = body;
      const { data, error } = await getSupabase()
        .from("consent_records")
        .select("*, young_people(name)")
        .eq("token", token)
        .single();
      if (error || !data) return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    // ── SIGN CONSENT ──
    if (action === "sign") {
      const { token, parentName, relationship, signatureImage } = body;
      if (!parentName?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

      // Get the full record first so we have the YP name for the email
      const { data: existing } = await getSupabase()
        .from("consent_records")
        .select("*, young_people(name)")
        .eq("token", token)
        .single();

      const updateData = {
        status: "signed",
        parent_name: parentName.trim(),
        relationship: relationship?.trim() || "",
        signed_at: new Date().toISOString(),
      };
      // Store signature image if provided (drawn signature)
      if (signatureImage) updateData.signature_image = signatureImage;

      const { data, error } = await getSupabase()
        .from("consent_records")
        .update(updateData)
        .eq("token", token)
        .eq("status", "pending")
        .select()
        .single();

      if (error || !data) return NextResponse.json({ error: "Could not sign — form may have already been signed or expired" }, { status: 400 });

      // Send confirmation email to both Nathan and Toni
      const resendKey = process.env.RESEND_API_KEY;
      const notifyEmails = [
        process.env.CONSENT_NOTIFY_EMAIL || "toni@silkfutures.com",
        "7misra@gmail.com",
      ];
      if (resendKey) {
        const ypName = existing?.young_people?.name || "a young person";
        const signedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: "SilkFutures Pathways <pathways@silkfutures.com>",
              to: notifyEmails,
              subject: `✓ Consent signed — ${ypName}`,
              html: `
                <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
                  <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1A1A1A;padding-bottom:12px;margin-bottom:20px;">
                    <strong style="font-size:16px;">SilkFutures Pathways</strong>
                  </div>
                  <h2 style="font-size:18px;margin:0 0 16px;color:#059669;">✓ Consent Form Signed</h2>
                  <table style="font-size:14px;color:#333;line-height:2;">
                    <tr><td style="color:#888;padding-right:16px;">Young person</td><td><strong>${ypName}</strong></td></tr>
                    <tr><td style="color:#888;padding-right:16px;">Signed by</td><td><strong>${parentName.trim()}</strong></td></tr>
                    <tr><td style="color:#888;padding-right:16px;">Relationship</td><td>${relationship?.trim() || "Not specified"}</td></tr>
                    <tr><td style="color:#888;padding-right:16px;">Signed at</td><td>${signedDate}</td></tr>
                    <tr><td style="color:#888;padding-right:16px;">Parent email</td><td>${existing?.parent_email || "—"}</td></tr>
                    <tr><td style="color:#888;padding-right:16px;">Signature type</td><td>${signatureImage ? "Drawn" : "Typed"}</td></tr>
                  </table>
                  <p style="font-size:12px;color:#bbb;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
                    This record is stored in the Pathways database. You can view consent status in Settings → YP Database.
                  </p>
                </div>
              `,
            }),
          });
        } catch (e) { console.warn("Consent notification email failed:", e); }
      }

      return NextResponse.json({ signed: true });
    }

    // ── GET CONSENT STATUS FOR YP ──
    if (action === "status") {
      const { youngPersonId } = body;
      const { data } = await getSupabase()
        .from("consent_records")
        .select("*")
        .eq("young_person_id", youngPersonId)
        .order("created_at", { ascending: false })
        .limit(1);
      return NextResponse.json(data?.[0] || null);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Consent API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
