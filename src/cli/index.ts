/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * `@blockchaincommons/multipart-ur/cli` — the `mur` command line.
 *
 * @packageDocumentation
 */

import { Command, CommanderError } from "commander";
import packageJson from "../../package.json" with { type: "json" };
import { type AnimateArgs, animate } from "./animate.js";
import { type FramesArgs, frames } from "./frames.js";
import { integerArg, numberArg, parseClearShape, parseCorrectionLevel } from "./options.js";
import { type SingleArgs, single } from "./single.js";
import { getStyles } from "./styles.js";

export { type AnimateArgs, animate } from "./animate.js";
export { type FramesArgs, frames } from "./frames.js";
export {
  type DrawArgs,
  type SequenceArgs,
  parseClearShape,
  parseCorrectionLevel,
} from "./options.js";
export { type SingleArgs, single } from "./single.js";

/** The package version the `mur` binary reports. */
export const CLI_VERSION: string = packageJson.version;

/** Exit status 2, as the reference's clap uses for usage errors. */
const USAGE_EXIT = 2;

/** The `mur` program, ready to parse. Usage errors throw `CommanderError` (see `runCli`). */
export function program(): Command {
  const cli = new Command();
  cli
    .name("mur")
    .description("Multipart UR QR code generator.")
    .version(`mur ${CLI_VERSION}`)
    .exitOverride();

  // The reference's clap palette: usage/header bold+underline+yellow, literal green, placeholder bright cyan.
  if (process.stdout.isTTY && (process.env["NO_COLOR"] ?? "") === "") {
    const styles = getStyles();
    cli.configureHelp({
      styleTitle: (s) => styles.header(s),
      styleUsage: (s) => styles.literal(s),
      styleCommandText: (s) => styles.literal(s),
      styleOptionTerm: (s) => styles.literal(s),
      styleSubcommandTerm: (s) => styles.literal(s),
      styleArgumentTerm: (s) => styles.placeholder(s),
    });
  }

  const drawOptions = (c: Command): Command =>
    c
      .argument("<ur-string>", "UR string to encode, or `-` to read from stdin.")
      .option("-s, --size <px>", "Image size in pixels.", integerArg(0, 0xffff_ffff), 512)
      .option("--fg <hex>", "Foreground color (hex).", "#000000")
      .option("--bg <hex>", "Background color (hex).", "#FFFFFF")
      .option("--logo <path>", "Path to SVG logo file.")
      .option("--logo-fraction <n>", "Logo fraction of QR width (0.01–0.99).", numberArg(), 0.25)
      .option("--logo-border <n>", "Logo clear border in modules (0–5).", integerArg(0), 1)
      .option("--logo-shape <shape>", "Logo clear shape (square or circle).", "square")
      .option("-c, --correction <level>", "Error correction level (low, medium, quartile, high).")
      .option(
        "--quiet-zone <n>",
        "Quiet zone modules around the QR code.",
        integerArg(0, 0xffff_ffff),
        1,
      )
      .option("--dark", "Dark mode (white-on-black).", false)
      .option(
        "--max-modules <n>",
        "Maximum QR module count for reliable scanning.",
        integerArg(0),
        117,
      )
      .option("--no-density-check", "Disable the QR density check.");

  const sequenceOptions = (c: Command): Command =>
    drawOptions(c)
      .requiredOption("-o, --output <path>", "Output file path.")
      .option(
        "--max-fragment-len <n>",
        "Maximum fragment length for fountain coding.",
        integerArg(1),
        100,
      )
      .option("--fps <n>", "Frames per second.", numberArg(), 8)
      .option(
        "--cycles <n>",
        "Number of complete cycles through all fragments.",
        integerArg(0, 0xffff_ffff),
        3,
      )
      .option("--frame-count <n>", "Exact number of frames (overrides --cycles).", integerArg(0));

  drawOptions(cli.command("single").description("Render a single-frame QR code."))
    .option("-o, --output <path>", "Output file path (default: stdout as raw PNG).")
    .option("--format <fmt>", "Output format (png or jpeg).", "png")
    .option("--jpeg-quality <n>", "JPEG quality (1–100).", integerArg(0, 255), 90)
    .action(async (urString: string, opts: Omit<SingleArgs, "urString">) => {
      print(await single({ ...opts, urString }));
    });

  sequenceOptions(cli.command("animate").description("Generate an animated multipart QR sequence."))
    .option("--format <fmt>", "Output format (gif or prores).", "gif")
    .action(async (urString: string, opts: Omit<AnimateArgs, "urString">) => {
      print(await animate({ ...opts, urString }));
    });

  sequenceOptions(cli.command("frames").description("Dump multipart QR frames as numbered PNGs."))
    .description("Dump multipart QR frames as numbered PNGs.")
    .action(async (urString: string, opts: Omit<FramesArgs, "urString">) => {
      print(await frames({ ...opts, urString }));
    });
  cli.commands
    .find((c) => c.name() === "frames")
    ?.options.forEach((o) => {
      if (o.long === "--output") o.description = "Output directory for numbered PNGs.";
    });

  return cli;
}

/**
 * Runs the CLI on `argv` (default `process.argv`) and returns the exit
 * status, which it also sets as `process.exitCode`: 0 on success (and for
 * `--help`/`--version`), 2 for a usage error (commander has already printed
 * it), 1 for any other error, printed as `Error: <message>`.
 */
export async function runCli(argv: readonly string[] = process.argv): Promise<number> {
  let status = 0;
  try {
    await program().parseAsync([...argv]);
  } catch (err: unknown) {
    if (err instanceof CommanderError) {
      status = err.exitCode === 0 ? 0 : USAGE_EXIT;
    } else {
      process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
      status = 1;
    }
  }
  process.exitCode = status;
  return status;
}

function print(line: string): void {
  if (line !== "") process.stdout.write(`${line}\n`);
}

// The parsers are exported for programmatic callers building their own program.
export {
  integerArg,
  numberArg,
  parseClearShape as clearShapeArg,
  parseCorrectionLevel as correctionLevelArg,
};
