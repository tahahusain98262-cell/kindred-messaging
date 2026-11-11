/**
 * Kindred Serverless Function: GET /api/messages
 * Retrieves recent message logs, delivery status receipts,
 * inbound borrower replies, and active suppression records for the UI.
 */

const storage = require('./lib/storage');
const { normalizeUsPhone, checkRecipientQuietHours } = require('./lib/sms-utils');
const { applySecurityHeaders, sanitizeError } = require('./lib/security');

module.exports = async function handler(req, res) {
  // Apply Origin-verified CORS and Defense-in-depth Security Headers
  applySecurityHeaders(req, res, { allowAnyOrigin: false, methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' });
  }

  try {
    const rawTo = req.query.to || req.query.phone || null;
    const to = rawTo ? normalizeUsPhone(rawTo) : null;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));

    const messages = await storage.getMessages(limit, to);
    const suppressions = await storage.getSuppressionList();
    const isTargetSuppressed = to ? await storage.isSuppressed(to) : false;
    const quietHours = to ? checkRecipientQuietHours(to) : null;

    const rawAllowlist = process.env.TEST_ALLOWED_NUMBERS || '';
    const allowedCount = rawAllowlist.split(',').filter(Boolean).length;

    return res.status(200).json({
      success: true,
      testMode: true,
      allowedNumbersCount: allowedCount,
      messages,
      isSuppressed: isTargetSuppressed,
      suppressionCount: suppressions.length,
      suppressions: suppressions.map(s => ({
        phone: s.phone,
        reason: s.reason,
        suppressedAt: s.suppressedAt
      })),
      quietHours
    });
  } catch (err) {
    const safe = sanitizeError(err, 'Failed to retrieve message logs.');
    return res.status(safe.statusCode).json({ error: safe.error, message: safe.message });
  }
};
