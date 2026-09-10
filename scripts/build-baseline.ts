/**
 * Build the frozen baseline bundle: the package as it shipped at the
 * baseline commit, as one self-contained ESM file.
 *
 *   bun scripts/build-baseline.ts [commit]
 *
 * The baseline commit's `src/` is extracted from git and bundled with every
 * `@blockchaincommons` sibling and every pure-JS encoder INLINED, so the
 * bundle keeps behaving as it did even after the siblings change. The WASM
 * encoders (resvg, webp) stay external and resolve at run time. Writes
 * tests/baseline/<pkg>-baseline.mjs, the .d.mts API snapshot, and README.md
 * with the commit and sha256 pinned. The commit defaults to the one recorded
 * in tests/baseline/README.md.
 */
import { build } from "tsdown";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string };
const short: string = pkg.name.replace("@blockchaincommons/", "");
const outDir = join(root, "tests", "baseline");
mkdirSync(outDir, { recursive: true });

const readme = existsSync(join(outDir, "README.md"))
  ? readFileSync(join(outDir, "README.md"), "utf8")
  : "";
const commit =
  process.argv[2] ??
  readme.match(/Baseline commit: ([0-9a-f]{40})/)?.[1] ??
  execSync("git rev-parse HEAD", { cwd: root }).toString().trim();

// The baseline sources live under the package so module resolution finds the
// workspace's node_modules; the directory is removed after the build.
const srcDir = join(outDir, ".src");
rmSync(srcDir, { recursive: true, force: true });
mkdirSync(srcDir, { recursive: true });
execSync(`git archive ${commit} src | tar -x -C ${JSON.stringify(srcDir)}`, { cwd: root });
writeFileSync(
  join(srcDir, "entry.ts"),
  `export * from "./src/index.ts";\nexport { encodeAnimatedGif } from "./src/gif.ts";\nexport { logoFromSvg, rasterizeSvg } from "./src/svg.ts";\n`,
);

try {
  await build({
    config: false,
    entry: { [`${short}-baseline`]: join(srcDir, "entry.ts") },
    outDir,
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: false,
    target: "es2022",
    noExternal: [
      /^@blockchaincommons\//,
      /^(fast-png|fflate|gifenc|iobuffer|jpeg-js|omggif|pako|qrcode-generator)$/,
    ],
    external: [/^@resvg\//, /^webp-wasm/],
    inputOptions: {
      onwarn(w, d) {
        if (w.code !== "SOURCEMAP_BROKEN" && w.code !== "EMPTY_IMPORT_META") d(w);
      },
    },
  });
} finally {
  rmSync(srcDir, { recursive: true, force: true });
}

const bundle = join(outDir, `${short}-baseline.mjs`);
const text = readFileSync(bundle, "utf8").replace(/\n\/\/# sourceMappingURL=.*\n?$/, "\n");
writeFileSync(bundle, text);
const sha = createHash("sha256").update(text).digest("hex");
if (existsSync(join(root, "api/index.d.mts")))
  copyFileSync(join(root, "api/index.d.mts"), join(outDir, `${short}-baseline.d.mts`));
writeFileSync(
  join(outDir, "README.md"),
  `# Frozen baseline build

\`${short}-baseline.mjs\` is the self-contained ESM bundle of \`${pkg.name}\` as it
shipped at commit \`${commit}\` (\`1.0.0-beta.1\`), with its \`@blockchaincommons\`
siblings and pure-JS encoders inlined. It also exports \`encodeAnimatedGif\`,
\`logoFromSvg\` and \`rasterizeSvg\` so the differential can drive every
encoder. \`${short}-baseline.d.mts\` is the public surface at that commit.

\`tests/differential.test.ts\` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes outside the enumerated
tombstones; it pins the sha256 below so an accidental rebuild cannot turn the
differential into a self-comparison. Rebuild with
\`bun scripts/build-baseline.ts ${commit.slice(0, 7)}\`.

Baseline commit: ${commit}
Baseline sha256: ${sha}
`,
);
console.log(`wrote ${bundle}\nsha256 ${sha}\ncommit ${commit}`);
