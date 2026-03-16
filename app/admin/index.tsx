import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { vendorRepository } from '../../src/services/vendorRepository'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, typography, radius } from '../../src/utils/theme'
import type { Vendor } from '../../src/types/database'

export default function AdminQueueScreen() {
  const { profile } = useAuthStore()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.is_admin) {
      loadPending()
    } else {
      setLoading(false)
    }
  }, [profile])

  async function loadPending() {
    try {
      const pending = await vendorRepository.getPendingVendors()
      setVendors(pending)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string, name: string) {
    Alert.alert('Approve Vendor', `Publish "${name}" to the community map?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          await vendorRepository.approveVendor(id)
          setVendors(v => v.filter(x => x.id !== id))
        },
      },
    ])
  }

  if (!profile?.is_admin) {
    return (
      <View style={styles.center}>
        <Text style={styles.unauthorized}>Admin access required</Text>
      </View>
    )
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} color={colors.terracotta} size="large" />
  }

  return (
    <FlatList
      style={styles.container}
      data={vendors}
      keyExtractor={v => v.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Submissions</Text>
          <Text style={styles.headerSub}>{vendors.length} awaiting review</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.vendorName}>{item.name}</Text>
            <Text style={styles.coords}>
              📍 {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
            </Text>
            {item.address && <Text style={styles.address}>{item.address}</Text>}
            <Text style={styles.date}>
              Submitted {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handleApprove(item.id, item.name)}
          >
            <Text style={styles.approveTxt}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending submissions.</Text>
        </View>
      }
      contentContainerStyle={styles.list}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  list: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  unauthorized: { color: colors.gray500, fontSize: typography.fontSizeLg },
  header: { padding: spacing.md, paddingTop: spacing.xl },
  headerTitle: {
    fontSize: typography.fontSizeXxl,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
  },
  headerSub: { fontSize: typography.fontSizeMd, color: colors.gray500, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  info: { flex: 1 },
  vendorName: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
  },
  coords: { fontSize: typography.fontSizeSm, color: colors.gray500, marginTop: spacing.xs },
  address: { fontSize: typography.fontSizeSm, color: colors.gray500 },
  date: { fontSize: typography.fontSizeSm, color: colors.gray300, marginTop: spacing.xs },
  approveBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  approveTxt: { color: colors.white, fontWeight: typography.fontWeightBold },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.gray500 },
})
