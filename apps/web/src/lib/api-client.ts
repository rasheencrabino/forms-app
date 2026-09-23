import type {
  AuthResponseDto,
  AuthUserDto,
  CreateFormInput,
  FormDto,
  LoginInput,
  PublicFormDto,
  QuestionType,
  RegisterInput,
  ResponseDto,
  ResponseSummaryDto,
  SubmitResponseInput,
  UpdateFormInput,
  WebhookConfigInput,
  WebhookDeliveryDto,
} from "@forms-app/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The builder edits `config` as a loose, type-agnostic object while the
 * creator is mid-edit (it's reshaped whenever `type` changes — see
 * QuestionEditor/AddQuestionForm), so it isn't worth threading the
 * strict per-type discriminated union through the UI layer. The server's
 * QuestionRequestSchema re-validates the exact per-type shape on arrival
 * regardless — this is just the wire shape the client sends.
 */
interface QuestionRequestBody {
  type: QuestionType;
  label: string;
  required: boolean;
  config: unknown;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = data?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data?.error?.details);
  }

  return data as T;
}

export const api = {
  register: (input: RegisterInput) => request<AuthResponseDto>("/auth/register", { method: "POST", body: input }),
  login: (input: LoginInput) => request<AuthResponseDto>("/auth/login", { method: "POST", body: input }),
  me: (token: string) => request<AuthUserDto>("/auth/me", { token }),

  listForms: (token: string) => request<FormDto[]>("/forms", { token }),
  createForm: (token: string, input: CreateFormInput) =>
    request<FormDto>("/forms", { method: "POST", body: input, token }),
  getForm: (token: string, formId: string) => request<FormDto>(`/forms/${formId}`, { token }),
  updateForm: (token: string, formId: string, input: UpdateFormInput) =>
    request<FormDto>(`/forms/${formId}`, { method: "PATCH", body: input, token }),
  deleteForm: (token: string, formId: string) => request<void>(`/forms/${formId}`, { method: "DELETE", token }),
  publishForm: (token: string, formId: string) => request<FormDto>(`/forms/${formId}/publish`, { method: "POST", token }),
  unpublishForm: (token: string, formId: string) =>
    request<FormDto>(`/forms/${formId}/unpublish`, { method: "POST", token }),

  createQuestion: (token: string, formId: string, input: QuestionRequestBody) =>
    request<FormDto["questions"][number]>(`/forms/${formId}/questions`, { method: "POST", body: input, token }),
  updateQuestion: (token: string, formId: string, questionId: string, input: QuestionRequestBody) =>
    request<FormDto["questions"][number]>(`/forms/${formId}/questions/${questionId}`, {
      method: "PATCH",
      body: input,
      token,
    }),
  deleteQuestion: (token: string, formId: string, questionId: string) =>
    request<void>(`/forms/${formId}/questions/${questionId}`, { method: "DELETE", token }),
  reorderQuestions: (token: string, formId: string, questionIds: string[]) =>
    request<FormDto["questions"]>(`/forms/${formId}/questions/reorder`, {
      method: "PATCH",
      body: { questionIds },
      token,
    }),

  setWebhook: (token: string, formId: string, input: WebhookConfigInput) =>
    request<FormDto>(`/forms/${formId}/webhook`, { method: "PUT", body: input, token }),
  removeWebhook: (token: string, formId: string) => request<FormDto>(`/forms/${formId}/webhook`, { method: "DELETE", token }),
  listDeliveries: (token: string, formId: string) =>
    request<WebhookDeliveryDto[]>(`/forms/${formId}/webhook/deliveries`, { token }),

  listResponses: (token: string, formId: string) =>
    request<ResponseSummaryDto[]>(`/forms/${formId}/responses`, { token }),
  getResponse: (token: string, formId: string, responseId: string) =>
    request<ResponseDto>(`/forms/${formId}/responses/${responseId}`, { token }),

  getPublicForm: (slug: string) => request<PublicFormDto>(`/public/forms/${slug}`),
  submitResponse: (slug: string, input: SubmitResponseInput) =>
    request<ResponseDto>(`/public/forms/${slug}/responses`, { method: "POST", body: input }),

  /** Downloads the XLSX export as a Blob. A plain <a href> can't attach an
   * Authorization header, so the caller fetches the blob and triggers the
   * save itself (see downloadBlob in utils). */
  exportResponses: async (token: string, formId: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/forms/${formId}/responses/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new ApiError("Failed to export responses", res.status);
    }
    return res.blob();
  },
};
