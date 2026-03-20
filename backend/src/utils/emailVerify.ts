/**
 * Email Verification
 * Basic format validation of email addresses
 */

interface EmailVerification {
  valid: boolean;
  reason: string;
}

export function verifyEmail(email: string): EmailVerification {
  if (!email) {
    return { valid: false, reason: "missing" };
  }

  // Basic email regex pattern
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = regex.test(email);

  return {
    valid,
    reason: valid ? "valid" : "invalid_format"
  };
}
