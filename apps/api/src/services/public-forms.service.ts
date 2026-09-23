import type { PublicFormDto, ResponseDto, SubmitResponseInput } from "@forms-app/shared";
import { validateAnswer } from "@forms-app/shared";
import { prisma } from "../db";
import { NotFoundError, ValidationError } from "../errors/app-error";
import { toQuestionDto } from "../mappers";
import { deliverWebhookAndLog } from "./webhook.service";

/** Fetches a form by slug for the public fill page. Unpublished forms are
 * treated exactly like nonexistent ones (404) — the spec requires the
 * public URL to "not accept submissions" while a draft, and the safest way
 * to enforce that is to not expose the form at all. */
export async function getPublicFormBySlug(slug: string): Promise<PublicFormDto> {
  const form = await prisma.form.findFirst({
    where: { slug, isPublished: true },
    include: { questions: true },
  });
  if (!form) {
    throw new NotFoundError("Form not found");
  }
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    questions: [...form.questions].sort((a, b) => a.order - b.order).map(toQuestionDto),
  };
}

export async function submitResponse(slug: string, input: SubmitResponseInput): Promise<ResponseDto> {
  const form = await prisma.form.findFirst({
    where: { slug, isPublished: true },
    include: { questions: true },
  });
  if (!form) {
    throw new NotFoundError("Form not found");
  }

  const answersByQuestionId = new Map(input.answers.map((a) => [a.questionId, a.value]));
  // Keyed by questionId (not just the message text) so the client can map
  // an error back onto the exact field that produced it — two questions
  // can share the same label (nothing enforces uniqueness), and matching
  // on message-text-contains-label would incorrectly flag both.
  const errors: { questionId: string; message: string }[] = [];

  const snapshot = [...form.questions]
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const question = toQuestionDto(row);
      const raw = answersByQuestionId.get(question.id);
      const result = validateAnswer(question, raw);
      if (!result.ok) {
        errors.push({ questionId: question.id, message: result.error });
        return null;
      }
      const { formId: _formId, ...rest } = question;
      return { ...rest, value: result.value };
    });

  if (errors.length > 0) {
    throw new ValidationError("One or more answers are invalid", { errors });
  }

  const response = await prisma.response.create({
    data: {
      formId: form.id,
      email: input.email,
      answers: snapshot as object[],
    },
  });

  const dto: ResponseDto = {
    id: response.id,
    formId: response.formId,
    email: response.email,
    submittedAt: response.submittedAt.toISOString(),
    answers: snapshot as ResponseDto["answers"],
  };

  // Fire-and-forget: the submission is already committed above. A slow or
  // failing webhook must never block/fail the respondent's request, so we
  // deliberately do not await this — it runs, logs its own outcome, and the
  // caller has already gotten its 201 response.
  if (form.webhookUrl && form.webhookSecret) {
    void deliverWebhookAndLog({
      formId: form.id,
      formTitle: form.title,
      webhookUrl: form.webhookUrl,
      webhookSecret: form.webhookSecret,
      response: dto,
    });
  }

  return dto;
}
