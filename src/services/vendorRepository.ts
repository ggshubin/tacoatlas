import { supabase } from './supabase'
import type { Vendor } from '../types/database'

export const vendorRepository = {
  async getNearbyVendors(lat: number, lng: number, radiusKm = 25): Promise<Vendor[]> {
    const delta = radiusKm / 111
    const { data, error } = await supabase
      .from('vendors')
      .select('*, city:cities(*)')
      .eq('status', 'approved')
      .gte('lat', lat - delta)
      .lte('lat', lat + delta)
      .gte('lng', lng - delta)
      .lte('lng', lng + delta)

    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getVendorById(id: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, city:cities(*)')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  },

  async createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'status'>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({ ...vendor, status: 'pending' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getPendingVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, city:cities(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },

  async approveVendor(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({ status: 'approved' })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async upsertPersonalVendor(id: string | null, data: {
    name: string; lat: number; lng: number; address: string | null
    spot_type: string | null; submitted_by: string
  }): Promise<string> {
    if (id) {
      // Update existing personal vendor
      await supabase.from('vendors').update({
        name: data.name, lat: data.lat, lng: data.lng,
        address: data.address, spot_type: data.spot_type,
      }).eq('id', id)
      return id
    }
    // Create new personal vendor (status 'personal' = not shown on community map)
    const { data: row, error } = await supabase
      .from('vendors')
      .insert({ ...data, status: 'personal', city_id: null, hours: null, photo_url: null })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return row.id
  },

  async deletePersonalVendor(id: string): Promise<void> {
    await supabase.from('vendors').delete().eq('id', id)
  },
}
