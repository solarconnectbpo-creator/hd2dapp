/** Canonical workflow trigger strings (stored in sms_workflows.trigger). */
export const SMS_CANONICAL_TRIGGERS = [
  "manual",
  "lead.created",
  "inspection.completed",
  "estimate.sent",
  "no_response",
  "claim.not_filed",
  "deal.won",
  "deal.lost",
] as const;

export type SmsCanonicalTrigger = (typeof SMS_CANONICAL_TRIGGERS)[number];

export function isCanonicalSmsTrigger(s: string): s is SmsCanonicalTrigger {
  return (SMS_CANONICAL_TRIGGERS as readonly string[]).includes(s);
}
