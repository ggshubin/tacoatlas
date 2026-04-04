import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Verify caller is authenticated
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const { addresseeId, requesterUsername } = await req.json()
  if (!addresseeId || !requesterUsername) {
    return new Response('Bad Request', { status: 400, headers: corsHeaders })
  }

  // Use service role to read the recipient's push token
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tokenRow } = await adminClient
    .from('push_tokens')
    .select('token')
    .eq('user_id', addresseeId)
    .single()

  if (!tokenRow?.token) {
    // Recipient has no push token — not an error, just no-op
    return new Response(JSON.stringify({ ok: true, sent: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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

  return new Response(JSON.stringify({ ok: true, sent: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
