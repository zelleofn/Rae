import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { resumeService, ParsedResume, ExperienceEntry, ProjectEntry, EducationEntry, LanguageEntry } from './resumeService'
import { getAuthToken } from './storageHelper'


const CURRENCIES = ['USD','EUR','GBP','CAD','AUD','ZAR','INR','NGN','GHS','KES','AED','SGD','JPY','CNY','BRL','MXN','TTD']
const LANGUAGE_LEVELS = ['Basic','Conversational','Professional','Fluent','Native']
const AVAILABILITY_OPTIONS = ['Immediately','1 Week','2 Weeks','1 Month','2 Months','3 Months','Open to Discussion']
const GENDER_OPTIONS = ['Prefer not to say','Male','Female','Non-binary','Other']
const ETHNICITY_OPTIONS = ['Prefer not to say','White / Caucasian','Black / African American','Hispanic / Latino','Asian','Middle Eastern','Native American / Indigenous','Pacific Islander','Mixed / Multiracial','Other']
const VETERAN_OPTIONS = ['Prefer not to say','Not a Veteran','Veteran','Active Duty','Reserve / National Guard']
const DISABILITY_OPTIONS = ['Prefer not to say','No','Yes']

const inputStyle = {
  width: '100%',
  padding: '8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold' as const,
  fontSize: '14px',
}

const selectStyle = {
  ...inputStyle,
  backgroundColor: 'white',
  cursor: 'pointer',
}

const SidePanel = () => {
  const [resumeData, setResumeData] = useState<ParsedResume | null>(null)
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    const loadResume = async () => {
      try {
        const token = await getAuthToken()
        if (!token) { setError('Not authenticated. Please log in.'); setIsLoading(false); return }
        const data = await resumeService.getUserResume(token)
        if (data) {
          setResumeId(data.id)
          const pd = data.parsed_data
          setResumeData({
            ...pd,
            zipCode: pd.zipCode || '',
            state: pd.state || '',
            github: pd.github || '',
            linkedin: pd.linkedin || '',
            portfolio: pd.portfolio || '',
            availability: pd.availability || '',
            languages: pd.languages || [],
            salaryAmount: pd.salaryAmount || '',
            salaryCurrency: pd.salaryCurrency || 'USD',
            salaryType: pd.salaryType || 'monthly',
            gender: pd.gender || '',
            ethnicity: pd.ethnicity || '',
            veteran: pd.veteran || '',
            disability: pd.disability || '',
          })
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

  const set = (field: keyof ParsedResume, value: any) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, [field]: value })
    setSaveSuccess(false)
  }

  const handleInputChange = (field: keyof ParsedResume, value: any) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, [field]: value })
    setSaveSuccess(false)
  }

  const handleSkillChange = (index: number, value: string) => {
    if (!resumeData) return
    const newSkills = [...resumeData.skills]
    newSkills[index] = value
    setResumeData({ ...resumeData, skills: newSkills })
    setSaveSuccess(false)
  }

  const handleAddSkill = () => {
    if (!resumeData) return
    setResumeData({ ...resumeData, skills: [...resumeData.skills, ''] })
    setSaveSuccess(false)
  }

  const handleRemoveSkill = (index: number) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, skills: resumeData.skills.filter((_, i) => i !== index) })
    setSaveSuccess(false)
  }

  const handleExperienceChange = (index: number, field: keyof ExperienceEntry, value: string) => {
    if (!resumeData) return
    const newExperience = [...resumeData.experience]
    newExperience[index] = { ...newExperience[index], [field]: value }
    setResumeData({ ...resumeData, experience: newExperience })
    setSaveSuccess(false)
  }

  const handleAddExperience = () => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      experience: [...resumeData.experience, {
        jobTitle: '',
        companyName: '',
        description: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: ''
      }]
    })
    setSaveSuccess(false)
  }

  const handleRemoveExperience = (index: number) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, experience: resumeData.experience.filter((_, i) => i !== index) })
    setSaveSuccess(false)
  }

  const handleProjectChange = (index: number, field: keyof ProjectEntry, value: string) => {
    if (!resumeData) return
    const newProjects = [...resumeData.projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    setResumeData({ ...resumeData, projects: newProjects })
    setSaveSuccess(false)
  }

  const handleAddProject = () => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      projects: [...resumeData.projects, { projectName: '', description: '', link: '' }]
    })
    setSaveSuccess(false)
  }

  const handleRemoveProject = (index: number) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, projects: resumeData.projects.filter((_, i) => i !== index) })
    setSaveSuccess(false)
  }

  const handleEducationChange = (index: number, field: keyof EducationEntry, value: string) => {
    if (!resumeData) return
    const newEducation = [...resumeData.education]
    newEducation[index] = { ...newEducation[index], [field]: value }
    setResumeData({ ...resumeData, education: newEducation })
    setSaveSuccess(false)
  }

  const handleAddEducation = () => {
    if (!resumeData) return
    setResumeData({
      ...resumeData,
      education: [...resumeData.education, { schoolName: '', fieldOfStudy: '', startYear: '', endYear: '' }]
    })
    setSaveSuccess(false)
  }

  const handleRemoveEducation = (index: number) => {
    if (!resumeData) return
    setResumeData({ ...resumeData, education: resumeData.education.filter((_, i) => i !== index) })
    setSaveSuccess(false)
  }


  const handleLanguageChange = (i: number, field: keyof LanguageEntry, v: string) => {
    if (!resumeData) return
    const arr = [...resumeData.languages]; arr[i] = { ...arr[i], [field]: v }; set('languages', arr)
  }
  const handleAddLanguage = () => { if (!resumeData) return; set('languages', [...resumeData.languages, { language: '', level: 'Conversational' }]) }
  const handleRemoveLanguage = (i: number) => { if (!resumeData) return; set('languages', resumeData.languages.filter((_, x) => x !== i)) }

const handleSave = async () => {
    if (!resumeData) return
    setIsSaving(true); setError(null); setSaveSuccess(false)
    try {
      const token = await getAuthToken()
      if (!token) { setError('Not authenticated'); return }
      await resumeService.updateResume(token, resumeData)
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

   const sectionHead: React.CSSProperties = { fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }
  const card: React.CSSProperties = { marginBottom: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }
  const removeBtn: React.CSSProperties = { padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
  const addBtn: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', marginTop: '10px' }

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
                width: '95%',
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
                width: '95%',
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
                width: '95%',
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
                width: '95%',
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
                width: '95%',
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
                  width: '95%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Zip / Postal Code</label>
              <input type="text" value={resumeData.zipCode} onChange={e => set('zipCode', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State / Province</label>
              <input type="text" value={resumeData.state} onChange={e => set('state', e.target.value)} style={inputStyle} />
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

     
      <section style={{ marginBottom: '30px' }}>
        <h2 style={sectionHead}>Websites & Links</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {(['linkedin','github','portfolio'] as const).map((field, i) => (
            <div key={field}>
              <label style={labelStyle}>{['LinkedIn URL','GitHub URL','Portfolio URL'][i]}</label>
              <input type="url" value={(resumeData as any)[field]} onChange={e => set(field, e.target.value)} placeholder={['https://linkedin.com/in/username','https://github.com/username','https://yoursite.com'][i]} style={inputStyle} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Skills
        </h2>
        {resumeData.skills.map((skill, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={skill}
              onChange={(e) => handleSkillChange(index, e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={() => handleRemoveSkill(index)}
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
          onClick={handleAddSkill}
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

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Experience
        </h2>
        {resumeData.experience.map((exp, index) => (
          <div key={index} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  value={exp.jobTitle}
                  onChange={(e) => handleExperienceChange(index, 'jobTitle', e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={exp.companyName}
                  onChange={(e) => handleExperienceChange(index, 'companyName', e.target.value)}
                  style={{
                    width: '85%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={exp.description}
                onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'Arial, sans-serif'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
  {/* MONTHS */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
      Start Month
    </label>
    <input
      type="text"
      value={exp.startMonth}
      onChange={(e) => handleExperienceChange(index, 'startMonth', e.target.value)}
      style={{
        width: '90%',
        padding: '8px',
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
      value={exp.endMonth}
      onChange={(e) => handleExperienceChange(index, 'endMonth', e.target.value)}
      style={{
        width: '90%',
        padding: '8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '12px'
      }}
    />
  </div>

  {/* YEARS */}
  <div>
    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
      Start Year
    </label>
    <input
      type="text"
      value={exp.startYear}
      onChange={(e) => handleExperienceChange(index, 'startYear', e.target.value)}
      style={{
        width: '85%',
        padding: '8px',
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
      value={exp.endYear}
      onChange={(e) => handleExperienceChange(index, 'endYear', e.target.value)}
      style={{
        width: '85%',
        padding: '8px',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '12px'
      }}
    />
  </div>
</div>
            
            <button
              onClick={() => handleRemoveExperience(index)}
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
          onClick={handleAddExperience}
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

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Projects
        </h2>
        {resumeData.projects.map((project, index) => (
          <div key={index} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                Project Name
              </label>
              <input
                type="text"
                value={project.projectName}
                onChange={(e) => handleProjectChange(index, 'projectName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={project.description}
                onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'Arial, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                Link
              </label>
              <input
                type="text"
                value={project.link}
                onChange={(e) => handleProjectChange(index, 'link', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <button
              onClick={() => handleRemoveProject(index)}
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
          onClick={handleAddProject}
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

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Education
        </h2>
        {resumeData.education.map((edu, index) => (
          <div key={index} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  School Name
                </label>
                <input
                  type="text"
                  value={edu.schoolName}
                  onChange={(e) => handleEducationChange(index, 'schoolName', e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  Field of Study
                </label>
                <input
                  type="text"
                  value={edu.fieldOfStudy}
                  onChange={(e) => handleEducationChange(index, 'fieldOfStudy', e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  Start Year
                </label>
                <input
                  type="text"
                  value={edu.startYear}
                  onChange={(e) => handleEducationChange(index, 'startYear', e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px',
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
                  value={edu.endYear}
                  onChange={(e) => handleEducationChange(index, 'endYear', e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => handleRemoveEducation(index)}
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
          onClick={handleAddEducation}
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

      {/* ── Languages ── */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Languages
        </h2>
        {resumeData.languages.map((lang, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Language</label>
              <input 
                type="text" 
                value={lang.language} 
                onChange={e => handleLanguageChange(i, 'language', e.target.value)} 
                style={{ width: '85%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }} 
              />
            </div>
            <div style={{ flex: 1.5 }}> 
    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Level</label>
    <select 
      value={lang.level} 
      onChange={e => handleLanguageChange(i, 'level', e.target.value)} 
      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
    >
      {LANGUAGE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
    </select>
  </div>
            <button 
              onClick={() => handleRemoveLanguage(i)} 
              style={{ padding: '8px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={handleAddLanguage} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
          Add Language
        </button>
      </section>

      {/* ── Availability ── */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Availability / Start Date
        </h2>
        <select 
          value={resumeData.availability} 
          onChange={e => set('availability', e.target.value)} 
          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
        >
          <option value="">Select availability</option>
          {AVAILABILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </section>

      {/* ── Salary Expectations ── */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Salary Expectations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Currency</label>
            <select 
              value={resumeData.salaryCurrency} 
              onChange={e => set('salaryCurrency', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Type</label>
            <select 
              value={resumeData.salaryType} 
              onChange={e => set('salaryType', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Amount</label>
            <input 
              type="number" 
              min="0" 
              value={resumeData.salaryAmount} 
              onChange={e => set('salaryAmount', e.target.value)} 
              placeholder="e.g. 5000" 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }} 
            />
          </div>
        </div>
      </section>

      {/* ── Demographics ── */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '5px' }}>
          Demographics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Gender</label>
            <select 
              value={resumeData.gender} 
              onChange={e => set('gender', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              <option value="">Select</option>
              {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Race / Ethnicity</label>
            <select 
              value={resumeData.ethnicity} 
              onChange={e => set('ethnicity', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              <option value="">Select</option>
              {ETHNICITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Veteran Status</label>
            <select 
              value={resumeData.veteran} 
              onChange={e => set('veteran', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              <option value="">Select</option>
              {VETERAN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Disability Status</label>
            <select 
              value={resumeData.disability} 
              onChange={e => set('disability', e.target.value)} 
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white' }}
            >
              <option value="">Select</option>
              {DISABILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </section>

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