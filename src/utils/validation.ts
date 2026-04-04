import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]/, 'Must include a number or special character')

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be 20 characters or fewer')
  .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores')

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(40, 'Display name must be 40 characters or fewer')
  .transform(s => s.trim())

export const bioSchema = z
  .string()
  .max(160, 'Bio must be 160 characters or fewer')
  .optional()

export const spotNameSchema = z
  .string()
  .min(1, 'Spot name is required')
  .max(80, 'Spot name must be 80 characters or fewer')
  .transform(s => s.trim())

export const notesSchema = z
  .string()
  .max(500, 'Notes must be 500 characters or fewer')
  .optional()

/** Returns the first error message or null if valid */
export function firstError(result: z.ZodSafeParseError<unknown> | z.ZodSafeParseSuccess<unknown>): string | null {
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Invalid input'
}
