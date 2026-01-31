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
  hydrate: () => Promise<void>
}

const API_URL = import.meta.env.VITE_API_URL

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (typeof window !== 'undefined') {
     
      if (window.chrome?.storage) {
        return new Promise((resolve) => {
          window.chrome.storage.local.get(['auth_token', 'user'], (result: any) => {
            if (result.auth_token && result.user) {
              set({
                token: result.auth_token,
                user: JSON.parse(result.user),
              })
            } else {
              
              const token = localStorage.getItem('auth_token')
              const user = localStorage.getItem('user')
              if (token && user) {
                set({
                  token,
                  user: JSON.parse(user),
                })
              }
            }
            resolve()
          })
        })
      } else {
        
        const token = localStorage.getItem('auth_token')
        const user = localStorage.getItem('user')
        if (token && user) {
          set({
            token,
            user: JSON.parse(user),
          })
        }
      }
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const text = await response.text()
      if (!text) throw new Error('Empty response from server')
      
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'Registration failed')

      set({
        user: { id: data.id, email: data.email },
        token: data.token,
        isLoading: false,
      })

      if (typeof window !== 'undefined') {
        if (window.chrome?.storage) {
          window.chrome.storage.local.set({
            auth_token: data.token,
            user: JSON.stringify({ id: data.id, email: data.email }),
          })
        }
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify({ id: data.id, email: data.email }))
      }
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
      if (!text) throw new Error('Empty response from server')
      
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'Login failed')

      set({
        user: { id: data.id, email: data.email },
        token: data.token,
        isLoading: false,
      })

      if (typeof window !== 'undefined') {
        if (window.chrome?.storage) {
          window.chrome.storage.local.set({
            auth_token: data.token,
            user: JSON.stringify({ id: data.id, email: data.email }),
          })
        }
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify({ id: data.id, email: data.email }))
      }
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
    if (typeof window !== 'undefined') {
      if (window.chrome?.storage) {
        window.chrome.storage.local.remove(['auth_token', 'user'])
      }
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
    }
  },

  setToken: (token: string) => {
    set({ token })
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      if (window.chrome?.storage) {
        window.chrome.storage.local.set({ auth_token: token })
      }
    }
  },
}))
