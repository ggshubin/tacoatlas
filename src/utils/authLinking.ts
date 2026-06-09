interface AuthLinkParams {
  accessToken: string | null
  refreshToken: string | null
  // PKCE flow: confirmation links come back as ?code=... and must be
  // exchanged for a session via supabase.auth.exchangeCodeForSession(code).
  code: string | null
  type: string | null
  errorDescription: string | null
}

export function parseAuthFragment(url: string): AuthLinkParams {
  const fragmentIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')

  const fragment = fragmentIndex >= 0 ? url.slice(fragmentIndex + 1) : ''
  const queryEnd = fragmentIndex >= 0 ? fragmentIndex : url.length
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1, queryEnd) : ''

  const frag = new URLSearchParams(fragment)
  const qry = new URLSearchParams(query)

  return {
    accessToken: frag.get('access_token'),
    refreshToken: frag.get('refresh_token'),
    code: qry.get('code'),
    type: frag.get('type') ?? qry.get('type'),
    errorDescription:
      frag.get('error_description') ?? qry.get('error_description'),
  }
}
