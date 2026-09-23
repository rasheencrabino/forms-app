import { z } from "zod";
import {
  LinearScaleConfigSchema,
  NoConfigSchema,
  OptionsConfigSchema,
  QuestionTypeEnum,
} from "@forms-app/shared";

/**
 * Request-body schemas for the question sub-resource routes.
 *
 * These intentionally omit `order` and `id`/`formId`: order is managed only
 * by the dedicated reorder endpoint (POST /forms/:id/questions appends to
 * the end; PATCH .../reorder is the only way to change position), and
 * identity comes from the URL / is server-generated. The per-type `config`
 * validation is imported straight from @forms-app/shared so the create and
 * update paths can never drift from the canonical question-config rules.
 */
const questionBodyFields = {
  label: z.string().trim().min(1, "Label is required").max(500),
  required: z.boolean(),
};

export const QuestionRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(QuestionTypeEnum.SHORT_TEXT), ...questionBodyFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.LONG_TEXT), ...questionBodyFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.DATE), ...questionBodyFields, config: NoConfigSchema.default({}) }),
  z.object({ type: z.literal(QuestionTypeEnum.DROPDOWN), ...questionBodyFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.MULTI_SELECT), ...questionBodyFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.MULTIPLE_CHOICE), ...questionBodyFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.CHECKBOXES), ...questionBodyFields, config: OptionsConfigSchema }),
  z.object({ type: z.literal(QuestionTypeEnum.LINEAR_SCALE), ...questionBodyFields, config: LinearScaleConfigSchema }),
]);
export type QuestionRequestInput = z.infer<typeof QuestionRequestSchema>;

export const ReorderQuestionsBodySchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});
export type ReorderQuestionsBody = z.infer<typeof ReorderQuestionsBodySchema>;
