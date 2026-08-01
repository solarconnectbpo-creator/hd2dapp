import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, Phone, Send } from "lucide-react";
import { Button } from "./ui/button";
import {
  createSmsContact,
  listSmsContacts,
  listSmsMessages,
  sendSmsMessage,
  startSmsWorkflow,
  telHref,
  type SmsContact,
  type SmsMessage,
} from "../lib/smsClient";

type WorkflowOpt = { id: string; name: string; enabled: number };

export function SmsInboxPanel({ workflows }: { workflows: WorkflowOpt[] }) {
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgBusy, setMsgBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compose, setCompose] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [enrollId, setEnrollId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const selected = contacts.find((c) => c.id === selectedId) || null;

  const refreshContacts = useCallback(async () => {
    setError(null);
    const rows = await listSmsContacts(150);
    setContacts(rows);
    if (selectedId && !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
    else if (!selectedId && rows[0]) setSelectedId(rows[0].id);
  }, [selectedId]);

  const refreshMessages = useCallback(async (contactId: string) => {
    const rows = await listSmsMessages(contactId);
    setMessages(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshContacts();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load contacts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshContacts]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshMessages(selectedId);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load messages.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshMessages]);

  async function onAddContact() {
    setError(null);
    setStatus(null);
    try {
      const c = await createSmsContact({ phone: newPhone, name: newName });
      setNewPhone("");
      setNewName("");
      await refreshContacts();
      setSelectedId(c.id);
      setStatus("Contact saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add contact.");
    }
  }

  async function onSend() {
    if (!selectedId || !compose.trim()) return;
    setMsgBusy(true);
    setError(null);
    setStatus(null);
    try {
      await sendSmsMessage({ text: compose.trim(), contactId: selectedId });
      setCompose("");
      await refreshMessages(selectedId);
      await refreshContacts();
      setStatus("Message sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setMsgBusy(false);
    }
  }

  async function onEnroll() {
    if (!selectedId || !enrollId) return;
    setError(null);
    setStatus(null);
    try {
      await startSmsWorkflow(enrollId, selectedId);
      setStatus("Follow-up sequence started.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sequence.");
    }
  }

  const enabledWorkflows = workflows.filter((w) => w.enabled);

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[var(--x-surface)] p-5" aria-labelledby="sms-inbox-heading">
      <h2 id="sms-inbox-heading" className="text-lg font-semibold text-[var(--x-text)]">
        Inbox — text &amp; call leads
      </h2>
      <p className="mt-1 text-sm text-[var(--x-muted)]">
        Message contacts, start a follow-up sequence, or tap Call to dial from your phone. Requires Telnyx/Twilio on the
        Worker and an active membership.
      </p>

      {loading ? <p className="mt-4 text-sm text-[var(--x-muted)]">Loading contacts…</p> : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {status ? (
        <div className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-100">
          {status}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--x-muted)]">Add lead</p>
            <input
              className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-[var(--x-text)]"
              placeholder="Phone (+1…)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-[var(--x-text)]"
              placeholder="Name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="button" size="sm" disabled={!newPhone.trim()} onClick={() => void onAddContact()}>
              Save contact
            </Button>
          </div>
          <ul className="max-h-[420px] space-y-1 overflow-y-auto">
            {contacts.length === 0 && !loading ? (
              <li className="text-sm text-[var(--x-muted)]">No contacts yet.</li>
            ) : null}
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selectedId === c.id
                      ? "bg-sky-500/25 text-white"
                      : "bg-white/[0.04] text-[var(--x-text)] hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="block font-medium">{c.name || c.phone_e164}</span>
                  <span className="block truncate text-xs text-[var(--x-muted)]">
                    {c.last_message_preview || c.phone_e164}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--x-muted)]">
            Bought leads? Open <Link className="text-sky-400 hover:underline" to="/leads">Buy leads</Link> → Purchased →
            Text / enroll.
          </p>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-lg border border-white/10 bg-black/20">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--x-text)]">{selected.name || "Lead"}</p>
                  <p className="truncate text-xs text-[var(--x-muted)]">{selected.phone_e164}</p>
                </div>
                {telHref(selected.phone_e164) ? (
                  <Button type="button" size="sm" variant="secondary" asChild>
                    <a href={telHref(selected.phone_e164)}>
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  </Button>
                ) : null}
                <select
                  className="max-w-[180px] rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-[var(--x-text)]"
                  value={enrollId}
                  onChange={(e) => setEnrollId(e.target.value)}
                >
                  <option value="">Enroll sequence…</option>
                  {enabledWorkflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="outline" disabled={!enrollId} onClick={() => void onEnroll()}>
                  Start
                </Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-[var(--x-muted)]">No messages yet — send the first text.</p>
                ) : (
                  messages.map((m) => {
                    const outbound = String(m.direction).toLowerCase().includes("out");
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          outbound
                            ? "ml-auto bg-sky-500/25 text-[var(--x-text)]"
                            : "mr-auto bg-white/[0.08] text-[var(--x-text)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className="mt-1 text-[10px] text-[var(--x-muted)]">
                          {outbound ? "You" : "Lead"} ·{" "}
                          {m.created_at ? new Date(m.created_at * 1000).toLocaleString() : ""}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <textarea
                  className="min-h-[72px] flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)]"
                  placeholder="Type a text…"
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                />
                <Button type="button" disabled={msgBusy || !compose.trim()} onClick={() => void onSend()}>
                  {msgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--x-muted)]">
              Select or add a contact to message.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
