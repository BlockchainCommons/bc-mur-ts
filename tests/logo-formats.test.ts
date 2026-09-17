/**
 * `Logo.fromImageBytes`: PNG of every colour type and bit depth decoded to
 * the RGBA the reference's `into_rgba8` produces, JPEG, and the rejection
 * of every other format with the reference's wording.
 */

import { describe, expect, it } from "vitest";
import { Logo, MurError } from "../src";
import {
  BMP_1PX,
  GIF_1PX,
  JPEG_8X8,
  PNG_FIXTURES,
  PNG_TRUNCATED,
  WEBP_HEADER,
} from "./corpus/fixtures";

const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));
const hex = (u: Uint8Array): string => Buffer.from(u).toString("hex");

describe("Logo.fromImageBytes", () => {
  it.each(Object.entries(PNG_FIXTURES))(
    "decodes PNG %s as the reference does",
    (_name, fixture) => {
      const logo = Logo.fromImageBytes(unhex(fixture.hex));
      expect(logo.width).toBe(fixture.width);
      expect(logo.height).toBe(fixture.height);
      expect(hex(logo.pixels)).toBe(fixture.rgba);
    },
  );

  it("decodes JPEG", () => {
    const logo = Logo.fromImageBytes(unhex(JPEG_8X8));
    expect(logo.width).toBe(8);
    expect(logo.height).toBe(8);
    expect(logo.pixels.length).toBe(8 * 8 * 4);
    expect(logo.pixels[3]).toBe(255);
  });

  it("rejects the formats the reference is not built with, naming them as it does", () => {
    for (const [name, bytes] of [
      ["Gif", GIF_1PX],
      ["Bmp", BMP_1PX],
      ["WebP", WEBP_HEADER],
      ["Tiff", "4d4d002a"],
      ["Qoi", "716f6966"],
      ["Pnm", "5036"],
    ] as const) {
      expect(() => Logo.fromImageBytes(unhex(bytes))).toThrow(
        `Image encoding failed: failed to decode image: The image format ${name} is not supported`,
      );
    }
    for (const bytes of ["00010203", "", "ff"]) {
      expect(() => Logo.fromImageBytes(unhex(bytes))).toThrow(
        "Image encoding failed: failed to decode image: The image format could not be determined",
      );
    }
  });

  it("a PNG that does not decode is ImageEncode, wrapped once", () => {
    try {
      Logo.fromImageBytes(unhex(PNG_TRUNCATED));
      throw new Error("expected throw");
    } catch (e) {
      expect(MurError.isMurError(e) && e.is("ImageEncode")).toBe(true);
      expect((e as Error).message).toMatch(/^Image encoding failed: failed to decode image: /);
      expect((e as Error).message.split("Image encoding failed").length).toBe(2);
    }
    const interlacedGray1 = unhex(PNG_FIXTURES["gray1"].hex.replace(/(.{56})00/, "$101"));
    expect(interlacedGray1[28]).toBe(1);
    expect(() => Logo.fromImageBytes(interlacedGray1)).toThrow(
      "failed to decode image: interlaced PNG with a bit depth below 8 is not supported",
    );
  });

  it("options default to fraction 0.25, border 1, square", () => {
    const logo = Logo.fromImageBytes(unhex(PNG_FIXTURES["rgba8"].hex));
    expect(logo.fraction).toBe(0.25);
    expect(logo.clearBorder).toBe(1);
    expect(logo.clearShape).toBe("square");
  });

  it("rejects an unknown clear shape and a non-byte argument", () => {
    expect(() =>
      Logo.fromImageBytes(unhex(PNG_FIXTURES["rgba8"].hex), {
        clearShape: "hexagon" as unknown as "square",
      }),
    ).toThrow(/unknown clear shape/);
    expect(() => Logo.fromImageBytes("png" as unknown as Uint8Array)).toThrow(
      /data must be a Uint8Array/,
    );
  });

  it("Logo.fromRgba checks the buffer size", () => {
    expect(() => Logo.fromRgba({ width: 2, height: 2, pixels: new Uint8Array(15) })).toThrow(
      /doesn't match 2x2x4/,
    );
    const logo = Logo.fromRgba({ width: 2, height: 2, pixels: new Uint8Array(16) });
    expect(logo.width).toBe(2);
  });
});
