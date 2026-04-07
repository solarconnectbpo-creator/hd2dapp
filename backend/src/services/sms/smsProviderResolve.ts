/**
 * Resolve outbound SMS credentials: Twilio when Account SID + Auth Token are set, else Telnyx.
 */

export type ResolvedSmsOutbound =
  | {
      provider: "telnyx";
      apiKey: string;
      from: string;
    }
  | {
      provider: "twilio";
      accountSid: string;
      authToken: string;
      from: string;
    };

export function resolveSmsOutbound(env: {
  TELNYX_API_KEY?: string;
  TELNYX_FROM_NUMBER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
}, orgFromNumber: string | null): ResolvedSmsOutbound | null {
  const sid = (env.TWILIO_ACCOUNT_SID || "").trim();
  const token = (env.TWILIO_AUTH_TOKEN || "").trim();
  const twilioFrom = (env.TWILIO_FROM_NUMBER || "").trim() || (orgFromNumber || "").trim();
  if (sid && token && twilioFrom) {
    return { provider: "twilio", accountSid: sid, authToken: token, from: twilioFrom };
  }
  const apiKey = (env.TELNYX_API_KEY || "").trim();
  const from = (orgFromNumber || "").trim() || (env.TELNYX_FROM_NUMBER || "").trim();
  if (apiKey && from) {
    return { provider: "telnyx", apiKey, from };
  }
  return null;
}
