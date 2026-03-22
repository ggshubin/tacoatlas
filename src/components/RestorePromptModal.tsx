import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { syncService } from '../services/syncService'
import { useAuthStore } from '../store/authStore'
import { colors, spacing, radius } from '../utils/theme'

export function RestorePromptModal() {
  const { showRestorePrompt, dismissRestorePrompt, session } = useAuthStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleRestore() {
    if (!session?.user.id) return
    setStatus('loading')
    const result = await syncService.restoreFromCloud(session.user.id)
    if (result.success) {
      dismissRestorePrompt()
      setStatus('idle')
    } else {
      setStatus('error')
    }
  }

  function handleSkip() {
    dismissRestorePrompt()
    setStatus('idle')
  }

  return (
    <Modal
      visible={showRestorePrompt}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.body}>
            {status === 'error'
              ? 'Something went wrong. Try again.'
              : 'You have spots saved in the cloud. Restore them to this device?'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={status === 'loading'}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={styles.restoreText}>
                    {status === 'error' ? 'Try Again' : 'Restore'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.creamMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  skipText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 14,
  },
  restoreBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.amber,
    alignItems: 'center',
  },
  restoreText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
})
