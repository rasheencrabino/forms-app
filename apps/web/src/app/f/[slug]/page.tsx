"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AnswerValue, PublicFormDto } from "@forms-app/shared";
import { api, ApiError } from "@/lib/api-client";
import { PublicQuestionField } from "@/components/PublicQuestionField";

/** The server keys each validation failure by questionId (not just message
 * text) precisely so this mapping is exact — two questions can share the
 * same label (nothing enforces uniqueness), so matching on "does the
 * message contain this label" would incorrectly flag both. */
function mapErrorsToQuestions(errors: { questionId: string; message: string }[]): Record<string, string> {
  return Object.fromEntries(errors.map((e) => [e.questionId, e.message]));
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [form, setForm] = useState<PublicFormDto | null | "not-found">(null);
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getPublicForm(slug)
      .then(setForm)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setForm("not-found");
        else setFormError("Failed to load form");
      });
  }, [slug]);

  async function onSubmit() {
    if (!form || form === "not-found") return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api.submitResponse(slug, {
        email,
        answers: form.questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? null })),
      });
      router.push(`/f/${slug}/thank-you`);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as
          | { errors?: { questionId: string; message: string }[]; fieldErrors?: Record<string, string[]> }
          | undefined;
        if (details?.errors) {
          setFieldErrors(mapErrorsToQuestions(details.errors));
          setFormError("Please fix the errors below and try again.");
        } else if (details?.fieldErrors?.email) {
          setFieldErrors({ email: details.fieldErrors.email[0] });
          setFormError("Please fix the errors below and try again.");
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (form === "not-found") {
    return (
      <main className="page page--narrow">
        <div className="empty-state">
          <h1>Form not available</h1>
          <p>This form doesn&apos;t exist or is no longer published.</p>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="page page--narrow">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <h1>{form.title}</h1>
      {form.description && <p className="subtitle">{form.description}</p>}

      {formError && <div className="banner banner--error">{formError}</div>}

      <div className="card" data-testid="create-form-fill">
        <div className="field">
          <label>
            Email<span className="required-mark">*</span>
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {fieldErrors.email && <div className="error-text">{fieldErrors.email}</div>}
        </div>

        {form.questions.map((question) => (
          <PublicQuestionField
            key={question.id}
            question={question}
            value={answers[question.id] ?? null}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            error={fieldErrors[question.id]}
          />
        ))}

        <button className="btn" disabled={submitting} onClick={onSubmit} data-testid="submit-response-btn">
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </main>
  );
}
