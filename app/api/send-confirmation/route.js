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
        redirectTo: 'https://tend-app-murex.vercel.app/dashboard'
      }
    })

    if (linkError) throw linkError
    const confirmUrl = linkData?.properties?.action_link

    // Send via Resend directly
    const { error } = await resend.emails.send({
      from: 'Tend <hello@tendmentorapp.com>',
      to: email,
      subject: 'Confirm your Tend account',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#E4EAE5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E4EAE5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
        
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px">
              <svg width="28" height="28" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 38 Q7 6 22 6 Q37 6 37 38" stroke="#6BAF7C" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                <path d="M13 38 Q13 14 22 14 Q31 14 31 38" stroke="#4A7C59" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                <circle cx="22" cy="8" r="3.2" fill="#4A7C59"/>
              </svg>
            </td>
            <td style="font-size:20px;font-weight:300;letter-spacing:0.12em;color:#4A7C59">tend</td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:20px;padding:40px 36px;border:1px solid #DDE8DF">
          
          <!-- Eyebrow -->
          <p style="margin:0 0 16px;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8FAA96">Welcome to Tend</p>
          
          <!-- Heading -->
          <h1 style="margin:0 0 14px;font-size:28px;font-weight:300;color:#1C2C22;line-height:1.2">
            ${name ? `Good to have you,<br>${name.split(' ')[0]}.` : `You\'re almost in.`}
          </h1>
          
          <!-- Body -->
          <p style="margin:0 0 32px;font-size:15px;font-weight:300;color:#4A6455;line-height:1.65">
            You're one step away from your Tend account. Click the button below to confirm your email address and start using mentoring intelligence built for the people doing the work.
          </p>

          <!-- Button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px">
            <tr><td style="background:#4A7C59;border-radius:12px">
              <a href="${confirmUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:0.03em">
                Confirm my account →
              </a>
            </td></tr>
          </table>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #DDE8DF;margin:0 0 24px">

          <!-- Small print -->
          <p style="margin:0;font-size:12px;color:#8FAA96;line-height:1.6">
            This link expires in 1 hour. If you didn't create a Tend account, you can safely ignore this email — nothing will happen.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px">
          <p style="margin:0;font-size:11px;color:#8FAA96;line-height:1.6">
            Tend · Mentoring intelligence<br>
            <a href="https://tendmentorapp.com" style="color:#8FAA96;text-decoration:none">tendmentorapp.com</a>
            &nbsp;·&nbsp;
            <a href="mailto:hello@tendmentorapp.com" style="color:#8FAA96;text-decoration:none">hello@tendmentorapp.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
    })

    if (error) throw error
    return Response.json({ success: true })
  } catch (e) {
    console.error('Confirmation email error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
