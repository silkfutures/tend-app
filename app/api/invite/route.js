import { getServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  const { email, orgId, orgName, invitedBy } = await req.json()
  if (!email || !orgId) return Response.json({ error: 'Missing required fields' }, { status: 400 })

  const sb = getServiceClient()

  try {
    // Check if already a mentor in this org
    const { data: existing } = await sb.from('mentors').select('id').eq('email', email.trim().toLowerCase()).eq('org_id', orgId).single()
    if (existing) return Response.json({ error: 'This person is already in your team' }, { status: 400 })

    // Store pending signup so the auth route can pick it up
    await sb.from('pending_signups').upsert({
      email: email.trim().toLowerCase(),
      name: email.split('@')[0],
      org_id: orgId,
    }, { onConflict: 'email' }).select()

    // Send invite email via Resend
    const signupUrl = `https://tend-app-murex.vercel.app/?inviteOrgId=${orgId}`

    await resend.emails.send({
      from: 'Tend <hello@tendmentorapp.com>',
      to: email.trim(),
      subject: `You've been invited to Tend`,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#E4EAE5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E4EAE5;padding:40px 16px">
<tr><td align="center"><table width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:28px">
  <span style="font-size:20px;font-weight:300;letter-spacing:0.12em;color:#4A7C59">tend</span>
</td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;border:1px solid #DDE8DF">
  <p style="margin:0 0 14px;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8FAA96">Team Invitation</p>
  <h1 style="margin:0 0 14px;font-size:28px;font-weight:300;color:#1C2C22;line-height:1.2">You're invited to join ${orgName || 'a team'} on Tend.</h1>
  <p style="margin:0 0 8px;font-size:15px;font-weight:300;color:#4A6455;line-height:1.65">${invitedBy || 'A colleague'} has invited you to join their mentoring team on Tend — the AI-powered platform for youth practitioners.</p>
  <p style="margin:0 0 32px;font-size:15px;font-weight:300;color:#4A6455;line-height:1.65">Click below to create your account and get started.</p>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px">
    <tr><td style="background:#4A7C59;border-radius:12px">
      <a href="${signupUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none">Join the team →</a>
    </td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #DDE8DF;margin:0 0 20px">
  <p style="margin:0;font-size:12px;color:#8FAA96;line-height:1.6">If you didn't expect this invitation, you can ignore this email.</p>
</td></tr>
<tr><td align="center" style="padding-top:20px">
  <p style="margin:0;font-size:11px;color:#8FAA96">Tend · <a href="https://tendmentorapp.com" style="color:#8FAA96;text-decoration:none">tendmentorapp.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error('Invite error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
