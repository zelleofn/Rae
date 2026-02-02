export interface ExperienceEntry {
  text: string
  startDate: string
  endDate: string
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
}

export interface ParsedResume {
  firstName: string
  lastName: string
  email: string
  phone: string
  countryCode: string
  phoneNumber: string
  streetAddress: string
  city: string
  location: string
  country: string
  professionalSummary: string
  skills: string[]
  experience: string[]
  experienceDetails: ExperienceEntry[]
  projects: string[]
  education: string[]
}

export interface ResumeResponse {
  id: string
  file_name: string
  raw_text: string
  parsed_data: ParsedResume
}

const API_URL = import.meta.env.VITE_API_URL

export const resumeService = {
  async getUserResume(token: string): Promise<ResumeResponse | null> {
    try {
      const response = await fetch(`${API_URL}/api/resumes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch resumes: ${response.status}`)
      }

      const data = await response.json()
      const resumes = data.resumes

      if (!resumes || resumes.length === 0) {
        return null
      }

      const latestResumeId = resumes[0].id

      const resumeResponse = await fetch(`${API_URL}/api/resume/${latestResumeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!resumeResponse.ok) {
        throw new Error(`Failed to fetch resume: ${resumeResponse.status}`)
      }

      return await resumeResponse.json()
    } catch (error) {
      throw error
    }
  },

  async updateResume(token: string, resumeId: string, parsedData: ParsedResume, fileName: string, rawText: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/resume/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: fileName,
        parsed_data: parsedData,
        raw_text: rawText,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update resume')
    }
  },
}