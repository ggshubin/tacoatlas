import { create } from 'zustand'
import { proService } from '../services/proService'
import { supabase } from '../services/supabase'

interface ProState {
  isPro: boolean
  loading: boolean
  checkPro: () => Promise<void>
  setPro: (value: boolean) => void
}

// Server-side override: profiles.is_pro is a manual flag we set for
// testers, comp accounts, and support refunds. It's ORed with the
// RevenueCat entitlement so either source can confer Pro status.
async function fetchServerIsPro(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', userId)
    .single()
  return data?.is_pro === true
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  loading: true,
  checkPro: async () => {
    set({ loading: true })
    const [rcIsPro, serverIsPro] = await Promise.all([
      proService.isPro(),
      fetchServerIsPro(),
    ])
    set({ isPro: rcIsPro || serverIsPro, loading: false })
  },
  setPro: (value) => set({ isPro: value }),
}))
