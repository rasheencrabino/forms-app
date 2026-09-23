"use client";

import { useState } from "react";
import type { QuestionType } from "@forms-app/shared";
import { QuestionTypeEnum } from "@forms-app/shared";
import { OptionsEditor } from "./OptionsEditor";
import {
  QUESTION_TYPE_OPTIONS,
  defaultConfigForType,
  isOptionBasedType,
  sanitizeScaleBound,
} from "@/lib/question-types-ui";
import type { QuestionEditorValue } from "./QuestionEditor";

interface AddQuestionFormProps {
  onAdd: (value: QuestionEditorValue) => Promise<void>;
}

export function AddQuestionForm({ onAdd }: AddQuestionFormProps) {
  const [type, setType] = useState<QuestionType>(QuestionTypeEnum.SHORT_TEXT);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTypeChange(nextType: QuestionType) {
    setType(nextType);
    setConfig(defaultConfigForType(nextType) as Record<string, unknown>);
  }

  async function handleSubmit() {
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ type, label, required, config });
      setLabel("");
      setRequired(false);
      setConfig(defaultConfigForType(type) as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" data-testid="create-question-form">
      <h2>Add a question</h2>
      <div className="question-card__body" style={{ marginBottom: "0.6rem" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Label</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Your name" />
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
        </div>
      )}

      <div className="checkbox-row" style={{ marginTop: "0.6rem" }}>
        <input
          id="new-question-required"
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        <label htmlFor="new-question-required" style={{ marginBottom: 0 }}>
          Required
        </label>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="btn-row" style={{ marginTop: "0.75rem" }}>
        <button className="btn" disabled={submitting} onClick={handleSubmit} data-testid="add-question-btn">
          {submitting ? "Adding…" : "+ Add question"}
        </button>
      </div>
    </div>
  );
}
