/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { type CorrectionLevel, correctionLevelToLetter } from "./correction.js";
import { MurError } from "./error.js";
import { expectBytes, expectInteger } from "./guards.js";
import { encodeQr } from "./qr/index.js";

/**
 * Default maximum QR module count for reliable phone scanning.
 * Corresponds to QR version 25 (117×117 modules).
 */
export const DEFAULT_MAX_MODULES = 117;

/** The QR module count of a message without rendering it. */
export function qrModuleCount(message: Uint8Array, correction: CorrectionLevel): number {
  const matrix = QrMatrix.encode(expectBytes("message", message), correction);
  return matrix.width();
}

/**
 * Checks that a module count is within a density limit: `QrCodeTooDense` if
 * `moduleCount > maxModules`. Both are non-negative integers.
 */
export function checkQrDensity(moduleCount: number, maxModules: number): void {
  expectInteger("moduleCount", moduleCount, 0);
  expectInteger("maxModules", maxModules, 0);
  if (moduleCount > maxModules) {
    throw MurError.qrCodeTooDense(moduleCount, maxModules);
  }
}

/** @internal A QR module matrix (one byte per module, 1 for dark). */
export class QrMatrix {
  private readonly _modules: Uint8Array;
  private readonly _width: number;

  private constructor(modules: Uint8Array, width: number) {
    this._modules = modules;
    this._width = width;
  }

  /** Encode a byte message into a QR matrix at the given correction level. */
  static encode(message: Uint8Array, correction: CorrectionLevel): QrMatrix {
    const letter = correctionLevelToLetter(correction);
    const symbol = encodeQr(message, letter);
    return new QrMatrix(symbol.modules, symbol.width);
  }

  /** Module count (width == height for QR codes). */
  width(): number {
    return this._width;
  }

  /** True if the module at (col, row) is dark. */
  isDark(col: number, row: number): boolean {
    return this._modules[row * this._width + col] === 1;
  }
}
