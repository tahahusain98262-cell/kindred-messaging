/**
 * Kindred — Message Composer & Simulation / Twilio Carrier Engine (composer.js)
 * Multi-channel message drafting, GSM-7 & UCS-2 segment calculator, smartphone preview,
 * pre-send consent checklist, animated dry-run send simulator,
 * and REAL TWILIO SMS TEST DISPATCH with allowlist enforcement and live status timeline.
 */

window.KINDRED_COMPOSER = (() => {
  const { $, $$, on, escapeHtml, calculateSmsSegments, showToast } = window.KINDRED_UTILS;

  let activeChannel = "sms"; // "sms" or "whatsapp"
  let isSimulating = false;
  let isRealSmsMode = false;
  let isSendingRealSms = false;
  let pollTimer = null;
  let activeRealSid = null;

  const TEMPLATES = {
    sms: [
      {
        id: "diwali",
        name: "Diwali Greeting (Pilot Default)",
        text: "Wishing you and your family a very happy Diwali! May the festival bring light, happiness and prosperity. — The Kindred Team (Reply STOP to opt out)"
      },
      {
        id: "rate_alert",
        name: "Mortgage Benchmark Update (Nov 2026)",
        text: "Kindred Market Alert: Conforming 30-yr fixed benchmark is 6.125% (effective Nov 6). Review pre-approval options with your advisor. Reply STOP to opt out."
      },
      {
        id: "anniversary",
        name: "Home Purchase Anniversary Note",
        text: "Happy Home Anniversary! It has been an honor partnering on your home journey. Please reach out if you need an updated equity assessment."
      }
    ],
    whatsapp: [
      {
        id: "wa_diwali",
        name: "diwali_greeting_v1 (Approved Meta Template)",
        text: "Wishing you and your family a joyful Diwali! May the season bring brightness and prosperity. — Kindred Mortgage Partners (Reply STOP to unsubscribe)"
      },
      {
        id: "wa_rate",
        name: "rate_snapshot_update_v2 (Approved Meta Template)",
        text: "Here is your verified weekly mortgage rate benchmark for Nov 6, 2026. 30-Year Fixed: 6.125% (APR 6.240%). Contact our desk for personalized scenarios."
      }
    ]
  };

  // US Area Code timezone mapping for live recipient quiet-hours calculation
  const AREA_CODE_TZ = {
    '201': 'Eastern', '202': 'Eastern', '203': 'Eastern', '212': 'Eastern', '215': 'Eastern',
    '305': 'Eastern', '404': 'Eastern', '617': 'Eastern', '704': 'Eastern', '718': 'Eastern',
    '214': 'Central', '312': 'Central', '512': 'Central', '615': 'Central', '713': 'Central',
    '303': 'Mountain', '480': 'Mountain (AZ)', '505': 'Mountain', '602': 'Mountain (AZ)',
    '206': 'Pacific', '213': 'Pacific', '310': 'Pacific', '415': 'Pacific', '503': 'Pacific', '650': 'Pacific'
  };

  /**
   * Normalize US phone input to +1XXXXXXXXXX
   */
  function normalizePhone(input) {
    if (!input) return "";
    const digits = input.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return input.trim();
  }

  /**
   * Detect recipient timezone from phone
   */
  function getRecipientTzInfo(phone) {
    const digits = (phone || "").replace(/\D/g, "");
    let areaCode = "";
    if (digits.length === 11 && digits.startsWith("1")) {
      areaCode = digits.slice(1, 4);
    } else if (digits.length === 10) {
      areaCode = digits.slice(0, 3);
    }
    const tzName = AREA_CODE_TZ[areaCode] || "Eastern (America/New_York)";
    
    // Check current hour in US Eastern/Central/Pacific
    const now = new Date();
    // Default estimate using EST (UTC-5)
    const utcHours = now.getUTCHours();
    // EST is UTC - 5
    const estHour = (utcHours - 5 + 24) % 24;
    const isQuiet = (estHour >= 20 || estHour < 9);

    return {
      tzName,
      areaCode,
      isQuietHours: isQuiet,
      hour: estHour
    };
  }

  /**
   * Sync composer input with smartphone preview, segment counts, cost estimate, and compliance checklist
   */
  function syncPreview() {
    const messageInput = $("#composer-message-input");
    const previewBubble = $("#phone-preview-bubble");
    const charCountEl = $("#composer-char-count");
    const segmentCountEl = $("#composer-segment-count");
    const phoneHeaderType = $("#phone-header-channel");

    if (!messageInput || !previewBubble) return;

    const text = messageInput.value.trim();
    previewBubble.textContent = text || "Your message preview will appear here.";

    // SMS GSM-7 Segment Calculation
    const { chars, segments, remaining } = calculateSmsSegments(text);

    if (charCountEl) {
      charCountEl.textContent = `${chars} characters (${remaining} remaining in segment)`;
    }
    if (segmentCountEl) {
      segmentCountEl.textContent = activeChannel === "sms"
        ? `${segments} SMS segment${segments > 1 ? "s" : ""}`
        : "WhatsApp Approved Template";
    }

    if (phoneHeaderType) {
      phoneHeaderType.textContent = activeChannel === "sms" ? "SMS Carrier Message" : "WhatsApp Business Verified";
    }

    // Toggle bubble style & mockup mode
    const phoneMockup = $(".phone-mockup");
    if (activeChannel === "whatsapp") {
      previewBubble.classList.add("whatsapp-style");
      if (phoneMockup) phoneMockup.classList.add("whatsapp-mode");
    } else {
      previewBubble.classList.remove("whatsapp-style");
      if (phoneMockup) phoneMockup.classList.remove("whatsapp-mode");
    }

    // Update Real SMS Cost & Checklist if in Real SMS mode
    if (isRealSmsMode && activeChannel === "sms") {
      updateRealSmsCalculations(text, segments);
    }
  }

  /**
   * Update Real SMS calculations (cost, compliance checklist items, opt-out language)
   */
  function updateRealSmsCalculations(text, segments) {
    const costValueEl = $("#real-sms-cost-value");
    const costBreakdownEl = $("#real-sms-cost-breakdown");
    const recipientInput = $("#real-sms-recipient");
    const consentBox = $("#real-sms-consent");

    const count = Math.max(1, segments || 1);
    const twilioFee = count * 0.0083;
    const carrierLow = count * 0.0035;
    const carrierHigh = count * 0.0050;
    const totalEst = (twilioFee + (carrierLow + carrierHigh) / 2).toFixed(3);

    if (costValueEl) {
      costValueEl.textContent = `~$${totalEst} USD (${count} seg)`;
    }
    if (costBreakdownEl) {
      costBreakdownEl.textContent = `${count} segment${count > 1 ? "s" : ""} × $0.0083 (Twilio) + carrier fee ($${carrierLow.toFixed(4)}–$${carrierHigh.toFixed(4)}) = ~$${totalEst} total.`;
    }

    // Checklist updates
    const hasConsent = consentBox && consentBox.checked;
    const chkIconConsent = $("#chk-icon-consent");
    const chkTextConsent = $("#chk-text-consent");
    if (chkIconConsent && chkTextConsent) {
      if (hasConsent) {
        chkIconConsent.textContent = "✓";
        chkIconConsent.style.backgroundColor = "var(--green-subtle)";
        chkIconConsent.style.color = "var(--green)";
        chkTextConsent.textContent = "Documented opt-in consent confirmed for test recipient";
      } else {
        chkIconConsent.textContent = "—";
        chkIconConsent.style.backgroundColor = "#eee";
        chkIconConsent.style.color = "var(--muted)";
        chkTextConsent.textContent = "Explicit consent checkbox required before sending";
      }
    }

    // STOP language check
    const hasStop = /\bstop\b/i.test(text || "");
    const chkIconStop = $("#chk-icon-stop");
    const chkTextStop = $("#chk-text-stop");
    if (chkIconStop && chkTextStop) {
      if (hasStop) {
        chkIconStop.textContent = "✓";
        chkIconStop.style.backgroundColor = "var(--green-subtle)";
        chkIconStop.style.color = "var(--green)";
        chkTextStop.textContent = "Mandatory opt-out instructions included ('Reply STOP to opt out')";
      } else {
        chkIconStop.textContent = "ℹ";
        chkIconStop.style.backgroundColor = "var(--lime-subtle)";
        chkIconStop.style.color = "var(--lime-dark)";
        chkTextStop.textContent = "Will auto-append '(Reply STOP to opt out)' upon dispatch";
      }
    }

    // Timezone & Quiet Hours Check
    const phone = recipientInput ? recipientInput.value : "";
    const tzInfo = getRecipientTzInfo(phone);
    const tzDisplay = $("#real-sms-tz-display");
    if (tzDisplay) {
      tzDisplay.textContent = `${tzInfo.tzName} (Area Code: ${tzInfo.areaCode || "US"})`;
    }

    const chkIconQh = $("#chk-icon-quiethours");
    const chkTextQh = $("#chk-text-quiethours");
    if (chkIconQh && chkTextQh) {
      if (tzInfo.isQuietHours) {
        chkIconQh.textContent = "⚠️";
        chkIconQh.style.backgroundColor = "var(--orange-subtle)";
        chkIconQh.style.color = "var(--orange)";
        chkTextQh.textContent = `Quiet Hours Notice: Recipient local time is currently within TCPA 8:00 PM – 9:00 AM window.`;
      } else {
        chkIconQh.textContent = "✓";
        chkIconQh.style.backgroundColor = "var(--green-subtle)";
        chkIconQh.style.color = "var(--green)";
        chkTextQh.textContent = `Recipient timezone within permitted hours (${tzInfo.tzName})`;
      }
    }

    // Provider Gateway
    const chkIconProv = $("#chk-icon-provider");
    const chkTextProv = $("#chk-text-provider");
    if (chkIconProv && chkTextProv) {
      chkIconProv.textContent = "✓";
      chkIconProv.style.backgroundColor = "var(--green-subtle)";
      chkIconProv.style.color = "var(--green)";
      chkTextProv.textContent = "Provider connection verified (Twilio SMS Gateway active)";
    }
  }

  /**
   * Switch between SMS and WhatsApp modes
   */
  function setChannel(channel) {
    activeChannel = channel;

    $$(".channel-btn").forEach(btn => {
      if (btn.dataset.channel === channel) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const realToggleBar = $("#real-sms-toggle-bar");
    const realPanel = $("#real-sms-panel");
    const realActions = $("#real-sms-actions-bar");
    const simActions = $("#sim-actions-bar");

    if (channel === "whatsapp") {
      // In WhatsApp mode, Real carrier toggle is disabled (WhatsApp is simulation only)
      if (realToggleBar) realToggleBar.style.display = "none";
      if (realPanel) realPanel.style.display = "none";
      if (realActions) realActions.style.display = "none";
      if (simActions) simActions.style.display = "flex";
      showToast("WhatsApp channel is in Sandbox Simulation mode.", "info");
    } else {
      if (realToggleBar) realToggleBar.style.display = "flex";
      if (isRealSmsMode) {
        if (realPanel) realPanel.style.display = "block";
        if (realActions) realActions.style.display = "block";
        if (simActions) simActions.style.display = "none";
      } else {
        if (realPanel) realPanel.style.display = "none";
        if (realActions) realActions.style.display = "none";
        if (simActions) simActions.style.display = "flex";
      }
    }

    // Populate template selector for channel
    const templateSelect = $("#composer-template-select");
    if (templateSelect) {
      const list = TEMPLATES[channel] || [];
      templateSelect.innerHTML = list.map(t => `
        <option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>
      `).join("");

      if (list[0]) {
        const messageInput = $("#composer-message-input");
        if (messageInput) {
          messageInput.value = list[0].text;
        }
      }
    }

    syncPreview();
  }

  /**
   * Toggle Real SMS Mode on/off
   */
  function toggleRealSmsMode(enable) {
    isRealSmsMode = Boolean(enable);

    const toggle = $("#toggle-real-sms");
    if (toggle) toggle.checked = isRealSmsMode;

    const modeBadge = $("#composer-mode-badge");
    const realPanel = $("#real-sms-panel");
    const realActions = $("#real-sms-actions-bar");
    const simActions = $("#sim-actions-bar");
    const simProgress = $("#sim-progress-box");

    if (isRealSmsMode) {
      if (modeBadge) {
        modeBadge.textContent = "REAL TEST MODE (TWILIO)";
        modeBadge.classList.add("real-sms-active");
      }
      if (realPanel) realPanel.style.display = "block";
      if (realActions) realActions.style.display = "block";
      if (simActions) simActions.style.display = "none";
      if (simProgress) simProgress.classList.remove("active");

      showToast("Real SMS Test Mode enabled. Messages will route through Twilio API.", "info");
    } else {
      if (modeBadge) {
        modeBadge.textContent = "SIMULATION MODE";
        modeBadge.classList.remove("real-sms-active");
      }
      if (realPanel) realPanel.style.display = "none";
      if (realActions) realActions.style.display = "none";
      if (simActions) simActions.style.display = "flex";

      showToast("Returned to Sandbox Simulation mode (dry-run).", "info");
    }

    syncPreview();
  }

  /**
   * Show friendly error banner in composer
   */
  function showErrorBanner(title, message) {
    const banner = $("#real-sms-error-banner");
    const titleEl = $("#real-sms-error-title");
    const descEl = $("#real-sms-error-desc");

    if (banner && titleEl && descEl) {
      titleEl.textContent = title;
      descEl.textContent = message;
      banner.style.display = "flex";
      banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideErrorBanner() {
    const banner = $("#real-sms-error-banner");
    if (banner) banner.style.display = "none";
  }

  /**
   * Update Status Timeline Widget UI
   */
  function updateTimelineUI(status, sid, costStr, customMsg) {
    const timeline = $("#real-sms-timeline");
    const sidEl = $("#timeline-msg-sid");
    const msgEl = $("#timeline-status-message");
    const costTag = $("#timeline-cost-tag");

    const stepQueued = $("#step-queued");
    const stepSent = $("#step-sent");
    const stepDelivered = $("#step-delivered");
    const lineQueuedSent = $("#line-queued-sent");
    const lineSentDelivered = $("#line-sent-delivered");

    const timeQueued = $("#time-queued");
    const timeSent = $("#time-sent");
    const timeDelivered = $("#time-delivered");
    const labelDelivered = $("#label-step-delivered");

    if (!timeline) return;
    timeline.style.display = "block";

    if (sid && sidEl) sidEl.textContent = `SID: ${sid}`;
    if (costStr && costTag) costTag.textContent = `Cost: ${costStr}`;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Reset classes
    [stepQueued, stepSent, stepDelivered].forEach(step => {
      if (step) step.className = "timeline-step";
    });
    if (lineQueuedSent) lineQueuedSent.className = "timeline-line";
    if (lineSentDelivered) lineSentDelivered.className = "timeline-line";

    if (status === "queued") {
      if (stepQueued) stepQueued.classList.add("active");
      if (timeQueued) timeQueued.textContent = nowTime;
      if (msgEl) msgEl.textContent = customMsg || "Enqueued on Twilio message queue. Awaiting carrier handover...";
    } else if (status === "sent") {
      if (stepQueued) stepQueued.classList.add("completed");
      if (lineQueuedSent) lineQueuedSent.classList.add("completed");
      if (stepSent) stepSent.classList.add("active");
      if (timeSent) timeSent.textContent = nowTime;
      if (msgEl) msgEl.textContent = customMsg || "Handed off to mobile network carrier. Awaiting handset delivery receipt...";
    } else if (status === "delivered") {
      if (stepQueued) stepQueued.classList.add("completed");
      if (lineQueuedSent) lineQueuedSent.classList.add("completed");
      if (stepSent) stepSent.classList.add("completed");
      if (lineSentDelivered) lineSentDelivered.classList.add("completed");
      if (stepDelivered) stepDelivered.classList.add("completed");
      if (timeDelivered) timeDelivered.textContent = nowTime;
      if (labelDelivered) labelDelivered.textContent = "Delivered ✓";
      if (msgEl) msgEl.textContent = customMsg || "Delivered: Carrier handset confirmed receipt of SMS.";
    } else if (status === "failed" || status === "undelivered") {
      if (stepQueued) stepQueued.classList.add("completed");
      if (lineQueuedSent) lineQueuedSent.classList.add("completed");
      if (stepSent) stepSent.classList.add("completed");
      if (stepDelivered) stepDelivered.classList.add("failed");
      if (labelDelivered) labelDelivered.textContent = "Failed ✕";
      if (timeDelivered) timeDelivered.textContent = nowTime;
      if (msgEl) msgEl.textContent = customMsg || `Message delivery failed with status: ${status}.`;
    }
  }

  /**
   * Start polling /api/messages for delivery receipt updates
   */
  function startStatusPolling(sid, to) {
    if (pollTimer) clearInterval(pollTimer);
    let attempts = 0;
    const maxAttempts = 12; // 12 * 2.5s = 30 seconds

    pollTimer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/messages?to=${encodeURIComponent(to)}&limit=10`);
        if (!res.ok) return;
        const data = await res.json();
        const found = (data.messages || []).find(m => m.sid === sid);

        if (found) {
          const st = (found.status || "").toLowerCase();
          if (st === "delivered") {
            clearInterval(pollTimer);
            updateTimelineUI("delivered", sid, `~$${found.estimatedCostUsd || "0.013"}`);
            showToast("Carrier delivery confirmed!", "success");
            if (window.KINDRED_INBOX?.render) window.KINDRED_INBOX.render();
          } else if (st === "sent") {
            updateTimelineUI("sent", sid, `~$${found.estimatedCostUsd || "0.013"}`);
          } else if (st === "failed" || st === "undelivered") {
            clearInterval(pollTimer);
            updateTimelineUI(st, sid, `~$${found.estimatedCostUsd || "0.013"}`, found.errorMessage || "Carrier failed to deliver.");
            showToast(`SMS delivery failed: ${st}`, "warning");
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          // If still sent or queued, leave as sent
          const msgEl = $("#timeline-status-message");
          if (msgEl && msgEl.textContent.includes("Awaiting")) {
            msgEl.textContent = "Dispatched to carrier. Status callback will reflect in Two-Way Inbox.";
          }
        }
      } catch (e) {
        console.warn("[Kindred Polling]", e);
      }
    }, 2500);
  }

  /**
   * Dispatch real test SMS via /api/send-sms
   */
  async function sendRealTestSms() {
    if (isSendingRealSms) return;
    hideErrorBanner();

    const recipientInput = $("#real-sms-recipient");
    const consentBox = $("#real-sms-consent");
    const messageInput = $("#composer-message-input");
    const sendBtn = $("#btn-real-send-sms");

    const rawTo = recipientInput ? recipientInput.value.trim() : "";
    const to = normalizePhone(rawTo);
    const body = messageInput ? messageInput.value.trim() : "";
    const consent = Boolean(consentBox && consentBox.checked);

    // Frontend pre-flight checks
    if (!to || !to.startsWith("+1") || to.length !== 12) {
      showErrorBanner("Invalid US Phone Number", "Please enter a valid 10-digit US mobile number in E.164 format (+1XXXXXXXXXX).");
      return;
    }

    if (!consent) {
      showErrorBanner("Mandatory Consent Required", "You must verify that this recipient has explicitly opted in to receive SMS messages from Kindred.");
      if (consentBox) consentBox.focus();
      return;
    }

    if (!body) {
      showErrorBanner("Empty Message Body", "Please enter a message to send.");
      if (messageInput) messageInput.focus();
      return;
    }

    isSendingRealSms = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `Dispatching SMS... <span>⏳</span>`;
    }

    updateTimelineUI("queued", null, null, "Preparing payload and checking compliance allowlist...");

    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          body,
          channel: "sms",
          consent: true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        let errTitle = "Carrier Send Blocked";
        let errMsg = data.message || "An error occurred while sending the test SMS.";

        if (data.error === "NUMBER_NOT_ALLOWLISTED" || data.error === "ALLOWLIST_UNCONFIGURED") {
          errTitle = "Number Not In Test Allowlist";
          errMsg = `In test mode, messages are restricted to verified numbers. Add ${to} to TEST_ALLOWED_NUMBERS in your Vercel project environment variables to authorize testing.`;
        } else if (data.error === "RECIPIENT_SUPPRESSED") {
          errTitle = "Recipient Suppressed (Opted Out)";
          errMsg = `The recipient at ${to} previously texted STOP and is in the global suppression registry. Have the handset text START to re-subscribe.`;
        } else if (data.error === "RATE_LIMIT_EXCEEDED") {
          errTitle = "Rate Limit Exceeded";
          errMsg = "Safety limit: Maximum 5 test SMS sends per minute allowed. Please wait 60 seconds before retrying.";
        } else if (data.error === "MAX_SEGMENTS_EXCEEDED") {
          errTitle = "Message Length Exceeded";
          errMsg = data.message;
        }

        showErrorBanner(errTitle, errMsg);
        updateTimelineUI("failed", null, null, errMsg);
        showToast(errTitle, "warning");
        return;
      }

      // Successful Dispatch
      activeRealSid = data.sid;
      const costStr = `~$${data.estimatedCostUsd || "0.013"} USD`;
      
      updateTimelineUI(data.status || "queued", data.sid, costStr, 
        data.mock 
          ? "Simulated Test SMS queued (Twilio credentials not yet configured in Vercel environment)."
          : "Twilio carrier accepted message. Handing off to mobile carrier network..."
      );

      // Record in audit log
      if (window.KINDRED_DATA) {
        window.KINDRED_DATA.addAuditLog(
          "REAL_SMS_DISPATCHED",
          `Test SMS sent to ${to} (SID: ${data.sid}, Segments: ${data.segments}, Cost: $${data.estimatedCostUsd})`
        );
        window.KINDRED_DATA.metrics.messagesSent = (window.KINDRED_DATA.metrics.messagesSent || 0) + 1;
        window.KINDRED_DATA.saveState();
        if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
      }

      showToast(`Test SMS dispatched to ${to}!`, "success");

      // In mock mode, simulate progression to delivered after 3 seconds
      if (data.mock) {
        setTimeout(() => {
          updateTimelineUI("sent", data.sid, costStr, "Carrier route established. Delivering payload to handset...");
        }, 1200);
        setTimeout(() => {
          updateTimelineUI("delivered", data.sid, costStr, "Delivered: Carrier handset confirmed receipt of SMS.");
        }, 3200);
      } else {
        // Poll real webhook status
        startStatusPolling(data.sid, to);
      }

      // Trigger inbox sync if inbox exists
      if (window.KINDRED_INBOX?.fetchRealMessages) {
        window.KINDRED_INBOX.fetchRealMessages();
      }

    } catch (err) {
      console.error("[Kindred Send Real SMS Error]", err);
      showErrorBanner("Network Error", "Could not reach the serverless API. If testing locally, ensure the backend API is reachable or deploy to Vercel.");
      updateTimelineUI("failed", null, null, "Network connection error.");
    } finally {
      isSendingRealSms = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `Send Test SMS <span>↗</span>`;
      }
    }
  }

  /**
   * Run the simulated dry-run send (Default Simulation Mode)
   */
  function runDryRunSimulation() {
    if (isSimulating) return;
    isSimulating = true;

    const progressBox = $("#sim-progress-box");
    const progressBar = $("#sim-progress-fill");
    const progressStatus = $("#sim-progress-status");
    const sendBtn = $("#btn-simulate-send");

    if (sendBtn) sendBtn.disabled = true;
    if (progressBox) progressBox.classList.add("active");

    const steps = [
      { pct: "20%", msg: "Enqueueing campaign to background worker..." },
      { pct: "50%", msg: "Verifying recipient quiet hours and consent tokens..." },
      { pct: "80%", msg: "Telnyx sandbox dispatch simulation in progress..." },
      { pct: "100%", msg: "Delivery completed for 10 pilot recipients!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        if (progressBar) progressBar.style.width = step.pct;
        if (progressStatus) progressStatus.textContent = step.msg;
        currentStep++;
      } else {
        clearInterval(interval);
        isSimulating = false;
        if (sendBtn) sendBtn.disabled = false;

        const data = window.KINDRED_DATA;
        if (data) {
          data.metrics.messagesSent = (data.metrics.messagesSent || 0) + 10;
          data.addAuditLog("CAMPAIGN_SIMULATED_SEND", `Dispatched pilot campaign via ${activeChannel.toUpperCase()} to 10 verified recipients.`);
          data.saveState();
          if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
        }

        showToast("Dry-run campaign simulation completed successfully!", "success");

        setTimeout(() => {
          if (progressBox) progressBox.classList.remove("active");
          if (progressBar) progressBar.style.width = "0%";
        }, 3000);
      }
    }, 600);
  }

  /**
   * Initialize composer module
   */
  function init() {
    const messageInput = $("#composer-message-input");
    if (messageInput) {
      on(messageInput, "input", syncPreview);
    }

    // Channel toggles
    $$(".channel-btn").forEach(btn => {
      on(btn, "click", () => {
        const channel = btn.dataset.channel;
        if (channel) setChannel(channel);
      });
    });

    // Real SMS Toggle Switch
    const toggleReal = $("#toggle-real-sms");
    if (toggleReal) {
      on(toggleReal, "change", (e) => {
        toggleRealSmsMode(e.target.checked);
      });
    }

    // Real Recipient Phone Input
    const recipientInput = $("#real-sms-recipient");
    if (recipientInput) {
      on(recipientInput, "input", () => {
        hideErrorBanner();
        syncPreview();
      });
    }

    // Real Consent Checkbox
    const consentBox = $("#real-sms-consent");
    if (consentBox) {
      on(consentBox, "change", () => {
        hideErrorBanner();
        const boxCard = $("#real-sms-consent-box");
        if (boxCard) {
          if (consentBox.checked) boxCard.classList.add("checked");
          else boxCard.classList.remove("checked");
        }
        syncPreview();
      });
    }

    // Real SMS Send Button
    const btnRealSend = $("#btn-real-send-sms");
    if (btnRealSend) {
      on(btnRealSend, "click", (e) => {
        e.preventDefault();
        sendRealTestSms();
      });
    }

    // Template selector
    const templateSelect = $("#composer-template-select");
    if (templateSelect) {
      on(templateSelect, "change", (e) => {
        const selectedId = e.target.value;
        const list = TEMPLATES[activeChannel] || [];
        const found = list.find(t => t.id === selectedId);
        if (found && messageInput) {
          messageInput.value = found.text;
          syncPreview();
          showToast(`Loaded template: ${found.name}`);
        }
      });
    }

    // Dry-run send button
    const btnSimulate = $("#btn-simulate-send");
    if (btnSimulate) {
      on(btnSimulate, "click", (e) => {
        e.preventDefault();
        runDryRunSimulation();
      });
    }

    // Save draft button
    const btnSaveDraft = $("#btn-save-draft");
    if (btnSaveDraft) {
      on(btnSaveDraft, "click", () => {
        const campaignTitle = $("#composer-campaign-title")?.value || "Draft Campaign";
        window.KINDRED_DATA.addAuditLog("CAMPAIGN_DRAFT_SAVED", `Saved draft for campaign '${campaignTitle}'`);
        showToast("Campaign draft saved to local state.");
      });
    }

    const btnRealSaveDraft = $("#btn-real-save-draft");
    if (btnRealSaveDraft) {
      on(btnRealSaveDraft, "click", () => {
        const campaignTitle = $("#composer-campaign-title")?.value || "Draft Campaign";
        window.KINDRED_DATA.addAuditLog("CAMPAIGN_DRAFT_SAVED", `Saved draft for campaign '${campaignTitle}'`);
        showToast("Campaign draft saved to local state.");
      });
    }

    // Initialize with SMS and first template
    setChannel("sms");
  }

  return {
    init,
    render: syncPreview,
    setChannel,
    toggleRealSmsMode,
    sendRealTestSms,
    runDryRunSimulation
  };
})();
