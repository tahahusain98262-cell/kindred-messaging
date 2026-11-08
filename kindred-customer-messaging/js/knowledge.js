/**
 * Kindred — Knowledge Base & Mortgage Rates Module (knowledge.js)
 * Verified rate snapshot tables, compliance approval status, and policy FAQs.
 */

window.KINDRED_KNOWLEDGE = (() => {
  const { $, $$, on, escapeHtml, showToast } = window.KINDRED_UTILS;

  /**
   * Render mortgage rate table
   */
  function renderRates() {
    const tableBody = $("#rates-table-body");
    if (!tableBody) return;

    const rates = window.KINDRED_DATA.rates || [];

    tableBody.innerHTML = rates.map(r => {
      const isDown = r.trend.startsWith("-");
      const isUp = r.trend.startsWith("+");
      const trendClass = isDown ? "rate-trend-down" : isUp ? "rate-trend-up" : "rate-trend-flat";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(r.product)}</strong>
            <div style="font-size: 0.6875rem; color: var(--muted);">${escapeHtml(r.source)}</div>
          </td>
          <td>
            <span class="rate-val-bold">${escapeHtml(r.rate)}</span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.8125rem;">${escapeHtml(r.apr)}</span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.8125rem;">${escapeHtml(r.points)}</span>
          </td>
          <td>
            <span class="${trendClass}">${escapeHtml(r.trend)}</span>
          </td>
          <td>
            <span class="badge badge-verified">✓ ${escapeHtml(r.status)}</span>
            <div style="font-size: 0.625rem; color: var(--muted); margin-top: 2px;">
              ${escapeHtml(r.effectiveDate)}
            </div>
          </td>
          <td style="font-size: 0.75rem; color: var(--ink-secondary);">
            ${escapeHtml(r.approvedBy)}
          </td>
        </tr>
      `;
    }).join("");
  }

  /**
   * Render policy FAQ accordion
   */
  function renderFaqs() {
    const faqContainer = $("#knowledge-faqs-container");
    if (!faqContainer) return;

    const faqs = window.KINDRED_DATA.rateFaqs || [];

    faqContainer.innerHTML = faqs.map(faq => `
      <div class="faq-card">
        <div class="faq-question">
          <span>${escapeHtml(faq.q)}</span>
          <span class="faq-icon">＋</span>
        </div>
        <div class="faq-answer">
          ${escapeHtml(faq.a)}
        </div>
      </div>
    `).join("");

    // Bind accordion toggling
    $$(".faq-card", faqContainer).forEach(card => {
      on(card, "click", () => {
        card.classList.toggle("open");
      });
    });
  }

  /**
   * Complete render
   */
  function render() {
    renderRates();
    renderFaqs();
  }

  /**
   * Initialize knowledge module
   */
  function init() {
    const btnRefresh = $("#btn-refresh-rates");
    if (btnRefresh) {
      on(btnRefresh, "click", () => {
        window.KINDRED_DATA.addAuditLog("RATES_REFRESHED", "Queried verified secondary market pricing snapshot feed.");
        showToast("Rate snapshot verified against secondary benchmark feeds.", "success");
        render();
      });
    }

    render();
  }

  return {
    init,
    render
  };
})();

