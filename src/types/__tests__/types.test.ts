/**
 * @jest-environment node
 */

import type { Vendor, Review } from '../database'

describe('Type shapes', () => {
  it('Vendor has required geo fields', () => {
    const v: Vendor = {
      id: '1', name: 'Test Truck', lat: 33.4, lng: -112.0,
      address: null, city_id: null, hours: null, photo_url: null,
      status: 'approved', submitted_by: null, created_at: new Date().toISOString()
    }
    expect(v.lat).toBeDefined()
    expect(v.lng).toBeDefined()
  })

  it('Review overall_rating is 1-5', () => {
    const r: Review = {
      id: '1', vendor_id: 'v1', user_id: 'u1',
      overall_rating: 4, return_intent: 'yes',
      notes: null, photos: [], is_public: false,
      created_at: new Date().toISOString()
    }
    expect(r.overall_rating).toBeGreaterThanOrEqual(1)
    expect(r.overall_rating).toBeLessThanOrEqual(5)
  })
})
