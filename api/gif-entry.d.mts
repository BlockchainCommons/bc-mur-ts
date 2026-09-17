import { n as QrFrame } from "./frames-BzJmbtpz.mjs";
//#region src/gif.d.ts
/** Animated-GIF timing. */
interface GifOptions {
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
export declare function encodeAnimatedGif(frames: readonly QrFrame[], options?: GifOptions): Uint8Array;
//#endregion
export type { GifOptions };
//# sourceMappingURL=gif-entry.d.mts.map