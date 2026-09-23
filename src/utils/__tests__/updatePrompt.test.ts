import { updateStatusLabel, shouldShowUpdatePrompt } from '../updatePrompt'

describe('updateStatusLabel', () => {
  it.each([
    ['idle', null],
    ['checking', 'Checking for updates…'],
    ['downloading', 'Downloading update…'],
    ['ready', 'Update ready. Tap to restart.'],
    ['upToDate', "You're up to date"],
    ['error', 'Could not check for updates'],
  ] as const)('%s', (status, label) => {
    expect(updateStatusLabel(status)).toBe(label)
  })
})

describe('shouldShowUpdatePrompt', () => {
  const base = { status: 'ready' as const, dismissed: false, signedIn: true, pathname: '/atlas' }

  it('shows when a signed-in user has a ready update', () => {
    expect(shouldShowUpdatePrompt(base)).toBe(true)
  })
  it('hides when signed out', () => {
    expect(shouldShowUpdatePrompt({ ...base, signedIn: false })).toBe(false)
  })
  it('hides after Later', () => {
    expect(shouldShowUpdatePrompt({ ...base, dismissed: true })).toBe(false)
  })
  it('hides unless ready', () => {
    expect(shouldShowUpdatePrompt({ ...base, status: 'downloading' })).toBe(false)
  })
  it.each(['/review/add', '/pin/add', '/welcome', '/onboarding/step-1'])('waits while %s is open', pathname => {
    expect(shouldShowUpdatePrompt({ ...base, pathname })).toBe(false)
  })
  it('hides when another modal is blocking (stacked-modal guard)', () => {
    expect(shouldShowUpdatePrompt({ ...base, blocked: true })).toBe(false)
  })
  it('shows when not blocked', () => {
    expect(shouldShowUpdatePrompt({ ...base, blocked: false })).toBe(true)
  })
})
