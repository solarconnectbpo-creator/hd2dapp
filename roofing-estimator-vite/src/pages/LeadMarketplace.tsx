import { useState } from "react";
import { useSearchParams } from "react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { parseLeadPackagesFromEnv } from "../lib/leadPackages";
import { createLeadsCheckoutSession } from "../lib/leadsCheckoutClient";

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
      setError(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="hd2d-page-shell max-w-4xl text-black">
      <div className="mb-8">
        <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Lead marketplace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Buy leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-black/70">
          Purchase lead packages via Stripe Checkout. Fulfillment (file delivery, CRM access) is handled by your team after
          payment — configure webhooks on the Worker when you are ready to automate.
        </p>
      </div>

      {checkout === "success" ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900" role="status">
          <p className="font-medium">Checkout completed.</p>
          <p className="mt-1 text-green-900/90">
            Your team can match this payment to Stripe using the session id below. Fulfillment (file delivery, CRM) runs on your
            process until Worker webhooks are enabled.
          </p>
          {checkoutSessionId ? (
            <p className="mt-2 font-mono text-xs text-green-950/80 break-all" title="Stripe Checkout session id">
              Session: {checkoutSessionId}
            </p>
          ) : null}
          <p className="mt-2 text-green-900/90">If you do not receive leads within the promised window, contact support.</p>
        </div>
      ) : null}
      {checkout === "cancel" ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          Checkout was canceled. You can try again anytime.
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </div>
      ) : null}

      {!canPurchase ? (
        <p className="mb-6 text-sm text-black/80">
          Purchases are limited to <strong className="font-medium">company</strong> and <strong className="font-medium">admin</strong>{" "}
          accounts. Ask your org admin to upgrade your role or complete the purchase.
        </p>
      ) : null}

      {packages.length === 0 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>No packages configured</CardTitle>
            <CardDescription>
              Set <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">VITE_LEAD_PACKAGES_JSON</code> and matching{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">LEADS_STRIPE_PRICE_IDS</code> on the Worker (see{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.example</code>).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.key} className="flex h-full flex-col border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">{pkg.title}</CardTitle>
                {pkg.priceLabel ? (
                  <CardDescription className="text-base font-semibold text-black">{pkg.priceLabel}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-4">
                <p className="text-sm leading-relaxed text-black/75">{pkg.description}</p>
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
