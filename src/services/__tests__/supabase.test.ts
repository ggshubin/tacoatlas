/**
 * @jest-environment node
 */

// Set env vars BEFORE any imports
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock the imports that need native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

jest.mock('react-native-url-polyfill/auto', () => {})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}))

import { supabase } from '../supabase'

describe('supabase client', () => {
  it('is defined', () => {
    expect(supabase).toBeDefined()
  })

  it('has auth methods', () => {
    expect(supabase.auth.signInWithPassword).toBeDefined()
    expect(supabase.auth.signUp).toBeDefined()
    expect(supabase.auth.signOut).toBeDefined()
  })
})
