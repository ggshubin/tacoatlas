import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../services/supabase'
import { syncService } from '../services/syncService'
import type { Profile } from '../types/database'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  hasCompletedOnboarding: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  setSession: (session: Session | null) => void
  setHasCompletedOnboarding: (val: boolean) => Promise<void>
  loadProfile: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'bio' | 'home_city' | 'favorite_taco'>>) => Promise<{ error: string | null }>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  hasCompletedOnboarding: false,

  setSession: (session) => set({ session, isLoading: false }),

  setHasCompletedOnboarding: async (val) => {
    set({ hasCompletedOnboarding: val })
    await AsyncStorage.setItem('has_completed_onboarding', JSON.stringify(val))
  },

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
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
    if (error) return { error: error.message }
    // If email confirmation is required, session will be null
    if (!data.session) {
      return { error: 'Check your email to confirm your account, then sign in.' }
    }
    set({ session: data.session })
    await supabase.from('profiles').upsert({ id: data.session.user.id, display_name: displayName })
    await syncService.syncGuestDataToSupabase(data.session.user.id)
    await get().loadProfile()
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },

  updateProfile: async (updates) => {
    const { session } = get()
    if (!session) return { error: 'Not signed in' }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
    if (error) return { error: error.message }
    await get().loadProfile()
    return { error: null }
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return { error: null }
  },

  deleteAccount: async () => {
    const { session } = get()
    if (!session) return { error: 'Not signed in' }
    // Delete profile first (reviews/vendors cascade or are left as orphans)
    await supabase.from('profiles').delete().eq('id', session.user.id)
    // Sign out — actual user deletion requires a server-side function
    await supabase.auth.signOut()
    set({ session: null, profile: null })
    return { error: null }
  },
}))
