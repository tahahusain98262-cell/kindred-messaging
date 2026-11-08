# Kindred — Final Multi-Tenant SaaS Architecture

## 1. Product decision
Kindred is a multi-tenant customer messaging SaaS. Multiple independent businesses can create or be provisioned an organization/workspace and use the same application infrastructure. Each organization has isolated contacts, campaigns, templates, conversations, knowledge base, staff, consent records, sender identities, provider configuration, reports and audit logs.

A platform operator (Kindred Super Admin) manages the SaaS itself. Each customer organization has its own Organization Owner/Admin who controls only that organization's workspace. No tenant may view, search, export, infer or mutate another tenant's data.

### Initial onboarding choice
Build tenant-aware onboarding with two modes:
- Platform-provisioned organization: Super Admin creates an organization and invites its first owner.
- Self-service organization signup: implement as a feature flag and keep disabled until commercial, abuse-prevention and onboarding policies are ready.

Do not make billing a prerequisite for the pilot. Design organization plan/usage fields so billing can be added later, but do not invent prices or integrate payments unless explicitly requested.

## 2. Recommended stack
- Frontend: Next.js App Router + TypeScript + React
- UI: Tailwind CSS + accessible component primitives; preserve Kindred's editorial visual language
- Backend: Next.js API route handlers/domain services; separate worker process for queues
- Database: PostgreSQL + Prisma ORM and migrations
- Multi-tenancy: explicit `organizationId` on every tenant-owned row, composite tenant-aware foreign keys/unique constraints, PostgreSQL Row-Level Security (RLS) as defense in depth
- Queue/scheduler: Redis + BullMQ; every job carries organizationId and validates it before execution
- Authentication: Auth.js or equivalent; users may belong to multiple organizations through memberships
- Authorization: RBAC scoped to organization membership; separate platform-level Super Admin role
- File storage: private object storage with tenant-scoped object paths and short-lived signed URLs
- Secrets: managed secrets vault; per-organization provider credentials encrypted with envelope encryption/KMS where BYO credentials are supported
- Observability: structured logs, error tracking, request IDs, tenant-aware audit events without leaking PII
- Deployment: managed Next.js hosting or containers; managed PostgreSQL, Redis, object storage and secrets manager

## 3. Logical architecture
1. Browser UI
   - Kindred public marketing site
   - Authenticated organization workspace
   - Organization switcher only for users who are members of multiple organizations
   - Platform administration console, accessible only to Super Admin
   - Never trust organizationId supplied by browser without checking membership
2. API/application layer
   - Authentication and session management
   - Organization resolver and membership authorization
   - Tenant-scoped contact/import service
   - Consent and suppression service
   - Campaign, approval and messaging orchestration
   - Conversation/inbox service
   - Knowledge/rate content service
   - Provider configuration and integration health
   - Usage metering, reporting and audit
3. Async processing
   - Tenant-aware campaign scheduler
   - Worker loads organization configuration and revalidates membership-independent send eligibility, consent, suppression, quiet hours, limits and approval before send
   - Provider adapter selects the correct organization's sender/configuration
   - Webhook handler identifies tenant through verified provider metadata/message correlation, not untrusted request parameters alone
   - Inbound events are validated, deduplicated and attached to the correct tenant
4. External systems
   - Telnyx SMS
   - Telnyx-supported WhatsApp Business integration
   - Optional approved mortgage-rate data source per organization
   - Optional billing provider in a later phase

## 4. Tenant isolation — non-negotiable
- Every tenant-owned table has non-null `organizationId`.
- Use composite unique constraints and foreign keys, e.g. `(organizationId, contactId)`, to prevent cross-tenant relations.
- Every query is scoped by the authenticated membership's organization; never rely on client-supplied tenant IDs.
- PostgreSQL RLS policies enforce tenant isolation as a second boundary. Set tenant context safely per transaction/connection and reset it; account for pooled connections.
- Background jobs, scheduled tasks, webhook handlers, exports, analytics and file storage must be tenant-scoped.
- Cache keys include organizationId. Search indexes and vector stores include and enforce organization filters.
- Provider credentials, sender identities, templates, knowledge documents and rate data are organization-scoped.
- Never expose another tenant's existence through error messages, counts, IDs or timing where avoidable.
- Add automated cross-tenant access tests for every resource and role.
- Super Admin access must be separately authorized, logged and limited to operational support. Prefer audited, time-limited support access/impersonation with explicit reason.
- Backups and exports must preserve tenant ownership; deletion requests must cascade or anonymize according to retention policy.

## 5. Organization and membership model
Core entities:
- `Organization`: name, slug, status, timezone, locale, settings, plan/usage metadata
- `User`: global identity and authentication profile
- `Membership`: organizationId, userId, role, status, invitedBy, joinedAt
- `Invitation`: organizationId, email, role, token hash, expiry, acceptedAt
- `PlatformRole`: separate Super Admin authorization, not an organization role
A user can belong to multiple organizations. Organization context is selected explicitly and verified on every server request.

## 6. Roles
### Platform roles
- Super Admin: create/suspend organizations, manage platform settings, inspect health and usage, and perform audited support operations. No routine browsing of customer content.
- Support Operator (optional): limited operational metadata and diagnostics; no message content or secrets by default.

### Organization roles
- Owner: full control of that organization, including billing-ready settings, staff and integrations.
- Admin: manage staff, integrations, contacts, campaigns, approvals, templates, knowledge and audit.
- Campaign Manager: manage contacts/imports, draft campaigns and request approval; cannot change provider secrets or approve own campaign.
- Agent: manage assigned conversations, use approved answers, escalate and send permitted replies.
- Analyst/Read-only: view reports and campaign analytics only.

Enforce RBAC server-side and scope each role to an organization membership. Hiding UI controls is not authorization.

## 7. Core modules
### A. Public website and organization onboarding
- Product marketing pages and clear channel capability explanations.
- Sign in, invitation acceptance and organization creation/provisioning.
- Optional self-service signup behind a feature flag.
- Organization setup wizard: company profile, timezone, users, channel setup, consent policy, sender readiness and knowledge content.
- Organization switcher for multi-org users.

### B. Organization dashboard
Show metrics only for the active organization: eligible contacts by channel, campaign statuses, delivery funnel, conversations, opt-outs, usage and integration health. Platform Super Admin dashboard shows aggregated operational metrics without unnecessary message content.

### C. Contacts
- CSV import preview, E.164 normalization, duplicate detection and validation.
- Contact timezone, preferred language, optional birthday/anniversary.
- Channel- and purpose-specific consent evidence.
- Organization-scoped contacts; same phone may exist in separate organizations but must never be cross-linked.
- Search/export scoped to active organization.

### D. Consent and suppression
- Consent scoped by organization + contact + channel + purpose.
- Store timestamp, source, wording/version and evidence reference.
- Maintain organization-level and channel-specific suppression; optionally platform-wide suppression only where legally and operationally appropriate.
- Process STOP and supported opt-out signals promptly.
- Recheck consent/suppression immediately before send.
- Frequency caps, quiet hours and timezone-aware rules.
- No sending to purchased/scraped contacts without documented channel consent.

### E. Campaigns and approvals
- Lifecycle: Draft → Validation → Approval requested → Approved → Scheduled/Queued → Sending → Completed/Paused/Cancelled.
- Greeting, festival, birthday, anniversary and approved information-update campaigns.
- SMS and WhatsApp have separate configuration, policy and template rules.
- Preview exact content, channel, sender, recipient snapshot, eligibility reasons and send window.
- Approval binds to immutable content/recipient snapshot; edits invalidate approval.
- Pilot mode hard-limits to 10 recipients per organization and defaults to dry-run.
- Production limits configurable by plan and organization policy; enforce server-side.

### F. Provider integrations
- Organization-specific provider connections and sender identities.
- Choose one commercial operating model deliberately:
  1. Bring Your Own Telnyx account/credentials per organization; or
  2. Kindred-managed provider account with supported subaccounts/messaging profiles and tenant-level usage allocation.
- Do not mix these models accidentally. Build a provider abstraction so the commercial model can be changed without rewriting campaign logic.
- Store credentials in a secrets manager or encrypted vault, never plaintext database fields or frontend.
- Verify exact current Telnyx API, webhook and WhatsApp onboarding requirements from official documentation.
- SMS sender number and Messaging Profile are organization-scoped.
- WhatsApp Business onboarding, sender readiness and approved templates are separate from SMS setup.
- Webhooks must resolve tenant from verified signatures plus trusted provider message/config correlation. Never trust an arbitrary `organizationId` parameter in webhook body.

### G. Conversations and smart replies
- Tenant-scoped inbox, assignment, internal notes, inbound/outbound timeline and escalation.
- AI retrieves only from that organization's approved, versioned knowledge base.
- Enforce tenant filter in retrieval and vector search at query time; never allow cross-tenant context.
- Suggested answers show internal source/effective date.
- Low confidence, account-specific, complaint, sensitive, human-request or stale data must escalate.
- Mortgage-rate data requires a trusted source, effective timestamp and organization approval. Never invent rates or give individualized financial advice.
- Pilot mode uses suggestion-only AI; human review before sending.

### H. Scheduler and rate updates
- Organization-specific timezone, quiet hours, festival calendar preferences and frequency caps.
- Birthday/anniversary scheduling based on contact data and permission.
- Weekly/monthly mortgage updates only from verified, approved rate snapshots.
- Jobs carry organizationId, campaignId and recipient ID; worker rechecks tenant ownership and send eligibility.
- Pause/cancel and deduplication controls.

### I. Analytics, usage and audit
- Tenant dashboard: queued, accepted, delivered, failed, inbound, replies, opt-outs and usage.
- Platform dashboard: organization count, system health, queue health and aggregate usage; avoid unnecessary access to customer content.
- Audit every sensitive operation with actor, organization, timestamp, action and target.
- Usage metering by tenant/channel; no invented pricing.
- CSV export and report downloads tenant-scoped and formula-injection safe.

## 8. Suggested data model
Global/platform tables:
- `User`, `PlatformRole`, `Organization`, `Membership`, `Invitation`
- `PlatformAuditLog`, `PlatformFeatureFlag`

Tenant-owned tables (all include `organizationId`):
- `Contact`, `ContactChannel`
- `ConsentRecord`, `SuppressionEntry`
- `Campaign`, `CampaignRecipient`, `CampaignApproval`, `MessageTemplate`
- `ProviderConnection`, `SenderIdentity`
- `Message`, `ProviderEvent`, `WebhookEvent`
- `Conversation`, `ConversationAssignment`, `ConversationNote`
- `KnowledgeDocument`, `KnowledgeVersion`
- `RateSnapshot`, `RateApproval`
- `ScheduledJob`, `AuditLog`, `ImportJob`, `UsageRecord`

Use UUIDs, tenant-aware composite indexes, foreign keys and unique constraints. Avoid globally unique contact phone constraints; uniqueness should be scoped appropriately to an organization. Use soft deletion where needed and retention/deletion policies. Store only minimum necessary PII.

## 9. Security baseline
- Tenant isolation enforced in application services and PostgreSQL RLS.
- Secure organization context resolution on every request.
- RBAC based on active membership.
- MFA for platform Super Admins and organization Owners/Admins.
- Secure cookies, session expiry, login throttling, CSRF protection where applicable, strict CORS and CSP.
- Parameterized queries, schema validation, safe uploads and CSV formula-injection protection.
- Private tenant-scoped object storage and short-lived signed URLs.
- Secrets manager; envelope encryption for BYO provider secrets.
- Webhook signature verification using exact provider method, raw body, timestamp/replay protection and idempotency.
- Structured logs with request IDs; redact secrets, message bodies and phone numbers unless strictly needed.
- Tenant-aware rate limits, queue concurrency and usage quotas.
- Tested backup/restore and tenant data export/deletion workflows.
- Security tests proving tenant A cannot access tenant B's contacts, campaigns, messages, conversations, files, reports, provider settings or knowledge.

## 10. Suggested environment variables
Use placeholders only and document which are required:
- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `KMS_KEY_ID` or secrets-manager configuration
- `TELNYX_API_KEY` only if using a platform-level provider account; otherwise store per-tenant secret references in the vault
- `TELNYX_PUBLIC_KEY` / webhook verification settings only as required by selected current Telnyx flow
- Provider account/subaccount identifiers only if officially supported and configured
- WhatsApp-specific settings only after selecting the supported onboarding model
Never put secrets in `NEXT_PUBLIC_*`.

## 11. Delivery phases
1. Rebuild Kindred public website and tenant-aware application shell.
2. Authentication, organizations, invitations, memberships, RBAC and organization switcher.
3. PostgreSQL schema, RLS, tenant context middleware and cross-tenant tests.
4. Contacts, CSV import, consent and suppression.
5. Campaign builder, approval snapshots, dry-run and tenant-aware queues.
6. Provider connection model and Telnyx SMS for one test organization.
7. WhatsApp onboarding/templates for a test organization.
8. Tenant-scoped inbox, knowledge base and constrained AI suggestions.
9. Tenant-aware scheduling, approved rate updates, analytics and usage metering.
10. Security review, synthetic 5,000-contact-per-tenant load tests, deployment and operational runbook.

## 12. Non-goals until explicitly approved
- Payment collection, subscription billing and plan pricing.
- Fully open self-service signup.
- Autonomous AI sending or financial advice.
- Cross-tenant contact sharing or shared knowledge.
- Live bulk sends during development.
