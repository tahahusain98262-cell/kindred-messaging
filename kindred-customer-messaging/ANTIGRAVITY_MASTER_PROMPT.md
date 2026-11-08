# ANTIGRAVITY MASTER PROMPT — KINDRED CUSTOMER MESSAGING PLATFORM

You are a principal product designer, senior full-stack engineer, security architect and QA lead. Build a production-quality customer messaging platform based on the included Kindred website concept. Use the supplied `index.html`, `styles.css` and `app.js` as visual/product direction, but migrate the app into a clean, maintainable production architecture. Do not merely wrap the static HTML.

## 1. Product goal
Build a polished SaaS workspace for a company that wants to communicate with its customer/contact database through SMS and WhatsApp Business messaging.

The first proof-of-concept is intentionally small:
- Send one approved Diwali greeting to a maximum of 10 supplied contacts.
- Support SMS and WhatsApp as distinct channels.
- Show a preview and require explicit operator approval before sending.
- Track provider acceptance, delivery, failure and inbound replies.
- The pilot is a controlled demo. Never send messages automatically during setup or seed real contacts.

If the customer proceeds, the system should be able to grow to approximately 5,000 contacts and support:
- Festival and seasonal greetings (Thanksgiving, Christmas, New Year and other relevant occasions).
- Birthday and anniversary greetings using customer-provided dates and timezone.
- Weekly or monthly mortgage-rate updates based only on a verified, approved rate source and effective date.
- Two-way conversations where customer questions are answered from approved company knowledge, with uncertain or sensitive questions escalated to a human agent.

## 2. Design direction
Use the supplied concept as the design source of truth:
- Editorial, architectural, restrained, premium and human.
- Warm off-white backgrounds, charcoal/forest text, muted olive/lime accents, thin dividers and generous whitespace.
- Large confident typography, occasional serif italic contrast, small mono labels and strong grid alignment.
- Subtle motion only: reveal-on-scroll, restrained hover transitions, animated status indicators and elegant page transitions.
- No dark gaming aesthetic, neon gradients, generic AI dashboard look, excessive glassmorphism, random blobs or stock-photo overload.
- Fully responsive: mobile layouts must feel intentionally designed, not merely compressed.
- Keep the original brand concept “Kindred” unless asked to rename it.
- Use accessible contrast, visible focus states, semantic HTML and reduced-motion support.

## 3. Required application areas
### A. Public website
- Product overview, workflow, channels, trust/security, pilot CTA.
- Clear statement that SMS and WhatsApp are separate channel configurations.
- No unsupported claims about guaranteed delivery, AI accuracy or regulatory compliance.

### B. Authenticated app
- Overview dashboard: campaign status, contacts count, delivery metrics, recent replies.
- Contacts: secure import (CSV), validation, duplicate detection, timezone, channel-specific consent records, source and timestamp.
- Campaigns: create, edit, duplicate, schedule, preview, approve, pause and cancel.
- Message composer: SMS and WhatsApp modes, character/segment estimate for SMS, approved WhatsApp template selector, variable validation, preview.
- Contact selection: pilot hard limit of 10 recipients in demo mode; configurable limit for later production.
- Conversations inbox: thread view, inbound/outbound messages, assignment, notes, canned replies, escalation.
- Knowledge base: approved FAQs, mortgage-rate source records, effective dates, versioning and review/approval.
- Scheduler: birthdays, anniversaries and festival campaigns using contact timezone and quiet-hour rules.
- Analytics: queued, sent, delivered, failed, undelivered, replies, opt-outs and campaign breakdown.
- Settings: provider connection status, webhook status, roles, templates, consent policy and audit log.

### C. Roles
- Owner/Admin: manage users, provider settings, templates, campaigns and approvals.
- Campaign Manager: import eligible contacts, draft campaigns and request approval.
- Agent: manage assigned conversations and use approved answers.
- Read-only: view campaign and delivery analytics.

## 4. Telnyx integration requirements
Implement provider integration server-side only. Use official current Telnyx API documentation and do not guess endpoints or payload fields.

Configuration via environment variables:
- `TELNYX_API_KEY`
- `TELNYX_PUBLIC_KEY` only if required for webhook signature verification in the selected Telnyx webhook flow; verify against official docs.
- `TELNYX_MESSAGING_PROFILE_ID` for SMS profile association/configuration where applicable.
- `TELNYX_FROM_NUMBER` for the provisioned, messaging-enabled sender number.
- WhatsApp-specific account/number/template configuration as required by the current Telnyx WhatsApp API.

Never expose secrets in frontend bundles, logs, source control, client errors or database plaintext. Use a secrets manager in production. Provide `.env.example` with placeholders only.

### SMS
- Send via Telnyx Messaging API from a provisioned and messaging-enabled number.
- Associate the number with the correct messaging profile.
- Configure inbound and delivery-status webhooks.
- Validate webhook signatures according to Telnyx's current official documentation.
- Handle retries safely with idempotency; do not double-send on retry.
- Validate E.164 phone numbers and allowed destination countries.
- Show provider message ID and status lifecycle.

### WhatsApp
- Treat WhatsApp Business Platform as a separate channel with its own onboarding.
- Connect the customer's Meta Business Manager / WhatsApp Business Account through Telnyx's supported signup process.
- Use approved message templates for business-initiated messages outside the customer service window.
- Support free-form replies only when permitted by the current WhatsApp policy/window.
- Store template name, language, category, approval status and version.
- Do not assume an SMS sender number is automatically WhatsApp-ready; verify registration and provider status first.

## 5. Consent, compliance and safety — non-negotiable
- Do not send to contacts without documented permission for the selected channel and purpose.
- Store consent status, channel, purpose, timestamp, collection source and evidence/reference.
- Include opt-out handling. Process SMS STOP and supported equivalent opt-out keywords immediately; suppress future sends as required.
- Maintain a global suppression list and enforce it at send time, not only during import.
- For WhatsApp, respect opt-in and approved-template requirements.
- Provide unsubscribe/opt-out instructions where required.
- Add per-contact and per-campaign frequency caps, quiet hours and timezone-aware scheduling.
- Respect applicable destination-country laws and provider policies. Do not assume US rules apply globally.
- Add a pre-send checklist: consent verified, suppression check passed, channel ready, template approved, content approved, recipients reviewed.
- Require a human approval action for campaign sends in the pilot.
- Never send mortgage rates based on model-generated or stale values. Require a trusted source, effective timestamp, approval and clear disclaimer.
- Do not provide individualized mortgage, legal or financial advice through an autonomous agent. Escalate personalized or ambiguous questions.

## 6. Smart reply assistant
Build a constrained assistant, not an unrestricted chatbot:
- Classify incoming intent (greeting, mortgage rate question, account-specific question, opt-out, complaint, other).
- Retrieve only from approved, versioned company knowledge.
- Cite the internal source/effective date in the agent UI.
- If retrieval confidence is low, the answer is account-specific, the customer requests a person, or the topic is sensitive, create an escalation task instead of guessing.
- Allow a human to edit and approve suggested replies.
- Keep a full audit trail of generated suggestion, edits, approver and final sent text.
- Never invent mortgage rates, fees, eligibility or customer account details.

## 7. Data model
Design normalized PostgreSQL tables for:
- users, roles, organizations
- contacts, contact_channels
- consent_records, suppression_entries
- campaigns, campaign_recipients, message_templates
- messages, provider_events, conversations, conversation_assignments
- knowledge_documents, knowledge_versions, rate_snapshots, approvals
- scheduled_jobs, audit_logs, webhook_event_deduplication

Use migrations, foreign keys, indexes and retention policies. Encrypt sensitive data at rest where appropriate. Minimize stored personal data.

## 8. API and engineering quality
- Use TypeScript end-to-end.
- Validate all inputs with a schema library.
- Add authentication, authorization and rate limiting.
- Add CSRF protection where applicable, secure cookies, strict CORS and security headers.
- Use parameterized queries and safe file upload handling.
- Add request IDs, structured logs and redaction for PII/secrets.
- Add webhook event deduplication and replay protection.
- Queue outbound sends; do not send thousands of requests synchronously from a web request.
- Add retry/backoff with dead-letter handling and clear operator visibility.
- Provide robust error states, empty states, loading states and accessible forms.
- Include unit tests, integration tests, webhook signature tests, permission tests and end-to-end tests.
- Add linting, formatting, type checks and production build verification.
- Include Docker/dev setup and deployment instructions.

## 9. Demo mode
Create a safe demo mode:
- No real provider calls by default.
- Use clearly labelled synthetic contacts and fake delivery statuses.
- Hard limit of 10 recipients.
- “Send test” must be disabled until provider credentials, sender, channel readiness and consent checks are configured.
- Add an explicit confirmation screen showing channel, campaign, exact message and recipient count.
- Provide a dry-run mode that simulates the full workflow without sending.
- Never include real phone numbers or API keys in seed data.

## 10. Acceptance criteria
1. Website matches the supplied visual direction and is polished on desktop, tablet and mobile.
2. A user can create a Diwali campaign and preview it in SMS and WhatsApp modes.
3. Demo mode supports no more than 10 synthetic contacts and cannot accidentally send real messages.
4. Production send path checks channel readiness, consent, suppression, quiet hours and approval before enqueueing.
5. Inbound webhooks create conversation threads and delivery webhooks update message status.
6. Duplicate webhook events do not create duplicate messages or sends.
7. An opt-out immediately suppresses future messages.
8. Mortgage-rate responses only use an approved, current rate snapshot; otherwise escalate.
9. No provider secrets are exposed in the browser or repository.
10. Tests, lint, typecheck and production build pass.

## 11. Build process
Before coding:
1. Inspect the existing project and preserve working functionality.
2. Propose the final folder structure and architecture.
3. Identify missing credentials and external account setup without blocking the front-end build.
4. Implement in small phases and run checks after each phase.

Then build:
- Phase 1: recreate and polish the public site.
- Phase 2: authenticated dashboard with mock data.
- Phase 3: database, authentication and roles.
- Phase 4: consent-aware campaign and scheduling engine.
- Phase 5: Telnyx SMS integration and verified webhooks.
- Phase 6: WhatsApp onboarding, templates and messaging.
- Phase 7: inbox, knowledge base and constrained smart replies.
- Phase 8: tests, security review, deployment and documentation.

Do not claim a feature is complete unless it is implemented and tested. Clearly label mocked integrations. At the end, provide setup instructions, environment variable list, database migration commands, test results, deployment steps and a list of external account actions still required.
