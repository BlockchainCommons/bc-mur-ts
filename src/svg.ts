/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * SVG logos through `@resvg/resvg-wasm`. In Node the WASM module is read
 * from the package on first use; elsewhere call `initSvgRenderer(wasm)`
 * first.
 */

import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { MurError, messageOf } from "./error.js";
import { expectBytes } from "./guards.js";
import type { RgbaImage } from "./image.js";
import { Logo, type LogoOptions } from "./logo.js";

/** A logo rasterised from SVG bytes at 512×512. */
export async function logoFromSvg(svg: Uint8Array, options: LogoOptions = {}): Promise<Logo> {
  return Logo.fromRgba(await rasterizeSvg(svg), options);
}

let initPromise: Promise<void> | null = null;

/**
 * Initialises the WASM rasteriser. In Node the module is read from
 * `@resvg/resvg-wasm` automatically; in other runtimes pass the module (a
 * URL, `Response`, `BufferSource`, `WebAssembly.Module`, or a promise of one)
 * before the first SVG call. Calling it again is a no-op.
 */
export function initSvgRenderer(wasm?: Parameters<typeof initWasm>[0]): Promise<void> {
  initPromise ??= (async () => {
    if (wasm) {
      await initWasm(wasm);
      return;
    }
    await initWasm(await loadWasmFromNode());
  })().catch((e: unknown) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

async function loadWasmFromNode(): Promise<Uint8Array> {
  const isNode = typeof process !== "undefined" && process.versions?.node !== undefined;
  if (!isNode) {
    throw MurError.svgRender(
      "SVG renderer not initialized — call initSvgRenderer(wasmBytes) first",
    );
  }
  const fs = await import("node:fs/promises");
  const { createRequire } = await import("node:module");
  const requireFn = createRequire(import.meta.url);
  const path = requireFn.resolve("@resvg/resvg-wasm/index_bg.wasm");
  return new Uint8Array(await fs.readFile(path));
}

const RENDER_SIZE = 512;

/**
 * Rasterises an SVG document into a 512×512 straight-alpha RGBA image,
 * scaled to fit and centred. The document is placed through an `<image>`
 * element inside a 512×512 root, so the rasteriser applies the scale and
 * the (fractional) offset itself. Initialises the renderer if needed.
 */
export async function rasterizeSvg(svg: Uint8Array): Promise<RgbaImage> {
  expectBytes("svg", svg);
  await initSvgRenderer();

  let probe;
  try {
    probe = new Resvg(svg, { fitTo: { mode: "original" } });
  } catch (e) {
    throw MurError.svgRender(`SVG parse: ${messageOf(e)}`, e);
  }
  const width = probe.width;
  const height = probe.height;
  probe.free();

  const scale = Math.min(RENDER_SIZE / width, RENDER_SIZE / height);
  const tx = (RENDER_SIZE - width * scale) / 2;
  const ty = (RENDER_SIZE - height * scale) / 2;
  const wrapper =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_SIZE}" height="${RENDER_SIZE}">` +
    `<image x="${tx}" y="${ty}" width="${width * scale}" height="${height * scale}" ` +
    `preserveAspectRatio="none" href="data:image/svg+xml;base64,${base64(svg)}"/></svg>`;

  let renderer;
  try {
    renderer = new Resvg(new TextEncoder().encode(wrapper), {
      fitTo: { mode: "original" },
      background: "rgba(0, 0, 0, 0)",
    });
  } catch (e) {
    throw MurError.svgRender(`SVG render: ${messageOf(e)}`, e);
  }
  const rendered = renderer.render();
  const premultiplied = rendered.pixels.slice();
  rendered.free();
  renderer.free();
  return { width: RENDER_SIZE, height: RENDER_SIZE, pixels: demultiplyAlpha(premultiplied) };
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += BASE64[n >> 18] + BASE64[(n >> 12) & 63] + BASE64[(n >> 6) & 63] + BASE64[n & 63];
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8);
    out += BASE64[n >> 18] + BASE64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : "=";
    out += "=";
  }
  return out;
}

/** @internal Premultiplied RGBA to straight RGBA, rounding as the reference does. */
export function demultiplyAlpha(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    } else if (a === 255) {
      out[i] = data[i]!;
      out[i + 1] = data[i + 1]!;
      out[i + 2] = data[i + 2]!;
      out[i + 3] = 255;
    } else {
      out[i] = Math.floor((data[i] * 255 + Math.floor(a / 2)) / a) & 0xff;
      out[i + 1] = Math.floor((data[i + 1] * 255 + Math.floor(a / 2)) / a) & 0xff;
      out[i + 2] = Math.floor((data[i + 2] * 255 + Math.floor(a / 2)) / a) & 0xff;
      out[i + 3] = a;
    }
  }
  return out;
}
