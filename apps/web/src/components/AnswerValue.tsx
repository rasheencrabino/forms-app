import { formatAnswerForDisplay, type AnsweredQuestion } from "@forms-app/shared";

export function AnswerValue({ answer }: { answer: AnsweredQuestion }) {
  const display = formatAnswerForDisplay(answer.type, answer.value);
  if (!display) {
    return <span style={{ color: "var(--color-muted)" }}>(no answer)</span>;
  }
  return <span>{display}</span>;
}
