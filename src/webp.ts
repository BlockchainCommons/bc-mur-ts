/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * WebP logos through `webp-wasm` — the `/webp` entry.
 */

import { MurError, messageOf } from "./error.js";
import { expectBytes } from "./guards.js";
import type { RgbaImage } from "./image.js";
import { Logo, type LogoOptions, isWebp } from "./logo.js";

/** Decodes WebP bytes to RGBA. */
export async function decodeWebp(data: Uint8Array): Promise<RgbaImage> {
  expectBytes("data", data);
  if (!isWebp(data)) {
    throw MurError.imageEncode(
      "failed to decode image: not a WebP file (missing RIFF/WEBP header)",
    );
  }
  let decoded: { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
  try {
    const webp = await import("webp-wasm");
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    decoded = (await webp.decode(copy.buffer as ArrayBuffer)) as unknown as {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    };
  } catch (e) {
    throw MurError.imageEncode(`failed to decode image: ${messageOf(e)}`, e);
  }
  const pixels =
    decoded.data instanceof Uint8Array
      ? decoded.data
      : new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
  return { width: decoded.width, height: decoded.height, pixels };
}

/** A logo decoded from WebP bytes. */
export async function logoFromWebp(data: Uint8Array, options: LogoOptions = {}): Promise<Logo> {
  return Logo.fromRgba(await decodeWebp(data), options);
}
