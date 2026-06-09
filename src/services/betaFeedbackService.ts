import { supabase } from './supabase'

export type FeedbackType = 'bug' | 'feature'

interface SubmitFeedbackParams {
  type: FeedbackType
  message: string
  userId?: string
  userEmail?: string
}

export async function submitBetaFeedback({
  type,
  message,
  userId,
  userEmail,
}: SubmitFeedbackParams): Promise<{ error: string | null }> {
  const { error } = await supabase.from('beta_feedback').insert({
    type,
    message: message.trim(),
    user_id: userId ?? null,
    user_email: userEmail ?? null,
  })

  if (error) return { error: error.message }
  return { error: null }
}
