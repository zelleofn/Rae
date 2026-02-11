export interface ExperienceEntry {
  jobTitle: string
  companyName: string
  description: string
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
}

export interface ProjectEntry {
  projectName: string
  description: string
  link: string
}

export interface EducationEntry {
  schoolName: string
  fieldOfStudy: string
  startYear: string
  endYear: string
}

export interface LanguageEntry {
  language: string
  level: string
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
  zipCode: string
  location: string
  country: string
  state: string;
  professionalSummary: string
  skills: string[]
  github: string
  linkedin: string
  portfolio: string
  availability: string
  languages: LanguageEntry[]
  salaryAmount: string
  salaryCurrency: string
  salaryType: string
  gender: string
  ethnicity: string
  veteran: string
  disability: string
  experience: ExperienceEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
}

export interface ResumeResponse {
  id: number
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

  async updateResume(token: string, parsedData: ParsedResume): Promise<void> {
    const response = await fetch(`${API_URL}/api/resume/parsed`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parsed_data: parsedData,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update resume')
    }
  },
}