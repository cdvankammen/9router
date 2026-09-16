import { describe, it, expect } from "vitest";
import { parseJsonPathQuery, extractFacets } from "@/lib/db/repos/requestDetailsRepo.js";

describe("parseJsonPathQuery (M2)", () => {
  it("parses numeric comparisons", () => {
    expect(parseJsonPathQuery("latency.total>5000")).toEqual({
      pathExpr: "$.latency.total", op: ">", value: 5000,
    });
    expect(parseJsonPathQuery("tokens.prompt_tokens >= 100")).toEqual({
      pathExpr: "$.tokens.prompt_tokens", op: ">=", value: 100,
    });
  });

  it("parses null/boolean/string values", () => {
    expect(parseJsonPathQuery("request.tools != null")).toEqual({
      pathExpr: "$.request.tools", op: "!=", value: null,
    });
    expect(parseJsonPathQuery("status = 'error'")).toEqual({
      pathExpr: "$.status", op: "=", value: "error",
    });
    expect(parseJsonPathQuery("request.stream = true")).toEqual({
      pathExpr: "$.request.stream", op: "=", value: true,
    });
  });

  it("supports bracket notation", () => {
    expect(parseJsonPathQuery('request["tools"] = 5')).toEqual({
      pathExpr: "$.request.tools", op: "=", value: 5,
    });
  });

  it("rejects injection attempts", () => {
    expect(parseJsonPathQuery("bad path; DROP TABLE")).toBeNull();
    expect(parseJsonPathQuery("x = 1; DROP TABLE requestDetails")).toBeNull();
    expect(parseJsonPathQuery("")).toBeNull();
    expect(parseJsonPathQuery("latency.total")).toBeNull(); // no operator
    expect(parseJsonPathQuery("latency.total > abc")).toBeNull(); // unquoted string
    expect(parseJsonPathQuery('status == "error"')).toBeNull(); // double quotes
    expect(parseJsonPathQuery("a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.aa.bb.cc.dd.ee.ff.gg.hh.ii.jj.kk.ll.mm.nn.oo.pp.qq.rr.ss.tt.uu.vv.ww.xx.yy.zz = 1")).toBeNull(); // too long
  });
});

describe("extractFacets (M1)", () => {
  it("extracts tools/thinking/images/truncation/latency/tokens/cost", () => {
    const detail = {
      request: {
        messages: [
          { content: [{ type: "text", text: "hi" }, { type: "image_url", image_url: { url: "data:..." } }] },
          { content: [{ type: "image", source: {} }] },
        ],
        tools: [{ type: "function", function: { name: "f" } }],
        tool_choice: "auto",
        thinking: { type: "enabled" },
      },
      tokens: { prompt_tokens: 100, completion_tokens: 50, thinking_tokens: 20 },
      latency: { total: 1234 },
      cost: 0.05,
      sourceApp: "Claude Code",
      errorCategory: null,
    };
    const f = extractFacets(detail);
    expect(f.has_tools).toBe(1);
    expect(f.tool_count).toBe(1);
    expect(f.has_thinking).toBe(1);
    expect(f.thinking_tokens).toBe(20);
    expect(f.image_count).toBe(2);
    expect(f.truncated).toBe(0);
    expect(f.latency_ms).toBe(1234);
    expect(f.prompt_tokens).toBe(100);
    expect(f.completion_tokens).toBe(50);
    expect(f.cost_usd).toBe(0.05);
    expect(f.source_app).toBe("Claude Code");
  });

  it("detects truncation from _truncated flags", () => {
    const f = extractFacets({ request: { _truncated: true } });
    expect(f.truncated).toBe(1);
  });

  it("captures request_params subset", () => {
    const f = extractFacets({ request: { temperature: 0.7, tools: [], response_format: { type: "json" }, messages: [] } });
    expect(JSON.parse(f.request_params)).toEqual({
      temperature: 0.7, tools: [], response_format: { type: "json" },
    });
  });

  it("is fail-open on garbage input", () => {
    const f = extractFacets(null);
    expect(f.has_tools).toBe(0);
    expect(f.latency_ms).toBe(0);
    expect(f.cost_usd).toBe(0);
  });
});