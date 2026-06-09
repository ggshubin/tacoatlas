import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import type { PrivacySetting } from '../types/app'

const OPTIONS: { value: PrivacySetting; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: 'earth-outline' },
  { value: 'friends', label: 'Mi Gente', icon: 'people-outline' },
  { value: 'private', label: 'Just Me', icon: 'lock-closed-outline' },
]

const CAPTIONS: Record<PrivacySetting, string> = {
  public: 'Anyone on TacoAtlas can see this spot and your review.',
  friends: 'Only your friends can see this.',
  private: 'Saved to your personal log — only you can see it.',
}

interface PrivacySelectorProps {
  value: PrivacySetting
  onChange: (value: PrivacySetting) => void
  isPro: boolean
  isSignedIn: boolean
  onUpgradePress: () => void
}

export function PrivacySelector({ value, onChange, isPro, isSignedIn, onUpgradePress }: PrivacySelectorProps) {
  const [showNudge, setShowNudge] = useState(false)

  // Free accounts only save privately — normalize any stale value (e.g. a
  // vendor created before gating, or a form store defaulting to 'public').
  // onChange is intentionally omitted from deps: including it would loop if
  // the parent recreates the callback on every render.
  useEffect(() => {
    if (!isPro && value !== 'private') onChange('private')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, value])

  function handlePress(opt: PrivacySetting) {
    if (!isPro && opt !== 'private') {
      setShowNudge(true)
      return
    }
    setShowNudge(false)
    onChange(opt)
  }

  return (
    <View>
      <View style={styles.row}>
        {OPTIONS.map(opt => {
          const locked = !isPro && opt.value !== 'private'
          const active = value === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              testID={`privacy-opt-${opt.value}`}
              style={[styles.btn, active && styles.btnActive, locked && styles.btnLocked]}
              onPress={() => handlePress(opt.value)}
            >
              {locked && (
                <View style={styles.proBadge} testID={`privacy-pro-badge-${opt.value}`}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              <Ionicons
                name={opt.icon as any}
                size={18}
                color={active ? colors.amber : locked ? colors.creamDim : colors.creamMuted}
                style={styles.icon}
              />
              <Text style={[styles.label, active && styles.labelActive, locked && styles.labelLocked]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {showNudge && !isPro ? (
        <View style={styles.nudgeRow} testID="privacy-nudge">
          <Text style={styles.caption}>Sharing your atlas is a Pro feature.</Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress} testID="privacy-upgrade-btn">
            <Text style={styles.upgradeBtnText} testID="privacy-upgrade-btn-text">
              {isSignedIn ? 'Upgrade' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.caption} testID="privacy-caption">{CAPTIONS[value]}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  btnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  btnLocked: { borderColor: colors.surfaceBorder, opacity: 0.45 },
  proBadge: {
    position: 'absolute', top: -7, right: -4, backgroundColor: colors.amber,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
  },
  proBadgeText: { color: colors.cream, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  icon: { marginBottom: 2 },
  label: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  labelActive: { color: colors.amber },
  labelLocked: { color: colors.creamDim },
  caption: { fontSize: 12, color: colors.creamMuted, marginTop: spacing.xs, flex: 1 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  upgradeBtn: {
    backgroundColor: colors.amber, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm,
  },
  upgradeBtnText: { color: colors.cream, fontSize: 11, fontWeight: '800' },
})
