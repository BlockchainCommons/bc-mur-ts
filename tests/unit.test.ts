/**
 * Port of inline `#[cfg(test)] mod tests` blocks in the Rust source.
 */
import { describe, expect, it } from "vitest";

import { Color, renderQr, renderUrQr } from "../src/index.js";
// Package-internal imports (not exposed in `index.ts` — same as rust crate-private symbols).
import { validateClearBorder, validateFraction } from "../src/logo.js";
import { QrMatrix } from "../src/qr-matrix.js";
import { LogoLayout } from "../src/render.js";
import { demultiplyAlpha, rasterizeSvg } from "../src/svg.js";

// color.rs
describe("color", () => {
  it("parse_hex_6", () => {
    const c = Color.from("#FF8000");
    expect(c).toEqual(new Color(255, 128, 0, 255));
  });

  it("parse_hex_8", () => {
    const c = Color.from("#FF800080");
    expect(c).toEqual(new Color(255, 128, 0, 128));
  });

  it("parse_hex_3", () => {
    const c = Color.from("#F80");
    expect(c).toEqual(new Color(0xff, 0x88, 0x00, 255));
  });

  it("display_rgb", () => {
    expect(Color.BLACK.toString()).toBe("#000000");
  });

  it("display_rgba", () => {
    expect(new Color(255, 128, 0, 128).toString()).toBe("#FF800080");
  });
  it("from tuple, hex getter, bytes getter", () => {
    expect(Color.from([255, 128, 0])).toEqual(new Color(255, 128, 0, 255));
    expect(Color.from([255, 128, 0, 128]).hex).toBe("#FF800080");
    expect(Array.from(Color.from("#F80").bytes)).toEqual([0xff, 0x88, 0x00, 255]);
    expect(Color.from(Color.BLACK)).toBe(Color.BLACK);
  });
  it("isTransparent", () => {
    expect(Color.TRANSPARENT.isTransparent).toBe(true);
    expect(new Color(0, 0, 0, 2).isTransparent).toBe(true);
    expect(new Color(0, 0, 0, 3).isTransparent).toBe(false);
    expect(Color.WHITE.isTransparent).toBe(false);
  });
});

// qr_matrix.rs
describe("qr_matrix", () => {
  it("encode_small", () => {
    const m = QrMatrix.encode(new TextEncoder().encode("HELLO"), "low");
    expect(m.width()).toBe(21);
  });

  it("encode_ur_string (alphanumeric mode)", () => {
    // An upper-case UR string is alphanumeric: 21 characters fit version 1
    // at low correction (25-character capacity), a 21×21 symbol.
    const ur = "UR:BYTES/HDCXDWINVEZM";
    const m = QrMatrix.encode(new TextEncoder().encode(ur), "low");
    expect(m.width()).toBe(21);
  });

  it("encode binary payload uses Byte mode", () => {
    // A 17-byte binary payload is version 1's byte-mode capacity at low.
    const bytes = new Uint8Array([
      0x91, 0x6e, 0xc6, 0x5c, 0xf7, 0x7c, 0xad, 0xf5, 0x5c, 0xd7, 0xf9, 0xcd, 0xa1, 0xa1, 0x03,
      0x00, 0x26,
    ]);
    expect(bytes.length).toBe(17);
    const m = QrMatrix.encode(bytes, "low");
    expect(m.width()).toBe(21);
  });

  it("encode all-numeric payload uses Numeric mode", () => {
    // 41 digits are version 1's numeric capacity at low; in byte mode they
    // would need version 3.
    const numeric = "12345678901234567890123456789012345678901";
    expect(numeric.length).toBe(41);
    const m = QrMatrix.encode(new TextEncoder().encode(numeric), "low");
    expect(m.width()).toBe(21);
  });

  it("encode lowercase falls through to Byte mode", () => {
    // The alphanumeric set is upper-case only: 21 lower-case characters need
    // byte mode and version 2.
    const lowercase = "ur:bytes/hdcxdwinvezm";
    expect(lowercase.length).toBe(21);
    const m = QrMatrix.encode(new TextEncoder().encode(lowercase), "low");
    expect(m.width()).toBe(25);
  });
});

// logo.rs
describe("logo internals", () => {
  it("fraction_validation", () => {
    expect(() => validateFraction(0.25)).not.toThrow();
    expect(() => validateFraction(0.0)).toThrow();
    expect(() => validateFraction(1.0)).toThrow();
  });

  it("clear_border_validation", () => {
    expect(() => validateClearBorder(0)).not.toThrow();
    expect(() => validateClearBorder(5)).not.toThrow();
    expect(() => validateClearBorder(6)).toThrow();
  });

  it("demultiply identity (opaque)", () => {
    const data = new Uint8Array([255, 128, 0, 255]);
    const out = demultiplyAlpha(data);
    expect(Array.from(out)).toEqual(Array.from(data));
  });

  it("demultiply transparent", () => {
    const data = new Uint8Array([0, 0, 0, 0]);
    const out = demultiplyAlpha(data);
    expect(Array.from(out)).toEqual([0, 0, 0, 0]);
  });
});

// render.rs
describe("render", () => {
  it("logo_layout_basic", () => {
    const l = new LogoLayout(25, 0.25, 1);
    // 25 * 0.25 = 6.25 → round to 6 → force odd → 7
    expect(l.logoModules).toBe(7);
    // 7 + 2*1 = 9
    expect(l.clearedModules).toBe(9);
  });

  it("logo_layout_cap_at_40_pct", () => {
    // 21 * 0.40 = 8.4 → floor = 8
    const l = new LogoLayout(21, 0.5, 2);
    // 21 * 0.5 = 10.5 → 11 (odd), cleared = 11+4=15 > 8 → capped
    expect(l.clearedModules).toBeLessThanOrEqual(8);
  });

  it("render_basic_qr", () => {
    const img = renderQr(new TextEncoder().encode("HELLO"), { correction: "low", size: 256 });
    expect(img.width).toBe(256);
    expect(img.height).toBe(256);
    expect(img.pixels.length).toBe(256 * 256 * 4);
  });

  it("render_to_png", () => {
    const img = renderQr(new TextEncoder().encode("TEST"), { correction: "medium", size: 128 });
    const png = img.toPng();
    expect(Array.from(png.slice(0, 4))).toEqual([137, 80, 78, 71]);
  });

  it("render_ur_qr_uppercases", () => {
    const img = renderUrQr("ur:bytes/hdcxdwinvezm", { correction: "low", size: 256 });
    expect(img.width).toBe(256);
  });
});

// svg.ts
describe("svg centering", () => {
  // A 333×200 document scales by min(512/333, 512/200) = 1.5375…, so its
  // top edge lands at y = (512 - 200 * 1.5375) / 2 = 102.25: a fractional
  // offset the rasteriser anti-aliases (row 102 partially covered, rows
  // below fully), exactly as the reference's transform does.
  it("renders non-square SVG with sub-pixel-accurate vertical centering", async () => {
    const svgText = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 333 200">
  <rect x="0" y="0" width="333" height="200" fill="rgb(255, 0, 0)"/>
</svg>`;
    const svg = new TextEncoder().encode(svgText);
    const image = await rasterizeSvg(svg);
    expect(image.width).toBe(512);
    expect(image.height).toBe(512);
    const out = image.pixels;
    expect(out.length).toBe(512 * 512 * 4);

    // Helper: alpha of pixel at (col, row).
    const alphaAt = (col: number, row: number): number => out[(row * 512 + col) * 4 + 3];

    // Row 0 — well above the rendered SVG region — fully transparent.
    expect(alphaAt(256, 0)).toBe(0);
    // Row 511 — well below — fully transparent.
    expect(alphaAt(256, 511)).toBe(0);

    // The top edge is between rows 102 and 103 (ty = 102.25), so the first
    // row with coverage at the centre column is 102, partially covered.
    let firstNonzero = -1;
    for (let y = 0; y < 200; y++) {
      if (alphaAt(256, y) > 0) {
        firstNonzero = y;
        break;
      }
    }
    expect(firstNonzero).toBeGreaterThanOrEqual(101);
    expect(firstNonzero).toBeLessThanOrEqual(103);

    // The top-edge pixel is anti-aliased: a partial alpha, not 0 or 255.
    const topEdgeAlpha = alphaAt(256, firstNonzero);
    expect(topEdgeAlpha).toBeGreaterThan(0);
    expect(topEdgeAlpha).toBeLessThan(255);

    // Two rows below the top edge the SVG is fully opaque.
    expect(alphaAt(256, firstNonzero + 2)).toBeGreaterThan(240);
  });
});
