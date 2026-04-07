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
      const [wfRes, trRes] = await Promise.all([
        fetch(`${base}/api/sms/workflows`, { headers: authHeaders() }),
        fetch(`${base}/api/sms/triggers`, { headers: authHeaders() }),
      ]);
      const wfData = await readJsonResponseBody<{ success?: boolean; workflows?: WorkflowRow[]; error?: string }>(wfRes);
      if (!wfRes.ok || !wfData.success) {
        setError(wfData.error || `Failed to load (${wfRes.status})`);
        setWorkflows([]);
        return;
      }
      setWorkflows(wfData.workflows ?? []);
      const trData = await readJsonResponseBody<{ success?: boolean; triggers?: string[] }>(trRes);
      if (trRes.ok && trData.success && trData.triggers?.length) {
        setCanonicalTriggers(trData.triggers);
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
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">SMS automation</h1>
        <p className="text-sm text-[#71767b]">Use a company admin account to manage workflows for your organization.</p>
      </div>
    );
  }

  return (
    <div className="hd2d-page-shell max-w-3xl space-y-8">
      <Seo title="SMS automation — HD2D Closers" description="Edit SMS follow-up workflows and AI reply suggestions." path="/sms-automation" />
      <div>
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">SMS automation</h1>
        <p className="text-sm text-[#71767b] mt-2">
          Workflows run on the server (Telnyx or Twilio). Map your inbound number to an org in{" "}
          <code className="text-xs text-[#8b9199]">sms_org_numbers</code> (D1). Use{" "}
          <code className="text-xs text-[#8b9199]">POST /api/sms/events</code> from your app to fire triggers.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[#8b9199]">Loading workflows…</p>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#e7e9ea]">Workflows</h2>
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
              <label className="block text-sm font-medium text-[#e7e9ea]">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#12141a] px-3 py-2 text-sm text-[#e7e9ea]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e7e9ea]">Trigger</label>
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
                <h2 className="text-sm font-semibold text-[#e7e9ea]">Steps</h2>
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
              <h3 className="text-xs font-semibold uppercase text-sky-200/90">Preview (first SMS)</h3>
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
              {busy ? "Saving…" : "Save workflow"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#12141a]/80 p-4">
        <h2 className="text-sm font-semibold text-[#e7e9ea]">AI suggested reply</h2>
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
      </div>
    </div>
  );
}
