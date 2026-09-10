/**
 * Golden snapshot: the reference's cases and every hand-written rendering,
 * matrix, frame sequence and colour. Reviewable, auto-updatable with -u.
 */
import { describe, it, expect } from "vitest";
import { materialize, recipeName } from "./vectors/recipes";
import { currentAdapter } from "./vectors/deps";
import { referenceCases, hand } from "./corpus/corpus";

const api = await currentAdapter();

describe("golden", () => {
  it("reference cases", { timeout: 120_000 }, async () => {
    const rows: string[] = [];
    for (const r of referenceCases())
      rows.push(`## ${recipeName(r)}\n${await materialize(api, r)}`);
    expect(rows.length).toBeGreaterThan(10);
    expect(rows).toMatchSnapshot();
  });
  it("hand-written cases", { timeout: 120_000 }, async () => {
    const rows: string[] = [];
    for (const r of hand()) rows.push(`## ${recipeName(r)}\n${await materialize(api, r)}`);
    expect(rows.length).toBeGreaterThan(60);
    expect(rows).toMatchSnapshot();
  });
});
