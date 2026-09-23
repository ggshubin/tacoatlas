import { useMemo } from 'react'
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { settingsStyles as s } from './settingsStyles'
import { useWelcomeStore } from '../../store/welcomeStore'
import { useUpdateStore } from '../../store/updateStore'
import { useAnnouncementStore, selectUnreadCount } from '../../store/announcementStore'
import { getVersionLabel, getOtaLabel } from '../../services/appVersion'
import { updateStatusLabel } from '../../utils/updatePrompt'
import { colors, radius } from '../../utils/theme'

export function AppSection() {
  const showWelcomeOnLaunch = useWelcomeStore(st => st.showOnLaunch)
  const setShowWelcomeOnLaunch = useWelcomeStore(st => st.setShowOnLaunch)
  const updateStatus = useUpdateStore(st => st.status)
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const versionLabel = useMemo(getVersionLabel, [])
  const otaLabel = useMemo(getOtaLabel, [])
  const busy = updateStatus === 'checking' || updateStatus === 'downloading'
  const statusText = updateStatusLabel(updateStatus)

  async function onUpdatePress() {
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
              <Text style={s.accountSub}>Over-the-air update</Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity style={[s.accountRow, s.accountRowBorder]} onPress={onUpdatePress} disabled={busy} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Check for Updates</Text>
            {statusText ? <Text style={s.accountSub}>{statusText}</Text> : null}
          </View>
          {busy
            ? <ActivityIndicator size="small" color={colors.amber} />
            : <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />}
        </TouchableOpacity>
        <TouchableOpacity style={[s.accountRow, s.accountRowBorder]} onPress={() => router.push('/announcements')} activeOpacity={0.7}>
          <Ionicons name="megaphone-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Announcements</Text>
            <Text style={s.accountSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'News from the TacoAtlas team'}</Text>
          </View>
          {unreadCount > 0 ? (
            <View style={styles.count}><Text style={styles.countText}>{unreadCount}</Text></View>
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
        <TouchableOpacity style={s.accountRow} onPress={() => router.push('/welcome')} activeOpacity={0.7}>
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
