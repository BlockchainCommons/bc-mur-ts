/**
 * CLI parity: runs the same invocations through the reference `mur` binary
 * (`MUR_REF_BIN`, e.g. `bc-mur-rust/target/release/mur`) and this package's
 * `dist/bin/mur.cjs`, and compares the exit status and, for statuses other
 * than 2, the first stderr line (usage errors are worded by clap and
 * commander respectively).
 *
 *   MUR_REF_BIN=/path/to/mur bun tests/rust-validation/cli-parity.ts
 *
 * Manual gate: it needs a built reference binary and `bun run build`.
 * A case's `known` field explains a difference the port keeps on purpose;
 * RUST_DIVERGENCES.md's "The command line" section records the same ones.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";

const ref = process.env["MUR_REF_BIN"];
if (ref === undefined || ref === "") {
  console.error("MUR_REF_BIN is not set; skipping CLI parity.");
  process.exit(0);
}
const root = resolve(import.meta.dirname, "../..");
const port = join(root, "dist/bin/mur.cjs");
const logo = join(root, "tests/test_data/bc-logo.svg");
const out = mkdtempSync(join(tmpdir(), "mur-parity-"));
const SHORT = "ur:bytes/hdcxdwinvezm";
const LONG = UR.from("bytes", cbor(Uint8Array.from({ length: 300 }, (_, i) => i % 256))).toString();

interface Case {
  name: string;
  args: string[];
  /** Why the two are allowed to differ, when they are. */
  known?: string;
}
const cases: Case[] = [
  {
    name: "version",
    args: ["--version"],
    known: "version string (the port prints `mur <npm version>`)",
  },
  { name: "no args", args: [] },
  { name: "unknown option", args: ["--bogus"] },
  { name: "single without argument", args: ["single"] },
  { name: "single unknown option", args: ["single", SHORT, "--nope"] },
  {
    name: "single ok",
    args: ["single", SHORT, "-o", join(out, "x.png")],
    known: "PNG byte count (encoders differ, decoded pixels equal)",
  },
  { name: "single format bmp", args: ["single", SHORT, "--format", "bmp", "-o", join(out, "x")] },
  {
    name: "single correction x",
    args: ["single", SHORT, "--correction", "x", "-o", join(out, "x.png")],
  },
  {
    name: "single correction L",
    args: ["single", SHORT, "--correction", "L", "-o", join(out, "x.png")],
    known: "PNG byte count",
  },
  {
    name: "single logo shape bogus",
    args: ["single", SHORT, "--logo", logo, "--logo-shape", "bogus", "-o", join(out, "x.png")],
  },
  {
    name: "single logo missing",
    args: ["single", SHORT, "--logo", "/nonexistent.svg", "-o", join(out, "x.png")],
    known: "OS error text",
  },
  {
    name: "single size 0",
    args: ["single", SHORT, "--size", "0", "-o", join(out, "x.png")],
    known: "size 0 is rejected up front in the port; the reference fails in to_png",
  },
  { name: "single size abc", args: ["single", SHORT, "--size", "abc", "-o", join(out, "x.png")] },
  { name: "single size 1.5", args: ["single", SHORT, "--size", "1.5", "-o", join(out, "x.png")] },
  { name: "single fg zzz", args: ["single", SHORT, "--fg", "zzz", "-o", join(out, "x.png")] },
  {
    name: "single quiet zone -1",
    args: ["single", SHORT, "--quiet-zone=-1", "-o", join(out, "x.png")],
  },
  {
    name: "single jpeg q0",
    args: ["single", SHORT, "--format", "jpeg", "--jpeg-quality", "0", "-o", join(out, "x.jpg")],
    known: "quality 0 is rejected in the port; the reference clamps it to 1",
  },
  {
    name: "single jpeg q300",
    args: ["single", SHORT, "--format", "jpeg", "--jpeg-quality", "300", "-o", join(out, "x.jpg")],
  },
  {
    name: "single dense",
    args: ["single", `ur:bytes/${"a".repeat(3000)}`, "-o", join(out, "x.png")],
  },
  {
    name: "single logo fraction 2",
    args: ["single", SHORT, "--logo", logo, "--logo-fraction", "2", "-o", join(out, "x.png")],
  },
  {
    name: "animate frame count 1",
    args: [
      "animate",
      LONG,
      "-o",
      join(out, "x.gif"),
      "--frame-count",
      "1",
      "--max-fragment-len",
      "100",
    ],
  },
  {
    name: "animate ok",
    args: ["animate", LONG, "-o", join(out, "x.gif"), "--max-fragment-len", "100", "--size", "64"],
    known: "GIF byte count (encoders differ, decoded frames equal)",
  },
  {
    name: "animate format bmp",
    args: ["animate", LONG, "-o", join(out, "x.gif"), "--format", "bmp"],
  },
  { name: "animate without output", args: ["animate", LONG] },
  { name: "animate bad ur", args: ["animate", "ur:bytes/zzzz", "-o", join(out, "x.gif")] },
  {
    name: "animate fps 0",
    args: ["animate", LONG, "-o", join(out, "x.gif"), "--fps", "0", "--size", "32"],
    known: "fps 0 is rejected in the port; the reference saturates the GIF delay",
  },
  {
    name: "animate cycles 0",
    args: ["animate", LONG, "-o", join(out, "x.gif"), "--cycles", "0", "--size", "32"],
  },
  {
    name: "frames ok",
    args: ["frames", LONG, "-o", join(out, "frames"), "--max-fragment-len", "100", "--size", "32"],
  },
];

const run = (bin: string, args: string[]): { status: number; stderr: string; stdout: string } => {
  const r = spawnSync(bin === port ? "node" : bin, bin === port ? [port, ...args] : args, {
    encoding: "utf8",
  });
  return {
    status: r.status ?? -1,
    stderr: r.stderr.split("\n")[0] ?? "",
    stdout: r.stdout.split("\n")[0] ?? "",
  };
};

let same = 0;
let known = 0;
let diff = 0;
for (const c of cases) {
  const a = run(ref, c.args);
  const b = run(port, c.args);
  const equal = a.status === b.status && (a.status === 2 || a.stderr === b.stderr);
  if (equal) same++;
  else if (c.known !== undefined) {
    known++;
    console.log(
      `known   ${c.name}: ${c.known}\n  ref:  ${a.status} ${a.stderr || a.stdout}\n  port: ${b.status} ${b.stderr || b.stdout}`,
    );
  } else {
    diff++;
    console.log(
      `DIFF    ${c.name}\n  ref:  ${a.status} ${a.stderr || a.stdout}\n  port: ${b.status} ${b.stderr || b.stdout}`,
    );
  }
}
rmSync(out, { recursive: true, force: true });
console.log(`${cases.length} cases - ${same} same, ${known} known, ${diff} DIFF`);
if (diff > 0) process.exit(1);
