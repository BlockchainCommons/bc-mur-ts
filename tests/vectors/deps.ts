/**
 * The adapter that drives a module (the frozen baseline bundle or the
 * working tree) through the recipes. Both speak the same surface: options
 * objects, string unions, `Logo.fromRgba(image, options)`,
 * `generateFrames(ur, options)`, `encodeAnimatedGif(frames, { fps })`,
 * `rasterizeSvg`/`logoFromSvg`, `MurError.code`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { decode as decodePng } from "fast-png";
import * as jpeg from "jpeg-js";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import {
  type DomainOp,
  JPEG_EPSILON,
  type RenderSpec,
  type SvgSpec,
  type VectorApi,
  logoPixels,
  payloadOf,
  unhex,
} from "./recipes";

export const sha = (u: Uint8Array): string => createHash("sha256").update(u).digest("hex");

const SHORT_UR = "ur:bytes/hdcxdwinvezm";
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** A `bytes` UR string of `bytes`, from the working tree's siblings (the string form is what both modules accept). */
export const urFromBytes = (bytes: Uint8Array): string => UR.from("bytes", cbor(bytes)).toString();

/** A one-pixel GIF89a. */
const GIF_1PX = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0x21, 0xf9,
  4, 1, 0, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 1, 0, 0x3b,
]);
/** A one-pixel 24-bit BI_RGB BMP. */
const BMP_1PX = (() => {
  const b = new Uint8Array(58);
  b[0] = 0x42;
  b[1] = 0x4d;
  b[10] = 54;
  b[14] = 40;
  b[18] = 1;
  b[22] = 1;
  b[26] = 1;
  b[28] = 24;
  return b;
})();

export function adapterFor(m: any): VectorApi {
  const colorBytes = (hex: string): [number, number, number, number] => {
    const c = m.Color.from(hex);
    return [c.r, c.g, c.b, c.a];
  };
  const logoOf = (spec: RenderSpec["logo"]): any =>
    spec === undefined
      ? null
      : m.Logo.fromRgba(
          { width: spec.width, height: spec.height, pixels: logoPixels(spec, colorBytes) },
          { fraction: spec.fraction, clearBorder: spec.clearBorder, clearShape: spec.clearShape },
        );
  const optionsOf = (spec: RenderSpec, logo: any = logoOf(spec.logo)): any => ({
    correction: spec.correction,
    size: spec.size,
    quietZone: spec.quietZone,
    ...(spec.foreground !== undefined ? { foreground: spec.foreground } : {}),
    ...(spec.background !== undefined ? { background: spec.background } : {}),
    logo,
  });
  const render = (spec: RenderSpec, logo?: any): any =>
    spec.payload.startsWith("ur:")
      ? m.renderUrQr(spec.payload, optionsOf(spec, logo))
      : m.renderQr(unhex(spec.payload), optionsOf(spec, logo));
  const messageOf = (payload: string): Uint8Array =>
    payload.startsWith("ur:")
      ? enc(payload.replace(/[a-z]+/g, (s) => s.toUpperCase()))
      : unhex(payload);
  const framesOf = (length: number, options: Record<string, unknown>): any[] =>
    m.generateFrames(urFromBytes(payloadOf(length)), { size: 32, ...options });
  const dims = (o: { width: number; height: number }): string => `${o.width}x${o.height}`;
  const domain = (op: DomainOp, a: readonly unknown[]): string => {
    switch (op) {
      case "colorTuple":
        return m.Color.from(a[0]).hex;
      case "colorNew":
        return new m.Color(...(a as number[])).hex;
      case "renderSize":
        return dims(m.renderUrQr(SHORT_UR, { size: a[0] }));
      case "renderQuietZone":
        return dims(m.renderUrQr(SHORT_UR, { size: 64, quietZone: a[0] }));
      case "renderCorrection":
        return dims(m.renderQr(enc("HELLO"), { size: 32, correction: a[0] }));
      case "renderUrValue":
        return dims(
          m.renderUrQr(a[0] === "object" ? {} : a[0] === "number" ? 42 : a[0], { size: 64 }),
        );
      case "renderQrValue":
        return dims(m.renderQr(a[0], { size: 32 }));
      case "jpegQuality":
        return m.renderQr(enc("HELLO"), { size: 32 }).toJpeg({ quality: a[0] }).length > 0
          ? "ok"
          : "empty";
      case "framesCycles":
        return `count=${framesOf(300, { maxFragmentLen: 100, cycles: a[0] }).length}`;
      case "framesCount":
        return `count=${framesOf(300, { maxFragmentLen: 100, frameCount: a[0] }).length}`;
      case "framesMaxModules":
        return `count=${framesOf(300, { maxFragmentLen: 100, maxModules: a[0] }).length}`;
      case "framesFragmentLen":
        return `count=${framesOf(300, { maxFragmentLen: a[0] }).length}`;
      case "densityCheck":
        m.checkQrDensity(a[0], a[1]);
        return "ok";
      case "logoRgba":
        return dims(
          m.Logo.fromRgba({ width: a[0], height: a[1], pixels: new Uint8Array(a[2] as number) }),
        );
      case "logoOptions": {
        const l = m.Logo.fromRgba(
          { width: 4, height: 4, pixels: new Uint8Array(64) },
          { fraction: a[0], clearBorder: a[1], clearShape: a[2] },
        );
        return `f${l.fraction} b${l.clearBorder} ${l.clearShape}`;
      }
      case "renderedImage":
        return new m.RenderedImage({
          width: a[0],
          height: a[1],
          pixels: new Uint8Array(a[2] as number),
        }).toPng().length > 0
          ? "ok"
          : "empty";
      case "gifFps":
        return m.encodeAnimatedGif(framesOf(300, { maxFragmentLen: 100, size: 16 }).slice(0, 2), {
          fps: a[0],
        }).length > 0
          ? "ok"
          : "empty";
      case "logoFormat": {
        const bytes = a[0] === "gif" ? GIF_1PX : a[0] === "bmp" ? BMP_1PX : enc(String(a[0]));
        return dims(m.Logo.fromImageBytes(bytes));
      }
    }
  };
  return {
    render: (spec) => {
      const img = render(spec);
      return {
        width: img.width,
        height: img.height,
        pixels: sha(img.pixels),
        png: sha(decodePng(img.toPng()).data as Uint8Array),
      };
    },
    matrix: (payload, c) => {
      const modules = m.qrModuleCount(messageOf(payload), c);
      const img = render({ payload, correction: c, size: modules, quietZone: 0 });
      let bits = "";
      for (let i = 0; i < img.width * img.height; i++) bits += img.pixels[i * 4] < 128 ? "1" : "0";
      return { modules, bits };
    },
    density: (payload, c, maxModules) => {
      const modules = m.qrModuleCount(messageOf(payload), c);
      m.checkQrDensity(modules, maxModules);
      return `ok ${modules}`;
    },
    frames: (r) => {
      const frames = framesOf(r.length, {
        maxFragmentLen: r.maxFragmentLen,
        ...(r.size !== undefined ? { size: r.size } : {}),
        ...(r.correction !== undefined ? { correction: r.correction } : {}),
        ...(r.cycles !== undefined ? { cycles: r.cycles } : {}),
        ...(r.frameCount !== undefined ? { frameCount: r.frameCount } : {}),
        ...(r.maxModules !== undefined ? { maxModules: r.maxModules } : {}),
      });
      return {
        count: frames.length,
        width: frames[0]?.image.width ?? 0,
        indices: frames.map((f: any) => f.index).join(","),
        first: frames.length ? sha(frames[0].image.pixels) : "-",
      };
    },
    gif: (r) => {
      const frames = framesOf(r.length, { maxFragmentLen: r.maxFragmentLen });
      const bytes = m.encodeAnimatedGif(frames.slice(0, r.frames), { fps: r.fps });
      return {
        frames: countGifFrames(bytes),
        width: frames[0].image.width,
        height: frames[0].image.height,
      };
    },
    color: (hex) => {
      const c = m.Color.from(hex);
      return `${c.toString()} transparent=${c.isTransparent}`;
    },
    svg: async (spec: SvgSpec) => {
      const logo = await m.logoFromSvg(enc(spec.svg), {
        fraction: spec.fraction,
        clearBorder: spec.clearBorder,
        clearShape: spec.clearShape,
      });
      const out: { width: number; height: number; pixels: string; render?: string } = {
        width: logo.width,
        height: logo.height,
        pixels: sha(logo.pixels),
      };
      if (spec.render) out.render = sha(render(spec.render, logo).pixels);
      return out;
    },
    jpeg: (r) => {
      const img = render({
        payload: r.payload,
        correction: r.correction,
        size: r.size,
        quietZone: 1,
      });
      const decoded = jpeg.decode(img.toJpeg({ quality: r.quality }), { useTArray: true });
      let max = 0;
      for (let i = 0; i < img.pixels.length; i += 4)
        for (let c = 0; c < 3; c++)
          max = Math.max(max, Math.abs(img.pixels[i + c] - decoded.data[i + c]));
      return { width: decoded.width, height: decoded.height, within: max <= JPEG_EPSILON };
    },
    domain,
    errorCode: (e) => {
      const x: any = e;
      if (x?.name === "MurError") return String(x.code);
      return undefined;
    },
  };
}

/** Counts the image descriptors in a GIF byte stream (a decoded-structure check, not encoder bytes). */
export function countGifFrames(bytes: Uint8Array): number {
  let count = 0;
  let i = 13 + ((bytes[10] & 0x80) !== 0 ? 3 << ((bytes[10] & 7) + 1) : 0);
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 0x3b) break;
    if (b === 0x21) {
      i += 2;
      while (i < bytes.length && bytes[i] !== 0) i += bytes[i] + 1;
      i++;
    } else if (b === 0x2c) {
      count++;
      const flags = bytes[i + 9];
      i += 10 + ((flags & 0x80) !== 0 ? 3 << ((flags & 7) + 1) : 0) + 1;
      while (i < bytes.length && bytes[i] !== 0) i += bytes[i] + 1;
      i++;
    } else break;
  }
  return count;
}

/** The frozen baseline bundle's adapter. */
export async function baselineAdapter(): Promise<VectorApi> {
  return adapterFor(await import("../baseline/multipart-ur-baseline.mjs"));
}

/** The working tree's adapter (root, `/gif` and `/svg-logo` entries). */
export async function currentAdapter(): Promise<VectorApi> {
  const [index, gif, svg] = await Promise.all([
    import("../../src"),
    import("../../src/gif"),
    import("../../src/svg"),
  ]);
  return adapterFor({ ...index, ...gif, ...svg });
}
