"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormDto } from "@forms-app/shared";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";

export default function FormsListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [forms, setForms] = useState<FormDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .listForms(token)
      .then(setForms)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load forms"));
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const form = await api.createForm(token, { title, description: description || undefined });
      router.push(`/forms/${form.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create form");
      setCreating(false);
    }
  }

  async function onDelete(formId: string) {
    if (!token) return;
    if (!window.confirm("Delete this form and all of its responses? This cannot be undone.")) return;
    setError(null);
    try {
      await api.deleteForm(token, formId);
      setForms((prev) => prev?.filter((f) => f.id !== formId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete form");
    }
  }

  return (
    <main className="page">
      <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h1>Your forms</h1>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New form"}
        </button>
      </div>
      <p className="subtitle">Create, publish, and manage your forms.</p>

      {error && <div className="banner banner--error">{error}</div>}

      {showCreate && (
        <form className="card" onSubmit={onCreate}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Description (optional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create form"}
          </button>
        </form>
      )}

      {forms === null && !error && <p>Loading…</p>}

      {forms?.length === 0 && (
        <div className="empty-state">No forms yet. Create your first one above.</div>
      )}

      {forms?.map((form) => (
        <div className="card form-list-item" key={form.id} data-testid={`form-row-${form.id}`}>
          <div>
            <div className="btn-row" style={{ alignItems: "center" }}>
              <Link href={`/forms/${form.id}`}>
                <strong>{form.title}</strong>
              </Link>
              <span className={`badge ${form.isPublished ? "badge--published" : "badge--draft"}`}>
                {form.isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <div className="form-list-item__meta">
              {form.questions.length} question{form.questions.length === 1 ? "" : "s"} · {form.responseCount ?? 0}{" "}
              response{form.responseCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="btn-row">
            <Link className="btn btn--secondary btn--sm" href={`/forms/${form.id}/responses`}>
              Responses
            </Link>
            <button className="btn btn--danger btn--sm" onClick={() => onDelete(form.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
