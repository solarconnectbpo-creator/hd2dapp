import { describe, expect, it } from "vitest";
import { safeUserFacingApiMessage } from "./safeApiError";

describe("safeUserFacingApiMessage", () => {
  it("maps 401 when status hints enabled", () => {
    expect(safeUserFacingApiMessage("x", 401)).toBe("Sign in again to continue.");
  });

  it("does not map 401 for auth forms when skipStatusHints", () => {
    expect(safeUserFacingApiMessage("Invalid email or password", 401, { skipStatusHints: true })).toBe(
      "Invalid email or password",
    );
  });

  it("strips Stripe-ish messages", () => {
    expect(safeUserFacingApiMessage("Stripe error: no such price", 400)).toBe(
      "Checkout could not be started. Verify your package is set up or try again later.",
    );
  });

  it("truncates very long messages", () => {
    const long = "x".repeat(300);
    expect(safeUserFacingApiMessage(long)).toBe("Something went wrong. Try again or contact support.");
  });
});
