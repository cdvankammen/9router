import { describe, it, expect, beforeEach } from "vitest";
import { getAdapter } from "@/lib/db/driver.js";
import {
  getAnnotations, addAnnotation, deleteAnnotation, toggleStar,
  getSavedViews, saveView, deleteSavedView,
} from "@/lib/db/repos/annotationsRepo.js";

describe("annotationsRepo (M4)", () => {
  let db;

  beforeEach(async () => {
    db = await getAdapter();
    // Clean tables
    db.run(`DELETE FROM message_annotations`);
    db.run(`DELETE FROM saved_views`);
    db.run(`DELETE FROM requestDetails`);
    db.run(`DELETE FROM message_facets`);
    // Insert a parent requestDetails row for FK
    db.run(
      `INSERT INTO requestDetails(id, timestamp, provider, model, connectionId, status, data, conversationId)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      ["test-req-1", new Date().toISOString(), "openai", "gpt-4", "conn-1", "success", "{}", "conv-1"],
    );
  });

  it("addAnnotation upserts by request_id+kind+value", async () => {
    const a1 = await addAnnotation({ requestId: "test-req-1", kind: "tag", value: "important" });
    expect(a1.kind).toBe("tag");
    expect(a1.value).toBe("important");

    // Same tag again → upsert (createdAt updates)
    const a2 = await addAnnotation({ requestId: "test-req-1", kind: "tag", value: "important" });
    expect(a2.id).toBe(a1.id);
    expect(a2.createdAt).not.toBe(a1.createdAt);
  });

  it("getAnnotations filters by requestId and conversationId", async () => {
    await addAnnotation({ requestId: "test-req-1", kind: "tag", value: "foo" });
    await addAnnotation({ requestId: "test-req-1", kind: "note", value: "bar" });
    await addAnnotation({ requestId: "test-req-1", conversationId: "conv-1", kind: "star", value: "1" });

    const byReq = await getAnnotations({ requestId: "test-req-1" });
    expect(byReq.length).toBe(3);

    const byConv = await getAnnotations({ conversationId: "conv-1" });
    expect(byConv.length).toBe(1);
    expect(byConv[0].kind).toBe("star");
  });

  it("deleteAnnotation by id or composite key", async () => {
    const a = await addAnnotation({ requestId: "test-req-1", kind: "tag", value: "delme" });
    expect(await deleteAnnotation({ id: a.id })).toBe(true);
    expect(await deleteAnnotation({ id: a.id })).toBe(false);

    await addAnnotation({ requestId: "test-req-1", kind: "tag", value: "delme2" });
    expect(await deleteAnnotation({ requestId: "test-req-1", kind: "tag", value: "delme2" })).toBe(true);
  });

  it("toggleStar adds/removes star", async () => {
    expect(await toggleStar("test-req-1", "conv-1")).toBe(true);
    expect(await toggleStar("test-req-1", "conv-1")).toBe(false);
    expect(await toggleStar("test-req-1", "conv-1")).toBe(true);
  });

  it("rejects invalid kind", async () => {
    await expect(addAnnotation({ requestId: "test-req-1", kind: "invalid", value: "x" })).rejects.toThrow("Invalid annotation kind");
  });

  it("rejects empty value", async () => {
    await expect(addAnnotation({ requestId: "test-req-1", kind: "tag", value: "  " })).rejects.toThrow("value is required");
  });
});

describe("savedViewsRepo (M4)", () => {
  let db;

  beforeEach(async () => {
    db = await getAdapter();
    db.run(`DELETE FROM saved_views`);
  });

  it("saveView upserts by name", async () => {
    const v1 = await saveView({ name: "my-view", filter: { provider: "openai", hasTools: true } });
    expect(v1.name).toBe("my-view");
    expect(v1.filter.provider).toBe("openai");

    const v2 = await saveView({ name: "my-view", filter: { provider: "anthropic" } });
    expect(v2.id).toBe(v1.id);
    expect(v2.filter.provider).toBe("anthropic");
    // updatedAt may be identical within the same millisecond — the upsert is
    // proven by id preservation + filter replacement.
    expect(v2.updatedAt >= v1.updatedAt).toBe(true);
  });

  it("getSavedViews returns newest first", async () => {
    await saveView({ name: "a", filter: {} });
    await saveView({ name: "b", filter: {} });
    const views = await getSavedViews();
    expect(views[0].name).toBe("b");
    expect(views[1].name).toBe("a");
  });

  it("deleteSavedView by id or name", async () => {
    const v = await saveView({ name: "delme", filter: {} });
    expect(await deleteSavedView({ id: v.id })).toBe(true);
    expect(await deleteSavedView({ id: v.id })).toBe(false);

    await saveView({ name: "delme2", filter: {} });
    expect(await deleteSavedView({ name: "delme2" })).toBe(true);
  });

  it("rejects empty name", async () => {
    await expect(saveView({ name: "  ", filter: {} })).rejects.toThrow("name is required");
  });

  it("rejects non-object filter", async () => {
    await expect(saveView({ name: "x", filter: "not-an-object" })).rejects.toThrow("filter must be an object");
  });
});