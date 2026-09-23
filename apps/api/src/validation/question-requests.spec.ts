import { describe, expect, it } from "vitest";
import { QuestionRequestSchema } from "./question-requests";

describe("QuestionRequestSchema", () => {
  it("accepts a valid dropdown question", () => {
    const result = QuestionRequestSchema.safeParse({
      type: "DROPDOWN",
      label: "Favorite color",
      required: true,
      config: { options: ["Red", "Blue"] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a dropdown question with no options", () => {
    const result = QuestionRequestSchema.safeParse({
      type: "DROPDOWN",
      label: "Favorite color",
      required: true,
      config: { options: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a linear scale where max <= min", () => {
    const result = QuestionRequestSchema.safeParse({
      type: "LINEAR_SCALE",
      label: "Rating",
      required: true,
      config: { min: 5, max: 5 },
    });
    expect(result.success).toBe(false);
  });

  it("defaults config to {} for short text questions", () => {
    const result = QuestionRequestSchema.safeParse({
      type: "SHORT_TEXT",
      label: "Name",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown question type", () => {
    const result = QuestionRequestSchema.safeParse({
      type: "FILE_UPLOAD",
      label: "Resume",
      required: false,
      config: {},
    });
    expect(result.success).toBe(false);
  });
});
