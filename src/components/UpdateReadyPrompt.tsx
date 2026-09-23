import { useRef } from 'react'
import { Alert } from 'react-native'
import { usePathname } from 'expo-router'
import { ConfirmModal } from './ConfirmModal'
import { useUpdateStore } from '../store/updateStore'
import { useAuthStore } from '../store/authStore'
import { shouldShowUpdatePrompt } from '../utils/updatePrompt'

interface UpdateReadyPromptProps {
  blocked: boolean
}

export function UpdateReadyPrompt({ blocked }: UpdateReadyPromptProps) {
  const status = useUpdateStore(s => s.status)
  const dismissed = useUpdateStore(s => s.dismissed)
  const signedIn = useAuthStore(s => s.session !== null)
  const pathname = usePathname()
  const { restart, dismiss } = useUpdateStore.getState()
  const restartingRef = useRef(false)

  const visible = shouldShowUpdatePrompt({ status, dismissed, signedIn, pathname, blocked })

  async function onRestart() {
    if (restartingRef.current) return
    restartingRef.current = true
    const ok = await restart()
    if (!ok) {
      restartingRef.current = false
      Alert.alert("Couldn't restart", 'Close and reopen TacoAtlas to finish updating.')
    }
  }

  return (
    <ConfirmModal
      visible={visible}
      title="A fresh batch is ready"
      body="TacoAtlas has an update. Restart now to get it. It only takes a second."
      confirmLabel="Restart now"
      cancelLabel="Later"
      onConfirm={onRestart}
      onCancel={dismiss}
    />
  )
}
