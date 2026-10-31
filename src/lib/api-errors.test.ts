import {
  ApiRequestError,
  ApiValidationError,
  classifyStatus,
  describeApiError,
  parseApiError,
} from "./api-errors";

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

describe("ApiRequestError", () => {
  it("carries the runtime reason code and classifies the status", async () => {
    const body = { detail: { code: "acceptance_evidence_missing", message: "Gate is closed" } };
    const error = await parseApiError(new Response(JSON.stringify(body), { status: 409 }));

    expect(error).toBeInstanceOf(ApiRequestError);
    const request = error as ApiRequestError;
    expect(request.code).toBe("acceptance_evidence_missing");
    expect(request.kind).toBe("runtime");
    expect(request.message).toBe("Gate is closed");
  });

  it("maps plain-string details and statuses to kinds", async () => {
    const auth = (await parseApiError(
      new Response(JSON.stringify({ detail: "Invalid or missing authentication" }), { status: 401 })
    )) as ApiRequestError;
    expect(auth.kind).toBe("auth");
    expect(auth.message).toBe("Invalid or missing authentication");

    expect(classifyStatus(400)).toBe("validation");
    expect(classifyStatus(404)).toBe("validation");
    expect(classifyStatus(503)).toBe("server");
    expect(classifyStatus(418)).toBe("network");
  });

  it("describes every kind with a next step", () => {
    expect(describeApiError(new ApiRequestError("nope", 401, null))).toContain("Not authorized");
    expect(describeApiError(new ApiRequestError("bad", 422, "x"))).toContain(
      "Rejected request (x)"
    );
    expect(describeApiError(new ApiRequestError("gate", 409, "gate_closed"))).toContain(
      "Runtime refused (gate_closed): gate"
    );
    expect(describeApiError(new ApiRequestError("down", 500, null))).toContain("Check /status");
    expect(describeApiError(new ApiValidationError("v", { end: "after start" }))).toBe(
      "Check the form: end: after start"
    );
    expect(describeApiError(new Error("offline"))).toBe("offline");
    expect(describeApiError("?")).toBe("Unknown error");
  });
});
