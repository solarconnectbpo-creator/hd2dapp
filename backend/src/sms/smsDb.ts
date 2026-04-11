type D1 = any;

export async function getPrimaryOrgIdForUser(db: D1, userId: string): Promise<string | null> {
  if (db == null) return null;
  const row = await db
    .prepare(`SELECT org_id FROM org_members WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<{ org_id: string }>();
  return row?.org_id ?? null;
}

export async function resolveOrgIdByInboundTo(db: D1, toE164: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT org_id FROM sms_org_numbers WHERE phone_e164 = ? LIMIT 1`)
    .bind(toE164.trim())
    .first<{ org_id: string }>();
  return row?.org_id ?? null;
}

function normalizeE164ForOrgLookup(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : s;
}

/** Resolve org from the Telnyx “to” number (same as `sms_org_numbers.phone_e164`). */
export async function getSmsOrgFromTelnyxToNumber(db: D1, phoneE164: string): Promise<string | null> {
  if (db == null) return null;
  const norm = normalizeE164ForOrgLookup(phoneE164);
  if (!norm) return null;
  return resolveOrgIdByInboundTo(db, norm);
}

export async function listSmsOrgNumbersForOrg(
  db: D1,
  orgId: string,
): Promise<Array<{ phone_e164: string; label: string | null }>> {
  if (db == null) return [];
  const res = (await db
    .prepare(`SELECT phone_e164, label FROM sms_org_numbers WHERE org_id = ? ORDER BY created_at ASC`)
    .bind(orgId)
    .all()) as { results?: Array<{ phone_e164: string; label: string | null }> };
  return res.results ?? [];
}

export async function upsertSmsContact(
  db: D1,
  args: {
    id: string;
    orgId: string;
    phoneE164: string;
    name?: string;
    t: number;
  },
): Promise<void> {
  const existing = await db
    .prepare(`SELECT id, unsubscribed FROM sms_contacts WHERE org_id = ? AND phone_e164 = ? LIMIT 1`)
    .bind(args.orgId, args.phoneE164)
    .first<{ id: string; unsubscribed: number }>();
  if (existing) {
    await db
      .prepare(
        `UPDATE sms_contacts SET last_inbound_at = ?, updated_at = ?, name = COALESCE(?, name) WHERE id = ?`,
      )
      .bind(args.t, args.t, args.name?.trim() || null, existing.id)
      .run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO sms_contacts (id, org_id, phone_e164, name, unsubscribed, last_inbound_at, provider, automations_paused, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 'telnyx', 0, ?, ?)`,
    )
    .bind(
      args.id,
      args.orgId,
      args.phoneE164,
      args.name?.trim() || "",
      args.t,
      args.t,
      args.t,
    )
    .run();
}

export async function findContactByOrgPhone(
  db: D1,
  orgId: string,
  phoneE164: string,
): Promise<{ id: string; unsubscribed: number; automations_paused: number } | null> {
  const row = await db
    .prepare(
      `SELECT id, unsubscribed, automations_paused FROM sms_contacts WHERE org_id = ? AND phone_e164 = ? LIMIT 1`,
    )
    .bind(orgId, phoneE164)
    .first<{ id: string; unsubscribed: number; automations_paused: number }>();
  return row ?? null;
}

/** Upsert by org + E.164; returns sms_contacts.id (for workflow events). Requires migration 0008+ for `address`. */
export async function ensureSmsContactForOrg(
  db: D1,
  args: { orgId: string; phoneE164: string; name?: string; address?: string; t: number },
): Promise<string> {
  const phone = args.phoneE164.trim();
  const existing = await findContactByOrgPhone(db, args.orgId, phone);
  const nm = (args.name || "").trim();
  const addr = (args.address || "").trim();
  if (existing) {
    await db
      .prepare(
        `UPDATE sms_contacts SET updated_at = ?,
          name = COALESCE(NULLIF(?, ''), name),
          address = COALESCE(NULLIF(?, ''), address)
         WHERE id = ?`,
      )
      .bind(args.t, nm, addr, existing.id)
      .run();
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO sms_contacts (id, org_id, phone_e164, name, address, unsubscribed, last_inbound_at, provider, automations_paused, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, NULL, 'telnyx', 0, ?, ?)`,
    )
    .bind(id, args.orgId, phone, nm, addr, args.t, args.t)
    .run();
  return id;
}

export type SmsContactRow = {
  id: string;
  org_id: string;
  phone_e164: string;
  name: string;
  unsubscribed: number;
  automations_paused: number;
  address: string;
  pipeline_stage: string;
  claim_filed: number;
  tags_json: string;
  last_inbound_at: number | null;
};

export async function getOrganizationName(db: D1, orgId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT name FROM organizations WHERE id = ? LIMIT 1`)
    .bind(orgId)
    .first<{ name: string }>();
  return row?.name?.trim() || null;
}

export async function getContactById(db: D1, id: string): Promise<SmsContactRow | null> {
  const row = await db
    .prepare(
      `SELECT id, org_id, phone_e164, name, unsubscribed, automations_paused,
              COALESCE(address, '') AS address,
              COALESCE(pipeline_stage, '') AS pipeline_stage,
              COALESCE(claim_filed, 0) AS claim_filed,
              COALESCE(tags_json, '[]') AS tags_json,
              last_inbound_at
       FROM sms_contacts WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<SmsContactRow>();
  return row ?? null;
}

export async function getSmsContactByIdForOrg(db: D1, id: string, orgId: string): Promise<SmsContactRow | null> {
  const row = await db
    .prepare(
      `SELECT id, org_id, phone_e164, name, unsubscribed, automations_paused,
              COALESCE(address, '') AS address,
              COALESCE(pipeline_stage, '') AS pipeline_stage,
              COALESCE(claim_filed, 0) AS claim_filed,
              COALESCE(tags_json, '[]') AS tags_json,
              last_inbound_at
       FROM sms_contacts WHERE id = ? AND org_id = ? LIMIT 1`,
    )
    .bind(id, orgId)
    .first<SmsContactRow>();
  return row ?? null;
}

export type SmsContactListRow = SmsContactRow & {
  created_at: number;
  updated_at: number;
  last_message_at: number | null;
  last_message_preview: string | null;
};

export async function listSmsContactsForOrg(
  db: D1,
  orgId: string,
  limit = 200,
  offset = 0,
): Promise<SmsContactListRow[]> {
  if (db == null) return [];
  const lim = Math.min(Math.max(1, limit), 500);
  const off = Math.max(0, offset);
  const res = (await db
    .prepare(
      `SELECT c.id, c.org_id, c.phone_e164, c.name, c.unsubscribed, c.automations_paused,
              COALESCE(c.address, '') AS address,
              COALESCE(c.pipeline_stage, '') AS pipeline_stage,
              COALESCE(c.claim_filed, 0) AS claim_filed,
              COALESCE(c.tags_json, '[]') AS tags_json,
              c.last_inbound_at,
              c.created_at,
              c.updated_at,
              (SELECT MAX(created_at) FROM sms_messages WHERE contact_id = c.id) AS last_message_at,
              (SELECT body FROM sms_messages WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
       FROM sms_contacts c
       WHERE c.org_id = ?
       ORDER BY COALESCE((SELECT MAX(created_at) FROM sms_messages WHERE contact_id = c.id), c.updated_at) DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(orgId, lim, off)
    .all()) as { results?: SmsContactListRow[] };
  return res.results ?? [];
}

export type SmsMessageRow = {
  id: string;
  contact_id: string;
  direction: string;
  body: string;
  external_id: string | null;
  created_at: number;
};

export async function listSmsMessagesForContact(
  db: D1,
  orgId: string,
  contactId: string,
  limit = 500,
): Promise<SmsMessageRow[]> {
  if (db == null) return [];
  const lim = Math.min(Math.max(1, limit), 1000);
  const res = (await db
    .prepare(
      `SELECT m.id, m.contact_id, m.direction, m.body, m.external_id, m.created_at
       FROM sms_messages m
       INNER JOIN sms_contacts c ON c.id = m.contact_id AND c.org_id = ?
       WHERE m.contact_id = ?
       ORDER BY m.created_at ASC
       LIMIT ?`,
    )
    .bind(orgId, contactId, lim)
    .all()) as { results?: SmsMessageRow[] };
  return res.results ?? [];
}

export async function updateSmsContactFields(
  db: D1,
  contactId: string,
  orgId: string,
  patch: { name?: string; automations_paused?: boolean; unsubscribed?: boolean },
  t: number,
): Promise<boolean> {
  const exists = await db
    .prepare(`SELECT id FROM sms_contacts WHERE id = ? AND org_id = ? LIMIT 1`)
    .bind(contactId, orgId)
    .first<{ id: string }>();
  if (!exists) return false;
  const parts: string[] = ["updated_at = ?"];
  const binds: unknown[] = [t];
  if (patch.name !== undefined) {
    parts.push("name = ?");
    binds.push(patch.name.trim());
  }
  if (patch.automations_paused !== undefined) {
    parts.push("automations_paused = ?");
    binds.push(patch.automations_paused ? 1 : 0);
  }
  if (patch.unsubscribed !== undefined) {
    parts.push("unsubscribed = ?");
    binds.push(patch.unsubscribed ? 1 : 0);
  }
  binds.push(contactId, orgId);
  await db
    .prepare(`UPDATE sms_contacts SET ${parts.join(", ")} WHERE id = ? AND org_id = ?`)
    .bind(...binds)
    .run();
  return true;
}

export async function bumpSmsContactActivity(db: D1, contactId: string, t: number): Promise<void> {
  await db.prepare(`UPDATE sms_contacts SET updated_at = ? WHERE id = ?`).bind(t, contactId).run();
}

function parseTagsJson(raw: string): string[] {
  try {
    const a = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function updateContactTagsJson(db: D1, contactId: string, mut: { add?: string[]; remove?: string[] }, t: number): Promise<void> {
  const row = await db
    .prepare(`SELECT tags_json FROM sms_contacts WHERE id = ? LIMIT 1`)
    .bind(contactId)
    .first<{ tags_json: string }>();
  if (!row) return;
  let tags = new Set(parseTagsJson(row.tags_json));
  for (const r of mut.remove || []) tags.delete(r.trim());
  for (const a of mut.add || []) {
    const s = a.trim();
    if (s) tags.add(s);
  }
  const json = JSON.stringify([...tags]);
  await db
    .prepare(`UPDATE sms_contacts SET tags_json = ?, updated_at = ? WHERE id = ?`)
    .bind(json, t, contactId)
    .run();
}

export async function setContactPipelineStage(db: D1, contactId: string, stage: string, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_contacts SET pipeline_stage = ?, updated_at = ? WHERE id = ?`)
    .bind(stage.trim(), t, contactId)
    .run();
}

export async function setContactClaimFiled(db: D1, contactId: string, filed: boolean, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_contacts SET claim_filed = ?, updated_at = ? WHERE id = ?`)
    .bind(filed ? 1 : 0, t, contactId)
    .run();
}

export async function setLastNoResponseEventAt(db: D1, contactId: string, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_contacts SET last_no_response_event_at = ?, updated_at = ? WHERE id = ?`)
    .bind(t, t, contactId)
    .run();
}

export async function insertSmsMessage(
  db: D1,
  args: { id: string; contactId: string; direction: "inbound" | "outbound"; body: string; externalId?: string | null; t: number },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sms_messages (id, contact_id, direction, body, external_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(args.id, args.contactId, args.direction, args.body, args.externalId ?? null, args.t)
    .run();
}

export async function setContactUnsubscribed(db: D1, contactId: string, unsub: boolean, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_contacts SET unsubscribed = ?, updated_at = ? WHERE id = ?`)
    .bind(unsub ? 1 : 0, t, contactId)
    .run();
}

export async function setContactAutomationsPaused(db: D1, contactId: string, paused: boolean, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_contacts SET automations_paused = ?, updated_at = ? WHERE id = ?`)
    .bind(paused ? 1 : 0, t, contactId)
    .run();
}

export async function listSmsWorkflows(db: D1, orgId: string): Promise<
  Array<{
    id: string;
    org_id: string;
    name: string;
    trigger: string;
    steps_json: string;
    enabled: number;
    created_at: number;
    updated_at: number;
  }>
> {
  const res = (await db
    .prepare(`SELECT id, org_id, name, trigger, steps_json, enabled, created_at, updated_at FROM sms_workflows WHERE org_id = ? ORDER BY name ASC`)
    .bind(orgId)
    .all()) as {
    results?: Array<{
      id: string;
      org_id: string;
      name: string;
      trigger: string;
      steps_json: string;
      enabled: number;
      created_at: number;
      updated_at: number;
    }>;
  };
  return res.results ?? [];
}

export async function listSmsWorkflowsByTrigger(
  db: D1,
  orgId: string,
  trigger: string,
): Promise<Array<{ id: string; org_id: string; name: string; trigger: string; steps_json: string; enabled: number }>> {
  const res = (await db
    .prepare(
      `SELECT id, org_id, name, trigger, steps_json, enabled FROM sms_workflows WHERE org_id = ? AND trigger = ? AND enabled = 1 ORDER BY name ASC`,
    )
    .bind(orgId, trigger)
    .all()) as {
    results?: Array<{
      id: string;
      org_id: string;
      name: string;
      trigger: string;
      steps_json: string;
      enabled: number;
    }>;
  };
  return res.results ?? [];
}

export async function hasPendingWorkflowRun(db: D1, workflowId: string, contactId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS n FROM sms_workflow_runs WHERE workflow_id = ? AND contact_id = ? AND status = 'pending' LIMIT 1`,
    )
    .bind(workflowId, contactId)
    .first<{ n: number }>();
  return Boolean(row);
}

export async function getSmsWorkflow(db: D1, id: string, orgId: string) {
  const row = await db
    .prepare(
      `SELECT id, org_id, name, trigger, steps_json, enabled, created_at, updated_at FROM sms_workflows WHERE id = ? AND org_id = ? LIMIT 1`,
    )
    .bind(id, orgId)
    .first<{
      id: string;
      org_id: string;
      name: string;
      trigger: string;
      steps_json: string;
      enabled: number;
      created_at: number;
      updated_at: number;
    }>();
  return row ?? null;
}

export async function upsertSmsWorkflow(
  db: D1,
  args: {
    id: string;
    orgId: string;
    name: string;
    trigger: string;
    stepsJson: string;
    enabled: boolean;
    t: number;
  },
): Promise<void> {
  const existing = await db.prepare(`SELECT id FROM sms_workflows WHERE id = ?`).bind(args.id).first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        `UPDATE sms_workflows SET name = ?, trigger = ?, steps_json = ?, enabled = ?, updated_at = ? WHERE id = ? AND org_id = ?`,
      )
      .bind(args.name, args.trigger, args.stepsJson, args.enabled ? 1 : 0, args.t, args.id, args.orgId)
      .run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO sms_workflows (id, org_id, name, trigger, steps_json, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.id,
      args.orgId,
      args.name,
      args.trigger,
      args.stepsJson,
      args.enabled ? 1 : 0,
      args.t,
      args.t,
    )
    .run();
}

export async function deleteSmsWorkflow(db: D1, id: string, orgId: string): Promise<boolean> {
  const res = (await db
    .prepare(`DELETE FROM sms_workflows WHERE id = ? AND org_id = ?`)
    .bind(id, orgId)
    .run()) as { meta?: { changes?: number } };
  return (res.meta?.changes ?? 0) > 0;
}

export async function insertWorkflowRun(
  db: D1,
  args: {
    id: string;
    workflowId: string;
    contactId: string;
    currentStepIndex: number;
    nextRunAt: number;
    status: "pending" | "completed" | "cancelled" | "failed";
    t: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sms_workflow_runs (id, workflow_id, contact_id, current_step_index, status, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.id,
      args.workflowId,
      args.contactId,
      args.currentStepIndex,
      args.status,
      args.nextRunAt,
      args.t,
      args.t,
    )
    .run();
}

export async function updateWorkflowRun(
  db: D1,
  runId: string,
  patch: {
    currentStepIndex?: number;
    status?: "pending" | "completed" | "cancelled" | "failed";
    nextRunAt?: number;
    t: number;
  },
): Promise<void> {
  const parts: string[] = ["updated_at = ?"];
  const binds: unknown[] = [patch.t];
  if (patch.currentStepIndex !== undefined) {
    parts.push("current_step_index = ?");
    binds.push(patch.currentStepIndex);
  }
  if (patch.status !== undefined) {
    parts.push("status = ?");
    binds.push(patch.status);
  }
  if (patch.nextRunAt !== undefined) {
    parts.push("next_run_at = ?");
    binds.push(patch.nextRunAt);
  }
  binds.push(runId);
  await db
    .prepare(`UPDATE sms_workflow_runs SET ${parts.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function getOutboundFromForOrg(db: D1, orgId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT phone_e164 FROM sms_org_numbers WHERE org_id = ? LIMIT 1`)
    .bind(orgId)
    .first<{ phone_e164: string }>();
  return row?.phone_e164 ?? null;
}

export async function getOrgOwnerUserId(db: D1, orgId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT user_id FROM org_members WHERE org_id = ? AND role = 'owner' LIMIT 1`)
    .bind(orgId)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function cancelPendingRunsForContact(db: D1, contactId: string, t: number): Promise<void> {
  await db
    .prepare(`UPDATE sms_workflow_runs SET status = 'cancelled', updated_at = ? WHERE contact_id = ? AND status = 'pending'`)
    .bind(t, contactId)
    .run();
}

export type SmsWorkflowRunFailureRow = {
  id: string;
  workflow_id: string;
  workflow_name: string;
  contact_id: string;
  phone_e164: string;
  updated_at: number;
};

/** Recent failed automation runs for diagnostics (e.g. missing Telnyx, billing gate). */
export async function listRecentWorkflowRunFailuresForOrg(
  db: D1,
  orgId: string,
  limit: number,
): Promise<SmsWorkflowRunFailureRow[]> {
  if (db == null) return [];
  const lim = Math.min(50, Math.max(1, limit));
  const res = (await db
    .prepare(
      `SELECT r.id, r.workflow_id, w.name AS workflow_name, r.contact_id, c.phone_e164, r.updated_at
       FROM sms_workflow_runs r
       JOIN sms_workflows w ON w.id = r.workflow_id
       JOIN sms_contacts c ON c.id = r.contact_id
       WHERE w.org_id = ? AND r.status = 'failed'
       ORDER BY r.updated_at DESC
       LIMIT ?`,
    )
    .bind(orgId, lim)
    .all()) as {
    results?: Array<{
      id: string;
      workflow_id: string;
      workflow_name: string;
      contact_id: string;
      phone_e164: string;
      updated_at: number;
    }>;
  };
  const rows = res.results ?? [];
  return rows.map((r) => ({
    id: r.id,
    workflow_id: r.workflow_id,
    workflow_name: r.workflow_name,
    contact_id: r.contact_id,
    phone_e164: r.phone_e164,
    updated_at: r.updated_at,
  }));
}

export async function listDueWorkflowRuns(db: D1, limit: number, nowSec: number) {
  const res = (await db
    .prepare(
      `SELECT r.id, r.workflow_id, r.contact_id, r.current_step_index, r.status, r.next_run_at, r.created_at AS run_created_at,
              w.org_id, w.steps_json, w.trigger
       FROM sms_workflow_runs r
       JOIN sms_workflows w ON w.id = r.workflow_id
       WHERE r.status = 'pending' AND w.enabled = 1 AND r.next_run_at <= ?
       ORDER BY r.next_run_at ASC
       LIMIT ?`,
    )
    .bind(nowSec, limit)
    .all()) as {
    results?: Array<{
      id: string;
      workflow_id: string;
      contact_id: string;
      current_step_index: number;
      status: string;
      next_run_at: number;
      run_created_at: number;
      org_id: string;
      steps_json: string;
      trigger: string;
    }>;
  };
  return res.results ?? [];
}

/** Contacts idle (no inbound for 48h) and not recently sent no_response automation (7d cooldown). */
export async function listContactsForNoResponseSweep(
  db: D1,
  args: { nowSec: number; idleSec: number; cooldownSec: number; limit: number },
): Promise<Array<{ id: string; org_id: string }>> {
  const idleBefore = args.nowSec - args.idleSec;
  const cooldownBefore = args.nowSec - args.cooldownSec;
  const res = (await db
    .prepare(
      `SELECT id, org_id FROM sms_contacts
       WHERE unsubscribed = 0 AND automations_paused = 0
         AND (COALESCE(pipeline_stage, '') NOT IN ('deal.won', 'deal.lost'))
         AND (last_inbound_at IS NULL OR last_inbound_at < ?)
         AND (last_no_response_event_at IS NULL OR last_no_response_event_at < ?)
       LIMIT ?`,
    )
    .bind(idleBefore, cooldownBefore, args.limit)
    .all()) as { results?: Array<{ id: string; org_id: string }> };
  return res.results ?? [];
}
