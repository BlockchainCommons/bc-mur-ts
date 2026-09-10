import { a as RgbaImage, i as LogoOptions, n as Logo } from "./logo-BfjBhkoX.mjs";
import { initWasm } from "@resvg/resvg-wasm";
//#region src/svg.d.ts
/** A logo rasterised from SVG bytes at 512×512. */
export declare function logoFromSvg(svg: Uint8Array, options?: LogoOptions): Promise<Logo>;
/**
 * Initialises the WASM rasteriser. In Node the module is read from
 * `@resvg/resvg-wasm` automatically; in other runtimes pass the module (a
 * URL, `Response`, `BufferSource`, `WebAssembly.Module`, or a promise of one)
 * before the first SVG call. Calling it again is a no-op.
 */
export declare function initSvgRenderer(wasm?: Parameters<typeof initWasm>[0]): Promise<void>;
/**
 * Rasterises an SVG document into a 512×512 straight-alpha RGBA image,
 * scaled to fit and centred. The document is placed through an `<image>`
 * element inside a 512×512 root, so the rasteriser applies the scale and
 * the (fractional) offset itself. Initialises the renderer if needed.
 */
export declare function rasterizeSvg(svg: Uint8Array): Promise<RgbaImage>;
//#endregion
//# sourceMappingURL=svg-logo-entry.d.mts.map