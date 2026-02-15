import { create } from 'zustand'
import { getDeviceFingerprint, getBrowserInfo } from '../utils/fingerprint'

interface User {
  id: number
  email: string
}

interface AuthStore {
  user: User | null
  token: string | null
  deviceId: string | null
  isLoading: boolean
  error: string | null
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithLinkedIn: () => Promise<void>
  logout: () => void
  setToken: (token: string) => void
  hydrate: () => Promise<void>
}

const API_URL = import.meta.env.VITE_API_URL
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID


async function persistSession(token: string, user: User, deviceId: string) {
  const payload = {
    auth_token: token,
    user: JSON.stringify(user),
    device_id: deviceId,
  }
  if (typeof window !== 'undefined' && window.chrome?.storage) {
    window.chrome.storage.local.set(payload)
  }
  localStorage.setItem('auth_token', token)
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('device_id', deviceId)
}

async function clearSession() {
  if (typeof window !== 'undefined' && window.chrome?.storage) {
    window.chrome.storage.local.remove(['auth_token', 'user', 'device_id'])
  }
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  localStorage.removeItem('device_id')
}

async function getOrCreateDeviceId(): Promise<string> {
  const cached = localStorage.getItem('device_id')
  if (cached) return cached
  if (typeof window !== 'undefined' && window.chrome?.storage) {
    const result = await new Promise<any>(r => window.chrome.storage.local.get(['device_id'], r))
    if (result.device_id) return result.device_id
  }
  return getDeviceFingerprint()
}


async function launchOAuthFlow(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        if (!redirectUrl) return reject(new Error('OAuth cancelled'))
        resolve(redirectUrl)
      }
    )
  })
}

function buildGoogleAuthUrl(): string {
  const redirectUri = chrome.identity.getRedirectURL('google')
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function buildLinkedInAuthUrl(): string {
  const redirectUri = chrome.identity.getRedirectURL('linkedin')
  const params = new URLSearchParams({
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state: crypto.randomUUID(),
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}


export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  deviceId: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (typeof window === 'undefined') return

    let token: string | null = null
    let user: User | null = null
    let deviceId: string | null = null

    if (window.chrome?.storage) {
      const result = await new Promise<any>(r => window.chrome.storage.local.get(['auth_token', 'user', 'device_id'], r))
      token = result.auth_token || null
      user = result.user ? JSON.parse(result.user) : null
      deviceId = result.device_id || null
    }

    if (!token) token = localStorage.getItem('auth_token')
    if (!user) { const u = localStorage.getItem('user'); if (u) user = JSON.parse(u) }
    if (!deviceId) deviceId = localStorage.getItem('device_id')

    if (token && user) set({ token, user, deviceId })
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const deviceId = await getOrCreateDeviceId()
      const { browser, os } = getBrowserInfo()

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_id: deviceId, browser, os }),
      })
      const text = await response.text()
      if (!text) throw new Error('Empty response from server')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'Registration failed')

      const user = { id: data.id, email: data.email }
      set({ user, token: data.token, deviceId, isLoading: false })
      await persistSession(data.token, user, deviceId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registration failed', isLoading: false })
      throw error
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const deviceId = await getOrCreateDeviceId()
      const { browser, os } = getBrowserInfo()

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_id: deviceId, browser, os }),
      })
      const text = await response.text()
      if (!text) throw new Error('Empty response from server')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'Login failed')

      const user = { id: data.id, email: data.email }
      set({ user, token: data.token, deviceId, isLoading: false })
      await persistSession(data.token, user, deviceId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false })
      throw error
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const deviceId = await getOrCreateDeviceId()
      const { browser, os } = getBrowserInfo()
      const redirectUri = chrome.identity.getRedirectURL('google')

      const authUrl = buildGoogleAuthUrl()
      const redirectUrl = await launchOAuthFlow(authUrl)

      const url = new URL(redirectUrl)
      const code = url.searchParams.get('code')
      if (!code) throw new Error('No authorization code received')

      const response = await fetch(`${API_URL}/api/auth/oauth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri, device_id: deviceId, browser, os }),
      })
      const text = await response.text()
      if (!text) throw new Error('Empty response from server')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'Google login failed')

      const user = { id: data.id, email: data.email }
      set({ user, token: data.token, deviceId, isLoading: false })
      await persistSession(data.token, user, deviceId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Google login failed', isLoading: false })
      throw error
    }
  },

  loginWithLinkedIn: async () => {
    set({ isLoading: true, error: null })
    try {
      const deviceId = await getOrCreateDeviceId()
      const { browser, os } = getBrowserInfo()
      const redirectUri = chrome.identity.getRedirectURL('linkedin')

      const authUrl = buildLinkedInAuthUrl()
      const redirectUrl = await launchOAuthFlow(authUrl)

      const url = new URL(redirectUrl)
      const code = url.searchParams.get('code')
      if (!code) throw new Error('No authorization code received')

      const response = await fetch(`${API_URL}/api/auth/oauth/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri, device_id: deviceId, browser, os }),
      })
      const text = await response.text()
      if (!text) throw new Error('Empty response from server')
      const data = JSON.parse(text)
      if (!response.ok) throw new Error(data.error || 'LinkedIn login failed')

      const user = { id: data.id, email: data.email }
      set({ user, token: data.token, deviceId, isLoading: false })
      await persistSession(data.token, user, deviceId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'LinkedIn login failed', isLoading: false })
      throw error
    }
  },

  logout: () => {
    set({ user: null, token: null, deviceId: null, error: null })
    clearSession()
  },

  setToken: (token) => {
    set({ token })
    localStorage.setItem('auth_token', token)
    if (typeof window !== 'undefined' && window.chrome?.storage) {
      window.chrome.storage.local.set({ auth_token: token })
    }
  },
}))