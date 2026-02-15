import { useRef, useState, useEffect } from 'react'
import { extractTextFromPDF } from '../utils/pdfExtractor'
import { parseResume } from '../utils/parser'
import { useAuthStore } from '../stores/authStore'

interface TierInfo {
  tier: string
  count: number
  limit: number
  is_pro: boolean
}

interface ResumeRecord {
  id: number
  file_name: string
  uploaded_at: string
}

interface ResumeUploadProps {
  onEditClick: () => void
  onSelectionChange?: (resumeId: number | null) => void
}

const STORAGE_KEY = 'selected_resume_id'

async function loadStoredResumeId(): Promise<number | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const val = result[STORAGE_KEY]
    return typeof val === 'number' ? val : null   
  } catch {
    return null
  }
}

async function saveResumeId(id: number | null) {
  try {
    if (id === null) {
      await chrome.storage.local.remove(STORAGE_KEY)
    } else {
      await chrome.storage.local.set({ [STORAGE_KEY]: id })
    }
  } catch {
  }
}

export default function ResumeUpload({ onEditClick, onSelectionChange }: ResumeUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null)
  const [resumes, setResumes] = useState<ResumeRecord[]>([])
  const [isChecking, setIsChecking] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)

  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const API_URL = import.meta.env.VITE_API_URL

  const fetchTierAndResumes = async () => {
    if (!user || !token) { setIsChecking(false); return }
    try {
      const [tierRes, resumesRes, storedId] = await Promise.all([
        fetch(`${API_URL}/api/resume/tier`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/resumes`, { headers: { Authorization: `Bearer ${token}` } }),
        loadStoredResumeId(),
      ])

      if (tierRes.ok) setTierInfo(await tierRes.json())

      if (resumesRes.ok) {
        const data = await resumesRes.json()
        const list: ResumeRecord[] = data.resumes || []
        setResumes(list)

      
        const storedStillValid = list.some(r => r.id === storedId)
        const resolved = storedStillValid ? storedId! : (list[0]?.id ?? null)

        if (!storedStillValid) {
          
          await saveResumeId(resolved)
        }

        setSelectedResumeId(resolved)
        onSelectionChange?.(resolved)
      }
    } catch (err) {
      console.error('Failed to fetch tier info:', err)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => { fetchTierAndResumes() }, [user, token])

  const handleSelectResume = async (id: number) => {
    setSelectedResumeId(id)
    await saveResumeId(id)         
    onSelectionChange?.(id)
  }

  const handleButtonClick = () => {
    setError(null)
    setUploadSuccess(false)
    if (!tierInfo?.is_pro && resumes.length >= 1) {
      setShowConfirm(true)
    } else if (tierInfo?.is_pro && tierInfo.count >= tierInfo.limit) {
      setError(`You've reached the ${tierInfo.limit}-resume limit. Delete one to upload a new profile.`)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleConfirmReplace = () => {
    setShowConfirm(false)
    fileInputRef.current?.click()
  }

  const handleViewResume = async () => {
    try {
      const url = (tierInfo?.is_pro && selectedResumeId)
        ? `${API_URL}/api/resume/${selectedResumeId}/view`
        : `${API_URL}/api/resume/view`

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Failed to fetch resume')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view resume')
    }
  }

  const handleDeleteResume = async (resumeId: number) => {
    setDeletingId(resumeId)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/resume/${resumeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to delete resume')
      await fetchTierAndResumes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume')
    } finally {
      setDeletingId(null)
    }
  }

  const processAndUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setUploadSuccess(false)
    try {
      const text = await extractTextFromPDF(file)
      const parsed = parseResume(text)
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch(`${API_URL}/api/resume/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ file_name: file.name, parsed_data: parsed, raw_text: text, file_data: fileData }),
      })

      const responseText = await response.text()
      if (!responseText) throw new Error('Empty response from server')
      const data = JSON.parse(responseText)
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setUploadSuccess(true)
      
      await fetchTierAndResumes()

      try {
        const win = await chrome.windows.getCurrent()
        if (win.id) await (chrome.sidePanel as any).open({ windowId: win.id })
      } catch (e) {
        console.error('[RAE] Could not open sidepanel:', e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process resume')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    await processAndUpload(file)
  }

  if (isChecking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>Loading...</p>
      </div>
    )
  }

  const atLimit = tierInfo?.is_pro ? tierInfo.count >= tierInfo.limit : false
  const hasResume = resumes.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Tier badge and counter */}
      {tierInfo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', textTransform: 'uppercase',
            backgroundColor: tierInfo.is_pro ? '#fef3c7' : '#f3f4f6',
            color: tierInfo.is_pro ? '#92400e' : '#6b7280',
          }}>
            {tierInfo.is_pro ? ' Pro' : 'Free'}
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {tierInfo.is_pro
              ? `${tierInfo.count} / ${tierInfo.limit} slots used`
              : hasResume ? 'Upload will replace existing' : '1 resume on free plan'}
          </span>
        </div>
      )}

      
      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        {hasResume && (
          <button
            onClick={handleViewResume}
            title={tierInfo?.is_pro && selectedResumeId
              ? `View: ${resumes.find(r => r.id === selectedResumeId)?.file_name ?? 'selected resume'}`
              : 'View resume'}
            style={{
              backgroundColor: '#64748b', color: 'white', padding: '8px 10px',
              borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            View
          </button>
        )}

        <button
          onClick={handleButtonClick}
          disabled={isLoading || atLimit}
          style={{
            flex: 1,
            backgroundColor: atLimit ? '#9ca3af' : '#16a34a',
            color: 'white', padding: '8px', borderRadius: '4px', border: 'none',
            cursor: isLoading || atLimit ? 'not-allowed' : 'pointer', fontSize: '14px',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Uploading...' : tierInfo?.is_pro ? '+ Add Profile' : 'Upload Resume'}
        </button>

        <button
          onClick={onEditClick}
          style={{
            backgroundColor: '#64748b', color: 'white', padding: '8px 16px',
            borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '14px',
            fontWeight: '500', flexShrink: 0,
          }}
        >
          Edit
        </button>
      </div>

      {/* Replace confirmation */}
      {showConfirm && (
        <div style={{
          padding: '10px', backgroundColor: '#fef9c3',
          border: '1px solid #ca8a04', borderRadius: '6px', fontSize: '12px',
        }}>
          <p style={{ margin: '0 0 8px', color: '#713f12' }}>
            This will <strong>replace</strong> your existing resume. Continue?
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleConfirmReplace}
              style={{ flex: 1, padding: '6px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Replace
            </button>
            <button onClick={() => setShowConfirm(false)}
              style={{ flex: 1, padding: '6px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pro limit reached */}
      {atLimit && (
        <div style={{ padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #dc2626', borderRadius: '4px', fontSize: '12px', color: '#dc2626' }}>
          All {tierInfo?.limit} resume slots used. Delete one below to upload a new profile.
        </div>
      )}

      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

      {/* Pro resume list  */}
      {tierInfo?.is_pro && resumes.length > 0 && (
        <div style={{ marginTop: '2px' }}>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>
            Resume Profiles — <span style={{ color: '#6366f1' }}>select active</span>
          </p>
          {resumes.map((r) => {
            const isSelected = selectedResumeId === r.id
            return (
              <div
                key={r.id}
                onClick={() => handleSelectResume(r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '4px', marginBottom: '4px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                  border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                  transition: 'all 0.1s',
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? '#3b82f6' : '#9ca3af'}`,
                  backgroundColor: isSelected ? '#3b82f6' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'white' }} />}
                </div>

                {/* Filename */}
                <span style={{
                  fontSize: '12px', color: isSelected ? '#1d4ed8' : '#374151',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, fontWeight: isSelected ? '500' : 'normal',
                }}>
                  📄 {r.file_name}
                </span>

                {/* Active badge */}
                {isSelected && (
                  <span style={{
                    fontSize: '9px', padding: '1px 5px', borderRadius: '8px',
                    backgroundColor: '#dbeafe', color: '#1d4ed8',
                    fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    Active
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteResume(r.id) }}
                  disabled={deletingId === r.id}
                  style={{
                    padding: '3px 8px', backgroundColor: '#dc2626', color: 'white',
                    border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px',
                    opacity: deletingId === r.id ? 0.5 : 1, flexShrink: 0,
                  }}
                >
                  {deletingId === r.id ? '...' : 'Delete'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Free tier upgrade nudge */}
      {!tierInfo?.is_pro && (
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0', textAlign: 'center' }}>
          <span style={{ color: '#6366f1', cursor: 'pointer' }}>Upgrade to Pro</span> for 5 resume profiles
        </p>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: '12px', margin: '0' }}>{error}</p>}
      {uploadSuccess && <p style={{ color: '#16a34a', fontSize: '12px', margin: '0' }}>✓ Resume uploaded successfully!</p>}
    </div>
  )
}