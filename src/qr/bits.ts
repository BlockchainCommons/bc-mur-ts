/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Derived from the `qrcode` crate 0.14.1 (MIT/Apache-2.0), see LICENSE-QRCODE.
 * The data bit stream: mode indicators, character counts, the segments'
 * data, the terminator and the padding, at the smallest version that fits.
 */

import { type Segment, optimizeSegments, parseSegments, totalEncodedLen } from "./optimize.js";
import {
  DATA_LENGTHS,
  type EcLevel,
  Mode,
  QrFailure,
  type Version,
  dataBitsCount,
  lengthBitsCount,
} from "./types.js";

/** The encoded data codewords of a message at its version. */
export interface EncodedData {
  readonly version: Version;
  readonly bytes: Uint8Array;
}

class Bits {
  readonly data: number[] = [];
  private bitOffset = 0;
  readonly version: Version;

  constructor(version: Version) {
    this.version = version;
  }

  /** Appends the low `n` bits of `number`, most significant first. */
  pushNumber(n: number, number: number): void {
    const b = this.bitOffset + n;
    const last = this.data.length - 1;
    if (this.bitOffset === 0) {
      if (b <= 8) {
        this.data.push((number << (8 - b)) & 0xff);
      } else {
        this.data.push((number >> (b - 8)) & 0xff);
        this.data.push((number << (16 - b)) & 0xff);
      }
    } else if (b <= 8) {
      this.data[last] |= (number << (8 - b)) & 0xff;
    } else if (b <= 16) {
      this.data[last] |= (number >> (b - 8)) & 0xff;
      this.data.push((number << (16 - b)) & 0xff);
    } else {
      this.data[last] |= (number >> (b - 8)) & 0xff;
      this.data.push((number >> (b - 16)) & 0xff);
      this.data.push((number << (24 - b)) & 0xff);
    }
    this.bitOffset = b & 7;
  }

  /** `pushNumber`, failing with "data too long" when `number` needs more than `n` bits. */
  pushNumberChecked(n: number, number: number): void {
    if (n > 16 || number >= 1 << n) throw new QrFailure("data too long");
    this.pushNumber(n, number);
  }

  /** The bits pushed so far. */
  get length(): number {
    return this.bitOffset === 0
      ? this.data.length * 8
      : (this.data.length - 1) * 8 + this.bitOffset;
  }

  private pushModeIndicator(mode: Mode): void {
    let indicator: number;
    switch (mode) {
      case Mode.Numeric:
        indicator = 0b0001;
        break;
      case Mode.Alphanumeric:
        indicator = 0b0010;
        break;
      case Mode.Byte:
        indicator = 0b0100;
        break;
      case Mode.Kanji:
        indicator = 0b1000;
        break;
    }
    try {
      this.pushNumberChecked(4, indicator);
    } catch {
      throw new QrFailure("unsupported character set");
    }
  }

  private pushHeader(mode: Mode, rawDataLen: number): void {
    const lengthBits = lengthBitsCount(mode, this.version);
    this.pushModeIndicator(mode);
    this.pushNumberChecked(lengthBits, rawDataLen);
  }

  pushNumericData(data: Uint8Array): void {
    this.pushHeader(Mode.Numeric, data.length);
    for (let i = 0; i < data.length; i += 3) {
      const chunk = Math.min(3, data.length - i);
      let number = 0;
      for (let j = 0; j < chunk; j++) number = number * 10 + (data[i + j] - 0x30);
      this.pushNumber(chunk * 3 + 1, number);
    }
  }

  pushAlphanumericData(data: Uint8Array): void {
    this.pushHeader(Mode.Alphanumeric, data.length);
    for (let i = 0; i < data.length; i += 2) {
      const chunk = Math.min(2, data.length - i);
      let number = 0;
      for (let j = 0; j < chunk; j++) number = number * 45 + alphanumericDigit(data[i + j]);
      this.pushNumber(chunk * 5 + 1, number);
    }
  }

  pushByteData(data: Uint8Array): void {
    this.pushHeader(Mode.Byte, data.length);
    for (const b of data) this.pushNumber(8, b);
  }

  pushKanjiData(data: Uint8Array): void {
    this.pushHeader(Mode.Kanji, Math.floor(data.length / 2));
    for (let i = 0; i < data.length; i += 2) {
      if (i + 1 >= data.length) throw new QrFailure("invalid character");
      const cp = data[i] * 256 + data[i + 1];
      const bytes = cp < 0xe040 ? cp - 0x8140 : cp - 0xc140;
      const number = (bytes >> 8) * 0xc0 + (bytes & 0xff);
      this.pushNumber(13, number);
    }
  }

  pushSegments(data: Uint8Array, segments: readonly Segment[]): void {
    for (const segment of segments) {
      const slice = data.subarray(segment.begin, segment.end);
      switch (segment.mode) {
        case Mode.Numeric:
          this.pushNumericData(slice);
          break;
        case Mode.Alphanumeric:
          this.pushAlphanumericData(slice);
          break;
        case Mode.Byte:
          this.pushByteData(slice);
          break;
        case Mode.Kanji:
          this.pushKanjiData(slice);
          break;
      }
    }
  }

  /** Appends the terminator and pads to the version's data capacity. */
  pushTerminator(level: EcLevel): void {
    const curLength = this.length;
    const dataLength = DATA_LENGTHS[this.version - 1][level];
    if (curLength > dataLength) throw new QrFailure("data too long");
    const terminatorSize = Math.min(4, dataLength - curLength);
    if (terminatorSize > 0) this.pushNumber(terminatorSize, 0);
    if (this.length < dataLength) {
      this.bitOffset = 0;
      const paddingBytesCount = Math.floor(dataLength / 8) - this.data.length;
      for (let i = 0; i < paddingBytesCount; i++)
        this.data.push(i % 2 === 0 ? 0b1110_1100 : 0b0001_0001);
    }
    if (this.length < dataLength) this.data.push(0);
  }
}

/** The base-45 digit of an alphanumeric-mode character. */
function alphanumericDigit(character: number): number {
  if (character >= 0x30 && character <= 0x39) return character - 0x30;
  if (character >= 0x41 && character <= 0x5a) return character - 0x41 + 10;
  switch (character) {
    case 0x20:
      return 36;
    case 0x24:
      return 37;
    case 0x25:
      return 38;
    case 0x2a:
      return 39;
    case 0x2b:
      return 40;
    case 0x2d:
      return 41;
    case 0x2e:
      return 42;
    case 0x2f:
      return 43;
    case 0x3a:
      return 44;
    default:
      return 0;
  }
}

/** The smallest version whose data capacity at `level` holds `length` bits. */
function findMinVersion(length: number, level: EcLevel): Version {
  let base = 0;
  let size = 39;
  while (size > 1) {
    const half = Math.floor(size / 2);
    const mid = base + half;
    base = DATA_LENGTHS[mid][level] > length ? base : mid;
    size -= half;
  }
  base = DATA_LENGTHS[base][level] >= length ? base : base + 1;
  return base + 1;
}

/**
 * Encodes `data` at the smallest version that holds it, optimising the
 * segments at the widest version of each character-count class.
 */
export function encodeAuto(data: Uint8Array, level: EcLevel): EncodedData {
  const segments = parseSegments(data);
  for (const version of [9, 26, 40]) {
    const optimized = optimizeSegments(segments, version);
    const totalLen = totalEncodedLen(optimized, version);
    const capacity = DATA_LENGTHS[version - 1][level];
    if (totalLen <= capacity) {
      const minVersion = findMinVersion(totalLen, level);
      const bits = new Bits(minVersion);
      bits.pushSegments(data, optimized);
      bits.pushTerminator(level);
      return { version: minVersion, bytes: Uint8Array.from(bits.data) };
    }
  }
  throw new QrFailure("data too long");
}

export { dataBitsCount };
