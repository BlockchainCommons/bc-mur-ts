/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { MurError, messageOf } from "./error.js";
import type { QrFrame } from "./frames.js";
import { expectPositive } from "./guards.js";
import { expectImage } from "./image.js";

/** Animated-GIF timing. */
export interface GifOptions {
  /** Frames per second, a positive number (default 8); written as whole centiseconds per frame. */
  fps?: number;
}

/**
 * Encodes the frames as a looping animated GIF. Frames of up to 256 colours
 * get their exact palette; frames with more (a logo) are quantised.
 */
export function encodeAnimatedGif(
  frames: readonly QrFrame[],
  options: GifOptions = {},
): Uint8Array {
  if (frames.length === 0) {
    throw MurError.invalidParameter("no frames to encode");
  }
  const fps = expectPositive("fps", options.fps ?? 8);
  const width = frames[0].image.width;
  const height = frames[0].image.height;
  for (const frame of frames) {
    expectImage(frame.image, "frame");
    if (frame.image.width !== width || frame.image.height !== height) {
      throw MurError.invalidParameter(
        `every frame must be ${width}x${height}, got ${frame.image.width}x${frame.image.height}`,
      );
    }
  }
  // The per-frame delay in whole centiseconds, as the reference writes it.
  const delayCs = Math.round(100 / fps);

  let gif;
  try {
    gif = GIFEncoder();
  } catch (e) {
    throw MurError.gifEncode(`GIF init: ${messageOf(e)}`, e);
  }

  for (const frame of frames) {
    const { palette, indexed } = quantizeFrame(frame.image.pixels);
    try {
      gif.writeFrame(indexed, width, height, {
        palette,
        // gifenc takes milliseconds and writes centiseconds.
        delay: delayCs * 10,
        // Loop forever (NETSCAPE2.0 loop count 0, written with the first frame).
        repeat: 0,
      });
    } catch (e) {
      throw MurError.gifEncode(`GIF write frame: ${messageOf(e)}`, e);
    }
  }

  try {
    gif.finish();
  } catch (e) {
    throw MurError.gifEncode(`GIF finalize: ${messageOf(e)}`, e);
  }
  return gif.bytes();
}

/** A frame reduced to an indexed image over a palette of at most 256 colours. */
interface QuantizedFrame {
  palette: [number, number, number][];
  indexed: Uint8Array;
}

function quantizeFrame(rgba: Uint8Array): QuantizedFrame {
  const uniqueKeys = new Set<number>();
  const uniqueColors: [number, number, number, number][] = [];
  let exceeded = false;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];
    const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      uniqueColors.push([r, g, b, a]);
      if (uniqueColors.length > 256) {
        exceeded = true;
        break;
      }
    }
  }

  if (!exceeded) {
    const palette = uniqueColors.map((c) => [c[0], c[1], c[2]] as [number, number, number]);
    const lookup = new Map<number, number>();
    uniqueColors.forEach((c, i) => {
      const key = ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3]) >>> 0;
      lookup.set(key, i);
    });
    const indexed = new Uint8Array(rgba.length / 4);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      const key = ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | rgba[i + 3]) >>> 0;
      indexed[j] = lookup.get(key) ?? 0;
    }
    return { palette, indexed };
  }

  const palette = quantize(rgba, 256, { format: "rgb565" }) as [number, number, number][];
  const indexed = applyPalette(rgba, palette, "rgb565");
  return { palette, indexed };
}
