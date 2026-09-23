import type { ReceivedDelivery } from "./store";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAnswer(value: unknown): string {
  if (Array.isArray(value)) return escapeHtml(value.join(", "));
  return escapeHtml(value);
}

function renderDelivery(delivery: ReceivedDelivery): string {
  const { payload } = delivery;
  const rows = payload.response.answers
    .map(
      (a) => `<tr><td>${escapeHtml(a.label)}</td><td>${escapeHtml(a.type)}</td><td>${renderAnswer(a.value)}</td></tr>`,
    )
    .join("");

  return `
    <section class="delivery">
      <header>
        <strong>${escapeHtml(payload.form.title)}</strong>
        <span class="meta">from ${escapeHtml(payload.response.email)} · received ${escapeHtml(delivery.receivedAt)}</span>
      </header>
      <table>
        <thead><tr><th>Question</th><th>Type</th><th>Answer</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

export function renderPage(deliveries: ReceivedDelivery[]): string {
  const body =
    deliveries.length > 0
      ? deliveries.map(renderDelivery).join("\n")
      : `<p class="empty">No webhook deliveries received yet. Configure a webhook on a form pointing at this app's <code>/webhook</code> endpoint and submit a response.</p>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Webhook Consumer</title>
  <meta http-equiv="refresh" content="10" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.4rem; }
    .subtitle { color: #666; margin-top: -0.5rem; }
    .delivery { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .delivery header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
    .meta { color: #666; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
    .empty { color: #666; }
    code { background: #f2f2f2; padding: 0.1rem 0.3rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Webhook Consumer</h1>
  <p class="subtitle">Receives webhook deliveries from the Forms App. Auto-refreshes every 10s. (${deliveries.length} received)</p>
  ${body}
</body>
</html>`;
}
