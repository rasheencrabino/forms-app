import type { ResponseDto, WebhookDeliveryDto, WebhookPayload } from "@forms-app/shared";
import { WEBHOOK_SECRET_HEADER } from "@forms-app/shared";
import { prisma } from "../db";
import { getOwnedFormOrThrow } from "./forms.service";

const DELIVERY_TIMEOUT_MS = 5000;

interface DeliverArgs {
  formId: string;
  formTitle: string;
  webhookUrl: string;
  webhookSecret: string;
  response: ResponseDto;
}

/**
 * POSTs the submission payload to the form's configured webhook and always
 * records the outcome as a WebhookDelivery row — timestamp, status code,
 * and error message if any — so the owner can see delivery health in the
 * UI. Never throws: this runs after the response is already committed and
 * must not affect the respondent's request in any way. No retries (per
 * spec).
 */
export async function deliverWebhookAndLog(args: DeliverArgs): Promise<void> {
  const { formId, formTitle, webhookUrl, webhookSecret, response } = args;

  const payload: WebhookPayload = {
    form: { id: formId, title: formTitle },
    response: {
      id: response.id,
      email: response.email,
      submittedAt: response.submittedAt,
      answers: response.answers.map((a) => ({
        questionId: a.id,
        label: a.label,
        type: a.type,
        value: a.value,
      })),
    },
  };

  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [WEBHOOK_SECRET_HEADER]: webhookSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    statusCode = res.status;
    if (!res.ok) {
      errorMessage = `Webhook endpoint responded with status ${res.status}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown delivery error";
  } finally {
    clearTimeout(timeout);
  }

  try {
    await prisma.webhookDelivery.create({
      data: {
        formId,
        responseId: response.id,
        url: webhookUrl,
        statusCode,
        errorMessage,
      },
    });
  } catch (err) {
    // Logging the delivery attempt failed (e.g. DB hiccup) — swallow it.
    // This function must never throw; it runs detached from the request.
    // eslint-disable-next-line no-console
    console.error("Failed to record webhook delivery log:", err);
  }
}

export async function listDeliveries(ownerId: string, formId: string): Promise<WebhookDeliveryDto[]> {
  await getOwnedFormOrThrow(ownerId, formId);
  const rows = await prisma.webhookDelivery.findMany({
    where: { formId },
    orderBy: { attemptedAt: "desc" },
    take: 200,
  });
  return rows.map((row) => ({
    id: row.id,
    formId: row.formId,
    responseId: row.responseId,
    url: row.url,
    statusCode: row.statusCode,
    errorMessage: row.errorMessage,
    attemptedAt: row.attemptedAt.toISOString(),
  }));
}
