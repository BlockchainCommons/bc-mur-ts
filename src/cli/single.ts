/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { checkQrDensity, qrModuleCount } from "../qr-matrix.js";
import { renderUrQr, urBytes } from "../render.js";
import {
  type DrawArgs,
  colorsOf,
  correctionOf,
  loadLogo,
  readInput,
  resolveDrawArgs,
} from "./options.js";

/** `mur single` arguments. */
export interface SingleArgs extends DrawArgs {
  /** Output file; stdout when absent. */
  output?: string;
  /** `png` or `jpeg` (default `png`). */
  format?: string;
  /** JPEG quality, 1–100 (default 90). */
  jpegQuality?: number;
}

/** `mur single`: one QR code as PNG or JPEG. Returns the status line to print. */
export async function single(args: SingleArgs): Promise<string> {
  const draw = resolveDrawArgs(args);
  const format = args.format ?? "png";
  const jpegQuality = args.jpegQuality ?? 90;
  const urString = await readInput(draw.urString);
  const logo = await loadLogo(draw);
  const correction = correctionOf(draw, logo);
  if (draw.densityCheck) {
    checkQrDensity(qrModuleCount(urBytes(urString), correction), draw.maxModules);
  }
  const image = renderUrQr(urString, {
    correction,
    size: draw.size,
    ...colorsOf(draw),
    quietZone: draw.quietZone,
    logo,
  });
  let data: Uint8Array;
  switch (format) {
    case "png":
      data = image.toPng();
      break;
    case "jpeg":
    case "jpg":
      data = image.toJpeg({ quality: jpegQuality });
      break;
    default:
      throw new Error(`unknown format: ${format} (expected png or jpeg)`);
  }
  if (args.output !== undefined && args.output !== "") {
    const fs = await import("node:fs/promises");
    await fs.writeFile(args.output, data);
    return `Wrote ${data.length} bytes to ${args.output}`;
  }
  process.stdout.write(data);
  return "";
}
