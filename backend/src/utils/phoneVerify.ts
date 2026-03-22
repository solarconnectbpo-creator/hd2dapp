/**
 * Phone Number Verification
 * Basic validation of phone numbers
 */

interface PhoneVerification {
  valid: boolean;
  cleaned: string;
  reason: string;
}

export function verifyPhone(phone: string): PhoneVerification {
  if (!phone) {
    return { valid: false, cleaned: "", reason: "missing" };
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/[^0-9]/g, "");

  // Check length (10-11 digits for US)
  const validLength = cleaned.length >= 10 && cleaned.length <= 11;

  // Check for invalid patterns
  const notAllZeros = !cleaned.startsWith("000");
  const notRepeat = !/^(\d)\1+$/.test(cleaned);

  const valid = validLength && notAllZeros && notRepeat;

  return {
    valid,
    cleaned,
    reason: valid ? "valid" : "invalid",
  };
}
