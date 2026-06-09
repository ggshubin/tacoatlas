Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const notifyEmail = Deno.env.get('NOTIFY_EMAIL')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@tacoatlas.app'

  if (!resendApiKey || !notifyEmail) {
    console.error('Missing RESEND_API_KEY or NOTIFY_EMAIL env vars')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const payload = await req.json()
  // DB webhook sends { type, table, record, schema, old_record }
  const record = payload.record ?? payload

  const feedbackType = record.type === 'bug' ? '🐛 Bug Report' : '✨ Feature Request'
  const message = record.message ?? '(no message)'
  const userEmail = record.user_email ?? 'anonymous'
  const createdAt = record.created_at
    ? new Date(record.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    : 'unknown'

  const emailHtml = `
    <div style="font-family: sans-serif; background: #18140F; color: #F5EDD8; padding: 24px; border-radius: 12px;">
      <h2 style="color: #E8821A; margin: 0 0 16px;">New Beta Feedback — ${feedbackType}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #B8A898; width: 120px;">Type</td>
          <td style="padding: 8px 0; color: #F5EDD8;">${feedbackType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #B8A898;">From</td>
          <td style="padding: 8px 0; color: #F5EDD8;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #B8A898;">Submitted</td>
          <td style="padding: 8px 0; color: #F5EDD8;">${createdAt} PT</td>
        </tr>
      </table>
      <div style="margin-top: 16px; padding: 16px; background: #241C16; border-radius: 8px; border-left: 3px solid #E8821A;">
        <p style="margin: 0; color: #F5EDD8; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `TacoAtlas Beta <${fromEmail}>`,
      to: [notifyEmail],
      subject: `[TacoAtlas Beta] ${feedbackType} from ${userEmail}`,
      html: emailHtml,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return new Response('Email send failed', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
