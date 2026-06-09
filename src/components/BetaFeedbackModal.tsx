import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { colors, spacing, radius } from '../utils/theme'
import { submitBetaFeedback } from '../services/betaFeedbackService'
import type { FeedbackType } from '../services/betaFeedbackService'

interface BetaFeedbackModalProps {
  visible: boolean
  userId?: string
  userEmail?: string
  onClose: () => void
}

export function BetaFeedbackModal({
  visible,
  userId,
  userEmail,
  onClose,
}: BetaFeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleClose() {
    setType('bug')
    setMessage('')
    setLoading(false)
    setSubmitted(false)
    setErrorMsg(null)
    onClose()
  }

  async function handleSubmit() {
    if (!message.trim()) {
      setErrorMsg('Please describe the bug or feature.')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    const { error } = await submitBetaFeedback({ type, message, userId, userEmail })
    setLoading(false)
    if (error) {
      setErrorMsg('Something went wrong. Please try again.')
      return
    }
    setSubmitted(true)
    setTimeout(handleClose, 2000)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {submitted ? (
            <View style={styles.successContainer} testID="success-state">
              <Text style={styles.successIcon}>🌮</Text>
              <Text style={styles.successTitle}>Thanks, beta tester!</Text>
              <Text style={styles.successBody}>Your feedback helps make TacoAtlas better.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Beta Feedback</Text>
              <Text style={styles.subtitle}>What would you like to share?</Text>

              <View style={styles.typeRow}>
                <TouchableOpacity
                  testID="type-bug"
                  style={[styles.typeChip, type === 'bug' && styles.typeChipActive]}
                  onPress={() => setType('bug')}
                >
                  <Text style={[styles.typeChipText, type === 'bug' && styles.typeChipTextActive]}>
                    🐛 Bug Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="type-feature"
                  style={[styles.typeChip, type === 'feature' && styles.typeChipActive]}
                  onPress={() => setType('feature')}
                >
                  <Text style={[styles.typeChipText, type === 'feature' && styles.typeChipTextActive]}>
                    ✨ Feature / Improvement
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                testID="feedback-input"
                style={styles.input}
                placeholder={
                  type === 'bug'
                    ? 'Describe what happened and what you expected…'
                    : "Describe the feature or improvement you'd like to see…"
                }
                placeholderTextColor={colors.creamDim}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />

              {errorMsg ? (
                <Text style={styles.error} testID="error-message">{errorMsg}</Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="submit-btn"
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.bg} size="small" />
                    : <Text style={styles.submitText}>Send Feedback</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.creamMuted,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.creamMuted,
  },
  typeChipTextActive: {
    color: colors.cream,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.md,
    color: colors.cream,
    fontSize: 14,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: radius.full,
    backgroundColor: colors.amber,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
  },
  successBody: {
    fontSize: 14,
    color: colors.creamMuted,
    textAlign: 'center',
  },
})
