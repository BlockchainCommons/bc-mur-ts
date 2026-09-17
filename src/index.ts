/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * `@blockchaincommons/multipart-ur` — QR codes and animated fountain-coded
 * QR sequences for Uniform Resources, a port of `bc-mur-rust`.
 *
 * This root entry is browser-compatible and loads no WASM: QR encoding,
 * PNG/JPEG output, PNG and JPEG logos and frame generation
 * (`writeFramePngs` is Node only). The encoders that need more live on
 * subpath entries: `/gif`, `/svg-logo`, `/prores` (ffmpeg, Node only) and
 * `/cli`.
 *
 * @packageDocumentation
 */

export { Color, type ColorInput } from "./color.js";
export { CORRECTION_LEVELS, type CorrectionLevel, parseCorrectionLevel } from "./correction.js";
export {
  MUR_ERROR_CODES,
  MurError,
  type MurErrorCode,
  type MurErrorDetails,
  type MurErrorDetailsByCode,
  type MurErrorTyped,
} from "./error.js";
export { type FrameOptions, type QrFrame, generateFrames, writeFramePngs } from "./frames.js";
export type { RgbaImage } from "./image.js";
export {
  LOGO_CLEAR_SHAPES,
  Logo,
  type LogoClearShape,
  type LogoOptions,
  parseClearShape,
} from "./logo.js";
export { DEFAULT_MAX_MODULES, checkQrDensity, qrModuleCount } from "./qr-matrix.js";
export { type RenderOptions, RenderedImage, renderQr, renderUrQr } from "./render.js";
