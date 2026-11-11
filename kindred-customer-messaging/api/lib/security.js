/**
 * Kindred Security & OWASP Hardening Middleware (security.js)
 * Implements:
 * 1. Origin verification (prevents malicious wildcard CORS access to borrower data)
 * 2. Mandatory HTTP Security Headers (OWASP ASVS & API Security Top 10)
 * 3. Request body size limiting & safe deserialization (prevents memory exhaustion DoS)
 * 4. Error message sanitization (prevents internal stack/path disclosure)
 */

const ALLOWED_LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://localhost:8080'
]);

/**
 * Applies OWASP recommended security headers and origin-checked CORS
 */
function applySecurityHeaders(req, res, { allowAnyOrigin = false, methods = 'GET, POST, OPTIONS' } = {}) {
  // 1. Mandatory Defense-in-Depth HTTP Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Twilio-Signature, telnyx-signature-ed25519, telnyx-timestamp');

  // 2. Strict Origin-Checked CORS
  const reqOrigin = req.headers.origin || '';
  const appBaseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

  if (allowAnyOrigin) {
    // For non-sensitive public endpoints (e.g. rate feed)
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (reqOrigin) {
    let isAllowed = false;
    if (ALLOWED_LOCAL_ORIGINS.has(reqOrigin)) {
      isAllowed = true;
    } else if (appBaseUrl && reqOrigin.toLowerCase() === appBaseUrl.toLowerCase()) {
      isAllowed = true;
    } else if (reqOrigin.endsWith('.vercel.app')) {
      // Allow preview and production deployments on kindred-messaging
      const parsedHost = new URL(reqOrigin).hostname;
      if (parsedHost.includes('kindred-messaging') || parsedHost.includes('localhost')) {
        isAllowed = true;
      }
    }

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin);
      res.setHeader('Vary', 'Origin');
    } else {
      // Do NOT set Access-Control-Allow-Origin for unauthorized third parties
      res.setHeader('Vary', 'Origin');
    }
  } else {
    // Direct or server-to-server request (e.g. carrier webhook)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}

/**
 * Safely parses request body with payload size limits (default 32KB max)
 */
function parseJsonBody(req, maxSizeBytes = 32768) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;

  if (typeof req.body === 'string') {
    if (req.body.length > maxSizeBytes) {
      const err = new Error('PAYLOAD_TOO_LARGE');
      err.statusCode = 413;
      throw err;
    }
    try {
      return JSON.parse(req.body);
    } catch (e) {
      const err = new Error('INVALID_JSON');
      err.statusCode = 400;
      throw err;
    }
  }
  return {};
}

/**
 * Sanitizes errors so internal filesystem paths and stack traces are never exposed
 */
function sanitizeError(err, publicFallback = 'An error occurred while processing your request.') {
  console.error('[Kindred API Error Trace]', err);

  const isClientError = err.statusCode && err.statusCode >= 400 && err.statusCode < 500;
  return {
    statusCode: err.statusCode || 500,
    error: isClientError ? (err.code || 'BAD_REQUEST') : 'INTERNAL_SERVER_ERROR',
    message: isClientError ? err.message : publicFallback
  };
}

module.exports = {
  applySecurityHeaders,
  parseJsonBody,
  sanitizeError
};
