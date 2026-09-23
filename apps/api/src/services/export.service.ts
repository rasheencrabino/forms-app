import ExcelJS from "exceljs";
import { formatAnswerForDisplay, type FormDto, type QuestionType, type ResponseDto } from "@forms-app/shared";

/**
 * Builds the XLSX workbook for a form's responses.
 *
 * Column strategy: one row per response; columns are email, submitted-at,
 * then one column per question **in the form's current question order**.
 * Because responses snapshot their own question definitions (see README),
 * a response can reference a question that no longer exists in the live
 * form (deleted) or use a label that has since changed. Deleted questions
 * still get a trailing column (using the label/order captured in whichever
 * response snapshot introduced it) so no historical data is silently
 * dropped from the export; live questions always keep their current label
 * and position.
 */
export async function buildResponsesWorkbook(form: FormDto, responses: ResponseDto[]): Promise<ExcelJS.Workbook> {
  const columnMeta = new Map<string, { label: string; order: number }>();

  for (const q of form.questions) {
    columnMeta.set(q.id, { label: q.label, order: q.order });
  }

  let deletedOrderCursor = form.questions.length + 1000;
  for (const response of responses) {
    for (const answer of response.answers) {
      if (!columnMeta.has(answer.id)) {
        columnMeta.set(answer.id, { label: `${answer.label} (deleted)`, order: deletedOrderCursor++ });
      }
    }
  }

  const orderedColumns = [...columnMeta.entries()].sort((a, b) => a[1].order - b[1].order);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Forms App";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Responses");
  sheet.columns = [
    { header: "Email", key: "email", width: 30 },
    { header: "Submitted At", key: "submittedAt", width: 24 },
    ...orderedColumns.map(([id, meta]) => ({ header: meta.label, key: id, width: 28 })),
  ];

  for (const response of responses) {
    const row: Record<string, string> = {
      email: response.email,
      submittedAt: new Date(response.submittedAt).toISOString(),
    };
    for (const answer of response.answers) {
      row[answer.id] = formatAnswerForDisplay(answer.type as QuestionType, answer.value);
    }
    sheet.addRow(row);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook;
}
