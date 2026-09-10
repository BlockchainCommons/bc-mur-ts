/**
 * Composites an SVG logo over a QR code. In Node the rasteriser's WASM
 * module loads itself; in a browser call `initSvgRenderer(wasm)` first.
 *
 *   bun examples/svg-logo.ts > logo.png
 */
import { readFile } from "node:fs/promises";
import { Color, renderUrQr } from "@blockchaincommons/multipart-ur";
import { logoFromSvg } from "@blockchaincommons/multipart-ur/svg-logo";

const svg = new Uint8Array(
  await readFile(new URL("../tests/test_data/bc-logo.svg", import.meta.url)),
);
const logo = await logoFromSvg(svg, { fraction: 0.25, clearBorder: 1, clearShape: "circle" });
// A logo defaults the correction level to "high".
const image = renderUrQr("ur:bytes/hdcxdwinvezm", {
  logo,
  size: 512,
  foreground: "#1A1A1A",
  background: Color.WHITE,
});
process.stdout.write(image.toPng());
