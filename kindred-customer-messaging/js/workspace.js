/**
 * Kindred — Workspace Controller (workspace.js)
 * Manages workspace tab routing, overview metrics, and cross-view interactions.
 */

window.KINDRED_WORKSPACE = (() => {
  const { $, $$, on, escapeHtml, showToast, formatDate } = window.KINDRED_UTILS;

  let currentTab = "overview";

  const TAB_METADATA = {
    overview: {
      crumb: "WORKSPACE / OVERVIEW",
      heading: "Good morning, team.",
      subheading: "Here is your 10-contact messaging pilot at a glance."
    },
    contacts: {
      crumb: "WORKSPACE / RECIPIENTS",
      heading: "Pilot Contact Directory",
      subheading: "Audit channel consent records and manage pilot recipients."
    },
    campaigns: {
      crumb: "WORKSPACE / CAMPAIGN MANAGER",
      heading: "Campaign Management",
      subheading: "Create, schedule, edit drafts, and monitor message broadcast status."
    },
    composer: {
      crumb: "WORKSPACE / CAMPAIGN STUDIO",
      heading: "Message Composer & Approval",
      subheading: "Draft festival greetings, preview across devices, and run simulations."
    },
    inbox: {
      crumb: "WORKSPACE / TWO-WAY INBOX",
      heading: "Customer Conversations",
      subheading: "Two-way thread management with AI-assisted smart replies."
    },
    knowledge: {
      crumb: "WORKSPACE / KNOWLEDGE BASE",
      heading: "Approved Rates & Knowledge",
      subheading: "Compliance-verified mortgage benchmarks and response sources."
    },
    analytics: {
      crumb: "WORKSPACE / ANALYTICS",
      heading: "Delivery & Engagement Analytics",
      subheading: "Track delivery performance, channel ratios, and customer response times."
    },
    settings: {
      crumb: "WORKSPACE / AUDIT & SETTINGS",
      heading: "Tenant Settings & Audit Log",
      subheading: "Provider sandbox status, quiet hours policy, and immutable audit trail."
    }
  };

  /**
   * Switch the active workspace tab
   * @param {string} tabName
   */
  function switchTab(tabName) {
    if (!TAB_METADATA[tabName]) return;
    currentTab = tabName;

    // Update sidebar navigation active states
    $$(".side-item").forEach(item => {
      const target = item.dataset.tab;
      if (target === tabName) {
        item.classList.add("active");
        item.setAttribute("aria-selected", "true");
      } else {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      }
    });

    // Update top header text
    const meta = TAB_METADATA[tabName];
    const crumbEl = $("#workspace-crumb");
    const headingEl = $("#workspace-heading");
    const subEl = $("#workspace-subheading");

    if (crumbEl) crumbEl.textContent = meta.crumb;
    if (headingEl) headingEl.textContent = meta.heading;
    if (subEl) subEl.textContent = meta.subheading;

    // Toggle tab view visibility
    $$(".workspace-view").forEach(view => {
      if (view.id === `view-${tabName}`) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    // Trigger modular sub-renderers if available
    if (tabName === "contacts" && window.KINDRED_CONTACTS?.render) {
      window.KINDRED_CONTACTS.render();
    } else if (tabName === "campaigns" && window.KINDRED_CAMPAIGNS?.render) {
      window.KINDRED_CAMPAIGNS.render();
    } else if (tabName === "composer" && window.KINDRED_COMPOSER?.render) {
      window.KINDRED_COMPOSER.render();
    } else if (tabName === "inbox" && window.KINDRED_INBOX?.render) {
      window.KINDRED_INBOX.render();
    } else if (tabName === "knowledge" && window.KINDRED_KNOWLEDGE?.render) {
      window.KINDRED_KNOWLEDGE.render();
    } else if (tabName === "analytics" && window.KINDRED_ANALYTICS?.render) {
      window.KINDRED_ANALYTICS.render();
    } else if (tabName === "settings" && window.KINDRED_SETTINGS?.render) {
      window.KINDRED_SETTINGS.render();
    } else if (tabName === "overview") {
      renderOverview();
    }
  }

  /**
   * Render dynamic Overview metrics and activity feed
   */
  function renderOverview() {
    const data = window.KINDRED_DATA;
    if (!data) return;

    // Metric 1: Total Contacts
    const totalContactsEl = $("#stat-contacts-count");
    if (totalContactsEl) totalContactsEl.textContent = data.contacts.length;
    const sidebarContactsBadge = $("#sidebar-contacts-badge");
    if (sidebarContactsBadge) sidebarContactsBadge.textContent = data.contacts.length;

    // Metric 2: Active / Verified
    const verifiedCount = data.contacts.filter(c => c.consentStatus === "Verified").length;
    const verifiedEl = $("#stat-verified-count");
    if (verifiedEl) verifiedEl.textContent = `${verifiedCount} / ${data.contacts.length}`;

    // Metric 3: Messages Sent
    const messagesSentEl = $("#stat-messages-sent");
    if (messagesSentEl) messagesSentEl.textContent = data.metrics.messagesSent;

    // Metric 3: Inbound Inquiries
    const unreadConv = data.conversations.filter(c => c.unread).length;
    const inboxBadgeEl = $("#sidebar-inbox-badge");
    if (inboxBadgeEl) inboxBadgeEl.textContent = unreadConv;

    // Render Recent Audit Log Activity in Overview
    const activityContainer = $("#overview-activity-feed");
    if (activityContainer && data.auditLogs) {
      const recentLogs = data.auditLogs.slice(0, 4);
      activityContainer.innerHTML = recentLogs.map(log => `
        <div style="display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line);">
          <span style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--muted); min-width: 120px;">
            ${escapeHtml(log.timestamp.split(" ")[1] + " " + log.timestamp.split(" ")[2])}
          </span>
          <div>
            <div style="font-size: 0.8125rem; font-weight: 600; color: var(--ink);">
              ${escapeHtml(log.action.replace(/_/g, " "))}
            </div>
            <div style="font-size: 0.75rem; color: var(--ink-secondary); margin-top: 2px;">
              ${escapeHtml(log.details)}
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  /**
   * Initialize workspace event bindings
   */
  function init() {
    // Bind sidebar navigation item clicks
    $$(".side-item").forEach(item => {
      on(item, "click", (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        if (tab) {
          const targetRoute = tab === "overview" ? "/dashboard" : `/dashboard/${tab}`;
          if (window.KINDRED_ROUTER?.navigate) {
            window.KINDRED_ROUTER.navigate(targetRoute);
          } else {
            switchTab(tab);
          }
        }
      });
    });

    // Bind action links inside views that navigate to other tabs (e.g. data-navigate="composer")
    $$("[data-navigate]").forEach(btn => {
      on(btn, "click", (e) => {
        e.preventDefault();
        const targetTab = btn.dataset.navigate;
        if (targetTab) {
          const targetRoute = targetTab === "overview" ? "/dashboard" : `/dashboard/${targetTab}`;
          if (window.KINDRED_ROUTER?.navigate) {
            window.KINDRED_ROUTER.navigate(targetRoute);
          } else {
            switchTab(targetTab);
          }
        }
      });
    });

    // Topbar Organization Menu Popover Toggle
    const btnOrgMenu = $("#btn-toggle-org-menu");
    const popoverOrg = $("#popover-org-menu");
    if (btnOrgMenu && popoverOrg) {
      on(btnOrgMenu, "click", (e) => {
        e.stopPropagation();
        popoverOrg.classList.toggle("open");
        if ($("#popover-notifs-menu")) $("#popover-notifs-menu").classList.remove("open");
      });

      $$(".popover-item", popoverOrg).forEach(item => {
        on(item, "click", () => {
          const org = item.dataset.org;
          if (org === "wealth") {
            showToast("Kindred Wealth Advisors is a separate production tenant. Switch locked in sandbox.", "warning");
          } else {
            showToast("Switched active workspace: Kindred Lending Partners (Sandbox)", "success");
          }
          popoverOrg.classList.remove("open");
        });
      });
    }

    // Topbar Notifications Popover Toggle
    const btnNotifs = $("#btn-toggle-notifs");
    const popoverNotifs = $("#popover-notifs-menu");
    if (btnNotifs && popoverNotifs) {
      on(btnNotifs, "click", (e) => {
        e.stopPropagation();
        popoverNotifs.classList.toggle("open");
        if ($("#popover-org-menu")) $("#popover-org-menu").classList.remove("open");
      });
    }

    // Clear notifications
    const btnClearNotifs = $("#btn-clear-notifs");
    if (btnClearNotifs && popoverNotifs) {
      on(btnClearNotifs, "click", (e) => {
        e.stopPropagation();
        showToast("Notifications cleared.");
        popoverNotifs.classList.remove("open");
      });
    }

    // Close popovers when clicking outside
    document.addEventListener("click", (e) => {
      if (popoverOrg && !popoverOrg.contains(e.target) && e.target !== btnOrgMenu) {
        popoverOrg.classList.remove("open");
      }
      if (popoverNotifs && !popoverNotifs.contains(e.target) && e.target !== btnNotifs) {
        popoverNotifs.classList.remove("open");
      }
    });

    // Topbar Quick Search
    const topbarSearch = $("#topbar-quick-search");
    if (topbarSearch) {
      on(topbarSearch, "keydown", (e) => {
        if (e.key === "Enter") {
          const val = topbarSearch.value.trim().toLowerCase();
          if (!val) return;
          if (val.includes("contact") || val.includes("people") || val.includes("borrower")) {
            window.KINDRED_ROUTER.navigate("/dashboard/contacts");
          } else if (val.includes("campaign") || val.includes("broadcast")) {
            window.KINDRED_ROUTER.navigate("/dashboard/campaigns");
          } else if (val.includes("rate") || val.includes("mortgage") || val.includes("faq")) {
            window.KINDRED_ROUTER.navigate("/dashboard/knowledge");
          } else if (val.includes("inbox") || val.includes("message") || val.includes("chat")) {
            window.KINDRED_ROUTER.navigate("/dashboard/inbox");
          } else if (val.includes("setting") || val.includes("audit") || val.includes("policy")) {
            window.KINDRED_ROUTER.navigate("/dashboard/settings");
          } else {
            // Treat as contact search
            window.KINDRED_ROUTER.navigate("/dashboard/contacts");
            const contactInput = $("#contacts-search-input");
            if (contactInput) {
              contactInput.value = val;
              if (window.KINDRED_CONTACTS?.render) window.KINDRED_CONTACTS.render();
            }
          }
          topbarSearch.value = "";
        }
      });
    }

    // Initialize interactive tour hotspots
    initTourHotspots();

    // Initialize universal modal manager (dialog focus, scroll-lock, escape & backdrop close)
    initModalManager();

    // Initialize with overview tab
    switchTab("overview");
  }

  /**
   * Universal Modal Manager
   * Handles backdrop clicks, Escape key, Close button bindings,
   * focus trapping, and body scroll locking.
   */
  function initModalManager() {
    let lastActiveElement = null;

    function getOpenModal() {
      return document.querySelector(".modal-backdrop.open, .modal-backdrop[aria-hidden='false']");
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (lastActiveElement && typeof lastActiveElement.focus === "function") {
        try {
          lastActiveElement.focus();
        } catch (e) {}
      }
    }

    // Global click listener for closing modals
    document.addEventListener("click", (e) => {
      // 1. Close on clicking .modal-close or Cancel button with .modal-close
      const closeBtn = e.target.closest(".modal-close, .modal-close-btn");
      if (closeBtn) {
        e.preventDefault();
        const modal = closeBtn.closest(".modal-backdrop");
        if (modal) {
          closeModal(modal);
        } else {
          closeModal(getOpenModal());
        }
        return;
      }

      // 2. Close on clicking the backdrop/overlay (outside .modal-content)
      const backdrop = e.target.classList.contains("modal-backdrop") ? e.target : null;
      if (backdrop && (backdrop.classList.contains("open") || backdrop.getAttribute("aria-hidden") === "false")) {
        closeModal(backdrop);
      }
    });

    // Global Escape key & Focus Trap
    document.addEventListener("keydown", (e) => {
      const openModalEl = getOpenModal();
      if (!openModalEl) return;

      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        closeModal(openModalEl);
        return;
      }

      // Trap focus inside open dialog
      if (e.key === "Tab") {
        const focusables = Array.from(openModalEl.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Observer to automatically sync body.modal-open and focus on open
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const target = mutation.target;
        if (target && target.classList && target.classList.contains("modal-backdrop")) {
          const isOpen = target.classList.contains("open") || target.getAttribute("aria-hidden") === "false";
          if (isOpen) {
            document.body.classList.add("modal-open");
            // If focus is not already inside, move focus inside
            if (!target.contains(document.activeElement)) {
              lastActiveElement = document.activeElement;
              setTimeout(() => {
                const focusable = target.querySelector("input:not([type='hidden']), select, textarea, button:not(.modal-close)");
                if (focusable) focusable.focus();
                else {
                  const closeBtn = target.querySelector(".modal-close");
                  if (closeBtn) closeBtn.focus();
                }
              }, 50);
            }
          } else {
            // Check if any other modal is still open
            const anyOpen = Boolean(getOpenModal());
            if (!anyOpen) {
              document.body.classList.remove("modal-open");
            }
          }
        }
      });
    });

    document.querySelectorAll(".modal-backdrop").forEach(m => {
      observer.observe(m, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
    });
  }

  /**
   * Initialize interactive tour hotspots
   */
  function initTourHotspots() {
    const toggleBtn = $("#btn-toggle-hotspots");
    const countEl = $("#hotspots-active-count");
    const hotspots = $$(".hotspot-wrapper");

    const updateCount = () => {
      const activePins = $$(".hotspot-wrapper:not(.dismissed)");
      if (countEl) countEl.textContent = String(activePins.length);
    };

    hotspots.forEach(spot => {
      const trigger = spot.querySelector(".hotspot-trigger");
      const dismissBtn = spot.querySelector(".btn-hotspot-dismiss");
      const actionBtn = spot.querySelector(".btn-hotspot-action");

      if (trigger) {
        on(trigger, "click", (e) => {
          e.stopPropagation();
          const isOpen = spot.classList.contains("open");
          hotspots.forEach(s => s.classList.remove("open"));
          if (!isOpen) spot.classList.add("open");
        });
      }

      if (dismissBtn) {
        on(dismissBtn, "click", (e) => {
          e.stopPropagation();
          spot.classList.remove("open");
          spot.classList.add("dismissed");
          updateCount();
          showToast("Hotspot dismissed.");
        });
      }

      if (actionBtn) {
        on(actionBtn, "click", (e) => {
          e.stopPropagation();
          const targetTab = actionBtn.dataset.tab;
          if (targetTab) {
            spot.classList.remove("open");
            switchTab(targetTab);
          }
        });
      }
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".hotspot-wrapper")) {
        hotspots.forEach(s => s.classList.remove("open"));
      }
    });

    // Global toggle / restore hotspots
    if (toggleBtn) {
      on(toggleBtn, "click", () => {
        const anyDismissed = $$(".hotspot-wrapper.dismissed").length > 0;
        if (anyDismissed) {
          hotspots.forEach(s => s.classList.remove("dismissed", "open"));
          updateCount();
          showToast("All tour hotspots restored.");
        } else {
          const allHidden = hotspots.every(s => s.style.display === "none");
          hotspots.forEach(s => {
            s.style.display = allHidden ? "" : "none";
          });
          showToast(allHidden ? "Tour hotspots visible." : "Tour hotspots hidden.");
        }
      });
    }

    updateCount();
  }

  return {
    init,
    switchTab,
    renderOverview,
    getCurrentTab: () => currentTab
  };
})();
