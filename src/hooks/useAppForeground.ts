import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

// Runs `onForeground` each time the app moves from background/inactive to
// active. Callers own their own throttling.
export function useAppForeground(onForeground: () => void): void {
  const callback = useRef(onForeground)
  callback.current = onForeground

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState
    const sub = AppState.addEventListener('change', next => {
      if (previous !== 'active' && next === 'active') callback.current()
      previous = next
    })
    return () => sub.remove()
  }, [])
}
