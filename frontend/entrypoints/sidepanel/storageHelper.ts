export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(['auth_token'])
    return (result as any).auth_token || null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await chrome.storage.local.set({ auth_token: token })
  } catch (error) {
    console.error('Error setting auth token:', error)
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await chrome.storage.local.remove(['auth_token'])
  } catch (error) {
    console.error('Error removing auth token:', error)
  }
}

export async function getUserData(): Promise<{ id: number; email: string } | null> {
  try {
    const result = await chrome.storage.local.get(['user'])
    const userData = (result as any).user
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('Error getting user data:', error)
    return null
  }
}

export async function setUserData(user: { id: number; email: string }): Promise<void> {
  try {
    await chrome.storage.local.set({ user: JSON.stringify(user) })
  } catch (error) {
    console.error('Error setting user data:', error)
  }
}