import { create } from 'zustand'
import { proService } from '../services/proService'
import { supabase } from '../services/supabase'
import { PRO_FOR_ALL } from '../config/features'

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

// While PRO_FOR_ALL is on, Pro is the floor rather than something to resolve:
// isPro starts true so consumers never flash a gated UI on cold start, and
// checkPro/setPro can't drop below it. Every gate downstream reads this one
// value, so nothing else needs to know the flag exists.
export const useProStore = create<ProState>((set) => ({
  isPro: PRO_FOR_ALL,
  loading: !PRO_FOR_ALL,
  checkPro: async () => {
    // Skip the RevenueCat + profiles round trip entirely — the answer is
    // already Pro and the network call can only produce a worse one.
    if (PRO_FOR_ALL) {
      set({ isPro: true, loading: false })
      return
    }
    set({ loading: true })
    const [rcIsPro, serverIsPro] = await Promise.all([
      proService.isPro(),
      fetchServerIsPro(),
    ])
    set({ isPro: rcIsPro || serverIsPro, loading: false })
  },
  setPro: (value) => set({ isPro: value || PRO_FOR_ALL }),
}))
