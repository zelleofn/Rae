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
      github: string;    
      linkedin: string;  
      portfolio: string;
    }

    interface FieldMapping {
      element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      type: string
      confidence: number
    }

    const MONTHS: Record<string, string> = {
      '1': 'january', '01': 'january',
      '2': 'february', '02': 'february',
      '3': 'march', '03': 'march',
      '4': 'april', '04': 'april',
      '5': 'may', '05': 'may',
      '6': 'june', '06': 'june',
      '7': 'july', '07': 'july',
      '8': 'august', '08': 'august',
      '9': 'september', '09': 'september',
      '10': 'october',
      '11': 'november',
      '12': 'december',
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
      if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
        sources.push(prev.textContent || '')
      }

      const parent = element.parentElement
      if (parent) {
        const nearby = parent.querySelectorAll('label, span[class*="label"], div[class*="label"], p')
        nearby.forEach(el => sources.push(el.textContent || ''))
      }

      const wrapper = element.closest('div, fieldset, li, section')
      if (wrapper) {
        const wrapperLabel = wrapper.querySelector('label, legend, span[class*="label"], div[class*="label"]')
        if (wrapperLabel) sources.push(wrapperLabel.textContent || '')
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
        
        { keywords: ['fullname', 'full-name', 'full_name', 'yourname', 'your-name', 'your_name', 'applicantname', 'applicant-name', 'candidatename', 'candidate-name'], type: 'fullName', confidence: 0.9 },

        
        { keywords: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'givenname', 'forename', 'first name', 'given name'], type: 'firstName', confidence: 0.95 },
        { keywords: ['lastname', 'last-name', 'last_name', 'lname', 'surname', 'family-name', 'familyname', 'family name', 'last name'], type: 'lastName', confidence: 0.95 },

        
        { keywords: ['email', 'e-mail', 'emailaddress', 'email address', 'email-address', 'mail'], type: 'email', confidence: 0.95 },
        { keywords: ['phone', 'telephone', 'mobile', 'phonenumber', 'phone-number', 'phone number', 'cell phone', 'contact number', 'tel'], type: 'phone', confidence: 0.9 },
        { keywords: ['countrycode', 'country-code', 'country_code', 'dialcode', 'dial-code', 'dial code', 'calling code', 'isd'], type: 'countryCode', confidence: 0.9 },
        { keywords: ['phone type', 'phonetype', 'number type', 'type of phone', 'contact type', 'Phone Device Type', 'mobile'], type: 'phoneType', confidence: 0.85 },

        
        { keywords: ['streetaddress', 'addr1', 'mailing address', 'street-address', 'address1', 'address-line-1', 'addressline1', 'address line 1', 'address line1', 'street', 'address'], type: 'streetAddress', confidence: 0.95 },
        { keywords: ['city', 'town', 'suburb', 'municipality'], type: 'city', confidence: 0.9 },
        { keywords: ['zipcode', 'zip-code', 'zip', 'postalcode', 'postal-code', 'postcode', 'postal code'], type: 'zipCode', confidence: 0.85 },
        { keywords: ['state', 'province', 'region', 'county'], type: 'state', confidence: 0.75 },

        
        { keywords: ['country', 'nation', 'country of residence', 'country of origin', 'country name', 'where do you live', 'resident of', 'home country', 'citizenship', 'nationality', 'location country'], type: 'country', confidence: 0.95 },
        { keywords: ['location', 'residence', 'based in', 'where are you located', 'current location', 'preferred location', 'work location'], type: 'location', confidence: 0.8 },
        { keywords: ['where do you live', 'current residence', 'based in'], type: 'residenceCountry', confidence: 0.9 },

        { keywords: ['summary', 'professional summary', 'about me', 'about yourself', 'bio', 'profile', 'objective', 'introduction', 'describe yourself', 'tell us about yourself', 'personal statement', 'cover letter', 'covering letter'], type: 'professionalSummary', confidence: 0.75 },
        { keywords: ['skill', 'skills', 'expertise', 'competencies', 'competenc', 'technologies', 'tech stack', 'tools', 'technical skills', 'key skills'], type: 'skills', confidence: 0.75 },
        { keywords: ['jobtitle', 'job-title', 'job title', 'currenttitle', 'current title', 'current job title', 'desired title', 'position', 'role', 'your title'], type: 'jobTitle', confidence: 0.85 },
        { keywords: ['company', 'employer', 'organization', 'organisation', 'current company', 'current employer', 'workplace', 'most recent employer'], type: 'companyName', confidence: 0.85 },

        
        { keywords: ['start month', 'startmonth', 'start-month', 'from month', 'beginning month'], type: 'expStartMonth', confidence: 0.9 },
        { keywords: ['start year', 'startyear', 'start-year', 'from year', 'beginning year', 'year started'], type: 'expStartYear', confidence: 0.9 },
        { keywords: ['end month', 'endmonth', 'end-month', 'to month', 'finish month'], type: 'expEndMonth', confidence: 0.9 },
        { keywords: ['end year', 'endyear', 'end-year', 'to year', 'finish year', 'year ended', 'year finished'], type: 'expEndYear', confidence: 0.9 },

        { keywords: ['highest education', 'level of education', 'education level', 'degree level', 'highest degree'], type: 'highestEdu', confidence: 0.9 },
        { keywords: ['school', 'university', 'college', 'institution', 'alma mater', 'school name', 'institution name', 'university name'], type: 'schoolName', confidence: 0.85 },
        { keywords: ['degree', 'major', 'field of study', 'fieldofstudy', 'discipline', 'qualification', 'course of study', 'program', 'area of study'], type: 'fieldOfStudy', confidence: 0.8 },
        { keywords: ['graduation year', 'grad year', 'year of graduation', 'completed year', 'year completed'], type: 'eduEndYear', confidence: 0.85 },
        { keywords: ['enrollment year', 'enrolment year', 'year enrolled', 'start year of study'], type: 'eduStartYear', confidence: 0.8 },

        { keywords: ['project name', 'projectname', 'project title'], type: 'projectName', confidence: 0.75 },

        { keywords: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin '], type: 'linkedin', confidence: 0.95 },
        { keywords: ['github', 'github url', 'github profile', 'github link'], type: 'github', confidence: 0.95 },
        { keywords: ['website', 'personal website', 'portfolio url', 'portfolio link', 'personal url', 'your website', 'link'], type: 'website', confidence: 0.75 },
        { keywords: ['other', 'additional', 'supporting document', 'attachment'], type: 'additionalFile', confidence: 0.7 },
        { keywords: ['salary', 'expected salary', 'desired salary', 'compensation', 'expected compensation', 'salary expectation', 'rate', 'base salary'], type: 'salary', confidence: 0.85 },
        { keywords: ['years of experience', 'experience years', 'how many years', 'total experience', 'years experience'], type: 'yearsOfExperience', confidence: 0.85 },
        { keywords: ['work authorization', 'work authorisation', 'authorized to work', 'visa status', 'right to work', 'work permit', 'eligible to work'], type: 'workAuth', confidence: 0.85 },
        { keywords: ['willing to relocate', 'open to relocate', 'relocation', 'relocate'], type: 'relocation', confidence: 0.8 },
        { keywords: ['gender', 'sex'], type: 'gender', confidence: 0.8 },
        { keywords: ['race', 'ethnicity', 'ethnic'], type: 'ethnicity', confidence: 0.8 },
        { keywords: ['veteran', 'military', 'armed forces'], type: 'veteran', confidence: 0.8 },
        { keywords: ['disability', 'disabled', 'impairment'], type: 'disability', confidence: 0.8 },
        { keywords: ['how did you hear', 'how did you find', 'referral source', 'where did you hear'], type: 'referralSource', confidence: 0.8 },
      ]

      for (const pattern of patterns) {
        for (const keyword of pattern.keywords) {
          if (combined.includes(keyword)) {
            if (keyword === 'name') {
              if (combined.includes('first') || combined.includes('last') || combined.includes('full') || combined.includes('company') || combined.includes('school') || combined.includes('project')) continue
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
      const inputs = document.querySelectorAll(
        'input:not([type="submit"]):not([type="button"]):not([type="hidden"]):not([type="file"]):not([type="image"]):not([type="reset"]), textarea, select'
      )

      inputs.forEach((element) => {
        if (
          !(element instanceof HTMLInputElement) &&
          !(element instanceof HTMLTextAreaElement) &&
          !(element instanceof HTMLSelectElement)
        ) return

        const { type, confidence } = detectFieldType(element)
        if (confidence > 0.5) {
          fields.push({ element, type, confidence })
        }
      })

      return fields
    }


 function fillField(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  if (!value) return;

  element.focus();

 
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  const setter = element instanceof HTMLInputElement ? nativeInputValueSetter : nativeTextAreaValueSetter;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  
  const eventOptions = { bubbles: true, cancelable: true, composed: true };
  
  element.dispatchEvent(new Event('input', eventOptions));
  element.dispatchEvent(new Event('change', eventOptions));
  element.dispatchEvent(new KeyboardEvent('keydown', { ...eventOptions, key: 'Enter' }));
  
  
  element.blur();
}

    
function fillDropdown(element: HTMLSelectElement, value: string): boolean {
  if (!value) return false;

  const normalized = value.toLowerCase().trim();
  const options = Array.from(element.options);

 
  let match = options.find(opt => 
    opt.text.toLowerCase().trim() === normalized || 
    opt.value.toLowerCase().trim() === normalized
  );

  if (!match) {
    match = options.find(opt => {
      const t = opt.text.toLowerCase().trim();
      return t.length > 1 && (normalized.includes(t) || t.includes(normalized));
    });
  }

  if (!match && normalized.length > 3) {
    match = options.find(opt => 
      opt.text.toLowerCase().trim().startsWith(normalized.substring(0, 3))
    );
  }

  if (match) {
    element.value = match.value;
    const eventOptions = { bubbles: true, cancelable: true };
    element.dispatchEvent(new Event('change', eventOptions));
    element.dispatchEvent(new Event('input', eventOptions));
    return true;
  }

  return false;
}
function fillEducationDropdown(element: HTMLSelectElement, value: string): boolean {
  if (!value) return false;
  const options = Array.from(element.options);
  const val = value.toLowerCase();

 
  const match = options.find(opt => {
    const text = opt.text.toLowerCase();
    return text.includes(val) || 
           (val.includes('bachelor') && text.includes('bachelor')) ||
           (val.includes('master') && text.includes('master')) ||
           (val.includes('phd') && text.includes('doctorate'));
  });

  if (match) {
    element.value = match.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

function fillExperienceDropdown(element: HTMLSelectElement, years: string): boolean {
  if (!years) return false;
  const options = Array.from(element.options);
  const numYears = parseInt(years);

  const match = options.find(opt => {
    const text = opt.text.toLowerCase();
    if (text.includes(years)) return true;
    
    
    const numbers = text.match(/\d+/g);
    if (numbers) {
      const first = parseInt(numbers[0]);
      if (numbers.length === 1 && text.includes('+') && numYears >= first) return true;
      if (numbers.length === 2) {
        const second = parseInt(numbers[1]);
        return numYears >= first && numYears <= second;
      }
    }
    return false;
  });

  if (match) {
    element.value = match.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

    function fillMonthDropdown(element: HTMLSelectElement, monthValue: string): boolean {
      if (!monthValue) return false
      const monthName = MONTHS[monthValue] || monthValue.toLowerCase()
      const monthNum = monthValue.padStart(2, '0')
      const options = Array.from(element.options)

      const match = options.find(opt => {
        const t = opt.text.toLowerCase().trim()
        const v = opt.value.toLowerCase().trim()
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

   

    function fillRadioGroup(name: string, value: string) {
      if (!name || !value) return
      const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)
      if (!radios.length) return

      const normalized = value.toLowerCase().trim()
      let matched: HTMLInputElement | undefined

      radios.forEach(radio => {
        const radioLabel = findLabelForElement(radio).toLowerCase()
        const radioVal = radio.value.toLowerCase().trim()
        if (radioVal === normalized || radioLabel.includes(normalized) || normalized.includes(radioVal)) {
          matched = radio
        }
      })

      if (matched) {
        matched.checked = true
        matched.dispatchEvent(new Event('change', { bubbles: true }))
        matched.dispatchEvent(new Event('click', { bubbles: true }))
      }
    }

    function handleRadioButtons(resumeData: ResumeData) {
      const radioGroups = new Map<string, string>()

      
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(radio => {
        if (radio.name && !radioGroups.has(radio.name)) {
          const groupLabel = findLabelForElement(radio).toLowerCase()
          const groupName = radio.name.toLowerCase()
          const combined = `${groupLabel} ${groupName}`

          if (combined.includes('phone type') || combined.includes('type of phone') || combined.includes('contact type')) {
            radioGroups.set(radio.name, 'home')
          } else if (combined.includes('work auth') || combined.includes('authorized') || combined.includes('eligible')) {
            radioGroups.set(radio.name, 'yes')
          } else if (combined.includes('relocat')) {
            radioGroups.set(radio.name, 'yes')
          } else if (combined.includes('gender')) {
            // don't auto-fill gender
          } else if (combined.includes('veteran')) {
            radioGroups.set(radio.name, 'no')
          } else if (combined.includes('disability')) {
            radioGroups.set(radio.name, 'no')
          }
        }
      })

      radioGroups.forEach((value, name) => fillRadioGroup(name, value))
    }

    


async function fetchAndUploadFile(element: HTMLInputElement, endpoint: string, fileName: string) {
  try {
    const stored = await chrome.storage.local.get(['auth_token', 'api_url']);
    const token = stored.auth_token;
    const API_URL = stored.api_url;

    if (!token || !API_URL) return false;

    const response: any = await chrome.runtime.sendMessage({
      action: 'proxyFetchFile',
      url: `${API_URL}${endpoint}`,
      token: token
    });

    if (!response || !response.success) return false;

    const res = await fetch(response.base64);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    element.files = dataTransfer.files;

    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch (error) {
    console.error(`[RAE] File upload error:`, error);
    return false;
  }
}
async function handleAllFileInputs(cvAvailable: boolean) {
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  
  let resumeUploaded = false;
  let coverLetterUploaded = false;

  for (const fileInput of fileInputs) {
    const label = findLabelForElement(fileInput).toLowerCase();
    const id = fileInput.id?.toLowerCase() || '';
    const name = fileInput.name?.toLowerCase() || '';
    const combined = `${label} ${id} ${name}`;

    const isResume = combined.includes('resume') || combined.includes('cv') || combined.includes('curriculum');
    const isCoverLetter = combined.includes('cover') || combined.includes('letter');

    if (isResume) {
      const success = await fetchAndUploadFile(fileInput, '/api/resume/view', 'resume.pdf');
      if (success) resumeUploaded = true;
    } else if (isCoverLetter && cvAvailable) {
      const success = await fetchAndUploadFile(fileInput, '/api/cv/view', 'cover-letter.pdf');
      if (success) coverLetterUploaded = true;
    }
  }

 
  if (cvAvailable && resumeUploaded && !coverLetterUploaded) {
    for (const fileInput of fileInputs) {
      if (fileInput.files && fileInput.files.length > 0) continue;

      const label = findLabelForElement(fileInput).toLowerCase();
      const id = fileInput.id?.toLowerCase() || '';
      const name = fileInput.name?.toLowerCase() || '';
      const combined = `${label} ${id} ${name}`;

      const isGenericField = combined.includes('other') || 
                             combined.includes('additional') || 
                             combined.includes('supporting') || 
                             combined.includes('attachment') ||
                             combined.includes('portfolio');

      if (isGenericField) {
        const success = await fetchAndUploadFile(fileInput, '/api/cv/view', 'cover-letter.pdf');
        if (success) {
          coverLetterUploaded = true;
          break; 
        }
      }
    }
  }
}

    

    async function autofillForm(resumeData: ResumeData, cvAvailable: boolean) {
  const fields = getAllFormFields();
  let filledCount = 0;

      const fullName = `${resumeData.firstName} ${resumeData.lastName}`.trim()
      const latestExp = resumeData.experience?.[0]
      const latestEdu = resumeData.education?.[0]
      const latestProject = resumeData.projects?.[0]

      const locationStr = resumeData.location ||
        [resumeData.city, resumeData.country].filter(Boolean).join(', ')

      const totalExpYears = (() => {
  let totalMonths = 0;
  resumeData.experience?.forEach(exp => {
    const start = parseInt(exp.startYear) * 12 + (parseInt(exp.startMonth) || 1);
    
    
    const isPresent = !exp.endYear || exp.endYear.toLowerCase().includes('present');
    const endYear = isPresent ? new Date().getFullYear() : parseInt(exp.endYear);
    const endMonth = isPresent ? new Date().getMonth() + 1 : (parseInt(exp.endMonth) || 1);
    
    const end = endYear * 12 + endMonth;
    if (!isNaN(end - start)) totalMonths += (end - start);
  });
  return Math.max(0, Math.floor(totalMonths / 12)).toString();
})();

      const valueMap: Record<string, string> = {
        fullName:             fullName,
        firstName:            resumeData.firstName,
        lastName:             resumeData.lastName,
        email:                resumeData.email,
        phone:                resumeData.phone,
        countryCode:          resumeData.countryCode || '',
        phoneNumber:          resumeData.phoneNumber || resumeData.phone,
        phoneType:            'Home',
        streetAddress:        resumeData.streetAddress,
        city:                 resumeData.city,
        addressLine1: resumeData.streetAddress,
        zipCode:              '',
        state:                '',
        country:              resumeData.country,
        residenceCountry: resumeData.country,
        location: `${resumeData.city}, ${resumeData.country}`,
        professionalSummary:  resumeData.professionalSummary,
        skills:               Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : '',
        jobTitle:             latestExp?.jobTitle || '',
        companyName:          latestExp?.companyName || '',
        expStartMonth:        latestExp?.startMonth || '',
        expStartYear:         latestExp?.startYear || '',
        expEndMonth:          latestExp?.endMonth || '',
        expEndYear:           latestExp?.endYear || '',
        schoolName:           latestEdu?.schoolName || '',
        fieldOfStudy:         latestEdu?.fieldOfStudy || '',
        eduStartYear:         latestEdu?.startYear || '',
        eduEndYear:           latestEdu?.endYear || '',
        highestEdu: latestEdu?.fieldOfStudy || '', 
        yearsOfExperience: totalExpYears,
        projectName:          latestProject?.projectName || '',
        linkedin:             resumeData.linkedin || '',
        github:               resumeData.github || '',
        website:              resumeData.portfolio || latestProject?.link || '',
        salary:               '',
        workAuth:             'Yes',
        relocation:           'Yes',
        referralSource:       '',
        gender:               '',
        ethnicity:            '',
        veteran:              'No',
        disability:           'No',
      }

    for (const { element, type } of fields) {
  let value = valueMap[type];

 
  const labelText = findLabelForElement(element).toLowerCase();
  if (labelText === 'location' || labelText === 'your location') {
    value = valueMap['location']; 
  }


  if (type === 'city' && labelText.includes('address')) {
    value = valueMap['streetAddress'];
  }

 

  if (!value) continue;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
   
    fillField(element, value);
    filledCount++;
  } else if (element instanceof HTMLSelectElement) {
    
    
    let success = false;
   
    if (type === 'highestEdu') {
      success = fillEducationDropdown(element, value);
    } else if (type === 'yearsOfExperience') {
      success = fillExperienceDropdown(element, value);
    } else {
      success = fillDropdown(element, value);
    }
    
    if (success) filledCount++;
  }
}

  
  await new Promise(resolve => setTimeout(resolve, 500));

  
  handleRadioButtons(resumeData);
  await handleAllFileInputs(cvAvailable);

  return filledCount;
}

    

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'autofill') {
        autofillForm(message.resumeData, message.cvAvailable).then(filledCount => {
          sendResponse({ success: true, filledCount })
        })
        return true
      }

      if (message.action === 'detectFields') {
        const fields = getAllFormFields()
        sendResponse({ success: true, fieldCount: fields.length })
        return true
      }
    })

    console.log('[RAE] Autofill content script loaded')
  }
})