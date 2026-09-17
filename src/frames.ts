/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { MultipartEncoder, UR } from "@blockchaincommons/uniform-resources";
import { MurError, messageOf, withIo } from "./error.js";
import { expectInteger } from "./guards.js";
import { QrMatrix, checkQrDensity } from "./qr-matrix.js";
import {
  type RenderOptions,
  type RenderedImage,
  asciiUppercase,
  renderFromMatrix,
  resolveRenderOptions,
  urString,
} from "./render.js";

/** How a UR is split into fountain-coded frames, plus how each frame is drawn. */
export interface FrameOptions extends RenderOptions {
  /** Largest fragment in bytes, a positive integer (default 40). */
  maxFragmentLen?: number;
  /** Complete passes over the fragments, a non-negative integer (default 3); ignored when `frameCount` is set. */
  cycles?: number;
  /** Exact number of frames, a non-negative integer; must be at least the fragment count. */
  frameCount?: number;
  /** When set, the first frame's module count must not exceed this (`QrCodeTooDense`). */
  maxModules?: number;
}

/** One frame: its image and the fountain part's sequence number (1-based). */
export interface QrFrame {
  /** The rendered frame. */
  readonly image: RenderedImage;
  /** The fountain part's sequence number, 1-based. */
  readonly index: number;
}

/**
 * Renders the multipart sequence of `ur` (a `UR` or its string form). The
 * sequence is the fountain encoder's, in order: the first `partCount` frames
 * are the plain fragments, the rest are mixed parts.
 */
export function generateFrames(ur: UR | string, options: FrameOptions = {}): readonly QrFrame[] {
  const render = resolveRenderOptions(options);
  const text = urString(ur);
  const maxFragmentLen = options.maxFragmentLen ?? 40;
  const cycles = expectInteger("cycles", options.cycles ?? 3, 0);
  const frameCount =
    options.frameCount === undefined
      ? undefined
      : expectInteger("frameCount", options.frameCount, 0);
  const maxModules =
    options.maxModules === undefined
      ? undefined
      : expectInteger("maxModules", options.maxModules, 0);
  let encoder: MultipartEncoder;
  try {
    encoder = new MultipartEncoder(UR.parse(text), maxFragmentLen);
  } catch (e) {
    throw MurError.ur(messageOf(e), e);
  }
  const partsCount = encoder.partCount;
  const totalFrames = frameCount ?? partsCount * cycles;
  if (totalFrames < partsCount) {
    throw MurError.insufficientFrames(totalFrames, partsCount);
  }
  const frames: QrFrame[] = [];
  for (let i = 0; i < totalFrames; i++) {
    let part: string;
    try {
      part = encoder.nextPart();
    } catch (e) {
      throw MurError.ur(messageOf(e), e);
    }
    const index = encoder.index;
    const matrix = QrMatrix.encode(
      new TextEncoder().encode(asciiUppercase(part)),
      render.correction,
    );
    if (i === 0 && maxModules !== undefined) {
      checkQrDensity(matrix.width(), maxModules);
    }
    frames.push(Object.freeze({ image: renderFromMatrix(matrix, render), index }));
  }
  return frames;
}

/**
 * Writes `0000.png`, `0001.png`, … into `outputDir` (created if needed).
 * File-system failures are `Io`.
 *
 * @remarks Node only.
 */
export async function writeFramePngs(frames: readonly QrFrame[], outputDir: string): Promise<void> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  await withIo(outputDir, () => fs.mkdir(outputDir, { recursive: true }));
  for (let i = 0; i < frames.length; i++) {
    const file = path.join(outputDir, `${String(i).padStart(4, "0")}.png`);
    const png = frames[i].image.toPng();
    await withIo(file, () => fs.writeFile(file, png));
  }
}
