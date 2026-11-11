/**
 * Kindred Serverless Function: POST /api/telnyx-inbound
 * Webhook for incoming SMS and WhatsApp messages from Telnyx.
 * Handles TCPA STOP/UNSUBSCRIBE commands -> immediate suppression.
 * Handles START/UNSTOP commands -> removes suppression.
 * Automatically saves inbound messages to storage for live Two-Way Inbox display.
 */

const storage = require('./lib/storage');
const { normalizeUsPhone } = require('./lib/sms-utils');
const { applySecurityHeaders, parseJsonBody, sanitizeError } = require('./lib/security');

const STOP_COMMANDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_COMMANDS = new Set(['START', 'UNSTOP']);

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res, { allowAnyOrigin: true, methods: 'POST, OPTIONS' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' });
  }

  try {
    const body = parseJsonBody(req, 65536);

    const event = body.data || {};
    const eventType = event.event_type;

    if (eventType !== 'message.received') {
      // Acknowledge other Telnyx events (e.g. ping/verification)
      return res.status(200).json({ received: true });
    }

    const payload = event.payload || {};
    const fromPhone = normalizeUsPhone(payload.from?.phone_number || '');
    const toPhone = normalizeUsPhone(payload.to?.[0]?.phone_number || '');
    const text = (payload.text || '').trim();
    const messageId = payload.id || event.id || `telnyx_in_${Date.now()}`;

    const trimmedUpper = text.toUpperCase();

    // 1. Process STOP / Opt-Out
    if (STOP_COMMANDS.has(trimmedUpper)) {
      if (fromPhone) {
        await storage.addSuppression(fromPhone, `Telnyx Inbound carrier opt-out via '${trimmedUpper}'`);
        console.log(`[Telnyx Webhook] Contact ${fromPhone} added to suppression list.`);
      }
    }

    // 2. Process START / Opt-In
    if (START_COMMANDS.has(trimmedUpper)) {
      if (fromPhone) {
        await storage.removeSuppression(fromPhone);
        console.log(`[Telnyx Webhook] Contact ${fromPhone} opt-in restored via '${trimmedUpper}'.`);
      }
    }

    // 3. Save to message store for Two-Way Inbox
    await storage.saveMessage({
      sid: messageId,
      direction: 'inbound',
      channel: 'sms',
      to: toPhone,
      from: fromPhone,
      body: text,
      status: 'received',
      provider: 'telnyx'
    });

    return res.status(200).json({ success: true, messageId });
  } catch (err) {
    console.error('[Telnyx Inbound Handler Error]', err);
    return res.status(500).json({ error: 'INBOUND_HANDLER_FAILED', message: err.message });
  }
};
