import type { Question } from "@forms-app/shared";
import { prisma } from "../db";
import { BadRequestError, NotFoundError } from "../errors/app-error";
import { toQuestionDto } from "../mappers";
import { getOwnedFormOrThrow } from "./forms.service";
import type { QuestionRequestInput } from "../validation/question-requests";

export async function createQuestion(
  ownerId: string,
  formId: string,
  input: QuestionRequestInput,
): Promise<Question> {
  await getOwnedFormOrThrow(ownerId, formId);

  // Order is server-assigned (append to end) — the client never dictates
  // position on create; reordering afterwards is an explicit, separate
  // action (see reorderQuestions). The read-then-write is wrapped in a
  // transaction to narrow the window for a race (two concurrent creates on
  // the same form reading the same max before either commits); this isn't
  // airtight under Postgres's default READ COMMITTED isolation, but `order`
  // is a display-ordering hint rather than a uniqueness-enforcing identity
  // field — a rare collision would only produce an ambiguous sort tiebreak
  // for that one moment, self-correcting the next time anyone reorders, not
  // data corruption. Full correctness would need SERIALIZABLE isolation (or
  // a single atomic `INSERT ... SELECT max()+1`) with retry-on-conflict
  // handling, which is more machinery than this single-owner builder action
  // warrants.
  const question = await prisma.$transaction(async (tx) => {
    const { _max } = await tx.question.aggregate({ where: { formId }, _max: { order: true } });
    const nextOrder = (_max.order ?? -1) + 1;
    return tx.question.create({
      data: {
        formId,
        type: input.type,
        label: input.label,
        required: input.required,
        config: input.config,
        order: nextOrder,
      },
    });
  });
  return toQuestionDto(question);
}

export async function updateQuestion(
  ownerId: string,
  formId: string,
  questionId: string,
  input: QuestionRequestInput,
): Promise<Question> {
  await getOwnedFormOrThrow(ownerId, formId);
  const existing = await prisma.question.findFirst({ where: { id: questionId, formId } });
  if (!existing) {
    throw new NotFoundError("Question not found");
  }

  // Any edit — including a type change — updates the row in place, keeping
  // the same id. This mirrors Google Forms' own model: the question is a
  // single mutable identity, and a linked spreadsheet's column header gets
  // overwritten to match whatever the question currently says on the next
  // submission, rather than forking old and new answers into separate
  // columns. The tradeoff (a drastic edit — e.g. relabeling "name" to
  // "date" — can make an XLSX export column header look inconsistent with
  // older rows answered under the previous wording/type) is accepted
  // deliberately, matching that same tradeoff in Google Forms. This does
  // NOT affect the response detail view, which always renders each
  // response's own frozen snapshot (label/type/value as answered) — that
  // guarantee holds regardless of how later edits are handled here.
  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      type: input.type,
      label: input.label,
      required: input.required,
      config: input.config,
    },
  });
  return toQuestionDto(question);
}

export async function deleteQuestion(ownerId: string, formId: string, questionId: string): Promise<void> {
  await getOwnedFormOrThrow(ownerId, formId);
  const existing = await prisma.question.findFirst({ where: { id: questionId, formId } });
  if (!existing) {
    throw new NotFoundError("Question not found");
  }
  await prisma.question.delete({ where: { id: questionId } });
}

export async function reorderQuestions(
  ownerId: string,
  formId: string,
  questionIds: string[],
): Promise<Question[]> {
  const form = await getOwnedFormOrThrow(ownerId, formId);

  const existingIds = new Set(form.questions.map((q) => q.id));
  const incomingIds = new Set(questionIds);
  if (existingIds.size !== incomingIds.size || [...existingIds].some((id) => !incomingIds.has(id))) {
    throw new BadRequestError("questionIds must be exactly the form's current question ids, each once");
  }

  await prisma.$transaction(
    questionIds.map((id, index) =>
      prisma.question.update({ where: { id }, data: { order: index } }),
    ),
  );

  const updated = await prisma.question.findMany({ where: { formId }, orderBy: { order: "asc" } });
  return updated.map(toQuestionDto);
}
