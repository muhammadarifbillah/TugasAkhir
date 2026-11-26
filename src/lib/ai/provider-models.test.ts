import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenAICompatibleModels } from "./provider-models";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOpenAICompatibleModels", () => {
  it("keeps router ids that are not gpt/o-series (OmniRoute catalog)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          data: [
            { id: "auto" },
            { id: "cc/claude-opus-5-5" },
            { id: "opencode-go/deepseek-v4.1-flash" },
          ],
        }),
      ),
    );

    const models = await fetchOpenAICompatibleModels("sk-test", "https://router.example/v1/");

    expect(models.map((m) => m.id)).toEqual([
      "auto",
      "cc/claude-opus-5-5",
      "opencode-go/deepseek-v4.1-flash",
    ]);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://router.example/v1/models");
  });

  it("throws on a rejected key instead of returning an empty list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 401)));
    await expect(fetchOpenAICompatibleModels("bad", "https://router.example/v1")).rejects.toThrow(
      "Provider API 401",
    );
  });
});
