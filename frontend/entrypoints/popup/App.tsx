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

  const { user, isLoading, error, login, register, logout, hydrate } = useAuthStore()
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    hydrate().then(() => setIsHydrating(false))
  }, [hydrate])

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

      await chrome.storage.local.set({
        auth_token: token,
        api_url: API_URL
      })

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'autofill',
        resumeData: resumeDetail.parsed_data,
        cvAvailable: cvCheck.has_cv
      })

      if (response.success) {
        setAutofillMessage({
          type: 'success',
          text: `Filled ${response.filledCount} fields!`
        })
        setTimeout(() => setAutofillMessage(null), 3000)
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