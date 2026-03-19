import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius } from '../utils/theme'
import type { GooglePlace } from '../services/googlePlacesService'

interface Props {
  place: GooglePlace
}

export function GooglePlaceCard({ place }: Props) {
  function handleAddToAtlas() {
    router.push({
      pathname: '/review/add',
      params: {
        prefillName: place.name,
        prefillAddress: place.address ?? '',
        prefillLat: String(place.lat),
        prefillLng: String(place.lng),
      },
    })
  }

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.googleBadge}>
          <Text style={styles.googleBadgeText}>G</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{place.name}</Text>
          {place.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={colors.creamMuted} />
              <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
            </View>
          )}
          {place.rating !== null && (
            <Text style={styles.googleRating}>Google: {place.rating.toFixed(1)} ★</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleAddToAtlas}>
        <Ionicons name="add" size={16} color={colors.cream} />
        <Text style={styles.addBtnText}>Add to Atlas</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(36, 28, 22, 0.88)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(61, 46, 34, 0.7)',
  },
  body: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  googleBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  googleBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.cream, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  address: { fontSize: 12, color: colors.creamMuted, flex: 1 },
  googleRating: { fontSize: 12, color: colors.creamMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.amberDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  addBtnText: { color: colors.cream, fontSize: 13, fontWeight: '600' },
})
