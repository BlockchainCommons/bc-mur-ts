import { n as QrFrame } from "./frames-BVsJzpXh.mjs";
//#region src/prores.d.ts
/** ProRes encoding: the frame rate and where ffmpeg writes the `.mov`. */
interface ProresOptions {
  /** Frames per second, a positive number (default 8). */
  fps?: number;
  /** Output file path. */
  outputPath: string;
}
/**
 * Encodes the frames to ProRes 4444 (`prores_ks`, `yuva444p10le`): writes
 * them as PNGs in a temporary directory, runs `ffmpeg`, and removes the
 * directory. `FfmpegNotFound` when no `ffmpeg` is on `PATH`; `FfmpegFailed`
 * (with ffmpeg's stderr in `details.stderr`) when it exits with a failure.
 */
export declare function encodeProres(frames: readonly QrFrame[], options: ProresOptions): Promise<void>;
/** The `ffmpeg` executable on `PATH` (`PATHEXT` extensions on Windows), or `FfmpegNotFound`. */
export declare function findFfmpeg(): Promise<string>;
//#endregion
export type { ProresOptions };
//# sourceMappingURL=prores-entry.d.mts.map