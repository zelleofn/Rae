import { useRef, useState, useEffect } from 'react'
import { extractTextFromPDF } from '../utils/pdfExtractor'
import { parseResume, ParsedResume } from '../utils/parser'
import { useAuthStore } from '../stores/authStore'

export default function CVUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [hasCV, setHasCV] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const fileInputRef = useRef<HTMLInputElement | null>(null)


  useEffect(() => {
    const checkCV = async () => {
      if (!user || !token) {
        setIsChecking(false)
        return
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL
        const response = await fetch(`${API_URL}/api/cv/check`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setHasCV(data.has_cv)
        }
      } catch (err) {
        console.error('Failed to check CV:', err)
      } finally {
        setIsChecking(false)
      }
    }

    checkCV()
  }, [user, token])

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleViewCV = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL
      const response = await fetch(`${API_URL}/api/cv/view`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CV')
      }

      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

     
      window.open(url, '_blank')

      
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view CV')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setUploadSuccess(false)

    try {
      
      const text = await extractTextFromPDF(file)
      const parsed = parseResume(text)
      setParsedData(parsed)

     
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const API_URL = import.meta.env.VITE_API_URL
      const response = await fetch(`${API_URL}/api/cv/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          file_name: file.name,
          parsed_data: parsed,
          raw_text: text,
          file_data: fileData,
        }),
      })

      const responseText = await response.text()
      if (!responseText) throw new Error('Empty response from server')

      const data = JSON.parse(responseText)
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setUploadSuccess(true)
      setHasCV(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CV')
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    
    
    {hasCV && (
      <button
        onClick={handleViewCV}
        style={{
          width: '100%', 
          backgroundColor: '#64748b',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        View
      </button>
    )}

    <button
      onClick={handleButtonClick}
      disabled={isLoading}
      style={{
        width: '100%', 
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        border: 'none',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        opacity: isLoading ? 0.5 : 1,
      }}
    >
      {isLoading ? 'Uploading...' : 'Upload Cover Letter'}
    </button>

    <input
      type="file"
      accept=".pdf"
      ref={fileInputRef}
      onChange={handleFileUpload}
      style={{ display: 'none' }}
    />

    {error && <p style={{ color: '#dc2626', fontSize: '12px' }}>{error}</p>}
    {uploadSuccess && <p style={{ color: '#16a34a', fontSize: '12px' }}>Cover Letter uploaded successfully!</p>}
  </div>
    )
}