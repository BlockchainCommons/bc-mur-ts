import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/gif-entry.ts",
      "src/webp-entry.ts",
      "src/svg-logo-entry.ts",
      "src/prores-entry.ts",
      "src/cli/index.ts",
    ],
    outDir: "dist",
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    inputOptions: {
      // Node-only `import.meta.url` in svg.ts:loadWasmFromNode is gated by
      // an `isNode` runtime check, so the empty-object replacement in IIFE
      // is harmless dead code.
      onwarn(warning, defaultHandler) {
        if (warning.code === "EMPTY_IMPORT_META") return;
        // The rolldown-plugin-dts "fake-js" pass transforms .d.ts content
        // without emitting a sourcemap, producing a spurious SOURCEMAP_BROKEN
        // warning even though the real JS sourcemaps are correct.
        if (warning.code === "SOURCEMAP_BROKEN") return;
        defaultHandler(warning);
      },
    },
  },
  {
    entry: ["src/bin/mur.ts"],
    outDir: "dist/bin",
    format: ["cjs"],
    dts: false,
    target: "node18",
    platform: "node",
    sourcemap: true,
    clean: false,
    shims: true,
    // CLI is self-contained: bundle every dep (including commander, a devDep).
    deps: {
      onlyBundle: false,
    },
  },
]);
