/**
 * The `mur` command line: in-process through `program()` (usage errors,
 * exit statuses, the three commands), and the built binary when present.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";

import { CommanderError } from "commander";
import {
  CLI_VERSION,
  animate,
  frames as framesCommand,
  parseClearShape,
  parseCorrectionLevel,
  program,
  runCli,
  single,
} from "../src/cli/index.js";

const BIN = resolve(__dirname, "..", "dist", "bin", "mur.cjs");
const HAS_BIN = existsSync(BIN);
const SHORT_UR = "ur:bytes/hdcxdwinvezm";

function longUrString(): string {
  const data = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) data[i] = i % 256;
  return UR.from("bytes", cbor(data)).toString();
}

/** Parses `args` in-process; commander's output is captured, not printed. */
async function parse(args: string[]): Promise<{ status: number; out: string; err: string }> {
  let out = "";
  let err = "";
  const cli = program();
  cli.configureOutput({
    writeOut: (s) => {
      out += s;
    },
    writeErr: (s) => {
      err += s;
    },
  });
  for (const sub of cli.commands)
    sub.configureOutput({
      writeOut: (s) => {
        out += s;
      },
      writeErr: (s) => {
        err += s;
      },
    });
  try {
    await cli.parseAsync(["node", "mur", ...args]);
    return { status: 0, out, err };
  } catch (e) {
    if (e instanceof CommanderError) return { status: e.exitCode === 0 ? 0 : 2, out, err };
    return { status: 1, out, err: `Error: ${(e as Error).message}\n` };
  }
}

describe("cli entry", () => {
  it("parses correction levels by name or letter", () => {
    expect(parseCorrectionLevel("low")).toBe("low");
    expect(parseCorrectionLevel("Q")).toBe("quartile");
    expect(parseCorrectionLevel("HIGH")).toBe("high");
    expect(() => parseCorrectionLevel("x")).toThrow(
      "unknown correction level: x (expected low, medium, quartile, or high)",
    );
  });

  it("parses clear shapes", () => {
    expect(parseClearShape("Circle")).toBe("circle");
    expect(() => parseClearShape("round")).toThrow(
      "unknown clear shape: round (expected square or circle)",
    );
  });

  it("reports the package version", () => {
    expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("builds a program with the three subcommands", () => {
    const names = program()
      .commands.map((c) => c.name())
      .sort();
    expect(names).toEqual(["animate", "frames", "single"]);
  });

  it("usage errors are status 2, help and version are 0", async () => {
    expect((await parse([])).status).toBe(2);
    expect((await parse(["--bogus"])).status).toBe(2);
    expect((await parse(["single"])).status).toBe(2);
    expect((await parse(["single", SHORT_UR, "--nope"])).status).toBe(2);
    expect((await parse(["animate", SHORT_UR])).status).toBe(2);
    expect((await parse(["single", SHORT_UR, "--size", "abc"])).status).toBe(2);
    expect((await parse(["single", SHORT_UR, "--size", "1.5"])).status).toBe(2);
    expect((await parse(["single", SHORT_UR, "--quiet-zone=-1"])).status).toBe(2);
    expect((await parse(["single", SHORT_UR, "--jpeg-quality", "300"])).status).toBe(2);
    const help = await parse(["--help"]);
    expect(help.status).toBe(0);
    expect(help.out).toContain("single");
    const version = await parse(["--version"]);
    expect(version.status).toBe(0);
    expect(version.out.trim()).toBe(`mur ${CLI_VERSION}`);
  });

  it("single() writes a PNG and reports it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mur-cli-"));
    try {
      const out = join(dir, "x.png");
      const line = await single({ urString: SHORT_UR, size: 64, output: out });
      expect(line).toMatch(/^Wrote \d+ bytes to /);
      const bytes = readFileSync(out);
      expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("single() rejects an unknown format, correction level and clear shape with the reference's messages", async () => {
    await expect(single({ urString: SHORT_UR, format: "bmp" })).rejects.toThrow(
      "unknown format: bmp (expected png or jpeg)",
    );
    await expect(single({ urString: SHORT_UR, correction: "x" })).rejects.toThrow(
      "unknown correction level: x (expected low, medium, quartile, or high)",
    );
    await expect(
      single({
        urString: SHORT_UR,
        logo: resolve(__dirname, "test_data", "bc-logo.svg"),
        logoShape: "bogus",
      }),
    ).rejects.toThrow("unknown clear shape: bogus (expected square or circle)");
  });

  it("single() rejects a too-dense UR unless the density check is off", async () => {
    const ur = longUrString();
    await expect(single({ urString: ur, output: "/dev/null" })).rejects.toThrow(
      /QR code too dense/,
    );
    await expect(
      single({ urString: ur, output: "/dev/null", densityCheck: false }),
    ).resolves.toMatch(/^Wrote/);
  });

  it("frames() writes numbered PNGs and animate() a GIF", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mur-cli-"));
    try {
      const line = await framesCommand({
        urString: longUrString(),
        output: join(dir, "frames"),
        size: 32,
        maxFragmentLen: 200,
      });
      expect(line).toMatch(/^Wrote \d+ frames to /);
      const files = readdirSync(join(dir, "frames")).sort();
      expect(files[0]).toBe("0000.png");
      expect(files.length).toBeGreaterThan(3);
      const gif = join(dir, "x.gif");
      const gifLine = await animate({
        urString: longUrString(),
        output: gif,
        size: 32,
        maxFragmentLen: 200,
        cycles: 1,
      });
      expect(gifLine).toMatch(/^Wrote \d+ frames \(\d+ bytes\) to /);
      expect(readFileSync(gif).subarray(0, 6).toString("latin1")).toBe("GIF89a");
      await expect(
        animate({ urString: longUrString(), output: gif, format: "bmp" }),
      ).rejects.toThrow("unknown format: bmp (expected gif or prores)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runCli() returns the exit status and sets process.exitCode", async () => {
    const before = process.exitCode;
    const errWrite = process.stderr.write.bind(process.stderr);
    let captured = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      captured += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      expect(await runCli(["node", "mur", "single", SHORT_UR, "--format", "bmp"])).toBe(1);
      expect(captured).toContain("Error: unknown format: bmp (expected png or jpeg)");
      expect(process.exitCode).toBe(1);
    } finally {
      process.stderr.write = errWrite;
      process.exitCode = before;
    }
  });
});

function runMur(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("node", [BIN, ...args], { encoding: "utf8", timeout: 30_000 });
}

describe.skipIf(!HAS_BIN)("mur binary", () => {
  it("single — produces PNG", () => {
    const dir = mkdtempSync(join(tmpdir(), "mur-bin-"));
    try {
      const out = join(dir, "x.png");
      const res = runMur(["single", SHORT_UR, "--size", "64", "-o", out]);
      expect(res.status).toBe(0);
      expect(statSync(out).size).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("usage error exits 2, library error exits 1", () => {
    expect(runMur(["--bogus"]).status).toBe(2);
    const res = runMur(["single", SHORT_UR, "--fg", "zzz", "-o", "/dev/null"]);
    expect(res.status).toBe(1);
    expect(String(res.stderr)).toContain("Error: Invalid color: invalid hex digit: 122");
  });

  it("--version prints the name and version", () => {
    const res = runMur(["--version"]);
    expect(res.status).toBe(0);
    expect(String(res.stdout).trim()).toBe(`mur ${CLI_VERSION}`);
  });
});
