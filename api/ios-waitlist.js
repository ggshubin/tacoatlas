import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function buildIosWelcomeEmail() {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>TacoAtlas iOS — You're on the list</title>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td { font-family: 'Hanken Grotesk', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
    img { border: 0; display: block; }
    a { color: #e0922e; text-decoration: none; }
    @media only screen and (max-width: 520px) {
      .outer { width: 100% !important; }
      .inner { padding: 28px 20px !important; }
      .hero-title { font-size: 38px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#1a140d; -webkit-text-size-adjust:100%;">

  <div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#1a140d;">
    TacoAtlas is coming to iPhone. We'll let you know the moment it drops.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a140d;">
    <tr><td align="center" style="padding: 20px 12px;">

      <table role="presentation" class="outer" width="560" cellpadding="0" cellspacing="0" style="background-color:#1f1910; border-radius:16px; overflow:hidden; border:1px solid rgba(241,231,211,0.08);">

        <!-- Header bar -->
        <tr>
          <td style="padding: 28px 36px; border-bottom: 1px solid rgba(241,231,211,0.1);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="30" style="font-size:18px; line-height:1; padding-right:6px;">&#127790;</td>
                <td style="font-family: 'Anton', Impact, sans-serif; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; color: #f1e7d3;">
                  TACO ATLAS
                </td>
                <td align="right" style="font-family: 'Hanken Grotesk', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8c7e66;">
                  iOS &middot; COMING SOON
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero section -->
        <tr>
          <td class="inner" style="padding: 48px 36px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 16px;">
                  <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#e0922e; vertical-align:middle;"></span>
                  <span style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#e0922e; vertical-align:middle; padding-left:8px;">iOS Waitlist</span>
                </td>
              </tr>
              <tr>
                <td class="hero-title" style="font-family: 'Anton', Impact, sans-serif; font-size: 46px; line-height: 1.0; text-transform: uppercase; color: #f1e7d3; padding-bottom: 18px;">
                  iPhone is<br>next.
                </td>
              </tr>
              <tr>
                <td style="font-size:16px; line-height:1.65; color:#b6a689; padding-bottom: 6px;">
                  You're on the TacoAtlas iOS waitlist. When the App Store version goes live, you'll be the first to know — we'll send you a direct link.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding: 0 36px;">
            <div style="border-top: 1px solid rgba(241,231,211,0.1);"></div>
          </td>
        </tr>

        <!-- What to expect -->
        <tr>
          <td class="inner" style="padding: 36px 36px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family: 'Anton', Impact, sans-serif; font-size: 24px; text-transform: uppercase; color: #f1e7d3; padding-bottom: 24px;">
                  What's coming to iPhone
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td valign="top" width="42"><div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">&#128205;</div></td>
                    <td valign="top" style="padding-left:12px;"><span style="font-size:15px; font-weight:700; color:#f1e7d3;">The full taco map</span><br><span style="font-size:14px; color:#8c7e66; line-height:1.5;">Every truck, cart and stand — pinned by real people, not algorithms.</span></td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td valign="top" width="42"><div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">&#11088;</div></td>
                    <td valign="top" style="padding-left:12px;"><span style="font-size:15px; font-weight:700; color:#f1e7d3;">Rate every taco</span><br><span style="font-size:14px; color:#8c7e66; line-height:1.5;">Score the venue and each taco on a five-fork scale — same as Android.</span></td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td valign="top" width="42"><div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">&#128101;</div></td>
                    <td valign="top" style="padding-left:12px;"><span style="font-size:15px; font-weight:700; color:#f1e7d3;">Follow your crew</span><br><span style="font-size:14px; color:#8c7e66; line-height:1.5;">See where your friends are eating across Android and iPhone.</span></td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding: 0 36px;">
            <div style="border-top: 1px solid rgba(241,231,211,0.1);"></div>
          </td>
        </tr>

        <!-- Callout -->
        <tr>
          <td class="inner" style="padding: 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(224,146,46,0.08); border:1px solid rgba(224,146,46,0.22); border-radius:12px;">
              <tr>
                <td style="padding: 22px 24px;">
                  <span style="font-family:'Anton', Impact, sans-serif; font-size:15px; letter-spacing:0.08em; text-transform:uppercase; color:#e0922e;">&#127942; iOS Early Access</span>
                  <p style="font-size:14px; line-height:1.6; color:#b6a689; margin:10px 0 0;">
                    We'll email you the direct App Store link the day the iOS app goes live — no hunting for it.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 28px 36px 36px; border-top: 1px solid rgba(241,231,211,0.08);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px; color:#8c7e66; line-height:1.6; padding-bottom: 20px;">
                  Made for people who drive across town for the good salsa.
                </td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:12px; line-height:1; padding-right:4px;">&#127790;</td>
                    <td style="font-family:'Anton', Impact, sans-serif; font-size:14px; letter-spacing:0.04em; text-transform:uppercase; color:#b6a689;">Taco Atlas</td>
                    <td style="font-size:12px; color:#8c7e66; padding:0 4px;"> &middot; </td>
                    <td><a href="https://tacoatlas.app" style="font-size:12px; color:#8c7e66;">tacoatlas.app</a></td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, submittedAt } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already on iOS waitlist
    const { data: existing, error: checkError } = await supabase
      .from('beta_signups')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('platform', 'ios')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database check error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing) {
      return res.status(400).json({ error: 'Email already on iOS waitlist' });
    }

    // Save to Supabase with platform='ios'
    const { error: insertError } = await supabase
      .from('beta_signups')
      .insert([{ email: normalizedEmail, subscribed: true, platform: 'ios' }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save email' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    // Send confirmation email to user
    try {
      await resend.emails.send({
        from: `TacoAtlas <${fromEmail}>`,
        to: normalizedEmail,
        subject: '🌮 You\'re on the iOS waitlist — TacoAtlas is coming to iPhone',
        html: buildIosWelcomeEmail()
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Notify admin
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (notifyEmail) {
      try {
        await resend.emails.send({
          from: `TacoAtlas <${fromEmail}>`,
          to: notifyEmail,
          subject: `🍎 New iOS waitlist signup: ${normalizedEmail}`,
          html: `<div style="font-family:sans-serif;max-width:480px;padding:20px;background:#1f1910;color:#f1e7d3;border-radius:12px;">
            <h2 style="color:#e0922e;margin:0 0 16px;">New iOS Waitlist Signup</h2>
            <p style="margin:0 0 8px;"><strong style="color:#b6a689;">Email:</strong> ${normalizedEmail}</p>
            <p style="margin:0 0 8px;"><strong style="color:#b6a689;">Platform:</strong> iOS waitlist</p>
            <p style="margin:0;"><strong style="color:#b6a689;">Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
          </div>`
        });
      } catch (notifyError) {
        console.error('Admin notification error:', notifyError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'You\'re on the iOS waitlist! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('iOS waitlist error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
