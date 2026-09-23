import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { settingsStyles as s } from './settingsStyles'
import { useWelcomeStore } from '../../store/welcomeStore'
import { useUpdateStore, updatesActive } from '../../store/updateStore'
import { useAnnouncementStore, selectUnreadCount } from '../../store/announcementStore'
import { getVersionLabel, getOtaLabel, getOtaSubtitle } from '../../services/appVersion'
import { updateStatusLabel } from '../../utils/updatePrompt'
import { colors, radius } from '../../utils/theme'

export function AppSection() {
  const showWelcomeOnLaunch = useWelcomeStore(st => st.showOnLaunch)
  const setShowWelcomeOnLaunch = useWelcomeStore(st => st.setShowOnLaunch)
  const updateStatus = useUpdateStore(st => st.status)
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const versionLabel = useMemo(getVersionLabel, [])
  const otaLabel = useMemo(getOtaLabel, [])
  const otaSubtitle = useMemo(getOtaSubtitle, [])
  const [manualCheck, setManualCheck] = useState(false)
  const busy = updateStatus === 'checking' || updateStatus === 'downloading'
  // A stale 'error' from a background check is not worth surfacing unless
  // the user just asked us to check, or they'll see a scary label for no
  // reason they triggered themselves.
  const statusText = updateStatus === 'error' && !manualCheck ? null : updateStatusLabel(updateStatus)

  async function onUpdatePress() {
    setManualCheck(true)
    if (!updatesActive()) {
      Alert.alert('Updates unavailable', 'Updates only run in store builds.')
      return
    }
    const { status, check, restart } = useUpdateStore.getState()
    if (status === 'ready') {
      const ok = await restart()
      if (!ok) Alert.alert("Couldn't restart", 'Close and reopen TacoAtlas to finish updating.')
      return
    }
    await check({ force: true })
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>App</Text>
      <View style={s.card}>
        <View style={[s.accountRow, s.accountRowBorder]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>TacoAtlas {versionLabel}</Text>
            <Text style={s.accountSub}>App version</Text>
          </View>
        </View>
        {otaLabel ? (
          <View style={[s.accountRow, s.accountRowBorder]}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.creamMuted} />
            <View style={s.accountRowText}>
              <Text style={s.accountLabel}>OTA {otaLabel}</Text>
              <Text style={s.accountSub}>{otaSubtitle}</Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity
          style={[s.accountRow, s.accountRowBorder]}
          onPress={onUpdatePress}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Check for Updates</Text>
            {statusText ? <Text style={s.accountSub}>{statusText}</Text> : null}
          </View>
          {busy
            ? <ActivityIndicator size="small" color={colors.amber} />
            : <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.accountRow, s.accountRowBorder]}
          onPress={() => router.push('/announcements')}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="megaphone-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Announcements</Text>
            <Text style={s.accountSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'News from the TacoAtlas team'}</Text>
          </View>
          {unreadCount > 0 ? (
            <View
              style={styles.count}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.countText}>{unreadCount}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
        </TouchableOpacity>
        <View style={[s.accountRow, s.accountRowBorder]}>
          <Ionicons name="compass-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Show Guide on Launch</Text>
            <Text style={s.accountSub}>The three-step how-to when you open the app</Text>
          </View>
          <Switch
            value={showWelcomeOnLaunch}
            onValueChange={setShowWelcomeOnLaunch}
            trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
            thumbColor={showWelcomeOnLaunch ? colors.amber : colors.creamDim}
            accessibilityLabel="Show the quick-start guide when the app opens"
          />
        </View>
        <TouchableOpacity
          style={s.accountRow}
          onPress={() => router.push('/welcome')}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="help-circle-outline" size={18} color={colors.creamMuted} />
          <Text style={[s.accountLabel, { flex: 1 }]}>View Quick Start</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  count: { minWidth: 20, height: 20, borderRadius: radius.full, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontSize: 11, fontWeight: '700', color: colors.bg },
})
