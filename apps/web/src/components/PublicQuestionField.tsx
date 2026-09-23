"use client";

import type { AnswerValue, Question } from "@forms-app/shared";
import { QuestionTypeEnum } from "@forms-app/shared";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

interface PublicQuestionFieldProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
}

export function PublicQuestionField({ question, value, onChange, error }: PublicQuestionFieldProps) {
  return (
    <div className="field" data-testid={`question-field-${question.id}`}>
      <label>
        {question.label}
        {question.required && <span className="required-mark">*</span>}
      </label>
      {renderInput(question, value, onChange)}
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

function renderInput(question: Question, value: AnswerValue, onChange: (value: AnswerValue) => void) {
  switch (question.type) {
    case QuestionTypeEnum.SHORT_TEXT:
      return (
        <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      );

    case QuestionTypeEnum.LONG_TEXT:
      return <textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;

    case QuestionTypeEnum.DATE:
      return <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;

    case QuestionTypeEnum.DROPDOWN:
      return (
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Select an option</option>
          {question.config.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case QuestionTypeEnum.MULTI_SELECT:
      // A native <select multiple> requires holding Ctrl/Cmd to pick more
      // than one option (no respondent would discover that) and doesn't
      // look like a dropdown — it's always fully expanded. This renders a
      // real closed-by-default dropdown: click to open, click an option to
      // toggle it into the response, click outside to close.
      return (
        <MultiSelectDropdown
          options={question.config.options}
          selected={(value as string[]) ?? []}
          onChange={onChange}
        />
      );

    case QuestionTypeEnum.MULTIPLE_CHOICE:
      return (
        <div>
          {question.config.options.map((option) => (
            <div className="radio-row" key={option}>
              <input
                type="radio"
                id={`${question.id}-${option}`}
                name={question.id}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <label htmlFor={`${question.id}-${option}`} style={{ marginBottom: 0 }}>
                {option}
              </label>
            </div>
          ))}
        </div>
      );

    case QuestionTypeEnum.CHECKBOXES: {
      const selected = new Set((value as string[]) ?? []);
      return (
        <div>
          {question.config.options.map((option) => (
            <div className="checkbox-row" key={option}>
              <input
                type="checkbox"
                id={`${question.id}-${option}`}
                checked={selected.has(option)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(option);
                  else next.delete(option);
                  onChange([...next]);
                }}
              />
              <label htmlFor={`${question.id}-${option}`} style={{ marginBottom: 0 }}>
                {option}
              </label>
            </div>
          ))}
        </div>
      );
    }

    case QuestionTypeEnum.LINEAR_SCALE: {
      const { min, max, minLabel, maxLabel } = question.config;
      const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div>
          <div className="linear-scale-row">
            {steps.map((step) => (
              <label key={step}>
                <input
                  type="radio"
                  name={question.id}
                  checked={value === step}
                  onChange={() => onChange(step)}
                />
                {step}
              </label>
            ))}
          </div>
          {(minLabel || maxLabel) && (
            <div className="btn-row" style={{ justifyContent: "space-between", color: "var(--color-muted)", fontSize: "0.8rem" }}>
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
