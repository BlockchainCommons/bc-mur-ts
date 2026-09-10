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
differs from the Rust reference. It has three kinds of entry:

1. **True behavioral divergences** - the same input produces a different outcome.
2. **JS-only input domain** - inputs that have no Rust analog, so there is nothing to diverge from.
3. **Mapping equivalences** - JS-specific inputs that are validated through the bytes they produce.

Every comparable entry is checked by `tests/rust-validation`, a Rust program
that builds `bc-mur` at the tracked commit and replays
`tests/vectors/vectors.json` (171 vectors: single-frame renders of byte and
UR payloads at every correction level, size, quiet zone, colour pair and
logo layout — dimensions plus the SHA-256 of the RGBA buffer and of the
decoded PNG; bare module matrices as bit strings, including mixed-mode and
Shift-JIS payloads and non-ASCII UR strings; animated frame sequences of a
deterministic `bytes` UR — count, width, part indices and the first frame's
pixel hash; animated GIFs — decoded frame count and size; SVG logos — the
rasterised pixels and a render with the logo; JPEG round trips within the
shared epsilon; density checks; colour parsing; and the error code of every
failing path). It runs in CI. The current run:
**171 vectors — 125 match, 0 expected divergence, 46 js-only, 0 mismatch.**

Everything the port computes is byte-identical to the reference: the QR
symbol itself (mixed-mode segmentation including Kanji, Reed–Solomon
codewords, placement and the reference's mask selection — the encoder is a
port of the `qrcode` crate), module-aligned painting, quiet zones, foreground and background colours
including transparent ones, the logo layout (fraction, clear border, square
and circle clearing, the 40 % cap), bilinear logo scaling and alpha
compositing, nearest-neighbour scaling to the requested size, SVG
rasterisation (square and non-square documents), PNG decoded pixels, the
fountain-coded part sequence and its indices, frame counts under
`cycles`/`frameCount`, GIF frame structure, colour parsing and printing,
density limits, and every error code.

## 1. True behavioral divergences

None. Every input both sides accept produces the same pixels, module
matrix, part sequence or string; every input both sides reject is rejected
with the same error code. The differences below are in what the TypeScript
API accepts or rejects that the reference cannot express, or in the bytes
of encoded containers whose decoded content is identical.

## 2. JS-only input domain

- **Argument domains.** The reference's `u8`/`u32`/`usize`/`f64` parameters
  make many inputs unrepresentable; the port validates them at the boundary
  and rejects with `InvalidParameter` (colours: `InvalidColor`), never
  masking, clamping or rounding. The 46
  `domain` vectors pin these: colour channels outside 0–255 or fractional;
  `size` 0 or fractional; `quietZone`, `cycles`, `frameCount`, `maxModules`,
  `clearBorder`, image dimensions and `moduleCount` fractional or negative;
  `quality` outside 1–100; `fps` not a positive finite number; unknown
  correction levels or clear shapes; a non-`Uint8Array` message; a `ur`
  that is neither a `UR` nor a string; an `RgbaImage` whose buffer is not
  `width × height × 4` bytes. Two of these differ in kind from the
  reference's handling of the nearest representable input: `size: 0` is
  rejected up front where the reference builds a 0×0 image and fails in
  `to_png` (`ImageEncode`), and `quality` 0 or above 100 is rejected where
  the reference's `image` crate clamps to 1–100.
- **Logo formats.** `Logo.fromImageBytes` decodes GIF (first frame) and
  BMP (24/32-bit uncompressed) in addition to PNG and JPEG; the reference is
  built with `image`'s `png` and `jpeg` features only and rejects GIF and
  BMP with `ImageEncode`. WebP decodes through the `/webp` entry
  (`logoFromWebp`). Extensions, not divergences: the reference has no
  accepting path for these bytes.
- **SVG initialisation.** `initSvgRenderer(wasm)` exists for runtimes other
  than Node, where the `@resvg/resvg-wasm` module cannot be read from disk.
  The rasterisation itself (`logoFromSvg`, `rasterizeSvg`) is byte-identical
  to `Logo::from_svg` for every SVG vector, square or not.
- **ProRes export.** The reference shells out to `ffmpeg` (`encode_prores`,
  `FfmpegNotFound`/`FfmpegFailed`); the port does the same, finds `ffmpeg`
  by scanning `PATH` (the reference uses `which`, Unix only), and carries
  ffmpeg's stderr in `details.stderr`. Neither is in the vectors, since the
  output depends on the installed encoder.
- **Encoded container bytes.** The GIF, PNG and JPEG encoders differ from
  the reference's (`gifenc` writes the first frame's palette as the global
  colour table, the `gif` crate writes an empty global table and a local
  palette per frame; `fast-png` and `jpeg-js` choose different filters and
  tables than `image`). The vectors compare what decodes: GIF frame count
  and logical-screen size, PNG pixels exactly, JPEG pixels within a
  per-channel epsilon of 25. Byte counts differ (a 512 px PNG is about
  11.9 kB here and 6.7 kB from the reference).
- **`fps` in animated GIFs.** Both sides write `round(100 / fps)`
  centiseconds per frame; the port additionally rejects a non-positive or
  non-finite `fps`, which the reference's `u16` cast saturates silently.

## 3. Mapping equivalences

- **Error codes.** The TypeScript `MurError.code` is the reference's `Error`
  variant name (`QrCodeTooDense`, `InsufficientFrames`, …); the harness maps
  variants by name. Messages after the variant prefix come from the wrapped
  library and may word the same failure differently (`QrEncode`: `data too
  long` on both sides; `ImageEncode`, `SvgRender`, `GifEncode`, `Io`: the
  library's text).
- **Enums.** `CorrectionLevel` and `LogoClearShape` are the reference's
  `Display` strings (`"low"`, `"circle"`, …); the harness passes them through
  `FromStr`. The letter aliases the reference's `FromStr` accepts (`l`, `m`,
  `q`, `h`) are a command-line concern (`parseCorrectionLevel` on `/cli`).
- **Colours.** `Color.from` accepts `#RGB`, `#RRGGBB`, `#RRGGBBAA` with or
  without the `#`, and `[r, g, b, a?]` tuples; `hex`/`toString()` print
  upper-case hex and omit the alpha when it is 255, and `isTransparent` is
  `alpha < 3`, exactly as the reference's `Display` and `is_transparent`.
  The "invalid hex digit" message reports the UTF-16 unit for non-ASCII
  characters where the reference reports the first UTF-8 byte (`255` vs
  `195` for `ÿ`); the code is the same.
- **UR payloads.** A UR string is upper-cased ASCII-only before encoding on
  both sides (`to_ascii_uppercase`), so `ur:bytes/ß` encodes the same bytes;
  the frame recipes build the `bytes` UR from the payload `i % 256` wrapped
  as a CBOR byte string on both sides.
- **Logo pixels.** The vectors describe raster logos as solid or gradient
  RGBA fills; both sides synthesise the same buffer and pass it to
  `Logo::from_rgba` / `Logo.fromRgba`, so the `InvalidParameter` for a clear
  border above 5 is raised by the same validation. `Logo.fromRgba` copies
  the buffer (the reference takes ownership of the `Vec`).
- **The command line.** `mur single`, `animate` and `frames` take the
  reference's arguments with the reference's defaults and print the same
  status lines and error messages; usage errors exit 2 (as clap does) and
  library errors exit 1. `--version` prints `mur <npm version>` where the
  reference prints `bc-mur <crate version>`; `--jpeg-quality` is validated
  as 1–100 at parse time (the reference's clap accepts 0–255 and the
  library clamps). `tests/rust-validation/cli-parity.ts` compares the two
  binaries when `MUR_REF_BIN` is set.

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit.
4. Update the tracked version at the top of this file.
5. Re-run `bun run test:rust`; add, amend, or remove entries as the port
   requires.
