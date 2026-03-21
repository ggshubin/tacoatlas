import { useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Share, Linking,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, radius } from '../../src/utils/theme'

export default function AddFriendsScreen() {
  const insets = useSafeAreaInsets()
  const { method } = useLocalSearchParams<{ method?: 'search' | 'invite' | 'qr' }>()
  const { session } = useAuthStore()
  const scrollRef = useRef<ScrollView>(null)

  const username = session?.user.email?.split('@')[0] ?? 'guest'
  const inviteUrl = `tacooatlas.app/join/${username}`

  // Scroll to the pre-selected method section on mount
  const sectionOffsets: Record<string, number> = { search: 0, invite: 200, qr: 420 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (method && sectionOffsets[method] !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: sectionOffsets[method], animated: true })
      }, 300) // brief delay to let layout settle
    }
  }, [method])

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteUrl)
    Alert.alert('', 'Copied to clipboard!')
  }

  async function handleShare() {
    await Share.share({ message: `Join me on TacoAtlas! ${inviteUrl}` })
  }

  async function handleText() {
    await Linking.openURL(`sms:?body=Join me on TacoAtlas! ${inviteUrl}`)
  }

  function handleSearch() {
    Alert.alert('', 'User not found. Invite them with a link!')
  }

  function handleScanQR() {
    Alert.alert('', 'QR scanning coming soon!')
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Header */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={colors.amber} />
        <Text style={styles.backText}>Mi Gente</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Add Friends</Text>

      {/* Search */}
      <Text style={styles.sectionLabel}>Search by Username</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="@username"
          placeholderTextColor={colors.creamDim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.findBtn} onPress={handleSearch}>
          <Text style={styles.findBtnText}>Find</Text>
        </TouchableOpacity>
      </View>

      {/* Invite link */}
      <Text style={styles.sectionLabel}>Invite Link</Text>
      <View style={styles.card}>
        <Text style={styles.cardDesc}>Share your personal invite link</Text>
        <View style={styles.linkRow}>
          <Text style={styles.linkText} numberOfLines={1}>{inviteUrl}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleText}>
            <Text style={styles.shareBtnText}>💬 Text</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR */}
      <Text style={styles.sectionLabel}>QR Code</Text>
      <View style={[styles.card, styles.qrCard]}>
        <View style={styles.qrBox}>
          <QRCode value={`https://${inviteUrl}`} size={72} backgroundColor={colors.cream} />
        </View>
        <View style={styles.qrInfo}>
          <Text style={styles.qrTitle}>Your QR Code</Text>
          <Text style={styles.qrDesc}>Friends scan this to add you</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanQR}>
            <Text style={styles.scanBtnText}>📷 Scan a Friend's</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  backText: { fontSize: 14, color: colors.amber },
  title: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5, marginBottom: spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  searchInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.cream },
  findBtn: { backgroundColor: colors.amber, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
  findBtnText: { fontSize: 14, fontWeight: '700', color: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.md, marginBottom: spacing.lg },
  cardDesc: { fontSize: 12, color: colors.creamMuted, marginBottom: spacing.sm },
  linkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  linkText: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: 11, color: colors.creamDim },
  copyBtn: { backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.amberDim, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  copyBtnText: { fontSize: 12, color: colors.amber, fontWeight: '700' },
  shareRow: { flexDirection: 'row', gap: spacing.sm },
  shareBtn: { flex: 1, backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.xs, alignItems: 'center' },
  shareBtnText: { fontSize: 12, color: colors.creamMuted },
  qrCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  qrBox: { backgroundColor: colors.cream, borderRadius: radius.sm, padding: spacing.sm },
  qrInfo: { flex: 1 },
  qrTitle: { fontSize: 13, fontWeight: '700', color: colors.cream, marginBottom: 2 },
  qrDesc: { fontSize: 11, color: colors.creamMuted, marginBottom: spacing.sm },
  scanBtn: { backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.amberDim, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  scanBtnText: { fontSize: 11, color: colors.amber, fontWeight: '700' },
})
