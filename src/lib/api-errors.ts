export class ApiValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message);
    this.name = "ApiValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/** Why a request failed, so the UI can say what to do about it (issue #508). */
export type ApiErrorKind = "auth" | "validation" | "runtime" | "server" | "network";

/**
 * A non-2xx API answer. `code` is the runtime's stable reason code when the body carries one
 * (`{"detail": {"code": ..., "message": ...}}`), `kind` groups the status for the operator:
 * `auth` (401/403), `validation` (400/404/422), `runtime` (409: a gate, guardrail, or state
 * refused the action), `server` (5xx).
 */
export class ApiRequestError extends Error {
  status: number;
  code: string | null;
  kind: ApiErrorKind;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.kind = classifyStatus(status);
  }
}

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 404 || status === 422) return "validation";
  if (status === 409) return "runtime";
  if (status >= 500) return "server";
  return "network";
}

interface RawValidationDetail {
  loc: (string | number)[];
  msg: string;
}

function isValidationDetail(detail: unknown): detail is RawValidationDetail[] {
  return (
    Array.isArray(detail) &&
    detail.every(
      (item) =>
        typeof item === "object" && item !== null && Array.isArray((item as { loc?: unknown }).loc)
    )
  );
}

export async function parseApiError(res: Response): Promise<Error> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON; fall through to the status-only error.
  }
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (res.status === 422 && isValidationDetail(detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const item of detail) {
      const field = String(item.loc[item.loc.length - 1]);
      fieldErrors[field] = item.msg;
    }
    return new ApiValidationError("Validation failed", fieldErrors);
  }

  if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
    const record = detail as { code?: unknown; message?: unknown };
    const code = typeof record.code === "string" ? record.code : null;
    const message =
      typeof record.message === "string" ? record.message : `Request failed: ${res.status}`;
    return new ApiRequestError(message, res.status, code);
  }
  if (typeof detail === "string" && detail) {
    return new ApiRequestError(detail, res.status, null);
  }
  return new ApiRequestError(`Request failed: ${res.status}`, res.status, null);
}

/** One operator-facing line: what failed and the next step. */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiValidationError) {
    const fields = Object.entries(error.fieldErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join("; ");
    return fields ? `Check the form: ${fields}` : "Check the form: validation failed.";
  }
  if (error instanceof ApiRequestError) {
    const code = error.code ? ` (${error.code})` : "";
    switch (error.kind) {
      case "auth":
        return `Not authorized${code}: sign in again or check the API token.`;
      case "validation":
        return `Rejected request${code}: ${error.message}`;
      case "runtime":
        return `Runtime refused${code}: ${error.message}`;
      case "server":
        return `Runtime error${code}: ${error.message}. Check /status and the collector logs.`;
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
