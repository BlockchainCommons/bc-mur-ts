/**
 * Vector recipes: a QR rendering of a payload (bytes or a UR string) at a
 * correction level, module size, quiet zone and colours, with or without a
 * logo → the image's dimensions and the SHA-256 of its RGBA pixels; the
 * bare module matrix (one pixel a module, no quiet zone) as a bit string;
 * the animated frames of a UR at a fragment size → the part sequence, frame
 * count and the first frame's pixel hash; a GIF of a few frames → its
 * decoded frame count, size, delay and per-frame pixel hashes; an SVG logo
 * → its rasterised pixels; a JPEG
 * → whether its decoded pixels stay within the epsilon; image bytes given to
 * the logo decoder → the decoded pixels or the rejection; the density
 * check; colours; and `domain` rows that pin what the TypeScript boundary
 * rejects.
 * `materialize` runs a recipe through a `VectorApi` and returns one outcome
 * string, so the same recipe drives the golden file, the differential and
 * the Rust harness.
 */

export type Correction = "low" | "medium" | "quartile" | "high";
export type ClearShape = "square" | "circle";

/** A logo drawn from a solid or gradient RGBA fill, so it needs no fixture. */
export interface LogoSpec {
  width: number;
  height: number;
  /** `solid` fills with the colour; `gradient` ramps red across x and alpha across y. */
  fill: "solid" | "gradient";
  color?: string;
  fraction: number;
  clearBorder: number;
  clearShape: ClearShape;
}

export interface RenderSpec {
  /** Bytes as hex, or a UR string (`ur:`), which is upper-cased before encoding. */
  payload: string;
  correction: Correction;
  size: number;
  quietZone: number;
  foreground?: string;
  background?: string;
  logo?: LogoSpec;
}

/** An SVG logo: the document, its layout, and optionally a render to composite it on. */
export interface SvgSpec {
  svg: string;
  fraction: number;
  clearBorder: number;
  clearShape: ClearShape;
  render?: { payload: string; correction: Correction; size: number; quietZone: number };
}

/** The operations `domain` rows exercise; each pins a boundary check of the TypeScript API. */
export type DomainOp =
  | "colorValue"
  | "colorNew"
  | "renderSize"
  | "renderQuietZone"
  | "renderCorrection"
  | "renderUrValue"
  | "renderQrValue"
  | "jpegQuality"
  | "framesCycles"
  | "framesCount"
  | "framesMaxModules"
  | "framesFragmentLen"
  | "densityCheck"
  | "logoRgba"
  | "logoOptions"
  | "renderedImage"
  | "gifFps";

export type Recipe =
  | ({ k: "render" } & RenderSpec)
  | { k: "matrix"; payload: string; correction: Correction; note?: string }
  | { k: "density"; payload: string; correction: Correction; maxModules: number; note?: string }
  | {
      k: "frames";
      /** Byte length of a deterministic payload (`i % 256`). */
      length: number;
      maxFragmentLen: number;
      size?: number;
      correction?: Correction;
      cycles?: number;
      frameCount?: number;
      maxModules?: number;
    }
  | {
      k: "gif";
      length: number;
      maxFragmentLen: number;
      frames: number;
      fps: number;
      /** Frame size in pixels (default 32). */
      size?: number;
      logo?: LogoSpec;
    }
  | { k: "color"; hex: string }
  | ({ k: "svg" } & SvgSpec)
  | { k: "jpeg"; payload: string; correction: Correction; size: number; quality: number }
  /** Image bytes given to `Logo.fromImageBytes` (defaults), optionally composited on a render. */
  | {
      k: "logo-bytes";
      name: string;
      hex: string;
      render?: { payload: string; correction: Correction; size: number; quietZone: number };
    }
  | { k: "domain"; op: DomainOp; args: readonly unknown[] };
export type Outcome = string;

export interface VectorApi {
  render(spec: RenderSpec): { width: number; height: number; pixels: string; png: string };
  matrix(payload: string, correction: Correction): { modules: number; bits: string };
  density(payload: string, correction: Correction, maxModules: number): string;
  frames(r: Extract<Recipe, { k: "frames" }>): {
    count: number;
    indices: string;
    first: string;
    width: number;
  };
  gif(r: Extract<Recipe, { k: "gif" }>): {
    frames: number;
    width: number;
    height: number;
    /** The first frame's delay in centiseconds. */
    delay: number;
    /** The SHA-256 of each decoded frame's RGBA pixels. */
    hashes: string[];
  };
  color(hex: string): string;
  svg(spec: SvgSpec): Promise<{ width: number; height: number; pixels: string; render?: string }>;
  jpeg(r: Extract<Recipe, { k: "jpeg" }>): { width: number; height: number; within: boolean };
  logoBytes(r: Extract<Recipe, { k: "logo-bytes" }>): {
    width: number;
    height: number;
    pixels: string;
    render?: string;
  };
  domain(op: DomainOp, args: readonly unknown[]): string;
  errorCode(e: unknown): string | undefined;
}

/** The largest per-channel difference a decoded JPEG may show against its source. */
export const JPEG_EPSILON = 25;

export function recipeName(r: Recipe): string {
  switch (r.k) {
    case "render":
      return `render ${r.payload.slice(0, 24)} ${r.correction} ${r.size}px qz${r.quietZone}${r.foreground ? ` fg${r.foreground}` : ""}${r.background ? ` bg${r.background}` : ""}${r.logo ? ` logo ${r.logo.fill} ${r.logo.width}x${r.logo.height} f${r.logo.fraction} b${r.logo.clearBorder} ${r.logo.clearShape}` : ""}`;
    case "matrix":
      return `matrix ${r.payload.slice(0, 24)} ${r.correction}${r.note ? ` (${r.note})` : ""}`;
    case "density":
      return `density ${r.payload.slice(0, 24)} ${r.correction} max${r.maxModules}${r.note ? ` (${r.note})` : ""}`;
    case "frames":
      return `frames ${r.length}B frag${r.maxFragmentLen}${r.size ? ` ${r.size}px` : ""}${r.correction ? ` ${r.correction}` : ""}${r.cycles ? ` ×${r.cycles}` : ""}${r.frameCount !== undefined ? ` n${r.frameCount}` : ""}${r.maxModules !== undefined ? ` max${r.maxModules}` : ""}`;
    case "gif":
      return `gif ${r.length}B frag${r.maxFragmentLen} ${r.frames}f ${r.fps}fps${r.size !== undefined ? ` ${r.size}px` : ""}${r.logo ? ` logo ${r.logo.fill} ${r.logo.width}x${r.logo.height}` : ""}`;
    case "color":
      return `color ${r.hex}`;
    case "svg":
      return `svg ${r.svg.length}B f${r.fraction} b${r.clearBorder} ${r.clearShape}${r.render ? ` on ${r.render.payload.slice(0, 16)} ${r.render.correction} ${r.render.size}px qz${r.render.quietZone}` : ""}`;
    case "jpeg":
      return `jpeg ${r.payload.slice(0, 24)} ${r.correction} ${r.size}px q${r.quality}`;
    case "logo-bytes":
      return `logo-bytes ${r.name} ${r.hex.length / 2}B${r.render ? ` on ${r.render.payload.slice(0, 16)} ${r.render.correction} ${r.render.size}px qz${r.render.quietZone}` : ""}`;
    case "domain":
      return `domain ${r.op} ${JSON.stringify(r.args)}`;
  }
}

export async function materialize(api: VectorApi, r: Recipe): Promise<Outcome> {
  try {
    switch (r.k) {
      case "render": {
        const o = api.render(r);
        return `${o.width}x${o.height} pixels=${o.pixels} png=${o.png}`;
      }
      case "matrix": {
        const o = api.matrix(r.payload, r.correction);
        return `${o.modules}\n${o.bits}`;
      }
      case "density":
        return api.density(r.payload, r.correction, r.maxModules);
      case "frames": {
        const o = api.frames(r);
        return `count=${o.count} width=${o.width} indices=${o.indices} first=${o.first}`;
      }
      case "gif": {
        const o = api.gif(r);
        return `frames=${o.frames} ${o.width}x${o.height} delay=${o.delay} hashes=${o.hashes.join(",")}`;
      }
      case "color":
        return api.color(r.hex);
      case "svg": {
        const o = await api.svg(r);
        return `${o.width}x${o.height} pixels=${o.pixels}${o.render !== undefined ? ` render=${o.render}` : ""}`;
      }
      case "jpeg": {
        const o = api.jpeg(r);
        return `${o.width}x${o.height} ${o.within ? `within ${JPEG_EPSILON}` : `beyond ${JPEG_EPSILON}`}`;
      }
      case "logo-bytes": {
        const o = api.logoBytes(r);
        return `${o.width}x${o.height} pixels=${o.pixels}${o.render !== undefined ? ` render=${o.render}` : ""}`;
      }
      case "domain":
        return api.domain(r.op, r.args);
    }
  } catch (e) {
    return `throw:${api.errorCode(e) ?? engineNeutral(e)}`;
  }
}

/** Engine errors word their messages per engine; report the name. */
export const engineNeutral = (e: unknown): string =>
  e instanceof TypeError || e instanceof RangeError ? e.name : (e as Error).message;

export const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));

/** The deterministic payload of `length` bytes the frame recipes use. */
export const payloadOf = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, i) => i % 256);

/** The RGBA buffer of a logo spec. */
export function logoPixels(
  l: LogoSpec,
  colorBytes: (hex: string) => [number, number, number, number],
): Uint8Array {
  const out = new Uint8Array(l.width * l.height * 4);
  const solid = colorBytes(l.color ?? "#FF0000");
  for (let y = 0; y < l.height; y++) {
    for (let x = 0; x < l.width; x++) {
      const i = (y * l.width + x) * 4;
      if (l.fill === "solid") out.set(solid, i);
      else {
        out[i] = Math.round((255 * x) / Math.max(1, l.width - 1));
        out[i + 1] = 64;
        out[i + 2] = 255 - out[i];
        out[i + 3] = Math.round((255 * y) / Math.max(1, l.height - 1));
      }
    }
  }
  return out;
}
