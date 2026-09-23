import type { AnsweredQuestion, ResponseDto, ResponseSummaryDto } from "@forms-app/shared";
import { prisma } from "../db";
import { NotFoundError } from "../errors/app-error";
import { getOwnedFormOrThrow } from "./forms.service";

export async function listResponses(ownerId: string, formId: string): Promise<ResponseSummaryDto[]> {
  await getOwnedFormOrThrow(ownerId, formId);
  const rows = await prisma.response.findMany({
    where: { formId },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    submittedAt: row.submittedAt.toISOString(),
    answerCount: (row.answers as AnsweredQuestion[]).length,
  }));
}

export async function getResponse(ownerId: string, formId: string, responseId: string): Promise<ResponseDto> {
  await getOwnedFormOrThrow(ownerId, formId);
  const row = await prisma.response.findFirst({ where: { id: responseId, formId } });
  if (!row) {
    throw new NotFoundError("Response not found");
  }
  return {
    id: row.id,
    formId: row.formId,
    email: row.email,
    submittedAt: row.submittedAt.toISOString(),
    answers: row.answers as AnsweredQuestion[],
  };
}

/**
 * Full response rows (with snapshot answers) for the given form, in
 * submission order — used by the XLSX export. Not paginated: exports are a
 * one-shot bulk operation.
 *
 * Deliberately takes only `formId`, no `ownerId` — the export route already
 * calls `getOwnedFormOrThrow` once to build the workbook's form metadata,
 * so re-checking ownership here would just repeat the same query. Only call
 * this after ownership has already been verified for this request.
 */
export async function listResponsesForExport(formId: string): Promise<ResponseDto[]> {
  const rows = await prisma.response.findMany({
    where: { formId },
    orderBy: { submittedAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    formId: row.formId,
    email: row.email,
    submittedAt: row.submittedAt.toISOString(),
    answers: row.answers as AnsweredQuestion[],
  }));
}
