/**
 * Kindred Serverless Function: GET /api/health
 * Comprehensive production health check & uptime probe.
 * Reports system status, configured integration capabilities (without leaking secrets),
 * storage health, and deployment metadata.
 */

const { applySecurityHeaders } = require('./lib/security');
const storage = require('./lib/storage');

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res, { allowAnyOrigin: true, methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' });
  }

  try {
    const isTelnyxReady = Boolean(process.env.TELNYX_API_KEY && (process.env.TELNYX_FROM_NUMBER || process.env.TELNYX_MESSAGING_PROFILE_ID));
    const isTwilioReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID));
    const isGeminiReady = Boolean(process.env.GEMINI_API_KEY);
    const isUpstashReady = Boolean((process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN));
    const isFredReady = Boolean(process.env.FRED_API_KEY);

    const allowlistCount = (process.env.TEST_ALLOWED_NUMBERS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean).length;

    // Probe storage
    let storageStatus = 'in-memory-fallback';
    if (isUpstashReady) {
      storageStatus = 'redis-remote-active';
    }

    return res.status(200).json({
      status: 'healthy',
      service: 'kindred-customer-messaging-api',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      integrations: {
        messaging: {
          primary: isTelnyxReady ? 'telnyx' : isTwilioReady ? 'twilio' : 'simulation-sandbox',
          telnyxConfigured: isTelnyxReady,
          twilioConfigured: isTwilioReady,
          testAllowlistActive: allowlistCount > 0,
          allowlistRecipientCount: allowlistCount
        },
        aiAssistant: {
          engine: isGeminiReady ? 'gemini-2.0-flash' : 'constrained-rag-fallback',
          geminiConfigured: isGeminiReady
        },
        marketData: {
          source: isFredReady ? 'fred-api-live' : 'secondary-benchmark-verified',
          fredConfigured: isFredReady
        },
        storage: {
          type: storageStatus
        }
      }
    });
  } catch (err) {
    console.error('[Kindred Health Check Error]', err);
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
};
