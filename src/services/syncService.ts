import { vendorRepository } from './vendorRepository'
import { reviewRepository } from './reviewRepository'
import { localStorageService } from './localStorage'
import { supabase } from './supabase'
import type { LocalVendor, LocalReview } from '../types/app'

export const syncService = {
  /**
   * Live-sync a single vendor+review to Supabase after a local save.
   * Stores the Supabase UUIDs back into local storage so future edits update
   * the same rows rather than creating duplicates.
   * Fire-and-forget safe — never throws.
   */
  async liveSync(vendorLocalId: string, localReview: LocalReview, userId: string): Promise<void> {
    try {
      const vendor = await localStorageService.getVendorByLocalId(vendorLocalId)
      if (!vendor) return

      // 1. Upsert vendor in Supabase
      const supabaseVendorId = await vendorRepository.upsertPersonalVendor(
        vendor.supabaseVendorId ?? null,
        {
          name: vendor.name,
          lat: vendor.lat ?? 0,
          lng: vendor.lng ?? 0,
          address: vendor.address,
          spot_type: vendor.spotType,
          submitted_by: userId,
        }
      )
      if (!vendor.supabaseVendorId) {
        await localStorageService.updateVendor(vendorLocalId, { supabaseVendorId })
      }

      // 2. Upsert review in Supabase
      if (localReview.supabaseReviewId) {
        await reviewRepository.updateReview(localReview.supabaseReviewId, {
          overallRating: localReview.overallRating,
          returnIntent: localReview.returnIntent,
          notes: localReview.notes,
          privacy: (vendor.privacy ?? 'public') as any,
          burritoEntries: (localReview.burritoEntries ?? []).map(b => ({
            burrito_type: b.burritoType, rating: b.rating, notes: b.notes,
          })),
          tortaEntries: (localReview.tortaEntries ?? []).map(t => ({
            torta_type: t.tortaType, rating: t.rating, notes: t.notes,
          })),
        })
      } else {
        const sbReview = await reviewRepository.createReview({
          vendorId: supabaseVendorId,
          userId,
          overallRating: localReview.overallRating,
          returnIntent: localReview.returnIntent,
          notes: localReview.notes,
          photos: [],
          privacy: (vendor.privacy ?? 'public') as any,
          tacoEntries: localReview.tacoEntries.map(t => ({
            taco_type: t.tacoType, rating: t.rating, notes: t.notes,
          })),
          salsaEntries: localReview.salsaEntries.map(s => ({
            salsa_name: s.salsaName, flavor_rating: s.flavorRating, heat_level: s.heatLevel,
          })),
          condiments: localReview.condiments,
          burritoEntries: (localReview.burritoEntries ?? []).map(b => ({
            burrito_type: b.burritoType, rating: b.rating, notes: b.notes,
          })),
          tortaEntries: (localReview.tortaEntries ?? []).map(t => ({
            torta_type: t.tortaType, rating: t.rating, notes: t.notes,
          })),
        })
        await localStorageService.updateReview(localReview.localId, { supabaseReviewId: sbReview.id })
      }
    } catch (e) {
      console.warn('[syncService] liveSync failed:', e)
    }
  },


  /**
   * Sync all existing local data to Supabase on Pro upgrade.
   * Runs sequentially to avoid race conditions when multiple reviews share a vendor.
   * Skips entries already synced (supabaseReviewId present).
   * Fire-and-forget safe — never throws.
   */
  async bulkSyncOnProUpgrade(userId: string): Promise<void> {
    try {
      const vendors = await localStorageService.getVendors()
      for (const vendor of vendors) {
        const reviews = await localStorageService.getReviewsForVendor(vendor.localId)
        for (const review of reviews) {
          if (review.supabaseReviewId) continue  // already synced
          await syncService.liveSync(vendor.localId, review, userId)
        }
      }
    } catch (e) {
      console.warn('[syncService] bulkSyncOnProUpgrade failed:', e)
    }
  },

  /**
   * Restore cloud data to local storage on a new device.
   * Only runs if local storage is empty — never overwrites existing local data.
   * Fire-and-forget safe — never throws.
   */
  async restoreFromCloud(userId: string): Promise<{ success: boolean }> {
    try {
      // Build a map of supabaseVendorId → localId for already-restored vendors
      const existingVendors = await localStorageService.getVendors()
      const existingById = new Map(
        existingVendors.filter(v => v.supabaseVendorId).map(v => [v.supabaseVendorId!, v.localId])
      )
      // Build set of supabase review IDs already stored locally
      const existingReviews = await localStorageService.getReviews()
      const existingReviewIds = new Set(existingReviews.map(r => r.supabaseReviewId).filter(Boolean))

      // Fetch all personal vendors for this user
      const { data: vendors, error: vErr } = await supabase
        .from('vendors')
        .select('id, name, lat, lng, address, spot_type, hours')
        .eq('submitted_by', userId)
        .eq('status', 'personal')
      if (vErr || !vendors) return { success: false }

      let hadError = false

      for (const v of vendors) {
        // Fetch reviews for this vendor
        const { data: reviews, error: rErr } = await supabase
          .from('reviews')
          .select('id, overall_rating, return_intent, notes, privacy')
          .eq('vendor_id', v.id)
          .eq('user_id', userId)
        if (rErr) {
          console.warn('[syncService] restoreFromCloud: reviews query failed for vendor', v.id, rErr)
          hadError = true
        }
        const hasReviews = reviews && reviews.length > 0

        // Get or create the local vendor
        let vendorLocalId = existingById.get(v.id)
        if (!vendorLocalId) {
          const created = await localStorageService.addVendor({
            name: v.name,
            spotType: v.spot_type ?? null,
            lat: v.lat,
            lng: v.lng,
            address: v.address ?? null,
            cityName: null,
            hours: v.hours ?? null,
            photoUri: null,
            privacy: hasReviews ? (reviews![0].privacy as any ?? 'private') : 'private',
            isVisited: hasReviews ?? false,
            supabaseVendorId: v.id,
          })
          vendorLocalId = created.localId
        } else if (hasReviews) {
          // Vendor already exists — ensure isVisited is marked
          await localStorageService.updateVendor(vendorLocalId, { isVisited: true })
        }

        if (!hasReviews) continue
        for (const r of reviews!) {
          if (existingReviewIds.has(r.id)) continue  // already restored
          // Fetch nested entries separately to avoid RLS issues on join tables
          const [
            { data: tacoEntries },
            { data: salsaEntries },
            { data: condiments },
            { data: burritoEntries },
            { data: tortaEntries },
          ] = await Promise.all([
            supabase.from('taco_entries').select('taco_type, rating, notes').eq('review_id', r.id),
            supabase.from('salsa_entries').select('salsa_name, flavor_rating, heat_level').eq('review_id', r.id),
            supabase.from('condiments').select('name').eq('review_id', r.id),
            supabase.from('burrito_entries').select('burrito_type, rating, notes').eq('review_id', r.id),
            supabase.from('torta_entries').select('torta_type, rating, notes').eq('review_id', r.id),
          ])
          await localStorageService.addReview({
            vendorLocalId,
            overallRating: r.overall_rating,
            returnIntent: r.return_intent as any,
            notes: r.notes ?? null,
            photoUris: [],
            tacoEntries: (tacoEntries ?? []).map((t: any) => ({
              tacoType: t.taco_type, rating: t.rating, notes: t.notes ?? null,
            })),
            salsaEntries: (salsaEntries ?? []).map((s: any) => ({
              salsaName: s.salsa_name, flavorRating: s.flavor_rating, heatLevel: s.heat_level,
            })),
            condiments: (condiments ?? []).map((c: any) => c.name),
            burritoEntries: (burritoEntries ?? []).map((b: any) => ({
              burritoType: b.burrito_type, rating: b.rating, notes: b.notes ?? null,
            })),
            tortaEntries: (tortaEntries ?? []).map((t: any) => ({
              tortaType: t.torta_type, rating: t.rating, notes: t.notes ?? null,
            })),
            supabaseReviewId: r.id,
          })
        }
      }
      console.log('[syncService] restoreFromCloud complete:', vendors.length, 'vendors processed')
      return { success: !hadError }
    } catch (e) {
      console.warn('[syncService] restoreFromCloud failed:', e)
      return { success: false }
    }
  },

  async syncGuestDataToSupabase(userId: string): Promise<{ synced: number }> {
    const localVendors = await localStorageService.getVendors()
    if (localVendors.length === 0) return { synced: 0 }

    let synced = 0
    let failed = 0

    for (const localVendor of localVendors) {
      try {
        const supabaseVendorId = await vendorRepository.upsertPersonalVendor(
          localVendor.supabaseVendorId ?? null,
          {
            name: localVendor.name,
            lat: localVendor.lat ?? 0,
            lng: localVendor.lng ?? 0,
            address: localVendor.address,
            spot_type: localVendor.spotType,
            submitted_by: userId,
          }
        )

        const localReviews = await localStorageService.getReviewsForVendor(localVendor.localId)
        for (const r of localReviews) {
          const createdReview = await reviewRepository.createReview({
            vendorId: supabaseVendorId,
            userId,
            overallRating: r.overallRating,
            returnIntent: r.returnIntent,
            notes: r.notes,
            photos: [],
            privacy: localVendor.privacy ?? 'private',
            tacoEntries: r.tacoEntries.map(t => ({
              taco_type: t.tacoType,
              rating: t.rating,
              notes: t.notes,
            })),
            salsaEntries: r.salsaEntries.map(s => ({
              salsa_name: s.salsaName,
              flavor_rating: s.flavorRating,
              heat_level: s.heatLevel,
            })),
            condiments: r.condiments,
            burritoEntries: (r.burritoEntries ?? []).map(b => ({
              burrito_type: b.burritoType,
              rating: b.rating,
              notes: b.notes,
            })),
            tortaEntries: (r.tortaEntries ?? []).map(t => ({
              torta_type: t.tortaType,
              rating: t.rating,
              notes: t.notes,
            })),
          })
          await localStorageService.updateReview(r.localId, { supabaseReviewId: createdReview.id })
        }

        synced++
      } catch (e) {
        console.warn('[syncService] failed to sync vendor', localVendor.localId, e)
        failed++
      }
    }

    if (failed === 0) {
      await localStorageService.clearAll()
      console.log('[syncService] syncGuestDataToSupabase complete:', synced, 'vendors synced')
    } else {
      console.warn('[syncService] syncGuestDataToSupabase partial failure:', failed, 'vendors not synced, local data preserved')
    }
    return { synced }
  },

  async hasCloudData(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('submitted_by', userId)
        .eq('status', 'personal')
        .limit(1)
      return !error && (data?.length ?? 0) > 0
    } catch {
      return false
    }
  },

  async syncVendorOnly(vendor: LocalVendor, userId: string): Promise<void> {
    try {
      const supabaseVendorId = await vendorRepository.upsertPersonalVendor(
        vendor.supabaseVendorId ?? null,
        {
          name: vendor.name,
          lat: vendor.lat ?? 0,
          lng: vendor.lng ?? 0,
          address: vendor.address,
          spot_type: vendor.spotType,
          submitted_by: userId,
        }
      )
      if (!vendor.supabaseVendorId) {
        await localStorageService.updateVendor(vendor.localId, { supabaseVendorId })
      }
    } catch (e) {
      console.warn('[syncService] syncVendorOnly failed:', e)
    }
  },
}
