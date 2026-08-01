import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Loader2, Phone, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { parseLeadPackagesFromEnv } from "../lib/leadPackages";
import {
  createLeadsCheckoutSession,
  getOrgCrmDelivery,
  listMarketplaceAppointments,
  listPurchasedAppointments,
  pushPurchasedLeadsToCrm,
  saveOrgCrmDelivery,
  sendPurchasedLeadToSms,
  type MarketplaceAppointment,
} from "../lib/leadsMarketplaceClient";
import { telHref } from "../lib/smsClient";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";

function checkoutWorkerHint(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("503") ||
    m.includes("not configured") ||
    m.includes("stripe") ||
    m.includes("public_origin") ||
    m.includes("unknown or disallowed price")
  ) {
    return " On the Cloudflare Worker, set STRIPE_SECRET_KEY, LEADS_STRIPE_PRICE_IDS, and APP_PUBLIC_ORIGIN.";
  }
  return "";
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function LeadMarketplace() {
  const { session, user } = useAuth();
  const token = session?.token ?? "";
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const packages = parseLeadPackagesFromEnv();
  const [tab, setTab] = useState<"browse" | "packages" | "purchased" | "crm">("browse");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [available, setAvailable] = useState<MarketplaceAppointment[]>([]);
  const [purchased, setPurchased] = useState<MarketplaceAppointment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [loadingPurchased, setLoadingPurchased] = useState(false);
  const [singlePriceId, setSinglePriceId] = useState("");
  const [crmWebhook, setCrmWebhook] = useState("");
  const [crmGhlLoc, setCrmGhlLoc] = useState("");
  const [crmGhlToken, setCrmGhlToken] = useState("");
  const [crmTokenSet, setCrmTokenSet] = useState(false);
  const [crmRole, setCrmRole] = useState("");

  const canPurchase = user?.user_type === "company" || user?.user_type === "admin";

  const defaultPriceId = useMemo(() => {
    const fromEnv = packages[0]?.stripePriceId || "";
    return singlePriceId || fromEnv;
  }, [packages, singlePriceId]);

  const loadBrowse = useCallback(async () => {
    if (!token) return;
    setLoadingBrowse(true);
    setError("");
    try {
      const rows = await listMarketplaceAppointments(token, {
        state: stateFilter.trim() || undefined,
        limit: 100,
      });
      setAvailable(rows.filter((r) => !r.owned && r.status !== "sold"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load marketplace.");
    } finally {
      setLoadingBrowse(false);
    }
  }, [token, stateFilter]);

  const loadPurchased = useCallback(async () => {
    if (!token) return;
    setLoadingPurchased(true);
    setError("");
    try {
      setPurchased(await listPurchasedAppointments(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load purchases.");
    } finally {
      setLoadingPurchased(false);
    }
  }, [token]);

  const loadCrm = useCallback(async () => {
    if (!token) return;
    try {
      const d = await getOrgCrmDelivery(token);
      setCrmWebhook(d.crmWebhookUrl);
      setCrmGhlLoc(d.ghlLocationId);
      setCrmTokenSet(d.ghlTokenSet);
      setCrmRole(d.role);
    } catch {
      /* org membership optional for admins */
    }
  }, [token]);

  useEffect(() => {
    if (tab === "browse") void loadBrowse();
    if (tab === "purchased") void loadPurchased();
    if (tab === "crm") void loadCrm();
  }, [tab, loadBrowse, loadPurchased, loadCrm]);

  useEffect(() => {
    if (packages[0]?.stripePriceId) setSinglePriceId(packages[0].stripePriceId);
  }, [packages]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCheckoutAppointments = async () => {
    if (!token || !canPurchase || !defaultPriceId || selected.size === 0) return;
    setBusyId("appointments");
    setError("");
    try {
      const url = await createLeadsCheckoutSession(token, defaultPriceId, [...selected]);
      window.location.href = url;
    } catch (e) {
      const base = e instanceof Error ? e.message : "Could not start checkout.";
      setError(base + checkoutWorkerHint(base));
    } finally {
      setBusyId(null);
    }
  };

  const onPurchasePackage = async (stripePriceId: string, key: string) => {
    if (!token || !canPurchase) return;
    setBusyId(key);
    setError("");
    try {
      const url = await createLeadsCheckoutSession(token, stripePriceId);
      window.location.href = url;
    } catch (e) {
      const base = e instanceof Error ? e.message : "Could not start checkout.";
      setError(base + checkoutWorkerHint(base));
    } finally {
      setBusyId(null);
    }
  };

  const onPushCrm = async (ids: string[]) => {
    if (!token || ids.length === 0) return;
    setBusyId("crm");
    setError("");
    setStatus("");
    try {
      const r = await pushPurchasedLeadsToCrm(token, ids);
      setStatus(`Pushed ${r.pushed ?? 0} lead(s) to CRM.`);
      if (r.results?.some((x) => !x.ok)) {
        setError(r.results.find((x) => !x.ok)?.error || "Some CRM pushes failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "CRM push failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onToSms = async (id: string) => {
    if (!token) return;
    setBusyId(`sms-${id}`);
    setError("");
    setStatus("");
    try {
      const r = await sendPurchasedLeadToSms(token, id, true);
      setStatus(`Lead in SMS inbox${r.started ? ` · started ${r.started} sequence(s)` : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send to SMS.");
    } finally {
      setBusyId(null);
    }
  };

  const onSaveCrm = async () => {
    if (!token) return;
    setBusyId("crm-save");
    setError("");
    setStatus("");
    try {
      await saveOrgCrmDelivery(token, {
        crmWebhookUrl: crmWebhook,
        ghlLocationId: crmGhlLoc,
        ...(crmGhlToken.trim() ? { ghlApiToken: crmGhlToken.trim() } : {}),
      });
      setCrmGhlToken("");
      setStatus("CRM delivery settings saved.");
      await loadCrm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save CRM settings.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="hd2d-page-shell max-w-5xl">
      <div className="mb-6">
        <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-sky-400">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Lead marketplace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--x-text)]">Buy leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#8b9199]">
          Browse appointment inventory, check out with Stripe, then call, text, or push leads into your CRM.
        </p>
      </div>

      {checkout === "success" ? (
        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm" role="status">
          <p className="font-medium text-[var(--x-text)]">Checkout completed.</p>
          <p className="mt-1 text-[#8b9199]">
            Open the Purchased tab for contact details. CRM delivery runs automatically when configured.
          </p>
          {checkoutSessionId ? (
            <p className="mt-2 break-all font-mono text-xs text-[var(--x-text)]">Session: {checkoutSessionId}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">{error}</div>
      ) : null}
      {status ? (
        <div className="mb-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-100">
          {status}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["browse", "Browse"],
            ["packages", "Packages"],
            ["purchased", "Purchased"],
            ["crm", "CRM delivery"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === id ? "bg-sky-500 text-white" : "bg-white/[0.06] text-[var(--x-text)] hover:bg-white/[0.1]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!canPurchase ? (
        <p className="text-sm text-[var(--x-muted)]">Company accounts can purchase leads. Sales reps: ask your org owner.</p>
      ) : null}

      {tab === "browse" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-[var(--x-muted)]">State filter</span>
              <input
                className="w-24 rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-[var(--x-text)]"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
                placeholder="MO"
                maxLength={2}
              />
            </label>
            <label className="min-w-[220px] flex-1 text-sm">
              <span className="mb-1 block text-xs text-[var(--x-muted)]">Stripe price for checkout</span>
              <select
                className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-[var(--x-text)]"
                value={defaultPriceId}
                onChange={(e) => setSinglePriceId(e.target.value)}
              >
                {packages.map((p) => (
                  <option key={p.key} value={p.stripePriceId}>
                    {p.title} ({p.stripePriceId})
                  </option>
                ))}
                {!packages.length ? <option value="">Set VITE_LEAD_PACKAGES_JSON / enter price below</option> : null}
              </select>
            </label>
            {!packages.length ? (
              <label className="min-w-[200px] flex-1 text-sm">
                <span className="mb-1 block text-xs text-[var(--x-muted)]">Price id</span>
                <input
                  className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 font-mono text-sm text-[var(--x-text)]"
                  value={singlePriceId}
                  onChange={(e) => setSinglePriceId(e.target.value)}
                  placeholder="price_…"
                />
              </label>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadBrowse()}>
              Refresh
            </Button>
            <Button
              type="button"
              disabled={!canPurchase || !token || selected.size === 0 || !defaultPriceId || busyId === "appointments"}
              onClick={() => void onCheckoutAppointments()}
            >
              {busyId === "appointments" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Checkout ({selected.size})
            </Button>
          </div>
          {loadingBrowse ? <p className="text-sm text-[var(--x-muted)]">Loading inventory…</p> : null}
          {!loadingBrowse && available.length === 0 ? (
            <Card className={cardChrome}>
              <CardContent className="py-8 text-center text-sm text-[var(--x-muted)]">
                No open appointments right now. Use Packages for prepaid packages, or ask your team to stock inventory in
                D1 <code className="text-xs">marketplace_appointments</code>.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {available.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[var(--x-surface)] px-4 py-3"
                >
                  <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--x-text)]">
                      {[a.city, a.state, a.zip].filter(Boolean).join(", ") || "Appointment"}
                    </p>
                    <p className="text-xs text-[var(--x-muted)]">
                      {a.scheduledAt ? new Date(a.scheduledAt * 1000).toLocaleString() : "Schedule TBD"} ·{" "}
                      {money(a.priceUsd)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "packages" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.length === 0 ? (
            <Card className={cardChrome}>
              <CardHeader>
                <CardTitle className="text-lg">No packages configured</CardTitle>
                <CardDescription>
                  Set <code className="text-xs">VITE_LEAD_PACKAGES_JSON</code> on the SPA build, matching Worker{" "}
                  <code className="text-xs">LEADS_STRIPE_PRICE_IDS</code>.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            packages.map((p) => (
              <Card key={p.key} className={cardChrome}>
                <CardHeader>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <CardDescription>{p.description || "Lead package via Stripe Checkout."}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    disabled={!canPurchase || !token || busyId === p.key}
                    onClick={() => void onPurchasePackage(p.stripePriceId, p.key)}
                  >
                    {busyId === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Buy package
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "purchased" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadPurchased()}>
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!purchased.length || busyId === "crm"}
              onClick={() => void onPushCrm(purchased.map((p) => p.id))}
            >
              {busyId === "crm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Push all to CRM
            </Button>
            <Link to="/sms-automation" className="self-center text-sm text-sky-400 hover:underline">
              Open SMS inbox
            </Link>
          </div>
          {loadingPurchased ? <p className="text-sm text-[var(--x-muted)]">Loading…</p> : null}
          {!loadingPurchased && purchased.length === 0 ? (
            <p className="text-sm text-[var(--x-muted)]">No purchased appointments yet.</p>
          ) : (
            <ul className="space-y-3">
              {purchased.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/10 bg-[var(--x-surface)] px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--x-text)]">{a.homeownerName || "Homeowner"}</p>
                      <p className="text-sm text-[var(--x-muted)]">{a.address || [a.city, a.state, a.zip].filter(Boolean).join(", ")}</p>
                      <p className="mt-1 text-sm text-[var(--x-text)]">
                        {a.phone || "No phone"} {a.email ? `· ${a.email}` : ""}
                      </p>
                      {a.notes ? <p className="mt-1 text-xs text-[var(--x-muted)] whitespace-pre-wrap">{a.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.phone && telHref(a.phone) ? (
                        <Button type="button" size="sm" variant="secondary" asChild>
                          <a href={telHref(a.phone)}>
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!a.phone || busyId === `sms-${a.id}`}
                        onClick={() => void onToSms(a.id)}
                      >
                        Text / enroll
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === "crm"}
                        onClick={() => void onPushCrm([a.id])}
                      >
                        Send to CRM
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "crm" ? (
        <Card className={cardChrome}>
          <CardHeader>
            <CardTitle className="text-lg">CRM delivery</CardTitle>
            <CardDescription>
              When you buy appointments, we push contacts to your webhook and/or GoHighLevel. Org owners/admins can edit
              these settings{crmRole ? ` (your role: ${crmRole})` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--x-muted)]">Webhook URL (https)</span>
              <input
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)]"
                value={crmWebhook}
                onChange={(e) => setCrmWebhook(e.target.value)}
                placeholder="https://your-crm.example/hooks/hd2d"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--x-muted)]">GHL location id</span>
              <input
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)]"
                value={crmGhlLoc}
                onChange={(e) => setCrmGhlLoc(e.target.value)}
                placeholder="Location id"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--x-muted)]">
                GHL Private Integration token {crmTokenSet ? "(saved — paste to replace)" : ""}
              </span>
              <input
                type="password"
                autoComplete="off"
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)]"
                value={crmGhlToken}
                onChange={(e) => setCrmGhlToken(e.target.value)}
                placeholder={crmTokenSet ? "••••••••" : "pit-…"}
              />
            </label>
            <Button type="button" disabled={busyId === "crm-save"} onClick={() => void onSaveCrm()}>
              {busyId === "crm-save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save CRM settings
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
