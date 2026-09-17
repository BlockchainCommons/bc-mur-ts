/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * `@blockchaincommons/multipart-ur/svg-logo` — SVG logo rasterization
 * (`@resvg/resvg-wasm`). Node loads the WASM module on first use; other
 * runtimes call `initSvgRenderer(wasm)` first.
 *
 * @packageDocumentation
 */
export { initSvgRenderer, logoFromSvg } from "./svg.js";
