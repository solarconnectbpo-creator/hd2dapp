import { useCallback, useState } from "react";

export interface WebhookPayload {
  agentId: string;
  fromNumber: string;
  toNumber: string;
  timestamp: string;
  callId: string;
  type: "incoming" | "connected" | "ended";
  duration?: number;
  transcript?: string;
}

export const useWebhookProcessor = (webhookUrl: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sendWebhook = useCallback(
    async (payload: WebhookPayload): Promise<boolean> => {
      if (!webhookUrl || !webhookUrl.startsWith("http")) {
        setLastError("Invalid webhook URL");
        return false;
      }

      setIsProcessing(true);
      setLastError(null);

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": generateSignature(payload),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setLastError(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [webhookUrl],
  );

  const generateSignature = (payload: WebhookPayload): string => {
    // Simple signature for demo - in production use HMAC-SHA256
    const data = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).slice(0, 32);
  };

  return { sendWebhook, isProcessing, lastError };
};
