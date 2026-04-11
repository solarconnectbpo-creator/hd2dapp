import { telnyxMessageIdFromResponse, telnyxSendSms } from "./telnyxSend";
import { twilioMessageSidFromResponse, twilioSendSms } from "./twilioSend";
import { retryWithBackoffWhen } from "../../utils/retry";

export type SmsProviderId = "telnyx" | "twilio";

export type SendSmsInput =
  | {
      provider: "telnyx";
      apiKey: string;
      from: string;
      to: string;
      text: string;
      appendCompliance?: boolean;
    }
  | {
      provider: "twilio";
      accountSid: string;
      authToken: string;
      from: string;
      to: string;
      text: string;
      appendCompliance?: boolean;
    };

export type SendSmsResult = { provider: SmsProviderId; externalId: string | null; data: unknown };

function httpStatusFromError(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e && typeof (e as { status?: unknown }).status === "number") {
    return (e as { status: number }).status;
  }
  return undefined;
}

function isTransientProviderError(e: unknown): boolean {
  const st = httpStatusFromError(e);
  if (st === undefined) return true;
  if (st === 429) return true;
  return st >= 500 && st <= 599;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  switch (input.provider) {
    case "telnyx": {
      const { data } = await retryWithBackoffWhen(
        () =>
          telnyxSendSms({
            apiKey: input.apiKey,
            from: input.from,
            to: input.to,
            text: input.text,
            appendCompliance: input.appendCompliance,
          }),
        isTransientProviderError,
        { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8000, backoffMultiplier: 2 },
      );
      return {
        provider: "telnyx",
        externalId: telnyxMessageIdFromResponse(data),
        data,
      };
    }
    case "twilio": {
      const { data } = await retryWithBackoffWhen(
        () =>
          twilioSendSms({
            accountSid: input.accountSid,
            authToken: input.authToken,
            from: input.from,
            to: input.to,
            text: input.text,
            appendCompliance: input.appendCompliance,
          }),
        isTransientProviderError,
        { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 8000, backoffMultiplier: 2 },
      );
      return {
        provider: "twilio",
        externalId: twilioMessageSidFromResponse(data),
        data,
      };
    }
    default:
      throw new Error(`SMS provider not supported: ${String((input as SendSmsInput).provider)}`);
  }
}

export { appendSmsCompliance } from "./compliance";
