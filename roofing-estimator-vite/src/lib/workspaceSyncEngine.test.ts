import { describe, expect, it } from "vitest";
import {
  applyRemote,
  commitPush,
  diffLocal,
  emptySyncMeta,
  hashRecord,
  stableStringify,
  type RemoteRecord,
} from "./workspaceSyncEngine";

type Item = { id: string; name: string };
const getId = (i: Item) => i.id;
const toItem = (d: unknown) => (d && typeof d === "object" ? (d as Item) : null);

describe("stableStringify", () => {
  it("is insensitive to key order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it("distinguishes different values", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it("handles nested objects and arrays", () => {
    expect(stableStringify({ a: [{ y: 1, x: 2 }] })).toBe(stableStringify({ a: [{ x: 2, y: 1 }] }));
  });
});

describe("hashRecord", () => {
  it("matches for equal content and differs for changed content", () => {
    expect(hashRecord({ id: "a", n: 1 })).toBe(hashRecord({ n: 1, id: "a" }));
    expect(hashRecord({ id: "a", n: 1 })).not.toBe(hashRecord({ id: "a", n: 2 }));
  });
});

describe("diffLocal", () => {
  it("queues every item on first sync", () => {
    const items: Item[] = [{ id: "1", name: "a" }, { id: "2", name: "b" }];
    const d = diffLocal("estimate", items, getId, emptySyncMeta(), 100);
    expect(d.push).toHaveLength(2);
    expect(d.push.every((p) => p.updatedAt === 100 && p.kind === "estimate")).toBe(true);
  });

  it("skips unchanged items on the second pass", () => {
    const items: Item[] = [{ id: "1", name: "a" }];
    const first = diffLocal("estimate", items, getId, emptySyncMeta(), 100);
    const meta = commitPush(first.nextMeta, first.push, 100);
    const second = diffLocal("estimate", items, getId, meta, 200);
    expect(second.push).toHaveLength(0);
    expect(second.unchangedIds).toEqual(["1"]);
  });

  it("queues an edited item with a fresh timestamp", () => {
    const first = diffLocal("estimate", [{ id: "1", name: "a" }], getId, emptySyncMeta(), 100);
    const meta = commitPush(first.nextMeta, first.push, 100);
    const second = diffLocal("estimate", [{ id: "1", name: "CHANGED" }], getId, meta, 250);
    expect(second.push).toHaveLength(1);
    expect(second.push[0]?.updatedAt).toBe(250);
  });

  it("queues a soft delete when a synced item disappears locally", () => {
    const first = diffLocal("estimate", [{ id: "1", name: "a" }], getId, emptySyncMeta(), 100);
    const meta = commitPush(first.nextMeta, first.push, 100);
    const second = diffLocal("estimate", [], getId, meta, 300);
    expect(second.push).toHaveLength(1);
    expect(second.push[0]).toMatchObject({ id: "1", deleted: true, updatedAt: 300 });
  });

  it("ignores items with an empty id", () => {
    const d = diffLocal("estimate", [{ id: "", name: "x" }], getId, emptySyncMeta(), 100);
    expect(d.push).toHaveLength(0);
  });
});

describe("applyRemote", () => {
  const remote = (over: Partial<RemoteRecord>): RemoteRecord => ({
    id: "1",
    kind: "estimate",
    data: { id: "1", name: "server" },
    updatedAt: 500,
    deleted: false,
    ...over,
  });

  it("adds a server record that is missing locally", () => {
    const r = applyRemote<Item>([], [remote({})], getId, emptySyncMeta(), toItem);
    expect(r.changed).toBe(true);
    expect(r.items).toEqual([{ id: "1", name: "server" }]);
    expect(r.nextMeta.watermark).toBe(500);
  });

  it("overwrites a local record when the server copy is newer", () => {
    const meta = { watermark: 0, entries: { "1": { updatedAt: 100, hash: "x" } } };
    const r = applyRemote<Item>([{ id: "1", name: "local" }], [remote({})], getId, meta, toItem);
    expect(r.items[0]?.name).toBe("server");
  });

  it("keeps the local record when the local edit is newer", () => {
    const meta = { watermark: 0, entries: { "1": { updatedAt: 900, hash: "x" } } };
    const r = applyRemote<Item>([{ id: "1", name: "local" }], [remote({})], getId, meta, toItem);
    expect(r.items[0]?.name).toBe("local");
    expect(r.changed).toBe(false);
  });

  it("removes a locally present record that the server deleted", () => {
    const meta = { watermark: 0, entries: { "1": { updatedAt: 100, hash: "x" } } };
    const r = applyRemote<Item>([{ id: "1", name: "local" }], [remote({ deleted: true })], getId, meta, toItem);
    expect(r.items).toHaveLength(0);
    expect(r.changed).toBe(true);
  });

  it("does not resurrect a delete that a newer local edit supersedes", () => {
    const meta = { watermark: 0, entries: { "1": { updatedAt: 900, hash: "x" } } };
    const r = applyRemote<Item>([{ id: "1", name: "local" }], [remote({ deleted: true })], getId, meta, toItem);
    expect(r.items).toHaveLength(1);
  });

  it("advances the watermark to the newest record seen", () => {
    const r = applyRemote<Item>(
      [],
      [remote({ id: "1", updatedAt: 10 }), remote({ id: "2", updatedAt: 77 })],
      getId,
      emptySyncMeta(),
      toItem,
    );
    expect(r.nextMeta.watermark).toBe(77);
  });

  it("returns the original array reference when nothing changed", () => {
    const items = [{ id: "1", name: "local" }];
    const meta = { watermark: 0, entries: { "1": { updatedAt: 900, hash: "x" } } };
    const r = applyRemote<Item>(items, [remote({})], getId, meta, toItem);
    expect(r.items).toBe(items);
  });
});

describe("round trip", () => {
  it("converges two devices editing different records", () => {
    const deviceA: Item[] = [{ id: "1", name: "a" }];
    const pushA = diffLocal("estimate", deviceA, getId, emptySyncMeta(), 100);
    const metaA = commitPush(pushA.nextMeta, pushA.push, 100);

    // Device B pulls A's record, then adds its own.
    const serverRecords: RemoteRecord[] = pushA.push.map((p) => ({
      id: p.id,
      kind: p.kind,
      data: p.data,
      updatedAt: p.updatedAt,
      deleted: false,
    }));
    const bPull = applyRemote<Item>([], serverRecords, getId, emptySyncMeta(), toItem);
    const deviceB = [...bPull.items, { id: "2", name: "b" }];
    const pushB = diffLocal("estimate", deviceB, getId, bPull.nextMeta, 200);

    expect(pushB.push.map((p) => p.id)).toEqual(["2"]);

    // A pulls B's new record.
    const aPull = applyRemote<Item>(
      deviceA,
      pushB.push.map((p) => ({ id: p.id, kind: p.kind, data: p.data, updatedAt: p.updatedAt, deleted: false })),
      getId,
      metaA,
      toItem,
    );
    expect(aPull.items.map((i) => i.id).sort()).toEqual(["1", "2"]);
  });
});
