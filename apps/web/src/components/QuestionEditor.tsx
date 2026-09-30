"use client";

import { useState, type ReactNode } from "react";
import type { Question, QuestionType } from "@forms-app/shared";
import { OptionsEditor } from "./OptionsEditor";
import {
  QUESTION_TYPE_OPTIONS,
  defaultConfigForType,
  isOptionBasedType,
  sanitizeScaleBound,
} from "@/lib/question-types-ui";

export interface QuestionEditorValue {
  type: QuestionType;
  label: string;
  required: boolean;
  config: unknown;
}

interface QuestionEditorProps {
  question: Question;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  moveDisabled: boolean;
  dragHandle?: ReactNode;
  onSave: (value: QuestionEditorValue) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (direction: "up" | "down") => Promise<void>;
}

export function QuestionEditor({
  question,
  position,
  isFirst,
  isLast,
  moveDisabled,
  dragHandle,
  onSave,
  onDelete,
  onMove,
}: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(question.type);
  const [label, setLabel] = useState(question.label);
  const [required, setRequired] = useState(question.required);
  const [config, setConfig] = useState<Record<string, unknown>>((question.config as Record<string, unknown>) ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    type !== question.type ||
    label !== question.label ||
    required !== question.required ||
    JSON.stringify(config) !== JSON.stringify(question.config);

  function onTypeChange(nextType: QuestionType) {
    setType(nextType);
    setConfig(defaultConfigForType(nextType) as Record<string, unknown>);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ type, label, required, config });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this question?")) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="question-card" data-testid={`question-card-${question.id}`}>
      <div className="question-card__header">
        <div className="question-card__order">
          {dragHandle}
          <button
            className="btn btn--secondary btn--sm"
            disabled={isFirst || saving || moveDisabled}
            onClick={() => onMove("up")}
          >
            ↑
          </button>
          <button
            className="btn btn--secondary btn--sm"
            disabled={isLast || saving || moveDisabled}
            onClick={() => onMove("down")}
          >
            ↓
          </button>
        </div>
        <div className="question-card__body">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Question {position}</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Type</label>
            <select value={type} onChange={(e) => onTypeChange(e.target.value as QuestionType)}>
              {QUESTION_TYPE_OPTIONS.map(([value, display]) => (
                <option key={value} value={value}>
                  {display}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isOptionBasedType(type) && (
        <OptionsEditor
          options={(config.options as string[]) ?? []}
          onChange={(options) => setConfig({ ...config, options })}
        />
      )}

      {type === "LINEAR_SCALE" && (
        <div className="scale-config">
          <div className="field">
            <label>Min</label>
            <input
              type="number"
              min={0}
              step={1}
              value={Number(config.min ?? 1)}
              onChange={(e) => setConfig({ ...config, min: sanitizeScaleBound(e.target.value) })}
            />
            <p className="field-hint">Whole numbers only, 0 or greater.</p>
          </div>
          <div className="field">
            <label>Max</label>
            <input
              type="number"
              min={0}
              step={1}
              value={Number(config.max ?? 5)}
              onChange={(e) => setConfig({ ...config, max: sanitizeScaleBound(e.target.value) })}
            />
            <p className="field-hint">Whole numbers only, 0 or greater.</p>
          </div>
          <div className="field">
            <label>Min label (optional)</label>
            <input
              type="text"
              value={(config.minLabel as string) ?? ""}
              onChange={(e) => setConfig({ ...config, minLabel: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Max label (optional)</label>
            <input
              type="text"
              value={(config.maxLabel as string) ?? ""}
              onChange={(e) => setConfig({ ...config, maxLabel: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="checkbox-row" style={{ marginTop: "0.75rem" }}>
        <input
          id={`required-${question.id}`}
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        <label htmlFor={`required-${question.id}`} style={{ marginBottom: 0 }}>
          Required
        </label>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="btn-row" style={{ marginTop: "0.75rem" }}>
        <button className="btn btn--sm" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button className="btn btn--danger btn--sm" disabled={saving} onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
