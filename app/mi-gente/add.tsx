import { useRef, useEffect, useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Share, Linking, Animated, ActivityIndicator, Modal, Image,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { searchUserByUsername, sendFriendRequest } from '../../src/services/miGenteService'
import { colors, spacing, radius } from '../../src/utils/theme'

const SECTION_OFFSETS: Record<string, number> = { search: 0, invite: 200, qr: 420 }
const QR_URL_PREFIX = ['tacooatlas.app/join/', 'https://tacooatlas.app/join/']

function parseUsernameFromQR(data: string): string | null {
  for (const prefix of QR_URL_PREFIX) {
    if (data.includes(prefix)) {
      const username = data.split(prefix)[1]?.split('/')[0]?.split('?')[0]
      if (username) return username
    }
  }
  return null
}

export default function AddFriendsScreen() {
  const insets = useSafeAreaInsets()
  const { method } = useLocalSearchParams<{ method?: 'search' | 'invite' | 'qr' }>()
  const { session, profile } = useAuthStore()
  const scrollRef = useRef<ScrollView>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; displayName: string | null }[]>([])
  const [searchEmpty, setSearchEmpty] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  // Scanner state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [showScanner, setShowScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [scanLookup, setScanLookup] = useState(false)
  const [scanResult, setScanResult] = useState<{ id: string; username: string; displayName: string | null } | null | 'not_found' | 'not_qr'>(null)
  const [scanRequestSent, setScanRequestSent] = useState(false)

  const username = profile?.username ?? session?.user.email?.split('@')[0] ?? 'guest'
  const inviteUrl = `tacooatlas.app/join/${username}`

  useEffect(() => {
    if (method && SECTION_OFFSETS[method] !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: SECTION_OFFSETS[method], animated: true })
      }, 300)
    }
  }, [method])

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteUrl)
    showToast('Copied to clipboard!')
  }

  async function handleShare() {
    await Share.share({ message: `Join me on TacoAtlas! ${inviteUrl}` })
  }

  async function handleText() {
    await Linking.openURL(`sms:?body=Join me on TacoAtlas! ${inviteUrl}`)
  }

  async function handleSearch() {
    const query = searchQuery.trim()
    if (!query) return
    setSearching(true)
    setSearchResults([])
    setSearchEmpty(false)
    const results = await searchUserByUsername(query)
    setSearching(false)
    const filtered = results.filter(r => r.id !== session?.user.id)
    if (filtered.length === 0) {
      setSearchEmpty(true)
    } else {
      setSearchResults(filtered)
    }
  }

  async function handleSendRequest(userId: string) {
    if (!session?.user.id) return
    const error = await sendFriendRequest(session.user.id, userId)
    if (error) {
      showToast(error.includes('duplicate') ? 'Request already sent!' : 'Something went wrong')
    } else {
      setSentIds(prev => new Set(prev).add(userId))
      showToast('Friend request sent!')
    }
  }

  async function handleScanQR() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission()
      if (!result.granted) {
        showToast('Camera access is required to scan QR codes')
        return
      }
    }
    setScanResult(null)
    setScanRequestSent(false)
    setScanned(false)
    setShowScanner(true)
  }

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)
    setScanLookup(true)
    const parsed = parseUsernameFromQR(data)
    if (!parsed) {
      setScanResult('not_qr')
      setScanLookup(false)
      return
    }
    const results = await searchUserByUsername(parsed)
    setScanLookup(false)
    const match = results.find(r => r.id !== session?.user.id) ?? null
    if (!match) {
      setScanResult('not_found')
    } else {
      setScanResult(match)
    }
  }, [scanned, session?.user.id])

  async function handleScanSendRequest() {
    if (!scanResult || scanResult === 'not_found' || scanResult === 'not_qr' || !session?.user.id) return
    const error = await sendFriendRequest(session.user.id, scanResult.id)
    if (error) {
      showToast(error.includes('duplicate') ? 'Request already sent!' : 'Something went wrong')
    } else {
      setScanRequestSent(true)
    }
  }

  function handleRescan() {
    setScanResult(null)
    setScanRequestSent(false)
    setScanned(false)
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.amber} />
            <Text style={styles.backText}>Mi Gente</Text>
          </TouchableOpacity>
          <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>
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
            value={searchQuery}
            onChangeText={t => { setSearchQuery(t); setSearchResults([]); setSearchEmpty(false) }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.findBtn} onPress={handleSearch} disabled={searching}>
            {searching
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={styles.findBtnText}>Find</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Search results */}
        {searchEmpty && (
          <View style={styles.resultCard}>
            <Ionicons name="person-outline" size={18} color={colors.creamDim} />
            <Text style={styles.resultNotFound}>No users found. Invite them with a link!</Text>
          </View>
        )}
        {searchResults.map(user => {
          const sent = sentIds.has(user.id)
          return (
            <View key={user.id} style={styles.resultCard}>
              <View style={styles.resultAv}>
                <Text style={styles.resultAvText}>
                  {(user.displayName || user.username || '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{user.username}</Text>
                {user.displayName && <Text style={styles.resultSub}>{user.displayName}</Text>}
              </View>
              <TouchableOpacity
                style={[styles.addBtn, sent && styles.addBtnSent]}
                onPress={() => handleSendRequest(user.id)}
                disabled={sent}
              >
                <Text style={sent ? styles.addBtnTextSent : styles.addBtnText}>{sent ? 'Sent ✓' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}

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
              <Ionicons name="share-outline" size={14} color={colors.amber} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleText}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.amber} />
              <Text style={styles.shareBtnText}>Text</Text>
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
              <Ionicons name="qr-code-outline" size={12} color={colors.amber} />
              <Text style={styles.scanBtnText}>Scan a Friend's</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Themed toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: insets.bottom + 24 }]} pointerEvents="none">
        <Ionicons name="checkmark-circle" size={16} color={colors.amber} />
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          {/* Live camera */}
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerEnabled={!scanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          {/* Dark overlay with cutout effect using corner brackets */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {/* Top dark band */}
            <View style={styles.scanOverlayBand} />
            {/* Middle row: left dark | viewfinder | right dark */}
            <View style={styles.scanMiddleRow}>
              <View style={styles.scanOverlaySide} />
              <View style={styles.scanViewfinder}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <View style={styles.scanOverlaySide} />
            </View>
            {/* Bottom dark band */}
            <View style={[styles.scanOverlayBand, { flex: 1 }]} />
          </View>

          {/* Header bar */}
          <View style={[styles.scanHeader, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scanCloseBtn}>
              <Ionicons name="close" size={22} color={colors.cream} />
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Instruction or result */}
          <View style={[styles.scanFooter, { paddingBottom: insets.bottom + spacing.lg }]}>
            {!scanned && !scanLookup && (
              <Text style={styles.scanHint}>Point at a friend's TacoAtlas QR code</Text>
            )}

            {scanLookup && (
              <View style={styles.scanResultRow}>
                <ActivityIndicator color={colors.amber} />
                <Text style={styles.scanHint}>Looking up user…</Text>
              </View>
            )}

            {scanned && !scanLookup && scanResult === 'not_qr' && (
              <View style={styles.scanResultCard}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.creamDim} />
                <Text style={styles.scanResultMsg}>That doesn't look like a TacoAtlas QR code.</Text>
                <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
                  <Text style={styles.rescanBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanned && !scanLookup && scanResult === 'not_found' && (
              <View style={styles.scanResultCard}>
                <Ionicons name="person-outline" size={18} color={colors.creamDim} />
                <Text style={styles.scanResultMsg}>User not found.</Text>
                <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
                  <Text style={styles.rescanBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanned && !scanLookup && scanResult && scanResult !== 'not_found' && scanResult !== 'not_qr' && (
              <View style={styles.scanResultCard}>
                <View style={styles.scanResultAv}>
                  <Text style={styles.scanResultAvText}>
                    {(scanResult.displayName ?? scanResult.username).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.scanResultInfo}>
                  <Text style={styles.scanResultName}>{scanResult.username}</Text>
                  {scanResult.displayName && (
                    <Text style={styles.scanResultSub}>{scanResult.displayName}</Text>
                  )}
                </View>
                {scanRequestSent ? (
                  <View style={styles.scanSentBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.amber} />
                    <Text style={styles.scanSentText}>Sent</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.scanAddBtn} onPress={handleScanSendRequest}>
                    <Text style={styles.scanAddBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {scanned && !scanLookup && scanResult && scanResult !== 'not_qr' && (
              <TouchableOpacity style={styles.rescanRow} onPress={handleRescan}>
                <Ionicons name="qr-code-outline" size={14} color={colors.creamDim} />
                <Text style={styles.rescanRowText}>Scan another</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const VIEWFINDER = 220
const CORNER = 20
const CORNER_W = 3

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: colors.amber },
  headerLogo: { width: 120, height: 28 },
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
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.amberDim, paddingVertical: spacing.xs },
  shareBtnText: { fontSize: 12, color: colors.amber, fontWeight: '600' },
  qrCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  qrBox: { backgroundColor: colors.cream, borderRadius: radius.sm, padding: spacing.sm },
  qrInfo: { flex: 1 },
  qrTitle: { fontSize: 13, fontWeight: '700', color: colors.cream, marginBottom: 2 },
  qrDesc: { fontSize: 11, color: colors.creamMuted, marginBottom: spacing.sm },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.amberDim, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  scanBtnText: { fontSize: 11, color: colors.amber, fontWeight: '700' },
  // Search result
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.sm, marginBottom: spacing.lg },
  resultAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  resultAvText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: '600', color: colors.cream },
  resultSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  resultNotFound: { flex: 1, fontSize: 12, color: colors.creamDim },
  addBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  addBtnSent: { backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim },
  addBtnText: { fontSize: 12, fontWeight: '700', color: colors.bg },
  addBtnTextSent: { fontSize: 12, fontWeight: '700', color: colors.amber },
  // Toast
  toast: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.amberDim,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  toastText: { fontSize: 13, color: colors.cream, fontWeight: '600' },
  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scanOverlayBand: { height: 160, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanMiddleRow: { flexDirection: 'row', height: VIEWFINDER },
  scanOverlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanViewfinder: { width: VIEWFINDER, height: VIEWFINDER },
  // Corner bracket pieces
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.amber },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  // Scanner header
  scanHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  scanCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  scanTitle: { fontSize: 15, fontWeight: '700', color: colors.cream },
  // Scanner footer
  scanFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', gap: spacing.sm,
  },
  scanHint: { fontSize: 13, color: colors.creamMuted, textAlign: 'center' },
  scanResultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scanResultCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.sm, width: '100%',
  },
  scanResultMsg: { flex: 1, fontSize: 13, color: colors.creamMuted },
  scanResultAv: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  scanResultAvText: { fontSize: 13, fontWeight: '700', color: colors.amber },
  scanResultInfo: { flex: 1 },
  scanResultName: { fontSize: 14, fontWeight: '700', color: colors.cream },
  scanResultSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  scanAddBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 7 },
  scanAddBtnText: { fontSize: 13, fontWeight: '700', color: colors.bg },
  scanSentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.amberSubtle, borderRadius: radius.full, borderWidth: 1, borderColor: colors.amberDim, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  scanSentText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  rescanBtn: { backgroundColor: colors.amberSubtle, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.amberDim, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  rescanBtnText: { fontSize: 12, color: colors.amber, fontWeight: '600' },
  rescanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rescanRowText: { fontSize: 12, color: colors.creamDim },
})
