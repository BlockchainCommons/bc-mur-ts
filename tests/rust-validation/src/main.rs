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

/// A logo's dimensions and pixel hash, plus the pixel hash of the recipe's `render` with the logo composited.
fn logo_outcome(r: &Value, logo: &Logo) -> Result<String, Error> {
    let mut out = format!("{}x{} pixels={}", logo.width, logo.height, sha(&logo.pixels));
    if let Some(rv) = r.get("render") {
        let payload = s(rv, "payload").unwrap();
        let c = correction(&s(rv, "correction").unwrap());
        let size = u(rv, "size").unwrap() as u32;
        let qz = u(rv, "quietZone").unwrap() as u32;
        let img = if payload.starts_with("ur:") {
            render_ur_qr(&payload, c, size, Color::BLACK, Color::WHITE, qz, Some(logo))?
        } else {
            render_qr(&hex::decode(&payload).unwrap(), c, size, Color::BLACK, Color::WHITE, qz, Some(logo))?
        };
        out.push_str(&format!(" render={}", sha(&img.pixels)));
    }
    Ok(out)
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
            let params = AnimateParams {
                max_fragment_len: u(r, "maxFragmentLen").unwrap() as usize,
                size: u(r, "size").map(|x| x as u32).unwrap_or(32),
                logo: logo_of(r)?,
                ..Default::default()
            };
            let frames = generate_frames(&ur_of(u(r, "length").unwrap() as usize), &params)?;
            let n = (u(r, "frames").unwrap() as usize).min(frames.len());
            let bytes = encode_animated_gif(&frames[..n], f(r, "fps").unwrap())?;
            // Decoded as the `gif` crate reads it back: each frame as RGBA, and the first frame's delay.
            let mut options = gif::DecodeOptions::new();
            options.set_color_output(gif::ColorOutput::RGBA);
            let mut decoder = options.read_info(std::io::Cursor::new(&bytes)).expect("decode the GIF");
            let (width, height) = (decoder.width(), decoder.height());
            let mut hashes = Vec::new();
            let mut delay = 0;
            while let Some(frame) = decoder.read_next_frame().expect("read a frame") {
                if hashes.is_empty() {
                    delay = frame.delay;
                }
                hashes.push(sha(&frame.buffer));
            }
            Ok(format!("frames={} {}x{} delay={} hashes={}", hashes.len(), width, height, delay, hashes.join(",")))
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
            logo_outcome(r, &logo)
        }
        "logo-bytes" => {
            let bytes = hex::decode(s(r, "hex").unwrap()).unwrap();
            let logo = Logo::from_image_bytes(&bytes, 0.25, 1, LogoClearShape::Square)?;
            logo_outcome(r, &logo)
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

/// Classify an understood difference; None means MISMATCH.
fn classify(recipe: &Value, _expect: &str, _got: &str) -> Option<(&'static str, String)> {
    let kind = s(recipe, "k").unwrap_or_default();
    let name = s(recipe, "name").unwrap_or_default();
    // A JPEG logo: the reference decodes with zune-jpeg, the port with jpeg-js; two baseline decoders differ by a few units.
    if kind == "logo-bytes" && name.starts_with("jpeg") {
        return Some(("jpeg-decoder", "JPEG logo decoded by zune-jpeg there and jpeg-js here".into()));
    }
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
