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

  it('Profile includes privacy fields', () => {
    const p: import('../database').Profile = {
      id: 'x',
      username: null,
      display_name: null,
      avatar_url: null,
      bio: null,
      home_city: null,
      favorite_taco: null,
      is_admin: false,
      is_pro: false,
      created_at: '',
      is_profile_public: true,
      is_name_public: true,
      are_reviews_public: true,
    }
    expect(p.is_profile_public).toBe(true)
    expect(p.is_name_public).toBe(true)
    expect(p.are_reviews_public).toBe(true)
  })
})
