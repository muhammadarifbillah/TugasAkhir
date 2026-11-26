import { describe, expect, it } from "vitest";
import { AI_PROVIDERS } from "@/lib/landing-facts";
import { NoModelConfiguredError } from "./errors";
import { buildModel } from "./provider";

describe("buildModel", () => {
  it("routes omniroute through the OpenAI-compatible client", () => {
    const model = buildModel("omniroute", "opencode-go/deepseek-v4.1-flash", "sk-test") as {
      provider: string;
      modelId: string;
    };
    expect(model.provider).toContain("omniroute");
    expect(model.modelId).toBe("opencode-go/deepseek-v4.1-flash");
  });

  it("refuses omniroute without a key instead of falling back to an env key", () => {
    expect(() => buildModel("omniroute", "opencode-go/deepseek-v4.1-flash")).toThrow(
      NoModelConfiguredError,
    );
  });

  it("advertises every provider buildModel handles", () => {
    expect(AI_PROVIDERS).toContain("OmniRoute");
  });
});
