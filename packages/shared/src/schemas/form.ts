import { z } from "zod";
import { QuestionSchema } from "./question";

export const CreateFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(5000).optional(),
});
export type CreateFormInput = z.infer<typeof CreateFormSchema>;

/**
 * Form-level metadata only. Questions are a sub-resource with their own
 * CRUD + reorder routes (POST/PATCH/DELETE /forms/:id/questions[/:qid],
 * PATCH /forms/:id/questions/reorder) rather than a full-array replace
 * here — keeps each route single-purpose and avoids ambiguous merge
 * semantics for a partial questions array.
 */
export const UpdateFormSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
});
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;

export const SetPublishStateSchema = z.object({
  isPublished: z.boolean(),
});
export type SetPublishStateInput = z.infer<typeof SetPublishStateSchema>;

/** Form as returned to its owner (management views). */
export const FormSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  questions: z.array(QuestionSchema),
  webhook: z
    .object({
      url: z.string(),
      // secret is write-only: creator can set/replace it, it is never read back
      hasSecret: z.boolean(),
    })
    .nullable(),
  responseCount: z.number().int().min(0).optional(),
});
export type FormDto = z.infer<typeof FormSchema>;

/** Form as returned by the public /f/:slug endpoint — no ownerId, no webhook. */
export const PublicFormSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  questions: z.array(QuestionSchema),
});
export type PublicFormDto = z.infer<typeof PublicFormSchema>;
