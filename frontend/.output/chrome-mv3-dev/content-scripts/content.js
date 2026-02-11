var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_idle",
    main() {
      function findLabelForElement(element) {
        const sources = [];
        if (element.id) {
          const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
          if (label) sources.push(label.textContent || "");
        }
        const parentLabel = element.closest("label");
        if (parentLabel) sources.push(parentLabel.textContent || "");
        const prev = element.previousElementSibling;
        if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN" || prev.tagName === "P")) {
          sources.push(prev.textContent || "");
        }
        const parent = element.parentElement;
        if (parent) {
          const nearby = parent.querySelectorAll('label, span[class*="label"], div[class*="label"], p');
          nearby.forEach((el) => sources.push(el.textContent || ""));
        }
        const wrapper = element.closest("div, fieldset, li, section");
        if (wrapper) {
          const wrapperLabel = wrapper.querySelector('label, legend, span[class*="label"], div[class*="label"]');
          if (wrapperLabel) sources.push(wrapperLabel.textContent || "");
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
          { keywords: ["fullname", "full-name", "full_name", "yourname", "your-name", "your_name", "applicantname", "applicant-name", "candidatename", "candidate-name"], type: "fullName", confidence: 0.9 },
          { keywords: ["firstname", "first-name", "first_name", "fname", "given-name", "givenname", "forename", "first name", "given name"], type: "firstName", confidence: 0.95 },
          { keywords: ["lastname", "last-name", "last_name", "lname", "surname", "family-name", "familyname", "family name", "last name"], type: "lastName", confidence: 0.95 },
          { keywords: ["email", "e-mail", "emailaddress", "email address", "email-address", "mail"], type: "email", confidence: 0.95 },
          { keywords: ["phone", "telephone", "mobile", "phonenumber", "phone-number", "phone number", "cell phone", "contact number", "tel"], type: "phone", confidence: 0.9 },
          { keywords: ["countrycode", "country-code", "country_code", "dialcode", "dial-code", "dial code", "calling code", "isd"], type: "countryCode", confidence: 0.9 },
          { keywords: ["phone type", "phonetype", "number type", "type of phone", "contact type", "Phone Device Type", "mobile"], type: "phoneType", confidence: 0.85 },
          { keywords: ["streetaddress", "addr1", "mailing address", "street-address", "address1", "address-line-1", "addressline1", "address line 1", "address line1", "street", "address"], type: "streetAddress", confidence: 0.95 },
          { keywords: ["city", "town", "suburb", "municipality"], type: "city", confidence: 0.9 },
          { keywords: ["zipcode", "zip-code", "zip", "postalcode", "postal-code", "postcode", "postal code"], type: "zipCode", confidence: 0.85 },
          { keywords: ["state", "province", "region", "county"], type: "state", confidence: 0.75 },
          { keywords: ["country", "nation", "country of residence", "country of origin", "country name", "where do you live", "resident of", "home country", "citizenship", "nationality", "location country"], type: "country", confidence: 0.95 },
          { keywords: ["location", "residence", "based in", "where are you located", "current location", "preferred location", "work location"], type: "location", confidence: 0.8 },
          { keywords: ["where do you live", "current residence", "based in"], type: "residenceCountry", confidence: 0.9 },
          { keywords: ["summary", "professional summary", "about me", "about yourself", "bio", "profile", "objective", "introduction", "describe yourself", "tell us about yourself", "personal statement", "cover letter", "covering letter"], type: "professionalSummary", confidence: 0.75 },
          { keywords: ["skill", "skills", "expertise", "competencies", "competenc", "technologies", "tech stack", "tools", "technical skills", "key skills"], type: "skills", confidence: 0.75 },
          { keywords: ["jobtitle", "job-title", "job title", "currenttitle", "current title", "current job title", "desired title", "position", "role", "your title"], type: "jobTitle", confidence: 0.85 },
          { keywords: ["company", "employer", "organization", "organisation", "current company", "current employer", "workplace", "most recent employer"], type: "companyName", confidence: 0.85 },
          { keywords: ["start month", "startmonth", "start-month", "from month", "beginning month"], type: "expStartMonth", confidence: 0.9 },
          { keywords: ["start year", "startyear", "start-year", "from year", "beginning year", "year started"], type: "expStartYear", confidence: 0.9 },
          { keywords: ["end month", "endmonth", "end-month", "to month", "finish month"], type: "expEndMonth", confidence: 0.9 },
          { keywords: ["end year", "endyear", "end-year", "to year", "finish year", "year ended", "year finished"], type: "expEndYear", confidence: 0.9 },
          { keywords: ["highest education", "level of education", "education level", "degree level", "highest degree"], type: "highestEdu", confidence: 0.9 },
          { keywords: ["school", "university", "college", "institution", "alma mater", "school name", "institution name", "university name"], type: "schoolName", confidence: 0.85 },
          { keywords: ["degree", "major", "field of study", "fieldofstudy", "discipline", "qualification", "course of study", "program", "area of study"], type: "fieldOfStudy", confidence: 0.8 },
          { keywords: ["graduation year", "grad year", "year of graduation", "completed year", "year completed"], type: "eduEndYear", confidence: 0.85 },
          { keywords: ["enrollment year", "enrolment year", "year enrolled", "start year of study"], type: "eduStartYear", confidence: 0.8 },
          { keywords: ["project name", "projectname", "project title"], type: "projectName", confidence: 0.75 },
          { keywords: ["linkedin", "linkedin url", "linkedin profile", "linkedin "], type: "linkedin", confidence: 0.95 },
          { keywords: ["github", "github url", "github profile", "github link"], type: "github", confidence: 0.95 },
          { keywords: ["website", "personal website", "portfolio url", "portfolio link", "personal url", "your website", "link"], type: "website", confidence: 0.75 },
          { keywords: ["other", "additional", "supporting document", "attachment"], type: "additionalFile", confidence: 0.7 },
          { keywords: ["salary", "expected salary", "desired salary", "compensation", "expected compensation", "salary expectation", "rate", "base salary"], type: "salary", confidence: 0.85 },
          { keywords: ["years of experience", "experience years", "how many years", "total experience", "years experience"], type: "yearsOfExperience", confidence: 0.85 },
          { keywords: ["work authorization", "work authorisation", "authorized to work", "visa status", "right to work", "work permit", "eligible to work"], type: "workAuth", confidence: 0.85 },
          { keywords: ["willing to relocate", "open to relocate", "relocation", "relocate"], type: "relocation", confidence: 0.8 },
          { keywords: ["gender", "sex"], type: "gender", confidence: 0.8 },
          { keywords: ["race", "ethnicity", "ethnic"], type: "ethnicity", confidence: 0.8 },
          { keywords: ["veteran", "military", "armed forces"], type: "veteran", confidence: 0.8 },
          { keywords: ["disability", "disabled", "impairment"], type: "disability", confidence: 0.8 },
          { keywords: ["how did you hear", "how did you find", "referral source", "where did you hear"], type: "referralSource", confidence: 0.8 }
        ];
        for (const pattern of patterns) {
          for (const keyword of pattern.keywords) {
            if (combined.includes(keyword)) {
              if (keyword === "name") {
                if (combined.includes("first") || combined.includes("last") || combined.includes("full") || combined.includes("company") || combined.includes("school") || combined.includes("project")) continue;
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
        const inputs = document.querySelectorAll(
          'input:not([type="submit"]):not([type="button"]):not([type="hidden"]):not([type="file"]):not([type="image"]):not([type="reset"]), textarea, select'
        );
        inputs.forEach((element) => {
          if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement) && !(element instanceof HTMLSelectElement)) return;
          const { type, confidence } = detectFieldType(element);
          if (confidence > 0.5) {
            fields.push({ element, type, confidence });
          }
        });
        return fields;
      }
      function fillField(element, value) {
        if (!value) return;
        element.focus();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        const setter = element instanceof HTMLInputElement ? nativeInputValueSetter : nativeTextAreaValueSetter;
        if (setter) {
          setter.call(element, value);
        } else {
          element.value = value;
        }
        const eventOptions = { bubbles: true, cancelable: true, composed: true };
        element.dispatchEvent(new Event("input", eventOptions));
        element.dispatchEvent(new Event("change", eventOptions));
        element.dispatchEvent(new KeyboardEvent("keydown", { ...eventOptions, key: "Enter" }));
        element.blur();
      }
      function fillDropdown(element, value) {
        if (!value) return false;
        const normalized = value.toLowerCase().trim();
        const options = Array.from(element.options);
        let match = options.find(
          (opt) => opt.text.toLowerCase().trim() === normalized || opt.value.toLowerCase().trim() === normalized
        );
        if (!match) {
          match = options.find((opt) => {
            const t = opt.text.toLowerCase().trim();
            return t.length > 1 && (normalized.includes(t) || t.includes(normalized));
          });
        }
        if (!match && normalized.length > 3) {
          match = options.find(
            (opt) => opt.text.toLowerCase().trim().startsWith(normalized.substring(0, 3))
          );
        }
        if (match) {
          element.value = match.value;
          const eventOptions = { bubbles: true, cancelable: true };
          element.dispatchEvent(new Event("change", eventOptions));
          element.dispatchEvent(new Event("input", eventOptions));
          return true;
        }
        return false;
      }
      function fillEducationDropdown(element, value) {
        if (!value) return false;
        const options = Array.from(element.options);
        const val = value.toLowerCase();
        const match = options.find((opt) => {
          const text = opt.text.toLowerCase();
          return text.includes(val) || val.includes("bachelor") && text.includes("bachelor") || val.includes("master") && text.includes("master") || val.includes("phd") && text.includes("doctorate");
        });
        if (match) {
          element.value = match.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      }
      function fillExperienceDropdown(element, years) {
        if (!years) return false;
        const options = Array.from(element.options);
        const numYears = parseInt(years);
        const match = options.find((opt) => {
          const text = opt.text.toLowerCase();
          if (text.includes(years)) return true;
          const numbers = text.match(/\d+/g);
          if (numbers) {
            const first = parseInt(numbers[0]);
            if (numbers.length === 1 && text.includes("+") && numYears >= first) return true;
            if (numbers.length === 2) {
              const second = parseInt(numbers[1]);
              return numYears >= first && numYears <= second;
            }
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
          const radioLabel = findLabelForElement(radio).toLowerCase();
          const radioVal = radio.value.toLowerCase().trim();
          if (radioVal === normalized || radioLabel.includes(normalized) || normalized.includes(radioVal)) {
            matched = radio;
          }
        });
        if (matched) {
          matched.checked = true;
          matched.dispatchEvent(new Event("change", { bubbles: true }));
          matched.dispatchEvent(new Event("click", { bubbles: true }));
        }
      }
      function handleRadioButtons(resumeData) {
        const radioGroups = /* @__PURE__ */ new Map();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (radio.name && !radioGroups.has(radio.name)) {
            const groupLabel = findLabelForElement(radio).toLowerCase();
            const groupName = radio.name.toLowerCase();
            const combined = `${groupLabel} ${groupName}`;
            if (combined.includes("phone type") || combined.includes("type of phone") || combined.includes("contact type")) {
              radioGroups.set(radio.name, "home");
            } else if (combined.includes("work auth") || combined.includes("authorized") || combined.includes("eligible")) {
              radioGroups.set(radio.name, "yes");
            } else if (combined.includes("relocat")) {
              radioGroups.set(radio.name, "yes");
            } else if (combined.includes("gender")) ;
            else if (combined.includes("veteran")) {
              radioGroups.set(radio.name, "no");
            } else if (combined.includes("disability")) {
              radioGroups.set(radio.name, "no");
            }
          }
        });
        radioGroups.forEach((value, name) => fillRadioGroup(name, value));
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
          if (!response || !response.success) return false;
          const res = await fetch(response.base64);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "application/pdf" });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          element.files = dataTransfer.files;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        } catch (error) {
          console.error(`[RAE] File upload error:`, error);
          return false;
        }
      }
      async function handleAllFileInputs(cvAvailable) {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        let resumeUploaded = false;
        let coverLetterUploaded = false;
        for (const fileInput of fileInputs) {
          const label = findLabelForElement(fileInput).toLowerCase();
          const id = fileInput.id?.toLowerCase() || "";
          const name = fileInput.name?.toLowerCase() || "";
          const combined = `${label} ${id} ${name}`;
          const isResume = combined.includes("resume") || combined.includes("cv") || combined.includes("curriculum");
          const isCoverLetter = combined.includes("cover") || combined.includes("letter");
          if (isResume) {
            const success = await fetchAndUploadFile(fileInput, "/api/resume/view", "resume.pdf");
            if (success) resumeUploaded = true;
          } else if (isCoverLetter && cvAvailable) {
            const success = await fetchAndUploadFile(fileInput, "/api/cv/view", "cover-letter.pdf");
            if (success) coverLetterUploaded = true;
          }
        }
        if (cvAvailable && resumeUploaded && !coverLetterUploaded) {
          for (const fileInput of fileInputs) {
            if (fileInput.files && fileInput.files.length > 0) continue;
            const label = findLabelForElement(fileInput).toLowerCase();
            const id = fileInput.id?.toLowerCase() || "";
            const name = fileInput.name?.toLowerCase() || "";
            const combined = `${label} ${id} ${name}`;
            const isGenericField = combined.includes("other") || combined.includes("additional") || combined.includes("supporting") || combined.includes("attachment") || combined.includes("portfolio");
            if (isGenericField) {
              const success = await fetchAndUploadFile(fileInput, "/api/cv/view", "cover-letter.pdf");
              if (success) {
                coverLetterUploaded = true;
                break;
              }
            }
          }
        }
      }
      async function autofillForm(resumeData, cvAvailable) {
        const fields = getAllFormFields();
        let filledCount = 0;
        const fullName = `${resumeData.firstName} ${resumeData.lastName}`.trim();
        const latestExp = resumeData.experience?.[0];
        const latestEdu = resumeData.education?.[0];
        const latestProject = resumeData.projects?.[0];
        resumeData.location || [resumeData.city, resumeData.country].filter(Boolean).join(", ");
        const totalExpYears = (() => {
          let totalMonths = 0;
          resumeData.experience?.forEach((exp) => {
            const start = parseInt(exp.startYear) * 12 + (parseInt(exp.startMonth) || 1);
            const isPresent = !exp.endYear || exp.endYear.toLowerCase().includes("present");
            const endYear = isPresent ? (/* @__PURE__ */ new Date()).getFullYear() : parseInt(exp.endYear);
            const endMonth = isPresent ? (/* @__PURE__ */ new Date()).getMonth() + 1 : parseInt(exp.endMonth) || 1;
            const end = endYear * 12 + endMonth;
            if (!isNaN(end - start)) totalMonths += end - start;
          });
          return Math.max(0, Math.floor(totalMonths / 12)).toString();
        })();
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
          addressLine1: resumeData.streetAddress,
          zipCode: "",
          state: "",
          country: resumeData.country,
          residenceCountry: resumeData.country,
          location: `${resumeData.city}, ${resumeData.country}`,
          professionalSummary: resumeData.professionalSummary,
          skills: Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "",
          jobTitle: latestExp?.jobTitle || "",
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
          yearsOfExperience: totalExpYears,
          projectName: latestProject?.projectName || "",
          linkedin: resumeData.linkedin || "",
          github: resumeData.github || "",
          website: resumeData.portfolio || latestProject?.link || "",
          salary: "",
          workAuth: "Yes",
          relocation: "Yes",
          referralSource: "",
          gender: "",
          ethnicity: "",
          veteran: "No",
          disability: "No"
        };
        for (const { element, type } of fields) {
          let value = valueMap[type];
          const labelText = findLabelForElement(element).toLowerCase();
          if (labelText === "location" || labelText === "your location") {
            value = valueMap["location"];
          }
          if (type === "city" && labelText.includes("address")) {
            value = valueMap["streetAddress"];
          }
          if (!value) continue;
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            fillField(element, value);
            filledCount++;
          } else if (element instanceof HTMLSelectElement) {
            let success = false;
            if (type === "highestEdu") {
              success = fillEducationDropdown(element, value);
            } else if (type === "yearsOfExperience") {
              success = fillExperienceDropdown(element, value);
            } else {
              success = fillDropdown(element, value);
            }
            if (success) filledCount++;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        handleRadioButtons();
        await handleAllFileInputs(cvAvailable);
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
          const fields = getAllFormFields();
          sendResponse({ success: true, fieldCount: fields.length });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHd4dC1kZXYrYnJvd3NlckAwLjEuMzIvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuMTNfQHR5cGVzK25vZGVAMjUuXzYzNjE5NDQ1YzU4N2NkNGE2NjcyNzc1MWFkYzIyYTdhL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9pZGxlJyxcclxuXHJcbiAgbWFpbigpIHtcclxuICAgIGludGVyZmFjZSBSZXN1bWVEYXRhIHtcclxuICAgICAgZmlyc3ROYW1lOiBzdHJpbmdcclxuICAgICAgbGFzdE5hbWU6IHN0cmluZ1xyXG4gICAgICBlbWFpbDogc3RyaW5nXHJcbiAgICAgIHBob25lOiBzdHJpbmdcclxuICAgICAgY291bnRyeUNvZGU6IHN0cmluZ1xyXG4gICAgICBwaG9uZU51bWJlcjogc3RyaW5nXHJcbiAgICAgIHN0cmVldEFkZHJlc3M6IHN0cmluZ1xyXG4gICAgICBjaXR5OiBzdHJpbmdcclxuICAgICAgY291bnRyeTogc3RyaW5nXHJcbiAgICAgIGxvY2F0aW9uOiBzdHJpbmdcclxuICAgICAgcHJvZmVzc2lvbmFsU3VtbWFyeTogc3RyaW5nXHJcbiAgICAgIHNraWxsczogc3RyaW5nW11cclxuICAgICAgZXhwZXJpZW5jZTogQXJyYXk8e1xyXG4gICAgICAgIGpvYlRpdGxlOiBzdHJpbmdcclxuICAgICAgICBjb21wYW55TmFtZTogc3RyaW5nXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHN0cmluZ1xyXG4gICAgICAgIHN0YXJ0TW9udGg6IHN0cmluZ1xyXG4gICAgICAgIHN0YXJ0WWVhcjogc3RyaW5nXHJcbiAgICAgICAgZW5kTW9udGg6IHN0cmluZ1xyXG4gICAgICAgIGVuZFllYXI6IHN0cmluZ1xyXG4gICAgICB9PlxyXG4gICAgICBwcm9qZWN0czogQXJyYXk8e1xyXG4gICAgICAgIHByb2plY3ROYW1lOiBzdHJpbmdcclxuICAgICAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgICAgICAgbGluazogc3RyaW5nXHJcbiAgICAgIH0+XHJcbiAgICAgIGVkdWNhdGlvbjogQXJyYXk8e1xyXG4gICAgICAgIHNjaG9vbE5hbWU6IHN0cmluZ1xyXG4gICAgICAgIGZpZWxkT2ZTdHVkeTogc3RyaW5nXHJcbiAgICAgICAgc3RhcnRZZWFyOiBzdHJpbmdcclxuICAgICAgICBlbmRZZWFyOiBzdHJpbmdcclxuICAgICAgfT5cclxuICAgICAgZ2l0aHViOiBzdHJpbmc7ICAgIFxyXG4gICAgICBsaW5rZWRpbjogc3RyaW5nOyAgXHJcbiAgICAgIHBvcnRmb2xpbzogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBGaWVsZE1hcHBpbmcge1xyXG4gICAgICBlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50XHJcbiAgICAgIHR5cGU6IHN0cmluZ1xyXG4gICAgICBjb25maWRlbmNlOiBudW1iZXJcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBNT05USFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICcxJzogJ2phbnVhcnknLCAnMDEnOiAnamFudWFyeScsXHJcbiAgICAgICcyJzogJ2ZlYnJ1YXJ5JywgJzAyJzogJ2ZlYnJ1YXJ5JyxcclxuICAgICAgJzMnOiAnbWFyY2gnLCAnMDMnOiAnbWFyY2gnLFxyXG4gICAgICAnNCc6ICdhcHJpbCcsICcwNCc6ICdhcHJpbCcsXHJcbiAgICAgICc1JzogJ21heScsICcwNSc6ICdtYXknLFxyXG4gICAgICAnNic6ICdqdW5lJywgJzA2JzogJ2p1bmUnLFxyXG4gICAgICAnNyc6ICdqdWx5JywgJzA3JzogJ2p1bHknLFxyXG4gICAgICAnOCc6ICdhdWd1c3QnLCAnMDgnOiAnYXVndXN0JyxcclxuICAgICAgJzknOiAnc2VwdGVtYmVyJywgJzA5JzogJ3NlcHRlbWJlcicsXHJcbiAgICAgICcxMCc6ICdvY3RvYmVyJyxcclxuICAgICAgJzExJzogJ25vdmVtYmVyJyxcclxuICAgICAgJzEyJzogJ2RlY2VtYmVyJyxcclxuICAgIH1cclxuXHJcbiAgICBcclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kTGFiZWxGb3JFbGVtZW50KGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogc3RyaW5nIHtcclxuICAgICAgY29uc3Qgc291cmNlczogc3RyaW5nW10gPSBbXVxyXG5cclxuICAgICAgaWYgKGVsZW1lbnQuaWQpIHtcclxuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxhYmVsW2Zvcj1cIiR7Q1NTLmVzY2FwZShlbGVtZW50LmlkKX1cIl1gKVxyXG4gICAgICAgIGlmIChsYWJlbCkgc291cmNlcy5wdXNoKGxhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwYXJlbnRMYWJlbCA9IGVsZW1lbnQuY2xvc2VzdCgnbGFiZWwnKVxyXG4gICAgICBpZiAocGFyZW50TGFiZWwpIHNvdXJjZXMucHVzaChwYXJlbnRMYWJlbC50ZXh0Q29udGVudCB8fCAnJylcclxuXHJcbiAgICAgIGNvbnN0IHByZXYgPSBlbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmdcclxuICAgICAgaWYgKHByZXYgJiYgKHByZXYudGFnTmFtZSA9PT0gJ0xBQkVMJyB8fCBwcmV2LnRhZ05hbWUgPT09ICdTUEFOJyB8fCBwcmV2LnRhZ05hbWUgPT09ICdQJykpIHtcclxuICAgICAgICBzb3VyY2VzLnB1c2gocHJldi50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50XHJcbiAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICBjb25zdCBuZWFyYnkgPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbCgnbGFiZWwsIHNwYW5bY2xhc3MqPVwibGFiZWxcIl0sIGRpdltjbGFzcyo9XCJsYWJlbFwiXSwgcCcpXHJcbiAgICAgICAgbmVhcmJ5LmZvckVhY2goZWwgPT4gc291cmNlcy5wdXNoKGVsLnRleHRDb250ZW50IHx8ICcnKSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgd3JhcHBlciA9IGVsZW1lbnQuY2xvc2VzdCgnZGl2LCBmaWVsZHNldCwgbGksIHNlY3Rpb24nKVxyXG4gICAgICBpZiAod3JhcHBlcikge1xyXG4gICAgICAgIGNvbnN0IHdyYXBwZXJMYWJlbCA9IHdyYXBwZXIucXVlcnlTZWxlY3RvcignbGFiZWwsIGxlZ2VuZCwgc3BhbltjbGFzcyo9XCJsYWJlbFwiXSwgZGl2W2NsYXNzKj1cImxhYmVsXCJdJylcclxuICAgICAgICBpZiAod3JhcHBlckxhYmVsKSBzb3VyY2VzLnB1c2god3JhcHBlckxhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gc291cmNlcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpXHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG4gICAgZnVuY3Rpb24gZGV0ZWN0RmllbGRUeXBlKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnQpOiB7IHR5cGU6IHN0cmluZzsgY29uZmlkZW5jZTogbnVtYmVyIH0ge1xyXG4gICAgICBjb25zdCBpZCA9IGVsZW1lbnQuaWQ/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgbmFtZSA9IGVsZW1lbnQubmFtZT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBwbGFjZWhvbGRlciA9IChlbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnBsYWNlaG9sZGVyPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IGFyaWFMYWJlbCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgZGF0YUF0dHIgPSAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZmllbGQnKSB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS10ZXN0aWQnKSB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jeScpIHx8ICcnKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IGF1dG9jb21wbGV0ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhdXRvY29tcGxldGUnKT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBsYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudClcclxuICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtpZH0gJHtuYW1lfSAke3BsYWNlaG9sZGVyfSAke2FyaWFMYWJlbH0gJHtsYWJlbH0gJHtkYXRhQXR0cn0gJHthdXRvY29tcGxldGV9YFxyXG5cclxuICAgICAgY29uc3QgcGF0dGVybnMgPSBbXHJcbiAgICAgICAgXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydmdWxsbmFtZScsICdmdWxsLW5hbWUnLCAnZnVsbF9uYW1lJywgJ3lvdXJuYW1lJywgJ3lvdXItbmFtZScsICd5b3VyX25hbWUnLCAnYXBwbGljYW50bmFtZScsICdhcHBsaWNhbnQtbmFtZScsICdjYW5kaWRhdGVuYW1lJywgJ2NhbmRpZGF0ZS1uYW1lJ10sIHR5cGU6ICdmdWxsTmFtZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG5cclxuICAgICAgICBcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2ZpcnN0bmFtZScsICdmaXJzdC1uYW1lJywgJ2ZpcnN0X25hbWUnLCAnZm5hbWUnLCAnZ2l2ZW4tbmFtZScsICdnaXZlbm5hbWUnLCAnZm9yZW5hbWUnLCAnZmlyc3QgbmFtZScsICdnaXZlbiBuYW1lJ10sIHR5cGU6ICdmaXJzdE5hbWUnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydsYXN0bmFtZScsICdsYXN0LW5hbWUnLCAnbGFzdF9uYW1lJywgJ2xuYW1lJywgJ3N1cm5hbWUnLCAnZmFtaWx5LW5hbWUnLCAnZmFtaWx5bmFtZScsICdmYW1pbHkgbmFtZScsICdsYXN0IG5hbWUnXSwgdHlwZTogJ2xhc3ROYW1lJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG5cclxuICAgICAgICBcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VtYWlsJywgJ2UtbWFpbCcsICdlbWFpbGFkZHJlc3MnLCAnZW1haWwgYWRkcmVzcycsICdlbWFpbC1hZGRyZXNzJywgJ21haWwnXSwgdHlwZTogJ2VtYWlsJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncGhvbmUnLCAndGVsZXBob25lJywgJ21vYmlsZScsICdwaG9uZW51bWJlcicsICdwaG9uZS1udW1iZXInLCAncGhvbmUgbnVtYmVyJywgJ2NlbGwgcGhvbmUnLCAnY29udGFjdCBudW1iZXInLCAndGVsJ10sIHR5cGU6ICdwaG9uZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY291bnRyeWNvZGUnLCAnY291bnRyeS1jb2RlJywgJ2NvdW50cnlfY29kZScsICdkaWFsY29kZScsICdkaWFsLWNvZGUnLCAnZGlhbCBjb2RlJywgJ2NhbGxpbmcgY29kZScsICdpc2QnXSwgdHlwZTogJ2NvdW50cnlDb2RlJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydwaG9uZSB0eXBlJywgJ3Bob25ldHlwZScsICdudW1iZXIgdHlwZScsICd0eXBlIG9mIHBob25lJywgJ2NvbnRhY3QgdHlwZScsICdQaG9uZSBEZXZpY2UgVHlwZScsICdtb2JpbGUnXSwgdHlwZTogJ3Bob25lVHlwZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdHJlZXRhZGRyZXNzJywgJ2FkZHIxJywgJ21haWxpbmcgYWRkcmVzcycsICdzdHJlZXQtYWRkcmVzcycsICdhZGRyZXNzMScsICdhZGRyZXNzLWxpbmUtMScsICdhZGRyZXNzbGluZTEnLCAnYWRkcmVzcyBsaW5lIDEnLCAnYWRkcmVzcyBsaW5lMScsICdzdHJlZXQnLCAnYWRkcmVzcyddLCB0eXBlOiAnc3RyZWV0QWRkcmVzcycsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2NpdHknLCAndG93bicsICdzdWJ1cmInLCAnbXVuaWNpcGFsaXR5J10sIHR5cGU6ICdjaXR5JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd6aXBjb2RlJywgJ3ppcC1jb2RlJywgJ3ppcCcsICdwb3N0YWxjb2RlJywgJ3Bvc3RhbC1jb2RlJywgJ3Bvc3Rjb2RlJywgJ3Bvc3RhbCBjb2RlJ10sIHR5cGU6ICd6aXBDb2RlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhdGUnLCAncHJvdmluY2UnLCAncmVnaW9uJywgJ2NvdW50eSddLCB0eXBlOiAnc3RhdGUnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY291bnRyeScsICduYXRpb24nLCAnY291bnRyeSBvZiByZXNpZGVuY2UnLCAnY291bnRyeSBvZiBvcmlnaW4nLCAnY291bnRyeSBuYW1lJywgJ3doZXJlIGRvIHlvdSBsaXZlJywgJ3Jlc2lkZW50IG9mJywgJ2hvbWUgY291bnRyeScsICdjaXRpemVuc2hpcCcsICduYXRpb25hbGl0eScsICdsb2NhdGlvbiBjb3VudHJ5J10sIHR5cGU6ICdjb3VudHJ5JywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbG9jYXRpb24nLCAncmVzaWRlbmNlJywgJ2Jhc2VkIGluJywgJ3doZXJlIGFyZSB5b3UgbG9jYXRlZCcsICdjdXJyZW50IGxvY2F0aW9uJywgJ3ByZWZlcnJlZCBsb2NhdGlvbicsICd3b3JrIGxvY2F0aW9uJ10sIHR5cGU6ICdsb2NhdGlvbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd2hlcmUgZG8geW91IGxpdmUnLCAnY3VycmVudCByZXNpZGVuY2UnLCAnYmFzZWQgaW4nXSwgdHlwZTogJ3Jlc2lkZW5jZUNvdW50cnknLCBjb25maWRlbmNlOiAwLjkgfSxcclxuXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdW1tYXJ5JywgJ3Byb2Zlc3Npb25hbCBzdW1tYXJ5JywgJ2Fib3V0IG1lJywgJ2Fib3V0IHlvdXJzZWxmJywgJ2JpbycsICdwcm9maWxlJywgJ29iamVjdGl2ZScsICdpbnRyb2R1Y3Rpb24nLCAnZGVzY3JpYmUgeW91cnNlbGYnLCAndGVsbCB1cyBhYm91dCB5b3Vyc2VsZicsICdwZXJzb25hbCBzdGF0ZW1lbnQnLCAnY292ZXIgbGV0dGVyJywgJ2NvdmVyaW5nIGxldHRlciddLCB0eXBlOiAncHJvZmVzc2lvbmFsU3VtbWFyeScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NraWxsJywgJ3NraWxscycsICdleHBlcnRpc2UnLCAnY29tcGV0ZW5jaWVzJywgJ2NvbXBldGVuYycsICd0ZWNobm9sb2dpZXMnLCAndGVjaCBzdGFjaycsICd0b29scycsICd0ZWNobmljYWwgc2tpbGxzJywgJ2tleSBza2lsbHMnXSwgdHlwZTogJ3NraWxscycsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2pvYnRpdGxlJywgJ2pvYi10aXRsZScsICdqb2IgdGl0bGUnLCAnY3VycmVudHRpdGxlJywgJ2N1cnJlbnQgdGl0bGUnLCAnY3VycmVudCBqb2IgdGl0bGUnLCAnZGVzaXJlZCB0aXRsZScsICdwb3NpdGlvbicsICdyb2xlJywgJ3lvdXIgdGl0bGUnXSwgdHlwZTogJ2pvYlRpdGxlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY29tcGFueScsICdlbXBsb3llcicsICdvcmdhbml6YXRpb24nLCAnb3JnYW5pc2F0aW9uJywgJ2N1cnJlbnQgY29tcGFueScsICdjdXJyZW50IGVtcGxveWVyJywgJ3dvcmtwbGFjZScsICdtb3N0IHJlY2VudCBlbXBsb3llciddLCB0eXBlOiAnY29tcGFueU5hbWUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgbW9udGgnLCAnc3RhcnRtb250aCcsICdzdGFydC1tb250aCcsICdmcm9tIG1vbnRoJywgJ2JlZ2lubmluZyBtb250aCddLCB0eXBlOiAnZXhwU3RhcnRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgeWVhcicsICdzdGFydHllYXInLCAnc3RhcnQteWVhcicsICdmcm9tIHllYXInLCAnYmVnaW5uaW5nIHllYXInLCAneWVhciBzdGFydGVkJ10sIHR5cGU6ICdleHBTdGFydFllYXInLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VuZCBtb250aCcsICdlbmRtb250aCcsICdlbmQtbW9udGgnLCAndG8gbW9udGgnLCAnZmluaXNoIG1vbnRoJ10sIHR5cGU6ICdleHBFbmRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5kIHllYXInLCAnZW5keWVhcicsICdlbmQteWVhcicsICd0byB5ZWFyJywgJ2ZpbmlzaCB5ZWFyJywgJ3llYXIgZW5kZWQnLCAneWVhciBmaW5pc2hlZCddLCB0eXBlOiAnZXhwRW5kWWVhcicsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG5cclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2hpZ2hlc3QgZWR1Y2F0aW9uJywgJ2xldmVsIG9mIGVkdWNhdGlvbicsICdlZHVjYXRpb24gbGV2ZWwnLCAnZGVncmVlIGxldmVsJywgJ2hpZ2hlc3QgZGVncmVlJ10sIHR5cGU6ICdoaWdoZXN0RWR1JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzY2hvb2wnLCAndW5pdmVyc2l0eScsICdjb2xsZWdlJywgJ2luc3RpdHV0aW9uJywgJ2FsbWEgbWF0ZXInLCAnc2Nob29sIG5hbWUnLCAnaW5zdGl0dXRpb24gbmFtZScsICd1bml2ZXJzaXR5IG5hbWUnXSwgdHlwZTogJ3NjaG9vbE5hbWUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydkZWdyZWUnLCAnbWFqb3InLCAnZmllbGQgb2Ygc3R1ZHknLCAnZmllbGRvZnN0dWR5JywgJ2Rpc2NpcGxpbmUnLCAncXVhbGlmaWNhdGlvbicsICdjb3Vyc2Ugb2Ygc3R1ZHknLCAncHJvZ3JhbScsICdhcmVhIG9mIHN0dWR5J10sIHR5cGU6ICdmaWVsZE9mU3R1ZHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2dyYWR1YXRpb24geWVhcicsICdncmFkIHllYXInLCAneWVhciBvZiBncmFkdWF0aW9uJywgJ2NvbXBsZXRlZCB5ZWFyJywgJ3llYXIgY29tcGxldGVkJ10sIHR5cGU6ICdlZHVFbmRZZWFyJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5yb2xsbWVudCB5ZWFyJywgJ2Vucm9sbWVudCB5ZWFyJywgJ3llYXIgZW5yb2xsZWQnLCAnc3RhcnQgeWVhciBvZiBzdHVkeSddLCB0eXBlOiAnZWR1U3RhcnRZZWFyJywgY29uZmlkZW5jZTogMC44IH0sXHJcblxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncHJvamVjdCBuYW1lJywgJ3Byb2plY3RuYW1lJywgJ3Byb2plY3QgdGl0bGUnXSwgdHlwZTogJ3Byb2plY3ROYW1lJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG5cclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xpbmtlZGluJywgJ2xpbmtlZGluIHVybCcsICdsaW5rZWRpbiBwcm9maWxlJywgJ2xpbmtlZGluICddLCB0eXBlOiAnbGlua2VkaW4nLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydnaXRodWInLCAnZ2l0aHViIHVybCcsICdnaXRodWIgcHJvZmlsZScsICdnaXRodWIgbGluayddLCB0eXBlOiAnZ2l0aHViJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd2Vic2l0ZScsICdwZXJzb25hbCB3ZWJzaXRlJywgJ3BvcnRmb2xpbyB1cmwnLCAncG9ydGZvbGlvIGxpbmsnLCAncGVyc29uYWwgdXJsJywgJ3lvdXIgd2Vic2l0ZScsICdsaW5rJ10sIHR5cGU6ICd3ZWJzaXRlJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnb3RoZXInLCAnYWRkaXRpb25hbCcsICdzdXBwb3J0aW5nIGRvY3VtZW50JywgJ2F0dGFjaG1lbnQnXSwgdHlwZTogJ2FkZGl0aW9uYWxGaWxlJywgY29uZmlkZW5jZTogMC43IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzYWxhcnknLCAnZXhwZWN0ZWQgc2FsYXJ5JywgJ2Rlc2lyZWQgc2FsYXJ5JywgJ2NvbXBlbnNhdGlvbicsICdleHBlY3RlZCBjb21wZW5zYXRpb24nLCAnc2FsYXJ5IGV4cGVjdGF0aW9uJywgJ3JhdGUnLCAnYmFzZSBzYWxhcnknXSwgdHlwZTogJ3NhbGFyeScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3llYXJzIG9mIGV4cGVyaWVuY2UnLCAnZXhwZXJpZW5jZSB5ZWFycycsICdob3cgbWFueSB5ZWFycycsICd0b3RhbCBleHBlcmllbmNlJywgJ3llYXJzIGV4cGVyaWVuY2UnXSwgdHlwZTogJ3llYXJzT2ZFeHBlcmllbmNlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd29yayBhdXRob3JpemF0aW9uJywgJ3dvcmsgYXV0aG9yaXNhdGlvbicsICdhdXRob3JpemVkIHRvIHdvcmsnLCAndmlzYSBzdGF0dXMnLCAncmlnaHQgdG8gd29yaycsICd3b3JrIHBlcm1pdCcsICdlbGlnaWJsZSB0byB3b3JrJ10sIHR5cGU6ICd3b3JrQXV0aCcsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3dpbGxpbmcgdG8gcmVsb2NhdGUnLCAnb3BlbiB0byByZWxvY2F0ZScsICdyZWxvY2F0aW9uJywgJ3JlbG9jYXRlJ10sIHR5cGU6ICdyZWxvY2F0aW9uJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydnZW5kZXInLCAnc2V4J10sIHR5cGU6ICdnZW5kZXInLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3JhY2UnLCAnZXRobmljaXR5JywgJ2V0aG5pYyddLCB0eXBlOiAnZXRobmljaXR5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd2ZXRlcmFuJywgJ21pbGl0YXJ5JywgJ2FybWVkIGZvcmNlcyddLCB0eXBlOiAndmV0ZXJhbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZGlzYWJpbGl0eScsICdkaXNhYmxlZCcsICdpbXBhaXJtZW50J10sIHR5cGU6ICdkaXNhYmlsaXR5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydob3cgZGlkIHlvdSBoZWFyJywgJ2hvdyBkaWQgeW91IGZpbmQnLCAncmVmZXJyYWwgc291cmNlJywgJ3doZXJlIGRpZCB5b3UgaGVhciddLCB0eXBlOiAncmVmZXJyYWxTb3VyY2UnLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgXVxyXG5cclxuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCBrZXl3b3JkIG9mIHBhdHRlcm4ua2V5d29yZHMpIHtcclxuICAgICAgICAgIGlmIChjb21iaW5lZC5pbmNsdWRlcyhrZXl3b3JkKSkge1xyXG4gICAgICAgICAgICBpZiAoa2V5d29yZCA9PT0gJ25hbWUnKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdmaXJzdCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdsYXN0JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2Z1bGwnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY29tcGFueScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdzY2hvb2wnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygncHJvamVjdCcpKSBjb250aW51ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHBhdHRlcm4udHlwZSwgY29uZmlkZW5jZTogcGF0dGVybi5jb25maWRlbmNlIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICgvXFxibmFtZVxcYi8udGVzdChjb21iaW5lZCkpIHtcclxuICAgICAgICBpZiAoIWNvbWJpbmVkLmluY2x1ZGVzKCdmaXJzdCcpICYmICFjb21iaW5lZC5pbmNsdWRlcygnbGFzdCcpICYmICFjb21iaW5lZC5pbmNsdWRlcygnY29tcGFueScpICYmICFjb21iaW5lZC5pbmNsdWRlcygnc2Nob29sJykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdmaWxlJykpIHtcclxuICAgICAgICAgIHJldHVybiB7IHR5cGU6ICdmdWxsTmFtZScsIGNvbmZpZGVuY2U6IDAuNyB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4geyB0eXBlOiAndW5rbm93bicsIGNvbmZpZGVuY2U6IDAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEFsbEZvcm1GaWVsZHMoKTogRmllbGRNYXBwaW5nW10ge1xyXG4gICAgICBjb25zdCBmaWVsZHM6IEZpZWxkTWFwcGluZ1tdID0gW11cclxuICAgICAgY29uc3QgaW5wdXRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcclxuICAgICAgICAnaW5wdXQ6bm90KFt0eXBlPVwic3VibWl0XCJdKTpub3QoW3R5cGU9XCJidXR0b25cIl0pOm5vdChbdHlwZT1cImhpZGRlblwiXSk6bm90KFt0eXBlPVwiZmlsZVwiXSk6bm90KFt0eXBlPVwiaW1hZ2VcIl0pOm5vdChbdHlwZT1cInJlc2V0XCJdKSwgdGV4dGFyZWEsIHNlbGVjdCdcclxuICAgICAgKVxyXG5cclxuICAgICAgaW5wdXRzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAhKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50KSAmJlxyXG4gICAgICAgICAgIShlbGVtZW50IGluc3RhbmNlb2YgSFRNTFRleHRBcmVhRWxlbWVudCkgJiZcclxuICAgICAgICAgICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50KVxyXG4gICAgICAgICkgcmV0dXJuXHJcblxyXG4gICAgICAgIGNvbnN0IHsgdHlwZSwgY29uZmlkZW5jZSB9ID0gZGV0ZWN0RmllbGRUeXBlKGVsZW1lbnQpXHJcbiAgICAgICAgaWYgKGNvbmZpZGVuY2UgPiAwLjUpIHtcclxuICAgICAgICAgIGZpZWxkcy5wdXNoKHsgZWxlbWVudCwgdHlwZSwgY29uZmlkZW5jZSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIHJldHVybiBmaWVsZHNcclxuICAgIH1cclxuXHJcblxyXG4gZnVuY3Rpb24gZmlsbEZpZWxkKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50LCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xyXG5cclxuICBlbGVtZW50LmZvY3VzKCk7XHJcblxyXG4gXHJcbiAgY29uc3QgbmF0aXZlSW5wdXRWYWx1ZVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoXHJcbiAgICB3aW5kb3cuSFRNTElucHV0RWxlbWVudC5wcm90b3R5cGUsXHJcbiAgICAndmFsdWUnXHJcbiAgKT8uc2V0O1xyXG4gIGNvbnN0IG5hdGl2ZVRleHRBcmVhVmFsdWVTZXR0ZXIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKFxyXG4gICAgd2luZG93LkhUTUxUZXh0QXJlYUVsZW1lbnQucHJvdG90eXBlLFxyXG4gICAgJ3ZhbHVlJ1xyXG4gICk/LnNldDtcclxuXHJcbiAgY29uc3Qgc2V0dGVyID0gZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgPyBuYXRpdmVJbnB1dFZhbHVlU2V0dGVyIDogbmF0aXZlVGV4dEFyZWFWYWx1ZVNldHRlcjtcclxuXHJcbiAgaWYgKHNldHRlcikge1xyXG4gICAgc2V0dGVyLmNhbGwoZWxlbWVudCwgdmFsdWUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBlbGVtZW50LnZhbHVlID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICBcclxuICBjb25zdCBldmVudE9wdGlvbnMgPSB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUsIGNvbXBvc2VkOiB0cnVlIH07XHJcbiAgXHJcbiAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCBldmVudE9wdGlvbnMpKTtcclxuICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCBldmVudE9wdGlvbnMpKTtcclxuICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEtleWJvYXJkRXZlbnQoJ2tleWRvd24nLCB7IC4uLmV2ZW50T3B0aW9ucywga2V5OiAnRW50ZXInIH0pKTtcclxuICBcclxuICBcclxuICBlbGVtZW50LmJsdXIoKTtcclxufVxyXG5cclxuICAgIFxyXG5mdW5jdGlvbiBmaWxsRHJvcGRvd24oZWxlbWVudDogSFRNTFNlbGVjdEVsZW1lbnQsIHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcclxuICBjb25zdCBvcHRpb25zID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpO1xyXG5cclxuIFxyXG4gIGxldCBtYXRjaCA9IG9wdGlvbnMuZmluZChvcHQgPT4gXHJcbiAgICBvcHQudGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gbm9ybWFsaXplZCB8fCBcclxuICAgIG9wdC52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKSA9PT0gbm9ybWFsaXplZFxyXG4gICk7XHJcblxyXG4gIGlmICghbWF0Y2gpIHtcclxuICAgIG1hdGNoID0gb3B0aW9ucy5maW5kKG9wdCA9PiB7XHJcbiAgICAgIGNvbnN0IHQgPSBvcHQudGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcclxuICAgICAgcmV0dXJuIHQubGVuZ3RoID4gMSAmJiAobm9ybWFsaXplZC5pbmNsdWRlcyh0KSB8fCB0LmluY2x1ZGVzKG5vcm1hbGl6ZWQpKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFtYXRjaCAmJiBub3JtYWxpemVkLmxlbmd0aCA+IDMpIHtcclxuICAgIG1hdGNoID0gb3B0aW9ucy5maW5kKG9wdCA9PiBcclxuICAgICAgb3B0LnRleHQudG9Mb3dlckNhc2UoKS50cmltKCkuc3RhcnRzV2l0aChub3JtYWxpemVkLnN1YnN0cmluZygwLCAzKSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBpZiAobWF0Y2gpIHtcclxuICAgIGVsZW1lbnQudmFsdWUgPSBtYXRjaC52YWx1ZTtcclxuICAgIGNvbnN0IGV2ZW50T3B0aW9ucyA9IHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSB9O1xyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgZXZlbnRPcHRpb25zKSk7XHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIGV2ZW50T3B0aW9ucykpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuZnVuY3Rpb24gZmlsbEVkdWNhdGlvbkRyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IG9wdGlvbnMgPSBBcnJheS5mcm9tKGVsZW1lbnQub3B0aW9ucyk7XHJcbiAgY29uc3QgdmFsID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcclxuXHJcbiBcclxuICBjb25zdCBtYXRjaCA9IG9wdGlvbnMuZmluZChvcHQgPT4ge1xyXG4gICAgY29uc3QgdGV4dCA9IG9wdC50ZXh0LnRvTG93ZXJDYXNlKCk7XHJcbiAgICByZXR1cm4gdGV4dC5pbmNsdWRlcyh2YWwpIHx8IFxyXG4gICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ2JhY2hlbG9yJykgJiYgdGV4dC5pbmNsdWRlcygnYmFjaGVsb3InKSkgfHxcclxuICAgICAgICAgICAodmFsLmluY2x1ZGVzKCdtYXN0ZXInKSAmJiB0ZXh0LmluY2x1ZGVzKCdtYXN0ZXInKSkgfHxcclxuICAgICAgICAgICAodmFsLmluY2x1ZGVzKCdwaGQnKSAmJiB0ZXh0LmluY2x1ZGVzKCdkb2N0b3JhdGUnKSk7XHJcbiAgfSk7XHJcblxyXG4gIGlmIChtYXRjaCkge1xyXG4gICAgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlO1xyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxFeHBlcmllbmNlRHJvcGRvd24oZWxlbWVudDogSFRNTFNlbGVjdEVsZW1lbnQsIHllYXJzOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIXllYXJzKSByZXR1cm4gZmFsc2U7XHJcbiAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKTtcclxuICBjb25zdCBudW1ZZWFycyA9IHBhcnNlSW50KHllYXJzKTtcclxuXHJcbiAgY29uc3QgbWF0Y2ggPSBvcHRpb25zLmZpbmQob3B0ID0+IHtcclxuICAgIGNvbnN0IHRleHQgPSBvcHQudGV4dC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKHRleHQuaW5jbHVkZXMoeWVhcnMpKSByZXR1cm4gdHJ1ZTtcclxuICAgIFxyXG4gICAgXHJcbiAgICBjb25zdCBudW1iZXJzID0gdGV4dC5tYXRjaCgvXFxkKy9nKTtcclxuICAgIGlmIChudW1iZXJzKSB7XHJcbiAgICAgIGNvbnN0IGZpcnN0ID0gcGFyc2VJbnQobnVtYmVyc1swXSk7XHJcbiAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMSAmJiB0ZXh0LmluY2x1ZGVzKCcrJykgJiYgbnVtWWVhcnMgPj0gZmlyc3QpIHJldHVybiB0cnVlO1xyXG4gICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICBjb25zdCBzZWNvbmQgPSBwYXJzZUludChudW1iZXJzWzFdKTtcclxuICAgICAgICByZXR1cm4gbnVtWWVhcnMgPj0gZmlyc3QgJiYgbnVtWWVhcnMgPD0gc2Vjb25kO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSk7XHJcblxyXG4gIGlmIChtYXRjaCkge1xyXG4gICAgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlO1xyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsTW9udGhEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgbW9udGhWYWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgIGlmICghbW9udGhWYWx1ZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgIGNvbnN0IG1vbnRoTmFtZSA9IE1PTlRIU1ttb250aFZhbHVlXSB8fCBtb250aFZhbHVlLnRvTG93ZXJDYXNlKClcclxuICAgICAgY29uc3QgbW9udGhOdW0gPSBtb250aFZhbHVlLnBhZFN0YXJ0KDIsICcwJylcclxuICAgICAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKVxyXG5cclxuICAgICAgY29uc3QgbWF0Y2ggPSBvcHRpb25zLmZpbmQob3B0ID0+IHtcclxuICAgICAgICBjb25zdCB0ID0gb3B0LnRleHQudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgICBjb25zdCB2ID0gb3B0LnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpXHJcbiAgICAgICAgcmV0dXJuIHQgPT09IG1vbnRoTmFtZSB8fCB2ID09PSBtb250aFZhbHVlIHx8IHYgPT09IG1vbnRoTnVtIHx8IHQuc3RhcnRzV2l0aChtb250aE5hbWUuc3Vic3RyaW5nKDAsIDMpKVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICBcclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsUmFkaW9Hcm91cChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcclxuICAgICAgaWYgKCFuYW1lIHx8ICF2YWx1ZSkgcmV0dXJuXHJcbiAgICAgIGNvbnN0IHJhZGlvcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTElucHV0RWxlbWVudD4oYGlucHV0W3R5cGU9XCJyYWRpb1wiXVtuYW1lPVwiJHtuYW1lfVwiXWApXHJcbiAgICAgIGlmICghcmFkaW9zLmxlbmd0aCkgcmV0dXJuXHJcblxyXG4gICAgICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgbGV0IG1hdGNoZWQ6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWRcclxuXHJcbiAgICAgIHJhZGlvcy5mb3JFYWNoKHJhZGlvID0+IHtcclxuICAgICAgICBjb25zdCByYWRpb0xhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChyYWRpbykudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIGNvbnN0IHJhZGlvVmFsID0gcmFkaW8udmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgICBpZiAocmFkaW9WYWwgPT09IG5vcm1hbGl6ZWQgfHwgcmFkaW9MYWJlbC5pbmNsdWRlcyhub3JtYWxpemVkKSB8fCBub3JtYWxpemVkLmluY2x1ZGVzKHJhZGlvVmFsKSkge1xyXG4gICAgICAgICAgbWF0Y2hlZCA9IHJhZGlvXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgaWYgKG1hdGNoZWQpIHtcclxuICAgICAgICBtYXRjaGVkLmNoZWNrZWQgPSB0cnVlXHJcbiAgICAgICAgbWF0Y2hlZC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICAgIG1hdGNoZWQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NsaWNrJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGFuZGxlUmFkaW9CdXR0b25zKHJlc3VtZURhdGE6IFJlc3VtZURhdGEpIHtcclxuICAgICAgY29uc3QgcmFkaW9Hcm91cHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXHJcblxyXG4gICAgICBcclxuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MSW5wdXRFbGVtZW50PignaW5wdXRbdHlwZT1cInJhZGlvXCJdJykuZm9yRWFjaChyYWRpbyA9PiB7XHJcbiAgICAgICAgaWYgKHJhZGlvLm5hbWUgJiYgIXJhZGlvR3JvdXBzLmhhcyhyYWRpby5uYW1lKSkge1xyXG4gICAgICAgICAgY29uc3QgZ3JvdXBMYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQocmFkaW8pLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIGNvbnN0IGdyb3VwTmFtZSA9IHJhZGlvLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtncm91cExhYmVsfSAke2dyb3VwTmFtZX1gXHJcblxyXG4gICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdwaG9uZSB0eXBlJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3R5cGUgb2YgcGhvbmUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY29udGFjdCB0eXBlJykpIHtcclxuICAgICAgICAgICAgcmFkaW9Hcm91cHMuc2V0KHJhZGlvLm5hbWUsICdob21lJylcclxuICAgICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ3dvcmsgYXV0aCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdhdXRob3JpemVkJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2VsaWdpYmxlJykpIHtcclxuICAgICAgICAgICAgcmFkaW9Hcm91cHMuc2V0KHJhZGlvLm5hbWUsICd5ZXMnKVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygncmVsb2NhdCcpKSB7XHJcbiAgICAgICAgICAgIHJhZGlvR3JvdXBzLnNldChyYWRpby5uYW1lLCAneWVzJylcclxuICAgICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2dlbmRlcicpKSB7XHJcbiAgICAgICAgICAgIC8vIGRvbid0IGF1dG8tZmlsbCBnZW5kZXJcclxuICAgICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ3ZldGVyYW4nKSkge1xyXG4gICAgICAgICAgICByYWRpb0dyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ25vJylcclxuICAgICAgICAgIH0gZWxzZSBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2Rpc2FiaWxpdHknKSkge1xyXG4gICAgICAgICAgICByYWRpb0dyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ25vJylcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICByYWRpb0dyb3Vwcy5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4gZmlsbFJhZGlvR3JvdXAobmFtZSwgdmFsdWUpKVxyXG4gICAgfVxyXG5cclxuICAgIFxyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZldGNoQW5kVXBsb2FkRmlsZShlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50LCBlbmRwb2ludDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2F1dGhfdG9rZW4nLCAnYXBpX3VybCddKTtcclxuICAgIGNvbnN0IHRva2VuID0gc3RvcmVkLmF1dGhfdG9rZW47XHJcbiAgICBjb25zdCBBUElfVVJMID0gc3RvcmVkLmFwaV91cmw7XHJcblxyXG4gICAgaWYgKCF0b2tlbiB8fCAhQVBJX1VSTCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBhbnkgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgIGFjdGlvbjogJ3Byb3h5RmV0Y2hGaWxlJyxcclxuICAgICAgdXJsOiBgJHtBUElfVVJMfSR7ZW5kcG9pbnR9YCxcclxuICAgICAgdG9rZW46IHRva2VuXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5zdWNjZXNzKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2gocmVzcG9uc2UuYmFzZTY0KTtcclxuICAgIGNvbnN0IGJsb2IgPSBhd2FpdCByZXMuYmxvYigpO1xyXG4gICAgY29uc3QgZmlsZSA9IG5ldyBGaWxlKFtibG9iXSwgZmlsZU5hbWUsIHsgdHlwZTogJ2FwcGxpY2F0aW9uL3BkZicgfSk7XHJcblxyXG4gICAgY29uc3QgZGF0YVRyYW5zZmVyID0gbmV3IERhdGFUcmFuc2ZlcigpO1xyXG4gICAgZGF0YVRyYW5zZmVyLml0ZW1zLmFkZChmaWxlKTtcclxuICAgIGVsZW1lbnQuZmlsZXMgPSBkYXRhVHJhbnNmZXIuZmlsZXM7XHJcblxyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKTtcclxuICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgeyBidWJibGVzOiB0cnVlIH0pKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBbUkFFXSBGaWxlIHVwbG9hZCBlcnJvcjpgLCBlcnJvcik7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUFsbEZpbGVJbnB1dHMoY3ZBdmFpbGFibGU6IGJvb2xlYW4pIHtcclxuICBjb25zdCBmaWxlSW5wdXRzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpKTtcclxuICBcclxuICBsZXQgcmVzdW1lVXBsb2FkZWQgPSBmYWxzZTtcclxuICBsZXQgY292ZXJMZXR0ZXJVcGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuICBmb3IgKGNvbnN0IGZpbGVJbnB1dCBvZiBmaWxlSW5wdXRzKSB7XHJcbiAgICBjb25zdCBsYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZmlsZUlucHV0KS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgY29uc3QgaWQgPSBmaWxlSW5wdXQuaWQ/LnRvTG93ZXJDYXNlKCkgfHwgJyc7XHJcbiAgICBjb25zdCBuYW1lID0gZmlsZUlucHV0Lm5hbWU/LnRvTG93ZXJDYXNlKCkgfHwgJyc7XHJcbiAgICBjb25zdCBjb21iaW5lZCA9IGAke2xhYmVsfSAke2lkfSAke25hbWV9YDtcclxuXHJcbiAgICBjb25zdCBpc1Jlc3VtZSA9IGNvbWJpbmVkLmluY2x1ZGVzKCdyZXN1bWUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3YnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnY3VycmljdWx1bScpO1xyXG4gICAgY29uc3QgaXNDb3ZlckxldHRlciA9IGNvbWJpbmVkLmluY2x1ZGVzKCdjb3ZlcicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdsZXR0ZXInKTtcclxuXHJcbiAgICBpZiAoaXNSZXN1bWUpIHtcclxuICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShmaWxlSW5wdXQsICcvYXBpL3Jlc3VtZS92aWV3JywgJ3Jlc3VtZS5wZGYnKTtcclxuICAgICAgaWYgKHN1Y2Nlc3MpIHJlc3VtZVVwbG9hZGVkID0gdHJ1ZTtcclxuICAgIH0gZWxzZSBpZiAoaXNDb3ZlckxldHRlciAmJiBjdkF2YWlsYWJsZSkge1xyXG4gICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgZmV0Y2hBbmRVcGxvYWRGaWxlKGZpbGVJbnB1dCwgJy9hcGkvY3YvdmlldycsICdjb3Zlci1sZXR0ZXIucGRmJyk7XHJcbiAgICAgIGlmIChzdWNjZXNzKSBjb3ZlckxldHRlclVwbG9hZGVkID0gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gXHJcbiAgaWYgKGN2QXZhaWxhYmxlICYmIHJlc3VtZVVwbG9hZGVkICYmICFjb3ZlckxldHRlclVwbG9hZGVkKSB7XHJcbiAgICBmb3IgKGNvbnN0IGZpbGVJbnB1dCBvZiBmaWxlSW5wdXRzKSB7XHJcbiAgICAgIGlmIChmaWxlSW5wdXQuZmlsZXMgJiYgZmlsZUlucHV0LmZpbGVzLmxlbmd0aCA+IDApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgbGFiZWwgPSBmaW5kTGFiZWxGb3JFbGVtZW50KGZpbGVJbnB1dCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgY29uc3QgaWQgPSBmaWxlSW5wdXQuaWQ/LnRvTG93ZXJDYXNlKCkgfHwgJyc7XHJcbiAgICAgIGNvbnN0IG5hbWUgPSBmaWxlSW5wdXQubmFtZT8udG9Mb3dlckNhc2UoKSB8fCAnJztcclxuICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtsYWJlbH0gJHtpZH0gJHtuYW1lfWA7XHJcblxyXG4gICAgICBjb25zdCBpc0dlbmVyaWNGaWVsZCA9IGNvbWJpbmVkLmluY2x1ZGVzKCdvdGhlcicpIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbWJpbmVkLmluY2x1ZGVzKCdhZGRpdGlvbmFsJykgfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tYmluZWQuaW5jbHVkZXMoJ3N1cHBvcnRpbmcnKSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21iaW5lZC5pbmNsdWRlcygnYXR0YWNobWVudCcpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tYmluZWQuaW5jbHVkZXMoJ3BvcnRmb2xpbycpO1xyXG5cclxuICAgICAgaWYgKGlzR2VuZXJpY0ZpZWxkKSB7XHJcbiAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IGZldGNoQW5kVXBsb2FkRmlsZShmaWxlSW5wdXQsICcvYXBpL2N2L3ZpZXcnLCAnY292ZXItbGV0dGVyLnBkZicpO1xyXG4gICAgICAgIGlmIChzdWNjZXNzKSB7XHJcbiAgICAgICAgICBjb3ZlckxldHRlclVwbG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgIGJyZWFrOyBcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbiAgICBcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBhdXRvZmlsbEZvcm0ocmVzdW1lRGF0YTogUmVzdW1lRGF0YSwgY3ZBdmFpbGFibGU6IGJvb2xlYW4pIHtcclxuICBjb25zdCBmaWVsZHMgPSBnZXRBbGxGb3JtRmllbGRzKCk7XHJcbiAgbGV0IGZpbGxlZENvdW50ID0gMDtcclxuXHJcbiAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7cmVzdW1lRGF0YS5maXJzdE5hbWV9ICR7cmVzdW1lRGF0YS5sYXN0TmFtZX1gLnRyaW0oKVxyXG4gICAgICBjb25zdCBsYXRlc3RFeHAgPSByZXN1bWVEYXRhLmV4cGVyaWVuY2U/LlswXVxyXG4gICAgICBjb25zdCBsYXRlc3RFZHUgPSByZXN1bWVEYXRhLmVkdWNhdGlvbj8uWzBdXHJcbiAgICAgIGNvbnN0IGxhdGVzdFByb2plY3QgPSByZXN1bWVEYXRhLnByb2plY3RzPy5bMF1cclxuXHJcbiAgICAgIGNvbnN0IGxvY2F0aW9uU3RyID0gcmVzdW1lRGF0YS5sb2NhdGlvbiB8fFxyXG4gICAgICAgIFtyZXN1bWVEYXRhLmNpdHksIHJlc3VtZURhdGEuY291bnRyeV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJywgJylcclxuXHJcbiAgICAgIGNvbnN0IHRvdGFsRXhwWWVhcnMgPSAoKCkgPT4ge1xyXG4gIGxldCB0b3RhbE1vbnRocyA9IDA7XHJcbiAgcmVzdW1lRGF0YS5leHBlcmllbmNlPy5mb3JFYWNoKGV4cCA9PiB7XHJcbiAgICBjb25zdCBzdGFydCA9IHBhcnNlSW50KGV4cC5zdGFydFllYXIpICogMTIgKyAocGFyc2VJbnQoZXhwLnN0YXJ0TW9udGgpIHx8IDEpO1xyXG4gICAgXHJcbiAgICBcclxuICAgIGNvbnN0IGlzUHJlc2VudCA9ICFleHAuZW5kWWVhciB8fCBleHAuZW5kWWVhci50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdwcmVzZW50Jyk7XHJcbiAgICBjb25zdCBlbmRZZWFyID0gaXNQcmVzZW50ID8gbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpIDogcGFyc2VJbnQoZXhwLmVuZFllYXIpO1xyXG4gICAgY29uc3QgZW5kTW9udGggPSBpc1ByZXNlbnQgPyBuZXcgRGF0ZSgpLmdldE1vbnRoKCkgKyAxIDogKHBhcnNlSW50KGV4cC5lbmRNb250aCkgfHwgMSk7XHJcbiAgICBcclxuICAgIGNvbnN0IGVuZCA9IGVuZFllYXIgKiAxMiArIGVuZE1vbnRoO1xyXG4gICAgaWYgKCFpc05hTihlbmQgLSBzdGFydCkpIHRvdGFsTW9udGhzICs9IChlbmQgLSBzdGFydCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGguZmxvb3IodG90YWxNb250aHMgLyAxMikpLnRvU3RyaW5nKCk7XHJcbn0pKCk7XHJcblxyXG4gICAgICBjb25zdCB2YWx1ZU1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICBmdWxsTmFtZTogICAgICAgICAgICAgZnVsbE5hbWUsXHJcbiAgICAgICAgZmlyc3ROYW1lOiAgICAgICAgICAgIHJlc3VtZURhdGEuZmlyc3ROYW1lLFxyXG4gICAgICAgIGxhc3ROYW1lOiAgICAgICAgICAgICByZXN1bWVEYXRhLmxhc3ROYW1lLFxyXG4gICAgICAgIGVtYWlsOiAgICAgICAgICAgICAgICByZXN1bWVEYXRhLmVtYWlsLFxyXG4gICAgICAgIHBob25lOiAgICAgICAgICAgICAgICByZXN1bWVEYXRhLnBob25lLFxyXG4gICAgICAgIGNvdW50cnlDb2RlOiAgICAgICAgICByZXN1bWVEYXRhLmNvdW50cnlDb2RlIHx8ICcnLFxyXG4gICAgICAgIHBob25lTnVtYmVyOiAgICAgICAgICByZXN1bWVEYXRhLnBob25lTnVtYmVyIHx8IHJlc3VtZURhdGEucGhvbmUsXHJcbiAgICAgICAgcGhvbmVUeXBlOiAgICAgICAgICAgICdIb21lJyxcclxuICAgICAgICBzdHJlZXRBZGRyZXNzOiAgICAgICAgcmVzdW1lRGF0YS5zdHJlZXRBZGRyZXNzLFxyXG4gICAgICAgIGNpdHk6ICAgICAgICAgICAgICAgICByZXN1bWVEYXRhLmNpdHksXHJcbiAgICAgICAgYWRkcmVzc0xpbmUxOiByZXN1bWVEYXRhLnN0cmVldEFkZHJlc3MsXHJcbiAgICAgICAgemlwQ29kZTogICAgICAgICAgICAgICcnLFxyXG4gICAgICAgIHN0YXRlOiAgICAgICAgICAgICAgICAnJyxcclxuICAgICAgICBjb3VudHJ5OiAgICAgICAgICAgICAgcmVzdW1lRGF0YS5jb3VudHJ5LFxyXG4gICAgICAgIHJlc2lkZW5jZUNvdW50cnk6IHJlc3VtZURhdGEuY291bnRyeSxcclxuICAgICAgICBsb2NhdGlvbjogYCR7cmVzdW1lRGF0YS5jaXR5fSwgJHtyZXN1bWVEYXRhLmNvdW50cnl9YCxcclxuICAgICAgICBwcm9mZXNzaW9uYWxTdW1tYXJ5OiAgcmVzdW1lRGF0YS5wcm9mZXNzaW9uYWxTdW1tYXJ5LFxyXG4gICAgICAgIHNraWxsczogICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KHJlc3VtZURhdGEuc2tpbGxzKSA/IHJlc3VtZURhdGEuc2tpbGxzLmpvaW4oJywgJykgOiAnJyxcclxuICAgICAgICBqb2JUaXRsZTogICAgICAgICAgICAgbGF0ZXN0RXhwPy5qb2JUaXRsZSB8fCAnJyxcclxuICAgICAgICBjb21wYW55TmFtZTogICAgICAgICAgbGF0ZXN0RXhwPy5jb21wYW55TmFtZSB8fCAnJyxcclxuICAgICAgICBleHBTdGFydE1vbnRoOiAgICAgICAgbGF0ZXN0RXhwPy5zdGFydE1vbnRoIHx8ICcnLFxyXG4gICAgICAgIGV4cFN0YXJ0WWVhcjogICAgICAgICBsYXRlc3RFeHA/LnN0YXJ0WWVhciB8fCAnJyxcclxuICAgICAgICBleHBFbmRNb250aDogICAgICAgICAgbGF0ZXN0RXhwPy5lbmRNb250aCB8fCAnJyxcclxuICAgICAgICBleHBFbmRZZWFyOiAgICAgICAgICAgbGF0ZXN0RXhwPy5lbmRZZWFyIHx8ICcnLFxyXG4gICAgICAgIHNjaG9vbE5hbWU6ICAgICAgICAgICBsYXRlc3RFZHU/LnNjaG9vbE5hbWUgfHwgJycsXHJcbiAgICAgICAgZmllbGRPZlN0dWR5OiAgICAgICAgIGxhdGVzdEVkdT8uZmllbGRPZlN0dWR5IHx8ICcnLFxyXG4gICAgICAgIGVkdVN0YXJ0WWVhcjogICAgICAgICBsYXRlc3RFZHU/LnN0YXJ0WWVhciB8fCAnJyxcclxuICAgICAgICBlZHVFbmRZZWFyOiAgICAgICAgICAgbGF0ZXN0RWR1Py5lbmRZZWFyIHx8ICcnLFxyXG4gICAgICAgIGhpZ2hlc3RFZHU6IGxhdGVzdEVkdT8uZmllbGRPZlN0dWR5IHx8ICcnLCBcclxuICAgICAgICB5ZWFyc09mRXhwZXJpZW5jZTogdG90YWxFeHBZZWFycyxcclxuICAgICAgICBwcm9qZWN0TmFtZTogICAgICAgICAgbGF0ZXN0UHJvamVjdD8ucHJvamVjdE5hbWUgfHwgJycsXHJcbiAgICAgICAgbGlua2VkaW46ICAgICAgICAgICAgIHJlc3VtZURhdGEubGlua2VkaW4gfHwgJycsXHJcbiAgICAgICAgZ2l0aHViOiAgICAgICAgICAgICAgIHJlc3VtZURhdGEuZ2l0aHViIHx8ICcnLFxyXG4gICAgICAgIHdlYnNpdGU6ICAgICAgICAgICAgICByZXN1bWVEYXRhLnBvcnRmb2xpbyB8fCBsYXRlc3RQcm9qZWN0Py5saW5rIHx8ICcnLFxyXG4gICAgICAgIHNhbGFyeTogICAgICAgICAgICAgICAnJyxcclxuICAgICAgICB3b3JrQXV0aDogICAgICAgICAgICAgJ1llcycsXHJcbiAgICAgICAgcmVsb2NhdGlvbjogICAgICAgICAgICdZZXMnLFxyXG4gICAgICAgIHJlZmVycmFsU291cmNlOiAgICAgICAnJyxcclxuICAgICAgICBnZW5kZXI6ICAgICAgICAgICAgICAgJycsXHJcbiAgICAgICAgZXRobmljaXR5OiAgICAgICAgICAgICcnLFxyXG4gICAgICAgIHZldGVyYW46ICAgICAgICAgICAgICAnTm8nLFxyXG4gICAgICAgIGRpc2FiaWxpdHk6ICAgICAgICAgICAnTm8nLFxyXG4gICAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCB7IGVsZW1lbnQsIHR5cGUgfSBvZiBmaWVsZHMpIHtcclxuICBsZXQgdmFsdWUgPSB2YWx1ZU1hcFt0eXBlXTtcclxuXHJcbiBcclxuICBjb25zdCBsYWJlbFRleHQgPSBmaW5kTGFiZWxGb3JFbGVtZW50KGVsZW1lbnQpLnRvTG93ZXJDYXNlKCk7XHJcbiAgaWYgKGxhYmVsVGV4dCA9PT0gJ2xvY2F0aW9uJyB8fCBsYWJlbFRleHQgPT09ICd5b3VyIGxvY2F0aW9uJykge1xyXG4gICAgdmFsdWUgPSB2YWx1ZU1hcFsnbG9jYXRpb24nXTsgXHJcbiAgfVxyXG5cclxuXHJcbiAgaWYgKHR5cGUgPT09ICdjaXR5JyAmJiBsYWJlbFRleHQuaW5jbHVkZXMoJ2FkZHJlc3MnKSkge1xyXG4gICAgdmFsdWUgPSB2YWx1ZU1hcFsnc3RyZWV0QWRkcmVzcyddO1xyXG4gIH1cclxuXHJcbiBcclxuXHJcbiAgaWYgKCF2YWx1ZSkgY29udGludWU7XHJcblxyXG4gIGlmIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCB8fCBlbGVtZW50IGluc3RhbmNlb2YgSFRNTFRleHRBcmVhRWxlbWVudCkge1xyXG4gICBcclxuICAgIGZpbGxGaWVsZChlbGVtZW50LCB2YWx1ZSk7XHJcbiAgICBmaWxsZWRDb3VudCsrO1xyXG4gIH0gZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxTZWxlY3RFbGVtZW50KSB7XHJcbiAgICBcclxuICAgIFxyXG4gICAgbGV0IHN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgXHJcbiAgICBpZiAodHlwZSA9PT0gJ2hpZ2hlc3RFZHUnKSB7XHJcbiAgICAgIHN1Y2Nlc3MgPSBmaWxsRWR1Y2F0aW9uRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAneWVhcnNPZkV4cGVyaWVuY2UnKSB7XHJcbiAgICAgIHN1Y2Nlc3MgPSBmaWxsRXhwZXJpZW5jZURyb3Bkb3duKGVsZW1lbnQsIHZhbHVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHN1Y2Nlc3MgPSBmaWxsRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAoc3VjY2VzcykgZmlsbGVkQ291bnQrKztcclxuICB9XHJcbn1cclxuXHJcbiAgXHJcbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xyXG5cclxuICBcclxuICBoYW5kbGVSYWRpb0J1dHRvbnMocmVzdW1lRGF0YSk7XHJcbiAgYXdhaXQgaGFuZGxlQWxsRmlsZUlucHV0cyhjdkF2YWlsYWJsZSk7XHJcblxyXG4gIHJldHVybiBmaWxsZWRDb3VudDtcclxufVxyXG5cclxuICAgIFxyXG5cclxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0b2ZpbGwnKSB7XHJcbiAgICAgICAgYXV0b2ZpbGxGb3JtKG1lc3NhZ2UucmVzdW1lRGF0YSwgbWVzc2FnZS5jdkF2YWlsYWJsZSkudGhlbihmaWxsZWRDb3VudCA9PiB7XHJcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBmaWxsZWRDb3VudCB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnZGV0ZWN0RmllbGRzJykge1xyXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGdldEFsbEZvcm1GaWVsZHMoKVxyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGZpZWxkQ291bnQ6IGZpZWxkcy5sZW5ndGggfSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdbUkFFXSBBdXRvZmlsbCBjb250ZW50IHNjcmlwdCBsb2FkZWQnKVxyXG4gIH1cclxufSkiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDRkEsUUFBQSxhQUFBLG9CQUFBO0FBQUEsSUFBbUMsU0FBQSxDQUFBLFlBQUE7QUFBQSxJQUNYLE9BQUE7QUFBQSxJQUNmLE9BQUE7QUFnRUwsZUFBQSxvQkFBQSxTQUFBO0FBQ0UsY0FBQSxVQUFBLENBQUE7QUFFQSxZQUFBLFFBQUEsSUFBQTtBQUNFLGdCQUFBLFFBQUEs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
content;