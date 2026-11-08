/**
 * Kindred — Analytics & Reporting Engine (analytics.js)
 * Delivery metrics visualization, channel breakdown, and performance KPIs.
 */

window.KINDRED_ANALYTICS = (() => {
  const { $, $$, on, escapeHtml, showToast } = window.KINDRED_UTILS;

  let currentRange = "7d";

  /**
   * Render dynamic delivery bar chart
   */
  function renderChart() {
    const chartContainer = $("#analytics-chart-bars");
    if (!chartContainer) return;

    const history = window.KINDRED_DATA.analytics?.deliveryHistory || [];
    const maxVal = 50; // Max baseline for height calculation

    chartContainer.innerHTML = history.map(item => {
      const sentHeight = Math.min(100, Math.round((item.sent / maxVal) * 100));
      const delHeight = Math.min(100, Math.round((item.delivered / maxVal) * 100));

      return `
        <div class="chart-bar-group">
          <div class="chart-bars-wrap">
            <div class="chart-bar sent" style="height: ${sentHeight}%;" title="Sent: ${item.sent}"></div>
            <div class="chart-bar delivered" style="height: ${delHeight}%;" title="Delivered: ${item.delivered}"></div>
          </div>
          <span class="chart-bar-label">${escapeHtml(item.day)}</span>
        </div>
      `;
    }).join("");
  }

  /**
   * Render channel distribution and KPIs
   */
  function renderMetrics() {
    const data = window.KINDRED_DATA;
    if (!data) return;

    const delRateEl = $("#analytics-delivery-rate");
    const optOutEl = $("#analytics-optout-rate");
    const respTimeEl = $("#analytics-resp-time");

    if (delRateEl) delRateEl.textContent = `${data.metrics.deliveryRate}%`;
    if (optOutEl) optOutEl.textContent = `${data.analytics.optOutRate}%`;
    if (respTimeEl) respTimeEl.textContent = data.analytics.averageResponseTime;
  }

  /**
   * Complete render
   */
  function render() {
    renderChart();
    renderMetrics();
  }

  /**
   * Initialize analytics module
   */
  function init() {
    $$(".analytics-range-btn").forEach(btn => {
      on(btn, "click", () => {
        $$(".analytics-range-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentRange = btn.dataset.range || "7d";
        showToast(`Analytics filtered to: ${btn.textContent.trim()}`);
        render();
      });
    });

    render();
  }

  return {
    init,
    render
  };
})();

