export function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailRegex)
  return match ? match[0] : ''
}

export function extractPhone(text: string): string {
  const phoneRegex = /(\+?1?\s?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/
  const match = text.match(phoneRegex)
  return match ? match[0].trim() : ''
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

export function extractYearsFromExperience(experience: string): { start: string; end: string } {
  const yearRegex = /(\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s*[-–]\s*(Present|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i
  const match = experience.match(yearRegex)
  
  if (match) {
    return {
      start: match[1],
      end: match[2],
    }
  }
  
  return { start: '', end: '' }
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

export interface ParsedResume {
  firstName: string
  lastName: string
  email: string
  phone: string
  skills: string[]
  experience: string[]
  experienceYears: { start: string; end: string }[]
  education: string[]
}

export function parseResume(text: string): ParsedResume {
  const experiences = extractExperience(text)
  
  return {
    firstName: extractFirstName(text),
    lastName: extractLastName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    experience: experiences,
    experienceYears: experiences.map(exp => extractYearsFromExperience(exp)),
    education: extractEducation(text),
  }
}

