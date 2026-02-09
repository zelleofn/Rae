import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { resumeService, ParsedResume, ExperienceEntry } from './resumeService'
import { getAuthToken } from './storageHelper'

const SidePanel = () => {
  const [resumeData, setResumeData] = useState<ParsedResume | null>(null)
  const [resumeId, setResumeId] = useState<string>('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const loadResume = async () => {
      try {
        const token = await getAuthToken()

        if (!token) {
          setError('Not authenticated. Please log in.')
          setIsLoading(false)
          return
        }

        const data = await resumeService.getUserResume(token)
        
        if (data) {
          setResumeId(data.id)
          
          setResumeData(data.parsed_data)
        } else {
          setError('No resume found. Please upload a resume first.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resume')
      } finally {
        setIsLoading(false)
      }
    }

    loadResume()
  }, [])

  const handleInputChange = (field: keyof ParsedResume, value: any) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, [field]: value })
    setSaveSuccess(false)
  }

  const handleArrayChange = (field: 'skills' | 'experience' | 'projects' | 'education', index: number, value: string) => {
    if (!resumeData) return
    const newArray = [...resumeData[field]]
    newArray[index] = value
    
    if (field === 'experience') {
      const newDetails = [...resumeData.experienceDetails]
      if (newDetails[index]) {
        newDetails[index] = { ...newDetails[index], text: value }
      }
      setResumeData({ ...resumeData, experience: newArray, experienceDetails: newDetails })
    } else {
      setResumeData({ ...resumeData, [field]: newArray })
    }
    setSaveSuccess(false)
  }

  const handleAddArrayItem = (field: 'skills' | 'experience' | 'projects' | 'education') => {
    if (!resumeData) return
    
    if (field === 'experience') {
      setResumeData({ 
        ...resumeData, 
        experience: [...resumeData.experience, ''],
        experienceDetails: [
          ...resumeData.experienceDetails,
          {
            text: '',
            startDate: '',
            endDate: '',
            startMonth: '',
            startYear: '',
            endMonth: '',
            endYear: ''
          }
        ]
      })
    } else {
      setResumeData({ ...resumeData, [field]: [...resumeData[field], ''] })
    }
    setSaveSuccess(false)
  }

  const handleRemoveArrayItem = (field: 'skills' | 'experience' | 'projects' | 'education', index: number) => {
    if (!resumeData) return
    
    if (field === 'experience') {
      setResumeData({
        ...resumeData,
        experience: resumeData.experience.filter((_, i) => i !== index),
        experienceDetails: resumeData.experienceDetails.filter((_, i) => i !== index)
      })
    } else {
      const newArray = resumeData[field].filter((_, i) => i !== index)
      setResumeData({ ...resumeData, [field]: newArray })
    }
    setSaveSuccess(false)
  }

  const handleExperienceDetailChange = (index: number, field: keyof ExperienceEntry, value: string) => {
    if (!resumeData) return
    const newDetails = [...resumeData.experienceDetails]
    newDetails[index] = { ...newDetails[index], [field]: value }
    setResumeData({ ...resumeData, experienceDetails: newDetails })
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!resumeData) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const token = await getAuthToken()

      if (!token) {
        setError('Not authenticated')
        return
      }

      
      await resumeService.updateResume(token, resumeId, resumeData, '', '')
      setSaveSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading resume...</p>
      </div>
    )
  }

  if (error && !resumeData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '10px' }}>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!resumeData) {
    return (
      <div style={{ padding: '20px' }}>
        <p>No resume data available.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>Edit Resume</h1>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee2e2', 
          border: '1px solid #dc2626',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#dcfce7', 
          border: '1px solid #16a34a',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#16a34a'
        }}>
          Resume saved successfully!
        </div>
      )}

      {/* Personal Information */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Personal Information
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              First Name
            </label>
            <input
              type="text"
              value={resumeData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Last Name
            </label>
            <input
              type="text"
              value={resumeData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Email
            </label>
            <input
              type="email"
              value={resumeData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Phone
            </label>
            <input
              type="tel"
              value={resumeData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Country Code
            </label>
            <input
              type="text"
              value={resumeData.countryCode}
              onChange={(e) => handleInputChange('countryCode', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={resumeData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </section>

      {/* Location */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Location
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Street Address
            </label>
            <input
              type="text"
              value={resumeData.streetAddress}
              onChange={(e) => handleInputChange('streetAddress', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                City
              </label>
              <input
                type="text"
                value={resumeData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Country
              </label>
              <input
                type="text"
                value={resumeData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Full Location
            </label>
            <input
              type="text"
              value={resumeData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </section>

      {/* Professional Summary */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Professional Summary
        </h2>
        <textarea
          value={resumeData.professionalSummary}
          onChange={(e) => handleInputChange('professionalSummary', e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif'
          }}
        />
      </section>

      {/* Skills */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Skills
        </h2>
        {resumeData.skills.map((skill, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={skill}
              onChange={(e) => handleArrayChange('skills', index, e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={() => handleRemoveArrayItem('skills', index)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddArrayItem('skills')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          Add Skill
        </button>
      </section>

      {/* Experience */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Experience
        </h2>
        {resumeData.experience.map((exp, index) => (
          <div key={index} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
            <textarea
              value={exp}
              onChange={(e) => handleArrayChange('experience', index, e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                marginBottom: '10px'
              }}
            />
            
            {resumeData.experienceDetails[index] && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    Start Month
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].startMonth}
                    onChange={(e) => handleExperienceDetailChange(index, 'startMonth', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].startYear}
                    onChange={(e) => handleExperienceDetailChange(index, 'startYear', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    Start Date
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].startDate}
                    onChange={(e) => handleExperienceDetailChange(index, 'startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    End Month
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].endMonth}
                    onChange={(e) => handleExperienceDetailChange(index, 'endMonth', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    End Year
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].endYear}
                    onChange={(e) => handleExperienceDetailChange(index, 'endYear', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                    End Date
                  </label>
                  <input
                    type="text"
                    value={resumeData.experienceDetails[index].endDate}
                    onChange={(e) => handleExperienceDetailChange(index, 'endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={() => handleRemoveArrayItem('experience', index)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove Experience
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddArrayItem('experience')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          Add Experience
        </button>
      </section>

      {/* Projects */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Projects
        </h2>
        {resumeData.projects.map((project, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <textarea
              value={project}
              onChange={(e) => handleArrayChange('projects', index, e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                marginBottom: '5px'
              }}
            />
            <button
              onClick={() => handleRemoveArrayItem('projects', index)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove Project
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddArrayItem('projects')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          Add Project
        </button>
      </section>

      {/* Education */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Education
        </h2>
        {resumeData.education.map((edu, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <textarea
              value={edu}
              onChange={(e) => handleArrayChange('education', index, e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                marginBottom: '5px'
              }}
            />
            <button
              onClick={() => handleRemoveArrayItem('education', index)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove Education
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddArrayItem('education')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '10px'
          }}
        >
          Add Education
        </button>
      </section>

      {/* Save Button */}
      <div style={{ 
        position: 'sticky', 
        bottom: '0', 
        backgroundColor: 'white', 
        padding: '20px 0', 
        borderTop: '2px solid #e5e7eb',
        marginTop: '20px'
      }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSaving ? '#9ca3af' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Resume'}
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
)