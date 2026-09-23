import { z } from "zod";

/** Consistent error envelope returned by every API error response. */
export const ApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorDto = z.infer<typeof ApiErrorSchema>;
