import type { WebhookPayload } from "@forms-app/shared";

export interface ReceivedDelivery {
  id: string;
  receivedAt: string;
  payload: WebhookPayload;
}

// In-memory only, per the take-home spec ("in-memory is fine"). Capped so a
// long-running demo instance can't grow without bound.
const MAX_STORED = 200;
const deliveries: ReceivedDelivery[] = [];

let nextId = 1;

export function recordDelivery(payload: WebhookPayload): ReceivedDelivery {
  const record: ReceivedDelivery = {
    id: String(nextId++),
    receivedAt: new Date().toISOString(),
    payload,
  };
  deliveries.unshift(record);
  if (deliveries.length > MAX_STORED) {
    deliveries.length = MAX_STORED;
  }
  return record;
}

export function listDeliveries(): ReceivedDelivery[] {
  return deliveries;
}
