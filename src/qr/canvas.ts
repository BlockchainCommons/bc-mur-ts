/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Derived from the `qrcode` crate 0.14.1 (MIT/Apache-2.0), see LICENSE-QRCODE.
 * The module matrix: function patterns, data placement, the eight masks,
 * the penalty scores and the choice of the best mask.
 */

import {
  ALIGNMENT_PATTERN_POSITIONS,
  type EcLevel,
  FORMAT_INFOS_QR,
  FORMAT_INFO_COORDS_QR_MAIN,
  FORMAT_INFO_COORDS_QR_SIDE,
  VERSION_INFOS,
  VERSION_INFO_COORDS_BL,
  VERSION_INFO_COORDS_TR,
  type Version,
  versionWidth,
} from "./types.js";

// A module is empty, a fixed (function or masked) light or dark module, or
// a data module whose colour the mask may still invert.
const EMPTY = 0;
const MASKED_LIGHT = 1;
const MASKED_DARK = 2;
const UNMASKED_LIGHT = 3;
const UNMASKED_DARK = 4;

const LIGHT = 0;
const DARK = 1;

function isDark(module: number): boolean {
  return module === MASKED_DARK || module === UNMASKED_DARK;
}

/** Steps through the data modules in placement order: two-column zigzags from the bottom right. */
class DataModuleIter {
  private x: number;
  private y: number;
  private readonly width: number;

  constructor(version: Version) {
    this.width = versionWidth(version);
    this.x = this.width - 1;
    this.y = this.width - 1;
  }

  /** The next `[x, y]`, or `null` once every column is spent. */
  next(): [number, number] | null {
    const adjustedRefCol = this.x <= 6 ? this.x + 1 : this.x;
    if (adjustedRefCol <= 0) return null;
    const res: [number, number] = [this.x, this.y];
    const columnType = (this.width - adjustedRefCol) % 4;
    if (columnType === 2 && this.y > 0) {
      this.y -= 1;
      this.x += 1;
    } else if (columnType === 0 && this.y < this.width - 1) {
      this.y += 1;
      this.x += 1;
    } else if ((columnType === 0 || columnType === 2) && this.x === 7) {
      this.x -= 2;
    } else {
      this.x -= 1;
    }
    return res;
  }
}

type MaskFn = (x: number, y: number) => boolean;

/** The mask patterns 000–111, by their pattern number. */
const MASK_FUNCTIONS: readonly MaskFn[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x, _y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

const FINDER_PATTERN: readonly number[] = [DARK, LIGHT, DARK, DARK, DARK, LIGHT, DARK];

/** The module matrix under construction. */
export class Canvas {
  readonly width: number;
  readonly version: Version;
  readonly level: EcLevel;
  readonly modules: Uint8Array;

  constructor(version: Version, level: EcLevel, modules?: Uint8Array) {
    this.width = versionWidth(version);
    this.version = version;
    this.level = level;
    this.modules = modules ?? new Uint8Array(this.width * this.width);
  }

  /** The index of `(x, y)`; negative coordinates count from the far edge. */
  private index(x: number, y: number): number {
    const xx = x < 0 ? x + this.width : x;
    const yy = y < 0 ? y + this.width : y;
    return yy * this.width + xx;
  }

  private get(x: number, y: number): number {
    return this.modules[this.index(x, y)];
  }

  /** Sets a fixed module. */
  private put(x: number, y: number, color: number): void {
    this.modules[this.index(x, y)] = color === DARK ? MASKED_DARK : MASKED_LIGHT;
  }

  private drawFinderPatternAt(x: number, y: number): void {
    const [dxLeft, dxRight] = x >= 0 ? [-3, 4] : [-4, 3];
    const [dyTop, dyBottom] = y >= 0 ? [-3, 4] : [-4, 3];
    for (let j = dyTop; j <= dyBottom; j++) {
      for (let i = dxLeft; i <= dxRight; i++) {
        const ai = Math.abs(i);
        const aj = Math.abs(j);
        let color: number;
        if (ai === 4 || aj === 4) color = LIGHT;
        else if (ai === 3 || aj === 3) color = DARK;
        else if (ai === 2 || aj === 2) color = LIGHT;
        else color = DARK;
        this.put(x + i, y + j, color);
      }
    }
  }

  private drawFinderPatterns(): void {
    this.drawFinderPatternAt(3, 3);
    this.drawFinderPatternAt(-4, 3);
    this.drawFinderPatternAt(3, -4);
  }

  private drawAlignmentPatternAt(x: number, y: number): void {
    if (this.get(x, y) !== EMPTY) return;
    for (let j = -2; j <= 2; j++) {
      for (let i = -2; i <= 2; i++) {
        const dark = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0);
        this.put(x + i, y + j, dark ? DARK : LIGHT);
      }
    }
  }

  private drawAlignmentPatterns(): void {
    if (this.version === 1) return;
    if (this.version <= 6) {
      this.drawAlignmentPatternAt(-7, -7);
      return;
    }
    const positions = ALIGNMENT_PATTERN_POSITIONS[this.version - 7];
    for (const x of positions) {
      for (const y of positions) this.drawAlignmentPatternAt(x, y);
    }
  }

  /** A horizontal or vertical line, `colorEven` on even coordinates and `colorOdd` on odd ones. */
  private drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    colorEven: number,
    colorOdd: number,
  ): void {
    if (y1 === y2) {
      for (let x = x1; x <= x2; x++) this.put(x, y1, x % 2 === 0 ? colorEven : colorOdd);
    } else {
      for (let y = y1; y <= y2; y++) this.put(x1, y, y % 2 === 0 ? colorEven : colorOdd);
    }
  }

  private drawTimingPatterns(): void {
    const width = this.width;
    this.drawLine(8, 6, width - 9, 6, DARK, LIGHT);
    this.drawLine(6, 8, 6, width - 9, DARK, LIGHT);
  }

  /** Plots `bits` bits of `number`, most significant first, one per coordinate. */
  private drawNumber(
    number: number,
    bits: number,
    onColor: number,
    offColor: number,
    coords: readonly (readonly [number, number])[],
  ): void {
    let mask = 1 << (bits - 1);
    for (const [x, y] of coords) {
      this.put(x, y, (mask & number) === 0 ? offColor : onColor);
      mask >>= 1;
    }
  }

  private drawFormatInfoPatternsWithNumber(formatInfo: number): void {
    this.drawNumber(formatInfo, 15, DARK, LIGHT, FORMAT_INFO_COORDS_QR_MAIN);
    this.drawNumber(formatInfo, 15, DARK, LIGHT, FORMAT_INFO_COORDS_QR_SIDE);
    this.put(8, -8, DARK);
  }

  private drawVersionInfoPatterns(): void {
    if (this.version <= 6) return;
    const versionInfo = VERSION_INFOS[this.version - 7];
    this.drawNumber(versionInfo, 18, DARK, LIGHT, VERSION_INFO_COORDS_BL);
    this.drawNumber(versionInfo, 18, DARK, LIGHT, VERSION_INFO_COORDS_TR);
  }

  /** Every function pattern; the format information area is reserved as light modules. */
  drawAllFunctionalPatterns(): void {
    this.drawFinderPatterns();
    this.drawAlignmentPatterns();
    this.drawFormatInfoPatternsWithNumber(0);
    this.drawTimingPatterns();
    this.drawVersionInfoPatterns();
  }

  /** Places the codewords' bits into the empty modules, in placement order. */
  private drawCodewords(codewords: Uint8Array, coords: DataModuleIter): void {
    for (const b of codewords) {
      for (let j = 7; j >= 0; j--) {
        const module = (b & (1 << j)) === 0 ? UNMASKED_LIGHT : UNMASKED_DARK;
        let placed = false;
        for (let c = coords.next(); c !== null; c = coords.next()) {
          const idx = this.index(c[0], c[1]);
          if (this.modules[idx] === EMPTY) {
            this.modules[idx] = module;
            placed = true;
            break;
          }
        }
        if (!placed) return;
      }
    }
  }

  /** Draws the data codewords, then the error-correction codewords. */
  drawData(data: Uint8Array, ec: Uint8Array): void {
    const coords = new DataModuleIter(this.version);
    this.drawCodewords(data, coords);
    this.drawCodewords(ec, coords);
  }

  /** Applies mask `pattern` to the data modules and writes the format information. */
  applyMask(pattern: number): void {
    const maskFn = MASK_FUNCTIONS[pattern];
    const width = this.width;
    const modules = this.modules;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < width; y++) {
        const idx = y * width + x;
        const module = modules[idx];
        if (module === MASKED_LIGHT || module === MASKED_DARK) continue;
        const invert = maskFn(x, y);
        if (module === EMPTY) modules[idx] = invert ? MASKED_DARK : MASKED_LIGHT;
        else if (module === UNMASKED_LIGHT) modules[idx] = invert ? MASKED_DARK : MASKED_LIGHT;
        else modules[idx] = invert ? MASKED_LIGHT : MASKED_DARK;
      }
    }
    const simpleFormatNumber = ((this.level ^ 1) << 3) | pattern;
    this.drawFormatInfoPatternsWithNumber(FORMAT_INFOS_QR[simpleFormatNumber]);
  }

  /** The colour of every module, 1 for dark, row-major. */
  private colors(): Uint8Array {
    const out = new Uint8Array(this.modules.length);
    for (let i = 0; i < out.length; i++) out[i] = isDark(this.modules[i]) ? 1 : 0;
    return out;
  }

  /** Runs of five or more equal modules in a row (or column) score their length minus two. */
  private adjacentPenaltyScore(colors: Uint8Array, horizontal: boolean): number {
    const width = this.width;
    let totalScore = 0;
    for (let i = 0; i < width; i++) {
      let lastColor = -1;
      let consecutiveLen = 1;
      for (let j = 0; j <= width; j++) {
        const color = j === width ? -1 : horizontal ? colors[i * width + j] : colors[j * width + i];
        if (color === lastColor) {
          consecutiveLen += 1;
        } else {
          lastColor = color;
          if (consecutiveLen >= 5) totalScore = (totalScore + consecutiveLen - 2) & 0xffff;
          consecutiveLen = 1;
        }
      }
    }
    return totalScore;
  }

  /** Every 2×2 block of equal modules scores three. */
  private blockPenaltyScore(colors: Uint8Array): number {
    const width = this.width;
    let totalScore = 0;
    for (let j = 0; j < width - 1; j++) {
      const row = j * width;
      const below = row + width;
      for (let i = 0; i < width - 1; i++) {
        const here = colors[row + i];
        if (
          here === colors[row + i + 1] &&
          here === colors[below + i] &&
          here === colors[below + i + 1]
        ) {
          totalScore = (totalScore + 3) & 0xffff;
        }
      }
    }
    return totalScore;
  }

  /**
   * Every `#.###.#` run with four light modules (or the edge) on at least
   * one side scores forty; the finder patterns' own runs are subtracted.
   */
  private finderPenaltyScore(colors: Uint8Array, horizontal: boolean): number {
    const width = this.width;
    // The stride between neighbours along the run and between runs.
    const step = horizontal ? 1 : width;
    const lineStep = horizontal ? width : 1;
    let totalScore = 0;
    for (let i = 0; i < width; i++) {
      const base = i * lineStep;
      for (let j = 0; j < width - 6; j++) {
        let matches = true;
        for (let k = 0; k < 7; k++) {
          if (colors[base + (j + k) * step] !== FINDER_PATTERN[k]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        let leftDark = false;
        for (let k = Math.max(0, j - 4); k < j; k++) {
          if (colors[base + k * step] === DARK) {
            leftDark = true;
            break;
          }
        }
        let rightDark = false;
        for (let k = j + 7; k < Math.min(width, j + 11); k++) {
          if (colors[base + k * step] === DARK) {
            rightDark = true;
            break;
          }
        }
        if (!leftDark || !rightDark) totalScore = (totalScore + 40) & 0xffff;
      }
    }
    return (totalScore - 360) & 0xffff;
  }

  /** The distance of the dark-module ratio from one half, in half-percent steps. */
  private balancePenaltyScore(colors: Uint8Array): number {
    let darkModules = 0;
    for (const c of colors) darkModules += c;
    const ratio = Math.floor((darkModules * 200) / colors.length);
    return (ratio >= 100 ? ratio - 100 : 100 - ratio) & 0xffff;
  }

  /** The sum of the four penalty scores, as the reference's 16-bit total. */
  totalPenaltyScore(): number {
    const colors = this.colors();
    return (
      (this.adjacentPenaltyScore(colors, true) +
        this.adjacentPenaltyScore(colors, false) +
        this.blockPenaltyScore(colors) +
        this.finderPenaltyScore(colors, true) +
        this.finderPenaltyScore(colors, false) +
        this.balancePenaltyScore(colors)) &
      0xffff
    );
  }

  /** The canvas masked with the first of the eight patterns that scores lowest. */
  applyBestMask(): Canvas {
    let best = new Canvas(this.version, this.level, this.modules.slice());
    best.applyMask(0);
    let bestScore = best.totalPenaltyScore();
    for (let pattern = 1; pattern < 8; pattern++) {
      const candidate = new Canvas(this.version, this.level, this.modules.slice());
      candidate.applyMask(pattern);
      const score = candidate.totalPenaltyScore();
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  /** One byte per module, 1 for dark, row-major. */
  toModules(): Uint8Array {
    return this.colors();
  }
}
