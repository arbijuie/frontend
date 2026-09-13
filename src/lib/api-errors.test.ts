import { ApiValidationError, parseApiError } from "./api-errors";

describe("parseApiError", () => {
  it("maps a 422 response into field errors", async () => {
    const body = {
      detail: [
        { loc: ["body", "end"], msg: "end must be after start" },
        { loc: ["body", "entry_score_bps"], msg: "must be a number" },
      ],
    };
    const res = new Response(JSON.stringify(body), { status: 422 });
    const error = await parseApiError(res);

    expect(error).toBeInstanceOf(ApiValidationError);
    expect((error as ApiValidationError).fieldErrors).toEqual({
      end: "end must be after start",
      entry_score_bps: "must be a number",
    });
  });

  it("falls back to a generic error for non-422 responses", async () => {
    const res = new Response("", { status: 500 });
    const error = await parseApiError(res);

    expect(error).not.toBeInstanceOf(ApiValidationError);
    expect(error.message).toContain("500");
  });

  it("falls back to a generic error if the 422 body cannot be parsed", async () => {
    const res = new Response("not json", { status: 422 });
    const error = await parseApiError(res);

    expect(error).not.toBeInstanceOf(ApiValidationError);
  });
});
