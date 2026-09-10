# Migration guide

## From `1.0.0-beta.1` to `1.0.0-beta.2`

- **Pixels.** Symbols whose mask or segmentation differed from the Rust
  reference now match it. If you pinned image hashes, regenerate
  them; every symbol is still a valid QR code of the same message.
- **Errors.** `e.details.code` is gone: narrow on `e.code` (or `e.is(code)`),
  which types `e.details`. The `MessageDetails`, `QrCodeTooDenseDetails`,
  `InsufficientFramesDetails` and `FfmpegNotFoundDetails` interfaces are
  replaced by `MurErrorDetailsByCode[Code]`. File-system failures are `Io`
  (they were raw Node errors).
- **Names.** `Image` is `RgbaImage`. `generateFrames` returns a
  `readonly QrFrame[]`.
- **Domains.** Out-of-range or fractional numbers, `NaN`, wrong argument
  types, `quality` outside 1–100 and non-positive `fps` throw
  `InvalidParameter`/`InvalidColor` where they were silently masked,
  clamped or accepted.
- **CLI.** Usage errors exit 2; `single`/`animate`/`frames` on `/cli` take
  optional fields (the `*_DEFAULTS` tables are gone); `runCli` returns the
  exit status instead of calling `process.exit`.

## From `@bcts/multipart-ur` to `@blockchaincommons/multipart-ur`

`@blockchaincommons/multipart-ur` is the canonical home of this library. It
was extracted from the [`paritytech/bcts`](https://github.com/paritytech/bcts)
monorepo, where it was published as `@bcts/multipart-ur`, into its own
Blockchain Commons repository at
[`BlockchainCommons/bc-mur-ts`](https://github.com/BlockchainCommons/bc-mur-ts),
and redesigned. Every pixel, part sequence and error message is the same;
the API is not.

## TL;DR checklist

- [ ] Replace the `@bcts/multipart-ur` dependency with `@blockchaincommons/multipart-ur`.
- [ ] Import the GIF, WebP, SVG and ProRes encoders from their entries (`/gif`, `/webp`, `/svg-logo`, `/prores`).
- [ ] Replace positional render arguments with an options object.
- [ ] Replace `CorrectionLevel.X` / `LogoClearShape.X` with the lower-case strings.
- [ ] Replace `Color.fromHex`/`Color.new` with `Color.from`; `isTransparent()` is a getter.
- [ ] Replace `Logo.fromRgba(pixels, w, h, f, b, shape)` with `Logo.fromRgba({ width, height, pixels }, { … })` (an `RgbaImage`).
- [ ] Replace `error.variant.kind` with `error.code`; narrowing on it types `error.details`.
- [ ] Raise your Node floor to **22.12**; TypeScript **>= 5.7**.

## 1. Package name and entries

```diff
- import { renderUrQr, encodeAnimatedGif, encodeProres, Logo } from "@bcts/multipart-ur";
+ import { renderUrQr, Logo } from "@blockchaincommons/multipart-ur";
+ import { encodeAnimatedGif } from "@blockchaincommons/multipart-ur/gif";
+ import { encodeProres } from "@blockchaincommons/multipart-ur/prores";
+ import { logoFromSvg } from "@blockchaincommons/multipart-ur/svg-logo";
+ import { logoFromWebp } from "@blockchaincommons/multipart-ur/webp";
```

The root entry loads no WASM and no CLI framework.

## 2. Rendering takes options

```diff
- renderQr(bytes, CorrectionLevel.Low, 512, Color.BLACK, Color.WHITE, 1, null);
+ renderQr(bytes, { correction: "low", size: 512, quietZone: 1 });
- renderUrQr(urString, CorrectionLevel.High, 256, fg, bg, 2, logo);
+ renderUrQr(urString, { correction: "high", size: 256, foreground: fg, background: bg, quietZone: 2, logo });
```

Every field has a default: `correction` is `"low"`, or `"high"` when `logo`
is given; `size` 512; black on white; `quietZone` 1. `foreground` and
`background` accept a `Color`, a hex string or an `[r, g, b(, a)]` tuple.
`renderUrQr` accepts a `UR` as well as its string. `size` must be a positive
integer and `quietZone` a non-negative one (`InvalidParameter`).

```diff
- img.toJpeg(90);
+ img.toJpeg({ quality: 90 });
```

`RenderedImage` is `{ width, height, pixels, channels: 4 }` with `toPng()`
and `toJpeg()`; its constructor takes that `RgbaImage` object.

## 3. Frames

```diff
- generateFrames(ur, { maxFragmentLen: 100, correction: CorrectionLevel.Low, fps: 8, frameCount: null, maxModules: null });
+ generateFrames(ur, { maxFragmentLen: 100, correction: "low" });
- encodeAnimatedGif(frames, 8);
+ encodeAnimatedGif(frames, { fps: 8 });            // from "/gif"
- encodeProres(frames, 8, "out.mov");
+ encodeProres(frames, { fps: 8, outputPath: "out.mov" }); // from "/prores"
```

`FrameOptions` extends the render options with `maxFragmentLen` (default
40), `cycles` (3), `frameCount` and `maxModules`; omit `frameCount` for
`cycles × parts` and omit `maxModules` for no density check (they were
`null` before). `fps` moved to the encoders that use it. `generateFrames`
accepts the UR string as well as a `UR`. `QrFrame` is a plain `{ image,
index }` object. `writeFramePngs(frames, dir)` is unchanged.

## 4. Enums are strings

```diff
- CorrectionLevel.Quartile          →  "quartile"
- LogoClearShape.Circle             →  "circle"
- correctionLevelFromString("h")    →  parseCorrectionLevel("h")   // from "/cli", accepts the first letter
- correctionLevelToString(level)    →  level
- logoClearShapeFromString("circle") →  "circle" (or parseClearShape from "/cli")
```

`CORRECTION_LEVELS` and `LOGO_CLEAR_SHAPES` list the values.

## 5. Colours

```diff
- Color.fromHex("#FF8000")   →  Color.from("#FF8000")
- Color.new(255, 128, 0, 255) →  new Color(255, 128, 0) / Color.from([255, 128, 0])
- c.isTransparent()          →  c.isTransparent
+ c.hex, c.bytes, c.equals(other)
```

## 6. Logos

```diff
- Logo.fromRgba(pixels, w, h, 0.25, 1, LogoClearShape.Square)
+ Logo.fromRgba({ width: w, height: h, pixels }, { fraction: 0.25, clearBorder: 1, clearShape: "square" })
- Logo.fromImageBytes(png, 0.25, 1, LogoClearShape.Square)
+ Logo.fromImageBytes(png, { fraction: 0.25, clearBorder: 1 })
- await Logo.fromImageBytesAsync(webp, …)   →  await logoFromWebp(webp, { … })     // from "/webp"
- await Logo.fromSvg(svg, 0.25, 1, shape)   →  await logoFromSvg(svg, { … })       // from "/svg-logo"
- initSvgRenderer(wasm)                     →  initSvgRenderer(wasm)               // from "/svg-logo"
```

The options default to fraction 0.25, clear border 1, square. `Logo` is an
`RgbaImage` (`width`, `height`, `pixels`) plus the three options.

## 7. Errors

```diff
- if (e instanceof MurError && e.isKind("QrCodeTooDense")) e.variant.moduleCount
+ if (MurError.isMurError(e) && e.code === "QrCodeTooDense") e.details.moduleCount
- e.variant.kind   →  e.code
- import { Error, Result } from "@bcts/multipart-ur"   // gone
```

Messages are unchanged. `cause` holds the wrapped encoder error.

## 8. The CLI

The `mur` binary is unchanged (`single`, `animate`, `frames`, the same
options). Programmatic use moved from the `SingleCommand`/`AnimateCommand`/
`FramesCommand` classes to functions on the `/cli` entry:

```diff
- await new SingleCommand({ ...SINGLE_DEFAULTS, urString }).exec();
+ await single({ urString });      // from "/cli"; also frames(), animate(), runCli(argv)
```

## 9. Floors

| | `@bcts/multipart-ur` | `@blockchaincommons/multipart-ur` |
|---|---|---|
| Node | `>= 18` | `>= 22.12` |
| TypeScript (consumers) | 6.x | `>= 5.7` |

The IIFE / global-script build is gone; use the ESM or CJS entries.

## 10. What did not change

- The fountain part sequence and frame counts, the density limit and
  `DEFAULT_MAX_MODULES`, every error message.
- Parity with the Rust reference, now exact for every symbol: see
  [`RUST_DIVERGENCES.md`](./RUST_DIVERGENCES.md).
