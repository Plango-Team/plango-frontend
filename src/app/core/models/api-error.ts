export type ApiValidationError = {
  field: string;
  message: string;
};

export type ApiErrorPayload = {
  status?: string;
  message?: string;
  code?: string;
  errors?: ApiValidationError[];
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
    readonly retryAfterSeconds?: number,
    readonly rawCause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
