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
