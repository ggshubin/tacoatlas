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
