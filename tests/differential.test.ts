/**
 * Differential: every corpus recipe is run with the frozen baseline bundle
 * (the package as it shipped at 1.0.0-beta.1) AND the working tree; every
 * pixel hash, matrix, part sequence and error code must be identical outside
 * the enumerated tombstones.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { materialize, recipeName, type Recipe } from "./vectors/recipes";
import { baselineAdapter, currentAdapter } from "./vectors/deps";
import { categories } from "./corpus/corpus";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA256 = readFileSync(join(here, "baseline/README.md"), "utf8").match(
  /Baseline sha256: ([0-9a-f]{64})/,
)?.[1];

/** Tombstones: the only allowed differences from the baseline. */
const TOMBSTONES: {
  id: string;
  landed: boolean;
  matches: (r: Recipe, baselineOutcome: string, currentOutcome: string) => boolean;
}[] = [
  {
    // The QR encoder matches the reference's masks and mixed-mode
    // segmentation, and UR strings are upper-cased ASCII-only, so pixel
    // hashes, module counts, density verdicts and first-frame hashes move
    // relative to the frozen baseline; every symbol stays a valid QR code
    // of the same message.
    id: "T1",
    landed: true,
    matches: (r) => ["render", "matrix", "density", "frames", "svg"].includes(r.k),
  },
  {
    // Argument domains are validated at the boundary: inputs the baseline
    // masked, clamped or silently accepted are now rejected.
    id: "T2",
    landed: true,
    matches: (r) => r.k === "domain",
  },
  {
    // GIF rows compare decoded frames: their pixels moved with the QR
    // encoder (as T1), a non-positive `fps` gives the reference's saturated
    // delay where the baseline's encoder wrapped the field, and frames of
    // more than 256 colours are quantised as the reference quantises them.
    id: "T3",
    landed: true,
    matches: (r) => r.k === "gif",
  },
  {
    // PNG logos decode as the reference's `into_rgba8` (the baseline read a
    // palette's indices as grey and rejected 16-bit samples) and only PNG and
    // JPEG are accepted (the baseline decoded GIF and BMP).
    id: "T4",
    landed: true,
    matches: (r) => r.k === "logo-bytes",
  },
];

const baseline = await baselineAdapter();
const current = await currentAdapter();

describe("differential: baseline vs working tree", () => {
  it("baseline bundle integrity", () => {
    const sha = createHash("sha256")
      .update(readFileSync(join(here, "baseline/multipart-ur-baseline.mjs")))
      .digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
  for (const [name, gen] of Object.entries(categories)) {
    it(`category ${name}`, { timeout: 1_800_000 }, async () => {
      let n = 0;
      const diffs: string[] = [];
      for (const recipe of gen()) {
        n++;
        const a = await materialize(baseline, recipe);
        const b = await materialize(current, recipe);
        const tomb = TOMBSTONES.find((t) => t.matches(recipe, a, b));
        if (a !== b && tomb?.landed !== true)
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 120)} !== ${b.slice(0, 120)}`);
      }
      expect(n).toBeGreaterThan(0);
      expect(diffs).toEqual([]);
    });
  }
});
