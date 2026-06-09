# TacoAtlas Email Templates

Three HTML templates for Supabase Auth, branded to match the dark/amber TacoAtlas look. Drop each one into Supabase Dashboard → **Authentication → Emails → Email Templates** and set the subject lines below.

## Where each one goes

| File | Supabase template | Suggested subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `Welcome to TacoAtlas — confirm your email 🌮` |
| `reset-password.html` | Reset password | `Reset your TacoAtlas password` |
| `change-email.html` | Change email address | `Confirm your new TacoAtlas email` |

## How to paste

1. Open the `.html` file, copy the entire contents.
2. In Supabase, open the template, switch the editor to **Source** / **HTML**, paste, save.
3. Set the **Subject heading** above the body to the suggested subject.
4. Hit **Send test email** once SMTP is wired up to confirm rendering.

## Variables used

These are the Supabase Go template variables baked into each file:

- `{{ .ConfirmationURL }}` — the action link (used as both the button `href` and the visible fallback link)
- `{{ .Email }}` — recipient email (shown in confirm-signup, reset-password)
- `{{ .NewEmail }}` — new address (change-email only)

If you want to add the 6-digit OTP fallback Supabase generates, you can also reference `{{ .Token }}` — useful if you ever want to show the code in-email so the user can paste it instead of clicking.

## Brand palette (used inline throughout)

- Background: `#0D0A07`
- Card: `#241C16` with `#3D2E22` border
- Primary amber: `#E8821A` (CTA button + accent)
- Text cream: `#F5EDD8`
- Muted: `#B8A898`
- Dim: `#6B5B4E`

## Notes

- All styles are inline — required because Gmail strips `<style>` blocks, Outlook ignores half of CSS.
- The button uses a `<table>` wrapper around an `<a>` — the "bulletproof button" pattern. Works in Outlook 2007+ without needing VML conditional comments.
- The button text color is dark (`#1A0F03`) on amber for accessibility (contrast ratio ~7:1).
- Dark mode is handled via the brand palette — emails always render dark regardless of client preference. The hidden preheader (the `<span style="display:none">` at the top) sets the preview snippet shown in inbox lists.
- Width is fixed at 560px (mobile collapses thanks to `max-width:100%`).

## Swapping the logo

The header uses `🌮 TacoAtlas` as a text logo. To swap in a real image:

1. Upload a horizontal logo PNG (transparent, ~120px tall) to public storage — Supabase Storage public bucket, or any CDN.
2. Replace the logo `<div>` near the top of each template with:
   ```html
   <img src="https://your-cdn.tld/tacoatlas-logo.png" alt="TacoAtlas" width="200" style="display:block; margin:0 auto;" />
   ```
3. Re-paste into Supabase.
