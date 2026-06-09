import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const BETA_LINK = 'https://play.google.com/apps/internaltest/4701312022362928546';

function buildApprovalEmail() {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>You're In — TacoAtlas Beta</title>
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
    Your beta access is ready — tap the link to install TacoAtlas.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
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
              <tr>
                <td style="padding-bottom: 16px;">
                  <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#4ade80; vertical-align:middle;"></span>
                  <span style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#4ade80; vertical-align:middle; padding-left:8px;">Access granted</span>
                </td>
              </tr>
              <tr>
                <td class="hero-title" style="font-family: 'Anton', Impact, sans-serif; font-size: 46px; line-height: 1.0; text-transform: uppercase; color: #f1e7d3; padding-bottom: 18px;">
                  You're in.
                </td>
              </tr>
              <tr>
                <td style="font-size:16px; line-height:1.65; color:#b6a689; padding-bottom: 6px;">
                  Your beta access is live. Tap the button below to install TacoAtlas on your Android device. You'll get early access to every feature before anyone else.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td class="inner" style="padding: 0 36px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td align="center" style="border-radius: 12px; background: #e0922e;">
                  <a href="${BETA_LINK}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Anton', Impact, sans-serif; font-size: 18px; letter-spacing: 0.06em; text-transform: uppercase; color: #1a140d; text-decoration: none; border-radius: 12px;">
                    Install the Beta
                  </a>
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

        <!-- Instructions -->
        <tr>
          <td class="inner" style="padding: 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family: 'Anton', Impact, sans-serif; font-size: 20px; text-transform: uppercase; color: #f1e7d3; padding-bottom: 20px;">
                  How to install
                </td>
              </tr>

              <!-- Step 1 -->
              <tr>
                <td style="padding-bottom: 18px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="36">
                        <div style="width:28px; height:28px; border-radius:50%; background:rgba(224,146,46,0.15); border:1px solid rgba(224,146,46,0.3); text-align:center; line-height:28px; font-size:14px; font-weight:700; color:#e0922e;">
                          1
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Open the link on your Android phone</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Use the button above or copy the link to your phone's browser.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Step 2 -->
              <tr>
                <td style="padding-bottom: 18px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="36">
                        <div style="width:28px; height:28px; border-radius:50%; background:rgba(224,146,46,0.15); border:1px solid rgba(224,146,46,0.3); text-align:center; line-height:28px; font-size:14px; font-weight:700; color:#e0922e;">
                          2
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Accept the beta invite</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Google Play will ask you to opt in to the beta testing program.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Step 3 -->
              <tr>
                <td style="padding-bottom: 4px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="top" width="36">
                        <div style="width:28px; height:28px; border-radius:50%; background:rgba(224,146,46,0.15); border:1px solid rgba(224,146,46,0.3); text-align:center; line-height:28px; font-size:14px; font-weight:700; color:#e0922e;">
                          3
                        </div>
                      </td>
                      <td valign="top" style="padding-left:12px;">
                        <span style="font-size:15px; font-weight:700; color:#f1e7d3;">Download &amp; start mapping</span><br>
                        <span style="font-size:14px; color:#8c7e66; line-height:1.5;">Install the app from Google Play and sign up. You're one of the first.</span>
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

        <!-- Feedback callout -->
        <tr>
          <td class="inner" style="padding: 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(224,146,46,0.08); border:1px solid rgba(224,146,46,0.22); border-radius:12px;">
              <tr>
                <td style="padding: 22px 24px;">
                  <span style="font-family:'Anton', Impact, sans-serif; font-size:15px; letter-spacing:0.08em; text-transform:uppercase; color:#e0922e;">&#128172; We want your feedback</span>
                  <p style="font-size:14px; line-height:1.6; color:#b6a689; margin:10px 0 0;">
                    Found a bug? Have an idea? Just reply to this email — it goes straight to the founder. Beta testers shape what this app becomes.
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

  const authToken = process.env.APPROVE_SECRET;
  if (!authToken) {
    return res.status(500).json({ error: 'APPROVE_SECRET not configured' });
  }

  const providedToken = req.headers['authorization']?.replace('Bearer ', '');
  if (providedToken !== authToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `TacoAtlas <${fromEmail}>`,
      to: normalizedEmail,
      replyTo: process.env.NOTIFY_EMAIL || fromEmail,
      subject: "🌮 You're in — install the TacoAtlas beta",
      html: buildApprovalEmail()
    });

    if (error) {
      console.error('Approval email error:', error);
      return res.status(500).json({ error: 'Failed to send approval email' });
    }

    return res.status(200).json({
      success: true,
      message: `Approval email sent to ${normalizedEmail}`,
      emailId: data?.id
    });

  } catch (error) {
    console.error('Approve handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
