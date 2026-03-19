import { Share } from 'react-native'
import type { LocalVendor, LocalReview } from '../types/app'

function ratingEmoji(rating: number): string {
  const tacos = '🌮'.repeat(Math.round(rating))
  return tacos
}

export async function shareSpot(vendor: LocalVendor, reviews: LocalReview[]): Promise<void> {
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
    : null

  const lines: string[] = [
    `${vendor.name}`,
    vendor.spotType ? `Type: ${vendor.spotType}` : null,
    vendor.address ? `📍 ${vendor.address}` : null,
    avgRating !== null ? `My rating: ${ratingEmoji(avgRating)} (${avgRating.toFixed(1)}/5)` : null,
    ``,
    `Found on TacoAtlas — the app for people who take tacos seriously.`,
  ].filter(Boolean) as string[]

  await Share.share({
    message: lines.join('\n'),
    title: `Check out ${vendor.name} on TacoAtlas`,
  })
}
