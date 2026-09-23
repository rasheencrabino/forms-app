import type { Question as PrismaQuestion, Form as PrismaForm } from "./generated/prisma";
import type { FormDto, Question } from "@forms-app/shared";

export function toQuestionDto(row: PrismaQuestion): Question {
  return {
    id: row.id,
    formId: row.formId,
    type: row.type as Question["type"],
    label: row.label,
    required: row.required,
    order: row.order,
    config: row.config as Question["config"],
  } as Question;
}

export function toFormDto(
  row: PrismaForm & { questions: PrismaQuestion[] },
  opts: { responseCount?: number } = {},
): FormDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    slug: row.slug,
    isPublished: row.isPublished,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    questions: [...row.questions].sort((a, b) => a.order - b.order).map(toQuestionDto),
    webhook: row.webhookUrl ? { url: row.webhookUrl, hasSecret: Boolean(row.webhookSecret) } : null,
    responseCount: opts.responseCount,
  };
}
