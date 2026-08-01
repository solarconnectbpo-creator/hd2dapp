/** Small request-body validators shared by API routes. */

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export type ValidateStringOptions = {
  minLength?: number;
  maxLength?: number;
  /** Trim before length checks and return the trimmed value (default true). */
  trim?: boolean;
  /** Value must match this pattern after trimming. */
  pattern?: RegExp;
};

/**
 * Narrows an unknown body field to a string and enforces length/pattern rules.
 * Throws {@link ValidationError} so callers can map failures to a 400 response.
 */
export function validateString(
  value: unknown,
  field: string,
  options: ValidateStringOptions = {},
): string {
  const { minLength, maxLength, pattern, trim = true } = options;

  if (typeof value !== "string") {
    throw new ValidationError(field, "must be a string");
  }

  const out = trim ? value.trim() : value;

  if (minLength != null && out.length < minLength) {
    throw new ValidationError(
      field,
      minLength === 1 ? "is required" : `must be at least ${minLength} characters`,
    );
  }
  if (maxLength != null && out.length > maxLength) {
    throw new ValidationError(field, `must be at most ${maxLength} characters`);
  }
  if (pattern && !pattern.test(out)) {
    throw new ValidationError(field, "has an invalid format");
  }

  return out;
}

/** Optional variant — returns null for undefined/null/empty instead of throwing. */
export function validateOptionalString(
  value: unknown,
  field: string,
  options: ValidateStringOptions = {},
): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return validateString(value, field, options);
}
