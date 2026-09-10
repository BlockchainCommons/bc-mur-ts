import { n as QrFrame } from "./frames-BVsJzpXh.mjs";
//#region src/gif.d.ts
/** Animated-GIF timing. */
interface GifOptions {
  /** Frames per second, a positive number (default 8); written as whole centiseconds per frame. */
  fps?: number;
}
/**
 * Encodes the frames as a looping animated GIF. Frames of up to 256 colours
 * get their exact palette; frames with more (a logo) are quantised.
 */
export declare function encodeAnimatedGif(frames: readonly QrFrame[], options?: GifOptions): Uint8Array;
//#endregion
export type { GifOptions };
//# sourceMappingURL=gif-entry.d.mts.map