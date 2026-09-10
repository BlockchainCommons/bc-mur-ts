/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Argument-domain guards. Every public numeric or typed argument is checked
 * at the boundary and rejected as `InvalidParameter`; the library never
 * masks, clamps or rounds.
 */

import { MurError } from "./error.js";

/** `value` as an integer in `min`–`max` (inclusive), or `InvalidParameter`. */
export function expectInteger(
  name: string,
  value: unknown,
  min: number,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    const range =
      max === Number.MAX_SAFE_INTEGER
        ? min === 0
          ? "a non-negative integer"
          : min === 1
            ? "a positive integer"
            : `an integer ≥ ${min}`
        : `an integer in ${min}–${max}`;
    throw MurError.invalidParameter(`${name} must be ${range}, got ${String(value)}`);
  }
  return value;
}

/** `value` as a finite number in `min`–`max` (inclusive), or `InvalidParameter`. */
export function expectNumber(name: string, value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !(value >= min && value <= max)) {
    throw MurError.invalidParameter(`${name} must be ${min}–${max}, got ${String(value)}`);
  }
  return value;
}

/** `value` as a finite number above zero, or `InvalidParameter`. */
export function expectPositive(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw MurError.invalidParameter(`${name} must be a positive number, got ${String(value)}`);
  }
  return value;
}

/** `value` as a `Uint8Array`, or `InvalidParameter`. */
export function expectBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw MurError.invalidParameter(`${name} must be a Uint8Array, got ${describe(value)}`);
  }
  return value;
}

/** A short description of a value's type for messages. */
export function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return `an object (${value.constructor.name})`;
  return typeof value;
}
