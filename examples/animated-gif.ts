/**
 * Splits a large UR into fountain-coded frames and writes an animated GIF.
 *
 *   bun examples/animated-gif.ts animated.gif
 */
import { writeFile } from "node:fs/promises";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import { generateFrames } from "@blockchaincommons/multipart-ur";
import { encodeAnimatedGif } from "@blockchaincommons/multipart-ur/gif";

const payload = Uint8Array.from({ length: 1500 }, (_, i) => i % 256);
const ur = UR.from("bytes", cbor(payload));
const frames = generateFrames(ur, { maxFragmentLen: 100, cycles: 2, size: 256, maxModules: 117 });
await writeFile(process.argv[2] ?? "animated.gif", encodeAnimatedGif(frames, { fps: 8 }));
console.log(`${frames.length} frames`);
