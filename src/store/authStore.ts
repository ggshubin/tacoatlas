import { create } from 'zustand'
import { supabase } from '../services/supabase'
import type { Profile } from '../types/database'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  setSession: (session: Session | null) => void
  loadProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,

  setSession: (session) => set({ session, isLoading: false }),

  loadProfile: async () => {
    const { session } = get()
    if (!session) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (data) set({ profile: data })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await get().loadProfile()
    return { error: null }
  },

  signUp: async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', session.user.id)
    }
    await get().loadProfile()
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
