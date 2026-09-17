/**
 * `MurError`: codes, typed details, messages, freezing, and the guard.
 */
import { describe, expect, it } from "vitest";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import {
  CORRECTION_LEVELS,
  Color,
  LOGO_CLEAR_SHAPES,
  MUR_ERROR_CODES,
  MurError,
  checkQrDensity,
  generateFrames,
  renderQr,
  renderUrQr,
  writeFramePngs,
} from "../src/index.js";

describe("MurError", () => {
  it("narrows details by code", () => {
    try {
      checkQrDensity(150, 117);
    } catch (e) {
      expect(MurError.isMurError(e)).toBe(true);
      if (MurError.isMurError(e) && e.code === "QrCodeTooDense") {
        expect(e.details.moduleCount).toBe(150);
        expect(e.details.maxModules).toBe(117);
        expect(Object.isFrozen(e.details)).toBe(true);
      } else {
        expect.unreachable("expected QrCodeTooDense");
      }
    }
  });

  it("carries the reference's messages and the wrapped cause", () => {
    const e = MurError.qrEncode("data too long", new Error("inner"));
    expect(e.message).toBe("QR encoding failed: data too long");
    expect(e.details).toEqual({ message: "data too long" });
    expect((e.cause as Error).message).toBe("inner");
    expect(MurError.ffmpegNotFound().message).toBe(
      "ffmpeg not found on PATH — install ffmpeg for ProRes output",
    );
    expect(
      MurError.ffmpegFailed("ffmpeg exited with status exit status: 1", { stderr: "boom" }).details,
    ).toEqual({
      message: "ffmpeg exited with status exit status: 1",
      stderr: "boom",
    });
    expect(MurError.io("ENOENT", { path: "/x" }).details).toEqual({
      message: "ENOENT",
      path: "/x",
    });
    expect(MUR_ERROR_CODES).toHaveLength(12);
    expect(Object.isFrozen(MUR_ERROR_CODES)).toBe(true);
  });

  it("the guard accepts a duck-typed MurError and rejects the rest", () => {
    const fake = Object.assign(new Error("x"), { name: "MurError", code: "Io" });
    expect(MurError.isMurError(fake)).toBe(true);
    expect(MurError.isMurError(new Error("x"))).toBe(false);
    expect(MurError.isMurError(null)).toBe(false);
  });

  it("file-system failures are Io", async () => {
    const frames = generateFrames(UR.from("bytes", cbor(new Uint8Array(40))), { size: 16 });
    try {
      await writeFramePngs(frames, "/nonexistent-root-dir/frames");
      throw new Error("expected throw");
    } catch (e) {
      expect(MurError.isMurError(e) && e.is("Io")).toBe(true);
      if (MurError.isMurError(e) && e.is("Io")) {
        expect(e.details.path).toBe("/nonexistent-root-dir/frames");
        expect(e.message).toMatch(/^IO error: /);
      }
    }
  });

  it("argument-type faults are InvalidParameter, not encoder errors", () => {
    expect(() => renderQr("hello" as unknown as Uint8Array)).toThrow(
      "Invalid parameter: message must be a Uint8Array, got string",
    );
    expect(() => renderUrQr({} as unknown as string)).toThrow(
      "Invalid parameter: ur must be a UR or a string, got an object (Object)",
    );
    expect(() => renderQr(new Uint8Array(1), { correction: "LOW" as "low" })).toThrow(
      "Invalid parameter: unknown correction level: LOW (expected low, medium, quartile, or high)",
    );
  });
});

describe("frozen values", () => {
  it("the colour constants and tables cannot be mutated", () => {
    expect(Object.isFrozen(Color.BLACK)).toBe(true);
    expect(Object.isFrozen(new Color(1, 2, 3))).toBe(true);
    expect(() => {
      (Color.BLACK as { r: number }).r = 255;
    }).toThrow(TypeError);
    for (const table of [CORRECTION_LEVELS, LOGO_CLEAR_SHAPES, MUR_ERROR_CODES]) {
      expect(Object.isFrozen(table)).toBe(true);
    }
  });
});
