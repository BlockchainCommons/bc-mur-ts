/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Derived from the `qrcode` crate 0.14.1 (MIT/Apache-2.0), see LICENSE-QRCODE.
 * The QR encoder: a message and a correction level to a module matrix.
 */

import { MurError } from "../error.js";
import { encodeAuto } from "./bits.js";
import { Canvas } from "./canvas.js";
import { constructCodewords } from "./ec.js";
import { type EcLevel, QrFailure } from "./types.js";

/** The correction level as its letter. */
export type EcLetter = "L" | "M" | "Q" | "H";

/** A module matrix: `modules` holds `width * width` bytes, row-major, 1 for dark. */
export interface QrSymbol {
  readonly width: number;
  readonly modules: Uint8Array;
}

const LEVELS: Readonly<Record<EcLetter, EcLevel>> = { L: 0, M: 1, Q: 2, H: 3 };

/**
 * Encodes `message` at the smallest version that holds it, with mixed-mode
 * segments and the lowest-penalty mask. Throws `MurError` `QrEncode` when the
 * message does not fit version 40.
 */
export function encodeQr(message: Uint8Array, level: EcLetter): QrSymbol {
  try {
    const ecLevel = LEVELS[level];
    const { version, bytes } = encodeAuto(message, ecLevel);
    const { data, ec } = constructCodewords(bytes, version, ecLevel);
    const canvas = new Canvas(version, ecLevel);
    canvas.drawAllFunctionalPatterns();
    canvas.drawData(data, ec);
    const masked = canvas.applyBestMask();
    return { width: masked.width, modules: masked.toModules() };
  } catch (e) {
    if (e instanceof QrFailure) throw MurError.qrEncode(e.kind, e);
    throw e;
  }
}
