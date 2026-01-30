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

export function extractName(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length > 0) {
    const fullName = lines[0].trim()
    return fullName
  }
  return ''
}

export function extractFirstName(text: string): string {
  const fullName = extractName(text)
  return fullName.split(' ')[0] || ''
}

export function extractLastName(text: string): string {
  const fullName = extractName(text)
  const parts = fullName.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

export function extractSkills(text: string): string[] {
  const skillsSectionRegex = /skills?[\s\n:]*([^]*?)(?=\n\n|\n[A-Z]|$)/i
  const skillsMatch = text.match(skillsSectionRegex)
  
  if (!skillsMatch) return []

  const skillsSection = skillsMatch[1]
  
  const skills = skillsSection
    .split(/[,\n•\-\|]/) 
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0 && skill.length < 50) 
  
  return skills
}

export function extractExperience(text: string): string[] {
  const experienceSectionRegex = /(?:work\s+)?experience[\s\n:]*([^]*?)(?=\n\n|\n[A-Z]|$)/i
  const experienceMatch = text.match(experienceSectionRegex)
  
  if (!experienceMatch) return []

  const experienceSection = experienceMatch[1]
  
  const experiences = experienceSection
    .split(/\n\n+/) 
    .map(exp => exp.trim())
    .filter(exp => exp.length > 0)
  
  return experiences
}

export function extractYearsFromExperience(experience: string): { startDate: string; endDate: string; startMonth: string; startYear: string; endMonth: string; endYear: string } {
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
      startDate: `${startMonth}/${startYear}`,
      endDate: `${endMonth}/${endYear}`,
      startMonth: startMonth,
      startYear: startYear,
      endMonth: String(endMonth),
      endYear: String(endYear),
    }
  }
  
  return { startDate: '', endDate: '', startMonth: '', startYear: '', endMonth: '', endYear: '' }
}

export function extractEducation(text: string): string[] {
  const educationSectionRegex = /education[\s\n:]*([^]*?)(?=\n\n|\n[A-Z]|$)/i
  const educationMatch = text.match(educationSectionRegex)
  
  if (!educationMatch) return []

  const educationSection = educationMatch[1]
  
  const education = educationSection
    .split(/\n\n+/)
    .map(edu => edu.trim())
    .filter(edu => edu.length > 0)
  
  return education
}

export function extractLocation(text: string): string {
  const locationSectionRegex = /(?:location|city|address|based|located)[\s\n:]*([^\n]+)/i
  const match = text.match(locationSectionRegex)
  
  if (match) {
    return match[1].trim()
  }
  
  return ''
}

export function extractCountry(text: string): string {
  const countrySectionRegex = /(?:country|nationality)[\s\n:]*([^\n]+)/i
  const match = text.match(countrySectionRegex)
  
  if (match) {
    return match[1].trim()
  }
  
  return ''
}

export function extractCountryFromLocation(location: string): string {
  const parts = location.split(',')
  return parts.length > 1 ? parts[parts.length - 1].trim() : ''
}

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
  location: string
  country: string
  skills: string[]
  experience: string[]
  experienceDetails: ExperienceEntry[]
  education: string[]
}

export function parseResume(text: string): ParsedResume {
  const experiences = extractExperience(text)
  const phone = extractPhone(text)
  const location = extractLocation(text)
  let country = extractCountry(text)
  
  if (!country && location) {
    country = extractCountryFromLocation(location)
  }
  
  const experienceDetails = experiences.map(exp => ({
    text: exp,
    ...extractYearsFromExperience(exp),
  }))
  
  return {
    firstName: extractFirstName(text),
    lastName: extractLastName(text),
    email: extractEmail(text),
    phone: phone,
    countryCode: extractCountryCode(phone),
    phoneNumber: extractPhoneNumber(phone),
    location: location,
    country: country,
    skills: extractSkills(text),
    experience: experiences,
    experienceDetails: experienceDetails,
    education: extractEducation(text),
  }
}