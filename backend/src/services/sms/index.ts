import { telnyxMessageIdFromResponse, telnyxSendSms } from "./telnyxSend";
import { twilioMessageSidFromResponse, twilioSendSms } from "./twilioSend";

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

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  switch (input.provider) {
    case "telnyx": {
      const { data } = await telnyxSendSms({
        apiKey: input.apiKey,
        from: input.from,
        to: input.to,
        text: input.text,
        appendCompliance: input.appendCompliance,
      });
      return {
        provider: "telnyx",
        externalId: telnyxMessageIdFromResponse(data),
        data,
      };
    }
    case "twilio": {
      const { data } = await twilioSendSms({
        accountSid: input.accountSid,
        authToken: input.authToken,
        from: input.from,
        to: input.to,
        text: input.text,
        appendCompliance: input.appendCompliance,
      });
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
