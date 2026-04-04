# Enhancement backlog (epics)

Use GitHub Issues / Linear with labels: `phase-0`, `parity-crm`, `parity-pricing`, `parity-docs`, `integrations`, `tech-debt`, `ux`. Each bullet can become one or more tickets.

## Measurement and EagleView parity

- **Report-to-line-items:** Import EagleView (or TrueDesign) facet areas and pitches into section rows with audit trail (benchmark: Estimating Edge / Smart Takeoff style flows).
- **Compare runs:** Side-by-side two measurement versions for the same job with diff on squares and $.
- **Revision history:** Named saves with timestamp and user (when multi-user exists).

**Acceptance notes:** User can reproduce numbers from a known EagleView sample report within a stated tolerance.

## CRM / jobs

- **Pipeline:** Stages (lead → inspection → estimate sent → sold/lost) with optional kanban view.
- **Ownership:** Assign jobs to reps; filter dashboard by assignee.
- **Activity:** Log calls, notes, and site visits on the job record.

**Acceptance notes:** A job moves stage without losing linked measurements/estimates.

## Pricing and suppliers

- **CSV price list:** Import SKU, unit, and price; map to scope line codes; versioning by effective date.
- **Markup rules:** Regional and complexity multipliers editable per company profile (you already have carrier benchmark patterns—extend to supplier-driven RCV).

**Acceptance notes:** Changing a CSV row updates new estimates only (or prompts to refresh locked jobs—product decision).

## Documents and proposals

- **Branded PDF:** Logo, colors, and line items from current estimate export.
- **Cover page:** Customer, address, and scope summary from intake.

**Acceptance notes:** PDF matches on-screen totals for a golden test job.

## Field and mobile

- **Read-only job link:** Share estimate summary without edit capability.
- **Photos:** Associate damage photos with job ID and optional room/facet tag (storage policy TBD: R2 vs base64 in DB).

**Acceptance notes:** Works on a narrow viewport without horizontal scroll on core actions.

## Integrations

- **Webhooks:** Worker endpoint or Queue consumer to notify external systems when `reportId` is ready or estimate is finalized.
- **Optional second measurement provider:** Abstract provider interface; EagleView remains default.

**Acceptance notes:** Webhook receives signed payload; retries documented.

## Platform

- **Auth roles:** Beyond admin—e.g. `estimator` vs `viewer` (ties to CRM epic).
- **Observability:** Aggregate Worker errors for roof-vision and EagleView proxy (Cloudflare dashboards + structured logs).

See also [PHASE0_GREEN_PATH.md](./PHASE0_GREEN_PATH.md) for environment and smoke-test checklist.
