export function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailRegex)
  return match ? match[0] : ''
}

export function extractPhone(text: string): string {
  const internationalRegex = /\+?[1-9]\d{0,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/
  const usRegex = /(\+?1?\s?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/
  
  let match = text.match(internationalRegex)
  if (match) {
    return match[0].trim()
  }
  
  match = text.match(usRegex)
  return match ? match[0].trim() : ''
}

export function extractCountryCode(text: string): string {
  const countryCodeRegex = /\+([1-9]\d{0,3})(?=[\s.-]?\(?\d)/
  const match = text.match(countryCodeRegex)
  return match ? `+${match[1]}` : ''
}

export function extractPhoneNumber(text: string): string {
  const phone = extractPhone(text)
  const cleaned = phone
    .replace(/^\+\d{1,3}/, '')
    .replace(/[\s.\-()]/g, '')
  return cleaned
}

export function extractFirstAndLastName(text: string): { firstName: string; lastName: string } {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { firstName: '', lastName: '' }
  
  const fullName = lines[0].trim()
  const parts = fullName.split(/\s+/)
  
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1]
  }
}

export function extractProfessionalSummary(text: string): string {
  const summaryRegex = /(?:professional\s+summary|summary|objective)[\s\n:]*([^]*?)(?=\n\n|\n[A-Z][a-z]*(?:\s+[A-Z])?[\s\n:]|$)/i
  const match = text.match(summaryRegex)
  
  if (!match) return ''
  
  return match[1]
    .trim()
    .split('\n')[0]
    .trim()
    .substring(0, 500)
}

export function extractStreetAddress(text: string): string {
  const addressRegex = /(?:address|street)[\s\n:]*([^\n]+)/i
  const match = text.match(addressRegex)
  return match ? match[1].trim() : ''
}

export function extractCity(text: string): string {
  const cityRegex = /(?:city)[\s\n:]*([^\n,]+)/i
  const match = text.match(cityRegex)
  return match ? match[1].trim() : ''
}

export function extractLocation(text: string): string {
  let locationRegex = /(?:location|based)[\s\n:]*([^\n]+)/i
  let match = text.match(locationRegex)
  if (match) return match[1].trim()
  
  const street = extractStreetAddress(text)
  const city = extractCity(text)
  const country = extractCountry(text)
  
  const parts = [street, city, country].filter(p => p.length > 0)
  if (parts.length > 0) return parts.join(', ')
  
  return ''
}

export function extractCountry(text: string): string {
  const countryRegex = /(?:country|nationality)[\s\n:]*([^\n,]+)/i
  const match = text.match(countryRegex)
  return match ? match[1].trim() : ''
}

export function extractCountryFromLocation(location: string): string {
  const parts = location.split(',').map(p => p.trim())
  return parts.length > 0 ? parts[parts.length - 1] : ''
}

export function extractSkills(text: string): string[] {
  const skillsSectionRegex = /skills?[\s\n:]*([^]*?)(?=\n\n|\n(?:experience|education|projects|professional|work)[\s\n:]|$)/i
  const skillsMatch = text.match(skillsSectionRegex)
  
  if (!skillsMatch) return []

  const skillsSection = skillsMatch[1]
  
  const skills = skillsSection
    .split(/[,\n•\-\|;]/)
    .map(skill => skill.trim())
    .filter(skill => {
      if (skill.length === 0 || skill.length > 50) return false
      if (/^(and|or|the|a)$/i.test(skill)) return false
      return true
    })
  
  return [...new Set(skills)]
}

export function extractExperienceText(text: string): string[] {
  const experienceSectionRegex = /(?:work\s+)?experience[\s\n:]*([^]*?)(?=\n\n|\n(?:education|projects|skills|professional)[\s\n:]|$)/i
  const experienceMatch = text.match(experienceSectionRegex)
  
  if (!experienceMatch) return []

  const experienceSection = experienceMatch[1]
  
  const experiences = experienceSection
    .split(/\n\n+/)
    .map(exp => exp.trim())
    .filter(exp => exp.length > 0 && !exp.toLowerCase().startsWith('education'))
  
  return experiences
}

export function extractProjectsText(text: string): string[] {
  const projectsSectionRegex = /projects?[\s\n:]*([^]*?)(?=\n\n|\n(?:education|experience|skills|professional)[\s\n:]|$)/i
  const projectsMatch = text.match(projectsSectionRegex)
  
  if (!projectsMatch) return []

  const projectsSection = projectsMatch[1]
  
  const projects = projectsSection
    .split(/\n\n+/)
    .map(proj => proj.trim())
    .filter(proj => proj.length > 0)
  
  return projects
}

export function extractYearsFromText(experience: string): { startMonth: string; startYear: string; endMonth: string; endYear: string } {
  const fullDateRegex = /(\d{1,2})?[\s/]?(\d{4})\s*[-–]\s*(Present|Current|(\d{1,2})?[\s/]?(\d{4}))/i
  const match = experience.match(fullDateRegex)
  
  if (match) {
    const startMonth = match[1] || ''
    const startYear = match[2]
    const endString = match[3]
    let endMonth = ''
    let endYear = ''
    
    if (endString.toLowerCase() !== 'present' && endString.toLowerCase() !== 'current') {
      endMonth = match[4] || ''
      endYear = match[5]
    } else {
      endMonth = String(new Date().getMonth() + 1)
      endYear = String(new Date().getFullYear())
    }
    
    return {
      startMonth: startMonth,
      startYear: startYear,
      endMonth: String(endMonth),
      endYear: String(endYear),
    }
  }
  
  return { startMonth: '', startYear: '', endMonth: '', endYear: '' }
}

export function extractEducationText(text: string): string[] {
  const educationSectionRegex = /education[\s\n:]*([^]*?)(?=\n\n|\n(?:experience|projects|skills|professional)[\s\n:]|$)/i
  const educationMatch = text.match(educationSectionRegex)
  
  if (!educationMatch) return []

  const educationSection = educationMatch[1]
  
  const education = educationSection
    .split(/\n\n+/)
    .map(edu => edu.trim())
    .filter(edu => edu.length > 0)
  
  return education
}

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
  state: string
  location: string
  country: string
  professionalSummary: string
  skills: string[]
  github: string
  linkedin: string
  portfolio: string
  availability: string
  languages: Array<{ language: string; level: string }>
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

export function extractGithub(text: string): string {
  const match = text.match(/github\.com\/([^\s,/"'<>]+)/i)
  return match ? `https://github.com/${match[1]}` : ''
}

export function extractLinkedin(text: string): string {
  const match = text.match(/linkedin\.com\/in\/([^\s,/"'<>]+)/i)
  return match ? `https://linkedin.com/in/${match[1]}` : ''
}

export function extractPortfolio(text: string): string {
  const portfolioRegex = /(?:portfolio|website|web)[\s\n:]*([^\s\n,]+)/i
  const match = text.match(portfolioRegex)
  if (match) {
    const url = match[1].trim()
    if (url.includes('.') && !url.includes('github.com') && !url.includes('linkedin.com')) {
      return url.startsWith('http') ? url : `https://${url}`
    }
  }
  const urlRegex = /https?:\/\/(?!github\.com|linkedin\.com)[^\s,<>"']+\.[^\s,<>"']+/i
  const urlMatch = text.match(urlRegex)
  return urlMatch ? urlMatch[0] : ''
}

export function extractZipCode(text: string): string {
  const match = text.match(/(?:zip|postal|postcode)[\s\n:]*([A-Z0-9\s-]{3,10})/i)
  return match ? match[1].trim() : ''
}


export function extractState(text: string): string {
  const match = text.match(/(?:state|province|region)[\s\n:]*([^\n,]+)/i)
  return match ? match[1].trim() : ''
}

function parseExperienceEntry(experienceText: string): ExperienceEntry {
  const lines = experienceText.split('\n').filter(line => line.trim())
  const dates = extractYearsFromText(experienceText)
  
  let jobTitle = ''
  let companyName = ''
  let description = experienceText
  
  if (lines.length > 0) {
    jobTitle = lines[0]
    if (lines.length > 1) {
      companyName = lines[1]
      description = lines.slice(2).join('\n')
    }
  }
  
  return {
    jobTitle,
    companyName,
    description,
    ...dates
  }
}

function parseProjectEntry(projectText: string): ProjectEntry {
  const lines = projectText.split('\n').filter(line => line.trim())
  const urlRegex = /(https?:\/\/[^\s]+)/
  const urlMatch = projectText.match(urlRegex)
  
  let projectName = ''
  let description = projectText
  let link = urlMatch ? urlMatch[0] : ''
  
  if (lines.length > 0) {
    projectName = lines[0]
    description = lines.slice(1).join('\n').replace(urlRegex, '').trim()
  }
  
  return {
    projectName,
    description,
    link
  }
}

function parseEducationEntry(educationText: string): EducationEntry {
  const lines = educationText.split('\n').filter(line => line.trim())
  const yearRegex = /(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i
  const yearMatch = educationText.match(yearRegex)
  
  let schoolName = ''
  let fieldOfStudy = ''
  let startYear = ''
  let endYear = ''
  
  if (yearMatch) {
    startYear = yearMatch[1]
    endYear = yearMatch[2].toLowerCase() === 'present' || yearMatch[2].toLowerCase() === 'current' 
      ? String(new Date().getFullYear()) 
      : yearMatch[2]
  }
  
  if (lines.length > 0) {
    schoolName = lines[0].replace(yearRegex, '').trim()
    if (lines.length > 1) {
      fieldOfStudy = lines[1].replace(yearRegex, '').trim()
    }
  }
  
  return {
    schoolName,
    fieldOfStudy,
    startYear,
    endYear
  }
}

export function parseResume(text: string): ParsedResume {
  const { firstName, lastName } = extractFirstAndLastName(text)
  const phone = extractPhone(text)
  const location = extractLocation(text)
  let country = extractCountry(text)
  const streetAddress = extractStreetAddress(text)
  const city = extractCity(text)
  
  if (!country && location) {
    country = extractCountryFromLocation(location)
  }
  
  const experienceTexts = extractExperienceText(text)
  const projectTexts = extractProjectsText(text)
  const educationTexts = extractEducationText(text)
  
  const experience = experienceTexts.length > 0 
    ? experienceTexts.map(parseExperienceEntry)
    : [{
        jobTitle: '',
        companyName: '',
        description: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: ''
      }]
  
  const projects = projectTexts.length > 0
    ? projectTexts.map(parseProjectEntry)
    : [{
        projectName: '',
        description: '',
        link: ''
      }]
  
  const education = educationTexts.length > 0
    ? educationTexts.map(parseEducationEntry)
    : [{
        schoolName: '',
        fieldOfStudy: '',
        startYear: '',
        endYear: ''
      }]
  
const github = extractGithub(text)

  return {
    firstName,
    lastName,
    email: extractEmail(text),
    phone: phone,
    countryCode: extractCountryCode(phone),
    phoneNumber: extractPhoneNumber(phone),
    streetAddress,
    city,
    zipCode: extractZipCode(text),
    state: extractState(text),
    location: location,
    country: country,
    professionalSummary: extractProfessionalSummary(text),
    skills: extractSkills(text),
    github,
    linkedin: extractLinkedin(text),
    portfolio: extractPortfolio(text) || github,
    availability: '',
    languages: [],
    salaryAmount: '',
    salaryCurrency: 'USD',
    salaryType: 'monthly',
    gender: '',
    ethnicity: '',
    veteran: '',
    disability: '',
    experience,
    projects,
    education,
  }
}