var content = (function() {
  "use strict";
  function defineContentScript(definition2) {
    return definition2;
  }
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_idle",
    main() {
      function detectFieldType(element) {
        const id = element.id?.toLowerCase() || "";
        const name = element.name?.toLowerCase() || "";
        const placeholder = element.placeholder?.toLowerCase() || "";
        const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
        const label = findLabelForElement(element)?.toLowerCase() || "";
        const combined = `${id} ${name} ${placeholder} ${ariaLabel} ${label}`;
        const patterns = [
          { keywords: ["firstname", "first-name", "first_name", "fname", "givenname"], type: "firstName", confidence: 0.9 },
          { keywords: ["lastname", "last-name", "last_name", "lname", "surname", "familyname"], type: "lastName", confidence: 0.9 },
          { keywords: ["email", "e-mail", "emailaddress"], type: "email", confidence: 0.9 },
          { keywords: ["phone", "telephone", "mobile", "phonenumber", "tel"], type: "phone", confidence: 0.9 },
          { keywords: ["address", "street", "addressline"], type: "streetAddress", confidence: 0.8 },
          { keywords: ["city", "town"], type: "city", confidence: 0.8 },
          { keywords: ["country", "nation"], type: "country", confidence: 0.8 },
          { keywords: ["location", "residence"], type: "location", confidence: 0.7 },
          { keywords: ["summary", "about", "bio", "profile", "objective"], type: "professionalSummary", confidence: 0.7 },
          { keywords: ["skill", "expertise", "competenc"], type: "skills", confidence: 0.7 },
          { keywords: ["jobtitle", "job-title", "position", "role", "title"], type: "jobTitle", confidence: 0.8 },
          { keywords: ["company", "employer", "organization", "organisation"], type: "companyName", confidence: 0.8 },
          { keywords: ["school", "university", "college", "institution"], type: "schoolName", confidence: 0.8 },
          { keywords: ["degree", "major", "field", "study", "discipline"], type: "fieldOfStudy", confidence: 0.8 },
          { keywords: ["project", "portfolio"], type: "projectName", confidence: 0.7 },
          { keywords: ["linkedin", "github", "website", "url", "link", "portfolio"], type: "link", confidence: 0.6 }
        ];
        for (const pattern of patterns) {
          for (const keyword of pattern.keywords) {
            if (combined.includes(keyword)) {
              return { type: pattern.type, confidence: pattern.confidence };
            }
          }
        }
        return { type: "unknown", confidence: 0 };
      }
      function findLabelForElement(element) {
        if (element.id) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          if (label) return label.textContent;
        }
        const parentLabel = element.closest("label");
        if (parentLabel) return parentLabel.textContent;
        const prevSibling = element.previousElementSibling;
        if (prevSibling?.tagName === "LABEL") {
          return prevSibling.textContent;
        }
        return null;
      }
      function getAllFormFields() {
        const fields = [];
        const inputs = document.querySelectorAll("input, textarea, select");
        inputs.forEach((element) => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
            if (element instanceof HTMLInputElement && (element.type === "submit" || element.type === "button" || element.type === "hidden")) {
              return;
            }
            const { type, confidence } = detectFieldType(element);
            if (confidence > 0.5) {
              fields.push({ element, type, confidence });
            }
          }
        });
        return fields;
      }
      function fillField(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        if (element instanceof HTMLInputElement && nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        } else if (element instanceof HTMLTextAreaElement && nativeTextareaValueSetter) {
          nativeTextareaValueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.dispatchEvent(new Event("blur", { bubbles: true }));
      }
      async function handleFileUpload(element, fileType) {
        try {
          const token = await chrome.storage.local.get(["auth_token"]);
          if (!token.auth_token) return;
          const API_URL = (await chrome.storage.local.get(["api_url"])).api_url || "http://localhost:3000";
          const endpoint = fileType === "resume" ? "/api/resume/view" : "/api/cv/view";
          const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
              "Authorization": `Bearer ${token.auth_token}`
            }
          });
          if (!response.ok) return;
          const blob = await response.blob();
          const fileName = fileType === "resume" ? "resume.pdf" : "cover-letter.pdf";
          const file = new File([blob], fileName, { type: "application/pdf" });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          element.files = dataTransfer.files;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (error) {
          console.error(`Failed to upload ${fileType}:`, error);
        }
      }
      function autofillForm(resumeData, cvAvailable) {
        const fields = getAllFormFields();
        let filledCount = 0;
        fields.forEach(({ element, type }) => {
          let value = "";
          switch (type) {
            case "firstName":
              value = resumeData.firstName;
              break;
            case "lastName":
              value = resumeData.lastName;
              break;
            case "email":
              value = resumeData.email;
              break;
            case "phone":
              value = resumeData.phone;
              break;
            case "streetAddress":
              value = resumeData.streetAddress;
              break;
            case "city":
              value = resumeData.city;
              break;
            case "country":
              value = resumeData.country;
              break;
            case "location":
              value = resumeData.location;
              break;
            case "professionalSummary":
              value = resumeData.professionalSummary;
              break;
            case "skills":
              value = resumeData.skills.join(", ");
              break;
            case "jobTitle":
              value = resumeData.experience[0]?.jobTitle || "";
              break;
            case "companyName":
              value = resumeData.experience[0]?.companyName || "";
              break;
            case "schoolName":
              value = resumeData.education[0]?.schoolName || "";
              break;
            case "fieldOfStudy":
              value = resumeData.education[0]?.fieldOfStudy || "";
              break;
            case "projectName":
              value = resumeData.projects[0]?.projectName || "";
              break;
            case "link":
              value = resumeData.projects[0]?.link || "";
              break;
          }
          if (value && element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            fillField(element, value);
            filledCount++;
          }
        });
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(async (fileInput) => {
          const label = findLabelForElement(fileInput)?.toLowerCase() || "";
          const id = fileInput.id?.toLowerCase() || "";
          const name = fileInput.name?.toLowerCase() || "";
          const combined = `${label} ${id} ${name}`;
          if (combined.includes("resume") || combined.includes("cv")) {
            await handleFileUpload(fileInput, "resume");
            filledCount++;
          } else if (cvAvailable && (combined.includes("cover") || combined.includes("letter"))) {
            await handleFileUpload(fileInput, "coverLetter");
            filledCount++;
          }
        });
        return filledCount;
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "autofill") {
          const filledCount = autofillForm(message.resumeData, message.cvAvailable);
          sendResponse({ success: true, filledCount });
        } else if (message.action === "detectFields") {
          const fields = getAllFormFields();
          sendResponse({ success: true, fieldCount: fields.length });
        }
        return true;
      });
      console.log("RAE Autofill content script loaded");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL2VudHJ5cG9pbnRzL2NvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHd4dC1kZXYrYnJvd3NlckAwLjEuMzIvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC4xM19AdHlwZXMrbm9kZUAyNS5fNjM2MTk0NDVjNTg3Y2Q0YTY2NzI3NzUxYWRjMjJhN2Evbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjEzX0B0eXBlcytub2RlQDI1Ll82MzYxOTQ0NWM1ODdjZDRhNjY3Mjc3NTFhZGMyMmE3YS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuMTNfQHR5cGVzK25vZGVAMjUuXzYzNjE5NDQ1YzU4N2NkNGE2NjcyNzc1MWFkYzIyYTdhL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9pZGxlJyxcclxuICBcclxuICBtYWluKCkge1xyXG4gICAgaW50ZXJmYWNlIFJlc3VtZURhdGEge1xyXG4gIGZpcnN0TmFtZTogc3RyaW5nXHJcbiAgbGFzdE5hbWU6IHN0cmluZ1xyXG4gIGVtYWlsOiBzdHJpbmdcclxuICBwaG9uZTogc3RyaW5nXHJcbiAgc3RyZWV0QWRkcmVzczogc3RyaW5nXHJcbiAgY2l0eTogc3RyaW5nXHJcbiAgY291bnRyeTogc3RyaW5nXHJcbiAgbG9jYXRpb246IHN0cmluZ1xyXG4gIHByb2Zlc3Npb25hbFN1bW1hcnk6IHN0cmluZ1xyXG4gIHNraWxsczogc3RyaW5nW11cclxuICBleHBlcmllbmNlOiBBcnJheTx7XHJcbiAgICBqb2JUaXRsZTogc3RyaW5nXHJcbiAgICBjb21wYW55TmFtZTogc3RyaW5nXHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgICBzdGFydE1vbnRoOiBzdHJpbmdcclxuICAgIHN0YXJ0WWVhcjogc3RyaW5nXHJcbiAgICBlbmRNb250aDogc3RyaW5nXHJcbiAgICBlbmRZZWFyOiBzdHJpbmdcclxuICB9PlxyXG4gIHByb2plY3RzOiBBcnJheTx7XHJcbiAgICBwcm9qZWN0TmFtZTogc3RyaW5nXHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgICBsaW5rOiBzdHJpbmdcclxuICB9PlxyXG4gIGVkdWNhdGlvbjogQXJyYXk8e1xyXG4gICAgc2Nob29sTmFtZTogc3RyaW5nXHJcbiAgICBmaWVsZE9mU3R1ZHk6IHN0cmluZ1xyXG4gICAgc3RhcnRZZWFyOiBzdHJpbmdcclxuICAgIGVuZFllYXI6IHN0cmluZ1xyXG4gIH0+XHJcbn1cclxuXHJcbmludGVyZmFjZSBGaWVsZE1hcHBpbmcge1xyXG4gIGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnRcclxuICB0eXBlOiBzdHJpbmdcclxuICBjb25maWRlbmNlOiBudW1iZXJcclxufVxyXG5cclxuZnVuY3Rpb24gZGV0ZWN0RmllbGRUeXBlKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50IHwgSFRNTFNlbGVjdEVsZW1lbnQpOiB7IHR5cGU6IHN0cmluZzsgY29uZmlkZW5jZTogbnVtYmVyIH0ge1xyXG4gIGNvbnN0IGlkID0gZWxlbWVudC5pZD8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gIGNvbnN0IG5hbWUgPSBlbGVtZW50Lm5hbWU/LnRvTG93ZXJDYXNlKCkgfHwgJydcclxuICBjb25zdCBwbGFjZWhvbGRlciA9IChlbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnBsYWNlaG9sZGVyPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgY29uc3QgYXJpYUxhYmVsID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gIGNvbnN0IGxhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChlbGVtZW50KT8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gIFxyXG4gIGNvbnN0IGNvbWJpbmVkID0gYCR7aWR9ICR7bmFtZX0gJHtwbGFjZWhvbGRlcn0gJHthcmlhTGFiZWx9ICR7bGFiZWx9YFxyXG4gIFxyXG4gIGNvbnN0IHBhdHRlcm5zID0gW1xyXG4gICAgeyBrZXl3b3JkczogWydmaXJzdG5hbWUnLCAnZmlyc3QtbmFtZScsICdmaXJzdF9uYW1lJywgJ2ZuYW1lJywgJ2dpdmVubmFtZSddLCB0eXBlOiAnZmlyc3ROYW1lJywgY29uZmlkZW5jZTogMC45IH0sXHJcbiAgICB7IGtleXdvcmRzOiBbJ2xhc3RuYW1lJywgJ2xhc3QtbmFtZScsICdsYXN0X25hbWUnLCAnbG5hbWUnLCAnc3VybmFtZScsICdmYW1pbHluYW1lJ10sIHR5cGU6ICdsYXN0TmFtZScsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgeyBrZXl3b3JkczogWydlbWFpbCcsICdlLW1haWwnLCAnZW1haWxhZGRyZXNzJ10sIHR5cGU6ICdlbWFpbCcsIGNvbmZpZGVuY2U6IDAuOSB9LFxyXG4gICAgeyBrZXl3b3JkczogWydwaG9uZScsICd0ZWxlcGhvbmUnLCAnbW9iaWxlJywgJ3Bob25lbnVtYmVyJywgJ3RlbCddLCB0eXBlOiAncGhvbmUnLCBjb25maWRlbmNlOiAwLjkgfSxcclxuICAgIHsga2V5d29yZHM6IFsnYWRkcmVzcycsICdzdHJlZXQnLCAnYWRkcmVzc2xpbmUnXSwgdHlwZTogJ3N0cmVldEFkZHJlc3MnLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgIHsga2V5d29yZHM6IFsnY2l0eScsICd0b3duJ10sIHR5cGU6ICdjaXR5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICB7IGtleXdvcmRzOiBbJ2NvdW50cnknLCAnbmF0aW9uJ10sIHR5cGU6ICdjb3VudHJ5JywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICB7IGtleXdvcmRzOiBbJ2xvY2F0aW9uJywgJ3Jlc2lkZW5jZSddLCB0eXBlOiAnbG9jYXRpb24nLCBjb25maWRlbmNlOiAwLjcgfSxcclxuICAgIHsga2V5d29yZHM6IFsnc3VtbWFyeScsICdhYm91dCcsICdiaW8nLCAncHJvZmlsZScsICdvYmplY3RpdmUnXSwgdHlwZTogJ3Byb2Zlc3Npb25hbFN1bW1hcnknLCBjb25maWRlbmNlOiAwLjcgfSxcclxuICAgIHsga2V5d29yZHM6IFsnc2tpbGwnLCAnZXhwZXJ0aXNlJywgJ2NvbXBldGVuYyddLCB0eXBlOiAnc2tpbGxzJywgY29uZmlkZW5jZTogMC43IH0sXHJcbiAgICB7IGtleXdvcmRzOiBbJ2pvYnRpdGxlJywgJ2pvYi10aXRsZScsICdwb3NpdGlvbicsICdyb2xlJywgJ3RpdGxlJ10sIHR5cGU6ICdqb2JUaXRsZScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgeyBrZXl3b3JkczogWydjb21wYW55JywgJ2VtcGxveWVyJywgJ29yZ2FuaXphdGlvbicsICdvcmdhbmlzYXRpb24nXSwgdHlwZTogJ2NvbXBhbnlOYW1lJywgY29uZmlkZW5jZTogMC44IH0sXHJcbiAgICB7IGtleXdvcmRzOiBbJ3NjaG9vbCcsICd1bml2ZXJzaXR5JywgJ2NvbGxlZ2UnLCAnaW5zdGl0dXRpb24nXSwgdHlwZTogJ3NjaG9vbE5hbWUnLCBjb25maWRlbmNlOiAwLjggfSxcclxuICAgIHsga2V5d29yZHM6IFsnZGVncmVlJywgJ21ham9yJywgJ2ZpZWxkJywgJ3N0dWR5JywgJ2Rpc2NpcGxpbmUnXSwgdHlwZTogJ2ZpZWxkT2ZTdHVkeScsIGNvbmZpZGVuY2U6IDAuOCB9LFxyXG4gICAgeyBrZXl3b3JkczogWydwcm9qZWN0JywgJ3BvcnRmb2xpbyddLCB0eXBlOiAncHJvamVjdE5hbWUnLCBjb25maWRlbmNlOiAwLjcgfSxcclxuICAgIHsga2V5d29yZHM6IFsnbGlua2VkaW4nLCAnZ2l0aHViJywgJ3dlYnNpdGUnLCAndXJsJywgJ2xpbmsnLCAncG9ydGZvbGlvJ10sIHR5cGU6ICdsaW5rJywgY29uZmlkZW5jZTogMC42IH0sXHJcbiAgXVxyXG4gIFxyXG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xyXG4gICAgZm9yIChjb25zdCBrZXl3b3JkIG9mIHBhdHRlcm4ua2V5d29yZHMpIHtcclxuICAgICAgaWYgKGNvbWJpbmVkLmluY2x1ZGVzKGtleXdvcmQpKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogcGF0dGVybi50eXBlLCBjb25maWRlbmNlOiBwYXR0ZXJuLmNvbmZpZGVuY2UgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiB7IHR5cGU6ICd1bmtub3duJywgY29uZmlkZW5jZTogMCB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRMYWJlbEZvckVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBzdHJpbmcgfCBudWxsIHtcclxuICBpZiAoZWxlbWVudC5pZCkge1xyXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBsYWJlbFtmb3I9XCIke2VsZW1lbnQuaWR9XCJdYClcclxuICAgIGlmIChsYWJlbCkgcmV0dXJuIGxhYmVsLnRleHRDb250ZW50XHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IHBhcmVudExhYmVsID0gZWxlbWVudC5jbG9zZXN0KCdsYWJlbCcpXHJcbiAgaWYgKHBhcmVudExhYmVsKSByZXR1cm4gcGFyZW50TGFiZWwudGV4dENvbnRlbnRcclxuICBcclxuICBjb25zdCBwcmV2U2libGluZyA9IGVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZ1xyXG4gIGlmIChwcmV2U2libGluZz8udGFnTmFtZSA9PT0gJ0xBQkVMJykge1xyXG4gICAgcmV0dXJuIHByZXZTaWJsaW5nLnRleHRDb250ZW50XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBudWxsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFsbEZvcm1GaWVsZHMoKTogRmllbGRNYXBwaW5nW10ge1xyXG4gIGNvbnN0IGZpZWxkczogRmllbGRNYXBwaW5nW10gPSBbXVxyXG4gIGNvbnN0IGlucHV0cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JylcclxuICBcclxuICBpbnB1dHMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50IHx8IFxyXG4gICAgICAgIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVGV4dEFyZWFFbGVtZW50IHx8IFxyXG4gICAgICAgIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MU2VsZWN0RWxlbWVudCkge1xyXG4gICAgICBcclxuICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50ICYmIFxyXG4gICAgICAgICAgKGVsZW1lbnQudHlwZSA9PT0gJ3N1Ym1pdCcgfHwgZWxlbWVudC50eXBlID09PSAnYnV0dG9uJyB8fCBlbGVtZW50LnR5cGUgPT09ICdoaWRkZW4nKSkge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCB7IHR5cGUsIGNvbmZpZGVuY2UgfSA9IGRldGVjdEZpZWxkVHlwZShlbGVtZW50KVxyXG4gICAgICBpZiAoY29uZmlkZW5jZSA+IDAuNSkge1xyXG4gICAgICAgIGZpZWxkcy5wdXNoKHsgZWxlbWVudCwgdHlwZSwgY29uZmlkZW5jZSB9KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSlcclxuICBcclxuICByZXR1cm4gZmllbGRzXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbGxGaWVsZChlbGVtZW50OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IEhUTUxTZWxlY3RFbGVtZW50LCB2YWx1ZTogc3RyaW5nKSB7XHJcbiAgY29uc3QgbmF0aXZlSW5wdXRWYWx1ZVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoXHJcbiAgICB3aW5kb3cuSFRNTElucHV0RWxlbWVudC5wcm90b3R5cGUsXHJcbiAgICAndmFsdWUnXHJcbiAgKT8uc2V0XHJcbiAgY29uc3QgbmF0aXZlVGV4dGFyZWFWYWx1ZVNldHRlciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoXHJcbiAgICB3aW5kb3cuSFRNTFRleHRBcmVhRWxlbWVudC5wcm90b3R5cGUsXHJcbiAgICAndmFsdWUnXHJcbiAgKT8uc2V0XHJcbiAgXHJcbiAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50ICYmIG5hdGl2ZUlucHV0VmFsdWVTZXR0ZXIpIHtcclxuICAgIG5hdGl2ZUlucHV0VmFsdWVTZXR0ZXIuY2FsbChlbGVtZW50LCB2YWx1ZSlcclxuICB9IGVsc2UgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVGV4dEFyZWFFbGVtZW50ICYmIG5hdGl2ZVRleHRhcmVhVmFsdWVTZXR0ZXIpIHtcclxuICAgIG5hdGl2ZVRleHRhcmVhVmFsdWVTZXR0ZXIuY2FsbChlbGVtZW50LCB2YWx1ZSlcclxuICB9IGVsc2Uge1xyXG4gICAgZWxlbWVudC52YWx1ZSA9IHZhbHVlXHJcbiAgfVxyXG4gIFxyXG4gIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2lucHV0JywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2NoYW5nZScsIHsgYnViYmxlczogdHJ1ZSB9KSlcclxuICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdibHVyJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVGaWxlVXBsb2FkKGVsZW1lbnQ6IEhUTUxJbnB1dEVsZW1lbnQsIGZpbGVUeXBlOiAncmVzdW1lJyB8ICdjb3ZlckxldHRlcicpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdG9rZW4gPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWydhdXRoX3Rva2VuJ10pXHJcbiAgICBpZiAoIXRva2VuLmF1dGhfdG9rZW4pIHJldHVyblxyXG4gICAgXHJcbiAgICBjb25zdCBBUElfVVJMID0gKGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2FwaV91cmwnXSkpLmFwaV91cmwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCdcclxuICAgIGNvbnN0IGVuZHBvaW50ID0gZmlsZVR5cGUgPT09ICdyZXN1bWUnID8gJy9hcGkvcmVzdW1lL3ZpZXcnIDogJy9hcGkvY3YvdmlldydcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtBUElfVVJMfSR7ZW5kcG9pbnR9YCwge1xyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW4uYXV0aF90b2tlbn1gLFxyXG4gICAgICB9LFxyXG4gICAgfSlcclxuICAgIFxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykgcmV0dXJuXHJcbiAgICBcclxuICAgIGNvbnN0IGJsb2IgPSBhd2FpdCByZXNwb25zZS5ibG9iKClcclxuICAgIGNvbnN0IGZpbGVOYW1lID0gZmlsZVR5cGUgPT09ICdyZXN1bWUnID8gJ3Jlc3VtZS5wZGYnIDogJ2NvdmVyLWxldHRlci5wZGYnXHJcbiAgICBjb25zdCBmaWxlID0gbmV3IEZpbGUoW2Jsb2JdLCBmaWxlTmFtZSwgeyB0eXBlOiAnYXBwbGljYXRpb24vcGRmJyB9KVxyXG4gICAgXHJcbiAgICBjb25zdCBkYXRhVHJhbnNmZXIgPSBuZXcgRGF0YVRyYW5zZmVyKClcclxuICAgIGRhdGFUcmFuc2Zlci5pdGVtcy5hZGQoZmlsZSlcclxuICAgIGVsZW1lbnQuZmlsZXMgPSBkYXRhVHJhbnNmZXIuZmlsZXNcclxuICAgIFxyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnY2hhbmdlJywgeyBidWJibGVzOiB0cnVlIH0pKVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBsb2FkICR7ZmlsZVR5cGV9OmAsIGVycm9yKVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYXV0b2ZpbGxGb3JtKHJlc3VtZURhdGE6IFJlc3VtZURhdGEsIGN2QXZhaWxhYmxlOiBib29sZWFuKSB7XHJcbiAgY29uc3QgZmllbGRzID0gZ2V0QWxsRm9ybUZpZWxkcygpXHJcbiAgbGV0IGZpbGxlZENvdW50ID0gMFxyXG4gIFxyXG4gIGZpZWxkcy5mb3JFYWNoKCh7IGVsZW1lbnQsIHR5cGUgfSkgPT4ge1xyXG4gICAgbGV0IHZhbHVlID0gJydcclxuICAgIFxyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgIGNhc2UgJ2ZpcnN0TmFtZSc6XHJcbiAgICAgICAgdmFsdWUgPSByZXN1bWVEYXRhLmZpcnN0TmFtZVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2xhc3ROYW1lJzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEubGFzdE5hbWVcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdlbWFpbCc6XHJcbiAgICAgICAgdmFsdWUgPSByZXN1bWVEYXRhLmVtYWlsXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAncGhvbmUnOlxyXG4gICAgICAgIHZhbHVlID0gcmVzdW1lRGF0YS5waG9uZVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ3N0cmVldEFkZHJlc3MnOlxyXG4gICAgICAgIHZhbHVlID0gcmVzdW1lRGF0YS5zdHJlZXRBZGRyZXNzXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnY2l0eSc6XHJcbiAgICAgICAgdmFsdWUgPSByZXN1bWVEYXRhLmNpdHlcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdjb3VudHJ5JzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEuY291bnRyeVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2xvY2F0aW9uJzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEubG9jYXRpb25cclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdwcm9mZXNzaW9uYWxTdW1tYXJ5JzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEucHJvZmVzc2lvbmFsU3VtbWFyeVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ3NraWxscyc6XHJcbiAgICAgICAgdmFsdWUgPSByZXN1bWVEYXRhLnNraWxscy5qb2luKCcsICcpXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnam9iVGl0bGUnOlxyXG4gICAgICAgIHZhbHVlID0gcmVzdW1lRGF0YS5leHBlcmllbmNlWzBdPy5qb2JUaXRsZSB8fCAnJ1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2NvbXBhbnlOYW1lJzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEuZXhwZXJpZW5jZVswXT8uY29tcGFueU5hbWUgfHwgJydcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdzY2hvb2xOYW1lJzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEuZWR1Y2F0aW9uWzBdPy5zY2hvb2xOYW1lIHx8ICcnXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnZmllbGRPZlN0dWR5JzpcclxuICAgICAgICB2YWx1ZSA9IHJlc3VtZURhdGEuZWR1Y2F0aW9uWzBdPy5maWVsZE9mU3R1ZHkgfHwgJydcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdwcm9qZWN0TmFtZSc6XHJcbiAgICAgICAgdmFsdWUgPSByZXN1bWVEYXRhLnByb2plY3RzWzBdPy5wcm9qZWN0TmFtZSB8fCAnJ1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ2xpbmsnOlxyXG4gICAgICAgIHZhbHVlID0gcmVzdW1lRGF0YS5wcm9qZWN0c1swXT8ubGluayB8fCAnJ1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmICh2YWx1ZSAmJiBlbGVtZW50IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCB8fCBlbGVtZW50IGluc3RhbmNlb2YgSFRNTFRleHRBcmVhRWxlbWVudCkge1xyXG4gICAgICBmaWxsRmllbGQoZWxlbWVudCwgdmFsdWUpXHJcbiAgICAgIGZpbGxlZENvdW50KytcclxuICAgIH1cclxuICB9KVxyXG4gIFxyXG4gIGNvbnN0IGZpbGVJbnB1dHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpXHJcbiAgZmlsZUlucHV0cy5mb3JFYWNoKGFzeW5jIChmaWxlSW5wdXQpID0+IHtcclxuICAgIGNvbnN0IGxhYmVsID0gZmluZExhYmVsRm9yRWxlbWVudChmaWxlSW5wdXQpPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICBjb25zdCBpZCA9IGZpbGVJbnB1dC5pZD8udG9Mb3dlckNhc2UoKSB8fCAnJ1xyXG4gICAgY29uc3QgbmFtZSA9IGZpbGVJbnB1dC5uYW1lPy50b0xvd2VyQ2FzZSgpIHx8ICcnXHJcbiAgICBjb25zdCBjb21iaW5lZCA9IGAke2xhYmVsfSAke2lkfSAke25hbWV9YFxyXG4gICAgXHJcbiAgICBpZiAoY29tYmluZWQuaW5jbHVkZXMoJ3Jlc3VtZScpIHx8IGNvbWJpbmVkLmluY2x1ZGVzKCdjdicpKSB7XHJcbiAgICAgIGF3YWl0IGhhbmRsZUZpbGVVcGxvYWQoZmlsZUlucHV0LCAncmVzdW1lJylcclxuICAgICAgZmlsbGVkQ291bnQrK1xyXG4gICAgfSBlbHNlIGlmIChjdkF2YWlsYWJsZSAmJiAoY29tYmluZWQuaW5jbHVkZXMoJ2NvdmVyJykgfHwgY29tYmluZWQuaW5jbHVkZXMoJ2xldHRlcicpKSkge1xyXG4gICAgICBhd2FpdCBoYW5kbGVGaWxlVXBsb2FkKGZpbGVJbnB1dCwgJ2NvdmVyTGV0dGVyJylcclxuICAgICAgZmlsbGVkQ291bnQrK1xyXG4gICAgfVxyXG4gIH0pXHJcbiAgXHJcbiAgcmV0dXJuIGZpbGxlZENvdW50XHJcbn1cclxuXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICBpZiAobWVzc2FnZS5hY3Rpb24gPT09ICdhdXRvZmlsbCcpIHtcclxuICAgIGNvbnN0IGZpbGxlZENvdW50ID0gYXV0b2ZpbGxGb3JtKG1lc3NhZ2UucmVzdW1lRGF0YSwgbWVzc2FnZS5jdkF2YWlsYWJsZSlcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGZpbGxlZENvdW50IH0pXHJcbiAgfSBlbHNlIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2RldGVjdEZpZWxkcycpIHtcclxuICAgIGNvbnN0IGZpZWxkcyA9IGdldEFsbEZvcm1GaWVsZHMoKVxyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZmllbGRDb3VudDogZmllbGRzLmxlbmd0aCB9KVxyXG4gIH1cclxuICByZXR1cm4gdHJ1ZVxyXG59KVxyXG5cclxuY29uc29sZS5sb2coJ1JBRSBBdXRvZmlsbCBjb250ZW50IHNjcmlwdCBsb2FkZWQnKVxyXG4gIH1cclxufSkiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogVGltZW91dHMgY2FuIGJlIGNsZWFyZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBzZXRUaW1lb3V0YCBmdW5jdGlvbi5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxBbmltYXRpb25GcmFtZWAgZnVuY3Rpb24uXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIENhbGxiYWNrcyBjYW4gYmUgY2FuY2VsZWQgYnkgY2FsbGluZyB0aGUgbm9ybWFsIGBjYW5jZWxJZGxlQ2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJkZWZpbml0aW9uIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDRkEsUUFBQSxhQUFBLG9CQUFBO0FBQUEsSUFBbUMsU0FBQSxDQUFBLFlBQUE7QUFBQSxJQUNYLE9BQUE7QUFBQSxJQUNmLE9BQUE7QUEwQ1QsZUFBQSxnQkFBQSxTQUFBO0FBQ0UsY0FBQSxLQUFBLFFBQUEsSUFBQSxZQUFBLEtBQUE7QUFDQSxjQUFBLE9BQUEsUUFBQSxNQUFBLFlBQUEsS0FBQTtBQUNBLGNBQUEsY0FBQSxRQUFBLGFBQUEsWUFBQSxLQUFBO0FBQ0EsY0FBQSxZQUFBLFFBQUEsYUFBQSxZQUFBLEdBQUEsWUFBQSxLQUFBO0FBQ0EsY0FBQSxRQUFBLG9CQUFBLE9BQUEsR0FBQSxZQUFBLEtBQUE7QUFFQSxjQUFBLFdBQUEsR0FBQSxFQUFBLElBQUEsSUFBQSxJQUFBLFdBQUEsSUFBQSxTQUFBLElBQUEsS0FBQTtBQUVBLGNBQUEsV0FBQTtBQUFBLFVBQWlCLEVBQUEsVUFBQSxDQUFBLGFBQUEsY0FBQSxjQUFBLFNBQUEsV0FBQSxHQUFBLE1BQUEsYUFBQSxZQUFBLElBQUE7QUFBQSxVQUNpRyxFQUFBLFVBQUEsQ0FBQSxZQUFBLGFBQUEsYUFBQSxTQUFBLFdBQUEsWUFBQSxHQUFBLE1BQUEsWUFBQSxZQUFBLElBQUE7QUFBQSxVQUNRLEVBQUEsVUFBQSxDQUFBLFNBQUEsVUFBQSxjQUFBLEdBQUEsTUFBQSxTQUFBLFlBQUEsSUFBQTtBQUFBLFVBQ3hDLEVBQUEsVUFBQSxDQUFBLFNBQUEsYUFBQSxVQUFBLGVBQUEsS0FBQSxHQUFBLE1BQUEsU0FBQSxZQUFBLElBQUE7QUFBQSxVQUNtQixFQUFBLFVBQUEsQ0FBQSxXQUFBLFVBQUEsYUFBQSxHQUFBLE1BQUEsaUJBQUEsWUFBQSxJQUFBO0FBQUEsVUFDVixFQUFBLFVBQUEsQ0FBQSxRQUFBLE1BQUEsR0FBQSxNQUFBLFFBQUEsWUFBQSxJQUFBO0FBQUEsVUFDN0IsRUFBQSxVQUFBLENBQUEsV0FBQSxRQUFBLEdBQUEsTUFBQSxXQUFBLFlBQUEsSUFBQTtBQUFBLFVBQ1EsRUFBQSxVQUFBLENBQUEsWUFBQSxXQUFBLEdBQUEsTUFBQSxZQUFBLFlBQUEsSUFBQTtBQUFBLFVBQ0ssRUFBQSxVQUFBLENBQUEsV0FBQSxTQUFBLE9BQUEsV0FBQSxXQUFBLEdBQUEsTUFBQSx1QkFBQSxZQUFBLElBQUE7QUFBQSxVQUNxQyxFQUFBLFVBQUEsQ0FB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QUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUEsT0FBQSxLQUFBLElBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUEsV0FBQSxDQUFBLEdBQUEsWUFBQTtBQUNBO0FBQUEsWUFBQSxLQUFBO0FBRUEsc0JBQUEsV0FBQSxXQUFBLENBQUEsR0FBQSxlQUFBO0FBQ0E7QUFBQSxZQUFBLEtBQUE7QUFFQSxzQkFBQSxXQUFBLFVBQUEsQ0FBQSxHQUFBLGNBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUEsVUFBQSxDQUFBLEdBQUEsZ0JBQUE7QUFDQTtBQUFBLFlBQUEsS0FBQTtBQUVBLHNCQUFBLFdBQUEsU0FBQSxDQUFBLEdBQUEsZUFBQTtBQUNBO0FBQUEsWUFBQSxLQUFBO0FBRUEsc0JBQUEsV0FBQSxTQUFBLENBQUEsR0FBQSxRQUFBO0FBQ0E7QUFBQSxVQUFBO0FBR0osY0FBQSxTQUFBLG1CQUFBLG9CQUFBLG1CQUFBLHFCQUFBO0FBQ0Usc0JBQUEsU0FBQSxLQUFBO0FBQ0E7QUFBQSxVQUFBO0FBQUEsUUFDRixDQUFBO0FBR0YsY0FBQSxhQUFBLFNBQUEsaUJBQUEsb0JBQUE7QUFDQSxtQkFBQSxRQUFBLE9BQUEsY0FBQTtBQUNFLGdCQUFBLFFBQUEsb0JBQUEsU0FBQSxHQUFBLFlBQUEsS0FBQTtBQUNBLGdCQUFB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
content;