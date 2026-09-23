import { z } from "zod";
import { QuestionTypeEnum } from "../question-types";

/**
 * Per-type config schemas.
 *
 * Design: rather than one loose `config: Record<string, unknown>` column,
 * every question type has an explicit, statically-typed config shape. Text /
 * date types carry an empty object (nothing to configure); option-based
 * types carry `{ options: string[] }`; linear scale carries its numeric
 * range + optional end labels. This is the single source of truth for both
 * "what the creator configures" and "what the respondent may submit" — the
 * answer validator (answer-validation.ts) reads this same config at submit
 * time to check option membership / range bounds.
 */
export const NoConfigSchema = z.object({}).strict();

export const OptionsConfigSchema = z.object({
  options: z
    .array(z.string().trim().min(1, "Option text cannot be empty"))
    .min(1, "At least one option is required")
    .refine((opts) => new Set(opts).size === opts.length, {
      message: "Options must be unique",
    }),
});

export const LinearScaleConfigSchema = z
  .object({
    min: z.number().int().min(0, "Min must be 0 or greater"),
    max: z.number().int().min(0, "Max must be 0 or greater"),
    minLabel: z.string().trim().max(200).optional(),
    maxLabel: z.string().trim().max(200).optional(),
  })
  .refine((cfg) => cfg.max > cfg.min, {
    message: "max must be greater than min",
    path: ["max"],
  })
  .refine((cfg) => cfg.max - cfg.min <= 100, {
    message: "Range is too large (max 100 steps)",
    path: ["max"],
  });

export type NoConfig = z.infer<typeof NoConfigSchema>;
export type OptionsConfig = z.infer<typeof OptionsConfigSchema>;
export type LinearScaleConfig = z.infer<typeof LinearScaleConfigSchema>;

const baseQuestionFields = {
  label: z.string().trim().min(1, "Label is required").max(500),
  order: z.number().int().min(0),
  required: z.boolean(),
};

/**
 * Discriminated union keyed by `type`. This is the shape used both for
 * "create/update question" request bodies and for the question definition
 * embedded in a form/response payload. Because it's a discriminated union,
 * `config` is statically tied to `type` at the type level — a DROPDOWN
 * question cannot accidentally carry a LinearScaleConfig.
 */
export const QuestionInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(QuestionTypeEnum.SHORT_TEXT), ...baseQuestionFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.LONG_TEXT), ...baseQuestionFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.DATE), ...baseQuestionFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.DROPDOWN), ...baseQuestionFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.MULTI_SELECT), ...baseQuestionFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.MULTIPLE_CHOICE), ...baseQuestionFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.CHECKBOXES), ...baseQuestionFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.LINEAR_SCALE), ...baseQuestionFields, config: LinearScaleConfigSchema }),
]);

export type QuestionInput = z.infer<typeof QuestionInputSchema>;

/** A question as returned by the API — input fields plus persisted identity. */
export const QuestionSchema = z.intersection(
  QuestionInputSchema,
  z.object({
    id: z.string().uuid(),
    formId: z.string().uuid(),
  }),
);

export type Question = z.infer<typeof QuestionSchema>;

/** Bulk reorder payload: an ordered list of question ids. */
export const ReorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type ReorderQuestionsInput = z.infer<typeof ReorderQuestionsSchema>;
