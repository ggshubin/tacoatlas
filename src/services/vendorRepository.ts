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
}
