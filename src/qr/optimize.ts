/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Derived from the `qrcode` crate 0.14.1 (MIT/Apache-2.0), see LICENSE-QRCODE.
 * Splits a message into segments of one mode each and merges adjacent
 * segments while that shortens the encoding.
 */

import { Mode, type Version, dataBitsCount, lengthBitsCount, modeMax } from "./types.js";

/** A run of the message committed to one mode; `end` is exclusive. */
export interface Segment {
  readonly mode: Mode;
  readonly begin: number;
  readonly end: number;
}

/** The bits the segment takes: mode indicator, character count and data. */
export function encodedLen(segment: Segment, version: Version): number {
  const byteSize = segment.end - segment.begin;
  const charsCount = segment.mode === Mode.Kanji ? Math.floor(byteSize / 2) : byteSize;
  return 4 + lengthBitsCount(segment.mode, version) + dataBitsCount(segment.mode, charsCount);
}

export function totalEncodedLen(segments: readonly Segment[], version: Version): number {
  let total = 0;
  for (const segment of segments) total += encodedLen(segment, version);
  return total;
}

// The exclusive character sets a byte can belong to.
const ECS_END = 0;
const ECS_SYMBOL = 1;
const ECS_NUMERIC = 2;
const ECS_ALPHA = 3;
const ECS_KANJI_HI1 = 4;
const ECS_KANJI_HI2 = 5;
const ECS_KANJI_HI3 = 6;
const ECS_KANJI_LO1 = 7;
const ECS_KANJI_LO2 = 8;
const ECS_BYTE = 9;

function charSetOf(c: number): number {
  if (
    c === 0x20 ||
    c === 0x24 ||
    c === 0x25 ||
    c === 0x2a ||
    c === 0x2b ||
    (c >= 0x2d && c <= 0x2f) ||
    c === 0x3a
  ) {
    return ECS_SYMBOL;
  }
  if (c >= 0x30 && c <= 0x39) return ECS_NUMERIC;
  if (c >= 0x41 && c <= 0x5a) return ECS_ALPHA;
  if (c >= 0x81 && c <= 0x9f) return ECS_KANJI_HI1;
  if (c >= 0xe0 && c <= 0xea) return ECS_KANJI_HI2;
  if (c === 0xeb) return ECS_KANJI_HI3;
  if (c === 0x40 || (c >= 0x5b && c <= 0x7e) || c === 0x80 || (c >= 0xa0 && c <= 0xbf)) {
    return ECS_KANJI_LO1;
  }
  if ((c >= 0xc0 && c <= 0xdf) || (c >= 0xec && c <= 0xfc)) return ECS_KANJI_LO2;
  return ECS_BYTE;
}

// Parser states, spaced by ten so that `state + charSet` indexes the table.
const ST_INIT = 0;
const ST_NUMERIC = 10;
const ST_ALPHA = 20;
const ST_BYTE = 30;
const ST_KANJI_HI12 = 40;
const ST_KANJI_HI3 = 50;
const ST_KANJI = 60;

// What to do on a transition.
const ACT_IDLE = 0;
const ACT_NUMERIC = 1;
const ACT_ALPHA = 2;
const ACT_BYTE = 3;
const ACT_KANJI = 4;
const ACT_KANJI_AND_SINGLE_BYTE = 5;

/** `STATE_TRANSITION[state + charSet]` is `[nextState, action]`. */
const STATE_TRANSITION: readonly (readonly [number, number])[] = [
  // Init
  [ST_INIT, ACT_IDLE],
  [ST_ALPHA, ACT_IDLE],
  [ST_NUMERIC, ACT_IDLE],
  [ST_ALPHA, ACT_IDLE],
  [ST_KANJI_HI12, ACT_IDLE],
  [ST_KANJI_HI12, ACT_IDLE],
  [ST_KANJI_HI3, ACT_IDLE],
  [ST_BYTE, ACT_IDLE],
  [ST_BYTE, ACT_IDLE],
  [ST_BYTE, ACT_IDLE],
  // Numeric
  [ST_INIT, ACT_NUMERIC],
  [ST_ALPHA, ACT_NUMERIC],
  [ST_NUMERIC, ACT_IDLE],
  [ST_ALPHA, ACT_NUMERIC],
  [ST_KANJI_HI12, ACT_NUMERIC],
  [ST_KANJI_HI12, ACT_NUMERIC],
  [ST_KANJI_HI3, ACT_NUMERIC],
  [ST_BYTE, ACT_NUMERIC],
  [ST_BYTE, ACT_NUMERIC],
  [ST_BYTE, ACT_NUMERIC],
  // Alpha
  [ST_INIT, ACT_ALPHA],
  [ST_ALPHA, ACT_IDLE],
  [ST_NUMERIC, ACT_ALPHA],
  [ST_ALPHA, ACT_IDLE],
  [ST_KANJI_HI12, ACT_ALPHA],
  [ST_KANJI_HI12, ACT_ALPHA],
  [ST_KANJI_HI3, ACT_ALPHA],
  [ST_BYTE, ACT_ALPHA],
  [ST_BYTE, ACT_ALPHA],
  [ST_BYTE, ACT_ALPHA],
  // Byte
  [ST_INIT, ACT_BYTE],
  [ST_ALPHA, ACT_BYTE],
  [ST_NUMERIC, ACT_BYTE],
  [ST_ALPHA, ACT_BYTE],
  [ST_KANJI_HI12, ACT_BYTE],
  [ST_KANJI_HI12, ACT_BYTE],
  [ST_KANJI_HI3, ACT_BYTE],
  [ST_BYTE, ACT_IDLE],
  [ST_BYTE, ACT_IDLE],
  [ST_BYTE, ACT_IDLE],
  // KanjiHi12
  [ST_INIT, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_ALPHA, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_NUMERIC, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_BYTE, ACT_KANJI_AND_SINGLE_BYTE],
  // KanjiHi3
  [ST_INIT, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_ALPHA, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_NUMERIC, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI, ACT_IDLE],
  [ST_KANJI_HI12, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_KANJI_HI3, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_KANJI, ACT_IDLE],
  [ST_BYTE, ACT_KANJI_AND_SINGLE_BYTE],
  [ST_BYTE, ACT_KANJI_AND_SINGLE_BYTE],
  // Kanji
  [ST_INIT, ACT_KANJI],
  [ST_ALPHA, ACT_KANJI],
  [ST_NUMERIC, ACT_KANJI],
  [ST_ALPHA, ACT_KANJI],
  [ST_KANJI_HI12, ACT_IDLE],
  [ST_KANJI_HI12, ACT_IDLE],
  [ST_KANJI_HI3, ACT_IDLE],
  [ST_BYTE, ACT_KANJI],
  [ST_BYTE, ACT_KANJI],
  [ST_BYTE, ACT_KANJI],
];

/**
 * Cuts the message into segments that each contain only one exclusive
 * character set (Shift-JIS byte pairs form Kanji segments). No merging.
 */
export function parseSegments(data: Uint8Array): Segment[] {
  const segments: Segment[] = [];
  let state = ST_INIT;
  let begin = 0;
  // The classified bytes, followed by the end marker.
  for (let i = 0; i <= data.length; i++) {
    const ecs = i === data.length ? ECS_END : charSetOf(data[i]);
    const [nextState, action] = STATE_TRANSITION[state + ecs];
    state = nextState;
    const oldBegin = begin;
    let mode: Mode;
    switch (action) {
      case ACT_IDLE:
        continue;
      case ACT_NUMERIC:
        mode = Mode.Numeric;
        break;
      case ACT_ALPHA:
        mode = Mode.Alphanumeric;
        break;
      case ACT_BYTE:
        mode = Mode.Byte;
        break;
      case ACT_KANJI:
        mode = Mode.Kanji;
        break;
      default: {
        // The lead byte that started a pair is not followed by a trail byte:
        // the pairs before it are Kanji and it is a single Byte.
        const nextBegin = i - 1;
        if (begin === nextBegin) {
          mode = Mode.Byte;
          break;
        }
        segments.push({ mode: Mode.Kanji, begin: oldBegin, end: nextBegin });
        segments.push({ mode: Mode.Byte, begin: nextBegin, end: nextBegin + 1 });
        begin = i;
        continue;
      }
    }
    begin = i;
    segments.push({ mode, begin: oldBegin, end: i });
  }
  return segments;
}

/**
 * Merges adjacent segments greedily from the left while the merged segment
 * is no longer than the two apart, at the length-field widths of `version`.
 */
export function optimizeSegments(segments: readonly Segment[], version: Version): Segment[] {
  if (segments.length === 0) return [];
  const out: Segment[] = [];
  let last = segments[0];
  let lastSize = encodedLen(last, version);
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const segSize = encodedLen(segment, version);
    const merged: Segment = {
      mode: modeMax(last.mode, segment.mode),
      begin: last.begin,
      end: segment.end,
    };
    const newSize = encodedLen(merged, version);
    if (lastSize + segSize >= newSize) {
      last = merged;
      lastSize = newSize;
    } else {
      out.push(last);
      last = segment;
      lastSize = segSize;
    }
  }
  out.push(last);
  return out;
}
