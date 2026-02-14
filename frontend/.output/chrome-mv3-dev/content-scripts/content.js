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
      function convertSalary(amount, fromType, toType) {
        const num = parseFloat(amount);
        if (!num || !fromType || !toType || fromType === toType) return amount;
        const toMonthly = { hourly: 160, monthly: 1, yearly: 1 / 12 };
        const fromMonthly = { hourly: 1 / 160, monthly: 1, yearly: 12 };
        const monthly = num * (toMonthly[fromType] || 1);
        return String(Math.round(monthly * (fromMonthly[toType] || 1)));
      }
      function detectSalaryTypeFromLabel(label) {
        if (label.includes("hour") || label.includes("/hr") || label.includes("p/h")) return "hourly";
        if (label.includes("month") || label.includes("/mo") || label.includes("p/m")) return "monthly";
        if (label.includes("year") || label.includes("annual") || label.includes("/yr") || label.includes("per annum")) return "yearly";
        return null;
      }
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
        if (parent) parent.querySelectorAll('label, span[class*="label"], div[class*="label"], p').forEach((el) => sources.push(el.textContent || ""));
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
          { keywords: ["fullname", "full-name", "full_name", "yourname", "applicantname", "candidatename"], type: "fullName", confidence: 0.9 },
          { keywords: ["firstname", "first-name", "first_name", "fname", "given-name", "givenname", "forename", "first name", "given name"], type: "firstName", confidence: 0.95 },
          { keywords: ["lastname", "last-name", "last_name", "lname", "surname", "family-name", "familyname", "family name", "last name"], type: "lastName", confidence: 0.95 },
          { keywords: ["email", "e-mail", "emailaddress", "email address", "email-address", "mail"], type: "email", confidence: 0.95 },
          { keywords: ["mobile number", "mobile phone", "mobile-number", "mobilenumber", "cell number"], type: "phone", confidence: 0.95 },
          { keywords: ["phone", "telephone", "phonenumber", "phone-number", "phone number", "cell phone", "contact number", "tel"], type: "phone", confidence: 0.9 },
          { keywords: ["whatsapp", "whats app", "whatsapp number"], type: "whatsapp", confidence: 0.95 },
          { keywords: ["countrycode", "country-code", "dialcode", "dial-code", "calling code", "isd", "phone code", "mobile code"], type: "countryCode", confidence: 0.9 },
          { keywords: ["phone type", "phonetype", "type of phone", "contact type", "phone device type"], type: "phoneType", confidence: 0.85 },
          { keywords: ["full postal address", "postal address", "full address", "complete address", "mailing address"], type: "fullAddress", confidence: 0.95 },
          { keywords: ["streetaddress", "street-address", "address1", "address-line-1", "addressline1", "address line 1", "addr1", "street address"], type: "streetAddress", confidence: 0.85 },
          { keywords: ["city", "town", "suburb", "municipality"], type: "city", confidence: 0.9 },
          { keywords: ["zipcode", "zip-code", "zip", "postalcode", "postal-code", "postcode", "postal code"], type: "zipCode", confidence: 0.85 },
          { keywords: ["state", "province", "region", "county"], type: "state", confidence: 0.75 },
          { keywords: ["country", "nation", "country of residence", "country of origin", "citizenship", "nationality", "home country"], type: "country", confidence: 0.9 },
          { keywords: ["location", "residence", "based in", "current location", "preferred location", "work location"], type: "location", confidence: 0.8 },
          { keywords: ["summary", "professional summary", "about me", "bio", "profile", "objective", "describe yourself", "tell us about yourself", "personal statement"], type: "professionalSummary", confidence: 0.75 },
          { keywords: ["cover letter", "covering letter", "motivation letter", "motivational letter", "letter of motivation", "why do you want", "why are you interested", "why this role"], type: "coverLetter", confidence: 0.85 },
          { keywords: ["skill", "skills", "expertise", "competencies", "technologies", "tech stack", "tools", "technical skills", "key skills"], type: "skills", confidence: 0.75 },
          { keywords: ["jobtitle", "job-title", "job title", "currenttitle", "current title", "current job title", "desired title"], type: "jobTitle", confidence: 0.9 },
          { keywords: ["industry"], type: "industry", confidence: 0.75 },
          { keywords: ["company", "employer", "organization", "organisation", "current company", "current employer", "workplace"], type: "companyName", confidence: 0.85 },
          { keywords: ["start month", "startmonth", "start-month", "from month"], type: "expStartMonth", confidence: 0.9 },
          { keywords: ["start year", "startyear", "start-year", "from year", "year started"], type: "expStartYear", confidence: 0.9 },
          { keywords: ["end month", "endmonth", "end-month", "to month"], type: "expEndMonth", confidence: 0.9 },
          { keywords: ["end year", "endyear", "end-year", "to year", "year ended", "year finished"], type: "expEndYear", confidence: 0.9 },
          { keywords: ["highest education", "level of education", "education level", "degree level", "highest degree", "highest qualification"], type: "highestEdu", confidence: 0.9 },
          { keywords: ["do you have a degree", "have a degree", "have a bachelor", "have a master", "have a phd", "highest level of education"], type: "hasDegree", confidence: 0.9 },
          { keywords: ["school", "university", "college", "institution", "alma mater"], type: "schoolName", confidence: 0.85 },
          { keywords: ["degree", "major", "field of study", "fieldofstudy", "discipline", "qualification", "program", "area of study"], type: "fieldOfStudy", confidence: 0.8 },
          { keywords: ["graduation year", "grad year", "year of graduation", "completed year"], type: "eduEndYear", confidence: 0.85 },
          { keywords: ["enrollment year", "enrolment year", "year enrolled"], type: "eduStartYear", confidence: 0.8 },
          { keywords: ["project name", "projectname", "project title"], type: "projectName", confidence: 0.75 },
          { keywords: ["linkedin.com", "linkedin url", "linkedin profile", "linkedin link"], type: "linkedin", confidence: 0.98 },
          { keywords: ["linkedin"], type: "linkedin", confidence: 0.9 },
          { keywords: ["github", "github url", "github profile"], type: "github", confidence: 0.95 },
          { keywords: ["website", "personal website", "portfolio url", "portfolio link", "your website", "portfolio"], type: "website", confidence: 0.75 },
          { keywords: ["salary", "expected salary", "desired salary", "compensation", "salary expectation", "base salary", "remuneration"], type: "salary", confidence: 0.85 },
          { keywords: ["currency", "salary currency", "pay currency"], type: "salaryCurrency", confidence: 0.8 },
          { keywords: ["salary type", "pay type", "pay period", "compensation type"], type: "salaryType", confidence: 0.8 },
          { keywords: ["language", "languages spoken", "language proficiency"], type: "language", confidence: 0.75 },
          { keywords: ["language level", "proficiency", "fluency"], type: "languageLevel", confidence: 0.75 },
          { keywords: ["availability", "start date", "available from", "when can you start", "notice period"], type: "availability", confidence: 0.85 },
          { keywords: ["employment type", "job type", "work type", "position type", "contract type", "full time", "part time", "part-time", "full-time"], type: "employmentType", confidence: 0.85 },
          { keywords: ["years of experience", "experience years", "how many years", "total experience", "years experience"], type: "yearsOfExperience", confidence: 0.85 },
          { keywords: ["visa sponsorship", "require sponsorship", "need sponsorship", "require a visa", "visa required", "sponsorship required", "will you require visa", "do you require visa", "do you need sponsorship"], type: "visaSponsorship", confidence: 0.95 },
          { keywords: ["work authorization", "work authorisation", "authorized to work", "authorised to work", "legally authorized", "legally authorised", "right to work", "work permit", "eligible to work"], type: "workAuthorization", confidence: 0.9 },
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
              if (keyword === "name" && (combined.includes("first") || combined.includes("last") || combined.includes("full") || combined.includes("company") || combined.includes("school"))) continue;
              if (keyword === "title" && (combined.includes("mr") || combined.includes("ms") || combined.includes("salutation"))) continue;
              return { type: pattern.type, confidence: pattern.confidence };
            }
          }
        }
        if (/\bname\b/.test(combined) && !combined.includes("first") && !combined.includes("last") && !combined.includes("company") && !combined.includes("school") && !combined.includes("file")) {
          return { type: "fullName", confidence: 0.7 };
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
      function fillDateInput(element, year, month) {
        if (!year) return;
        fillField(element, `${year}-${(month || "01").padStart(2, "0")}-01`);
      }
      function tryFillDropdown(element, value) {
        if (!value) return false;
        const norm = value.toLowerCase().trim();
        const options = Array.from(element.options);
        let match = options.find((o) => o.text.toLowerCase().trim() === norm || o.value.toLowerCase().trim() === norm);
        if (!match) match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          return t.length > 1 && (norm.includes(t) || t.includes(norm));
        });
        if (!match) match = options.find((o) => {
          const v = o.value.toLowerCase().trim();
          return v.length > 1 && (norm.includes(v) || v.includes(norm));
        });
        if (!match && norm.length > 3) match = options.find((o) => o.text.toLowerCase().trim().startsWith(norm.substring(0, 4)));
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      }
      async function fillOtherTextField(element, value) {
        await new Promise((r) => setTimeout(r, 400));
        const container = element.closest("div, fieldset, li, section") || element.parentElement;
        if (!container) return;
        const newInput = container.querySelector(
          'input[type="text"]:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
        );
        if (newInput && !newInput.value) {
          fillField(newInput, value);
        }
      }
      function fillDropdown(element, value, otherFallbackValue) {
        if (tryFillDropdown(element, value)) return true;
        const otherOpt = Array.from(element.options).find(
          (o) => o.text.toLowerCase().trim() === "other" || o.value.toLowerCase().trim() === "other"
        );
        if (otherOpt) {
          element.value = otherOpt.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          if (value) {
            fillOtherTextField(element, value);
          }
          return true;
        }
        return false;
      }
      function fillMonthDropdown(element, monthValue) {
        if (!monthValue) return false;
        const monthName = MONTHS[monthValue] || monthValue.toLowerCase();
        const monthNum = monthValue.padStart(2, "0");
        const match = Array.from(element.options).find((o) => {
          const t = o.text.toLowerCase().trim();
          const v = o.value.toLowerCase().trim();
          return t === monthName || v === monthValue || v === monthNum || t.startsWith(monthName.substring(0, 3));
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillStateDropdown(element, value) {
        if (!value) return false;
        if (tryFillDropdown(element, value)) return true;
        const abbr = value.substring(0, 2).toLowerCase();
        const match = Array.from(element.options).find((o) => o.value.toLowerCase() === abbr || o.text.toLowerCase().startsWith(abbr));
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillCountryDropdown(element, country) {
        if (!country) return false;
        if (tryFillDropdown(element, country)) return true;
        const iso = country.length === 2 ? country.toLowerCase() : country.substring(0, 2).toLowerCase();
        const match = Array.from(element.options).find((o) => o.value.toLowerCase() === iso);
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillCountryCodeDropdown(element, countryCode, country) {
        if (!countryCode && !country) return false;
        const codeSearch = (countryCode || "").replace("+", "");
        const options = Array.from(element.options);
        let match = options.find((o) => {
          const t = o.text.toLowerCase();
          const v = o.value.toLowerCase();
          return v === countryCode || v === `+${codeSearch}` || v === codeSearch || t.includes(`+${codeSearch}`);
        });
        if (!match && country) match = options.find((o) => o.text.toLowerCase().includes(country.toLowerCase()) || o.value.toLowerCase().includes(country.toLowerCase().substring(0, 3)));
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
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
        const other = Array.from(element.options).find((o) => o.text.toLowerCase().trim() === "other" || o.value.toLowerCase().trim() === "other");
        if (other) {
          element.value = other.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillYesNoDropdown(element, answer) {
        const norm = answer.toLowerCase().trim();
        const options = Array.from(element.options);
        const match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          const v = o.value.toLowerCase().trim();
          return t === norm || v === norm || t.startsWith(norm) || v.startsWith(norm);
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        const numericVal = norm === "yes" ? "1" : norm === "no" ? "0" : null;
        if (numericVal) {
          const numMatch = options.find((o) => o.value === numericVal);
          if (numMatch) {
            element.value = numMatch.value;
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
        }
        return false;
      }
      function fillEmploymentTypeDropdown(element, value) {
        if (!value) return false;
        const val = value.toLowerCase();
        const match = Array.from(element.options).find((o) => {
          const t = o.text.toLowerCase();
          const v = o.value.toLowerCase();
          return t.includes(val) || v.includes(val) || val.includes("full") && (t.includes("full") || v.includes("full")) || val.includes("part") && (t.includes("part") || v.includes("part")) || val.includes("intern") && (t.includes("intern") || v.includes("intern")) || val.includes("contract") && (t.includes("contract") || v.includes("contract"));
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return fillDropdown(element, value);
      }
      function fillRadioGroup(name, value) {
        if (!name || !value) return false;
        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        if (!radios.length) return false;
        const norm = value.toLowerCase().trim();
        let matched;
        let usedOtherFallback = false;
        radios.forEach((radio) => {
          const lbl = findLabelForElement(radio).toLowerCase();
          const val = radio.value.toLowerCase().trim();
          if (val === norm || lbl.includes(norm) || norm.includes(val)) matched = radio;
        });
        if (!matched) {
          radios.forEach((radio) => {
            if (radio.value.toLowerCase() === "other" || findLabelForElement(radio).toLowerCase().includes("other")) {
              matched = radio;
              usedOtherFallback = true;
            }
          });
        }
        if (matched) {
          matched.checked = true;
          matched.dispatchEvent(new Event("change", { bubbles: true }));
          matched.dispatchEvent(new Event("click", { bubbles: true }));
          if (usedOtherFallback) {
            fillOtherTextField(matched, value);
          }
          return true;
        }
        return false;
      }
      function handleRadioButtons(resumeData) {
        const groups = /* @__PURE__ */ new Map();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (!radio.name || groups.has(radio.name)) return;
          const lbl = findLabelForElement(radio).toLowerCase();
          const nm = radio.name.toLowerCase();
          const combined = `${lbl} ${nm}`;
          if (combined.includes("phone type") || combined.includes("contact type")) {
            groups.set(radio.name, "home");
          } else if (combined.includes("whatsapp")) {
            groups.set(radio.name, "yes");
          } else if (combined.includes("visa sponsorship") || combined.includes("require sponsorship") || combined.includes("need sponsorship") || combined.includes("require a visa") || combined.includes("will you require visa") || combined.includes("do you require visa")) {
            groups.set(radio.name, resumeData.visaSponsorship || "no");
          } else if (combined.includes("work authorization") || combined.includes("work authorisation") || combined.includes("legally authorized") || combined.includes("legally authorised") || combined.includes("authorized to work") || combined.includes("right to work")) {
            groups.set(radio.name, resumeData.workAuthorization || "yes");
          } else if (combined.includes("relocat")) {
            groups.set(radio.name, "yes");
          } else if (combined.includes("gender") && resumeData.gender) {
            groups.set(radio.name, resumeData.gender);
          } else if (combined.includes("veteran")) {
            groups.set(radio.name, resumeData.veteran || "no");
          } else if (combined.includes("disability")) {
            groups.set(radio.name, resumeData.disability || "no");
          } else if (combined.includes("ethnicity") || combined.includes("race")) {
            if (resumeData.ethnicity) groups.set(radio.name, resumeData.ethnicity);
          } else if (combined.includes("degree") || combined.includes("bachelor") || combined.includes("master") || combined.includes("phd")) {
            const has = resumeData.education?.some((e) => e.schoolName || e.fieldOfStudy);
            groups.set(radio.name, has ? "yes" : "no");
          } else if (combined.includes("employment type") || combined.includes("full time") || combined.includes("full-time") || combined.includes("part time") || combined.includes("part-time")) {
            if (resumeData.employmentType) groups.set(radio.name, resumeData.employmentType);
          } else if (combined.includes("english")) {
            groups.set(radio.name, "yes");
          } else if (combined.includes("language") && resumeData.languages?.length) {
            resumeData.languages.forEach((lang) => {
              if (combined.includes(lang.language.toLowerCase())) groups.set(radio.name, "yes");
            });
          }
        });
        groups.forEach((value, name) => value && fillRadioGroup(name, value));
      }
      function isSkillYearsQuestion(label, skillName) {
        if (!label.includes(skillName.toLowerCase())) return false;
        const yearPatterns = [
          "how many years",
          "years of experience",
          "years experience",
          "how long",
          "how long have you",
          "years have you",
          "years working with",
          "years using",
          "years with"
        ];
        return yearPatterns.some((p) => label.includes(p));
      }
      function fillSkillExperienceFields(skills) {
        if (!skills?.length) return;
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]), select, textarea'
        ).forEach((el) => {
          const label = findLabelForElement(el);
          for (const skillEntry of skills) {
            const skillName = skillEntry.skill.trim();
            if (skillName.length < 2 || !skillEntry.yearStarted) continue;
            if (!isSkillYearsQuestion(label, skillName)) continue;
            const years = String(Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - parseInt(skillEntry.yearStarted)));
            if (el instanceof HTMLSelectElement) fillYearsDropdown(el, years);
            else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) fillField(el, years);
            break;
          }
        });
        const radioGroups = /* @__PURE__ */ new Map();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (!radio.name) return;
          if (!radioGroups.has(radio.name)) radioGroups.set(radio.name, []);
          radioGroups.get(radio.name).push(radio);
        });
        radioGroups.forEach((radios, name) => {
          const groupLabel = findLabelForElement(radios[0]);
          for (const skillEntry of skills) {
            const skillName = skillEntry.skill.trim();
            if (skillName.length < 2 || !skillEntry.yearStarted) continue;
            if (!isSkillYearsQuestion(groupLabel, skillName)) continue;
            const years = String(Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - parseInt(skillEntry.yearStarted)));
            fillRadioGroup(name, years);
            break;
          }
        });
      }
      async function fetchAndUploadFile(element, endpoint, fileName) {
        try {
          const stored = await chrome.storage.local.get(["auth_token", "api_url"]);
          if (!stored.auth_token || !stored.api_url) return false;
          const response = await chrome.runtime.sendMessage({
            action: "proxyFetchFile",
            url: `${stored.api_url}${endpoint}`,
            token: stored.auth_token
          });
          if (!response?.success) return false;
          const blob = await (await fetch(response.base64)).blob();
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
      async function handleAllFileInputs(cvAvailable) {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        document.querySelectorAll('button, [role="button"], a').forEach((btn) => {
          const txt = (btn.textContent?.toLowerCase().trim() || "") + " " + (btn.getAttribute("aria-label")?.toLowerCase() || "");
          if ((txt.includes("add file") || txt.includes("attach") || txt.includes("choose file") || txt.includes("upload file")) && !txt.includes("remove")) {
            const nearby = btn.closest("div, section, form")?.querySelector('input[type="file"]');
            if (nearby instanceof HTMLInputElement && !fileInputs.includes(nearby)) fileInputs.push(nearby);
          }
        });
        let resumeUploaded = false, cvUploaded = false;
        for (const input of fileInputs) {
          const combined = `${findLabelForElement(input)} ${input.id?.toLowerCase()} ${input.name?.toLowerCase()}`;
          const isResume = combined.includes("resume") || combined.includes("cv") || combined.includes("curriculum");
          const isCoverLetter = combined.includes("cover") || combined.includes("letter") || combined.includes("motivation");
          if (isCoverLetter && cvAvailable && !cvUploaded) {
            if (await fetchAndUploadFile(input, "/api/cv/view", "cover-letter.pdf")) cvUploaded = true;
          } else if (isResume && !resumeUploaded) {
            if (await fetchAndUploadFile(input, "/api/resume/view", "resume.pdf")) resumeUploaded = true;
          }
        }
        for (const input of fileInputs) {
          if (input.files && input.files.length > 0) continue;
          if (!resumeUploaded) {
            if (await fetchAndUploadFile(input, "/api/resume/view", "resume.pdf")) {
              resumeUploaded = true;
              continue;
            }
          }
          if (cvAvailable && !cvUploaded) {
            if (await fetchAndUploadFile(input, "/api/cv/view", "cover-letter.pdf")) cvUploaded = true;
          }
        }
      }
      async function clickAddAndFill(type, data) {
        const keywords = type === "experience" ? ["add experience", "add work", "add job", "add position", "add employment", "+ experience"] : ["add education", "add school", "add degree", "add qualification", "+ education"];
        const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(
          (b) => keywords.some((k) => (b.textContent?.toLowerCase().trim() || "").includes(k))
        );
        if (!btn) return;
        const before = document.querySelectorAll("input, textarea, select").length;
        btn.click();
        await new Promise((r) => setTimeout(r, 800));
        if (document.querySelectorAll("input, textarea, select").length > before) await fillAllFields(data);
      }
      async function fillAllFields(resumeData) {
        const fields = getAllFormFields();
        let filledCount = 0;
        const fullName = `${resumeData.firstName} ${resumeData.lastName}`.trim();
        const latestExp = resumeData.experience?.[0];
        const latestEdu = resumeData.education?.[0];
        const latestProject = resumeData.projects?.[0];
        const locationStr = resumeData.location || [resumeData.city, resumeData.country].filter(Boolean).join(", ");
        const fullAddress = [resumeData.streetAddress, resumeData.city, resumeData.state, resumeData.zipCode, resumeData.country].filter(Boolean).join(", ");
        const websiteUrl = resumeData.portfolio || resumeData.github || resumeData.linkedin || latestProject?.link || "";
        const skillNames = (resumeData.skills || []).map((s) => s.skill).join(", ");
        const hasDegree = resumeData.education?.some((e) => e.schoolName || e.fieldOfStudy);
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
        const valueMap = {
          fullName,
          firstName: resumeData.firstName,
          lastName: resumeData.lastName,
          email: resumeData.email,
          phone: resumeData.phone,
          whatsapp: resumeData.phone,
          countryCode: resumeData.countryCode || "",
          phoneNumber: resumeData.phoneNumber || resumeData.phone,
          phoneType: "Home",
          fullAddress,
          streetAddress: resumeData.streetAddress,
          city: resumeData.city,
          state: resumeData.state || "",
          zipCode: resumeData.zipCode || "",
          country: resumeData.country,
          location: locationStr,
          professionalSummary: resumeData.professionalSummary,
          coverLetter: resumeData.professionalSummary,
          skills: skillNames,
          jobTitle: latestExp?.jobTitle || "",
          industry: latestExp?.jobTitle || "",
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
          hasDegree: hasDegree ? "yes" : "no",
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
          employmentType: resumeData.employmentType || "",
          yearsOfExperience: totalExpYears,
          visaSponsorship: resumeData.visaSponsorship || "no",
          workAuthorization: resumeData.workAuthorization || "yes",
          relocation: "Yes",
          workAuth: resumeData.workAuthorization || "yes",
          gender: resumeData.gender || "",
          ethnicity: resumeData.ethnicity || "",
          veteran: resumeData.veteran || "No",
          disability: resumeData.disability || "No",
          referralSource: ""
        };
        for (const { element, type } of fields) {
          let value = valueMap[type] || "";
          if (type === "salary" && value && resumeData.salaryType) {
            const detected = detectSalaryTypeFromLabel(findLabelForElement(element));
            if (detected && detected !== resumeData.salaryType) value = convertSalary(value, resumeData.salaryType, detected);
          }
          if (!value) continue;
          if (element instanceof HTMLInputElement && element.type === "date") {
            if (type === "expStartYear") fillDateInput(element, latestExp?.startYear || "", latestExp?.startMonth || "01");
            else if (type === "expEndYear") fillDateInput(element, latestExp?.endYear || "", latestExp?.endMonth || "12");
            else if (type === "eduStartYear") fillDateInput(element, latestEdu?.startYear || "", "09");
            else if (type === "eduEndYear") fillDateInput(element, latestEdu?.endYear || "", "05");
            else fillDateInput(element, value);
            filledCount++;
          } else if (element instanceof HTMLSelectElement) {
            let ok = false;
            if (type === "expStartMonth" || type === "expEndMonth") ok = fillMonthDropdown(element, value);
            else if (type === "state") ok = fillStateDropdown(element, value);
            else if (type === "country") ok = fillCountryDropdown(element, value);
            else if (type === "countryCode") ok = fillCountryCodeDropdown(element, resumeData.countryCode || "", resumeData.country);
            else if (type === "highestEdu" || type === "fieldOfStudy") ok = fillEducationDropdown(element, value);
            else if (type === "yearsOfExperience") ok = fillYearsDropdown(element, value);
            else if (type === "visaSponsorship" || type === "workAuthorization" || type === "hasDegree") ok = fillYesNoDropdown(element, value);
            else if (type === "employmentType") ok = fillEmploymentTypeDropdown(element, value);
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
        const filledCount = await fillAllFields(resumeData);
        await new Promise((r) => setTimeout(r, 300));
        await clickAddAndFill("experience", resumeData);
        await clickAddAndFill("education", resumeData);
        await new Promise((r) => setTimeout(r, 300));
        handleRadioButtons(resumeData);
        fillSkillExperienceFields(resumeData.skills || []);
        await new Promise((r) => setTimeout(r, 200));
        await handleAllFileInputs(cvAvailable);
        return filledCount;
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "autofill") {
          autofillForm(message.resumeData, message.cvAvailable).then((filledCount) => {
            sendResponse({ success: true, filledCount });
          }).catch((err) => {
            console.error("[RAE] Autofill error:", err);
            sendResponse({ success: false, filledCount: 0 });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHd4dC1kZXYrYnJvd3NlckAwLjEuMzIvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuMTNfQHR5cGVzK25vZGVAMjUuXzYzNjE5NDQ1YzU4N2NkNGE2NjcyNzc1MWFkYzIyYTdhL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9pZGxlJyxcclxuXHJcbiAgbWFpbigpIHtcclxuICAgIGludGVyZmFjZSBTa2lsbEVudHJ5IHtcclxuICAgICAgc2tpbGw6IHN0cmluZ1xyXG4gICAgICB5ZWFyU3RhcnRlZDogc3RyaW5nXHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIFJlc3VtZURhdGEge1xyXG4gICAgICBmaXJzdE5hbWU6IHN0cmluZzsgbGFzdE5hbWU6IHN0cmluZzsgZW1haWw6IHN0cmluZzsgcGhvbmU6IHN0cmluZ1xyXG4gICAgICBjb3VudHJ5Q29kZTogc3RyaW5nOyBwaG9uZU51bWJlcjogc3RyaW5nOyBzdHJlZXRBZGRyZXNzOiBzdHJpbmdcclxuICAgICAgY2l0eTogc3RyaW5nOyBzdGF0ZTogc3RyaW5nOyB6aXBDb2RlOiBzdHJpbmc7IGNvdW50cnk6IHN0cmluZzsgbG9jYXRpb246IHN0cmluZ1xyXG4gICAgICBwcm9mZXNzaW9uYWxTdW1tYXJ5OiBzdHJpbmdcclxuICAgICAgc2tpbGxzOiBTa2lsbEVudHJ5W11cclxuICAgICAgZ2l0aHViOiBzdHJpbmc7IGxpbmtlZGluOiBzdHJpbmc7IHBvcnRmb2xpbzogc3RyaW5nXHJcbiAgICAgIGF2YWlsYWJpbGl0eTogc3RyaW5nOyBlbXBsb3ltZW50VHlwZTogc3RyaW5nXHJcbiAgICAgIHZpc2FTcG9uc29yc2hpcDogc3RyaW5nOyB3b3JrQXV0aG9yaXphdGlvbjogc3RyaW5nXHJcbiAgICAgIGxhbmd1YWdlczogQXJyYXk8eyBsYW5ndWFnZTogc3RyaW5nOyBsZXZlbDogc3RyaW5nIH0+XHJcbiAgICAgIHNhbGFyeUFtb3VudDogc3RyaW5nOyBzYWxhcnlDdXJyZW5jeTogc3RyaW5nOyBzYWxhcnlUeXBlOiBzdHJpbmdcclxuICAgICAgZ2VuZGVyOiBzdHJpbmc7IGV0aG5pY2l0eTogc3RyaW5nOyB2ZXRlcmFuOiBzdHJpbmc7IGRpc2FiaWxpdHk6IHN0cmluZ1xyXG4gICAgICBleHBlcmllbmNlOiBBcnJheTx7XHJcbiAgICAgICAgam9iVGl0bGU6IHN0cmluZzsgY29tcGFueU5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZ1xyXG4gICAgICAgIHN0YXJ0TW9udGg6IHN0cmluZzsgc3RhcnRZZWFyOiBzdHJpbmc7IGVuZE1vbnRoOiBzdHJpbmc7IGVuZFllYXI6IHN0cmluZ1xyXG4gICAgICB9PlxyXG4gICAgICBwcm9qZWN0czogQXJyYXk8eyBwcm9qZWN0TmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBsaW5rOiBzdHJpbmcgfT5cclxuICAgICAgZWR1Y2F0aW9uOiBBcnJheTx7IHNjaG9vbE5hbWU6IHN0cmluZzsgZmllbGRPZlN0dWR5OiBzdHJpbmc7IHN0YXJ0WWVhcjogc3RyaW5nOyBlbmRZZWFyOiBzdHJpbmcgfT5cclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgRmllbGRNYXBwaW5nIHtcclxuICAgICAgZWxlbWVudDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudFxyXG4gICAgICB0eXBlOiBzdHJpbmc7IGNvbmZpZGVuY2U6IG51bWJlclxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IE1PTlRIUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgJzEnOidqYW51YXJ5JywnMDEnOidqYW51YXJ5JywnMic6J2ZlYnJ1YXJ5JywnMDInOidmZWJydWFyeScsJzMnOidtYXJjaCcsJzAzJzonbWFyY2gnLFxyXG4gICAgICAnNCc6J2FwcmlsJywnMDQnOidhcHJpbCcsJzUnOidtYXknLCcwNSc6J21heScsJzYnOidqdW5lJywnMDYnOidqdW5lJyxcclxuICAgICAgJzcnOidqdWx5JywnMDcnOidqdWx5JywnOCc6J2F1Z3VzdCcsJzA4JzonYXVndXN0JywnOSc6J3NlcHRlbWJlcicsJzA5Jzonc2VwdGVtYmVyJyxcclxuICAgICAgJzEwJzonb2N0b2JlcicsJzExJzonbm92ZW1iZXInLCcxMic6J2RlY2VtYmVyJyxcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY29udmVydFNhbGFyeShhbW91bnQ6IHN0cmluZywgZnJvbVR5cGU6IHN0cmluZywgdG9UeXBlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICBjb25zdCBudW0gPSBwYXJzZUZsb2F0KGFtb3VudClcclxuICAgICAgaWYgKCFudW0gfHwgIWZyb21UeXBlIHx8ICF0b1R5cGUgfHwgZnJvbVR5cGUgPT09IHRvVHlwZSkgcmV0dXJuIGFtb3VudFxyXG4gICAgICBjb25zdCB0b01vbnRobHk6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IGhvdXJseTogMTYwLCBtb250aGx5OiAxLCB5ZWFybHk6IDEvMTIgfVxyXG4gICAgICBjb25zdCBmcm9tTW9udGhseTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHsgaG91cmx5OiAxLzE2MCwgbW9udGhseTogMSwgeWVhcmx5OiAxMiB9XHJcbiAgICAgIGNvbnN0IG1vbnRobHkgPSBudW0gKiAodG9Nb250aGx5W2Zyb21UeXBlXSB8fCAxKVxyXG4gICAgICByZXR1cm4gU3RyaW5nKE1hdGgucm91bmQobW9udGhseSAqIChmcm9tTW9udGhseVt0b1R5cGVdIHx8IDEpKSlcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZXRlY3RTYWxhcnlUeXBlRnJvbUxhYmVsKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgICAgaWYgKGxhYmVsLmluY2x1ZGVzKCdob3VyJykgfHwgbGFiZWwuaW5jbHVkZXMoJy9ocicpIHx8IGxhYmVsLmluY2x1ZGVzKCdwL2gnKSkgcmV0dXJuICdob3VybHknXHJcbiAgICAgIGlmIChsYWJlbC5pbmNsdWRlcygnbW9udGgnKSB8fCBsYWJlbC5pbmNsdWRlcygnL21vJykgfHwgbGFiZWwuaW5jbHVkZXMoJ3AvbScpKSByZXR1cm4gJ21vbnRobHknXHJcbiAgICAgIGlmIChsYWJlbC5pbmNsdWRlcygneWVhcicpIHx8IGxhYmVsLmluY2x1ZGVzKCdhbm51YWwnKSB8fCBsYWJlbC5pbmNsdWRlcygnL3lyJykgfHwgbGFiZWwuaW5jbHVkZXMoJ3BlciBhbm51bScpKSByZXR1cm4gJ3llYXJseSdcclxuICAgICAgcmV0dXJuIG51bGxcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0U2tpbGxZZWFycyhza2lsbHM6IFNraWxsRW50cnlbXSwgc2tpbGxOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICBjb25zdCBub3JtID0gc2tpbGxOYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gc2tpbGxzLmZpbmQocyA9PlxyXG4gICAgICAgIHMuc2tpbGwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhub3JtKSB8fCBub3JtLmluY2x1ZGVzKHMuc2tpbGwudG9Mb3dlckNhc2UoKSlcclxuICAgICAgKVxyXG4gICAgICBpZiAoIW1hdGNoPy55ZWFyU3RhcnRlZCkgcmV0dXJuICcnXHJcbiAgICAgIGNvbnN0IHllYXJzID0gbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIC0gcGFyc2VJbnQobWF0Y2gueWVhclN0YXJ0ZWQpXHJcbiAgICAgIHJldHVybiB5ZWFycyA+IDAgPyBTdHJpbmcoeWVhcnMpIDogJzAnXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gICAgICBjb25zdCBzb3VyY2VzOiBzdHJpbmdbXSA9IFtdXHJcbiAgICAgIGlmIChlbGVtZW50LmlkKSB7XHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBsYWJlbFtmb3I9XCIke0NTUy5lc2NhcGUoZWxlbWVudC5pZCl9XCJdYClcclxuICAgICAgICBpZiAobGFiZWwpIHNvdXJjZXMucHVzaChsYWJlbC50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwYXJlbnRMYWJlbCA9IGVsZW1lbnQuY2xvc2VzdCgnbGFiZWwnKVxyXG4gICAgICBpZiAocGFyZW50TGFiZWwpIHNvdXJjZXMucHVzaChwYXJlbnRMYWJlbC50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgY29uc3QgcHJldiA9IGVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZ1xyXG4gICAgICBpZiAocHJldiAmJiBbJ0xBQkVMJywnU1BBTicsJ1AnLCdESVYnXS5pbmNsdWRlcyhwcmV2LnRhZ05hbWUpKSBzb3VyY2VzLnB1c2gocHJldi50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgY29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50XHJcbiAgICAgIGlmIChwYXJlbnQpIHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKCdsYWJlbCwgc3BhbltjbGFzcyo9XCJsYWJlbFwiXSwgZGl2W2NsYXNzKj1cImxhYmVsXCJdLCBwJykuZm9yRWFjaChlbCA9PiBzb3VyY2VzLnB1c2goZWwudGV4dENvbnRlbnQgfHwgJycpKVxyXG4gICAgICBjb25zdCB3cmFwcGVyID0gZWxlbWVudC5jbG9zZXN0KCdkaXYsIGZpZWxkc2V0LCBsaSwgc2VjdGlvbicpXHJcbiAgICAgIGlmICh3cmFwcGVyKSB7XHJcbiAgICAgICAgY29uc3Qgd2wgPSB3cmFwcGVyLnF1ZXJ5U2VsZWN0b3IoJ2xhYmVsLCBsZWdlbmQsIHNwYW5bY2xhc3MqPVwibGFiZWxcIl0sIGRpdltjbGFzcyo9XCJsYWJlbFwiXScpXHJcbiAgICAgICAgaWYgKHdsKSBzb3VyY2VzLnB1c2god2wudGV4dENvbnRlbnQgfHwgJycpXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHNvdXJjZXMuam9pbignICcpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpLnRyaW0oKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBkZXRlY3RGaWVsZFR5cGUoZWxlbWVudDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudCk6IHsgdHlwZTogc3RyaW5nOyBjb25maWRlbmNlOiBudW1iZXIgfSB7XHJcbiAgICAgIGNvbnN0IGlkID0gZWxlbWVudC5pZD8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBuYW1lID0gZWxlbWVudC5uYW1lPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gKGVsZW1lbnQgYXMgSFRNTElucHV0RWxlbWVudCkucGxhY2Vob2xkZXI/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgYXJpYUxhYmVsID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBkYXRhQXR0ciA9IChlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1maWVsZCcpIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLXRlc3RpZCcpIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWN5JykgfHwgJycpLnRvTG93ZXJDYXNlKClcclxuICAgICAgY29uc3QgYXV0b2NvbXBsZXRlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2F1dG9jb21wbGV0ZScpPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IGxhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChlbGVtZW50KVxyXG4gICAgICBjb25zdCBjb21iaW5lZCA9IGAke2lkfSAke25hbWV9ICR7cGxhY2Vob2xkZXJ9ICR7YXJpYUxhYmVsfSAke2xhYmVsfSAke2RhdGFBdHRyfSAke2F1dG9jb21wbGV0ZX1gXHJcblxyXG4gICAgICBjb25zdCBwYXR0ZXJucyA9IFtcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2Z1bGxuYW1lJywnZnVsbC1uYW1lJywnZnVsbF9uYW1lJywneW91cm5hbWUnLCdhcHBsaWNhbnRuYW1lJywnY2FuZGlkYXRlbmFtZSddLCB0eXBlOiAnZnVsbE5hbWUnLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2ZpcnN0bmFtZScsJ2ZpcnN0LW5hbWUnLCdmaXJzdF9uYW1lJywnZm5hbWUnLCdnaXZlbi1uYW1lJywnZ2l2ZW5uYW1lJywnZm9yZW5hbWUnLCdmaXJzdCBuYW1lJywnZ2l2ZW4gbmFtZSddLCB0eXBlOiAnZmlyc3ROYW1lJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbGFzdG5hbWUnLCdsYXN0LW5hbWUnLCdsYXN0X25hbWUnLCdsbmFtZScsJ3N1cm5hbWUnLCdmYW1pbHktbmFtZScsJ2ZhbWlseW5hbWUnLCdmYW1pbHkgbmFtZScsJ2xhc3QgbmFtZSddLCB0eXBlOiAnbGFzdE5hbWUnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydlbWFpbCcsJ2UtbWFpbCcsJ2VtYWlsYWRkcmVzcycsJ2VtYWlsIGFkZHJlc3MnLCdlbWFpbC1hZGRyZXNzJywnbWFpbCddLCB0eXBlOiAnZW1haWwnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydtb2JpbGUgbnVtYmVyJywnbW9iaWxlIHBob25lJywnbW9iaWxlLW51bWJlcicsJ21vYmlsZW51bWJlcicsJ2NlbGwgbnVtYmVyJ10sIHR5cGU6ICdwaG9uZScsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3Bob25lJywndGVsZXBob25lJywncGhvbmVudW1iZXInLCdwaG9uZS1udW1iZXInLCdwaG9uZSBudW1iZXInLCdjZWxsIHBob25lJywnY29udGFjdCBudW1iZXInLCd0ZWwnXSwgdHlwZTogJ3Bob25lJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd3aGF0c2FwcCcsJ3doYXRzIGFwcCcsJ3doYXRzYXBwIG51bWJlciddLCB0eXBlOiAnd2hhdHNhcHAnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjb3VudHJ5Y29kZScsJ2NvdW50cnktY29kZScsJ2RpYWxjb2RlJywnZGlhbC1jb2RlJywnY2FsbGluZyBjb2RlJywnaXNkJywncGhvbmUgY29kZScsJ21vYmlsZSBjb2RlJ10sIHR5cGU6ICdjb3VudHJ5Q29kZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncGhvbmUgdHlwZScsJ3Bob25ldHlwZScsJ3R5cGUgb2YgcGhvbmUnLCdjb250YWN0IHR5cGUnLCdwaG9uZSBkZXZpY2UgdHlwZSddLCB0eXBlOiAncGhvbmVUeXBlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZnVsbCBwb3N0YWwgYWRkcmVzcycsJ3Bvc3RhbCBhZGRyZXNzJywnZnVsbCBhZGRyZXNzJywnY29tcGxldGUgYWRkcmVzcycsJ21haWxpbmcgYWRkcmVzcyddLCB0eXBlOiAnZnVsbEFkZHJlc3MnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdHJlZXRhZGRyZXNzJywnc3RyZWV0LWFkZHJlc3MnLCdhZGRyZXNzMScsJ2FkZHJlc3MtbGluZS0xJywnYWRkcmVzc2xpbmUxJywnYWRkcmVzcyBsaW5lIDEnLCdhZGRyMScsJ3N0cmVldCBhZGRyZXNzJ10sIHR5cGU6ICdzdHJlZXRBZGRyZXNzJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY2l0eScsJ3Rvd24nLCdzdWJ1cmInLCdtdW5pY2lwYWxpdHknXSwgdHlwZTogJ2NpdHknLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3ppcGNvZGUnLCd6aXAtY29kZScsJ3ppcCcsJ3Bvc3RhbGNvZGUnLCdwb3N0YWwtY29kZScsJ3Bvc3Rjb2RlJywncG9zdGFsIGNvZGUnXSwgdHlwZTogJ3ppcENvZGUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdGF0ZScsJ3Byb3ZpbmNlJywncmVnaW9uJywnY291bnR5J10sIHR5cGU6ICdzdGF0ZScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2NvdW50cnknLCduYXRpb24nLCdjb3VudHJ5IG9mIHJlc2lkZW5jZScsJ2NvdW50cnkgb2Ygb3JpZ2luJywnY2l0aXplbnNoaXAnLCduYXRpb25hbGl0eScsJ2hvbWUgY291bnRyeSddLCB0eXBlOiAnY291bnRyeScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbG9jYXRpb24nLCdyZXNpZGVuY2UnLCdiYXNlZCBpbicsJ2N1cnJlbnQgbG9jYXRpb24nLCdwcmVmZXJyZWQgbG9jYXRpb24nLCd3b3JrIGxvY2F0aW9uJ10sIHR5cGU6ICdsb2NhdGlvbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3VtbWFyeScsJ3Byb2Zlc3Npb25hbCBzdW1tYXJ5JywnYWJvdXQgbWUnLCdiaW8nLCdwcm9maWxlJywnb2JqZWN0aXZlJywnZGVzY3JpYmUgeW91cnNlbGYnLCd0ZWxsIHVzIGFib3V0IHlvdXJzZWxmJywncGVyc29uYWwgc3RhdGVtZW50J10sIHR5cGU6ICdwcm9mZXNzaW9uYWxTdW1tYXJ5JywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY292ZXIgbGV0dGVyJywnY292ZXJpbmcgbGV0dGVyJywnbW90aXZhdGlvbiBsZXR0ZXInLCdtb3RpdmF0aW9uYWwgbGV0dGVyJywnbGV0dGVyIG9mIG1vdGl2YXRpb24nLCd3aHkgZG8geW91IHdhbnQnLCd3aHkgYXJlIHlvdSBpbnRlcmVzdGVkJywnd2h5IHRoaXMgcm9sZSddLCB0eXBlOiAnY292ZXJMZXR0ZXInLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydza2lsbCcsJ3NraWxscycsJ2V4cGVydGlzZScsJ2NvbXBldGVuY2llcycsJ3RlY2hub2xvZ2llcycsJ3RlY2ggc3RhY2snLCd0b29scycsJ3RlY2huaWNhbCBza2lsbHMnLCdrZXkgc2tpbGxzJ10sIHR5cGU6ICdza2lsbHMnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydqb2J0aXRsZScsJ2pvYi10aXRsZScsJ2pvYiB0aXRsZScsJ2N1cnJlbnR0aXRsZScsJ2N1cnJlbnQgdGl0bGUnLCdjdXJyZW50IGpvYiB0aXRsZScsJ2Rlc2lyZWQgdGl0bGUnXSwgdHlwZTogJ2pvYlRpdGxlJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydpbmR1c3RyeSddLCB0eXBlOiAnaW5kdXN0cnknLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydjb21wYW55JywnZW1wbG95ZXInLCdvcmdhbml6YXRpb24nLCdvcmdhbmlzYXRpb24nLCdjdXJyZW50IGNvbXBhbnknLCdjdXJyZW50IGVtcGxveWVyJywnd29ya3BsYWNlJ10sIHR5cGU6ICdjb21wYW55TmFtZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3N0YXJ0IG1vbnRoJywnc3RhcnRtb250aCcsJ3N0YXJ0LW1vbnRoJywnZnJvbSBtb250aCddLCB0eXBlOiAnZXhwU3RhcnRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgeWVhcicsJ3N0YXJ0eWVhcicsJ3N0YXJ0LXllYXInLCdmcm9tIHllYXInLCd5ZWFyIHN0YXJ0ZWQnXSwgdHlwZTogJ2V4cFN0YXJ0WWVhcicsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5kIG1vbnRoJywnZW5kbW9udGgnLCdlbmQtbW9udGgnLCd0byBtb250aCddLCB0eXBlOiAnZXhwRW5kTW9udGgnLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VuZCB5ZWFyJywnZW5keWVhcicsJ2VuZC15ZWFyJywndG8geWVhcicsJ3llYXIgZW5kZWQnLCd5ZWFyIGZpbmlzaGVkJ10sIHR5cGU6ICdleHBFbmRZZWFyJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydoaWdoZXN0IGVkdWNhdGlvbicsJ2xldmVsIG9mIGVkdWNhdGlvbicsJ2VkdWNhdGlvbiBsZXZlbCcsJ2RlZ3JlZSBsZXZlbCcsJ2hpZ2hlc3QgZGVncmVlJywnaGlnaGVzdCBxdWFsaWZpY2F0aW9uJ10sIHR5cGU6ICdoaWdoZXN0RWR1JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydkbyB5b3UgaGF2ZSBhIGRlZ3JlZScsJ2hhdmUgYSBkZWdyZWUnLCdoYXZlIGEgYmFjaGVsb3InLCdoYXZlIGEgbWFzdGVyJywnaGF2ZSBhIHBoZCcsJ2hpZ2hlc3QgbGV2ZWwgb2YgZWR1Y2F0aW9uJ10sIHR5cGU6ICdoYXNEZWdyZWUnLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NjaG9vbCcsJ3VuaXZlcnNpdHknLCdjb2xsZWdlJywnaW5zdGl0dXRpb24nLCdhbG1hIG1hdGVyJ10sIHR5cGU6ICdzY2hvb2xOYW1lJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZGVncmVlJywnbWFqb3InLCdmaWVsZCBvZiBzdHVkeScsJ2ZpZWxkb2ZzdHVkeScsJ2Rpc2NpcGxpbmUnLCdxdWFsaWZpY2F0aW9uJywncHJvZ3JhbScsJ2FyZWEgb2Ygc3R1ZHknXSwgdHlwZTogJ2ZpZWxkT2ZTdHVkeScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZ3JhZHVhdGlvbiB5ZWFyJywnZ3JhZCB5ZWFyJywneWVhciBvZiBncmFkdWF0aW9uJywnY29tcGxldGVkIHllYXInXSwgdHlwZTogJ2VkdUVuZFllYXInLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydlbnJvbGxtZW50IHllYXInLCdlbnJvbG1lbnQgeWVhcicsJ3llYXIgZW5yb2xsZWQnXSwgdHlwZTogJ2VkdVN0YXJ0WWVhcicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncHJvamVjdCBuYW1lJywncHJvamVjdG5hbWUnLCdwcm9qZWN0IHRpdGxlJ10sIHR5cGU6ICdwcm9qZWN0TmFtZScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xpbmtlZGluLmNvbScsJ2xpbmtlZGluIHVybCcsJ2xpbmtlZGluIHByb2ZpbGUnLCdsaW5rZWRpbiBsaW5rJ10sIHR5cGU6ICdsaW5rZWRpbicsIGNvbmZpZGVuY2U6IDAuOTggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xpbmtlZGluJ10sIHR5cGU6ICdsaW5rZWRpbicsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZ2l0aHViJywnZ2l0aHViIHVybCcsJ2dpdGh1YiBwcm9maWxlJ10sIHR5cGU6ICdnaXRodWInLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd3ZWJzaXRlJywncGVyc29uYWwgd2Vic2l0ZScsJ3BvcnRmb2xpbyB1cmwnLCdwb3J0Zm9saW8gbGluaycsJ3lvdXIgd2Vic2l0ZScsJ3BvcnRmb2xpbyddLCB0eXBlOiAnd2Vic2l0ZScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NhbGFyeScsJ2V4cGVjdGVkIHNhbGFyeScsJ2Rlc2lyZWQgc2FsYXJ5JywnY29tcGVuc2F0aW9uJywnc2FsYXJ5IGV4cGVjdGF0aW9uJywnYmFzZSBzYWxhcnknLCdyZW11bmVyYXRpb24nXSwgdHlwZTogJ3NhbGFyeScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2N1cnJlbmN5Jywnc2FsYXJ5IGN1cnJlbmN5JywncGF5IGN1cnJlbmN5J10sIHR5cGU6ICdzYWxhcnlDdXJyZW5jeScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc2FsYXJ5IHR5cGUnLCdwYXkgdHlwZScsJ3BheSBwZXJpb2QnLCdjb21wZW5zYXRpb24gdHlwZSddLCB0eXBlOiAnc2FsYXJ5VHlwZScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbGFuZ3VhZ2UnLCdsYW5ndWFnZXMgc3Bva2VuJywnbGFuZ3VhZ2UgcHJvZmljaWVuY3knXSwgdHlwZTogJ2xhbmd1YWdlJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbGFuZ3VhZ2UgbGV2ZWwnLCdwcm9maWNpZW5jeScsJ2ZsdWVuY3knXSwgdHlwZTogJ2xhbmd1YWdlTGV2ZWwnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydhdmFpbGFiaWxpdHknLCdzdGFydCBkYXRlJywnYXZhaWxhYmxlIGZyb20nLCd3aGVuIGNhbiB5b3Ugc3RhcnQnLCdub3RpY2UgcGVyaW9kJ10sIHR5cGU6ICdhdmFpbGFiaWxpdHknLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydlbXBsb3ltZW50IHR5cGUnLCdqb2IgdHlwZScsJ3dvcmsgdHlwZScsJ3Bvc2l0aW9uIHR5cGUnLCdjb250cmFjdCB0eXBlJywnZnVsbCB0aW1lJywncGFydCB0aW1lJywncGFydC10aW1lJywnZnVsbC10aW1lJ10sIHR5cGU6ICdlbXBsb3ltZW50VHlwZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3llYXJzIG9mIGV4cGVyaWVuY2UnLCdleHBlcmllbmNlIHllYXJzJywnaG93IG1hbnkgeWVhcnMnLCd0b3RhbCBleHBlcmllbmNlJywneWVhcnMgZXhwZXJpZW5jZSddLCB0eXBlOiAneWVhcnNPZkV4cGVyaWVuY2UnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd2aXNhIHNwb25zb3JzaGlwJywncmVxdWlyZSBzcG9uc29yc2hpcCcsJ25lZWQgc3BvbnNvcnNoaXAnLCdyZXF1aXJlIGEgdmlzYScsJ3Zpc2EgcmVxdWlyZWQnLCdzcG9uc29yc2hpcCByZXF1aXJlZCcsJ3dpbGwgeW91IHJlcXVpcmUgdmlzYScsJ2RvIHlvdSByZXF1aXJlIHZpc2EnLCdkbyB5b3UgbmVlZCBzcG9uc29yc2hpcCddLCB0eXBlOiAndmlzYVNwb25zb3JzaGlwJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd29yayBhdXRob3JpemF0aW9uJywnd29yayBhdXRob3Jpc2F0aW9uJywnYXV0aG9yaXplZCB0byB3b3JrJywnYXV0aG9yaXNlZCB0byB3b3JrJywnbGVnYWxseSBhdXRob3JpemVkJywnbGVnYWxseSBhdXRob3Jpc2VkJywncmlnaHQgdG8gd29yaycsJ3dvcmsgcGVybWl0JywnZWxpZ2libGUgdG8gd29yayddLCB0eXBlOiAnd29ya0F1dGhvcml6YXRpb24nLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3dpbGxpbmcgdG8gcmVsb2NhdGUnLCdvcGVuIHRvIHJlbG9jYXRlJywncmVsb2NhdGlvbicsJ3JlbG9jYXRlJ10sIHR5cGU6ICdyZWxvY2F0aW9uJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydnZW5kZXInLCdzZXgnXSwgdHlwZTogJ2dlbmRlcicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncmFjZScsJ2V0aG5pY2l0eScsJ2V0aG5pYyddLCB0eXBlOiAnZXRobmljaXR5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd2ZXRlcmFuJywnbWlsaXRhcnknLCdhcm1lZCBmb3JjZXMnXSwgdHlwZTogJ3ZldGVyYW4nLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2Rpc2FiaWxpdHknLCdkaXNhYmxlZCcsJ2ltcGFpcm1lbnQnXSwgdHlwZTogJ2Rpc2FiaWxpdHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2hvdyBkaWQgeW91IGhlYXInLCdyZWZlcnJhbCBzb3VyY2UnLCd3aGVyZSBkaWQgeW91IGhlYXInXSwgdHlwZTogJ3JlZmVycmFsU291cmNlJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xyXG4gICAgICAgIGZvciAoY29uc3Qga2V5d29yZCBvZiBwYXR0ZXJuLmtleXdvcmRzKSB7XHJcbiAgICAgICAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoa2V5d29yZCkpIHtcclxuICAgICAgICAgICAgaWYgKGtleXdvcmQgPT09ICduYW1lJyAmJiAoY29tYmluZWQuaW5jbHVkZXMoJ2ZpcnN0JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2xhc3QnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZnVsbCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjb21wYW55JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3NjaG9vbCcpKSkgY29udGludWVcclxuICAgICAgICAgICAgaWYgKGtleXdvcmQgPT09ICd0aXRsZScgJiYgKGNvbWJpbmVkLmluY2x1ZGVzKCdtcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdtcycpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdzYWx1dGF0aW9uJykpKSBjb250aW51ZVxyXG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiBwYXR0ZXJuLnR5cGUsIGNvbmZpZGVuY2U6IHBhdHRlcm4uY29uZmlkZW5jZSB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoL1xcYm5hbWVcXGIvLnRlc3QoY29tYmluZWQpICYmICFjb21iaW5lZC5pbmNsdWRlcygnZmlyc3QnKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ2xhc3QnKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ2NvbXBhbnknKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ3NjaG9vbCcpICYmICFjb21iaW5lZC5pbmNsdWRlcygnZmlsZScpKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2Z1bGxOYW1lJywgY29uZmlkZW5jZTogMC43IH1cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHsgdHlwZTogJ3Vua25vd24nLCBjb25maWRlbmNlOiAwIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRBbGxGb3JtRmllbGRzKCk6IEZpZWxkTWFwcGluZ1tdIHtcclxuICAgICAgY29uc3QgZmllbGRzOiBGaWVsZE1hcHBpbmdbXSA9IFtdXHJcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXHJcbiAgICAgICAgJ2lucHV0Om5vdChbdHlwZT1cInN1Ym1pdFwiXSk6bm90KFt0eXBlPVwiYnV0dG9uXCJdKTpub3QoW3R5cGU9XCJoaWRkZW5cIl0pOm5vdChbdHlwZT1cImZpbGVcIl0pOm5vdChbdHlwZT1cImltYWdlXCJdKTpub3QoW3R5cGU9XCJyZXNldFwiXSk6bm90KFt0eXBlPVwiY2hlY2tib3hcIl0pLCB0ZXh0YXJlYSwgc2VsZWN0J1xyXG4gICAgICApLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgaWYgKCEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpICYmICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQpICYmICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50KSkgcmV0dXJuXHJcbiAgICAgICAgY29uc3QgeyB0eXBlLCBjb25maWRlbmNlIH0gPSBkZXRlY3RGaWVsZFR5cGUoZWxlbWVudClcclxuICAgICAgICBpZiAoY29uZmlkZW5jZSA+IDAuNSkgZmllbGRzLnB1c2goeyBlbGVtZW50LCB0eXBlLCBjb25maWRlbmNlIH0pXHJcbiAgICAgIH0pXHJcbiAgICAgIHJldHVybiBmaWVsZHNcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbEZpZWxkKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50LCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVyblxyXG4gICAgICBlbGVtZW50LmZvY3VzKClcclxuICAgICAgY29uc3QgaW5wdXRTZXR0ZXIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHdpbmRvdy5IVE1MSW5wdXRFbGVtZW50LnByb3RvdHlwZSwgJ3ZhbHVlJyk/LnNldFxyXG4gICAgICBjb25zdCB0ZXh0YXJlYVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LkhUTUxUZXh0QXJlYUVsZW1lbnQucHJvdG90eXBlLCAndmFsdWUnKT8uc2V0XHJcbiAgICAgIGNvbnN0IHNldHRlciA9IGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50ID8gaW5wdXRTZXR0ZXIgOiB0ZXh0YXJlYVNldHRlclxyXG4gICAgICBpZiAoc2V0dGVyKSBzZXR0ZXIuY2FsbChlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgZWxzZSBlbGVtZW50LnZhbHVlID0gdmFsdWVcclxuICAgICAgY29uc3Qgb3B0cyA9IHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgY29tcG9zZWQ6IHRydWUgfVxyXG4gICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIG9wdHMpKVxyXG4gICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCBvcHRzKSlcclxuICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBJbnB1dEV2ZW50KCdpbnB1dCcsIHsgLi4ub3B0cywgZGF0YTogdmFsdWUgfSkpXHJcbiAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgS2V5Ym9hcmRFdmVudCgna2V5ZG93bicsIHsgLi4ub3B0cywga2V5OiAnRW50ZXInIH0pKVxyXG4gICAgICBlbGVtZW50LmJsdXIoKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsRGF0ZUlucHV0KGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQsIHllYXI6IHN0cmluZywgbW9udGg/OiBzdHJpbmcpIHtcclxuICAgICAgaWYgKCF5ZWFyKSByZXR1cm5cclxuICAgICAgZmlsbEZpZWxkKGVsZW1lbnQsIGAke3llYXJ9LSR7KG1vbnRoIHx8ICcwMScpLnBhZFN0YXJ0KDIsICcwJyl9LTAxYClcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gdHJ5RmlsbERyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCBub3JtID0gdmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKVxyXG4gICAgICBsZXQgbWF0Y2ggPSBvcHRpb25zLmZpbmQobyA9PiBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCkgPT09IG5vcm0gfHwgby52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gbm9ybSlcclxuICAgICAgaWYgKCFtYXRjaCkgbWF0Y2ggPSBvcHRpb25zLmZpbmQobyA9PiB7IGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCk7IHJldHVybiB0Lmxlbmd0aCA+IDEgJiYgKG5vcm0uaW5jbHVkZXModCkgfHwgdC5pbmNsdWRlcyhub3JtKSkgfSlcclxuICAgICAgaWYgKCFtYXRjaCkgbWF0Y2ggPSBvcHRpb25zLmZpbmQobyA9PiB7IGNvbnN0IHYgPSBvLnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpOyByZXR1cm4gdi5sZW5ndGggPiAxICYmIChub3JtLmluY2x1ZGVzKHYpIHx8IHYuaW5jbHVkZXMobm9ybSkpIH0pXHJcbiAgICAgIGlmICghbWF0Y2ggJiYgbm9ybS5sZW5ndGggPiAzKSBtYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IG8udGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKS5zdGFydHNXaXRoKG5vcm0uc3Vic3RyaW5nKDAsIDQpKSlcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICBhc3luYyBmdW5jdGlvbiBmaWxsT3RoZXJUZXh0RmllbGQoZWxlbWVudDogSFRNTEVsZW1lbnQsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDQwMCkpXHJcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGVsZW1lbnQuY2xvc2VzdCgnZGl2LCBmaWVsZHNldCwgbGksIHNlY3Rpb24nKSB8fCBlbGVtZW50LnBhcmVudEVsZW1lbnRcclxuICAgICAgaWYgKCFjb250YWluZXIpIHJldHVyblxyXG4gICAgICBjb25zdCBuZXdJbnB1dCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50PihcclxuICAgICAgICAnaW5wdXRbdHlwZT1cInRleHRcIl06bm90KFtkaXNhYmxlZF0pOm5vdChbcmVhZG9ubHldKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pOm5vdChbcmVhZG9ubHldKSdcclxuICAgICAgKVxyXG4gICAgICBpZiAobmV3SW5wdXQgJiYgIW5ld0lucHV0LnZhbHVlKSB7XHJcbiAgICAgICAgZmlsbEZpZWxkKG5ld0lucHV0LCB2YWx1ZSlcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgdmFsdWU6IHN0cmluZywgb3RoZXJGYWxsYmFja1ZhbHVlPzogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICh0cnlGaWxsRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpKSByZXR1cm4gdHJ1ZVxyXG4gICAgICBjb25zdCBvdGhlck9wdCA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKS5maW5kKG8gPT5cclxuICAgICAgICBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCkgPT09ICdvdGhlcicgfHwgby52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gJ290aGVyJ1xyXG4gICAgICApXHJcbiAgICAgIGlmIChvdGhlck9wdCkge1xyXG4gICAgICAgIGVsZW1lbnQudmFsdWUgPSBvdGhlck9wdC52YWx1ZVxyXG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBpZiAob3RoZXJGYWxsYmFja1ZhbHVlIHx8IHZhbHVlKSB7XHJcbiAgICAgICAgICBmaWxsT3RoZXJUZXh0RmllbGQoZWxlbWVudCwgb3RoZXJGYWxsYmFja1ZhbHVlIHx8IHZhbHVlKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxNb250aERyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCBtb250aFZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCFtb250aFZhbHVlKSByZXR1cm4gZmFsc2VcclxuICAgICAgY29uc3QgbW9udGhOYW1lID0gTU9OVEhTW21vbnRoVmFsdWVdIHx8IG1vbnRoVmFsdWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICBjb25zdCBtb250aE51bSA9IG1vbnRoVmFsdWUucGFkU3RhcnQoMiwgJzAnKVxyXG4gICAgICBjb25zdCBtYXRjaCA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKS5maW5kKG8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCk7IGNvbnN0IHYgPSBvLnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpXHJcbiAgICAgICAgcmV0dXJuIHQgPT09IG1vbnRoTmFtZSB8fCB2ID09PSBtb250aFZhbHVlIHx8IHYgPT09IG1vbnRoTnVtIHx8IHQuc3RhcnRzV2l0aChtb250aE5hbWUuc3Vic3RyaW5nKDAsIDMpKVxyXG4gICAgICB9KVxyXG4gICAgICBpZiAobWF0Y2gpIHsgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlOyBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpOyByZXR1cm4gdHJ1ZSB9XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxTdGF0ZURyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZVxyXG4gICAgICBpZiAodHJ5RmlsbERyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKSkgcmV0dXJuIHRydWVcclxuICAgICAgY29uc3QgYWJiciA9IHZhbHVlLnN1YnN0cmluZygwLCAyKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiBvLnZhbHVlLnRvTG93ZXJDYXNlKCkgPT09IGFiYnIgfHwgby50ZXh0LnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aChhYmJyKSlcclxuICAgICAgaWYgKG1hdGNoKSB7IGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsQ291bnRyeURyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCBjb3VudHJ5OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCFjb3VudHJ5KSByZXR1cm4gZmFsc2VcclxuICAgICAgaWYgKHRyeUZpbGxEcm9wZG93bihlbGVtZW50LCBjb3VudHJ5KSkgcmV0dXJuIHRydWVcclxuICAgICAgY29uc3QgaXNvID0gY291bnRyeS5sZW5ndGggPT09IDIgPyBjb3VudHJ5LnRvTG93ZXJDYXNlKCkgOiBjb3VudHJ5LnN1YnN0cmluZygwLCAyKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiBvLnZhbHVlLnRvTG93ZXJDYXNlKCkgPT09IGlzbylcclxuICAgICAgaWYgKG1hdGNoKSB7IGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsQ291bnRyeUNvZGVEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgY291bnRyeUNvZGU6IHN0cmluZywgY291bnRyeTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghY291bnRyeUNvZGUgJiYgIWNvdW50cnkpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCBjb2RlU2VhcmNoID0gKGNvdW50cnlDb2RlIHx8ICcnKS5yZXBsYWNlKCcrJywgJycpXHJcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBBcnJheS5mcm9tKGVsZW1lbnQub3B0aW9ucylcclxuICAgICAgbGV0IG1hdGNoID0gb3B0aW9ucy5maW5kKG8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKTsgY29uc3QgdiA9IG8udmFsdWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIHJldHVybiB2ID09PSBjb3VudHJ5Q29kZSB8fCB2ID09PSBgKyR7Y29kZVNlYXJjaH1gIHx8IHYgPT09IGNvZGVTZWFyY2ggfHwgdC5pbmNsdWRlcyhgKyR7Y29kZVNlYXJjaH1gKVxyXG4gICAgICB9KVxyXG4gICAgICBpZiAoIW1hdGNoICYmIGNvdW50cnkpIG1hdGNoID0gb3B0aW9ucy5maW5kKG8gPT4gby50ZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoY291bnRyeS50b0xvd2VyQ2FzZSgpKSB8fCBvLnZhbHVlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoY291bnRyeS50b0xvd2VyQ2FzZSgpLnN1YnN0cmluZygwLCAzKSkpXHJcbiAgICAgIGlmIChtYXRjaCkgeyBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7IGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSk7IHJldHVybiB0cnVlIH1cclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbEVkdWNhdGlvbkRyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCB2YWwgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG8udGV4dC50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgcmV0dXJuIHQuaW5jbHVkZXModmFsKSB8fCAodmFsLmluY2x1ZGVzKCdiYWNoZWxvcicpICYmIHQuaW5jbHVkZXMoJ2JhY2hlbG9yJykpIHx8ICh2YWwuaW5jbHVkZXMoJ21hc3RlcicpICYmIHQuaW5jbHVkZXMoJ21hc3RlcicpKSB8fCAoKHZhbC5pbmNsdWRlcygncGhkJykgfHwgdmFsLmluY2x1ZGVzKCdkb2N0b3InKSkgJiYgKHQuaW5jbHVkZXMoJ2RvY3RvcicpIHx8IHQuaW5jbHVkZXMoJ3BoZCcpKSlcclxuICAgICAgfSlcclxuICAgICAgaWYgKG1hdGNoKSB7IGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsWWVhcnNEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgeWVhcnM6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICBpZiAoIXllYXJzKSByZXR1cm4gZmFsc2VcclxuICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQoeWVhcnMpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG8udGV4dC50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgaWYgKHQuaW5jbHVkZXMoeWVhcnMpKSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIGNvbnN0IG51bXMgPSB0Lm1hdGNoKC9cXGQrL2cpXHJcbiAgICAgICAgaWYgKG51bXMpIHtcclxuICAgICAgICAgIGNvbnN0IGZpcnN0ID0gcGFyc2VJbnQobnVtc1swXSlcclxuICAgICAgICAgIGlmIChudW1zLmxlbmd0aCA9PT0gMSAmJiB0LmluY2x1ZGVzKCcrJykgJiYgbnVtID49IGZpcnN0KSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgaWYgKG51bXMubGVuZ3RoID09PSAyICYmIG51bSA+PSBmaXJzdCAmJiBudW0gPD0gcGFyc2VJbnQobnVtc1sxXSkpIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICB9KVxyXG4gICAgICBpZiAobWF0Y2gpIHsgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlOyBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpOyByZXR1cm4gdHJ1ZSB9XHJcbiAgICAgIGNvbnN0IG90aGVyID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCkgPT09ICdvdGhlcicgfHwgby52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gJ290aGVyJylcclxuICAgICAgaWYgKG90aGVyKSB7IGVsZW1lbnQudmFsdWUgPSBvdGhlci52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsWWVzTm9Ecm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgYW5zd2VyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgY29uc3Qgbm9ybSA9IGFuc3dlci50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICBjb25zdCBvcHRpb25zID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gb3B0aW9ucy5maW5kKG8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvLnRleHQudG9Mb3dlckNhc2UoKS50cmltKCk7IGNvbnN0IHYgPSBvLnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpXHJcbiAgICAgICAgcmV0dXJuIHQgPT09IG5vcm0gfHwgdiA9PT0gbm9ybSB8fCB0LnN0YXJ0c1dpdGgobm9ybSkgfHwgdi5zdGFydHNXaXRoKG5vcm0pXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChtYXRjaCkgeyBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7IGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSk7IHJldHVybiB0cnVlIH1cclxuICAgICAgY29uc3QgbnVtZXJpY1ZhbCA9IG5vcm0gPT09ICd5ZXMnID8gJzEnIDogbm9ybSA9PT0gJ25vJyA/ICcwJyA6IG51bGxcclxuICAgICAgaWYgKG51bWVyaWNWYWwpIHtcclxuICAgICAgICBjb25zdCBudW1NYXRjaCA9IG9wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IG51bWVyaWNWYWwpXHJcbiAgICAgICAgaWYgKG51bU1hdGNoKSB7IGVsZW1lbnQudmFsdWUgPSBudW1NYXRjaC52YWx1ZTsgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTsgcmV0dXJuIHRydWUgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxFbXBsb3ltZW50VHlwZURyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCB2YWwgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpLmZpbmQobyA9PiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG8udGV4dC50b0xvd2VyQ2FzZSgpOyBjb25zdCB2ID0gby52YWx1ZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgcmV0dXJuIHQuaW5jbHVkZXModmFsKSB8fCB2LmluY2x1ZGVzKHZhbCkgfHxcclxuICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ2Z1bGwnKSAmJiAodC5pbmNsdWRlcygnZnVsbCcpIHx8IHYuaW5jbHVkZXMoJ2Z1bGwnKSkpIHx8XHJcbiAgICAgICAgICAodmFsLmluY2x1ZGVzKCdwYXJ0JykgJiYgKHQuaW5jbHVkZXMoJ3BhcnQnKSB8fCB2LmluY2x1ZGVzKCdwYXJ0JykpKSB8fFxyXG4gICAgICAgICAgKHZhbC5pbmNsdWRlcygnaW50ZXJuJykgJiYgKHQuaW5jbHVkZXMoJ2ludGVybicpIHx8IHYuaW5jbHVkZXMoJ2ludGVybicpKSkgfHxcclxuICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ2NvbnRyYWN0JykgJiYgKHQuaW5jbHVkZXMoJ2NvbnRyYWN0JykgfHwgdi5pbmNsdWRlcygnY29udHJhY3QnKSkpXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChtYXRjaCkgeyBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7IGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSk7IHJldHVybiB0cnVlIH1cclxuICAgICAgcmV0dXJuIGZpbGxEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZmlsbFJhZGlvR3JvdXAobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghbmFtZSB8fCAhdmFsdWUpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCByYWRpb3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KGBpbnB1dFt0eXBlPVwicmFkaW9cIl1bbmFtZT1cIiR7bmFtZX1cIl1gKVxyXG4gICAgICBpZiAoIXJhZGlvcy5sZW5ndGgpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCBub3JtID0gdmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgbGV0IG1hdGNoZWQ6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWRcclxuICAgICAgbGV0IHVzZWRPdGhlckZhbGxiYWNrID0gZmFsc2VcclxuXHJcbiAgICAgIHJhZGlvcy5mb3JFYWNoKHJhZGlvID0+IHtcclxuICAgICAgICBjb25zdCBsYmwgPSBmaW5kTGFiZWxGb3JFbGVtZW50KHJhZGlvKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgY29uc3QgdmFsID0gcmFkaW8udmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgICBpZiAodmFsID09PSBub3JtIHx8IGxibC5pbmNsdWRlcyhub3JtKSB8fCBub3JtLmluY2x1ZGVzKHZhbCkpIG1hdGNoZWQgPSByYWRpb1xyXG4gICAgICB9KVxyXG4gICAgICBpZiAoIW1hdGNoZWQpIHtcclxuICAgICAgICByYWRpb3MuZm9yRWFjaChyYWRpbyA9PiB7XHJcbiAgICAgICAgICBpZiAocmFkaW8udmFsdWUudG9Mb3dlckNhc2UoKSA9PT0gJ290aGVyJyB8fCBmaW5kTGFiZWxGb3JFbGVtZW50KHJhZGlvKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdvdGhlcicpKSB7XHJcbiAgICAgICAgICAgIG1hdGNoZWQgPSByYWRpb1xyXG4gICAgICAgICAgICB1c2VkT3RoZXJGYWxsYmFjayA9IHRydWVcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIGlmIChtYXRjaGVkKSB7XHJcbiAgICAgICAgbWF0Y2hlZC5jaGVja2VkID0gdHJ1ZVxyXG4gICAgICAgIG1hdGNoZWQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBtYXRjaGVkLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjbGljaycsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICAgICAgICBpZiAodXNlZE90aGVyRmFsbGJhY2spIHtcclxuICAgICAgICAgIGZpbGxPdGhlclRleHRGaWVsZChtYXRjaGVkLCB2YWx1ZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGhhbmRsZVJhZGlvQnV0dG9ucyhyZXN1bWVEYXRhOiBSZXN1bWVEYXRhKSB7XHJcbiAgICAgIGNvbnN0IGdyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcclxuICAgICAgY29uc3QgcHJvY2Vzc2VkID0gbmV3IFNldDxzdHJpbmc+KClcclxuXHJcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLmZvckVhY2gocmFkaW8gPT4ge1xyXG4gICAgICAgIGlmICghcmFkaW8ubmFtZSB8fCBncm91cHMuaGFzKHJhZGlvLm5hbWUpKSByZXR1cm5cclxuICAgICAgICBjb25zdCBsYmwgPSBmaW5kTGFiZWxGb3JFbGVtZW50KHJhZGlvKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgY29uc3Qgbm0gPSByYWRpby5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICBjb25zdCBjb21iaW5lZCA9IGAke2xibH0gJHtubX1gXHJcblxyXG4gICAgICAgIGlmIChjb21iaW5lZC5pbmNsdWRlcygncGhvbmUgdHlwZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjb250YWN0IHR5cGUnKSkge1xyXG4gICAgICAgICAgZ3JvdXBzLnNldChyYWRpby5uYW1lLCAnaG9tZScpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnd2hhdHNhcHAnKSkge1xyXG4gICAgICAgICAgZ3JvdXBzLnNldChyYWRpby5uYW1lLCAneWVzJylcclxuICAgICAgICB9IGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCd2aXNhIHNwb25zb3JzaGlwJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3JlcXVpcmUgc3BvbnNvcnNoaXAnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnbmVlZCBzcG9uc29yc2hpcCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdyZXF1aXJlIGEgdmlzYScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCd3aWxsIHlvdSByZXF1aXJlIHZpc2EnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZG8geW91IHJlcXVpcmUgdmlzYScpKSB7XHJcbiAgICAgICAgICBncm91cHMuc2V0KHJhZGlvLm5hbWUsIHJlc3VtZURhdGEudmlzYVNwb25zb3JzaGlwIHx8ICdubycpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnd29yayBhdXRob3JpemF0aW9uJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3dvcmsgYXV0aG9yaXNhdGlvbicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdsZWdhbGx5IGF1dGhvcml6ZWQnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnbGVnYWxseSBhdXRob3Jpc2VkJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2F1dGhvcml6ZWQgdG8gd29yaycpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdyaWdodCB0byB3b3JrJykpIHtcclxuICAgICAgICAgIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgcmVzdW1lRGF0YS53b3JrQXV0aG9yaXphdGlvbiB8fCAneWVzJylcclxuICAgICAgICB9IGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdyZWxvY2F0JykpIHtcclxuICAgICAgICAgIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ3llcycpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZ2VuZGVyJykgJiYgcmVzdW1lRGF0YS5nZW5kZXIpIHtcclxuICAgICAgICAgIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgcmVzdW1lRGF0YS5nZW5kZXIpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygndmV0ZXJhbicpKSB7XHJcbiAgICAgICAgICBncm91cHMuc2V0KHJhZGlvLm5hbWUsIHJlc3VtZURhdGEudmV0ZXJhbiB8fCAnbm8nKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2Rpc2FiaWxpdHknKSkge1xyXG4gICAgICAgICAgZ3JvdXBzLnNldChyYWRpby5uYW1lLCByZXN1bWVEYXRhLmRpc2FiaWxpdHkgfHwgJ25vJylcclxuICAgICAgICB9IGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdldGhuaWNpdHknKSB8fCBjb21iaW5lZC5pbmNsdWRlcygncmFjZScpKSB7XHJcbiAgICAgICAgICBpZiAocmVzdW1lRGF0YS5ldGhuaWNpdHkpIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgcmVzdW1lRGF0YS5ldGhuaWNpdHkpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZGVncmVlJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2JhY2hlbG9yJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ21hc3RlcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdwaGQnKSkge1xyXG4gICAgICAgICAgY29uc3QgaGFzID0gcmVzdW1lRGF0YS5lZHVjYXRpb24/LnNvbWUoZSA9PiBlLnNjaG9vbE5hbWUgfHwgZS5maWVsZE9mU3R1ZHkpXHJcbiAgICAgICAgICBncm91cHMuc2V0KHJhZGlvLm5hbWUsIGhhcyA/ICd5ZXMnIDogJ25vJylcclxuICAgICAgICB9IGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdlbXBsb3ltZW50IHR5cGUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZnVsbCB0aW1lJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2Z1bGwtdGltZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdwYXJ0IHRpbWUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygncGFydC10aW1lJykpIHtcclxuICAgICAgICAgIGlmIChyZXN1bWVEYXRhLmVtcGxveW1lbnRUeXBlKSBncm91cHMuc2V0KHJhZGlvLm5hbWUsIHJlc3VtZURhdGEuZW1wbG95bWVudFR5cGUpXHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZW5nbGlzaCcpKSB7XHJcbiAgICAgICAgICBncm91cHMuc2V0KHJhZGlvLm5hbWUsICd5ZXMnKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2xhbmd1YWdlJykgJiYgcmVzdW1lRGF0YS5sYW5ndWFnZXM/Lmxlbmd0aCkge1xyXG4gICAgICAgICAgcmVzdW1lRGF0YS5sYW5ndWFnZXMuZm9yRWFjaChsYW5nID0+IHtcclxuICAgICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKGxhbmcubGFuZ3VhZ2UudG9Mb3dlckNhc2UoKSkpIGdyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ3llcycpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGdyb3Vwcy5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4gdmFsdWUgJiYgZmlsbFJhZGlvR3JvdXAobmFtZSwgdmFsdWUpKVxyXG4gICAgfVxyXG5cclxuZnVuY3Rpb24gaXNTa2lsbFllYXJzUXVlc3Rpb24obGFiZWw6IHN0cmluZywgc2tpbGxOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCFsYWJlbC5pbmNsdWRlcyhza2lsbE5hbWUudG9Mb3dlckNhc2UoKSkpIHJldHVybiBmYWxzZVxyXG4gICAgICBjb25zdCB5ZWFyUGF0dGVybnMgPSBbXHJcbiAgICAgICAgJ2hvdyBtYW55IHllYXJzJyxcclxuICAgICAgICAneWVhcnMgb2YgZXhwZXJpZW5jZScsXHJcbiAgICAgICAgJ3llYXJzIGV4cGVyaWVuY2UnLFxyXG4gICAgICAgICdob3cgbG9uZycsXHJcbiAgICAgICAgJ2hvdyBsb25nIGhhdmUgeW91JyxcclxuICAgICAgICAneWVhcnMgaGF2ZSB5b3UnLFxyXG4gICAgICAgICd5ZWFycyB3b3JraW5nIHdpdGgnLFxyXG4gICAgICAgICd5ZWFycyB1c2luZycsXHJcbiAgICAgICAgJ3llYXJzIHdpdGgnLFxyXG4gICAgICBdXHJcbiAgICAgIHJldHVybiB5ZWFyUGF0dGVybnMuc29tZShwID0+IGxhYmVsLmluY2x1ZGVzKHApKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxTa2lsbEV4cGVyaWVuY2VGaWVsZHMoc2tpbGxzOiBTa2lsbEVudHJ5W10pIHtcclxuICAgICAgaWYgKCFza2lsbHM/Lmxlbmd0aCkgcmV0dXJuXHJcblxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MU2VsZWN0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQ+KFxyXG4gICAgICAgICdpbnB1dDpub3QoW3R5cGU9XCJoaWRkZW5cIl0pOm5vdChbdHlwZT1cImZpbGVcIl0pOm5vdChbdHlwZT1cInJhZGlvXCJdKTpub3QoW3R5cGU9XCJjaGVja2JveFwiXSk6bm90KFt0eXBlPVwic3VibWl0XCJdKSwgc2VsZWN0LCB0ZXh0YXJlYSdcclxuICAgICAgKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICBjb25zdCBsYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZWwgYXMgSFRNTEVsZW1lbnQpXHJcbiAgICAgICAgZm9yIChjb25zdCBza2lsbEVudHJ5IG9mIHNraWxscykge1xyXG4gICAgICAgICAgY29uc3Qgc2tpbGxOYW1lID0gc2tpbGxFbnRyeS5za2lsbC50cmltKClcclxuICAgICAgICAgIGlmIChza2lsbE5hbWUubGVuZ3RoIDwgMiB8fCAhc2tpbGxFbnRyeS55ZWFyU3RhcnRlZCkgY29udGludWVcclxuICAgICAgICAgIGlmICghaXNTa2lsbFllYXJzUXVlc3Rpb24obGFiZWwsIHNraWxsTmFtZSkpIGNvbnRpbnVlXHJcblxyXG4gICAgICAgICAgY29uc3QgeWVhcnMgPSBTdHJpbmcoTWF0aC5tYXgoMCwgbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIC0gcGFyc2VJbnQoc2tpbGxFbnRyeS55ZWFyU3RhcnRlZCkpKVxyXG4gICAgICAgICAgaWYgKGVsIGluc3RhbmNlb2YgSFRNTFNlbGVjdEVsZW1lbnQpIGZpbGxZZWFyc0Ryb3Bkb3duKGVsLCB5ZWFycylcclxuICAgICAgICAgIGVsc2UgaWYgKGVsIGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCB8fCBlbCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQpIGZpbGxGaWVsZChlbCwgeWVhcnMpXHJcbiAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGNvbnN0IHJhZGlvR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxJbnB1dEVsZW1lbnRbXT4oKVxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5mb3JFYWNoKHJhZGlvID0+IHtcclxuICAgICAgICBpZiAoIXJhZGlvLm5hbWUpIHJldHVyblxyXG4gICAgICAgIGlmICghcmFkaW9Hcm91cHMuaGFzKHJhZGlvLm5hbWUpKSByYWRpb0dyb3Vwcy5zZXQocmFkaW8ubmFtZSwgW10pXHJcbiAgICAgICAgcmFkaW9Hcm91cHMuZ2V0KHJhZGlvLm5hbWUpIS5wdXNoKHJhZGlvKVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmFkaW9Hcm91cHMuZm9yRWFjaCgocmFkaW9zLCBuYW1lKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZ3JvdXBMYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQocmFkaW9zWzBdKVxyXG4gICAgICAgIGZvciAoY29uc3Qgc2tpbGxFbnRyeSBvZiBza2lsbHMpIHtcclxuICAgICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IHNraWxsRW50cnkuc2tpbGwudHJpbSgpXHJcbiAgICAgICAgICBpZiAoc2tpbGxOYW1lLmxlbmd0aCA8IDIgfHwgIXNraWxsRW50cnkueWVhclN0YXJ0ZWQpIGNvbnRpbnVlXHJcbiAgICAgICAgICBpZiAoIWlzU2tpbGxZZWFyc1F1ZXN0aW9uKGdyb3VwTGFiZWwsIHNraWxsTmFtZSkpIGNvbnRpbnVlXHJcblxyXG4gICAgICAgICAgY29uc3QgeWVhcnMgPSBTdHJpbmcoTWF0aC5tYXgoMCwgbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIC0gcGFyc2VJbnQoc2tpbGxFbnRyeS55ZWFyU3RhcnRlZCkpKVxyXG4gICAgICAgICAgZmlsbFJhZGlvR3JvdXAobmFtZSwgeWVhcnMpXHJcbiAgICAgICAgICBicmVha1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBmZXRjaEFuZFVwbG9hZEZpbGUoZWxlbWVudDogSFRNTElucHV0RWxlbWVudCwgZW5kcG9pbnQ6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2F1dGhfdG9rZW4nLCAnYXBpX3VybCddKVxyXG4gICAgICAgIGlmICghc3RvcmVkLmF1dGhfdG9rZW4gfHwgIXN0b3JlZC5hcGlfdXJsKSByZXR1cm4gZmFsc2VcclxuICAgICAgICBjb25zdCByZXNwb25zZTogYW55ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgYWN0aW9uOiAncHJveHlGZXRjaEZpbGUnLCB1cmw6IGAke3N0b3JlZC5hcGlfdXJsfSR7ZW5kcG9pbnR9YCwgdG9rZW46IHN0b3JlZC5hdXRoX3Rva2VuLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgaWYgKCFyZXNwb25zZT8uc3VjY2VzcykgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IChhd2FpdCBmZXRjaChyZXNwb25zZS5iYXNlNjQpKS5ibG9iKClcclxuICAgICAgICBjb25zdCBmaWxlID0gbmV3IEZpbGUoW2Jsb2JdLCBmaWxlTmFtZSwgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KVxyXG4gICAgICAgIGNvbnN0IGR0ID0gbmV3IERhdGFUcmFuc2ZlcigpOyBkdC5pdGVtcy5hZGQoZmlsZSlcclxuICAgICAgICBlbGVtZW50LmZpbGVzID0gZHQuZmlsZXNcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmVycm9yKCdbUkFFXSBGaWxlIHVwbG9hZCBlcnJvcjonLCBlKTsgcmV0dXJuIGZhbHNlIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBoYW5kbGVBbGxGaWxlSW5wdXRzKGN2QXZhaWxhYmxlOiBib29sZWFuKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVJbnB1dHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykpXHJcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdidXR0b24sIFtyb2xlPVwiYnV0dG9uXCJdLCBhJykuZm9yRWFjaChidG4gPT4ge1xyXG4gICAgICAgIGNvbnN0IHR4dCA9IChidG4udGV4dENvbnRlbnQ/LnRvTG93ZXJDYXNlKCkudHJpbSgpIHx8ICcnKSArICcgJyArIChidG4uZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk/LnRvTG93ZXJDYXNlKCkgfHwgJycpXHJcbiAgICAgICAgaWYgKCh0eHQuaW5jbHVkZXMoJ2FkZCBmaWxlJykgfHwgdHh0LmluY2x1ZGVzKCdhdHRhY2gnKSB8fCB0eHQuaW5jbHVkZXMoJ2Nob29zZSBmaWxlJykgfHwgdHh0LmluY2x1ZGVzKCd1cGxvYWQgZmlsZScpKSAmJiAhdHh0LmluY2x1ZGVzKCdyZW1vdmUnKSkge1xyXG4gICAgICAgICAgY29uc3QgbmVhcmJ5ID0gYnRuLmNsb3Nlc3QoJ2Rpdiwgc2VjdGlvbiwgZm9ybScpPy5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpXHJcbiAgICAgICAgICBpZiAobmVhcmJ5IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCAmJiAhZmlsZUlucHV0cy5pbmNsdWRlcyhuZWFyYnkpKSBmaWxlSW5wdXRzLnB1c2gobmVhcmJ5KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGxldCByZXN1bWVVcGxvYWRlZCA9IGZhbHNlLCBjdlVwbG9hZGVkID0gZmFsc2VcclxuICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiBmaWxlSW5wdXRzKSB7XHJcbiAgICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtmaW5kTGFiZWxGb3JFbGVtZW50KGlucHV0KX0gJHtpbnB1dC5pZD8udG9Mb3dlckNhc2UoKX0gJHtpbnB1dC5uYW1lPy50b0xvd2VyQ2FzZSgpfWBcclxuICAgICAgICBjb25zdCBpc1Jlc3VtZSA9IGNvbWJpbmVkLmluY2x1ZGVzKCdyZXN1bWUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3YnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3VycmljdWx1bScpXHJcbiAgICAgICAgY29uc3QgaXNDb3ZlckxldHRlciA9IGNvbWJpbmVkLmluY2x1ZGVzKCdjb3ZlcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdsZXR0ZXInKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnbW90aXZhdGlvbicpXHJcbiAgICAgICAgaWYgKGlzQ292ZXJMZXR0ZXIgJiYgY3ZBdmFpbGFibGUgJiYgIWN2VXBsb2FkZWQpIHsgaWYgKGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShpbnB1dCwgJy9hcGkvY3YvdmlldycsICdjb3Zlci1sZXR0ZXIucGRmJykpIGN2VXBsb2FkZWQgPSB0cnVlIH1cclxuICAgICAgICBlbHNlIGlmIChpc1Jlc3VtZSAmJiAhcmVzdW1lVXBsb2FkZWQpIHsgaWYgKGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShpbnB1dCwgJy9hcGkvcmVzdW1lL3ZpZXcnLCAncmVzdW1lLnBkZicpKSByZXN1bWVVcGxvYWRlZCA9IHRydWUgfVxyXG4gICAgICB9XHJcbiAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgZmlsZUlucHV0cykge1xyXG4gICAgICAgIGlmIChpbnB1dC5maWxlcyAmJiBpbnB1dC5maWxlcy5sZW5ndGggPiAwKSBjb250aW51ZVxyXG4gICAgICAgIGlmICghcmVzdW1lVXBsb2FkZWQpIHsgaWYgKGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShpbnB1dCwgJy9hcGkvcmVzdW1lL3ZpZXcnLCAncmVzdW1lLnBkZicpKSB7IHJlc3VtZVVwbG9hZGVkID0gdHJ1ZTsgY29udGludWUgfSB9XHJcbiAgICAgICAgaWYgKGN2QXZhaWxhYmxlICYmICFjdlVwbG9hZGVkKSB7IGlmIChhd2FpdCBmZXRjaEFuZFVwbG9hZEZpbGUoaW5wdXQsICcvYXBpL2N2L3ZpZXcnLCAnY292ZXItbGV0dGVyLnBkZicpKSBjdlVwbG9hZGVkID0gdHJ1ZSB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgIFxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGNsaWNrQWRkQW5kRmlsbCh0eXBlOiAnZXhwZXJpZW5jZScgfCAnZWR1Y2F0aW9uJywgZGF0YTogUmVzdW1lRGF0YSkge1xyXG4gICAgICBjb25zdCBrZXl3b3JkcyA9IHR5cGUgPT09ICdleHBlcmllbmNlJ1xyXG4gICAgICAgID8gWydhZGQgZXhwZXJpZW5jZScsJ2FkZCB3b3JrJywnYWRkIGpvYicsJ2FkZCBwb3NpdGlvbicsJ2FkZCBlbXBsb3ltZW50JywnKyBleHBlcmllbmNlJ11cclxuICAgICAgICA6IFsnYWRkIGVkdWNhdGlvbicsJ2FkZCBzY2hvb2wnLCdhZGQgZGVncmVlJywnYWRkIHF1YWxpZmljYXRpb24nLCcrIGVkdWNhdGlvbiddXHJcbiAgICAgIGNvbnN0IGJ0biA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ2J1dHRvbiwgW3JvbGU9XCJidXR0b25cIl0nKSkuZmluZChiID0+XHJcbiAgICAgICAga2V5d29yZHMuc29tZShrID0+IChiLnRleHRDb250ZW50Py50b0xvd2VyQ2FzZSgpLnRyaW0oKSB8fCAnJykuaW5jbHVkZXMoaykpXHJcbiAgICAgIClcclxuICAgICAgaWYgKCFidG4pIHJldHVyblxyXG4gICAgICBjb25zdCBiZWZvcmUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpLmxlbmd0aFxyXG4gICAgICBidG4uY2xpY2soKVxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgODAwKSlcclxuICAgICAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JykubGVuZ3RoID4gYmVmb3JlKSBhd2FpdCBmaWxsQWxsRmllbGRzKGRhdGEpXHJcbiAgICB9XHJcblxyXG4gICBcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBmaWxsQWxsRmllbGRzKHJlc3VtZURhdGE6IFJlc3VtZURhdGEpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICBjb25zdCBmaWVsZHMgPSBnZXRBbGxGb3JtRmllbGRzKClcclxuICAgICAgbGV0IGZpbGxlZENvdW50ID0gMFxyXG5cclxuICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtyZXN1bWVEYXRhLmZpcnN0TmFtZX0gJHtyZXN1bWVEYXRhLmxhc3ROYW1lfWAudHJpbSgpXHJcbiAgICAgIGNvbnN0IGxhdGVzdEV4cCA9IHJlc3VtZURhdGEuZXhwZXJpZW5jZT8uWzBdXHJcbiAgICAgIGNvbnN0IGxhdGVzdEVkdSA9IHJlc3VtZURhdGEuZWR1Y2F0aW9uPy5bMF1cclxuICAgICAgY29uc3QgbGF0ZXN0UHJvamVjdCA9IHJlc3VtZURhdGEucHJvamVjdHM/LlswXVxyXG4gICAgICBjb25zdCBsb2NhdGlvblN0ciA9IHJlc3VtZURhdGEubG9jYXRpb24gfHwgW3Jlc3VtZURhdGEuY2l0eSwgcmVzdW1lRGF0YS5jb3VudHJ5XS5maWx0ZXIoQm9vbGVhbikuam9pbignLCAnKVxyXG4gICAgICBjb25zdCBmdWxsQWRkcmVzcyA9IFtyZXN1bWVEYXRhLnN0cmVldEFkZHJlc3MsIHJlc3VtZURhdGEuY2l0eSwgcmVzdW1lRGF0YS5zdGF0ZSwgcmVzdW1lRGF0YS56aXBDb2RlLCByZXN1bWVEYXRhLmNvdW50cnldLmZpbHRlcihCb29sZWFuKS5qb2luKCcsICcpXHJcbiAgICAgIGNvbnN0IHdlYnNpdGVVcmwgPSByZXN1bWVEYXRhLnBvcnRmb2xpbyB8fCByZXN1bWVEYXRhLmdpdGh1YiB8fCByZXN1bWVEYXRhLmxpbmtlZGluIHx8IGxhdGVzdFByb2plY3Q/LmxpbmsgfHwgJydcclxuICAgICAgY29uc3Qgc2tpbGxOYW1lcyA9IChyZXN1bWVEYXRhLnNraWxscyB8fCBbXSkubWFwKHMgPT4gcy5za2lsbCkuam9pbignLCAnKVxyXG4gICAgICBjb25zdCBoYXNEZWdyZWUgPSByZXN1bWVEYXRhLmVkdWNhdGlvbj8uc29tZShlID0+IGUuc2Nob29sTmFtZSB8fCBlLmZpZWxkT2ZTdHVkeSlcclxuXHJcbiAgICAgIGNvbnN0IHRvdGFsRXhwWWVhcnMgPSAoKCkgPT4ge1xyXG4gICAgICAgIGxldCBtb250aHMgPSAwXHJcbiAgICAgICAgcmVzdW1lRGF0YS5leHBlcmllbmNlPy5mb3JFYWNoKGV4cCA9PiB7XHJcbiAgICAgICAgICBjb25zdCBzdGFydCA9IHBhcnNlSW50KGV4cC5zdGFydFllYXIpICogMTIgKyAocGFyc2VJbnQoZXhwLnN0YXJ0TW9udGgpIHx8IDEpXHJcbiAgICAgICAgICBjb25zdCBpc1ByZXNlbnQgPSAhZXhwLmVuZFllYXIgfHwgZXhwLmVuZFllYXIudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygncHJlc2VudCcpXHJcbiAgICAgICAgICBjb25zdCBleSA9IGlzUHJlc2VudCA/IG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSA6IHBhcnNlSW50KGV4cC5lbmRZZWFyKVxyXG4gICAgICAgICAgY29uc3QgZW0gPSBpc1ByZXNlbnQgPyBuZXcgRGF0ZSgpLmdldE1vbnRoKCkgKyAxIDogKHBhcnNlSW50KGV4cC5lbmRNb250aCkgfHwgMSlcclxuICAgICAgICAgIGNvbnN0IGVuZCA9IGV5ICogMTIgKyBlbVxyXG4gICAgICAgICAgaWYgKCFpc05hTihlbmQgLSBzdGFydCkpIG1vbnRocyArPSBlbmQgLSBzdGFydFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyhNYXRoLm1heCgwLCBNYXRoLmZsb29yKG1vbnRocyAvIDEyKSkpXHJcbiAgICAgIH0pKClcclxuXHJcbiAgICAgIGNvbnN0IHZhbHVlTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgIGZ1bGxOYW1lLCBmaXJzdE5hbWU6IHJlc3VtZURhdGEuZmlyc3ROYW1lLCBsYXN0TmFtZTogcmVzdW1lRGF0YS5sYXN0TmFtZSxcclxuICAgICAgICBlbWFpbDogcmVzdW1lRGF0YS5lbWFpbCwgcGhvbmU6IHJlc3VtZURhdGEucGhvbmUsIHdoYXRzYXBwOiByZXN1bWVEYXRhLnBob25lLFxyXG4gICAgICAgIGNvdW50cnlDb2RlOiByZXN1bWVEYXRhLmNvdW50cnlDb2RlIHx8ICcnLCBwaG9uZU51bWJlcjogcmVzdW1lRGF0YS5waG9uZU51bWJlciB8fCByZXN1bWVEYXRhLnBob25lLFxyXG4gICAgICAgIHBob25lVHlwZTogJ0hvbWUnLCBmdWxsQWRkcmVzcywgc3RyZWV0QWRkcmVzczogcmVzdW1lRGF0YS5zdHJlZXRBZGRyZXNzLFxyXG4gICAgICAgIGNpdHk6IHJlc3VtZURhdGEuY2l0eSwgc3RhdGU6IHJlc3VtZURhdGEuc3RhdGUgfHwgJycsIHppcENvZGU6IHJlc3VtZURhdGEuemlwQ29kZSB8fCAnJyxcclxuICAgICAgICBjb3VudHJ5OiByZXN1bWVEYXRhLmNvdW50cnksIGxvY2F0aW9uOiBsb2NhdGlvblN0cixcclxuICAgICAgICBwcm9mZXNzaW9uYWxTdW1tYXJ5OiByZXN1bWVEYXRhLnByb2Zlc3Npb25hbFN1bW1hcnksIGNvdmVyTGV0dGVyOiByZXN1bWVEYXRhLnByb2Zlc3Npb25hbFN1bW1hcnksXHJcbiAgICAgICAgc2tpbGxzOiBza2lsbE5hbWVzLCBqb2JUaXRsZTogbGF0ZXN0RXhwPy5qb2JUaXRsZSB8fCAnJywgaW5kdXN0cnk6IGxhdGVzdEV4cD8uam9iVGl0bGUgfHwgJycsXHJcbiAgICAgICAgY29tcGFueU5hbWU6IGxhdGVzdEV4cD8uY29tcGFueU5hbWUgfHwgJycsXHJcbiAgICAgICAgZXhwU3RhcnRNb250aDogbGF0ZXN0RXhwPy5zdGFydE1vbnRoIHx8ICcnLCBleHBTdGFydFllYXI6IGxhdGVzdEV4cD8uc3RhcnRZZWFyIHx8ICcnLFxyXG4gICAgICAgIGV4cEVuZE1vbnRoOiBsYXRlc3RFeHA/LmVuZE1vbnRoIHx8ICcnLCBleHBFbmRZZWFyOiBsYXRlc3RFeHA/LmVuZFllYXIgfHwgJycsXHJcbiAgICAgICAgc2Nob29sTmFtZTogbGF0ZXN0RWR1Py5zY2hvb2xOYW1lIHx8ICcnLCBmaWVsZE9mU3R1ZHk6IGxhdGVzdEVkdT8uZmllbGRPZlN0dWR5IHx8ICcnLFxyXG4gICAgICAgIGVkdVN0YXJ0WWVhcjogbGF0ZXN0RWR1Py5zdGFydFllYXIgfHwgJycsIGVkdUVuZFllYXI6IGxhdGVzdEVkdT8uZW5kWWVhciB8fCAnJyxcclxuICAgICAgICBoaWdoZXN0RWR1OiBsYXRlc3RFZHU/LmZpZWxkT2ZTdHVkeSB8fCAnJywgaGFzRGVncmVlOiBoYXNEZWdyZWUgPyAneWVzJyA6ICdubycsXHJcbiAgICAgICAgcHJvamVjdE5hbWU6IGxhdGVzdFByb2plY3Q/LnByb2plY3ROYW1lIHx8ICcnLFxyXG4gICAgICAgIGxpbmtlZGluOiByZXN1bWVEYXRhLmxpbmtlZGluIHx8ICcnLCBnaXRodWI6IHJlc3VtZURhdGEuZ2l0aHViIHx8ICcnLCB3ZWJzaXRlOiB3ZWJzaXRlVXJsLFxyXG4gICAgICAgIHNhbGFyeTogcmVzdW1lRGF0YS5zYWxhcnlBbW91bnQgfHwgJycsIHNhbGFyeUN1cnJlbmN5OiByZXN1bWVEYXRhLnNhbGFyeUN1cnJlbmN5IHx8ICdVU0QnLFxyXG4gICAgICAgIHNhbGFyeVR5cGU6IHJlc3VtZURhdGEuc2FsYXJ5VHlwZSB8fCAnbW9udGhseScsXHJcbiAgICAgICAgbGFuZ3VhZ2U6IHJlc3VtZURhdGEubGFuZ3VhZ2VzPy5bMF0/Lmxhbmd1YWdlIHx8ICcnLCBsYW5ndWFnZUxldmVsOiByZXN1bWVEYXRhLmxhbmd1YWdlcz8uWzBdPy5sZXZlbCB8fCAnJyxcclxuICAgICAgICBhdmFpbGFiaWxpdHk6IHJlc3VtZURhdGEuYXZhaWxhYmlsaXR5IHx8ICcnLCBlbXBsb3ltZW50VHlwZTogcmVzdW1lRGF0YS5lbXBsb3ltZW50VHlwZSB8fCAnJyxcclxuICAgICAgICB5ZWFyc09mRXhwZXJpZW5jZTogdG90YWxFeHBZZWFycyxcclxuICAgICAgICB2aXNhU3BvbnNvcnNoaXA6IHJlc3VtZURhdGEudmlzYVNwb25zb3JzaGlwIHx8ICdubycsXHJcbiAgICAgICAgd29ya0F1dGhvcml6YXRpb246IHJlc3VtZURhdGEud29ya0F1dGhvcml6YXRpb24gfHwgJ3llcycsXHJcbiAgICAgICAgcmVsb2NhdGlvbjogJ1llcycsIHdvcmtBdXRoOiByZXN1bWVEYXRhLndvcmtBdXRob3JpemF0aW9uIHx8ICd5ZXMnLFxyXG4gICAgICAgIGdlbmRlcjogcmVzdW1lRGF0YS5nZW5kZXIgfHwgJycsIGV0aG5pY2l0eTogcmVzdW1lRGF0YS5ldGhuaWNpdHkgfHwgJycsXHJcbiAgICAgICAgdmV0ZXJhbjogcmVzdW1lRGF0YS52ZXRlcmFuIHx8ICdObycsIGRpc2FiaWxpdHk6IHJlc3VtZURhdGEuZGlzYWJpbGl0eSB8fCAnTm8nLFxyXG4gICAgICAgIHJlZmVycmFsU291cmNlOiAnJyxcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yIChjb25zdCB7IGVsZW1lbnQsIHR5cGUgfSBvZiBmaWVsZHMpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSB2YWx1ZU1hcFt0eXBlXSB8fCAnJ1xyXG5cclxuICAgICAgXHJcbiAgICAgICAgaWYgKHR5cGUgPT09ICdzYWxhcnknICYmIHZhbHVlICYmIHJlc3VtZURhdGEuc2FsYXJ5VHlwZSkge1xyXG4gICAgICAgICAgY29uc3QgZGV0ZWN0ZWQgPSBkZXRlY3RTYWxhcnlUeXBlRnJvbUxhYmVsKGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudCkpXHJcbiAgICAgICAgICBpZiAoZGV0ZWN0ZWQgJiYgZGV0ZWN0ZWQgIT09IHJlc3VtZURhdGEuc2FsYXJ5VHlwZSkgdmFsdWUgPSBjb252ZXJ0U2FsYXJ5KHZhbHVlLCByZXN1bWVEYXRhLnNhbGFyeVR5cGUsIGRldGVjdGVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF2YWx1ZSkgY29udGludWVcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50ICYmIGVsZW1lbnQudHlwZSA9PT0gJ2RhdGUnKSB7XHJcbiAgICAgICAgICBpZiAodHlwZSA9PT0gJ2V4cFN0YXJ0WWVhcicpIGZpbGxEYXRlSW5wdXQoZWxlbWVudCwgbGF0ZXN0RXhwPy5zdGFydFllYXIgfHwgJycsIGxhdGVzdEV4cD8uc3RhcnRNb250aCB8fCAnMDEnKVxyXG4gICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ2V4cEVuZFllYXInKSBmaWxsRGF0ZUlucHV0KGVsZW1lbnQsIGxhdGVzdEV4cD8uZW5kWWVhciB8fCAnJywgbGF0ZXN0RXhwPy5lbmRNb250aCB8fCAnMTInKVxyXG4gICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ2VkdVN0YXJ0WWVhcicpIGZpbGxEYXRlSW5wdXQoZWxlbWVudCwgbGF0ZXN0RWR1Py5zdGFydFllYXIgfHwgJycsICcwOScpXHJcbiAgICAgICAgICBlbHNlIGlmICh0eXBlID09PSAnZWR1RW5kWWVhcicpIGZpbGxEYXRlSW5wdXQoZWxlbWVudCwgbGF0ZXN0RWR1Py5lbmRZZWFyIHx8ICcnLCAnMDUnKVxyXG4gICAgICAgICAgZWxzZSBmaWxsRGF0ZUlucHV0KGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZmlsbGVkQ291bnQrK1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50KSB7XHJcbiAgICAgICAgICBsZXQgb2sgPSBmYWxzZVxyXG4gICAgICAgICAgaWYgKHR5cGUgPT09ICdleHBTdGFydE1vbnRoJyB8fCB0eXBlID09PSAnZXhwRW5kTW9udGgnKSBvayA9IGZpbGxNb250aERyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0YXRlJykgb2sgPSBmaWxsU3RhdGVEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGVsc2UgaWYgKHR5cGUgPT09ICdjb3VudHJ5Jykgb2sgPSBmaWxsQ291bnRyeURyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ2NvdW50cnlDb2RlJykgb2sgPSBmaWxsQ291bnRyeUNvZGVEcm9wZG93bihlbGVtZW50LCByZXN1bWVEYXRhLmNvdW50cnlDb2RlIHx8ICcnLCByZXN1bWVEYXRhLmNvdW50cnkpXHJcbiAgICAgICAgICBlbHNlIGlmICh0eXBlID09PSAnaGlnaGVzdEVkdScgfHwgdHlwZSA9PT0gJ2ZpZWxkT2ZTdHVkeScpIG9rID0gZmlsbEVkdWNhdGlvbkRyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gJ3llYXJzT2ZFeHBlcmllbmNlJykgb2sgPSBmaWxsWWVhcnNEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGVsc2UgaWYgKHR5cGUgPT09ICd2aXNhU3BvbnNvcnNoaXAnIHx8IHR5cGUgPT09ICd3b3JrQXV0aG9yaXphdGlvbicgfHwgdHlwZSA9PT0gJ2hhc0RlZ3JlZScpIG9rID0gZmlsbFllc05vRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpXHJcbiAgICAgICAgICBlbHNlIGlmICh0eXBlID09PSAnZW1wbG95bWVudFR5cGUnKSBvayA9IGZpbGxFbXBsb3ltZW50VHlwZURyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKVxyXG4gICAgICAgICAgZWxzZSBvayA9IGZpbGxEcm9wZG93bihlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGlmIChvaykgZmlsbGVkQ291bnQrK1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgfHwgZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxUZXh0QXJlYUVsZW1lbnQpIHtcclxuICAgICAgICAgIGZpbGxGaWVsZChlbGVtZW50LCB2YWx1ZSlcclxuICAgICAgICAgIGZpbGxlZENvdW50KytcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBmaWxsZWRDb3VudFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBhdXRvZmlsbEZvcm0ocmVzdW1lRGF0YTogUmVzdW1lRGF0YSwgY3ZBdmFpbGFibGU6IGJvb2xlYW4pOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICBjb25zdCBmaWxsZWRDb3VudCA9IGF3YWl0IGZpbGxBbGxGaWVsZHMocmVzdW1lRGF0YSlcclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDMwMCkpXHJcbiAgICAgIGF3YWl0IGNsaWNrQWRkQW5kRmlsbCgnZXhwZXJpZW5jZScsIHJlc3VtZURhdGEpXHJcbiAgICAgIGF3YWl0IGNsaWNrQWRkQW5kRmlsbCgnZWR1Y2F0aW9uJywgcmVzdW1lRGF0YSlcclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDMwMCkpXHJcbiAgICAgIGhhbmRsZVJhZGlvQnV0dG9ucyhyZXN1bWVEYXRhKVxyXG4gICAgICBmaWxsU2tpbGxFeHBlcmllbmNlRmllbGRzKHJlc3VtZURhdGEuc2tpbGxzIHx8IFtdKVxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwKSlcclxuICAgICAgYXdhaXQgaGFuZGxlQWxsRmlsZUlucHV0cyhjdkF2YWlsYWJsZSlcclxuICAgICAgcmV0dXJuIGZpbGxlZENvdW50XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0b2ZpbGwnKSB7XHJcbiAgICAgICAgYXV0b2ZpbGxGb3JtKG1lc3NhZ2UucmVzdW1lRGF0YSwgbWVzc2FnZS5jdkF2YWlsYWJsZSkudGhlbihmaWxsZWRDb3VudCA9PiB7XHJcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBmaWxsZWRDb3VudCB9KVxyXG4gICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdbUkFFXSBBdXRvZmlsbCBlcnJvcjonLCBlcnIpXHJcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZmlsbGVkQ291bnQ6IDAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnZGV0ZWN0RmllbGRzJykge1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGZpZWxkQ291bnQ6IGdldEFsbEZvcm1GaWVsZHMoKS5sZW5ndGggfSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdbUkFFXSBBdXRvZmlsbCBjb250ZW50IHNjcmlwdCBsb2FkZWQnKVxyXG4gIH1cclxufSkiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDRkEsUUFBQSxhQUFBLG9CQUFBO0FBQUEsSUFBbUMsU0FBQSxDQUFBLFlBQUE7QUFBQSxJQUNYLE9BQUE7QUFBQSxJQUNmLE9BQUE7QUFpQ0wsWUFBQSxTQUFBO0FBQUEsUUFBdUMsS0FBQTtBQUFBLFFBQ2pDLE1BQUE7QUFBQSxRQUFlLEtBQUE7QUFBQSxRQUFjLE1BQUE7QUFBQSxRQUFnQixLQUFBO0FBQUEsUUFBZSxNQUFBO0FBQUEsUUFBYSxLQUFBO0FBQUEsUUFDekUsTUFBQTtBQUFBLFFBQWEsS0FBQTtBQUFBLFFBQVksTUFBQTtBQUFBLFFBQVcsS0FBQTtBQUFBLFFBQVUsTUFBQTtBQUFBLFFBQVksS0FBQTtBQUFBLFFBQzFELE1BQUE7QUFBQSxRQUFZLEtBQUE7QUFBQSxRQUFXLE1BQUE7QUFBQSxRQUFjLEtBQUE7QUFBQSxRQUFhLE1BQUE7QUFBQSxRQUFpQixNQUFBO0FBQUEsUUFDbEUsTUFBQTtBQUFBLFFBQWUsTUFBQTtBQUFBLE1BQWdCO0FBSXRDLGVBQUEsY0FBQSxRQUFBLFVBQUEsUUFBQTtBQUNFLGNBQUEsTUFBQSxXQUFBLE1BQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxDQUFBLFlBQUEsQ0FBQSxVQUFBLGFBQUEsT0FBQSxRQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsUUFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBLElBQUEsR0FBQTtBQUNBLGNBQUEsY0FBQSxFQUFBLFFBQUEsSUFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBLEdBQUE7QUFDQSxjQUFBLFVBQUEsT0FBQSxVQUFBLFFBQUEsS0FBQTtBQUNBLGVBQUEsT0FBQSxLQUFBLE1BQUEsV0FBQSxZQUFBLE1BQUEsS0FBQSxFQUFBLENBQUE7QUFBQSxNQUE4RDtBQUdoRSxlQUFBLDBCQUFBLE9BQUE7QUFDRSxZQUFBLE1BQUEsU0FBQSxNQUFBLEtBQUEsTUFBQSxTQUFBLEtBQUEsS0FBQSxNQUFBLFNBQUEsS0FBQSxFQUFBLFFBQUE7QUFDQSxZQUFBLE1BQUEsU0FBQSxPQUFBLEtBQUEsTUFBQSxTQUFBLEtBQUEsS0FBQSxNQUFBLFNBQUEsS0FBQSxFQUFBLFFBQUE7QUFDQSxZQUFBLE1BQUEsU0FBQSxNQUFBLEtBQUEsTUFBQSxTQUFBLFFBQUEsS0FBQSxNQUFBLFNBQUEsS0FBQSxLQUFBLE1BQUEsU0FBQSxXQUFBLEVBQUEsUUFBQTtBQUNBLGVBQUE7QUFBQSxNQUFPO0FBZVQsZUFBQSxvQkFBQSxTQUFBO0FBQ0UsY0FBQSxVQUFBLENBQUE7QUFDQSxZQUFBLFFBQUEsSUFBQTtBQUNFLGdCQUFBLFFBQUEsU0FBQSxjQUFBLGNBQUEsSUFBQSxPQUFBLFFBQUEsRUFBQSxDQUFBLElBQUE7QUFDQSxjQUFBLE1BQUEsU0FBQSxLQUFBLE1BQUEsZUFBQSxFQUFBO0FBQUEsUUFBK0M7QUFFakQsY0FBQSxjQUFBLFFBQUEsUUFBQSxPQUFBO0FBQ0EsWUFBQSxZQUFBLFNBQUEsS0FBQSxZQUFBLGVBQUEsRUFBQTtBQUNBLGNBQUEsT0FBQSxRQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUEsU0FBQSxRQUFBLEtBQUEsS0FBQSxFQUFBLFNBQUEsS0FBQSxPQUFBLEVBQUEsU0FBQSxLQUFBLEtBQUEsZUFBQSxFQUFBO0FBQ0EsY0FBQSxTQUFBLFFBQUE7QUFDQSxZQUFBLE9BQUEsUUFBQSxpQkFBQSxxREFBQSxFQUFBLFFBQUEsQ0FBQSxPQUFBLFFBQUEsS0FBQSxHQUFBLGVBQUEsRUFBQSxDQUFBO0FBQ0EsY0FBQSxVQUFBLFFBQUEsUUFBQSw0QkFBQTtBQUNBLFlBQUEsU0FBQTtBQUNFLGdCQUFBLEtBQUEsUUFBQSxjQUFBLDBEQUFBO0FBQ0EsY0FBQSxHQUFBLFNBQUEsS0FBQSxHQUFBLGVBQUEsRUFBQTtBQUFBLFFBQXlDO0FBRTNDLGVBQUEsUUFBQSxLQUFBLEdBQUEsRUFBQSxjQUFBLFFBQUEsUUFBQSxHQUFBLEVBQUEsS0FBQTtBQUFBLE1BQWlFO0FBSW5FLGVBQUEsZ0JBQUEsU0FBQTtBQUNFLGNBQUEsS0FBQSxRQUFBLElBQUEsWUFBQSxLQUFBO0FBQ0EsY0FBQSxPQUFBLFFBQUEsTUFBQSxZQUFBLEtBQUE7QUFDQSxjQUFBLGNBQUEsUUFBQSxhQUFBLFlBQUEsS0FBQTtBQUNBLGNBQUEsWUFBQSxRQUFBLGFBQUEsWUFBQSxHQUFBLFlBQUEsS0FBQTtBQUNBLGNBQUEsWUFBQSxRQUFBLGFBQUEsWUFBQSxLQUFBLFFBQUEsYUFBQSxhQUFBLEtBQUEsUUFBQSxhQUFBLFNBQUEsS0FBQSxJQUFBLFlBQUE7QUFDQSxjQUFBLGVBQUEsUUFBQSxhQUFBLGNBQUEsR0FBQSxZQUFBLEtBQUE7QUFDQSxjQUFBLFFBQUEsb0JBQUEsT0FBQTtBQUNBLGNBQUEsV0FBQSxHQUFBLEVBQUEsSUFBQSxJQUFBLElBQUEsV0FBQSxJQUFBLFNBQUEsSUFBQSxLQUFBLElBQUEsUUFBQSxJQUFBLFlBQUE7QUFFQSxjQUFBLFdBQUE7QUFBQSxVQUFpQixFQUFBLFVBQUEsQ0FBQSxZQUFBLGFBQUEsYUFBQSxZQUFBLGlCQUFBLGVBQUEsR0FBQSxNQUFBLFlBQUEsWUFBQSxJQUFBO0FBQUEsVUFDZ0gsRUFBQSxVQUFBLENBQUEsYUFBQSxjQUFBLGNBQUEsU0FBQSxjQUFBLGFBQUEsWUFBQSxjQUFBLFlBQUEsR0FBQSxNQUFBLGFBQUEsWUFBQSxLQUFBO0FBQUEsVUFDZ0MsRUFBQSxVQUFBLENBQUEsWUFBQSxhQUFBLGFBQUEsU0FBQSxXQUFBLGVBQUEsY0FBQSxlQUFBLFdBQUEsR0FBQSxNQUFBLFlBQUEsWUFBQSxLQUFBO0FBQUEsVUFDSCxFQUFBLFVBQUEsQ0FBQSxTQUFBLFVBQUEs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QUFBO0FBQ0UsWUFBQSxDQUFBLEtBQUE7QUFDQSxrQkFBQSxTQUFBLEdBQUEsSUFBQSxLQUFBLFNBQUEsTUFBQSxTQUFBLEdBQUEsR0FBQSxDQUFBLEtBQUE7QUFBQSxNQUFtRTtBQUlyRSxlQUFBLGdCQUFBLFNBQUEsT0FBQTtBQUNFLFlBQUEsQ0FBQSxNQUFBLFFBQUE7QUFDQSxjQUFBLE9BQUEsTUFBQSxZQUFBLEVBQUEsS0FBQTtBQUNBLGNBQUEsVUFBQSxNQUFBLEtBQUEsUUFBQSxPQUFBO0FBQ0EsWUFBQSxRQUFBLFFBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLFlBQUEsRUFBQSxLQUFBLE1BQUEsUUFBQSxFQUFBLE1BQUEsY0FBQSxLQUFBLE1BQUEsSUFBQTtBQUNBLFlBQUEsQ0FBQSxNQUFBLFNBQUEsUUFBQSxLQUFBLENBQUEsTUFBQTtBQUF3QyxnQkFBQSxJQUFBLEVBQUEsS0FBQSxZQUFBLEVBQUEsS0FBQTtBQUF1QyxpQkFBQSxFQUFBLFNBQUEsTUFBQSxLQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUEsU0FBQSxJQUFBO0FBQUEsUUFBMkQsQ0FBQTtBQUMxSSxZQUFBLENBQUEsTUFBQSxTQUFBLFFBQUEsS0FBQSxDQUFBLE1BQUE7QUFBd0MsZ0JBQUEsSUFBQSxFQUFBLE1BQUEsWUFBQSxFQUFBLEtBQUE7QUFBd0MsaUJBQUEsRUFBQSxTQUFBLE1BQUEsS0FBQSxTQUFBLENBQUEsS0FBQSxFQUFBLFNBQUEsSUFBQTtBQUFBLFFBQTJELENBQUE7QUFDM0ksWUFBQSxDQUFBLFNBQUEsS0FBQSxTQUFBLEVBQUEsU0FBQSxRQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxZQUFBLEVBQUEsS0FBQSxFQUFBLFdBQUEsS0FBQSxVQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLE9BQUE7QUFDRSxrQkFBQSxRQUFBLE1BQUE7QUFDQSxrQkFBQSxjQUFBLElBQUEsTUFBQSxVQUFBLEVBQUEsU0FBQSxLQUFBLENBQUEsQ0FBQTtBQUNBLGtCQUFBLGNBQUEsSUFBQSxNQUFBLFNB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Q0EsY0FBQSxZQUFBLFdBQUEsYUFBQSxDQUFBO0FBQ0EsY0FBQSxZQUFBLFdBQUEsWUFBQSxDQUFBO0FBQ0EsY0FBQSxnQkFBQSxXQUFBLFdBQUEsQ0FBQTtBQUNBLGNBQUEsY0FBQSxXQUFBLFlBQUEsQ0FBQSxXQUFBLE1BQUEsV0FBQSxPQUFBLEVBQUEsT0FBQSxPQUFBLEVBQUEsS0FBQSxJQUFBO0FBQ0EsY0FBQSxjQUFBLENBQUEsV0FBQSxlQUFBLFdBQUEsTUFBQSxXQUFBLE9BQUEsV0FBQSxTQUFBLFdBQUEsT0FBQSxFQUFBLE9BQUEsT0FBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLGNBQUEsYUFBQSxXQUFBLGFBQUEsV0FBQSxVQUFBLFdBQUEsWUFBQSxlQUFBLFFBQUE7QUFDQSxjQUFBLGNBQUEsV0FBQSxVQUFBLENBQUEsR0FBQSxJQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLElBQUE7QUFDQSxjQUFBLFlBQUEsV0FBQSxXQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsY0FBQSxFQUFBLFlBQUE7QUFFQSxjQUFBLGlCQUFBLE1BQUE7QUFDRSxjQUFBLFNBQUE7QUFDQSxxQkFBQSxZQUFBLFFBQUEsQ0FBQSxRQUFBO0FBQ0Usa0JBQUEsUUFBQSxTQUFBLElBQUEsU0FBQSxJQUFBLE1BQUEsU0FBQSxJQUFBLFVBQUEsS0FBQTtBQUNBLGtCQUFBLFlBQUEsQ0FBQSxJQUFBLFdBQUEsSUFBQSxRQUFBLFlBQUEsRUFBQSxTQUFBLFNBQUE7QUFDQSxrQkFBQSxLQUFBLGFBQUEsb0JBQUEsS0FBQSxHQUFBLGdCQUFBLFNBQUEsSUFBQSxPQUFBO0FBQ0Esa0JBQUEsS0FBQSxhQUFBLG9CQUFBLEtBQUEsR0FBQSxhQUFBLElBQUEsU0FBQSxJQUFBLFFBQUEsS0FBQTtBQUNBLGtCQUFBLE1BQUEsS0FBQSxLQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxNQUFBLE1BQUEsS0FBQSxFQUFBLFdBQUEsTUFBQTtBQUFBLFVBQXlDLENBQUE7QUFFM0MsaUJBQUEsT0FBQSxLQUFBLElBQUEsR0FBQSxLQUFBLE1B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
content;