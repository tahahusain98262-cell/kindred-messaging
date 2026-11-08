/**
 * Kindred — Message Composer & Simulation Engine (composer.js)
 * Multi-channel message drafting, GSM-7 segment calculator, smartphone preview,
 * pre-send consent checklist, and animated dry-run send simulator.
 */

window.KINDRED_COMPOSER = (() => {
  const { $, $$, on, escapeHtml, calculateSmsSegments, showToast } = window.KINDRED_UTILS;

  let activeChannel = "sms"; // "sms" or "whatsapp"
  let isSimulating = false;

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

  /**
   * Sync composer input with smartphone preview and counters
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

    // Toggle bubble style
    if (activeChannel === "whatsapp") {
      previewBubble.classList.add("whatsapp-style");
    } else {
      previewBubble.classList.remove("whatsapp-style");
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

    // Populate template selector for channel
    const templateSelect = $("#composer-template-select");
    if (templateSelect) {
      const list = TEMPLATES[channel] || [];
      templateSelect.innerHTML = list.map(t => `
        <option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>
      `).join("");

      // Apply first template text
      if (list[0]) {
        const messageInput = $("#composer-message-input");
        if (messageInput) {
          messageInput.value = list[0].text;
        }
      }
    }

    syncPreview();
    showToast(`Switched composer to ${channel.toUpperCase()} mode.`);
  }

  /**
   * Run the simulated dry-run send
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

        // Update synthetic demo state
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

    // Initialize with SMS and first template
    setChannel("sms");
  }

  return {
    init,
    render: syncPreview,
    setChannel,
    runDryRunSimulation
  };
})();

