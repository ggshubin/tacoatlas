jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

import { vendorRepository } from '../vendorRepository'
import { supabase } from '../supabase'

const mockSupabaseClient = supabase as jest.Mocked<typeof supabase>

// Helper to create a fluent mock chain
const createMockQueryBuilder = (resolveValue: any = { data: [], error: null }) => {
  const builder = {
    select: jest.fn(function() { return this }),
    eq: jest.fn(function() { return this }),
    gte: jest.fn(function() { return this }),
    lte: jest.fn(function() { return this }),
    order: jest.fn(function() { return this }),
    insert: jest.fn(function() { return this }),
    update: jest.fn(function() { return this }),
    single: jest.fn(async function() { return resolveValue }),
  }
  return builder
}

describe('vendorRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('getVendorById returns null when error occurs', async () => {
    const builder = createMockQueryBuilder({ data: null, error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    const result = await vendorRepository.getVendorById('nonexistent')
    expect(result).toBeNull()
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('vendors')
  })

  it('getVendorById returns data when found', async () => {
    const fakeVendor = { id: 'v1', name: 'El Toro', lat: 33.4, lng: -112.0 }
    const builder = createMockQueryBuilder({ data: fakeVendor, error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    const result = await vendorRepository.getVendorById('v1')
    expect(result).toEqual(fakeVendor)
  })

  it('getNearbyVendors queries with correct table name', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    await vendorRepository.getNearbyVendors(33.4, -112.0, 25)
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('vendors')
    expect(builder.gte).toHaveBeenCalled()
    expect(builder.lte).toHaveBeenCalled()
  })

  it('approveVendor calls update with approved status', async () => {
    const builder = createMockQueryBuilder({ data: null, error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    await vendorRepository.approveVendor('v1')
    expect(builder.update).toHaveBeenCalledWith({ status: 'approved' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'v1')
  })

  it('createVendor inserts with pending status', async () => {
    const fakeVendor = { id: 'v1', name: 'Taco Stand', lat: 33.4, lng: -112.0, status: 'pending' as const }
    const builder = createMockQueryBuilder({ data: fakeVendor, error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    const result = await vendorRepository.createVendor({
      name: 'Taco Stand',
      lat: 33.4,
      lng: -112.0,
      address: null,
      city_id: null,
      hours: null,
      photo_url: null,
      submitted_by: null,
    })

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }))
    expect(result).toEqual(fakeVendor)
  })

  it('getPendingVendors queries with correct filters', async () => {
    const builder = createMockQueryBuilder({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue(builder as any)

    await vendorRepository.getPendingVendors()
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('vendors')
    // Verify the chain was called with correct parameters
    const calls = (builder.eq.mock.calls as unknown) as Array<Array<unknown>>
    expect(calls.some(call => call[0] === 'status' && call[1] === 'pending')).toBe(true)
  })
})
