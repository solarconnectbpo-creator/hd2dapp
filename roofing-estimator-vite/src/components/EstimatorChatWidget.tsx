import { useCallback, useRef, useState } from "react";
import { ImagePlus, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import { useMeasurementChatBridge } from "../context/MeasurementChatBridge";
import { fetchWithRetry } from "../lib/fetchWithRetry";
import { getHd2dApiBase, isHd2dApiConfigured } from "../lib/hd2dApiBase";
import { intelWorkerNotConfiguredMessage, intelWorkerUnreachableMessage } from "../lib/intelWorkerMessages";
import { buildGhlSummaryNote } from "../lib/mergeEstimatorPatches";
import { parseJsonResponse } from "../lib/readJsonResponse";
import { postSmsEvent } from "../lib/smsEmitEvent";
import { formatWorkerFetchFailure } from "../lib/workerApiError";

type ChatTurn = { role: "user" | "assistant"; content: string };

type CopilotMode = "general" | "estimate" | "damage" | "followup";

type LastPatches = {
  formPatch: Record<string, unknown>;
  proposalPatch: Record<string, unknown>;
};

const WELCOME: Record<CopilotMode, string> = {
  general:
    "I'm **HD2D Copilot** — **estimates**, **storm reports**, **photo analysis**, and **follow-up**. Ask anything about roofing, tap **Photo** to analyze roof/damage images (merges into the form when you **Apply**), or open **New Measurement** for live form merge → **Send to GHL**.",
  estimate:
    "**Estimate mode** — Share address, pitch, squares or plan area, waste, and lineal feet (ridge, eave, rake, valley, hip, flashing). I'll help build the takeoff and merge into **New Measurement**. Use the map for footprint and lines when you can.",
  damage:
    "**Damage / storm mode** — Describe what you see **or upload photos** (📷). Vision assist drafts damage types, severity, and notes — tap **Apply to form** to merge. I can't guarantee insurance outcomes.",
  followup:
    "**Follow-up mode** — I'll draft SMS/email snippets and next-step checklists. Add client name, phone, or email and I'll propose **proposal** fields. Sending uses **Send to GHL** and your SMS automation — I don't text by myself.",
};

const MODE_TABS: { id: CopilotMode; label: string }[] = [
  { id: "general", label: "All" },
  { id: "estimate", label: "Estimate" },
  { id: "damage", label: "Damage" },
  { id: "followup", label: "Follow-up" },
];

function splitName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function EstimatorChatWidget() {
  const { getBridge } = useMeasurementChatBridge();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CopilotMode>("general");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ghlBusy, setGhlBusy] = useState(false);
  const [lastProviderLine, setLastProviderLine] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>(() => [
    { role: "assistant", content: WELCOME.general },
  ]);
  const lastPatchesRef = useRef<LastPatches | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setCopilotMode = useCallback((next: CopilotMode) => {
    setMode(next);
    setMessages([{ role: "assistant", content: WELCOME[next] }]);
    lastPatchesRef.current = null;
    setLastProviderLine(null);
  }, []);

  const applyLastPatches = useCallback(() => {
    const bridge = getBridge();
    const p = lastPatchesRef.current;
    if (!bridge || !p) {
      toast.error("Open New Measurement to apply fields to the form.");
      return;
    }
    const { formPatch, proposalPatch } = p;
    if (!Object.keys(formPatch).length && !Object.keys(proposalPatch).length) {
      toast.message("Nothing to apply yet.");
      return;
    }
    bridge.applyPatches(formPatch, proposalPatch);
    toast.success("Applied suggested fields to the form.");
  }, [getBridge]);

  const sendToGhl = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) {
      toast.error("Open New Measurement and add an email or phone before sending to GHL.");
      return;
    }
    if (!isHd2dApiConfigured()) {
      toast.error(intelWorkerNotConfiguredMessage());
      return;
    }
    const { form, proposal } = bridge.getSnapshot();
    const email = proposal.clientEmail.trim();
    const phone = proposal.clientPhone.trim();
    if (!email && !phone) {
      toast.error("Add client email or phone on the proposal / client section first.");
      return;
    }
    const { firstName, lastName } = splitName(proposal.clientName);
    const summaryNote = buildGhlSummaryNote(form, proposal);
    setGhlBusy(true);
    try {
      const base = getHd2dApiBase();
      const res = await fetch(`${base}/api/ghl/submit-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          companyName: proposal.clientCompany.trim() || proposal.companyName.trim() || undefined,
          address1: form.address.trim() || undefined,
          state: form.stateCode.trim() || undefined,
          source: "HD2D Copilot",
          tags: ["estimator-chat", "hd2d-copilot"],
          summaryNote,
        }),
      });
      type GhlJson = { success?: boolean; error?: string; data?: { contactId?: string; noteWarning?: string } };
      const json = await parseJsonResponse<GhlJson>(res, "ghl-submit");
      if (!res.ok || json.success === false) {
        const err = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
        toast.error(err);
        return;
      }
      const data = json.data;
      if (data?.noteWarning) toast.message(data.noteWarning);
      toast.success(data?.contactId ? `Sent to GHL (contact ${data.contactId})` : "Sent to GHL.");
      if (phone) {
        const addressParts = [form.address?.trim(), form.stateCode?.trim()].filter(Boolean);
        const addressLine = addressParts.length ? addressParts.join(", ") : undefined;
        const smsRes = await postSmsEvent({
          event: "lead.created",
          phone,
          name: proposal.clientName.trim() || undefined,
          address: addressLine,
        });
        if (!smsRes.ok && smsRes.error && smsRes.error !== "not_signed_in") {
          toast.message(`SMS automation: ${smsRes.error}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GHL request failed");
    } finally {
      setGhlBusy(false);
    }
  }, [getBridge]);

  const readFileAsBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Could not read the image."));
      r.onload = () => {
        const dataUrl = String(r.result || "");
        const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        if (!m) {
          reject(new Error("Invalid image data."));
          return;
        }
        resolve({ mimeType: m[1] || file.type || "image/jpeg", base64: m[2] || "" });
      };
      r.readAsDataURL(file);
    });

  const onPhotoSelected = useCallback(
    async (file: File | null) => {
      if (!file || busy) return;
      if (!isHd2dApiConfigured()) {
        toast.error(intelWorkerNotConfiguredMessage());
        return;
      }
      const okType =
        /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!okType) {
        toast.error("Use a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large (max 5 MB).");
        return;
      }
      const bridge = getBridge();
      const label = `📷 ${file.name}`;
      const userMsg: ChatTurn = { role: "user", content: label };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);
      lastPatchesRef.current = null;
      try {
        const { base64, mimeType } = await readFileAsBase64(file);
        const base = getHd2dApiBase();
        const ctxParts = [
          `Copilot mode: ${mode}.`,
          bridge ? "User has New Measurement open — form merge available." : "",
          input.trim() ? `User note: ${input.trim()}` : "",
        ].filter(Boolean);
        const res = await fetchWithRetry(
          `${base}/api/ai/roof-damage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
              context: ctxParts.join(" "),
            }),
          },
          { retries: 1 },
        );
        const rawText = await res.text();
        const trimmed = rawText.trim();
        type RoofDamageJson = {
          success?: boolean;
          error?: string;
          data?: {
            damageTypes?: string[];
            severity?: number;
            recommendedAction?: string;
            notes?: string;
            summary?: string;
            model?: string;
          };
        };
        let json: RoofDamageJson;
        if (!trimmed) {
          throw new Error("Empty response from photo analysis.");
        }
        try {
          json = JSON.parse(trimmed) as RoofDamageJson;
        } catch {
          throw new Error(formatWorkerFetchFailure(res, rawText, "Photo analysis returned invalid JSON."));
        }
        if (!res.ok || json.success === false) {
          const err =
            typeof json.error === "string" && json.error.trim()
              ? json.error
              : formatWorkerFetchFailure(res, rawText, "Photo analysis failed");
          throw new Error(err);
        }
        const d = json.data;
        if (!d) throw new Error("No analysis data returned.");

        const damageTypes = Array.isArray(d.damageTypes) ? d.damageTypes : [];
        const severity =
          typeof d.severity === "number" && d.severity >= 1 && d.severity <= 5 ? Math.round(d.severity) : 3;
        const notes = typeof d.notes === "string" ? d.notes.trim() : "";
        const summary = typeof d.summary === "string" ? d.summary.trim() : "";
        const action = typeof d.recommendedAction === "string" ? d.recommendedAction.trim() : "";
        const narrative = [
          `**Photo analysis** (${typeof d.model === "string" ? d.model : "gpt-4o-mini"})`,
          summary ? `**Summary:** ${summary}` : "",
          damageTypes.length ? `**Damage tags:** ${damageTypes.join(", ")}` : "**Damage tags:** (none or unclear)",
          `**Severity (1–5):** ${severity}`,
          action ? `**Suggested next step:** ${action}` : "",
          notes ? `**Notes:** ${notes}` : "",
          "",
          "_Verify on site — photos are assists only, not a claim guarantee._",
        ]
          .filter(Boolean)
          .join("\n\n");

        const propertyRecordNotes = [
          `AI photo — ${file.name}`,
          summary,
          notes,
          `Damage: ${damageTypes.join(", ") || "unclear"}. Severity ${severity}. ${action ? `Action: ${action}.` : ""}`,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 8000);

        const formPatch: Record<string, unknown> = {
          damageTypes,
          severity,
          propertyRecordNotes,
        };
        if (summary) {
          formPatch.carrierScopeText = `Photo review: ${summary}`.slice(0, 8000);
        }
        lastPatchesRef.current = { formPatch, proposalPatch: {} };
        setLastProviderLine(typeof d.model === "string" ? `${d.model} · roof-damage` : "roof-damage (OpenAI)");
        setMessages((prev) => [...prev, { role: "assistant", content: narrative }]);
        toast.message("Photo analyzed — tap Apply to form to merge damage fields.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Photo analysis failed";
        setMessages((prev) => [...prev, { role: "assistant", content: `Sorry — ${msg}` }]);
        toast.error(msg);
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [busy, getBridge, input, mode],
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!isHd2dApiConfigured()) {
      toast.error(intelWorkerNotConfiguredMessage());
      return;
    }
    const bridge = getBridge();
    const userMsg: ChatTurn = { role: "user", content: text };
    setInput("");
    setBusy(true);
    lastPatchesRef.current = null;
    const threadForApi: ChatTurn[] = [...messages, userMsg];
    setMessages(threadForApi);
    try {
      const base = getHd2dApiBase();
      const res = await fetchWithRetry(
        `${base}/api/ai/estimator-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            mode,
            messages: threadForApi.map(({ role, content }) => ({ role, content })),
            formSnapshot: bridge?.getSnapshot().form ?? {},
            proposalSnapshot: bridge?.getSnapshot().proposal ?? {},
          }),
        },
        { retries: 1 },
      );
      type EstimatorChatJson = {
        success?: boolean;
        error?: string;
        data?: {
          assistantMessage?: string;
          formPatch?: Record<string, unknown>;
          proposalPatch?: Record<string, unknown>;
          model?: string;
          provider?: string;
        };
      };
      const rawText = await res.text();
      const trimmed = rawText.trim();
      let json: EstimatorChatJson;
      if (!trimmed) {
        const msg =
          res.status === 502 || res.status === 503 || res.status === 504
            ? "The server was temporarily unavailable. Please try again."
            : `estimator-chat: empty response (${res.status}).`;
        setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${msg}` }]);
        toast.error(msg);
        return;
      }
      try {
        json = JSON.parse(trimmed) as EstimatorChatJson;
      } catch {
        const msg = formatWorkerFetchFailure(res, rawText, "Copilot returned an invalid response.");
        setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${msg}` }]);
        toast.error(msg);
        return;
      }
      if (!res.ok || json.success === false) {
        const err =
          typeof json.error === "string" && json.error.trim()
            ? json.error
            : formatWorkerFetchFailure(res, rawText, "Copilot request failed");
        setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${err}` }]);
        if (res.status >= 500) {
          toast.error("Copilot could not complete this request. Try again in a moment.");
        }
        return;
      }
      const data = json.data;
      const assistantMessage = data?.assistantMessage?.trim() || "No reply.";
      const formPatch = data?.formPatch && typeof data.formPatch === "object" ? data.formPatch : {};
      const proposalPatch =
        data?.proposalPatch && typeof data.proposalPatch === "object" ? data.proposalPatch : {};
      const model = typeof data?.model === "string" ? data.model.trim() : "";
      const provider = typeof data?.provider === "string" ? data.provider.trim() : "";
      setLastProviderLine(
        model && provider ? `${model} · ${provider}` : model || provider ? model || provider : null,
      );
      lastPatchesRef.current = { formPatch, proposalPatch };
      setMessages((m) => [...m, { role: "assistant", content: assistantMessage }]);
      const hasPatches = Object.keys(formPatch).length > 0 || Object.keys(proposalPatch).length > 0;
      if (hasPatches) {
        toast.message("Suggested form updates — tap Apply to form to merge.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${msg}` }]);
      if (e instanceof TypeError) {
        toast.error(intelWorkerUnreachableMessage());
      }
    } finally {
      setBusy(false);
    }
  }, [busy, input, getBridge, mode, messages]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close HD2D Copilot" : "Open HD2D Copilot"}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
          "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))]",
          "bg-[#1d9bf0] text-white hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
        )}
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <Sparkles className="h-6 w-6" aria-hidden />}
      </button>

      {open ? (
        <div
          className={cn(
            "fixed z-[60] flex w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141a]/95 shadow-2xl backdrop-blur-md",
            "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] right-[max(0.75rem,env(safe-area-inset-right,0px))] sm:right-[max(1.25rem,env(safe-area-inset-right,0px))]",
          )}
          role="dialog"
          aria-label="HD2D Copilot"
        >
          <div className="border-b border-white/[0.08] px-3 py-2.5 sm:px-4">
            <p className="text-sm font-semibold text-[#e7e9ea]">HD2D Copilot</p>
            <p className="text-xs text-[#8b9199]">
              Chat + photo analysis · estimates & reports · Apply → GHL
            </p>
            {lastProviderLine ? (
              <p className="mt-1 text-[10px] leading-snug text-[#5c636b]" aria-live="polite">
                {lastProviderLine}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {MODE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setCopilotMode(t.id)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-50",
                    mode === t.id
                      ? "bg-[#1d9bf0] text-white"
                      : "bg-white/[0.06] text-[#8b9199] hover:bg-white/[0.1] hover:text-[#e7e9ea]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13px] leading-snug",
                  m.role === "user" ? "ml-3 bg-[#1d9bf0]/20 text-[#e7e9ea]" : "mr-1 bg-white/[0.06] text-[#e7e9ea]",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.08] px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-white/[0.08] px-2 py-1.5 text-xs font-medium text-[#e7e9ea] hover:bg-white/[0.12]"
              onClick={() => applyLastPatches()}
            >
              Apply to form
            </button>
            <button
              type="button"
              disabled={ghlBusy}
              className="rounded-lg bg-emerald-600/90 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              onClick={() => void sendToGhl()}
            >
              {ghlBusy ? "Sending…" : "Send to GHL"}
            </button>
          </div>
          <div className="flex gap-2 border-t border-white/[0.08] p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void onPhotoSelected(f);
              }}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask Copilot…"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-[#0a0b0e] px-3 py-2 text-base text-[#e7e9ea] placeholder:text-[#5c636b] sm:text-sm"
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.06] text-[#e7e9ea] hover:bg-white/[0.1] disabled:opacity-40"
              aria-label="Analyze roof photo"
              title="Analyze roof photo (JPEG, PNG, WebP)"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void sendMessage()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1d9bf0] text-white hover:bg-sky-500 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
