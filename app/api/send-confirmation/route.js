import { Resend } from 'resend'
import { getServiceClient } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  const { email, name } = await req.json()

  try {
    const sb = getServiceClient()
    
    // Generate confirmation link via Supabase admin
    const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tend-app-murex.vercel.app'}/dashboard`
      }
    })

    if (linkError) throw linkError
    const confirmUrl = linkData?.properties?.action_link

    // Send via Resend directly
    const { error } = await resend.emails.send({
      from: 'Tend <hello@tendmentorapp.com>',
      to: email,
      subject: 'Confirm your Tend account',
      html: `
        <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#F4F7F4">
          <div style="text-align:center;margin-bottom:32px">
            <div style="font-size:22px;font-weight:300;letter-spacing:0.12em;color:#4A7C59">tend</div>
          </div>
          <div style="background:white;border-radius:16px;padding:32px;border:1px solid #DDE8DF">
            <h1 style="font-size:22px;font-weight:300;color:#1C2C22;margin:0 0 12px">Welcome to Tend${name ? `, ${name}` : ''}</h1>
            <p style="font-size:15px;color:#4A6455;line-height:1.6;margin:0 0 28px;font-weight:300">Click below to confirm your email and get started.</p>
            <a href="${confirmUrl}" style="display:inline-block;background:#4A7C59;color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:500">Confirm my account →</a>
            <p style="font-size:12px;color:#8FAA96;margin:24px 0 0">This link expires in 1 hour.</p>
          </div>
        </div>
      `
    })

    if (error) throw error
    return Response.json({ success: true })
  } catch (e) {
    console.error('Confirmation email error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
