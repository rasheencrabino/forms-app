"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormDto, ResponseSummaryDto } from "@forms-app/shared";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download";

export default function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { token } = useAuth();
  const [form, setForm] = useState<FormDto | null>(null);
  const [responses, setResponses] = useState<ResponseSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getForm(token, formId), api.listResponses(token, formId)])
      .then(([loadedForm, loadedResponses]) => {
        setForm(loadedForm);
        setResponses(loadedResponses);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load responses"));
  }, [token, formId]);

  async function onExport() {
    if (!token || !form) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await api.exportResponses(token, formId);
      downloadBlob(blob, `${form.slug}-responses.xlsx`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to export responses");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="page">
      <h1>Responses{form ? `: ${form.title}` : ""}</h1>
      <div className="btn-row" style={{ marginBottom: "1.25rem" }}>
        {form && <Link href={`/forms/${formId}`}>← Back to {form.title}</Link>}
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <button className="btn" disabled={exporting || !responses?.length} onClick={onExport} data-testid="export-xlsx-btn">
          {exporting ? "Exporting…" : "Export as .xlsx"}
        </button>
      </div>

      {responses === null && !error && <p>Loading…</p>}
      {responses?.length === 0 && <div className="empty-state">No responses yet.</div>}

      {responses && responses.length > 0 && (
        <table data-testid="responses-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Submitted at</th>
              <th>Answers</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {responses.map((r) => (
              <tr key={r.id} data-testid={`response-row-${r.id}`}>
                <td>{r.email}</td>
                <td>{new Date(r.submittedAt).toLocaleString()}</td>
                <td>{r.answerCount}</td>
                <td>
                  <Link href={`/forms/${formId}/responses/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
