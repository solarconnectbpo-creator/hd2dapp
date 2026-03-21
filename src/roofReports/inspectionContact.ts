/**
 * Public contact for scheduling on-site inspections (reports & exports).
 * Configure via env in production; safe fallbacks for dev.
 */

function envStr(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = (process as { env?: Record<string, string | undefined> }).env?.[
    key
  ];
  const t = v?.trim();
  return t || undefined;
}

export function getInspectionPhone(): string | undefined {
  return (
    envStr("EXPO_PUBLIC_INSPECTION_PHONE") ??
    envStr("EXPO_PUBLIC_COMPANY_PHONE")
  );
}

export function getInspectionEmail(): string | undefined {
  return (
    envStr("EXPO_PUBLIC_INSPECTION_EMAIL") ??
    envStr("EXPO_PUBLIC_COMPANY_EMAIL")
  );
}
