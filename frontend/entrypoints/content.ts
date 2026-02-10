export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  
  main() {
    interface ResumeData {
  firstName: string
  lastName: string
  email: string
  phone: string
  streetAddress: string
  city: string
  country: string
  location: string
  professionalSummary: string
  skills: string[]
  experience: Array<{
    jobTitle: string
    companyName: string
    description: string
    startMonth: string
    startYear: string
    endMonth: string
    endYear: string
  }>
  projects: Array<{
    projectName: string
    description: string
    link: string
  }>
  education: Array<{
    schoolName: string
    fieldOfStudy: string
    startYear: string
    endYear: string
  }>
}

interface FieldMapping {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  type: string
  confidence: number
}

function detectFieldType(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): { type: string; confidence: number } {
  const id = element.id?.toLowerCase() || ''
  const name = element.name?.toLowerCase() || ''
  const placeholder = (element as HTMLInputElement).placeholder?.toLowerCase() || ''
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
  const label = findLabelForElement(element)?.toLowerCase() || ''
  
  const combined = `${id} ${name} ${placeholder} ${ariaLabel} ${label}`
  
  const patterns = [
    { keywords: ['firstname', 'first-name', 'first_name', 'fname', 'givenname'], type: 'firstName', confidence: 0.9 },
    { keywords: ['lastname', 'last-name', 'last_name', 'lname', 'surname', 'familyname'], type: 'lastName', confidence: 0.9 },
    { keywords: ['email', 'e-mail', 'emailaddress'], type: 'email', confidence: 0.9 },
    { keywords: ['phone', 'telephone', 'mobile', 'phonenumber', 'tel'], type: 'phone', confidence: 0.9 },
    { keywords: ['address', 'street', 'addressline'], type: 'streetAddress', confidence: 0.8 },
    { keywords: ['city', 'town'], type: 'city', confidence: 0.8 },
    { keywords: ['country', 'nation'], type: 'country', confidence: 0.8 },
    { keywords: ['location', 'residence'], type: 'location', confidence: 0.7 },
    { keywords: ['summary', 'about', 'bio', 'profile', 'objective'], type: 'professionalSummary', confidence: 0.7 },
    { keywords: ['skill', 'expertise', 'competenc'], type: 'skills', confidence: 0.7 },
    { keywords: ['jobtitle', 'job-title', 'position', 'role', 'title'], type: 'jobTitle', confidence: 0.8 },
    { keywords: ['company', 'employer', 'organization', 'organisation'], type: 'companyName', confidence: 0.8 },
    { keywords: ['school', 'university', 'college', 'institution'], type: 'schoolName', confidence: 0.8 },
    { keywords: ['degree', 'major', 'field', 'study', 'discipline'], type: 'fieldOfStudy', confidence: 0.8 },
    { keywords: ['project', 'portfolio'], type: 'projectName', confidence: 0.7 },
    { keywords: ['linkedin', 'github', 'website', 'url', 'link', 'portfolio'], type: 'link', confidence: 0.6 },
  ]
  
  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (combined.includes(keyword)) {
        return { type: pattern.type, confidence: pattern.confidence }
      }
    }
  }
  
  return { type: 'unknown', confidence: 0 }
}

function findLabelForElement(element: HTMLElement): string | null {
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`)
    if (label) return label.textContent
  }
  
  const parentLabel = element.closest('label')
  if (parentLabel) return parentLabel.textContent
  
  const prevSibling = element.previousElementSibling
  if (prevSibling?.tagName === 'LABEL') {
    return prevSibling.textContent
  }
  
  return null
}

function getAllFormFields(): FieldMapping[] {
  const fields: FieldMapping[] = []
  const inputs = document.querySelectorAll('input, textarea, select')
  
  inputs.forEach((element) => {
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement || 
        element instanceof HTMLSelectElement) {
      
      if (element instanceof HTMLInputElement && 
          (element.type === 'submit' || element.type === 'button' || element.type === 'hidden')) {
        return
      }
      
      const { type, confidence } = detectFieldType(element)
      if (confidence > 0.5) {
        fields.push({ element, type, confidence })
      }
    }
  })
  
  return fields
}

function fillField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set
  
  if (element instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
  } else if (element instanceof HTMLTextAreaElement && nativeTextareaValueSetter) {
    nativeTextareaValueSetter.call(element, value)
  } else {
    element.value = value
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
}

async function handleFileUpload(element: HTMLInputElement, fileType: 'resume' | 'coverLetter') {
  try {
    const token = await chrome.storage.local.get(['auth_token'])
    if (!token.auth_token) return
    
    const API_URL = (await chrome.storage.local.get(['api_url'])).api_url || 'http://localhost:3000'
    const endpoint = fileType === 'resume' ? '/api/resume/view' : '/api/cv/view'
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token.auth_token}`,
      },
    })
    
    if (!response.ok) return
    
    const blob = await response.blob()
    const fileName = fileType === 'resume' ? 'resume.pdf' : 'cover-letter.pdf'
    const file = new File([blob], fileName, { type: 'application/pdf' })
    
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    element.files = dataTransfer.files
    
    element.dispatchEvent(new Event('change', { bubbles: true }))
  } catch (error) {
    console.error(`Failed to upload ${fileType}:`, error)
  }
}

function autofillForm(resumeData: ResumeData, cvAvailable: boolean) {
  const fields = getAllFormFields()
  let filledCount = 0
  
  fields.forEach(({ element, type }) => {
    let value = ''
    
    switch (type) {
      case 'firstName':
        value = resumeData.firstName
        break
      case 'lastName':
        value = resumeData.lastName
        break
      case 'email':
        value = resumeData.email
        break
      case 'phone':
        value = resumeData.phone
        break
      case 'streetAddress':
        value = resumeData.streetAddress
        break
      case 'city':
        value = resumeData.city
        break
      case 'country':
        value = resumeData.country
        break
      case 'location':
        value = resumeData.location
        break
      case 'professionalSummary':
        value = resumeData.professionalSummary
        break
      case 'skills':
        value = resumeData.skills.join(', ')
        break
      case 'jobTitle':
        value = resumeData.experience[0]?.jobTitle || ''
        break
      case 'companyName':
        value = resumeData.experience[0]?.companyName || ''
        break
      case 'schoolName':
        value = resumeData.education[0]?.schoolName || ''
        break
      case 'fieldOfStudy':
        value = resumeData.education[0]?.fieldOfStudy || ''
        break
      case 'projectName':
        value = resumeData.projects[0]?.projectName || ''
        break
      case 'link':
        value = resumeData.projects[0]?.link || ''
        break
    }
    
    if (value && element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      fillField(element, value)
      filledCount++
    }
  })
  
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
  fileInputs.forEach(async (fileInput) => {
    const label = findLabelForElement(fileInput)?.toLowerCase() || ''
    const id = fileInput.id?.toLowerCase() || ''
    const name = fileInput.name?.toLowerCase() || ''
    const combined = `${label} ${id} ${name}`
    
    if (combined.includes('resume') || combined.includes('cv')) {
      await handleFileUpload(fileInput, 'resume')
      filledCount++
    } else if (cvAvailable && (combined.includes('cover') || combined.includes('letter'))) {
      await handleFileUpload(fileInput, 'coverLetter')
      filledCount++
    }
  })
  
  return filledCount
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    const filledCount = autofillForm(message.resumeData, message.cvAvailable)
    sendResponse({ success: true, filledCount })
  } else if (message.action === 'detectFields') {
    const fields = getAllFormFields()
    sendResponse({ success: true, fieldCount: fields.length })
  }
  return true
})

console.log('RAE Autofill content script loaded')
  }
})