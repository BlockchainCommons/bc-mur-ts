/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { UR } from "@blockchaincommons/uniform-resources";
import { type FrameOptions, type QrFrame, generateFrames, writeFramePngs } from "../frames.js";
import {
  type SequenceArgs,
  colorsOf,
  correctionOf,
  loadLogo,
  readInput,
  resolveSequenceArgs,
} from "./options.js";

/** `mur frames` arguments. */
export type FramesArgs = SequenceArgs;

/** @internal The frames of `args`' UR, drawn per its arguments. */
export async function framesOf(args: SequenceArgs): Promise<readonly QrFrame[]> {
  const a = resolveSequenceArgs(args);
  // Parsed before anything else, as the reference does, so a bad UR reports the decoder's own message.
  const ur = UR.parse(await readInput(a.urString));
  const logo = await loadLogo(a);
  const options: FrameOptions = {
    maxFragmentLen: a.maxFragmentLen,
    correction: correctionOf(a, logo),
    size: a.size,
    ...colorsOf(a),
    quietZone: a.quietZone,
    logo,
    cycles: a.cycles,
    ...(a.frameCount !== undefined ? { frameCount: a.frameCount } : {}),
    ...(a.densityCheck ? { maxModules: a.maxModules } : {}),
  };
  return generateFrames(ur, options);
}

/** `mur frames`: the sequence as numbered PNGs in a directory. Returns the status line to print. */
export async function frames(args: FramesArgs): Promise<string> {
  const sequence = await framesOf(args);
  await writeFramePngs(sequence, args.output);
  return `Wrote ${sequence.length} frames to ${args.output}`;
}
