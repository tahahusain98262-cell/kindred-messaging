/**
 * Automated Verification Suite for Kindred Twilio SMS Backend
 * Tests: sms-utils, storage, send-sms, twilio-status, twilio-inbound, messages
 */

const assert = require('assert');
const path = require('path');

// Set test environment variables
process.env.TEST_ALLOWED_NUMBERS = '+12025550143,+14155552671';
process.env.DAILY_SEND_CAP = '25';

const smsUtils = require('../api/lib/sms-utils');
const storage = require('../api/lib/storage');
const sendSmsHandler = require('../api/send-sms');
const twilioStatusHandler = require('../api/twilio-status');
const twilioInboundHandler = require('../api/twilio-inbound');
const messagesHandler = require('../api/messages');

// Helper to simulate express-like req and res
function createMockReqRes({ method = 'GET', body = {}, query = {}, headers = {} } = {}) {
  const req = {
    method,
    body,
    query,
    headers: { 'x-forwarded-for': '127.0.0.1', ...headers }
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('=== STARTING TWILIO SMS BACKEND TESTS ===\n');

  // 1. Test GSM-7 vs UCS-2 Encoding & Segment Calculator
  console.log('Test 1: GSM-7 vs UCS-2 calculations...');
  const gsmMsg = 'Kindred Market Alert: Conforming 30-yr fixed benchmark is 6.125%. Reply STOP to opt out.';
  const gsmAnalysis = smsUtils.analyzeSmsContent(gsmMsg);
  assert.strictEqual(gsmAnalysis.encoding, 'GSM-7', 'Should be GSM-7');
  assert.strictEqual(gsmAnalysis.segments, 1, 'Should fit in 1 segment');
  assert.strictEqual(gsmAnalysis.maxSegmentsExceeded, false, 'Should not exceed max segments');

  const ucs2Msg = 'Diwali Greeting 🪔 Happy Diwali! Reply STOP to opt out.';
  const ucs2Analysis = smsUtils.analyzeSmsContent(ucs2Msg);
  assert.strictEqual(ucs2Analysis.encoding, 'UCS-2', 'Should detect emoji and be UCS-2');
  assert.strictEqual(ucs2Analysis.hasNonGsmChars, true, 'Should flag non-GSM chars');

  const longGsm = 'A'.repeat(160 * 3 + 1); // 481 chars -> 4 segments
  const longAnalysis = smsUtils.analyzeSmsContent(longGsm);
  assert.strictEqual(longAnalysis.maxSegmentsExceeded, true, 'Should detect > 3 segments');
  console.log('  PASS: GSM-7 / UCS-2 segment analysis verified.');

  // 2. Test Phone Normalization & US E.164 Validation
  console.log('Test 2: Phone normalization & validation...');
  assert.strictEqual(smsUtils.normalizeUsPhone('(202) 555-0143'), '+12025550143');
  assert.strictEqual(smsUtils.normalizeUsPhone('202-555-0143'), '+12025550143');
  assert.strictEqual(smsUtils.normalizeUsPhone('12025550143'), '+12025550143');
  assert.strictEqual(smsUtils.isValidUsE164('+12025550143'), true);
  assert.strictEqual(smsUtils.isValidUsE164('+447911123456'), false, 'Non-US number must be false');
  console.log('  PASS: US E.164 normalization verified.');

  // 3. Test Opt-Out Appending
  console.log('Test 3: Opt-out language guarantee...');
  const withoutStop = smsUtils.ensureOptOutLanguage('Hello world from Kindred');
  assert(withoutStop.body.includes('Reply STOP to opt out'));
  assert.strictEqual(withoutStop.appended, true);

  const withStop = smsUtils.ensureOptOutLanguage('Hello world (Reply STOP to opt out)');
  assert.strictEqual(withStop.appended, false);
  console.log('  PASS: Opt-out language verified.');

  // 4. Test Cost Calculation
  console.log('Test 4: Cost estimation...');
  const cost = smsUtils.calculateEstimatedCost(1);
  assert.strictEqual(cost.segments, 1);
  assert.strictEqual(cost.estimatedCostUsd, '0.013');
  console.log('  PASS: Cost calculation verified (~$0.013/segment).');

  // 5. Test Quiet Hours
  console.log('Test 5: Quiet hours analysis...');
  const qh = smsUtils.checkRecipientQuietHours('+12025550143');
  assert.strictEqual(qh.timezone, 'America/New_York');
  assert(typeof qh.isQuietHours === 'boolean');
  console.log(`  PASS: Quiet hours verified for area code 202 (local time: ${qh.localTime}, quiet: ${qh.isQuietHours}).`);

  // 6. Test Storage Operations
  console.log('Test 6: Storage operations...');
  await storage.addSuppression('+15559998888', 'Test opt-out');
  assert.strictEqual(await storage.isSuppressed('+15559998888'), true);
  await storage.removeSuppression('+15559998888');
  assert.strictEqual(await storage.isSuppressed('+15559998888'), false);
  console.log('  PASS: Suppression storage verified.');

  // 7. Test POST /api/send-sms: Missing Consent Check
  console.log('Test 7: POST /api/send-sms (rejection of missing consent)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { to: '+12025550143', body: 'Test message', channel: 'sms', consent: false }
    });
    await sendSmsHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'CONSENT_REQUIRED');
  }
  console.log('  PASS: Missing consent rejected with 400.');

  // 8. Test POST /api/send-sms: Not Allowlisted Number
  console.log('Test 8: POST /api/send-sms (rejection of non-allowlisted number)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { to: '+19995551234', body: 'Test message', channel: 'sms', consent: true }
    });
    await sendSmsHandler(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.error, 'NUMBER_NOT_ALLOWLISTED');
  }
  console.log('  PASS: Non-allowlisted number rejected with 403.');

  // 9. Test POST /api/send-sms: Successful Send to Allowlisted Number
  console.log('Test 9: POST /api/send-sms (successful test send to allowlisted number)...');
  let testSid = null;
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { to: '+12025550143', body: 'Kindred mortgage rate alert. Reply STOP to opt out.', channel: 'sms', consent: true }
    });
    await sendSmsHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.to, '+12025550143');
    assert.strictEqual(res.body.status, 'queued');
    assert(res.body.sid.startsWith('SM_MOCK_'));
    testSid = res.body.sid;
  }
  console.log(`  PASS: Test SMS queued successfully with SID ${testSid}.`);

  // 10. Test POST /api/twilio-status: Status Callback Webhook
  console.log('Test 10: POST /api/twilio-status (delivery receipt callback)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { MessageSid: testSid, MessageStatus: 'delivered' }
    });
    await twilioStatusHandler(req, res);
    assert.strictEqual(res.statusCode, 200);

    const msgs = await storage.getMessages(10);
    const updated = msgs.find(m => m.sid === testSid);
    assert(updated, 'Message should exist in storage');
    assert.strictEqual(updated.status, 'delivered', 'Status should be updated to delivered');
  }
  console.log('  PASS: Status callback updated message to delivered.');

  // 11. Test POST /api/twilio-inbound: Inbound STOP & Inbound Reply
  console.log('Test 11: POST /api/twilio-inbound (STOP suppression)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { From: '+12025550143', Body: 'STOP', MessageSid: 'SM_INBOUND_STOP_1' }
    });
    await twilioInboundHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(await storage.isSuppressed('+12025550143'), true, 'Should now be suppressed');
  }
  console.log('  PASS: Inbound STOP added number to suppression list.');

  // 12. Test POST /api/send-sms: Sending to newly suppressed number should now fail
  console.log('Test 12: POST /api/send-sms (rejection of now-suppressed number)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { to: '+12025550143', body: 'Test after stop', channel: 'sms', consent: true }
    });
    await sendSmsHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'RECIPIENT_SUPPRESSED');
  }
  console.log('  PASS: Sending to suppressed number rejected with 400.');

  // 13. Test POST /api/twilio-inbound: Inbound START to re-subscribe
  console.log('Test 13: POST /api/twilio-inbound (START un-suppression)...');
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { From: '+12025550143', Body: 'START', MessageSid: 'SM_INBOUND_START_1' }
    });
    await twilioInboundHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(await storage.isSuppressed('+12025550143'), false, 'Should be unsuppressed');
  }
  console.log('  PASS: Inbound START removed number from suppression list.');

  // 14. Test GET /api/messages
  console.log('Test 14: GET /api/messages...');
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { to: '+12025550143' }
    });
    await messagesHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.messages));
    assert(res.body.messages.length > 0);
    console.log(`  PASS: Retrieved ${res.body.messages.length} messages.`);
  }

  console.log('\n=== ALL TWILIO SMS BACKEND TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\nFAIL: Test suite encountered an error:', err);
  process.exit(1);
});
