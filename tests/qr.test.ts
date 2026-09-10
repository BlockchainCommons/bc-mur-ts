/**
 * The QR encoder against the reference `qrcode` crate: segment parsing and
 * merging, symbol versions, capacity limits, and matrices hashed on the Rust
 * side (`tests/qr-fixtures.json`).
 */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MurError } from "../src/error.js";
import { QrMatrix } from "../src/qr-matrix.js";
import { encodeQr } from "../src/qr/index.js";
import { type Segment, optimizeSegments, parseSegments } from "../src/qr/optimize.js";
import { Mode } from "../src/qr/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const bitsOf = (modules: Uint8Array): string => {
  let bits = "";
  for (const m of modules) bits += m === 1 ? "1" : "0";
  return bits;
};
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const seg = (mode: Mode, begin: number, end: number): Segment => ({ mode, begin, end });

describe("segment parsing", () => {
  it("splits digits, alphanumerics and symbols", () => {
    expect(parseSegments(enc("01049123451234591597033130128%10ABC123"))).toEqual([
      seg(Mode.Numeric, 0, 29),
      seg(Mode.Alphanumeric, 29, 30),
      seg(Mode.Numeric, 30, 32),
      seg(Mode.Alphanumeric, 32, 35),
      seg(Mode.Numeric, 35, 38),
    ]);
  });

  it("pairs Shift-JIS bytes into Kanji", () => {
    expect(
      parseSegments(Uint8Array.from([0x82, 0xa0, 0x81, 0x41, 0x41, 0xb1, 0x81, 0xf0])),
    ).toEqual([
      seg(Mode.Kanji, 0, 4),
      seg(Mode.Alphanumeric, 4, 5),
      seg(Mode.Byte, 5, 6),
      seg(Mode.Kanji, 6, 8),
    ]);
  });

  it("treats UTF-8 bytes that look like Shift-JIS as Kanji pairs", () => {
    expect(
      parseSegments(
        Uint8Array.from([
          0xe3, 0x81, 0x82, 0xe3, 0x80, 0x81, 0x41, 0xef, 0xbd, 0xb1, 0xe2, 0x84, 0xab,
        ]),
      ),
    ).toEqual([
      seg(Mode.Kanji, 0, 4),
      seg(Mode.Byte, 4, 5),
      seg(Mode.Kanji, 5, 7),
      seg(Mode.Byte, 7, 10),
      seg(Mode.Kanji, 10, 12),
      seg(Mode.Byte, 12, 13),
    ]);
  });

  it("does not pair a lead byte with an invalid trail byte", () => {
    expect(parseSegments(Uint8Array.from([0x81, 0x30]))).toEqual([
      seg(Mode.Byte, 0, 1),
      seg(Mode.Numeric, 1, 2),
    ]);
    expect(parseSegments(Uint8Array.from([0xeb, 0xc0]))).toEqual([
      seg(Mode.Byte, 0, 1),
      seg(Mode.Byte, 1, 2),
    ]);
    expect(parseSegments(Uint8Array.from([0x81, 0x7f]))).toEqual([
      seg(Mode.Byte, 0, 1),
      seg(Mode.Byte, 1, 2),
    ]);
    expect(parseSegments(Uint8Array.from([0x81, 0x40, 0x81]))).toEqual([
      seg(Mode.Kanji, 0, 2),
      seg(Mode.Byte, 2, 3),
    ]);
  });

  it("parses the empty message to no segments", () => {
    expect(parseSegments(new Uint8Array(0))).toEqual([]);
  });
});

describe("segment merging", () => {
  it("merges a short numeric run into its alphanumeric neighbour", () => {
    expect(
      optimizeSegments(
        [seg(Mode.Alphanumeric, 0, 3), seg(Mode.Numeric, 3, 6), seg(Mode.Byte, 6, 10)],
        1,
      ),
    ).toEqual([seg(Mode.Alphanumeric, 0, 6), seg(Mode.Byte, 6, 10)]);
  });

  it("keeps a long numeric run separate", () => {
    expect(
      optimizeSegments(
        [
          seg(Mode.Numeric, 0, 29),
          seg(Mode.Alphanumeric, 29, 30),
          seg(Mode.Numeric, 30, 32),
          seg(Mode.Alphanumeric, 32, 35),
          seg(Mode.Numeric, 35, 38),
        ],
        9,
      ),
    ).toEqual([seg(Mode.Numeric, 0, 29), seg(Mode.Alphanumeric, 29, 38)]);
  });

  it("collapses short mixed Kanji runs into Byte", () => {
    expect(
      optimizeSegments(
        [
          seg(Mode.Kanji, 0, 4),
          seg(Mode.Alphanumeric, 4, 5),
          seg(Mode.Byte, 5, 6),
          seg(Mode.Kanji, 6, 8),
        ],
        1,
      ),
    ).toEqual([seg(Mode.Byte, 0, 8)]);
  });

  it("keeps a long Kanji run beside a single byte", () => {
    expect(optimizeSegments([seg(Mode.Kanji, 0, 10), seg(Mode.Byte, 10, 11)], 1)).toEqual([
      seg(Mode.Kanji, 0, 10),
      seg(Mode.Byte, 10, 11),
    ]);
  });
});

describe("encodeQr", () => {
  it("encodes the ISO 18004 Annex I example as the reference does", () => {
    const symbol = encodeQr(enc("01234567"), "M");
    expect(symbol.width).toBe(21);
    expect(sha(bitsOf(symbol.modules))).toBe(
      "f3893350666aa94b0ca61d127aeb35a2d6d7d481c0d7ee65f9da685de37ae225",
    );
  });

  it("encodes the empty message as a version 1 symbol", () => {
    const symbol = encodeQr(new Uint8Array(0), "L");
    expect(symbol.width).toBe(21);
    expect(sha(bitsOf(symbol.modules))).toBe(
      "a7f108637f879288a9acbe8d5fddb5714f6a227a2d6d44635d66621d2551dcab",
    );
  });

  it("chooses the reference's version for mixed-mode and Shift-JIS payloads", () => {
    const pairs = (hi: number, lo: number, n: number): Uint8Array =>
      Uint8Array.from({ length: n }, (_, i) => (i % 2 === 0 ? hi : lo));
    expect(encodeQr(enc(`ABC${"1234567890".repeat(6)}`), "L").width).toBe(25);
    expect(encodeQr(pairs(0x81, 0x40, 40), "L").width).toBe(25);
    expect(encodeQr(pairs(0x9f, 0xa0, 120), "M").width).toBe(41);
    expect(encodeQr(enc(`hello world ${"1234567890".repeat(4)}`), "L").width).toBe(25);
    expect(encodeQr(enc("UR:BYTES/HDCXDWINVEZM"), "L").width).toBe(21);
    expect(encodeQr(enc("ur:bytes/hdcxdwinvezm"), "L").width).toBe(25);
  });

  it("fills version 40 to its capacity and rejects one more", () => {
    expect(encodeQr(new Uint8Array(2953).fill(0xff), "L").width).toBe(177);
    expect(encodeQr(enc("7".repeat(7089)), "L").width).toBe(177);
    expect(encodeQr(enc("Q".repeat(4296)), "L").width).toBe(177);
    expect(encodeQr(new Uint8Array(1273).fill(0xff), "H").width).toBe(177);
    for (const [message, level] of [
      [new Uint8Array(2954).fill(0xff), "L"],
      [enc("7".repeat(7090)), "L"],
      [enc("Q".repeat(4297)), "L"],
      [new Uint8Array(1274).fill(0xff), "H"],
      [new Uint8Array(3000).fill(0x41), "H"],
    ] as const) {
      let caught: unknown;
      try {
        encodeQr(message, level);
      } catch (e) {
        caught = e;
      }
      expect(MurError.isMurError(caught)).toBe(true);
      expect((caught as MurError).code).toBe("QrEncode");
      expect((caught as MurError).message).toBe("QR encoding failed: data too long");
    }
  });

  it("reproduces the reference matrices of the fixture set", () => {
    const fixtures = JSON.parse(readFileSync(join(here, "qr-fixtures.json"), "utf8")) as {
      hex: string;
      level: "L" | "M" | "Q" | "H";
      width: number;
      sha256: string;
    }[];
    expect(fixtures.length).toBeGreaterThanOrEqual(60);
    for (const f of fixtures) {
      const symbol = encodeQr(Uint8Array.from(Buffer.from(f.hex, "hex")), f.level);
      expect(symbol.width, f.hex.slice(0, 32)).toBe(f.width);
      expect(sha(bitsOf(symbol.modules)), f.hex.slice(0, 32)).toBe(f.sha256);
    }
  });

  it("is what QrMatrix exposes", () => {
    const message = enc("UR:BYTES/HDCXDWINVEZM");
    const symbol = encodeQr(message, "H");
    const matrix = QrMatrix.encode(message, "high");
    expect(matrix.width()).toBe(symbol.width);
    for (let row = 0; row < symbol.width; row++) {
      for (let col = 0; col < symbol.width; col++) {
        expect(matrix.isDark(col, row)).toBe(symbol.modules[row * symbol.width + col] === 1);
      }
    }
  });

  it("encodes a 117-module symbol quickly", () => {
    const message = new Uint8Array(1200).fill(0x61);
    expect(encodeQr(message, "L").width).toBe(117);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) encodeQr(message, "L");
    expect((performance.now() - t0) / 10).toBeLessThan(20);
  });
});
