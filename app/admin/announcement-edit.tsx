import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { useAnnouncementStore } from '../../src/store/announcementStore'
import {
  fetchById, createDraft, updateAnnouncement, sendAnnouncement, deleteAnnouncement,
} from '../../src/services/announcementService'
import { validateDraft } from '../../src/utils/announcements'
import { viewerFromSession } from '../../src/utils/announcementViewer'
import {
  ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, type Announcement,
} from '../../src/types/announcement'
import { AnnouncementBanner } from '../../src/components/AnnouncementBanner'
import { ConfirmModal } from '../../src/components/ConfirmModal'
import { colors, spacing, radius, fonts } from '../../src/utils/theme'

type Pending = 'send' | 'delete' | 'discard' | null

function refreshFeed() {
  return useAnnouncementStore.getState().refresh(viewerFromSession(useAuthStore.getState().session), { force: true })
}

export default function AnnouncementEditScreen() {
  const { id: paramId } = useLocalSearchParams<{ id?: string }>()
  const { profile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [saved, setSaved] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(Boolean(paramId))
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [leaveAction, setLeaveAction] = useState<unknown>(null)
  // Set right before re-dispatching a confirmed discard, so the guard below
  // (which may still hold a stale `dirty`) lets that navigation through.
  const allowLeave = useRef(false)

  const dirty = title !== (saved?.title ?? '') || body !== (saved?.body ?? '')
  const isSent = saved?.publishedAt != null
  const validation = validateDraft(title, body)

  useEffect(() => {
    if (!paramId) return
    fetchById(paramId)
      .then(a => {
        if (!a) { Alert.alert('Not found', 'This announcement was deleted.'); router.back(); return }
        setSaved(a); setTitle(a.title); setBody(a.body)
      })
      .catch((e: unknown) => Alert.alert('Could not load', e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [paramId])

  // Guard back navigation when there are unsaved edits.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (!dirty || busy || allowLeave.current) return
      e.preventDefault()
      setLeaveAction(e.data.action)
      setPending('discard')
    })
    return unsub
  }, [navigation, dirty, busy])

  async function persist(): Promise<Announcement> {
    const input = { title, body }
    const next = saved ? await updateAnnouncement(saved.id, input) : await createDraft(input)
    setSaved(next); setTitle(next.title); setBody(next.body)
    return next
  }

  async function run(action: () => Promise<void>, failTitle: string) {
    setBusy(true)
    try {
      await action()
    } catch (e: unknown) {
      Alert.alert(failTitle, e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onSave = () => run(async () => {
    await persist()
    if (isSent) await refreshFeed()
  }, 'Could not save')

  const onSend = () => run(async () => {
    setPending(null)
    const draft = dirty || !saved ? await persist() : saved
    await sendAnnouncement(draft.id)
    await refreshFeed()
    router.back()
  }, 'Could not send')

  const onDelete = () => run(async () => {
    setPending(null)
    if (saved) await deleteAnnouncement(saved.id)
    await refreshFeed()
    setTitle(''); setBody(''); setSaved(null)
    router.back()
  }, 'Could not delete')

  if (!profile?.is_admin) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>Admin access required</Text></View>
  }
  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.amber} size="large" /></View>
  }

  const preview: Announcement | null = title.trim()
    ? { id: 'preview', title: title.trim(), body, publishedAt: null, createdAt: '', updatedAt: '' }
    : null

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerSlotLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.cream} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heading}>{saved ? (isSent ? 'Edit sent' : 'Edit draft') : 'New announcement'}</Text>
        <View style={styles.headerSlotRight}>
          {saved ? (
            <TouchableOpacity
              onPress={() => setPending('delete')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete announcement"
              disabled={busy}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.counter}>{title.trim().length}/{ANNOUNCEMENT_TITLE_MAX}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="New map styles are live"
            placeholderTextColor={colors.creamDim}
            maxLength={ANNOUNCEMENT_TITLE_MAX + 20}
          />
        </View>
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.counter}>{body.trim().length}/{ANNOUNCEMENT_BODY_MAX}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="What changed and why it matters."
            placeholderTextColor={colors.creamDim}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.label}>Banner preview</Text>
        {preview
          ? <AnnouncementBanner announcement={preview} inline onOpen={() => {}} onDismiss={() => {}} />
          : <Text style={styles.muted}>Add a title to see the banner.</Text>}

        {isSent && <Text style={styles.muted}>Already sent. Saving updates it in place without marking it unread for anyone.</Text>}
        {validation && (title || body) ? <Text style={styles.error}>{validation}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryBtn, (!dirty || !!validation || busy) && styles.disabled]}
            onPress={onSave}
            disabled={!dirty || !!validation || busy}
            accessibilityRole="button"
            accessibilityLabel={isSent ? 'Save changes' : 'Save draft'}
          >
            <Text style={styles.secondaryText}>{isSent ? 'Save changes' : 'Save draft'}</Text>
          </TouchableOpacity>
          {!isSent && (
            <TouchableOpacity
              style={[styles.primaryBtn, (!!validation || busy) && styles.disabled]}
              onPress={() => setPending('send')}
              disabled={!!validation || busy}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryText}>Send</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={pending === 'send'}
        title="Send to everyone?"
        body="Everyone will see this banner the next time they open TacoAtlas. You can still edit or delete it after."
        confirmLabel="Send"
        onConfirm={onSend}
        onCancel={() => setPending(null)}
      />
      <ConfirmModal
        visible={pending === 'delete'}
        title="Delete announcement?"
        body={isSent ? 'It disappears for everyone. This cannot be undone.' : 'This draft will be gone for good.'}
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
        onCancel={() => setPending(null)}
      />
      <ConfirmModal
        visible={pending === 'discard'}
        title="Discard changes?"
        body="Your unsaved edits will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setPending(null)
          setTitle(saved?.title ?? ''); setBody(saved?.body ?? '')
          // Re-dispatch the navigation the user asked for, now that it's clean.
          allowLeave.current = true
          if (leaveAction) navigation.dispatch(leaveAction as Parameters<typeof navigation.dispatch>[0])
        }}
        onCancel={() => setPending(null)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  headerSlotLeft: { width: 96, alignItems: 'flex-start' },
  headerSlotRight: { width: 96, alignItems: 'flex-end' },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.cream, textAlign: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase' },
  counter: { fontSize: 11, color: colors.creamDim },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    color: colors.cream, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  bodyInput: { minHeight: 140 },
  muted: { fontSize: 12, color: colors.creamDim },
  error: { fontSize: 12, color: colors.error },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: { flex: 1, backgroundColor: colors.amber, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  primaryText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { flex: 1, borderColor: colors.amberDim, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.amber, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },
})
