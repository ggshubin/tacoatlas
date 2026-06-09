import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../services/supabase'
import { syncService } from '../services/syncService'
import { setUserScope } from '../services/localStorage'
import type { Profile } from '../types/database'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  hasCompletedOnboarding: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  setSession: (session: Session | null) => void
  setHasCompletedOnboarding: (val: boolean) => Promise<void>
  showRestorePrompt: boolean
  setShowRestorePrompt: (value: boolean) => void
  dismissRestorePrompt: () => void
  loadProfile: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'username' | 'avatar_url' | 'bio' | 'home_city' | 'favorite_taco'>>) => Promise<{ error: string | null }>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
  changeEmail: (newEmail: string) => Promise<{ error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  hasCompletedOnboarding: false,
  showRestorePrompt: false,

  setSession: (session) => {
    setUserScope(session?.user.id ?? null)
    set({ session, isLoading: false })
  },

  setHasCompletedOnboarding: async (val) => {
    set({ hasCompletedOnboarding: val })
    await AsyncStorage.setItem('has_completed_onboarding', JSON.stringify(val))
  },

  setShowRestorePrompt: (value) => set({ showRestorePrompt: value }),
  dismissRestorePrompt: () => set({ showRestorePrompt: false }),

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

  signUp: async (email, password, displayName, username) => {
    const cleanUsername = username.trim().toLowerCase()

    // Pre-flight: avoid creating an auth user we'd have to roll back if the
    // username collides. The RPC is SECURITY DEFINER and only returns a boolean.
    const { data: available, error: rpcError } = await supabase
      .rpc('username_available', { uname: cleanUsername })
    if (rpcError) return { error: rpcError.message }
    if (available === false) {
      return { error: 'That username is already taken. Please choose another.' }
    }

    // username + display_name are persisted in user_metadata so the
    // handle_new_user() trigger can populate the profile row, even when
    // email confirmation defers session creation. emailRedirectTo brings
    // the user back to the app once they click the confirmation link.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username: cleanUsername },
        emailRedirectTo: 'tacooatlas://atlas',
      },
    })
    if (error) return { error: error.message }

    if (!data.session) {
      return { error: null, needsConfirmation: true }
    }

    // Auto-confirm path (email confirmations disabled at project level).
    // The trigger already created the profile from metadata; just sync
    // guest data and load the profile into state.
    setUserScope(data.session.user.id)
    set({ session: data.session })
    await syncService.syncGuestDataToSupabase(data.session.user.id)
    await get().loadProfile()
    return { error: null }
  },

  resendConfirmation: async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) return { error: error.message }
    return { error: null }
  },

  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'tacooatlas://reset-password',
    })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    setUserScope(null)
    set({ session: null, profile: null })
  },

  updateProfile: async (updates) => {
    const { session } = get()
    if (!session) return { error: 'Not signed in' }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return { error: 'That username is already taken.' }
      }
      return { error: error.message }
    }
    await get().loadProfile()
    return { error: null }
  },

  changeEmail: async (newEmail) => {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: 'tacooatlas://account' }
    )
    if (error) return { error: error.message }
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
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) return { error: error.message }
    setUserScope(null)
    set({ session: null, profile: null })
    return { error: null }
  },
}))
