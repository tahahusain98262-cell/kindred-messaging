/**
 * Kindred — Settings & Audit Log Module (settings.js)
 * Provider configuration, compliance policies, webhook simulation, and audit trail.
 */

window.KINDRED_SETTINGS = (() => {
  const { $, $$, on, escapeHtml, showToast } = window.KINDRED_UTILS;

  let auditFilter = "all";

  /**
   * Render audit log table
   */
  function renderAuditLogs() {
    const tableBody = $("#audit-table-body");
    if (!tableBody) return;

    const logs = window.KINDRED_DATA.auditLogs || [];

    const filtered = logs.filter(log => {
      if (auditFilter === "consent" && !log.action.includes("CONSENT") && !log.action.includes("SUPPRESSION")) return false;
      if (auditFilter === "campaign" && !log.action.includes("CAMPAIGN")) return false;
      if (auditFilter === "rate" && !log.action.includes("RATE")) return false;
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">No matching audit logs found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(log => {
      let actionColor = "color: var(--ink);";
      if (log.action.includes("SUPPRESSION")) actionColor = "color: var(--red); font-weight: 700;";
      if (log.action.includes("APPROVED")) actionColor = "color: var(--green); font-weight: 700;";

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--muted);">
            ${escapeHtml(log.timestamp)}
          </td>
          <td>
            <strong>${escapeHtml(log.actor)}</strong>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.6875rem; ${actionColor}">
              ${escapeHtml(log.action)}
            </span>
          </td>
          <td style="font-size: 0.75rem; color: var(--ink-secondary);">
            ${escapeHtml(log.details)}
          </td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Complete render
   */
  function render() {
    renderAuditLogs();
  }

  /**
   * Simulate a webhook ping test
   */
  function testWebhookPing() {
    window.KINDRED_DATA.addAuditLog("WEBHOOK_PING_VERIFIED", "Simulated delivery status webhook received from Telnyx API (Signature 200 OK).");
    renderAuditLogs();
    showToast("Telnyx webhook simulation returned 200 OK signature verified.", "success");
  }

  /**
   * Reset demo state
   */
  function resetDemoState() {
    if (confirm("Reset demo data to initial sandbox state? Any added contacts or test messages will be cleared.")) {
      window.KINDRED_DATA.resetState();
      render();
      if (window.KINDRED_WORKSPACE?.renderOverview) window.KINDRED_WORKSPACE.renderOverview();
      if (window.KINDRED_CONTACTS?.render) window.KINDRED_CONTACTS.render();
      if (window.KINDRED_INBOX?.render) window.KINDRED_INBOX.render();
      showToast("Demo sandbox state reset to default seed.", "info");
    }
  }

  /**
   * Initialize settings module
   */
  function init() {
    // Filter audit logs
    $$(".audit-filter-btn").forEach(btn => {
      on(btn, "click", () => {
        $$(".audit-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        auditFilter = btn.dataset.filter || "all";
        renderAuditLogs();
      });
    });

    // Webhook test button
    const btnPing = $("#btn-test-webhook-ping");
    if (btnPing) {
      on(btnPing, "click", testWebhookPing);
    }

    // Reset button
    const btnReset = $("#btn-reset-demo-state");
    if (btnReset) {
      on(btnReset, "click", resetDemoState);
    }

    // Policy toggle switches
    $$(".policy-toggle-input").forEach(toggle => {
      on(toggle, "change", (e) => {
        const policyName = e.target.dataset.policy;
        const isChecked = e.target.checked;
        window.KINDRED_DATA.addAuditLog("POLICY_UPDATED", `Setting '${policyName}' set to ${isChecked ? "ENABLED" : "DISABLED"}`);
        renderAuditLogs();
        showToast(`Policy '${policyName}' updated.`);
      });
    });

    render();
  }

  return {
    init,
    render,
    testWebhookPing,
    resetDemoState
  };
})();

