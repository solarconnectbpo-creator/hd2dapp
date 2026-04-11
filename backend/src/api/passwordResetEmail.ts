export type PasswordResetEmailEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

/**
 * Sends a password reset link to the account email via Resend.
 * @returns true if Resend accepted the request, false if API key missing or send failed.
 */
export async function sendPasswordResetEmail(
  env: PasswordResetEmailEnv,
  args: { to: string; resetUrl: string; name: string },
): Promise<boolean> {
  const apiKey = (env.RESEND_API_KEY || "").trim();
  if (!apiKey) return false;
  const from = (env.RESEND_FROM || "").trim() || "HD2D <onboarding@resend.dev>";
  const text = [
    `Hi ${args.name || "there"},`,
    ``,
    `We received a request to reset your Door to Door Closers password.`,
    ``,
    `Open this link (valid for 1 hour):`,
    args.resetUrl,
    ``,
    `If you did not request this, you can ignore this email.`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to.trim().toLowerCase()],
      subject: "Reset your Door to Door Closers password",
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[password-reset-email] Resend error:", res.status, errText.slice(0, 500));
    return false;
  }
  return true;
}
