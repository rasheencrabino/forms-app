import { OPTION_BASED_TYPES, QuestionTypeEnum, type QuestionType } from "@forms-app/shared";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionTypeEnum.SHORT_TEXT]: "Short text",
  [QuestionTypeEnum.LONG_TEXT]: "Long text",
  [QuestionTypeEnum.DATE]: "Date",
  [QuestionTypeEnum.DROPDOWN]: "Dropdown",
  [QuestionTypeEnum.MULTI_SELECT]: "Multi-select dropdown",
  [QuestionTypeEnum.MULTIPLE_CHOICE]: "Multiple choice",
  [QuestionTypeEnum.CHECKBOXES]: "Checkboxes",
  [QuestionTypeEnum.LINEAR_SCALE]: "Linear scale",
};

export const QUESTION_TYPE_OPTIONS = Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][];

export function isOptionBasedType(type: QuestionType): boolean {
  return (OPTION_BASED_TYPES as string[]).includes(type);
}

/** Linear-scale min/max must be non-negative whole numbers (mirrors
 * LinearScaleConfigSchema in @forms-app/shared, the server-side source of
 * truth) — clamps and rounds whatever the creator types into the Min/Max
 * fields so the builder can never end up holding a value the server would
 * reject on save. */
export function sanitizeScaleBound(rawValue: string): number {
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

/** A sensible default config to seed when a question type is (re)selected
 * in the builder, before the creator customizes it. */
export function defaultConfigForType(type: QuestionType): unknown {
  switch (type) {
    case QuestionTypeEnum.DROPDOWN:
    case QuestionTypeEnum.MULTI_SELECT:
    case QuestionTypeEnum.MULTIPLE_CHOICE:
    case QuestionTypeEnum.CHECKBOXES:
      return { options: ["Option 1", "Option 2"] };
    case QuestionTypeEnum.LINEAR_SCALE:
      return { min: 1, max: 5 };
    default:
      return {};
  }
}
