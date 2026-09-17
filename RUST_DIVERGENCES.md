# Divergences from the Rust reference implementation

This library is a TypeScript port of
[`BlockchainCommons/bc-mur-rust`](https://github.com/BlockchainCommons/bc-mur-rust),
tracked at version **0.1.0**
([`15c7c70`](https://github.com/BlockchainCommons/bc-mur-rust/commit/15c7c701d0b7bce8215d092014510595d577f827)).

The tracked version and commit are recorded in
[`.github/versions.yml`](./.github/versions.yml), and the `upstream.yml`
workflow opens a tracking issue whenever the reference implementation moves
ahead of it.

This document is the deliberate record of every place the TypeScript behaviour
differs from the Rust reference. It has three kinds of entry, followed by
notes on the reference:

1. **True behavioral divergences** - the same input produces a different outcome.
2. **JS-only input domain** - inputs that have no Rust analog, so there is nothing to diverge from.
3. **Mapping equivalences** - JS-specific inputs that are validated through the bytes they produce.

Every comparable entry is checked by `tests/rust-validation`, a Rust program
that replays `tests/vectors/vectors.json` (209 vectors) against the published
`bc-mur` 0.1.0 crate from crates.io, the release of the tracked commit.
[`tests/rust-validation/README.md`](./tests/rust-validation/README.md) lists
what the vectors cover and how every row is classified. It runs in CI. The
current run:

```
209 vectors - 166 match, 2 expected-divergence, 41 js-only, 0 MISMATCH
```

What the harness compares exactly, and therefore what is identical to the
reference: the QR symbol (mixed-mode segmentation including Kanji,
Reed–Solomon codewords, placement and the reference's mask selection; the
encoder is a port of the `qrcode` crate), module-aligned painting, quiet
zones, foreground and background colours including transparent ones, the
logo layout (fraction, clear border, square and circle clearing, the 40 %
cap), bilinear logo scaling and alpha compositing, nearest-neighbour scaling
to the requested size, SVG rasterisation (square and non-square documents),
PNG logo decoding (palettes, `tRNS`, sub-byte grey, 16-bit samples,
interlacing), decoded PNG pixels, decoded GIF frames and delays (frames of
more than 256 colours are quantised by a port of the `color_quant` crate's
NeuQuant), the fountain-coded part sequence and its indices, frame counts
under `cycles`/`frameCount`, the saturated GIF delay for any `fps`, the JPEG
quality clamp, colour parsing and printing, density limits, and every error
code. Encoded container bytes are compared only through what decodes.

## 1. True behavioral divergences

- **`size: 0`.** The reference's `render_qr` builds an empty 0×0 image that
  none of its encoders can write (`to_png` fails with `ImageEncode`); the
  port rejects `size: 0` with `InvalidParameter` before rendering. No usable
  output differs; the failure moves earlier and changes code.
- **JPEG logos.** The reference decodes JPEG logos with `zune-jpeg`, the port
  with `jpeg-js`; two baseline decoders differ by a few units per channel, so
  a JPEG logo renders with slightly different pixels. The harness reports
  those rows as the `jpeg-decoder` class (2 rows; on the 8×8 fixture 96 of
  192 colour samples differ by at most 2). PNG logos decode identically.
- **Encoded bytes.** The PNG, JPEG and GIF files differ from the reference's
  (`fast-png`, `jpeg-js` and `gifenc` against `image`'s PNG and JPEG encoders
  and the `gif` crate: different filters, deflate settings, DCT rounding,
  palette placement and LZW encoders). Decoded PNG pixels and decoded GIF
  frames are identical; a decoded JPEG stays within 25 per channel of its
  source on both sides. A 512 px PNG of a short UR is about 12 kB here and 6.7 kB from
  the reference.
- **Hex colour strings the reference cannot slice.** Colour strings are
  measured and read as UTF-8 bytes on both sides, so a non-ASCII digit is
  reported by its first byte (`#ÿÿÿ` → `invalid hex digit: 195`). Where a
  byte pair would cut a multi-byte character (`#aÿaaa`) the reference panics;
  the port reports the byte (`InvalidColor`).
- **PNG decoder limits.** `fast-png` decodes an interlaced PNG with a bit
  depth below 8 wrongly, so the port refuses one (`ImageEncode`), and rejects
  an RGB `tRNS` chunk on an image of fewer than three pixels (`ImageEncode`);
  the reference decodes both.
- **Latent.** Images of 32 768 pixels or more that need scaling overflow a
  `u32` in the reference's `nearest_neighbor_scale` (a panic); the port
  renders them. Reaching it needs a 4 GB image.

## 2. JS-only input domain

- **Argument domains.** The reference's `u8`/`u32`/`usize`/`f64` parameters
  make many inputs unrepresentable; the port validates them at the boundary
  and rejects with `InvalidParameter` (colours: `InvalidColor`). The 41
  `domain` vectors pin these: colour channels outside 0–255 or fractional;
  a non-string given to `Color.fromHex`; `size` 0 or fractional;
  `quietZone`, `cycles`, `frameCount`, `maxModules`, `clearBorder`, image
  dimensions and `moduleCount` fractional or negative; JPEG `quality`
  fractional or outside 0–255; an `fps` that is not a number; unknown
  correction levels or clear shapes; a non-`Uint8Array` message; a `ur`
  that is neither a `UR` nor a string; an `RgbaImage` whose buffer is not
  `width × height × 4` bytes. Values the reference *can* express behave as
  it does: JPEG `quality` 0–255 is clamped to 1–100 by both encoders; any
  `fps` gives the same saturated GIF delay (`round(100 / fps)` as a `u16`:
  0 → 65 535, negative or `NaN` → 0) and is passed to ffmpeg as the
  reference formats it; `cycles: 0` and a short `frameCount` are
  `InsufficientFrames` on both sides.
- **SVG initialisation.** `initSvgRenderer(wasm)` exists for runtimes other
  than Node, where the `@resvg/resvg-wasm` module cannot be read from disk.
  The bundled rasteriser is `@resvg/resvg-wasm` 2.6.2 (`tiny-skia` 0.10.0)
  where the reference pins `resvg` 0.44.0 (`tiny-skia` 0.11.4); the SVG
  vectors match byte for byte, features outside them (text, filters, some
  paint servers) are not covered.
- **ProRes export.** Both shell out to `ffmpeg`; the port finds it by
  scanning `PATH` (the reference runs `which`, Unix only) and carries
  ffmpeg's stderr in `details.stderr` (the reference pipes it and never
  reads it). Not in the vectors, since the output depends on the installed
  encoder.

## 3. Mapping equivalences

- **Error codes.** The TypeScript `MurError.code` is the reference's `Error`
  variant name (`QrCodeTooDense`, `InsufficientFrames`, …); the harness maps
  variants by name. Messages after the variant prefix come from the wrapped
  library and may word the same failure differently (`QrEncode`: `data too
  long` on both sides; `ImageEncode`, `SvgRender`, `GifEncode`, `Io`: the
  library's text). `FfmpegFailed` words the status as Rust's `ExitStatus`
  prints it (`exit status: 1`, `signal: 9 (SIGKILL)`).
- **Enums.** `CorrectionLevel` and `LogoClearShape` are the reference's
  `Display` strings (`"low"`, `"circle"`, …); `parseCorrectionLevel` and
  `parseClearShape` are its `FromStr` (case-insensitive, letter aliases for
  levels). They throw a plain `Error` carrying the reference's message,
  because that error is a bare string there rather than an `Error` variant.
- **Colours.** `Color.fromHex` is `from_hex` (`#` optional); `toString()` is
  `Display` (upper-case hex, alpha omitted at 255); `equals` is `PartialEq`;
  `isTransparent` is `is_transparent` (`alpha < 3`). Render options take a
  `Color` or a hex string. Messages are the reference's, including the first
  UTF-8 byte of a non-ASCII digit.
- **UR payloads.** A UR string is upper-cased ASCII-only before encoding on
  both sides (`to_ascii_uppercase`), so `ur:bytes/ß` encodes the same bytes;
  the frame recipes build the `bytes` UR from the payload `i % 256` wrapped
  as a CBOR byte string on both sides.
- **Logo pixels.** The vectors describe raster logos as solid or gradient
  RGBA fills; both sides synthesise the same buffer and pass it to
  `Logo::from_rgba` / `Logo.fromRgba`, so the `InvalidParameter` for a clear
  border above 5 is raised by the same validation. `Logo.fromRgba` copies
  the buffer (the reference takes ownership of the `Vec`).
  `Logo.fromImageBytes` decodes PNG and JPEG, as the reference is built,
  sniffing the format with the reference's `image::guess_format` table so
  other formats are rejected with its wording (`The image format Gif is not
  supported`, `The image format could not be determined`); a PNG is
  converted as `png`'s `EXPAND` transformation and `image`'s `into_rgba8`
  convert it (`(c + 128) / 257` for 16-bit samples).
- **Frames.** `fps` is an option of the encoders that use it
  (`encodeAnimatedGif`, `encodeProres`) rather than an unused field of the
  frame options. `generateFrames` also accepts the UR string, which it
  parses as the reference's CLI does. `QrFrame.index` is the fountain part's
  sequence number, 1 for the first frame (the reference's field comment says
  0-based; its `current_index` says otherwise).
- **Animated GIFs.** Frames of up to 256 colours get their exact palette in
  first-seen order; frames with more are quantised by NeuQuant with the
  reference's parameters (`samplefac` 10, 256 colours), through a port of
  the `color_quant` crate verified against it. The container differs
  (`gifenc` promotes the first palette to the global table; the `gif` crate
  writes an empty global table and a local palette per frame).
- **The command line.** `mur single`, `animate` and `frames` take the
  reference's arguments with the reference's defaults and print the same
  status lines and error messages; usage errors exit 2 (as clap does) and
  library errors exit 1. `--version` prints `mur <npm version>` where the
  reference prints `bc-mur <crate version>`; the anyhow `Error:` block prints
  a `Caused by:` chain for `Io` and `Ur` where the port prints one line
  (first lines equal). `--jpeg-quality` takes 0–255 and the library clamps;
  `--fps` takes `inf`, `infinity` and `nan` in any case; `--max-fragment-len
  0` is the library's `Ur` error. The `/cli` entry exposes the commands
  programmatically; the reference's are private to its binary.
  `tests/rust-validation/cli-parity.ts` compares the two binaries when
  `MUR_REF_BIN` is set (33 cases: 31 same, 2 known: the OS error text for a
  missing logo file, and `size 0`).

## 4. Upstream notes

Observations about the reference worth reporting, none affecting parity:

- U1: the `AnimateParams::correction` comment says a logo defaults to
  Quartile; the code uses High. `QrFrame::index` is documented 0-based and
  is the 1-based fountain sequence number.
- U2: `which_ffmpeg` shells out to `which`, Unix only.
- U3: `encode_prores` pipes ffmpeg's stderr and never reads it; a verbose
  ffmpeg can block on a full pipe.
- U4: `to_jpeg`'s clamp of `quality` to 1–100 is undocumented.
- U5: `encode_animated_gif` saturates the delay to `u16` for `fps ≤ 0`,
  `NaN` or above 200 without a warning.
- U6: `nearest_neighbor_scale` multiplies in `u32` and overflows at 32 768
  pixels.
- U7: `render_qr` accepts `size: 0` and fails only in the encoders.

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit, and the
   `bc-mur` pin in `tests/rust-validation/Cargo.toml`.
4. Update the tracked version at the top of this file.
5. Re-run `bun run test:rust`; add, amend, or remove entries as the port
   requires. A `MISMATCH` is a bug on one side: fix it. A JavaScript-only
   input becomes a harness rule (a `domain` row), never a record entry.
