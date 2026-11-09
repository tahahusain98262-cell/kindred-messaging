/**
 * Frontend Verification for Kindred Composer and Inbox Twilio integration
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../kindred-customer-messaging/index.html'), 'utf8');
const composerJs = fs.readFileSync(path.join(__dirname, '../kindred-customer-messaging/js/composer.js'), 'utf8');
const inboxJs = fs.readFileSync(path.join(__dirname, '../kindred-customer-messaging/js/inbox.js'), 'utf8');
const composerCss = fs.readFileSync(path.join(__dirname, '../kindred-customer-messaging/css/composer.css'), 'utf8');

console.log('=== VERIFYING FRONTEND INTEGRATION ===\n');

// 1. Verify New Element IDs in index.html
const newIds = [
  'real-sms-toggle-bar',
  'toggle-real-sms',
  'composer-mode-badge',
  'real-sms-panel',
  'real-sms-recipient',
  'real-sms-tz-display',
  'real-sms-consent-box',
  'real-sms-consent',
  'real-sms-cost-box',
  'real-sms-cost-value',
  'real-sms-cost-breakdown',
  'chk-item-consent',
  'chk-icon-consent',
  'chk-text-consent',
  'chk-item-suppression',
  'chk-item-quiethours',
  'chk-item-stop',
  'chk-item-provider',
  'sim-actions-bar',
  'btn-save-draft',
  'btn-simulate-send',
  'real-sms-actions-bar',
  'btn-real-save-draft',
  'btn-real-send-sms',
  'real-sms-error-banner',
  'real-sms-timeline',
  'step-queued',
  'step-sent',
  'step-delivered',
  'inbox-test-mode-badge'
];

let missingIds = [];
newIds.forEach(id => {
  if (!html.includes(`id="${id}"`)) {
    missingIds.push(id);
  }
});

if (missingIds.length === 0) {
  console.log(`PASS: All ${newIds.length} new Real SMS UI IDs verified in index.html.`);
} else {
  console.error('FAIL: Missing element IDs in index.html:', missingIds);
  process.exit(1);
}

// 2. Syntax Check on JS files
try {
  new Function(composerJs);
  console.log('PASS: composer.js syntax valid.');
} catch (e) {
  console.error('FAIL: composer.js syntax error:', e);
  process.exit(1);
}

try {
  new Function(inboxJs);
  console.log('PASS: inbox.js syntax valid.');
} catch (e) {
  console.error('FAIL: inbox.js syntax error:', e);
  process.exit(1);
}

// 3. CSS Check
assert(composerCss.includes('.real-sms-toggle-bar'), 'CSS must include .real-sms-toggle-bar');
assert(composerCss.includes('.real-sms-timeline-card'), 'CSS must include .real-sms-timeline-card');
assert(composerCss.includes('.badge-test-mode'), 'CSS must include .badge-test-mode');
console.log('PASS: composer.css contains all required real SMS styles.');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
}

console.log('\n=== ALL FRONTEND CHECKS PASSED ===');
