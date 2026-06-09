const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'r1', vendor_id: 'v1' }, error: null })
const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null })
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: mockOrder,
  single: mockSingle,
}

jest.mock('../supabase', () => ({
  supabase: { from: jest.fn(() => mockChain) },
}))

import { reviewRepository } from '../reviewRepository'

beforeEach(() => jest.clearAllMocks())

describe('reviewRepository', () => {
  it('getAverageRating returns null for empty reviews', async () => {
    const { supabase } = require('../supabase')
    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ data: [], error: null }),
      }),
    })
    const result = await reviewRepository.getAverageRating('v1')
    expect(result).toBeNull()
  })

  it('getAverageRating calculates average correctly', () => {
    const ratings = [4, 5, 3]
    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    expect(Math.round(avg * 10) / 10).toBe(4)
  })

  it('createReview inserts into reviews table', async () => {
    const { supabase } = require('../supabase')
    await reviewRepository.createReview({
      vendorId: 'v1', userId: 'u1', overallRating: 4,
      returnIntent: 'yes', notes: null, photos: [],
      privacy: 'private', tacoEntries: [], salsaEntries: [], condiments: [],
    })
    expect(supabase.from).toHaveBeenCalledWith('reviews')
  })
})
