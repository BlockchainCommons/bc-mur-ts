/**
 * Golden vector generator. `bun scripts/generate-vectors.ts` materialises
 * the golden recipe subset with the WORKING TREE and writes
 * tests/vectors/vectors.json. With VECTORS_FROM=baseline it materialises
 * with the frozen bundle instead.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { materialize, recipeName } from "../tests/vectors/recipes.ts";
import { goldenRecipes } from "../tests/corpus/corpus.ts";
import { baselineAdapter, currentAdapter } from "../tests/vectors/deps.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromBaseline = process.env["VECTORS_FROM"] === "baseline";
const api = fromBaseline ? await baselineAdapter() : await currentAdapter();
const vectors: { name: string; recipe: unknown; expect: string }[] = [];
for (const recipe of goldenRecipes())
  vectors.push({ name: recipeName(recipe), recipe, expect: await materialize(api, recipe) });
writeFileSync(
  join(root, "tests/vectors/vectors.json"),
  JSON.stringify({ count: vectors.length, vectors }, null, 1) + "\n",
);
const throws = vectors.filter((v) => v.expect.startsWith("throw:")).length;
console.log(
  `wrote ${vectors.length} vectors (${throws} throw) from ${fromBaseline ? "the frozen baseline" : "the working tree"}`,
);
