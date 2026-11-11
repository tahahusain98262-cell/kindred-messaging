/**
 * Kindred Cost-Effective API Integration Test Suite
 * Validates Telnyx/Twilio unified messaging, Gemini AI assistant, live rates, and webhooks.
 */

const assert = require('assert');
const sendSmsHandler = require('../api/send-sms');
const aiAssistantHandler = require('../api/ai-assistant');
const ratesHandler = require('../api/rates');
const telnyxInboundHandler = require('../api/telnyx-inbound');
const telnyxStatusHandler = require('../api/telnyx-status');
const storage = require('../api/lib/storage');

function createMockReqRes({ method = 'GET', body = {}, query = {}, headers = {} }) {
  let statusCode = 200;
  let responseData = null;
  const resHeaders = {};

  const req = {
    method,
    body,
    query,
    headers,
    socket: { remoteAddress: '127.0.0.1' }
  };

  const res = {
    setHeader(key, val) { resHeaders[key.toLowerCase()] = val; return res; },
    status(code) { statusCode = code; return res; },
    json(data) { responseData = data; return res; },
    send(data) { responseData = data; return res; },
    end() { return res; }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runTests() {
  console.log('=== RUNNING COST-EFFECTIVE API INTEGRATION TESTS ===\n');

  // Test 1: AI Assistant - Intent Classification & Grounding
  console.log('Test 1: AI Assistant Intent Classification & Compliance Grounding...');
  {
    const { req, res, getStatus, getData } = createMockReqRes({
      method: 'POST',
      body: {
        messageText: 'What are your conforming 30-year fixed mortgage rates today?',
        contactName: 'Sarah Jenkins',
        channel: 'sms'
      }
    });

    await aiAssistantHandler(req, res);
    assert.strictEqual(getStatus(), 200, 'AI Assistant should return 200');
    const data = getData();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.intent, 'Mortgage Rate Inquiry');
    assert.ok(data.suggestedReply.includes('6.125%'), 'Suggested reply should cite verified 6.125% benchmark');
    assert.ok(data.citation.includes('Benchmark') || data.citation.includes('Market'), 'Must cite verified benchmark');
    console.log('  PASS: AI Assistant correctly identified rate inquiry, quoted 6.125%, and cited benchmark.');
  }

  // Test 2: AI Assistant - Opt-out STOP intent
  console.log('Test 2: AI Assistant Opt-Out Rule Handling...');
  {
    const { req, res, getStatus, getData } = createMockReqRes({
      method: 'POST',
      body: {
        messageText: 'STOP',
        contactName: 'David Lee',
        channel: 'sms'
      }
    });

    await aiAssistantHandler(req, res);
    assert.strictEqual(getStatus(), 200);
    const data = getData();
    assert.strictEqual(data.isOptOut, true);
    assert.strictEqual(data.intent, 'Opt-Out Request');
    assert.ok(data.citation.includes('TCPA'), 'Citation must reference TCPA compliance');
    console.log('  PASS: AI Assistant handled STOP command with immediate compliance suppression text.');
  }

  // Test 3: Live Rates API
  console.log('Test 3: Live Mortgage Benchmark Rates API...');
  {
    const { req, res, getStatus, getData } = createMockReqRes({ method: 'GET' });
    await ratesHandler(req, res);
    assert.strictEqual(getStatus(), 200);
    const data = getData();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.rates));
    assert.strictEqual(data.rates.length, 5);
    const conforming30 = data.rates.find(r => r.product.includes('30-Year Fixed Conforming'));
    assert.ok(conforming30, '30-Year fixed rate must be included');
    assert.strictEqual(conforming30.status, 'VERIFIED');
    console.log(`  PASS: Rates API returned 5 verified benchmarks (30-Yr Fixed: ${conforming30.rate}).`);
  }

  // Test 4: Telnyx Inbound Webhook & STOP Suppression
  console.log('Test 4: Telnyx Inbound Webhook & Immediate TCPA Suppression...');
  {
    const testOptOutPhone = '+12025550999';
    const { req, res, getStatus } = createMockReqRes({
      method: 'POST',
      body: {
        data: {
          event_type: 'message.received',
          id: 'telnyx_evt_123',
          payload: {
            id: 'msg_telnyx_123',
            from: { phone_number: testOptOutPhone },
            to: [{ phone_number: '+18005550199' }],
            text: 'STOP'
          }
        }
      }
    });

    await telnyxInboundHandler(req, res);
    assert.strictEqual(getStatus(), 200);
    const isSuppressed = await storage.isSuppressed(testOptOutPhone);
    assert.strictEqual(isSuppressed, true, 'Phone must be added to suppression registry');
    console.log('  PASS: Telnyx inbound STOP webhook automatically registered global suppression.');
  }

  // Test 5: Telnyx Status Webhook (Delivery Receipt)
  console.log('Test 5: Telnyx Delivery Status Webhook...');
  {
    const testMsgId = 'telnyx_test_msg_456';
    await storage.saveMessage({
      sid: testMsgId,
      direction: 'outbound',
      to: '+12025550143',
      body: 'Test dispatch',
      status: 'queued'
    });

    const { req, res, getStatus } = createMockReqRes({
      method: 'POST',
      body: {
        data: {
          event_type: 'message.delivered',
          payload: {
            id: testMsgId
          }
        }
      }
    });

    await telnyxStatusHandler(req, res);
    assert.strictEqual(getStatus(), 200);
    const messages = await storage.getMessages(10, '+12025550143');
    const updated = messages.find(m => m.sid === testMsgId);
    assert.strictEqual(updated.status, 'delivered', 'Message status must be updated to delivered');
    console.log('  PASS: Telnyx status webhook updated message lifecycle to delivered.');
  }

  // Test 6: Unified send-sms handler with allowlist check
  console.log('Test 6: Send-SMS handler security & allowlist...');
  {
    process.env.TEST_ALLOWED_NUMBERS = '+12025550143';
    const { req, res, getStatus, getData } = createMockReqRes({
      method: 'POST',
      body: {
        to: '+12025550143',
        body: 'Kindred cost-effective dispatch verification test.',
        consent: true
      }
    });

    await sendSmsHandler(req, res);
    assert.strictEqual(getStatus(), 200);
    const data = getData();
    assert.strictEqual(data.success, true);
    assert.ok(data.provider, 'Provider must be indicated');
    console.log(`  PASS: Send-SMS routed successfully via provider '${data.provider}'.`);
  }

  console.log('\n=== ALL COST-EFFECTIVE API INTEGRATION TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('\nFAIL: Test error:', err);
  process.exit(1);
});
