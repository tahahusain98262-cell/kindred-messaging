/**
 * Kindred — Campaign Management Module (campaigns.js)
 * Full campaign lifecycle: create, edit, delete with confirmation,
 * filter by status (Draft, Scheduled, Completed), and composer handoff.
 */

window.KINDRED_CAMPAIGNS = (() => {
  const { $, $$, on, escapeHtml, showToast } = window.KINDRED_UTILS;

  let currentFilter = "all";

  /**
   * Filter campaigns
   */
  function getFilteredCampaigns() {
    const list = window.KINDRED_DATA.campaigns || [];
    if (currentFilter === "all") return list;
    return list.filter(c => c.status === currentFilter);
  }

  /**
   * Render campaigns grid
   */
  function render() {
    const container = $("#campaigns-grid-container");
    const countDisplay = $("#campaigns-count-display");
    if (!container) return;

    const filtered = getFilteredCampaigns();

    if (countDisplay) {
      countDisplay.textContent = `${filtered.length} of ${window.KINDRED_DATA.campaigns.length} campaigns`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--paper-card); border: 1px solid var(--line);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">✎</div>
          <strong>No campaigns found in this view.</strong>
          <p style="font-size: 0.8125rem; color: var(--muted); margin: 6px 0 16px;">Create a new campaign or change the status filter above.</p>
          <button class="button-dark small btn-open-create-campaign">Create Campaign ＋</button>
        </div>
      `;
      bindCardEvents();
      return;
    }

    container.innerHTML = filtered.map(cmp => {
      let badgeClass = "badge-draft";
      if (cmp.status === "Scheduled") badgeClass = "badge-pending";
      if (cmp.status === "Completed") badgeClass = "badge-verified";

      return `
        <div class="campaign-card" data-id="${escapeHtml(cmp.id)}">
          <div>
            <div class="campaign-card-top">
              <span class="mono-kicker">${escapeHtml(cmp.channel)}</span>
              <span class="badge ${badgeClass}">${escapeHtml(cmp.status)}</span>
            </div>
            <h4 class="campaign-card-title">${escapeHtml(cmp.name)}</h4>
            <div class="campaign-card-meta">
              <span>Recipients: ${cmp.recipientsCount}</span> · 
              <span>Schedule: ${escapeHtml(cmp.scheduledFor)}</span>
            </div>
            <div class="campaign-card-snippet" style="margin-top: 14px;">
              "${escapeHtml(cmp.messageText.length > 95 ? cmp.messageText.slice(0, 95) + '…' : cmp.messageText)}"
            </div>
          </div>

          <div class="campaign-card-footer">
            <span style="font-size: 0.6875rem; color: var(--muted); font-family: var(--font-mono);">
              ${escapeHtml(cmp.approvalStatus)}
            </span>
            <div class="campaign-card-actions">
              <button class="button-outline btn-edit-campaign" data-id="${escapeHtml(cmp.id)}" style="padding: 4px 8px; font-size: 0.6875rem;">Edit</button>
              <button class="button-outline btn-launch-composer" data-id="${escapeHtml(cmp.id)}" style="padding: 4px 8px; font-size: 0.6875rem;">Compose ↗</button>
              <button class="button-outline btn-delete-campaign" data-id="${escapeHtml(cmp.id)}" style="padding: 4px 8px; font-size: 0.6875rem; color: var(--red); border-color: #ecc0c0;">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    bindCardEvents();
  }

  /**
   * Bind event handlers for cards
   */
  function bindCardEvents() {
    // Open composer with campaign data
    $$(".btn-launch-composer").forEach(btn => {
      on(btn, "click", () => {
        const id = btn.dataset.id;
        const cmp = window.KINDRED_DATA.campaigns.find(c => c.id === id);
        if (cmp) {
          const titleInput = $("#composer-campaign-title");
          const msgInput = $("#composer-message-input");
          if (titleInput) titleInput.value = cmp.name;
          if (msgInput) msgInput.value = cmp.messageText;
          if (window.KINDRED_COMPOSER?.setChannel) {
            window.KINDRED_COMPOSER.setChannel(cmp.channel.includes("WhatsApp") ? "whatsapp" : "sms");
          }
          window.KINDRED_ROUTER.navigate("/dashboard/composer");
          showToast(`Loaded campaign '${cmp.name}' into Message Composer.`);
        }
      });
    });

    // Edit Campaign
    $$(".btn-edit-campaign").forEach(btn => {
      on(btn, "click", () => {
        const id = btn.dataset.id;
        openEditModal(id);
      });
    });

    // Delete Campaign
    $$(".btn-delete-campaign").forEach(btn => {
      on(btn, "click", () => {
        const id = btn.dataset.id;
        const cmp = window.KINDRED_DATA.campaigns.find(c => c.id === id);
        if (cmp && confirm(`Delete campaign draft '${cmp.name}'? This action cannot be undone.`)) {
          window.KINDRED_DATA.deleteCampaign(id);
          render();
          if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
          showToast(`Campaign '${cmp.name}' deleted.`, "info");
        }
      });
    });

    // Create trigger
    $$(".btn-open-create-campaign").forEach(btn => {
      on(btn, "click", () => {
        const modal = $("#modal-create-campaign");
        if (modal) modal.classList.add("open");
      });
    });
  }

  /**
   * Open Edit Campaign Modal
   */
  function openEditModal(campaignId) {
    const cmp = window.KINDRED_DATA.campaigns.find(c => c.id === campaignId);
    if (!cmp) return;

    const modal = $("#modal-edit-campaign");
    if (!modal) return;

    $("#edit-campaign-id").value = cmp.id;
    $("#edit-campaign-name").value = cmp.name;
    $("#edit-campaign-channel").value = cmp.channel;
    $("#edit-campaign-schedule").value = cmp.scheduledFor;
    $("#edit-campaign-text").value = cmp.messageText;

    modal.classList.add("open");
  }

  /**
   * Initialize campaigns module
   */
  function init() {
    // Status Filter Pills
    $$(".campaign-filter-pill").forEach(pill => {
      on(pill, "click", () => {
        $$(".campaign-filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilter = pill.dataset.filter || "all";
        render();
      });
    });

    // Create Campaign Form Submit
    const formCreate = $("#form-create-campaign");
    if (formCreate) {
      on(formCreate, "submit", (e) => {
        e.preventDefault();
        const name = $("#new-campaign-name")?.value.trim();
        const channel = $("#new-campaign-channel")?.value;
        const scheduledFor = $("#new-campaign-schedule")?.value.trim() || "Immediate (Pilot)";
        const messageText = $("#new-campaign-text")?.value.trim();

        if (!name || !messageText) {
          showToast("Campaign title and message copy are required.", "warning");
          return;
        }

        window.KINDRED_DATA.createCampaign({ name, channel, scheduledFor, messageText });
        formCreate.reset();
        const modal = $("#modal-create-campaign");
        if (modal) modal.classList.remove("open");

        render();
        if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
        showToast(`Campaign '${name}' created successfully!`, "success");
      });
    }

    // Edit Campaign Form Submit
    const formEdit = $("#form-edit-campaign");
    if (formEdit) {
      on(formEdit, "submit", (e) => {
        e.preventDefault();
        const id = $("#edit-campaign-id")?.value;
        const name = $("#edit-campaign-name")?.value.trim();
        const channel = $("#edit-campaign-channel")?.value;
        const scheduledFor = $("#edit-campaign-schedule")?.value.trim();
        const messageText = $("#edit-campaign-text")?.value.trim();

        window.KINDRED_DATA.updateCampaign(id, { name, channel, scheduledFor, messageText });
        const modal = $("#modal-edit-campaign");
        if (modal) modal.classList.remove("open");

        render();
        showToast(`Campaign '${name}' updated.`, "success");
      });
    }

    render();
  }

  return {
    init,
    render,
    openEditModal
  };
})();

