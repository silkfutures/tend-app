import { getServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  const { email, password, name, orgName } = await req.json()
  const sb = getServiceClient()

  try {
    // Use admin API - skips Supabase emails entirely
    const { data: userData, error: userError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })
    if (userError) throw userError
    const userId = userData.user.id

    // Create or find org
    let org
    const { data: existingOrg } = await sb.from('organisations').select('*').ilike('name', orgName.trim()).single()
    if (existingOrg) {
      org = existingOrg
    } else {
      const { data: newOrg, error: orgErr } = await sb.from('organisations').insert({ name: orgName.trim() }).select().single()
      if (orgErr) throw orgErr
      org = newOrg
    }

    // Check role
    const { data: existingMentors } = await sb.from('mentors').select('id').eq('org_id', org.id)
    const role = (!existingMentors || existingMentors.length === 0) ? 'admin' : 'mentor'

    // Create mentor profile
    const { error: mentorErr } = await sb.from('mentors').insert({
      id: userId, name: name.trim(),
      email: email.trim().toLowerCase(),
      org_id: org.id, role,
    })
    if (mentorErr) throw mentorErr

    // Generate confirmation link
    const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
      type: 'signup', email,
      options: { redirectTo: 'https://tend-app-murex.vercel.app/dashboard' }
    })
    if (linkError) throw linkError
    const confirmUrl = linkData?.properties?.action_link

    // Send branded email
    await resend.emails.send({
      from: 'Tend <hello@tendmentorapp.com>',
      to: email,
      subject: 'Confirm your Tend account',
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#E4EAE5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E4EAE5;padding:40px 16px">
<tr><td align="center"><table width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:28px">
  <span style="font-size:20px;font-weight:300;letter-spacing:0.12em;color:#4A7C59">tend</span>
</td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;border:1px solid #DDE8DF">
  <p style="margin:0 0 14px;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8FAA96">Welcome to Tend</p>
  <h1 style="margin:0 0 14px;font-size:28px;font-weight:300;color:#1C2C22;line-height:1.2">Good to have you, ${name.trim().split(' ')[0]}.</h1>
  <p style="margin:0 0 32px;font-size:15px;font-weight:300;color:#4A6455;line-height:1.65">Click below to confirm your email and get started with Tend.</p>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px">
    <tr><td style="background:#4A7C59;border-radius:12px">
      <a href="${confirmUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none">Confirm my account →</a>
    </td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #DDE8DF;margin:0 0 20px">
  <p style="margin:0;font-size:12px;color:#8FAA96;line-height:1.6">This link expires in 1 hour. If you didn't sign up for Tend, ignore this email.</p>
</td></tr>
<tr><td align="center" style="padding-top:20px">
  <p style="margin:0;font-size:11px;color:#8FAA96">Tend · <a href="https://tendmentorapp.com" style="color:#8FAA96;text-decoration:none">tendmentorapp.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error('Signup error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
