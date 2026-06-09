import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function buildWelcomeEmail() {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Welcome to TacoAtlas</title>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body, table, td { font-family: 'Hanken Grotesk', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
    img { border: 0; display: block; }
    a { color: #e0922e; text-decoration: none; }
    @media only screen and (max-width: 520px) {
      .outer { width: 100% !important; }
      .inner { padding: 28px 20px !important; }
      .hero-title { font-size: 38px !important; }
      .feature-table td { display: block !important; width: 100% !important; padding-bottom: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#1a140d; -webkit-text-size-adjust:100%;">

  <!-- Preheader (hidden text for inbox preview) -->
  <div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#1a140d;">
    You just claimed a spot on the beta map. Here's what's coming.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a140d;">
    <tr><td align="center" style="padding: 20px 12px;">

      <!-- Main container -->
      <table role="presentation" class="outer" width="560" cellpadding="0" cellspacing="0" style="background-color:#1f1910; border-radius:16px; overflow:hidden; border:1px solid rgba(241,231,211,0.08);">

        <!-- Header bar -->
        <tr>
          <td style="padding: 28px 36px; border-bottom: 1px solid rgba(241,231,211,0.1);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family: 'Anton', Impact, sans-serif; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; color: #f1e7d3;">
                  &#127790; TACO ATLAS
                </td>
                <td align="right" style="font-family: 'Hanken Grotesk', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8c7e66;">
                  BETA &middot; 2026
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero section -->
        <tr>
          <td class="inner" style="padding: 48px 36px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <!-- Eyebrow -->
              <tr>
                <td style="padding-bottom: 16px;">
                  <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#e0922e; vertical-align:middle;"></span>
                  <span style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#e0922e; vertical-align:middle; padding-left:8px;">Pin dropped</span>
                </td>
              </tr>
              <!-- Title -->
              <tr>
                <td class="hero-title" style="font-family: 'Anton', Impact, sans-serif; font-size: 46px; line-height: 1.0; text-transform: uppercase; color: #f1e7d3; padding-bottom: 18px;">
                  You're on<br>the map.
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="font-size:16px; line-height:1.65; color:#b6a689; padding-bottom: 6px;">
                  Welcome to the TacoAtlas beta list. You just claimed one of the first spots — when we launch, you'll be the first to know.
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

        <!-- What's coming section -->
        <tr>
          <td class="inner" style="padding: 36px 36px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family: 'Anton', Impact, sans-serif; font-size: 24px; text-transform: uppercase; color: #f1e7d3; padding-bottom: 24px;">
                  What's coming
                </td>
              </tr>
            </table>

            <!-- Feature rows -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <!-- Feature 1 -->
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="42">
                        <div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">
                          &#128205;
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">A live taco map</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Every truck, cart and stand near you — pinned by real people, not algorithms.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Feature 2 -->
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="42">
                        <div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">
                          &#11088;
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Rate every taco</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Score the venue and each taco separately on a five-fork scale.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Feature 3 -->
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="42">
                        <div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">
                          &#128247;
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Log every visit</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Snap the plate, drop a rating, build a record of every spot you've conquered.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Feature 4 -->
              <tr>
                <td style="padding-bottom: 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="42">
                        <div style="width:32px; height:32px; border-radius:9px; background:rgba(224,146,46,0.12); border:1px solid rgba(224,146,46,0.28); text-align:center; line-height:32px; font-size:15px;">
                          &#128101;
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Follow your crew</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">See where your friends are eating and share the spots worth the drive.</span>
                      </td>
                    </tr>
                  </table>
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

        <!-- Beta perks callout -->
        <tr>
          <td class="inner" style="padding: 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(224,146,46,0.08); border:1px solid rgba(224,146,46,0.22); border-radius:12px;">
              <tr>
                <td style="padding: 22px 24px;">
                  <span style="font-family:'Anton', Impact, sans-serif; font-size:15px; letter-spacing:0.08em; text-transform:uppercase; color:#e0922e;">&#127942; Beta tester perks</span>
                  <p style="font-size:14px; line-height:1.6; color:#b6a689; margin:10px 0 0;">
                    First access to the app on iOS &amp; Android, lifetime pin privileges, and bragging rights over everyone still tracking tacos in a notes app.
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
                  <span style="font-family:'Anton', Impact, sans-serif; font-size:14px; letter-spacing:0.04em; text-transform:uppercase; color:#b6a689;">
                    &#127790; Taco Atlas
                  </span>
                  <span style="font-size:12px; color:#8c7e66;"> &middot; </span>
                  <a href="https://tacoatlas.app" style="font-size:12px; color:#8c7e66;">tacoatlas.app</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Main container -->

    </td></tr>
  </table>

</body>
</html>`;
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, source, submittedAt } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('beta_signups')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database check error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Save to Supabase
    const { error: insertError } = await supabase
      .from('beta_signups')
      .insert([
        {
          email: normalizedEmail,
          subscribed: true
        }
      ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save email' });
    }

    // Send welcome email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    try {
      await resend.emails.send({
        from: `TacoAtlas <${fromEmail}>`,
        to: normalizedEmail,
        subject: "🌮 You're on the list — welcome to TacoAtlas",
        html: buildWelcomeEmail()
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Notify admin of new signup
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (notifyEmail) {
      try {
        await resend.emails.send({
          from: `TacoAtlas <${fromEmail}>`,
          to: notifyEmail,
          subject: `🌮 New beta signup: ${normalizedEmail}`,
          html: `<div style="font-family:sans-serif;max-width:480px;padding:20px;background:#1f1910;color:#f1e7d3;border-radius:12px;">
            <h2 style="color:#e0922e;margin:0 0 16px;">New Beta Signup</h2>
            <p style="margin:0 0 8px;"><strong style="color:#b6a689;">Email:</strong> ${normalizedEmail}</p>
            <p style="margin:0 0 8px;"><strong style="color:#b6a689;">Source:</strong> ${source || 'landing-page'}</p>
            <p style="margin:0;"><strong style="color:#b6a689;">Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
          </div>`
        });
      } catch (notifyError) {
        console.error('Admin notification error:', notifyError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the beta! Check your email.'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
