import "dotenv/config";
import express, { type Express } from "express";
import { WEBHOOK_SECRET_HEADER, WebhookPayloadSchema } from "@forms-app/shared";
import { listDeliveries, recordDelivery } from "./store";
import { renderPage } from "./views";

const EXPECTED_SECRET = process.env.WEBHOOK_CONSUMER_SECRET ?? "supersecretwebhook123";

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.type("html").send(renderPage(listDeliveries()));
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/webhook", (req, res) => {
    const providedSecret = req.header(WEBHOOK_SECRET_HEADER);
    if (!providedSecret || providedSecret !== EXPECTED_SECRET) {
      res.status(401).json({ error: "Missing or invalid webhook secret" });
      return;
    }

    const parsed = WebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload shape", details: parsed.error.flatten() });
      return;
    }

    const record = recordDelivery(parsed.data);
    res.status(200).json({ ok: true, id: record.id });
  });

  app.get("/api/deliveries", (_req, res) => {
    res.json(listDeliveries());
  });

  return app;
}
