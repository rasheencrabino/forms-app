import { z } from "zod";

export const WebhookConfigSchema = z.object({
  url: z.string().trim().url("Must be a valid URL"),
  // Optional so the URL can be updated without re-supplying the secret —
  // the service layer keeps the existing secret when this is omitted, and
  // requires one only when configuring a webhook for the first time.
  secret: z.string().trim().min(8, "Secret must be at least 8 characters").max(500).optional(),
});
export type WebhookConfigInput = z.infer<typeof WebhookConfigSchema>;

export const WebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  responseId: z.string().uuid(),
  url: z.string(),
  statusCode: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  attemptedAt: z.string(),
});
export type WebhookDeliveryDto = z.infer<typeof WebhookDeliverySchema>;

/**
 * The payload POSTed to the form owner's configured webhook URL on every
 * successful submission (also consumed by apps/webhook-consumer).
 */
export const WebhookPayloadSchema = z.object({
  form: z.object({
    id: z.string().uuid(),
    title: z.string(),
  }),
  response: z.object({
    id: z.string().uuid(),
    email: z.string(),
    submittedAt: z.string(),
    answers: z.array(
      z.object({
        questionId: z.string().uuid(),
        label: z.string(),
        type: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.number(), z.null()]),
      }),
    ),
  }),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const WEBHOOK_SECRET_HEADER = "X-Webhook-Secret";
