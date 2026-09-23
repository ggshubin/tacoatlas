import { Alert } from 'react-native'
import { usePathname } from 'expo-router'
import { ConfirmModal } from './ConfirmModal'
import { useUpdateStore } from '../store/updateStore'
import { useAuthStore } from '../store/authStore'
import { shouldShowUpdatePrompt } from '../utils/updatePrompt'

export function UpdateReadyPrompt() {
  const status = useUpdateStore(s => s.status)
  const dismissed = useUpdateStore(s => s.dismissed)
  const signedIn = useAuthStore(s => s.session !== null)
  const pathname = usePathname()
  const { restart, dismiss } = useUpdateStore.getState()

  const visible = shouldShowUpdatePrompt({ status, dismissed, signedIn, pathname })

  async function onRestart() {
    const ok = await restart()
    if (!ok) Alert.alert("Couldn't restart", 'Close and reopen TacoAtlas to finish updating.')
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
