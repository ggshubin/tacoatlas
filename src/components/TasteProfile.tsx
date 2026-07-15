import { useCallback, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { localStorageService } from '../services/localStorage'
import { colors, spacing, radius, fonts } from '../utils/theme'

interface TasteStats {
  topTaco: string | null
  heatLine: string | null
  cityCount: number
  visitCount: number
}

const HEAT_LINE: Record<string, string> = {
  mild: 'You keep it mild',
  medium: 'You like a little heat',
  hot: 'You like it hot',
  fire: 'You bring the fire',
  volcano: 'You are volcano-proof',
}

// Letterboxd-style identity from data the user already logged — no new input.
export function TasteProfile() {
  const [stats, setStats] = useState<TasteStats | null>(null)

  useFocusEffect(
    useCallback(() => {
      async function compute() {
        const [reviews, vendors] = await Promise.all([
          localStorageService.getReviews(),
          localStorageService.getVendors(),
        ])
        if (reviews.length === 0) {
          setStats(null)
          return
        }

        // Top taco: most-logged type, avg rating breaks ties
        const tally = new Map<string, { count: number; ratingSum: number }>()
        for (const r of reviews) {
          for (const e of r.tacoEntries ?? []) {
            if (!e.tacoType) continue
            const t = tally.get(e.tacoType) ?? { count: 0, ratingSum: 0 }
            tally.set(e.tacoType, { count: t.count + 1, ratingSum: t.ratingSum + e.rating })
          }
        }
        let topTaco: string | null = null
        let best = { count: 0, avg: 0 }
        for (const [type, { count, ratingSum }] of tally) {
          const avg = ratingSum / count
          if (count > best.count || (count === best.count && avg > best.avg)) {
            topTaco = type
            best = { count, avg }
          }
        }

        // Heat preference: mode of logged salsa heat levels
        const heatTally = new Map<string, number>()
        for (const r of reviews) {
          for (const s of r.salsaEntries ?? []) {
            if (s.heatLevel) heatTally.set(s.heatLevel, (heatTally.get(s.heatLevel) ?? 0) + 1)
          }
        }
        let topHeat: string | null = null
        let topHeatCount = 0
        for (const [level, count] of heatTally) {
          if (count > topHeatCount) {
            topHeat = level
            topHeatCount = count
          }
        }

        const cityCount = new Set(
          vendors.filter(v => v.cityName).map(v => v.cityName!.toLowerCase())
        ).size

        setStats({
          topTaco,
          heatLine: topHeat ? (HEAT_LINE[topHeat] ?? null) : null,
          cityCount,
          visitCount: reviews.length,
        })
      }
      compute()
    }, [])
  )

  if (!stats || (!stats.topTaco && !stats.heatLine)) return null

  const facts = [
    stats.heatLine,
    stats.cityCount > 1 ? `${stats.cityCount} cities` : null,
    `${stats.visitCount} visit${stats.visitCount !== 1 ? 's' : ''}`,
  ].filter(Boolean)

  return (
    <View style={styles.card}>
      <Text style={styles.label}>YOUR TASTE</Text>
      {stats.topTaco && (
        <Text style={styles.headline}>{stats.topTaco}</Text>
      )}
      {stats.topTaco && <Text style={styles.headlineSub}>your top taco</Text>}
      <Text style={styles.facts}>{facts.join(' · ')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.creamDim,
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 28,
    fontFamily: fonts.displayBold,
    color: colors.amber,
    letterSpacing: -0.5,
  },
  headlineSub: {
    fontSize: 12,
    color: colors.creamMuted,
    marginBottom: spacing.sm,
  },
  facts: {
    fontSize: 14,
    color: colors.cream,
  },
})
