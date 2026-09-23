export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'upToDate' | 'error'

const LABELS: Record<UpdateStatus, string | null> = {
  idle: null,
  checking: 'Checking for updates…',
  downloading: 'Downloading update…',
  ready: 'Update ready. Tap to restart.',
  upToDate: "You're up to date",
  error: 'Could not check for updates',
}

export function updateStatusLabel(status: UpdateStatus): string | null {
  return LABELS[status]
}

// Never interrupt someone mid-log. The prompt reappears when they leave.
const BUSY_ROUTE_PREFIXES = ['/review', '/pin']

export function shouldShowUpdatePrompt(input: {
  status: UpdateStatus
  dismissed: boolean
  signedIn: boolean
  pathname: string
  blocked?: boolean
}): boolean {
  if (input.blocked) return false
  if (!input.signedIn || input.dismissed || input.status !== 'ready') return false
  return !BUSY_ROUTE_PREFIXES.some(prefix => input.pathname.startsWith(prefix))
}
