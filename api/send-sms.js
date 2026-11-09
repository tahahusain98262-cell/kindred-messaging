/**
 * Kindred Serverless Function: POST /api/send-sms
 * Dispatches test SMS messages via Twilio with strict test allowlisting,
 * TCPA consent verification, GSM-7 segment validation, quiet-hours analysis,
 * suppression list enforcement, and per-IP rate limiting.
 */

const {
  normalizeUsPhone,
  isValidUsE164,
  analyzeSmsContent,
  ensureOptOutLanguage,
  calculateEstimatedCost,
  checkRecipientQuietHours
} = require('./lib/sms-utils');

const storage = require('./lib/storage');

module.exports = async function handler(req, res) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are permitted.'
    });
  }

  try {
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { to: rawTo, body: rawBody, channel = 'sms', consent } = bodyData;

    // 1. Channel Check (SMS only for real sending; WhatsApp remains simulation)
    if (channel !== 'sms') {
      return res.status(400).json({
        error: 'INVALID_CHANNEL',
        message: 'Real carrier dispatch is currently supported for SMS only. WhatsApp is available in Sandbox Simulation mode.'
      });
    }

    // 2. Mandatory Consent Verification
    if (!consent) {
      return res.status(400).json({
        error: 'CONSENT_REQUIRED',
        message: 'Explicit consent is mandatory before sending SMS. You must verify that the recipient has opted in.'
      });
    }

    // 3. Recipient Phone Normalization & US E.164 Validation
    const to = normalizeUsPhone(rawTo);
    if (!to || !isValidUsE164(to)) {
      return res.status(400).json({
        error: 'INVALID_US_NUMBER',
        message: 'Recipient must be a valid US phone number in E.164 format (+1XXXXXXXXXX, 10 US digits after +1).'
      });
    }

    // 4. Test Mode Allowlist Enforcement (MANDATORY SECURITY CONSTRAINT)
    const rawAllowlist = process.env.TEST_ALLOWED_NUMBERS || '';
    const allowedNumbers = rawAllowlist
      .split(',')
      .map(n => normalizeUsPhone(n))
      .filter(Boolean);

    if (allowedNumbers.length === 0) {
      return res.status(403).json({
        error: 'ALLOWLIST_UNCONFIGURED',
        message: 'TEST_ALLOWED_NUMBERS is not configured in environment variables. To send test messages, add your US test phone number to TEST_ALLOWED_NUMBERS in your Vercel project settings.'
      });
    }

    if (!allowedNumbers.includes(to)) {
      return res.status(403).json({
        error: 'NUMBER_NOT_ALLOWLISTED',
        message: `The number ${to} is not in TEST_ALLOWED_NUMBERS. In test mode, messages can only be sent to pre-approved numbers. Add this number to TEST_ALLOWED_NUMBERS in your Vercel environment settings to test with it.`,
        allowedCount: allowedNumbers.length
      });
    }

    // 5. Suppression Registry Check (Opted-Out Numbers)
    const isAlreadySuppressed = await storage.isSuppressed(to);
    if (isAlreadySuppressed) {
      return res.status(400).json({
        error: 'RECIPIENT_SUPPRESSED',
        message: `Recipient ${to} has previously opted out via STOP. Outbound messaging is strictly locked until they reply START.`
      });
    }

    // 6. Body Non-Empty Check
    if (!rawBody || typeof rawBody !== 'string' || !rawBody.trim()) {
      return res.status(400).json({
        error: 'EMPTY_BODY',
        message: 'Message body cannot be empty.'
      });
    }

    // 7. Ensure Opt-Out Language ("Reply STOP to opt out")
    const { body: finalBody, appended: stopAppended } = ensureOptOutLanguage(rawBody);

    // 8. Analyze GSM-7 vs UCS-2 Encoding and Segment Count
    const analysis = analyzeSmsContent(finalBody);

    if (analysis.maxSegmentsExceeded) {
      return res.status(400).json({
        error: 'MAX_SEGMENTS_EXCEEDED',
        message: `Message exceeds the maximum limit of 3 SMS segments (${analysis.segments} segments calculated for ${analysis.chars} characters in ${analysis.encoding} mode). Please shorten your message.`,
        analysis
      });
    }

    // 9. Cost Estimation
    const cost = calculateEstimatedCost(analysis.segments);

    // 10. Recipient Quiet Hours Analysis
    const quietHours = checkRecipientQuietHours(to);

    // 11. Per-IP Rate Limiting (5 sends per minute)
    const clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.socket?.remoteAddress || '127.0.0.1');

    const rateLimit = await storage.checkIpRateLimit(clientIp, 5);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded: Maximum 5 test SMS sends per minute per IP address. Please wait a moment before sending another message.'
      });
    }

    // 12. Daily Send Cap
    const dailyCapLimit = parseInt(process.env.DAILY_SEND_CAP || '50', 10);
    const dailyCap = await storage.checkDailyCap(dailyCapLimit);
    if (!dailyCap.allowed) {
      return res.status(429).json({
        error: 'DAILY_CAP_EXCEEDED',
        message: `Daily test message cap (${dailyCapLimit} messages/day) reached for this deployment. Contact the administrator to increase DAILY_SEND_CAP.`
      });
    }

    // 13. Twilio API Dispatch
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const appBaseUrl = process.env.APP_BASE_URL;

    const hasTwilioCredentials = Boolean(accountSid && authToken && (fromNumber || messagingServiceSid));

    let dispatchResult = null;

    if (hasTwilioCredentials) {
      // Real Twilio Client
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);

      const twilioPayload = {
        to,
        body: finalBody
      };

      if (messagingServiceSid) {
        twilioPayload.messagingServiceSid = messagingServiceSid;
      } else if (fromNumber) {
        twilioPayload.from = fromNumber;
      }

      if (appBaseUrl) {
        const statusCallbackUrl = `${appBaseUrl.replace(/\/$/, '')}/api/twilio-status`;
        twilioPayload.statusCallback = statusCallbackUrl;
      }

      const message = await client.messages.create(twilioPayload);

      dispatchResult = {
        sid: message.sid,
        status: message.status || 'queued',
        from: message.from || fromNumber || messagingServiceSid,
        mock: false
      };
    } else {
      // Safe Mock Fallback (when env vars are not yet populated in local or preview)
      const mockSid = `SM_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      dispatchResult = {
        sid: mockSid,
        status: 'queued',
        from: fromNumber || '+18005550199',
        mock: true,
        notice: 'Twilio credentials not configured in Vercel environment. Simulated test message recorded successfully.'
      };
    }

    // 14. Save message record to storage
    const messageRecord = await storage.saveMessage({
      sid: dispatchResult.sid,
      direction: 'outbound',
      channel: 'sms',
      to,
      from: dispatchResult.from,
      body: finalBody,
      segments: analysis.segments,
      status: dispatchResult.status,
      estimatedCostUsd: cost.estimatedCostUsd,
      mock: dispatchResult.mock
    });

    // 15. Return success payload
    return res.status(200).json({
      success: true,
      sid: dispatchResult.sid,
      status: dispatchResult.status,
      to,
      from: dispatchResult.from,
      body: finalBody,
      stopAppended,
      segments: analysis.segments,
      chars: analysis.chars,
      encoding: analysis.encoding,
      hasNonGsmChars: analysis.hasNonGsmChars,
      estimatedCostUsd: cost.estimatedCostUsd,
      costBreakdown: cost,
      quietHours,
      rateLimitRemaining: rateLimit.remaining,
      dailyRemaining: dailyCap.remaining,
      mock: dispatchResult.mock,
      notice: dispatchResult.notice || null
    });

  } catch (err) {
    console.error('[Kindred Send SMS Error]', err);

    // Map Twilio-specific error codes
    const isTwilioError = err.code && typeof err.code === 'number';
    const statusCode = isTwilioError ? 400 : 500;

    return res.status(statusCode).json({
      error: isTwilioError ? `TWILIO_ERROR_${err.code}` : 'SEND_FAILED',
      message: err.message || 'An error occurred while dispatching the SMS.',
      code: err.code || null,
      moreInfo: err.moreInfo || null
    });
  }
};
