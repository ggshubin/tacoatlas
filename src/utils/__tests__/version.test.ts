import { formatVersionLabel, shortUpdateId, formatOtaSubtitle } from '../version'

describe('formatVersionLabel', () => {
  it('version and build', () => {
    expect(formatVersionLabel('1.3.1', '52', '1.3.1')).toBe('1.3.1 (52)')
  })
  it('falls back to the config version when native is unavailable', () => {
    expect(formatVersionLabel(null, null, '1.3.1')).toBe('1.3.1')
  })
  it('omits an empty build number', () => {
    expect(formatVersionLabel('1.3.1', '', null)).toBe('1.3.1')
  })
  it('says unknown when nothing is known', () => {
    expect(formatVersionLabel(null, null, null)).toBe('unknown')
  })
})

describe('shortUpdateId', () => {
  it('first 8 hex chars without dashes', () => {
    expect(shortUpdateId('0a1b2c3d-4e5f-6789-abcd-ef0123456789')).toBe('0a1b2c3d')
  })
  it('null for null', () => {
    expect(shortUpdateId(null)).toBeNull()
  })
})

describe('formatOtaSubtitle', () => {
  it('no date when createdAt is null', () => {
    expect(formatOtaSubtitle(null)).toBe('Over-the-air update')
  })
  it('includes the date when createdAt is present', () => {
    expect(formatOtaSubtitle(new Date('2026-01-15'))).toContain('Over-the-air update · ')
  })
})
