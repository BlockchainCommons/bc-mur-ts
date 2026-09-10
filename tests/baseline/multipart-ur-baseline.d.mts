import { a as RenderOptions, c as renderUrQr, d as Color, f as ColorInput, i as writeFramePngs, l as CORRECTION_LEVELS, n as QrFrame, o as RenderedImage, r as generateFrames, s as renderQr, t as FrameOptions, u as CorrectionLevel } from "./frames-mohsFq8h.mjs";
import { a as Image, i as LogoOptions, n as Logo, r as LogoClearShape, t as LOGO_CLEAR_SHAPES } from "./logo-Dw67z8F5.mjs";
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
//#region src/error.d.ts
/**
 * Copyright © 2026 Blockchain Commons, LLC
 */
/** The error kinds of the reference `Error` enum, as a string code. */
type MurErrorCode = "QrEncode" | "ImageEncode" | "SvgRender" | "InvalidColor" | "InvalidParameter" | "GifEncode" | "FfmpegNotFound" | "FfmpegFailed" | "QrCodeTooDense" | "InsufficientFrames" | "Io" | "Ur";
declare const MUR_ERROR_CODES: readonly MurErrorCode[];
/** A kind that carries a message from the failing operation. */
interface MessageDetails {
  code: Exclude<MurErrorCode, "FfmpegNotFound" | "QrCodeTooDense" | "InsufficientFrames">;
  message: string;
}
interface FfmpegNotFoundDetails {
  code: "FfmpegNotFound";
}
interface QrCodeTooDenseDetails {
  code: "QrCodeTooDense";
  moduleCount: number;
  maxModules: number;
}
interface InsufficientFramesDetails {
  code: "InsufficientFrames";
  requested: number;
  fragments: number;
}
type MurErrorDetails = MessageDetails | FfmpegNotFoundDetails | QrCodeTooDenseDetails | InsufficientFramesDetails;
/**
 * The library's error: `code` names the reference variant, `details` carries
 * the variant's fields, `message` is the reference `Display` text, and
 * `cause` is the wrapped error when a dependency failed.
 */
declare class MurError extends Error {
  override readonly name = "MurError";
  readonly code: MurErrorCode;
  readonly details: MurErrorDetails;
  private constructor();
  static isMurError(value: unknown): value is MurError;
  is(code: MurErrorCode): boolean;
  private static withMessage;
  static qrEncode(message: string, cause?: unknown): MurError;
  static imageEncode(message: string, cause?: unknown): MurError;
  static svgRender(message: string, cause?: unknown): MurError;
  static invalidColor(message: string): MurError;
  static invalidParameter(message: string): MurError;
  static gifEncode(message: string, cause?: unknown): MurError;
  static ffmpegNotFound(): MurError;
  static ffmpegFailed(message: string, cause?: unknown): MurError;
  static qrCodeTooDense(moduleCount: number, maxModules: number): MurError;
  static insufficientFrames(requested: number, fragments: number): MurError;
  static io(message: string, cause?: unknown): MurError;
  static ur(message: string, cause?: unknown): MurError;
}
//#endregion
export { CORRECTION_LEVELS, Color, type ColorInput, type CorrectionLevel, DEFAULT_MAX_MODULES, type FfmpegNotFoundDetails, type FrameOptions, type Image, type InsufficientFramesDetails, LOGO_CLEAR_SHAPES, Logo, type LogoClearShape, type LogoOptions, MUR_ERROR_CODES, type MessageDetails, MurError, type MurErrorCode, type MurErrorDetails, type QrCodeTooDenseDetails, type QrFrame, type RenderOptions, RenderedImage, checkQrDensity, generateFrames, qrModuleCount, renderQr, renderUrQr, writeFramePngs };
//# sourceMappingURL=index.d.mts.map