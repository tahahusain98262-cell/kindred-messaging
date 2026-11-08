/**
 * Kindred — Central Client-Side Router (router.js)
 * Full URL & Hash routing engine supporting:
 * - Public routes: /, /features, /security, /login, /signup
 * - Dashboard routes: /dashboard, /dashboard/contacts, /dashboard/campaigns,
 *   /dashboard/composer, /dashboard/inbox, /dashboard/knowledge, /dashboard/analytics, /dashboard/settings
 * - 404 Route handling
 * - Authentication guarding (unauthenticated visitors redirected to /login)
 * - Browser Back/Forward navigation support & active navigation highlighting
 */

window.KINDRED_ROUTER = (() => {
  const { $, $$, on, showToast } = window.KINDRED_UTILS;

  // Registered Route Map
  const ROUTES = {
    "/": { page: "landing", title: "Kindred — Customer messaging, thoughtfully connected" },
    "/features": { page: "features", title: "Features — Kindred Messaging Platform" },
    "/security": { page: "security", title: "Security & Compliance — Kindred" },
    "/login": { page: "login", title: "Sign In — Kindred Workspace" },
    "/signup": { page: "signup", title: "Create Workspace — Kindred" },
    "/dashboard": { page: "dashboard", subTab: "overview", title: "Overview — Kindred Workspace", authRequired: true },
    "/dashboard/contacts": { page: "dashboard", subTab: "contacts", title: "Contacts — Kindred Workspace", authRequired: true },
    "/dashboard/campaigns": { page: "dashboard", subTab: "campaigns", title: "Campaigns — Kindred Workspace", authRequired: true },
    "/dashboard/composer": { page: "dashboard", subTab: "composer", title: "Message Composer — Kindred Workspace", authRequired: true },
    "/dashboard/inbox": { page: "dashboard", subTab: "inbox", title: "Two-Way Inbox — Kindred Workspace", authRequired: true },
    "/dashboard/knowledge": { page: "dashboard", subTab: "knowledge", title: "Knowledge Base — Kindred Workspace", authRequired: true },
    "/dashboard/analytics": { page: "dashboard", subTab: "analytics", title: "Analytics & Reports — Kindred Workspace", authRequired: true },
    "/dashboard/settings": { page: "dashboard", subTab: "settings", title: "Settings & Audit — Kindred Workspace", authRequired: true }
  };

  /**
   * Parse current path from URL or Hash
   */
  function getCurrentPath() {
    let hash = window.location.hash;
    if (hash.startsWith("#/")) {
      return hash.slice(1); // remove '#' e.g. "/dashboard/contacts"
    } else if (hash.startsWith("#") && hash.length > 1 && !hash.startsWith("#section-")) {
      return "/" + hash.slice(1);
    }

    let pathname = window.location.pathname;
    // Strip trailing slash if not root
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    // Check if pathname matches any known route
    if (ROUTES[pathname]) {
      return pathname;
    }
    return "/";
  }

  /**
   * Navigate to target path
   * @param {string} path - e.g. "/dashboard/contacts" or "#/dashboard/contacts"
   */
  function navigate(path) {
    if (!path) return;
    let cleanPath = path;
    if (cleanPath.startsWith("#")) cleanPath = cleanPath.slice(1);
    if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

    // Update window hash so it works consistently on any static host or direct file
    window.location.hash = "#" + cleanPath;
    resolveRoute(cleanPath);
  }

  /**
   * Resolve and render the view for the current path
   */
  function resolveRoute(path) {
    const route = ROUTES[path];

    // Handle 404 Route
    if (!route) {
      render404(path);
      return;
    }

    // Authentication Guard
    const isAuthenticated = window.KINDRED_DATA?.session?.isAuthenticated;
    if (route.authRequired && !isAuthenticated) {
      showToast("Please sign in to access the Kindred workspace.", "warning");
      navigate("/login");
      return;
    }

    if ((path === "/login" || path === "/signup") && isAuthenticated) {
      navigate("/dashboard");
      return;
    }

    // Update document title
    document.title = route.title;

    // Hide all main page containers
    $$(".page-container").forEach(page => page.classList.remove("active"));

    // Activate target page container
    const targetPageId = `page-${route.page}`;
    const targetPage = $(`#${targetPageId}`);
    if (targetPage) {
      targetPage.classList.add("active");
    }

    // If Dashboard page, activate corresponding sub-tab view
    if (route.page === "dashboard") {
      const subTab = route.subTab || "overview";
      if (window.KINDRED_WORKSPACE?.switchTab) {
        window.KINDRED_WORKSPACE.switchTab(subTab, false);
      }
    }

    // Update active highlight on all navigation links matching this route
    updateActiveNavigation(path);

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /**
   * Update active CSS class on links matching current path
   */
  function updateActiveNavigation(path) {
    $$("[data-route]").forEach(link => {
      const target = link.getAttribute("data-route");
      if (target === path || (target === "/dashboard" && path === "/dashboard")) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });

    // Sidebar items update
    $$(".side-item").forEach(item => {
      const tab = item.dataset.tab;
      const expectedPath = tab === "overview" ? "/dashboard" : `/dashboard/${tab}`;
      if (path === expectedPath) {
        item.classList.add("active");
        item.setAttribute("aria-selected", "true");
      } else {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      }
    });
  }

  /**
   * Render 404 Not Found view
   */
  function render404(attemptedPath) {
    document.title = "404 — Page Not Found · Kindred";
    $$(".page-container").forEach(page => page.classList.remove("active"));
    const page404 = $("#page-404");
    if (page404) {
      page404.classList.add("active");
      const pathEl = $("#path-404-attempted");
      if (pathEl) pathEl.textContent = attemptedPath;
    }
  }

  /**
   * Intercept clicks on links with data-route or href starting with / or #/
   */
  function bindLinkInterceptors() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-route], a[href^='#/'], a[href^='/dashboard'], a[href='/login'], a[href='/signup'], a[href='/features'], a[href='/security'], a[href='/']");
      if (!link) return;

      const target = link.getAttribute("data-route") || link.getAttribute("href");
      if (target && !target.startsWith("http") && !target.startsWith("mailto") && !target.startsWith("tel")) {
        e.preventDefault();
        navigate(target);
      }
    });
  }

  /**
   * Initialize router
   */
  function init() {
    bindLinkInterceptors();

    // Listen to hash changes (back/forward & direct anchor clicks)
    window.addEventListener("hashchange", () => {
      resolveRoute(getCurrentPath());
    });

    // Listen to browser popstate
    window.addEventListener("popstate", () => {
      resolveRoute(getCurrentPath());
    });

    // Initial route resolution on boot
    const initialPath = getCurrentPath();
    // Normalize hash if needed
    if (!window.location.hash && initialPath !== "/") {
      window.location.hash = "#" + initialPath;
    }
    resolveRoute(initialPath);
  }

  return {
    init,
    navigate,
    getCurrentPath,
    getRoutes: () => ROUTES
  };
})();

