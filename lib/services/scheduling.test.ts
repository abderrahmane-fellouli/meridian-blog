import { describe, expect, it } from "vitest";
import { publishDueScheduled } from "@/lib/services/scheduling";
import type { Database } from "@/lib/db";

function fakeDb(promoted: string[]): {
  db: Database;
  calls: { set: unknown; whereProvided: boolean };
} {
  const calls: { set: unknown; whereProvided: boolean } = { set: undefined, whereProvided: false };
  const chain = {
    set(v: unknown) {
      calls.set = v;
      return this;
    },
    where(cond: unknown) {
      if (cond) calls.whereProvided = true;
      return this;
    },
    async returning() {
      return promoted.map((id) => ({ id }));
    },
  };
  const tx = {
    update() {
      return chain;
    },
  };
  const db = {
    async transaction<R>(fn: (t: typeof tx) => Promise<R>): Promise<R> {
      return fn(tx);
    },
  } as unknown as Database;
  return { db, calls };
}

describe("publishDueScheduled", () => {
  it("promotes due posts and returns their ids", async () => {
    const { db, calls } = fakeDb(["post-a", "post-b"]);
    const result = await publishDueScheduled(new Date("2026-09-01T00:00:00Z"), db);
    expect(result).toEqual(["post-a", "post-b"]);
    expect(calls.set).toEqual({ status: "published" });
  });

  it("always applies the status guard (idempotency)", async () => {
    const { db, calls } = fakeDb([]);
    await publishDueScheduled(new Date(), db);
    expect(calls.whereProvided).toBe(true);
  });

  it("returns an empty array when nothing is due", async () => {
    const { db } = fakeDb([]);
    const result = await publishDueScheduled(new Date(), db);
    expect(result).toEqual([]);
  });
});
