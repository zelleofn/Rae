var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_idle",
    main() {
      const MONTHS = {
        "1": "january",
        "01": "january",
        "2": "february",
        "02": "february",
        "3": "march",
        "03": "march",
        "4": "april",
        "04": "april",
        "5": "may",
        "05": "may",
        "6": "june",
        "06": "june",
        "7": "july",
        "07": "july",
        "8": "august",
        "08": "august",
        "9": "september",
        "09": "september",
        "10": "october",
        "11": "november",
        "12": "december"
      };
      function findLabelForElement(element) {
        const sources = [];
        if (element.id) {
          const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
          if (label) sources.push(label.textContent || "");
        }
        const parentLabel = element.closest("label");
        if (parentLabel) sources.push(parentLabel.textContent || "");
        const prev = element.previousElementSibling;
        if (prev && ["LABEL", "SPAN", "P", "DIV"].includes(prev.tagName)) sources.push(prev.textContent || "");
        const parent = element.parentElement;
        if (parent) {
          parent.querySelectorAll('label, span[class*="label"], div[class*="label"], p').forEach((el) => sources.push(el.textContent || ""));
        }
        const wrapper = element.closest("div, fieldset, li, section");
        if (wrapper) {
          const wl = wrapper.querySelector('label, legend, span[class*="label"], div[class*="label"]');
          if (wl) sources.push(wl.textContent || "");
        }
        return sources.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
      }
      function detectFieldType(element) {
        const id = element.id?.toLowerCase() || "";
        const name = element.name?.toLowerCase() || "";
        const placeholder = element.placeholder?.toLowerCase() || "";
        const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
        const dataAttr = (element.getAttribute("data-field") || element.getAttribute("data-testid") || element.getAttribute("data-cy") || "").toLowerCase();
        const autocomplete = element.getAttribute("autocomplete")?.toLowerCase() || "";
        const label = findLabelForElement(element);
        const combined = `${id} ${name} ${placeholder} ${ariaLabel} ${label} ${dataAttr} ${autocomplete}`;
        const patterns = [
          { keywords: ["fullname", "full-name", "full_name", "yourname", "your-name", "applicantname", "candidatename"], type: "fullName", confidence: 0.9 },
          { keywords: ["firstname", "first-name", "first_name", "fname", "given-name", "givenname", "forename", "first name", "given name"], type: "firstName", confidence: 0.95 },
          { keywords: ["lastname", "last-name", "last_name", "lname", "surname", "family-name", "familyname", "family name", "last name"], type: "lastName", confidence: 0.95 },
          { keywords: ["email", "e-mail", "emailaddress", "email address", "email-address", "mail"], type: "email", confidence: 0.95 },
          { keywords: ["phone", "telephone", "mobile", "phonenumber", "phone-number", "phone number", "cell phone", "contact number", "tel"], type: "phone", confidence: 0.9 },
          { keywords: ["countrycode", "country-code", "country_code", "dialcode", "dial-code", "dial code", "calling code", "isd"], type: "countryCode", confidence: 0.9 },
          { keywords: ["phone type", "phonetype", "number type", "type of phone", "contact type", "phone device type"], type: "phoneType", confidence: 0.85 },
          { keywords: ["streetaddress", "street-address", "address1", "address-line-1", "addressline1", "address line 1", "addr1", "mailing address", "street", "address"], type: "streetAddress", confidence: 0.85 },
          { keywords: ["city", "town", "suburb", "municipality"], type: "city", confidence: 0.9 },
          { keywords: ["zipcode", "zip-code", "zip", "postalcode", "postal-code", "postcode", "postal code"], type: "zipCode", confidence: 0.85 },
          { keywords: ["state", "province", "region", "county"], type: "state", confidence: 0.75 },
          { keywords: ["country", "nation", "country of residence", "country of origin", "citizenship", "nationality", "home country", "location country"], type: "country", confidence: 0.9 },
          { keywords: ["location", "residence", "based in", "current location", "preferred location", "work location", "where are you located"], type: "location", confidence: 0.8 },
          { keywords: ["summary", "professional summary", "about me", "about yourself", "bio", "profile", "objective", "introduction", "describe yourself", "tell us about yourself", "personal statement"], type: "professionalSummary", confidence: 0.75 },
          { keywords: ["cover letter", "covering letter", "motivation letter", "motivational letter", "letter of motivation", "why do you want", "why are you interested"], type: "coverLetter", confidence: 0.85 },
          { keywords: ["skill", "skills", "expertise", "competencies", "technologies", "tech stack", "tools", "technical skills", "key skills"], type: "skills", confidence: 0.75 },
          { keywords: ["jobtitle", "job-title", "job title", "currenttitle", "current title", "current job title", "desired title"], type: "jobTitle", confidence: 0.9 },
          { keywords: ["title"], type: "jobTitle", confidence: 0.7 },
          { keywords: ["industry"], type: "industry", confidence: 0.75 },
          { keywords: ["company", "employer", "organization", "organisation", "current company", "current employer", "workplace"], type: "companyName", confidence: 0.85 },
          { keywords: ["start month", "startmonth", "start-month", "from month"], type: "expStartMonth", confidence: 0.9 },
          { keywords: ["start year", "startyear", "start-year", "from year", "year started"], type: "expStartYear", confidence: 0.9 },
          { keywords: ["end month", "endmonth", "end-month", "to month"], type: "expEndMonth", confidence: 0.9 },
          { keywords: ["end year", "endyear", "end-year", "to year", "year ended", "year finished"], type: "expEndYear", confidence: 0.9 },
          { keywords: ["highest education", "level of education", "education level", "degree level", "highest degree"], type: "highestEdu", confidence: 0.9 },
          { keywords: ["school", "university", "college", "institution", "alma mater"], type: "schoolName", confidence: 0.85 },
          { keywords: ["degree", "major", "field of study", "fieldofstudy", "discipline", "qualification", "program", "area of study"], type: "fieldOfStudy", confidence: 0.8 },
          { keywords: ["graduation year", "grad year", "year of graduation", "completed year"], type: "eduEndYear", confidence: 0.85 },
          { keywords: ["enrollment year", "enrolment year", "year enrolled"], type: "eduStartYear", confidence: 0.8 },
          { keywords: ["project name", "projectname", "project title"], type: "projectName", confidence: 0.75 },
          { keywords: ["linkedin", "linkedin url", "linkedin profile"], type: "linkedin", confidence: 0.95 },
          { keywords: ["github", "github url", "github profile"], type: "github", confidence: 0.95 },
          { keywords: ["website", "personal website", "portfolio url", "portfolio link", "personal url", "your website"], type: "website", confidence: 0.75 },
          { keywords: ["salary", "expected salary", "desired salary", "compensation", "salary expectation", "base salary", "rate"], type: "salary", confidence: 0.85 },
          { keywords: ["currency", "salary currency", "pay currency"], type: "salaryCurrency", confidence: 0.8 },
          { keywords: ["salary type", "pay type", "pay period", "compensation type"], type: "salaryType", confidence: 0.8 },
          { keywords: ["language", "languages spoken", "language proficiency"], type: "language", confidence: 0.75 },
          { keywords: ["language level", "proficiency", "fluency"], type: "languageLevel", confidence: 0.75 },
          { keywords: ["availability", "start date", "available from", "when can you start", "notice period"], type: "availability", confidence: 0.85 },
          { keywords: ["years of experience", "experience years", "how many years", "total experience", "years experience"], type: "yearsOfExperience", confidence: 0.85 },
          { keywords: ["work authorization", "authorized to work", "visa status", "right to work", "work permit", "eligible to work"], type: "workAuth", confidence: 0.85 },
          { keywords: ["willing to relocate", "open to relocate", "relocation", "relocate"], type: "relocation", confidence: 0.8 },
          { keywords: ["gender", "sex"], type: "gender", confidence: 0.8 },
          { keywords: ["race", "ethnicity", "ethnic"], type: "ethnicity", confidence: 0.8 },
          { keywords: ["veteran", "military", "armed forces"], type: "veteran", confidence: 0.8 },
          { keywords: ["disability", "disabled", "impairment"], type: "disability", confidence: 0.8 },
          { keywords: ["how did you hear", "referral source", "where did you hear"], type: "referralSource", confidence: 0.8 }
        ];
        for (const pattern of patterns) {
          for (const keyword of pattern.keywords) {
            if (combined.includes(keyword)) {
              if (keyword === "name") {
                if (combined.includes("first") || combined.includes("last") || combined.includes("full") || combined.includes("company") || combined.includes("school")) continue;
              }
              if (keyword === "title") {
                if (combined.includes("job") || combined.includes("current") || combined.includes("desired")) return { type: "jobTitle", confidence: 0.9 };
                if (combined.includes("mr") || combined.includes("ms") || combined.includes("dr") || combined.includes("salutation")) continue;
              }
              return { type: pattern.type, confidence: pattern.confidence };
            }
          }
        }
        if (/\bname\b/.test(combined)) {
          if (!combined.includes("first") && !combined.includes("last") && !combined.includes("company") && !combined.includes("school") && !combined.includes("file")) {
            return { type: "fullName", confidence: 0.7 };
          }
        }
        return { type: "unknown", confidence: 0 };
      }
      function getAllFormFields() {
        const fields = [];
        document.querySelectorAll(
          'input:not([type="submit"]):not([type="button"]):not([type="hidden"]):not([type="file"]):not([type="image"]):not([type="reset"]):not([type="checkbox"]), textarea, select'
        ).forEach((element) => {
          if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLSelectElement)) return;
          const { type, confidence } = detectFieldType(element);
          if (confidence > 0.5) fields.push({ element, type, confidence });
        });
        return fields;
      }
      function fillField(element, value) {
        if (!value) return;
        element.focus();
        const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        const setter = element instanceof HTMLInputElement ? inputSetter : textareaSetter;
        if (setter) setter.call(element, value);
        else element.value = value;
        const opts = { bubbles: true, cancelable: true, composed: true };
        element.dispatchEvent(new Event("input", opts));
        element.dispatchEvent(new Event("change", opts));
        element.dispatchEvent(new InputEvent("input", { ...opts, data: value }));
        element.dispatchEvent(new KeyboardEvent("keydown", { ...opts, key: "Enter" }));
        element.blur();
      }
      function fillDateInput(element, year, month, day) {
        if (!year) return;
        const m = (month || "01").padStart(2, "0");
        const d = "01".padStart(2, "0");
        const value = `${year}-${m}-${d}`;
        fillField(element, value);
      }
      function fillDropdown(element, value) {
        if (!value) return false;
        const normalized = value.toLowerCase().trim();
        const options = Array.from(element.options);
        let match = options.find((o) => o.text.toLowerCase().trim() === normalized || o.value.toLowerCase().trim() === normalized);
        if (!match) match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          return t.length > 1 && (normalized.includes(t) || t.includes(normalized));
        });
        if (!match) match = options.find((o) => {
          const v = o.value.toLowerCase().trim();
          return v.length > 1 && (normalized.includes(v) || v.includes(normalized));
        });
        if (!match && normalized.length > 3) match = options.find((o) => o.text.toLowerCase().trim().startsWith(normalized.substring(0, 4)));
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillMonthDropdown(element, monthValue) {
        if (!monthValue) return false;
        const monthName = MONTHS[monthValue] || monthValue.toLowerCase();
        const monthNum = monthValue.padStart(2, "0");
        const options = Array.from(element.options);
        const match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          const v = o.value.toLowerCase().trim();
          return t === monthName || v === monthValue || v === monthNum || t.startsWith(monthName.substring(0, 3));
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillEducationDropdown(element, value) {
        if (!value) return false;
        const val = value.toLowerCase();
        const match = Array.from(element.options).find((o) => {
          const t = o.text.toLowerCase();
          return t.includes(val) || val.includes("bachelor") && t.includes("bachelor") || val.includes("master") && t.includes("master") || (val.includes("phd") || val.includes("doctor")) && (t.includes("doctor") || t.includes("phd"));
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillYearsDropdown(element, years) {
        if (!years) return false;
        const num = parseInt(years);
        const match = Array.from(element.options).find((o) => {
          const t = o.text.toLowerCase();
          if (t.includes(years)) return true;
          const nums = t.match(/\d+/g);
          if (nums) {
            const first = parseInt(nums[0]);
            if (nums.length === 1 && t.includes("+") && num >= first) return true;
            if (nums.length === 2 && num >= first && num <= parseInt(nums[1])) return true;
          }
          return false;
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillRadioGroup(name, value) {
        if (!name || !value) return;
        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        if (!radios.length) return;
        const normalized = value.toLowerCase().trim();
        let matched;
        radios.forEach((radio) => {
          const lbl = findLabelForElement(radio).toLowerCase();
          const val = radio.value.toLowerCase().trim();
          if (val === normalized || lbl.includes(normalized) || normalized.includes(val)) matched = radio;
        });
        if (matched) {
          matched.checked = true;
          matched.dispatchEvent(new Event("change", { bubbles: true }));
          matched.dispatchEvent(new Event("click", { bubbles: true }));
        }
      }
      function handleRadioButtons(resumeData) {
        const groups = /* @__PURE__ */ new Map();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (!radio.name || groups.has(radio.name)) return;
          const lbl = findLabelForElement(radio).toLowerCase();
          const nm = radio.name.toLowerCase();
          const combined = `${lbl} ${nm}`;
          if (combined.includes("phone type") || combined.includes("contact type")) groups.set(radio.name, "home");
          else if (combined.includes("work auth") || combined.includes("authorized") || combined.includes("eligible")) groups.set(radio.name, "yes");
          else if (combined.includes("relocat")) groups.set(radio.name, "yes");
          else if (combined.includes("gender") && resumeData.gender) groups.set(radio.name, resumeData.gender);
          else if (combined.includes("veteran")) groups.set(radio.name, resumeData.veteran || "no");
          else if (combined.includes("disability")) groups.set(radio.name, resumeData.disability || "no");
          else if (combined.includes("ethnicity") || combined.includes("race")) groups.set(radio.name, resumeData.ethnicity || "");
        });
        groups.forEach((value, name) => value && fillRadioGroup(name, value));
      }
      async function fetchAndUploadFile(element, endpoint, fileName) {
        try {
          const stored = await chrome.storage.local.get(["auth_token", "api_url"]);
          const token = stored.auth_token;
          const API_URL = stored.api_url;
          if (!token || !API_URL) return false;
          const response = await chrome.runtime.sendMessage({
            action: "proxyFetchFile",
            url: `${API_URL}${endpoint}`,
            token
          });
          if (!response?.success) return false;
          const res = await fetch(response.base64);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "application/pdf" });
          const dt = new DataTransfer();
          dt.items.add(file);
          element.files = dt.files;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        } catch (e) {
          console.error("[RAE] File upload error:", e);
          return false;
        }
      }
      async function handleAllFileInputs(resumeData, cvAvailable) {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        document.querySelectorAll('button, [role="button"], a').forEach((btn) => {
          const txt = btn.textContent?.toLowerCase().trim() || "";
          const ariaLabel = btn.getAttribute("aria-label")?.toLowerCase() || "";
          const combined = `${txt} ${ariaLabel}`;
          if ((combined.includes("add file") || combined.includes("attach file") || combined.includes("upload file") || combined.includes("choose file")) && !combined.includes("remove")) {
            const nearbyInput = btn.closest("div, section, form")?.querySelector('input[type="file"]');
            if (nearbyInput && nearbyInput instanceof HTMLInputElement && !fileInputs.includes(nearbyInput)) {
              fileInputs.push(nearbyInput);
            }
          }
        });
        let resumeUploaded = false;
        let cvUploaded = false;
        for (const input of fileInputs) {
          const lbl = findLabelForElement(input).toLowerCase();
          const id = input.id?.toLowerCase() || "";
          const nm = input.name?.toLowerCase() || "";
          const combined = `${lbl} ${id} ${nm}`;
          const isResume = combined.includes("resume") || combined.includes("cv") || combined.includes("curriculum");
          const isCoverLetter = combined.includes("cover") || combined.includes("letter") || combined.includes("motivation");
          if (isCoverLetter && cvAvailable && !cvUploaded) {
            const ok = await fetchAndUploadFile(input, "/api/cv/view", "cover-letter.pdf");
            if (ok) cvUploaded = true;
          } else if (isResume && !resumeUploaded) {
            const ok = await fetchAndUploadFile(input, "/api/resume/view", "resume.pdf");
            if (ok) resumeUploaded = true;
          }
        }
        for (const input of fileInputs) {
          if (input.files && input.files.length > 0) continue;
          const accept = input.accept?.toLowerCase() || "";
          findLabelForElement(input).toLowerCase();
          if ((accept.includes("pdf") || accept === "" || accept.includes("*")) && !resumeUploaded) {
            const ok = await fetchAndUploadFile(input, "/api/resume/view", "resume.pdf");
            if (ok) {
              resumeUploaded = true;
              continue;
            }
          }
          if (cvAvailable && !cvUploaded) {
            const ok = await fetchAndUploadFile(input, "/api/cv/view", "cover-letter.pdf");
            if (ok) cvUploaded = true;
          }
        }
      }
      async function clickAddAndFill(sectionType, data) {
        const addKeywords = {
          experience: ["add experience", "add work", "add job", "add position", "add employment", "+ experience", "+ work"],
          education: ["add education", "add school", "add degree", "add qualification", "+ education"]
        };
        const keywords = addKeywords[sectionType];
        const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find((b) => {
          const txt = b.textContent?.toLowerCase().trim() || "";
          return keywords.some((k) => txt.includes(k));
        });
        if (!btn) return;
        const beforeCount = document.querySelectorAll("input, textarea, select").length;
        btn.click();
        await new Promise((r) => setTimeout(r, 800));
        const afterCount = document.querySelectorAll("input, textarea, select").length;
        if (afterCount > beforeCount) {
          await fillAllFields(data);
        }
      }
      async function fillAllFields(resumeData, handleFiles) {
        const fields = getAllFormFields();
        let filledCount = 0;
        const fullName = `${resumeData.firstName} ${resumeData.lastName}`.trim();
        const latestExp = resumeData.experience?.[0];
        const latestEdu = resumeData.education?.[0];
        const latestProject = resumeData.projects?.[0];
        const locationStr = resumeData.location || [resumeData.city, resumeData.country].filter(Boolean).join(", ");
        const websiteUrl = resumeData.portfolio || resumeData.github || resumeData.linkedin || latestProject?.link || "";
        const totalExpYears = (() => {
          let months = 0;
          resumeData.experience?.forEach((exp) => {
            const start = parseInt(exp.startYear) * 12 + (parseInt(exp.startMonth) || 1);
            const isPresent = !exp.endYear || exp.endYear.toLowerCase().includes("present");
            const ey = isPresent ? (/* @__PURE__ */ new Date()).getFullYear() : parseInt(exp.endYear);
            const em = isPresent ? (/* @__PURE__ */ new Date()).getMonth() + 1 : parseInt(exp.endMonth) || 1;
            const end = ey * 12 + em;
            if (!isNaN(end - start)) months += end - start;
          });
          return String(Math.max(0, Math.floor(months / 12)));
        })();
        resumeData.salaryAmount ? `${resumeData.salaryAmount} ${resumeData.salaryCurrency || ""}`.trim() : "";
        const valueMap = {
          fullName,
          firstName: resumeData.firstName,
          lastName: resumeData.lastName,
          email: resumeData.email,
          phone: resumeData.phone,
          countryCode: resumeData.countryCode || "",
          phoneNumber: resumeData.phoneNumber || resumeData.phone,
          phoneType: "Home",
          streetAddress: resumeData.streetAddress,
          city: resumeData.city,
          state: resumeData.state || "",
          zipCode: resumeData.zipCode || "",
          country: resumeData.country,
          location: locationStr,
          professionalSummary: resumeData.professionalSummary,
          coverLetter: resumeData.professionalSummary,
          skills: Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "",
          jobTitle: latestExp?.jobTitle || "",
          industry: latestExp?.companyName || latestExp?.jobTitle || "",
          companyName: latestExp?.companyName || "",
          expStartMonth: latestExp?.startMonth || "",
          expStartYear: latestExp?.startYear || "",
          expEndMonth: latestExp?.endMonth || "",
          expEndYear: latestExp?.endYear || "",
          schoolName: latestEdu?.schoolName || "",
          fieldOfStudy: latestEdu?.fieldOfStudy || "",
          eduStartYear: latestEdu?.startYear || "",
          eduEndYear: latestEdu?.endYear || "",
          highestEdu: latestEdu?.fieldOfStudy || "",
          projectName: latestProject?.projectName || "",
          linkedin: resumeData.linkedin || "",
          github: resumeData.github || "",
          website: websiteUrl,
          salary: resumeData.salaryAmount || "",
          salaryCurrency: resumeData.salaryCurrency || "USD",
          salaryType: resumeData.salaryType || "monthly",
          language: resumeData.languages?.[0]?.language || "",
          languageLevel: resumeData.languages?.[0]?.level || "",
          availability: resumeData.availability || "",
          yearsOfExperience: totalExpYears,
          workAuth: "Yes",
          relocation: "Yes",
          gender: resumeData.gender || "",
          ethnicity: resumeData.ethnicity || "",
          veteran: resumeData.veteran || "No",
          disability: resumeData.disability || "No",
          referralSource: ""
        };
        for (const { element, type } of fields) {
          const value = valueMap[type];
          if (!value) continue;
          if (element instanceof HTMLInputElement && element.type === "date") {
            if (type === "expStartYear" && latestExp?.startYear) {
              fillDateInput(element, latestExp.startYear, latestExp.startMonth || "01");
            } else if (type === "expEndYear" && latestExp?.endYear) {
              fillDateInput(element, latestExp.endYear, latestExp.endMonth || "12");
            } else if (type === "eduStartYear" && latestEdu?.startYear) {
              fillDateInput(element, latestEdu.startYear, "09");
            } else if (type === "eduEndYear" && latestEdu?.endYear) {
              fillDateInput(element, latestEdu.endYear, "05");
            } else {
              fillDateInput(element, value);
            }
            filledCount++;
          } else if (element instanceof HTMLSelectElement) {
            let ok = false;
            if (type === "expStartMonth" || type === "expEndMonth") ok = fillMonthDropdown(element, value);
            else if (type === "highestEdu") ok = fillEducationDropdown(element, value);
            else if (type === "yearsOfExperience") ok = fillYearsDropdown(element, value);
            else ok = fillDropdown(element, value);
            if (ok) filledCount++;
          } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            fillField(element, value);
            filledCount++;
          }
        }
        return filledCount;
      }
      async function autofillForm(resumeData, cvAvailable) {
        let filledCount = await fillAllFields(resumeData);
        await new Promise((r) => setTimeout(r, 300));
        await clickAddAndFill("experience", resumeData);
        await clickAddAndFill("education", resumeData);
        await new Promise((r) => setTimeout(r, 300));
        handleRadioButtons(resumeData);
        await new Promise((r) => setTimeout(r, 200));
        await handleAllFileInputs(resumeData, cvAvailable);
        return filledCount;
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "autofill") {
          autofillForm(message.resumeData, message.cvAvailable).then((filledCount) => {
            sendResponse({ success: true, filledCount });
          });
          return true;
        }
        if (message.action === "detectFields") {
          sendResponse({ success: true, fieldCount: getAllFormFields().length });
          return true;
        }
      });
      console.log("[RAE] Autofill content script loaded");
    }
  });
  const browser$1 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  class WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
    static EVENT_NAME = getUniqueEventName("wxt:locationchange");
  }
  function getUniqueEventName(eventName) {
    return `${browser?.runtime?.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  class ContentScriptContext {
    constructor(contentScriptName, options) {
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName(
      "wxt:content-script-started"
    );
    isTopFrame = window.self === window.top;
    abortController;
    locationWatcher = createLocationWatcher(this);
    receivedMessageIds = /* @__PURE__ */ new Set();
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     *
     * Intervals can be cleared by calling the normal `clearInterval` function.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     *
     * Timeouts can be cleared by calling the normal `setTimeout` function.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelAnimationFrame` function.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     *
     * Callbacks can be canceled by calling the normal `cancelIdleCallback` function.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      target.addEventListener?.(
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      const isScriptStartedEvent = event.data?.type === ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = event.data?.contentScriptName === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has(event.data?.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && options?.ignoreFirstEvent) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  }
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHd4dC1kZXYrYnJvd3NlckAwLjEuMzIvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuMTNfQHR5cGVzK25vZGVAMjUuXzYzNjE5NDQ1YzU4N2NkNGE2NjcyNzc1MWFkYzIyYTdhL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9pZGxlJyxcclxuXHJcbiAgbWFpbigpIHtcclxuICAgIGludGVyZmFjZSBSZXN1bWVEYXRhIHtcclxuICAgICAgZmlyc3ROYW1lOiBzdHJpbmdcclxuICAgICAgbGFzdE5hbWU6IHN0cmluZ1xyXG4gICAgICBlbWFpbDogc3RyaW5nXHJcbiAgICAgIHBob25lOiBzdHJpbmdcclxuICAgICAgY291bnRyeUNvZGU6IHN0cmluZ1xyXG4gICAgICBwaG9uZU51bWJlcjogc3RyaW5nXHJcbiAgICAgIHN0cmVldEFkZHJlc3M6IHN0cmluZ1xyXG4gICAgICBjaXR5OiBzdHJpbmdcclxuICAgICAgc3RhdGU6IHN0cmluZ1xyXG4gICAgICB6aXBDb2RlOiBzdHJpbmdcclxuICAgICAgY291bnRyeTogc3RyaW5nXHJcbiAgICAgIGxvY2F0aW9uOiBzdHJpbmdcclxuICAgICAgcHJvZmVzc2lvbmFsU3VtbWFyeTogc3RyaW5nXHJcbiAgICAgIHNraWxsczogc3RyaW5nW11cclxuICAgICAgZ2l0aHViOiBzdHJpbmdcclxuICAgICAgbGlua2VkaW46IHN0cmluZ1xyXG4gICAgICBwb3J0Zm9saW86IHN0cmluZ1xyXG4gICAgICBhdmFpbGFiaWxpdHk6IHN0cmluZ1xyXG4gICAgICBsYW5ndWFnZXM6IEFycmF5PHsgbGFuZ3VhZ2U6IHN0cmluZzsgbGV2ZWw6IHN0cmluZyB9PlxyXG4gICAgICBzYWxhcnlBbW91bnQ6IHN0cmluZ1xyXG4gICAgICBzYWxhcnlDdXJyZW5jeTogc3RyaW5nXHJcbiAgICAgIHNhbGFyeVR5cGU6IHN0cmluZ1xyXG4gICAgICBnZW5kZXI6IHN0cmluZ1xyXG4gICAgICBldGhuaWNpdHk6IHN0cmluZ1xyXG4gICAgICB2ZXRlcmFuOiBzdHJpbmdcclxuICAgICAgZGlzYWJpbGl0eTogc3RyaW5nXHJcbiAgICAgIGV4cGVyaWVuY2U6IEFycmF5PHtcclxuICAgICAgICBqb2JUaXRsZTogc3RyaW5nXHJcbiAgICAgICAgY29tcGFueU5hbWU6IHN0cmluZ1xyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmdcclxuICAgICAgICBzdGFydE1vbnRoOiBzdHJpbmdcclxuICAgICAgICBzdGFydFllYXI6IHN0cmluZ1xyXG4gICAgICAgIGVuZE1vbnRoOiBzdHJpbmdcclxuICAgICAgICBlbmRZZWFyOiBzdHJpbmdcclxuICAgICAgfT5cclxuICAgICAgcHJvamVjdHM6IEFycmF5PHsgcHJvamVjdE5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgbGluazogc3RyaW5nIH0+XHJcbiAgICAgIGVkdWNhdGlvbjogQXJyYXk8eyBzY2hvb2xOYW1lOiBzdHJpbmc7IGZpZWxkT2ZTdHVkeTogc3RyaW5nOyBzdGFydFllYXI6IHN0cmluZzsgZW5kWWVhcjogc3RyaW5nIH0+XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEZpZWxkTWFwcGluZyB7XHJcbiAgICAgIGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnRcclxuICAgICAgdHlwZTogc3RyaW5nXHJcbiAgICAgIGNvbmZpZGVuY2U6IG51bWJlclxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IE1PTlRIUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgJzEnOidqYW51YXJ5JywnMDEnOidqYW51YXJ5JywnMic6J2ZlYnJ1YXJ5JywnMDInOidmZWJydWFyeScsJzMnOidtYXJjaCcsJzAzJzonbWFyY2gnLFxyXG4gICAgICAnNCc6J2FwcmlsJywnMDQnOidhcHJpbCcsJzUnOidtYXknLCcwNSc6J21heScsJzYnOidqdW5lJywnMDYnOidqdW5lJyxcclxuICAgICAgJzcnOidqdWx5JywnMDcnOidqdWx5JywnOCc6J2F1Z3VzdCcsJzA4JzonYXVndXN0JywnOSc6J3NlcHRlbWJlcicsJzA5Jzonc2VwdGVtYmVyJyxcclxuICAgICAgJzEwJzonb2N0b2JlcicsJzExJzonbm92ZW1iZXInLCcxMic6J2RlY2VtYmVyJyxcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZmluZExhYmVsRm9yRWxlbWVudChlbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgICAgIGNvbnN0IHNvdXJjZXM6IHN0cmluZ1tdID0gW11cclxuICAgICAgaWYgKGVsZW1lbnQuaWQpIHtcclxuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxhYmVsW2Zvcj1cIiR7Q1NTLmVzY2FwZShlbGVtZW50LmlkKX1cIl1gKVxyXG4gICAgICAgIGlmIChsYWJlbCkgc291cmNlcy5wdXNoKGxhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IHBhcmVudExhYmVsID0gZWxlbWVudC5jbG9zZXN0KCdsYWJlbCcpXHJcbiAgICAgIGlmIChwYXJlbnRMYWJlbCkgc291cmNlcy5wdXNoKHBhcmVudExhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICBjb25zdCBwcmV2ID0gZWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nXHJcbiAgICAgIGlmIChwcmV2ICYmIFsnTEFCRUwnLCdTUEFOJywnUCcsJ0RJViddLmluY2x1ZGVzKHByZXYudGFnTmFtZSkpIHNvdXJjZXMucHVzaChwcmV2LnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICBjb25zdCBwYXJlbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnRcclxuICAgICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgIHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKCdsYWJlbCwgc3BhbltjbGFzcyo9XCJsYWJlbFwiXSwgZGl2W2NsYXNzKj1cImxhYmVsXCJdLCBwJykuZm9yRWFjaChlbCA9PiBzb3VyY2VzLnB1c2goZWwudGV4dENvbnRlbnQgfHwgJycpKVxyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IHdyYXBwZXIgPSBlbGVtZW50LmNsb3Nlc3QoJ2RpdiwgZmllbGRzZXQsIGxpLCBzZWN0aW9uJylcclxuICAgICAgaWYgKHdyYXBwZXIpIHtcclxuICAgICAgICBjb25zdCB3bCA9IHdyYXBwZXIucXVlcnlTZWxlY3RvcignbGFiZWwsIGxlZ2VuZCwgc3BhbltjbGFzcyo9XCJsYWJlbFwiXSwgZGl2W2NsYXNzKj1cImxhYmVsXCJdJylcclxuICAgICAgICBpZiAod2wpIHNvdXJjZXMucHVzaCh3bC50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc291cmNlcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGRldGVjdEZpZWxkVHlwZShlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50KTogeyB0eXBlOiBzdHJpbmc7IGNvbmZpZGVuY2U6IG51bWJlciB9IHtcclxuICAgICAgY29uc3QgaWQgPSBlbGVtZW50LmlkPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IG5hbWUgPSBlbGVtZW50Lm5hbWU/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSAoZWxlbWVudCBhcyBIVE1MSW5wdXRFbGVtZW50KS5wbGFjZWhvbGRlcj8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBhcmlhTGFiZWwgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IGRhdGFBdHRyID0gKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWZpZWxkJykgfHwgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGVzdGlkJykgfHwgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY3knKSB8fCAnJykudG9Mb3dlckNhc2UoKVxyXG4gICAgICBjb25zdCBhdXRvY29tcGxldGUgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXV0b2NvbXBsZXRlJyk/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgbGFiZWwgPSBmaW5kTGFiZWxGb3JFbGVtZW50KGVsZW1lbnQpXHJcbiAgICAgIGNvbnN0IGNvbWJpbmVkID0gYCR7aWR9ICR7bmFtZX0gJHtwbGFjZWhvbGRlcn0gJHthcmlhTGFiZWx9ICR7bGFiZWx9ICR7ZGF0YUF0dHJ9ICR7YXV0b2NvbXBsZXRlfWBcclxuXHJcbiAgICAgIGNvbnN0IHBhdHRlcm5zID0gW1xyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZnVsbG5hbWUnLCdmdWxsLW5hbWUnLCdmdWxsX25hbWUnLCd5b3VybmFtZScsJ3lvdXItbmFtZScsJ2FwcGxpY2FudG5hbWUnLCdjYW5kaWRhdGVuYW1lJ10sIHR5cGU6ICdmdWxsTmFtZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZmlyc3RuYW1lJywnZmlyc3QtbmFtZScsJ2ZpcnN0X25hbWUnLCdmbmFtZScsJ2dpdmVuLW5hbWUnLCdnaXZlbm5hbWUnLCdmb3JlbmFtZScsJ2ZpcnN0IG5hbWUnLCdnaXZlbiBuYW1lJ10sIHR5cGU6ICdmaXJzdE5hbWUnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydsYXN0bmFtZScsJ2xhc3QtbmFtZScsJ2xhc3RfbmFtZScsJ2xuYW1lJywnc3VybmFtZScsJ2ZhbWlseS1uYW1lJywnZmFtaWx5bmFtZScsJ2ZhbWlseSBuYW1lJywnbGFzdCBuYW1lJ10sIHR5cGU6ICdsYXN0TmFtZScsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VtYWlsJywnZS1tYWlsJywnZW1haWxhZGRyZXNzJywnZW1haWwgYWRkcmVzcycsJ2VtYWlsLWFkZHJlc3MnLCdtYWlsJ10sIHR5cGU6ICdlbWFpbCcsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3Bob25lJywndGVsZXBob25lJywnbW9iaWxlJywncGhvbmVudW1iZXInLCdwaG9uZS1udW1iZXInLCdwaG9uZSBudW1iZXInLCdjZWxsIHBob25lJywnY29udGFjdCBudW1iZXInLCd0ZWwnXSwgdHlwZTogJ3Bob25lJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjb3VudHJ5Y29kZScsJ2NvdW50cnktY29kZScsJ2NvdW50cnlfY29kZScsJ2RpYWxjb2RlJywnZGlhbC1jb2RlJywnZGlhbCBjb2RlJywnY2FsbGluZyBjb2RlJywnaXNkJ10sIHR5cGU6ICdjb3VudHJ5Q29kZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncGhvbmUgdHlwZScsJ3Bob25ldHlwZScsJ251bWJlciB0eXBlJywndHlwZSBvZiBwaG9uZScsJ2NvbnRhY3QgdHlwZScsJ3Bob25lIGRldmljZSB0eXBlJ10sIHR5cGU6ICdwaG9uZVR5cGUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdHJlZXRhZGRyZXNzJywnc3RyZWV0LWFkZHJlc3MnLCdhZGRyZXNzMScsJ2FkZHJlc3MtbGluZS0xJywnYWRkcmVzc2xpbmUxJywnYWRkcmVzcyBsaW5lIDEnLCdhZGRyMScsJ21haWxpbmcgYWRkcmVzcycsJ3N0cmVldCcsJ2FkZHJlc3MnXSwgdHlwZTogJ3N0cmVldEFkZHJlc3MnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjaXR5JywndG93bicsJ3N1YnVyYicsJ211bmljaXBhbGl0eSddLCB0eXBlOiAnY2l0eScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnemlwY29kZScsJ3ppcC1jb2RlJywnemlwJywncG9zdGFsY29kZScsJ3Bvc3RhbC1jb2RlJywncG9zdGNvZGUnLCdwb3N0YWwgY29kZSddLCB0eXBlOiAnemlwQ29kZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3N0YXRlJywncHJvdmluY2UnLCdyZWdpb24nLCdjb3VudHknXSwgdHlwZTogJ3N0YXRlJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY291bnRyeScsJ25hdGlvbicsJ2NvdW50cnkgb2YgcmVzaWRlbmNlJywnY291bnRyeSBvZiBvcmlnaW4nLCdjaXRpemVuc2hpcCcsJ25hdGlvbmFsaXR5JywnaG9tZSBjb3VudHJ5JywnbG9jYXRpb24gY291bnRyeSddLCB0eXBlOiAnY291bnRyeScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbG9jYXRpb24nLCdyZXNpZGVuY2UnLCdiYXNlZCBpbicsJ2N1cnJlbnQgbG9jYXRpb24nLCdwcmVmZXJyZWQgbG9jYXRpb24nLCd3b3JrIGxvY2F0aW9uJywnd2hlcmUgYXJlIHlvdSBsb2NhdGVkJ10sIHR5cGU6ICdsb2NhdGlvbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3VtbWFyeScsJ3Byb2Zlc3Npb25hbCBzdW1tYXJ5JywnYWJvdXQgbWUnLCdhYm91dCB5b3Vyc2VsZicsJ2JpbycsJ3Byb2ZpbGUnLCdvYmplY3RpdmUnLCdpbnRyb2R1Y3Rpb24nLCdkZXNjcmliZSB5b3Vyc2VsZicsJ3RlbGwgdXMgYWJvdXQgeW91cnNlbGYnLCdwZXJzb25hbCBzdGF0ZW1lbnQnXSwgdHlwZTogJ3Byb2Zlc3Npb25hbFN1bW1hcnknLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjb3ZlciBsZXR0ZXInLCdjb3ZlcmluZyBsZXR0ZXInLCdtb3RpdmF0aW9uIGxldHRlcicsJ21vdGl2YXRpb25hbCBsZXR0ZXInLCdsZXR0ZXIgb2YgbW90aXZhdGlvbicsJ3doeSBkbyB5b3Ugd2FudCcsJ3doeSBhcmUgeW91IGludGVyZXN0ZWQnXSwgdHlwZTogJ2NvdmVyTGV0dGVyJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc2tpbGwnLCdza2lsbHMnLCdleHBlcnRpc2UnLCdjb21wZXRlbmNpZXMnLCd0ZWNobm9sb2dpZXMnLCd0ZWNoIHN0YWNrJywndG9vbHMnLCd0ZWNobmljYWwgc2tpbGxzJywna2V5IHNraWxscyddLCB0eXBlOiAnc2tpbGxzJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnam9idGl0bGUnLCdqb2ItdGl0bGUnLCdqb2IgdGl0bGUnLCdjdXJyZW50dGl0bGUnLCdjdXJyZW50IHRpdGxlJywnY3VycmVudCBqb2IgdGl0bGUnLCdkZXNpcmVkIHRpdGxlJ10sIHR5cGU6ICdqb2JUaXRsZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsndGl0bGUnXSwgdHlwZTogJ2pvYlRpdGxlJywgY29uZmlkZW5jZTogMC43IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydpbmR1c3RyeSddLCB0eXBlOiAnaW5kdXN0cnknLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjb21wYW55JywnZW1wbG95ZXInLCdvcmdhbml6YXRpb24nLCdvcmdhbmlzYXRpb24nLCdjdXJyZW50IGNvbXBhbnknLCdjdXJyZW50IGVtcGxveWVyJywnd29ya3BsYWNlJ10sIHR5cGU6ICdjb21wYW55TmFtZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3N0YXJ0IG1vbnRoJywnc3RhcnRtb250aCcsJ3N0YXJ0LW1vbnRoJywnZnJvbSBtb250aCddLCB0eXBlOiAnZXhwU3RhcnRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgeWVhcicsJ3N0YXJ0eWVhcicsJ3N0YXJ0LXllYXInLCdmcm9tIHllYXInLCd5ZWFyIHN0YXJ0ZWQnXSwgdHlwZTogJ2V4cFN0YXJ0WWVhcicsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5kIG1vbnRoJywnZW5kbW9udGgnLCdlbmQtbW9udGgnLCd0byBtb250aCddLCB0eXBlOiAnZXhwRW5kTW9udGgnLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VuZCB5ZWFyJywnZW5keWVhcicsJ2VuZC15ZWFyJywndG8geWVhcicsJ3llYXIgZW5kZWQnLCd5ZWFyIGZpbmlzaGVkJ10sIHR5cGU6ICdleHBFbmRZZWFyJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydoaWdoZXN0IGVkdWNhdGlvbicsJ2xldmVsIG9mIGVkdWNhdGlvbicsJ2VkdWNhdGlvbiBsZXZlbCcsJ2RlZ3JlZSBsZXZlbCcsJ2hpZ2hlc3QgZGVncmVlJ10sIHR5cGU6ICdoaWdoZXN0RWR1JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzY2hvb2wnLCd1bml2ZXJzaXR5JywnY29sbGVnZScsJ2luc3RpdHV0aW9uJywnYWxtYSBtYXRlciddLCB0eXBlOiAnc2Nob29sTmFtZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2RlZ3JlZScsJ21ham9yJywnZmllbGQgb2Ygc3R1ZHknLCdmaWVsZG9mc3R1ZHknLCdkaXNjaXBsaW5lJywncXVhbGlmaWNhdGlvbicsJ3Byb2dyYW0nLCdhcmVhIG9mIHN0dWR5J10sIHR5cGU6ICdmaWVsZE9mU3R1ZHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2dyYWR1YXRpb24geWVhcicsJ2dyYWQgeWVhcicsJ3llYXIgb2YgZ3JhZHVhdGlvbicsJ2NvbXBsZXRlZCB5ZWFyJ10sIHR5cGU6ICdlZHVFbmRZZWFyJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5yb2xsbWVudCB5ZWFyJywnZW5yb2xtZW50IHllYXInLCd5ZWFyIGVucm9sbGVkJ10sIHR5cGU6ICdlZHVTdGFydFllYXInLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3Byb2plY3QgbmFtZScsJ3Byb2plY3RuYW1lJywncHJvamVjdCB0aXRsZSddLCB0eXBlOiAncHJvamVjdE5hbWUnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydsaW5rZWRpbicsJ2xpbmtlZGluIHVybCcsJ2xpbmtlZGluIHByb2ZpbGUnXSwgdHlwZTogJ2xpbmtlZGluJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZ2l0aHViJywnZ2l0aHViIHVybCcsJ2dpdGh1YiBwcm9maWxlJ10sIHR5cGU6ICdnaXRodWInLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd3ZWJzaXRlJywncGVyc29uYWwgd2Vic2l0ZScsJ3BvcnRmb2xpbyB1cmwnLCdwb3J0Zm9saW8gbGluaycsJ3BlcnNvbmFsIHVybCcsJ3lvdXIgd2Vic2l0ZSddLCB0eXBlOiAnd2Vic2l0ZScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NhbGFyeScsJ2V4cGVjdGVkIHNhbGFyeScsJ2Rlc2lyZWQgc2FsYXJ5JywnY29tcGVuc2F0aW9uJywnc2FsYXJ5IGV4cGVjdGF0aW9uJywnYmFzZSBzYWxhcnknLCdyYXRlJ10sIHR5cGU6ICdzYWxhcnknLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjdXJyZW5jeScsJ3NhbGFyeSBjdXJyZW5jeScsJ3BheSBjdXJyZW5jeSddLCB0eXBlOiAnc2FsYXJ5Q3VycmVuY3knLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NhbGFyeSB0eXBlJywncGF5IHR5cGUnLCdwYXkgcGVyaW9kJywnY29tcGVuc2F0aW9uIHR5cGUnXSwgdHlwZTogJ3NhbGFyeVR5cGUnLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xhbmd1YWdlJywnbGFuZ3VhZ2VzIHNwb2tlbicsJ2xhbmd1YWdlIHByb2ZpY2llbmN5J10sIHR5cGU6ICdsYW5ndWFnZScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xhbmd1YWdlIGxldmVsJywncHJvZmljaWVuY3knLCdmbHVlbmN5J10sIHR5cGU6ICdsYW5ndWFnZUxldmVsJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnYXZhaWxhYmlsaXR5Jywnc3RhcnQgZGF0ZScsJ2F2YWlsYWJsZSBmcm9tJywnd2hlbiBjYW4geW91IHN0YXJ0Jywnbm90aWNlIHBlcmlvZCddLCB0eXBlOiAnYXZhaWxhYmlsaXR5JywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsneWVhcnMgb2YgZXhwZXJpZW5jZScsJ2V4cGVyaWVuY2UgeWVhcnMnLCdob3cgbWFueSB5ZWFycycsJ3RvdGFsIGV4cGVyaWVuY2UnLCd5ZWFycyBleHBlcmllbmNlJ10sIHR5cGU6ICd5ZWFyc09mRXhwZXJpZW5jZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3dvcmsgYXV0aG9yaXphdGlvbicsJ2F1dGhvcml6ZWQgdG8gd29yaycsJ3Zpc2Egc3RhdHVzJywncmlnaHQgdG8gd29yaycsJ3dvcmsgcGVybWl0JywnZWxpZ2libGUgdG8gd29yayddLCB0eXBlOiAnd29ya0F1dGgnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd3aWxsaW5nIHRvIHJlbG9jYXRlJywnb3BlbiB0byByZWxvY2F0ZScsJ3JlbG9jYXRpb24nLCdyZWxvY2F0ZSddLCB0eXBlOiAncmVsb2NhdGlvbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZ2VuZGVyJywnc2V4J10sIHR5cGU6ICdnZW5kZXInLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3JhY2UnLCdldGhuaWNpdHknLCdldGhuaWMnXSwgdHlwZTogJ2V0aG5pY2l0eScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsndmV0ZXJhbicsJ21pbGl0YXJ5JywnYXJtZWQgZm9yY2VzJ10sIHR5cGU6ICd2ZXRlcmFuJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydkaXNhYmlsaXR5JywnZGlzYWJsZWQnLCdpbXBhaXJtZW50J10sIHR5cGU6ICdkaXNhYmlsaXR5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydob3cgZGlkIHlvdSBoZWFyJywncmVmZXJyYWwgc291cmNlJywnd2hlcmUgZGlkIHlvdSBoZWFyJ10sIHR5cGU6ICdyZWZlcnJhbFNvdXJjZScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICBdXHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGtleXdvcmQgb2YgcGF0dGVybi5rZXl3b3Jkcykge1xyXG4gICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKGtleXdvcmQpKSB7XHJcbiAgICAgICAgICAgIGlmIChrZXl3b3JkID09PSAnbmFtZScpIHtcclxuICAgICAgICAgICAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2ZpcnN0JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2xhc3QnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZnVsbCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjb21wYW55JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3NjaG9vbCcpKSBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChrZXl3b3JkID09PSAndGl0bGUnKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdqb2InKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3VycmVudCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdkZXNpcmVkJykpIHJldHVybiB7IHR5cGU6ICdqb2JUaXRsZScsIGNvbmZpZGVuY2U6IDAuOSB9XHJcbiAgICAgICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdtcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdtcycpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdkcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdzYWx1dGF0aW9uJykpIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcGF0dGVybi50eXBlLCBjb25maWRlbmNlOiBwYXR0ZXJuLmNvbmZpZGVuY2UgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKC9cXGJuYW1lXFxiLy50ZXN0KGNvbWJpbmVkKSkge1xyXG4gICAgICAgIGlmICghY29tYmluZWQuaW5jbHVkZXMoJ2ZpcnN0JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdsYXN0JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdjb21wYW55JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdzY2hvb2wnKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ2ZpbGUnKSkge1xyXG4gICAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2Z1bGxOYW1lJywgY29uZmlkZW5jZTogMC43IH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7IHR5cGU6ICd1bmtub3duJywgY29uZmlkZW5jZTogMCB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0QWxsRm9ybUZpZWxkcygpOiBGaWVsZE1hcHBpbmdbXSB7XHJcbiAgICAgIGNvbnN0IGZpZWxkczogRmllbGRNYXBwaW5nW10gPSBbXVxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxyXG4gICAgICAgICdpbnB1dDpub3QoW3R5cGU9XCJzdWJtaXRcIl0pOm5vdChbdHlwZT1cImJ1dHRvblwiXSk6bm90KFt0eXBlPVwiaGlkZGVuXCJdKTpub3QoW3R5cGU9XCJmaWxlXCJdKTpub3QoW3R5cGU9XCJpbWFnZVwiXSk6bm90KFt0eXBlPVwicmVzZXRcIl0pOm5vdChbdHlwZT1cImNoZWNrYm94XCJdKSwgdGV4dGFyZWEsIHNlbGVjdCdcclxuICAgICAgKS5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKCEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpICYmICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQpICYmICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50KSkgcmV0dXJuXHJcbiAgICAgICAgY29uc3QgeyB0eXBlLCBjb25maWRlbmNlIH0gPSBkZXRlY3RGaWVsZFR5cGUoZWxlbWVudClcclxuICAgICAgICBpZiAoY29uZmlkZW5jZSA+IDAuNSkgZmllbGRzLnB1c2goeyBlbGVtZW50LCB0eXBlLCBjb25maWRlbmNlIH0pXHJcbiAgICAgIH0pXHJcbiAgICAgIHJldHVybiBmaWVsZHNcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbEZpZWxkKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50LCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVyblxyXG4gICAgICBlbGVtZW50LmZvY3VzKClcclxuICAgICAgY29uc3QgaW5wdXRTZXR0ZXIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHdpbmRvdy5IVE1MSW5wdXRFbGVtZW50LnByb3RvdHlwZSwgJ3ZhbHVlJyk/LnNldFxyXG4gICAgICBjb25zdCB0ZXh0YXJlYVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LkhUTUxUZXh0QXJlYUVsZW1lbnQucHJvdG90eXBlLCAndmFsdWUnKT8uc2V0XHJcbiAgICAgIGNvbnN0IHNldHRlciA9IGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50ID8gaW5wdXRTZXR0ZXIgOiB0ZXh0YXJlYVNldHRlclxyXG4gICAgICBpZiAoc2V0dGVyKSBzZXR0ZXIuY2FsbChlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgZWxzZSBlbGVtZW50LnZhbHVlID0gdmFsdWVcclxuICAgICAgY29uc3Qgb3B0cyA9IHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgY29tcG9zZWQ6IHRydWUgfVxyXG4gICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIG9wdHMpKVxyXG4gICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCBvcHRzKSlcclxuICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBJbnB1dEV2ZW50KCdpbnB1dCcsIHsgLi4ub3B0cywgZGF0YTogdmFsdWUgfSkpXHJcbiAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgS2V5Ym9hcmRFdmVudCgna2V5ZG93bicsIHsgLi4ub3B0cywga2V5OiAnRW50ZXInIH0pKVxyXG4gICAgICBlbGVtZW50LmJsdXIoKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsRGF0ZUlucHV0KGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQsIHllYXI6IHN0cmluZywgbW9udGg/OiBzdHJpbmcsIGRheT86IHN0cmluZykge1xyXG4gICAgICBpZiAoIXllYXIpIHJldHVyblxyXG4gICAgICBjb25zdCBtID0gKG1vbnRoIHx8ICcwMScpLnBhZFN0YXJ0KDIsICcwJylcclxuICAgICAgY29uc3QgZCA9IChkYXkgfHwgJzAxJykucGFkU3RhcnQoMiwgJzAnKVxyXG4gICAgICBjb25zdCB2YWx1ZSA9IGAke3llYXJ9LSR7bX0tJHtkfWBcclxuICAgICAgZmlsbEZpZWxkKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsRHJvcGRvd24oZWxlbWVudDogSFRNTFNlbGVjdEVsZW1lbnQsIHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICBjb25zdCBvcHRpb25zID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpXHJcbiAgICAgIGxldCBtYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IG8udGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gbm9ybWFsaXplZCB8fCBvLnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpID09PSBub3JtYWxpemVkKVxyXG4gICAgICBpZiAoIW1hdGNoKSBtYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IHsgY29uc3QgdCA9IG8udGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKTsgcmV0dXJuIHQubGVuZ3RoID4gMSAmJiAobm9ybWFsaXplZC5pbmNsdWRlcyh0KSB8fCB0LmluY2x1ZGVzKG5vcm1hbGl6ZWQpKSB9KVxyXG4gICAgICBpZiAoIW1hdGNoKSBtYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IHsgY29uc3QgdiA9IG8udmFsdWUudG9Mb3dlckNhc2UoKS50cmltKCk7IHJldHVybiB2Lmxlbmd0aCA+IDEgJiYgKG5vcm1hbGl6ZWQuaW5jbHVkZXModikgfHwgdi5pbmNsdWRlcyhub3JtYWxpemVkKSkgfSlcclxuICAgICAgaWYgKCFtYXRjaCAmJiBub3JtYWxpemVkLmxlbmd0aCA+IDMpIG1hdGNoID0gb3B0aW9ucy5maW5kKG8gPT4gby50ZXh0LnRvTG93ZXJDYXNlKCkudHJpbSgpLnN0YXJ0c1dpdGgobm9ybWFsaXplZC5zdWJzdHJpbmcoMCwgNCkpKVxyXG4gICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWVcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsTW9udGhEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgbW9udGhWYWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghbW9udGhWYWx1ZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgIGNvbnN0IG1vbnRoTmFtZSA9IE1PTlRIU1ttb250aFZhbHVlXSB8fCBtb250aFZhbHVlLnRvTG93ZXJDYXNlKClcclxuICAgICAgY29uc3QgbW9udGhOdW0gPSBtb250aFZhbHVlLnBhZFN0YXJ0KDIsICcwJylcclxuICAgICAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKVxyXG4gICAgICBjb25zdCBtYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IHtcclxuICAgICAgICBjb25zdCB0ID0gby50ZXh0LnRvTG93ZXJDYXNlKCkudHJpbSgpXHJcbiAgICAgICAgY29uc3QgdiA9IG8udmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgICByZXR1cm4gdCA9PT0gbW9udGhOYW1lIHx8IHYgPT09IG1vbnRoVmFsdWUgfHwgdiA9PT0gbW9udGhOdW0gfHwgdC5zdGFydHNXaXRoKG1vbnRoTmFtZS5zdWJzdHJpbmcoMCwgMykpXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChtYXRjaCkge1xyXG4gICAgICAgIGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZVxyXG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxFZHVjYXRpb25Ecm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2VcclxuICAgICAgY29uc3QgdmFsID0gdmFsdWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICBjb25zdCBtYXRjaCA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKS5maW5kKG8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIHJldHVybiB0LmluY2x1ZGVzKHZhbCkgfHxcclxuICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ2JhY2hlbG9yJykgJiYgdC5pbmNsdWRlcygnYmFjaGVsb3InKSkgfHxcclxuICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ21hc3RlcicpICYmIHQuaW5jbHVkZXMoJ21hc3RlcicpKSB8fFxyXG4gICAgICAgICAgKCh2YWwuaW5jbHVkZXMoJ3BoZCcpIHx8IHZhbC5pbmNsdWRlcygnZG9jdG9yJykpICYmICh0LmluY2x1ZGVzKCdkb2N0b3InKSB8fCB0LmluY2x1ZGVzKCdwaGQnKSkpXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChtYXRjaCkgeyBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7IGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSk7IHJldHVybiB0cnVlIH1cclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbFllYXJzRHJvcGRvd24oZWxlbWVudDogSFRNTFNlbGVjdEVsZW1lbnQsIHllYXJzOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCF5ZWFycykgcmV0dXJuIGZhbHNlXHJcbiAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KHllYXJzKVxyXG4gICAgICBjb25zdCBtYXRjaCA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKS5maW5kKG8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIGlmICh0LmluY2x1ZGVzKHllYXJzKSkgcmV0dXJuIHRydWVcclxuICAgICAgICBjb25zdCBudW1zID0gdC5tYXRjaCgvXFxkKy9nKVxyXG4gICAgICAgIGlmIChudW1zKSB7XHJcbiAgICAgICAgICBjb25zdCBmaXJzdCA9IHBhcnNlSW50KG51bXNbMF0pXHJcbiAgICAgICAgICBpZiAobnVtcy5sZW5ndGggPT09IDEgJiYgdC5pbmNsdWRlcygnKycpICYmIG51bSA+PSBmaXJzdCkgcmV0dXJuIHRydWVcclxuICAgICAgICAgIGlmIChudW1zLmxlbmd0aCA9PT0gMiAmJiBudW0gPj0gZmlyc3QgJiYgbnVtIDw9IHBhcnNlSW50KG51bXNbMV0pKSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgfSlcclxuICAgICAgaWYgKG1hdGNoKSB7IGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbFJhZGlvR3JvdXAobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICAgIGlmICghbmFtZSB8fCAhdmFsdWUpIHJldHVyblxyXG4gICAgICBjb25zdCByYWRpb3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KGBpbnB1dFt0eXBlPVwicmFkaW9cIl1bbmFtZT1cIiR7bmFtZX1cIl1gKVxyXG4gICAgICBpZiAoIXJhZGlvcy5sZW5ndGgpIHJldHVyblxyXG4gICAgICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgbGV0IG1hdGNoZWQ6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWRcclxuICAgICAgcmFkaW9zLmZvckVhY2gocmFkaW8gPT4ge1xyXG4gICAgICAgIGNvbnN0IGxibCA9IGZpbmRMYWJlbEZvckVsZW1lbnQocmFkaW8pLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBjb25zdCB2YWwgPSByYWRpby52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICAgIGlmICh2YWwgPT09IG5vcm1hbGl6ZWQgfHwgbGJsLmluY2x1ZGVzKG5vcm1hbGl6ZWQpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXModmFsKSkgbWF0Y2hlZCA9IHJhZGlvXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChtYXRjaGVkKSB7XHJcbiAgICAgICAgbWF0Y2hlZC5jaGVja2VkID0gdHJ1ZVxyXG4gICAgICAgIG1hdGNoZWQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBtYXRjaGVkLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjbGljaycsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhhbmRsZVJhZGlvQnV0dG9ucyhyZXN1bWVEYXRhOiBSZXN1bWVEYXRhKSB7XHJcbiAgICAgIGNvbnN0IGdyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcclxuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MSW5wdXRFbGVtZW50PignaW5wdXRbdHlwZT1cInJhZGlvXCJdJykuZm9yRWFjaChyYWRpbyA9PiB7XHJcbiAgICAgICAgaWYgKCFyYWRpby5uYW1lIHx8IGdyb3Vwcy5oYXMocmFkaW8ubmFtZSkpIHJldHVyblxyXG4gICAgICAgIGNvbnN0IGxibCA9IGZpbmRMYWJlbEZvckVsZW1lbnQocmFkaW8pLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBjb25zdCBubSA9IHJhZGlvLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIGNvbnN0IGNvbWJpbmVkID0gYCR7bGJsfSAke25tfWBcclxuICAgICAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ3Bob25lIHR5cGUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY29udGFjdCB0eXBlJykpIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ2hvbWUnKVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCd3b3JrIGF1dGgnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnYXV0aG9yaXplZCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdlbGlnaWJsZScpKSBncm91cHMuc2V0KHJhZGlvLm5hbWUsICd5ZXMnKVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdyZWxvY2F0JykpIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ3llcycpXHJcbiAgICAgICAgZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2dlbmRlcicpICYmIHJlc3VtZURhdGEuZ2VuZGVyKSBncm91cHMuc2V0KHJhZGlvLm5hbWUsIHJlc3VtZURhdGEuZ2VuZGVyKVxyXG4gICAgICAgIGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCd2ZXRlcmFuJykpIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgcmVzdW1lRGF0YS52ZXRlcmFuIHx8ICdubycpXHJcbiAgICAgICAgZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2Rpc2FiaWxpdHknKSkgZ3JvdXBzLnNldChyYWRpby5uYW1lLCByZXN1bWVEYXRhLmRpc2FiaWxpdHkgfHwgJ25vJylcclxuICAgICAgICBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZXRobmljaXR5JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3JhY2UnKSkgZ3JvdXBzLnNldChyYWRpby5uYW1lLCByZXN1bWVEYXRhLmV0aG5pY2l0eSB8fCAnJylcclxuICAgICAgfSlcclxuICAgICAgZ3JvdXBzLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB2YWx1ZSAmJiBmaWxsUmFkaW9Hcm91cChuYW1lLCB2YWx1ZSkpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGZldGNoQW5kVXBsb2FkRmlsZShlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50LCBlbmRwb2ludDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3Qgc3RvcmVkID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsnYXV0aF90b2tlbicsICdhcGlfdXJsJ10pXHJcbiAgICAgICAgY29uc3QgdG9rZW4gPSBzdG9yZWQuYXV0aF90b2tlblxyXG4gICAgICAgIGNvbnN0IEFQSV9VUkwgPSBzdG9yZWQuYXBpX3VybFxyXG4gICAgICAgIGlmICghdG9rZW4gfHwgIUFQSV9VUkwpIHJldHVybiBmYWxzZVxyXG5cclxuICAgICAgICBjb25zdCByZXNwb25zZTogYW55ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgYWN0aW9uOiAncHJveHlGZXRjaEZpbGUnLFxyXG4gICAgICAgICAgdXJsOiBgJHtBUElfVVJMfSR7ZW5kcG9pbnR9YCxcclxuICAgICAgICAgIHRva2VuLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgaWYgKCFyZXNwb25zZT8uc3VjY2VzcykgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHJlc3BvbnNlLmJhc2U2NClcclxuICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgcmVzLmJsb2IoKVxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSBuZXcgRmlsZShbYmxvYl0sIGZpbGVOYW1lLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9wZGYnIH0pXHJcbiAgICAgICAgY29uc3QgZHQgPSBuZXcgRGF0YVRyYW5zZmVyKClcclxuICAgICAgICBkdC5pdGVtcy5hZGQoZmlsZSlcclxuICAgICAgICBlbGVtZW50LmZpbGVzID0gZHQuZmlsZXNcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tSQUVdIEZpbGUgdXBsb2FkIGVycm9yOicsIGUpXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBoYW5kbGVBbGxGaWxlSW5wdXRzKHJlc3VtZURhdGE6IFJlc3VtZURhdGEsIGN2QXZhaWxhYmxlOiBib29sZWFuKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVJbnB1dHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykpXHJcblxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignYnV0dG9uLCBbcm9sZT1cImJ1dHRvblwiXSwgYScpLmZvckVhY2goYnRuID0+IHtcclxuICAgICAgICBjb25zdCB0eHQgPSBidG4udGV4dENvbnRlbnQ/LnRvTG93ZXJDYXNlKCkudHJpbSgpIHx8ICcnXHJcbiAgICAgICAgY29uc3QgYXJpYUxhYmVsID0gYnRuLmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgICAgY29uc3QgY29tYmluZWQgPSBgJHt0eHR9ICR7YXJpYUxhYmVsfWBcclxuICAgICAgICBpZiAoKGNvbWJpbmVkLmluY2x1ZGVzKCdhZGQgZmlsZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdhdHRhY2ggZmlsZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCd1cGxvYWQgZmlsZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjaG9vc2UgZmlsZScpKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ3JlbW92ZScpKSB7XHJcbiAgICAgICAgICBjb25zdCBuZWFyYnlJbnB1dCA9IGJ0bi5jbG9zZXN0KCdkaXYsIHNlY3Rpb24sIGZvcm0nKT8ucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImZpbGVcIl0nKVxyXG4gICAgICAgICAgaWYgKG5lYXJieUlucHV0ICYmIG5lYXJieUlucHV0IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCAmJiAhZmlsZUlucHV0cy5pbmNsdWRlcyhuZWFyYnlJbnB1dCkpIHtcclxuICAgICAgICAgICAgZmlsZUlucHV0cy5wdXNoKG5lYXJieUlucHV0KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGxldCByZXN1bWVVcGxvYWRlZCA9IGZhbHNlXHJcbiAgICAgIGxldCBjdlVwbG9hZGVkID0gZmFsc2VcclxuXHJcbiAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgZmlsZUlucHV0cykge1xyXG4gICAgICAgIGNvbnN0IGxibCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoaW5wdXQpLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBjb25zdCBpZCA9IGlucHV0LmlkPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgICAgY29uc3Qgbm0gPSBpbnB1dC5uYW1lPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtsYmx9ICR7aWR9ICR7bm19YFxyXG5cclxuICAgICAgICBjb25zdCBpc1Jlc3VtZSA9IGNvbWJpbmVkLmluY2x1ZGVzKCdyZXN1bWUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3YnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3VycmljdWx1bScpXHJcbiAgICAgICAgY29uc3QgaXNDb3ZlckxldHRlciA9IGNvbWJpbmVkLmluY2x1ZGVzKCdjb3ZlcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdsZXR0ZXInKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnbW90aXZhdGlvbicpXHJcblxyXG4gICAgICAgIGlmIChpc0NvdmVyTGV0dGVyICYmIGN2QXZhaWxhYmxlICYmICFjdlVwbG9hZGVkKSB7XHJcbiAgICAgICAgICBjb25zdCBvayA9IGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShpbnB1dCwgJy9hcGkvY3YvdmlldycsICdjb3Zlci1sZXR0ZXIucGRmJylcclxuICAgICAgICAgIGlmIChvaykgY3ZVcGxvYWRlZCA9IHRydWVcclxuICAgICAgICB9IGVsc2UgaWYgKGlzUmVzdW1lICYmICFyZXN1bWVVcGxvYWRlZCkge1xyXG4gICAgICAgICAgY29uc3Qgb2sgPSBhd2FpdCBmZXRjaEFuZFVwbG9hZEZpbGUoaW5wdXQsICcvYXBpL3Jlc3VtZS92aWV3JywgJ3Jlc3VtZS5wZGYnKVxyXG4gICAgICAgICAgaWYgKG9rKSByZXN1bWVVcGxvYWRlZCA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgZmlsZUlucHV0cykge1xyXG4gICAgICAgIGlmIChpbnB1dC5maWxlcyAmJiBpbnB1dC5maWxlcy5sZW5ndGggPiAwKSBjb250aW51ZVxyXG4gICAgICAgIGNvbnN0IGFjY2VwdCA9IGlucHV0LmFjY2VwdD8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICAgIGNvbnN0IGxibCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoaW5wdXQpLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBpZiAoKGFjY2VwdC5pbmNsdWRlcygncGRmJykgfHwgYWNjZXB0ID09PSAnJyB8fCBhY2NlcHQuaW5jbHVkZXMoJyonKSkgJiYgIXJlc3VtZVVwbG9hZGVkKSB7XHJcbiAgICAgICAgICBjb25zdCBvayA9IGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShpbnB1dCwgJy9hcGkvcmVzdW1lL3ZpZXcnLCAncmVzdW1lLnBkZicpXHJcbiAgICAgICAgICBpZiAob2spIHsgcmVzdW1lVXBsb2FkZWQgPSB0cnVlOyBjb250aW51ZSB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjdkF2YWlsYWJsZSAmJiAhY3ZVcGxvYWRlZCkge1xyXG4gICAgICAgICAgY29uc3Qgb2sgPSBhd2FpdCBmZXRjaEFuZFVwbG9hZEZpbGUoaW5wdXQsICcvYXBpL2N2L3ZpZXcnLCAnY292ZXItbGV0dGVyLnBkZicpXHJcbiAgICAgICAgICBpZiAob2spIGN2VXBsb2FkZWQgPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGNsaWNrQWRkQW5kRmlsbChzZWN0aW9uVHlwZTogJ2V4cGVyaWVuY2UnIHwgJ2VkdWNhdGlvbicsIGRhdGE6IFJlc3VtZURhdGEpIHtcclxuICAgICAgY29uc3QgYWRkS2V5d29yZHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgICBleHBlcmllbmNlOiBbJ2FkZCBleHBlcmllbmNlJywnYWRkIHdvcmsnLCdhZGQgam9iJywnYWRkIHBvc2l0aW9uJywnYWRkIGVtcGxveW1lbnQnLCcrIGV4cGVyaWVuY2UnLCcrIHdvcmsnXSxcclxuICAgICAgICBlZHVjYXRpb246ICBbJ2FkZCBlZHVjYXRpb24nLCdhZGQgc2Nob29sJywnYWRkIGRlZ3JlZScsJ2FkZCBxdWFsaWZpY2F0aW9uJywnKyBlZHVjYXRpb24nXSxcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBrZXl3b3JkcyA9IGFkZEtleXdvcmRzW3NlY3Rpb25UeXBlXVxyXG4gICAgICBjb25zdCBidG4gPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdidXR0b24sIFtyb2xlPVwiYnV0dG9uXCJdJykpLmZpbmQoYiA9PiB7XHJcbiAgICAgICAgY29uc3QgdHh0ID0gYi50ZXh0Q29udGVudD8udG9Mb3dlckNhc2UoKS50cmltKCkgfHwgJydcclxuICAgICAgICByZXR1cm4ga2V5d29yZHMuc29tZShrID0+IHR4dC5pbmNsdWRlcyhrKSlcclxuICAgICAgfSlcclxuICAgICAgaWYgKCFidG4pIHJldHVyblxyXG5cclxuICAgICAgY29uc3QgYmVmb3JlQ291bnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpLmxlbmd0aFxyXG4gICAgICBidG4uY2xpY2soKVxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgODAwKSlcclxuICAgICAgY29uc3QgYWZ0ZXJDb3VudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JykubGVuZ3RoXHJcbiAgICAgIGlmIChhZnRlckNvdW50ID4gYmVmb3JlQ291bnQpIHtcclxuICAgICAgICBhd2FpdCBmaWxsQWxsRmllbGRzKGRhdGEsIGZhbHNlKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGZpbGxBbGxGaWVsZHMocmVzdW1lRGF0YTogUmVzdW1lRGF0YSwgaGFuZGxlRmlsZXM6IGJvb2xlYW4pOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICBjb25zdCBmaWVsZHMgPSBnZXRBbGxGb3JtRmllbGRzKClcclxuICAgICAgbGV0IGZpbGxlZENvdW50ID0gMFxyXG5cclxuICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtyZXN1bWVEYXRhLmZpcnN0TmFtZX0gJHtyZXN1bWVEYXRhLmxhc3ROYW1lfWAudHJpbSgpXHJcbiAgICAgIGNvbnN0IGxhdGVzdEV4cCA9IHJlc3VtZURhdGEuZXhwZXJpZW5jZT8uWzBdXHJcbiAgICAgIGNvbnN0IGxhdGVzdEVkdSA9IHJlc3VtZURhdGEuZWR1Y2F0aW9uPy5bMF1cclxuICAgICAgY29uc3QgbGF0ZXN0UHJvamVjdCA9IHJlc3VtZURhdGEucHJvamVjdHM/LlswXVxyXG4gICAgICBjb25zdCBsb2NhdGlvblN0ciA9IHJlc3VtZURhdGEubG9jYXRpb24gfHwgW3Jlc3VtZURhdGEuY2l0eSwgcmVzdW1lRGF0YS5jb3VudHJ5XS5maWx0ZXIoQm9vbGVhbikuam9pbignLCAnKVxyXG5cclxuICAgICAgY29uc3Qgd2Vic2l0ZVVybCA9IHJlc3VtZURhdGEucG9ydGZvbGlvIHx8IHJlc3VtZURhdGEuZ2l0aHViIHx8IHJlc3VtZURhdGEubGlua2VkaW4gfHwgbGF0ZXN0UHJvamVjdD8ubGluayB8fCAnJ1xyXG5cclxuICAgICAgY29uc3QgdG90YWxFeHBZZWFycyA9ICgoKSA9PiB7XHJcbiAgICAgICAgbGV0IG1vbnRocyA9IDBcclxuICAgICAgICByZXN1bWVEYXRhLmV4cGVyaWVuY2U/LmZvckVhY2goZXhwID0+IHtcclxuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gcGFyc2VJbnQoZXhwLnN0YXJ0WWVhcikgKiAxMiArIChwYXJzZUludChleHAuc3RhcnRNb250aCkgfHwgMSlcclxuICAgICAgICAgIGNvbnN0IGlzUHJlc2VudCA9ICFleHAuZW5kWWVhciB8fCBleHAuZW5kWWVhci50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdwcmVzZW50JylcclxuICAgICAgICAgIGNvbnN0IGV5ID0gaXNQcmVzZW50ID8gbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIDogcGFyc2VJbnQoZXhwLmVuZFllYXIpXHJcbiAgICAgICAgICBjb25zdCBlbSA9IGlzUHJlc2VudCA/IG5ldyBEYXRlKCkuZ2V0TW9udGgoKSArIDEgOiAocGFyc2VJbnQoZXhwLmVuZE1vbnRoKSB8fCAxKVxyXG4gICAgICAgICAgY29uc3QgZW5kID0gZXkgKiAxMiArIGVtXHJcbiAgICAgICAgICBpZiAoIWlzTmFOKGVuZCAtIHN0YXJ0KSkgbW9udGhzICs9IGVuZCAtIHN0YXJ0XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gU3RyaW5nKE1hdGgubWF4KDAsIE1hdGguZmxvb3IobW9udGhzIC8gMTIpKSlcclxuICAgICAgfSkoKVxyXG5cclxuICAgICAgY29uc3Qgc2FsYXJ5RGlzcGxheSA9IHJlc3VtZURhdGEuc2FsYXJ5QW1vdW50XHJcbiAgICAgICAgPyBgJHtyZXN1bWVEYXRhLnNhbGFyeUFtb3VudH0gJHtyZXN1bWVEYXRhLnNhbGFyeUN1cnJlbmN5IHx8ICcnfWAudHJpbSgpXHJcbiAgICAgICAgOiAnJ1xyXG5cclxuICAgICAgY29uc3QgdmFsdWVNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgZnVsbE5hbWU6ICAgICAgICAgICAgZnVsbE5hbWUsXHJcbiAgICAgICAgZmlyc3ROYW1lOiAgICAgICAgICAgcmVzdW1lRGF0YS5maXJzdE5hbWUsXHJcbiAgICAgICAgbGFzdE5hbWU6ICAgICAgICAgICAgcmVzdW1lRGF0YS5sYXN0TmFtZSxcclxuICAgICAgICBlbWFpbDogICAgICAgICAgICAgICByZXN1bWVEYXRhLmVtYWlsLFxyXG4gICAgICAgIHBob25lOiAgICAgICAgICAgICAgIHJlc3VtZURhdGEucGhvbmUsXHJcbiAgICAgICAgY291bnRyeUNvZGU6ICAgICAgICAgcmVzdW1lRGF0YS5jb3VudHJ5Q29kZSB8fCAnJyxcclxuICAgICAgICBwaG9uZU51bWJlcjogICAgICAgICByZXN1bWVEYXRhLnBob25lTnVtYmVyIHx8IHJlc3VtZURhdGEucGhvbmUsXHJcbiAgICAgICAgcGhvbmVUeXBlOiAgICAgICAgICAgJ0hvbWUnLFxyXG4gICAgICAgIHN0cmVldEFkZHJlc3M6ICAgICAgIHJlc3VtZURhdGEuc3RyZWV0QWRkcmVzcyxcclxuICAgICAgICBjaXR5OiAgICAgICAgICAgICAgICByZXN1bWVEYXRhLmNpdHksXHJcbiAgICAgICAgc3RhdGU6ICAgICAgICAgICAgICAgcmVzdW1lRGF0YS5zdGF0ZSB8fCAnJyxcclxuICAgICAgICB6aXBDb2RlOiAgICAgICAgICAgICByZXN1bWVEYXRhLnppcENvZGUgfHwgJycsXHJcbiAgICAgICAgY291bnRyeTogICAgICAgICAgICAgcmVzdW1lRGF0YS5jb3VudHJ5LFxyXG4gICAgICAgIGxvY2F0aW9uOiAgICAgICAgICAgIGxvY2F0aW9uU3RyLFxyXG4gICAgICAgIHByb2Zlc3Npb25hbFN1bW1hcnk6IHJlc3VtZURhdGEucHJvZmVzc2lvbmFsU3VtbWFyeSxcclxuICAgICAgICBjb3ZlckxldHRlcjogICAgICAgICByZXN1bWVEYXRhLnByb2Zlc3Npb25hbFN1bW1hcnksIFxyXG4gICAgICAgIHNraWxsczogICAgICAgICAgICAgIEFycmF5LmlzQXJyYXkocmVzdW1lRGF0YS5za2lsbHMpID8gcmVzdW1lRGF0YS5za2lsbHMuam9pbignLCAnKSA6ICcnLFxyXG4gICAgICAgIGpvYlRpdGxlOiAgICAgICAgICAgIGxhdGVzdEV4cD8uam9iVGl0bGUgfHwgJycsXHJcbiAgICAgICAgaW5kdXN0cnk6ICAgICAgICAgICAgbGF0ZXN0RXhwPy5jb21wYW55TmFtZSB8fCBsYXRlc3RFeHA/LmpvYlRpdGxlIHx8ICcnLFxyXG4gICAgICAgIGNvbXBhbnlOYW1lOiAgICAgICAgIGxhdGVzdEV4cD8uY29tcGFueU5hbWUgfHwgJycsXHJcbiAgICAgICAgZXhwU3RhcnRNb250aDogICAgICAgbGF0ZXN0RXhwPy5zdGFydE1vbnRoIHx8ICcnLFxyXG4gICAgICAgIGV4cFN0YXJ0WWVhcjogICAgICAgIGxhdGVzdEV4cD8uc3RhcnRZZWFyIHx8ICcnLFxyXG4gICAgICAgIGV4cEVuZE1vbnRoOiAgICAgICAgIGxhdGVzdEV4cD8uZW5kTW9udGggfHwgJycsXHJcbiAgICAgICAgZXhwRW5kWWVhcjogICAgICAgICAgbGF0ZXN0RXhwPy5lbmRZZWFyIHx8ICcnLFxyXG4gICAgICAgIHNjaG9vbE5hbWU6ICAgICAgICAgIGxhdGVzdEVkdT8uc2Nob29sTmFtZSB8fCAnJyxcclxuICAgICAgICBmaWVsZE9mU3R1ZHk6ICAgICAgICBsYXRlc3RFZHU/LmZpZWxkT2ZTdHVkeSB8fCAnJyxcclxuICAgICAgICBlZHVTdGFydFllYXI6ICAgICAgICBsYXRlc3RFZHU/LnN0YXJ0WWVhciB8fCAnJyxcclxuICAgICAgICBlZHVFbmRZZWFyOiAgICAgICAgICBsYXRlc3RFZHU/LmVuZFllYXIgfHwgJycsXHJcbiAgICAgICAgaGlnaGVzdEVkdTogICAgICAgICAgbGF0ZXN0RWR1Py5maWVsZE9mU3R1ZHkgfHwgJycsXHJcbiAgICAgICAgcHJvamVjdE5hbWU6ICAgICAgICAgbGF0ZXN0UHJvamVjdD8ucHJvamVjdE5hbWUgfHwgJycsXHJcbiAgICAgICAgbGlua2VkaW46ICAgICAgICAgICAgcmVzdW1lRGF0YS5saW5rZWRpbiB8fCAnJyxcclxuICAgICAgICBnaXRodWI6ICAgICAgICAgICAgICByZXN1bWVEYXRhLmdpdGh1YiB8fCAnJyxcclxuICAgICAgICB3ZWJzaXRlOiAgICAgICAgICAgICB3ZWJzaXRlVXJsLFxyXG4gICAgICAgIHNhbGFyeTogICAgICAgICAgICAgIHJlc3VtZURhdGEuc2FsYXJ5QW1vdW50IHx8ICcnLFxyXG4gICAgICAgIHNhbGFyeUN1cnJlbmN5OiAgICAgIHJlc3VtZURhdGEuc2FsYXJ5Q3VycmVuY3kgfHwgJ1VTRCcsXHJcbiAgICAgICAgc2FsYXJ5VHlwZTogICAgICAgICAgcmVzdW1lRGF0YS5zYWxhcnlUeXBlIHx8ICdtb250aGx5JyxcclxuICAgICAgICBsYW5ndWFnZTogICAgICAgICAgICByZXN1bWVEYXRhLmxhbmd1YWdlcz8uWzBdPy5sYW5ndWFnZSB8fCAnJyxcclxuICAgICAgICBsYW5ndWFnZUxldmVsOiAgICAgICByZXN1bWVEYXRhLmxhbmd1YWdlcz8uWzBdPy5sZXZlbCB8fCAnJyxcclxuICAgICAgICBhdmFpbGFiaWxpdHk6ICAgICAgICByZXN1bWVEYXRhLmF2YWlsYWJpbGl0eSB8fCAnJyxcclxuICAgICAgICB5ZWFyc09mRXhwZXJpZW5jZTogICB0b3RhbEV4cFllYXJzLFxyXG4gICAgICAgIHdvcmtBdXRoOiAgICAgICAgICAgICdZZXMnLFxyXG4gICAgICAgIHJlbG9jYXRpb246ICAgICAgICAgICdZZXMnLFxyXG4gICAgICAgIGdlbmRlcjogICAgICAgICAgICAgIHJlc3VtZURhdGEuZ2VuZGVyIHx8ICcnLFxyXG4gICAgICAgIGV0aG5pY2l0eTogICAgICAgICAgIHJlc3VtZURhdGEuZXRobmljaXR5IHx8ICcnLFxyXG4gICAgICAgIHZldGVyYW46ICAgICAgICAgICAgIHJlc3VtZURhdGEudmV0ZXJhbiB8fCAnTm8nLFxyXG4gICAgICAgIGRpc2FiaWxpdHk6ICAgICAgICAgIHJlc3VtZURhdGEuZGlzYWJpbGl0eSB8fCAnTm8nLFxyXG4gICAgICAgIHJlZmVycmFsU291cmNlOiAgICAgICcnLFxyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHsgZWxlbWVudCwgdHlwZSB9IG9mIGZpZWxkcykge1xyXG4gICAgICAgIGNvbnN0IHZhbHVlID0gdmFsdWVNYXBbdHlwZV1cclxuICAgICAgICBpZiAoIXZhbHVlKSBjb250aW51ZVxyXG5cclxuICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiYgZWxlbWVudC50eXBlID09PSAnZGF0ZScpIHtcclxuICAgICAgICAgIGlmICh0eXBlID09PSAnZXhwU3RhcnRZZWFyJyAmJiBsYXRlc3RFeHA/LnN0YXJ0WWVhcikge1xyXG4gICAgICAgICAgICBmaWxsRGF0ZUlucHV0KGVsZW1lbnQsIGxhdGVzdEV4cC5zdGFydFllYXIsIGxhdGVzdEV4cC5zdGFydE1vbnRoIHx8ICcwMScpXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdleHBFbmRZZWFyJyAmJiBsYXRlc3RFeHA/LmVuZFllYXIpIHtcclxuICAgICAgICAgICAgZmlsbERhdGVJbnB1dChlbGVtZW50LCBsYXRlc3RFeHAuZW5kWWVhciwgbGF0ZXN0RXhwLmVuZE1vbnRoIHx8ICcxMicpXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZHVTdGFydFllYXInICYmIGxhdGVzdEVkdT8uc3RhcnRZZWFyKSB7XHJcbiAgICAgICAgICAgIGZpbGxEYXRlSW5wdXQoZWxlbWVudCwgbGF0ZXN0RWR1LnN0YXJ0WWVhciwgJzA5JylcclxuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkdUVuZFllYXInICYmIGxhdGVzdEVkdT8uZW5kWWVhcikge1xyXG4gICAgICAgICAgICBmaWxsRGF0ZUlucHV0KGVsZW1lbnQsIGxhdGVzdEVkdS5lbmRZZWFyLCAnMDUnKVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZmlsbERhdGVJbnB1dChlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGZpbGxlZENvdW50KytcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MU2VsZWN0RWxlbWVudCkge1xyXG4gICAgICAgICAgbGV0IG9rID0gZmFsc2VcclxuICAgICAgICAgIGlmICh0eXBlID09PSAnZXhwU3RhcnRNb250aCcgfHwgdHlwZSA9PT0gJ2V4cEVuZE1vbnRoJykgb2sgPSBmaWxsTW9udGhEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGVsc2UgaWYgKHR5cGUgPT09ICdoaWdoZXN0RWR1Jykgb2sgPSBmaWxsRWR1Y2F0aW9uRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpXHJcbiAgICAgICAgICBlbHNlIGlmICh0eXBlID09PSAneWVhcnNPZkV4cGVyaWVuY2UnKSBvayA9IGZpbGxZZWFyc0Ryb3Bkb3duKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZWxzZSBvayA9IGZpbGxEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGlmIChvaykgZmlsbGVkQ291bnQrK1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgfHwgZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQpIHtcclxuICAgICAgICAgIGZpbGxGaWVsZChlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGZpbGxlZENvdW50KytcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBmaWxsZWRDb3VudFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBhdXRvZmlsbEZvcm0ocmVzdW1lRGF0YTogUmVzdW1lRGF0YSwgY3ZBdmFpbGFibGU6IGJvb2xlYW4pOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICBsZXQgZmlsbGVkQ291bnQgPSBhd2FpdCBmaWxsQWxsRmllbGRzKHJlc3VtZURhdGEsIGZhbHNlKVxyXG5cclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDMwMCkpXHJcblxyXG4gICAgICBhd2FpdCBjbGlja0FkZEFuZEZpbGwoJ2V4cGVyaWVuY2UnLCByZXN1bWVEYXRhKVxyXG4gICAgICBhd2FpdCBjbGlja0FkZEFuZEZpbGwoJ2VkdWNhdGlvbicsIHJlc3VtZURhdGEpXHJcblxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMzAwKSlcclxuICAgICAgaGFuZGxlUmFkaW9CdXR0b25zKHJlc3VtZURhdGEpXHJcblxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwKSlcclxuICAgICAgYXdhaXQgaGFuZGxlQWxsRmlsZUlucHV0cyhyZXN1bWVEYXRhLCBjdkF2YWlsYWJsZSlcclxuXHJcbiAgICAgIHJldHVybiBmaWxsZWRDb3VudFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2F1dG9maWxsJykge1xyXG4gICAgICAgIGF1dG9maWxsRm9ybShtZXNzYWdlLnJlc3VtZURhdGEsIG1lc3NhZ2UuY3ZBdmFpbGFibGUpLnRoZW4oZmlsbGVkQ291bnQgPT4ge1xyXG4gICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZmlsbGVkQ291bnQgfSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnZGV0ZWN0RmllbGRzJykge1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGZpZWxkQ291bnQ6IGdldEFsbEZvcm1GaWVsZHMoKS5sZW5ndGggfSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdbUkFFXSBBdXRvZmlsbCBjb250ZW50IHNjcmlwdCBsb2FkZWQnKVxyXG4gIH1cclxufSkiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDRkEsUUFBQSxhQUFBLG9CQUFBO0FBQUEsSUFBbUMsU0FBQSxDQUFBLFlBQUE7QUFBQSxJQUNYLE9BQUE7QUFBQSxJQUNmLE9BQUE7QUFpREwsWUFBQSxTQUFBO0FBQUEsUUFBdUMsS0FBQTtBQUFBLFFBQ2pDLE1BQUE7QUFBQSxRQUFlLEtBQUE7QUFBQSxRQUFjLE1BQUE7QUFBQSxRQUFnQixLQUFBO0FBQUEsUUFBZSxNQUFBO0FBQUEsUUFBYSxLQUFBO0FBQUEsUUFDekUsTUFBQTtBQUFBLFFBQWEsS0FBQTtBQUFBLFFBQVksTUFBQTtBQUFBLFFBQVcsS0FBQTtBQUFBLFFBQVUsTUFBQTtBQUFBLFFBQVksS0FBQTtBQUFBLFFBQzFELE1BQUE7QUFBQSxRQUFZLEtBQUE7QUFBQSxRQUFXLE1B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QSxNQUFBLFVBQUEsS0FBQTtBQUNBLGdCQUFBLGNBQUEsSUFBQSxNQUFBLFNBQUEsSUFBQSxDQUFBO0FBQ0EsZ0JBQUEsY0FBQSxJQUFBLE1BQUEsVUFBQSxJQUFBLENBQUE7QUFDQSxnQkFBQSxjQUFBLElBQUEsV0FBQSxTQUFBLEVBQUEsR0FBQSxNQUFBLE1BQUEsTUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxjQUFBLElBQUEsY0FBQSxXQUFBLEVBQUEsR0FBQSxNQUFBLEtBQUEsUUFBQSxDQUFBLENBQUE7QUFDQSxnQkFBQSxLQUFBO0FBQUEsTUFBYTtBQUlmLGVBQUEsY0FBQSxTQUFBLE1BQUEsT0FBQSxLQUFBO0FBQ0UsWUFBQSxDQUFBLEtBQUE7QUFDQSxjQUFBLEtBQUEsU0FBQSxNQUFBLFNBQUEsR0FBQSxHQUFBO0FBQ0EsY0FBQSxJQUFBLEtBQUEsU0FBQSxHQUFBLEdBQUE7QUFDQSxjQUFBLFFBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUE7QUFDQSxrQkFBQSxTQUFBLEtBQUE7QUFBQSxNQUF3QjtBQUkxQixlQUFBLGFBQUEsU0FBQSxPQUFBO0FBQ0UsWUFBQSxDQUFBLE1BQUEsUUFBQTtBQUNBLGNBQUEsYUFBQSxNQUFBLFlBQUEsRUFBQSxLQUFBO0FBQ0EsY0FBQSxVQUFBLE1BQUEsS0FBQSxRQUFBLE9BQUE7QUFDQSxZQUFBLFFBQUEsUUFBQSxLQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsWUFBQSxFQUFBLEtBQUEsTUFBQSxjQUFBLEVBQUEsTUFBQSxjQUFBLEtBQUEsTUFBQSxVQUFBO0FBQ0EsWUFBQSxDQUFBLE1BQUEsU0FBQSxRQUFBLEtBQUEsQ0FBQSxNQUFBO0FBQXdDLGdCQUFBLElBQUEsRUFBQSxLQUFBLFlBQUEsRUFBQSxLQUFBO0FBQXVDLGlCQUFBLEVBQUEsU0FBQSxNQUFBLFdBQUEsU0FBQSxDQUFBLEtBQUEsRUFBQSxTQUFBLFVBQUE7QUFBQSxRQUF1RSxDQUFBO0FBQ3RKLFlBQUEsQ0FBQSxNQUFBLFNBQUEsUUFBQSxLQUFBLENBQUEsTUFBQTtBQUF3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QUFBO0FBQ0EsWUFBQSxjQUFBO0FBRUEsY0FBQSxXQUFBLEdBQUEsV0FBQSxTQUFBLElBQUEsV0FBQSxRQUFBLEdBQUEsS0FBQTtBQUNBLGNBQUEsWUFBQSxXQUFBLGFBQUEsQ0FBQTtBQUNBLGNBQUEsWUFBQSxXQUFBLFlBQUEsQ0FBQTtBQUNBLGNBQUEsZ0JBQUEsV0FBQSxXQUFBLENBQUE7QUFDQSxjQUFBLGNBQUEsV0FBQSxZQUFBLENBQUEsV0FBQSxNQUFBLFdBQUEsT0FBQSxFQUFBLE9BQUEsT0FBQSxFQUFBLEtBQUEsSUFBQTtBQUVBLGNBQUEsYUFBQSxXQUFBLGFBQUEsV0FBQSxVQUFBLFdBQUEsWUFBQSxlQUFBLFFBQUE7QUFFQSxjQUFBLGlCQUFBLE1BQUE7QUFDRSxjQUFBLFNBQUE7QUFDQSxxQkFBQSxZQUFBLFFBQUEsQ0FBQSxRQUFBO0FBQ0Usa0JBQUEsUUFBQSxTQUFBLElBQUEsU0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBLFVBQUEsS0FBQTtBQUNBLGtCQUFBLFlBQUEsQ0FBQSxJQUFBLFdBQUEsSUFBQSxRQUFBLFlBQUEsRUFBQSxTQUFBLFNBQUE7QUFDQSxrQkFBQSxLQUFBLGFBQUEsb0JBQUEsS0FBQSxHQUFBLGdCQUFBLFNBQUEsSUFBQSxPQUFBO0FBQ0Esa0JBQUEsS0FBQSxhQUFBLG9CQUFBLEtBQUEsR0FBQSxhQUFBLElBQUEsU0FBQSxJQUFBLFFBQUEsS0FBQTtBQUNBLGtCQUFBLE1BQUEsS0FBQSxLQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLE1BQUEsS0FBQSxFQUFBLFdBQUEsTUFBQTtBQUFBLFVBQXlDLENBQUE7QUFFM0MsaUJBQUEsT0FBQSxLQUFBLElBQUEsR0FBQSxLQUFBLE1BQUEsU0FBQSxFQUFBLENBQUEsQ0FBQTtBQUFBLFFBQWtELEdBQUE7QUFHcEQsbUJBQUEsZUFBQSxHQUFBLFdBQUEsWUFBQSxJQUFBLFdBQUEsa0JBQUEsRUFBQSxHQUFBLEtBQUEsSUFBQTtBQUlBLGNBQUEsV0FBQTtBQUFBLFVBQXlDO0FBQUEsVUFDdkMsV0FBQSxXQUFBO0FBQUEs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L0MsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxTQUFTO0FBQy9DLFVBQUksU0FBUyxzQkFBc0I7QUFDakMsWUFBSSxLQUFLLFFBQVMsTUFBSyxnQkFBZ0IsSUFBRztBQUFBLE1BQzVDO0FBQ0EsYUFBTztBQUFBLFFBQ0wsS0FBSyxXQUFXLE1BQU0sSUFBSSxtQkFBbUIsSUFBSSxJQUFJO0FBQUEsUUFDckQ7QUFBQSxRQUNBO0FBQUEsVUFDRSxHQUFHO0FBQUEsVUFDSCxRQUFRLEtBQUs7QUFBQSxRQUNyQjtBQUFBLE1BQ0E7QUFBQSxJQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUtBLG9CQUFvQjtBQUNsQixXQUFLLE1BQU0sb0NBQW9DO0FBQy9DQyxlQUFPO0FBQUEsUUFDTCxtQkFBbUIsS0FBSyxpQkFBaUI7QUFBQSxNQUMvQztBQUFBLElBQ0U7QUFBQSxJQUNBLGlCQUFpQjtBQUNmLGFBQU87QUFBQSxRQUNMO0FBQUEsVUFDRSxNQUFNLHFCQUFxQjtBQUFBLFVBQzNCLG1CQUFtQixLQUFLO0FBQUEsVUFDeEIsV0FBVyxLQUFLLE9BQU0sRUFBRyxTQUFTLEVBQUUsRUFBRSxNQUFNLENBQUM7QUFBQSxRQUNyRDtBQUFBLFFBQ007QUFBQSxNQUNOO0FBQUEsSUFDRTtBQUFBLElBQ0EseUJBQXlCLE9BQU87QUFDOUIsWUFBTSx1QkFBdUIsTUFBTSxNQUFNLFNBQVMscUJBQXFCO0FBQ3ZFLFlBQU0sc0JBQXNCLE1BQU0sTUFBTSxzQkFBc0IsS0FBSztBQUNuRSxZQUFNLGlCQUFpQixDQUFDLEtBQUssbUJBQW1CLElBQUksTUFBTSxNQUFNLFNBQVM7QUFDekUsYUFBTyx3QkFBd0IsdUJBQXVCO0FBQUEsSUFDeEQ7QUFBQSxJQUNBLHNCQUFzQixTQUFTO0FBQzdCLFVBQUksVUFBVTtBQUNkLFlBQU0sS0FBSyxDQUFDLFVBQVU7QUFDcEIsWUFBSSxLQUFLLHlCQUF5QixLQUFLLEdBQUc7QUFDeEMsZUFBSyxtQkFBbUIsSUFBSSxNQUFNLEtBQUssU0FBUztBQUNoRCxnQkFBTSxXQUFXO0FBQ2pCLG9CQUFVO0FBQ1YsY0FBSSxZQUFZLFNBQVMsaUJBQWtCO0FBQzNDLGVBQUssa0JBQWlCO0FBQUEsUUFDeEI7QUFBQSxNQUNGO0FBQ0EsdUJBQWlCLFdBQVcsRUFBRTtBQUM5QixXQUFLLGNBQWMsTUFBTSxvQkFBb0IsV0FBVyxFQUFFLENBQUM7QUFBQSxJQUM3RDtBQUFBLEVBQ0Y7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwyLDMsNCw1LDYsN119
content;