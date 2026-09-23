/**
 * Single source of truth for question types. Never hardcode these strings —
 * import QuestionTypeEnum (or QuestionType for the union type) everywhere.
 */
export const QuestionTypeEnum = {
  SHORT_TEXT: "SHORT_TEXT",
  LONG_TEXT: "LONG_TEXT",
  DATE: "DATE",
  DROPDOWN: "DROPDOWN",
  MULTI_SELECT: "MULTI_SELECT",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  CHECKBOXES: "CHECKBOXES",
  LINEAR_SCALE: "LINEAR_SCALE",
} as const;

export type QuestionType = (typeof QuestionTypeEnum)[keyof typeof QuestionTypeEnum];

export const QUESTION_TYPES = Object.values(QuestionTypeEnum) as QuestionType[];

/** Question types whose config carries a fixed `options` list and whose
 * answers must be validated against that list. */
export const OPTION_BASED_TYPES: QuestionType[] = [
  QuestionTypeEnum.DROPDOWN,
  QuestionTypeEnum.MULTI_SELECT,
  QuestionTypeEnum.MULTIPLE_CHOICE,
  QuestionTypeEnum.CHECKBOXES,
];

/** Question types whose answer is an array of selected values rather than a
 * single scalar. */
export const MULTI_VALUE_TYPES: QuestionType[] = [
  QuestionTypeEnum.MULTI_SELECT,
  QuestionTypeEnum.CHECKBOXES,
];

export function isOptionBased(type: QuestionType): boolean {
  return OPTION_BASED_TYPES.includes(type);
}

export function isMultiValue(type: QuestionType): boolean {
  return MULTI_VALUE_TYPES.includes(type);
}
