/**
 * Kindred Serverless Function: POST /api/telnyx-status
 * Webhook for Telnyx carrier delivery status updates.
 * Updates message lifecycle: queued -> sent -> delivered / failed / undelivered.
 */

const storage = require('./lib/storage');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, telnyx-signature-ed25519, telnyx-timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const event = body.data || {};
    const eventType = event.event_type || '';
    const payload = event.payload || {};
    const messageId = payload.id;

    if (!messageId) {
      return res.status(200).json({ received: true });
    }

    let status = 'queued';
    if (eventType === 'message.delivered') status = 'delivered';
    else if (eventType === 'message.sent') status = 'sent';
    else if (eventType === 'message.undelivered') status = 'undelivered';
    else if (eventType === 'message.failed') status = 'failed';

    const updated = await storage.updateMessageStatus(messageId, status, payload.errors?.[0]?.code);

    return res.status(200).json({ success: true, messageId, status, updated: Boolean(updated) });
  } catch (err) {
    console.error('[Telnyx Status Handler Error]', err);
    return res.status(500).json({ error: 'STATUS_HANDLER_ERROR', message: err.message });
  }
};
