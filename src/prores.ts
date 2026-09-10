/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * ProRes 4444 output through an `ffmpeg` subprocess. Node only.
 */

import { MurError, withIo } from "./error.js";
import { type QrFrame, writeFramePngs } from "./frames.js";
import { expectPositive } from "./guards.js";

/** ProRes encoding: the frame rate and where ffmpeg writes the `.mov`. */
export interface ProresOptions {
  /** Frames per second, a positive number (default 8). */
  fps?: number;
  /** Output file path. */
  outputPath: string;
}

/**
 * Encodes the frames to ProRes 4444 (`prores_ks`, `yuva444p10le`): writes
 * them as PNGs in a temporary directory, runs `ffmpeg`, and removes the
 * directory. `FfmpegNotFound` when no `ffmpeg` is on `PATH`; `FfmpegFailed`
 * (with ffmpeg's stderr in `details.stderr`) when it exits with a failure.
 */
export async function encodeProres(
  frames: readonly QrFrame[],
  options: ProresOptions,
): Promise<void> {
  const fps = expectPositive("fps", options.fps ?? 8);
  if (typeof options.outputPath !== "string" || options.outputPath === "") {
    throw MurError.invalidParameter("outputPath must be a non-empty string");
  }
  const outputPath = options.outputPath;
  const ffmpeg = await findFfmpeg();

  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const { spawn } = await import("node:child_process");

  const tmpDir = await withIo(os.tmpdir(), () => fs.mkdtemp(path.join(os.tmpdir(), "bc-mur-")));

  try {
    await writeFramePngs(frames, tmpDir);

    const args = [
      "-y",
      "-r",
      String(fps),
      "-i",
      path.join(tmpDir, "%04d.png"),
      "-c:v",
      "prores_ks",
      "-profile:v",
      "4444",
      "-pix_fmt",
      "yuva444p10le",
      outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      proc.on("error", (err) => {
        reject(MurError.ffmpegFailed(err.message, { cause: err }));
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(MurError.ffmpegFailed(`ffmpeg exited with status ${String(code)}`, { stderr }));
        }
      });
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** The `ffmpeg` executable on `PATH` (`PATHEXT` extensions on Windows), or `FfmpegNotFound`. */
export async function findFfmpeg(): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dirs = (process.env["PATH"] ?? "").split(path.delimiter).filter((d) => d !== "");
  const names =
    process.platform === "win32"
      ? (process.env["PATHEXT"] ?? ".EXE;.CMD;.BAT")
          .split(";")
          .map((ext) => `ffmpeg${ext.toLowerCase()}`)
      : ["ffmpeg"];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        await fs.access(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        // Not here; try the next directory.
      }
    }
  }
  throw MurError.ffmpegNotFound();
}
