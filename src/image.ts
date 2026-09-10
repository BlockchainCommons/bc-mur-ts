/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { MurError } from "./error.js";
import { describe, expectInteger } from "./guards.js";

/** A raw 8-bit RGBA raster: `pixels` holds `width * height * 4` bytes, row-major. */
export interface RgbaImage {
  /** Width in pixels. */
  readonly width: number;
  /** Height in pixels. */
  readonly height: number;
  /** The RGBA pixels, row-major, `width * height * 4` bytes. */
  readonly pixels: Uint8Array;
}

/**
 * `image` as an `RgbaImage`: integer dimensions and a buffer of exactly
 * `width * height * 4` bytes, or `InvalidParameter`.
 */
export function expectImage(image: unknown, what = "pixel buffer"): RgbaImage {
  if (typeof image !== "object" || image === null) {
    throw MurError.invalidParameter(`image must be an RgbaImage, got ${describe(image)}`);
  }
  const { pixels } = image as Partial<RgbaImage>;
  const width = expectInteger("width", (image as Partial<RgbaImage>).width, 0);
  const height = expectInteger("height", (image as Partial<RgbaImage>).height, 0);
  if (!(pixels instanceof Uint8Array)) {
    throw MurError.invalidParameter(`${what} must be a Uint8Array, got ${describe(pixels)}`);
  }
  if (pixels.length !== width * height * 4) {
    throw MurError.invalidParameter(
      `${what} size ${pixels.length} doesn't match ${width}x${height}x4`,
    );
  }
  return image as RgbaImage;
}
