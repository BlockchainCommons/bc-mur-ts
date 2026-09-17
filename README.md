# Blockchain Commons Multipart UR QR Codes

### _by Leonardo Custodio_

**`bc-mur-ts`** renders Uniform Resources as single-frame and animated fountain-coded QR sequences, with optional logo overlay.

`@blockchaincommons/multipart-ur` is a multipart [Uniform Resource (UR)](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-005-ur.md) QR code generator. It produces single-frame and animated fountain-coded QR sequences — suitable for transmitting arbitrarily large UR-encoded payloads through an airgap — with an optional logo overlay.

This package provides:

- Single-frame QR code rendering from raw bytes or UR strings
- Logo overlay with module-aligned compositing (square or circle clear shape)
- Animated multipart fountain-coded QR sequences (GIF output)
- ProRes 4444 encoding via optional ffmpeg integration (Node only)
- Frame dump as numbered PNGs for custom pipelines
- Configurable QR error correction level, colors, quiet zone, and module size
- Density safety checks to prevent unreadable QR codes
- CLI tool `mur` with `single`, `animate`, and `frames` subcommands

The root entry is browser-compatible and loads no WASM. The encoders that need more are their own entries: `/gif`, `/svg-logo`, `/prores` (Node, with `ffmpeg` on `PATH`) and `/cli`.

## Installation Instructions

[@blockchaincommons/multipart-ur](https://www.npmjs.com/package/@blockchaincommons/multipart-ur) is published to npm. Install it with your package manager of choice:

```sh
npm install @blockchaincommons/multipart-ur
# or
pnpm add @blockchaincommons/multipart-ur
# or
yarn add @blockchaincommons/multipart-ur
# or
bun add @blockchaincommons/multipart-ur
```

## Usage Instructions

```typescript
import { readFile } from "node:fs/promises";
import { cbor } from "@blockchaincommons/dcbor";
import { UR } from "@blockchaincommons/uniform-resources";
import { renderUrQr, generateFrames, Color, MurError } from "@blockchaincommons/multipart-ur";
import { encodeAnimatedGif } from "@blockchaincommons/multipart-ur/gif";
import { logoFromSvg } from "@blockchaincommons/multipart-ur/svg-logo";

// One QR code: every option has a default.
const image = renderUrQr("ur:bytes/hdcxdwinvezm", { size: 256, correction: "medium" });
const png = image.toPng(); // image.width, image.height, image.pixels (RGBA)

// With a logo (correction defaults to "high" when a logo is present).
const svg = new Uint8Array(await readFile("logo.svg"));
const logo = await logoFromSvg(svg, { fraction: 0.25, clearBorder: 1, clearShape: "circle" });
const branded = renderUrQr("ur:bytes/hdcxdwinvezm", { logo, foreground: "#1A1A1A", background: Color.WHITE });

// An animated fountain-coded sequence of a large UR.
const ur = UR.from("bytes", cbor(new Uint8Array(1500)));
const frames = generateFrames(ur, { maxFragmentLen: 100, cycles: 3, maxModules: 117 });
const gif = encodeAnimatedGif(frames, { fps: 8 });

try {
  generateFrames(ur, { maxFragmentLen: 100, frameCount: 1 });
} catch (e) {
  if (MurError.isMurError(e) && e.code === "InsufficientFrames") {
    console.log(e.details.requested, e.details.fragments); // typed by the code
  }
}
```

| Entry | Exports | Loads | Runs in |
|---|---|---|---|
| `@blockchaincommons/multipart-ur` | `renderQr`, `renderUrQr`, `RenderedImage`, `generateFrames`, `writeFramePngs` (Node), `Logo` (RGBA, PNG, JPEG), `Color`, `qrModuleCount`, `checkQrDensity`, `DEFAULT_MAX_MODULES`, `MurError` | `uniform-resources`, `fast-png`, `jpeg-js` | browsers and Node |
| `/gif` | `encodeAnimatedGif(frames, { fps })` | `gifenc` | browsers and Node |
| `/svg-logo` | `logoFromSvg`, `initSvgRenderer` | `@resvg/resvg-wasm` | Node (auto-loads the WASM), browsers after `initSvgRenderer(wasm)` |
| `/prores` | `encodeProres(frames, { fps, outputPath })` | `ffmpeg` on `PATH` | Node |
| `/cli` | `program`, `runCli`, `single`, `animate`, `frames` | `commander` | Node |

The `mur` command line (`mur single`, `mur animate`, `mur frames`) is installed with the package; usage errors exit 2, other errors 1.

Runnable examples live in the [`examples/`](https://github.com/BlockchainCommons/bc-mur-ts/tree/master/examples) directory: `single-png.ts`, `animated-gif.ts`, `svg-logo.ts`, `frames-to-disk.ts` (`bun examples/<name>.ts`).

## Status - Beta

`bc-mur-ts` is currently under active development and in beta testing. It should not be used for production tasks until it has had further testing and auditing. See [Blockchain Commons' Development Phases](https://github.com/BlockchainCommons/Community/blob/master/release-path.md).

### Version History

- **1.0.0-beta.3 (September 17, 2026)** - PNG logos decode as palettes, `tRNS`, 16-bit; PNG and JPEG only; the GIF delay saturation, JPEG quality clamp and messages; `Color.fromHex`; the enum parsers on the root entry.
- **1.0.0-beta.2 (September 16, 2026)** - In-house QR encoder matching the Rust reference module for module; validated argument domains; typed error details; exact SVG placement; CLI exit statuses.
- **1.0.0-beta.1 (September 9, 2026)** - Initial beta implementation.

### Roadmap

- Continued testing and auditing on the path from beta to a stable **1.0.0** release.
- Continued parity with the Rust reference implementation as it evolves (see [`RUST_DIVERGENCES.md`](./RUST_DIVERGENCES.md)).

### Dependencies

`@blockchaincommons/multipart-ur` depends on `@blockchaincommons/uniform-resources`, `@resvg/resvg-wasm`, `commander`, `fast-png`, `gifenc`, `jpeg-js` at runtime; the root entry loads only `uniform-resources`, `fast-png` and `jpeg-js`. The QR encoder (`src/qr/`) is derived from the Rust [`qrcode`](https://crates.io/crates/qrcode) crate (MIT/Apache-2.0) and the GIF quantiser (`src/neuquant.ts`) from the Rust [`color_quant`](https://crates.io/crates/color_quant) crate (MIT), so symbols and animated frames are the reference's.

To build and work on this library, you'll need the following tools:

- [Node.js](https://nodejs.org/) >= 22.12 - JavaScript runtime.
- [Bun](https://bun.sh/) - used to install dependencies and run scripts (any node package manager works).
- [TypeScript](https://www.typescriptlang.org/) >= 5.7 - language and type checker.

### Derived from ...

This `bc-mur-ts` project is either derived from or was inspired by:

- [BlockchainCommons/bc-sskr-rust](https://github.com/BlockchainCommons/bc-sskr-rust) - The reference Rust implementation, by [Wolf McNally](https://github.com/wolfmcnally).
- [paritytech/bcts](https://github.com/paritytech/bcts) - A TypeScript port of many Blockchain Commons' specs, by [Parity Technologies](https://github.com/paritytech).
## Financial Support

`bc-mur-ts` is a project of [Blockchain Commons](https://www.blockchaincommons.com/). We are proudly a "not-for-profit" social benefit corporation committed to open source & open development. Our work is funded entirely by donations and collaborative partnerships with people like you. Every contribution will be spent on building open tools, technologies, and techniques that sustain and advance blockchain and internet security infrastructure and promote an open web.

To financially support further development of `bc-mur-ts` and other projects, please consider becoming a Patron of Blockchain Commons through ongoing monthly patronage as a [GitHub Sponsor](https://github.com/sponsors/BlockchainCommons). You can also support Blockchain Commons with bitcoins at our [BTCPay Server](https://btcpay.blockchaincommons.com/).

## Contributing

We encourage public contributions through issues and pull requests! Please review [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our development process. All contributions to this repository require a GPG signed [Contributor License Agreement](./CLA.md).

### Discussions

The best place to talk about Blockchain Commons and its projects is in our GitHub Discussions areas.

[**Gordian Developer Community**](https://github.com/BlockchainCommons/Gordian-Developer-Community/discussions). For standards and open-source developers who want to talk about interoperable wallet specifications, please use the Discussions area of the [Gordian Developer Community repo](https://github.com/BlockchainCommons/Gordian-Developer-Community/discussions). This is where you talk about Gordian specifications such as [Gordian Envelope](https://github.com/BlockchainCommons/Gordian/tree/master/Envelope#articles), [bc-shamir](https://github.com/BlockchainCommons/bc-shamir), [Sharded Secret Key Reconstruction](https://github.com/BlockchainCommons/bc-sskr), and [bc-ur](https://github.com/BlockchainCommons/bc-ur) as well as the larger [Gordian Architecture](https://github.com/BlockchainCommons/Gordian/blob/master/Docs/Overview-Architecture.md), its [Principles](https://github.com/BlockchainCommons/Gordian#gordian-principles) of independence, privacy, resilience, and openness, and its macro-architectural ideas such as functional partition (including airgapping, the original name of this community).

[**Gordian User Community**](https://github.com/BlockchainCommons/Gordian/discussions). For users of the Gordian reference apps, including [Gordian Coordinator](https://github.com/BlockchainCommons/iOS-GordianCoordinator), [Gordian Seed Tool](https://github.com/BlockchainCommons/GordianSeedTool-iOS), [Gordian Server](https://github.com/BlockchainCommons/GordianServer-macOS), [Gordian Wallet](https://github.com/BlockchainCommons/GordianWallet-iOS), and [SpotBit](https://github.com/BlockchainCommons/spotbit) as well as our whole series of [CLI apps](https://github.com/BlockchainCommons/Gordian/blob/master/Docs/Overview-Apps.md#cli-apps). This is a place to talk about bug reports and feature requests as well as to explore how our reference apps embody the [Gordian Principles](https://github.com/BlockchainCommons/Gordian#gordian-principles).

[**Blockchain Commons Discussions**](https://github.com/BlockchainCommons/Community/discussions). For developers, interns, and patrons of Blockchain Commons, please use the discussions area of the [Community repo](https://github.com/BlockchainCommons/Community) to talk about general Blockchain Commons issues, the intern program, or topics other than those covered by the [Gordian Developer Community](https://github.com/BlockchainCommons/Gordian-Developer-Community/discussions) or the 
[Gordian User Community](https://github.com/BlockchainCommons/Gordian/discussions).

### Other Questions & Problems

As an open-source, open-development community, Blockchain Commons does not have the resources to provide direct support of our projects. Please consider the discussions area as a locale where you might get answers to questions. Alternatively, please use this repository's [issues](https://github.com/BlockchainCommons/bc-mur-ts/issues) feature. Unfortunately, we can not make any promises on response time.

If your company requires support to use our projects, please feel free to contact us directly about options. We may be able to offer you a contract for support from one of our contributors, or we might be able to point you to another entity who can offer the contractual support that you need.

### Credits

The following people directly contributed to this repository. You can add your name here by getting involved. The first step is learning how to contribute from our [CONTRIBUTING.md](./CONTRIBUTING.md) documentation.

| Name              | Role                | Github                                            | Email                                 | GPG Fingerprint                                    |
| ----------------- | ------------------- | ------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| Christopher Allen | Principal Architect | [@ChristopherA](https://github.com/ChristopherA) | \<ChristopherA@LifeWithAlacrity.com\> | FDFE 14A5 4ECB 30FC 5D22  74EF F8D3 6C91 3574 05ED |
| Wolf McNally      | Lead Researcher/Engineer | [@wolfmcnally](https://github.com/wolfmcnally) | \<Wolf@WolfMcNally.com\> | 9436 52EE 3844 1760 C3DC  3536 4B6C 2FCF 8947 80AE |
| Leonardo Custodio | Software Engineer | [@leonardocustodio](https://github.com/leonardocustodio) | \<leonardo@snowpine.io\> | 59DA D997 67EF 3BAB 2B90 D057 5384 DEF3 B582 450D |

### Contributing Sponsor

**Blockchain Commons Multipart UR QR Codes for TypeScript** was produced as a collaboration between Blockchain Commons and one of our patrons, [Parity Technologies](https://parity.io): Parity wrote the wrappers based on Blockchain Commons' specifications and reference libraries. Blockchain Commons is dedicated to not just creating open infrastructure on our own, but also coordinating the work of other companies in benefiting the Commons. Thanks to Parity for working directly with us in this manner.

![](.github/assets/parity.svg)

## Responsible Disclosure

We want to keep all of our software safe for everyone. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner. We are unfortunately not able to offer bug bounties at this time.

We do ask that you offer us good faith and use best efforts not to leak information or harm any user, their data, or our developer community. Please give us a reasonable amount of time to fix the issue before you publish it. Do not defraud our users or us in the process of discovery. We promise not to bring legal action against researchers who point out a problem provided they do their best to follow the these guidelines.

### Reporting a Vulnerability

Please report suspected security vulnerabilities in private via email to ChristopherA@BlockchainCommons.com (do not use this email for support). Please do NOT create publicly viewable issues for suspected security vulnerabilities.

The following keys may be used to communicate sensitive information to developers:

| Name              | Fingerprint                                        |
| ----------------- | -------------------------------------------------- |
| Christopher Allen | FDFE 14A5 4ECB 30FC 5D22  74EF F8D3 6C91 3574 05ED |

You can import a key by running the following command with that individual’s fingerprint: `gpg --recv-keys "<fingerprint>"` Ensure that you put quotes around fingerprints that contain spaces.
