/**
 * Kindred Serverless Function: POST /api/twilio-status
 * Webhook for Twilio status callbacks.
 * Validates Twilio signature (X-Twilio-Signature) and updates delivery receipts:
 * queued -> sent -> delivered / failed / undelivered.
 */

const twilio = require('twilio');
const storage = require('./lib/storage');

module.exports = async function handler(req, res) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Twilio-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' });
  }

  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers['x-twilio-signature'];

    // In Vercel serverless functions, req.body may be parsed JSON or raw URL-encoded form data
    let params = req.body;
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        // Parse as application/x-www-form-urlencoded
        const querystring = require('querystring');
        params = querystring.parse(req.body);
      }
    } else if (!params) {
      params = {};
    }

    // 1. Webhook Signature Validation (when TWILIO_AUTH_TOKEN is configured)
    if (authToken && signature) {
      const appBaseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
      const fullUrl = `${appBaseUrl.replace(/\/$/, '')}/api/twilio-status`;

      const isValid = twilio.validateRequest(authToken, signature, fullUrl, params);
      if (!isValid) {
        console.warn('[Twilio Status Webhook] Signature validation failed for:', fullUrl);
        return res.status(403).json({
          error: 'INVALID_SIGNATURE',
          message: 'Twilio X-Twilio-Signature verification failed.'
        });
      }
    }

    // 2. Extract Message details
    const sid = params.MessageSid || params.SmsSid;
    const status = (params.MessageStatus || params.SmsStatus || 'unknown').toLowerCase();
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;

    if (!sid) {
      return res.status(400).json({ error: 'MISSING_SID', message: 'No MessageSid provided.' });
    }

    // 3. Update Message in Persistent / Memory Storage
    const updated = await storage.updateMessageStatus(sid, status, errorCode, errorMessage);

    console.log(`[Twilio Status Update] Message ${sid}: ${status} (ErrorCode: ${errorCode || 'None'})`);

    // Respond with 200 and standard XML/JSON
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err) {
    console.error('[Twilio Status Handler Error]', err);
    return res.status(500).json({ error: 'STATUS_HANDLER_ERROR', message: err.message });
  }
};
