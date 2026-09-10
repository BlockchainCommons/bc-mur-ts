/**
 * Encoded-image decoded-pixel parity: PNG is lossless (byte-identical RGBA
 * after a round trip); JPEG is lossy (per-channel difference within an
 * epsilon of 25 at quality 90, the noise floor of sharp QR edges). The
 * encoded bytes differ from the reference's encoders; the decoded pixels are
 * the contract.
 */

import { describe, it, expect } from "vitest";
import * as jpeg from "jpeg-js";
import { decode as decodePng } from "fast-png";
import { renderUrQr } from "../src";

const QUIET_ZONE = 1;
const SIZE = 256;
const TEST_UR = "ur:bytes/hdcxdwinvezm";

function renderRefImage() {
  return renderUrQr(TEST_UR, { correction: "low", size: SIZE, quietZone: QUIET_ZONE });
}

describe("PNG round-trip exact pixel parity", () => {
  it("toPng → decodePng yields the same RGBA buffer (lossless)", () => {
    const img = renderRefImage();
    const pngBytes = img.toPng();

    const decoded = decodePng(pngBytes);
    expect(decoded.width).toBe(img.width);
    expect(decoded.height).toBe(img.height);

    const decodedPixels =
      decoded.data instanceof Uint8Array
        ? decoded.data
        : new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);

    expect(decodedPixels.length).toBe(img.pixels.length);

    // PNG is lossless; we expect byte-identical pixels.
    for (let i = 0; i < img.pixels.length; i++) {
      if (decodedPixels[i] !== img.pixels[i]) {
        throw new Error(
          `PNG decoded pixel ${i} diverged: expected ${img.pixels[i]}, got ${decodedPixels[i]}`,
        );
      }
    }
  });

  it("PNG output starts with the standard PNG magic bytes", () => {
    const img = renderRefImage();
    const pngBytes = img.toPng();
    // 89 50 4E 47 0D 0A 1A 0A — the 8-byte PNG signature.
    expect(pngBytes[0]).toBe(0x89);
    expect(pngBytes[1]).toBe(0x50);
    expect(pngBytes[2]).toBe(0x4e);
    expect(pngBytes[3]).toBe(0x47);
    expect(pngBytes[4]).toBe(0x0d);
    expect(pngBytes[5]).toBe(0x0a);
    expect(pngBytes[6]).toBe(0x1a);
    expect(pngBytes[7]).toBe(0x0a);
  });
});

describe("JPEG decoded-pixel parity within epsilon", () => {
  /**
   * Compute the maximum absolute per-channel difference between two
   * RGBA buffers (alpha channel is intentionally ignored — `jpeg-js`
   * outputs alpha=255 always, but we want the test to remain valid
   * if alpha handling changes).
   */
  function maxChannelDiff(a: Uint8Array, b: Uint8Array): number {
    if (a.length !== b.length) {
      throw new Error(`length mismatch: ${a.length} vs ${b.length}`);
    }
    let max = 0;
    for (let i = 0; i < a.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const d = Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0));
        if (d > max) max = d;
      }
    }
    return max;
  }

  it("toJpeg({ quality: 90 }) round-trips within 25 channel-units of the input (sharp QR)", () => {
    const img = renderRefImage();
    const jpegBytes = img.toJpeg({ quality: 90 });

    // Sanity: starts with JPEG magic.
    expect(jpegBytes[0]).toBe(0xff);
    expect(jpegBytes[1]).toBe(0xd8);
    expect(jpegBytes[2]).toBe(0xff);

    const decoded = jpeg.decode(jpegBytes, { useTArray: true });
    expect(decoded.width).toBe(img.width);
    expect(decoded.height).toBe(img.height);

    const decodedPixels =
      decoded.data instanceof Uint8Array ? decoded.data : new Uint8Array(decoded.data);

    // Sharp black/white QR boundaries are near-worst-case for JPEG.
    // Even at quality=90 the per-channel difference can creep up to
    // ~25 due to ringing artifacts. Pin a generous-but-finite
    // epsilon so structural regressions are still caught.
    const maxDiff = maxChannelDiff(img.pixels, decodedPixels);
    expect(maxDiff).toBeLessThanOrEqual(25);
  });

  it("toJpeg({ quality })'s output size grows monotonically with quality", () => {
    // Sanity probe: higher quality → larger JPEG at the same input.
    const img = renderRefImage();
    const lowQ = img.toJpeg({ quality: 20 }).length;
    const highQ = img.toJpeg({ quality: 95 }).length;
    expect(highQ).toBeGreaterThan(lowQ);
  });
});
