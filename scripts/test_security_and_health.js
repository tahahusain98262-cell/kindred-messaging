/**
 * Kindred Security, OWASP & Health Test Suite
 * Verifies:
 * 1. Strict Origin-Checked CORS (prevents cross-origin data exfiltration)
 * 2. Mandatory HTTP Security Headers (X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy)
 * 3. Payload size limiting & safe deserialization
 * 4. Error sanitization (no stack trace exposure)
 * 5. Production Health Check endpoint (/api/health)
 */

const assert = require('assert');
const healthHandler = require('../api/health');
const messagesHandler = require('../api/messages');
const sendSmsHandler = require('../api/send-sms');
const ratesHandler = require('../api/rates');
const { applySecurityHeaders, parseJsonBody, sanitizeError } = require('../api/lib/security');

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
    getHeader(key) { return resHeaders[key.toLowerCase()]; },
    status(code) { statusCode = code; return res; },
    json(data) { responseData = data; return res; },
    send(data) { responseData = data; return res; },
    end() { return res; }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData, getHeaders: () => resHeaders };
}

async function runSecurityTests() {
  console.log('=== RUNNING SECURITY, OWASP & HEALTH SUITE ===\n');

  // Test 1: Health Check Endpoint
  console.log('Test 1: GET /api/health endpoint...');
  {
    const { req, res, getStatus, getData, getHeaders } = createMockReqRes({ method: 'GET' });
    await healthHandler(req, res);
    assert.strictEqual(getStatus(), 200, 'Health check should return 200');
    const data = getData();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.service, 'kindred-customer-messaging-api');
    assert.ok(data.integrations.messaging, 'Messaging integration status present');
    assert.ok(data.integrations.aiAssistant, 'AI assistant status present');
    assert.ok(getHeaders()['x-content-type-options'], 'nosniff header present');
    assert.ok(getHeaders()['x-frame-options'], 'DENY header present');
    console.log('  PASS: Health check responded with healthy status and security headers.');
  }

  // Test 2: Origin-checked CORS on sensitive endpoint (GET /api/messages)
  console.log('Test 2: Origin-checked CORS on sensitive data (GET /api/messages)...');
  {
    // A: Unauthorized origin (malicious site)
    const { req: badReq, res: badRes } = createMockReqRes({
      method: 'GET',
      headers: { origin: 'https://evil-attacker-site.com' }
    });
    await messagesHandler(badReq, badRes);
    assert.strictEqual(badRes.getHeader('access-control-allow-origin'), undefined, 'Must NOT reflect unauthorized origin');
    console.log('  PASS: Unauthorized third-party origin blocked from CORS reflection.');

    // B: Authorized origin (localhost)
    const { req: goodReq, res: goodRes } = createMockReqRes({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' }
    });
    await messagesHandler(goodReq, goodRes);
    assert.strictEqual(goodRes.getHeader('access-control-allow-origin'), 'http://localhost:3000', 'Must allow approved local dev origin');
    console.log('  PASS: Authorized origin granted Access-Control-Allow-Origin.');
  }

  // Test 3: Defense-in-depth HTTP Security Headers
  console.log('Test 3: Defense-in-depth OWASP Security Headers...');
  {
    const { req, res, getHeaders } = createMockReqRes({ method: 'GET' });
    applySecurityHeaders(req, res);
    const headers = getHeaders();
    assert.strictEqual(headers['x-content-type-options'], 'nosniff', 'MIME sniffing disabled');
    assert.strictEqual(headers['x-frame-options'], 'DENY', 'Clickjacking disabled');
    assert.strictEqual(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(headers['strict-transport-security'].includes('max-age=31536000'), 'HSTS configured');
    console.log('  PASS: All OWASP defense-in-depth headers verified.');
  }

  // Test 4: Payload Size Limiting (DoS prevention)
  console.log('Test 4: Request payload size limiter...');
  {
    const massiveString = 'A'.repeat(50000);
    const mockReq = { body: JSON.stringify({ huge: massiveString }) };
    assert.throws(() => {
      parseJsonBody(mockReq, 10000);
    }, (err) => {
      return err.message === 'PAYLOAD_TOO_LARGE' && err.statusCode === 413;
    });
    console.log('  PASS: Overly large payload rejected with HTTP 413.');
  }

  // Test 5: Error Sanitization (prevent internal stack/path disclosure)
  console.log('Test 5: Error sanitization & stack hiding...');
  {
    const sensitiveError = new Error('Database connection failed at /var/internal/db.sock: password=SECRET_PASS');
    const sanitized = sanitizeError(sensitiveError, 'Database unavailable.');
    assert.strictEqual(sanitized.statusCode, 500);
    assert.strictEqual(sanitized.error, 'INTERNAL_SERVER_ERROR');
    assert.strictEqual(sanitized.message, 'Database unavailable.', 'Sensitive database error message must not be exposed');
    console.log('  PASS: Sensitive internal error traces masked cleanly from client responses.');
  }

  console.log('\n=== ALL SECURITY & HEALTH CHECKS PASSED SUCCESSFULLY! ===');
}

runSecurityTests().catch(err => {
  console.error('\nFAIL: Security test suite failed:', err);
  process.exit(1);
});
