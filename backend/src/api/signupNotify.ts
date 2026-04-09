/**
 * New sign-up notification via Resend (https://resend.com) — one API key, no SMTP.
 * If RESEND_API_KEY is unset, notifications are skipped (local dev).
 */

export type SignupNotifyEnv = {
  RESEND_API_KEY?: string;
  /** Inbox that receives alerts (default: admin@hardcoredoortodoorclosers.com). */
  SIGNUP_NOTIFY_TO?: string;
  /**
   * Verified sender in Resend, e.g. "HD2D <noreply@hardcoredoortodoorclosers.com>".
   * Until the domain is verified, use Resend's test sender (see their dashboard).
   */
  RESEND_FROM?: string;
};

export async function sendSignupNotification(
  env: SignupNotifyEnv,
  args: {
    newUserEmail: string;
    name: string;
    userType: "company" | "sales_rep";
    companyName?: string;
    homeState?: string;
  },
): Promise<void> {
  const apiKey = (env.RESEND_API_KEY || "").trim();
  if (!apiKey) return;

  const to = (env.SIGNUP_NOTIFY_TO || "admin@hardcoredoortodoorclosers.com").trim();
  const from =
    (env.RESEND_FROM || "").trim() || "HD2D Signups <onboarding@resend.dev>";

  const roleLabel = args.userType === "company" ? "Company" : "Sales rep";
  const lines = [
    `New HD2D sign-up`,
    ``,
    `Name: ${args.name}`,
    `Email: ${args.newUserEmail}`,
    `Account type: ${roleLabel}`,
  ];
  if (args.companyName) lines.push(`Company: ${args.companyName}`);
  if (args.homeState) lines.push(`Home state: ${args.homeState}`);

  const text = lines.join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New sign-up: ${args.name} (${roleLabel})`,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[signup-notify] Resend error:", res.status, errText.slice(0, 500));
  }
}

