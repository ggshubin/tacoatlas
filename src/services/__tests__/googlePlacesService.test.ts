import { googlePlacesService } from '../googlePlacesService'

describe('googlePlacesService.getRemainingSearches', () => {
  beforeEach(async () => {
    await googlePlacesService.resetSearchCount() // test helper
  })

  it('starts with 5 searches remaining', async () => {
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(5)
  })

  it('decrements after a search is recorded', async () => {
    await googlePlacesService.recordSearch()
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(4)
  })

  it('returns 0 when limit is reached', async () => {
    for (let i = 0; i < 5; i++) await googlePlacesService.recordSearch()
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(0)
  })
})
