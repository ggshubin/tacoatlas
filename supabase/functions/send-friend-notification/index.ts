import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Verify the caller's JWT using the anon key
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  let addresseeId: unknown
  try {
    ;({ addresseeId } = await req.json())
  } catch {
    return json({ error: 'Malformed JSON body' }, 400)
  }

  // Only the recipient is caller-supplied, and it is still checked against a
  // real pending request below. The notification text is NOT taken from the
  // body: an earlier version accepted `requesterUsername` and interpolated it
  // straight into the push, which let any signed-in user send arbitrary text
  // to any user whose UUID they knew (and searchUserByUsername hands UUIDs
  // out). Username is now read server-side from the verified caller's id.
  if (typeof addresseeId !== 'string' || !UUID_RE.test(addresseeId)) {
    return json({ error: 'addresseeId must be a UUID' }, 400)
  }

  if (addresseeId === user.id) {
    return json({ error: 'Cannot notify yourself' }, 400)
  }

  // Service role: needs to read another user's push token and to see the
  // friendship row regardless of the caller's RLS view.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Authorization gate: a push may only be sent as the side effect of a real
  // pending request that this caller actually created.
  const { data: friendship } = await adminClient
    .from('friendships')
    .select('requester_id')
    .eq('requester_id', user.id)
    .eq('addressee_id', addresseeId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!friendship) {
    return json({ error: 'No pending friend request to notify about' }, 403)
  }

  const { data: requester } = await adminClient
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const requesterUsername = requester?.username
  if (!requesterUsername) {
    // No username to attribute the request to — skip rather than send an
    // anonymous, unactionable push.
    return json({ ok: true, sent: false }, 200)
  }

  const { data: tokenRow } = await adminClient
    .from('push_tokens')
    .select('token')
    .eq('user_id', addresseeId)
    .single()

  if (!tokenRow?.token) {
    // Recipient has no push token — not an error, just no-op
    return json({ ok: true, sent: false }, 200)
  }

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: tokenRow.token,
      title: 'New Friend Request 🌮',
      body: `@${requesterUsername} wants to join your crew`,
      data: { screen: 'mi-gente' },
      channelId: 'friend-requests',
    }),
  })

  return json({ ok: true, sent: true }, 200)
})
