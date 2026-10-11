import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicApiError, fetchPublicJournal, fetchPublicStatus } from "./public";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public fetchers", () => {
  it("returns the JSON body on success with a GET", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublicJournal(30)).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/public\/journal\?days=30$/);
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("keeps the status and Retry-After of a failed read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "7" } }))
    );

    const error = await fetchPublicStatus().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PublicApiError);
    expect((error as PublicApiError).status).toBe(429);
    expect((error as PublicApiError).retryAfterSeconds).toBe(7);
  });

  it("reports a network failure with a null status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await fetchPublicStatus().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PublicApiError);
    expect((error as PublicApiError).status).toBeNull();
  });
});
