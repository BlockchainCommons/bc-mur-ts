/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import * as jpeg from "jpeg-js";
import { decode as decodePng } from "fast-png";
import { GifReader } from "omggif";
import { MurError, messageOf } from "./error.js";
import { expectBytes, expectNumber } from "./guards.js";
import { type RgbaImage, expectImage } from "./image.js";

/** The shape cleared behind the logo; the string is the reference's `Display`/`FromStr` form. */
export type LogoClearShape = "square" | "circle";

/** Every {@link LogoClearShape}. */
export const LOGO_CLEAR_SHAPES: readonly LogoClearShape[] = Object.freeze(["square", "circle"]);

/** How a logo sits on the QR code. */
export interface LogoOptions {
  /** The logo's width as a fraction of the QR code's module width, 0.01–0.99 (default 0.25). */
  fraction?: number;
  /** Modules cleared around the logo, an integer 0–5 (default 1). */
  clearBorder?: number;
  /** The cleared area's shape (default `"square"`). */
  clearShape?: LogoClearShape;
}

/** An RGBA logo to overlay on the centre of a QR code. Instances are frozen and own their pixels. */
export class Logo implements RgbaImage {
  /** The straight-alpha RGBA pixels, row-major. */
  readonly pixels: Uint8Array;
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
  /** The logo's width as a fraction of the QR code's module width. */
  readonly fraction: number;
  /** Modules cleared around the logo. */
  readonly clearBorder: number;
  /** The cleared area's shape. */
  readonly clearShape: LogoClearShape;

  private constructor(
    image: RgbaImage,
    fraction: number,
    clearBorder: number,
    clearShape: LogoClearShape,
  ) {
    this.pixels = image.pixels;
    this.width = image.width;
    this.height = image.height;
    this.fraction = fraction;
    this.clearBorder = clearBorder;
    this.clearShape = clearShape;
    Object.freeze(this);
  }

  /** A logo from a raw RGBA raster (copied). */
  static fromRgba(image: RgbaImage, options: LogoOptions = {}): Logo {
    const { fraction, clearBorder, clearShape } = resolveLogoOptions(options);
    expectImage(image);
    return new Logo(
      { width: image.width, height: image.height, pixels: image.pixels.slice() },
      fraction,
      clearBorder,
      clearShape,
    );
  }

  /**
   * A logo decoded from PNG, JPEG, GIF (first frame) or BMP (24/32-bit
   * uncompressed) bytes. The reference decodes PNG and JPEG only; GIF and
   * BMP are extensions. WebP needs the `/webp` entry (`logoFromWebp`) and
   * SVG the `/svg-logo` entry (`logoFromSvg`).
   */
  static fromImageBytes(data: Uint8Array, options: LogoOptions = {}): Logo {
    const { fraction, clearBorder, clearShape } = resolveLogoOptions(options);
    expectBytes("data", data);
    let image: RgbaImage;
    try {
      if (isPng(data)) {
        const decoded = decodePng(data);
        image = {
          width: decoded.width,
          height: decoded.height,
          pixels: ensureRgba8(
            new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
            decoded.channels ?? 4,
            decoded.depth ?? 8,
          ),
        };
      } else if (isJpeg(data)) {
        const decoded = jpeg.decode(data, { useTArray: true });
        image = {
          width: decoded.width,
          height: decoded.height,
          pixels: decoded.data instanceof Uint8Array ? decoded.data : new Uint8Array(decoded.data),
        };
      } else if (isGif(data)) {
        image = decodeGif(data);
      } else if (isBmp(data)) {
        image = decodeBmp(data);
      } else if (isWebp(data)) {
        throw new Error(
          "WebP decoding requires the async API — use `logoFromWebp` from the `/webp` entry instead",
        );
      } else {
        throw new Error("unrecognized format (expected PNG, JPEG, GIF, or BMP)");
      }
    } catch (e) {
      throw MurError.imageEncode(`failed to decode image: ${messageOf(e)}`, e);
    }
    return new Logo(image, fraction, clearBorder, clearShape);
  }
}

/** @internal The validated options with defaults applied. */
export function resolveLogoOptions(options: LogoOptions): Required<LogoOptions> {
  const fraction = validateFraction(options.fraction ?? 0.25);
  const clearBorder = validateClearBorder(options.clearBorder ?? 1);
  const clearShape = options.clearShape ?? "square";
  if (!LOGO_CLEAR_SHAPES.includes(clearShape)) {
    throw MurError.invalidParameter(
      `unknown clear shape: ${String(clearShape)} (expected square or circle)`,
    );
  }
  return { fraction, clearBorder, clearShape };
}

/** @internal Whether the bytes start with the RIFF/WEBP signature. */
export { isWebp };

/** @internal */
export function validateFraction(f: number): number {
  return expectNumber("logo fraction", f, 0.01, 0.99);
}

/** @internal */
export function validateClearBorder(b: number): number {
  if (typeof b !== "number" || !Number.isInteger(b) || b < 0 || b > 5) {
    throw MurError.invalidParameter(`clear_border must be 0–5, got ${String(b)}`);
  }
  return b;
}

function isPng(data: Uint8Array): boolean {
  return (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  );
}

function isJpeg(data: Uint8Array): boolean {
  return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

/** GIF87a / GIF89a magic bytes. */
function isGif(data: Uint8Array): boolean {
  return (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  );
}

/** BMP magic bytes — `BM`. */
function isBmp(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x42 && data[1] === 0x4d;
}

/** WebP magic bytes — `RIFF....WEBP`. */
function isWebp(data: Uint8Array): boolean {
  return (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  );
}

/** Decodes a GIF to RGBA8 (the first frame of an animation). */
function decodeGif(data: Uint8Array): RgbaImage {
  const reader = new GifReader(data);
  const width = reader.width;
  const height = reader.height;
  const pixels = new Uint8Array(width * height * 4);
  reader.decodeAndBlitFrameRGBA(0, pixels);
  return { width, height, pixels };
}

/**
 * Decodes an uncompressed 24-bit or 32-bit BMP (`BI_RGB`) to RGBA8. RLE,
 * 16-bit and paletted BMPs are a decode error.
 */
function decodeBmp(data: Uint8Array): RgbaImage {
  if (data.length < 54) {
    throw new Error("BMP too small (expected at least 54 header bytes)");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const dataOffset = view.getUint32(10, true);
  const dibSize = view.getUint32(14, true);
  if (dibSize < 40) {
    throw new Error(`unsupported BMP DIB header size: ${dibSize}`);
  }
  const width = view.getInt32(18, true);
  const heightSigned = view.getInt32(22, true);
  const height = Math.abs(heightSigned);
  const topDown = heightSigned < 0;
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  if (compression !== 0) {
    throw new Error(`unsupported BMP compression: ${compression} (only BI_RGB is supported)`);
  }
  if (bpp !== 24 && bpp !== 32) {
    throw new Error(`unsupported BMP bit depth: ${bpp} (expected 24 or 32)`);
  }
  const bytesPerPixel = bpp / 8;
  // BMP rows are padded to 4-byte boundaries.
  const rowStride = Math.ceil((width * bpp) / 32) * 4;
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const srcRow = topDown ? y : height - 1 - y;
    const srcOffset = dataOffset + srcRow * rowStride;
    if (srcOffset + width * bytesPerPixel > data.length) {
      throw new Error("BMP truncated row data");
    }
    for (let x = 0; x < width; x++) {
      const px = srcOffset + x * bytesPerPixel;
      const dst = (y * width + x) * 4;
      // BMP stores pixels as B, G, R[, A].
      pixels[dst] = data[px + 2]!;
      pixels[dst + 1] = data[px + 1]!;
      pixels[dst + 2] = data[px]!;
      pixels[dst + 3] = bpp === 32 ? data[px + 3]! : 255;
    }
  }
  return { width, height, pixels };
}

function ensureRgba8(data: Uint8Array, channels: number, depth: number): Uint8Array {
  if (depth !== 8) {
    throw MurError.imageEncode(`unsupported PNG bit depth: ${depth} (expected 8)`);
  }
  if (channels === 4) {
    return data;
  }
  if (channels === 3) {
    const px = data.length / 3;
    const out = new Uint8Array(px * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      out[j] = data[i]!;
      out[j + 1] = data[i + 1]!;
      out[j + 2] = data[i + 2]!;
      out[j + 3] = 255;
    }
    return out;
  }
  if (channels === 2) {
    const px = data.length / 2;
    const out = new Uint8Array(px * 4);
    for (let i = 0, j = 0; i < data.length; i += 2, j += 4) {
      const v = data[i];
      out[j] = v;
      out[j + 1] = v;
      out[j + 2] = v;
      out[j + 3] = data[i + 1]!;
    }
    return out;
  }
  if (channels === 1) {
    const out = new Uint8Array(data.length * 4);
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      const v = data[i];
      out[j] = v;
      out[j + 1] = v;
      out[j + 2] = v;
      out[j + 3] = 255;
    }
    return out;
  }
  throw MurError.imageEncode(`unsupported PNG channel count: ${channels}`);
}
