/**
 * Kindred Unified Messaging Provider Engine (messaging-provider.js)
 * Supports cost-effective multi-provider routing:
 * 1. Telnyx API v2 (Primary Cost-Effective Carrier: ~$0.0040/SMS, ~45% cheaper than Twilio)
 * 2. Twilio API (Standard Alternative / Fallback)
 * 3. Graceful Mock Engine (for local dev / demo sandbox when keys are pending)
 */

/**
 * Dispatch an outbound SMS/WhatsApp message through the best configured provider.
 * Automatically chooses Telnyx if TELNYX_API_KEY is present, then Twilio if TWILIO_ACCOUNT_SID is present.
 */
async function dispatchMessage({ to, body, channel = 'sms', appBaseUrl = '' }) {
  const telnyxApiKey = process.env.TELNYX_API_KEY;
  const telnyxFrom = process.env.TELNYX_FROM_NUMBER;
  const telnyxProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID;

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  // 1. TELNYX DISPATCH (Primary Cost-Effective Choice)
  if (telnyxApiKey && (telnyxFrom || telnyxProfileId)) {
    try {
      const webhookUrl = appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/api/telnyx-status` : undefined;
      const telnyxPayload = {
        to,
        text: body
      };

      if (telnyxFrom) telnyxPayload.from = telnyxFrom;
      if (telnyxProfileId) telnyxPayload.messaging_profile_id = telnyxProfileId;
      if (webhookUrl) telnyxPayload.webhook_url = webhookUrl;

      const resp = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${telnyxApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(telnyxPayload)
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errorMsg = data?.errors?.[0]?.detail || data?.message || `Telnyx HTTP ${resp.status}`;
        throw new Error(`Telnyx Dispatch Error: ${errorMsg}`);
      }

      const messageData = data.data || {};
      return {
        provider: 'telnyx',
        sid: messageData.id || `telnyx_${Date.now()}`,
        status: messageData.to?.[0]?.status || 'queued',
        from: messageData.from?.phone_number || telnyxFrom,
        mock: false,
        costSavingsNotice: 'Dispatched via Telnyx (~45% cost savings vs legacy carriers).'
      };
    } catch (err) {
      console.error('[Kindred Telnyx Dispatch Failed]', err.message);
      // If Twilio is also configured, fall back to Twilio
      if (!twilioSid || !twilioToken) throw err;
      console.warn('[Kindred Provider Fallback] Falling back to Twilio...');
    }
  }

  // 2. TWILIO DISPATCH (Alternative / Fallback)
  if (twilioSid && twilioToken && (twilioFrom || twilioMessagingServiceSid)) {
    const twilio = require('twilio');
    const client = twilio(twilioSid, twilioToken);

    const twilioPayload = {
      to,
      body
    };

    if (twilioMessagingServiceSid) {
      twilioPayload.messagingServiceSid = twilioMessagingServiceSid;
    } else if (twilioFrom) {
      twilioPayload.from = twilioFrom;
    }

    if (appBaseUrl) {
      twilioPayload.statusCallback = `${appBaseUrl.replace(/\/$/, '')}/api/twilio-status`;
    }

    const message = await client.messages.create(twilioPayload);

    return {
      provider: 'twilio',
      sid: message.sid,
      status: message.status || 'queued',
      from: message.from || twilioFrom || twilioMessagingServiceSid,
      mock: false,
      costSavingsNotice: 'Dispatched via Twilio.'
    };
  }

  // 3. MOCK SIMULATION DISPATCH (Sandbox Dev Mode)
  const mockSid = `SM_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    provider: 'simulation',
    sid: mockSid,
    status: 'queued',
    from: telnyxFrom || twilioFrom || '+18005550199',
    mock: true,
    notice: 'No live provider API keys configured in environment. Test message simulated and recorded successfully.'
  };
}

module.exports = {
  dispatchMessage
};
