import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    const { error: insertError, data: insertedData } = await supabase
      .from('beta_signups')
      .insert([
        {
          email: normalizedEmail,
          subscribed: true
        }
      ])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save email' });
    }

    // Send welcome email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    try {
      await resend.emails.send({
        from: fromEmail,
        to: normalizedEmail,
        subject: '🌮 Welcome to TacoAtlas Beta!',
        html: `
          <div style="font-family: 'Hanken Grotesk', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e0922e; font-size: 28px; margin-bottom: 20px;">Welcome to TacoAtlas!</h2>

            <p style="color: #f1e7d3; font-size: 16px; line-height: 1.6;">
              Thanks for joining our beta testing community. You're now on the list to get first access to TacoAtlas when we launch.
            </p>

            <p style="color: #f1e7d3; font-size: 16px; line-height: 1.6;">
              Here's what's coming:
            </p>

            <ul style="color: #f1e7d3; font-size: 16px; line-height: 1.8; margin: 20px 0;">
              <li>📍 A live map of every taco truck, cart, and stand near you</li>
              <li>⭐ Rate the venue and each taco separately</li>
              <li>👥 Share your favorite spots with friends</li>
              <li>📝 Build a record of every spot you've conquered</li>
            </ul>

            <p style="color: #f1e7d3; font-size: 16px; line-height: 1.6;">
              We'll be in touch soon with beta access details. In the meantime, follow us for updates.
            </p>

            <p style="color: #b6a689; font-size: 14px; margin-top: 30px;">
              Made for people who drive across town for the good salsa.<br />
              — The TacoAtlas Team
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the whole request if email fails
      // The signup was successful even if email didn't send
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
