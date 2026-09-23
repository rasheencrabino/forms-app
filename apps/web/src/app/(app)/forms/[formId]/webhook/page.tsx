"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormDto, WebhookDeliveryDto } from "@forms-app/shared";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";

export default function WebhookPage() {
  const { formId } = useParams<{ formId: string }>();
  const { token } = useAuth();
  const [form, setForm] = useState<FormDto | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[] | null>(null);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!token) return;
    const [loadedForm, loadedDeliveries] = await Promise.all([
      api.getForm(token, formId),
      api.listDeliveries(token, formId),
    ]);
    setForm(loadedForm);
    setDeliveries(loadedDeliveries);
    setUrl(loadedForm.webhook?.url ?? "");
  }

  useEffect(() => {
    if (!token) return;
    reload().catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, formId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api.setWebhook(token, formId, { url, secret: secret || undefined });
      setSecret("");
      setNotice("Webhook saved");
      setTimeout(() => setNotice(null), 1500);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save webhook");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove() {
    if (!token) return;
    if (!window.confirm("Remove this webhook configuration?")) return;
    setError(null);
    try {
      await api.removeWebhook(token, formId);
      setUrl("");
      setSecret("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove webhook");
    }
  }

  if (!form) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Webhook</h1>
      <div className="btn-row" style={{ marginBottom: "1.25rem" }}>
        <Link href={`/forms/${formId}`}>← Back to {form.title}</Link>
      </div>

      {error && <div className="banner banner--error">{error}</div>}
      {notice && <div className="banner banner--success">{notice}</div>}

      <div className="card">
        <h2>Configuration</h2>
        <p className="subtitle">
          On every successful submission, the payload is POSTed to this URL with the secret in the{" "}
          <code>X-Webhook-Secret</code> header. Delivery is fire-and-forget — a failing endpoint never blocks or
          fails the respondent&apos;s submission.
        </p>
        <form onSubmit={onSave}>
          <div className="field">
            <label htmlFor="webhook-url">URL</label>
            <input
              id="webhook-url"
              type="url"
              required
              placeholder="https://example.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="webhook-secret">
              Secret {form.webhook?.hasSecret && "(leave blank to keep the current one)"}
            </label>
            <input
              id="webhook-secret"
              type="text"
              placeholder={form.webhook?.hasSecret ? "•••••••• (already set)" : "shared secret"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required={!form.webhook?.hasSecret}
              minLength={8}
            />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save webhook"}
            </button>
            {form.webhook && (
              <button className="btn btn--danger" type="button" onClick={onRemove}>
                Remove webhook
              </button>
            )}
          </div>
        </form>
      </div>

      <h2>Delivery log</h2>
      {deliveries === null && <p>Loading…</p>}
      {deliveries?.length === 0 && <div className="empty-state">No deliveries yet.</div>}
      {deliveries && deliveries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Attempted at</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr className="delivery-row" key={d.id}>
                <td>{new Date(d.attemptedAt).toLocaleString()}</td>
                <td className={d.statusCode && d.statusCode < 400 ? "status-ok" : "status-fail"}>
                  {d.statusCode ?? "—"}
                </td>
                <td>{d.errorMessage ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
