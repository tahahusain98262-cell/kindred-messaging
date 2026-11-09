/**
 * Kindred — Two-Way Inbox & AI Assistant Module (inbox.js)
 * Conversation threads, message timeline, AI smart reply recommendations,
 * customer reply simulation, automated STOP opt-out suppression handling,
 * and live synchronization with Twilio real carrier test SMS & inbound replies.
 */

window.KINDRED_INBOX = (() => {
  const { $, $$, on, escapeHtml, maskPhone, showToast } = window.KINDRED_UTILS;

  let activeConversationId = "conv-1";
  let pollInterval = null;

  /**
   * Get active conversation object
   */
  function getActiveConversation() {
    const list = window.KINDRED_DATA.conversations || [];
    return list.find(c => c.id === activeConversationId) || list[0];
  }

  /**
   * Fetch real messages & webhook status receipts from /api/messages
   */
  async function fetchRealMessages() {
    try {
      const res = await fetch("/api/messages?limit=50");
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !Array.isArray(data.messages) || data.messages.length === 0) return;

      const conversations = window.KINDRED_DATA.conversations || [];
      const suppressions = data.suppressions || [];

      // Group messages by recipient or sender phone
      const phoneMap = {};
      data.messages.forEach(msg => {
        const phone = msg.to || msg.from;
        if (!phone) return;
        if (!phoneMap[phone]) phoneMap[phone] = [];
        phoneMap[phone].push(msg);
      });

      let stateChanged = false;

      // For each phone, merge into existing or create new thread
      Object.keys(phoneMap).forEach(phone => {
        let conv = conversations.find(c => c.phone === phone);
        if (!conv) {
          const contact = (window.KINDRED_DATA.contacts || []).find(c => c.phone === phone);
          const contactName = contact ? contact.name : `US Test Borrower (${phone})`;

          conv = {
            id: `conv-real-${phone.replace(/\D/g, "")}`,
            contactId: contact ? contact.id : `ct-${Date.now()}`,
            contactName,
            phone,
            channel: "SMS",
            status: "Delivered",
            intent: "Live Test Verification",
            confidence: "99%",
            suggestedReply: "Thank you for confirming receipt of our Kindred test SMS! Please let us know if you need any assistance.",
            citation: "Twilio Pilot Test Allowlist Protocol",
            lastUpdated: "Just now",
            unread: false,
            isRealThread: true,
            messages: []
          };
          conversations.unshift(conv);
          stateChanged = true;
        }

        // Sort server messages ascending by timestamp
        const serverMsgs = phoneMap[phone].slice().reverse();

        serverMsgs.forEach(m => {
          const existing = conv.messages.find(local => (local.sid && local.sid === m.sid) || local.id === m.id);
          if (!existing) {
            conv.messages.push({
              id: m.sid || m.id || `m-${Date.now()}`,
              sid: m.sid,
              sender: m.direction === "inbound" ? conv.contactName : "Kindred Agent",
              direction: m.direction,
              channel: "SMS",
              text: m.body,
              timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
              status: m.status || "delivered"
            });
            if (m.direction === "inbound") {
              conv.status = "Needs Reply";
              conv.unread = true;
            }
            stateChanged = true;
          } else if (existing && m.status && existing.status !== m.status) {
            existing.status = m.status;
            stateChanged = true;
          }
        });

        // Check if phone is in suppression list
        const isOptedOut = suppressions.some(s => s.phone === phone);
        if (isOptedOut && conv.status !== "Suppressed") {
          conv.status = "Suppressed";
          stateChanged = true;
        }
      });

      if (stateChanged) {
        window.KINDRED_DATA.saveState();
        render();
      }
    } catch (err) {
      // Backend not running or static preview mode
    }
  }

  /**
   * Render thread list (left pane)
   */
  function renderThreadList() {
    const container = $("#inbox-threads-container");
    if (!container) return;

    const list = window.KINDRED_DATA.conversations || [];

    container.innerHTML = list.map(conv => {
      const isActive = conv.id === activeConversationId;
      const lastMsg = conv.messages[conv.messages.length - 1];
      const snippet = lastMsg ? lastMsg.text : "No messages yet.";

      // Channel tag
      const channelBadge = conv.channel === "WhatsApp"
        ? `<span class="badge" style="background:#e4eee1; color:#3b7044;">WhatsApp</span>`
        : `<span class="badge" style="background:#e8edda; color:#5c6b3b;">SMS</span>`;

      // Status pill
      let statusStyle = "color: var(--muted); background: #eeeee6;";
      if (conv.status === "Needs Reply") statusStyle = "color: var(--orange); background: var(--orange-subtle);";
      if (conv.status === "Responded" || conv.status === "Delivered") statusStyle = "color: var(--green); background: var(--green-subtle);";
      if (conv.status === "Escalate to Human" || conv.status === "Suppressed") statusStyle = "color: var(--red); background: var(--red-subtle);";

      const realBadge = conv.isRealThread ? `<span class="badge" style="background:var(--lime-subtle); color:var(--lime-dark); font-size:0.625rem;">LIVE CARRIER</span>` : "";

      return `
        <div class="inbox-thread-item ${isActive ? "active" : ""}" data-conv-id="${escapeHtml(conv.id)}">
          <div class="thread-item-top">
            <span class="thread-name">${escapeHtml(conv.contactName)}</span>
            <span class="thread-time">${escapeHtml(conv.lastUpdated)}</span>
          </div>
          <div class="thread-snippet">${escapeHtml(snippet)}</div>
          <div class="thread-tags">
            ${channelBadge}
            ${realBadge}
            <span class="badge" style="${statusStyle}">${escapeHtml(conv.status)}</span>
            ${conv.unread ? `<span style="width:6px; height:6px; border-radius:50%; background:var(--lime-dark); margin-left:auto;"></span>` : ""}
          </div>
        </div>
      `;
    }).join("");

    // Bind thread click handlers
    $$(".inbox-thread-item", container).forEach(item => {
      on(item, "click", () => {
        activeConversationId = item.dataset.convId;
        const conv = getActiveConversation();
        if (conv) conv.unread = false;
        window.KINDRED_DATA.saveState();
        render();
      });
    });
  }

  /**
   * Render active conversation detail (right pane)
   */
  function renderDetail() {
    const conv = getActiveConversation();
    if (!conv) return;

    // Contact Header
    const nameEl = $("#inbox-detail-name");
    const metaEl = $("#inbox-detail-meta");
    if (nameEl) nameEl.textContent = conv.contactName;
    if (metaEl) metaEl.textContent = `${conv.phone} · Channel: ${conv.channel} · Intent: ${conv.intent}`;

    // Check contact suppression status
    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === conv.contactId || c.phone === conv.phone);
    const isSuppressed = conv.status === "Suppressed" || (contact && (contact.status === "Opted-Out" || (contact.consentStatus || "").includes("Suppressed")));

    const suppressionBanner = $("#inbox-suppression-banner");
    const inputField = $("#inbox-reply-input");
    const sendBtn = $("#btn-send-inbox-reply");
    const aiCard = $("#inbox-ai-card");

    if (suppressionBanner) {
      if (isSuppressed) {
        suppressionBanner.classList.add("active");
        suppressionBanner.innerHTML = `
          <span>✕</span>
          <span><strong>Contact Suppressed:</strong> ${escapeHtml(conv.contactName)} opted out via STOP. Outbound messaging is strictly locked.</span>
        `;
      } else {
        suppressionBanner.classList.remove("active");
      }
    }

    if (inputField) {
      inputField.disabled = !!isSuppressed;
      inputField.placeholder = isSuppressed
        ? "Messaging disabled — recipient has opted out."
        : "Type your reply to " + conv.contactName + "...";
    }
    if (sendBtn) sendBtn.disabled = !!isSuppressed;

    // AI Smart Reply Card
    if (aiCard) {
      if (isSuppressed || conv.status === "Responded") {
        aiCard.style.display = "none";
      } else {
        aiCard.style.display = "block";
        const intentEl = $("#ai-card-intent");
        const confEl = $("#ai-card-confidence");
        const textEl = $("#ai-card-text");
        const citeEl = $("#ai-card-citation");

        if (intentEl) intentEl.textContent = conv.intent;
        if (confEl) confEl.textContent = conv.confidence;
        if (textEl) textEl.textContent = conv.suggestedReply;
        if (citeEl) citeEl.innerHTML = `<span>✳ Citation:</span> <em>${escapeHtml(conv.citation)}</em>`;
      }
    }

    // Message Timeline
    const timeline = $("#inbox-messages-timeline");
    if (timeline) {
      timeline.innerHTML = conv.messages.map(msg => {
        let statusBadge = "";
        if (msg.direction === "outbound") {
          const st = (msg.status || "delivered").toLowerCase();
          if (st === "delivered") statusBadge = `<span style="color:var(--lime-dark);">✓✓ delivered</span>`;
          else if (st === "sent") statusBadge = `<span style="color:var(--ink-secondary);">✓ sent to carrier</span>`;
          else if (st === "queued") statusBadge = `<span style="color:var(--muted);">⏳ queued</span>`;
          else if (st === "failed") statusBadge = `<span style="color:var(--red);">✕ failed</span>`;
          else statusBadge = `<span>${escapeHtml(st)}</span>`;
        }

        return `
          <div class="msg-row ${escapeHtml(msg.direction)}">
            <div class="msg-bubble">
              ${escapeHtml(msg.text)}
            </div>
            <div class="msg-meta">
              <span>${escapeHtml(msg.timestamp)}</span>
              ${statusBadge}
            </div>
          </div>
        `;
      }).join("");

      timeline.scrollTop = timeline.scrollHeight;
    }
  }

  /**
   * Send agent reply
   */
  async function sendReply() {
    const input = $("#inbox-reply-input");
    if (!input || !input.value.trim()) return;

    const conv = getActiveConversation();
    if (!conv) return;

    const text = input.value.trim();

    // If this is a real SMS test conversation, dispatch via /api/send-sms
    if (conv.isRealThread && conv.channel === "SMS") {
      try {
        showToast("Dispatching agent reply via Twilio...", "info");
        const res = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: conv.phone,
            body: text,
            channel: "sms",
            consent: true
          })
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(`Send failed: ${data.message || "Twilio error"}`, "warning");
          return;
        }

        const newMsg = {
          id: data.sid || "m-" + Date.now(),
          sid: data.sid,
          sender: "Kindred Agent",
          direction: "outbound",
          channel: "SMS",
          text,
          timestamp: "Just now",
          status: data.status || "delivered"
        };
        conv.messages.push(newMsg);
        conv.status = "Responded";
        conv.lastUpdated = "Just now";

        window.KINDRED_DATA.addAuditLog("AGENT_REPLY_SENT", `Sent real SMS reply to ${conv.contactName} (${conv.phone})`);
        window.KINDRED_DATA.saveState();

        input.value = "";
        render();
        showToast(`Reply delivered to ${conv.contactName}!`, "success");
        return;
      } catch (e) {
        console.warn("[Kindred Send Real Reply]", e);
      }
    }

    // Default prototype simulated reply
    const newMsg = {
      id: "m-" + Date.now(),
      sender: "Kindred Agent",
      direction: "outbound",
      channel: conv.channel,
      text,
      timestamp: "Just now",
      status: "delivered"
    };

    conv.messages.push(newMsg);
    conv.status = "Responded";
    conv.lastUpdated = "Just now";

    window.KINDRED_DATA.addAuditLog("AGENT_REPLY_SENT", `Sent reply to ${conv.contactName} via ${conv.channel}`);
    window.KINDRED_DATA.saveState();

    input.value = "";
    render();
    showToast(`Reply delivered to ${conv.contactName}!`, "success");
  }

  /**
   * Simulate inbound customer reply
   */
  function simulateCustomerReply() {
    const conv = getActiveConversation();
    if (!conv) return;

    const simulatedPrompts = [
      "Thanks! Could you also let me know what closing costs typically run on that product?",
      "Understood. Does that rate require points at closing?",
      "Thank you for the quick note. I will review this with my co-borrower tonight."
    ];
    const randomReply = simulatedPrompts[Math.floor(Math.random() * simulatedPrompts.length)];

    const inboundMsg = {
      id: "m-" + Date.now(),
      sender: conv.contactName,
      direction: "inbound",
      channel: conv.channel,
      text: randomReply,
      timestamp: "Just now",
      status: "received"
    };

    conv.messages.push(inboundMsg);
    conv.status = "Needs Reply";
    conv.lastUpdated = "Just now";
    conv.unread = true;

    window.KINDRED_DATA.addAuditLog("INBOUND_MESSAGE_RECEIVED", `Inbound reply from ${conv.contactName}: "${randomReply.slice(0, 35)}..."`);
    window.KINDRED_DATA.saveState();

    render();
    showToast(`New inbound reply from ${conv.contactName}`, "info");
  }

  /**
   * Simulate customer texting STOP
   */
  function simulateInboundStop() {
    const conv = getActiveConversation();
    if (!conv) return;

    const stopMsg = {
      id: "m-" + Date.now(),
      sender: conv.contactName,
      direction: "inbound",
      channel: conv.channel,
      text: "STOP",
      timestamp: "Just now",
      status: "received"
    };

    conv.messages.push(stopMsg);
    conv.status = "Suppressed";
    conv.lastUpdated = "Just now";

    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === conv.contactId || c.phone === conv.phone);
    if (contact) {
      contact.status = "Opted-Out";
      contact.consentStatus = "Suppressed (Opted Out)";
      if (!contact.tags.includes("Suppressed")) {
        contact.tags.push("Suppressed");
      }
    }

    window.KINDRED_DATA.addAuditLog("SUPPRESSION_TRIGGERED", `Inbound 'STOP' received from ${conv.contactName} (${conv.phone}). Contact added to global suppression list.`);
    window.KINDRED_DATA.saveState();

    render();
    if (window.KINDRED_CONTACTS?.render) window.KINDRED_CONTACTS.render();
    if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();

    showToast(`STOP received from ${conv.contactName}. Contact suppressed immediately.`, "warning");
  }

  /**
   * Insert AI recommendation into composer
   */
  function insertAiSuggestion() {
    const conv = getActiveConversation();
    const input = $("#inbox-reply-input");
    if (!conv || !input) return;

    input.value = conv.suggestedReply;
    input.focus();
    showToast("AI response inserted into editor for review.");
  }

  /**
   * Complete render
   */
  function render() {
    renderThreadList();
    renderDetail();
  }

  /**
   * Initialize inbox event bindings
   */
  function init() {
    // Send button
    const sendBtn = $("#btn-send-inbox-reply");
    if (sendBtn) {
      on(sendBtn, "click", (e) => {
        e.preventDefault();
        sendReply();
      });
    }

    // Input Enter key press
    const input = $("#inbox-reply-input");
    if (input) {
      on(input, "keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendReply();
        }
      });
    }

    // AI Insert button
    const btnInsertAi = $("#btn-insert-ai-reply");
    if (btnInsertAi) {
      on(btnInsertAi, "click", insertAiSuggestion);
    }

    // Simulation triggers
    const btnSimCustomer = $("#btn-sim-customer-reply");
    if (btnSimCustomer) {
      on(btnSimCustomer, "click", simulateCustomerReply);
    }

    const btnSimStop = $("#btn-sim-inbound-stop");
    if (btnSimStop) {
      on(btnSimStop, "click", simulateInboundStop);
    }

    render();
    fetchRealMessages();

    // Periodic check for new real inbound SMS or webhook status updates
    if (!pollInterval) {
      pollInterval = setInterval(fetchRealMessages, 6000);
    }
  }

  return {
    init,
    render,
    fetchRealMessages,
    sendReply,
    simulateCustomerReply,
    simulateInboundStop,
    insertAiSuggestion
  };
})();
