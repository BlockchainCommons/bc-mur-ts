//! Replays tests/vectors/vectors.json against bc-mur 0.1.0. Exits 1 on any MISMATCH.
//!
//!   cargo run --release -- ../vectors/vectors.json
use bc_mur::{
    check_qr_density, encode_animated_gif, generate_frames, qr_module_count, render_qr,
    render_ur_qr, AnimateParams, Color, CorrectionLevel, Error, Logo, LogoClearShape,
    RenderedImage,
};
use bc_ur::prelude::*;
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Deserialize)]
struct File {
    count: usize,
    vectors: Vec<Vector>,
}
#[derive(Deserialize)]
struct Vector {
    name: String,
    recipe: Value,
    expect: String,
}

/// `throw:<code>`: the TS `MurError.code`, which is the reference's variant name.
fn code(e: &Error) -> String {
    let name = match e {
        Error::QrEncode(_) => "QrEncode",
        Error::ImageEncode(_) => "ImageEncode",
        Error::SvgRender(_) => "SvgRender",
        Error::InvalidColor(_) => "InvalidColor",
        Error::InvalidParameter(_) => "InvalidParameter",
        Error::GifEncode(_) => "GifEncode",
        Error::FfmpegNotFound => "FfmpegNotFound",
        Error::FfmpegFailed(_) => "FfmpegFailed",
        Error::QrCodeTooDense { .. } => "QrCodeTooDense",
        Error::InsufficientFrames { .. } => "InsufficientFrames",
        Error::Io(_) => "Io",
        Error::Ur(_) => "Ur",
    };
    format!("throw:{name}")
}

fn s(v: &Value, k: &str) -> Option<String> {
    v.get(k).and_then(|x| x.as_str()).map(|x| x.to_string())
}
fn u(v: &Value, k: &str) -> Option<u64> {
    v.get(k).and_then(|x| x.as_u64())
}
fn f(v: &Value, k: &str) -> Option<f64> {
    v.get(k).and_then(|x| x.as_f64())
}
/// The largest per-channel difference a decoded JPEG may show against its source (the TS `JPEG_EPSILON`).
const JPEG_EPSILON: i32 = 25;

fn sha(b: &[u8]) -> String {
    hex::encode(Sha256::digest(b))
}

fn correction(name: &str) -> CorrectionLevel {
    match name {
        "low" => CorrectionLevel::Low,
        "medium" => CorrectionLevel::Medium,
        "quartile" => CorrectionLevel::Quartile,
        "high" => CorrectionLevel::High,
        other => panic!("correction {other}"),
    }
}
fn shape(name: &str) -> LogoClearShape {
    match name {
        "square" => LogoClearShape::Square,
        "circle" => LogoClearShape::Circle,
        other => panic!("clear shape {other}"),
    }
}
fn color_or(v: &Value, k: &str, fallback: Color) -> Result<Color, Error> {
    match s(v, k) {
        Some(h) => Color::from_hex(&h),
        None => Ok(fallback),
    }
}

/// The deterministic payload (`i % 256`) the frame recipes use, as a `bytes` UR.
fn ur_of(length: usize) -> UR {
    let bytes: Vec<u8> = (0..length).map(|i| (i % 256) as u8).collect();
    UR::new("bytes", CBOR::to_byte_string(bytes)).unwrap()
}

/// The recipe's `payload`: a UR string (upper-cased) or hex bytes.
fn message_of(payload: &str) -> Vec<u8> {
    if payload.starts_with("ur:") {
        payload.to_ascii_uppercase().into_bytes()
    } else {
        hex::decode(payload).unwrap()
    }
}

/// `logoPixels` from the recipes: a solid fill, or a gradient (R across x, alpha across y).
fn logo_of(v: &Value) -> Result<Option<Logo>, Error> {
    let Some(l) = v.get("logo") else { return Ok(None) };
    let width = u(l, "width").unwrap() as u32;
    let height = u(l, "height").unwrap() as u32;
    let solid = Color::from_hex(&s(l, "color").unwrap_or_else(|| "#FF0000".to_string()))?;
    let gradient = s(l, "fill").as_deref() == Some("gradient");
    let mut pixels = vec![0u8; (width * height * 4) as usize];
    for y in 0..height {
        for x in 0..width {
            let i = ((y * width + x) * 4) as usize;
            if gradient {
                let r = (255.0 * x as f64 / (width.max(2) - 1) as f64).round() as u8;
                let a = (255.0 * y as f64 / (height.max(2) - 1) as f64).round() as u8;
                pixels[i..i + 4].copy_from_slice(&[r, 64, 255 - r, a]);
            } else {
                pixels[i..i + 4].copy_from_slice(&[solid.r, solid.g, solid.b, solid.a]);
            }
        }
    }
    Logo::from_rgba(
        pixels,
        width,
        height,
        f(l, "fraction").unwrap(),
        u(l, "clearBorder").unwrap() as usize,
        shape(&s(l, "clearShape").unwrap()),
    )
    .map(Some)
}

fn render(v: &Value) -> Result<RenderedImage, Error> {
    let payload = s(v, "payload").unwrap();
    let c = correction(&s(v, "correction").unwrap());
    let size = u(v, "size").unwrap() as u32;
    let qz = u(v, "quietZone").unwrap() as u32;
    let fg = color_or(v, "foreground", Color::BLACK)?;
    let bg = color_or(v, "background", Color::WHITE)?;
    let logo = logo_of(v)?;
    if payload.starts_with("ur:") {
        render_ur_qr(&payload, c, size, fg, bg, qz, logo.as_ref())
    } else {
        render_qr(&hex::decode(&payload).unwrap(), c, size, fg, bg, qz, logo.as_ref())
    }
}

fn frame_params(v: &Value) -> AnimateParams {
    let mut p = AnimateParams { max_fragment_len: u(v, "maxFragmentLen").unwrap() as usize, ..Default::default() };
    if let Some(x) = u(v, "size") { p.size = x as u32 }
    if let Some(x) = s(v, "correction") { p.correction = Some(correction(&x)) }
    if let Some(x) = u(v, "cycles") { p.cycles = x as u32 }
    if let Some(x) = u(v, "frameCount") { p.frame_count = Some(x as usize) }
    if let Some(x) = u(v, "maxModules") { p.max_modules = Some(x as usize) }
    p
}

/// Counts the image descriptors in a GIF byte stream (the TS `countGifFrames`).
fn count_gif_frames(b: &[u8]) -> usize {
    let mut count = 0;
    let mut i = 13 + if b[10] & 0x80 != 0 { 3 << ((b[10] & 7) + 1) } else { 0 };
    while i < b.len() {
        match b[i] {
            0x3b => break,
            0x21 => {
                i += 2;
                while i < b.len() && b[i] != 0 { i += b[i] as usize + 1 }
                i += 1;
            }
            0x2c => {
                count += 1;
                let flags = b[i + 9];
                i += 10 + if flags & 0x80 != 0 { 3 << ((flags & 7) + 1) } else { 0 } + 1;
                while i < b.len() && b[i] != 0 { i += b[i] as usize + 1 }
                i += 1;
            }
            _ => break,
        }
    }
    count
}

fn run(r: &Value) -> Result<String, Error> {
    match s(r, "k").unwrap().as_str() {
        "render" => {
            let img = render(r)?;
            let png = img.to_png()?;
            let decoded = image::load_from_memory(&png).unwrap().to_rgba8().into_raw();
            Ok(format!("{}x{} pixels={} png={}", img.width, img.height, sha(&img.pixels), sha(&decoded)))
        }
        "matrix" => {
            let payload = s(r, "payload").unwrap();
            let c = correction(&s(r, "correction").unwrap());
            let modules = qr_module_count(&message_of(&payload), c)?;
            let img = if payload.starts_with("ur:") {
                render_ur_qr(&payload, c, modules as u32, Color::BLACK, Color::WHITE, 0, None)?
            } else {
                render_qr(&hex::decode(&payload).unwrap(), c, modules as u32, Color::BLACK, Color::WHITE, 0, None)?
            };
            let bits: String = img.pixels.chunks_exact(4).map(|px| if px[0] < 128 { '1' } else { '0' }).collect();
            Ok(format!("{modules}\n{bits}"))
        }
        "density" => {
            let modules = qr_module_count(&message_of(&s(r, "payload").unwrap()), correction(&s(r, "correction").unwrap()))?;
            check_qr_density(modules, u(r, "maxModules").unwrap() as usize)?;
            Ok(format!("ok {modules}"))
        }
        "frames" => {
            let frames = generate_frames(&ur_of(u(r, "length").unwrap() as usize), &frame_params(r))?;
            let indices: Vec<String> = frames.iter().map(|f| f.index.to_string()).collect();
            Ok(format!(
                "count={} width={} indices={} first={}",
                frames.len(),
                frames.first().map(|f| f.image.width).unwrap_or(0),
                indices.join(","),
                frames.first().map(|f| sha(&f.image.pixels)).unwrap_or_else(|| "-".to_string())
            ))
        }
        "gif" => {
            let params = AnimateParams { max_fragment_len: u(r, "maxFragmentLen").unwrap() as usize, size: 32, ..Default::default() };
            let frames = generate_frames(&ur_of(u(r, "length").unwrap() as usize), &params)?;
            let n = (u(r, "frames").unwrap() as usize).min(frames.len());
            let bytes = encode_animated_gif(&frames[..n], f(r, "fps").unwrap())?;
            Ok(format!("frames={} {}x{}", count_gif_frames(&bytes), frames[0].image.width, frames[0].image.height))
        }
        "color" => {
            let c = Color::from_hex(&s(r, "hex").unwrap())?;
            Ok(format!("{c} transparent={}", c.is_transparent()))
        }
        "svg" => {
            let logo = Logo::from_svg(
                s(r, "svg").unwrap().as_bytes(),
                f(r, "fraction").unwrap(),
                u(r, "clearBorder").unwrap() as usize,
                shape(&s(r, "clearShape").unwrap()),
            )?;
            let mut out = format!("{}x{} pixels={}", logo.width, logo.height, sha(&logo.pixels));
            if let Some(rv) = r.get("render") {
                let payload = s(rv, "payload").unwrap();
                let c = correction(&s(rv, "correction").unwrap());
                let size = u(rv, "size").unwrap() as u32;
                let qz = u(rv, "quietZone").unwrap() as u32;
                let img = if payload.starts_with("ur:") {
                    render_ur_qr(&payload, c, size, Color::BLACK, Color::WHITE, qz, Some(&logo))?
                } else {
                    render_qr(&hex::decode(&payload).unwrap(), c, size, Color::BLACK, Color::WHITE, qz, Some(&logo))?
                };
                out.push_str(&format!(" render={}", sha(&img.pixels)));
            }
            Ok(out)
        }
        "jpeg" => {
            let payload = s(r, "payload").unwrap();
            let c = correction(&s(r, "correction").unwrap());
            let size = u(r, "size").unwrap() as u32;
            let img = if payload.starts_with("ur:") {
                render_ur_qr(&payload, c, size, Color::BLACK, Color::WHITE, 1, None)?
            } else {
                render_qr(&hex::decode(&payload).unwrap(), c, size, Color::BLACK, Color::WHITE, 1, None)?
            };
            let bytes = img.to_jpeg(u(r, "quality").unwrap() as u8)?;
            let decoded = image::load_from_memory(&bytes).unwrap().to_rgba8();
            let raw = decoded.as_raw();
            let max = img.pixels.chunks_exact(4).zip(raw.chunks_exact(4)).flat_map(|(a, b)| (0..3).map(move |i| (a[i] as i32 - b[i] as i32).abs())).max().unwrap_or(0);
            Ok(format!("{}x{} {}", decoded.width(), decoded.height(), if max <= JPEG_EPSILON { format!("within {JPEG_EPSILON}") } else { format!("beyond {JPEG_EPSILON}") }))
        }
        other => panic!("recipe kind {other}"),
    }
}

fn outcome(r: &Value) -> String {
    match catch_unwind(AssertUnwindSafe(|| run(r))) {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => code(&e),
        Err(p) => {
            let msg = p.downcast_ref::<String>().cloned().or_else(|| p.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
            format!("panic:{msg}")
        }
    }
}

/// Classify an understood difference; None means MISMATCH. Every vector is
/// compared exactly today: there is no recorded divergence class.
fn classify(_recipe: &Value, _expect: &str, _got: &str) -> Option<(&'static str, String)> {
    None
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: mur-validation <vectors.json>");
    let file: File = serde_json::from_str(&std::fs::read_to_string(&path).expect("read vectors")).expect("parse vectors");
    assert_eq!(file.count, file.vectors.len(), "count field");
    std::panic::set_hook(Box::new(|_| {}));
    let verbose = std::env::var("VERBOSE").is_ok();
    let dump = std::env::var("DUMP").ok();
    let (mut matches, mut expected, mut mismatches, mut js_only) = (0, 0, 0, 0);
    let mut classes: BTreeMap<&str, usize> = BTreeMap::new();
    let mut outcomes = serde_json::Map::new();
    for v in &file.vectors {
        if s(&v.recipe, "k").as_deref() == Some("domain") {
            js_only += 1;
            continue;
        }
        let got = outcome(&v.recipe);
        outcomes.insert(v.name.clone(), Value::String(got.clone()));
        if got == v.expect {
            matches += 1;
        } else if let Some((class, note)) = classify(&v.recipe, &v.expect, &got) {
            expected += 1;
            *classes.entry(class).or_default() += 1;
            if verbose {
                eprintln!("expected-divergence [{class}] {} ({note})\n  rust: {}\n  ts:   {}", v.name, got.replace('\n', "\\n"), v.expect.replace('\n', "\\n"));
            }
        } else {
            mismatches += 1;
            eprintln!("MISMATCH {}\n  rust: {}\n  ts:   {}", v.name, got.replace('\n', "\\n"), v.expect.replace('\n', "\\n"));
        }
    }
    if let Some(p) = dump {
        std::fs::write(&p, serde_json::to_string_pretty(&Value::Object(outcomes)).unwrap()).expect("write dump");
    }
    for (c, n) in &classes {
        println!("expected-divergence [{c}] x{n}");
    }
    println!("{} vectors - {matches} match, {expected} expected-divergence, {js_only} js-only, {mismatches} MISMATCH", file.vectors.len());
    if mismatches > 0 {
        std::process::exit(1);
    }
}
