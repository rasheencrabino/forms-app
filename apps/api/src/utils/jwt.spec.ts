import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {
  it("round-trips a payload through sign/verify", () => {
    const token = signToken({ sub: "user-1", email: "a@example.com" });
    const payload = verifyToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("a@example.com");
  });

  it("throws on a tampered token", () => {
    const token = signToken({ sub: "user-1", email: "a@example.com" });
    expect(() => verifyToken(`${token}tampered`)).toThrow();
  });
});
