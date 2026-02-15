import { useEffect, useState } from 'react'
import { useAuthStore } from './stores/authStore'
import ResumeUpload from './components/ResumeUpload'
import CVUpload from './components/CVUpload'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [isHydrating, setIsHydrating] = useState(true)
  const [isAutofilling, setIsAutofilling] = useState(false)
  const [autofillMessage, setAutofillMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { user, isLoading, error, login, register, logout, hydrate, loginWithGoogle, loginWithLinkedIn } = useAuthStore()
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    hydrate().then(() => setIsHydrating(false))
  }, [hydrate])

  useEffect(() => {
    if (token) {
      const API_URL = import.meta.env.VITE_API_URL
      chrome.storage.local.set({ auth_token: token, api_url: API_URL })
    } else {
      chrome.storage.local.remove(['auth_token', 'api_url'])
    }
  }, [token])

  const handleSubmit = async () => {
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      setEmail('')
      setPassword('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditClick = async () => {
    try {
      const windowInfo = await chrome.windows.getCurrent();
      
      if (windowInfo.id) {
        await (chrome.sidePanel as any).open({ windowId: windowInfo.id });
        window.close();
      }
    } catch (err) {
      console.error("Error opening side panel:", err);
    }
  };

  const handleAutofill = async () => {
    setIsAutofilling(true)
    setAutofillMessage(null)

    try {
      const API_URL = import.meta.env.VITE_API_URL

      
      await chrome.storage.local.set({ auth_token: token, api_url: API_URL })

      const resumeResponse = await fetch(`${API_URL}/api/resumes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!resumeResponse.ok) {
        throw new Error('No resume found. Please upload a resume first.')
      }

      const resumeData = await resumeResponse.json()
      const resumes = resumeData.resumes

      if (!resumes || resumes.length === 0) {
        throw new Error('No resume found. Please upload a resume first.')
      }

      const latestResumeId = resumes[0].id
      const resumeDetailResponse = await fetch(`${API_URL}/api/resume/${latestResumeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!resumeDetailResponse.ok) {
        throw new Error('Failed to fetch resume details')
      }

      const resumeDetail = await resumeDetailResponse.json()

      const cvCheckResponse = await fetch(`${API_URL}/api/cv/check`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const cvCheck = cvCheckResponse.ok ? await cvCheckResponse.json() : { has_cv: false }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        throw new Error('No active tab found')
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'autofill',
        resumeData: resumeDetail.parsed_data,
        cvAvailable: cvCheck.has_cv
      })

      if (response?.success) {
        setAutofillMessage({
          type: 'success',
          text: `Filled ${response.filledCount} fields!`
        })
        setTimeout(() => setAutofillMessage(null), 3000)
      } else {
        setAutofillMessage({
          type: 'error',
          text: 'Page not ready — refresh the tab and try again.'
        })
        setTimeout(() => setAutofillMessage(null), 5000)
      }
    } catch (err) {
      setAutofillMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Autofill failed'
      })
      setTimeout(() => setAutofillMessage(null), 5000)
    } finally {
      setIsAutofilling(false)
    }
  }

  if (isHydrating) {
    return (
      <div style={{ width: '400px', minHeight: '500px', backgroundColor: '#f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ width: '400px', minHeight: '500px', backgroundColor: '#f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
      <div style={{ width: '100%', maxWidth: '300px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '4px', textAlign: 'center' }}>
          Rae
        </h1>
        <p style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280', textAlign: 'center', marginBottom: '8px', margin: '0 0 8px 0' }}>
          (Resume Autofill Extension)
        </p>
        <p style={{ fontSize: '11px', fontWeight: 'normal', color: '#1f2937', textAlign: 'center', marginBottom: '24px', margin: '0 0 24px 0' }}>
          Upload resume once, Apply to jobs everywhere.
        </p>

        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: '12px' }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{ width: '100%', backgroundColor: '#a855f7', color: 'white', padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}
            >
              {isLoading ? 'Loading...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
           <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px' }}
              >
                {mode === 'login' ? 'Register' : 'Login'}
              </button>
            </p>

            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#d1d5db' }} />
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#d1d5db' }} />
            </div>

           {/* ── OAuth buttons ── */}
            <button
              onClick={loginWithGoogle}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={loginWithLinkedIn}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0a66c2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Continue with LinkedIn
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: '#374151', textAlign: 'center' }}>Welcome back, {user.email}!</p>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <ResumeUpload />
              </div>
              <button
                onClick={handleEditClick}
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Edit
              </button>
            </div>

            <CVUpload />

            {autofillMessage && (
              <div style={{
                padding: '8px',
                backgroundColor: autofillMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${autofillMessage.type === 'success' ? '#16a34a' : '#dc2626'}`,
                borderRadius: '4px',
                color: autofillMessage.type === 'success' ? '#16a34a' : '#dc2626',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                {autofillMessage.text}
              </div>
            )}

            <button
              onClick={handleAutofill}
              disabled={isAutofilling}
              style={{
                width: '100%',
                backgroundColor: '#a855f7',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                cursor: isAutofilling ? 'not-allowed' : 'pointer',
                opacity: isAutofilling ? 0.7 : 1,
              }}
            >
              {isAutofilling ? 'Autofilling...' : 'Autofill Form'}
            </button>

            <button
              onClick={logout}
              style={{
                width: '100%',
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}