/**
 * Properties over generated inputs: colour round trips, the logo layout's
 * invariants, lossless PNG round trips, identity rescales, and frame counts.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { decode as decodePng } from "fast-png";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import { Color, generateFrames, renderQr } from "../src/index.js";
import { LogoLayout, bilinearScale, nearestNeighborScale } from "../src/render.js";

const byte = fc.integer({ min: 0, max: 255 });

describe("properties", () => {
  it("Color.fromHex(c.toString()) equals c, and the string is 7 or 9 characters", () => {
    fc.assert(
      fc.property(byte, byte, byte, byte, (r, g, b, a) => {
        const c = new Color(r, g, b, a);
        expect(Color.fromHex(c.toString()).equals(c)).toBe(true);
        expect(c.toString().length).toBe(a === 255 ? 7 : 9);
      }),
    );
  });

  it("a channel outside 0–255 or a fraction is InvalidColor", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 256, max: 100_000 }),
          fc.integer({ min: -100_000, max: -1 }),
          fc.double({ min: 0.001, max: 254.999, noInteger: true, noNaN: true }),
        ),
        (bad) => {
          expect(() => new Color(bad, 0, 0)).toThrow("Invalid color");
        },
      ),
    );
  });

  it("LogoLayout: the logo is odd, the cleared area within 40 % and at least the logo", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 21, max: 177 }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        fc.integer({ min: 0, max: 5 }),
        (modules, fraction, border) => {
          const l = new LogoLayout(modules, fraction, border);
          expect(l.logoModules === 0 || l.logoModules % 2 === 1).toBe(true);
          expect(l.clearedModules).toBeLessThanOrEqual(
            Math.max(Math.floor(modules * 0.4), l.logoModules + 2 * border),
          );
          expect(l.logoModules).toBeLessThanOrEqual(l.clearedModules);
        },
      ),
    );
  });

  it("PNG round-trips the rendered pixels exactly", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 60 }),
        fc.integer({ min: 21, max: 120 }),
        fc.integer({ min: 0, max: 3 }),
        (message, size, quietZone) => {
          const img = renderQr(message, { size, quietZone });
          const decoded = decodePng(img.toPng());
          expect(decoded.width).toBe(size);
          expect(
            new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
          ).toEqual(img.pixels);
        },
      ),
      { numRuns: 40 },
    );
  });

  it("rescaling to the same size is the identity", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 12 }), (w, h) => {
        const src = Uint8Array.from({ length: w * h * 4 }, (_, i) => (i * 37) & 0xff);
        expect(nearestNeighborScale(src, w, h, w, h)).toEqual(src);
        expect(bilinearScale(src, w, h, w, h)).toEqual(src);
      }),
    );
  });

  it("frame counts follow cycles × parts or frameCount, with 1-based indices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 400 }),
        fc.integer({ min: 20, max: 200 }),
        fc.integer({ min: 1, max: 3 }),
        (length, maxFragmentLen, cycles) => {
          const ur = UR.from("bytes", cbor(Uint8Array.from({ length }, (_, i) => i % 256)));
          const frames = generateFrames(ur, { maxFragmentLen, cycles, size: 16 });
          const parts = frames.filter((f) => f.index <= frames.length / cycles).length;
          expect(frames.length % cycles).toBe(0);
          expect(parts).toBe(frames.length / cycles);
          expect(frames.map((f) => f.index)).toEqual(frames.map((_, i) => i + 1));
          expect(Object.isFrozen(frames[0])).toBe(true);
        },
      ),
      { numRuns: 25 },
    );
  });
});
