# TacoAtlas Landing Page

Beautiful landing page and beta signup flow for TacoAtlas — the taco nerd's field guide.

## Features

- 🎨 Beautiful responsive design (mobile-first)
- 📧 Email beta signup with Resend
- 💾 Beta signup storage in Supabase
- ⚡ Serverless API functions on Vercel
- 🔐 Secure, validated email collection

## Setup

### 1. Environment Variables

In Vercel, set these environment variables in Settings → Environment Variables:

```env
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@tacoatlas.app
SUPABASE_URL=https://szblruvrajswbpksinkv.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Get Your Keys

**Resend API Key:**
1. Go to https://resend.com
2. Sign up or log in
3. Navigate to API Keys
4. Copy your API key

**Supabase Keys:**
1. Go to https://app.supabase.com
2. Open the TacoAtlas project
3. Go to Settings → API
4. Copy the `anon` key

## How It Works

1. User enters email on landing page
2. Form POSTs to `/api/webhook`
3. Webhook:
   - ✅ Validates email
   - ✅ Checks if already signed up
   - ✅ Stores in Supabase `beta_signups` table
   - ✅ Sends welcome email via Resend
4. User sees success message

## File Structure

```
.
├── index.html              # Landing page
├── assets/                 # Images, fonts, etc.
├── api/
│   └── webhook.js         # Beta signup handler
├── package.json           # Dependencies
├── vercel.json           # Vercel config
└── README.md             # This file
```

## Development

Run locally with Vercel CLI:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Troubleshooting

**Email not sending?**
- Check Resend API key is valid
- Verify `RESEND_FROM_EMAIL` domain is verified in Resend
- Check Vercel logs: `vercel logs`

**Signups not saving?**
- Verify Supabase credentials
- Check that `beta_signups` table exists
- Review Supabase RLS policies (should allow anonymous inserts)

**CORS errors?**
- Make sure you're POSTing to `/api/webhook` (relative path)
- Vercel handles CORS automatically for same-origin requests
