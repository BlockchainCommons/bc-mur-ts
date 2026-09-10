/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { encode as encodePng } from "fast-png";
import * as jpeg from "jpeg-js";
import { UR } from "@blockchaincommons/uniform-resources";
import { Color, type ColorInput } from "./color.js";
import { CORRECTION_LEVELS, type CorrectionLevel } from "./correction.js";
import { MurError, messageOf } from "./error.js";
import { describe, expectBytes, expectInteger } from "./guards.js";
import { type RgbaImage, expectImage } from "./image.js";
import { Logo } from "./logo.js";
import { QrMatrix } from "./qr-matrix.js";

/** How a QR code is drawn. Every field has a default. */
export interface RenderOptions {
  /** Error-correction level (default `"high"` with a logo, otherwise `"low"`). */
  correction?: CorrectionLevel;
  /** Output width and height in pixels, a positive integer (default 512). */
  size?: number;
  /** Module colour (default black). */
  foreground?: ColorInput;
  /** Background colour (default white). */
  background?: ColorInput;
  /** Blank modules around the code, a non-negative integer (default 1). */
  quietZone?: number;
  /** A logo composited over the centre. */
  logo?: Logo | null;
}

/** @internal `RenderOptions` with the defaults applied. */
export interface ResolvedRenderOptions {
  correction: CorrectionLevel;
  size: number;
  foreground: Color;
  background: Color;
  quietZone: number;
  logo: Logo | null;
}

/** @internal */
export function resolveRenderOptions(options: RenderOptions): ResolvedRenderOptions {
  const logo = options.logo ?? null;
  if (logo !== null && !(logo instanceof Logo)) {
    throw MurError.invalidParameter(`logo must be a Logo, got ${describe(logo)}`);
  }
  const size = options.size ?? 512;
  const quietZone = options.quietZone ?? 1;
  if (!Number.isInteger(size) || size < 1) {
    throw MurError.invalidParameter(`size must be a positive integer, got ${String(size)}`);
  }
  if (!Number.isInteger(quietZone) || quietZone < 0) {
    throw MurError.invalidParameter(
      `quiet zone must be a non-negative integer, got ${String(quietZone)}`,
    );
  }
  const correction = options.correction ?? (logo ? "high" : "low");
  if (!CORRECTION_LEVELS.includes(correction)) {
    throw MurError.invalidParameter(
      `unknown correction level: ${String(correction)} (expected low, medium, quartile, or high)`,
    );
  }
  return {
    correction,
    size,
    foreground: Color.from(options.foreground ?? Color.BLACK),
    background: Color.from(options.background ?? Color.WHITE),
    quietZone,
    logo,
  };
}

/** A rendered QR code: an RGBA raster with PNG and JPEG encoders. */
export class RenderedImage implements RgbaImage {
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
  /** The RGBA pixels, row-major, `width * height * 4` bytes. */
  readonly pixels: Uint8Array;
  /** Always 4 (RGBA). */
  readonly channels = 4 as const;

  /** Wraps `image` (its buffer is used as is, not copied); `InvalidParameter` unless it is a well-formed `RgbaImage`. */
  constructor(image: RgbaImage) {
    expectImage(image);
    this.width = image.width;
    this.height = image.height;
    this.pixels = image.pixels;
    Object.freeze(this);
  }

  /** PNG bytes (RGBA, 8-bit). */
  toPng(): Uint8Array {
    try {
      return encodePng({
        width: this.width,
        height: this.height,
        data: this.pixels,
        depth: 8,
        channels: 4,
      });
    } catch (e) {
      throw MurError.imageEncode(messageOf(e), e);
    }
  }

  /** JPEG bytes at `quality`, an integer 1–100 (default 90). Alpha is dropped. */
  toJpeg(options: { quality?: number } = {}): Uint8Array {
    const quality = expectInteger("quality", options.quality ?? 90, 1, 100);
    try {
      const result = jpeg.encode(
        { data: this.pixels, width: this.width, height: this.height },
        quality,
      );
      return result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
    } catch (e) {
      throw MurError.imageEncode(messageOf(e), e);
    }
  }
}

/** Renders `message` (raw bytes) as a QR code. */
export function renderQr(message: Uint8Array, options: RenderOptions = {}): RenderedImage {
  expectBytes("message", message);
  const resolved = resolveRenderOptions(options);
  const matrix = QrMatrix.encode(message, resolved.correction);
  return renderFromMatrix(matrix, resolved);
}

/** Renders a UR (a `UR` or its string form, upper-cased for QR alphanumeric mode) as a QR code. */
export function renderUrQr(ur: UR | string, options: RenderOptions = {}): RenderedImage {
  return renderQr(urBytes(ur), options);
}

/** @internal The bytes a UR encodes to: its string with ASCII letters upper-cased, as UTF-8. */
export function urBytes(ur: UR | string): Uint8Array {
  return new TextEncoder().encode(urString(ur).replace(/[a-z]+/g, (s) => s.toUpperCase()));
}

/** @internal `ur` as a string; `InvalidParameter` unless it is a `UR` or a string. */
export function urString(ur: UR | string): string {
  if (typeof ur === "string") return ur;
  if (ur instanceof UR) return ur.toString();
  throw MurError.invalidParameter(`ur must be a UR or a string, got ${describe(ur)}`);
}

/** @internal */
export function renderFromMatrix(matrix: QrMatrix, o: ResolvedRenderOptions): RenderedImage {
  const qrModules = matrix.width();
  const totalModules = qrModules + 2 * o.quietZone;
  const pixelsPerModule = Math.max(1, Math.floor(o.size / totalModules));
  const compositingSize = totalModules * pixelsPerModule;
  const qzPx = o.quietZone * pixelsPerModule;

  const pixels = new Uint8Array(compositingSize * compositingSize * 4);
  const words = new Uint32Array(pixels.buffer);
  const fg = packColor(o.foreground);
  const bg = packColor(o.background);
  words.fill(bg);

  for (let row = 0; row < qrModules; row++) {
    const py = qzPx + row * pixelsPerModule;
    for (let col = 0; col < qrModules; col++) {
      if (!matrix.isDark(col, row)) continue;
      fillRect(
        words,
        compositingSize,
        qzPx + col * pixelsPerModule,
        py,
        pixelsPerModule,
        pixelsPerModule,
        fg,
      );
    }
  }

  if (o.logo) {
    compositeLogo(
      pixels,
      words,
      compositingSize,
      qrModules,
      pixelsPerModule,
      qzPx,
      o.background,
      o.logo,
    );
  }

  const finalPixels =
    compositingSize !== o.size
      ? nearestNeighborScale(pixels, compositingSize, compositingSize, o.size, o.size)
      : pixels;
  return new RenderedImage({ width: o.size, height: o.size, pixels: finalPixels });
}

const packScratch = new Uint8Array(4);
const packScratch32 = new Uint32Array(packScratch.buffer);

/** The colour as one 32-bit word in the platform's byte order, for `Uint32Array` fills. */
function packColor(color: Color): number {
  packScratch[0] = color.r;
  packScratch[1] = color.g;
  packScratch[2] = color.b;
  packScratch[3] = color.a;
  return packScratch32[0];
}

function fillRect(
  words: Uint32Array,
  stride: number,
  x: number,
  y: number,
  w: number,
  h: number,
  packed: number,
): void {
  for (let row = y; row < y + h; row++) {
    const start = row * stride + x;
    words.fill(packed, start, start + w);
  }
}

function compositeLogo(
  pixels: Uint8Array,
  words: Uint32Array,
  compositingSize: number,
  moduleCount: number,
  pixelsPerModule: number,
  qzPx: number,
  background: Color,
  logo: Logo,
): void {
  const layout = new LogoLayout(moduleCount, logo.fraction, logo.clearBorder);
  if (layout.logoModules === 0) {
    return;
  }
  const clear = packColor(background.isTransparent ? Color.WHITE : background);
  const centerModule = moduleCount / 2;
  const qrPx = moduleCount * pixelsPerModule;
  const startModule = Math.floor((moduleCount - layout.clearedModules) / 2);

  switch (logo.clearShape) {
    case "square": {
      const clearPixels = layout.clearedModules * pixelsPerModule;
      const clearOrigin = qzPx + Math.floor((qrPx - clearPixels) / 2);
      fillRect(words, compositingSize, clearOrigin, clearOrigin, clearPixels, clearPixels, clear);
      break;
    }
    case "circle": {
      const radius = layout.clearedModules / 2;
      for (let row = 0; row < layout.clearedModules; row++) {
        for (let col = 0; col < layout.clearedModules; col++) {
          const dx = startModule + col + 0.5 - centerModule;
          const dy = startModule + row + 0.5 - centerModule;
          if (dx * dx + dy * dy <= radius * radius) {
            const px = qzPx + (startModule + col) * pixelsPerModule;
            const py = qzPx + (startModule + row) * pixelsPerModule;
            fillRect(words, compositingSize, px, py, pixelsPerModule, pixelsPerModule, clear);
          }
        }
      }
      break;
    }
  }

  const logoPixels = layout.logoModules * pixelsPerModule;
  const logoOrigin = qzPx + Math.floor((qrPx - logoPixels) / 2);
  const scaled = bilinearScale(logo.pixels, logo.width, logo.height, logoPixels, logoPixels);

  // Straight-alpha "over" composite in integer arithmetic.
  for (let row = 0; row < logoPixels; row++) {
    let srcOffset = row * logoPixels * 4;
    let dstOffset = ((logoOrigin + row) * compositingSize + logoOrigin) * 4;
    for (let col = 0; col < logoPixels; col++, srcOffset += 4, dstOffset += 4) {
      const sa = scaled[srcOffset + 3];
      if (sa === 0) continue;
      if (sa === 255) {
        pixels[dstOffset] = scaled[srcOffset];
        pixels[dstOffset + 1] = scaled[srcOffset + 1];
        pixels[dstOffset + 2] = scaled[srcOffset + 2];
        pixels[dstOffset + 3] = 255;
        continue;
      }
      const da = pixels[dstOffset + 3];
      const invSa = 255 - sa;
      const outA = sa + Math.floor((da * invSa) / 255);
      if (outA > 0) {
        for (let c = 0; c < 3; c++) {
          const sc = scaled[srcOffset + c];
          const dc = pixels[dstOffset + c];
          pixels[dstOffset + c] =
            Math.floor((sc * sa + Math.floor((dc * da * invSa) / 255)) / outA) & 0xff;
        }
        pixels[dstOffset + 3] = Math.min(outA, 255);
      }
    }
  }
}

/** @internal How many modules the logo and its cleared area span. */
export class LogoLayout {
  readonly logoModules: number;
  readonly clearedModules: number;

  constructor(moduleCount: number, fraction: number, clearBorder: number) {
    let logo = Math.round(moduleCount * fraction);
    if (logo % 2 === 0) {
      logo += 1;
    }
    let cleared = logo + 2 * clearBorder;
    const maxCleared = Math.floor(moduleCount * 0.4);
    if (cleared > maxCleared) {
      cleared = maxCleared;
      logo = Math.max(0, cleared - 2 * clearBorder);
    }
    if (logo % 2 === 0 && logo > 0) {
      logo -= 1;
    }
    this.logoModules = logo;
    this.clearedModules = cleared;
  }
}

/** @internal */
export function nearestNeighborScale(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH * 4);
  const aligned = src.byteOffset % 4 === 0 && src.byteLength % 4 === 0;
  const src32 = aligned
    ? new Uint32Array(src.buffer, src.byteOffset, src.byteLength / 4)
    : new Uint32Array(src.slice().buffer);
  const dst32 = new Uint32Array(dst.buffer);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(Math.floor((y * srcH) / dstH), srcH - 1);
    const srcRow = sy * srcW;
    const dstRow = y * dstW;
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(Math.floor((x * srcW) / dstW), srcW - 1);
      dst32[dstRow + x] = src32[srcRow + sx];
    }
  }
  return dst;
}

/** @internal */
export function bilinearScale(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH * 4);
  const xDen = Math.max(dstW - 1, 1);
  const yDen = Math.max(dstH - 1, 1);
  for (let y = 0; y < dstH; y++) {
    const fy = (y * (srcH - 1)) / yDen;
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const wy = fy - y0;
    const row0 = y0 * srcW;
    const row1 = y1 * srcW;
    let di = y * dstW * 4;
    for (let x = 0; x < dstW; x++, di += 4) {
      const fx = (x * (srcW - 1)) / xDen;
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const wx = fx - x0;
      const i00 = (row0 + x0) * 4;
      const i10 = (row0 + x1) * 4;
      const i01 = (row1 + x0) * 4;
      const i11 = (row1 + x1) * 4;
      for (let c = 0; c < 4; c++) {
        const v =
          src[i00 + c] * (1 - wx) * (1 - wy) +
          src[i10 + c] * wx * (1 - wy) +
          src[i01 + c] * (1 - wx) * wy +
          src[i11 + c] * wx * wy;
        dst[di + c] = Math.round(v) & 0xff;
      }
    }
  }
  return dst;
}
