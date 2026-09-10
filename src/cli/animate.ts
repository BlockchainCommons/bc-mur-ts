/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { encodeAnimatedGif } from "../gif.js";
import { encodeProres } from "../prores.js";
import { framesOf } from "./frames.js";
import type { SequenceArgs } from "./options.js";

/** `mur animate` arguments. */
export interface AnimateArgs extends SequenceArgs {
  /** `gif` or `prores` (default `gif`). */
  format?: string;
}

/** `mur animate`: the sequence as an animated GIF or a ProRes movie. Returns the status line to print. */
export async function animate(args: AnimateArgs): Promise<string> {
  const format = args.format ?? "gif";
  const fps = args.fps ?? 8;
  const sequence = await framesOf(args);
  switch (format) {
    case "gif": {
      const data = encodeAnimatedGif(sequence, { fps });
      const fs = await import("node:fs/promises");
      await fs.writeFile(args.output, data);
      return `Wrote ${sequence.length} frames (${data.length} bytes) to ${args.output}`;
    }
    case "prores":
      await encodeProres(sequence, { fps, outputPath: args.output });
      return `Wrote ${sequence.length} frames as ProRes to ${args.output}`;
    default:
      throw new Error(`unknown format: ${format} (expected gif or prores)`);
  }
}
