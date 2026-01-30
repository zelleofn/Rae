import { create } from 'zustand'

interface User {
  id: number
  email: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string) => void
}

const API_URL = import.meta.env.VITE_API_URL

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const text = await response.text()
      
      if (!text) {
        throw new Error('Empty response from server')
      }
      
      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      set({
        user: { id: data.id, email: data.email },
        token: data.token,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      })
      throw error
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const text = await response.text()
      
      if (!text) {
        throw new Error('Empty response from server')
      }
      
      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      set({
        user: { id: data.id, email: data.email },
        token: data.token,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    set({ user: null, token: null, error: null })
  },

  setToken: (token: string) => {
    set({ token })
  },
}))