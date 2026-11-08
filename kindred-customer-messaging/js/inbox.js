/**
 * Kindred — Two-Way Inbox & AI Assistant Module (inbox.js)
 * Conversation threads, message timeline, AI smart reply recommendations,
 * customer reply simulation, and automated STOP opt-out suppression handling.
 */

window.KINDRED_INBOX = (() => {
  const { $, $$, on, escapeHtml, maskPhone, showToast } = window.KINDRED_UTILS;

  let activeConversationId = "conv-1";

  /**
   * Get active conversation object
   */
  function getActiveConversation() {
    const list = window.KINDRED_DATA.conversations || [];
    return list.find(c => c.id === activeConversationId) || list[0];
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
      if (conv.status === "Responded") statusStyle = "color: var(--green); background: var(--green-subtle);";
      if (conv.status === "Escalate to Human") statusStyle = "color: var(--red); background: var(--red-subtle);";

      return `
        <div class="inbox-thread-item ${isActive ? "active" : ""}" data-conv-id="${escapeHtml(conv.id)}">
          <div class="thread-item-top">
            <span class="thread-name">${escapeHtml(conv.contactName)}</span>
            <span class="thread-time">${escapeHtml(conv.lastUpdated)}</span>
          </div>
          <div class="thread-snippet">${escapeHtml(snippet)}</div>
          <div class="thread-tags">
            ${channelBadge}
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
    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === conv.contactId);
    const isSuppressed = contact && (contact.status === "Opted-Out" || contact.consentStatus.includes("Suppressed"));

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
      timeline.innerHTML = conv.messages.map(msg => `
        <div class="msg-row ${escapeHtml(msg.direction)}">
          <div class="msg-bubble">
            ${escapeHtml(msg.text)}
          </div>
          <div class="msg-meta">
            <span>${escapeHtml(msg.timestamp)}</span>
            ${msg.direction === "outbound" ? `<span style="color:var(--lime-dark);">✓✓ ${escapeHtml(msg.status)}</span>` : ""}
          </div>
        </div>
      `).join("");

      // Auto scroll to bottom of messages
      timeline.scrollTop = timeline.scrollHeight;
    }
  }

  /**
   * Send agent reply
   */
  function sendReply() {
    const input = $("#inbox-reply-input");
    if (!input || !input.value.trim()) return;

    const conv = getActiveConversation();
    if (!conv) return;

    const text = input.value.trim();
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

    // Append STOP message
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

    // Suppress contact globally in state
    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === conv.contactId);
    if (contact) {
      contact.status = "Opted-Out";
      contact.consentStatus = "Suppressed (Opted Out)";
      contact.tags.push("Suppressed");
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
  }

  return {
    init,
    render,
    sendReply,
    simulateCustomerReply,
    simulateInboundStop,
    insertAiSuggestion
  };
})();

