/**
 * `encodeProres` with `ffmpeg` mocked: the argument list, the error
 * mapping (spawn failure, non-zero status with stderr), and temp cleanup.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type * as FsPromises from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import { MurError, generateFrames } from "../src/index.js";

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

const accessMock = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return { ...actual, access: accessMock };
});

const { encodeProres, findFfmpeg } = await import("../src/prores.js");

function fakeProcess(
  exitCode: number | null,
  stderr = "",
  signal: string | null = null,
): EventEmitter & { stderr: EventEmitter } {
  const proc = Object.assign(new EventEmitter(), { stderr: new EventEmitter() });
  process.nextTick(() => {
    if (stderr !== "") proc.stderr.emit("data", Buffer.from(stderr));
    proc.emit("close", exitCode, signal);
  });
  return proc;
}

const frames = generateFrames(UR.from("bytes", cbor(new Uint8Array(40))), { size: 16 });
const tmpCount = (): number => readdirSync(tmpdir()).filter((n) => n.startsWith("bc-mur-")).length;

afterEach(() => {
  spawnMock.mockReset();
  accessMock.mockReset();
});

describe("encodeProres", () => {
  it("FfmpegNotFound when no ffmpeg is on PATH", async () => {
    accessMock.mockRejectedValue(new Error("ENOENT"));
    await expect(findFfmpeg()).rejects.toMatchObject({ code: "FfmpegNotFound" });
    await expect(encodeProres(frames, { outputPath: "/tmp/x.mov" })).rejects.toMatchObject({
      code: "FfmpegNotFound",
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("runs ffmpeg with the reference's arguments and cleans up", async () => {
    accessMock.mockResolvedValue(undefined);
    spawnMock.mockImplementation(() => fakeProcess(0));
    const before = tmpCount();
    await encodeProres(frames, { fps: 12, outputPath: "/tmp/out.mov" });
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [bin, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(bin.endsWith("ffmpeg")).toBe(true);
    expect(args.slice(0, 3)).toEqual(["-y", "-r", "12"]);
    expect(args.slice(-7)).toEqual([
      "-c:v",
      "prores_ks",
      "-profile:v",
      "4444",
      "-pix_fmt",
      "yuva444p10le",
      "/tmp/out.mov",
    ]);
    expect(args[4]?.endsWith("%04d.png")).toBe(true);
    expect(tmpCount()).toBe(before);
  });

  it("FfmpegFailed carries the status and stderr", async () => {
    accessMock.mockResolvedValue(undefined);
    spawnMock.mockImplementation(() => fakeProcess(1, "muxer error"));
    try {
      await encodeProres(frames, { outputPath: "/tmp/out.mov" });
      throw new Error("expected throw");
    } catch (e) {
      expect(MurError.isMurError(e) && e.is("FfmpegFailed")).toBe(true);
      if (MurError.isMurError(e) && e.is("FfmpegFailed")) {
        expect(e.message).toBe("ffmpeg failed: ffmpeg exited with status exit status: 1");
        expect(e.details.stderr).toBe("muxer error");
      }
    }
  });

  it("a signal is reported as Rust's ExitStatus prints it", async () => {
    accessMock.mockResolvedValue(undefined);
    spawnMock.mockImplementation(() => fakeProcess(null, "", "SIGKILL"));
    await expect(encodeProres(frames, { outputPath: "/tmp/out.mov" })).rejects.toThrow(
      "ffmpeg failed: ffmpeg exited with status signal: 9 (SIGKILL)",
    );
  });

  it("passes any fps to ffmpeg as the reference formats it; a non-number and an empty output path are InvalidParameter", async () => {
    accessMock.mockResolvedValue(undefined);
    spawnMock.mockImplementation(() => fakeProcess(0));
    for (const [fps, arg] of [
      [0, "0"],
      [-5, "-5"],
      [0.5, "0.5"],
      [Number.POSITIVE_INFINITY, "inf"],
      [Number.NaN, "NaN"],
      [1e21, "1000000000000000000000"],
      [1e-7, "0.0000001"],
    ] as const) {
      await encodeProres(frames, { fps, outputPath: "/tmp/out.mov" });
      const [, args] = spawnMock.mock.lastCall as [string, string[]];
      expect(args.slice(1, 3)).toEqual(["-r", arg]);
    }
    await expect(
      encodeProres(frames, { fps: "8" as unknown as number, outputPath: "/tmp/x.mov" }),
    ).rejects.toMatchObject({ code: "InvalidParameter" });
    await expect(encodeProres(frames, { outputPath: "" })).rejects.toMatchObject({
      code: "InvalidParameter",
    });
    expect(existsSync("/tmp/x.mov")).toBe(false);
  });
});
