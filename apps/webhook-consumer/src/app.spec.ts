import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { WEBHOOK_SECRET_HEADER } from "@forms-app/shared";

const validPayload = {
  form: { id: "11111111-1111-1111-1111-111111111111", title: "Test Form" },
  response: {
    id: "22222222-2222-2222-2222-222222222222",
    email: "respondent@example.com",
    submittedAt: new Date().toISOString(),
    answers: [{ questionId: "33333333-3333-3333-3333-333333333333", label: "Q1", type: "SHORT_TEXT", value: "hi" }],
  },
};

describe("webhook-consumer", () => {
  const app = createApp();

  it("rejects a request with no secret header", async () => {
    const res = await request(app).post("/webhook").send(validPayload);
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong secret", async () => {
    const res = await request(app)
      .post("/webhook")
      .set(WEBHOOK_SECRET_HEADER, "wrong-secret")
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("accepts a request with the correct secret and stores it", async () => {
    const res = await request(app)
      .post("/webhook")
      .set(WEBHOOK_SECRET_HEADER, "supersecretwebhook123")
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const list = await request(app).get("/api/deliveries");
    expect(list.body.length).toBeGreaterThan(0);
  });
});
