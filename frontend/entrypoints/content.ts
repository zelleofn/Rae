export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    interface ResumeData {
      firstName: string
      lastName: string
      email: string
      phone: string
      countryCode: string
      phoneNumber: string
      streetAddress: string
      city: string
      state: string
      zipCode: string
      country: string
      location: string
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
      experience: Array<{
        jobTitle: string
        companyName: string
        description: string
        startMonth: string
        startYear: string
        endMonth: string
        endYear: string
      }>
      projects: Array<{ projectName: string; description: string; link: string }>
      education: Array<{ schoolName: string; fieldOfStudy: string; startYear: string; endYear: string }>
    }

    interface FieldMapping {
      element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      type: string
      confidence: number
    }

    const MONTHS: Record<string, string> = {
      '1':'january','01':'january','2':'february','02':'february','3':'march','03':'march',
      '4':'april','04':'april','5':'may','05':'may','6':'june','06':'june',
      '7':'july','07':'july','8':'august','08':'august','9':'september','09':'september',
      '10':'october','11':'november','12':'december',
    }


    function findLabelForElement(element: HTMLElement): string {
      const sources: string[] = []
      if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
        if (label) sources.push(label.textContent || '')
      }
      const parentLabel = element.closest('label')
      if (parentLabel) sources.push(parentLabel.textContent || '')
      const prev = element.previousElementSibling
      if (prev && ['LABEL','SPAN','P','DIV'].includes(prev.tagName)) sources.push(prev.textContent || '')
      const parent = element.parentElement
      if (parent) {
        parent.querySelectorAll('label, span[class*="label"], div[class*="label"], p').forEach(el => sources.push(el.textContent || ''))
      }
      const wrapper = element.closest('div, fieldset, li, section')
      if (wrapper) {
        const wl = wrapper.querySelector('label, legend, span[class*="label"], div[class*="label"]')
        if (wl) sources.push(wl.textContent || '')
      }
      return sources.join(' ').toLowerCase().replace(/\s+/g, ' ').trim()
    }


    function detectFieldType(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): { type: string; confidence: number } {
      const id = element.id?.toLowerCase() || ''
      const name = element.name?.toLowerCase() || ''
      const placeholder = (element as HTMLInputElement).placeholder?.toLowerCase() || ''
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
      const dataAttr = (element.getAttribute('data-field') || element.getAttribute('data-testid') || element.getAttribute('data-cy') || '').toLowerCase()
      const autocomplete = element.getAttribute('autocomplete')?.toLowerCase() || ''
      const label = findLabelForElement(element)
      const combined = `${id} ${name} ${placeholder} ${ariaLabel} ${label} ${dataAttr} ${autocomplete}`

      const patterns = [
        { keywords: ['fullname','full-name','full_name','yourname','your-name','applicantname','candidatename'], type: 'fullName', confidence: 0.9 },
        { keywords: ['firstname','first-name','first_name','fname','given-name','givenname','forename','first name','given name'], type: 'firstName', confidence: 0.95 },
        { keywords: ['lastname','last-name','last_name','lname','surname','family-name','familyname','family name','last name'], type: 'lastName', confidence: 0.95 },
        { keywords: ['email','e-mail','emailaddress','email address','email-address','mail'], type: 'email', confidence: 0.95 },
        { keywords: ['phone','telephone','mobile','phonenumber','phone-number','phone number','cell phone','contact number','tel'], type: 'phone', confidence: 0.9 },
        { keywords: ['countrycode','country-code','country_code','dialcode','dial-code','dial code','calling code','isd'], type: 'countryCode', confidence: 0.9 },
        { keywords: ['phone type','phonetype','number type','type of phone','contact type','phone device type'], type: 'phoneType', confidence: 0.85 },
        { keywords: ['streetaddress','street-address','address1','address-line-1','addressline1','address line 1','addr1','mailing address','street','address'], type: 'streetAddress', confidence: 0.85 },
        { keywords: ['city','town','suburb','municipality'], type: 'city', confidence: 0.9 },
        { keywords: ['zipcode','zip-code','zip','postalcode','postal-code','postcode','postal code'], type: 'zipCode', confidence: 0.85 },
        { keywords: ['state','province','region','county'], type: 'state', confidence: 0.75 },
        { keywords: ['country','nation','country of residence','country of origin','citizenship','nationality','home country','location country'], type: 'country', confidence: 0.9 },
        { keywords: ['location','residence','based in','current location','preferred location','work location','where are you located'], type: 'location', confidence: 0.8 },
        { keywords: ['summary','professional summary','about me','about yourself','bio','profile','objective','introduction','describe yourself','tell us about yourself','personal statement'], type: 'professionalSummary', confidence: 0.75 },
        { keywords: ['cover letter','covering letter','motivation letter','motivational letter','letter of motivation','why do you want','why are you interested'], type: 'coverLetter', confidence: 0.85 },
        { keywords: ['skill','skills','expertise','competencies','technologies','tech stack','tools','technical skills','key skills'], type: 'skills', confidence: 0.75 },
        { keywords: ['jobtitle','job-title','job title','currenttitle','current title','current job title','desired title'], type: 'jobTitle', confidence: 0.9 },
        { keywords: ['title'], type: 'jobTitle', confidence: 0.7 },
        { keywords: ['industry'], type: 'industry', confidence: 0.75 },
        { keywords: ['company','employer','organization','organisation','current company','current employer','workplace'], type: 'companyName', confidence: 0.85 },
        { keywords: ['start month','startmonth','start-month','from month'], type: 'expStartMonth', confidence: 0.9 },
        { keywords: ['start year','startyear','start-year','from year','year started'], type: 'expStartYear', confidence: 0.9 },
        { keywords: ['end month','endmonth','end-month','to month'], type: 'expEndMonth', confidence: 0.9 },
        { keywords: ['end year','endyear','end-year','to year','year ended','year finished'], type: 'expEndYear', confidence: 0.9 },
        { keywords: ['highest education','level of education','education level','degree level','highest degree'], type: 'highestEdu', confidence: 0.9 },
        { keywords: ['school','university','college','institution','alma mater'], type: 'schoolName', confidence: 0.85 },
        { keywords: ['degree','major','field of study','fieldofstudy','discipline','qualification','program','area of study'], type: 'fieldOfStudy', confidence: 0.8 },
        { keywords: ['graduation year','grad year','year of graduation','completed year'], type: 'eduEndYear', confidence: 0.85 },
        { keywords: ['enrollment year','enrolment year','year enrolled'], type: 'eduStartYear', confidence: 0.8 },
        { keywords: ['project name','projectname','project title'], type: 'projectName', confidence: 0.75 },
        { keywords: ['linkedin','linkedin url','linkedin profile'], type: 'linkedin', confidence: 0.95 },
        { keywords: ['github','github url','github profile'], type: 'github', confidence: 0.95 },
        { keywords: ['website','personal website','portfolio url','portfolio link','personal url','your website'], type: 'website', confidence: 0.75 },
        { keywords: ['salary','expected salary','desired salary','compensation','salary expectation','base salary','rate'], type: 'salary', confidence: 0.85 },
        { keywords: ['currency','salary currency','pay currency'], type: 'salaryCurrency', confidence: 0.8 },
        { keywords: ['salary type','pay type','pay period','compensation type'], type: 'salaryType', confidence: 0.8 },
        { keywords: ['language','languages spoken','language proficiency'], type: 'language', confidence: 0.75 },
        { keywords: ['language level','proficiency','fluency'], type: 'languageLevel', confidence: 0.75 },
        { keywords: ['availability','start date','available from','when can you start','notice period'], type: 'availability', confidence: 0.85 },
        { keywords: ['years of experience','experience years','how many years','total experience','years experience'], type: 'yearsOfExperience', confidence: 0.85 },
        { keywords: ['work authorization','authorized to work','visa status','right to work','work permit','eligible to work'], type: 'workAuth', confidence: 0.85 },
        { keywords: ['willing to relocate','open to relocate','relocation','relocate'], type: 'relocation', confidence: 0.8 },
        { keywords: ['gender','sex'], type: 'gender', confidence: 0.8 },
        { keywords: ['race','ethnicity','ethnic'], type: 'ethnicity', confidence: 0.8 },
        { keywords: ['veteran','military','armed forces'], type: 'veteran', confidence: 0.8 },
        { keywords: ['disability','disabled','impairment'], type: 'disability', confidence: 0.8 },
        { keywords: ['how did you hear','referral source','where did you hear'], type: 'referralSource', confidence: 0.8 },
      ]

      for (const pattern of patterns) {
        for (const keyword of pattern.keywords) {
          if (combined.includes(keyword)) {
            if (keyword === 'name') {
              if (combined.includes('first') || combined.includes('last') || combined.includes('full') || combined.includes('company') || combined.includes('school')) continue
            }
            if (keyword === 'title') {
              if (combined.includes('job') || combined.includes('current') || combined.includes('desired')) return { type: 'jobTitle', confidence: 0.9 }
              if (combined.includes('mr') || combined.includes('ms') || combined.includes('dr') || combined.includes('salutation')) continue
            }
            return { type: pattern.type, confidence: pattern.confidence }
          }
        }
      }

      if (/\bname\b/.test(combined)) {
        if (!combined.includes('first') && !combined.includes('last') && !combined.includes('company') && !combined.includes('school') && !combined.includes('file')) {
          return { type: 'fullName', confidence: 0.7 }
        }
      }

      return { type: 'unknown', confidence: 0 }
    }

    function getAllFormFields(): FieldMapping[] {
      const fields: FieldMapping[] = []
      document.querySelectorAll(
        'input:not([type="submit"]):not([type="button"]):not([type="hidden"]):not([type="file"]):not([type="image"]):not([type="reset"]):not([type="checkbox"]), textarea, select'
      ).forEach((element) => {
        if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLSelectElement)) return
        const { type, confidence } = detectFieldType(element)
        if (confidence > 0.5) fields.push({ element, type, confidence })
      })
      return fields
    }


    function fillField(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
      if (!value) return
      element.focus()
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      const setter = element instanceof HTMLInputElement ? inputSetter : textareaSetter
      if (setter) setter.call(element, value)
      else element.value = value
      const opts = { bubbles: true, cancelable: true, composed: true }
      element.dispatchEvent(new Event('input', opts))
      element.dispatchEvent(new Event('change', opts))
      element.dispatchEvent(new InputEvent('input', { ...opts, data: value }))
      element.dispatchEvent(new KeyboardEvent('keydown', { ...opts, key: 'Enter' }))
      element.blur()
    }


    function fillDateInput(element: HTMLInputElement, year: string, month?: string, day?: string) {
      if (!year) return
      const m = (month || '01').padStart(2, '0')
      const d = (day || '01').padStart(2, '0')
      const value = `${year}-${m}-${d}`
      fillField(element, value)
    }


    function fillDropdown(element: HTMLSelectElement, value: string): boolean {
      if (!value) return false
      const normalized = value.toLowerCase().trim()
      const options = Array.from(element.options)
      let match = options.find(o => o.text.toLowerCase().trim() === normalized || o.value.toLowerCase().trim() === normalized)
      if (!match) match = options.find(o => { const t = o.text.toLowerCase().trim(); return t.length > 1 && (normalized.includes(t) || t.includes(normalized)) })
      if (!match) match = options.find(o => { const v = o.value.toLowerCase().trim(); return v.length > 1 && (normalized.includes(v) || v.includes(normalized)) })
      if (!match && normalized.length > 3) match = options.find(o => o.text.toLowerCase().trim().startsWith(normalized.substring(0, 4)))
      if (match) {
        element.value = match.value
        element.dispatchEvent(new Event('change', { bubbles: true }))
        element.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }
      return false
    }

    function fillMonthDropdown(element: HTMLSelectElement, monthValue: string): boolean {
      if (!monthValue) return false
      const monthName = MONTHS[monthValue] || monthValue.toLowerCase()
      const monthNum = monthValue.padStart(2, '0')
      const options = Array.from(element.options)
      const match = options.find(o => {
        const t = o.text.toLowerCase().trim()
        const v = o.value.toLowerCase().trim()
        return t === monthName || v === monthValue || v === monthNum || t.startsWith(monthName.substring(0, 3))
      })
      if (match) {
        element.value = match.value
        element.dispatchEvent(new Event('change', { bubbles: true }))
        element.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }
      return false
    }

    function fillEducationDropdown(element: HTMLSelectElement, value: string): boolean {
      if (!value) return false
      const val = value.toLowerCase()
      const match = Array.from(element.options).find(o => {
        const t = o.text.toLowerCase()
        return t.includes(val) ||
          (val.includes('bachelor') && t.includes('bachelor')) ||
          (val.includes('master') && t.includes('master')) ||
          ((val.includes('phd') || val.includes('doctor')) && (t.includes('doctor') || t.includes('phd')))
      })
      if (match) { element.value = match.value; element.dispatchEvent(new Event('change', { bubbles: true })); return true }
      return false
    }

    function fillYearsDropdown(element: HTMLSelectElement, years: string): boolean {
      if (!years) return false
      const num = parseInt(years)
      const match = Array.from(element.options).find(o => {
        const t = o.text.toLowerCase()
        if (t.includes(years)) return true
        const nums = t.match(/\d+/g)
        if (nums) {
          const first = parseInt(nums[0])
          if (nums.length === 1 && t.includes('+') && num >= first) return true
          if (nums.length === 2 && num >= first && num <= parseInt(nums[1])) return true
        }
        return false
      })
      if (match) { element.value = match.value; element.dispatchEvent(new Event('change', { bubbles: true })); return true }
      return false
    }


    function fillRadioGroup(name: string, value: string) {
      if (!name || !value) return
      const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)
      if (!radios.length) return
      const normalized = value.toLowerCase().trim()
      let matched: HTMLInputElement | undefined
      radios.forEach(radio => {
        const lbl = findLabelForElement(radio).toLowerCase()
        const val = radio.value.toLowerCase().trim()
        if (val === normalized || lbl.includes(normalized) || normalized.includes(val)) matched = radio
      })
      if (matched) {
        matched.checked = true
        matched.dispatchEvent(new Event('change', { bubbles: true }))
        matched.dispatchEvent(new Event('click', { bubbles: true }))
      }
    }

    function handleRadioButtons(resumeData: ResumeData) {
      const groups = new Map<string, string>()
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(radio => {
        if (!radio.name || groups.has(radio.name)) return
        const lbl = findLabelForElement(radio).toLowerCase()
        const nm = radio.name.toLowerCase()
        const combined = `${lbl} ${nm}`
        if (combined.includes('phone type') || combined.includes('contact type')) groups.set(radio.name, 'home')
        else if (combined.includes('work auth') || combined.includes('authorized') || combined.includes('eligible')) groups.set(radio.name, 'yes')
        else if (combined.includes('relocat')) groups.set(radio.name, 'yes')
        else if (combined.includes('gender') && resumeData.gender) groups.set(radio.name, resumeData.gender)
        else if (combined.includes('veteran')) groups.set(radio.name, resumeData.veteran || 'no')
        else if (combined.includes('disability')) groups.set(radio.name, resumeData.disability || 'no')
        else if (combined.includes('ethnicity') || combined.includes('race')) groups.set(radio.name, resumeData.ethnicity || '')
      })
      groups.forEach((value, name) => value && fillRadioGroup(name, value))
    }


    async function fetchAndUploadFile(element: HTMLInputElement, endpoint: string, fileName: string): Promise<boolean> {
      try {
        const stored = await chrome.storage.local.get(['auth_token', 'api_url'])
        const token = stored.auth_token
        const API_URL = stored.api_url
        if (!token || !API_URL) return false

        const response: any = await chrome.runtime.sendMessage({
          action: 'proxyFetchFile',
          url: `${API_URL}${endpoint}`,
          token,
        })
        if (!response?.success) return false

        const res = await fetch(response.base64)
        const blob = await res.blob()
        const file = new File([blob], fileName, { type: 'application/pdf' })
        const dt = new DataTransfer()
        dt.items.add(file)
        element.files = dt.files
        element.dispatchEvent(new Event('change', { bubbles: true }))
        element.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      } catch (e) {
        console.error('[RAE] File upload error:', e)
        return false
      }
    }

    async function handleAllFileInputs(resumeData: ResumeData, cvAvailable: boolean) {
      const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))

      document.querySelectorAll<HTMLElement>('button, [role="button"], a').forEach(btn => {
        const txt = btn.textContent?.toLowerCase().trim() || ''
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || ''
        const combined = `${txt} ${ariaLabel}`
        if ((combined.includes('add file') || combined.includes('attach file') || combined.includes('upload file') || combined.includes('choose file')) && !combined.includes('remove')) {
          const nearbyInput = btn.closest('div, section, form')?.querySelector('input[type="file"]')
          if (nearbyInput && nearbyInput instanceof HTMLInputElement && !fileInputs.includes(nearbyInput)) {
            fileInputs.push(nearbyInput)
          }
        }
      })

      let resumeUploaded = false
      let cvUploaded = false

      for (const input of fileInputs) {
        const lbl = findLabelForElement(input).toLowerCase()
        const id = input.id?.toLowerCase() || ''
        const nm = input.name?.toLowerCase() || ''
        const combined = `${lbl} ${id} ${nm}`

        const isResume = combined.includes('resume') || combined.includes('cv') || combined.includes('curriculum')
        const isCoverLetter = combined.includes('cover') || combined.includes('letter') || combined.includes('motivation')

        if (isCoverLetter && cvAvailable && !cvUploaded) {
          const ok = await fetchAndUploadFile(input, '/api/cv/view', 'cover-letter.pdf')
          if (ok) cvUploaded = true
        } else if (isResume && !resumeUploaded) {
          const ok = await fetchAndUploadFile(input, '/api/resume/view', 'resume.pdf')
          if (ok) resumeUploaded = true
        }
      }

      for (const input of fileInputs) {
        if (input.files && input.files.length > 0) continue
        const accept = input.accept?.toLowerCase() || ''
        const lbl = findLabelForElement(input).toLowerCase()
        if ((accept.includes('pdf') || accept === '' || accept.includes('*')) && !resumeUploaded) {
          const ok = await fetchAndUploadFile(input, '/api/resume/view', 'resume.pdf')
          if (ok) { resumeUploaded = true; continue }
        }
        if (cvAvailable && !cvUploaded) {
          const ok = await fetchAndUploadFile(input, '/api/cv/view', 'cover-letter.pdf')
          if (ok) cvUploaded = true
        }
      }
    }


    async function clickAddAndFill(sectionType: 'experience' | 'education', data: ResumeData) {
      const addKeywords: Record<string, string[]> = {
        experience: ['add experience','add work','add job','add position','add employment','+ experience','+ work'],
        education:  ['add education','add school','add degree','add qualification','+ education'],
      }
      const keywords = addKeywords[sectionType]
      const btn = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]')).find(b => {
        const txt = b.textContent?.toLowerCase().trim() || ''
        return keywords.some(k => txt.includes(k))
      })
      if (!btn) return

      const beforeCount = document.querySelectorAll('input, textarea, select').length
      btn.click()
      await new Promise(r => setTimeout(r, 800))
      const afterCount = document.querySelectorAll('input, textarea, select').length
      if (afterCount > beforeCount) {
        await fillAllFields(data, false)
      }
    }


    async function fillAllFields(resumeData: ResumeData, handleFiles: boolean): Promise<number> {
      const fields = getAllFormFields()
      let filledCount = 0

      const fullName = `${resumeData.firstName} ${resumeData.lastName}`.trim()
      const latestExp = resumeData.experience?.[0]
      const latestEdu = resumeData.education?.[0]
      const latestProject = resumeData.projects?.[0]
      const locationStr = resumeData.location || [resumeData.city, resumeData.country].filter(Boolean).join(', ')

      const websiteUrl = resumeData.portfolio || resumeData.github || resumeData.linkedin || latestProject?.link || ''

      const totalExpYears = (() => {
        let months = 0
        resumeData.experience?.forEach(exp => {
          const start = parseInt(exp.startYear) * 12 + (parseInt(exp.startMonth) || 1)
          const isPresent = !exp.endYear || exp.endYear.toLowerCase().includes('present')
          const ey = isPresent ? new Date().getFullYear() : parseInt(exp.endYear)
          const em = isPresent ? new Date().getMonth() + 1 : (parseInt(exp.endMonth) || 1)
          const end = ey * 12 + em
          if (!isNaN(end - start)) months += end - start
        })
        return String(Math.max(0, Math.floor(months / 12)))
      })()

      const salaryDisplay = resumeData.salaryAmount
        ? `${resumeData.salaryAmount} ${resumeData.salaryCurrency || ''}`.trim()
        : ''

      const valueMap: Record<string, string> = {
        fullName:            fullName,
        firstName:           resumeData.firstName,
        lastName:            resumeData.lastName,
        email:               resumeData.email,
        phone:               resumeData.phone,
        countryCode:         resumeData.countryCode || '',
        phoneNumber:         resumeData.phoneNumber || resumeData.phone,
        phoneType:           'Home',
        streetAddress:       resumeData.streetAddress,
        city:                resumeData.city,
        state:               resumeData.state || '',
        zipCode:             resumeData.zipCode || '',
        country:             resumeData.country,
        location:            locationStr,
        professionalSummary: resumeData.professionalSummary,
        coverLetter:         resumeData.professionalSummary, 
        skills:              Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : '',
        jobTitle:            latestExp?.jobTitle || '',
        industry:            latestExp?.companyName || latestExp?.jobTitle || '',
        companyName:         latestExp?.companyName || '',
        expStartMonth:       latestExp?.startMonth || '',
        expStartYear:        latestExp?.startYear || '',
        expEndMonth:         latestExp?.endMonth || '',
        expEndYear:          latestExp?.endYear || '',
        schoolName:          latestEdu?.schoolName || '',
        fieldOfStudy:        latestEdu?.fieldOfStudy || '',
        eduStartYear:        latestEdu?.startYear || '',
        eduEndYear:          latestEdu?.endYear || '',
        highestEdu:          latestEdu?.fieldOfStudy || '',
        projectName:         latestProject?.projectName || '',
        linkedin:            resumeData.linkedin || '',
        github:              resumeData.github || '',
        website:             websiteUrl,
        salary:              resumeData.salaryAmount || '',
        salaryCurrency:      resumeData.salaryCurrency || 'USD',
        salaryType:          resumeData.salaryType || 'monthly',
        language:            resumeData.languages?.[0]?.language || '',
        languageLevel:       resumeData.languages?.[0]?.level || '',
        availability:        resumeData.availability || '',
        yearsOfExperience:   totalExpYears,
        workAuth:            'Yes',
        relocation:          'Yes',
        gender:              resumeData.gender || '',
        ethnicity:           resumeData.ethnicity || '',
        veteran:             resumeData.veteran || 'No',
        disability:          resumeData.disability || 'No',
        referralSource:      '',
      }

      for (const { element, type } of fields) {
        const value = valueMap[type]
        if (!value) continue

        if (element instanceof HTMLInputElement && element.type === 'date') {
          if (type === 'expStartYear' && latestExp?.startYear) {
            fillDateInput(element, latestExp.startYear, latestExp.startMonth || '01')
          } else if (type === 'expEndYear' && latestExp?.endYear) {
            fillDateInput(element, latestExp.endYear, latestExp.endMonth || '12')
          } else if (type === 'eduStartYear' && latestEdu?.startYear) {
            fillDateInput(element, latestEdu.startYear, '09')
          } else if (type === 'eduEndYear' && latestEdu?.endYear) {
            fillDateInput(element, latestEdu.endYear, '05')
          } else {
            fillDateInput(element, value)
          }
          filledCount++
        } else if (element instanceof HTMLSelectElement) {
          let ok = false
          if (type === 'expStartMonth' || type === 'expEndMonth') ok = fillMonthDropdown(element, value)
          else if (type === 'highestEdu') ok = fillEducationDropdown(element, value)
          else if (type === 'yearsOfExperience') ok = fillYearsDropdown(element, value)
          else ok = fillDropdown(element, value)
          if (ok) filledCount++
        } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          fillField(element, value)
          filledCount++
        }
      }

      return filledCount
    }


    async function autofillForm(resumeData: ResumeData, cvAvailable: boolean): Promise<number> {
      let filledCount = await fillAllFields(resumeData, false)

      await new Promise(r => setTimeout(r, 300))

      await clickAddAndFill('experience', resumeData)
      await clickAddAndFill('education', resumeData)

      await new Promise(r => setTimeout(r, 300))
      handleRadioButtons(resumeData)

      await new Promise(r => setTimeout(r, 200))
      await handleAllFileInputs(resumeData, cvAvailable)

      return filledCount
    }


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'autofill') {
        autofillForm(message.resumeData, message.cvAvailable).then(filledCount => {
          sendResponse({ success: true, filledCount })
        })
        return true
      }
      if (message.action === 'detectFields') {
        sendResponse({ success: true, fieldCount: getAllFormFields().length })
        return true
      }
    })

    console.log('[RAE] Autofill content script loaded')
  }
})