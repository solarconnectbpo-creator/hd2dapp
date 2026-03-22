/**
 * Action Executor
 * Executes workflow actions (SMS, email, task creation, etc.)
 */

interface Env {
  DB: any;
  SMS_API?: string;
  EMAIL_API?: string;
  [key: string]: any;
}

export async function executeAction(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const actionType = config.type || "log";

  try {
    switch (actionType) {
      case "send_sms":
        await handleSendSMS(env, config, event);
        break;

      case "send_email":
        await handleSendEmail(env, config, event);
        break;

      case "log":
        console.log("[WORKFLOW ACTION LOG]", config.message || "", event);
        break;

      case "update_lead":
        await handleUpdateLead(env, config, event);
        break;

      case "update_deal":
        await handleUpdateDeal(env, config, event);
        break;

      case "assign_agent":
        await handleAssignAgent(env, config, event);
        break;

      case "simpletalk_call":
        await handleSimpleTalkCall(env, config, event);
        break;

      case "create_task":
        await handleCreateTask(env, config, event);
        break;

      case "create_post":
        await handleCreatePost(env, config, event);
        break;

      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  } catch (error) {
    console.error(`Error executing action ${actionType}:`, error);
    throw error;
  }
}

async function handleSendSMS(env: Env, config: any, event: any): Promise<void> {
  const to = config.to || event.phone;
  const message = config.message;

  if (!env.SMS_API) {
    console.warn("SMS_API not configured");
    return;
  }

  await fetch(env.SMS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, message }),
  });
}

async function handleSendEmail(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const to = config.to || event.email;
  const subject = config.subject;
  const html = config.html;

  if (!env.EMAIL_API) {
    console.warn("EMAIL_API not configured");
    return;
  }

  await fetch(env.EMAIL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  });
}

async function handleUpdateLead(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const leadId = config.leadId || event.leadId;
  const status = config.status;

  if (!leadId) return;

  await env.DB.prepare("UPDATE leads SET status = ? WHERE id = ?")
    .bind(status, leadId)
    .run();
}

async function handleUpdateDeal(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const dealId = config.dealId || event.dealId;
  const stage = config.stage;

  if (!dealId) return;

  await env.DB.prepare("UPDATE deals SET stage = ? WHERE id = ?")
    .bind(stage, dealId)
    .run();
}

async function handleAssignAgent(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const leadId = config.leadId || event.leadId;
  const agentId = config.agentId;

  if (!leadId || !agentId) return;

  await env.DB.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?")
    .bind(agentId, leadId)
    .run();
}

async function handleSimpleTalkCall(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const webhookUrl = config.webhookUrl;
  const number = config.number || event.phone;

  if (!webhookUrl) {
    console.warn("SimpleTalk webhook URL not configured");
    return;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start_call",
      number,
    }),
  });
}

async function handleCreateTask(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const dealId = config.dealId || event.dealId;
  const title = config.title;
  const due = config.due;

  if (!dealId || !title) return;

  await env.DB.prepare(
    "INSERT INTO tasks (id, deal_id, title, due_date) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), dealId, title, due || null)
    .run();
}

async function handleCreatePost(
  env: Env,
  config: any,
  event: any,
): Promise<void> {
  const userId = config.userId || event.userId;
  const content = config.content;

  if (!userId || !content) return;

  await env.DB.prepare(
    "INSERT INTO posts (id, user_id, content) VALUES (?, ?, ?)",
  )
    .bind(crypto.randomUUID(), userId, content)
    .run();
}
