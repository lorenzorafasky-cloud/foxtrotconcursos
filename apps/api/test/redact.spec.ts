import { describe, expect, it } from "vitest";
import { redactSensitive, safeErrorMessage } from "../src/core/redact";

describe("redactSensitive", () => {
  it("redacts sensitive keys recursively", () => {
    expect(
      redactSensitive({
        authorization: "Bearer token-value",
        nested: {
          password: "plain",
          apiKey: "key"
        },
        safe: "visible"
      })
    ).toEqual({
      authorization: "[REDACTED]",
      nested: {
        password: "[REDACTED]",
        apiKey: "[REDACTED]"
      },
      safe: "visible"
    });
  });

  it("redacts credentials embedded in URLs", () => {
    const message = "database postgresql://user:pass@example.com/db failed";
    expect(redactSensitive(message)).toBe("database [REDACTED_URL] failed");
    expect(safeErrorMessage(new Error(message))).toBe("database [REDACTED_URL] failed");
  });
});
