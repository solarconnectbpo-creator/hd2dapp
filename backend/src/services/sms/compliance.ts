const SUFFIX = "\n\nReply STOP to opt out.";

/** Append TCPA-style opt-out line to outbound SMS (use on every automated send). */
export function appendSmsCompliance(body: string): string {
  const t = (body || "").trimEnd();
  if (!t) return SUFFIX.trim();
  if (t.toLowerCase().includes("reply stop")) return t;
  return `${t}${SUFFIX}`;
}
