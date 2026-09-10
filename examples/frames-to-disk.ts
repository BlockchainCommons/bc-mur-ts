/**
 * Dumps the frames of a multipart UR as numbered PNGs and handles the
 * library's errors by code.
 *
 *   bun examples/frames-to-disk.ts ./frames
 */
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import { MurError, generateFrames, writeFramePngs } from "@blockchaincommons/multipart-ur";

const ur = UR.from("bytes", cbor(Uint8Array.from({ length: 600 }, (_, i) => i % 256)));
try {
  const frames = generateFrames(ur, { maxFragmentLen: 100, frameCount: 3, size: 128 });
  await writeFramePngs(frames, process.argv[2] ?? "frames");
} catch (e) {
  if (MurError.isMurError(e) && e.code === "InsufficientFrames") {
    console.error(`need at least ${e.details.fragments} frames, got ${e.details.requested}`);
  } else if (MurError.isMurError(e) && e.code === "Io") {
    console.error(`cannot write ${e.details.path ?? "output"}: ${e.details.message}`);
  } else {
    throw e;
  }
}
