import { vendorRepository } from './vendorRepository'
import { reviewRepository } from './reviewRepository'
import { localStorageService } from './localStorage'

export const syncService = {
  async syncGuestDataToSupabase(userId: string): Promise<{ synced: number }> {
    const localVendors = localStorageService.getVendors()
    if (localVendors.length === 0) return { synced: 0 }

    let synced = 0

    for (const localVendor of localVendors) {
      try {
        const vendor = await vendorRepository.createVendor({
          name: localVendor.name,
          lat: localVendor.lat,
          lng: localVendor.lng,
          address: localVendor.address,
          city_id: null,
          hours: localVendor.hours,
          photo_url: localVendor.photoUri,
          submitted_by: userId,
        })

        const localReviews = localStorageService.getReviewsForVendor(localVendor.localId)
        for (const r of localReviews) {
          await reviewRepository.createReview({
            vendorId: vendor.id,
            userId,
            overallRating: r.overallRating,
            returnIntent: r.returnIntent,
            notes: r.notes,
            photos: [],
            isPublic: false,
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
          })
        }

        synced++
      } catch {
        // Skip failed vendors, don't block the rest
      }
    }

    // Clear local data after successful sync
    localStorageService.clearAll()
    return { synced }
  },
}
