/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Derived from the `qrcode` crate 0.14.1 (MIT/Apache-2.0), see LICENSE-QRCODE.
 * Reed–Solomon error correction over GF(256) and the block interleave.
 */

import { DATA_BYTES_PER_BLOCK, EC_BYTES_PER_BLOCK, type EcLevel, type Version } from "./types.js";

/** `EXP_TABLE[n]` is 2ⁿ in GF(256) with the QR primitive polynomial x⁸ + x⁴ + x³ + x² + 1. */
const EXP_TABLE = new Uint8Array(256);
/** `LOG_TABLE[v]` inverts `EXP_TABLE`; `LOG_TABLE[0]` is unused. */
const LOG_TABLE = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
  EXP_TABLE[255] = 1;
  LOG_TABLE[0] = 0xff;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

/**
 * `GENERATOR_POLYNOMIALS[n]` holds the logarithms of the coefficients of
 * (x − 2⁰)(x − 2¹)…(x − 2ⁿ⁻¹) below the leading term, highest degree first.
 */
const GENERATOR_POLYNOMIALS: Uint8Array[] = [];
{
  let poly = [1];
  GENERATOR_POLYNOMIALS.push(new Uint8Array(0));
  for (let n = 1; n <= 69; n++) {
    const root = EXP_TABLE[n - 1];
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let i = 0; i < poly.length; i++) {
      next[i] ^= poly[i];
      next[i + 1] ^= gfMul(poly[i], root);
    }
    poly = next;
    GENERATOR_POLYNOMIALS.push(Uint8Array.from(poly.slice(1), (c) => LOG_TABLE[c]));
  }
}

/** The `ecCodeSize` error-correction codewords of `data`. */
export function createErrorCorrectionCode(data: Uint8Array, ecCodeSize: number): Uint8Array {
  const dataLen = data.length;
  const logDen = GENERATOR_POLYNOMIALS[ecCodeSize];
  const res = new Uint8Array(dataLen + ecCodeSize);
  res.set(data);
  for (let i = 0; i < dataLen; i++) {
    const leadCoeff = res[i];
    if (leadCoeff === 0) continue;
    const logLeadCoeff = LOG_TABLE[leadCoeff];
    const n = Math.min(res.length - i - 1, logDen.length);
    for (let k = 0; k < n; k++) {
      res[i + 1 + k] ^= EXP_TABLE[(logDen[k] + logLeadCoeff) % 255];
    }
  }
  return res.subarray(dataLen);
}

/** Takes the first codeword of every block, then the second, and so on; the longest block last. */
function interleave(blocks: readonly Uint8Array[]): Uint8Array {
  const lastBlockLen = blocks[blocks.length - 1].length;
  const res: number[] = [];
  for (let i = 0; i < lastBlockLen; i++) {
    for (const block of blocks) {
      if (i < block.length) res.push(block[i]);
    }
  }
  return Uint8Array.from(res);
}

/** The interleaved data codewords and the interleaved error-correction codewords. */
export function constructCodewords(
  rawbits: Uint8Array,
  version: Version,
  level: EcLevel,
): { data: Uint8Array; ec: Uint8Array } {
  const [block1Size, block1Count, block2Size] = DATA_BYTES_PER_BLOCK[version - 1][level];
  const block1End = block1Size * block1Count;
  const blocks: Uint8Array[] = [];
  for (let i = 0; i < block1End; i += block1Size) blocks.push(rawbits.subarray(i, i + block1Size));
  if (block2Size > 0) {
    for (let i = block1End; i < rawbits.length; i += block2Size) {
      blocks.push(rawbits.subarray(i, i + block2Size));
    }
  }
  const ecBytes = EC_BYTES_PER_BLOCK[version - 1][level];
  const ecCodes = blocks.map((block) => createErrorCorrectionCode(block, ecBytes));
  return { data: interleave(blocks), ec: interleave(ecCodes) };
}
