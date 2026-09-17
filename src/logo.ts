/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import * as jpeg from "jpeg-js";
import { type DecodedPng, decode as decodePng } from "fast-png";
import { MurError, messageOf } from "./error.js";
import { expectBytes, expectNumber } from "./guards.js";
import { type RgbaImage, expectImage } from "./image.js";

/** The shape cleared behind the logo; the string is the reference's `Display`/`FromStr` form. */
export type LogoClearShape = "square" | "circle";

/** Every {@link LogoClearShape}. */
export const LOGO_CLEAR_SHAPES: readonly LogoClearShape[] = Object.freeze(["square", "circle"]);

/**
 * The shape a name denotes, case-insensitively (the reference's `FromStr`).
 * Anything else throws an `Error` carrying the reference's message, which
 * is a bare string there rather than an error variant.
 */
export function parseClearShape(s: string): LogoClearShape {
  switch (s.toLowerCase()) {
    case "square":
      return "square";
    case "circle":
      return "circle";
    default:
      throw new Error(`unknown clear shape: ${s} (expected square or circle)`);
  }
}

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
   * A logo decoded from PNG or JPEG bytes, the formats the reference is
   * built with, as its `into_rgba8` decodes them: every PNG colour type
   * and bit depth (palettes and `tRNS` expanded, sub-byte grey scaled,
   * 16-bit samples as `(c + 128) / 257`). Any other format, or bytes that
   * do not decode, are `ImageEncode` (`failed to decode image: …` with
   * the reference's wording: `The image format Gif is not supported`,
   * `The image format could not be determined`). SVG needs the
   * `/svg-logo` entry (`logoFromSvg`).
   */
  static fromImageBytes(data: Uint8Array, options: LogoOptions = {}): Logo {
    const { fraction, clearBorder, clearShape } = resolveLogoOptions(options);
    expectBytes("data", data);
    let image: RgbaImage;
    try {
      image = decodeImage(data);
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

// Decoding ------------------------------------------------------------------

/** The reference's format sniffing (`image::guess_format`): a signature, an optional mask, the format's name. */
const MAGIC_BYTES: readonly [readonly number[], readonly number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [], "Png"],
  [[0xff, 0xd8, 0xff], [], "Jpeg"],
  [[0x47, 0x49, 0x46, 0x38, 0x39, 0x61], [], "Gif"],
  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [], "Gif"],
  [
    [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
    [0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0],
    "WebP",
  ],
  [[0x4d, 0x4d, 0x00, 0x2a], [], "Tiff"],
  [[0x49, 0x49, 0x2a, 0x00], [], "Tiff"],
  [[0x44, 0x44, 0x53, 0x20], [], "Dds"],
  [[0x42, 0x4d], [], "Bmp"],
  [[0, 0, 1, 0], [], "Ico"],
  [[0x23, 0x3f, 0x52, 0x41, 0x44, 0x49, 0x41, 0x4e, 0x43, 0x45], [], "Hdr"],
  [[0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], [0xff, 0xff, 0, 0], "Avif"],
  [[0x76, 0x2f, 0x31, 0x01], [], "OpenExr"],
  [[0x71, 0x6f, 0x69, 0x66], [], "Qoi"],
  [[0x50, 0x31], [], "Pnm"],
  [[0x50, 0x32], [], "Pnm"],
  [[0x50, 0x33], [], "Pnm"],
  [[0x50, 0x34], [], "Pnm"],
  [[0x50, 0x35], [], "Pnm"],
  [[0x50, 0x36], [], "Pnm"],
  [[0x50, 0x37], [], "Pnm"],
  [[0x66, 0x61, 0x72, 0x62, 0x66, 0x65, 0x6c, 0x64], [], "Farbfeld"],
];

/** The format the bytes' signature names, or `undefined`. */
function guessFormat(data: Uint8Array): string | undefined {
  for (const [signature, mask, format] of MAGIC_BYTES) {
    if (data.length < signature.length) continue;
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if ((data[i] & (mask[i] ?? 0xff)) !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return format;
  }
  return undefined;
}

/** PNG or JPEG bytes as straight RGBA8, as `image::load_from_memory(..).into_rgba8()` decodes them. */
function decodeImage(data: Uint8Array): RgbaImage {
  const format = guessFormat(data);
  if (format === "Png") return decodePngRgba8(data);
  if (format === "Jpeg") {
    const decoded = jpeg.decode(data, { useTArray: true });
    const pixels = decoded.data instanceof Uint8Array ? decoded.data : new Uint8Array(decoded.data);
    return { width: decoded.width, height: decoded.height, pixels };
  }
  throw new Error(
    format === undefined
      ? "The image format could not be determined"
      : `The image format ${format} is not supported`,
  );
}

function decodePngRgba8(data: Uint8Array): RgbaImage {
  // The IHDR's interlace byte and bit depth: fast-png decodes an interlaced
  // image with a bit depth below 8 wrongly, so it is refused rather than
  // rendered from garbage.
  if (data[28] === 1 && data[24] < 8) {
    throw new Error("interlaced PNG with a bit depth below 8 is not supported");
  }
  const png = decodePng(data);
  return { width: png.width, height: png.height, pixels: pngToRgba8(png) };
}

/** `(c + 128) / 257`, the reference's 16-bit to 8-bit sample conversion. */
const sample8 = (c: number): number => Math.floor((c + 128) / 257);

/**
 * A decoded PNG as RGBA8, as the reference's `png` crate expands it and
 * `image` converts it: palette entries (with `tRNS` alpha), sub-byte grey
 * scaled by `255 / (2^depth - 1)`, a `tRNS` colour key as alpha 0, and
 * 16-bit samples through `sample8`.
 */
function pngToRgba8(png: DecodedPng): Uint8Array {
  const { width, height, depth, channels, palette, transparency } = png;
  const count = width * height;
  const out = new Uint8Array(count * 4);
  if (palette !== undefined) {
    const indices = unpackRows(png.data as Uint8Array, width, height, depth);
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const entry = palette[indices[i]];
      if (entry === undefined) throw new Error(`palette index ${indices[i]} out of range`);
      out[j] = entry[0];
      out[j + 1] = entry[1];
      out[j + 2] = entry[2];
      out[j + 3] = entry[3] ?? 255;
    }
    return out;
  }
  if (depth === 16) {
    const data = png.data as Uint16Array;
    // The colour key's 16-bit samples; no sample matches −1.
    const key: ArrayLike<number> = transparency ?? [-1, -1, -1];
    for (let i = 0, j = 0, k = 0; i < count; i++, j += 4, k += channels) {
      let alpha = 0xffff;
      switch (channels) {
        case 1:
          out[j] = out[j + 1] = out[j + 2] = sample8(data[k]);
          if (data[k] === key[0]) alpha = 0;
          break;
        case 2:
          out[j] = out[j + 1] = out[j + 2] = sample8(data[k]);
          alpha = data[k + 1];
          break;
        case 3:
          out[j] = sample8(data[k]);
          out[j + 1] = sample8(data[k + 1]);
          out[j + 2] = sample8(data[k + 2]);
          if (data[k] === key[0] && data[k + 1] === key[1] && data[k + 2] === key[2]) alpha = 0;
          break;
        default:
          out[j] = sample8(data[k]);
          out[j + 1] = sample8(data[k + 1]);
          out[j + 2] = sample8(data[k + 2]);
          alpha = data[k + 3];
      }
      out[j + 3] = sample8(alpha);
    }
    return out;
  }
  const data = png.data as Uint8Array;
  if (depth < 8) {
    // Grey only: the other colour types need 8 bits or more.
    const scale = Math.floor(255 / ((1 << depth) - 1));
    const values = unpackRows(data, width, height, depth);
    const key = transparency === undefined ? -1 : transparency[0] & 0xff;
    for (let i = 0, j = 0; i < count; i++, j += 4) {
      const v = values[i];
      out[j] = out[j + 1] = out[j + 2] = v * scale;
      out[j + 3] = v === key ? 0 : 255;
    }
    return out;
  }
  // The colour key's low bytes at 8 bits (the reference keeps those); no key matches −1.
  const key = transparency === undefined ? [-1, -1, -1] : Array.from(transparency, (v) => v & 0xff);
  for (let i = 0, j = 0, k = 0; i < count; i++, j += 4, k += channels) {
    switch (channels) {
      case 1: {
        out[j] = out[j + 1] = out[j + 2] = data[k];
        out[j + 3] = data[k] === key[0] ? 0 : 255;
        break;
      }
      case 2:
        out[j] = out[j + 1] = out[j + 2] = data[k];
        out[j + 3] = data[k + 1];
        break;
      case 3: {
        out[j] = data[k];
        out[j + 1] = data[k + 1];
        out[j + 2] = data[k + 2];
        out[j + 3] =
          data[k] === key[0] && data[k + 1] === key[1] && data[k + 2] === key[2] ? 0 : 255;
        break;
      }
      default:
        out[j] = data[k];
        out[j + 1] = data[k + 1];
        out[j + 2] = data[k + 2];
        out[j + 3] = data[k + 3];
    }
  }
  return out;
}

/** Sub-byte samples unpacked one per byte, most significant first; rows are byte-aligned. 8-bit data is returned as is. */
function unpackRows(packed: Uint8Array, width: number, height: number, depth: number): Uint8Array {
  if (depth === 8) return packed;
  const out = new Uint8Array(width * height);
  const bytesPerRow = Math.ceil((width * depth) / 8);
  const perByte = 8 / depth;
  const mask = (1 << depth) - 1;
  for (let y = 0; y < height; y++) {
    const row = y * bytesPerRow;
    for (let x = 0; x < width; x++) {
      const byte = packed[row + Math.floor(x / perByte)];
      out[y * width + x] = (byte >> (8 - depth * ((x % perByte) + 1))) & mask;
    }
  }
  return out;
}
