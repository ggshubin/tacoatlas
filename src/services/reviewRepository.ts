import { supabase } from './supabase'
import type { Review, TacoEntry, SalsaEntry } from '../types/database'

interface CreateReviewInput {
  vendorId: string
  userId: string
  overallRating: number
  returnIntent: Review['return_intent']
  notes: string | null
  photos: string[]
  isPublic: boolean
  tacoEntries: Omit<TacoEntry, 'id' | 'review_id' | 'created_at'>[]
  salsaEntries: Omit<SalsaEntry, 'id' | 'review_id' | 'created_at'>[]
  condiments: string[]
}

export const reviewRepository = {
  async createReview(input: CreateReviewInput): Promise<Review> {
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        vendor_id: input.vendorId,
        user_id: input.userId,
        overall_rating: input.overallRating,
        return_intent: input.returnIntent,
        notes: input.notes,
        photos: input.photos,
        is_public: input.isPublic,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    await Promise.all([
      input.tacoEntries.length > 0
        ? supabase.from('taco_entries').insert(
            input.tacoEntries.map(t => ({ ...t, review_id: review.id }))
          )
        : Promise.resolve(),
      input.salsaEntries.length > 0
        ? supabase.from('salsa_entries').insert(
            input.salsaEntries.map(s => ({ ...s, review_id: review.id }))
          )
        : Promise.resolve(),
      input.condiments.length > 0
        ? supabase.from('condiments').insert(
            input.condiments.map(name => ({ name, review_id: review.id }))
          )
        : Promise.resolve(),
    ])

    return review
  },

  async getReviewsForVendor(vendorId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, taco_entries(*), salsa_entries(*), condiments(*)')
      .eq('vendor_id', vendorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getAverageRating(vendorId: string): Promise<number | null> {
    const { data } = await supabase
      .from('reviews')
      .select('overall_rating')
      .eq('vendor_id', vendorId)
      .eq('is_public', true)

    if (!data || data.length === 0) return null
    const avg = data.reduce((sum: number, r: { overall_rating: number }) => sum + r.overall_rating, 0) / data.length
    return Math.round(avg * 10) / 10
  },
}
