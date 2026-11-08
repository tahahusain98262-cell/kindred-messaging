/**
 * Kindred — Authentication & Session Controller (auth.js)
 * Interactive login, signup, password visibility toggles, demo account filling,
 * session persistence in localStorage, and signout handlers.
 */

window.KINDRED_AUTH = (() => {
  const { $, $$, on, showToast } = window.KINDRED_UTILS;

  /**
   * Handle user login
   */
  function handleLogin(email, password, remember = true) {
    if (!email || !password) {
      showToast("Please enter both email and password.", "warning");
      return;
    }

    const submitBtn = $("#btn-login-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Authenticating...";
    }

    setTimeout(() => {
      const result = window.KINDRED_DATA.login(email, password, remember);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In ↗";
      }

      if (result.success) {
        showToast(`Welcome back, ${result.user.name}!`, "success");
        updateUserDisplay();
        window.KINDRED_ROUTER.navigate("/dashboard");
      } else {
        showToast(result.message || "Invalid credentials.", "warning");
      }
    }, 350);
  }

  /**
   * Handle user signup
   */
  function handleSignup(fullName, businessName, email, password, confirmPassword) {
    if (!fullName || !businessName || !email || !password) {
      showToast("All fields are required.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.", "warning");
      return;
    }

    const submitBtn = $("#btn-signup-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Provisioning Workspace...";
    }

    setTimeout(() => {
      const result = window.KINDRED_DATA.signup(fullName, businessName, email, password);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Workspace ↗";
      }

      if (result.success) {
        showToast(`Workspace '${businessName}' created successfully!`, "success");
        updateUserDisplay();
        window.KINDRED_ROUTER.navigate("/dashboard");
      } else {
        showToast(result.message || "Registration failed.", "warning");
      }
    }, 450);
  }

  /**
   * Handle user logout
   */
  function handleLogout() {
    window.KINDRED_DATA.logout();
    updateUserDisplay();
    showToast("Signed out of Kindred workspace.", "info");
    window.KINDRED_ROUTER.navigate("/login");
  }

  /**
   * Update user display names and avatars across dashboard and headers
   */
  function updateUserDisplay() {
    const session = window.KINDRED_DATA.session;
    const user = session?.user;
    const org = window.KINDRED_DATA.organization;

    const userNameEl = $("#dashboard-user-name");
    const userRoleEl = $("#dashboard-user-role");
    const userAvatarEl = $("#dashboard-user-avatar");
    const orgNameEl = $("#dashboard-org-name");

    if (user) {
      if (userNameEl) userNameEl.textContent = user.name;
      if (userRoleEl) userRoleEl.textContent = user.role || "Operator";
      if (userAvatarEl) userAvatarEl.textContent = user.avatar || user.name.slice(0, 2).toUpperCase();
    }
    if (org && orgNameEl) {
      orgNameEl.textContent = org.name;
    }
  }

  /**
   * Fill demo credentials
   */
  function fillDemoCredentials() {
    const emailInput = $("#login-email");
    const passInput = $("#login-password");
    if (emailInput) emailInput.value = "rachel.adams@kindredlending.com";
    if (passInput) passInput.value = "demo2026pass";
    showToast("Demo credentials filled: Rachel Adams (Admin)");
  }

  /**
   * Initialize auth module event bindings
   */
  function init() {
    // Login form submission
    const loginForm = $("#form-login");
    if (loginForm) {
      on(loginForm, "submit", (e) => {
        e.preventDefault();
        const email = $("#login-email")?.value.trim();
        const password = $("#login-password")?.value;
        const remember = $("#login-remember")?.checked;
        handleLogin(email, password, remember);
      });
    }

    // Demo login button
    const btnDemoLogin = $("#btn-fill-demo-login");
    if (btnDemoLogin) {
      on(btnDemoLogin, "click", (e) => {
        e.preventDefault();
        fillDemoCredentials();
        handleLogin("rachel.adams@kindredlending.com", "demo2026pass", true);
      });
    }

    // Signup form submission
    const signupForm = $("#form-signup");
    if (signupForm) {
      on(signupForm, "submit", (e) => {
        e.preventDefault();
        const fullName = $("#signup-name")?.value.trim();
        const businessName = $("#signup-org")?.value.trim();
        const email = $("#signup-email")?.value.trim();
        const password = $("#signup-password")?.value;
        const confirmPass = $("#signup-confirm")?.value;
        handleSignup(fullName, businessName, email, password, confirmPass);
      });
    }

    // Show / Hide password toggles
    $$(".btn-toggle-password").forEach(btn => {
      on(btn, "click", () => {
        const targetId = btn.dataset.target;
        const input = $(`#${targetId}`);
        if (!input) return;
        if (input.type === "password") {
          input.type = "text";
          btn.textContent = "Hide";
        } else {
          input.type = "password";
          btn.textContent = "Show";
        }
      });
    });

    // Logout buttons
    $$(".btn-logout").forEach(btn => {
      on(btn, "click", (e) => {
        e.preventDefault();
        handleLogout();
      });
    });

    updateUserDisplay();
  }

  return {
    init,
    handleLogin,
    handleSignup,
    handleLogout,
    updateUserDisplay,
    fillDemoCredentials
  };
})();

