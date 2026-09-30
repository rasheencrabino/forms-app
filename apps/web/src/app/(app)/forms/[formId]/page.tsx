"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { FormDto } from "@forms-app/shared";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { moveItem } from "@/lib/move-item";
import type { QuestionEditorValue } from "@/components/QuestionEditor";
import { SortableQuestion } from "@/components/SortableQuestion";
import { AddQuestionForm } from "@/components/AddQuestionForm";

const WEB_BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function sortedQuestionIds(questions: FormDto["questions"]): string[] {
  return [...questions].sort((a, b) => a.order - b.order).map((q) => q.id);
}

export default function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const { token } = useAuth();
  const [form, setForm] = useState<FormDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reordering, setReordering] = useState(false);

  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function reload() {
    if (!token) return;
    const loaded = await api.getForm(token, formId);
    setForm(loaded);
    setTitle(loaded.title);
    setDescription(loaded.description ?? "");
  }

  useEffect(() => {
    if (!token) return;
    reload().catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load form"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, formId]);

  async function onSaveMeta() {
    if (!token) return;
    setSavingMeta(true);
    setError(null);
    try {
      const updated = await api.updateForm(token, formId, { title, description: description || null });
      setForm((prev) => (prev ? { ...prev, title: updated.title, description: updated.description } : prev));
      setNotice("Saved");
      setTimeout(() => setNotice(null), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSavingMeta(false);
    }
  }

  async function onTogglePublish() {
    if (!token || !form) return;
    setPublishing(true);
    setError(null);
    try {
      const updated = form.isPublished ? await api.unpublishForm(token, formId) : await api.publishForm(token, formId);
      setForm((prev) => (prev ? { ...prev, isPublished: updated.isPublished } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update publish state");
    } finally {
      setPublishing(false);
    }
  }

  async function onAddQuestion(value: QuestionEditorValue) {
    if (!token) return;
    await api.createQuestion(token, formId, value);
    await reload();
  }

  async function onSaveQuestion(questionId: string, value: QuestionEditorValue) {
    if (!token) return;
    await api.updateQuestion(token, formId, questionId, value);
    await reload();
  }

  async function onDeleteQuestion(questionId: string) {
    if (!token) return;
    await api.deleteQuestion(token, formId, questionId);
    await reload();
  }

  async function applyReorder(nextIds: string[]) {
    if (!token || !form) return;
    const previousQuestions = form.questions;
    setError(null);
    setReordering(true);
    setForm((prev) =>
      prev ? { ...prev, questions: prev.questions.map((q) => ({ ...q, order: nextIds.indexOf(q.id) })) } : prev,
    );
    try {
      const questions = await api.reorderQuestions(token, formId, nextIds);
      setForm((prev) => (prev ? { ...prev, questions } : prev));
    } catch (err) {
      setForm((prev) => (prev ? { ...prev, questions: previousQuestions } : prev));
      setError(err instanceof ApiError ? err.message : "Failed to reorder questions");
    } finally {
      setReordering(false);
    }
  }

  async function onMoveQuestion(questionId: string, direction: "up" | "down") {
    if (!form) return;
    const ordered = sortedQuestionIds(form.questions);
    const idx = ordered.indexOf(questionId);
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= ordered.length) return;
    await applyReorder(moveItem(ordered, idx, target));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!form || !over || active.id === over.id) return;
    const ordered = sortedQuestionIds(form.questions);
    void applyReorder(moveItem(ordered, ordered.indexOf(String(active.id)), ordered.indexOf(String(over.id))));
  }

  // Screen reader announcements by position; dnd-kit's defaults would read out question UUIDs.
  function positionOf(id: UniqueIdentifier): number {
    return form ? sortedQuestionIds(form.questions).indexOf(String(id)) + 1 : 0;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up question ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Question ${positionOf(active.id)} is over position ${positionOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Question ${positionOf(active.id)} moved to position ${positionOf(over.id)}.`
        : `Question ${positionOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving question ${positionOf(active.id)} was cancelled.`,
  };

  if (error && !form) {
    return (
      <main className="page">
        <div className="banner banner--error">{error}</div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="page">
        <p>Loading…</p>
      </main>
    );
  }

  const sortedQuestions = [...form.questions].sort((a, b) => a.order - b.order);
  const publicUrl = `${WEB_BASE_URL}/f/${form.slug}`;

  return (
    <main className="page">
      <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>{form.title || "Untitled form"}</h1>
        <span className={`badge ${form.isPublished ? "badge--published" : "badge--draft"}`}>
          {form.isPublished ? "Published" : "Draft"}
        </span>
      </div>
      <div className="btn-row" style={{ marginBottom: "1.25rem" }}>
        <Link href="/forms">← Back to forms</Link>
        <span>·</span>
        <Link href={`/forms/${formId}/responses`}>Responses ({form.responseCount ?? 0})</Link>
        <span>·</span>
        <Link href={`/forms/${formId}/webhook`}>Webhook</Link>
      </div>

      {error && <div className="banner banner--error">{error}</div>}
      {notice && <div className="banner banner--success">{notice}</div>}

      <div className="card">
        <h2>Form details</h2>
        <div className="field">
          <label htmlFor="form-title">Title</label>
          <input id="form-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="form-description">Description</label>
          <textarea id="form-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="btn-row">
          <button className="btn" disabled={savingMeta} onClick={onSaveMeta}>
            {savingMeta ? "Saving…" : "Save details"}
          </button>
          <button className="btn btn--secondary" disabled={publishing} onClick={onTogglePublish}>
            {publishing ? "Working…" : form.isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>
        {form.isPublished && (
          <p className="field-hint" style={{ marginTop: "0.75rem" }}>
            Public link:{" "}
            <a href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
          </p>
        )}
      </div>

      <h2>Questions</h2>
      {sortedQuestions.length === 0 && <p className="subtitle">No questions yet — add one below.</p>}
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={sortedQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {sortedQuestions.map((question, idx) => (
            <SortableQuestion
              key={question.id}
              question={question}
              position={idx + 1}
              isFirst={idx === 0}
              isLast={idx === sortedQuestions.length - 1}
              moveDisabled={reordering}
              onSave={(value) => onSaveQuestion(question.id, value)}
              onDelete={() => onDeleteQuestion(question.id)}
              onMove={(direction) => onMoveQuestion(question.id, direction)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <AddQuestionForm onAdd={onAddQuestion} />
    </main>
  );
}
