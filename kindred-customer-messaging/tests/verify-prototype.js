// Headless Verification Suite for Kindred Customer Messaging Prototype
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const htmlPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('--- STARTING KINDRED PROTOTYPE VERIFICATION ---');

const actualModuleIds = [
  // Page Containers
  'page-landing', 'page-features', 'page-security', 'page-login', 'page-signup', 'page-dashboard', 'page-404',
  
  // Auth & Session
  'form-login', 'login-email', 'login-password', 'login-remember', 'btn-login-submit', 'btn-fill-demo-login',
  'form-signup', 'signup-name', 'signup-org', 'signup-email', 'signup-password', 'signup-confirm', 'btn-signup-submit',
  
  // Workspace Chrome & Overview
  'workspace-crumb', 'workspace-heading', 'workspace-subheading',
  'stat-contacts-count', 'sidebar-contacts-badge', 'stat-verified-count', 'stat-messages-sent', 'sidebar-inbox-badge',
  'overview-activity-feed', 'btn-toggle-org-menu', 'popover-org-menu', 'btn-toggle-notifs', 'popover-notifs-menu', 'btn-clear-notifs', 'topbar-quick-search',
  'dashboard-user-name', 'dashboard-user-role', 'dashboard-user-avatar', 'dashboard-org-name',
  
  // Contacts
  'contacts-table-body', 'contacts-search-input', 'contacts-count-display',
  'modal-contact-detail', 'modal-edit-contact', 'form-edit-contact', 'modal-add-contact', 'form-add-contact',
  'btn-load-sample-csv',
  
  // Campaigns
  'campaigns-grid-container', 'campaigns-count-display',
  'modal-create-campaign', 'form-create-campaign', 'modal-edit-campaign', 'form-edit-campaign',
  
  // Composer
  'composer-message-input', 'phone-preview-bubble', 'composer-char-count', 'composer-segment-count', 'composer-template-select', 'btn-simulate-send', 'btn-save-draft',
  
  // Inbox
  'inbox-threads-container', 'btn-send-inbox-reply', 'inbox-reply-input', 'btn-insert-ai-reply', 'btn-sim-customer-reply', 'btn-sim-inbound-stop',
  
  // Knowledge
  'rates-table-body', 'knowledge-faqs-container', 'btn-refresh-rates',
  
  // Analytics
  'analytics-chart-bars', 'analytics-delivery-rate', 'analytics-optout-rate', 'analytics-resp-time',
  
  // Settings
  'audit-table-body', 'btn-test-webhook-ping', 'btn-reset-demo-state'
];

let missing = [];
for (const id of actualModuleIds) {
  if (!html.includes('id="' + id + '"')) {
    missing.push(id);
  }
}

if (missing.length === 0) {
  console.log('PASS: All ' + actualModuleIds.length + ' required DOM element IDs verified in index.html.');
} else {
  console.error('FAIL: Missing element IDs:', missing);
  process.exit(1);
}

// Check scripts inclusion in index.html
const requiredScripts = [
  'js/utils.js',
  'js/mock-data.js',
  'js/router.js',
  'js/auth.js',
  'js/workspace.js',
  'js/contacts.js',
  'js/campaigns.js',
  'js/composer.js',
  'js/inbox.js',
  'js/knowledge.js',
  'js/analytics.js',
  'js/settings.js',
  'js/landing.js'
];

let missingScripts = [];
for (const src of requiredScripts) {
  if (!html.includes('src="' + src + '"')) {
    missingScripts.push(src);
  }
}

if (missingScripts.length === 0) {
  console.log('PASS: All ' + requiredScripts.length + ' modular scripts included in index.html in order.');
} else {
  console.error('FAIL: Missing scripts in index.html:', missingScripts);
  process.exit(1);
}

// Check stylesheets inclusion in index.html
const requiredCss = [
  'css/base.css',
  'css/landing.css',
  'css/pages.css',
  'css/workspace.css',
  'css/contacts.css',
  'css/campaigns.css',
  'css/composer.css',
  'css/inbox.css',
  'css/knowledge.css',
  'css/analytics.css',
  'css/settings.css'
];

let missingCss = [];
for (const href of requiredCss) {
  if (!html.includes('href="' + href + '"')) {
    missingCss.push(href);
  }
}

if (missingCss.length === 0) {
  console.log('PASS: All ' + requiredCss.length + ' stylesheets linked in index.html.');
} else {
  console.error('FAIL: Missing stylesheets in index.html:', missingCss);
  process.exit(1);
}

console.log('--- ALL STATIC STRUCTURE CHECKS PASSED ---');
