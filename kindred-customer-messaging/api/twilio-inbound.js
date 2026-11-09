/**
 * Kindred Serverless Function: POST /api/twilio-inbound
 * Webhook for incoming SMS messages and borrower replies.
 * Validates Twilio signature (X-Twilio-Signature).
 * Handles STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT -> adds to suppression registry.
 * Handles START/UNSTOP -> removes from suppression registry.
 * Stores inbound messages so the Two-Way Inbox reflects live conversations.
 * Responds with standard valid TwiML.
 */

const twilio = require('twilio');
const storage = require('./lib/storage');
const { normalizeUsPhone } = require('./lib/sms-utils');

const STOP_COMMANDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_COMMANDS = new Set(['START', 'UNSTOP']);

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

    let params = req.body;
    if (typeof params === 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        const querystring = require('querystring');
        params = querystring.parse(req.body);
      }
    } else if (!params) {
      params = {};
    }

    // 1. Signature Verification
    if (authToken && signature) {
      const appBaseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
      const fullUrl = `${appBaseUrl.replace(/\/$/, '')}/api/twilio-inbound`;

      const isValid = twilio.validateRequest(authToken, signature, fullUrl, params);
      if (!isValid) {
        console.warn('[Twilio Inbound Webhook] Signature verification failed for:', fullUrl);
        return res.status(403).json({
          error: 'INVALID_SIGNATURE',
          message: 'Twilio X-Twilio-Signature verification failed.'
        });
      }
    }

    // 2. Extract Inbound SMS details
    const from = normalizeUsPhone(params.From || '');
    const to = normalizeUsPhone(params.To || '');
    const body = (params.Body || '').trim();
    const sid = params.MessageSid || params.SmsSid || `inbound_${Date.now()}`;

    if (!from || !body) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const upperBody = body.toUpperCase();

    // 3. Automated Opt-Out Suppression Handling (TCPA Mandate)
    if (STOP_COMMANDS.has(upperBody)) {
      await storage.addSuppression(from, `Automated opt-out via text: '${body}'`);
      console.log(`[Twilio Inbound] Recipient ${from} added to suppression list via command: ${body}`);
    } else if (START_COMMANDS.has(upperBody)) {
      await storage.removeSuppression(from);
      console.log(`[Twilio Inbound] Recipient ${from} removed from suppression list via command: ${body}`);
    }

    // 4. Save Inbound Message for Two-Way Inbox
    await storage.saveMessage({
      sid,
      direction: 'inbound',
      channel: 'sms',
      to,
      from,
      body,
      status: 'received',
      timestamp: new Date().toISOString()
    });

    // 5. Respond with valid TwiML
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (err) {
    console.error('[Twilio Inbound Handler Error]', err);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
};
