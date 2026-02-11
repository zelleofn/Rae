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
          { keywords: ["linkedin", "linkedin url", "linkedin profile", "linkedin link"], type: "linkedin", confidence: 0.95 },
          { keywords: ["github", "github url", "github profile", "github link"], type: "github", confidence: 0.95 },
          { keywords: ["website", "personal website", "portfolio url", "portfolio link", "personal url", "your website"], type: "website", confidence: 0.75 },
          { keywords: ["other", "additional", "supporting document", "attachment"], type: "additionalFile", confidence: 0.7 },
          { keywords: ["salary", "expected salary", "desired salary", "compensation", "expected compensation", "salary expectation"], type: "salary", confidence: 0.8 },
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHd4dC1kZXYrYnJvd3NlckAwLjEuMzIvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuMTNfQHR5cGVzK25vZGVAMjUuXzYzNjE5NDQ1YzU4N2NkNGE2NjcyNzc1MWFkYzIyYTdhL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9pZGxlJyxcclxuXHJcbiAgbWFpbigpIHtcclxuICAgIGludGVyZmFjZSBSZXN1bWVEYXRhIHtcclxuICAgICAgZmlyc3ROYW1lOiBzdHJpbmdcclxuICAgICAgbGFzdE5hbWU6IHN0cmluZ1xyXG4gICAgICBlbWFpbDogc3RyaW5nXHJcbiAgICAgIHBob25lOiBzdHJpbmdcclxuICAgICAgY291bnRyeUNvZGU6IHN0cmluZ1xyXG4gICAgICBwaG9uZU51bWJlcjogc3RyaW5nXHJcbiAgICAgIHN0cmVldEFkZHJlc3M6IHN0cmluZ1xyXG4gICAgICBjaXR5OiBzdHJpbmdcclxuICAgICAgY291bnRyeTogc3RyaW5nXHJcbiAgICAgIGxvY2F0aW9uOiBzdHJpbmdcclxuICAgICAgcHJvZmVzc2lvbmFsU3VtbWFyeTogc3RyaW5nXHJcbiAgICAgIHNraWxsczogc3RyaW5nW11cclxuICAgICAgZXhwZXJpZW5jZTogQXJyYXk8e1xyXG4gICAgICAgIGpvYlRpdGxlOiBzdHJpbmdcclxuICAgICAgICBjb21wYW55TmFtZTogc3RyaW5nXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHN0cmluZ1xyXG4gICAgICAgIHN0YXJ0TW9udGg6IHN0cmluZ1xyXG4gICAgICAgIHN0YXJ0WWVhcjogc3RyaW5nXHJcbiAgICAgICAgZW5kTW9udGg6IHN0cmluZ1xyXG4gICAgICAgIGVuZFllYXI6IHN0cmluZ1xyXG4gICAgICB9PlxyXG4gICAgICBwcm9qZWN0czogQXJyYXk8e1xyXG4gICAgICAgIHByb2plY3ROYW1lOiBzdHJpbmdcclxuICAgICAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgICAgICAgbGluazogc3RyaW5nXHJcbiAgICAgIH0+XHJcbiAgICAgIGVkdWNhdGlvbjogQXJyYXk8e1xyXG4gICAgICAgIHNjaG9vbE5hbWU6IHN0cmluZ1xyXG4gICAgICAgIGZpZWxkT2ZTdHVkeTogc3RyaW5nXHJcbiAgICAgICAgc3RhcnRZZWFyOiBzdHJpbmdcclxuICAgICAgICBlbmRZZWFyOiBzdHJpbmdcclxuICAgICAgfT5cclxuICAgICAgZ2l0aHViOiBzdHJpbmc7ICAgIFxyXG4gICAgICBsaW5rZWRpbjogc3RyaW5nOyAgXHJcbiAgICAgIHBvcnRmb2xpbzogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBGaWVsZE1hcHBpbmcge1xyXG4gICAgICBlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50XHJcbiAgICAgIHR5cGU6IHN0cmluZ1xyXG4gICAgICBjb25maWRlbmNlOiBudW1iZXJcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBNT05USFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICcxJzogJ2phbnVhcnknLCAnMDEnOiAnamFudWFyeScsXHJcbiAgICAgICcyJzogJ2ZlYnJ1YXJ5JywgJzAyJzogJ2ZlYnJ1YXJ5JyxcclxuICAgICAgJzMnOiAnbWFyY2gnLCAnMDMnOiAnbWFyY2gnLFxyXG4gICAgICAnNCc6ICdhcHJpbCcsICcwNCc6ICdhcHJpbCcsXHJcbiAgICAgICc1JzogJ21heScsICcwNSc6ICdtYXknLFxyXG4gICAgICAnNic6ICdqdW5lJywgJzA2JzogJ2p1bmUnLFxyXG4gICAgICAnNyc6ICdqdWx5JywgJzA3JzogJ2p1bHknLFxyXG4gICAgICAnOCc6ICdhdWd1c3QnLCAnMDgnOiAnYXVndXN0JyxcclxuICAgICAgJzknOiAnc2VwdGVtYmVyJywgJzA5JzogJ3NlcHRlbWJlcicsXHJcbiAgICAgICcxMCc6ICdvY3RvYmVyJyxcclxuICAgICAgJzExJzogJ25vdmVtYmVyJyxcclxuICAgICAgJzEyJzogJ2RlY2VtYmVyJyxcclxuICAgIH1cclxuXHJcbiAgICBcclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kTGFiZWxGb3JFbGVtZW50KGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogc3RyaW5nIHtcclxuICAgICAgY29uc3Qgc291cmNlczogc3RyaW5nW10gPSBbXVxyXG5cclxuICAgICAgaWYgKGVsZW1lbnQuaWQpIHtcclxuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxhYmVsW2Zvcj1cIiR7Q1NTLmVzY2FwZShlbGVtZW50LmlkKX1cIl1gKVxyXG4gICAgICAgIGlmIChsYWJlbCkgc291cmNlcy5wdXNoKGxhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwYXJlbnRMYWJlbCA9IGVsZW1lbnQuY2xvc2VzdCgnbGFiZWwnKVxyXG4gICAgICBpZiAocGFyZW50TGFiZWwpIHNvdXJjZXMucHVzaChwYXJlbnRMYWJlbC50ZXh0Q29udGVudCB8fCAnJylcclxuXHJcbiAgICAgIGNvbnN0IHByZXYgPSBlbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmdcclxuICAgICAgaWYgKHByZXYgJiYgKHByZXYudGFnTmFtZSA9PT0gJ0xBQkVMJyB8fCBwcmV2LnRhZ05hbWUgPT09ICdTUEFOJyB8fCBwcmV2LnRhZ05hbWUgPT09ICdQJykpIHtcclxuICAgICAgICBzb3VyY2VzLnB1c2gocHJldi50ZXh0Q29udGVudCB8fCAnJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50XHJcbiAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICBjb25zdCBuZWFyYnkgPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbCgnbGFiZWwsIHNwYW5bY2xhc3MqPVwibGFiZWxcIl0sIGRpdltjbGFzcyo9XCJsYWJlbFwiXSwgcCcpXHJcbiAgICAgICAgbmVhcmJ5LmZvckVhY2goZWwgPT4gc291cmNlcy5wdXNoKGVsLnRleHRDb250ZW50IHx8ICcnKSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgd3JhcHBlciA9IGVsZW1lbnQuY2xvc2VzdCgnZGl2LCBmaWVsZHNldCwgbGksIHNlY3Rpb24nKVxyXG4gICAgICBpZiAod3JhcHBlcikge1xyXG4gICAgICAgIGNvbnN0IHdyYXBwZXJMYWJlbCA9IHdyYXBwZXIucXVlcnlTZWxlY3RvcignbGFiZWwsIGxlZ2VuZCwgc3BhbltjbGFzcyo9XCJsYWJlbFwiXSwgZGl2W2NsYXNzKj1cImxhYmVsXCJdJylcclxuICAgICAgICBpZiAod3JhcHBlckxhYmVsKSBzb3VyY2VzLnB1c2god3JhcHBlckxhYmVsLnRleHRDb250ZW50IHx8ICcnKVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gc291cmNlcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpXHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG4gICAgZnVuY3Rpb24gZGV0ZWN0RmllbGRUeXBlKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnQpOiB7IHR5cGU6IHN0cmluZzsgY29uZmlkZW5jZTogbnVtYmVyIH0ge1xyXG4gICAgICBjb25zdCBpZCA9IGVsZW1lbnQuaWQ/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgbmFtZSA9IGVsZW1lbnQubmFtZT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBwbGFjZWhvbGRlciA9IChlbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnBsYWNlaG9sZGVyPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICAgIGNvbnN0IGFyaWFMYWJlbCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyk/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICAgICAgY29uc3QgZGF0YUF0dHIgPSAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZmllbGQnKSB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS10ZXN0aWQnKSB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jeScpIHx8ICcnKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgIGNvbnN0IGF1dG9jb21wbGV0ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhdXRvY29tcGxldGUnKT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgICBjb25zdCBsYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudClcclxuICAgICAgY29uc3QgY29tYmluZWQgPSBgJHtpZH0gJHtuYW1lfSAke3BsYWNlaG9sZGVyfSAke2FyaWFMYWJlbH0gJHtsYWJlbH0gJHtkYXRhQXR0cn0gJHthdXRvY29tcGxldGV9YFxyXG5cclxuICAgICAgY29uc3QgcGF0dGVybnMgPSBbXHJcbiAgICAgICAgXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydmdWxsbmFtZScsICdmdWxsLW5hbWUnLCAnZnVsbF9uYW1lJywgJ3lvdXJuYW1lJywgJ3lvdXItbmFtZScsICd5b3VyX25hbWUnLCAnYXBwbGljYW50bmFtZScsICdhcHBsaWNhbnQtbmFtZScsICdjYW5kaWRhdGVuYW1lJywgJ2NhbmRpZGF0ZS1uYW1lJ10sIHR5cGU6ICdmdWxsTmFtZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG5cclxuICAgICAgICBcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2ZpcnN0bmFtZScsICdmaXJzdC1uYW1lJywgJ2ZpcnN0X25hbWUnLCAnZm5hbWUnLCAnZ2l2ZW4tbmFtZScsICdnaXZlbm5hbWUnLCAnZm9yZW5hbWUnLCAnZmlyc3QgbmFtZScsICdnaXZlbiBuYW1lJ10sIHR5cGU6ICdmaXJzdE5hbWUnLCBjb25maWRlbmNlOiAwLjk1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydsYXN0bmFtZScsICdsYXN0LW5hbWUnLCAnbGFzdF9uYW1lJywgJ2xuYW1lJywgJ3N1cm5hbWUnLCAnZmFtaWx5LW5hbWUnLCAnZmFtaWx5bmFtZScsICdmYW1pbHkgbmFtZScsICdsYXN0IG5hbWUnXSwgdHlwZTogJ2xhc3ROYW1lJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG5cclxuICAgICAgICBcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VtYWlsJywgJ2UtbWFpbCcsICdlbWFpbGFkZHJlc3MnLCAnZW1haWwgYWRkcmVzcycsICdlbWFpbC1hZGRyZXNzJywgJ21haWwnXSwgdHlwZTogJ2VtYWlsJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncGhvbmUnLCAndGVsZXBob25lJywgJ21vYmlsZScsICdwaG9uZW51bWJlcicsICdwaG9uZS1udW1iZXInLCAncGhvbmUgbnVtYmVyJywgJ2NlbGwgcGhvbmUnLCAnY29udGFjdCBudW1iZXInLCAndGVsJ10sIHR5cGU6ICdwaG9uZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY291bnRyeWNvZGUnLCAnY291bnRyeS1jb2RlJywgJ2NvdW50cnlfY29kZScsICdkaWFsY29kZScsICdkaWFsLWNvZGUnLCAnZGlhbCBjb2RlJywgJ2NhbGxpbmcgY29kZScsICdpc2QnXSwgdHlwZTogJ2NvdW50cnlDb2RlJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydwaG9uZSB0eXBlJywgJ3Bob25ldHlwZScsICdudW1iZXIgdHlwZScsICd0eXBlIG9mIHBob25lJywgJ2NvbnRhY3QgdHlwZScsICdQaG9uZSBEZXZpY2UgVHlwZScsICdtb2JpbGUnXSwgdHlwZTogJ3Bob25lVHlwZScsIGNvbmZpZGVuY2U6IDAuODUgfSxcclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdHJlZXRhZGRyZXNzJywgJ2FkZHIxJywgJ21haWxpbmcgYWRkcmVzcycsICdzdHJlZXQtYWRkcmVzcycsICdhZGRyZXNzMScsICdhZGRyZXNzLWxpbmUtMScsICdhZGRyZXNzbGluZTEnLCAnYWRkcmVzcyBsaW5lIDEnLCAnYWRkcmVzcyBsaW5lMScsICdzdHJlZXQnLCAnYWRkcmVzcyddLCB0eXBlOiAnc3RyZWV0QWRkcmVzcycsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2NpdHknLCAndG93bicsICdzdWJ1cmInLCAnbXVuaWNpcGFsaXR5J10sIHR5cGU6ICdjaXR5JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd6aXBjb2RlJywgJ3ppcC1jb2RlJywgJ3ppcCcsICdwb3N0YWxjb2RlJywgJ3Bvc3RhbC1jb2RlJywgJ3Bvc3Rjb2RlJywgJ3Bvc3RhbCBjb2RlJ10sIHR5cGU6ICd6aXBDb2RlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhdGUnLCAncHJvdmluY2UnLCAncmVnaW9uJywgJ2NvdW50eSddLCB0eXBlOiAnc3RhdGUnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY291bnRyeScsICduYXRpb24nLCAnY291bnRyeSBvZiByZXNpZGVuY2UnLCAnY291bnRyeSBvZiBvcmlnaW4nLCAnY291bnRyeSBuYW1lJywgJ3doZXJlIGRvIHlvdSBsaXZlJywgJ3Jlc2lkZW50IG9mJywgJ2hvbWUgY291bnRyeScsICdjaXRpemVuc2hpcCcsICduYXRpb25hbGl0eScsICdsb2NhdGlvbiBjb3VudHJ5J10sIHR5cGU6ICdjb3VudHJ5JywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnbG9jYXRpb24nLCAncmVzaWRlbmNlJywgJ2Jhc2VkIGluJywgJ3doZXJlIGFyZSB5b3UgbG9jYXRlZCcsICdjdXJyZW50IGxvY2F0aW9uJywgJ3ByZWZlcnJlZCBsb2NhdGlvbicsICd3b3JrIGxvY2F0aW9uJ10sIHR5cGU6ICdsb2NhdGlvbicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd2hlcmUgZG8geW91IGxpdmUnLCAnY3VycmVudCByZXNpZGVuY2UnLCAnYmFzZWQgaW4nXSwgdHlwZTogJ3Jlc2lkZW5jZUNvdW50cnknLCBjb25maWRlbmNlOiAwLjkgfSxcclxuXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzdW1tYXJ5JywgJ3Byb2Zlc3Npb25hbCBzdW1tYXJ5JywgJ2Fib3V0IG1lJywgJ2Fib3V0IHlvdXJzZWxmJywgJ2JpbycsICdwcm9maWxlJywgJ29iamVjdGl2ZScsICdpbnRyb2R1Y3Rpb24nLCAnZGVzY3JpYmUgeW91cnNlbGYnLCAndGVsbCB1cyBhYm91dCB5b3Vyc2VsZicsICdwZXJzb25hbCBzdGF0ZW1lbnQnLCAnY292ZXIgbGV0dGVyJywgJ2NvdmVyaW5nIGxldHRlciddLCB0eXBlOiAncHJvZmVzc2lvbmFsU3VtbWFyeScsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NraWxsJywgJ3NraWxscycsICdleHBlcnRpc2UnLCAnY29tcGV0ZW5jaWVzJywgJ2NvbXBldGVuYycsICd0ZWNobm9sb2dpZXMnLCAndGVjaCBzdGFjaycsICd0b29scycsICd0ZWNobmljYWwgc2tpbGxzJywgJ2tleSBza2lsbHMnXSwgdHlwZTogJ3NraWxscycsIGNvbmZpZGVuY2U6IDAuNzUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2pvYnRpdGxlJywgJ2pvYi10aXRsZScsICdqb2IgdGl0bGUnLCAnY3VycmVudHRpdGxlJywgJ2N1cnJlbnQgdGl0bGUnLCAnY3VycmVudCBqb2IgdGl0bGUnLCAnZGVzaXJlZCB0aXRsZScsICdwb3NpdGlvbicsICdyb2xlJywgJ3lvdXIgdGl0bGUnXSwgdHlwZTogJ2pvYlRpdGxlJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnY29tcGFueScsICdlbXBsb3llcicsICdvcmdhbml6YXRpb24nLCAnb3JnYW5pc2F0aW9uJywgJ2N1cnJlbnQgY29tcGFueScsICdjdXJyZW50IGVtcGxveWVyJywgJ3dvcmtwbGFjZScsICdtb3N0IHJlY2VudCBlbXBsb3llciddLCB0eXBlOiAnY29tcGFueU5hbWUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgbW9udGgnLCAnc3RhcnRtb250aCcsICdzdGFydC1tb250aCcsICdmcm9tIG1vbnRoJywgJ2JlZ2lubmluZyBtb250aCddLCB0eXBlOiAnZXhwU3RhcnRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnc3RhcnQgeWVhcicsICdzdGFydHllYXInLCAnc3RhcnQteWVhcicsICdmcm9tIHllYXInLCAnYmVnaW5uaW5nIHllYXInLCAneWVhciBzdGFydGVkJ10sIHR5cGU6ICdleHBTdGFydFllYXInLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2VuZCBtb250aCcsICdlbmRtb250aCcsICdlbmQtbW9udGgnLCAndG8gbW9udGgnLCAnZmluaXNoIG1vbnRoJ10sIHR5cGU6ICdleHBFbmRNb250aCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5kIHllYXInLCAnZW5keWVhcicsICdlbmQteWVhcicsICd0byB5ZWFyJywgJ2ZpbmlzaCB5ZWFyJywgJ3llYXIgZW5kZWQnLCAneWVhciBmaW5pc2hlZCddLCB0eXBlOiAnZXhwRW5kWWVhcicsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG5cclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2hpZ2hlc3QgZWR1Y2F0aW9uJywgJ2xldmVsIG9mIGVkdWNhdGlvbicsICdlZHVjYXRpb24gbGV2ZWwnLCAnZGVncmVlIGxldmVsJywgJ2hpZ2hlc3QgZGVncmVlJ10sIHR5cGU6ICdoaWdoZXN0RWR1JywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydzY2hvb2wnLCAndW5pdmVyc2l0eScsICdjb2xsZWdlJywgJ2luc3RpdHV0aW9uJywgJ2FsbWEgbWF0ZXInLCAnc2Nob29sIG5hbWUnLCAnaW5zdGl0dXRpb24gbmFtZScsICd1bml2ZXJzaXR5IG5hbWUnXSwgdHlwZTogJ3NjaG9vbE5hbWUnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydkZWdyZWUnLCAnbWFqb3InLCAnZmllbGQgb2Ygc3R1ZHknLCAnZmllbGRvZnN0dWR5JywgJ2Rpc2NpcGxpbmUnLCAncXVhbGlmaWNhdGlvbicsICdjb3Vyc2Ugb2Ygc3R1ZHknLCAncHJvZ3JhbScsICdhcmVhIG9mIHN0dWR5J10sIHR5cGU6ICdmaWVsZE9mU3R1ZHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2dyYWR1YXRpb24geWVhcicsICdncmFkIHllYXInLCAneWVhciBvZiBncmFkdWF0aW9uJywgJ2NvbXBsZXRlZCB5ZWFyJywgJ3llYXIgY29tcGxldGVkJ10sIHR5cGU6ICdlZHVFbmRZZWFyJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZW5yb2xsbWVudCB5ZWFyJywgJ2Vucm9sbWVudCB5ZWFyJywgJ3llYXIgZW5yb2xsZWQnLCAnc3RhcnQgeWVhciBvZiBzdHVkeSddLCB0eXBlOiAnZWR1U3RhcnRZZWFyJywgY29uZmlkZW5jZTogMC44IH0sXHJcblxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncHJvamVjdCBuYW1lJywgJ3Byb2plY3RuYW1lJywgJ3Byb2plY3QgdGl0bGUnXSwgdHlwZTogJ3Byb2plY3ROYW1lJywgY29uZmlkZW5jZTogMC43NSB9LFxyXG5cclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2xpbmtlZGluJywgJ2xpbmtlZGluIHVybCcsICdsaW5rZWRpbiBwcm9maWxlJywgJ2xpbmtlZGluIGxpbmsnXSwgdHlwZTogJ2xpbmtlZGluJywgY29uZmlkZW5jZTogMC45NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnZ2l0aHViJywgJ2dpdGh1YiB1cmwnLCAnZ2l0aHViIHByb2ZpbGUnLCAnZ2l0aHViIGxpbmsnXSwgdHlwZTogJ2dpdGh1YicsIGNvbmZpZGVuY2U6IDAuOTUgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3dlYnNpdGUnLCAncGVyc29uYWwgd2Vic2l0ZScsICdwb3J0Zm9saW8gdXJsJywgJ3BvcnRmb2xpbyBsaW5rJywgJ3BlcnNvbmFsIHVybCcsICd5b3VyIHdlYnNpdGUnXSwgdHlwZTogJ3dlYnNpdGUnLCBjb25maWRlbmNlOiAwLjc1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydvdGhlcicsICdhZGRpdGlvbmFsJywgJ3N1cHBvcnRpbmcgZG9jdW1lbnQnLCAnYXR0YWNobWVudCddLCB0eXBlOiAnYWRkaXRpb25hbEZpbGUnLCBjb25maWRlbmNlOiAwLjcgfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3NhbGFyeScsICdleHBlY3RlZCBzYWxhcnknLCAnZGVzaXJlZCBzYWxhcnknLCAnY29tcGVuc2F0aW9uJywgJ2V4cGVjdGVkIGNvbXBlbnNhdGlvbicsICdzYWxhcnkgZXhwZWN0YXRpb24nXSwgdHlwZTogJ3NhbGFyeScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsneWVhcnMgb2YgZXhwZXJpZW5jZScsICdleHBlcmllbmNlIHllYXJzJywgJ2hvdyBtYW55IHllYXJzJywgJ3RvdGFsIGV4cGVyaWVuY2UnLCAneWVhcnMgZXhwZXJpZW5jZSddLCB0eXBlOiAneWVhcnNPZkV4cGVyaWVuY2UnLCBjb25maWRlbmNlOiAwLjg1IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWyd3b3JrIGF1dGhvcml6YXRpb24nLCAnd29yayBhdXRob3Jpc2F0aW9uJywgJ2F1dGhvcml6ZWQgdG8gd29yaycsICd2aXNhIHN0YXR1cycsICdyaWdodCB0byB3b3JrJywgJ3dvcmsgcGVybWl0JywgJ2VsaWdpYmxlIHRvIHdvcmsnXSwgdHlwZTogJ3dvcmtBdXRoJywgY29uZmlkZW5jZTogMC44NSB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsnd2lsbGluZyB0byByZWxvY2F0ZScsICdvcGVuIHRvIHJlbG9jYXRlJywgJ3JlbG9jYXRpb24nLCAncmVsb2NhdGUnXSwgdHlwZTogJ3JlbG9jYXRpb24nLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2dlbmRlcicsICdzZXgnXSwgdHlwZTogJ2dlbmRlcicsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICAgIHsga2V5d29yZHM6IFsncmFjZScsICdldGhuaWNpdHknLCAnZXRobmljJ10sIHR5cGU6ICdldGhuaWNpdHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ3ZldGVyYW4nLCAnbWlsaXRhcnknLCAnYXJtZWQgZm9yY2VzJ10sIHR5cGU6ICd2ZXRlcmFuJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICAgICAgeyBrZXl3b3JkczogWydkaXNhYmlsaXR5JywgJ2Rpc2FibGVkJywgJ2ltcGFpcm1lbnQnXSwgdHlwZTogJ2Rpc2FiaWxpdHknLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgICAgICB7IGtleXdvcmRzOiBbJ2hvdyBkaWQgeW91IGhlYXInLCAnaG93IGRpZCB5b3UgZmluZCcsICdyZWZlcnJhbCBzb3VyY2UnLCAnd2hlcmUgZGlkIHlvdSBoZWFyJ10sIHR5cGU6ICdyZWZlcnJhbFNvdXJjZScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgICBdXHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGtleXdvcmQgb2YgcGF0dGVybi5rZXl3b3Jkcykge1xyXG4gICAgICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKGtleXdvcmQpKSB7XHJcbiAgICAgICAgICAgIGlmIChrZXl3b3JkID09PSAnbmFtZScpIHtcclxuICAgICAgICAgICAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ2ZpcnN0JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2xhc3QnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZnVsbCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjb21wYW55JykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ3NjaG9vbCcpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdwcm9qZWN0JykpIGNvbnRpbnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogcGF0dGVybi50eXBlLCBjb25maWRlbmNlOiBwYXR0ZXJuLmNvbmZpZGVuY2UgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKC9cXGJuYW1lXFxiLy50ZXN0KGNvbWJpbmVkKSkge1xyXG4gICAgICAgIGlmICghY29tYmluZWQuaW5jbHVkZXMoJ2ZpcnN0JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdsYXN0JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdjb21wYW55JykgJiYgIWNvbWJpbmVkLmluY2x1ZGVzKCdzY2hvb2wnKSAmJiAhY29tYmluZWQuaW5jbHVkZXMoJ2ZpbGUnKSkge1xyXG4gICAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2Z1bGxOYW1lJywgY29uZmlkZW5jZTogMC43IH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7IHR5cGU6ICd1bmtub3duJywgY29uZmlkZW5jZTogMCB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0QWxsRm9ybUZpZWxkcygpOiBGaWVsZE1hcHBpbmdbXSB7XHJcbiAgICAgIGNvbnN0IGZpZWxkczogRmllbGRNYXBwaW5nW10gPSBbXVxyXG4gICAgICBjb25zdCBpbnB1dHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxyXG4gICAgICAgICdpbnB1dDpub3QoW3R5cGU9XCJzdWJtaXRcIl0pOm5vdChbdHlwZT1cImJ1dHRvblwiXSk6bm90KFt0eXBlPVwiaGlkZGVuXCJdKTpub3QoW3R5cGU9XCJmaWxlXCJdKTpub3QoW3R5cGU9XCJpbWFnZVwiXSk6bm90KFt0eXBlPVwicmVzZXRcIl0pLCB0ZXh0YXJlYSwgc2VsZWN0J1xyXG4gICAgICApXHJcblxyXG4gICAgICBpbnB1dHMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICEoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQpICYmXHJcbiAgICAgICAgICAhKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVGV4dEFyZWFFbGVtZW50KSAmJlxyXG4gICAgICAgICAgIShlbGVtZW50IGluc3RhbmNlb2YgSFRNTFNlbGVjdEVsZW1lbnQpXHJcbiAgICAgICAgKSByZXR1cm5cclxuXHJcbiAgICAgICAgY29uc3QgeyB0eXBlLCBjb25maWRlbmNlIH0gPSBkZXRlY3RGaWVsZFR5cGUoZWxlbWVudClcclxuICAgICAgICBpZiAoY29uZmlkZW5jZSA+IDAuNSkge1xyXG4gICAgICAgICAgZmllbGRzLnB1c2goeyBlbGVtZW50LCB0eXBlLCBjb25maWRlbmNlIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIGZpZWxkc1xyXG4gICAgfVxyXG5cclxuXHJcbiBmdW5jdGlvbiBmaWxsRmllbGQoZWxlbWVudDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQsIHZhbHVlOiBzdHJpbmcpIHtcclxuICBpZiAoIXZhbHVlKSByZXR1cm47XHJcblxyXG4gIGVsZW1lbnQuZm9jdXMoKTtcclxuXHJcbiBcclxuICBjb25zdCBuYXRpdmVJbnB1dFZhbHVlU2V0dGVyID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihcclxuICAgIHdpbmRvdy5IVE1MSW5wdXRFbGVtZW50LnByb3RvdHlwZSxcclxuICAgICd2YWx1ZSdcclxuICApPy5zZXQ7XHJcbiAgY29uc3QgbmF0aXZlVGV4dEFyZWFWYWx1ZVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoXHJcbiAgICB3aW5kb3cuSFRNTFRleHRBcmVhRWxlbWVudC5wcm90b3R5cGUsXHJcbiAgICAndmFsdWUnXHJcbiAgKT8uc2V0O1xyXG5cclxuICBjb25zdCBzZXR0ZXIgPSBlbGVtZW50IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCA/IG5hdGl2ZUlucHV0VmFsdWVTZXR0ZXIgOiBuYXRpdmVUZXh0QXJlYVZhbHVlU2V0dGVyO1xyXG5cclxuICBpZiAoc2V0dGVyKSB7XHJcbiAgICBzZXR0ZXIuY2FsbChlbGVtZW50LCB2YWx1ZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGVsZW1lbnQudmFsdWUgPSB2YWx1ZTtcclxuICB9XHJcblxyXG4gIFxyXG4gIGNvbnN0IGV2ZW50T3B0aW9ucyA9IHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgY29tcG9zZWQ6IHRydWUgfTtcclxuICBcclxuICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdpbnB1dCcsIGV2ZW50T3B0aW9ucykpO1xyXG4gIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIGV2ZW50T3B0aW9ucykpO1xyXG4gIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgS2V5Ym9hcmRFdmVudCgna2V5ZG93bicsIHsgLi4uZXZlbnRPcHRpb25zLCBrZXk6ICdFbnRlcicgfSkpO1xyXG4gIFxyXG4gIFxyXG4gIGVsZW1lbnQuYmx1cigpO1xyXG59XHJcblxyXG4gICAgXHJcbmZ1bmN0aW9uIGZpbGxEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICghdmFsdWUpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgY29uc3Qgbm9ybWFsaXplZCA9IHZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xyXG4gIGNvbnN0IG9wdGlvbnMgPSBBcnJheS5mcm9tKGVsZW1lbnQub3B0aW9ucyk7XHJcblxyXG4gXHJcbiAgbGV0IG1hdGNoID0gb3B0aW9ucy5maW5kKG9wdCA9PiBcclxuICAgIG9wdC50ZXh0LnRvTG93ZXJDYXNlKCkudHJpbSgpID09PSBub3JtYWxpemVkIHx8IFxyXG4gICAgb3B0LnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpID09PSBub3JtYWxpemVkXHJcbiAgKTtcclxuXHJcbiAgaWYgKCFtYXRjaCkge1xyXG4gICAgbWF0Y2ggPSBvcHRpb25zLmZpbmQob3B0ID0+IHtcclxuICAgICAgY29uc3QgdCA9IG9wdC50ZXh0LnRvTG93ZXJDYXNlKCkudHJpbSgpO1xyXG4gICAgICByZXR1cm4gdC5sZW5ndGggPiAxICYmIChub3JtYWxpemVkLmluY2x1ZGVzKHQpIHx8IHQuaW5jbHVkZXMobm9ybWFsaXplZCkpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZiAoIW1hdGNoICYmIG5vcm1hbGl6ZWQubGVuZ3RoID4gMykge1xyXG4gICAgbWF0Y2ggPSBvcHRpb25zLmZpbmQob3B0ID0+IFxyXG4gICAgICBvcHQudGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKS5zdGFydHNXaXRoKG5vcm1hbGl6ZWQuc3Vic3RyaW5nKDAsIDMpKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGlmIChtYXRjaCkge1xyXG4gICAgZWxlbWVudC52YWx1ZSA9IG1hdGNoLnZhbHVlO1xyXG4gICAgY29uc3QgZXZlbnRPcHRpb25zID0geyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH07XHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCBldmVudE9wdGlvbnMpKTtcclxuICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgZXZlbnRPcHRpb25zKSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5mdW5jdGlvbiBmaWxsRWR1Y2F0aW9uRHJvcGRvd24oZWxlbWVudDogSFRNTFNlbGVjdEVsZW1lbnQsIHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgY29uc3Qgb3B0aW9ucyA9IEFycmF5LmZyb20oZWxlbWVudC5vcHRpb25zKTtcclxuICBjb25zdCB2YWwgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuIFxyXG4gIGNvbnN0IG1hdGNoID0gb3B0aW9ucy5maW5kKG9wdCA9PiB7XHJcbiAgICBjb25zdCB0ZXh0ID0gb3B0LnRleHQudG9Mb3dlckNhc2UoKTtcclxuICAgIHJldHVybiB0ZXh0LmluY2x1ZGVzKHZhbCkgfHwgXHJcbiAgICAgICAgICAgKHZhbC5pbmNsdWRlcygnYmFjaGVsb3InKSAmJiB0ZXh0LmluY2x1ZGVzKCdiYWNoZWxvcicpKSB8fFxyXG4gICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ21hc3RlcicpICYmIHRleHQuaW5jbHVkZXMoJ21hc3RlcicpKSB8fFxyXG4gICAgICAgICAgICh2YWwuaW5jbHVkZXMoJ3BoZCcpICYmIHRleHQuaW5jbHVkZXMoJ2RvY3RvcmF0ZScpKTtcclxuICB9KTtcclxuXHJcbiAgaWYgKG1hdGNoKSB7XHJcbiAgICBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7XHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmlsbEV4cGVyaWVuY2VEcm9wZG93bihlbGVtZW50OiBIVE1MU2VsZWN0RWxlbWVudCwgeWVhcnM6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGlmICgheWVhcnMpIHJldHVybiBmYWxzZTtcclxuICBjb25zdCBvcHRpb25zID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpO1xyXG4gIGNvbnN0IG51bVllYXJzID0gcGFyc2VJbnQoeWVhcnMpO1xyXG5cclxuICBjb25zdCBtYXRjaCA9IG9wdGlvbnMuZmluZChvcHQgPT4ge1xyXG4gICAgY29uc3QgdGV4dCA9IG9wdC50ZXh0LnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAodGV4dC5pbmNsdWRlcyh5ZWFycykpIHJldHVybiB0cnVlO1xyXG4gICAgXHJcbiAgICBcclxuICAgIGNvbnN0IG51bWJlcnMgPSB0ZXh0Lm1hdGNoKC9cXGQrL2cpO1xyXG4gICAgaWYgKG51bWJlcnMpIHtcclxuICAgICAgY29uc3QgZmlyc3QgPSBwYXJzZUludChudW1iZXJzWzBdKTtcclxuICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAxICYmIHRleHQuaW5jbHVkZXMoJysnKSAmJiBudW1ZZWFycyA+PSBmaXJzdCkgcmV0dXJuIHRydWU7XHJcbiAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgIGNvbnN0IHNlY29uZCA9IHBhcnNlSW50KG51bWJlcnNbMV0pO1xyXG4gICAgICAgIHJldHVybiBudW1ZZWFycyA+PSBmaXJzdCAmJiBudW1ZZWFycyA8PSBzZWNvbmQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9KTtcclxuXHJcbiAgaWYgKG1hdGNoKSB7XHJcbiAgICBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWU7XHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxNb250aERyb3Bkb3duKGVsZW1lbnQ6IEhUTUxTZWxlY3RFbGVtZW50LCBtb250aFZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgaWYgKCFtb250aFZhbHVlKSByZXR1cm4gZmFsc2VcclxuICAgICAgY29uc3QgbW9udGhOYW1lID0gTU9OVEhTW21vbnRoVmFsdWVdIHx8IG1vbnRoVmFsdWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICBjb25zdCBtb250aE51bSA9IG1vbnRoVmFsdWUucGFkU3RhcnQoMiwgJzAnKVxyXG4gICAgICBjb25zdCBvcHRpb25zID0gQXJyYXkuZnJvbShlbGVtZW50Lm9wdGlvbnMpXHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IG9wdGlvbnMuZmluZChvcHQgPT4ge1xyXG4gICAgICAgIGNvbnN0IHQgPSBvcHQudGV4dC50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICAgIGNvbnN0IHYgPSBvcHQudmFsdWUudG9Mb3dlckNhc2UoKS50cmltKClcclxuICAgICAgICByZXR1cm4gdCA9PT0gbW9udGhOYW1lIHx8IHYgPT09IG1vbnRoVmFsdWUgfHwgdiA9PT0gbW9udGhOdW0gfHwgdC5zdGFydHNXaXRoKG1vbnRoTmFtZS5zdWJzdHJpbmcoMCwgMykpXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICBlbGVtZW50LnZhbHVlID0gbWF0Y2gudmFsdWVcclxuICAgICAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgIFxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxSYWRpb0dyb3VwKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZykge1xyXG4gICAgICBpZiAoIW5hbWUgfHwgIXZhbHVlKSByZXR1cm5cclxuICAgICAgY29uc3QgcmFkaW9zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MSW5wdXRFbGVtZW50PihgaW5wdXRbdHlwZT1cInJhZGlvXCJdW25hbWU9XCIke25hbWV9XCJdYClcclxuICAgICAgaWYgKCFyYWRpb3MubGVuZ3RoKSByZXR1cm5cclxuXHJcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICBsZXQgbWF0Y2hlZDogSFRNTElucHV0RWxlbWVudCB8IHVuZGVmaW5lZFxyXG5cclxuICAgICAgcmFkaW9zLmZvckVhY2gocmFkaW8gPT4ge1xyXG4gICAgICAgIGNvbnN0IHJhZGlvTGFiZWwgPSBmaW5kTGFiZWxGb3JFbGVtZW50KHJhZGlvKS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgY29uc3QgcmFkaW9WYWwgPSByYWRpby52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKVxyXG4gICAgICAgIGlmIChyYWRpb1ZhbCA9PT0gbm9ybWFsaXplZCB8fCByYWRpb0xhYmVsLmluY2x1ZGVzKG5vcm1hbGl6ZWQpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMocmFkaW9WYWwpKSB7XHJcbiAgICAgICAgICBtYXRjaGVkID0gcmFkaW9cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBpZiAobWF0Y2hlZCkge1xyXG4gICAgICAgIG1hdGNoZWQuY2hlY2tlZCA9IHRydWVcclxuICAgICAgICBtYXRjaGVkLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgICAgbWF0Y2hlZC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2xpY2snLCB7IGJ1YmJsZXM6IHRydWUgfSkpXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBoYW5kbGVSYWRpb0J1dHRvbnMocmVzdW1lRGF0YTogUmVzdW1lRGF0YSkge1xyXG4gICAgICBjb25zdCByYWRpb0dyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcclxuXHJcbiAgICAgIFxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5mb3JFYWNoKHJhZGlvID0+IHtcclxuICAgICAgICBpZiAocmFkaW8ubmFtZSAmJiAhcmFkaW9Hcm91cHMuaGFzKHJhZGlvLm5hbWUpKSB7XHJcbiAgICAgICAgICBjb25zdCBncm91cExhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChyYWRpbykudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgY29uc3QgZ3JvdXBOYW1lID0gcmFkaW8ubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBjb25zdCBjb21iaW5lZCA9IGAke2dyb3VwTGFiZWx9ICR7Z3JvdXBOYW1lfWBcclxuXHJcbiAgICAgICAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ3Bob25lIHR5cGUnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygndHlwZSBvZiBwaG9uZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjb250YWN0IHR5cGUnKSkge1xyXG4gICAgICAgICAgICByYWRpb0dyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ2hvbWUnKVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnd29yayBhdXRoJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2F1dGhvcml6ZWQnKSB8fCBjb21iaW5lZC5pbmNsdWRlcygnZWxpZ2libGUnKSkge1xyXG4gICAgICAgICAgICByYWRpb0dyb3Vwcy5zZXQocmFkaW8ubmFtZSwgJ3llcycpXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKCdyZWxvY2F0JykpIHtcclxuICAgICAgICAgICAgcmFkaW9Hcm91cHMuc2V0KHJhZGlvLm5hbWUsICd5ZXMnKVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZ2VuZGVyJykpIHtcclxuICAgICAgICAgICAgLy8gZG9uJ3QgYXV0by1maWxsIGdlbmRlclxyXG4gICAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygndmV0ZXJhbicpKSB7XHJcbiAgICAgICAgICAgIHJhZGlvR3JvdXBzLnNldChyYWRpby5uYW1lLCAnbm8nKVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChjb21iaW5lZC5pbmNsdWRlcygnZGlzYWJpbGl0eScpKSB7XHJcbiAgICAgICAgICAgIHJhZGlvR3JvdXBzLnNldChyYWRpby5uYW1lLCAnbm8nKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIHJhZGlvR3JvdXBzLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiBmaWxsUmFkaW9Hcm91cChuYW1lLCB2YWx1ZSkpXHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hBbmRVcGxvYWRGaWxlKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQsIGVuZHBvaW50OiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3Qgc3RvcmVkID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsnYXV0aF90b2tlbicsICdhcGlfdXJsJ10pO1xyXG4gICAgY29uc3QgdG9rZW4gPSBzdG9yZWQuYXV0aF90b2tlbjtcclxuICAgIGNvbnN0IEFQSV9VUkwgPSBzdG9yZWQuYXBpX3VybDtcclxuXHJcbiAgICBpZiAoIXRva2VuIHx8ICFBUElfVVJMKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IGFueSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgYWN0aW9uOiAncHJveHlGZXRjaEZpbGUnLFxyXG4gICAgICB1cmw6IGAke0FQSV9VUkx9JHtlbmRwb2ludH1gLFxyXG4gICAgICB0b2tlbjogdG9rZW5cclxuICAgIH0pO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnN1Y2Nlc3MpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChyZXNwb25zZS5iYXNlNjQpO1xyXG4gICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlcy5ibG9iKCk7XHJcbiAgICBjb25zdCBmaWxlID0gbmV3IEZpbGUoW2Jsb2JdLCBmaWxlTmFtZSwgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KTtcclxuXHJcbiAgICBjb25zdCBkYXRhVHJhbnNmZXIgPSBuZXcgRGF0YVRyYW5zZmVyKCk7XHJcbiAgICBkYXRhVHJhbnNmZXIuaXRlbXMuYWRkKGZpbGUpO1xyXG4gICAgZWxlbWVudC5maWxlcyA9IGRhdGFUcmFuc2Zlci5maWxlcztcclxuXHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdjaGFuZ2UnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnaW5wdXQnLCB7IGJ1YmJsZXM6IHRydWUgfSkpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoYFtSQUVdIEZpbGUgdXBsb2FkIGVycm9yOmAsIGVycm9yKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQWxsRmlsZUlucHV0cyhjdkF2YWlsYWJsZTogYm9vbGVhbikge1xyXG4gIGNvbnN0IGZpbGVJbnB1dHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTElucHV0RWxlbWVudD4oJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykpO1xyXG4gIFxyXG4gIGxldCByZXN1bWVVcGxvYWRlZCA9IGZhbHNlO1xyXG4gIGxldCBjb3ZlckxldHRlclVwbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gIGZvciAoY29uc3QgZmlsZUlucHV0IG9mIGZpbGVJbnB1dHMpIHtcclxuICAgIGNvbnN0IGxhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChmaWxlSW5wdXQpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCBpZCA9IGZpbGVJbnB1dC5pZD8udG9Mb3dlckNhc2UoKSB8fCAnJztcclxuICAgIGNvbnN0IG5hbWUgPSBmaWxlSW5wdXQubmFtZT8udG9Mb3dlckNhc2UoKSB8fCAnJztcclxuICAgIGNvbnN0IGNvbWJpbmVkID0gYCR7bGFiZWx9ICR7aWR9ICR7bmFtZX1gO1xyXG5cclxuICAgIGNvbnN0IGlzUmVzdW1lID0gY29tYmluZWQuaW5jbHVkZXMoJ3Jlc3VtZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjdicpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjdXJyaWN1bHVtJyk7XHJcbiAgICBjb25zdCBpc0NvdmVyTGV0dGVyID0gY29tYmluZWQuaW5jbHVkZXMoJ2NvdmVyJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2xldHRlcicpO1xyXG5cclxuICAgIGlmIChpc1Jlc3VtZSkge1xyXG4gICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgZmV0Y2hBbmRVcGxvYWRGaWxlKGZpbGVJbnB1dCwgJy9hcGkvcmVzdW1lL3ZpZXcnLCAncmVzdW1lLnBkZicpO1xyXG4gICAgICBpZiAoc3VjY2VzcykgcmVzdW1lVXBsb2FkZWQgPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmIChpc0NvdmVyTGV0dGVyICYmIGN2QXZhaWxhYmxlKSB7XHJcbiAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBmZXRjaEFuZFVwbG9hZEZpbGUoZmlsZUlucHV0LCAnL2FwaS9jdi92aWV3JywgJ2NvdmVyLWxldHRlci5wZGYnKTtcclxuICAgICAgaWYgKHN1Y2Nlc3MpIGNvdmVyTGV0dGVyVXBsb2FkZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiBcclxuICBpZiAoY3ZBdmFpbGFibGUgJiYgcmVzdW1lVXBsb2FkZWQgJiYgIWNvdmVyTGV0dGVyVXBsb2FkZWQpIHtcclxuICAgIGZvciAoY29uc3QgZmlsZUlucHV0IG9mIGZpbGVJbnB1dHMpIHtcclxuICAgICAgaWYgKGZpbGVJbnB1dC5maWxlcyAmJiBmaWxlSW5wdXQuZmlsZXMubGVuZ3RoID4gMCkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBsYWJlbCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZmlsZUlucHV0KS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICBjb25zdCBpZCA9IGZpbGVJbnB1dC5pZD8udG9Mb3dlckNhc2UoKSB8fCAnJztcclxuICAgICAgY29uc3QgbmFtZSA9IGZpbGVJbnB1dC5uYW1lPy50b0xvd2VyQ2FzZSgpIHx8ICcnO1xyXG4gICAgICBjb25zdCBjb21iaW5lZCA9IGAke2xhYmVsfSAke2lkfSAke25hbWV9YDtcclxuXHJcbiAgICAgIGNvbnN0IGlzR2VuZXJpY0ZpZWxkID0gY29tYmluZWQuaW5jbHVkZXMoJ290aGVyJykgfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tYmluZWQuaW5jbHVkZXMoJ2FkZGl0aW9uYWwnKSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21iaW5lZC5pbmNsdWRlcygnc3VwcG9ydGluZycpIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbWJpbmVkLmluY2x1ZGVzKCdhdHRhY2htZW50JykgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21iaW5lZC5pbmNsdWRlcygncG9ydGZvbGlvJyk7XHJcblxyXG4gICAgICBpZiAoaXNHZW5lcmljRmllbGQpIHtcclxuICAgICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgZmV0Y2hBbmRVcGxvYWRGaWxlKGZpbGVJbnB1dCwgJy9hcGkvY3YvdmlldycsICdjb3Zlci1sZXR0ZXIucGRmJyk7XHJcbiAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcclxuICAgICAgICAgIGNvdmVyTGV0dGVyVXBsb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgYnJlYWs7IFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuICAgIFxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGF1dG9maWxsRm9ybShyZXN1bWVEYXRhOiBSZXN1bWVEYXRhLCBjdkF2YWlsYWJsZTogYm9vbGVhbikge1xyXG4gIGNvbnN0IGZpZWxkcyA9IGdldEFsbEZvcm1GaWVsZHMoKTtcclxuICBsZXQgZmlsbGVkQ291bnQgPSAwO1xyXG5cclxuICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtyZXN1bWVEYXRhLmZpcnN0TmFtZX0gJHtyZXN1bWVEYXRhLmxhc3ROYW1lfWAudHJpbSgpXHJcbiAgICAgIGNvbnN0IGxhdGVzdEV4cCA9IHJlc3VtZURhdGEuZXhwZXJpZW5jZT8uWzBdXHJcbiAgICAgIGNvbnN0IGxhdGVzdEVkdSA9IHJlc3VtZURhdGEuZWR1Y2F0aW9uPy5bMF1cclxuICAgICAgY29uc3QgbGF0ZXN0UHJvamVjdCA9IHJlc3VtZURhdGEucHJvamVjdHM/LlswXVxyXG5cclxuICAgICAgY29uc3QgbG9jYXRpb25TdHIgPSByZXN1bWVEYXRhLmxvY2F0aW9uIHx8XHJcbiAgICAgICAgW3Jlc3VtZURhdGEuY2l0eSwgcmVzdW1lRGF0YS5jb3VudHJ5XS5maWx0ZXIoQm9vbGVhbikuam9pbignLCAnKVxyXG5cclxuICAgICAgY29uc3QgdG90YWxFeHBZZWFycyA9ICgoKSA9PiB7XHJcbiAgbGV0IHRvdGFsTW9udGhzID0gMDtcclxuICByZXN1bWVEYXRhLmV4cGVyaWVuY2U/LmZvckVhY2goZXhwID0+IHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gcGFyc2VJbnQoZXhwLnN0YXJ0WWVhcikgKiAxMiArIChwYXJzZUludChleHAuc3RhcnRNb250aCkgfHwgMSk7XHJcbiAgICBcclxuICAgIFxyXG4gICAgY29uc3QgaXNQcmVzZW50ID0gIWV4cC5lbmRZZWFyIHx8IGV4cC5lbmRZZWFyLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3ByZXNlbnQnKTtcclxuICAgIGNvbnN0IGVuZFllYXIgPSBpc1ByZXNlbnQgPyBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkgOiBwYXJzZUludChleHAuZW5kWWVhcik7XHJcbiAgICBjb25zdCBlbmRNb250aCA9IGlzUHJlc2VudCA/IG5ldyBEYXRlKCkuZ2V0TW9udGgoKSArIDEgOiAocGFyc2VJbnQoZXhwLmVuZE1vbnRoKSB8fCAxKTtcclxuICAgIFxyXG4gICAgY29uc3QgZW5kID0gZW5kWWVhciAqIDEyICsgZW5kTW9udGg7XHJcbiAgICBpZiAoIWlzTmFOKGVuZCAtIHN0YXJ0KSkgdG90YWxNb250aHMgKz0gKGVuZCAtIHN0YXJ0KTtcclxuICB9KTtcclxuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih0b3RhbE1vbnRocyAvIDEyKSkudG9TdHJpbmcoKTtcclxufSkoKTtcclxuXHJcbiAgICAgIGNvbnN0IHZhbHVlTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgIGZ1bGxOYW1lOiAgICAgICAgICAgICBmdWxsTmFtZSxcclxuICAgICAgICBmaXJzdE5hbWU6ICAgICAgICAgICAgcmVzdW1lRGF0YS5maXJzdE5hbWUsXHJcbiAgICAgICAgbGFzdE5hbWU6ICAgICAgICAgICAgIHJlc3VtZURhdGEubGFzdE5hbWUsXHJcbiAgICAgICAgZW1haWw6ICAgICAgICAgICAgICAgIHJlc3VtZURhdGEuZW1haWwsXHJcbiAgICAgICAgcGhvbmU6ICAgICAgICAgICAgICAgIHJlc3VtZURhdGEucGhvbmUsXHJcbiAgICAgICAgY291bnRyeUNvZGU6ICAgICAgICAgIHJlc3VtZURhdGEuY291bnRyeUNvZGUgfHwgJycsXHJcbiAgICAgICAgcGhvbmVOdW1iZXI6ICAgICAgICAgIHJlc3VtZURhdGEucGhvbmVOdW1iZXIgfHwgcmVzdW1lRGF0YS5waG9uZSxcclxuICAgICAgICBwaG9uZVR5cGU6ICAgICAgICAgICAgJ0hvbWUnLFxyXG4gICAgICAgIHN0cmVldEFkZHJlc3M6ICAgICAgICByZXN1bWVEYXRhLnN0cmVldEFkZHJlc3MsXHJcbiAgICAgICAgY2l0eTogICAgICAgICAgICAgICAgIHJlc3VtZURhdGEuY2l0eSxcclxuICAgICAgICBhZGRyZXNzTGluZTE6IHJlc3VtZURhdGEuc3RyZWV0QWRkcmVzcyxcclxuICAgICAgICB6aXBDb2RlOiAgICAgICAgICAgICAgJycsXHJcbiAgICAgICAgc3RhdGU6ICAgICAgICAgICAgICAgICcnLFxyXG4gICAgICAgIGNvdW50cnk6ICAgICAgICAgICAgICByZXN1bWVEYXRhLmNvdW50cnksXHJcbiAgICAgICAgcmVzaWRlbmNlQ291bnRyeTogcmVzdW1lRGF0YS5jb3VudHJ5LFxyXG4gICAgICAgIGxvY2F0aW9uOiBgJHtyZXN1bWVEYXRhLmNpdHl9LCAke3Jlc3VtZURhdGEuY291bnRyeX1gLFxyXG4gICAgICAgIHByb2Zlc3Npb25hbFN1bW1hcnk6ICByZXN1bWVEYXRhLnByb2Zlc3Npb25hbFN1bW1hcnksXHJcbiAgICAgICAgc2tpbGxzOiAgICAgICAgICAgICAgIEFycmF5LmlzQXJyYXkocmVzdW1lRGF0YS5za2lsbHMpID8gcmVzdW1lRGF0YS5za2lsbHMuam9pbignLCAnKSA6ICcnLFxyXG4gICAgICAgIGpvYlRpdGxlOiAgICAgICAgICAgICBsYXRlc3RFeHA/LmpvYlRpdGxlIHx8ICcnLFxyXG4gICAgICAgIGNvbXBhbnlOYW1lOiAgICAgICAgICBsYXRlc3RFeHA/LmNvbXBhbnlOYW1lIHx8ICcnLFxyXG4gICAgICAgIGV4cFN0YXJ0TW9udGg6ICAgICAgICBsYXRlc3RFeHA/LnN0YXJ0TW9udGggfHwgJycsXHJcbiAgICAgICAgZXhwU3RhcnRZZWFyOiAgICAgICAgIGxhdGVzdEV4cD8uc3RhcnRZZWFyIHx8ICcnLFxyXG4gICAgICAgIGV4cEVuZE1vbnRoOiAgICAgICAgICBsYXRlc3RFeHA/LmVuZE1vbnRoIHx8ICcnLFxyXG4gICAgICAgIGV4cEVuZFllYXI6ICAgICAgICAgICBsYXRlc3RFeHA/LmVuZFllYXIgfHwgJycsXHJcbiAgICAgICAgc2Nob29sTmFtZTogICAgICAgICAgIGxhdGVzdEVkdT8uc2Nob29sTmFtZSB8fCAnJyxcclxuICAgICAgICBmaWVsZE9mU3R1ZHk6ICAgICAgICAgbGF0ZXN0RWR1Py5maWVsZE9mU3R1ZHkgfHwgJycsXHJcbiAgICAgICAgZWR1U3RhcnRZZWFyOiAgICAgICAgIGxhdGVzdEVkdT8uc3RhcnRZZWFyIHx8ICcnLFxyXG4gICAgICAgIGVkdUVuZFllYXI6ICAgICAgICAgICBsYXRlc3RFZHU/LmVuZFllYXIgfHwgJycsXHJcbiAgICAgICAgaGlnaGVzdEVkdTogbGF0ZXN0RWR1Py5maWVsZE9mU3R1ZHkgfHwgJycsIFxyXG4gICAgICAgIHllYXJzT2ZFeHBlcmllbmNlOiB0b3RhbEV4cFllYXJzLFxyXG4gICAgICAgIHByb2plY3ROYW1lOiAgICAgICAgICBsYXRlc3RQcm9qZWN0Py5wcm9qZWN0TmFtZSB8fCAnJyxcclxuICAgICAgICBsaW5rZWRpbjogICAgICAgICAgICAgcmVzdW1lRGF0YS5saW5rZWRpbiB8fCAnJyxcclxuICAgICAgICBnaXRodWI6ICAgICAgICAgICAgICAgcmVzdW1lRGF0YS5naXRodWIgfHwgJycsXHJcbiAgICAgICAgd2Vic2l0ZTogICAgICAgICAgICAgIHJlc3VtZURhdGEucG9ydGZvbGlvIHx8IGxhdGVzdFByb2plY3Q/LmxpbmsgfHwgJycsXHJcbiAgICAgICAgc2FsYXJ5OiAgICAgICAgICAgICAgICcnLFxyXG4gICAgICAgIHdvcmtBdXRoOiAgICAgICAgICAgICAnWWVzJyxcclxuICAgICAgICByZWxvY2F0aW9uOiAgICAgICAgICAgJ1llcycsXHJcbiAgICAgICAgcmVmZXJyYWxTb3VyY2U6ICAgICAgICcnLFxyXG4gICAgICAgIGdlbmRlcjogICAgICAgICAgICAgICAnJyxcclxuICAgICAgICBldGhuaWNpdHk6ICAgICAgICAgICAgJycsXHJcbiAgICAgICAgdmV0ZXJhbjogICAgICAgICAgICAgICdObycsXHJcbiAgICAgICAgZGlzYWJpbGl0eTogICAgICAgICAgICdObycsXHJcbiAgICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHsgZWxlbWVudCwgdHlwZSB9IG9mIGZpZWxkcykge1xyXG4gIGxldCB2YWx1ZSA9IHZhbHVlTWFwW3R5cGVdO1xyXG5cclxuIFxyXG4gIGNvbnN0IGxhYmVsVGV4dCA9IGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudCkudG9Mb3dlckNhc2UoKTtcclxuICBpZiAobGFiZWxUZXh0ID09PSAnbG9jYXRpb24nIHx8IGxhYmVsVGV4dCA9PT0gJ3lvdXIgbG9jYXRpb24nKSB7XHJcbiAgICB2YWx1ZSA9IHZhbHVlTWFwWydsb2NhdGlvbiddOyBcclxuICB9XHJcblxyXG5cclxuICBpZiAodHlwZSA9PT0gJ2NpdHknICYmIGxhYmVsVGV4dC5pbmNsdWRlcygnYWRkcmVzcycpKSB7XHJcbiAgICB2YWx1ZSA9IHZhbHVlTWFwWydzdHJlZXRBZGRyZXNzJ107XHJcbiAgfVxyXG5cclxuIFxyXG5cclxuICBpZiAoIXZhbHVlKSBjb250aW51ZTtcclxuXHJcbiAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50IHx8IGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVGV4dEFyZWFFbGVtZW50KSB7XHJcbiAgIFxyXG4gICAgZmlsbEZpZWxkKGVsZW1lbnQsIHZhbHVlKTtcclxuICAgIGZpbGxlZENvdW50Kys7XHJcbiAgfSBlbHNlIGlmIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTFNlbGVjdEVsZW1lbnQpIHtcclxuICAgIFxyXG4gICAgXHJcbiAgICBsZXQgc3VjY2VzcyA9IGZhbHNlO1xyXG4gICBcclxuICAgIGlmICh0eXBlID09PSAnaGlnaGVzdEVkdScpIHtcclxuICAgICAgc3VjY2VzcyA9IGZpbGxFZHVjYXRpb25Ecm9wZG93bihlbGVtZW50LCB2YWx1ZSk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd5ZWFyc09mRXhwZXJpZW5jZScpIHtcclxuICAgICAgc3VjY2VzcyA9IGZpbGxFeHBlcmllbmNlRHJvcGRvd24oZWxlbWVudCwgdmFsdWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc3VjY2VzcyA9IGZpbGxEcm9wZG93bihlbGVtZW50LCB2YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmIChzdWNjZXNzKSBmaWxsZWRDb3VudCsrO1xyXG4gIH1cclxufVxyXG5cclxuICBcclxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XHJcblxyXG4gIFxyXG4gIGhhbmRsZVJhZGlvQnV0dG9ucyhyZXN1bWVEYXRhKTtcclxuICBhd2FpdCBoYW5kbGVBbGxGaWxlSW5wdXRzKGN2QXZhaWxhYmxlKTtcclxuXHJcbiAgcmV0dXJuIGZpbGxlZENvdW50O1xyXG59XHJcblxyXG4gICAgXHJcblxyXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdhdXRvZmlsbCcpIHtcclxuICAgICAgICBhdXRvZmlsbEZvcm0obWVzc2FnZS5yZXN1bWVEYXRhLCBtZXNzYWdlLmN2QXZhaWxhYmxlKS50aGVuKGZpbGxlZENvdW50ID0+IHtcclxuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGZpbGxlZENvdW50IH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdkZXRlY3RGaWVsZHMnKSB7XHJcbiAgICAgICAgY29uc3QgZmllbGRzID0gZ2V0QWxsRm9ybUZpZWxkcygpXHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZmllbGRDb3VudDogZmllbGRzLmxlbmd0aCB9KVxyXG4gICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgY29uc29sZS5sb2coJ1tSQUVdIEF1dG9maWxsIGNvbnRlbnQgc2NyaXB0IGxvYWRlZCcpXHJcbiAgfVxyXG59KSIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsImZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuICBpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG4gIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmdzLnNoaWZ0KCk7XG4gICAgbWV0aG9kKGBbd3h0XSAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG4gIH1cbn1cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5leHBvcnQgY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgY29uc3RydWN0b3IobmV3VXJsLCBvbGRVcmwpIHtcbiAgICBzdXBlcihXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LkVWRU5UX05BTUUsIHt9KTtcbiAgICB0aGlzLm5ld1VybCA9IG5ld1VybDtcbiAgICB0aGlzLm9sZFVybCA9IG9sZFVybDtcbiAgfVxuICBzdGF0aWMgRVZFTlRfTkFNRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcInd4dDpsb2NhdGlvbmNoYW5nZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzXCI7XG5pbXBvcnQge1xuICBnZXRVbmlxdWVFdmVudE5hbWVcbn0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBJbnRlcnZhbHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjbGVhckludGVydmFsYCBmdW5jdGlvbi5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBUaW1lb3V0cyBjYW4gYmUgY2xlYXJlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYHNldFRpbWVvdXRgIGZ1bmN0aW9uLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYCBmdW5jdGlvbi5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2AgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImRlZmluaXRpb24iLCJicm93c2VyIiwiX2Jyb3dzZXIiLCJwcmludCIsImxvZ2dlciJdLCJtYXBwaW5ncyI6Ijs7QUFBTyxXQUFTLG9CQUFvQkEsYUFBWTtBQUM5QyxXQUFPQTtBQUFBLEVBQ1Q7QUNGQSxRQUFBLGFBQUEsb0JBQUE7QUFBQSxJQUFtQyxTQUFBLENBQUEsWUFBQTtBQUFBLElBQ1gsT0FBQTtBQUFBLElBQ2YsT0FBQTtBQWdFTCxlQUFBLG9CQUFBLFNBQUE7QUFDRSxjQUFBLFVBQUEsQ0FBQTtBQUVBLFlBQUEsUUFBQSxJQUFBO0FBQ0UsZ0JBQUEsUUFBQSxTQUFBLGNBQUEsY0FBQSxJQUFBLE9BQUEsUUFB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QSxLQUFBLFNBQUEsU0FBQSxZQUFBLEtBQUEsU0FBQSxTQUFBLFdBQUE7QUFNQSxnQkFBQSxnQkFBQTtBQUNFLG9CQUFBLFVBQUEsTUFBQSxtQkFBQSxXQUFBLGdCQUFBLGtCQUFBO0FBQ0Esa0JBQUEsU0FBQTtBQUNFLHNDQUFBO0FBQ0E7QUFBQSxjQUFBO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUtFLHFCQUFBLGFBQUEsWUFBQSxhQUFBO0FBQ0YsY0FBQSxTQUFBLGlCQUFBO0FBQ0EsWUFBQSxjQUFBO0FBRUksY0FBQSxXQUFBLEdBQUEsV0FBQSxTQUFBLElBQUEsV0FBQSxRQUFBLEdBQUEsS0FBQTtBQUNBLGNBQUEsWUFBQSxXQUFBLGFBQUEsQ0FBQTtBQUNBLGNBQUEsWUFBQSxXQUFBLFlBQUEsQ0FBQTtBQUNBLGNBQUEsZ0JBQUEsV0FBQSxXQUFBLENBQUE7QUFFQSxtQkFBQSxZQUFBLENBQUEsV0FBQSxNQUFBLFdBQUEsT0FBQSxFQUFBLE9BQUEsT0FBQSxFQUFBLEtBQUEsSUFBQTtBQUdBLGNBQUEsaUJBQUEsTUFBQTtBQUNKLGNBQUEsY0FBQTtBQUNBLHFCQUFBLFlBQUEsUUFBQSxDQUFBLFFBQUE7QUFDRSxrQkFBQSxRQUFBLFNBQUEsSUFBQSxTQUFBLElBQUEsTUFBQSxTQUFBLElBQUEsVUFBQSxLQUFBO0FBR0Esa0JBQUEsWUFBQSxDQUFBLElBQUEsV0FBQSxJQUFBLFFBQUEsWUFBQSxFQUFBLFNBQUEsU0FBQTtBQUNBLGtCQUFBLFVBQUEsYUFBQSxvQkFBQSxLQUFBLEdBQUEsZ0JBQUEsU0FBQSxJQUFBLE9BQUE7QUFDQSxrQkFBQSxXQUFBLGFBQUEsb0JBQUEsS0FBQSxHQUFBLGFBQUEsSUFBQSxTQUFBLElBQUEsUUFBQSxLQUFBO0FBRUEsa0JBQUEsTUFBQSxVQUFBLEtBQUE7QUFDQSxnQkFBQSxDQUFBLE1BQUEsTUFBQSxLQUFBLEVBQUEsZ0JBQUEsTUFBQTtBQUFBLFVBQStDLENBQUE7QUFFakQsaUJBQUEsS0FBQSxJQUFBLEdBQUEsS0FBQSxNQUFBLGNBQUEsRUFBQSxDQUFBLEVBQUEsU0FBQTtBQUFBLFFBQTBELEdBQUE7QUFHdEQsY0FBQSxXQUFBO0FBQUEsVUFBeUM7QUFBQSxVQUN2QyxXQUFBLFdBQUE7QUFBQSxVQUNpQyxVQUFBLFdBQUE7QUFBQSxVQUNBLE9BQUEsV0FBQTtBQUFBLFVBQ0EsT0FBQSxXQUFBO0FBQUEsVUFDQSxhQUFBLFdBQUEsZUFBQTtBQUFBLFVBQ2UsYUFBQSxXQUFBLGVBQUEsV0FBQTtBQUFBLFVBQ1csV0FBQTtBQUFBLFVBQ3JDLGVBQUEsV0FBQTtBQUFBLFVBQ1csTUFBQSxXQUFBO0FBQUEsVUFDQSxjQUFBLFdBQUE7QUFBQSxVQUNSLFNBQUE7QUFBQSxVQUNILE9BQUE7QUFBQSxVQUNBLFNBQUEsV0FBQTtBQUFBLFVBQ1csa0JBQUEsV0FBQTtBQUFBLFVBQ0osVUFBQSxHQUFBLFdBQUEsSUFBQSxLQUFBLFdBQUEsT0FBQTtBQUFBLFVBQ3NCLHFCQUFBLFdBQUE7QUFBQSxVQUNsQixRQUFBLE1BQUEsUUFBQSxXQUFBLE1BQUEsSUFBQSxXQUFBLE9BQUEsS0FBQSxJQUFBLElBQUE7QUFBQSxVQUN1RCxVQUFBLFdBQUEsWUFBQTtBQUFBLFVBQzNDLGFBQUEsV0FBQSxlQUFBO0FBQUEsVUFDRyxlQUFBLFdBQUEsY0FBQTtBQUFBLFVBQ0QsY0FBQSxXQUFBLGFBQUE7QUFBQSxVQUNELGFBQUEsV0FBQSxZQUFBO0FBQUEsVUFDRCxZQUFBLFdBQUEsV0FBQTtBQUFBLFVBQ0QsWUFBQSxXQUFBLGNBQUE7QUFBQSxVQUNHLGNBQUEsV0FBQSxnQkFBQTtBQUFBLFVBQ0UsY0FBQSxXQUFBLGFBQUE7QUFBQSxVQUNILFlBQUEsV0FBQSxXQUFBO0FBQUEsVUFDRixZQUFBLFdBQUEsZ0JBQUE7QUFBQSxVQUNMLG1CQUFBO0FBQUEsVUFDcEIsYUFBQSxlQUFBLGVBQUE7QUFBQSxVQUNpQyxVQUFBLFdBQUEsWUFBQTtBQUFBLFVBQ1AsUUFBQSxXQUFBLFVBQUE7QUFBQSxVQUNGLFNBQUEsV0FBQSxhQUFBLGVBQUEsUUFBQTtBQUFBLFVBQzBCLFFBQUE7QUFBQSxVQUMvQyxVQUFBO0FBQUEsVUFDQSxZQUFBO0FBQUEsVUFDQSxnQkFBQTtBQUFBLFVBQ0EsUUFBQTtBQUFBLFVBQ0EsV0FBQTtBQUFBLFVBQ0EsU0FBQTtBQUFBLFVBQ0EsWUFBQTtBQUFBLFFBQ0E7QUFHMUIsbUJBQUEsRUFBQSxTQUFBLEtBQUEsS0FBQSxRQUFBO0FBQ0YsY0FBQSxRQUFBLFNBQUEsSUFBQTtBQUdBLGdCQUFBLFlBQUEsb0JBQUEsT0FBQSxFQUFBLFlBQUE7QUFDQSxjQUFBLGNBQUEsY0FBQSxjQUFBLGlCQUFBO0FBQ0Usb0JBQUEsU0FBQSxVQUFBO0FBQUEsVUFBMkI7QUFJN0IsY0FBQSxTQUFBLFVBQUEsVUFBQSxTQUFBLFNBQUEsR0FBQTtBQUNFLG9CQUFBLFNBQUEsZUFBQTtBQUFBLFVBQWdDO0FBS2xDLGNBQUEsQ0FBQSxNQUFBO0FBRUEsY0FBQSxtQkFBQSxvQkFBQSxtQkFBQSxxQkFBQTtBQUVFLHNCQUFBLFNBQUEsS0FBQTtBQUNBO0FBQUEsVUFBQSxXQUFBLG1CQUFBLG1CQUFBO0FBSUEsZ0JBQUEsVUFBQTtBQUVBLGdCQUFBLFNBQUEsY0FBQTtBQUNFLHdCQUFBLHNCQUFBLFNBQUEsS0FBQTtBQUFBLFlBQThDLFdBQUEsU0FBQSxxQkFBQTtBQUU5Qyx3QkFBQSx1QkFBQSxTQUFBLEtBQUE7QUFBQSxZQUErQyxPQUFBO0FBRS9DLHdCQUFBLGFBQUEsU0FBQSxLQUFBO0FBQUEsWUFBcUM7QUFHdkMsZ0JBQUEsUUFBQTtBQUFBLFVBQWE7QUFBQSxRQUNmO0FBSUEsY0FBQSxJQUFBLFFBQUEsQ0FBQSxZQUFBLFdBQUEsU0FBQSxHQUFBLENBQUE7QUFHQSwyQkFBQTtBQUNBLGNBQUEsb0JBQUEsV0FBQTtBQUVBLGVBQUE7QUFBQSxNQUFPO0FBS0wsYUFBQSxRQUFBLFVBQUEsWUFBQSxDQUFBLFNBQUEsUUFBQSxpQkFBQTtBQUNFLFlBQUEsUUFBQSxXQUFBLFlBQUE7QUFDRSx1QkFBQSxRQUFBLFlBQUEsUUFBQSxXQUFBLEVBQUEsS0FBQSxDQUFBLGdCQUFBO0FBQ0UseUJBQUEsRUFBQSxTQUFBLE1BQUEsWUFBQSxDQUFBO0FBQUEsVUFBMkMsQ0FBQTtBQUU3QyxpQkFBQTtBQUFBLFFBQU87QUFHVCxZQUFBLFFBQUEsV0FBQSxnQkFBQTtBQUNFLGdCQUFBLFNBQUEsaUJBQUE7QUFDQSx1QkFBQSxFQUFBLFNBQUEsTUFBQSxZQUFBLE9BQUEsUUFBQTtBQUNBLGlCQUFBO0FBQUEsUUFBTztBQUFBLE1BQ1QsQ0FBQTtBQUdGLGNBQUEsSUFBQSxzQ0FBQTtBQUFBLElBQWtEO0FBQUEsRUFFdEQsQ0FBQTtBQzVuQk8sUUFBTUMsWUFBVSxXQUFXLFNBQVMsU0FBUyxLQUNoRCxXQUFXLFVBQ1gsV0FBVztBQ0ZSLFFBQU0sVUFBVUM7QUNEdkIsV0FBU0MsUUFBTSxXQUFXLE1BQU07QUFFOUIsUUFBSSxPQUFPLEtBQUssQ0FBQyxNQUFNLFVBQVU7QUFDL0IsWUFBTSxVQUFVLEtBQUssTUFBQTtBQUNyQixhQUFPLFNBQVMsT0FBTyxJQUFJLEdBQUcsSUFBSTtBQUFBLElBQ3BDLE9BQU87QUFDTCxhQUFPLFNBQVMsR0FBRyxJQUFJO0FBQUEsSUFDekI7QUFBQSxFQUNGO0FBQ08sUUFBTUMsV0FBUztBQUFBLElBQ3BCLE9BQU8sSUFBSSxTQUFTRCxRQUFNLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFBQSxJQUNoRCxLQUFLLElBQUksU0FBU0EsUUFBTSxRQUFRLEtBQUssR0FBRyxJQUFJO0FBQUEsSUFDNUMsTUFBTSxJQUFJLFNBQVNBLFFBQU0sUUFBUSxNQUFNLEdBQUcsSUFBSTtBQUFBLElBQzlDLE9BQU8sSUFBSSxTQUFTQSxRQUFNLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFBQSxFQUNsRDtBQUFBLEVDYk8sTUFBTSwrQkFBK0IsTUFBTTtBQUFBLElBQ2hELFlBQVksUUFBUSxRQUFRO0FBQzFCLFlBQU0sdUJBQXVCLFlBQVksRUFBRTtBQUMzQyxXQUFLLFNBQVM7QUFDZCxXQUFLLFNBQVM7QUFBQSxJQUNoQjtBQUFBLElBQ0EsT0FBTyxhQUFhLG1CQUFtQixvQkFBb0I7QUFBQSxFQUM3RDtBQUNPLFdBQVMsbUJBQW1CLFdBQVc7QUFDNUMsV0FBTyxHQUFHLFNBQVMsU0FBUyxFQUFFLElBQUksU0FBMEIsSUFBSSxTQUFTO0FBQUEsRUFDM0U7QUNWTyxXQUFTLHNCQUFzQixLQUFLO0FBQ3pDLFFBQUk7QUFDSixRQUFJO0FBQ0osV0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFLTCxNQUFNO0FBQ0osWUFBSSxZQUFZLEtBQU07QUFDdEIsaUJBQVMsSUFBSSxJQUFJLFNBQVMsSUFBSTtBQUM5QixtQkFBVyxJQUFJLFlBQVksTUFBTTtBQUMvQixjQUFJLFNBQVMsSUFBSSxJQUFJLFNBQVMsSUFBSTtBQUNsQyxjQUFJLE9BQU8sU0FBUyxPQUFPLE1BQU07QUFDL0IsbUJBQU8sY0FBYyxJQUFJLHVCQUF1QixRQUFRLE1BQU0sQ0FBQztBQUMvRCxxQkFBUztBQUFBLFVBQ1g7QUFBQSxRQUNGLEdBQUcsR0FBRztBQUFBLE1BQ1I7QUFBQSxJQUNKO0FBQUEsRUFDQTtBQUFBLEVDZk8sTUFBTSxxQkFBcUI7QUFBQSxJQUNoQyxZQUFZLG1CQUFtQixTQUFTO0FBQ3RDLFdBQUssb0JBQW9CO0FBQ3pCLFdBQUssVUFBVTtBQUNmLFdBQUssa0JBQWtCLElBQUksZ0JBQWU7QUFDMUMsVUFBSSxLQUFLLFlBQVk7QUFDbkIsYUFBSyxzQkFBc0IsRUFBRSxrQkFBa0IsS0FBSSxDQUFFO0FBQ3JELGFBQUssZUFBYztBQUFBLE1BQ3JCLE9BQU87QUFDTCxhQUFLLHNCQUFxQjtBQUFBLE1BQzVCO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTyw4QkFBOEI7QUFBQSxNQUNuQztBQUFBLElBQ0o7QUFBQSxJQUNFLGFBQWEsT0FBTyxTQUFTLE9BQU87QUFBQSxJQUNwQztBQUFBLElBQ0Esa0JBQWtCLHNCQUFzQixJQUFJO0FBQUEsSUFDNUMscUJBQXFDLG9CQUFJLElBQUc7QUFBQSxJQUM1QyxJQUFJLFNBQVM7QUFDWCxhQUFPLEtBQUssZ0JBQWdCO0FBQUEsSUFDOUI7QUFBQSxJQUNBLE1BQU0sUUFBUTtBQUNaLGFBQU8sS0FBSyxnQkFBZ0IsTUFBTSxNQUFNO0FBQUEsSUFDMUM7QUFBQSxJQUNBLElBQUksWUFBWTtBQUNkLFVBQUksUUFBUSxRQUFRLE1BQU0sTUFBTTtBQUM5QixhQUFLLGtCQUFpQjtBQUFBLE1BQ3hCO0FBQ0EsYUFBTyxLQUFLLE9BQU87QUFBQSxJQUNyQjtBQUFBLElBQ0EsSUFBSSxVQUFVO0FBQ1osYUFBTyxDQUFDLEtBQUs7QUFBQSxJQUNmO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQWNBLGNBQWMsSUFBSTtBQUNoQixXQUFLLE9BQU8saUJBQWlCLFNBQVMsRUFBRTtBQUN4QyxhQUFPLE1BQU0sS0FBSyxPQUFPLG9CQUFvQixTQUFTLEVBQUU7QUFBQSxJQUMxRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQVlBLFFBQVE7QUFDTixhQUFPLElBQUksUUFBUSxNQUFNO0FBQUEsTUFDekIsQ0FBQztBQUFBLElBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFNQSxZQUFZLFNBQVMsU0FBUztBQUM1QixZQUFNLEtBQUssWUFBWSxNQUFNO0FBQzNCLFlBQUksS0FBSyxRQUFTLFNBQU87QUFBQSxNQUMzQixHQUFHLE9BQU87QUFDVixXQUFLLGNBQWMsTUFBTSxjQUFjLEVBQUUsQ0FBQztBQUMxQyxhQUFPO0FBQUEsSUFDVDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU1BLFdBQVcsU0FBUyxTQUFTO0FBQzNCLFlBQU0sS0FBSyxXQUFXLE1BQU07QUFDMUIsWUFBSSxLQUFLLFFBQVMsU0FBTztBQUFBLE1BQzNCLEdBQUcsT0FBTztBQUNWLFdBQUssY0FBYyxNQUFNLGFBQWEsRUFBRSxDQUFDO0FBQ3pDLGFBQU87QUFBQSxJQUNUO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFPQSxzQkFBc0IsVUFBVTtBQUM5QixZQUFNLEtBQUssc0JBQXNCLElBQUksU0FBUztBQUM1QyxZQUFJLEtBQUssUUFBUyxVQUFTLEdBQUcsSUFBSTtBQUFBLE1BQ3BDLENBQUM7QUFDRCxXQUFLLGNBQWMsTUFBTSxxQkFBcUIsRUFBRSxDQUFDO0FBQ2pELGFBQU87QUFBQSxJQUNUO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFPQSxvQkFBb0IsVUFBVSxTQUFTO0FBQ3JDLFlBQU0sS0FBSyxvQkFBb0IsSUFBSSxTQUFTO0FBQzFDLFlBQUksQ0FBQyxLQUFLLE9BQU8sUUFBUyxVQUFTLEdBQUcsSUFBSTtBQUFBLE1BQzVDLEdBQUcsT0FBTztBQUNWLFdBQUssY0FBYyxNQUFNLG1CQUFtQixFQUFFLENBQUM7QUFDL0MsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLGlCQUFpQixRQUFRLE1BQU0sU0FBUyxTQUFTO0FBQy9DLFVBQUksU0FBUyxzQkFBc0I7QUFDakMsWUFBSSxLQUFLLFFBQVMsTUFBSyxnQkFBZ0IsSUFBRztBQUFBLE1BQzVDO0FBQ0EsYUFBTztBQUFBLFFBQ0wsS0FBSyxXQUFXLE1BQU0sSUFBSSxtQkFBbUIsSUFBSSxJQUFJO0FBQUEsUUFDckQ7QUFBQSxRQUNBO0FBQUEsVUFDRSxHQUFHO0FBQUEsVUFDSCxRQUFRLEtBQUs7QUFBQSxRQUNyQjtBQUFBLE1BQ0E7QUFBQSxJQUNFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUtBLG9CQUFvQjtBQUNsQixXQUFLLE1BQU0sb0NBQW9DO0FBQy9DQyxlQUFPO0FBQUEsUUFDTCxtQkFBbUIsS0FBSyxpQkFBaUI7QUFBQSxNQUMvQztBQUFBLElBQ0U7QUFBQSxJQUNBLGlCQUFpQjtBQUNmLGFBQU87QUFBQSxRQUNMO0FBQUEsVUFDRSxNQUFNLHFCQUFxQjtBQUFBLFVBQzNCLG1CQUFtQixLQUFLO0FBQUEsVUFDeEIsV0FBVyxLQUFLLE9BQU0sRUFBRyxTQUFTLEVBQUUsRUFBRSxNQUFNLENBQUM7QUFBQSxRQUNyRDtBQUFBLFFBQ007QUFBQSxNQUNOO0FBQUEsSUFDRTtBQUFBLElBQ0EseUJBQXlCLE9BQU87QUFDOUIsWUFBTSx1QkFBdUIsTUFBTSxNQUFNLFNBQVMscUJBQXFCO0FBQ3ZFLFlBQU0sc0JBQXNCLE1BQU0sTUFBTSxzQkFBc0IsS0FBSztBQUNuRSxZQUFNLGlCQUFpQixDQUFDLEtBQUssbUJBQW1CLElBQUksTUFBTSxNQUFNLFNBQVM7QUFDekUsYUFBTyx3QkFBd0IsdUJBQXVCO0FBQUEsSUFDeEQ7QUFBQSxJQUNBLHNCQUFzQixTQUFTO0FBQzdCLFVBQUksVUFBVTtBQUNkLFlBQU0sS0FBSyxDQUFDLFVBQVU7QUFDcEIsWUFBSSxLQUFLLHlCQUF5QixLQUFLLEdBQUc7QUFDeEMsZUFBSyxtQkFBbUIsSUFBSSxNQUFNLEtBQUssU0FBUztBQUNoRCxnQkFBTSxXQUFXO0FBQ2pCLG9CQUFVO0FBQ1YsY0FBSSxZQUFZLFNBQVMsaUJBQWtCO0FBQzNDLGVBQUssa0JBQWlCO0FBQUEsUUFDeEI7QUFBQSxNQUNGO0FBQ0EsdUJBQWlCLFdBQVcsRUFBRTtBQUM5QixXQUFLLGNBQWMsTUFBTSxvQkFBb0IsV0FBVyxFQUFFLENBQUM7QUFBQSxJQUM3RDtBQUFBLEVBQ0Y7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwyLDMsNCw1LDYsN119
content;