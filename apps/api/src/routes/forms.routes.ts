import { Router } from "express";
import {
  CreateFormSchema,
  UpdateFormSchema,
  WebhookConfigSchema,
} from "@forms-app/shared";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { NotFoundError } from "../errors/app-error";
import * as formsService from "../services/forms.service";
import * as questionsService from "../services/questions.service";
import * as responsesService from "../services/responses.service";
import * as webhookService from "../services/webhook.service";
import { buildResponsesWorkbook } from "../services/export.service";
import { QuestionRequestSchema, ReorderQuestionsBodySchema } from "../validation/question-requests";

export const formsRouter = Router();
formsRouter.use(requireAuth);

function actorId(req: AuthenticatedRequest): string {
  if (!req.userId) throw new NotFoundError();
  return req.userId;
}

// ---- Forms -----------------------------------------------------------

/** @route GET /api/forms — list the caller's own forms */
formsRouter.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const forms = await formsService.listForms(actorId(req));
    res.json(forms);
  }),
);

/** @route POST /api/forms */
formsRouter.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = CreateFormSchema.parse(req.body);
    const form = await formsService.createForm(actorId(req), input);
    res.status(201).json(form);
  }),
);

/** @route GET /api/forms/:formId */
formsRouter.get(
  "/:formId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const form = await formsService.getForm(actorId(req), req.params.formId);
    res.json(form);
  }),
);

/** @route PATCH /api/forms/:formId — title/description only */
formsRouter.patch(
  "/:formId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = UpdateFormSchema.parse(req.body);
    const form = await formsService.updateForm(actorId(req), req.params.formId, input);
    res.json(form);
  }),
);

/** @route DELETE /api/forms/:formId */
formsRouter.delete(
  "/:formId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await formsService.deleteForm(actorId(req), req.params.formId);
    res.status(204).send();
  }),
);

/** @route POST /api/forms/:formId/publish */
formsRouter.post(
  "/:formId/publish",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const form = await formsService.setPublishState(actorId(req), req.params.formId, { isPublished: true });
    res.json(form);
  }),
);

/** @route POST /api/forms/:formId/unpublish */
formsRouter.post(
  "/:formId/unpublish",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const form = await formsService.setPublishState(actorId(req), req.params.formId, { isPublished: false });
    res.json(form);
  }),
);

// ---- Questions (sub-resource) -----------------------------------------

/** @route POST /api/forms/:formId/questions — appends to the end */
formsRouter.post(
  "/:formId/questions",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = QuestionRequestSchema.parse(req.body);
    const question = await questionsService.createQuestion(actorId(req), req.params.formId, input);
    res.status(201).json(question);
  }),
);

/** @route PATCH /api/forms/:formId/questions/reorder
 * Must be registered before "/:questionId" so "reorder" isn't captured as
 * a question id. */
formsRouter.patch(
  "/:formId/questions/reorder",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = ReorderQuestionsBodySchema.parse(req.body);
    const questions = await questionsService.reorderQuestions(actorId(req), req.params.formId, input.questionIds);
    res.json(questions);
  }),
);

/** @route PATCH /api/forms/:formId/questions/:questionId — full replace of the question definition */
formsRouter.patch(
  "/:formId/questions/:questionId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = QuestionRequestSchema.parse(req.body);
    const question = await questionsService.updateQuestion(
      actorId(req),
      req.params.formId,
      req.params.questionId,
      input,
    );
    res.json(question);
  }),
);

/** @route DELETE /api/forms/:formId/questions/:questionId */
formsRouter.delete(
  "/:formId/questions/:questionId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await questionsService.deleteQuestion(actorId(req), req.params.formId, req.params.questionId);
    res.status(204).send();
  }),
);

// ---- Webhook (sub-resource) --------------------------------------------

/** @route PUT /api/forms/:formId/webhook — create or replace */
formsRouter.put(
  "/:formId/webhook",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const input = WebhookConfigSchema.parse(req.body);
    const form = await formsService.setWebhook(actorId(req), req.params.formId, input);
    res.json(form);
  }),
);

/** @route DELETE /api/forms/:formId/webhook */
formsRouter.delete(
  "/:formId/webhook",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const form = await formsService.removeWebhook(actorId(req), req.params.formId);
    res.json(form);
  }),
);

/** @route GET /api/forms/:formId/webhook/deliveries */
formsRouter.get(
  "/:formId/webhook/deliveries",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deliveries = await webhookService.listDeliveries(actorId(req), req.params.formId);
    res.json(deliveries);
  }),
);

// ---- Responses (owner view) --------------------------------------------

/** @route GET /api/forms/:formId/responses/export
 * Must be registered before "/:responseId" for the same reason as reorder above. */
formsRouter.get(
  "/:formId/responses/export",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const owner = actorId(req);
    // getForm already verifies ownership (getOwnedFormOrThrow) — pass the
    // now-confirmed formId straight through instead of re-checking it.
    const form = await formsService.getForm(owner, req.params.formId);
    const responses = await responsesService.listResponsesForExport(form.id);
    const workbook = await buildResponsesWorkbook(form, responses);

    const filename = `${form.slug}-responses.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }),
);

/** @route GET /api/forms/:formId/responses — table of submissions */
formsRouter.get(
  "/:formId/responses",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const responses = await responsesService.listResponses(actorId(req), req.params.formId);
    res.json(responses);
  }),
);

/** @route GET /api/forms/:formId/responses/:responseId — full detail */
formsRouter.get(
  "/:formId/responses/:responseId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const response = await responsesService.getResponse(actorId(req), req.params.formId, req.params.responseId);
    res.json(response);
  }),
);
