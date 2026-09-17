/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * The arguments the three subcommands share, and their parsers.
 */

import { InvalidArgumentError } from "commander";
import { Color } from "../color.js";
import { type CorrectionLevel, parseCorrectionLevel } from "../correction.js";
import { type Logo, parseClearShape } from "../logo.js";
import { DEFAULT_MAX_MODULES } from "../qr-matrix.js";

/** The drawing arguments every subcommand takes; every optional field has the reference CLI's default. */
export interface DrawArgs {
  /** The UR string, or `-` to read it from stdin. */
  urString: string;
  /** Image size in pixels (default 512). */
  size?: number;
  /** Foreground colour, hex (default `#000000`). */
  fg?: string;
  /** Background colour, hex (default `#FFFFFF`). */
  bg?: string;
  /** Path to an SVG logo. */
  logo?: string;
  /** Logo fraction of the QR width, 0.01–0.99 (default 0.25). */
  logoFraction?: number;
  /** Logo clear border in modules, 0–5 (default 1). */
  logoBorder?: number;
  /** Logo clear shape, `square` or `circle` (default `square`). */
  logoShape?: string;
  /** Error-correction level by name or first letter (default `low`, `high` with a logo). */
  correction?: string;
  /** Quiet-zone modules (default 1). */
  quietZone?: number;
  /** Swap foreground and background (default false). */
  dark?: boolean;
  /** Maximum module count for the density check (default 117). */
  maxModules?: number;
  /** Whether to run the density check (default true). */
  densityCheck?: boolean;
}

/** The fragmentation arguments `animate` and `frames` share. */
export interface SequenceArgs extends DrawArgs {
  /** Output path. */
  output: string;
  /** Maximum fragment length for fountain coding (default 100). */
  maxFragmentLen?: number;
  /** Frames per second (default 8). */
  fps?: number;
  /** Complete cycles through all fragments (default 3). */
  cycles?: number;
  /** Exact number of frames (overrides `cycles`). */
  frameCount?: number;
}

/** @internal `DrawArgs` with the defaults applied. */
export interface ResolvedDrawArgs {
  urString: string;
  size: number;
  fg: string;
  bg: string;
  logo: string | undefined;
  logoFraction: number;
  logoBorder: number;
  logoShape: string;
  correction: string | undefined;
  quietZone: number;
  dark: boolean;
  maxModules: number;
  densityCheck: boolean;
}

/** @internal */
export function resolveDrawArgs(args: DrawArgs): ResolvedDrawArgs {
  return {
    urString: args.urString,
    size: args.size ?? 512,
    fg: args.fg ?? "#000000",
    bg: args.bg ?? "#FFFFFF",
    logo: args.logo,
    logoFraction: args.logoFraction ?? 0.25,
    logoBorder: args.logoBorder ?? 1,
    logoShape: args.logoShape ?? "square",
    correction: args.correction,
    quietZone: args.quietZone ?? 1,
    dark: args.dark ?? false,
    maxModules: args.maxModules ?? DEFAULT_MAX_MODULES,
    densityCheck: args.densityCheck ?? true,
  };
}

/** @internal `SequenceArgs` with the defaults applied. */
export interface ResolvedSequenceArgs extends ResolvedDrawArgs {
  output: string;
  maxFragmentLen: number;
  fps: number;
  cycles: number;
  frameCount: number | undefined;
}

/** @internal */
export function resolveSequenceArgs(args: SequenceArgs): ResolvedSequenceArgs {
  return {
    ...resolveDrawArgs(args),
    output: args.output,
    maxFragmentLen: args.maxFragmentLen ?? 100,
    fps: args.fps ?? 8,
    cycles: args.cycles ?? 3,
    frameCount: args.frameCount,
  };
}

/** Reads the UR string, or stdin when it is `-`. */
export async function readInput(s: string): Promise<string> {
  if (s !== "-") return s;
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8").trim()));
    process.stdin.on("error", reject);
  });
}

/** @internal A commander parser for an integer in `min`–`max`. */
export function integerArg(
  min: number,
  max: number = Number.MAX_SAFE_INTEGER,
): (value: string) => number {
  return (value) => {
    const n = /^[+-]?\d+$/.test(value) ? Number(value) : Number.NaN;
    if (!Number.isSafeInteger(n) || n < min || n > max) {
      throw new InvalidArgumentError(
        max === Number.MAX_SAFE_INTEGER
          ? `expected an integer ≥ ${min}`
          : `expected an integer in ${min}–${max}`,
      );
    }
    return n;
  };
}

/** Rust's `f64::from_str` grammar: an optional sign, then `inf`, `infinity`, `nan` (any case) or a decimal with an optional exponent. */
const FLOAT = /^[+-]?(?:inf|infinity|nan|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$/i;

/** @internal A commander parser for a number in the spellings clap's `f64` accepts (the library decides what to do with it). */
export function numberArg(): (value: string) => number {
  return (value) => {
    if (!FLOAT.test(value)) {
      throw new InvalidArgumentError("expected a number");
    }
    const negative = value.startsWith("-");
    const word = value.replace(/^[+-]/, "").toLowerCase();
    if (word === "nan") return Number.NaN;
    if (word === "inf" || word === "infinity") {
      return negative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
    return Number(value);
  };
}

/** @internal The foreground and background, swapped in dark mode. */
export function colorsOf(args: ResolvedDrawArgs): { foreground: Color; background: Color } {
  const fg = Color.fromHex(args.fg);
  const bg = Color.fromHex(args.bg);
  return args.dark ? { foreground: bg, background: fg } : { foreground: fg, background: bg };
}

/** @internal Loads and rasterises the SVG logo named by `--logo`, if any. */
export async function loadLogo(args: ResolvedDrawArgs): Promise<Logo | null> {
  if (args.logo === undefined || args.logo === "") return null;
  const fs = await import("node:fs/promises");
  const { logoFromSvg } = await import("../svg.js");
  const svg = new Uint8Array(await fs.readFile(args.logo));
  return logoFromSvg(svg, {
    fraction: args.logoFraction,
    clearBorder: args.logoBorder,
    clearShape: parseClearShape(args.logoShape),
  });
}

/** @internal The `--correction` level, or the default for whether a logo is present. */
export function correctionOf(args: ResolvedDrawArgs, logo: Logo | null): CorrectionLevel {
  if (args.correction !== undefined && args.correction !== "")
    return parseCorrectionLevel(args.correction);
  return logo === null ? "low" : "high";
}
