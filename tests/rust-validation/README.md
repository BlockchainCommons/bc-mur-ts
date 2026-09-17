# Rust validation harness

Replays `tests/vectors/vectors.json` (209 vectors: single-frame renders of
byte and UR payloads at every correction level, size, quiet zone, colour
pair and logo layout — dimensions plus the SHA-256 of the RGBA buffer and
of the decoded PNG; bare module matrices as bit strings, including
mixed-mode and Shift-JIS payloads and non-ASCII UR strings; animated frame
sequences of a deterministic `bytes` UR — count, width, part indices and the
first frame's pixel hash; animated GIFs with and without logos — decoded
frame count, size, delay and every frame's pixel hash; SVG logos — the
rasterised pixels and a render with the logo; raster logos from bytes —
every PNG colour type and bit depth, a JPEG, and bytes of other formats;
JPEG round trips within the shared epsilon; density checks; colour parsing;
and the error code of every failing path) against the reference crate
`bc-mur` 0.1.0, pinned exactly from crates.io (`bc-ur`, `image` and `gif`
come from crates.io at the versions the crate resolves). The 41 `domain`
vectors pin what the TypeScript boundary rejects and have no Rust analog;
the harness counts them as `js-only`.

```sh
cd tests/rust-validation
cargo run --release --locked -- ../vectors/vectors.json
VERBOSE=1 cargo run --release --locked -- ../vectors/vectors.json      # every classified row
DUMP=/tmp/rust.json cargo run --release --locked -- ../vectors/vectors.json   # write every Rust outcome by name
```

The program exits 1 on any `MISMATCH`. Every comparable vector is compared
exactly: pixel and PNG hashes, matrix bits, module counts, frame counts and
part indices, decoded GIF frames (the `gif` crate with `ColorOutput::RGBA`
there, `omggif` here) and delays, SVG pixel hashes, logo pixel hashes, JPEG
epsilon verdicts, colour strings and `is_transparent`, and error codes (the
TypeScript `MurError.code` is the reference's `Error` variant name). The
`bytes` UR the frame recipes animate is built on both sides from the
payload `i % 256` wrapped as a CBOR byte string.

One class of difference is expected and counted, never a `MISMATCH`:

| Class | Meaning |
|---|---|
| `jpeg-decoder` | A `logo-bytes` row whose bytes are a JPEG: the reference decodes with `zune-jpeg`, the port with `jpeg-js`; the two baseline decoders differ by a few units per channel. |

`bun run test:rust` runs it from the package root; CI runs it as the
`rust-validation` job. `cli-parity.ts` compares the two command lines when
`MUR_REF_BIN` points at a built reference binary (`bun run test:cli-parity`).
