/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { GIFEncoder } from "gifenc";
import { MurError, messageOf } from "./error.js";
import type { QrFrame } from "./frames.js";
import { expectNumeric } from "./guards.js";
import { expectImage } from "./image.js";
import { NeuQuant } from "./neuquant.js";

/** Animated-GIF timing. */
export interface GifOptions {
  /**
   * Frames per second (default 8). The frame delay is `round(100 / fps)`
   * centiseconds saturated to the GIF's 16-bit field, as the reference's
   * cast does: `0` gives 65 535 centiseconds, a negative or `NaN` value 0,
   * anything above 200 also 0.
   */
  fps?: number;
}

/**
 * Encodes the frames as a looping animated GIF. Frames of up to 256 colours
 * get their exact palette in first-seen order; frames with more (a logo)
 * are quantised with NeuQuant as the reference quantises them, so the
 * decoded frames are the reference's. The container bytes differ from the
 * reference's `gif` crate (palette placement, LZW encoder).
 */
export function encodeAnimatedGif(
  frames: readonly QrFrame[],
  options: GifOptions = {},
): Uint8Array {
  if (frames.length === 0) {
    throw MurError.invalidParameter("no frames to encode");
  }
  const fps = expectNumeric("fps", options.fps ?? 8);
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
  const delayCs = gifDelay(fps);

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

/** @internal The per-frame delay in centiseconds: `round(100 / fps)` saturated to `u16`, the reference's cast. */
export function gifDelay(fps: number): number {
  const delay = Math.round(100 / fps);
  if (Number.isNaN(delay) || delay < 0) return 0;
  return Math.min(delay, 0xffff);
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

  // More than 256 colours: NeuQuant over the RGBA frame, the palette's 256
  // entries in the network's order, every pixel mapped to its nearest entry.
  const nq = new NeuQuant(10, 256, rgba);
  const palette: [number, number, number][] = [];
  for (let i = 0; i < 256; i++) {
    const c = nq.lookup(i);
    palette.push(c === undefined ? [0, 0, 0] : [c[0], c[1], c[2]]);
  }
  const indexed = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    indexed[j] = nq.indexOf(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
  }
  return { palette, indexed };
}
