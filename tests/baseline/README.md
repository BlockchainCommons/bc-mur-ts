# Frozen baseline build

`multipart-ur-baseline.mjs` is the self-contained ESM bundle of `@blockchaincommons/multipart-ur` as it
shipped at commit `ee0911c53f7d29545eb93bdb05a9af7991ef0474` (`1.0.0-beta.1`), with its `@blockchaincommons`
siblings and pure-JS encoders inlined. It also exports `encodeAnimatedGif`,
`logoFromSvg` and `rasterizeSvg` so the differential can drive every
encoder. `multipart-ur-baseline.d.mts` is the public surface at that commit.

`tests/differential.test.ts` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes outside the enumerated
tombstones; it pins the sha256 below so an accidental rebuild cannot turn the
differential into a self-comparison. Rebuild with
`bun scripts/build-baseline.mjs ee0911c`.

Baseline commit: ee0911c53f7d29545eb93bdb05a9af7991ef0474
Baseline sha256: c14f7a24013bc7751a9919d45451f0778d4ff37fb6006cb5cdfbaa4ffa5c05cc
