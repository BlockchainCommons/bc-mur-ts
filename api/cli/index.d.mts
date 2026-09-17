import { p as parseCorrectionLevel } from "../frames-BzJmbtpz.mjs";
import { a as parseClearShape } from "../logo-Cu2tmFob.mjs";
import { Command } from "commander";
//#region src/cli/options.d.ts
/** The drawing arguments every subcommand takes; every optional field has the reference CLI's default. */
interface DrawArgs {
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
interface SequenceArgs extends DrawArgs {
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
/** @internal A commander parser for an integer in `min`–`max`. */
export declare function integerArg(min: number, max?: number): (value: string) => number;
/** @internal A commander parser for a number in the spellings clap's `f64` accepts (the library decides what to do with it). */
export declare function numberArg(): (value: string) => number;
//#endregion
//#region src/cli/animate.d.ts
/** `mur animate` arguments. */
interface AnimateArgs extends SequenceArgs {
  /** `gif` or `prores` (default `gif`). */
  format?: string;
}
/** `mur animate`: the sequence as an animated GIF or a ProRes movie. Returns the status line to print. */
export declare function animate(args: AnimateArgs): Promise<string>;
//#endregion
//#region src/cli/frames.d.ts
/** `mur frames` arguments. */
type FramesArgs = SequenceArgs;
/** `mur frames`: the sequence as numbered PNGs in a directory. Returns the status line to print. */
export declare function frames(args: FramesArgs): Promise<string>;
//#endregion
//#region src/cli/single.d.ts
/** `mur single` arguments. */
interface SingleArgs extends DrawArgs {
  /** Output file; stdout when absent. */
  output?: string;
  /** `png` or `jpeg` (default `png`). */
  format?: string;
  /** JPEG quality, 1–100 (default 90). */
  jpegQuality?: number;
}
/** `mur single`: one QR code as PNG or JPEG. Returns the status line to print. */
export declare function single(args: SingleArgs): Promise<string>;
//#endregion
//#region src/cli/index.d.ts
/** The package version the `mur` binary reports. */
export declare const CLI_VERSION: string;
/** The `mur` program, ready to parse. Usage errors throw `CommanderError` (see `runCli`). */
export declare function program(): Command;
/**
 * Runs the CLI on `argv` (default `process.argv`) and returns the exit
 * status, which it also sets as `process.exitCode`: 0 on success (and for
 * `--help`/`--version`), 2 for a usage error (commander has already printed
 * it), 1 for any other error, printed as `Error: <message>`.
 */
export declare function runCli(argv?: readonly string[]): Promise<number>;
//#endregion
export { type AnimateArgs, type DrawArgs, type FramesArgs, type SequenceArgs, type SingleArgs, parseClearShape as clearShapeArg, parseClearShape, parseCorrectionLevel as correctionLevelArg, parseCorrectionLevel };
//# sourceMappingURL=index.d.mts.map