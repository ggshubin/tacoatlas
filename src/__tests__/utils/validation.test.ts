import {
  passwordSchema,
  usernameSchema,
  displayNameSchema,
  bioSchema,
  spotNameSchema,
  notesSchema,
  firstError,
} from '../../utils/validation'

describe('passwordSchema', () => {
  it('rejects passwords shorter than 8 chars', () => {
    expect(passwordSchema.safeParse('abc1!').success).toBe(false)
  })
  it('rejects passwords with no number or special char', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false)
  })
  it('accepts password with number', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true)
  })
  it('accepts password with special char', () => {
    expect(passwordSchema.safeParse('abcdefg!').success).toBe(true)
  })
})

describe('usernameSchema', () => {
  it('rejects username shorter than 3 chars', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })
  it('rejects username longer than 20 chars', () => {
    expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false)
  })
  it('rejects uppercase letters', () => {
    expect(usernameSchema.safeParse('TacoKing').success).toBe(false)
  })
  it('rejects spaces', () => {
    expect(usernameSchema.safeParse('taco king').success).toBe(false)
  })
  it('accepts lowercase alphanumeric + underscore', () => {
    expect(usernameSchema.safeParse('taco_king_99').success).toBe(true)
  })
})

describe('displayNameSchema', () => {
  it('rejects empty string', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false)
  })
  it('rejects name longer than 40 chars', () => {
    expect(displayNameSchema.safeParse('a'.repeat(41)).success).toBe(false)
  })
  it('trims whitespace', () => {
    const result = displayNameSchema.safeParse('  Maria  ')
    expect(result.success && result.data).toBe('Maria')
  })
})

describe('spotNameSchema', () => {
  it('rejects empty string', () => {
    expect(spotNameSchema.safeParse('').success).toBe(false)
  })
  it('rejects name longer than 80 chars', () => {
    expect(spotNameSchema.safeParse('a'.repeat(81)).success).toBe(false)
  })
  it('trims whitespace', () => {
    const result = spotNameSchema.safeParse('  El Taco  ')
    expect(result.success && result.data).toBe('El Taco')
  })
})

describe('notesSchema', () => {
  it('accepts undefined', () => {
    expect(notesSchema.safeParse(undefined).success).toBe(true)
  })
  it('rejects notes longer than 500 chars', () => {
    expect(notesSchema.safeParse('a'.repeat(501)).success).toBe(false)
  })
  it('accepts notes at 500 chars', () => {
    expect(notesSchema.safeParse('a'.repeat(500)).success).toBe(true)
  })
})

describe('bioSchema', () => {
  it('accepts undefined', () => {
    expect(bioSchema.safeParse(undefined).success).toBe(true)
  })
  it('rejects bio longer than 160 chars', () => {
    expect(bioSchema.safeParse('a'.repeat(161)).success).toBe(false)
  })
})

describe('firstError', () => {
  it('returns null for valid input', () => {
    expect(firstError(passwordSchema.safeParse('abcdefg1'))).toBe(null)
  })
  it('returns error message for invalid input', () => {
    const msg = firstError(passwordSchema.safeParse('bad'))
    expect(typeof msg).toBe('string')
    expect(msg!.length).toBeGreaterThan(0)
  })
})
