import { shouldShowProPrivacyReminder } from '../proPrivacyReminder'

describe('shouldShowProPrivacyReminder', () => {
  const base = { wasPro: false, isPro: true, privateSpotCount: 3, alreadyShown: false }

  it('fires on a false→true Pro transition with private spots and unset flag', () => {
    expect(shouldShowProPrivacyReminder(base)).toBe(true)
  })

  it('never fires if already shown', () => {
    expect(shouldShowProPrivacyReminder({ ...base, alreadyShown: true })).toBe(false)
  })

  it('never fires without the transition (was already Pro)', () => {
    expect(shouldShowProPrivacyReminder({ ...base, wasPro: true })).toBe(false)
  })

  it('never fires when not Pro', () => {
    expect(shouldShowProPrivacyReminder({ ...base, isPro: false })).toBe(false)
  })

  it('never fires with zero private spots', () => {
    expect(shouldShowProPrivacyReminder({ ...base, privateSpotCount: 0 })).toBe(false)
  })
})
