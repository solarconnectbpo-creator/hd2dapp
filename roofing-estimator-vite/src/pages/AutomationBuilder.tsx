import { useCallback, useEffect, useMemo, useState } from "react";
import { Seo } from "../components/Seo";
import { useAuth } from "../context/AuthContext";
import { getHd2dApiBase } from "../lib/hd2dApiBase";
import { getStoredSession } from "../lib/authClient";
import { readJsonResponseBody } from "../lib/readJsonResponse";

type WorkflowRow = {
  id: string;
  name: string;
  trigger: string;
  steps_json: string;
  enabled: number;
};

type UiStep =
  | { key: string; kind: "sms"; text: string }
  | { key: string; kind: "delay"; hours: number; minutes: number }
  | { key: string; kind: "condition"; check: "no_reply" | "claim_not_filed" }
  | { key: string; kind: "tag"; add: string; remove: string }
  | { key: string; kind: "move_pipeline"; stage: string };

const PREVIEW = {
  name: "Jane",
  phone: "+15551234567",
  address: "123 Oak St",
  company: "HD2D Roofing",
};

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function uiStepsToJson(steps: UiStep[]): string {
  const out: unknown[] = [];
  for (const s of steps) {
    switch (s.kind) {
      case "sms":
        out.push({ type: "sms", text: s.text });
        break;
      case "delay":
        out.push({ type: "delay_minutes", minutes: Math.max(0, s.hours * 60 + s.minutes) });
        break;
      case "condition":
        out.push({ type: "condition", check: s.check });
        break;
      case "tag": {
        const add = s.add
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        const remove = s.remove
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        out.push({
          type: "tag",
          ...(add.length ? { add } : {}),
          ...(remove.length ? { remove } : {}),
        });
        break;
      }
      case "move_pipeline":
        out.push({ type: "move_pipeline", stage: s.stage });
        break;
      default:
        break;
    }
  }
  return JSON.stringify({ steps: out }, null, 2);
}

function parseUiSteps(raw: string): UiStep[] | null {
  try {
    const o = JSON.parse(raw) as { steps?: unknown[] };
    if (!o || !Array.isArray(o.steps)) return null;
    const list: UiStep[] = [];
    for (const el of o.steps) {
      if (!el || typeof el !== "object") continue;
      const t = (el as { type?: string }).type;
      const k = newKey();
      if (t === "sms" && typeof (el as { text?: string }).text === "string") {
        list.push({ key: k, kind: "sms", text: (el as { text: string }).text });
        continue;
      }
      if (t === "delay_minutes" && typeof (el as { minutes?: number }).minutes === "number") {
        const m = Math.max(0, (el as { minutes: number }).minutes);
        list.push({ key: k, kind: "delay", hours: Math.floor(m / 60), minutes: m % 60 });
        continue;
      }
      if (t === "delay") {
        const h = typeof (el as { hours?: number }).hours === "number" ? (el as { hours: number }).hours : 0;
        const min = typeof (el as { minutes?: number }).minutes === "number" ? (el as { minutes: number }).minutes : 0;
        const total = Math.max(0, h * 60 + min);
        list.push({ key: k, kind: "delay", hours: Math.floor(total / 60), minutes: total % 60 });
        continue;
      }
      if (t === "condition") {
        const c = (el as { check?: string }).check;
        if (c === "no_reply" || c === "claim_not_filed") {
          list.push({ key: k, kind: "condition", check: c });
        }
        continue;
      }
      if (t === "tag") {
        const add = Array.isArray((el as { add?: string[] }).add) ? (el as { add: string[] }).add.join(", ") : "";
        const remove = Array.isArray((el as { remove?: string[] }).remove)
          ? (el as { remove: string[] }).remove.join(", ")
          : "";
        list.push({ key: k, kind: "tag", add, remove });
        continue;
      }
      if (t === "move_pipeline" && typeof (el as { stage?: string }).stage === "string") {
        list.push({ key: k, kind: "move_pipeline", stage: (el as { stage: string }).stage });
      }
    }
    return list.length ? list : null;
  } catch {
    return null;
  }
}

function previewRender(text: string): string {
  return text
    .replace(/\{\{name\}\}/gi, PREVIEW.name)
    .replace(/\{\{phone\}\}/gi, PREVIEW.phone)
    .replace(/\{\{address\}\}/gi, PREVIEW.address)
    .replace(/\{\{company\}\}/gi, PREVIEW.company);
}

function authHeaders(): HeadersInit {
  const token = getStoredSession()?.token;
  const h: Record<string, string> = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

type SmsSetupStatus = {
  success?: boolean;
  org_id?: string;
  inbound_numbers?: Array<{ phone_e164: string; label: string | null }>;
  worker?: {
    telnyx_configured?: boolean;
    telnyx_default_from_set?: boolean;
    twilio_configured?: boolean;
  };
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function AutomationBuilder() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("manual");
  const [steps, setSteps] = useState<UiStep[]>([{ key: newKey(), kind: "sms", text: "" }]);
  const [busy, setBusy] = useState(false);
  const [suggestIn, setSuggestIn] = useState("");
  const [suggestOut, setSuggestOut] = useState<string | null>(null);
  const [canonicalTriggers, setCanonicalTriggers] = useState<string[]>(["manual"]);
  const [setup, setSetup] = useState<SmsSetupStatus | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const stepsJson = useMemo(() => uiStepsToJson(steps), [steps]);

  const firstSmsPreview = useMemo(() => {
    const sms = steps.find((s) => s.kind === "sms");
    if (sms && sms.kind === "sms") return previewRender(sms.text);
    return "";
  }, [steps]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const base = getHd2dApiBase().replace(/\/$/, "");
      const [wfRes, trRes, setupRes] = await Promise.all([
        fetch(`${base}/api/sms/workflows`, { headers: authHeaders() }),
        fetch(`${base}/api/sms/triggers`, { headers: authHeaders() }),
        fetch(`${base}/api/sms/setup-status`, { headers: authHeaders() }),
      ]);
      const wfData = await readJsonResponseBody<{ success?: boolean; workflows?: WorkflowRow[]; error?: string }>(wfRes);
      if (!wfRes.ok || !wfData.success) {
        setError(wfData.error || `Failed to load (${wfRes.status})`);
        setWorkflows([]);
        setSetup(null);
        return;
      }
      setWorkflows(wfData.workflows ?? []);
      const trData = await readJsonResponseBody<{ success?: boolean; triggers?: string[] }>(trRes);
      if (trRes.ok && trData.success && trData.triggers?.length) {
        setCanonicalTriggers(trData.triggers);
      }
      if (setupRes.ok) {
        const st = await readJsonResponseBody<SmsSetupStatus>(setupRes);
        if (st.success) setSetup(st);
        else setSetup(null);
      } else {
        setSetup(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (workflows.length && !selectedId) {
      const first = workflows[0];
      setSelectedId(first.id);
    }
  }, [workflows, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const w = workflows.find((x) => x.id === selectedId);
    if (w) {
      setName(w.name);
      setTrigger(w.trigger || "manual");
      const parsed = parseUiSteps(w.steps_json);
      setSteps(parsed ?? [{ key: newKey(), kind: "sms", text: "" }]);
    }
  }, [selectedId, workflows]);

  async function saveWorkflow() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const base = getHd2dApiBase().replace(/\/$/, "");
      const res = await fetch(`${base}/api/sms/workflows/${encodeURIComponent(selectedId)}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, steps_json: stepsJson }),
      });
      const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) {
        setError(data.error || "Save failed");
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function suggestReply() {
    setBusy(true);
    setSuggestOut(null);
    setError(null);
    try {
      const base = getHd2dApiBase().replace(/\/$/, "");
      const res = await fetch(`${base}/api/sms/suggest-reply`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ inboundText: suggestIn, contactContext: user?.email || "" }),
      });
      const data = await readJsonResponseBody<{ success?: boolean; suggestion?: string; error?: string }>(res);
      if (!res.ok || !data.success) {
        setError(data.error || "Suggest failed");
        return;
      }
      setSuggestOut(data.suggestion ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggest failed");
    } finally {
      setBusy(false);
    }
  }

  function addStep(kind: UiStep["kind"]) {
    const k = newKey();
    if (kind === "sms") setSteps((s) => [...s, { key: k, kind: "sms", text: "" }]);
    else if (kind === "delay") setSteps((s) => [...s, { key: k, kind: "delay", hours: 0, minutes: 60 }]);
    else if (kind === "condition") setSteps((s) => [...s, { key: k, kind: "condition", check: "no_reply" }]);
    else if (kind === "tag") setSteps((s) => [...s, { key: k, kind: "tag", add: "", remove: "" }]);
    else if (kind === "move_pipeline") setSteps((s) => [...s, { key: k, kind: "move_pipeline", stage: "qualified" }]);
  }

  function removeStep(key: string) {
    setSteps((s) => (s.length <= 1 ? s : s.filter((x) => x.key !== key)));
  }

  function updateStep(key: string, patch: Partial<UiStep>) {
    setSteps((s) => s.map((x) => (x.key === key ? ({ ...x, ...patch } as UiStep) : x)));
  }

  if (user?.user_type === "admin") {
    return (
      <div className="hd2d-page-shell max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">SMS follow-up</h1>
        <p className="text-sm text-[#71767b]">
          Sign in with a company account to edit follow-up sequences for that organization.
        </p>
      </div>
    );
  }

  const apiBase = getHd2dApiBase().replace(/\/$/, "");
  const webhookUrl = `${apiBase}/api/webhooks/telnyx`;
  const orgId = setup?.org_id ?? "";
  const inbound = setup?.inbound_numbers ?? [];
  const wTelnyx = setup?.worker?.telnyx_configured;
  const wFrom = setup?.worker?.telnyx_default_from_set;
  const sqlExample = orgId
    ? `INSERT INTO sms_org_numbers (phone_e164, org_id, label, created_at)\nVALUES ('+15551234567', '${orgId}', 'main', strftime('%s','now'));`
    : "";

  async function onCopy(label: string, text: string) {
    const ok = await copyToClipboard(text);
    setCopyHint(ok ? `Copied: ${label}` : "Copy failed — select and copy manually");
    window.setTimeout(() => setCopyHint(null), 2500);
  }

  return (
    <div className="hd2d-page-shell max-w-3xl space-y-8">
      <Seo title="SMS follow-up — HD2D Closers" description="Automated SMS follow-up sequences, Telnyx setup, and AI reply drafts." path="/sms-automation" />
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#71767b]">Messaging</p>
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">SMS follow-up</h1>
        <p className="text-sm text-[#71767b] mt-2">
          Design automated text sequences that run when a trigger fires (new lead, no response, etc.). Sending and receiving
          uses Telnyx once your number is connected below.
        </p>
      </div>

      <section
        className="rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.06] to-transparent p-5 ring-1 ring-sky-500/20"
        aria-labelledby="sms-followup-heading"
      >
        <h2 id="sms-followup-heading" className="text-lg font-semibold text-[#e7e9ea]">
          Follow-up sequences
        </h2>
        <p className="mt-1 text-sm text-[#8b9199]">
          Each sequence has a <strong className="font-medium text-[#c4d0dc]">trigger</strong> (when it starts) and{" "}
          <strong className="font-medium text-[#c4d0dc]">steps</strong> (texts, wait times, tags, pipeline moves) that run in
          order.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-[#8b9199]">Loading workflows…</p>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2fr]">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#e7e9ea]">Your sequences</h3>
            <ul className="space-y-1">
              {workflows.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedId === w.id ? "bg-[#1d9bf0]/30 text-white" : "bg-white/[0.04] text-[#e7e9ea] hover:bg-white/[0.08]"
                    }`}
                  >
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedId ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e7e9ea]">Sequence name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#12141a] px-3 py-2 text-sm text-[#e7e9ea]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e7e9ea]">When to start (trigger)</label>
                <select
                  className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#12141a] px-3 py-2 text-sm text-[#e7e9ea]"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                >
                  {!canonicalTriggers.includes(trigger) ? (
                    <option value={trigger}>{trigger}</option>
                  ) : null}
                  {canonicalTriggers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#e7e9ea]">Follow-up steps</h3>
                  <div className="flex flex-wrap gap-1">
                    {(["sms", "delay", "condition", "tag", "move_pipeline"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs text-[#e7e9ea] hover:bg-white/[0.1]"
                        onClick={() => addStep(k)}
                      >
                        + {k}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="mt-3 space-y-3">
                  {steps.map((s, i) => (
                    <li key={s.key} className="rounded-lg border border-white/[0.08] bg-[#12141a]/80 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-[#8b9199]">
                          {i + 1}. {s.kind}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-red-300 hover:underline"
                          onClick={() => removeStep(s.key)}
                        >
                          Remove
                        </button>
                      </div>
                      {s.kind === "sms" ? (
                        <textarea
                          className="min-h-[72px] w-full rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1 text-sm text-[#e7e9ea]"
                          value={s.text}
                          onChange={(e) => updateStep(s.key, { text: e.target.value } as Partial<UiStep>)}
                          spellCheck
                        />
                      ) : null}
                      {s.kind === "delay" ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-[#e7e9ea]">
                          <input
                            type="number"
                            min={0}
                            className="w-20 rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1"
                            value={s.hours}
                            onChange={(e) =>
                              updateStep(s.key, { hours: Number(e.target.value) || 0 } as Partial<UiStep>)
                            }
                          />
                          <span>h</span>
                          <input
                            type="number"
                            min={0}
                            className="w-20 rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1"
                            value={s.minutes}
                            onChange={(e) =>
                              updateStep(s.key, { minutes: Number(e.target.value) || 0 } as Partial<UiStep>)
                            }
                          />
                          <span>m</span>
                        </div>
                      ) : null}
                      {s.kind === "condition" ? (
                        <select
                          className="w-full rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1 text-sm text-[#e7e9ea]"
                          value={s.check}
                          onChange={(e) =>
                            updateStep(s.key, {
                              check: e.target.value as "no_reply" | "claim_not_filed",
                            } as Partial<UiStep>)
                          }
                        >
                          <option value="no_reply">no_reply (no inbound since run started)</option>
                          <option value="claim_not_filed">claim_not_filed</option>
                        </select>
                      ) : null}
                      {s.kind === "tag" ? (
                        <div className="space-y-1 text-sm">
                          <input
                            className="w-full rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1 text-[#e7e9ea]"
                            placeholder="Add tags (comma-separated)"
                            value={s.add}
                            onChange={(e) => updateStep(s.key, { add: e.target.value } as Partial<UiStep>)}
                          />
                          <input
                            className="w-full rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1 text-[#e7e9ea]"
                            placeholder="Remove tags (comma-separated)"
                            value={s.remove}
                            onChange={(e) => updateStep(s.key, { remove: e.target.value } as Partial<UiStep>)}
                          />
                        </div>
                      ) : null}
                      {s.kind === "move_pipeline" ? (
                        <input
                          className="w-full rounded border border-white/[0.1] bg-[#0a0c10] px-2 py-1 text-sm text-[#e7e9ea]"
                          value={s.stage}
                          onChange={(e) => updateStep(s.key, { stage: e.target.value } as Partial<UiStep>)}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <h3 className="text-xs font-semibold uppercase text-sky-200/90">Follow-up preview (first SMS)</h3>
                <p className="mt-1 text-sm text-[#e7e9ea]">{firstSmsPreview || "—"}</p>
                <p className="mt-2 text-xs text-[#71767b]">
                  Sample: {PREVIEW.name}, {PREVIEW.address}, {PREVIEW.company}. Placeholders:{" "}
                  <code className="text-[#8b9199]">{"{{name}} {{phone}} {{address}} {{company}}"}</code>
                </p>
              </div>

              <details className="rounded-lg border border-white/[0.08] bg-[#0a0c10]/50 p-4">
                <summary className="cursor-pointer text-sm text-[#8b9199]">Advanced: JSON</summary>
                <pre className="mt-2 max-h-40 overflow-auto font-mono text-xs text-[#e7e9ea]">{stepsJson}</pre>
              </details>

              <button type="button" className="run-btn" disabled={busy} onClick={() => void saveWorkflow()}>
                {busy ? "Saving…" : "Save follow-up sequence"}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section
        className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-5 ring-1 ring-amber-500/15"
        aria-labelledby="sms-setup-heading"
      >
        <h2 id="sms-setup-heading" className="text-base font-semibold text-[#e7e9ea]">
          Telnyx setup (add your number when ready)
        </h2>
        <p className="mt-1 text-sm text-[#8b9199]">
          No phone number is required to design workflows. Finish these steps when you are ready to go live.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-[#e7e9ea]">
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#8b9199]">1.</span>
            <span>Buy or port a number in Telnyx and attach it to a Messaging profile.</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#8b9199]">2.</span>
            <span>Ask your host to set Worker secrets:</span>
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-sky-200/90">TELNYX_API_KEY</code>
            <span className="text-[#71767b]">and</span>
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-sky-200/90">TELNYX_FROM_NUMBER</code>
            <span className="text-[#71767b]">(E.164).</span>
          </li>
          <li className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#8b9199]">3.</span>
              <span>Set the Telnyx inbound webhook to:</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="block flex-1 break-all rounded-lg border border-white/10 bg-[#0a0c10] px-3 py-2 text-xs text-[#c4d0dc]">
                {webhookUrl}
              </code>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/25"
                onClick={() => void onCopy("Webhook URL", webhookUrl)}
              >
                Copy URL
              </button>
            </div>
            <p className="text-xs text-[#71767b]">
              If the host sets <code className="text-[#8b9199]">TELNYX_WEBHOOK_QUERY_SECRET</code>, append{" "}
              <code className="text-[#8b9199]">?token=…</code> to that URL in Telnyx.
            </p>
          </li>
          <li className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#8b9199]">4.</span>
              <span>Map your inbound number to this org in the database (one-time):</span>
            </div>
            {orgId ? (
              <>
                <p className="text-xs text-[#71767b]">
                  Your organization id (for D1 / Wrangler):{" "}
                  <code className="text-[#c4d0dc]">{orgId}</code>{" "}
                  <button
                    type="button"
                    className="text-sky-300 underline decoration-sky-500/40 hover:text-sky-200"
                    onClick={() => void onCopy("Organization id", orgId)}
                  >
                    Copy
                  </button>
                </p>
                {sqlExample ? (
                  <div className="flex flex-col gap-2">
                    <pre className="max-h-36 overflow-auto rounded-lg border border-white/10 bg-[#0a0c10] p-3 text-xs text-[#c4d0dc]">
                      {sqlExample}
                    </pre>
                    <button
                      type="button"
                      className="self-start rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#e7e9ea] hover:bg-white/[0.1]"
                      onClick={() => void onCopy("SQL example", sqlExample)}
                    >
                      Copy SQL
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-[#71767b]">Sign in with a company account to see your org id and SQL template.</p>
            )}
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              wTelnyx ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" : "bg-white/[0.06] text-[#8b9199] ring-1 ring-white/10"
            }`}
          >
            Worker Telnyx API: {wTelnyx ? "configured" : "not set"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              wFrom ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" : "bg-white/[0.06] text-[#8b9199] ring-1 ring-white/10"
            }`}
          >
            Default from number: {wFrom ? "set" : "not set"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              inbound.length > 0 ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" : "bg-amber-500/12 text-amber-100 ring-1 ring-amber-500/25"
            }`}
          >
            Inbound mapped: {inbound.length ? inbound.map((n) => n.phone_e164).join(", ") : "none yet"}
          </span>
        </div>
        {copyHint ? <p className="mt-3 text-xs text-sky-200/90">{copyHint}</p> : null}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-[#12141a]/80 p-4" aria-labelledby="sms-ai-heading">
        <h2 id="sms-ai-heading" className="text-sm font-semibold text-[#e7e9ea]">
          Draft a reply (AI)
        </h2>
        <p className="text-xs text-[#71767b]">Optional helper for one-off replies to an inbound text—not the same as an automated follow-up sequence above.</p>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-white/[0.12] bg-[#0a0c10] px-3 py-2 text-sm text-[#e7e9ea]"
          placeholder="Paste inbound SMS…"
          value={suggestIn}
          onChange={(e) => setSuggestIn(e.target.value)}
        />
        <button type="button" className="secondary-btn" disabled={busy || !suggestIn.trim()} onClick={() => void suggestReply()}>
          Suggest reply
        </button>
        {suggestOut ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {suggestOut}
          </p>
        ) : null}
      </section>
    </div>
  );
}
