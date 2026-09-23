import { describe, expect, it } from "vitest";
import { validateAnswer } from "./answer-validation";
import { QuestionTypeEnum } from "./question-types";
import type { Question } from "./schemas/question";

function q(overrides: Partial<Question>): Question {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    formId: "22222222-2222-2222-2222-222222222222",
    label: "Q",
    order: 0,
    required: true,
    type: QuestionTypeEnum.SHORT_TEXT,
    config: {},
    ...overrides,
  } as Question;
}

describe("validateAnswer", () => {
  it("rejects a missing required answer", () => {
    const result = validateAnswer(q({ required: true }), undefined);
    expect(result.ok).toBe(false);
  });

  it("allows a missing optional answer", () => {
    const result = validateAnswer(q({ required: false }), undefined);
    expect(result).toEqual({ ok: true, value: null });
  });

  it("rejects a dropdown value not in the configured options", () => {
    const question = q({
      type: QuestionTypeEnum.DROPDOWN,
      config: { options: ["a", "b"] },
    });
    const result = validateAnswer(question, "c");
    expect(result.ok).toBe(false);
  });

  it("accepts a dropdown value that is in the configured options", () => {
    const question = q({
      type: QuestionTypeEnum.DROPDOWN,
      config: { options: ["a", "b"] },
    });
    expect(validateAnswer(question, "a")).toEqual({ ok: true, value: "a" });
  });

  it("rejects a checkboxes answer containing an option outside the list", () => {
    const question = q({
      type: QuestionTypeEnum.CHECKBOXES,
      required: false,
      config: { options: ["a", "b"] },
    });
    expect(validateAnswer(question, ["a", "z"]).ok).toBe(false);
  });

  it("rejects a linear scale answer outside the configured range", () => {
    const question = q({
      type: QuestionTypeEnum.LINEAR_SCALE,
      config: { min: 1, max: 5 },
    });
    expect(validateAnswer(question, 8).ok).toBe(false);
    expect(validateAnswer(question, 3)).toEqual({ ok: true, value: 3 });
  });

  it("rejects a non-integer linear scale answer", () => {
    const question = q({
      type: QuestionTypeEnum.LINEAR_SCALE,
      config: { min: 1, max: 5 },
    });
    expect(validateAnswer(question, 2.5).ok).toBe(false);
  });
});
