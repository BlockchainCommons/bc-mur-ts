import { UR } from "@blockchaincommons/uniform-resources";
import { initWasm } from "@resvg/resvg-wasm";
//#region src/color.d.ts
/** RGBA color with 8-bit channels. */
declare class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
  constructor(r: number, g: number, b: number, a: number);
  static readonly BLACK: Color;
  static readonly WHITE: Color;
  static readonly TRANSPARENT: Color;
  /** Mirror of Rust `Color::new`. */
  static new(r: number, g: number, b: number, a: number): Color;
  /** Parse hex color: `#RGB`, `#RRGGBB`, or `#RRGGBBAA`. */
  static fromHex(s: string): Color;
  /** True if alpha < 3 (effectively transparent). */
  isTransparent(): boolean;
  toString(): string;
}
//#endregion
//#region src/correction.d.ts
/**
 * Copyright © 2026 Blockchain Commons, LLC
 * Copyright © 2026 Parity Technologies
 *
 * Port of `bc-mur::correction`.
 */
/** QR error correction level. */
declare enum CorrectionLevel {
  Low = "Low",
  Medium = "Medium",
  Quartile = "Quartile",
  High = "High"
}
declare function correctionLevelToString(level: CorrectionLevel): string;
declare function correctionLevelFromString(s: string): CorrectionLevel;
//#endregion
//#region src/logo.d.ts
/** Shape used to clear the center area behind the logo. */
declare enum LogoClearShape {
  Square = "Square",
  Circle = "Circle"
}
declare function logoClearShapeToString(shape: LogoClearShape): string;
declare function logoClearShapeFromString(s: string): LogoClearShape;
/** A pre-rendered logo for compositing onto QR codes. */
declare class Logo {
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** Fraction of QR width to occupy (0.01–0.99, default 0.25). */
  readonly fraction: number;
  /** Number of clear-border modules around the logo (0–5, default 1). */
  readonly clearBorder: number;
  /** Shape of the cleared center area. */
  readonly clearShape: LogoClearShape;
  private constructor();
  /**
   * Create a logo from SVG data, rendered at 512×512 via resvg-wasm
   * (web/Node compatible, no system deps).
   */
  static fromSvg(svgData: Uint8Array, fraction: number, clearBorder: number, clearShape: LogoClearShape): Promise<Logo>;
  /** Create a logo from raw RGBA pixels. */
  static fromRgba(pixels: Uint8Array, width: number, height: number, fraction: number, clearBorder: number, clearShape: LogoClearShape): Logo;
  /**
   * Create a logo from raster image bytes.
   *
   * Mirrors Rust `image::load_from_memory` in
   * `bc-mur::logo::Logo::from_image_bytes` — accepts the same set of
   * formats: **PNG, JPEG, GIF, BMP, WebP** (lossy + lossless). The
   * format is detected from the magic bytes; the bytes are decoded
   * to RGBA8 and stored in the `Logo`. For animated GIFs the first
   * frame is used (matching `image::load_from_memory`'s behaviour
   * when the GIF feature is enabled but no animation API is invoked).
   *
   * @throws {MurError.imageEncode} if the magic bytes don't match
   *   any supported format, or if decoding fails.
   */
  static fromImageBytes(data: Uint8Array, fraction: number, clearBorder: number, clearShape: LogoClearShape): Logo;
  /**
   * Async counterpart of {@link Logo.fromImageBytes} that adds
   * **WebP** support via `webp-wasm`. Falls through to the sync
   * decoder for PNG / JPEG / GIF / BMP.
   *
   * Mirrors Rust `image::load_from_memory`'s full WebP coverage —
   * since TS lacks a sync WebP decoder, the async API is the
   * Rust-equivalent path for WebP inputs.
   *
   * @example
   * ```ts
   * const bytes = await fs.readFile("logo.webp");
   * const logo = await Logo.fromImageBytesAsync(bytes, 0.25, 1, LogoClearShape.Square);
   * ```
   */
  static fromImageBytesAsync(data: Uint8Array, fraction: number, clearBorder: number, clearShape: LogoClearShape): Promise<Logo>;
}
//#endregion
//#region src/qr-matrix.d.ts
/**
 * Default maximum QR module count for reliable phone scanning.
 * Corresponds to QR version 25 (117×117 modules).
 */
declare const DEFAULT_MAX_MODULES = 117;
/** Get the QR module count for a message without rendering. */
declare function qrModuleCount(message: Uint8Array, correction: CorrectionLevel): number;
/**
 * Check that a module count is within a density limit.
 *
 * Throws `MurError.qrCodeTooDense` if `moduleCount > maxModules`.
 */
declare function checkQrDensity(moduleCount: number, maxModules: number): void;
//#endregion
//#region src/render.d.ts
/** An RGBA pixel buffer with encoding methods. */
declare class RenderedImage {
  /** RGBA pixels, row-major, 4 bytes per pixel. */
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
  constructor(pixels: Uint8Array, width: number, height: number);
  /**
   * Encode as PNG.
   *
   * **PNG parity with Rust** (`bc-mur::render::RenderedImage::to_png`):
   * PNG is lossless, so the *decoded pixel buffer* of the output is
   * byte-identical to `this.pixels`. The encoded byte stream may
   * differ from Rust's `image` crate output because PNG encoders
   * choose different filter strategies (Sub/Up/Average/Paeth) per
   * scanline and may apply different deflate compression levels —
   * both produce valid PNG files that decode back to identical
   * RGBA8 buffers. A decoded-pixel parity test pins this contract
   * in `tests/render-parity.test.ts > "PNG round-trip"`.
   */
  toPng(): Uint8Array;
  /**
   * Encode as JPEG at the given quality (1–100).
   *
   * **JPEG parity with Rust** (`bc-mur::render::RenderedImage::to_jpeg`):
   * the byte output is **byte-different** from Rust's `image` crate
   * even at the same quality, because:
   *   - Rust's `image` encodes RGBA → RGB by dropping alpha *before*
   *     it reaches the encoder; `jpeg-js` accepts RGBA directly and
   *     drops alpha internally.
   *   - The two encoders use different DCT quantization tables,
   *     entropy-coding heuristics, and chroma subsampling defaults.
   *
   * The output is **visually equivalent** — both decode to RGBA
   * buffers within JPEG's natural quantization noise (≈ ±15 channel
   * values at quality=90, the typical default). A decoded-pixel
   * parity test pins this contract with an epsilon in
   * `tests/render-parity.test.ts > "JPEG decoded-pixel parity"`.
   *
   * If you need byte-identical Rust↔TS JPEG output, you must run the
   * same JPEG encoder on both sides; this is intentionally **out of
   * scope** for the cross-language port.
   */
  toJpeg(quality: number): Uint8Array;
}
/**
 * Render a single-frame QR code from raw bytes.
 *
 * - `message`: bytes to encode in the QR code
 * - `correction`: error correction level
 * - `size`: target image size in pixels (square)
 * - `fg` / `bg`: foreground and background colors
 * - `quietZone`: number of background-colored modules around the QR code
 *   (default 1)
 * - `logo`: optional logo overlay
 */
declare function renderQr(message: Uint8Array, correction: CorrectionLevel, size: number, fg: Color, bg: Color, quietZone: number, logo: Logo | null): RenderedImage;
/**
 * Render a single-frame QR code from a UR string.
 *
 * The UR string is automatically uppercased for QR alphanumeric mode
 * efficiency.
 */
declare function renderUrQr(urString: string, correction: CorrectionLevel, size: number, fg: Color, bg: Color, quietZone: number, logo: Logo | null): RenderedImage;
//#endregion
//#region src/animate.d.ts
/** Parameters for multipart animated QR generation. */
interface AnimateParams {
  /** Maximum fragment length for fountain coding (default 40). */
  maxFragmentLen?: number;
  /**
   * Error correction level. `null`/undefined = auto: Low without logo,
   * High with logo.
   */
  correction?: CorrectionLevel | null;
  /** Target image size in pixels (default 512). */
  size?: number;
  /** Foreground color (default black). */
  foreground?: Color;
  /** Background color (default white). */
  background?: Color;
  /** Quiet zone modules around the QR code (default 1). */
  quietZone?: number;
  /** Optional logo overlay. */
  logo?: Logo | null;
  /** Frames per second (default 8.0). */
  fps?: number;
  /** Number of complete cycles through all fragments (default 3). */
  cycles?: number;
  /**
   * If set, use exactly this many frames instead of `partsCount * cycles`.
   * Throws `InsufficientFrames` if fewer than the fountain-coded fragment
   * count.
   */
  frameCount?: number | null;
  /**
   * If set, check each frame's QR module count against this limit. Throws
   * `QrCodeTooDense` if exceeded.
   */
  maxModules?: number | null;
}
/** A single frame of a multipart QR animation. */
declare class QrFrame {
  /** The rendered RGBA image for this frame. */
  readonly image: RenderedImage;
  /** The part index (0-based). */
  readonly index: number;
  constructor(image: RenderedImage, index: number);
}
/**
 * Generate all frames for a multipart UR animation.
 *
 * Cycles through the fountain-coded parts `params.cycles` times.
 */
declare function generateFrames(ur: UR, params?: AnimateParams): QrFrame[];
/**
 * Encode frames into an animated GIF.
 *
 * For QR codes without logos, uses a small global palette (2–4 colors).
 * For QR codes with logos, uses per-frame quantization.
 *
 * **Parity caveat (M2 in `PARITY_OUTSTANDING.md`).** Rust's
 * `bc-mur` uses the [`gif`](https://crates.io/crates/gif) crate;
 * this port uses [`gifenc`](https://www.npmjs.com/package/gifenc).
 * The two encoders produce **byte-different** GIFs for identical
 * input frames because:
 * - palette laid out differently (`gif` flattens RGB triplets into
 *   a `Vec<u8>`; `gifenc` keeps an array of `[r,g,b]` triplets and
 *   may pad to a different power-of-two table size),
 * - many-color quantization uses different algorithms (`gif`
 *   delegates to `color_quant::NeuQuant`; `gifenc` uses its own
 *   palette quantizer),
 * - LZW compression dictionary order can differ.
 *
 * The output is **visually equivalent** (same frames, same delays,
 * infinite loop, same palette colors when ≤256 unique colors), but
 * not byte-identical. Replacing the encoder is a large undertaking
 * (audit recommends accepting divergence).
 *
 * The structural invariants we *do* enforce — and that the
 * `tests/integration.test.ts > "gif structure (M2)"` test pins — are:
 * - `GIF89a` magic at byte 0.
 * - `NETSCAPE2.0` application extension present (= multi-frame
 *   animated GIF).
 * - Loop count `0x0000` (= repeat forever) per the `repeat: 0`
 *   argument below.
 * - One image-separator byte (`0x2c`) per frame.
 */
declare function encodeAnimatedGif(frames: readonly QrFrame[], fps: number): Uint8Array;
/** Write frames as numbered PNG files (Node-only — uses fs). */
declare function writeFramePngs(frames: readonly QrFrame[], outputDir: string): Promise<void>;
//#endregion
//#region src/error.d.ts
/**
 * Copyright © 2026 Blockchain Commons, LLC
 * Copyright © 2026 Parity Technologies
 *
 * Port of `bc-mur::error`.
 */
type ErrorVariant = {
  kind: "QrEncode";
  message: string;
} | {
  kind: "ImageEncode";
  message: string;
} | {
  kind: "SvgRender";
  message: string;
} | {
  kind: "InvalidColor";
  message: string;
} | {
  kind: "InvalidParameter";
  message: string;
} | {
  kind: "GifEncode";
  message: string;
} | {
  kind: "FfmpegNotFound";
} | {
  kind: "FfmpegFailed";
  message: string;
} | {
  kind: "QrCodeTooDense";
  moduleCount: number;
  maxModules: number;
} | {
  kind: "InsufficientFrames";
  requested: number;
  fragments: number;
} | {
  kind: "Io";
  message: string;
} | {
  kind: "Ur";
  message: string;
};
declare class MurError extends Error {
  readonly variant: ErrorVariant;
  constructor(variant: ErrorVariant);
  static formatMessage(v: ErrorVariant): string;
  static qrEncode(message: string): MurError;
  static imageEncode(message: string): MurError;
  static svgRender(message: string): MurError;
  static invalidColor(message: string): MurError;
  static invalidParameter(message: string): MurError;
  static gifEncode(message: string): MurError;
  static ffmpegNotFound(): MurError;
  static ffmpegFailed(message: string): MurError;
  static qrCodeTooDense(moduleCount: number, maxModules: number): MurError;
  static insufficientFrames(requested: number, fragments: number): MurError;
  static io(message: string): MurError;
  static ur(message: string): MurError;
  isKind<K extends ErrorVariant["kind"]>(kind: K): this is MurError & {
    variant: Extract<ErrorVariant, {
      kind: K;
    }>;
  };
}
/**
 * Rust returns `Result<T, Error>`; the TS port is throw-based, so fallible
 * functions simply return `T` and throw `MurError` on failure. This alias
 * is kept for source-level alignment with rust signatures — think of it as
 * "the function returns `T`, but may throw `MurError`".
 */
type Result<T> = T;
//#endregion
//#region src/prores.d.ts
/**
 * Encode frames to ProRes 4444 via ffmpeg subprocess.
 *
 * Writes frames as temporary PNGs, invokes ffmpeg, and cleans up the
 * temp directory. Requires `ffmpeg` on PATH.
 */
declare function encodeProres(frames: readonly QrFrame[], fps: number, outputPath: string): Promise<void>;
//#endregion
//#region src/svg.d.ts
/**
 * Initialize the WASM module used for SVG rasterization.
 *
 * In Node.js, the WASM file is auto-resolved from this package's
 * dependency tree.
 *
 * In a browser, the caller must pass an `InitInput` (URL, Response,
 * BufferSource, WebAssembly.Module, or a Promise of one) before invoking
 * any SVG-rendering API.
 */
declare function initSvgRenderer(wasm?: Parameters<typeof initWasm>[0]): Promise<void>;
//#endregion
export { type AnimateParams, Color, CorrectionLevel, DEFAULT_MAX_MODULES, MurError as Error, MurError, type ErrorVariant, Logo, LogoClearShape, QrFrame, RenderedImage, type Result, checkQrDensity, correctionLevelFromString, correctionLevelToString, encodeAnimatedGif, encodeProres, generateFrames, initSvgRenderer, logoClearShapeFromString, logoClearShapeToString, qrModuleCount, renderQr, renderUrQr, writeFramePngs };
//# sourceMappingURL=index.d.mts.map