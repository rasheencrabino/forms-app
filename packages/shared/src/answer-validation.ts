import { z } from "zod";
import { QuestionTypeEnum, isMultiValue, type QuestionType } from "./question-types";
import type { Question } from "./schemas/question";

/**
 * Answer values are dynamically shaped by the question they answer — a
 * DROPDOWN answer must be validated against *that question's* configured
 * options, a LINEAR_SCALE answer against *that question's* configured
 * range. That can't be expressed as a single static Zod schema (Zod schemas
 * don't see sibling data), so validation is a plain function that takes the
 * question definition + a raw value and returns a typed result.
 *
 * This is the ONE place answer validation happens. The API's submit route
 * calls this per-question; nothing about "is this a valid option" or "is
 * this within range" is duplicated anywhere else.
 */

export type AnswerValue = string | string[] | number | null;

export type AnswerValidationResult =
  | { ok: true; value: AnswerValue }
  | { ok: false; error: string };

const dateStringSchema = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "must be a valid date",
});

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

export function validateAnswer(question: Question, rawValue: unknown): AnswerValidationResult {
  if (isEmpty(rawValue)) {
    if (question.required) {
      return { ok: false, error: `"${question.label}" is required` };
    }
    return { ok: true, value: isMultiValue(question.type) ? [] : null };
  }

  switch (question.type) {
    case QuestionTypeEnum.SHORT_TEXT:
    case QuestionTypeEnum.LONG_TEXT: {
      const parsed = z.string().max(10_000).safeParse(rawValue);
      if (!parsed.success) return { ok: false, error: `"${question.label}" must be text` };
      return { ok: true, value: parsed.data };
    }

    case QuestionTypeEnum.DATE: {
      const parsed = dateStringSchema.safeParse(rawValue);
      if (!parsed.success) return { ok: false, error: `"${question.label}" must be a valid date` };
      return { ok: true, value: parsed.data };
    }

    case QuestionTypeEnum.DROPDOWN:
    case QuestionTypeEnum.MULTIPLE_CHOICE: {
      const parsed = z.string().safeParse(rawValue);
      if (!parsed.success) return { ok: false, error: `"${question.label}" must be a single option` };
      if (!question.config.options.includes(parsed.data)) {
        return { ok: false, error: `"${question.label}" contains an option that is not allowed` };
      }
      return { ok: true, value: parsed.data };
    }

    case QuestionTypeEnum.MULTI_SELECT:
    case QuestionTypeEnum.CHECKBOXES: {
      const parsed = z.array(z.string()).safeParse(rawValue);
      if (!parsed.success) return { ok: false, error: `"${question.label}" must be a list of options` };
      const invalid = parsed.data.filter((v) => !question.config.options.includes(v));
      if (invalid.length > 0) {
        return { ok: false, error: `"${question.label}" contains an option that is not allowed` };
      }
      return { ok: true, value: Array.from(new Set(parsed.data)) };
    }

    case QuestionTypeEnum.LINEAR_SCALE: {
      const parsed = z.coerce.number().int().safeParse(rawValue);
      if (!parsed.success) {
        return { ok: false, error: `"${question.label}" must be a whole number` };
      }
      const { min, max } = question.config;
      if (parsed.data < min || parsed.data > max) {
        return { ok: false, error: `"${question.label}" must be between ${min} and ${max}` };
      }
      return { ok: true, value: parsed.data };
    }

    default: {
      const _exhaustive: never = question;
      return { ok: false, error: "Unsupported question type" };
    }
  }
}

export function formatAnswerForDisplay(type: QuestionType, value: AnswerValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
