import { Router } from "express";
import { SubmitResponseSchema } from "@forms-app/shared";
import { asyncHandler } from "../middleware/error-handler";
import * as publicFormsService from "../services/public-forms.service";

/**
 * Public, unauthenticated routes — filling out and submitting a published
 * form requires no login. Unpublished/nonexistent forms both 404 here (see
 * public-forms.service.ts comment).
 */
export const publicRouter = Router();

/** @route GET /api/public/forms/:slug */
publicRouter.get(
  "/forms/:slug",
  asyncHandler(async (req, res) => {
    const form = await publicFormsService.getPublicFormBySlug(req.params.slug);
    res.json(form);
  }),
);

/** @route POST /api/public/forms/:slug/responses */
publicRouter.post(
  "/forms/:slug/responses",
  asyncHandler(async (req, res) => {
    const input = SubmitResponseSchema.parse(req.body);
    const response = await publicFormsService.submitResponse(req.params.slug, input);
    res.status(201).json(response);
  }),
);
