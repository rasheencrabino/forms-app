import type {
  CreateFormInput,
  FormDto,
  SetPublishStateInput,
  UpdateFormInput,
  WebhookConfigInput,
} from "@forms-app/shared";
import { prisma } from "../db";
import { BadRequestError, NotFoundError } from "../errors/app-error";
import { toFormDto } from "../mappers";
import { generateUniqueSlug } from "../utils/slug";
import { assertSafeWebhookUrl } from "../utils/webhook-url-safety";
import type { Form as PrismaForm, Question as PrismaQuestion } from "../generated/prisma";

/**
 * Fetches a form and asserts it belongs to `ownerId`. Returns 404 (not 403)
 * on mismatch — a form a user doesn't own should look indistinguishable
 * from a form that doesn't exist, so existence can't be probed for.
 */
export async function getOwnedFormOrThrow(
  ownerId: string,
  formId: string,
): Promise<PrismaForm & { questions: PrismaQuestion[] }> {
  const form = await prisma.form.findFirst({
    where: { id: formId, ownerId },
    include: { questions: true },
  });
  if (!form) {
    throw new NotFoundError("Form not found");
  }
  return form;
}

export async function createForm(ownerId: string, input: CreateFormInput): Promise<FormDto> {
  const slug = await generateUniqueSlug(input.title);
  const form = await prisma.form.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description ?? null,
      slug,
    },
    include: { questions: true },
  });
  return toFormDto(form);
}

export async function listForms(ownerId: string): Promise<FormDto[]> {
  const forms = await prisma.form.findMany({
    where: { ownerId },
    include: { questions: true, _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return forms.map((form) => toFormDto(form, { responseCount: form._count.responses }));
}

export async function getForm(ownerId: string, formId: string): Promise<FormDto> {
  const form = await getOwnedFormOrThrow(ownerId, formId);
  const responseCount = await prisma.response.count({ where: { formId } });
  return toFormDto(form, { responseCount });
}

export async function updateForm(ownerId: string, formId: string, input: UpdateFormInput): Promise<FormDto> {
  await getOwnedFormOrThrow(ownerId, formId);
  const form = await prisma.form.update({
    where: { id: formId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: { questions: true },
  });
  return toFormDto(form);
}

export async function deleteForm(ownerId: string, formId: string): Promise<void> {
  await getOwnedFormOrThrow(ownerId, formId);
  await prisma.form.delete({ where: { id: formId } });
}

export async function setPublishState(
  ownerId: string,
  formId: string,
  input: SetPublishStateInput,
): Promise<FormDto> {
  await getOwnedFormOrThrow(ownerId, formId);
  const form = await prisma.form.update({
    where: { id: formId },
    data: { isPublished: input.isPublished },
    include: { questions: true },
  });
  return toFormDto(form);
}

export async function setWebhook(ownerId: string, formId: string, input: WebhookConfigInput): Promise<FormDto> {
  const existing = await getOwnedFormOrThrow(ownerId, formId);
  if (!input.secret && !existing.webhookSecret) {
    throw new BadRequestError("A secret is required when configuring a webhook for the first time");
  }
  assertSafeWebhookUrl(input.url);

  const form = await prisma.form.update({
    where: { id: formId },
    // Omitting `secret` on the request keeps whatever is already stored —
    // this is how the webapp's "leave blank to keep the current one" flow
    // (see the webhook settings page) actually works server-side.
    data: { webhookUrl: input.url, ...(input.secret ? { webhookSecret: input.secret } : {}) },
    include: { questions: true },
  });
  return toFormDto(form);
}

export async function removeWebhook(ownerId: string, formId: string): Promise<FormDto> {
  await getOwnedFormOrThrow(ownerId, formId);
  const form = await prisma.form.update({
    where: { id: formId },
    data: { webhookUrl: null, webhookSecret: null },
    include: { questions: true },
  });
  return toFormDto(form);
}
