import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { fetchAuthCapabilities, startMembershipCheckout } from "../lib/authClient";

export function AccountPending() {
  const { user, session, access, accessGranted, refreshSession } = useAuth();
  const token = session?.token ?? "";
  const [params] = useSearchParams();
  const [caps, setCaps] = useState<{ membershipCheckout: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkout = params.get("checkout");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const c = await fetchAuthCapabilities();
        if (mounted) setCaps({ membershipCheckout: c.membershipCheckout });
      } catch {
        if (mounted) setCaps({ membershipCheckout: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onPay = useCallback(async () => {
    if (!token) return;
    setError("");
    setBusy(true);
    try {
      const url = await startMembershipCheckout(token);
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (checkout === "success" || checkout === "cancel") {
      void refreshSession();
    }
  }, [checkout, refreshSession]);

  if (user?.user_type === "admin") {
    return <Navigate to="/" replace />;
  }

  if (accessGranted) {
    return <Navigate to="/" replace />;
  }

  const reasons = access?.reasons?.length ? access.reasons : ["Your account is not active yet."];

  const showPay =
    Boolean(caps?.membershipCheckout) &&
    (access?.billing_status === "unpaid" ||
      access?.billing_status === "past_due" ||
      access?.billing_status === "canceled" ||
      !access?.billing_status);

  return (
    <div className="hd2d-page-shell max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">Account pending</h1>
        <p className="text-sm text-[#71767b] mt-2">
          Your organization must approve your application and activate membership before you can use the full platform.
        </p>
      </div>

      {checkout === "success" ? (
        <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
          Payment received — refreshing your access. If you are still blocked after a minute, click Refresh below (Stripe webhooks
          can take a few seconds).
        </p>
      ) : null}
      {checkout === "cancel" ? (
        <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
          Checkout was canceled. You can try again when you are ready.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-[#f4212e] rounded-lg border border-[#f4212e]/40 bg-[#f4212e]/10 px-4 py-2">{error}</p>
      ) : null}

      <ul className="list-disc space-y-2 pl-5 text-sm text-[#e7e9ea]">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {showPay ? (
          <button type="button" className="run-btn" disabled={busy} onClick={() => void onPay()}>
            {busy ? "Redirecting…" : "Pay membership"}
          </button>
        ) : null}
        <button type="button" className="secondary-btn" disabled={busy} onClick={() => void refreshSession()}>
          Refresh status
        </button>
      </div>

      <p className="text-sm text-[#8b9199]">
        Questions or stuck? Email{" "}
        <a className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline" href="mailto:support@hardcoredoortodoorclosers.com">
          support@hardcoredoortodoorclosers.com
        </a>
        .
      </p>

      <p className="text-xs text-[#71767b]">
        Approval status: <span className="text-[#e7e9ea]">{access?.approval_status ?? "—"}</span> · Billing:{" "}
        <span className="text-[#e7e9ea]">{access?.billing_status ?? "—"}</span>
      </p>
    </div>
  );
}
