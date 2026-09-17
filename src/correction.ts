/**
 * Copyright © 2026 Blockchain Commons, LLC
 */

import { MurError } from "./error.js";

/** QR error-correction level; the string is the reference's `Display`/`FromStr` form. */
export type CorrectionLevel = "low" | "medium" | "quartile" | "high";

/** Every {@link CorrectionLevel}, lowest to highest. */
export const CORRECTION_LEVELS: readonly CorrectionLevel[] = Object.freeze([
  "low",
  "medium",
  "quartile",
  "high",
]);

/**
 * The level a name or its first letter denotes, case-insensitively (the
 * reference's `FromStr`: `low`/`l`, `medium`/`m`, `quartile`/`q`,
 * `high`/`h`). Anything else throws an `Error` carrying the reference's
 * message, which is a bare string there rather than an error variant.
 */
export function parseCorrectionLevel(s: string): CorrectionLevel {
  switch (s.toLowerCase()) {
    case "low":
    case "l":
      return "low";
    case "medium":
    case "m":
      return "medium";
    case "quartile":
    case "q":
      return "quartile";
    case "high":
    case "h":
      return "high";
    default:
      throw new Error(`unknown correction level: ${s} (expected low, medium, quartile, or high)`);
  }
}

/** @internal The level's letter; unknown levels are an `InvalidParameter`. */
export function correctionLevelToLetter(level: CorrectionLevel): "L" | "M" | "Q" | "H" {
  switch (level) {
    case "low":
      return "L";
    case "medium":
      return "M";
    case "quartile":
      return "Q";
    case "high":
      return "H";
    default:
      throw MurError.invalidParameter(
        `unknown correction level: ${String(level)} (expected low, medium, quartile, or high)`,
      );
  }
}
