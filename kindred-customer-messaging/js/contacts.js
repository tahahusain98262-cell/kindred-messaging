/**
 * Kindred — Contact Management Module (contacts.js)
 * Full interactive contact directory, status filtering, search, detail modals,
 * and simulated CSV import workflow with consent audit.
 */

window.KINDRED_CONTACTS = (() => {
  const { $, $$, on, escapeHtml, maskPhone, formatPhone, showToast } = window.KINDRED_UTILS;

  let currentFilter = "all";
  let searchQuery = "";

  /**
   * Filter and search contacts
   */
  function getFilteredContacts() {
    const list = window.KINDRED_DATA.contacts || [];
    return list.filter(contact => {
      // Filter by status tab
      if (currentFilter === "verified" && contact.consentStatus !== "Verified") return false;
      if (currentFilter === "pending" && contact.consentStatus !== "Pending Verification") return false;
      if (currentFilter === "opted-out" && contact.status !== "Opted-Out" && !contact.consentStatus.includes("Suppressed")) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = contact.name.toLowerCase().includes(query);
        const matchPhone = contact.phone.toLowerCase().includes(query);
        const matchEmail = (contact.email || "").toLowerCase().includes(query);
        const matchTag = (contact.tags || []).some(t => t.toLowerCase().includes(query));
        return matchName || matchPhone || matchEmail || matchTag;
      }
      return true;
    });
  }

  /**
   * Render the contact table
   */
  function render() {
    const tableBody = $("#contacts-table-body");
    const countDisplay = $("#contacts-count-display");
    if (!tableBody) return;

    const filtered = getFilteredContacts();

    if (countDisplay) {
      countDisplay.textContent = `${filtered.length} of ${window.KINDRED_DATA.contacts.length} pilot contacts`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">
            No contacts match the current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(contact => {
      const initial = contact.name.charAt(0).toUpperCase();

      // Determine badge class
      let badgeClass = "badge-verified";
      let badgeText = "● Verified Consent";
      if (contact.status === "Opted-Out" || contact.consentStatus.includes("Suppressed")) {
        badgeClass = "badge-suppressed";
        badgeText = "✕ Suppressed (Opt-Out)";
      } else if (contact.consentStatus.includes("Pending")) {
        badgeClass = "badge-pending";
        badgeText = "▲ Pending Proof";
      }

      return `
        <tr data-contact-id="${escapeHtml(contact.id)}" class="contact-row" style="cursor: pointer;">
          <td>
            <div class="contact-name-cell">
              <span class="contact-avatar">${initial}</span>
              <div>
                <strong>${escapeHtml(contact.name)}</strong>
                <div style="font-size: 0.6875rem; color: var(--muted);">${escapeHtml(contact.loanType || "Conforming Mortgage")}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.75rem;">${escapeHtml(maskPhone(contact.phone))}</span>
          </td>
          <td>
            <span style="font-size: 0.75rem; color: var(--ink-secondary);">${escapeHtml(contact.channel)}</span>
          </td>
          <td>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </td>
          <td>
            <span style="font-size: 0.6875rem; color: var(--muted); display: block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(contact.consentSource)}
            </span>
          </td>
          <td style="text-align: right;">
            <button class="button-outline btn-view-contact" data-id="${escapeHtml(contact.id)}" style="padding: 4px 10px; font-size: 0.6875rem;">
              Inspect
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Bind inspect click handlers
    $$(".btn-view-contact").forEach(btn => {
      on(btn, "click", (e) => {
        e.stopPropagation();
        openContactDetail(btn.dataset.id);
      });
    });

    $$(".contact-row").forEach(row => {
      on(row, "click", () => {
        openContactDetail(row.dataset.contactId);
      });
    });
  }

  /**
   * Open contact detail drawer modal
   */
  function openContactDetail(contactId) {
    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === contactId);
    if (!contact) return;

    const modalBody = $("#contact-detail-modal-body");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 20px;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--lime); display: grid; place-items: center; font-size: 1.5rem; font-weight: 700; color: var(--paper-dark);">
          ${contact.name.charAt(0)}
        </div>
        <div>
          <h3 style="font-size: 1.25rem; margin-bottom: 4px;">${escapeHtml(contact.name)}</h3>
          <div style="font-size: 0.75rem; color: var(--muted); font-family: var(--font-mono);">
            ID: ${escapeHtml(contact.id)} · ${escapeHtml(contact.preferredLanguage || "English")}
          </div>
        </div>
      </div>

      <div class="grid-2" style="gap: 16px; margin-bottom: 20px;">
        <div>
          <div class="mono-kicker" style="margin-bottom: 4px;">PHONE (E.164)</div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem;">${escapeHtml(contact.phone)}</div>
        </div>
        <div>
          <div class="mono-kicker" style="margin-bottom: 4px;">EMAIL ADDRESS</div>
          <div style="font-size: 0.875rem;">${escapeHtml(contact.email)}</div>
        </div>
        <div>
          <div class="mono-kicker" style="margin-bottom: 4px;">APPROVED CHANNELS</div>
          <div style="font-size: 0.875rem;">${escapeHtml(contact.channel)}</div>
        </div>
        <div>
          <div class="mono-kicker" style="margin-bottom: 4px;">TIMEZONE / QUIET HOURS</div>
          <div style="font-size: 0.875rem;">${escapeHtml(contact.timezone)}</div>
        </div>
      </div>

      <div style="background-color: var(--paper-card); border: 1px solid var(--line); padding: 16px; margin-bottom: 20px;">
        <div class="mono-kicker" style="margin-bottom: 8px;">DOCUMENTED CONSENT AUDIT RECORD</div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 6px;">
          <span style="color: var(--muted);">Status:</span>
          <strong>${escapeHtml(contact.consentStatus)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 6px;">
          <span style="color: var(--muted);">Evidence Source:</span>
          <span>${escapeHtml(contact.consentSource)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 6px;">
          <span style="color: var(--muted);">Timestamp:</span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem;">${escapeHtml(contact.consentDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
          <span style="color: var(--muted);">Permitted Purpose:</span>
          <span>${escapeHtml(contact.purpose)}</span>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div class="mono-kicker" style="margin-bottom: 8px;">TAGS & ATTRIBUTES</div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${(contact.tags || []).map(t => `<span class="contact-tag-badge">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 16px;">
        <button class="button-outline btn-delete-contact-detail" data-id="${escapeHtml(contact.id)}" style="color: var(--red); border-color: #e5b4b4;">
          Delete Contact ✕
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="button-outline btn-open-edit-contact" data-id="${escapeHtml(contact.id)}">Edit</button>
          <button class="button-outline modal-close-btn" style="padding: 8px 16px;">Close</button>
          <button class="button-dark btn-draft-to-contact" data-name="${escapeHtml(contact.name)}" style="padding: 8px 16px;">
            Draft Message ↗
          </button>
        </div>
      </div>
    `;

    // Open the modal
    const modal = $("#modal-contact-detail");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }

    // Bind close & action handlers
    $$(".modal-close-btn", modalBody).forEach(btn => {
      on(btn, "click", () => {
        if (modal) modal.classList.remove("open");
      });
    });

    // Delete contact button inside detail modal
    const deleteBtn = $(".btn-delete-contact-detail", modalBody);
    if (deleteBtn) {
      on(deleteBtn, "click", () => {
        if (confirm(`Delete contact ${contact.name}? This will remove them from the directory.`)) {
          window.KINDRED_DATA.deleteContact(contact.id);
          if (modal) modal.classList.remove("open");
          render();
          if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
          showToast(`Contact ${contact.name} deleted.`, "info");
        }
      });
    }

    // Edit contact button inside detail modal
    const editBtn = $(".btn-open-edit-contact", modalBody);
    if (editBtn) {
      on(editBtn, "click", () => {
        if (modal) modal.classList.remove("open");
        openEditContactModal(contact.id);
      });
    }

    const draftBtn = $(".btn-draft-to-contact", modalBody);
    if (draftBtn) {
      on(draftBtn, "click", () => {
        if (modal) modal.classList.remove("open");
        if (window.KINDRED_ROUTER?.navigate) {
          window.KINDRED_ROUTER.navigate("/dashboard/composer");
        } else if (window.KINDRED_WORKSPACE?.switchTab) {
          window.KINDRED_WORKSPACE.switchTab("composer");
        }
        showToast(`Direct message drafted for ${contact.name}`);
      });
    }
  }

  /**
   * Open Edit Contact Modal
   */
  function openEditContactModal(contactId) {
    const contact = (window.KINDRED_DATA.contacts || []).find(c => c.id === contactId);
    if (!contact) return;

    const modal = $("#modal-edit-contact");
    if (!modal) return;

    $("#edit-contact-id").value = contact.id;
    $("#edit-contact-name").value = contact.name;
    $("#edit-contact-phone").value = contact.phone;
    $("#edit-contact-email").value = contact.email || "";
    $("#edit-contact-channel").value = contact.channel;
    $("#edit-contact-status").value = contact.consentStatus;
    $("#edit-contact-loantype").value = contact.loanType || "Conventional Mortgage";

    modal.classList.add("open");
  }

  /**
   * Add new contact
   */
  function addContact(contactData) {
    const newId = "ct-" + String(window.KINDRED_DATA.contacts.length + 1).padStart(3, "0");
    const newContact = {
      id: newId,
      name: contactData.name,
      phone: formatPhone(contactData.phone),
      email: contactData.email || "",
      channel: contactData.channel || "SMS",
      consentStatus: contactData.hasConsent ? "Verified" : "Pending Verification",
      consentSource: contactData.consentSource || "Manual Staff Entry",
      consentDate: new Date().toISOString().replace("T", " ").substring(0, 16) + " EST",
      purpose: "Greetings & Relationship Updates",
      status: contactData.hasConsent ? "Active" : "Pending",
      timezone: contactData.timezone || "America/New_York",
      preferredLanguage: "English",
      loanType: contactData.loanType || "Conventional Mortgage",
      tags: ["Manual Entry", "Pilot Contact"],
      lastContacted: "Never"
    };

    window.KINDRED_DATA.contacts.push(newContact);
    window.KINDRED_DATA.saveState();
    window.KINDRED_DATA.addAuditLog("CONTACT_CREATED", `Added ${newContact.name} (${newContact.phone}) with status ${newContact.consentStatus}`);

    render();
    if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
    showToast(`Contact ${newContact.name} added successfully!`, "success");
  }

  /**
   * Simulated CSV import parser
   */
  function importSampleCsv() {
    const sampleRows = [
      { name: "Devon Scott", phone: "+1 (555) 301-4455", email: "devon.s@example.com", source: "Signed Application Consent" },
      { name: "Mei-Ling Zhou", phone: "+1 (555) 402-8899", email: "meiling.z@example.com", source: "Website Opt-in Form" }
    ];

    sampleRows.forEach(row => {
      addContact({
        name: row.name,
        phone: row.phone,
        email: row.email,
        channel: "SMS & WhatsApp",
        hasConsent: true,
        consentSource: row.source,
        loanType: "Pre-Approval",
        timezone: "America/New_York"
      });
    });

    const modal = $("#modal-csv-import");
    if (modal) modal.classList.remove("open");
    showToast(`Successfully imported ${sampleRows.length} contacts from CSV!`, "success");
  }

  /**
   * Initialize contacts module event bindings
   */
  function init() {
    // Search input
    const searchInput = $("#contacts-search-input");
    if (searchInput) {
      on(searchInput, "input", window.KINDRED_UTILS.debounce((e) => {
        searchQuery = e.target.value;
        render();
      }, 150));
    }

    // Filter pill tabs
    $$(".filter-pill").forEach(pill => {
      on(pill, "click", () => {
        $$(".filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilter = pill.dataset.filter || "all";
        render();
      });
    });

    // Add contact button -> open modal
    const btnAddContact = $("#btn-add-contact");
    if (btnAddContact) {
      on(btnAddContact, "click", () => {
        const modal = $("#modal-add-contact");
        if (modal) modal.classList.add("open");
      });
    }

    // Import CSV button -> open modal
    const btnImportCsv = $("#btn-import-csv");
    if (btnImportCsv) {
      on(btnImportCsv, "click", () => {
        const modal = $("#modal-csv-import");
        if (modal) modal.classList.add("open");
      });
    }

    // Handle add contact form submit
    const formAddContact = $("#form-add-contact");
    if (formAddContact) {
      on(formAddContact, "submit", (e) => {
        e.preventDefault();
        const name = $("#new-contact-name")?.value.trim();
        const phone = $("#new-contact-phone")?.value.trim();
        const email = $("#new-contact-email")?.value.trim();
        const channel = $("#new-contact-channel")?.value;
        const loanType = $("#new-contact-loantype")?.value;
        const hasConsent = $("#new-contact-consent")?.checked;
        const consentSource = $("#new-contact-source")?.value.trim() || "Signed Client Agreement";

        if (!name || !phone) {
          showToast("Name and phone number are required.", "warning");
          return;
        }

        addContact({ name, phone, email, channel, loanType, hasConsent, consentSource });
        formAddContact.reset();
        const modal = $("#modal-add-contact");
        if (modal) modal.classList.remove("open");
      });
    }

    // Handle edit contact form submit
    const formEditContact = $("#form-edit-contact");
    if (formEditContact) {
      on(formEditContact, "submit", (e) => {
        e.preventDefault();
        const id = $("#edit-contact-id")?.value;
        const name = $("#edit-contact-name")?.value.trim();
        const phone = $("#edit-contact-phone")?.value.trim();
        const email = $("#edit-contact-email")?.value.trim();
        const channel = $("#edit-contact-channel")?.value;
        const consentStatus = $("#edit-contact-status")?.value;
        const loanType = $("#edit-contact-loantype")?.value;

        window.KINDRED_DATA.updateContact(id, {
          name,
          phone,
          email,
          channel,
          consentStatus,
          loanType,
          status: consentStatus.includes("Suppressed") ? "Opted-Out" : consentStatus.includes("Pending") ? "Pending" : "Active"
        });

        const modal = $("#modal-edit-contact");
        if (modal) modal.classList.remove("open");
        render();
        if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
        showToast(`Contact ${name} updated successfully!`, "success");
      });
    }

    // Handle sample CSV trigger
    const btnLoadSampleCsv = $("#btn-load-sample-csv");
    if (btnLoadSampleCsv) {
      on(btnLoadSampleCsv, "click", () => {
        importSampleCsv();
      });
    }

    // Handle CSV confirmation button
    const btnConfirmCsv = $("#btn-confirm-csv-import");
    if (btnConfirmCsv) {
      on(btnConfirmCsv, "click", () => {
        importSampleCsv();
      });
    }

    render();
  }

  return {
    init,
    render,
    addContact,
    openContactDetail,
    importSampleCsv
  };
})();

