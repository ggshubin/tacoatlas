import { supabase } from './supabase'
import type { Review, TacoEntry, SalsaEntry } from '../types/database'

interface CreateReviewInput {
  vendorId: string
  userId: string
  overallRating: number
  returnIntent: Review['return_intent']
  notes: string | null
  photos: string[]
  privacy: 'public' | 'friends' | 'private'
  tacoEntries: Omit<TacoEntry, 'id' | 'review_id' | 'created_at'>[]
  salsaEntries: Omit<SalsaEntry, 'id' | 'review_id' | 'created_at'>[]
  condiments: string[]
  burritoEntries?: { burrito_type: string; rating: number; notes: string | null }[]
  tortaEntries?: { torta_type: string; rating: number; notes: string | null }[]
}

interface UpdateReviewInput {
  overallRating?: number
  returnIntent?: Review['return_intent']
  notes?: string | null
  privacy?: 'public' | 'friends' | 'private'
  burritoEntries?: { burrito_type: string; rating: number; notes: string | null }[]
  tortaEntries?: { torta_type: string; rating: number; notes: string | null }[]
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
        is_public: input.privacy === 'public',
        privacy: input.privacy,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const burritoEntries = input.burritoEntries ?? []
    const tortaEntries = input.tortaEntries ?? []

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
      burritoEntries.length > 0
        ? supabase.from('burrito_entries').insert(
            burritoEntries.map(b => ({ ...b, review_id: review.id }))
          )
        : Promise.resolve(),
      tortaEntries.length > 0
        ? supabase.from('torta_entries').insert(
            tortaEntries.map(t => ({ ...t, review_id: review.id }))
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

  async updateReview(id: string, input: UpdateReviewInput): Promise<void> {
    const { error: updateError } = await supabase.from('reviews').update({
      ...(input.overallRating !== undefined && { overall_rating: input.overallRating }),
      ...(input.returnIntent !== undefined && { return_intent: input.returnIntent }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.privacy !== undefined && { privacy: input.privacy, is_public: input.privacy === 'public' }),
    }).eq('id', id)
    if (updateError) throw new Error(updateError.message)

    // Replace burrito entries if provided
    if (input.burritoEntries !== undefined) {
      const { error: burritoDeleteError } = await supabase.from('burrito_entries').delete().eq('review_id', id)
      if (burritoDeleteError) throw new Error(burritoDeleteError.message)
      if (input.burritoEntries.length > 0) {
        const { error: burritoInsertError } = await supabase.from('burrito_entries').insert(
          input.burritoEntries.map(b => ({ ...b, review_id: id }))
        )
        if (burritoInsertError) throw new Error(burritoInsertError.message)
      }
    }

    // Replace torta entries if provided
    if (input.tortaEntries !== undefined) {
      const { error: tortaDeleteError } = await supabase.from('torta_entries').delete().eq('review_id', id)
      if (tortaDeleteError) throw new Error(tortaDeleteError.message)
      if (input.tortaEntries.length > 0) {
        const { error: tortaInsertError } = await supabase.from('torta_entries').insert(
          input.tortaEntries.map(t => ({ ...t, review_id: id }))
        )
        if (tortaInsertError) throw new Error(tortaInsertError.message)
      }
    }
  },

  async deleteReview(id: string): Promise<void> {
    await supabase.from('reviews').delete().eq('id', id)
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
