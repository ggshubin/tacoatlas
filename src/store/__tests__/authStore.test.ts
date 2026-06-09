// Mock supabase before importing store
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      update: jest.fn().mockReturnThis(),
    })),
  },
}))

// Mock syncService
jest.mock('../../services/syncService', () => ({
  syncService: {
    syncGuestDataToSupabase: jest.fn().mockResolvedValue({ synced: 0 }),
  },
}))

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(() => undefined),
    set: jest.fn(),
    remove: jest.fn(),
  })),
}))

import { useAuthStore } from '../authStore'

beforeEach(() => {
  useAuthStore.setState({ session: null, profile: null, isLoading: true })
})

describe('authStore initial state', () => {
  it('starts with no session', () => {
    const { session, profile } = useAuthStore.getState()
    expect(session).toBeNull()
    expect(profile).toBeNull()
  })

  it('setSession updates session and sets isLoading false', () => {
    const fakeSession = { user: { id: 'u1' } } as any
    useAuthStore.getState().setSession(fakeSession)
    const state = useAuthStore.getState()
    expect(state.session).toEqual(fakeSession)
    expect(state.isLoading).toBe(false)
  })

  it('setSession with null clears session', () => {
    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('authStore signOut', () => {
  it('clears session and profile on signOut', async () => {
    useAuthStore.setState({ session: { user: { id: 'u1' } } as any, profile: { id: 'u1' } as any })
    await useAuthStore.getState().signOut()
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })
})

describe('authStore updateProfile', () => {
  it('updateProfile type accepts privacy fields', () => {
    const updateFn = useAuthStore.getState().updateProfile
    // TypeScript will error here if privacy fields are not in the union:
    const _check: typeof updateFn = async (updates: {
      is_profile_public?: boolean
      is_name_public?: boolean
      are_reviews_public?: boolean
    }) => ({ error: null })
    expect(typeof _check).toBe('function')
  })
})
