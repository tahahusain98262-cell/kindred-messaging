# Kindred — Customer Messaging Pilot Website

A responsive, front-end concept for a customer messaging platform. The visual direction is editorial, minimal, structured and typography-led, inspired by the reference site supplied by the client. This is an original design and does not copy its source code or assets.

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a browser, or use VS Code Live Server.
3. No build step is required.

## What's included
- Product/marketing landing page
- Interactive SMS / WhatsApp message composer preview
- Pilot overview for 10 contacts
- Illustrative contact list and campaign status
- Workflow, channel and trust/security sections
- Responsive desktop, tablet and mobile layouts

## Important
This is a **front-end demo only**. It does not send SMS or WhatsApp messages, does not store real contacts, and does not connect to Telnyx. All contact rows are illustrative. Do not add real API keys to browser code.

## Production architecture recommended
- Frontend: Next.js + TypeScript
- Backend: Node.js API routes or a separate NestJS service
- Database: PostgreSQL
- Queue/scheduler: Redis + BullMQ (or managed queue)
- Provider: Telnyx SMS + Telnyx WhatsApp Business Platform
- Webhooks: HTTPS endpoints with signature verification, replay protection and idempotency
- Auth: role-based access; MFA for administrators
- AI replies: retrieval from approved company knowledge only, confidence thresholds, escalation to staff
- Compliance: documented opt-in per channel and purpose, STOP/opt-out suppression, quiet hours, rate limits, audit logs and approved message templates

See `ANTIGRAVITY_MASTER_PROMPT.md` for the build brief.
