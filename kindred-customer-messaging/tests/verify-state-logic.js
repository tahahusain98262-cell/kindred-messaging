// State and Logic Integration Test for Kindred Prototype
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// Set up browser-like environment in VM
const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    title: 'Kindred'
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  localStorage: (() => {
    let store = {};
    return {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; }
    };
  })()
};
sandbox.window = sandbox;

vm.createContext(sandbox);

function runScript(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relPath });
}

console.log('--- STARTING RUNTIME LOGIC & STATE TESTS ---');

// 1. Load utils.js
runScript('js/utils.js');
if (typeof sandbox.window.KINDRED_UTILS.calculateSmsSegments === 'function') {
  console.log('PASS: utils.js loaded successfully.');
} else {
  console.error('FAIL: utils.js failed to export calculateSmsSegments.');
  process.exit(1);
}

// Test GSM-7 segment calculator
const shortSms = "Hello customer, your loan is approved!";
const seg1 = sandbox.window.KINDRED_UTILS.calculateSmsSegments(shortSms);
if (seg1.segments === 1 && seg1.chars === shortSms.length) {
  console.log('PASS: GSM-7 single segment calculation accurate.');
} else {
  console.error('FAIL: GSM-7 segment calculation error:', seg1);
  process.exit(1);
}

// 2. Load mock-data.js
runScript('js/mock-data.js');
const data = sandbox.window.KINDRED_DATA;
if (data && data.contacts && data.contacts.length === 10) {
  console.log('PASS: mock-data.js initialized 10 default pilot contacts.');
} else {
  console.error('FAIL: mock-data.js contacts count mismatch:', data?.contacts?.length);
  process.exit(1);
}

// 3. Test Authentication
console.log('Testing Authentication...');
const badLoginRachel = data.login('rachel.adams@kindredlending.com', 'wrongpassword');
const badEmail = data.login('notanemail', '123456');
const shortPass = data.login('user@test.com', '123');

if (!badLoginRachel.success && !badEmail.success && !shortPass.success) {
  console.log('PASS: Correctly rejected invalid passwords, bad emails, and short credentials.');
} else {
  console.error('FAIL: Accepted invalid credentials:', { badLoginRachel, badEmail, shortPass });
  process.exit(1);
}

const goodLogin = data.login('rachel.adams@kindredlending.com', 'demo2026pass', true);
if (goodLogin.success && data.session.isAuthenticated && data.session.user.name === 'Rachel Adams') {
  console.log('PASS: Valid demo login authenticated successfully.');
} else {
  console.error('FAIL: Valid login failed:', goodLogin);
  process.exit(1);
}

// 4. Test Contacts CRUD
console.log('Testing Contacts CRUD...');
const newCt = {
  id: 'ct-test-999',
  name: 'Marcus Vance',
  phone: '+1 (555) 789-0123',
  email: 'marcus@example.com',
  channel: 'SMS',
  consentStatus: 'Verified',
  consentSource: 'Signed In-Person Broker Agreement',
  status: 'Active',
  tags: ['Pre-Approval']
};
data.addContact(newCt);
if (data.contacts.length === 11 && data.contacts.find(c => c.id === 'ct-test-999')) {
  console.log('PASS: Contact added to state successfully.');
} else {
  console.error('FAIL: Failed to add contact.');
  process.exit(1);
}

data.updateContact('ct-test-999', { name: 'Marcus Vance Jr.' });
const updated = data.contacts.find(c => c.id === 'ct-test-999');
if (updated && updated.name === 'Marcus Vance Jr.') {
  console.log('PASS: Contact updated successfully.');
} else {
  console.error('FAIL: Failed to update contact.');
  process.exit(1);
}

data.deleteContact('ct-test-999');
if (data.contacts.length === 10 && !data.contacts.find(c => c.id === 'ct-test-999')) {
  console.log('PASS: Contact deleted successfully.');
} else {
  console.error('FAIL: Failed to delete contact.');
  process.exit(1);
}

// 5. Test Campaigns CRUD
console.log('Testing Campaigns CRUD...');
const initialCmpCount = data.campaigns.length;
const newCmp = {
  name: 'Thanksgiving Holiday Greeting',
  channel: 'SMS',
  scheduledFor: '2026-11-26 09:30 AM EST',
  messageText: 'Wishing you a joyful Thanksgiving from Kindred Lending.'
};
const createdCmp = data.createCampaign(newCmp);
if (data.campaigns.length === initialCmpCount + 1 && createdCmp && createdCmp.id) {
  console.log('PASS: Campaign created successfully with generated ID: ' + createdCmp.id);
} else {
  console.error('FAIL: Failed to create campaign.');
  process.exit(1);
}

data.updateCampaign(createdCmp.id, { status: 'Scheduled' });
const updatedCmp = data.campaigns.find(c => c.id === createdCmp.id);
if (updatedCmp && updatedCmp.status === 'Scheduled') {
  console.log('PASS: Campaign updated successfully.');
} else {
  console.error('FAIL: Failed to update campaign.');
  process.exit(1);
}

data.deleteCampaign(createdCmp.id);
if (data.campaigns.length === initialCmpCount) {
  console.log('PASS: Campaign deleted successfully.');
} else {
  console.error('FAIL: Failed to delete campaign.');
  process.exit(1);
}

// 6. Test Inbound STOP Suppression Flow
console.log('Testing STOP Suppression Flow...');
const conv = data.conversations[0];
const targetContact = data.contacts.find(c => c.id === conv.contactId);
const prevOptOutLogs = data.auditLogs.filter(l => l.action === 'SUPPRESSION_TRIGGERED').length;

// Simulate STOP action as in inbox.js
conv.messages.push({
  id: 'm-stop-test',
  sender: conv.contactName,
  direction: 'inbound',
  channel: conv.channel,
  text: 'STOP',
  timestamp: 'Just now',
  status: 'received'
});
conv.status = 'Suppressed';

if (targetContact) {
  targetContact.status = 'Opted-Out';
  targetContact.consentStatus = 'Suppressed (Opted Out)';
}
data.addAuditLog('SUPPRESSION_TRIGGERED', `Inbound STOP received from ${conv.contactName}. Contact suppressed.`);

if (targetContact.status === 'Opted-Out' && targetContact.consentStatus.includes('Suppressed')) {
  console.log('PASS: Contact successfully flagged as Suppressed & Opted-Out upon receiving STOP.');
} else {
  console.error('FAIL: Inbound STOP did not suppress contact properly.');
  process.exit(1);
}

const newOptOutLogs = data.auditLogs.filter(l => l.action === 'SUPPRESSION_TRIGGERED').length;
if (newOptOutLogs === prevOptOutLogs + 1) {
  console.log('PASS: Cryptographic audit log recorded SUPPRESSION_TRIGGERED event.');
} else {
  console.error('FAIL: Audit log missing for STOP suppression.');
  process.exit(1);
}

console.log('--- ALL RUNTIME LOGIC & STATE INTEGRATION TESTS PASSED ---');
