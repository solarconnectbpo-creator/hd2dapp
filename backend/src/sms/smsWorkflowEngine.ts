import { sendSms } from "../services/sms";
import { resolveSmsOutbound } from "../services/sms/smsProviderResolve";
import { recordSmsUsageEvent } from "../api/stripeSmsUsage";
import type { AccessGateEnv } from "../auth/access";
import { evaluateAccess } from "../auth/access";
import { findUserById } from "../auth/userDb";
import {
  getContactById,
  getOrgOwnerUserId,
  getOrganizationName,
  getOutboundFromForOrg,
  getSmsWorkflow,
  getPrimaryOrgIdForUser,
  hasPendingWorkflowRun,
  insertSmsMessage,
  insertWorkflowRun,
  listContactsForNoResponseSweep,
  listDueWorkflowRuns,
  listSmsWorkflows,
  listSmsWorkflowsByTrigger,
  setLastNoResponseEventAt,
  updateContactTagsJson,
  updateWorkflowRun,
  upsertSmsWorkflow,
  setContactPipelineStage,
  type SmsContactRow,
} from "./smsDb";

type D1 = any;

/**
 * Outbound SMS (manual send + workflow steps) is billed to the org owner subscription.
 * Block sends when owner is not approved or billing is not active (unless AUTH_SKIP_ACCESS_GATE).
 */
export async function assertOrgOwnerMaySendSms(
  db: D1,
  env: AccessGateEnv,
  orgId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ownerId = await getOrgOwnerUserId(db, orgId);
  if (!ownerId) {
    return { ok: false, reason: "No organization owner; complete team setup under Company first." };
  }
  const row = await findUserById(db, ownerId);
  const ev = evaluateAccess(env, "company", row);
  if (!ev.accessGranted) {
    return { ok: false, reason: ev.reasons.length ? ev.reasons.join(" ") : "Membership is not active for SMS." };
  }
  return { ok: true };
}

export type WorkflowStep =
  | { type: "sms"; text: string }
  | { type: "delay_minutes"; minutes: number }
  | { type: "condition"; check: "no_reply" | "claim_not_filed" }
  | { type: "tag"; add?: string[]; remove?: string[] }
  | { type: "move_pipeline"; stage: string };

export type WorkflowDoc = { steps: WorkflowStep[] };

function normalizeStep(raw: unknown): WorkflowStep | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const t = s.type;
  if (t === "sms" && typeof s.text === "string") return { type: "sms", text: s.text };
  if (t === "delay_minutes" && typeof s.minutes === "number") {
    return { type: "delay_minutes", minutes: Math.max(0, s.minutes) };
  }
  if (t === "delay") {
    let minutes = 0;
    if (typeof s.hours === "number") minutes += s.hours * 60;
    if (typeof s.minutes === "number") minutes += s.minutes;
    return { type: "delay_minutes", minutes: Math.max(0, minutes) };
  }
  if (t === "condition" && typeof s.check === "string") {
    if (s.check === "no_reply" || s.check === "claim_not_filed") {
      return { type: "condition", check: s.check };
    }
  }
  if (t === "tag") {
    const add = Array.isArray(s.add)
      ? (s.add as unknown[]).filter((x): x is string => typeof x === "string")
      : undefined;
    const remove = Array.isArray(s.remove)
      ? (s.remove as unknown[]).filter((x): x is string => typeof x === "string")
      : undefined;
    return { type: "tag", add, remove };
  }
  if (t === "move_pipeline" && typeof s.stage === "string") {
    return { type: "move_pipeline", stage: s.stage };
  }
  return null;
}

export function parseWorkflowJson(raw: string): WorkflowDoc | null {
  try {
    const o = JSON.parse(raw) as { steps?: unknown[] };
    if (!o || !Array.isArray(o.steps)) return null;
    const steps: WorkflowStep[] = [];
    for (const el of o.steps) {
      const n = normalizeStep(el);
      if (n) steps.push(n);
    }
    if (steps.length === 0) return null;
    const hasSms = steps.some((x) => x.type === "sms");
    if (!hasSms) return null;
    return { steps };
  } catch {
    return null;
  }
}

const MAX_WORKFLOW_STEPS = 48;
const MAX_SINGLE_DELAY_MINUTES = 20160; // 14 days

/** Stricter checks before persisting workflows (size limits, non-empty SMS bodies). */
export function validateWorkflowJsonForPersist(
  raw: string,
): { ok: true; doc: WorkflowDoc; stepsJson: string } | { ok: false; error: string } {
  const doc = parseWorkflowJson(raw);
  if (!doc?.steps?.length) {
    return { ok: false, error: "Invalid steps_json: need at least one SMS step." };
  }
  if (doc.steps.length > MAX_WORKFLOW_STEPS) {
    return { ok: false, error: `Too many steps (max ${MAX_WORKFLOW_STEPS}).` };
  }
  for (const step of doc.steps) {
    if (step.type === "delay_minutes") {
      const m = Math.max(0, step.minutes || 0);
      if (m > MAX_SINGLE_DELAY_MINUTES) {
        return { ok: false, error: `A single wait exceeds ${MAX_SINGLE_DELAY_MINUTES} minutes (14 days).` };
      }
    }
    if (step.type === "sms") {
      const t = (step.text || "").trim();
      if (!t) return { ok: false, error: "SMS steps cannot be empty." };
      if (t.length > 1600) return { ok: false, error: "An SMS step exceeds 1600 characters." };
    }
  }
  return { ok: true, doc, stepsJson: JSON.stringify(doc) };
}

function renderTemplate(
  text: string,
  contact: Pick<SmsContactRow, "name" | "phone_e164" | "address">,
  companyName: string,
): string {
  return text
    .replace(/\{\{name\}\}/gi, contact.name || "there")
    .replace(/\{\{phone\}\}/gi, contact.phone_e164 || "")
    .replace(/\{\{address\}\}/gi, contact.address || "")
    .replace(/\{\{company\}\}/gi, companyName || "HD2D");
}

function evalCondition(
  check: "no_reply" | "claim_not_filed",
  contact: SmsContactRow,
  runCreatedAt: number,
): boolean {
  if (check === "claim_not_filed") return contact.claim_filed === 0;
  const last = contact.last_inbound_at;
  if (last == null) return true;
  return last < runCreatedAt;
}

function computeNextSmsIndexAfter(steps: WorkflowStep[], fromIdx: number): { nextIdx: number; delaySec: number } {
  let delaySec = 0;
  let j = fromIdx + 1;
  while (j < steps.length && steps[j].type === "delay_minutes") {
    delaySec += Math.max(0, (steps[j] as { minutes?: number }).minutes || 0) * 60;
    j++;
  }
  return { nextIdx: j, delaySec };
}

export type SmsWorkflowEnv = {
  DB: D1;
  TELNYX_API_KEY?: string;
  TELNYX_FROM_NUMBER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  STRIPE_SECRET_KEY?: string;
  /** When "true", skip membership billing gate for outbound SMS (local dev). */
  AUTH_SKIP_ACCESS_GATE?: string;
};

const MAX_RUN_ITERATIONS = 40;

export async function processSmsWorkflowRuns(env: SmsWorkflowEnv): Promise<void> {
  if (env.DB == null) return;
  for (let iter = 0; iter < MAX_RUN_ITERATIONS; iter++) {
    const nowSec = Math.floor(Date.now() / 1000);
    const due = await listDueWorkflowRuns(env.DB, 8, nowSec);
    if (due.length === 0) break;
    for (const row of due) {
      try {
        await runOneDueRun(env, row);
      } catch (e) {
        console.error("[sms-workflow]", row.id, e);
        await updateWorkflowRun(env.DB, row.id, { status: "failed", t: nowSec });
      }
    }
  }
}

async function runOneDueRun(
  env: SmsWorkflowEnv,
  row: {
    id: string;
    workflow_id: string;
    contact_id: string;
    current_step_index: number;
    org_id: string;
    steps_json: string;
    run_created_at?: number;
  },
): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  const runAnchor = row.run_created_at ?? nowSec;
  const doc = parseWorkflowJson(row.steps_json);
  if (!doc?.steps?.length) {
    await updateWorkflowRun(env.DB, row.id, { status: "failed", t: nowSec });
    return;
  }
  const steps = doc.steps;
  const idx = row.current_step_index;
  if (idx < 0 || idx >= steps.length) {
    await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
    return;
  }

  const contact = await getContactById(env.DB, row.contact_id);
  if (!contact) {
    await updateWorkflowRun(env.DB, row.id, { status: "cancelled", t: nowSec });
    return;
  }
  if (contact.unsubscribed) {
    await updateWorkflowRun(env.DB, row.id, { status: "cancelled", t: nowSec });
    return;
  }

  const orgName = (await getOrganizationName(env.DB, row.org_id)) || "HD2D";
  const step = steps[idx];

  if (step.type === "delay_minutes") {
    const nextIdx = idx + 1;
    const delaySec = Math.max(0, step.minutes) * 60;
    if (nextIdx >= steps.length) {
      await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
      return;
    }
    await updateWorkflowRun(env.DB, row.id, {
      currentStepIndex: nextIdx,
      nextRunAt: nowSec + delaySec,
      t: nowSec,
    });
    return;
  }

  if (step.type === "condition") {
    const pass = evalCondition(step.check, contact, runAnchor);
    if (!pass) {
      await updateWorkflowRun(env.DB, row.id, { status: "cancelled", t: nowSec });
      return;
    }
    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
      return;
    }
    await updateWorkflowRun(env.DB, row.id, {
      currentStepIndex: nextIdx,
      nextRunAt: nowSec,
      t: nowSec,
    });
    return;
  }

  if (step.type === "tag") {
    await updateContactTagsJson(env.DB, contact.id, { add: step.add, remove: step.remove }, nowSec);
    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
      return;
    }
    await updateWorkflowRun(env.DB, row.id, {
      currentStepIndex: nextIdx,
      nextRunAt: nowSec,
      t: nowSec,
    });
    return;
  }

  if (step.type === "move_pipeline") {
    await setContactPipelineStage(env.DB, contact.id, step.stage, nowSec);
    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
      return;
    }
    await updateWorkflowRun(env.DB, row.id, {
      currentStepIndex: nextIdx,
      nextRunAt: nowSec,
      t: nowSec,
    });
    return;
  }

  if (step.type !== "sms") {
    await updateWorkflowRun(env.DB, row.id, { status: "failed", t: nowSec });
    return;
  }

  const gate = await assertOrgOwnerMaySendSms(env.DB, env, row.org_id);
  if (!gate.ok) {
    console.warn("[sms-workflow] billing gate:", gate.reason);
    await updateWorkflowRun(env.DB, row.id, { status: "failed", t: nowSec });
    return;
  }

  const orgFrom = await getOutboundFromForOrg(env.DB, row.org_id);
  const resolved = resolveSmsOutbound(env, orgFrom);
  if (!resolved) {
    console.error("[sms-workflow] missing SMS credentials (Telnyx or Twilio)");
    await updateWorkflowRun(env.DB, row.id, { status: "failed", t: nowSec });
    return;
  }

  const text = renderTemplate(step.text, contact, orgName);
  let result: { externalId: string | null };
  if (resolved.provider === "telnyx") {
    result = await sendSms({
      provider: "telnyx",
      apiKey: resolved.apiKey,
      from: resolved.from,
      to: contact.phone_e164,
      text,
      appendCompliance: true,
    });
  } else {
    result = await sendSms({
      provider: "twilio",
      accountSid: resolved.accountSid,
      authToken: resolved.authToken,
      from: resolved.from,
      to: contact.phone_e164,
      text,
      appendCompliance: true,
    });
  }

  const msgId = crypto.randomUUID();
  await insertSmsMessage(env.DB, {
    id: msgId,
    contactId: contact.id,
    direction: "outbound",
    body: text,
    externalId: result.externalId,
    t: nowSec,
  });

  const ownerId = await getOrgOwnerUserId(env.DB, row.org_id);
  if (ownerId) {
    await recordSmsUsageEvent(
      { STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY, DB: env.DB },
      ownerId,
    );
  }

  const { nextIdx, delaySec } = computeNextSmsIndexAfter(steps, idx);
  if (nextIdx >= steps.length) {
    await updateWorkflowRun(env.DB, row.id, { status: "completed", t: nowSec });
    return;
  }

  await updateWorkflowRun(env.DB, row.id, {
    currentStepIndex: nextIdx,
    nextRunAt: nowSec + delaySec,
    t: nowSec,
  });
}

const DEFAULT_WORKFLOWS: Array<{ name: string; trigger: string; steps: WorkflowDoc }> = [
  {
    name: "New lead follow-up",
    trigger: "lead.created",
    steps: {
      steps: [
        { type: "sms", text: "Hey {{name}}, this is {{company}} — quick question, is this the owner of {{address}}?" },
        { type: "delay_minutes", minutes: 120 },
        { type: "condition", check: "no_reply" },
        {
          type: "sms",
          text: "Just wanted to follow up — we are offering free drone roof inspections in your area this week.",
        },
      ],
    },
  },
  {
    name: "Inspection follow-up",
    trigger: "inspection.completed",
    steps: {
      steps: [
        {
          type: "sms",
          text: "Hey {{name}}, we finished your roof inspection. We did find signs of storm damage.",
        },
        { type: "delay_minutes", minutes: 180 },
        {
          type: "sms",
          text: "Next step is filing a quick claim with your insurance — I can walk you through it if you want.",
        },
        { type: "delay_minutes", minutes: 1440 },
        { type: "condition", check: "claim_not_filed" },
        {
          type: "sms",
          text: "Just checking in — most homeowners in your area are getting approved due to recent storms. Want help filing?",
        },
      ],
    },
  },
  {
    name: "Estimate sent follow-up",
    trigger: "estimate.sent",
    steps: {
      steps: [
        { type: "sms", text: "Hey {{name}}, just sent over your estimate — let me know if you have any questions." },
        { type: "delay_minutes", minutes: 360 },
        { type: "sms", text: "We can lock this in and get you scheduled quickly if you are ready." },
        { type: "delay_minutes", minutes: 1440 },
        { type: "condition", check: "no_reply" },
        {
          type: "sms",
          text: "Wanted to follow up — we still have availability this week if you would like to move forward.",
        },
      ],
    },
  },
  {
    name: "No response reactivation",
    trigger: "no_response",
    steps: {
      steps: [
        {
          type: "sms",
          text: "Hey {{name}}, just wanted to circle back — still interested in having your roof checked?",
        },
      ],
    },
  },
];

export async function seedDefaultSmsWorkflowsIfEmpty(db: D1, orgId: string): Promise<void> {
  const existing = await listSmsWorkflows(db, orgId);
  if (existing.length > 0) return;
  const t = Math.floor(Date.now() / 1000);
  for (const w of DEFAULT_WORKFLOWS) {
    await upsertSmsWorkflow(db, {
      id: crypto.randomUUID(),
      orgId,
      name: w.name,
      trigger: w.trigger,
      stepsJson: JSON.stringify(w.steps),
      enabled: true,
      t,
    });
  }
}

export async function startWorkflowRunForContact(
  env: SmsWorkflowEnv,
  orgId: string,
  workflowId: string,
  contactId: string,
): Promise<{ ok: boolean; error?: string }> {
  const wf = await getSmsWorkflow(env.DB, workflowId, orgId);
  if (!wf || !wf.enabled) return { ok: false, error: "Workflow not found." };
  const contact = await getContactById(env.DB, contactId);
  if (!contact || contact.org_id !== orgId) return { ok: false, error: "Contact not found." };
  const validated = validateWorkflowJsonForPersist(wf.steps_json);
  if (!validated.ok) return { ok: false, error: validated.error };

  const nowSec = Math.floor(Date.now() / 1000);
  await insertWorkflowRun(env.DB, {
    id: crypto.randomUUID(),
    workflowId: wf.id,
    contactId,
    currentStepIndex: 0,
    nextRunAt: nowSec,
    status: "pending",
    t: nowSec,
  });
  return { ok: true };
}

/**
 * Start all enabled workflows for an org matching `eventType` for the given contact (skips if a pending run already exists).
 */
export async function emitSmsEvent(
  env: SmsWorkflowEnv,
  orgId: string,
  eventType: string,
  contactId: string,
): Promise<{ started: number; errors: string[] }> {
  const workflows = await listSmsWorkflowsByTrigger(env.DB, orgId, eventType);
  const errors: string[] = [];
  let started = 0;
  for (const w of workflows) {
    const pending = await hasPendingWorkflowRun(env.DB, w.id, contactId);
    if (pending) continue;
    const r = await startWorkflowRunForContact(env, orgId, w.id, contactId);
    if (r.ok) started++;
    else if (r.error) errors.push(r.error);
  }
  return { started, errors };
}

const NO_RESPONSE_IDLE_SEC = 48 * 3600;
const NO_RESPONSE_COOLDOWN_SEC = 7 * 24 * 3600;

export async function processSmsNoResponseSweep(env: SmsWorkflowEnv): Promise<void> {
  if (env.DB == null) return;
  const nowSec = Math.floor(Date.now() / 1000);
  const contacts = await listContactsForNoResponseSweep(env.DB, {
    nowSec,
    idleSec: NO_RESPONSE_IDLE_SEC,
    cooldownSec: NO_RESPONSE_COOLDOWN_SEC,
    limit: 40,
  });
  for (const c of contacts) {
    const { started } = await emitSmsEvent(env, c.org_id, "no_response", c.id);
    if (started > 0) {
      await setLastNoResponseEventAt(env.DB, c.id, nowSec);
    }
  }
}

export async function resolveOrgForCompanyUser(db: D1, userId: string, userType: string): Promise<string | null> {
  if (userType === "admin") return null;
  return getPrimaryOrgIdForUser(db, userId);
}
