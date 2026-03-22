import { create } from 'zustand'
import { proService } from '../services/proService'

interface ProState {
  isPro: boolean
  loading: boolean
  checkPro: () => Promise<void>
  setPro: (value: boolean) => void
}

export const useProStore = create<ProState>((set) => ({
  isPro: true, // DEV: bypass Pro gate
  loading: true,
  checkPro: async () => {
    set({ loading: true })
    const result = await proService.isPro()
    set({ isPro: result, loading: false })
  },
  setPro: (value) => set({ isPro: value }),
}))
