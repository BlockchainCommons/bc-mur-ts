/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * Errors. Every failure the library reports is a `MurError`: `code` names
 * the reference's `Error` variant, `details` carries that variant's fields
 * (typed per code), `message` is the reference's `Display` text, and
 * `cause` is the wrapped error when a dependency failed.
 *
 * @module error
 */

/** The reference `Error` variants, as string codes. */
export type MurErrorCode =
  | "QrEncode"
  | "ImageEncode"
  | "SvgRender"
  | "InvalidColor"
  | "InvalidParameter"
  | "GifEncode"
  | "FfmpegNotFound"
  | "FfmpegFailed"
  | "QrCodeTooDense"
  | "InsufficientFrames"
  | "Io"
  | "Ur";

/** Every {@link MurErrorCode}, in the reference's declaration order. */
export const MUR_ERROR_CODES: readonly MurErrorCode[] = Object.freeze([
  "QrEncode",
  "ImageEncode",
  "SvgRender",
  "InvalidColor",
  "InvalidParameter",
  "GifEncode",
  "FfmpegNotFound",
  "FfmpegFailed",
  "QrCodeTooDense",
  "InsufficientFrames",
  "Io",
  "Ur",
]);

/** The structured payload each {@link MurErrorCode} carries. */
export interface MurErrorDetailsByCode {
  /** The QR encoder's message. */
  QrEncode: { readonly message: string };
  /** The image encoder's or decoder's message. */
  ImageEncode: { readonly message: string };
  /** The SVG rasteriser's message. */
  SvgRender: { readonly message: string };
  /** Why the colour was rejected. */
  InvalidColor: { readonly message: string };
  /** Which argument was rejected and why. */
  InvalidParameter: { readonly message: string };
  /** The GIF encoder's message. */
  GifEncode: { readonly message: string };
  /** No fields: `ffmpeg` was not found on `PATH`. */
  FfmpegNotFound: Record<never, never>;
  /** How `ffmpeg` failed, with what it wrote to stderr when it ran. */
  FfmpegFailed: { readonly message: string; readonly stderr?: string };
  /** The symbol's module count and the limit it exceeded. */
  QrCodeTooDense: { readonly moduleCount: number; readonly maxModules: number };
  /** The frames requested and the fragments the message needs. */
  InsufficientFrames: { readonly requested: number; readonly fragments: number };
  /** The file-system error's message and, when known, the path. */
  Io: { readonly message: string; readonly path?: string };
  /** The `uniform-resources` error's message. */
  Ur: { readonly message: string };
}

/**
 * A {@link MurError} whose `details` is discriminated by its `code`.
 * Narrowing on `error.code` narrows `error.details` to that code's fields:
 *
 * ```typescript
 * try {
 *   generateFrames(ur, { frameCount: 1 });
 * } catch (e) {
 *   if (MurError.isMurError(e) && e.code === "InsufficientFrames") {
 *     e.details.requested; // number
 *   }
 * }
 * ```
 */
export type MurErrorTyped<C extends MurErrorCode = MurErrorCode> = C extends MurErrorCode
  ? MurError & { readonly code: C; readonly details: Readonly<MurErrorDetailsByCode[C]> }
  : never;

/** The `details` of any code. */
export type MurErrorDetails = Readonly<MurErrorDetailsByCode[MurErrorCode]>;

/** The single error type thrown by the library. Built through the static factories only. */
export class MurError extends Error {
  /** Always `"MurError"`. */
  override readonly name = "MurError";
  /** The reference's variant name; switch on this to handle errors. */
  readonly code: MurErrorCode;
  /** The variant's fields (see {@link MurErrorDetailsByCode}); frozen. */
  readonly details: MurErrorDetails;

  private constructor(
    code: MurErrorCode,
    message: string,
    details: MurErrorDetails,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.code = code;
    this.details = Object.freeze({ ...details });
  }

  /** Type guard: is `value` a `MurError` (from any copy of this package)? Narrows to {@link MurErrorTyped}. */
  static isMurError(value: unknown): value is MurErrorTyped {
    return value instanceof Error && value.name === "MurError" && "code" in value;
  }

  /** Whether this error has `code`; narrows `details` to that code's fields. */
  is<C extends MurErrorCode>(code: C): this is MurErrorTyped<C> {
    return this.code === code;
  }

  /** `QrEncode`: the QR encoder rejected the message (too long for version 40 at this level). */
  static qrEncode(message: string, cause?: unknown): MurErrorTyped<"QrEncode"> {
    return new MurError(
      "QrEncode",
      `QR encoding failed: ${message}`,
      { message },
      cause,
    ) as MurErrorTyped<"QrEncode">;
  }

  /** `ImageEncode`: PNG/JPEG encoding or logo decoding failed. */
  static imageEncode(message: string, cause?: unknown): MurErrorTyped<"ImageEncode"> {
    return new MurError(
      "ImageEncode",
      `Image encoding failed: ${message}`,
      { message },
      cause,
    ) as MurErrorTyped<"ImageEncode">;
  }

  /** `SvgRender`: the SVG could not be parsed or rasterised. */
  static svgRender(message: string, cause?: unknown): MurErrorTyped<"SvgRender"> {
    return new MurError(
      "SvgRender",
      `SVG rendering failed: ${message}`,
      { message },
      cause,
    ) as MurErrorTyped<"SvgRender">;
  }

  /** `InvalidColor`: a hex string or channel value is not a colour. */
  static invalidColor(message: string): MurErrorTyped<"InvalidColor"> {
    return new MurError("InvalidColor", `Invalid color: ${message}`, {
      message,
    }) as MurErrorTyped<"InvalidColor">;
  }

  /** `InvalidParameter`: an argument is outside its domain. */
  static invalidParameter(message: string): MurErrorTyped<"InvalidParameter"> {
    return new MurError("InvalidParameter", `Invalid parameter: ${message}`, {
      message,
    }) as MurErrorTyped<"InvalidParameter">;
  }

  /** `GifEncode`: the GIF encoder failed. */
  static gifEncode(message: string, cause?: unknown): MurErrorTyped<"GifEncode"> {
    return new MurError(
      "GifEncode",
      `GIF encoding failed: ${message}`,
      { message },
      cause,
    ) as MurErrorTyped<"GifEncode">;
  }

  /** `FfmpegNotFound`: no `ffmpeg` on `PATH`. */
  static ffmpegNotFound(): MurErrorTyped<"FfmpegNotFound"> {
    return new MurError(
      "FfmpegNotFound",
      "ffmpeg not found on PATH — install ffmpeg for ProRes output",
      {},
    ) as MurErrorTyped<"FfmpegNotFound">;
  }

  /** `FfmpegFailed`: `ffmpeg` could not be started or exited with a failure status. */
  static ffmpegFailed(
    message: string,
    options: { cause?: unknown; stderr?: string } = {},
  ): MurErrorTyped<"FfmpegFailed"> {
    const details: MurErrorDetailsByCode["FfmpegFailed"] =
      options.stderr === undefined ? { message } : { message, stderr: options.stderr };
    return new MurError(
      "FfmpegFailed",
      `ffmpeg failed: ${message}`,
      details,
      options.cause,
    ) as MurErrorTyped<"FfmpegFailed">;
  }

  /** `QrCodeTooDense`: the symbol has more modules than the limit allows. */
  static qrCodeTooDense(moduleCount: number, maxModules: number): MurErrorTyped<"QrCodeTooDense"> {
    return new MurError(
      "QrCodeTooDense",
      `QR code too dense: ${moduleCount} modules exceeds limit of ` +
        `${maxModules} (reduce data size, lower error correction, ` +
        `or increase --max-modules)`,
      { moduleCount, maxModules },
    ) as MurErrorTyped<"QrCodeTooDense">;
  }

  /** `InsufficientFrames`: fewer frames than the message has fragments. */
  static insufficientFrames(
    requested: number,
    fragments: number,
  ): MurErrorTyped<"InsufficientFrames"> {
    return new MurError(
      "InsufficientFrames",
      `insufficient frames: ${requested} requested but message ` +
        `requires at least ${fragments} fragments`,
      { requested, fragments },
    ) as MurErrorTyped<"InsufficientFrames">;
  }

  /** `Io`: a file could not be read, written or created. */
  static io(
    message: string,
    options: { cause?: unknown; path?: string } = {},
  ): MurErrorTyped<"Io"> {
    const details: MurErrorDetailsByCode["Io"] =
      options.path === undefined ? { message } : { message, path: options.path };
    return new MurError(
      "Io",
      `IO error: ${message}`,
      details,
      options.cause,
    ) as MurErrorTyped<"Io">;
  }

  /** `Ur`: `uniform-resources` rejected the UR or the fragment length. */
  static ur(message: string, cause?: unknown): MurErrorTyped<"Ur"> {
    return new MurError("Ur", `UR error: ${message}`, { message }, cause) as MurErrorTyped<"Ur">;
  }
}

/** The message of any thrown value, for wrapping into a `MurError`. */
export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Runs `fn`, wrapping a file-system failure as `Io` (a `MurError` passes through). */
export async function withIo<T>(path: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (MurError.isMurError(e)) throw e;
    throw MurError.io(messageOf(e), { cause: e, path });
  }
}
