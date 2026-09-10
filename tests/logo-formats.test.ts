/**
 * `Logo.fromImageBytes` raster formats: PNG and JPEG as the reference, plus
 * GIF and BMP (extensions); WebP through `logoFromWebp`. The fixtures are
 * minimal hand-rolled byte buffers.
 */

import { describe, it, expect } from "vitest";
import { Logo } from "../src";
import { logoFromWebp } from "../src/webp.js";

/**
 * Build a minimal 2×2 24-bit BMP (BI_RGB) with hand-rolled headers
 * — bottom-up row order, BGR pixel layout.
 */
function makeBmp2x2(): Uint8Array {
  // Bitmap file header (14) + DIB BITMAPINFOHEADER (40) = 54
  // Row data: 2 pixels × 3 bytes = 6 + 2 padding = 8 bytes per row.
  const rowStride = 8;
  const dataSize = rowStride * 2;
  const fileSize = 54 + dataSize;
  const buf = new Uint8Array(fileSize);
  const view = new DataView(buf.buffer);

  // File header
  buf[0] = 0x42;
  buf[1] = 0x4d; // "BM"
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset

  // DIB header
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, 2, true); // width
  view.setInt32(22, 2, true); // height (positive = bottom-up)
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bpp
  view.setUint32(30, 0, true); // compression = BI_RGB
  view.setUint32(34, dataSize, true); // image size

  // Pixel data — bottom row first.
  // Bottom row: red pixel + green pixel (BGR layout)
  buf[54] = 0;
  buf[55] = 0;
  buf[56] = 255; // red
  buf[57] = 0;
  buf[58] = 255;
  buf[59] = 0; // green
  // 2 bytes padding
  // Top row: blue + white
  buf[62] = 255;
  buf[63] = 0;
  buf[64] = 0; // blue
  buf[65] = 255;
  buf[66] = 255;
  buf[67] = 255; // white
  return buf;
}

/**
 * Build a minimal 2×2 GIF89a with a 4-color local color table.
 * Single uncompressed frame. The frame is encoded with a literal
 * LZW chunk that omggif decodes correctly.
 *
 * Pixels: [red, green, blue, white]
 */
function makeGif2x2(): Uint8Array {
  return new Uint8Array([
    // GIF Header
    0x47,
    0x49,
    0x46,
    0x38,
    0x39,
    0x61, // "GIF89a"
    // Logical Screen Descriptor: 2x2, GCT flag, 7-bit, color table size = 4 (2^(0+1) = 4 colors needs index 1, so size field = 1)
    0x02,
    0x00, // width=2
    0x02,
    0x00, // height=2
    0x91, // GCT flag=1, color resolution=001 (2-bit), sort=0, GCT size=001 (4 colors)
    0x00, // background color index
    0x00, // pixel aspect ratio
    // Global Color Table (4 entries × 3 bytes)
    0xff,
    0x00,
    0x00, // 0: red
    0x00,
    0xff,
    0x00, // 1: green
    0x00,
    0x00,
    0xff, // 2: blue
    0xff,
    0xff,
    0xff, // 3: white
    // Image Descriptor
    0x2c, // separator
    0x00,
    0x00,
    0x00,
    0x00, // origin (0,0)
    0x02,
    0x00,
    0x02,
    0x00, // size 2x2
    0x00, // local CT flag=0
    // Image data
    0x02, // LZW minimum code size
    // LZW codes for [0,1,2,3] with min code size 2:
    //   clear (4) → 0 → 1 → 2 → 3 → end (5)
    // Encoded bit stream for that sequence is: 04 0a 04 22 04 (5 bytes)
    // Block size + data + terminator block
    0x05,
    0x04,
    0x0a,
    0x04,
    0x22,
    0x04,
    0x00,
    // Trailer
    0x3b,
  ]);
}

describe("Logo.fromImageBytes raster formats", () => {
  it("decodes PNG", async () => {
    // Build a tiny PNG via fast-png's encode round-trip.
    const { encode: encodePng } = await import("fast-png");
    const pixels = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const png = encodePng({ width: 2, height: 2, data: pixels, depth: 8, channels: 4 });
    const logo = Logo.fromImageBytes(png as unknown as Uint8Array, {
      fraction: 0.25,
      clearBorder: 1,
      clearShape: "square",
    });
    expect(logo).toBeInstanceOf(Logo);
  });

  it("decodes JPEG", async () => {
    const jpeg = await import("jpeg-js");
    const pixels = new Uint8Array(2 * 2 * 4);
    for (let i = 0; i < 4; i++) {
      pixels[i * 4] = 128;
      pixels[i * 4 + 1] = 128;
      pixels[i * 4 + 2] = 128;
      pixels[i * 4 + 3] = 255;
    }
    const encoded = jpeg.encode({ data: pixels, width: 2, height: 2 }, 90);
    const logo = Logo.fromImageBytes(encoded.data, {
      fraction: 0.25,
      clearBorder: 1,
      clearShape: "square",
    });
    expect(logo).toBeInstanceOf(Logo);
  });

  it("decodes GIF (extension)", () => {
    const gif = makeGif2x2();
    const logo = Logo.fromImageBytes(gif, { fraction: 0.25, clearBorder: 1, clearShape: "square" });
    expect(logo).toBeInstanceOf(Logo);
  });

  it("decodes BMP 24-bit (extension)", () => {
    const bmp = makeBmp2x2();
    const logo = Logo.fromImageBytes(bmp, { fraction: 0.25, clearBorder: 1, clearShape: "square" });
    expect(logo).toBeInstanceOf(Logo);
  });

  it("rejects WebP from sync API (use async helper instead)", () => {
    // Minimal WebP header (RIFF<size>WEBP) — magic only.
    const webp = new Uint8Array(20);
    webp.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    webp[4] = 12; // file size minus 8
    webp.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
    expect(() =>
      Logo.fromImageBytes(webp, { fraction: 0.25, clearBorder: 1, clearShape: "square" }),
    ).toThrow(/async API.*logoFromWebp/);
  });

  it("decodes WebP through logoFromWebp", async () => {
    // Build a minimal WebP using the encoder side of webp-wasm so
    // we have a valid lossy WebP that the decoder can round-trip.
    const webp = await import("webp-wasm");
    const rgba = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 200;
      rgba[i + 1] = 100;
      rgba[i + 2] = 50;
      rgba[i + 3] = 255;
    }
    const encoded = (await webp.encode(
      // ImageData isn't exported from webp-wasm directly, but the
      // implementation accepts a structurally-compatible plain object.
      { data: rgba, width: 8, height: 8 } as unknown as InstanceType<typeof globalThis.ImageData>,
      { quality: 80 },
    )) as Buffer;
    const bytes = new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength);

    const logo = await logoFromWebp(bytes, {
      fraction: 0.25,
      clearBorder: 1,
      clearShape: "square",
    });
    expect(logo).toBeInstanceOf(Logo);
    expect(logo.width).toBe(8);
    expect(logo.height).toBe(8);
  });

  it("logoFromWebp rejects non-WebP bytes", async () => {
    const { encode: encodePng } = await import("fast-png");
    const pixels = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const png = encodePng({ width: 2, height: 2, data: pixels, depth: 8, channels: 4 });
    await expect(logoFromWebp(png as unknown as Uint8Array)).rejects.toThrow(/not a WebP file/);
  });

  it("options default to fraction 0.25, border 1, square", () => {
    const logo = Logo.fromImageBytes(makeBmp2x2());
    expect(logo.fraction).toBe(0.25);
    expect(logo.clearBorder).toBe(1);
    expect(logo.clearShape).toBe("square");
  });

  it("rejects an unknown clear shape", () => {
    expect(() =>
      Logo.fromImageBytes(makeBmp2x2(), { clearShape: "hexagon" as unknown as "square" }),
    ).toThrow(/unknown clear shape/);
  });

  it("Logo.fromRgba checks the buffer size", () => {
    expect(() => Logo.fromRgba({ width: 2, height: 2, pixels: new Uint8Array(15) })).toThrow(
      /doesn't match 2x2x4/,
    );
    const logo = Logo.fromRgba({ width: 2, height: 2, pixels: new Uint8Array(16) });
    expect(logo.width).toBe(2);
  });

  it("rejects unrecognized formats with the Rust-equivalent error", () => {
    const bogus = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(() =>
      Logo.fromImageBytes(bogus, { fraction: 0.25, clearBorder: 1, clearShape: "square" }),
    ).toThrow(/unrecognized format \(expected PNG, JPEG, GIF, or BMP\)/);
  });
});
