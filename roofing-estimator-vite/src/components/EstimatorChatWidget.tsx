import { useCallback, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import { useMeasurementChatBridge } from "../context/MeasurementChatBridge";
import { getHd2dApiBase, isHd2dApiConfigured } from "../lib/hd2dApiBase";
import { buildGhlSummaryNote } from "../lib/mergeEstimatorPatches";
import { parseJsonResponse } from "../lib/readJsonResponse";
import { postSmsEvent } from "../lib/smsEmitEvent";

type ChatTurn = { role: "user" | "assistant"; content: string };

type LastPatches = {
  formPatch: Record<string, unknown>;
  proposalPatch: Record<string, unknown>;
};

function splitName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function EstimatorChatWidget() {
  const { getBridge } = useMeasurementChatBridge();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ghlBusy, setGhlBusy] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>(() => [
    {
      role: "assistant",
      content:
        "Hi — I can help fill the measurement form from our chat. Tell me the property address, your contact info, and any roof details you have. When I suggest fields, tap Apply to form, then Send to GHL when ready.",
    },
  ]);
  const lastPatchesRef = useRef<LastPatches | null>(null);

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
      toast.error("Intel Worker base URL is not configured (VITE_INTEL_API_BASE).");
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
          source: "Roofing estimator chat",
          tags: ["estimator-chat"],
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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!isHd2dApiConfigured()) {
      toast.error("Configure VITE_INTEL_API_BASE or use dev with the Intel Worker.");
      return;
    }
    const bridge = getBridge();
    const userMsg: ChatTurn = { role: "user", content: text };
    setInput("");
    setBusy(true);
    lastPatchesRef.current = null;
    let threadForApi: ChatTurn[] = [];
    setMessages((prev) => {
      threadForApi = [...prev, userMsg];
      return threadForApi;
    });
    try {
      const base = getHd2dApiBase();
      const res = await fetch(`${base}/api/ai/estimator-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          messages: threadForApi.map(({ role, content }) => ({ role, content })),
          formSnapshot: bridge?.getSnapshot().form ?? {},
          proposalSnapshot: bridge?.getSnapshot().proposal ?? {},
        }),
      });
      type EstimatorChatJson = {
        success?: boolean;
        error?: string;
        data?: {
          assistantMessage?: string;
          formPatch?: Record<string, unknown>;
          proposalPatch?: Record<string, unknown>;
        };
      };
      const json = await parseJsonResponse<EstimatorChatJson>(res, "estimator-chat");
      if (!res.ok || json.success === false) {
        const err = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
        setMessages((m) => [...m, { role: "assistant", content: `Sorry — ${err}` }]);
        return;
      }
      const data = json.data;
      const assistantMessage = data?.assistantMessage?.trim() || "No reply.";
      const formPatch = data?.formPatch && typeof data.formPatch === "object" ? data.formPatch : {};
      const proposalPatch =
        data?.proposalPatch && typeof data.proposalPatch === "object" ? data.proposalPatch : {};
      lastPatchesRef.current = { formPatch, proposalPatch };
      setMessages((m) => [...m, { role: "assistant", content: assistantMessage }]);
      const hasPatches = Object.keys(formPatch).length > 0 || Object.keys(proposalPatch).length > 0;
      if (hasPatches) {
        toast.message("Suggested form updates — tap Apply to form to merge.");
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Request failed" },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, input, getBridge]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close estimator chat" : "Open estimator chat"}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
          "bg-[#1d9bf0] text-white hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
        )}
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
      </button>

      {open ? (
        <div
          className={cn(
            "fixed bottom-24 right-5 z-[60] flex w-[min(100vw-2.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141a]/95 shadow-2xl backdrop-blur-md",
          )}
          role="dialog"
          aria-label="Estimator assistant"
        >
          <div className="border-b border-white/[0.08] px-4 py-3">
            <p className="text-sm font-semibold text-[#e7e9ea]">Estimator assistant</p>
            <p className="text-xs text-[#8b9199]">Fills the measurement form · Sends to GHL</p>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2",
                  m.role === "user" ? "ml-4 bg-[#1d9bf0]/20 text-[#e7e9ea]" : "mr-2 bg-white/[0.06] text-[#e7e9ea]",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.08] px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-white/[0.08] px-2 py-1 text-xs font-medium text-[#e7e9ea] hover:bg-white/[0.12]"
              onClick={() => applyLastPatches()}
            >
              Apply to form
            </button>
            <button
              type="button"
              disabled={ghlBusy}
              className="rounded-lg bg-emerald-600/90 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              onClick={() => void sendToGhl()}
            >
              {ghlBusy ? "Sending…" : "Send to GHL"}
            </button>
          </div>
          <div className="flex gap-2 border-t border-white/[0.08] p-3">
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
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-[#0a0b0e] px-3 py-2 text-sm text-[#e7e9ea] placeholder:text-[#5c636b]"
              disabled={busy}
            />
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
