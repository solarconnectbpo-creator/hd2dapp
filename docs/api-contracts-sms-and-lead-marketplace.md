# API contracts: SMS automation & lead marketplace

Source of truth: Worker handlers under `backend/src/`. Auth is `Authorization: Bearer <JWT>` via `getBearerPayload` unless noted.

Org resolution for SMS (`resolveOrgForCompanyUser`): first `org_members.org_id` for the user. **Admins are not org-scoped** (`user_type === "admin"` → `orgId = null`); SMS routes that need `oid` will misbehave for pure admins unless they also have an `org_members` row (see gap notes).

---

## Shared types (SMS)

```ts
// backend/src/sms/smsDb.ts:136-148, 190-195, 228-235, 373-383
type SmsContactRow = {
  id: string;
  org_id: string;
  phone_e164: string;
  name: string;
  unsubscribed: number;          // 0 | 1
  automations_paused: number;    // 0 | 1
  address: string;
  pipeline_stage: string;
  claim_filed: number;           // 0 | 1
  tags_json: string;             // JSON array string, default "[]"
  last_inbound_at: number | null; // unix seconds
};

type SmsContactListRow = SmsContactRow & {
  created_at: number;
  updated_at: number;
  last_message_at: number | null;
  last_message_preview: string | null;
};

type SmsMessageRow = {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound" | string;
  body: string;
  external_id: string | null;
  created_at: number;
};

type SmsWorkflowRow = {
  id: string;
  org_id: string;
  name: string;
  trigger: string;
  steps_json: string; // JSON string of WorkflowDoc
  enabled: number;    // 0 | 1
  created_at: number;
  updated_at: number;
};

// backend/src/sms/smsWorkflowEngine.ts:52-59
type WorkflowStep =
  | { type: "sms"; text: string }
  | { type: "delay_minutes"; minutes: number }
  | { type: "condition"; check: "no_reply" | "claim_not_filed" }
  | { type: "tag"; add?: string[]; remove?: string[] }
  | { type: "move_pipeline"; stage: string };

type WorkflowDoc = { steps: WorkflowStep[] };

// Template vars in SMS steps: {{name}}, {{phone}}, {{address}}, {{company}}
// Persist rules: ≥1 sms step, ≤48 steps, sms text 1–1600 chars, delay ≤ 20160 min (14d)
// Legacy step `{ type: "delay", hours?, minutes? }` accepted on parse → delay_minutes

// backend/src/sms/smsTriggers.ts:2-11
type SmsCanonicalTrigger =
  | "manual"
  | "lead.created"
  | "inspection.completed"
  | "estimate.sent"
  | "no_response"
  | "claim.not_filed"
  | "deal.won"
  | "deal.lost";
```

### SMS contact DB fields (migrations)

| Column | Source | Notes |
|--------|--------|--------|
| `id`, `org_id`, `phone_e164`, `name` | `0007_sms_automation.sql:14-26` | Unique `(org_id, phone_e164)` |
| `unsubscribed`, `automations_paused` | 0007 | STOP / pause automations |
| `last_inbound_at`, `provider` | 0007 | provider default `'telnyx'` |
| `created_at`, `updated_at` | 0007 | |
| `address`, `pipeline_stage`, `claim_filed`, `tags_json` | `0008_sms_automation_v2.sql` | HTTP PATCH only updates name / paused / unsubscribed |
| `last_no_response_event_at` | 0008 | Cron cooldown for `no_response` |

Related tables: `sms_messages`, `sms_workflows`, `sms_workflow_runs`, `sms_org_numbers` (inbound/outbound number → org).

---

## SMS endpoints (`backend/src/api/smsHttpRoutes.ts`)

Router entry: `backend/src/index.ts:248-250`.

### Auth preamble (most routes)

- After `/api/sms/suggest-reply` and `/api/sms/triggers` special-cases, all routes require Bearer JWT (`smsHttpRoutes.ts:95-98`).
- Non-admin without `org_members` → **403** `"No organization for this account."` (`:100-107`).
- Org id used as `oid` from primary membership (`:109`).

---

### `GET /api/sms/triggers`

| | |
|--|--|
| **Auth** | **None** (returns before Bearer check) — `:91-93` |
| **Body** | — |
| **Response 200** | `{ success: true, triggers: SmsCanonicalTrigger[] }` |
| **Side effects** | None |

---

### `POST /api/sms/suggest-reply`

| | |
|--|--|
| **Auth** | Bearer required inside handler (`:421-425`). **No org membership check.** |
| **Request** | `{ inboundText?: string; contactContext?: string }` — `inboundText` required |
| **Response 200** | `{ success: true, suggestion: string }` |
| **Errors** | 401; 400 missing text; 503 OpenAI not configured; 502 OpenAI failure |
| **Side effects** | Calls OpenAI `gpt-4o-mini` with Worker `OPENAI_API_KEY` |

```ts
type SuggestReplyRequest = { inboundText: string; contactContext?: string };
type SuggestReplyResponse = { success: true; suggestion: string };
```

---

### `GET /api/sms/workflows`

| | |
|--|--|
| **Auth** | Bearer + org (`oid`) |
| **Response 200** | `{ success: true, workflows: SmsWorkflowRow[] }` |
| **Side effects** | If org has zero workflows, seeds defaults (`seedDefaultSmsWorkflowsIfEmpty`) — lead.created / inspection.completed / estimate.sent / no_response templates (`smsWorkflowEngine.ts:384-468`) |

---

### `POST /api/sms/workflows`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ name?: string; trigger?: string; steps_json?: string; enabled?: boolean }` |
| **Defaults** | `name="Workflow"`, `trigger="manual"`, `steps_json='{"steps":[]}'` (must validate to ≥1 SMS step), `enabled !== false` → enabled |
| **Response 201** | `{ success: true, workflow: SmsWorkflowRow }` |
| **Errors** | 400 invalid JSON / invalid `steps_json` |
| **Side effects** | Inserts `sms_workflows` row with new UUID |

---

### `PUT /api/sms/workflows/:id`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | Partial `{ name?, trigger?, steps_json?, enabled? }` — omitted fields keep existing |
| **Response 200** | `{ success: true, workflow: SmsWorkflowRow }` |
| **Errors** | 404 not found; 400 invalid steps |
| **Side effects** | Upserts workflow for `(id, org_id)` |

---

### `DELETE /api/sms/workflows/:id`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Response 200** | `{ success: true }` |
| **Errors** | 404 |
| **Side effects** | Deletes workflow (runs cascade via FK) |

Note: DELETE is matched on the same path regex as PUT (`putMatch`, `:233-238`).

---

### `POST /api/sms/workflows/:id/start`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ contact_id: string }` (required) |
| **Response 200** | `{ success: true }` |
| **Errors** | 400 missing contact / workflow not found or disabled / invalid steps / contact not in org |
| **Side effects** | Inserts `sms_workflow_runs` pending at step 0, `next_run_at=now` (cron/`processSmsWorkflowRuns` sends SMS later) |

Does **not** skip the “pending run already exists” check used by `emitSmsEvent`; start always inserts a new run.

---

### `GET /api/sms/contacts`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Query** | `limit` default 200, max 500; `offset` default 0 |
| **Response 200** | `{ success: true, contacts: SmsContactListRow[] }` |
| **Side effects** | None |

Ordered by last message time (fallback `updated_at`) DESC.

---

### `POST /api/sms/contacts`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ phone_e164?: string; phone?: string; name?: string; address?: string }` |
| **Response 201** | `{ success: true, contact: SmsContactRow }` |
| **Errors** | 400 missing/invalid phone |
| **Side effects** | `ensureSmsContactForOrg` upsert by `(org_id, phone_e164)`; merges non-empty name/address |

Phone normalization: 10 digits → `+1…`; leading `+` kept; else `+` + digits (`smsHttpRoutes.ts:53-61`).

---

### `PATCH /api/sms/contacts/:id`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ name?: string; automations_paused?: boolean; unsubscribed?: boolean }` |
| **Response 200** | `{ success: true, contact: SmsContactRow }` |
| **Errors** | 404 |
| **Side effects** | Updates only provided fields + `updated_at` |

**Not exposed over HTTP:** `address`, `pipeline_stage`, `claim_filed`, `tags_json` (writable only via workflow steps / internal helpers).

---

### `GET /api/sms/contacts/:id/messages`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Query** | `limit` default 500, max 1000 |
| **Response 200** | `{ success: true, messages: SmsMessageRow[] }` |
| **Side effects** | None |

Org-scoped via JOIN; chronological ASC. This is the contact message history endpoint.

---

### `POST /api/sms/send`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ text: string; contact_id? \| contactId?; to?: string }` — `text` 1–1600 chars |
| **Response 200** | `{ success: true, externalId: string, contact_id: string }` |
| **Errors** | 400 validation / unsubscribed / missing provider+to; 403 owner billing gate; 404 contact |
| **Side effects** | Telnyx or Twilio send (`appendCompliance: true`); upsert contact if only `to`; insert outbound `sms_messages`; bump contact activity; Stripe metered SMS usage on **org owner** |

Outbound “from”: first `sms_org_numbers` for org, else Worker env defaults (`resolveSmsOutbound`). Gate: org owner must pass membership access (`assertOrgOwnerMaySendSms`).

---

### `POST /api/sms/events`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Request** | `{ event: string; contact_id?: string; phone_e164? \| phone?; name?; address? }` |
| **Response 200** | `{ success: true, started: number, errors: string[], contact_id: string }` |
| **Errors** | 400 missing event or phone/contact |
| **Side effects** | Ensures contact if phone given; starts all **enabled** workflows with `trigger === event` for that contact, skipping if a pending run already exists for that workflow+contact |

SPA helper: `roofing-estimator-vite/src/lib/smsEmitEvent.ts` (`postSmsEvent`).

---

### `GET /api/sms/setup-status`

| | |
|--|--|
| **Auth** | Bearer + org |
| **Response 200** | See type below |
| **Side effects** | None |

```ts
type SmsSetupStatusResponse = {
  success: true;
  org_id: string;
  inbound_numbers: Array<{ phone_e164: string; label: string | null }>;
  recent_failures: Array<{
    id: string;
    workflow_id: string;
    workflow_name: string;
    contact_id: string;
    phone_e164: string;
    updated_at: number;
  }>;
  outbound_sms_allowed: boolean;
  outbound_sms_block_reason?: string;
  worker: {
    telnyx_configured: boolean;
    telnyx_default_from_set: boolean;
    twilio_configured: boolean;
  };
};
```

---

### SMS SPA coverage today

| Surface | Path | Uses |
|---------|------|------|
| Automation Builder | `/sms-automation` | GET workflows, triggers, setup-status; PUT workflow; POST suggest-reply |
| Events helper | (library) | POST events |
| **SmsInbox** | — | **Does not exist** (no file, route, or doc mention under `roofing-estimator-vite`) |
| Contacts settings | `/contacts` | LocalStorage contacts + `ghlBaseUrl` — **not** `/api/sms/contacts` |

Inbox-capable APIs already exist: list contacts, messages, send, PATCH pause/unsub — but no SPA page wires them.

---

## Lead marketplace

### Inventory model (`marketplace_appointments`)

Schema: `backend/migrations/0009_marketplace_appointments.sql`.  
Lifecycle: `available` → `reserved` (30 min TTL on checkout) → `sold`.  
Cron: `releaseExpiredReservations` from Worker scheduled handler (`index.ts` ~435).

```ts
// marketplaceDb.ts:19-37
type MarketplaceAppointmentRow = {
  id: string;
  status: "available" | "reserved" | "sold";
  homeowner_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduled_at: number | null;
  price_usd: number | null;
  notes: string | null;
  reserved_by: string | null;
  reserved_until: number | null;
  sold_to: string | null;
  sold_at: number | null;
  stripe_session_id: string | null;
  created_at: number;
  updated_at: number;
};

// Public DTO (marketplaceRoutes.ts:15-30) — PII only if sold_to === viewer
type PublicMarketplaceAppointment = {
  id: string;
  status: MarketplaceAppointmentStatus;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduledAt: number | null;
  priceUsd: number | null;
  reservedUntil: number | null; // only if reserved_by === viewer
  owned: boolean;
  homeownerName: string | null; // owned only
  address: string | null;       // owned only
  notes: string | null;         // owned only
};
```

---

### `POST /api/leads/checkout-session`

Handler: `backend/src/api/leadsCheckout.ts:52-198`. Wired at `index.ts:271-274`.

| | |
|--|--|
| **Auth** | Bearer; **`user_type` must be `company` or `admin`** (403 otherwise) |
| **Env** | `STRIPE_SECRET_KEY`, `LEADS_STRIPE_PRICE_IDS`, `APP_PUBLIC_ORIGIN`; optional `LEADS_BULK_PRICE_IDS`, `LEADS_BULK_FIXED_PRICE_IDS`, `LEADS_BULK_MIN_APPOINTMENTS` (default 5) |
| **Request** | `{ priceId: string; appointmentIds?: string[] }` |
| **Response 200** | `{ success: true, url: string }` (Stripe Checkout URL) |
| **Errors** | 401/403/400 (price, bulk min, single-slot count)/409 reservation conflict/503 Stripe or origin/502 Stripe create failed |

#### Package vs appointments

| Mode | Condition | Stripe qty | Reservation | Session metadata | Webhook fulfillment |
|------|-----------|------------|-------------|------------------|---------------------|
| **Package-only** | `appointmentIds` empty/omitted | `1` | None | **None** (`hd2d_*` not set) | **No marketplace finalize** |
| **Single slot** | price ∉ bulk allowlist; exactly 1 id | `1` | Yes, 30 min | `hd2d_user_id`, `hd2d_appointment_ids` | `finalizePurchaseFromStripe` |
| **Bulk per-unit** | price ∈ `LEADS_BULK_PRICE_IDS`, not fixed; ≥ min ids | `appointmentIds.length` | Yes | same | finalize all ids |
| **Bulk fixed package** | also ∈ `LEADS_BULK_FIXED_PRICE_IDS` | **`1`** (fixed Stripe price) | Yes | ids still in metadata | finalize all ids |

`client_reference_id` is always the JWT `sub`. Success redirect: `{APP_PUBLIC_ORIGIN}/leads?checkout=success&session_id={CHECKOUT_SESSION_ID}`; cancel: `...?checkout=cancel`.

On Stripe session create failure after reserve → `releaseReservationByUser`.

**Current SPA:** `createLeadsCheckoutSession(token, priceId)` sends **only `{ priceId }`** — package-only path (`leadsCheckoutClient.ts:25-39`, `LeadMarketplace.tsx`). UI copy states fulfillment/CRM is manual until webhooks are wired.

---

### `GET /api/leads/marketplace`

| | |
|--|--|
| **Auth** | Bearer (any user type with valid JWT) — **not** restricted to company/admin |
| **Query** | `state` (uppercased match), `limit` default 100 max 500 |
| **Response 200** | `{ success: true, appointments: PublicMarketplaceAppointment[] }` |
| **Side effects** | None |

Listing includes: available (+ expired reservations treated as free), rows reserved/sold **to this user**.

---

### `GET /api/leads/marketplace/purchased`

| | |
|--|--|
| **Auth** | Bearer |
| **Response 200** | `{ success: true, appointments: PublicMarketplaceAppointment[] }` with `owned: true` and PII fields filled |
| **Side effects** | None |

---

### `POST /api/leads/marketplace/release`

| | |
|--|--|
| **Auth** | Bearer |
| **Request** | `{ appointmentIds: string[] }` (non-empty) |
| **Response 200** | `{ success: true, released: number }` (rows updated) |
| **Side effects** | Sets caller’s `reserved` rows back to `available`; never touches `sold` |

Use when checkout is abandoned client-side (TTL cron also cleans up).

---

### Stripe webhook finalize (`POST /api/webhooks/stripe`)

Handler: `backend/src/api/stripeWebhook.ts:94-114`.

On `checkout.session.completed` when:

- `mode === "payment"`, and
- metadata `hd2d_appointment_ids` non-empty, and
- session id + buyer (`metadata.hd2d_user_id` or `client_reference_id`) present,

→ `finalizePurchaseFromStripe(db, buyerId, ids, sessionId)` (`marketplaceDb.ts:201-248`):

- Sets `status=sold`, `sold_to`, `sold_at`, `stripe_session_id`, clears reservation.
- Idempotent for same buyer+session; conflicts logged if already sold to another session.

#### Package-only checkout (no appointment ids)

- Checkout creates a paid Stripe session with **no** `hd2d_appointment_ids`.
- Webhook **does not** mark any appointment sold, grant CRM access, deliver files, or write a purchase ledger.
- Buyer only gets SPA success banner + `session_id` query param for manual ops (`LeadMarketplace.tsx:68-84`).
- **Gap:** there is no D1 “package purchase” table or entitlement update for package-only payments.

Other webhook branches (membership / SMS metered item) are unrelated to leads.

---

### Legacy `/api/leads/*` (non-marketplace)

Anything under `/api/leads` that is not checkout-session or marketplace falls through to stub `handleLeads` → `legacyPlaceholderResponse` (`index.ts:294-295`, `:455-461`).

---

## GHL / CRM settings (org vs Worker)

### Worker-global GHL (not per-org)

`POST /api/ghl/submit-lead` — `backend/src/api/ghlSubmitLead.ts`

| | |
|--|--|
| **Auth** | Bearer (any signed-in user) |
| **Secrets** | `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID` on Worker — **single location for entire deployment** |
| **Request** | `{ firstName?, lastName?, email?, phone?, companyName?, address1?, city?, state?, postalCode?, country?, source?, tags?, summaryNote?, customFields?: { id, value }[] }` — email or phone required |
| **Response 200** | `{ success: true, data: { contactId: string \| null, noteWarning?: string } }` |
| **Side effects** | Creates GHL contact; optional note |

No org id is sent to GHL; all orgs share one location if configured.

### Server org workspace (`/api/org/*`)

`orgWorkspaceRoutes.ts` + `migrations/0010_org_workspace.sql`:

- `org_profiles`: `phone`, `website`, `address`, `logo_url` only.
- Agreements upload/download.
- **No** columns for GHL token, location id, CRM webhook URL, or API keys.

### SPA local org settings

`roofing-estimator-vite/src/lib/orgSettings.ts`:

- `ghlBaseUrl: string` — https deep-link for “Open in CRM” on field jobs (`ContactsSettings.tsx` ~401-413).
- Stored in **browser localStorage**, not Worker D1.
- Explicitly **not** API credentials.

### Field project GHL links

Per-project `ghlUrl` / `ghlEmbedUrl` on field jobs (`fieldProjectTypes.ts`) — client-side URLs only.

### CRM gaps (summary)

1. No per-org GHL Private Integration token / location id in D1 or `/api/org/profile`.
2. No CRM outbound webhook URL / signing secret per org.
3. Marketplace purchase does **not** push sold appointments into GHL.
4. Package-only Stripe payment has **no** automated fulfillment hook beyond collecting money.
5. SPA Lead Marketplace does not call marketplace list/purchased/release or pass `appointmentIds`.

---

## Quick SPA build checklist

**SMS inbox UI can use today**

1. `GET /api/sms/contacts` + `GET .../messages`
2. `POST /api/sms/send` + `PATCH` pause/unsub
3. Optional: `POST /api/sms/suggest-reply`, `POST /api/sms/events`, workflows CRUD

**Appointment marketplace UI can use today**

1. `GET /api/leads/marketplace` (+ `state`)
2. `POST /api/leads/checkout-session` with `{ priceId, appointmentIds }`
3. `POST .../release` on cancel; `GET .../purchased` after webhook success

**Do not assume exists**

- SmsInbox page/route
- Per-org CRM secrets on Worker
- Package-only checkout → appointment grant or CRM sync
