import { z } from "zod";
import { QuestionInputSchema } from "./question";

/** What a respondent submits: the system-level email plus one raw value per question. */
export const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  value: z.unknown(),
});

export const SubmitResponseSchema = z.object({
  email: z.string().trim().email("Must be a valid email address"),
  answers: z.array(SubmitAnswerSchema),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseSchema>;

/**
 * A single answered question, as snapshotted onto the response at submit
 * time. See `docs`/README "Responses surviving form edits" — every field of
 * the question the respondent saw (label, type, config, required-ness) is
 * copied here, so the response never needs to join back to the live
 * `questions` table to render correctly.
 */
export const AnsweredQuestionSchema = z.intersection(
  QuestionInputSchema,
  z.object({
    id: z.string().uuid(),
    value: z.union([z.string(), z.array(z.string()), z.number(), z.null()]),
  }),
);
export type AnsweredQuestion = z.infer<typeof AnsweredQuestionSchema>;

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  email: z.string(),
  submittedAt: z.string(),
  answers: z.array(AnsweredQuestionSchema),
});
export type ResponseDto = z.infer<typeof ResponseSchema>;

/** Row shape for the responses table view (no need to ship every answer). */
export const ResponseSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  submittedAt: z.string(),
  answerCount: z.number().int(),
});
export type ResponseSummaryDto = z.infer<typeof ResponseSummarySchema>;
