import { useState } from 'react'
import { useAuthStore } from './stores/authStore'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  
  const { user, isLoading, error, login, register, logout } = useAuthStore()

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
              onChange={(e) => setPassword(e.target.value)}
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
            <button style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
              Upload Resume
            </button>
            <button style={{ width: '100%', backgroundColor: '#a855f7', color: 'white', padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
              Autofill Form
            </button>
            <button
              onClick={logout}
              style={{ width: '100%', backgroundColor: '#dc2626', color: 'white', padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}