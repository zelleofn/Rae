import { useRef, useState } from 'react'
import { extractTextFromPDF } from '../utils/pdfExtractor'
import { parseResume, ParsedResume } from '../utils/parser'
import { useAuthStore } from '../stores/authStore'

export default function ResumeUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const token = useAuthStore((state) => state.token)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
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

      const API_URL = import.meta.env.VITE_API_URL
      const response = await fetch(`${API_URL}/api/resume/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          file_name: file.name,
          parsed_data: parsed,
          raw_text: text,
        }),
      })

      const responseText = await response.text()
      if (!responseText) throw new Error('Empty response from server')

      const data = JSON.parse(responseText)
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setUploadSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process resume')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        style={{
          width: '100%',
          backgroundColor: '#16a34a',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          opacity: isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? 'Uploading...' : 'Upload Resume'}
      </button>

      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {error && <p style={{ color: '#dc2626', fontSize: '12px' }}>{error}</p>}
      {uploadSuccess && <p style={{ color: '#16a34a', fontSize: '12px' }}>Resume uploaded successfully!</p>}
    </div>
  )
}
