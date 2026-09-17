/**
 * Differential corpus and the golden subset: the
 * reference's own UR and logo cases, every correction level, module size
 * and quiet zone, colours, solid and gradient logos with each clear shape,
 * bare matrices, the density check at its limit, frame sequences at
 * several fragment sizes, GIFs, colours; the boundary rows (mixed-mode
 * payloads, non-ASCII URs, SVG logos, JPEG round trips, argument domains);
 * then generated payloads.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Correction, LogoSpec, Recipe } from "../vectors/recipes";
import { BMP_1PX, GIF_1PX, JPEG_8X8, PNG_FIXTURES, PNG_TRUNCATED, WEBP_HEADER } from "./fixtures";

export const CORRECTIONS: readonly Correction[] = ["low", "medium", "quartile", "high"];
export const SHORT_UR = "ur:bytes/hdcxdwinvezm";
const asciiHex = (s: string): string => Buffer.from(s, "latin1").toString("hex");
const hexOf = (n: number, seed: number): string =>
  Array.from({ length: n }, (_, i) => ((i * 31 + seed) & 0xff).toString(16).padStart(2, "0")).join(
    "",
  );
const logo = (extra: Partial<LogoSpec> = {}): LogoSpec => ({
  width: 32,
  height: 32,
  fill: "solid",
  color: "#FF0000",
  fraction: 0.25,
  clearBorder: 1,
  clearShape: "square",
  ...extra,
});

/** The reference's own cases (its integration tests). */
export function* referenceCases(): Generator<Recipe> {
  yield { k: "render", payload: SHORT_UR, correction: "low", size: 256, quietZone: 1 };
  yield { k: "matrix", payload: SHORT_UR, correction: "low" };
  for (const c of CORRECTIONS)
    yield { k: "render", payload: SHORT_UR, correction: c, size: 128, quietZone: 2 };
  yield {
    k: "render",
    payload: SHORT_UR,
    correction: "high",
    size: 256,
    quietZone: 2,
    logo: logo(),
  };
  yield {
    k: "render",
    payload: SHORT_UR,
    correction: "high",
    size: 256,
    quietZone: 2,
    logo: logo({ clearShape: "circle" }),
  };
  yield { k: "frames", length: 500, maxFragmentLen: 100, size: 64 };
  yield { k: "frames", length: 500, maxFragmentLen: 100, size: 64, cycles: 2 };
  yield { k: "gif", length: 500, maxFragmentLen: 100, frames: 3, fps: 5 };
  yield { k: "density", payload: hexOf(2000, 1), correction: "low", maxModules: 117 };
  yield { k: "color", hex: "#FF8000" };
  yield { k: "color", hex: "#FF800080" };
  yield { k: "color", hex: "#F80" };
}

export function* hand(): Generator<Recipe> {
  yield* referenceCases();
  const payloads = [
    hexOf(20, 3),
    hexOf(200, 5),
    hexOf(1000, 7),
    "ur:envelope/tpsoihfyihjzjzjlbtzdvlvo",
  ];
  for (const payload of payloads)
    for (const c of CORRECTIONS) {
      yield { k: "matrix", payload, correction: c };
      yield { k: "render", payload, correction: c, size: 64, quietZone: 0 };
    }
  // Sizes that do not divide evenly, quiet zones, colours.
  for (const size of [21, 50, 100, 333])
    yield { k: "render", payload: SHORT_UR, correction: "medium", size, quietZone: 4 };
  yield {
    k: "render",
    payload: SHORT_UR,
    correction: "low",
    size: 100,
    quietZone: 0,
    foreground: "#123456",
    background: "#FEDCBA",
  };
  yield {
    k: "render",
    payload: SHORT_UR,
    correction: "low",
    size: 100,
    quietZone: 3,
    foreground: "#00000080",
    background: "#FFFFFF00",
  };
  // Logos: fractions, borders, shapes, gradient (alpha), odd sizes.
  for (const fraction of [0.1, 0.25, 0.4])
    for (const clearBorder of [0, 1, 3])
      for (const clearShape of ["square", "circle"] as const)
        yield {
          k: "render",
          payload: hexOf(200, 5),
          correction: "high",
          size: 200,
          quietZone: 2,
          logo: logo({ fraction, clearBorder, clearShape }),
        };
  yield {
    k: "render",
    payload: hexOf(200, 5),
    correction: "high",
    size: 200,
    quietZone: 2,
    logo: logo({ fill: "gradient", width: 40, height: 24 }),
  };
  yield {
    k: "render",
    payload: hexOf(200, 5),
    correction: "high",
    size: 200,
    quietZone: 2,
    logo: logo({ fill: "gradient", width: 7, height: 13, clearShape: "circle" }),
  };
  yield {
    k: "render",
    payload: hexOf(200, 5),
    correction: "high",
    size: 200,
    quietZone: 2,
    logo: logo({ fraction: 0.5 }),
  };
  yield {
    k: "render",
    payload: hexOf(200, 5),
    correction: "high",
    size: 200,
    quietZone: 2,
    logo: logo({ fraction: 0.05 }),
  };
  yield {
    k: "render",
    payload: hexOf(200, 5),
    correction: "high",
    size: 200,
    quietZone: 2,
    logo: logo({ clearBorder: 10 }),
  };
  // Density: at, under and over the limit.
  yield { k: "density", payload: hexOf(100, 1), correction: "low", maxModules: 117 };
  yield { k: "density", payload: hexOf(100, 1), correction: "low", maxModules: 20 };
  yield { k: "density", payload: hexOf(2000, 1), correction: "high", maxModules: 200 };
  // Frames: fragment sizes, cycles, frame counts, insufficient frames, density on the first frame.
  for (const maxFragmentLen of [50, 100, 200, 400])
    yield { k: "frames", length: 1000, maxFragmentLen, size: 32 };
  yield { k: "frames", length: 300, maxFragmentLen: 100, size: 32, cycles: 3 };
  yield { k: "frames", length: 300, maxFragmentLen: 100, size: 32, frameCount: 5 };
  yield { k: "frames", length: 300, maxFragmentLen: 100, size: 32, frameCount: 2 };
  yield { k: "frames", length: 300, maxFragmentLen: 100, size: 32, correction: "high" };
  yield { k: "frames", length: 300, maxFragmentLen: 2000, size: 32, maxModules: 40 };
  yield { k: "frames", length: 10, maxFragmentLen: 100, size: 32 };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 4, fps: 10 };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 1, fps: 1 };
  // The delay saturates to the GIF's 16-bit field as the reference's cast does.
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 2, fps: 0 };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 2, fps: -5 };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 2, fps: 1000 };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 2, fps: 0.3 };
  // Frames of more than 256 colours (a gradient logo) go through the quantiser; a solid logo stays under.
  yield {
    k: "gif",
    length: 300,
    maxFragmentLen: 100,
    frames: 2,
    fps: 8,
    size: 128,
    logo: logo({ fill: "gradient", width: 40, height: 24 }),
  };
  yield {
    k: "gif",
    length: 300,
    maxFragmentLen: 100,
    frames: 3,
    fps: 8,
    size: 200,
    logo: logo({ fill: "gradient", width: 7, height: 13, clearShape: "circle", fraction: 0.4 }),
  };
  yield { k: "gif", length: 300, maxFragmentLen: 100, frames: 2, fps: 8, size: 128, logo: logo() };
  // Colours.
  for (const hex of [
    "#000000",
    "#FFFFFF",
    "#ABCDEF",
    "#ABCDEF00",
    "#abc",
    "#12345678",
    "#GGGGGG",
    "123456",
    "#12345",
    // Non-ASCII: the reference measures bytes and reports the first UTF-8 byte.
    "#ÿÿÿ",
    "#zzÿ",
    "#ÿ",
  ])
    yield { k: "color", hex };
  yield* boundary();
}

/** The Blockchain Commons logo the reference's own tests use (226 bytes). */
export const BC_LOGO_SVG: string = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../test_data/bc-logo.svg"),
  "utf8",
);
const WIDE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect x="0" y="0" width="300" height="100" fill="#3366cc"/><circle cx="150" cy="50" r="40" fill="#ffcc00"/></svg>';
const TALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 37"><path d="M0 0h10v37H0z" fill="#123456"/><circle cx="5" cy="5" r="4" fill="#fff" fill-opacity="0.5"/></svg>';

/** Rows at the boundaries the reference's types draw and the encoders' seams. */
export function* boundary(): Generator<Recipe> {
  // Payloads whose cheapest QR segmentation mixes modes (digit runs, Shift-JIS byte pairs).
  const mixed: [string, Correction][] = [
    [asciiHex("ABC123456789012345678901234567890123456789012345678901234567890"), "low"],
    ["8140".repeat(20), "low"],
    ["9fa0".repeat(60), "medium"],
    [asciiHex("hello world 1234567890123456789012345678901234567890"), "low"],
    [asciiHex("UR:BYTES/") + "e040".repeat(12) + asciiHex("0123456789"), "quartile"],
    ["a3616101616282020363" + "31".repeat(40) + "6364" + "8140".repeat(8), "high"],
  ];
  for (const [payload, correction] of mixed) {
    yield { k: "matrix", payload, correction, note: "mixed-mode" };
    yield { k: "density", payload, correction, maxModules: 25, note: "mixed-mode" };
  }
  // A UR string with non-ASCII letters: upper-cased ASCII-only on both sides.
  yield { k: "matrix", payload: `${SHORT_UR}ß`, correction: "low", note: "non-ascii" };
  yield { k: "matrix", payload: `${SHORT_UR}ıﬁ`, correction: "low", note: "non-ascii" };
  // SVG logos: the reference's own logo (square), a wide and a tall document, one without a size, one broken.
  yield {
    k: "svg",
    svg: BC_LOGO_SVG,
    fraction: 0.25,
    clearBorder: 1,
    clearShape: "square",
    render: { payload: SHORT_UR, correction: "high", size: 200, quietZone: 2 },
  };
  yield {
    k: "svg",
    svg: BC_LOGO_SVG,
    fraction: 0.3,
    clearBorder: 2,
    clearShape: "circle",
    render: { payload: hexOf(200, 5), correction: "high", size: 256, quietZone: 1 },
  };
  yield { k: "svg", svg: WIDE_SVG, fraction: 0.25, clearBorder: 1, clearShape: "square" };
  yield {
    k: "svg",
    svg: TALL_SVG,
    fraction: 0.4,
    clearBorder: 0,
    clearShape: "circle",
    render: { payload: SHORT_UR, correction: "high", size: 128, quietZone: 1 },
  };
  yield {
    k: "svg",
    svg: "<svg xmlns='http://www.w3.org/2000/svg'/>",
    fraction: 0.25,
    clearBorder: 1,
    clearShape: "square",
  };
  yield { k: "svg", svg: "<svg", fraction: 0.25, clearBorder: 1, clearShape: "square" };
  // Raster logos from bytes: every PNG colour type and bit depth decoded as
  // the reference's `into_rgba8`, two composited on a render; a JPEG (the
  // two decoders differ slightly); formats the reference is not built with.
  for (const [name, fixture] of Object.entries(PNG_FIXTURES))
    yield { k: "logo-bytes", name: `png-${name}`, hex: fixture.hex };
  yield {
    k: "logo-bytes",
    name: "png-palette8-trns",
    hex: PNG_FIXTURES["palette8-trns"].hex,
    render: { payload: SHORT_UR, correction: "high", size: 200, quietZone: 2 },
  };
  yield {
    k: "logo-bytes",
    name: "png-rgba8-adam7",
    hex: PNG_FIXTURES["rgba8-adam7"].hex,
    render: { payload: hexOf(200, 5), correction: "high", size: 256, quietZone: 1 },
  };
  yield { k: "logo-bytes", name: "jpeg-8x8", hex: JPEG_8X8 };
  yield {
    k: "logo-bytes",
    name: "jpeg-8x8",
    hex: JPEG_8X8,
    render: { payload: SHORT_UR, correction: "high", size: 200, quietZone: 2 },
  };
  yield { k: "logo-bytes", name: "gif-1px", hex: GIF_1PX };
  yield { k: "logo-bytes", name: "bmp-1px", hex: BMP_1PX };
  yield { k: "logo-bytes", name: "webp-header", hex: WEBP_HEADER };
  yield { k: "logo-bytes", name: "png-truncated", hex: PNG_TRUNCATED };
  yield { k: "logo-bytes", name: "garbage", hex: "00010203" };
  yield { k: "logo-bytes", name: "empty", hex: "" };
  // JPEG: decoded pixels stay within the epsilon at every quality.
  for (const quality of [1, 50, 90, 100])
    yield { k: "jpeg", payload: SHORT_UR, correction: "low", size: 256, quality };
  // The encoders clamp 0 to 1 and anything above 100 to 100.
  for (const quality of [0, 101, 255])
    yield { k: "jpeg", payload: SHORT_UR, correction: "low", size: 128, quality };
  yield { k: "jpeg", payload: hexOf(200, 5), correction: "high", size: 128, quality: 90 };
  // Argument domains (JS-only): what the boundary rejects.
  const domain: Extract<Recipe, { k: "domain" }>[] = [
    { k: "domain", op: "colorValue", args: [[10, 20, 30]] },
    { k: "domain", op: "colorValue", args: [42] },
    { k: "domain", op: "colorNew", args: [300, 0, 0] },
    { k: "domain", op: "colorNew", args: [-1, 0, 0] },
    { k: "domain", op: "colorNew", args: [1.5, 2, 3] },
    { k: "domain", op: "colorNew", args: [0, 0, 0, 300] },
    { k: "domain", op: "colorNew", args: [1, 2, 3, 4] },
    { k: "domain", op: "renderSize", args: [0] },
    { k: "domain", op: "renderSize", args: [1.5] },
    { k: "domain", op: "renderSize", args: [1] },
    { k: "domain", op: "renderQuietZone", args: [-1] },
    { k: "domain", op: "renderQuietZone", args: [2.5] },
    { k: "domain", op: "renderCorrection", args: ["LOW"] },
    { k: "domain", op: "renderCorrection", args: ["l"] },
    { k: "domain", op: "renderCorrection", args: ["quartile"] },
    { k: "domain", op: "renderUrValue", args: ["object"] },
    { k: "domain", op: "renderUrValue", args: ["number"] },
    { k: "domain", op: "renderQrValue", args: ["hello"] },
    { k: "domain", op: "jpegQuality", args: [1.5] },
    { k: "domain", op: "jpegQuality", args: [256] },
    { k: "domain", op: "jpegQuality", args: [-1] },
    { k: "domain", op: "jpegQuality", args: [100] },
    { k: "domain", op: "framesCycles", args: [1.5] },
    { k: "domain", op: "framesCycles", args: [-1] },
    { k: "domain", op: "framesCycles", args: [2] },
    { k: "domain", op: "framesCount", args: [2.5] },
    { k: "domain", op: "framesCount", args: [5] },
    { k: "domain", op: "framesMaxModules", args: [-1] },
    { k: "domain", op: "framesMaxModules", args: [45] },
    { k: "domain", op: "framesFragmentLen", args: [1.5] },
    { k: "domain", op: "densityCheck", args: [1.5, 117] },
    { k: "domain", op: "densityCheck", args: [117, 117] },
    { k: "domain", op: "logoRgba", args: [1.5, 4, 24] },
    { k: "domain", op: "logoRgba", args: [4, 4, 10] },
    { k: "domain", op: "logoRgba", args: [4, 4, 64] },
    { k: "domain", op: "logoOptions", args: [0.25, 1.5, "square"] },
    { k: "domain", op: "logoOptions", args: [0.25, 1, "round"] },
    { k: "domain", op: "logoOptions", args: [0.005, 0, "circle"] },
    { k: "domain", op: "renderedImage", args: [4, 4, 10] },
    { k: "domain", op: "renderedImage", args: [4, 4, 64] },
    { k: "domain", op: "gifFps", args: ["8"] },
  ];
  yield* domain;
}

function* prng(seed: number): Generator<number> {
  let x = seed >>> 0 || 1;
  for (;;) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    yield x;
  }
}

export function* generated(): Generator<Recipe> {
  const g = prng(0x3b7);
  const next = (): number => g.next().value as number;
  const pick = <T>(xs: readonly T[]): T => xs[next() % xs.length];
  for (let i = 0; i < 150; i++) {
    const payload = next() % 3 === 0 ? SHORT_UR : hexOf(1 + (next() % 600), i);
    const correction = pick(CORRECTIONS);
    if (i % 5 === 0) yield { k: "matrix", payload, correction };
    yield {
      k: "render",
      payload,
      correction,
      size: 21 + (next() % 200),
      quietZone: next() % 5,
      ...(next() % 3 === 0
        ? { foreground: `#${(next() & 0xffffff).toString(16).padStart(6, "0")}` }
        : {}),
      ...(next() % 4 === 0
        ? {
            logo: logo({
              fraction: 0.1 + (next() % 30) / 100,
              clearBorder: next() % 4,
              clearShape: pick(["square", "circle"] as const),
              fill: pick(["solid", "gradient"] as const),
              width: 8 + (next() % 40),
              height: 8 + (next() % 40),
            }),
          }
        : {}),
    };
  }
  for (let i = 0; i < 40; i++) {
    yield {
      k: "frames",
      length: 50 + (next() % 1500),
      maxFragmentLen: 40 + (next() % 300),
      size: 24,
      ...(next() % 2 === 0 ? { cycles: 1 + (next() % 3) } : {}),
    };
  }
}

export const categories: Record<string, () => Generator<Recipe>> = {
  hand: () => hand(),
  generated: () => generated(),
};

export function* goldenRecipes(): Generator<Recipe> {
  yield* hand();
}
