/**
 * Kindred — Shared Frontend Utilities (utils.js)
 * Safe DOM helpers, formatting, date utilities, and notification helpers.
 */

window.KINDRED_UTILS = (() => {
  /* ==========================================================================
     Safe DOM Selection Helpers
     ========================================================================== */

  /**
   * Safe single element selector
   * @param {string} selector - CSS selector
   * @param {Element|Document} [scope=document] - Search scope
   * @returns {Element|null}
   */
  function $(selector, scope = document) {
    if (!selector || typeof selector !== "string") return null;
    try {
      return scope.querySelector(selector);
    } catch (e) {
      console.warn("Invalid DOM selector:", selector, e);
      return null;
    }
  }

  /**
   * Safe multi-element selector (returns real Array)
   * @param {string} selector - CSS selector
   * @param {Element|Document} [scope=document] - Search scope
   * @returns {Array<Element>}
   */
  function $$(selector, scope = document) {
    if (!selector || typeof selector !== "string") return [];
    try {
      return Array.from(scope.querySelectorAll(selector));
    } catch (e) {
      console.warn("Invalid DOM selector:", selector, e);
      return [];
    }
  }

  /**
   * Safe event listener binder
   * @param {Element|Window|Document} target
   * @param {string} event
   * @param {Function} handler
   * @param {Object} [options]
   */
  function on(target, event, handler, options = false) {
    if (!target || typeof target.addEventListener !== "function") return;
    target.addEventListener(event, handler, options);
  }

  /* ==========================================================================
     Formatting Utilities
     ========================================================================== */

  /**
   * Escape HTML entities to prevent XSS in dynamic rendering
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Truncate text with trailing ellipsis
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  function truncate(str, maxLen = 60) {
    if (!str || typeof str !== "string") return "";
    return str.length > maxLen ? str.slice(0, maxLen).trim() + "…" : str;
  }

  /**
   * Mask phone number for privacy display (+1 (555) •••-0101)
   * @param {string} phone
   * @returns {string}
   */
  function maskPhone(phone) {
    if (!phone || typeof phone !== "string") return "+1 (•••) •••-••••";
    return phone.replace(/(\(\d{3}\)\s*)\d{3}/, "$1•••");
  }

  /**
   * Standardize phone format to +1 (XXX) XXX-XXXX
   * @param {string} rawPhone
   * @returns {string}
   */
  function formatPhone(rawPhone) {
    if (!rawPhone) return "";
    const cleaned = ("" + rawPhone).replace(/\D/g, "");
    const match = cleaned.match(/^(\d{1})?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      const country = match[1] ? `+${match[1]} ` : "+1 ";
      return `${country}(${match[2]}) ${match[3]}-${match[4]}`;
    }
    return rawPhone;
  }

  /**
   * Calculate SMS segments and character counters (GSM-7 standard)
   * @param {string} text
   * @returns {{chars: number, segments: number, remaining: number}}
   */
  function calculateSmsSegments(text) {
    const chars = text ? text.length : 0;
    if (chars === 0) return { chars: 0, segments: 0, remaining: 160 };
    if (chars <= 160) {
      return { chars, segments: 1, remaining: 160 - chars };
    }
    const segments = Math.ceil(chars / 153);
    const remaining = segments * 153 - chars;
    return { chars, segments, remaining };
  }

  /* ==========================================================================
     Date & Time Utilities
     ========================================================================== */

  /**
   * Format a date into a human readable string (e.g. "Nov 6, 2026")
   * @param {string|Date|number} dateInput
   * @param {Intl.DateTimeFormatOptions} [options]
   * @returns {string}
   */
  function formatDate(dateInput, options = {}) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const defaultOptions = {
      month: "short",
      day: "numeric",
      year: "numeric"
    };
    return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(date);
  }

  /**
   * Format time (e.g. "10:15 AM")
   * @param {string|Date|number} dateInput
   * @returns {string}
   */
  function formatTime(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  /**
   * Format relative time elapsed (e.g. "Just now", "12m ago", "3h ago", "Yesterday")
   * @param {string|Date|number} dateInput
   * @returns {string}
   */
  function timeAgo(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;

    return formatDate(date);
  }

  /* ==========================================================================
     Simple UI Notification Helper
     ========================================================================== */

  let toastTimeout = null;

  /**
   * Display a lightweight feedback toast
   * @param {string} message
   * @param {"info"|"success"|"warning"} [type="info"]
   */
  function showToast(message, type = "info") {
    let toast = $("#kindred-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "kindred-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translate(-50%, 16px);
        background-color: var(--paper-dark, #222720);
        color: #f5f5ed;
        border: 1px solid #3d4638;
        padding: 12px 18px;
        font-family: var(--font-sans, "DM Sans", sans-serif);
        font-size: 0.8125rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s ease;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      document.body.appendChild(toast);
    }

    const icon = type === "success" ? "✓" : type === "warning" ? "!" : "✳";
    toast.innerHTML = `<span style="color: var(--lime, #d6ed72); font-weight: bold;">${icon}</span><span>${escapeHtml(message)}</span>`;
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
    toast.style.pointerEvents = "auto";

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, 16px)";
      toast.style.pointerEvents = "none";
    }, 3000);
  }

  /**
   * Simple debounce helper
   * @param {Function} func
   * @param {number} wait
   * @returns {Function}
   */
  function debounce(func, wait = 200) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return {
    $,
    $$,
    on,
    escapeHtml,
    truncate,
    maskPhone,
    formatPhone,
    calculateSmsSegments,
    formatDate,
    formatTime,
    timeAgo,
    showToast,
    debounce
  };
})();
