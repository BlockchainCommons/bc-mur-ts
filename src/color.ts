/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { MurError } from "./error.js";
import { describe } from "./guards.js";

/** A colour option: a `Color`, or a hex string for `Color.fromHex`. */
export type ColorInput = Color | string;

/** An 8-bit RGBA colour. Instances are frozen. */
export class Color {
  /** Red, 0–255. */
  readonly r: number;
  /** Green, 0–255. */
  readonly g: number;
  /** Blue, 0–255. */
  readonly b: number;
  /** Alpha, 0 (transparent) to 255 (opaque). */
  readonly a: number;

  /** Each channel must be an integer 0–255 (`InvalidColor` otherwise); `a` defaults to 255. */
  constructor(r: number, g: number, b: number, a = 255) {
    this.r = channel("r", r);
    this.g = channel("g", g);
    this.b = channel("b", b);
    this.a = channel("a", a);
    Object.freeze(this);
  }

  /** Opaque black, the default foreground. */
  static readonly BLACK: Color = new Color(0, 0, 0, 255);
  /** Opaque white, the default background. */
  static readonly WHITE: Color = new Color(255, 255, 255, 255);
  /** Fully transparent black. */
  static readonly TRANSPARENT: Color = new Color(0, 0, 0, 0);

  /** A colour from `#RGB`, `#RRGGBB` or `#RRGGBBAA` (the `#` is optional); `InvalidColor` otherwise. */
  static fromHex(s: string): Color {
    if (typeof s !== "string") {
      throw MurError.invalidColor(`expected a hex string, got ${describe(s)}`);
    }
    return parseHex(s);
  }

  /** Alpha below 3 of 255 counts as transparent (the logo's clear colour falls back to white). */
  get isTransparent(): boolean {
    return this.a < 3;
  }

  /** Whether every channel is equal. */
  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  /** `#RRGGBB`, or `#RRGGBBAA` when not fully opaque (the reference's `Display`). */
  toString(): string {
    const r = hexOf(this.r);
    const g = hexOf(this.g);
    const b = hexOf(this.b);
    return this.a === 255 ? `#${r}${g}${b}` : `#${r}${g}${b}${hexOf(this.a)}`;
  }
}

function channel(name: string, value: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) {
    throw MurError.invalidColor(
      `channel ${name} must be an integer in 0–255, got ${String(value)}`,
    );
  }
  return value;
}

function hexOf(byte: number): string {
  return byte.toString(16).padStart(2, "0").toUpperCase();
}

function parseHex(s: string): Color {
  // The reference indexes the string's UTF-8 bytes: the length is the byte
  // length and a non-ASCII character is reported by its first byte.
  const bytes = new TextEncoder().encode(s.startsWith("#") ? s.slice(1) : s);
  switch (bytes.length) {
    case 3: {
      const r = hexNibble(bytes[0]);
      const g = hexNibble(bytes[1]);
      const b = hexNibble(bytes[2]);
      return new Color((r << 4) | r, (g << 4) | g, (b << 4) | b, 255);
    }
    case 6:
      return new Color(hexByte(bytes, 0), hexByte(bytes, 2), hexByte(bytes, 4), 255);
    case 8:
      return new Color(hexByte(bytes, 0), hexByte(bytes, 2), hexByte(bytes, 4), hexByte(bytes, 6));
    default:
      throw MurError.invalidColor(
        `expected #RGB, #RRGGBB, or #RRGGBBAA, got: #${new TextDecoder().decode(bytes)}`,
      );
  }
}

function hexNibble(b: number): number {
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  throw MurError.invalidColor(`invalid hex digit: ${b}`);
}

function hexByte(bytes: Uint8Array, at: number): number {
  return (hexNibble(bytes[at]) << 4) | hexNibble(bytes[at + 1]);
}
