/**
 * The reference's `write_test_outputs` case.
 *
 * Writes sample PNG + GIF + ProRes artefacts to `tests/out/` for human
 * review. Runs only when `MUR_WRITE_OUTPUTS=1` is set; the ProRes step
 * requires `ffmpeg` on PATH and is skipped otherwise.
 */
import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";

import { Color, type FrameOptions, generateFrames, renderUrQr } from "../src/index.js";
import { encodeAnimatedGif } from "../src/gif.js";
import { encodeProres } from "../src/prores.js";
import { logoFromSvg } from "../src/svg.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_SVG = new Uint8Array(readFileSync(resolve(__dirname, "test_data", "bc-logo.svg")));
const SHORT_UR = "ur:bytes/hdcxdwinvezm";

function longUr(): UR {
  const data = new Uint8Array(500);
  for (let i = 0; i < 500; i++) data[i] = i % 256;
  return UR.from("bytes", cbor(data));
}

const WRITE = process.env["MUR_WRITE_OUTPUTS"] === "1";
const HAS_FFMPEG = spawnSync("which", ["ffmpeg"], { encoding: "utf8" }).status === 0;

describe.skipIf(!WRITE)("write_test_outputs", () => {
  it("writes all sample artefacts", async () => {
    const outDir = resolve(__dirname, "out");
    mkdirSync(outDir, { recursive: true });

    const logo = await logoFromSvg(TEST_SVG, {
      fraction: 0.25,
      clearBorder: 1,
      clearShape: "square",
    });
    const circleLogo = await logoFromSvg(TEST_SVG, {
      fraction: 0.25,
      clearBorder: 1,
      clearShape: "circle",
    });

    // ── Light mode (default) ──
    writeFileSync(
      resolve(outDir, "single-no-logo.png"),
      renderUrQr(SHORT_UR, { correction: "low", size: 512, quietZone: 1 }).toPng(),
    );
    writeFileSync(
      resolve(outDir, "single-with-logo.png"),
      renderUrQr(SHORT_UR, { correction: "high", size: 512, quietZone: 1, logo }).toPng(),
    );
    writeFileSync(
      resolve(outDir, "single-circle-logo.png"),
      renderUrQr(SHORT_UR, {
        correction: "high",
        size: 512,
        quietZone: 1,
        logo: circleLogo,
      }).toPng(),
    );

    // ── Dark mode ──
    writeFileSync(
      resolve(outDir, "single-dark-no-logo.png"),
      renderUrQr(SHORT_UR, {
        correction: "low",
        size: 512,
        foreground: Color.WHITE,
        background: Color.BLACK,
        quietZone: 1,
      }).toPng(),
    );
    writeFileSync(
      resolve(outDir, "single-dark-with-logo.png"),
      renderUrQr(SHORT_UR, {
        correction: "high",
        size: 512,
        foreground: Color.WHITE,
        background: Color.BLACK,
        quietZone: 1,
        logo,
      }).toPng(),
    );

    // ── Quiet zone variations ──
    writeFileSync(
      resolve(outDir, "single-qz0.png"),
      renderUrQr(SHORT_UR, { correction: "low", size: 512, quietZone: 0 }).toPng(),
    );
    writeFileSync(
      resolve(outDir, "single-qz4.png"),
      renderUrQr(SHORT_UR, { correction: "low", size: 512, quietZone: 4 }).toPng(),
    );
    writeFileSync(
      resolve(outDir, "single-dark-qz4-logo.png"),
      renderUrQr(SHORT_UR, {
        correction: "high",
        size: 512,
        foreground: Color.WHITE,
        background: Color.BLACK,
        quietZone: 4,
        logo,
      }).toPng(),
    );

    // ── Animated ──
    const ur = longUr();
    const baseParams: FrameOptions = {
      maxFragmentLen: 50,
      size: 512,
      cycles: 2,
    };

    const frames = generateFrames(ur, baseParams);
    writeFileSync(resolve(outDir, "animated.gif"), encodeAnimatedGif(frames, { fps: 8 }));

    const framesLogo = generateFrames(ur, { ...baseParams, logo });
    writeFileSync(resolve(outDir, "animated-logo.gif"), encodeAnimatedGif(framesLogo, { fps: 8 }));

    const framesCircleLogo = generateFrames(ur, {
      ...baseParams,
      logo: circleLogo,
    });
    writeFileSync(
      resolve(outDir, "animated-circle-logo.gif"),
      encodeAnimatedGif(framesCircleLogo, { fps: 8 }),
    );

    const framesDarkLogo = generateFrames(ur, {
      ...baseParams,
      foreground: Color.WHITE,
      background: Color.BLACK,
      logo,
    });
    writeFileSync(
      resolve(outDir, "animated-dark-logo.gif"),
      encodeAnimatedGif(framesDarkLogo, { fps: 8 }),
    );

    const framesDark = generateFrames(ur, {
      ...baseParams,
      foreground: Color.WHITE,
      background: Color.BLACK,
    });
    writeFileSync(resolve(outDir, "animated-dark.gif"), encodeAnimatedGif(framesDark, { fps: 8 }));

    // ── ProRes 4444 (requires ffmpeg on PATH) ──
    if (HAS_FFMPEG) {
      const proresPath = resolve(outDir, "animated.mov");
      await encodeProres(frames, { fps: 8, outputPath: proresPath });
      expect(existsSync(proresPath)).toBe(true);
      expect(statSync(proresPath).size).toBeGreaterThan(100);
    }
  });
});
