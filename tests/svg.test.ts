/**
 * The SVG rasteriser: initialisation from bytes, exact placement of square
 * and non-square documents, and the error paths.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { MurError } from "../src/index.js";
import { initSvgRenderer, logoFromSvg, rasterizeSvg } from "../src/svg.js";

const require = createRequire(import.meta.url);
const WASM = new Uint8Array(readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
const LOGO = new Uint8Array(readFileSync(new URL("./test_data/bc-logo.svg", import.meta.url)));
const sha = (u: Uint8Array): string => createHash("sha256").update(u).digest("hex");
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("svg", () => {
  it("initialises from bytes and is idempotent", async () => {
    await initSvgRenderer(WASM);
    await initSvgRenderer();
    const image = await rasterizeSvg(LOGO);
    expect(image.width).toBe(512);
    expect(image.height).toBe(512);
  });

  it("rasterises the reference's logo and a non-square document as the reference does", async () => {
    // Hashes of the reference's `Logo::from_svg` output (resvg 0.44) for the same documents.
    expect(sha((await rasterizeSvg(LOGO)).pixels)).toBe(
      "e50794e19aa0631ad68594a02234d05834524305df4feb571c91a9ccd76f15e7",
    );
    const wide = enc(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect x="0" y="0" width="300" height="100" fill="#3366cc"/><circle cx="150" cy="50" r="40" fill="#ffcc00"/></svg>',
    );
    expect(sha((await rasterizeSvg(wide)).pixels)).toBe(
      "801e5355e6bc19e26331a4c9569701d1bb5ee9c213eda3ecd6b8f6fde75f5be1",
    );
  });

  it("a document without a size renders at usvg's default", async () => {
    const image = await rasterizeSvg(enc("<svg xmlns='http://www.w3.org/2000/svg'/>"));
    expect(image.width).toBe(512);
    expect(image.pixels.every((b) => b === 0)).toBe(true);
  });

  it("rejects an unparsable document and a non-byte argument", async () => {
    await expect(rasterizeSvg(enc("<svg"))).rejects.toMatchObject({ code: "SvgRender" });
    await expect(logoFromSvg("<svg/>" as unknown as Uint8Array)).rejects.toSatisfy(
      (e: unknown) => MurError.isMurError(e) && e.is("InvalidParameter"),
    );
  });
});
