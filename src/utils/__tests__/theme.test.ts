import { colors, spacing, typography, radius } from '../theme'

describe('theme tokens', () => {
  it('terracotta is the primary color', () => {
    expect(colors.terracotta).toBe('#E8821A')
  })

  it('cream is the background color', () => {
    expect(colors.cream).toBe('#F5EDD8')
  })

  it('spacing.md is 16', () => {
    expect(spacing.md).toBe(16)
  })

  it('all required spacing keys exist', () => {
    expect(spacing.xs).toBeDefined()
    expect(spacing.sm).toBeDefined()
    expect(spacing.md).toBeDefined()
    expect(spacing.lg).toBeDefined()
    expect(spacing.xl).toBeDefined()
  })

  it('typography has bold weight', () => {
    expect(typography.fontWeightBold).toBe('700')
  })
})
