import { useState } from "react";
import { useSearchParams } from "react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { parseLeadPackagesFromEnv } from "../lib/leadPackages";
import { createLeadsCheckoutSession } from "../lib/leadsCheckoutClient";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";
const codeChip = "rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#e7e9ea]";

function checkoutWorkerHint(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("503") ||
    m.includes("not configured") ||
    m.includes("stripe") ||
    m.includes("public_origin") ||
    m.includes("unknown or disallowed price")
  ) {
    return " On the Cloudflare Worker, set secrets/vars: STRIPE_SECRET_KEY, LEADS_STRIPE_PRICE_IDS (comma-separated Stripe Price ids matching your packages), and APP_PUBLIC_ORIGIN to your live SPA origin (https://your-domain.com, no trailing slash).";
  }
  return "";
}

export function LeadMarketplace() {
  const { session, user } = useAuth();
  const token = session?.token ?? "";
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const packages = parseLeadPackagesFromEnv();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canPurchase = user?.user_type === "company" || user?.user_type === "admin";

  const onPurchase = async (stripePriceId: string, key: string) => {
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

  return (
    <div className="hd2d-page-shell max-w-4xl">
      <div className="mb-8">
        <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-sky-400">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Lead marketplace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--x-text)]">Buy leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#8b9199]">
          Purchase lead packages via Stripe Checkout. Fulfillment (file delivery, CRM access) is handled by your team after
          payment — configure webhooks on the Worker when you are ready to automate.
        </p>
      </div>

      {checkout === "success" ? (
        <div
          className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-100"
          role="status"
        >
          <p className="font-medium text-[var(--x-text)]">Checkout completed.</p>
          <p className="mt-1 text-[#8b9199]">
            Your team can match this payment to Stripe using the session id below. Fulfillment (file delivery, CRM) runs on
            your process until Worker webhooks are enabled.
          </p>
          {checkoutSessionId ? (
            <p className="mt-2 break-all font-mono text-xs text-[var(--x-text)]" title="Stripe Checkout session id">
              Session: {checkoutSessionId}
            </p>
          ) : null}
          <p className="mt-2 text-[#8b9199]">If you do not receive leads within the promised window, contact support.</p>
        </div>
      ) : null}
      {checkout === "cancel" ? (
        <div
          className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="status"
        >
          Checkout was canceled. You can try again anytime.
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100" role="alert">
          {error}
        </div>
      ) : null}

      {!canPurchase ? (
        <p className="mb-6 text-sm text-[#8b9199]">
          Purchases are limited to <strong className="font-medium text-[var(--x-text)]">company</strong> and{" "}
          <strong className="font-medium text-[var(--x-text)]">admin</strong> accounts. Ask your org admin to upgrade your role or
          complete the purchase.
        </p>
      ) : null}

      {packages.length === 0 ? (
        <Card className={cardChrome}>
          <CardHeader>
            <CardTitle className="text-[var(--x-text)]">No packages configured</CardTitle>
            <CardDescription className="text-[#8b9199]">
              Follow this checklist so the marketplace and checkout both work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-[#8b9199]">
              <li>
                <span className="text-[var(--x-text)]">Frontend (Vite):</span> set <code className={codeChip}>VITE_LEAD_PACKAGES_JSON</code>{" "}
                in <code className={codeChip}>.env</code> — see <code className={codeChip}>.env.example</code>. Each package
                needs <code className={codeChip}>key</code>, <code className={codeChip}>title</code>,{" "}
                <code className={codeChip}>description</code>, <code className={codeChip}>stripePriceId</code>, and optional{" "}
                <code className={codeChip}>priceLabel</code>.
              </li>
              <li>
                <span className="text-[var(--x-text)]">Worker allowlist:</span> add every <code className={codeChip}>stripePriceId</code> to{" "}
                <code className={codeChip}>LEADS_STRIPE_PRICE_IDS</code> (comma-separated) on the Worker.
              </li>
              <li>
                <span className="text-[var(--x-text)]">Stripe:</span> set <code className={codeChip}>STRIPE_SECRET_KEY</code> as a Worker
                secret.
              </li>
              <li>
                <span className="text-[var(--x-text)]">Redirects:</span> set <code className={codeChip}>APP_PUBLIC_ORIGIN</code> on the
                Worker to your live site origin (must match where users open the app — e.g.{" "}
                <code className={codeChip}>https://your-domain.com</code>, no trailing slash) so Stripe returns to{" "}
                <code className={codeChip}>/leads?checkout=success</code>.
              </li>
            </ol>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.key} className={`flex h-full flex-col ${cardChrome}`}>
              <CardHeader>
                <CardTitle className="text-lg text-[var(--x-text)]">{pkg.title}</CardTitle>
                {pkg.priceLabel ? (
                  <CardDescription className="text-base font-semibold text-[var(--x-text)]">{pkg.priceLabel}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-4">
                <p className="text-sm leading-relaxed text-[#8b9199]">{pkg.description}</p>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!canPurchase || !token || busyId !== null}
                  onClick={() => void onPurchase(pkg.stripePriceId, pkg.key)}
                >
                  {busyId === pkg.key ? "Redirecting…" : "Purchase"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
