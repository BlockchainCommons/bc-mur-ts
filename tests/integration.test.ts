/**
 * Port of `bc-mur::tests::integration`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";

import {
  Color,
  DEFAULT_MAX_MODULES,
  type FrameOptions,
  MurError,
  checkQrDensity,
  generateFrames,
  qrModuleCount,
  renderQr,
  renderUrQr,
  writeFramePngs,
} from "../src/index.js";
import { encodeAnimatedGif } from "../src/gif.js";
import { logoFromSvg } from "../src/svg.js";

const TEST_SVG = new Uint8Array(readFileSync(new URL("./test_data/bc-logo.svg", import.meta.url)));

// A short UR string that fits in a single QR frame.
const SHORT_UR = "ur:bytes/hdcxdwinvezm";

/** Build a valid UR with a large CBOR payload that requires multipart encoding. */
function longUr(): UR {
  const data = new Uint8Array(500);
  for (let i = 0; i < 500; i++) data[i] = i % 256;
  return UR.from("bytes", cbor(data));
}

// ─── Single-frame rendering ────────────────────────────

describe("single frame", () => {
  it("png dimensions", () => {
    const img = renderUrQr(SHORT_UR, { correction: "low", size: 512 });
    expect(img.width).toBe(512);
    expect(img.height).toBe(512);

    const png = img.toPng();
    expect(png.length).toBeGreaterThan(100);
    expect(Array.from(png.slice(0, 4))).toEqual([137, 80, 78, 71]);
  });

  it("defaults: 512px, quiet zone 1, black on white, low correction", () => {
    const img = renderUrQr(SHORT_UR);
    expect(img.width).toBe(512);
    expect(img.pixels[0]).toBe(255);
    expect(Array.from(img.pixels)).toEqual(
      Array.from(
        renderUrQr(SHORT_UR, {
          correction: "low",
          size: 512,
          foreground: Color.BLACK,
          background: Color.WHITE,
          quietZone: 1,
          logo: null,
        }).pixels,
      ),
    );
  });

  it("accepts a UR object", () => {
    const ur = UR.from("bytes", cbor(new Uint8Array([1, 2, 3])));
    expect(Array.from(renderUrQr(ur, { size: 64 }).pixels)).toEqual(
      Array.from(renderUrQr(ur.toString(), { size: 64 }).pixels),
    );
  });

  it("jpeg", () => {
    const img = renderUrQr(SHORT_UR, { correction: "medium", size: 256 });
    const jpegBytes = img.toJpeg({ quality: 85 });
    expect(Array.from(jpegBytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
  });

  it("jpeg quality is clamped to 1–100 as the reference's encoder clamps it", () => {
    const img = renderUrQr(SHORT_UR, { correction: "medium", size: 64 });
    expect(Array.from(img.toJpeg({ quality: 0 }))).toEqual(Array.from(img.toJpeg({ quality: 1 })));
    expect(Array.from(img.toJpeg({ quality: 255 }))).toEqual(
      Array.from(img.toJpeg({ quality: 100 })),
    );
    for (const bad of [-1, 256, 1.5, Number.NaN]) {
      expect(() => img.toJpeg({ quality: bad })).toThrow(/quality must be an integer in 0–255/);
    }
  });

  it("custom colors", () => {
    const img = renderQr(new TextEncoder().encode("HELLO"), {
      correction: "high",
      size: 128,
      foreground: "#0000FF",
      background: Color.fromHex("#FFFF00"),
    });
    expect(img.width).toBe(128);
    let hasBlue = false;
    for (let i = 0; i < img.pixels.length; i += 4) {
      if (img.pixels[i] === 0 && img.pixels[i + 1] === 0 && img.pixels[i + 2] === 255) {
        hasBlue = true;
        break;
      }
    }
    expect(hasBlue).toBe(true);
  });

  it("dark mode", () => {
    const img = renderUrQr(SHORT_UR, {
      correction: "low",
      size: 256,
      foreground: Color.WHITE,
      background: Color.BLACK,
    });
    expect(img.pixels[0]).toBe(0);
    expect(img.pixels[1]).toBe(0);
    expect(img.pixels[2]).toBe(0);
  });

  it("quiet zone 0", () => {
    const img = renderQr(new TextEncoder().encode("HELLO"), {
      correction: "low",
      size: 256,
      quietZone: 0,
    });
    expect(img.width).toBe(256);
  });

  it("quiet zone 4", () => {
    const img = renderQr(new TextEncoder().encode("HELLO"), {
      correction: "low",
      size: 512,
      quietZone: 4,
    });
    expect(img.width).toBe(512);
    expect(img.pixels[0]).toBe(255);
  });

  it("rejects an unknown correction level", () => {
    expect(() => renderUrQr(SHORT_UR, { correction: "ultra" as unknown as "low" })).toThrow(
      /unknown correction level/,
    );
  });

  it("rejects a non-positive size and a negative quiet zone", () => {
    expect(() => renderUrQr(SHORT_UR, { size: 0 })).toThrow(/size must be a positive integer/);
    expect(() => renderUrQr(SHORT_UR, { quietZone: -1 })).toThrow(/quiet zone/);
  });
});

// ─── Logo overlay ──────────────────────────────────────

describe("logo overlay", () => {
  it("svg logo", async () => {
    const logo = await logoFromSvg(TEST_SVG, { fraction: 0.25, clearBorder: 1 });
    expect(logo.width).toBe(512);
    expect(logo.height).toBe(512);
    expect(logo.clearShape).toBe("square");

    const img = renderUrQr(SHORT_UR, { correction: "high", size: 512, logo });
    const png = img.toPng();
    expect(png.length).toBeGreaterThan(100);
  });

  it("a logo defaults the correction level to high", async () => {
    const logo = await logoFromSvg(TEST_SVG);
    expect(Array.from(renderUrQr(SHORT_UR, { size: 128, logo }).pixels)).toEqual(
      Array.from(renderUrQr(SHORT_UR, { size: 128, logo, correction: "high" }).pixels),
    );
  });

  it("circle logo", async () => {
    const logo = await logoFromSvg(TEST_SVG, {
      fraction: 0.3,
      clearBorder: 2,
      clearShape: "circle",
    });

    const img = renderQr(new TextEncoder().encode("UR:BYTES/TEST"), {
      correction: "high",
      size: 256,
      logo,
    });
    expect(img.width).toBe(256);
  });
});

// ─── Animated multipart ────────────────────────────────

describe("animated", () => {
  it("gif basic", () => {
    const ur = longUr();
    const options: FrameOptions = {
      maxFragmentLen: 50,
      size: 256,
      cycles: 2,
    };
    const frames = generateFrames(ur, options);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    const gif = encodeAnimatedGif(frames, { fps: 4 });
    expect(new TextDecoder().decode(gif.slice(0, 6))).toBe("GIF89a");
    expect(gif.length).toBeGreaterThan(100);
  });

  it("accepts the UR as a string", () => {
    const ur = longUr();
    const a = generateFrames(ur, { maxFragmentLen: 50, size: 64, cycles: 1 });
    const b = generateFrames(ur.toString(), { maxFragmentLen: 50, size: 64, cycles: 1 });
    expect(b.map((f) => f.index)).toEqual(a.map((f) => f.index));
    expect(Array.from(b[0].image.pixels)).toEqual(Array.from(a[0].image.pixels));
  });

  it("an unparsable UR string is a Ur error", () => {
    try {
      generateFrames("not a ur", { maxFragmentLen: 50 });
      throw new Error("expected throw");
    } catch (e) {
      expect(MurError.isMurError(e)).toBe(true);
      expect((e as MurError).code).toBe("Ur");
    }
  });

  // The reference's `gif` crate and `gifenc` write different streams for
  // the same frames, so the bytes are not pinned; the structure both share
  // (magic, loop count, delay, frame count) is.
  it("gif structure: GIF89a magic, NETSCAPE2.0, loop=0, frame count", () => {
    const ur = longUr();
    const frames = generateFrames(ur, { maxFragmentLen: 50, size: 128, cycles: 2 });
    expect(frames.length).toBeGreaterThanOrEqual(2);
    const gif = encodeAnimatedGif(frames, { fps: 4 });

    // 1) Magic header.
    expect(new TextDecoder().decode(gif.slice(0, 6))).toBe("GIF89a");

    // 2) Find the NETSCAPE2.0 application extension. The signature
    //    is: 0x21 0xff 0x0b "NETSCAPE2.0" 0x03 0x01 LOOP_LO LOOP_HI 0x00.
    const netscapeAscii = new TextEncoder().encode("NETSCAPE2.0");
    let netscapeOffset = -1;
    outer: for (let i = 0; i < gif.length - netscapeAscii.length; i++) {
      for (let j = 0; j < netscapeAscii.length; j++) {
        if (gif[i + j] !== netscapeAscii[j]) continue outer;
      }
      netscapeOffset = i;
      break;
    }
    expect(netscapeOffset).toBeGreaterThan(0);
    // Preceding 3 bytes must be `0x21 0xff 0x0b`.
    expect(gif[netscapeOffset - 3]).toBe(0x21);
    expect(gif[netscapeOffset - 2]).toBe(0xff);
    expect(gif[netscapeOffset - 1]).toBe(0x0b);

    // 3) After "NETSCAPE2.0" comes:
    //    0x03 0x01 LOOP_LO LOOP_HI 0x00 (block-terminator).
    const after = netscapeOffset + netscapeAscii.length;
    expect(gif[after]).toBe(0x03);
    expect(gif[after + 1]).toBe(0x01);
    const loopCount = gif[after + 2] | (gif[after + 3] << 8);
    expect(loopCount).toBe(0); // 0 = repeat forever
    expect(gif[after + 4]).toBe(0x00);

    // 4) Image-separator byte (0x2c) appears once per frame.
    let imageSeparators = 0;
    for (const b of gif) if (b === 0x2c) imageSeparators++;
    // gifenc may emit one `0x2c` per frame plus none extra; lower
    // bound is the frame count. (Upper bound is loose because
    // 0x2c can appear inside palette/data bytes, but for QR
    // images with a small palette this is rare; we just enforce
    // a lower bound here.)
    expect(imageSeparators).toBeGreaterThanOrEqual(frames.length);

    // 5) GIF trailer.
    expect(gif[gif.length - 1]).toBe(0x3b);
  });

  it("gif with logo", async () => {
    const ur = longUr();
    const logo = await logoFromSvg(TEST_SVG, { fraction: 0.2, clearBorder: 1 });
    const frames = generateFrames(ur, {
      maxFragmentLen: 50,
      size: 256,
      cycles: 1,
      logo,
    });
    const gif = encodeAnimatedGif(frames, { fps: 4 });
    expect(new TextDecoder().decode(gif.slice(0, 6))).toBe("GIF89a");
  });

  it("gif with no frames is an InvalidParameter error", () => {
    expect(() => encodeAnimatedGif([], { fps: 4 })).toThrow(/no frames to encode/);
  });

  it("frame dump", async () => {
    const ur = longUr();
    const frames = generateFrames(ur, {
      maxFragmentLen: 50,
      size: 128,
      cycles: 1,
    });
    const tmp = mkdtempSync(join(tmpdir(), "bc-mur-test-"));
    try {
      await writeFramePngs(frames, tmp);
      const entries = readdirSync(tmp);
      expect(entries.length).toBe(frames.length);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ─── Error cases ───────────────────────────────────────

describe("error cases", () => {
  it("invalid color hex", () => {
    expect(() => Color.fromHex("#ZZZZZZ")).toThrow();
    try {
      Color.fromHex("#ZZZZZZ");
    } catch (e) {
      expect(MurError.isMurError(e)).toBe(true);
      expect((e as MurError).is("InvalidColor")).toBe(true);
      expect((e as MurError).message).toMatch(/^Invalid color: /);
    }
  });

  it("logo fraction out of range", async () => {
    await expect(logoFromSvg(TEST_SVG, { fraction: 0.0 })).rejects.toThrow();
    await expect(logoFromSvg(TEST_SVG, { fraction: 1.0 })).rejects.toThrow();
  });

  it("errors carry code and details", () => {
    try {
      checkQrDensity(150, 117);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as MurError;
      expect(err.name).toBe("MurError");
      expect(err.code).toBe("QrCodeTooDense");
      expect(err.details).toEqual({ moduleCount: 150, maxModules: 117 });
      expect(err.message).toBe(
        "QR code too dense: 150 modules exceeds limit of 117 (reduce data size, lower error correction, or increase --max-modules)",
      );
    }
  });
});

// ─── Density check ────────────────────────────────────

describe("density", () => {
  it("module count small", () => {
    const count = qrModuleCount(new TextEncoder().encode("HELLO"), "low");
    expect(count).toBe(21);
  });

  it("density passes", () => {
    expect(() => checkQrDensity(21, DEFAULT_MAX_MODULES)).not.toThrow();
  });

  it("density fails", () => {
    try {
      checkQrDensity(150, 117);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MurError);
      const err = e as MurError;
      expect(err.is("QrCodeTooDense")).toBe(true);
      if (err.is("QrCodeTooDense")) {
        expect(err.details.moduleCount).toBe(150);
        expect(err.details.maxModules).toBe(117);
      }
    }
  });

  it("density check on dense QR", () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) data[i] = i % 256;
    const ur = UR.from("bytes", cbor(data));
    const urString = ur.toQRString();
    const upper = urString.toUpperCase();
    const modules = qrModuleCount(new TextEncoder().encode(upper), "low");
    expect(modules).toBeGreaterThan(DEFAULT_MAX_MODULES);
    try {
      checkQrDensity(modules, DEFAULT_MAX_MODULES);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MurError);
      expect((e as MurError).is("QrCodeTooDense")).toBe(true);
    }
  });
});

// ─── Insufficient frames ─────────────────────────────

describe("frames", () => {
  it("insufficient frames error", () => {
    const ur = longUr();
    try {
      generateFrames(ur, {
        maxFragmentLen: 50,
        frameCount: 1,
      });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MurError);
      const err = e as MurError;
      expect(err.is("InsufficientFrames")).toBe(true);
      if (err.is("InsufficientFrames")) {
        expect(err.details.requested).toBe(1);
        expect(err.details.fragments).toBeGreaterThan(1);
      }
    }
  });

  it("frame count exact", () => {
    const ur = longUr();
    const frames = generateFrames(ur, {
      maxFragmentLen: 50,
      frameCount: 100,
    });
    expect(frames.length).toBe(100);
    expect(frames[0].index).toBe(1);
  });

  it("animate density check", () => {
    const ur = longUr();
    try {
      generateFrames(ur, {
        maxFragmentLen: 500,
        maxModules: 21,
      });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MurError);
      expect((e as MurError).is("QrCodeTooDense")).toBe(true);
    }
  });

  it("no maxModules means no density check", () => {
    const ur = longUr();
    expect(() => generateFrames(ur, { maxFragmentLen: 500, size: 32 })).not.toThrow();
  });
});
