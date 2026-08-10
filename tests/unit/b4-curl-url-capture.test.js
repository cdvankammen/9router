// Task B4: cURL URL capture — the upstream URL must be captured at request
// time (buildRequestDetail + repo flush) and used by buildCurl, with a
// placeholder fallback for legacy rows that predate the field.
import { describe, it, expect } from "vitest";
import { buildRequestDetail } from "open-sse/handlers/chatCore/requestDetail.js";
import { buildCurl } from "@/shared/messageFormats.js";

describe("B4 — upstream URL capture + cURL", () => {
  it("buildRequestDetail forwards url from base", () => {
    const detail = buildRequestDetail({
      provider: "openai",
      model: "gpt-4o-mini",
      status: "success",
      url: "https://api.openai.com/v1/chat/completions",
    });
    expect(detail.url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("buildRequestDetail omits url when absent (legacy compat)", () => {
    const detail = buildRequestDetail({ provider: "openai", model: "gpt-4o-mini", status: "success" });
    expect(detail.url).toBeUndefined();
  });

  it("overrides win over base url", () => {
    const detail = buildRequestDetail(
      { provider: "openai", model: "gpt-4o-mini", url: "https://old.example/v1" },
      { url: "https://retried.example/v1" }
    );
    expect(detail.url).toBe("https://retried.example/v1");
  });

  it("buildCurl uses the captured upstream URL", () => {
    const curl = buildCurl({
      provider: "openai",
      model: "gpt-4o-mini",
      url: "https://api.openai.com/v1/chat/completions",
      providerRequest: { model: "gpt-4o-mini" },
    });
    expect(curl).toContain('curl -X POST "https://api.openai.com/v1/chat/completions"');
  });

  it("buildCurl falls back to the placeholder when url missing (legacy rows)", () => {
    const curl = buildCurl({ provider: "openai", model: "gpt-4o-mini" });
    expect(curl).toContain('curl -X POST "<provider-endpoint>/v1/chat/completions"');
  });
});
