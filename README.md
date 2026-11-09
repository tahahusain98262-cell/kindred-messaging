# Kindred — Customer Messaging & Relationship Automation

Kindred is an enterprise-grade customer messaging and relationship automation platform designed for loan officers, mortgage advisors, and relationship teams (SMS carrier messages + WhatsApp Business).

- **Live Deployment:** [https://kindred-messaging.vercel.app](https://kindred-messaging.vercel.app)
- **Local Dev Server:** `http://localhost:3000` (`python -m http.server 3000 --directory kindred-customer-messaging`)

---

## Architecture Overview

```
kindred-messaging/
├── api/                             # Vercel Serverless Functions (Node.js runtime)
│   ├── lib/
│   │   ├── sms-utils.js             # GSM-7 vs UCS-2 segment calculator, US E.164 validator, quiet hours & cost engine
│   │   └── storage.js               # Upstash Redis / Vercel KV REST persistence with in-memory fallback
│   ├── send-sms.js                  # POST /api/send-sms (Twilio dispatch + strict allowlist enforcement)
│   ├── twilio-status.js             # POST /api/twilio-status (Delivery receipt webhook callback)
│   ├── twilio-inbound.js            # POST /api/twilio-inbound (Inbound replies & STOP/START opt-out suppression)
│   └── messages.js                  # GET /api/messages (Live message history, receipts & suppression status)
├── kindred-customer-messaging/      # Front-end Application (Pure vanilla HTML/CSS/JS modules)
│   ├── index.html                   # Flagship web application (Landing + Pilot Workspace)
│   ├── css/                         # Clean editorial typography & modular stylesheets
│   ├── js/                          # Router, Composer, Two-Way Inbox, Contacts, Analytics
│   └── tests/                       # Static verification test suite (77 verified DOM IDs)
├── .env.example                     # Environment variable template with security guidelines
├── vercel.json                      # Vercel routing rules (/api/* -> Serverless functions)
└── package.json                     # Node dependencies (official twilio SDK)
```

---

## Twilio Real SMS Integration (Test Mode)

The Kindred Message Composer supports two sending modes:
1. **Sandbox Simulation Mode (Default):** Animated dry-run campaign simulation with synthetic metrics and audit logs. Zero real SMS messages are dispatched.
2. **Real Test SMS Mode (Twilio Carrier):** Sends real carrier SMS messages to pre-approved US recipient numbers via Twilio, with live segment calculation, cost estimation, recipient timezone quiet hours verification, and real-time delivery tracking timeline.

### Mandatory Security Constraints
- **Zero Frontend Credentials:** Twilio Account SID and Auth Tokens are never exposed in client-side code, Git commits, or logs.
- **Strict Allowlist Enforcement:** `/api/send-sms` strictly rejects any number not explicitly listed in the `TEST_ALLOWED_NUMBERS` environment variable.
- **TCPA Consent Check:** Explicit opt-in certification is required before dispatch.
- **Suppression Registry:** If a recipient texts `STOP`, outbound messaging is locked immediately until they text `START`.
- **Webhook Signature Verification:** All status and inbound webhooks validate the cryptographic `X-Twilio-Signature` header.

---

## Twilio Setup & Onboarding Checklist

Follow this step-by-step checklist to configure real SMS sending on your Vercel deployment:

### Step 1: Create or Sign In to Twilio
1. Go to [https://console.twilio.com/](https://console.twilio.com/) and sign in or create an account.
2. From the Twilio Console dashboard, locate your:
   - **Account SID** (e.g. `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (keep this secret)

### Step 2: Acquire a US Toll-Free Number
- In the US, A2P (Application-to-Person) carrier regulations require either a **Toll-Free Number with Verification** or a registered **A2P 10DLC Brand/Campaign**.
- **Recommendation for testing:** Use a **US Toll-Free Number** (starts with `+1800`, `+1888`, `+1877`, `+1866`, `+1855`, `+1844`, or `+1833`).
  - **Toll-Free Verification is completely free** and approved within 1–3 business days.
  - A2P 10DLC requires brand registration fees ($4) and monthly campaign fees ($1.50–$10/mo).
- Navigate to **Phone Numbers ➔ Manage ➔ Buy a number** in the Twilio Console and select a Toll-Free number with SMS capabilities.
- Note: If using a free Twilio trial account, you can only message phone numbers that you have verified under **Phone Numbers ➔ Manage ➔ Verified Caller IDs**.

### Step 3: Submit Toll-Free Verification
1. Navigate to **Phone Numbers ➔ Manage ➔ Toll-Free Verification** in the Twilio Console.
2. Submit your business information and sample messages:
   - *Use Case Category:* Customer Relationship / Account Notifications
   - *Sample Message:* `"Wishing you and your family a very happy Diwali! — The Kindred Team (Reply STOP to opt out)"`
   - *Opt-In Workflow:* Document that recipients provide consent through the client intake portal.

### Step 4: Configure Webhooks in Twilio
Once your Vercel project is deployed to your domain (e.g. `https://kindred-messaging.vercel.app`):
1. In Twilio Console, open your Toll-Free Number configuration (**Phone Numbers ➔ Active numbers**).
2. Under the **Messaging Configuration** section:
   - **A MESSAGE COMES IN (Webhook):**
     - URL: `https://kindred-messaging.vercel.app/api/twilio-inbound`
     - HTTP Method: `HTTP POST`
3. If using a Twilio Messaging Service:
   - Under **Integration**, configure the Inbound Webhook: `https://kindred-messaging.vercel.app/api/twilio-inbound`.
   - Add status callback URL: `https://kindred-messaging.vercel.app/api/twilio-status`.

### Step 5: Configure Environment Variables in Vercel
Open your project in the [Vercel Dashboard](https://vercel.com/dashboard) ➔ **Settings** ➔ **Environment Variables**, and add:

| Variable Name | Description | Example Value |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | `your_secret_auth_token` |
| `TWILIO_FROM_NUMBER` | Your Twilio Toll-Free or 10DLC Number | `+18005550199` |
| `TEST_ALLOWED_NUMBERS` | Comma-separated list of approved test numbers (E.164) | `+12025550143,+14155552671` |
| `APP_BASE_URL` | Your live deployment URL | `https://kindred-messaging.vercel.app` |
| `DAILY_SEND_CAP` | Max test SMS allowed per day across deployment | `50` |
| `UPSTASH_REDIS_REST_URL` | *(Optional)* Upstash Redis REST URL for multi-region KV | `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | *(Optional)* Upstash Redis REST Token | `AXxxxxxx...` |

*(After adding environment variables in Vercel, redeploy the latest commit to apply them).*

---

## Cost Breakdown

| Item | Unit Cost | Notes |
|---|---|---|
| **Twilio Outbound SMS (US)** | **$0.0083** / segment | Standard US domestic rate |
| **Carrier Pass-Through Fee** | **$0.0035 – $0.0050** / segment | Billed by AT&T, Verizon, T-Mobile per segment |
| **Total Estimated per SMS** | **~$0.012 – $0.013** / segment | Reflected in real-time in the composer cost card |
| **Twilio Toll-Free Number** | **~$1.15 to $2.15** / month | Monthly number lease |
| **Toll-Free Verification** | **$0.00 (Free)** | Zero carrier registration fee |

---

## Local Development & Automated Testing

### 1. Run Prototype Structure Verification (77 DOM IDs)
```bash
node kindred-customer-messaging/tests/verify-prototype.js
```

### 2. Run Twilio SMS Backend Test Suite
```bash
node scripts/test_sms_backend.js
```
Verifies GSM-7 vs UCS-2 calculations, US E.164 normalization, consent enforcement, test allowlisting, quiet hours, delivery status webhooks, and STOP/START suppression.

### 3. Run Frontend Integration Verification
```bash
node scripts/test_composer_frontend.js
```

### 4. Serve Front-End Locally
```bash
python -m http.server 3000 --directory kindred-customer-messaging
```
Access at `http://localhost:3000/`.
