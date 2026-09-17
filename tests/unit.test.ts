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
import { gifDelay } from "../src/gif.js";
import { NeuQuant } from "../src/neuquant.js";
import { createHash } from "node:crypto";
import { numberArg } from "../src/cli/options.js";

// color.rs
describe("color", () => {
  it("parse_hex_6", () => {
    const c = Color.fromHex("#FF8000");
    expect(c).toEqual(new Color(255, 128, 0, 255));
  });

  it("parse_hex_8", () => {
    const c = Color.fromHex("#FF800080");
    expect(c).toEqual(new Color(255, 128, 0, 128));
  });

  it("parse_hex_3", () => {
    const c = Color.fromHex("#F80");
    expect(c).toEqual(new Color(0xff, 0x88, 0x00, 255));
  });

  it("display_rgb", () => {
    expect(Color.BLACK.toString()).toBe("#000000");
  });

  it("display_rgba", () => {
    expect(new Color(255, 128, 0, 128).toString()).toBe("#FF800080");
  });
  it("fromHex takes a string only; equals compares every channel", () => {
    expect(() => Color.fromHex([255, 128, 0] as unknown as string)).toThrow(
      "Invalid color: expected a hex string, got an array",
    );
    expect(new Color(255, 128, 0).equals(Color.fromHex("F80"))).toBe(false);
    expect(new Color(255, 136, 0).equals(Color.fromHex("F80"))).toBe(true);
  });
  it("reports a non-ASCII digit by its first UTF-8 byte and measures the string in bytes, as the reference does", () => {
    expect(() => Color.fromHex("#ÿÿÿ")).toThrow("Invalid color: invalid hex digit: 195");
    expect(() => Color.fromHex("#zzÿ")).toThrow(
      "Invalid color: expected #RGB, #RRGGBB, or #RRGGBBAA, got: #zzÿ",
    );
    expect(() => Color.fromHex("#ÿ")).toThrow("expected #RGB, #RRGGBB, or #RRGGBBAA, got: #ÿ");
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

// animate.rs: `(100.0 / fps).round() as u16`
describe("gif delay", () => {
  it("saturates as the reference's float-to-u16 cast does", () => {
    expect(gifDelay(8)).toBe(13);
    expect(gifDelay(5)).toBe(20);
    expect(gifDelay(0)).toBe(65535);
    expect(gifDelay(-5)).toBe(0);
    expect(gifDelay(Number.NaN)).toBe(0);
    expect(gifDelay(1000)).toBe(0);
    expect(gifDelay(0.001)).toBe(65535);
  });
});

// color_quant 1.1.0: the palette and index map of the crate on the same buffers
describe("NeuQuant", () => {
  const sha = (u: Uint8Array): string => createHash("sha256").update(u).digest("hex");
  const quantise = (pixels: Uint8Array): { palette: string; indices: string } => {
    const nq = new NeuQuant(10, 256, pixels);
    const palette = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) palette.set(nq.lookup(i) ?? [0, 0, 0, 0], i * 4);
    const indices = new Uint8Array(pixels.length / 4);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      indices[j] = nq.indexOf(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
    return { palette: sha(palette), indices: sha(indices) };
  };

  it("matches the crate on 257 random RGBA pixels", () => {
    const pixels = Uint8Array.from(
      Buffer.from(
        "04768682261d046600319605758500257748eabbd0fb9ac11bb628c52a31da662634770f69adfe9f530895821692062d6fa38c92262dc1df0ffe77c5923f57f84da8ed24b205525f09315ec1703186f929923d089742e42d12e5d9a710018c5a237d8ac4943aaa785e29e81cf86867a063556e289e74fbe47c1002bbcd1420df9e7923a7558629e4033f527d57f678aa598cf7b27bbecd8559fd09d0b6400a3f5671b760e6afe9f36d9b0eeb954abf11b31e6a01a600ed53996e531002de1768590e859b80462c5183a2f8944a19b78899db94de2fb85db960d94831c95e1524ee367d2fce81003d3c9c91b9a8f6185f07fd40cb77714aa894ef89da569d967145052dd6ca8c71894cb1d03cf071c6c0fd2426a811f4b36c23dd5c0eb50fc340ccb9168c30b2645b44334c7d8931ae04b1e44f962281d9b6dcb3045beea39887afb8208d15d1cc5dc0980df1b3e34acd15db07c6301e8db0596f58a149ee420048520a302fcfe3be5da7ac80e5124d293d426858d4e94c096810c979a92b425627158848757ad35535f75e7ed978b646afef8ac0c8f50b97cf994b4eb32d8f156b8be26d263bb59cf2772de4f4d60d97be6ab245b6fe60e77ee694bf3b19a392e6ccaa87cbaacae2fd61e2bf91c6eb6189eb974a08f88b2852200b6f4805035f0182930a1b66f48057c72d67406cc3cc18862a6d1d4cbb24069ed4270a67a105ad569ee9566166628d3c2ed2ed561e9a8ff82a8f0deeac498eb3cc85ac0e667ecde53f62bd3bcf21d6c62c2f5e53f35ab6da03f45700ca332bf8f8253d1436ff176ef0a61f96a13d0a45785524356e63fc87c7b0a801de4196924f8935d36a9ca7b45227bf61ccdcce7ca91012509b9459d522f182717e81df2e20436c9b8025ed52fd6deab7aa24c580e1f6a31765e433dbbf0ad51f1c1ba0d1269c4fdf43ade223e147c0abf78787094b93491cf160fe931ecadff2446534e15a073d57880ae7cc5eb245721e661299456b065fecfbce84fbd9bf3c871ae65aa1d23d30610e52fcaaaa6013b5bec37a5e9b4385e4bef3a5b3538fa905e10964e705c8487186a492354e7bde0023608ce1e132eac111295f41be4ac6210d9d8d08a06f3269d0d43adcd3753e1ad0aad022417831ea854200c091f13b1caefe3b1279f22f137dea889c3d7b902dd87f60fec0cba7d6c4c94c062d1703813ca2f964a3f0a5b65ac61d22d7ec3e965833185b799b4ddcb467391734f893a8652bc299c8b5271d43512da4f76eea0f441a2be57e4b2abf77a90fb01f85403417813ed945243428aad80c9f4fd2f4c2b43bde3b5945a9937cdb87bffddf18af0f8399f1a637a9c09e290e3b08a0577e0bdf9861806528573a7974373bd1855c650c1337a8f26d1db98e233fd7467b90f1d6e1afb42c2380c06454b54c4e58f76da626a2a8fe77ac3004c1add1",
        "hex",
      ),
    );
    expect(quantise(pixels)).toEqual({
      palette: "ec08e93995509a76e5e9239e2100e20a4d32ab7b387a5b7e4e924ac2b0306230",
      indices: "37d1647a9bce4365320d44e8a96818713a0c51c548a58dacca78cbf845a36a25",
    });
  });

  it("matches the crate on a 1 000-pixel buffer of few colours", () => {
    const pixels = new Uint8Array(1000 * 4);
    for (let i = 0; i < 1000; i++) {
      pixels[i * 4] = i % 3 === 0 ? 255 : 0;
      pixels[i * 4 + 1] = i % 5 === 0 ? 255 : 0;
      pixels[i * 4 + 2] = 40;
      pixels[i * 4 + 3] = 255;
    }
    expect(quantise(pixels)).toEqual({
      palette: "5c73984a81d22539a4531f2ff3bba0d64a2f99dfddfe32b374a71dabe10b8d2e",
      indices: "bac9fa0cd5a9ddaa853cef6294f90b230a5a063a42272bc104d81fd65dbcee16",
    });
  });

  it("matches the crate on seven random pixels", () => {
    const pixels = Uint8Array.from(
      Buffer.from("1c49ea8ee174a69a6b41c77a7e7eaedf9d7329b476653da6db74cefd", "hex"),
    );
    expect(quantise(pixels)).toEqual({
      palette: "717787ff9cb9d76931dadafef0605ad5f985a958626007ce53e050603a6c4f24",
      indices: "9821231aedf54ae884951b4e43c8742a7336b31663ba8737d6772b3b9574af6a",
    });
  });
});

// clap's `f64` argument parser
describe("--fps spellings", () => {
  it("accepts what Rust's f64 parser accepts and nothing else", () => {
    const parse = numberArg();
    expect(parse("8")).toBe(8);
    expect(parse("+.5")).toBe(0.5);
    expect(parse("1e3")).toBe(1000);
    expect(parse("inf")).toBe(Number.POSITIVE_INFINITY);
    expect(parse("-Infinity")).toBe(Number.NEGATIVE_INFINITY);
    expect(parse("NaN")).toBeNaN();
    for (const bad of ["", " 5", "0x10", "abc", "1_000", "5e"]) {
      expect(() => parse(bad)).toThrow("expected a number");
    }
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
