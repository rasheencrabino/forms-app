"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ResponseDto } from "@forms-app/shared";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { AnswerValue } from "@/components/AnswerValue";

export default function ResponseDetailPage() {
  const { formId, responseId } = useParams<{ formId: string; responseId: string }>();
  const { token } = useAuth();
  const [response, setResponse] = useState<ResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getResponse(token, formId, responseId)
      .then(setResponse)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load response"));
  }, [token, formId, responseId]);

  return (
    <main className="page">
      <h1>Response detail</h1>
      <div className="btn-row" style={{ marginBottom: "1.25rem" }}>
        <Link href={`/forms/${formId}/responses`}>← Back to responses</Link>
      </div>

      {error && <div className="banner banner--error">{error}</div>}
      {!response && !error && <p>Loading…</p>}

      {response && (
        <div className="card">
          <p>
            <strong>Email:</strong> {response.email}
          </p>
          <p>
            <strong>Submitted at:</strong> {new Date(response.submittedAt).toLocaleString()}
          </p>
          <table style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
              </tr>
            </thead>
            <tbody>
              {response.answers.map((answer) => (
                <tr key={answer.id}>
                  <td>
                    {answer.label}
                    {answer.required && <span className="required-mark">*</span>}
                  </td>
                  <td>
                    <AnswerValue answer={answer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
