import { create } from 'zustand'

interface NotificationState {
  pendingFriendCount: number
  setPendingFriendCount: (n: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingFriendCount: 0,
  setPendingFriendCount: (n) => set({ pendingFriendCount: n }),
}))
