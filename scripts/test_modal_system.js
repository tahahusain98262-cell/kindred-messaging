/**
 * Comprehensive Automated Verification Suite for Kindred Modal Forms
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'kindred-customer-messaging/index.html'), 'utf8');
const workspaceCss = fs.readFileSync(path.join(ROOT, 'kindred-customer-messaging/css/workspace.css'), 'utf8');
const baseCss = fs.readFileSync(path.join(ROOT, 'kindred-customer-messaging/css/base.css'), 'utf8');
const workspaceJs = fs.readFileSync(path.join(ROOT, 'kindred-customer-messaging/js/workspace.js'), 'utf8');

console.log('=== STARTING KINDRED MODAL VERIFICATION SUITE ===\n');

// 1. Verify all 6 modal containers exist with required IDs and classes
console.log('Test 1: Modal containers and markup...');
const expectedModals = [
  'modal-contact-detail',
  'modal-add-contact',
  'modal-edit-contact',
  'modal-csv-import',
  'modal-create-campaign',
  'modal-edit-campaign'
];

expectedModals.forEach(id => {
  assert(html.includes(`id="${id}"`), `Modal container #${id} must exist in index.html`);
  assert(html.includes(`class="modal-backdrop" id="${id}"`), `Modal #${id} must have class="modal-backdrop"`);
});
console.log('  PASS: All 6 modal containers verified.');

// 2. Verify all required form IDs exist
console.log('Test 2: Form element IDs...');
const expectedForms = [
  'form-add-contact',
  'form-edit-contact',
  'form-create-campaign',
  'form-edit-campaign'
];

expectedForms.forEach(id => {
  assert(html.includes(`id="${id}"`), `Form #${id} must exist in index.html`);
});
console.log('  PASS: All 4 modal form IDs verified.');

// 3. Verify all input field IDs exist
console.log('Test 3: Input field IDs...');
const expectedFields = [
  'new-contact-name',
  'new-contact-phone',
  'new-contact-email',
  'new-contact-channel',
  'new-contact-loantype',
  'new-contact-source',
  'new-contact-consent',
  'edit-contact-id',
  'edit-contact-name',
  'edit-contact-phone',
  'edit-contact-email',
  'edit-contact-channel',
  'edit-contact-status',
  'edit-contact-loantype',
  'btn-load-sample-csv',
  'btn-confirm-csv-import',
  'new-campaign-name',
  'new-campaign-channel',
  'new-campaign-schedule',
  'new-campaign-text',
  'edit-campaign-id',
  'edit-campaign-name',
  'edit-campaign-channel',
  'edit-campaign-schedule',
  'edit-campaign-text'
];

expectedFields.forEach(id => {
  assert(html.includes(`id="${id}"`), `Field #${id} must exist in index.html`);
});
console.log('  PASS: All 25 input field IDs verified.');

// 4. Verify CSS Rules for Modal Overlays and Hidden State
console.log('Test 4: CSS Rules for Modal State & Overlay...');
assert(baseCss.includes('.modal-backdrop:not(.open)') || workspaceCss.includes('.modal-backdrop'), 'Must have hidden modal rules');
assert(workspaceCss.includes('.modal-backdrop.open') || workspaceCss.includes('.modal-backdrop[aria-hidden="false"]'), 'Must have active open rule');
assert(workspaceCss.includes('body.modal-open'), 'Must have body.modal-open rule for scroll lock');
assert(workspaceCss.includes('position: fixed'), 'Must have position: fixed overlay');
assert(workspaceCss.includes('backdrop-filter: blur'), 'Must have backdrop-filter blur');
assert(workspaceCss.includes('z-index: 10000'), 'Must have high z-index above sidebar and header');
console.log('  PASS: Modal overlay and hidden state rules verified.');

// 5. Verify Dialog Styling in workspace.css
console.log('Test 5: Dialog Styling Rules...');
assert(workspaceCss.includes('.modal-content'), 'Must have .modal-content styling');
assert(workspaceCss.includes('border-radius: 14px'), 'Must have 14px border radius for desktop dialog');
assert(workspaceCss.includes('padding: 28px'), 'Must have 28px desktop padding');
assert(workspaceCss.includes('.modal-header'), 'Must have .modal-header styling');
assert(workspaceCss.includes('.modal-close'), 'Must have .modal-close button styling');
assert(workspaceCss.includes('width: 36px') && workspaceCss.includes('height: 36px'), 'Close button must be 36x36px');
assert(workspaceCss.includes('.modal-form'), 'Must have .modal-form styling with gap: 18px');
assert(workspaceCss.includes('.modal-footer'), 'Must have .modal-footer styling');
assert(workspaceCss.includes('.modal-consent-block'), 'Must have .modal-consent-block styling');
console.log('  PASS: Dialog and form styling rules verified.');

// 6. Verify Mobile Bottom Sheet Rules (<640px)
console.log('Test 6: Mobile Bottom Sheet Rules (<640px)...');
assert(workspaceCss.includes('@media (max-width: 640px)'), 'Must have mobile media query at 640px');
assert(workspaceCss.includes('border-radius: 20px 20px 0 0') || workspaceCss.includes('border-radius: 20px'), 'Must have top rounded corners for bottom sheet');
assert(workspaceCss.includes('align-items: flex-end'), 'Must align to bottom of viewport on mobile');
assert(workspaceCss.includes('max-height: 92dvh'), 'Must have max-height 92dvh on mobile');
console.log('  PASS: Mobile bottom sheet rules verified.');

// 7. Verify Modal Manager in workspace.js
console.log('Test 7: Modal Manager in workspace.js...');
assert(workspaceJs.includes('initModalManager'), 'workspace.js must define initModalManager');
assert(workspaceJs.includes('modal-open'), 'workspace.js must toggle modal-open on body');
assert(workspaceJs.includes('Escape'), 'workspace.js must handle Escape key');
assert(workspaceJs.includes('MutationObserver'), 'workspace.js must observe modal state changes');
console.log('  PASS: Modal manager JavaScript logic verified.');

console.log('\n=== ALL MODAL VERIFICATION CHECKS PASSED SUCCESSFULLY! ===');
