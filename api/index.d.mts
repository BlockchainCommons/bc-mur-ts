import { a as RenderOptions, c as renderUrQr, d as Color, f as ColorInput, i as writeFramePngs, l as CORRECTION_LEVELS, n as QrFrame, o as RenderedImage, r as generateFrames, s as renderQr, t as FrameOptions, u as CorrectionLevel } from "./frames-BVsJzpXh.mjs";
import { a as RgbaImage, i as LogoOptions, n as Logo, r as LogoClearShape, t as LOGO_CLEAR_SHAPES } from "./logo-BfjBhkoX.mjs";
//#region src/qr-matrix.d.ts
/**
 * Default maximum QR module count for reliable phone scanning.
 * Corresponds to QR version 25 (117×117 modules).
 */
export declare const DEFAULT_MAX_MODULES = 117;
/** The QR module count of a message without rendering it. */
export declare function qrModuleCount(message: Uint8Array, correction: CorrectionLevel): number;
/**
 * Checks that a module count is within a density limit: `QrCodeTooDense` if
 * `moduleCount > maxModules`. Both are non-negative integers.
 */
export declare function checkQrDensity(moduleCount: number, maxModules: number): void;
//#endregion
//#region src/error.d.ts
/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Errors. Every failure the library reports is a `MurError`: `code` names
 * the reference's `Error` variant, `details` carries that variant's fields
 * (typed per code), `message` is the reference's `Display` text, and
 * `cause` is the wrapped error when a dependency failed.
 *
 * @module error
 */
/** The reference `Error` variants, as string codes. */
type MurErrorCode = "QrEncode" | "ImageEncode" | "SvgRender" | "InvalidColor" | "InvalidParameter" | "GifEncode" | "FfmpegNotFound" | "FfmpegFailed" | "QrCodeTooDense" | "InsufficientFrames" | "Io" | "Ur";
/** Every {@link MurErrorCode}, in the reference's declaration order. */
export declare const MUR_ERROR_CODES: readonly MurErrorCode[];
/** The structured payload each {@link MurErrorCode} carries. */
interface MurErrorDetailsByCode {
  /** The QR encoder's message. */
  QrEncode: {
    readonly message: string;
  };
  /** The image encoder's or decoder's message. */
  ImageEncode: {
    readonly message: string;
  };
  /** The SVG rasteriser's message. */
  SvgRender: {
    readonly message: string;
  };
  /** Why the colour was rejected. */
  InvalidColor: {
    readonly message: string;
  };
  /** Which argument was rejected and why. */
  InvalidParameter: {
    readonly message: string;
  };
  /** The GIF encoder's message. */
  GifEncode: {
    readonly message: string;
  };
  /** No fields: `ffmpeg` was not found on `PATH`. */
  FfmpegNotFound: Record<never, never>;
  /** How `ffmpeg` failed, with what it wrote to stderr when it ran. */
  FfmpegFailed: {
    readonly message: string;
    readonly stderr?: string;
  };
  /** The symbol's module count and the limit it exceeded. */
  QrCodeTooDense: {
    readonly moduleCount: number;
    readonly maxModules: number;
  };
  /** The frames requested and the fragments the message needs. */
  InsufficientFrames: {
    readonly requested: number;
    readonly fragments: number;
  };
  /** The file-system error's message and, when known, the path. */
  Io: {
    readonly message: string;
    readonly path?: string;
  };
  /** The `uniform-resources` error's message. */
  Ur: {
    readonly message: string;
  };
}
/**
 * A {@link MurError} whose `details` is discriminated by its `code`.
 * Narrowing on `error.code` narrows `error.details` to that code's fields:
 *
 * ```typescript
 * try {
 *   generateFrames(ur, { frameCount: 1 });
 * } catch (e) {
 *   if (MurError.isMurError(e) && e.code === "InsufficientFrames") {
 *     e.details.requested; // number
 *   }
 * }
 * ```
 */
type MurErrorTyped<C extends MurErrorCode = MurErrorCode> = C extends MurErrorCode ? MurError & {
  readonly code: C;
  readonly details: Readonly<MurErrorDetailsByCode[C]>;
} : never;
/** The `details` of any code. */
type MurErrorDetails = Readonly<MurErrorDetailsByCode[MurErrorCode]>;
/** The single error type thrown by the library. Built through the static factories only. */
export declare class MurError extends Error {
  /** Always `"MurError"`. */
  override readonly name = "MurError";
  /** The reference's variant name; switch on this to handle errors. */
  readonly code: MurErrorCode;
  /** The variant's fields (see {@link MurErrorDetailsByCode}); frozen. */
  readonly details: MurErrorDetails;
  private constructor();
  /** Type guard: is `value` a `MurError` (from any copy of this package)? Narrows to {@link MurErrorTyped}. */
  static isMurError(value: unknown): value is MurErrorTyped;
  /** Whether this error has `code`; narrows `details` to that code's fields. */
  is<C extends MurErrorCode>(code: C): this is MurErrorTyped<C>;
  /** `QrEncode`: the QR encoder rejected the message (too long for version 40 at this level). */
  static qrEncode(message: string, cause?: unknown): MurErrorTyped<"QrEncode">;
  /** `ImageEncode`: PNG/JPEG encoding or logo decoding failed. */
  static imageEncode(message: string, cause?: unknown): MurErrorTyped<"ImageEncode">;
  /** `SvgRender`: the SVG could not be parsed or rasterised. */
  static svgRender(message: string, cause?: unknown): MurErrorTyped<"SvgRender">;
  /** `InvalidColor`: a hex string or channel value is not a colour. */
  static invalidColor(message: string): MurErrorTyped<"InvalidColor">;
  /** `InvalidParameter`: an argument is outside its domain. */
  static invalidParameter(message: string): MurErrorTyped<"InvalidParameter">;
  /** `GifEncode`: the GIF encoder failed. */
  static gifEncode(message: string, cause?: unknown): MurErrorTyped<"GifEncode">;
  /** `FfmpegNotFound`: no `ffmpeg` on `PATH`. */
  static ffmpegNotFound(): MurErrorTyped<"FfmpegNotFound">;
  /** `FfmpegFailed`: `ffmpeg` could not be started or exited with a failure status. */
  static ffmpegFailed(message: string, options?: {
    cause?: unknown;
    stderr?: string;
  }): MurErrorTyped<"FfmpegFailed">;
  /** `QrCodeTooDense`: the symbol has more modules than the limit allows. */
  static qrCodeTooDense(moduleCount: number, maxModules: number): MurErrorTyped<"QrCodeTooDense">;
  /** `InsufficientFrames`: fewer frames than the message has fragments. */
  static insufficientFrames(requested: number, fragments: number): MurErrorTyped<"InsufficientFrames">;
  /** `Io`: a file could not be read, written or created. */
  static io(message: string, options?: {
    cause?: unknown;
    path?: string;
  }): MurErrorTyped<"Io">;
  /** `Ur`: `uniform-resources` rejected the UR or the fragment length. */
  static ur(message: string, cause?: unknown): MurErrorTyped<"Ur">;
}
//#endregion
export { CORRECTION_LEVELS, Color, type ColorInput, type CorrectionLevel, type FrameOptions, LOGO_CLEAR_SHAPES, Logo, type LogoClearShape, type LogoOptions, type MurErrorCode, type MurErrorDetails, type MurErrorDetailsByCode, type MurErrorTyped, type QrFrame, type RenderOptions, RenderedImage, type RgbaImage, generateFrames, renderQr, renderUrQr, writeFramePngs };
//# sourceMappingURL=index.d.mts.map