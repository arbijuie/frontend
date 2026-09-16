export class ApiValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message);
    this.name = "ApiValidationError";
    this.fieldErrors = fieldErrors;
  }
}

interface RawValidationDetail {
  loc: (string | number)[];
  msg: string;
}

export async function parseApiError(res: Response): Promise<Error> {
  if (res.status === 422) {
    try {
      const body = await res.json();
      const detail: RawValidationDetail[] = body.detail ?? [];
      const fieldErrors: Record<string, string> = {};
      for (const item of detail) {
        const field = String(item.loc[item.loc.length - 1]);
        fieldErrors[field] = item.msg;
      }
      return new ApiValidationError("Validation failed", fieldErrors);
    } catch {
      // Response body isn't valid JSON or doesn't match the expected
      // validation-error shape — fall back to the generic error below.
    }
  }
  return new Error(`Request failed: ${res.status}`);
}
