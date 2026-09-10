import { createRequire } from "module";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region tests/baseline/.src/src/error.ts
const MUR_ERROR_CODES = [
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
	"Ur"
];
/**
* The library's error: `code` names the reference variant, `details` carries
* the variant's fields, `message` is the reference `Display` text, and
* `cause` is the wrapped error when a dependency failed.
*/
var MurError = class MurError extends Error {
	name = "MurError";
	code;
	details;
	constructor(message, details, cause) {
		super(message, cause === void 0 ? void 0 : { cause });
		this.code = details.code;
		this.details = details;
	}
	static isMurError(value) {
		return value instanceof Error && value.name === "MurError" && "code" in value;
	}
	is(code) {
		return this.code === code;
	}
	static withMessage(code, prefix, message, cause) {
		return new MurError(`${prefix}${message}`, {
			code,
			message
		}, cause);
	}
	static qrEncode(message, cause) {
		return MurError.withMessage("QrEncode", "QR encoding failed: ", message, cause);
	}
	static imageEncode(message, cause) {
		return MurError.withMessage("ImageEncode", "Image encoding failed: ", message, cause);
	}
	static svgRender(message, cause) {
		return MurError.withMessage("SvgRender", "SVG rendering failed: ", message, cause);
	}
	static invalidColor(message) {
		return MurError.withMessage("InvalidColor", "Invalid color: ", message);
	}
	static invalidParameter(message) {
		return MurError.withMessage("InvalidParameter", "Invalid parameter: ", message);
	}
	static gifEncode(message, cause) {
		return MurError.withMessage("GifEncode", "GIF encoding failed: ", message, cause);
	}
	static ffmpegNotFound() {
		return new MurError("ffmpeg not found on PATH — install ffmpeg for ProRes output", { code: "FfmpegNotFound" });
	}
	static ffmpegFailed(message, cause) {
		return MurError.withMessage("FfmpegFailed", "ffmpeg failed: ", message, cause);
	}
	static qrCodeTooDense(moduleCount, maxModules) {
		return new MurError(`QR code too dense: ${moduleCount} modules exceeds limit of ${maxModules} (reduce data size, lower error correction, or increase --max-modules)`, {
			code: "QrCodeTooDense",
			moduleCount,
			maxModules
		});
	}
	static insufficientFrames(requested, fragments) {
		return new MurError(`insufficient frames: ${requested} requested but message requires at least ${fragments} fragments`, {
			code: "InsufficientFrames",
			requested,
			fragments
		});
	}
	static io(message, cause) {
		return MurError.withMessage("Io", "IO error: ", message, cause);
	}
	static ur(message, cause) {
		return MurError.withMessage("Ur", "UR error: ", message, cause);
	}
};
/** The message of any thrown value, for wrapping into a `MurError`. */
function messageOf(e) {
	return e instanceof Error ? e.message : String(e);
}
//#endregion
//#region tests/baseline/.src/src/color.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
/** An 8-bit RGBA colour. */
var Color = class Color {
	r;
	g;
	b;
	a;
	constructor(r, g, b, a = 255) {
		this.r = r & 255;
		this.g = g & 255;
		this.b = b & 255;
		this.a = a & 255;
	}
	static BLACK = new Color(0, 0, 0, 255);
	static WHITE = new Color(255, 255, 255, 255);
	static TRANSPARENT = new Color(0, 0, 0, 0);
	/**
	* A colour from `#RGB`, `#RRGGBB` or `#RRGGBBAA` (the `#` is optional),
	* an `[r, g, b]` or `[r, g, b, a]` tuple, or a `Color`.
	*/
	static from(input) {
		if (input instanceof Color) return input;
		if (typeof input === "string") return parseHex(input);
		return new Color(input[0], input[1], input[2], input[3] ?? 255);
	}
	/** The `[r, g, b, a]` bytes. */
	get bytes() {
		return Uint8Array.of(this.r, this.g, this.b, this.a);
	}
	/** `#RRGGBB`, or `#RRGGBBAA` when not fully opaque. */
	get hex() {
		const r = hexOf(this.r);
		const g = hexOf(this.g);
		const b = hexOf(this.b);
		return this.a === 255 ? `#${r}${g}${b}` : `#${r}${g}${b}${hexOf(this.a)}`;
	}
	/** Alpha below 3 of 255 counts as transparent (the logo's clear colour falls back to white). */
	get isTransparent() {
		return this.a < 3;
	}
	equals(other) {
		return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
	}
	toString() {
		return this.hex;
	}
};
function hexOf(byte) {
	return byte.toString(16).padStart(2, "0").toUpperCase();
}
function parseHex(s) {
	const stripped = s.startsWith("#") ? s.slice(1) : s;
	switch (stripped.length) {
		case 3: {
			const r = hexNibble(stripped.charCodeAt(0));
			const g = hexNibble(stripped.charCodeAt(1));
			const b = hexNibble(stripped.charCodeAt(2));
			return new Color(r << 4 | r, g << 4 | g, b << 4 | b, 255);
		}
		case 6: return new Color(hexByte(stripped, 0), hexByte(stripped, 2), hexByte(stripped, 4), 255);
		case 8: return new Color(hexByte(stripped, 0), hexByte(stripped, 2), hexByte(stripped, 4), hexByte(stripped, 6));
		default: throw MurError.invalidColor(`expected #RGB, #RRGGBB, or #RRGGBBAA, got: #${stripped}`);
	}
}
function hexNibble(b) {
	if (b >= 48 && b <= 57) return b - 48;
	if (b >= 97 && b <= 102) return b - 97 + 10;
	if (b >= 65 && b <= 70) return b - 65 + 10;
	throw MurError.invalidColor(`invalid hex digit: ${b}`);
}
function hexByte(s, at) {
	return hexNibble(s.charCodeAt(at)) << 4 | hexNibble(s.charCodeAt(at + 1));
}
//#endregion
//#region tests/baseline/.src/src/correction.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
const CORRECTION_LEVELS = [
	"low",
	"medium",
	"quartile",
	"high"
];
/** @internal The `qrcode-generator` letter of a level; unknown levels are an `InvalidParameter`. */
function correctionLevelToLetter(level) {
	switch (level) {
		case "low": return "L";
		case "medium": return "M";
		case "quartile": return "Q";
		case "high": return "H";
		default: throw MurError.invalidParameter(`unknown correction level: ${String(level)} (expected low, medium, quartile, or high)`);
	}
}
//#endregion
//#region ../bc-ur-ts/dist/domain-BEYQUr-y.mjs
/** The received value of an `InvalidParameter`, rendered so that no two values read alike. */
function render(value) {
	if (typeof value === "bigint") return `${value}n`;
	if (typeof value === "number") return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : String(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "function") return "function";
	if (Array.isArray(value)) return "Array";
	if (typeof value === "object" && value !== null) {
		const name = value.constructor?.name;
		return typeof name === "string" && name !== "" ? name : "object";
	}
	return String(value);
}
/**
* Thrown for malformed UR strings (`InvalidScheme`, `TypeUnspecified`,
* `InvalidType`, `NotSinglePart`), a type other than the one expected
* (`UnexpectedType`), a bytewords failure in `decodeBytewords`
* (`Bytewords`), CBOR failures (`Cbor`), anything the reference's `ur`
* crate rejects inside a UR string or a part (`Decoder`: bytewords inside a
* UR string, the header, the part CBOR, the fountain decoder), an argument
* outside its domain (`InvalidParameter`) and a tag with no name to build a
* UR type from (`TagUnnamed`). Codes and messages are the reference's
* wherever it has an outcome; branch on `code`.
*
* Instances come from the static factories only; a wrapped CBOR or part
* error is the `cause`.
*
* @example
* ```ts
* try {
*   UR.parse(s);
* } catch (e) {
*   if (URError.isURError(e) && e.is("UnexpectedType")) {
*     // e.details.expected, e.details.found
*   }
* }
* ```
*/
var URError = class URError extends Error {
	/** Always `"URError"`; the cross-copy identity {@link URError.isURError} checks. */
	name = "URError";
	/** The discriminant; equals `details.code`. */
	code;
	/** The structured payload, discriminated by `code`. */
	details;
	constructor(message, details, cause) {
		super(message, cause === void 0 ? void 0 : { cause });
		this.code = details.code;
		this.details = details;
	}
	/** Type guard for a `URError`, including one from another copy of this package. */
	static isURError(value) {
		return value instanceof Error && value.name === "URError" && "code" in value;
	}
	/** `true` when `code` is this error's code. */
	is(code) {
		return this.code === code;
	}
	/** The string does not start with `ur:`. */
	static invalidScheme() {
		return new URError("invalid UR scheme", { code: "InvalidScheme" });
	}
	/** The string has no `/` after the scheme, so no type. */
	static typeUnspecified() {
		return new URError("no UR type specified", { code: "TypeUnspecified" });
	}
	/** The type uses a character outside `[a-z0-9-]`. */
	static invalidType() {
		return new URError("invalid UR type", { code: "InvalidType" });
	}
	/** A well-formed multipart header where a single-part UR was required. */
	static notSinglePart() {
		return new URError("UR is not a single-part", { code: "NotSinglePart" });
	}
	/** The UR's type is `found` where `expected` was required. */
	static unexpectedType(expected, found) {
		return new URError(`expected UR type ${expected}, but found ${found}`, {
			code: "UnexpectedType",
			expected,
			found
		});
	}
	/** A `decodeBytewords` failure, in the reference's words. */
	static bytewords(message) {
		return new URError(`Bytewords error (${message})`, { code: "Bytewords" });
	}
	/** A CBOR failure; the dcbor error is the `cause` when one was caught. */
	static cbor(message, cause) {
		return new URError(`CBOR error (${message})`, { code: "Cbor" }, cause);
	}
	/** Anything the reference's `ur` crate rejects, in its words (its `Error::UR`). */
	static decoder(message, cause) {
		return new URError(`UR decoder error (${message})`, { code: "Decoder" }, cause);
	}
	/** `parameter` must be `requirement`; `value` is what was received, rendered exactly. */
	static invalidParameter(parameter, value, requirement) {
		return new URError(`${parameter} must be ${requirement}, got ${render(value)}`, {
			code: "InvalidParameter",
			parameter,
			value
		});
	}
	/** `tag` has no registered name, or (`undefined`) the codec has no tag at all. */
	static tagUnnamed(tag) {
		return new URError(tag === void 0 ? "the codec has no tags; a UR type needs a named tag" : `CBOR tag ${String(tag)} must have a name; register the tags first`, {
			code: "TagUnnamed",
			tag
		});
	}
};
/**
* The argument domains the reference's types imply, checked before any
* work is done. TypeScript has no integer widths and no static types at
* run time: a value outside its domain is `URError` `InvalidParameter`
* when it was an argument, while what comes off the wire is `Decoder`.
*
* @module domain
*/
/** `u32`: the fountain checksum. */
const U32 = {
	min: 0,
	max: 4294967295
};
/** A positive `usize` within `number` precision: fragment lengths and counters that start at 1. */
const POSITIVE = {
	min: 1,
	max: Number.MAX_SAFE_INTEGER
};
/** A `usize` within `number` precision: the fountain part counters. */
const NON_NEGATIVE = {
	min: 0,
	max: Number.MAX_SAFE_INTEGER
};
/** The reference's 64-bit `usize` maximum. */
const USIZE_MAX = 18446744073709551615n;
/** `true` when `value` is an integer `number` within `bounds`. */
function isIntIn(value, bounds) {
	return typeof value === "number" && Number.isInteger(value) && value >= bounds.min && value <= bounds.max;
}
/** Throws `InvalidParameter` unless `value` is an integer within `bounds`. */
function expectInt(parameter, value, bounds) {
	if (!isIntIn(value, bounds)) throw URError.invalidParameter(parameter, value, `an integer in [${bounds.min}, ${bounds.max}]`);
	return value;
}
/**
* `value` as an exact `usize`: a safe integer `number` or a `bigint` in
* `[0, USIZE_MAX]`, as a `bigint`; `undefined` for anything else. A
* `number` of 2^53 or more stands for several integers, so it is not
* accepted: the `bigint` form is exact.
*/
function usizeOf(value) {
	if (typeof value === "bigint") return value >= 0n && value <= 18446744073709551615n ? value : void 0;
	if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : void 0;
}
/** Throws `InvalidParameter` unless `value` is a `usize` of at least `min`. */
function expectUsize(parameter, value, min) {
	const usize = usizeOf(value);
	if (usize === void 0 || usize < min) throw URError.invalidParameter(parameter, value, `an integer in [${min}, ${Number.MAX_SAFE_INTEGER}] or a bigint in [${min}, ${USIZE_MAX}]`);
	return usize;
}
/** A `Uint8Array` from any realm (`Buffer` included), never another typed array. */
function isBytes$2(value) {
	return value instanceof Uint8Array || ArrayBuffer.isView(value) && value.constructor.name === "Uint8Array";
}
/** Throws `InvalidParameter` unless `value` is a `Uint8Array`. */
function expectBytes(parameter, value) {
	if (!isBytes$2(value)) throw URError.invalidParameter(parameter, value, "a Uint8Array");
	return value;
}
/** Throws `InvalidParameter` unless `value` is a string. */
function expectString(parameter, value) {
	if (typeof value !== "string") throw URError.invalidParameter(parameter, value, "a string");
	return value;
}
/** Throws `InvalidParameter` unless `value` is a non-null object. */
function expectRecord(parameter, value) {
	if (typeof value !== "object" || value === null) throw URError.invalidParameter(parameter, value, "an object");
	return value;
}
/** `value` when it is one of `allowed`, `fallback` when it is `undefined`; `InvalidParameter` otherwise. */
function expectChoice(parameter, value, allowed, fallback) {
	if (value === void 0) return fallback;
	if (typeof value === "string" && allowed.includes(value)) return value;
	throw URError.invalidParameter(parameter, value, `one of ${allowed.map((s) => JSON.stringify(s)).join(", ")}`);
}
//#endregion
//#region ../../node_modules/@noble/hashes/utils.js
/**
* Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
* @param a - value to test
* @returns `true` when the value is a Uint8Array-compatible view.
* @example
* Check whether a value is a Uint8Array-compatible view.
* ```ts
* isBytes(new Uint8Array([1, 2, 3]));
* ```
*/
function isBytes$1(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
const atitle$1 = (title) => title ? `"${title}" ` : "";
/**
* Asserts something is a non-negative integer.
* @param n - number to validate
* @param title - label included in thrown errors
* @returns The validated number.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a non-negative integer option.
* ```ts
* anumber(32, 'length');
* ```
*/
function anumber$1(n, title = "") {
	if (typeof n !== "number") throw new TypeError(atitle$1(title) + "expected number, got " + typeof n);
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle$1(title) + "expected integer >= 0, got " + n);
	return n;
}
/**
* Asserts something is Uint8Array.
* @param value - value to validate
* @param length - optional exact length constraint
* @param title - label included in thrown errors
* @returns The validated byte array.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate that a value is a byte array.
* ```ts
* abytes(new Uint8Array([1, 2, 3]));
* ```
*/
function abytes$1(value, length, title = "") {
	if (isBytes$1(value) && (length === void 0 || value.length === length)) return value;
	if (length !== void 0) anumber$1(length, "length");
	const bytes = isBytes$1(value);
	const ofLen = length !== void 0 ? ` of length ${length}` : "";
	const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
	const message = atitle$1(title) + "expected Uint8Array" + ofLen + ", got " + got;
	if (!bytes) throw new TypeError(message);
	throw new RangeError(message);
}
/**
* Asserts something is a wrapped hash constructor.
* @param h - hash constructor to validate
* @throws On wrong argument types or invalid hash wrapper shape. {@link TypeError}
* @throws On invalid hash metadata ranges or values. {@link RangeError}
* @throws If the hash metadata allows empty outputs or block sizes. {@link Error}
* @example
* Validate a callable hash wrapper.
* ```ts
* import { ahash } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* ahash(sha256);
* ```
*/
function ahash(h) {
	if (typeof h !== "function" || typeof h.create !== "function") throw new TypeError("expected hash wrapped by utils.createHasher");
	anumber$1(h.outputLen);
	anumber$1(h.blockLen);
	if (h.outputLen < 1 || h.blockLen < 1) throw new Error("hash blockLen / outputLen must be >= 1");
}
const aobject$1 = (value, label) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
const aopts = (value, label) => {
	aobject$1(value, label);
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) throw new TypeError(`"${label}" expected plain object`);
	if (Object.hasOwn(value, "__proto__")) throw new TypeError(`"${label}.__proto__" is not allowed`);
};
/**
* Asserts a hash instance has not been destroyed or finished.
* @param instance - hash instance to validate
* @param checkFinished - whether to reject finalized instances
* @throws If the hash instance has already been destroyed or finalized. {@link Error}
* @example
* Validate that a hash instance is still usable.
* ```ts
* import { aexists } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aexists(hash);
* ```
*/
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("hash was destroyed");
	if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
* Asserts output is a sufficiently-sized byte array.
* @param out - destination buffer
* @param instance - hash instance providing output length
* Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a caller-provided digest buffer.
* ```ts
* import { aoutput } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aoutput(new Uint8Array(hash.outputLen), hash);
* ```
*/
function aoutput(out, instance) {
	abytes$1(out, void 0, "output");
	const min = instance.outputLen;
	if (!(out.length >= min)) throw new RangeError("\"output\" expected length >= " + min);
}
/**
* Zeroizes typed arrays in place. Warning: JS provides no guarantees.
* @param arrays - arrays to overwrite with zeros
* @example
* Zeroize sensitive buffers in place.
* ```ts
* clean(new Uint8Array([1, 2, 3]));
* ```
*/
function clean(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
* Creates a DataView for byte-level manipulation.
* @param arr - source typed array
* @returns DataView over the same buffer region.
* @example
* Create a DataView over an existing buffer.
* ```ts
* createView(new Uint8Array(4));
* ```
*/
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
* Rotate-right operation for uint32 values.
* @param word - source word
* @param shift - shift amount in bits
* @returns Rotated word.
* @example
* Rotate a 32-bit word to the right.
* ```ts
* rotr(0x12345678, 8);
* ```
*/
function rotr(word, shift) {
	return word << 32 - shift | word >>> shift;
}
const hasHexBuiltin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* Convert byte array to hex string.
* Uses the built-in function when available and assumes it matches the tested
* fallback semantics.
* @param bytes - bytes to encode
* @returns Lowercase hexadecimal string.
* @throws On wrong argument types. {@link TypeError}
* @example
* Convert bytes to lowercase hexadecimal.
* ```ts
* bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])); // 'cafe0123'
* ```
*/
function bytesToHex$2(bytes) {
	abytes$1(bytes);
	if (hasHexBuiltin) return bytes.toHex();
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes[bytes[i]];
	return hex;
}
function asciiToBase16(ch) {
	return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - 55 : ch >= 97 && ch <= 102 ? ch - 87 : void 0;
}
/**
* Convert hex string to byte array. Uses built-in function, when available.
* @param hex - hexadecimal string to decode
* @returns Decoded bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Decode lowercase hexadecimal into bytes.
* ```ts
* hexToBytes('cafe0123'); // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
* ```
*/
function hexToBytes$1(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	if (hasHexBuiltin) try {
		return Uint8Array.fromHex(hex);
	} catch (error) {
		if (error instanceof SyntaxError) throw new RangeError(error.message);
		throw error;
	}
	const hl = hex.length;
	const al = hl / 2;
	if (hl % 2) throw new RangeError("hex string expected, got unpadded hex of length " + hl);
	const array = new Uint8Array(al);
	for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
		const n1 = asciiToBase16(hex.charCodeAt(hi));
		const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
		if (n1 === void 0 || n2 === void 0) {
			const char = hex[hi] + hex[hi + 1];
			throw new RangeError("hex string expected, got non-hex character \"" + char + "\" at index " + hi);
		}
		array[ai] = n1 * 16 + n2;
	}
	return array;
}
/**
* Copies several Uint8Arrays into one.
* @param arrays - arrays to concatenate
* @returns Concatenated byte array.
* @throws On wrong argument types. {@link TypeError}
* @example
* Concatenate multiple byte arrays.
* ```ts
* concatBytes(new Uint8Array([1]), new Uint8Array([2]));
* ```
*/
function concatBytes$1(...arrays) {
	let sum = 0;
	for (let i = 0; i < arrays.length; i++) {
		const a = arrays[i];
		abytes$1(a);
		sum += a.length;
	}
	const res = new Uint8Array(sum);
	for (let i = 0, pad = 0; i < arrays.length; i++) {
		const a = arrays[i];
		res.set(a, pad);
		pad += a.length;
	}
	return res;
}
/**
* Merges default options and passed options.
* @param defaults - base option object
* @param opts - user overrides
* @param title - label included in thrown override errors
* @returns Fresh merged option object with a null prototype.
* @throws On wrong argument types. {@link TypeError}
* @example
* Merge user overrides onto default options.
* ```ts
* checkOpts({ dkLen: 32 }, { asyncTick: 10 });
* ```
*/
function checkOpts(defaults, opts, title = "opts") {
	aopts(defaults, "defaults");
	if (opts !== void 0) aopts(opts, title);
	return Object.assign(Object.create(null), defaults, opts);
}
/**
* Creates a callable hash function from a stateful class constructor.
* @param hashCons - hash constructor or factory
* @param info - optional metadata such as DER OID
* @returns Frozen callable hash wrapper with `.create()`.
*   Wrapper construction eagerly calls `hashCons(undefined)` once to read
*   `outputLen` / `blockLen`, so constructor side effects happen at module
*   init time.
* @throws On wrong argument types. {@link TypeError}
* @example
* Wrap a stateful hash constructor into a callable helper.
* ```ts
* import { createHasher } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const wrapped = createHasher(sha256.create, { oid: sha256.oid });
* wrapped(new Uint8Array([1]));
* ```
*/
function createHasher(hashCons, info = {}) {
	if (typeof hashCons !== "function") throw new TypeError("\"hashCons\" expected function, got type=" + typeof hashCons);
	info = checkOpts({}, info, "info");
	const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	const tmp = hashCons(void 0);
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.canXOF = tmp.canXOF;
	hashC.create = (opts) => hashCons(opts);
	Object.assign(hashC, info);
	return Object.freeze(hashC);
}
/**
* Cryptographically secure PRNG backed by `crypto.getRandomValues`.
* @param bytesLength - number of random bytes to generate
* @returns Random bytes.
* The platform `getRandomValues()` implementation still defines any
* single-call length cap, and this helper rejects oversize requests
* with a stable library `RangeError` instead of host-specific errors.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
* @example
* Generate a fresh random key or nonce.
* ```ts
* const key = randomBytes(16);
* ```
*/
function randomBytes$1(bytesLength = 32) {
	anumber$1(bytesLength, "bytesLength");
	const cr = typeof globalThis === "object" ? globalThis.crypto : null;
	if (typeof cr?.getRandomValues !== "function") throw new Error("crypto.getRandomValues must be defined");
	if (bytesLength > 65536) throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
	return cr.getRandomValues(new Uint8Array(bytesLength));
}
/**
* Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
* @param suffix - final OID byte for the selected hash.
*   The helper accepts any byte even though only the documented NIST hash
*   suffixes are meaningful downstream.
* @returns Object containing the DER-encoded OID.
* @example
* Build OID metadata for a NIST hash.
* ```ts
* oidNist(0x01);
* ```
*/
const oidNist = (suffix) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	suffix
]) });
//#endregion
//#region ../../node_modules/@noble/hashes/_u64.js
const fromNumH = (n) => n / 2 ** 32 | 0;
const fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
	const h = fromNumH(n);
	const l = fromNumL(n);
	view.setUint32(byteOffset, isLE ? l : h, isLE);
	view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
//#endregion
//#region ../../node_modules/@noble/hashes/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/**
* Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
* Returns bits from `b` when `a` is set, otherwise from `c`.
* The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
* set the same bit.
* @param a - selector word
* @param b - word chosen when selector bit is set
* @param c - word chosen when selector bit is clear
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit choice primitive.
* ```ts
* Chi(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Chi(a, b, c) {
	return a & b ^ ~a & c;
}
/**
* Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
* Returns bits shared by at least two inputs.
* @param a - first input word
* @param b - second input word
* @param c - third input word
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit majority primitive.
* ```ts
* Maj(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Maj(a, b, c) {
	return a & b ^ a & c ^ b & c;
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
* Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
* strings with partial-byte tails.
* @param blockLen - internal block size in bytes
* @param outputLen - digest size in bytes
* @param padOffset - trailing length field size in bytes
* @param isLE - whether length and state words are encoded in little-endian
* @example
* Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
* ```ts
* import { _SHA1 } from '@noble/hashes/legacy.js';
* const hash = new _SHA1();
* hash.update(new Uint8Array([97, 98, 99]));
* hash.digest();
* ```
*/
var HashMD = class {
	blockLen;
	outputLen;
	canXOF = false;
	padOffset;
	isLE;
	buffer;
	view;
	finished = false;
	length = 0;
	pos = 0;
	destroyed = false;
	constructor(blockLen, outputLen, padOffset, isLE) {
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		abytes$1(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		let processed = false;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				processed = true;
				continue;
			}
			buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
				processed = true;
			}
		}
		this.length += data.length;
		if (processed) this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		buffer.fill(0, pos);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			buffer.fill(0);
		}
		setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
		this.process(view, 0);
		this.roundClean();
		const oview = out === buffer ? view : createView(out);
		const len = this.outputLen;
		const outLen = len / 4;
		const state = this.get();
		if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneIntoMeta(to) {
		const { buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (pos) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/**
* Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
* Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
*/
/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
* square roots of the first eight prime numbers. Exported as a shared table; callers must treat
* it as read-only because constructors copy words from it by index. */
const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
//#endregion
//#region ../../node_modules/@noble/hashes/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
* @module
*/
/**
* SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
* of the cube roots of the first 64 primes (2..311).
*/
const SHA256_K = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
var SHA2_32B = class extends HashMD {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(outputLen, IV) {
		super(64, outputLen, 8, false);
		this.A = IV[0] | 0;
		this.B = IV[1] | 0;
		this.C = IV[2] | 0;
		this.D = IV[3] | 0;
		this.E = IV[4] | 0;
		this.F = IV[5] | 0;
		this.G = IV[6] | 0;
		this.H = IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W[i - 15];
			const W2 = SHA256_W[i - 2];
			const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
			const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
			SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
			const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
			const T2 = (rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		clean(SHA256_W);
	}
	destroy() {
		this.destroyed = true;
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		clean(this.buffer);
	}
};
/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
var _SHA256 = class extends SHA2_32B {
	constructor() {
		super(32, SHA256_IV);
	}
};
/**
* SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
*
* - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
* - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
* - Each sha256 hash is executing 2^18 bit operations.
* - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-256.
* ```ts
* sha256(new Uint8Array([97, 98, 99]));
* ```
*/
const sha256$1 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
//#endregion
//#region ../../node_modules/@noble/hashes/hmac.js
/**
* HMAC: RFC2104 message authentication code.
* @module
*/
/**
* Internal class for HMAC.
* Accepts any byte key, although RFC 2104 §3 recommends keys at least
* `HashLen` bytes long.
*/
var _HMAC = class {
	oHash;
	iHash;
	blockLen;
	outputLen;
	canXOF = false;
	finished = false;
	destroyed = false;
	constructor(hash, key) {
		ahash(hash);
		abytes$1(key, void 0, "key");
		this.iHash = hash.create();
		if (typeof this.iHash.update !== "function") throw new Error("expected Hash instance");
		this.blockLen = this.iHash.blockLen;
		this.outputLen = this.iHash.outputLen;
		const blockLen = this.blockLen;
		const pad = new Uint8Array(blockLen);
		pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
		for (let i = 0; i < pad.length; i++) pad[i] ^= 54;
		this.iHash.update(pad);
		this.oHash = hash.create();
		for (let i = 0; i < pad.length; i++) pad[i] ^= 106;
		this.oHash.update(pad);
		clean(pad);
	}
	update(buf) {
		aexists(this);
		this.iHash.update(buf);
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const buf = out.subarray(0, this.outputLen);
		this.iHash.digestInto(buf);
		this.oHash.update(buf);
		this.oHash.digestInto(buf);
		this.destroy();
	}
	digest() {
		const out = new Uint8Array(this.oHash.outputLen);
		this.digestInto(out);
		return out;
	}
	_cloneInto(to) {
		to ||= Object.create(Object.getPrototypeOf(this), {});
		const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
		to = to;
		to.finished = finished;
		to.destroyed = destroyed;
		to.blockLen = blockLen;
		to.outputLen = outputLen;
		to.canXOF = canXOF;
		to.oHash = oHash._cloneInto(to.oHash);
		to.iHash = iHash._cloneInto(to.iHash);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
	destroy() {
		this.destroyed = true;
		this.oHash.destroy();
		this.iHash.destroy();
	}
};
const hmac = /* @__PURE__ */ (() => {
	const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
	hmac_.create = (hash, key) => new _HMAC(hash, key);
	return hmac_;
})();
//#endregion
//#region ../../node_modules/@noble/curves/utils.js
/**
* Hex, bytes and number utilities.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/**
* Validates that a value is an array, optionally validating each element.
* @param item - Value to validate.
* @param title - Label included in thrown errors.
* @param inner - Optional per-element validator, called with the element and its label.
* @returns The validated array.
* @example
* Validate an array of points before batch processing.
*
* ```ts
* aarray([1n, 2n], 'scalars');
* ```
*/
function aarray(item, title, inner = () => {}) {
	if (!Array.isArray(item)) throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
	for (let i = 0; i < item.length; i++) inner(item[i], `${title}[${i}]`);
	return item;
}
/**
* Validates that a value is a byte array.
* @param value - Value to validate.
* @param length - Optional exact byte length.
* @param title - Optional field name.
* @returns Original byte array.
* @example
* Reject non-byte input before passing data into curve code.
*
* ```ts
* abytes(new Uint8Array(1));
* ```
*/
const abytes = (value, length, title) => abytes$1(value, length, title);
/**
* Validates that a value is a non-negative safe integer.
* @param n - Value to validate.
* @param title - Optional field name.
* @returns The validated number.
* @example
* Validate a numeric length before allocating buffers.
*
* ```ts
* anumber(1);
* ```
*/
const anumber = anumber$1;
/**
* Asserts something is a string.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated string.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate a label string.
*
* ```ts
* astring('example', 'label');
* ```
*/
function astring(value, title = "") {
	if (typeof value !== "string") {
		const prefix = title && `"${title}" `;
		throw new TypeError(prefix + "expected string, got type=" + typeof value);
	}
	return value;
}
/**
* Asserts something is a plain object-ish value, not null or array.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated object.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate an options object before checking fields.
*
* ```ts
* aobject({ flag: true });
* ```
*/
function aobject(value, title = "object") {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
	return value;
}
/**
* Asserts something is a function.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated function.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate a required method before calling it.
*
* ```ts
* afunction(() => true, 'predicate');
* ```
*/
function afunction(value, title) {
	if (typeof value !== "function") throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
	return value;
}
/**
* Encodes bytes as lowercase hex.
* @param bytes - Bytes to encode.
* @returns Lowercase hex string.
* @example
* Serialize bytes as hex for logging or fixtures.
*
* ```ts
* bytesToHex(Uint8Array.of(1, 2, 3));
* ```
*/
const bytesToHex$1 = bytesToHex$2;
/**
* Concatenates byte arrays.
* @param arrays - Byte arrays to join.
* @returns Concatenated bytes.
* @example
* Join domain-separated chunks into one buffer.
*
* ```ts
* concatBytes(Uint8Array.of(1), Uint8Array.of(2));
* ```
*/
const concatBytes = (...arrays) => concatBytes$1(...arrays);
/**
* Decodes lowercase or uppercase hex into bytes.
* @param hex - Hex string to decode.
* @returns Decoded bytes.
* @example
* Parse fixture hex into bytes before hashing.
*
* ```ts
* hexToBytes('0102');
* ```
*/
const hexToBytes = (hex) => hexToBytes$1(hex);
/**
* Checks whether a value is a Uint8Array.
* @param a - Value to inspect.
* @returns `true` when `a` is a Uint8Array.
* @example
* Branch on byte input before decoding it.
*
* ```ts
* isBytes(new Uint8Array(1));
* ```
*/
const isBytes = isBytes$1;
/**
* Reads random bytes from the platform CSPRNG.
* @param bytesLength - Number of random bytes to read.
* @returns Fresh random bytes.
* @example
* Generate a random seed for a keypair.
*
* ```ts
* randomBytes(2);
* ```
*/
const randomBytes = (bytesLength) => randomBytes$1(bytesLength);
const _0n$4 = /* @__PURE__ */ BigInt(0);
const _1n$3 = /* @__PURE__ */ BigInt(1);
const atitle = (title) => title ? `"${title}" ` : "";
/**
* Validates that a flag is boolean.
* @param value - Value to validate.
* @param title - Optional field name.
* @returns Original value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Reject non-boolean option flags early.
*
* ```ts
* abool(true);
* ```
*/
function abool(value, title = "") {
	if (typeof value !== "boolean") throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
	return value;
}
/**
* Validates that a value is a non-negative bigint or safe integer.
* @param n - Value to validate.
* @returns The same validated value.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate one integer-like value before serializing it.
*
* ```ts
* abignumber(1n);
* ```
*/
function abignumber(n) {
	if (typeof n === "bigint") {
		if (!isPosBig(n)) throw new RangeError("positive bigint expected, got " + n);
	} else anumber(n);
	return n;
}
/**
* Validates that a value is a safe integer.
* @param value - Integer to validate.
* @param title - Optional field name.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a window size before scalar arithmetic uses it.
*
* ```ts
* asafenumber(1);
* ```
*/
function asafenumber(value, title = "") {
	if (typeof value !== "number") {
		const prefix = title && `"${title}" `;
		throw new TypeError(prefix + "expected number, got type=" + typeof value);
	}
	if (!Number.isSafeInteger(value)) {
		const prefix = title && `"${title}" `;
		throw new RangeError(prefix + "expected safe integer, got " + value);
	}
}
/**
* Encodes a bigint into even-length big-endian hex.
* The historical "unpadded" name only means "no fixed-width field padding"; odd-length hex still
* gets one leading zero nibble so the result always represents whole bytes.
* @param num - Number to encode.
* @returns Big-endian hex string.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Encode a scalar into hex without a `0x` prefix.
*
* ```ts
* numberToHexUnpadded(255n);
* ```
*/
function numberToHexUnpadded(num) {
	const hex = abignumber(num).toString(16);
	return hex.length & 1 ? "0" + hex : hex;
}
/**
* Parses a big-endian hex string into bigint.
* Accepts odd-length hex through the native `BigInt('0x' + hex)` parser and currently surfaces the
* same native `SyntaxError` for malformed hex instead of wrapping it in a library-specific error.
* @param hex - Hex string without `0x`.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Parse a scalar from fixture hex.
*
* ```ts
* hexToNumber('ff');
* ```
*/
function hexToNumber(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	return hex === "" ? _0n$4 : BigInt("0x" + hex);
}
/**
* Parses big-endian bytes into bigint.
* @param bytes - Bytes in big-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in network byte order.
*
* ```ts
* bytesToNumberBE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberBE(bytes) {
	return hexToNumber(bytesToHex$2(bytes));
}
/**
* Parses little-endian bytes into bigint.
* @param bytes - Bytes in little-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in little-endian form.
*
* ```ts
* bytesToNumberLE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberLE(bytes) {
	return hexToNumber(bytesToHex$2(copyBytes(abytes$1(bytes)).reverse()));
}
/**
* Encodes a bigint into fixed-length big-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes. Must be greater than zero.
* @returns Big-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar into a 32-byte field element.
*
* ```ts
* numberToBytesBE(255n, 2);
* ```
*/
function numberToBytesBE(n, len) {
	anumber$1(len);
	if (len === 0) throw new Error("zero output length is invalid");
	n = abignumber(n);
	const expectedLen = len * 2;
	const hex = n.toString(16);
	if (hex.length > expectedLen) throw new RangeError("number is too large");
	return hexToBytes$1(hex.padStart(expectedLen, "0"));
}
/**
* Encodes a bigint into fixed-length little-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes.
* @returns Little-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar for little-endian protocols.
*
* ```ts
* numberToBytesLE(255n, 2);
* ```
*/
function numberToBytesLE(n, len) {
	return numberToBytesBE(n, len).reverse();
}
/**
* Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
* and Buffer#slice creates mutable copy. Never use Buffers!
* @param bytes - Bytes to copy.
* @returns Detached copy.
* @example
* Make an isolated copy before mutating serialized bytes.
*
* ```ts
* copyBytes(Uint8Array.of(1, 2, 3));
* ```
*/
function copyBytes(bytes) {
	return Uint8Array.from(abytes(bytes));
}
/**
* Checks whether n is non-negative bigint. Historical name.
* @param n - candidate value
* @returns `true` when the value is bigint and 0 or larger
* @example
* Check a candidate scalar before range validation.
*
* ```ts
* isPosBig(2n);
* ```
*/
function isPosBig(n) {
	return typeof n === "bigint" && _0n$4 <= n;
}
/**
* Checks whether a bigint lies inside a half-open range.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* @returns `true` when the value is inside the range.
* @example
* Check whether a candidate scalar fits the field order.
*
* ```ts
* inRange(2n, 1n, 3n);
* ```
*/
function inRange(n, min, max) {
	return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
* Asserts `min <= n < max`. NOTE: upper bound is exclusive.
* @param title - Value label for error messages.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* Wrong-type inputs are not separated from out-of-range values here: they still flow through the
* shared `RangeError` path because this is only a throwing wrapper around `inRange(...)`.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Assert that a bigint stays within one half-open range.
*
* ```ts
* aInRange('x', 2n, 1n, 256n);
* ```
*/
function aInRange(title, n, min, max) {
	if (!inRange(n, min, max)) throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
* TODO: merge with nLength in modular
* @param n - Value to inspect.
* @returns Bit length.
* @throws If the value is negative. {@link Error}
* @example
* Measure the bit length of a scalar before serialization.
*
* ```ts
* bitLen(8n);
* ```
*/
function bitLen(n) {
	if (n < _0n$4) throw new Error("expected non-negative bigint, got " + n);
	return n === _0n$4 ? 0 : n.toString(2).length;
}
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
* @param n - Number of bits. Negative widths are currently passed through to raw bigint shift
*   semantics and therefore produce `-1n`.
* @returns Bitmask value.
* @example
* Calculate mask for N bits.
*
* ```ts
* bitMask(4);
* ```
*/
const bitMask = (n) => {
	asafenumber(n, "n");
	return (_1n$3 << BigInt(n)) - _1n$3;
};
/**
* Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
* @param hashLen - Hash output size in bytes. Callers are expected to pass a positive length; `0`
*   is not rejected here and would make the internal generate loop non-progressing.
* @param qByteLen - Requested output size in bytes. Callers are expected to pass a positive length.
* @param hmacFn - HMAC implementation.
* @returns Function that will call DRBG until the predicate returns anything
*   other than `undefined`.
* @throws On wrong argument types. {@link TypeError}
* @example
* Build a deterministic nonce generator for RFC6979-style signing.
*
* ```ts
* import { createHmacDrbg } from '@noble/curves/utils.js';
* import { hmac } from '@noble/hashes/hmac.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hmacFn = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg);
* const drbg = createHmacDrbg(32, 32, hmacFn);
* const seed = new Uint8Array(32);
* drbg(seed, (bytes) => bytes);
* ```
*/
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
	anumber$1(hashLen, "hashLen");
	anumber$1(qByteLen, "qByteLen");
	if (typeof hmacFn !== "function") throw new TypeError("hmacFn must be a function");
	const u8n = (len) => new Uint8Array(len);
	const NULL = Uint8Array.of();
	const byte0 = Uint8Array.of(0);
	const byte1 = Uint8Array.of(1);
	const _maxDrbgIters = 1e3;
	let v = u8n(hashLen);
	let k = u8n(hashLen);
	let i = 0;
	const reset = () => {
		v.fill(1);
		k.fill(0);
		i = 0;
	};
	const h = (...msgs) => hmacFn(k, concatBytes(v, ...msgs));
	const reseed = (seed = NULL) => {
		k = h(byte0, seed);
		v = h();
		if (seed.length === 0) return;
		k = h(byte1, seed);
		v = h();
	};
	const gen = () => {
		if (i++ >= _maxDrbgIters) throw new Error("drbg: tried max amount of iterations");
		let len = 0;
		const out = [];
		while (len < qByteLen) {
			v = h();
			const sl = v.slice();
			out.push(sl);
			len += v.length;
		}
		return concatBytes(...out);
	};
	const genUntil = (seed, pred) => {
		reset();
		reseed(seed);
		let res = void 0;
		while ((res = pred(gen())) === void 0) reseed();
		reset();
		return res;
	};
	return genUntil;
}
/**
* Validates declared required and optional field types on a plain object.
* Extra keys are intentionally ignored because many callers validate only the subset they use from
* richer option bags or runtime objects.
* This walks field schemas and formats detailed errors, so avoid it on hot paths; use direct
* one-line guards such as `aobject()`, `afunction()`, `abool()`, or `asafenumber()` instead.
* @param object - Object to validate.
* @param fields - Required field types.
* @param optFields - Optional field types.
* @param title - Object label included in thrown errors.
* @throws On wrong argument types. {@link TypeError}
* @example
* Check user options before building a curve helper.
*
* ```ts
* validateObject({ flag: true }, { flag: 'boolean' });
* ```
*/
function validateObject(object, fields = {}, optFields = {}, title = "object") {
	aobject(object, title);
	aobject(fields, "fields");
	aobject(optFields, "optFields");
	function checkField(fieldName, expectedType, isOpt) {
		const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
		const val = object[fieldName];
		if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) throw new TypeError(`${label} is invalid: expected own property`);
		if (isOpt && val === void 0) return;
		const current = typeof val;
		if (current !== expectedType || val === null) throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
	}
	const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
	iter(fields, false);
	iter(optFields, true);
}
//#endregion
//#region ../../node_modules/@noble/curves/abstract/modular.js
/**
* Utils for modular division and fields.
* Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
* There is no division: it is replaced by modular multiplicative inverse.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$3 = /* @__PURE__ */ BigInt(0);
const _1n$2 = /* @__PURE__ */ BigInt(1);
const _2n$2 = /* @__PURE__ */ BigInt(2);
const _3n$1 = /* @__PURE__ */ BigInt(3);
const _4n$2 = /* @__PURE__ */ BigInt(4);
const _5n = /* @__PURE__ */ BigInt(5);
const _7n = /* @__PURE__ */ BigInt(7);
const _8n = /* @__PURE__ */ BigInt(8);
const _9n = /* @__PURE__ */ BigInt(9);
const _15n = /* @__PURE__ */ BigInt(15);
const _16n = /* @__PURE__ */ BigInt(16);
const POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
/**
* @param a - Dividend value.
* @param b - Positive modulus.
* @returns Reduced value in `[0, b)` only when `b` is positive.
* @throws If the modulus is not positive. {@link Error}
* @example
* Normalize a bigint into one field residue.
*
* ```ts
* mod(-1n, 5n);
* ```
*/
function mod(a, b) {
	if (b <= _0n$3) throw new Error("mod: expected positive modulus, got " + b);
	const result = a % b;
	return result >= _0n$3 ? result : b + result;
}
/**
* Efficiently raise num to a power with modular reduction.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
* Low-level helper: callers that need canonical residues must pass a valid `num` for the chosen
* modulus instead of relying on the `power===0/1` fast paths to normalize it.
* @param num - Base value.
* @param power - Exponent value.
* @param modulo - Reduction modulus.
* @returns Modular exponentiation result.
* @throws If the modulus or exponent is invalid. {@link Error}
* @example
* Raise one bigint to a modular power.
*
* ```ts
* pow(2n, 6n, 11n) // 64n % 11n == 9n
* ```
*/
function pow(num, power, modulo) {
	if (modulo <= _1n$2) throw new Error("pow: expected modulus > 1, got " + modulo);
	if (typeof power !== "bigint") throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
	if (power < _0n$3) throw new Error("invalid exponent, negatives unsupported");
	if (power === _0n$3) return _1n$2;
	if (power === _1n$2) return num;
	let d = num % modulo;
	if (d < _0n$3) d += modulo;
	if (power < POW_WINDOWED_MIN) {
		let p = _1n$2;
		while (power > _0n$3) {
			if (power & _1n$2) p = p * d % modulo;
			d = d * d % modulo;
			power >>= _1n$2;
		}
		return p;
	}
	const digits = [];
	while (power > _0n$3) {
		digits.push(Number(power & _15n));
		power >>= _4n$2;
	}
	const table = new Array(16);
	table[0] = _1n$2;
	table[1] = d;
	for (let i = 2; i < 16; i++) table[i] = table[i - 1] * d % modulo;
	let p = table[digits[digits.length - 1]];
	for (let w = digits.length - 2; w >= 0; w--) {
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		const digit = digits[w];
		if (digit !== 0) p = p * table[digit] % modulo;
	}
	return p;
}
/**
* Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)`.
* Low-level helper: callers that need canonical residues must pass a valid `x` for the chosen
* modulus; the `power===0` fast path intentionally returns the input unchanged.
* @param x - Base value.
* @param power - Number of squarings.
* @param modulo - Reduction modulus.
* @returns Repeated-squaring result.
* @throws If the exponent is negative. {@link Error}
* @example
* Apply repeated squaring inside one field.
*
* ```ts
* pow2(3n, 2n, 11n);
* ```
*/
function pow2(x, power, modulo) {
	if (modulo <= _1n$2) throw new Error("pow2: expected modulus > 1, got " + modulo);
	if (power < _0n$3) throw new Error("pow2: expected non-negative exponent, got " + power);
	let res = x;
	while (power-- > _0n$3) {
		res *= res;
		res %= modulo;
	}
	return res;
}
/**
* Inverses number over modulo.
* Implemented using the {@link https://brilliant.org/wiki/extended-euclidean-algorithm/ | extended Euclidean algorithm}.
* @param number - Value to invert.
* @param modulo - Modulus greater than 1.
* @returns Multiplicative inverse.
* @throws If the modulus is invalid or the inverse does not exist. {@link Error}
* @example
* Compute one modular inverse with the extended Euclidean algorithm.
*
* ```ts
* invert(3n, 11n);
* ```
*/
function invert(number, modulo) {
	if (number === _0n$3) throw new Error("invert: expected non-zero number");
	if (modulo <= _1n$2) throw new Error("invert: expected modulus > 1, got " + modulo);
	let a = mod(number, modulo);
	let b = modulo;
	let x = _0n$3, u = _1n$2;
	while (a !== _0n$3) {
		const q = b / a;
		const r = b - a * q;
		const m = x - u * q;
		b = a, a = r, x = u, u = m;
	}
	if (b !== _1n$2) throw new Error("invert: does not exist");
	return mod(x, modulo);
}
/**
* Inverses number over modulo using Fermat's little theorem: `a^(p-2) ≡ a⁻¹ (mod p)`.
*
* Unlike {@link invert} (extended Euclidean), the exponent `p-2` is a public constant, so the
* underlying square-and-multiply has the same control flow for every secret `a`: there is no
* data-dependent branching or loop count that could leak `a` through timing (e.g. Minerva-style
* ECDSA nonce-inversion attacks). This is only "algorithmically" constant-time — JS bigint
* multiplication/reduction is still value-dependent — and it is roughly 4x slower than
* {@link invert}.
*
* REQUIRES a prime modulus; Fermat's theorem does not hold otherwise. The result is verified to be
* a real inverse, so a non-prime modulus (or a non-invertible input) fails closed with an error
* instead of returning a wrong value.
* @param a - Value to invert.
* @param prime - Prime modulus.
* @returns Multiplicative inverse in `[1, prime)`.
* @throws If the modulus is below 2, the input reduces to zero, or the inverse does not exist.
*   {@link Error}
* @example
* Compute one modular inverse without secret-dependent branching.
*
* ```ts
* invertCt(3n, 11n); // 4n, since 3 * 4 = 12 ≡ 1 (mod 11)
* ```
*/
function invertCt(a, prime) {
	if (prime <= _1n$2) throw new Error("invertCt: expected prime modulus > 1, got " + prime);
	const an = mod(a, prime);
	if (an === _0n$3) throw new Error("invertCt: expected non-zero number");
	const inverse = pow(an, prime - _2n$2, prime);
	if (mod(an * inverse, prime) !== _1n$2) throw new Error("invertCt: does not exist");
	return inverse;
}
function assertIsSquare(Fp, root, n) {
	const F = Fp;
	if (!F.eql(F.sqr(root), n)) throw new Error("Cannot find square root");
}
function aoddModulus(order, fnName) {
	if ((order & _1n$2) === _0n$3) throw new Error(fnName + ": expected odd modulus, got " + order);
}
function sqrt3mod4(Fp, n) {
	const F = Fp;
	const p1div4 = (F.ORDER + _1n$2) / _4n$2;
	const root = F.pow(n, p1div4);
	assertIsSquare(F, root, n);
	return root;
}
function sqrt5mod8(Fp, n) {
	const F = Fp;
	const p5div8 = (F.ORDER - _5n) / _8n;
	const n2 = F.mul(n, _2n$2);
	const v = F.pow(n2, p5div8);
	const nv = F.mul(n, v);
	const i = F.mul(F.mul(nv, _2n$2), v);
	const root = F.mul(nv, F.sub(i, F.ONE));
	assertIsSquare(F, root, n);
	return root;
}
function sqrt9mod16(P) {
	const Fp_ = Field(P);
	const tn = tonelliShanks(P);
	const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
	const c2 = tn(Fp_, c1);
	const c3 = tn(Fp_, Fp_.neg(c1));
	const c4 = (P + _7n) / _16n;
	return ((Fp, n) => {
		const F = Fp;
		let tv1 = F.pow(n, c4);
		let tv2 = F.mul(tv1, c1);
		const tv3 = F.mul(tv1, c2);
		const tv4 = F.mul(tv1, c3);
		const e1 = F.eql(F.sqr(tv2), n);
		const e2 = F.eql(F.sqr(tv3), n);
		tv1 = F.cmov(tv1, tv2, e1);
		tv2 = F.cmov(tv4, tv3, e2);
		const e3 = F.eql(F.sqr(tv2), n);
		const root = F.cmov(tv1, tv2, e3);
		assertIsSquare(F, root, n);
		return root;
	});
}
/**
* Tonelli-Shanks square root search algorithm.
* This implementation is variable-time: it searches data-dependently for the first non-residue `Z`
* and for the smallest `i` in the main loop, unlike RFC 9380 Appendix I.4's constant-time shape.
* 1. {@link https://eprint.iacr.org/2012/685.pdf | eprint 2012/685}, page 12
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* @param P - field order
* @returns function that takes field Fp (created from P) and number n
* @throws If the field is too small, non-prime, or the square root does not exist. {@link Error}
* @example
* Construct a square-root helper for primes that need Tonelli-Shanks.
*
* ```ts
* import { Field, tonelliShanks } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = tonelliShanks(17n)(Fp, 4n);
* ```
*/
function tonelliShanks(P) {
	if (P < _3n$1) throw new Error("sqrt is not defined for small field");
	aoddModulus(P, "tonelliShanks");
	let Q = P - _1n$2;
	let S = 0;
	while (Q % _2n$2 === _0n$3) {
		Q /= _2n$2;
		S++;
	}
	let Z = _2n$2;
	const _Fp = Field(P);
	while (FpLegendre(_Fp, Z) === 1) if (Z++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
	if (S === 1) return sqrt3mod4;
	let cc = _Fp.pow(Z, Q);
	const Q1div2 = (Q + _1n$2) / _2n$2;
	return function tonelliSlow(Fp, n) {
		const F = Fp;
		if (F.is0(n)) return n;
		if (FpLegendre(F, n) !== 1) throw new Error("Cannot find square root");
		let M = S;
		let c = F.mul(F.ONE, cc);
		let t = F.pow(n, Q);
		let R = F.pow(n, Q1div2);
		while (!F.eql(t, F.ONE)) {
			if (F.is0(t)) throw new Error("Cannot find square root: probably non-prime P");
			let i = 1;
			let t_tmp = F.sqr(t);
			while (!F.eql(t_tmp, F.ONE)) {
				i++;
				t_tmp = F.sqr(t_tmp);
				if (i === M) throw new Error("Cannot find square root");
			}
			const exponent = _1n$2 << BigInt(M - i - 1);
			const b = F.pow(c, exponent);
			M = i;
			c = F.sqr(b);
			t = F.mul(t, c);
			R = F.mul(R, b);
		}
		return R;
	};
}
/**
* Square root for a finite field. Will try optimized versions first:
*
* 1. P ≡ 3 (mod 4)
* 2. P ≡ 5 (mod 8)
* 3. P ≡ 9 (mod 16)
* 4. Tonelli-Shanks algorithm
*
* Different algorithms can give different roots, it is up to user to decide which one they want.
* For example there is FpSqrtOdd/FpSqrtEven to choose a root by oddness
* (used for hash-to-curve).
* @param P - Field order.
* @returns Square-root helper. The generic fallback inherits Tonelli-Shanks' variable-time
*   behavior and this selector assumes prime-field-style integer moduli.
* @throws If the field is unsupported or the square root does not exist. {@link Error}
* @example
* Choose the square-root helper appropriate for one field modulus.
*
* ```ts
* import { Field, FpSqrt } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = FpSqrt(17n)(Fp, 4n);
* ```
*/
function FpSqrt(P) {
	aoddModulus(P, "Fp.sqrt");
	if (P % _4n$2 === _3n$1) return sqrt3mod4;
	if (P % _8n === _5n) return sqrt5mod8;
	if (P % _16n === _9n) return sqrt9mod16(P);
	return tonelliShanks(P);
}
const FIELD_FIELDS = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
/**
* @param field - Field implementation.
* @returns Validated field. This only checks the arithmetic subset needed by generic helpers; it
*   does not guarantee full runtime-method coverage for serialization, batching, `cmov`, or
*   field-specific extras beyond positive `BYTES` / `BITS`.
* @throws If the field shape or numeric metadata are invalid. {@link Error}
* @example
* Check that a field implementation exposes the operations curve code expects.
*
* ```ts
* import { Field, validateField } from '@noble/curves/abstract/modular.js';
* const Fp = validateField(Field(17n));
* ```
*/
function validateField(field) {
	aobject(field, "field");
	if (typeof field.ORDER !== "bigint") throw new TypeError("param \"ORDER\" is invalid: expected bigint, got " + typeof field.ORDER);
	asafenumber(field.BYTES, "BYTES");
	asafenumber(field.BITS, "BITS");
	for (const name of FIELD_FIELDS) afunction(field[name], "field." + name);
	if (field.BYTES < 1 || field.BITS < 1) throw new Error("invalid field: expected BYTES/BITS > 0");
	if (field.ORDER <= _1n$2) throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
	return field;
}
function FpInvertBatch(Fp, nums, passZero = false) {
	validateField(Fp);
	aarray(nums, "nums");
	abool(passZero, "passZero");
	const F = Fp;
	const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
	const multipliedAcc = nums.reduce((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = acc;
		return F.mul(acc, num);
	}, F.ONE);
	const invertedAcc = F.inv(multipliedAcc);
	nums.reduceRight((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = F.mul(acc, inverted[i]);
		return F.mul(acc, num);
	}, invertedAcc);
	return inverted;
}
/**
* Legendre symbol.
* Legendre constant is used to calculate Legendre symbol (a | p)
* which denotes the value of a^((p-1)/2) (mod p).
*
* * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
* * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
* * (a | p) ≡ 0    if a ≡ 0 (mod p)
* @param Fp - Field implementation.
* @param n - Value to inspect.
* @returns Legendre symbol.
* @throws If the powered value does not match a valid Legendre symbol. {@link Error}
* @example
* Compute the Legendre symbol of one field element.
*
* ```ts
* import { Field, FpLegendre } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const symbol = FpLegendre(Fp, 4n);
* ```
*/
function FpLegendre(Fp, n) {
	validateField(Fp);
	const F = Fp;
	aoddModulus(F.ORDER, "FpLegendre");
	const p1mod2 = (F.ORDER - _1n$2) / _2n$2;
	const powered = F.pow(n, p1mod2);
	const yes = F.eql(powered, F.ONE);
	const zero = F.eql(powered, F.ZERO);
	const no = F.eql(powered, F.neg(F.ONE));
	if (!yes && !zero && !no) throw new Error("invalid Legendre symbol result");
	return yes ? 1 : zero ? 0 : -1;
}
/**
* @param n - Curve order. Callers are expected to pass a positive order.
* @param nBitLength - Optional cached bit length. Callers are expected to pass a positive cached
*   value when overriding the derived bit length.
* @returns Byte and bit lengths.
* @throws If the order or cached bit length is invalid. {@link Error}
* @example
* Measure the encoding sizes needed for one modulus.
*
* ```ts
* nLength(255n);
* ```
*/
function nLength(n, nBitLength) {
	if (nBitLength !== void 0) anumber(nBitLength);
	if (n <= _0n$3) throw new Error("invalid n length: expected positive n, got " + n);
	if (nBitLength !== void 0 && nBitLength < 1) throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
	const bits = bitLen(n);
	if (nBitLength !== void 0 && nBitLength < bits) throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
	const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
const FIELD_SQRT = /* @__PURE__ */ new WeakMap();
var _Field = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = _0n$3;
	ONE = _1n$2;
	_lengths;
	_mod;
	constructor(ORDER, opts = {}) {
		if (ORDER <= _1n$2) throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
		let _nbitLength = void 0;
		this.isLE = false;
		if (opts != null && typeof opts === "object") {
			if (typeof opts.BITS === "number") _nbitLength = opts.BITS;
			if (typeof opts.sqrt === "function") Object.defineProperty(this, "sqrt", {
				value: opts.sqrt,
				enumerable: true
			});
			if (typeof opts.isLE === "boolean") this.isLE = opts.isLE;
			if (opts.allowedLengths) this._lengths = Object.freeze(opts.allowedLengths.slice());
			if (typeof opts.modFromBytes === "boolean") this._mod = opts.modFromBytes;
		}
		const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
		if (nByteLength > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = ORDER;
		this.BITS = nBitLength;
		this.BYTES = nByteLength;
		Object.freeze(this);
	}
	create(num) {
		return mod(num, this.ORDER);
	}
	isValid(num) {
		if (typeof num !== "bigint") throw new TypeError("invalid field element: expected bigint, got " + typeof num);
		return _0n$3 <= num && num < this.ORDER;
	}
	is0(num) {
		return num === _0n$3;
	}
	isValidNot0(num) {
		return !this.is0(num) && this.isValid(num);
	}
	isOdd(num) {
		return (num & _1n$2) === _1n$2;
	}
	neg(num) {
		return mod(-num, this.ORDER);
	}
	eql(lhs, rhs) {
		return lhs === rhs;
	}
	sqr(num) {
		return mod(num * num, this.ORDER);
	}
	add(lhs, rhs) {
		return mod(lhs + rhs, this.ORDER);
	}
	sub(lhs, rhs) {
		return mod(lhs - rhs, this.ORDER);
	}
	mul(lhs, rhs) {
		return mod(lhs * rhs, this.ORDER);
	}
	pow(num, power) {
		return pow(num, power, this.ORDER);
	}
	div(lhs, rhs) {
		return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
	}
	sqrN(num) {
		return num * num;
	}
	addN(lhs, rhs) {
		return lhs + rhs;
	}
	subN(lhs, rhs) {
		return lhs - rhs;
	}
	mulN(lhs, rhs) {
		return lhs * rhs;
	}
	inv(num) {
		return invert(num, this.ORDER);
	}
	sqrt(num) {
		let sqrt = FIELD_SQRT.get(this);
		if (!sqrt) FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
		return sqrt(this, num);
	}
	toBytes(num) {
		return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
	}
	fromBytes(bytes, skipValidation = false) {
		abytes(bytes);
		const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
		if (allowedLengths) {
			if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
			const padded = new Uint8Array(BYTES);
			padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
			bytes = padded;
		}
		if (bytes.length !== BYTES) throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
		let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
		if (modFromBytes) scalar = mod(scalar, ORDER);
		if (!skipValidation) {
			if (!this.isValid(scalar)) throw new Error("invalid field element: outside of range 0..ORDER");
		}
		return scalar;
	}
	invertBatch(lst) {
		return FpInvertBatch(this, lst, true);
	}
	cmov(a, b, condition) {
		abool(condition, "condition");
		return condition ? b : a;
	}
};
/**
* Creates a finite field. Major performance optimizations:
* * 1. Denormalized operations like mulN instead of mul.
* * 2. Identical object shape: never add or remove keys.
* * 3. Frozen stable object shape; the lazy sqrt cache lives in a module-level `WeakMap`.
* Fragile: always run a benchmark on a change.
* Security note: operations and low-level serializers like `toBytes` don't check `isValid` for
* all elements for performance and protocol-flexibility reasons; callers are responsible for
* supplying valid elements when they need canonical field behavior.
* This is low-level code, please make sure you know what you're doing.
*
* Note about field properties:
* * CHARACTERISTIC p = prime number, number of elements in main subgroup.
* * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
*
* @param ORDER - field order, probably prime, or could be composite
* @param opts - Field options such as bit length or endianness. See {@link FieldOpts}.
* @returns Frozen field instance with a stable object shape. This wrapper forwards `opts` straight
*   into `_Field`, so it inherits `_Field`'s assumptions about cached sizes and `allowedLengths`.
* @example
* Construct one prime field with optional overrides.
*
* ```ts
* Field(11n);
* ```
*/
function Field(ORDER, opts = {}) {
	Object.freeze(_Field.prototype);
	return new _Field(ORDER, opts);
}
/**
* Returns total number of bytes consumed by the field element.
* For example, 32 bytes for usual 256-bit weierstrass curve.
* @param fieldOrder - number of field elements, usually CURVE.n. Callers are expected to pass an
*   order greater than 1.
* @returns byte length of field
* @throws If the field order is not a bigint. {@link Error}
* @example
* Read the fixed-width byte length of one field.
*
* ```ts
* getFieldBytesLength(255n);
* ```
*/
function getFieldBytesLength(fieldOrder) {
	if (typeof fieldOrder !== "bigint") throw new Error("field order must be bigint");
	if (fieldOrder <= _1n$2) throw new Error("field order must be greater than 1");
	const bitLength = bitLen(fieldOrder - _1n$2);
	return Math.ceil(bitLength / 8);
}
/**
* Returns minimal amount of bytes that can be safely reduced
* by field order.
* Should be 2^-128 for 128-bit curve such as P256.
* This is the reduction / modulo-bias lower bound; higher-level helpers may still impose a larger
* absolute floor for policy reasons.
* @param fieldOrder - number of field elements greater than 1, usually CURVE.n.
* @returns byte length of target hash
* @throws If the field order is invalid. {@link Error}
* @example
* Compute the minimum hash length needed for field reduction.
*
* ```ts
* getMinHashLength(255n);
* ```
*/
function getMinHashLength(fieldOrder) {
	const length = getFieldBytesLength(fieldOrder);
	return length + Math.ceil(length / 2);
}
/**
* "Constant-time" private key generation utility.
* Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
* and convert them into private scalar, with the modulo bias being negligible.
* Needs at least 48 bytes of input for 32-byte private key. The implementation also keeps a hard
* 16-byte minimum even when `getMinHashLength(...)` is smaller, so toy-small inputs do not look
* accidentally acceptable for real scalar derivation.
* See {@link https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/ | Kudelski's modulo-bias guide},
* {@link https://csrc.nist.gov/publications/detail/fips/186/5/final | FIPS 186-5 appendix A.2}, and
* {@link https://www.rfc-editor.org/rfc/rfc9380#section-5 | RFC 9380 section 5}. Unlike RFC 9380
* `hash_to_field`, this helper intentionally maps into the non-zero private-scalar range `1..n-1`.
* @param key - Uniform input bytes.
* @param fieldOrder - Size of subgroup.
* @param isLE - interpret hash bytes as LE num
* @returns valid private scalar
* @throws If the hash length or field order is invalid for scalar reduction. {@link Error}
* @example
* Map hash output into a private scalar range.
*
* ```ts
* mapHashToField(new Uint8Array(48).fill(1), 255n);
* ```
*/
function mapHashToField(key, fieldOrder, isLE = false) {
	abytes(key);
	const len = key.length;
	const fieldLen = getFieldBytesLength(fieldOrder);
	const minLen = Math.max(getMinHashLength(fieldOrder), 16);
	if (len < minLen || len > 1024) throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
	const reduced = mod(isLE ? bytesToNumberLE(key) : bytesToNumberBE(key), fieldOrder - _1n$2) + _1n$2;
	return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
//#endregion
//#region ../../node_modules/@noble/curves/abstract/curve.js
/**
* Methods for elliptic curve multiplication by scalars.
* Contains wNAF-based ScalarMultiplier, pippenger.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$2 = /* @__PURE__ */ BigInt(0);
const _1n$1 = /* @__PURE__ */ BigInt(1);
const _4n$1 = /* @__PURE__ */ BigInt(4);
const BLIND_BYTES = 16;
const BLIND_BITS = 128;
const FW_WINDOW = 5;
const TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
/**
* Validates the static surface of a point constructor.
* This is only a cheap sanity check for the constructor hooks and fields consumed by generic
* factories; it does not certify `BASE`/`ZERO` semantics or prove the curve implementation itself.
* @param Point - Runtime point constructor.
* @throws On missing constructor hooks or malformed field metadata. {@link TypeError}
* @example
* Check that one point constructor exposes the static hooks generic helpers need.
*
* ```ts
* import { ed25519 } from '@noble/curves/ed25519.js';
* import { validatePointCons } from '@noble/curves/abstract/curve.js';
* validatePointCons(ed25519.Point);
* ```
*/
function validatePointCons(Point) {
	const pc = Point;
	if (typeof pc !== "function") throw new TypeError("\"Point\" expected constructor, got type=" + typeof Point);
	afunction(pc.fromAffine, "Point.fromAffine");
	afunction(pc.fromBytes, "Point.fromBytes");
	afunction(pc.fromHex, "Point.fromHex");
	aobject(pc.BASE, "Point.BASE");
	aobject(pc.ZERO, "Point.ZERO");
	validateField(pc.Fp);
	validateField(pc.Fn);
}
/**
* Takes a bunch of Projective Points but executes only one
* inversion on all of them. Inversion is very slow operation,
* so this improves performance massively.
* Optimization: converts a list of projective points to a list of identical points with Z=1.
* Input points are left unchanged; the normalized points are returned as fresh instances.
* @param c - Point constructor.
* @param points - Projective points.
* @returns Fresh projective points reconstructed from normalized affine coordinates.
* @example
* Batch-normalize projective points with a single shared inversion.
*
* ```ts
* import { normalizeZ } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const points = normalizeZ(p256.Point, [p256.Point.BASE, p256.Point.BASE.double()]);
* ```
*/
function normalizeZ(c, points) {
	validatePointCons(c);
	validateMSMPoints(points, c);
	const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
	return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits, min = 1) {
	if (!Number.isSafeInteger(W) || W < min || W > bits) throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
}
function validateTableBytes(numPoints, fpBytes) {
	const bytes = numPoints * (4 * fpBytes + 128);
	if (bytes > TABLE_BYTES_MAX) throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
}
/**
* Probes an RNG once, at construction time: returns `undefined` when it is unavailable —
* throws or returns malformed bytes — so callers can downgrade to their unblinded /
* deterministic constant-time fallback. Blinding is defense-in-depth (DPA/template
* hardening), not a correctness or key-secrecy requirement, so availability-based
* downgrade is acceptable.
*
* The downgrade decision is deliberately static. After a successful probe the RNG becomes
* part of the trusted contract: later misbehavior must fail closed in per-call validation
* (throw), never downgrade — a dynamic fallback would let a tampered RNG silently strip
* blinding on demand. A probe can only ever classify broken environments, not adversarial
* RNGs: a stateful RNG can always behave while probed and misbehave later.
* @param randomBytes - RNG to probe, or `undefined` when the environment provides none.
* @param length - Byte length requested from the probe call.
* @returns The RNG when the probe produced `length` valid bytes; `undefined` otherwise.
* @example
* Probe an RNG once before enabling scalar blinding.
*
* ```ts
* import { probeRandomBytes } from '@noble/curves/abstract/curve.js';
* import { randomBytes } from '@noble/hashes/utils.js';
* const rng = probeRandomBytes(randomBytes, 16);
* ```
*/
function probeRandomBytes(randomBytes, length) {
	if (randomBytes === void 0) return void 0;
	afunction(randomBytes, "randomBytes");
	try {
		const probe = randomBytes(length);
		if (!isBytes(probe) || probe.length !== length) return void 0;
	} catch {
		return;
	}
	return randomBytes;
}
function validateMSMPoints(points, c) {
	aarray(points, "points");
	points.forEach((p, i) => {
		if (!(p instanceof c)) throw new Error("invalid point at index " + i);
	});
}
function validateMSMScalars(scalars, field, maxScalar) {
	if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
	scalars.forEach((s, i) => {
		if (!(maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar)) throw new Error("invalid scalar at index " + i);
	});
}
const pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getWindowSize(P) {
	return pointWindowSizes.get(P) || 1;
}
/** Table of odd multiples [1P, 3P, ..., (2⋅size−1)P]; width-W wNAF uses size = 2^(W−2). */
function oddMultiples(p, size) {
	const dbl = p.double();
	const t = [p];
	for (let j = 1; j < size; j++) t.push(t[j - 1].add(dbl));
	return t;
}
/**
* Width-W wNAF signed-digit recoding (W >= 2), LSB-first: digits are 0 or odd with
* |digit| < 2^(W−1); nonzero density ~1/(W+1) (a nonzero digit is followed by W−1 zeros).
*/
function wnafDigits(n, W) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const d = [];
	while (n > _0n$2) {
		let w = 0;
		if (n & _1n$1) {
			w = Number(n & mask);
			if (w >= half) w -= size;
			n -= BigInt(w);
		}
		d.push(w);
		n >>= _1n$1;
	}
	return d;
}
/**
* Fixed-position signed-window recoding for precomputed wNAF: `n = Σ digits[w]⋅2^(w⋅W)` with
* digits in `[−2^(W−1)+1, 2^(W−1)]`. Digit count is fixed by `windows` (callers reserve one
* extra window for the final carry), so recoding length does not depend on the scalar.
*/
function signedWindowDigits(n, W, windows) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const shiftBy = BigInt(W);
	const d = [];
	for (let w = 0; w < windows; w++) {
		let v = Number(n & mask);
		n >>= shiftBy;
		if (v > half) {
			v -= size;
			n += _1n$1;
		}
		d.push(v);
	}
	if (n !== _0n$2) throw new Error("invalid wnaf");
	return d;
}
/**
* Shared vartime walk over per-scalar wNAF digit streams: one doubling of a single shared
* accumulator per bit position of the longest recoding, one signed table addition per
* nonzero digit. `tables[i]` must hold the odd multiples of the i-th point.
*/
function wnafWalk(zero, tables, digits) {
	let max = 0;
	for (const d of digits) max = Math.max(max, d.length);
	let acc = zero;
	for (let bit = max - 1; bit >= 0; bit--) {
		if (bit !== max - 1) acc = acc.double();
		for (let i = 0; i < digits.length; i++) {
			const w = digits[i][bit];
			if (w) {
				const item = tables[i][Math.abs(w) - 1 >> 1];
				acc = acc.add(w < 0 ? item.negate() : item);
			}
		}
	}
	return acc;
}
/**
* Elliptic curve multiplication of Point by scalar.
* Routes between cached-table, fixed-window, and one-shot wNAF paths; entry points validate
* their own scalars (`mulCT`/`mulCTBlinded`: `1 <= s < Fn.ORDER`; `mulUnsafe`: up to the
* `Fn.ORDER^4` DoS cap via {@link mulAddUnsafe}).
* Table generation is expensive and happens on first call of `multiply()`
* (or eagerly via `precompute(W, false)`). By default, `BASE` point is precomputed.
*
* Cached algorithm is signed fixed-window wNAF:
* - table stores, for every window w, the multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P` — all doublings
*   are baked in, so a multiplication is exactly one table addition per window
* - window count is fixed (`ceil(bits/W) + 1`), so the point-operation count is scalar-independent
*   (basis of the constant-time path)
* - for a 256-bit curve and W=6: 44⋅32 = 1408 table points, 44 additions per multiply
* - secret scalars are additionally blinded (see {@link ScalarMultiplier.mulCTBlinded}), which
*   widens tables by 128 bits
* @param Point - Point constructor.
* @param randomBytes - RNG used for scalar blinding; required by the blinded secret path.
* @example
* Elliptic curve multiplication of Point by scalar.
*
* ```ts
* import { ScalarMultiplier } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const mul = new ScalarMultiplier(p256.Point);
* ```
*/
var ScalarMultiplier = class {
	Point;
	BASE;
	ZERO;
	randomBytes;
	wnafPrecomputes = /* @__PURE__ */ new WeakMap();
	baseCanBeBlinded;
	bits;
	constructor(Point, randomBytes) {
		validatePointCons(Point);
		this.randomBytes = probeRandomBytes(randomBytes, BLIND_BYTES);
		this.Point = Point;
		this.BASE = Point.BASE;
		this.ZERO = Point.ZERO;
		this.bits = Point.Fn.BITS;
	}
	/**
	* Creates a signed fixed-window wNAF precomputation table: for every window w, the
	* multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
	* so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
	* window absorbs the final carry of signed-digit recoding.
	* For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
	* @param point - Point instance
	* @param W - window size
	* @param bits - scalar bitlength the table must cover
	*/
	buildWnafTable(point, W, bits) {
		const windows = Math.ceil(bits / W) + 1;
		const half = 2 ** (W - 1);
		const comp = [];
		let base = point;
		for (let w = 0; w < windows; w++) {
			let acc = base;
			for (let i = 0; i < half; i++) {
				comp.push(acc);
				acc = acc.add(base);
			}
			base = comp[comp.length - 1].double();
		}
		return {
			W,
			bits,
			windows,
			comp
		};
	}
	/**
	* Implements ec multiplication using precomputed signed fixed-window wNAF tables.
	* Constant-time: fixed window count with one table addition per window — zero digits feed
	* the fake accumulator — and no doublings; the lookup scans the whole window slice.
	* Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
	* {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
	* signedWindowDigits throws if `n` exceeds the table.
	* @returns real and fake (for const-time) points
	*/
	wnafCachedCT(precomputes, n) {
		const { W, windows, comp } = precomputes;
		const half = 2 ** (W - 1);
		const digits = signedWindowDigits(n, W, windows);
		let p = this.ZERO;
		let f = this.BASE;
		for (let w = 0; w < windows; w++) {
			const digit = digits[w];
			const start = w * half;
			const idx = Math.abs(digit) - 1;
			let sel = comp[start];
			for (let i = 1; i < half; i++) sel = i === idx ? comp[start + i] : sel;
			const neg = sel.negate();
			if (digit === 0) f = f.add(comp[start]);
			else p = p.add(digit < 0 ? neg : sel);
		}
		return {
			p,
			f
		};
	}
	getWnafPrecomputes(W, point, bits, transform) {
		let entries = this.wnafPrecomputes.get(point);
		let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
		if (!comp) {
			comp = this.buildWnafTable(point, W, bits);
			if (typeof transform === "function") comp = {
				...comp,
				comp: transform(comp.comp)
			};
			if (!entries) {
				entries = [];
				this.wnafPrecomputes.set(point, entries);
			}
			entries.push(comp);
		}
		return comp;
	}
	assertPoint(point) {
		if (!(point instanceof this.Point)) throw new TypeError("\"point\" expected Point instance, got type=" + typeof point);
	}
	validateMulInput(point, scalar) {
		this.assertPoint(point);
		if (!inRange(scalar, _1n$1, this.Point.Fn.ORDER)) throw new Error("invalid scalar");
	}
	runCT(point, n, bits, transform) {
		const W = getWindowSize(point);
		if (W === 1) return this.fixedWindowCT(point, n, bits);
		return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
	}
	mulCT(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		return this.runCT(point, scalar, this.bits, transform);
	}
	mulCTBlinded(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		if (this.randomBytes === void 0) throw new Error("randomBytes is required for scalar blinding");
		const bits = this.Point.Fn.BITS + BLIND_BITS;
		const blind = this.randomBytes(BLIND_BYTES);
		if (!isBytes(blind) || blind.length !== BLIND_BYTES) throw new Error("randomBytes returned invalid byte array");
		blind[0] = blind[0] & 63 | 128;
		const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
		return this.runCT(point, n, bits, transform);
	}
	/**
	* Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
	* A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
	* far cheaper to build for a single use. The point-operation sequence is independent of `n`:
	* build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
	* every table entry, and one addition (adds the identity when the window digit is 0 — never
	* skipped).
	*
	* `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
	* add), which holds for the Weierstrass/Edwards point types used here. The table is left in
	* projective form (no normalizeZ): normalizing this small a table costs more than the
	* mixed-add savings it would buy for a single multiply.
	* @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
	* (this path needs no fake accumulator — its op-count is already scalar-independent).
	*/
	fixedWindowCT(point, n, bits) {
		const W = FW_WINDOW;
		const size = 32;
		const mask = bitMask(W);
		const table = new Array(size);
		table[0] = this.ZERO;
		for (let i = 1; i < size; i++) table[i] = table[i - 1].add(point);
		const windows = Math.ceil(bits / W);
		let acc = this.ZERO;
		for (let window = windows - 1; window >= 0; window--) {
			if (window !== windows - 1) for (let d = 0; d < W; d++) acc = acc.double();
			const digit = Number(n >> BigInt(window * W) & mask);
			let sel = table[0];
			for (let i = 1; i < size; i++) sel = i === digit ? table[i] : sel;
			acc = acc.add(sel);
		}
		return {
			p: acc,
			f: acc
		};
	}
	shouldBlind(point, cofactor) {
		if (this.randomBytes === void 0) return false;
		if (cofactor === _1n$1) return true;
		if (point !== this.BASE) return false;
		if (this.baseCanBeBlinded === void 0) this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
		return this.baseCanBeBlinded;
	}
	mulSecret(point, scalar, cofactor, transform) {
		return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
	}
	mulUnsafe(point, scalar, transform) {
		this.assertPoint(point);
		if (!isPosBig(scalar)) throw new Error("invalid scalar");
		const W = getWindowSize(point);
		if (W === 1 || scalar >= this.Point.Fn.ORDER) return mulAddUnsafe(this.Point, [point], [scalar], true);
		const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
		return this.wnafCachedCT(precomputes, scalar).p;
	}
	setWindowSize(point, W) {
		this.assertPoint(point);
		validateW(W, this.bits);
		validateTableBytes((Math.ceil((this.bits + BLIND_BITS) / W) + 1) * 2 ** (W - 1), this.Point.Fp.BYTES);
		pointWindowSizes.set(point, W);
		this.wnafPrecomputes.delete(point);
	}
	hasWindowSize(point) {
		return getWindowSize(point) !== 1;
	}
};
/**
* Combined multi-scalar multiplication `Σ scalars[i]⋅points[i]` via interleaved width-4 wNAF
* (Strauss–Shamir). Every input gets its own table of odd multiples `[1P, 3P, 5P, 7P]` and
* signed-digit recoding, but all walks share one doubling chain, so total cost is
* `~bits` doublings + `L⋅bits/5` additions instead of `L⋅bits` doublings for separate
* multiplications. Intended for the 2-4 point shapes of signature verification
* (`R = u1⋅G + u2⋅P`); use {@link pippenger} for larger batches.
*
* Not constant-time: only for public inputs. Scalars must satisfy `0 <= s < Fn.ORDER`;
* fold negative signs into the points before calling.
* @param c - Point constructor.
* @param points - Array of curve points.
* @param scalars - Array of non-negative scalars, same length as points.
* @param allowOversized - Replace the `s < Fn.ORDER` scalar check with a `Fn.ORDER^4` DoS cap.
*   Off by default. For scalars that must NOT be reduced mod ORDER: torsion checks
*   (`Fn.ORDER⋅P ≟ O`) and cofactor-clearing multiples. Walk length grows with `bitLen(s)`.
* @returns Combined multiplication result; identity for empty input.
* @throws If the point set or scalar set is invalid. {@link Error}
* @example
* Combined multi-scalar multiplication via Strauss–Shamir.
*
* ```ts
* import { mulAddUnsafe } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const G = p256.Point.BASE;
* const R = mulAddUnsafe(p256.Point, [G, G.double()], [2n, 3n]); // 2⋅G + 3⋅(2⋅G)
* ```
*/
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
	validatePointCons(c);
	validateMSMPoints(points, c);
	abool(allowOversized, "allowOversized");
	validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n$1 : void 0);
	if (points.length !== scalars.length) throw new Error("arrays of points and scalars must have equal length");
	const tables = points.map((p) => oddMultiples(p, 4));
	const digits = scalars.map((n) => wnafDigits(n, 4));
	return wnafWalk(c.ZERO, tables, digits);
}
function createField(order, field, isLE) {
	if (field) {
		if (field.ORDER !== order) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
		validateField(field);
		return field;
	} else return Field(order, { isLE });
}
/**
* Validates basic CURVE shape and field membership, then creates fields.
* This does not prove that the generator is on-curve, that subgroup/order data are consistent, or
* that the curve equation itself is otherwise sane.
* @param type - Curve family.
* @param CURVE - Curve parameters.
* @param curveOpts - Optional field overrides. See {@link FpFn}:
*   - `Fp` (optional): Optional base-field override.
*   - `Fn` (optional): Optional scalar-field override.
* @param FpFnLE - Whether field encoding is little-endian.
* @returns Frozen curve parameters and fields.
* @throws If the curve parameters or field overrides are invalid. {@link Error}
* @example
* Build curve fields from raw constants before constructing a curve instance.
*
* ```ts
* const curve = createCurveFields('weierstrass', {
*   p: 17n,
*   n: 19n,
*   h: 1n,
*   a: 2n,
*   b: 2n,
*   Gx: 5n,
*   Gy: 1n,
* });
* ```
*/
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
	if (type !== "weierstrass" && type !== "edwards") throw new Error("expected curve type \"weierstrass\" or \"edwards\"");
	if (FpFnLE === void 0) FpFnLE = type === "edwards";
	if (!CURVE || typeof CURVE !== "object") throw new Error(`expected valid ${type} CURVE object`);
	validateObject(curveOpts);
	for (const p of [
		"p",
		"n",
		"h"
	]) {
		const val = CURVE[p];
		if (!(isPosBig(val) && val !== _0n$2)) throw new Error(`CURVE.${p} must be positive bigint`);
	}
	const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
	const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
	const params = [
		"Gx",
		"Gy",
		"a",
		type === "weierstrass" ? "b" : "d"
	];
	for (const p of params) if (!Fp.isValid(CURVE[p])) throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
	CURVE = Object.freeze(Object.assign({}, CURVE));
	return {
		CURVE,
		Fp,
		Fn
	};
}
/**
* @param randomSecretKey - Secret-key generator.
* @param getPublicKey - Public-key derivation helper.
* @returns Keypair generator.
* @example
* Build a `keygen()` helper from existing secret-key and public-key primitives.
*
* ```ts
* import { createKeygen } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const keygen = createKeygen(p256.utils.randomSecretKey, p256.getPublicKey);
* const pair = keygen();
* ```
*/
function createKeygen(randomSecretKey, getPublicKey) {
	return function keygen(seed) {
		const secretKey = randomSecretKey(seed);
		return {
			secretKey,
			publicKey: getPublicKey(secretKey)
		};
	};
}
//#endregion
//#region ../../node_modules/@noble/curves/abstract/der.js
/**
* ASN.1 DER (Distinguished Encoding Rules) helpers for ECDSA signatures.
* Only implements the tiny subset needed for `SEQUENCE(INTEGER r, INTEGER s)`.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$1 = /* @__PURE__ */ BigInt(0);
/**
* @param m - Error message.
* @example
* Throw a DER-specific error when signature parsing encounters invalid bytes.
*
* ```ts
* new DERErr('bad der');
* ```
*/
var DERErr = class extends Error {
	constructor(m = "") {
		super(m);
	}
};
const _DER = {
	Err: DERErr,
	_tlv: {
		encode: (tag, data) => {
			const { Err: E } = _DER;
			asafenumber(tag, "tag");
			if (tag < 0 || tag > 255) throw new E("tlv.encode: wrong tag");
			astring(data, "data");
			if (data.length & 1) throw new E("tlv.encode: unpadded data");
			const dataLen = data.length / 2;
			const len = numberToHexUnpadded(dataLen);
			if (len.length / 2 & 128) throw new E("tlv.encode: long form length too big");
			const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
			return numberToHexUnpadded(tag) + lenLen + len + data;
		},
		decode(tag, data) {
			const { Err: E } = _DER;
			data = abytes(data, void 0, "DER data");
			let pos = 0;
			if (tag < 0 || tag > 255) throw new E("tlv.decode: wrong tag");
			if (data.length < 2 || data[pos++] !== tag) throw new E("tlv.decode: wrong tlv");
			const first = data[pos++];
			const isLong = !!(first & 128);
			let length = 0;
			if (!isLong) length = first;
			else {
				const lenLen = first & 127;
				if (!lenLen) throw new E("tlv.decode(long): indefinite length not supported");
				if (lenLen > 4) throw new E("tlv.decode(long): byte length is too big");
				const lengthBytes = data.subarray(pos, pos + lenLen);
				if (lengthBytes.length !== lenLen) throw new E("tlv.decode: length bytes not complete");
				if (lengthBytes[0] === 0) throw new E("tlv.decode(long): zero leftmost byte");
				for (const b of lengthBytes) length = length << 8 | b;
				pos += lenLen;
				if (length < 128) throw new E("tlv.decode(long): not minimal encoding");
			}
			const v = data.subarray(pos, pos + length);
			if (v.length !== length) throw new E("tlv.decode: wrong value length");
			return {
				v,
				l: data.subarray(pos + length)
			};
		}
	},
	_int: {
		encode(num) {
			const { Err: E } = _DER;
			abignumber(num);
			if (num < _0n$1) throw new E("integer: negative integers are not allowed");
			let hex = numberToHexUnpadded(num);
			if (Number.parseInt(hex[0], 16) & 8) hex = "00" + hex;
			if (hex.length & 1) throw new E("unexpected DER parsing assertion: unpadded hex");
			return hex;
		},
		decode(data) {
			const { Err: E } = _DER;
			if (data.length < 1) throw new E("invalid signature integer: empty");
			if (data[0] & 128) throw new E("invalid signature integer: negative");
			if (data.length > 1 && data[0] === 0 && !(data[1] & 128)) throw new E("invalid signature integer: unnecessary leading zero");
			return bytesToNumberBE(data);
		}
	},
	toSig(bytes, maxScalarBytes) {
		const { Err: E, _int: int, _tlv: tlv } = _DER;
		if (maxScalarBytes !== void 0) {
			asafenumber(maxScalarBytes, "maxScalarBytes");
			if (maxScalarBytes < 1) throw new E("invalid signature: maxScalarBytes must be positive");
		}
		const data = abytes(bytes, void 0, "signature");
		const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
		if (seqLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
		const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
		const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
		if (sLeftBytes.length) throw new E("invalid signature: left bytes after parsing");
		if (maxScalarBytes !== void 0 && (rBytes.length > maxScalarBytes || sBytes.length > maxScalarBytes)) throw new E("invalid signature: integer too large");
		return {
			r: int.decode(rBytes),
			s: int.decode(sBytes)
		};
	},
	hexFromSig(sig) {
		const { _tlv: tlv, _int: int } = _DER;
		validateObject(sig, {
			r: "bigint",
			s: "bigint"
		}, {}, "sig");
		const seq = tlv.encode(2, int.encode(sig.r)) + tlv.encode(2, int.encode(sig.s));
		return tlv.encode(48, seq);
	}
};
/**
* ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
*
*     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
*
* Docs: {@link https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/ | Let's Encrypt ASN.1 guide} and
* {@link https://luca.ntop.org/Teaching/Appunti/asn1.html | Luca Deri's ASN.1 notes}.
* @example
* ASN.1 DER encoding utilities.
*
* ```ts
* const der = DER.hexFromSig({ r: 1n, s: 2n });
* ```
*/
const DER = /* @__PURE__ */ (() => {
	Object.freeze(_DER._tlv);
	Object.freeze(_DER._int);
	return Object.freeze(_DER);
})();
//#endregion
//#region ../../node_modules/@noble/curves/abstract/weierstrass.js
/**
* Short Weierstrass curve methods. The formula is: y² = x³ + ax + b.
*
* ### Design rationale for types
*
* * Interaction between classes from different curves should fail:
*   `k256.Point.BASE.add(p256.Point.BASE)`
* * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
* * Different calls of `curve()` would return different classes -
*   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
*   it won't affect others
*
* TypeScript can't infer types for classes created inside a function. Classes is one instance
* of nominative types in TypeScript and interfaces only check for shape, so it's hard to create
* unique type for every function call.
*
* We can use generic types via some param, like curve opts, but that would:
*     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
*     which is hard to debug.
*     2. Params can be generic and we can't enforce them to be constant value:
*     if somebody creates curve from non-constant params,
*     it would be allowed to interact with other curves with non-constant params
*
* @todo https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n$1) / den;
/** Splits scalar for GLV endomorphism. */
function _splitEndoScalar(k, basis, n) {
	aInRange("scalar", k, _0n, n);
	const [[a1, b1], [a2, b2]] = basis;
	const c1 = divNearest(b2 * k, n);
	const c2 = divNearest(-b1 * k, n);
	let k1 = k - c1 * a1 - c2 * a2;
	let k2 = -c1 * b1 - c2 * b2;
	const k1neg = k1 < _0n;
	const k2neg = k2 < _0n;
	if (k1neg) k1 = -k1;
	if (k2neg) k2 = -k2;
	const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n;
	if (k1 < _0n || k1 >= MAX_NUM || k2 < _0n || k2 >= MAX_NUM) throw new Error("splitScalar (endomorphism): failed for k");
	return {
		k1neg,
		k1,
		k2neg,
		k2
	};
}
function validateSigFormat(format) {
	if (![
		"compact",
		"recovered",
		"der"
	].includes(format)) throw new Error("Signature format must be \"compact\", \"recovered\", or \"der\"");
	return format;
}
function validateSigOpts(opts, def) {
	validateObject(opts);
	const optsn = {};
	for (let optName of Object.keys(def)) optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
	abool(optsn.lowS, "lowS");
	abool(optsn.prehash, "prehash");
	if (optsn.format !== void 0) validateSigFormat(optsn.format);
	return optsn;
}
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n$1 = /* @__PURE__ */ BigInt(2);
const _3n = /* @__PURE__ */ BigInt(3);
const _4n = /* @__PURE__ */ BigInt(4);
/**
* Creates weierstrass Point constructor, based on specified curve options.
*
* See {@link WeierstrassOpts}.
* @param params - Curve parameters. See {@link WeierstrassOpts}.
* @param extraOpts - Optional helpers and overrides. See {@link WeierstrassExtraOpts}.
* @returns Weierstrass point constructor.
* @throws If the curve parameters, overrides, or point codecs are invalid. {@link Error}
*
* @example
* Construct a point type from explicit Weierstrass curve parameters.
*
* ```js
* const opts = {
*   p: 0xfffffffffffffffffffffffffffffffeffffac73n,
*   n: 0x100000000000000000001b8fa16dfab9aca16b6b3n,
*   h: 1n,
*   a: 0n,
*   b: 7n,
*   Gx: 0x3b4c382ce37aa192a4019e763036f4f5dd4d7ebbn,
*   Gy: 0x938cf935318fdced6bc28286531733c3f03c4feen,
* };
* const secp160k1_Point = weierstrass(opts);
* ```
*/
function weierstrass(params, extraOpts = {}) {
	const validated = createCurveFields("weierstrass", params, extraOpts);
	const Fp = validated.Fp;
	const Fn = validated.Fn;
	let CURVE = validated.CURVE;
	const { h: cofactor, n: CURVE_ORDER } = CURVE;
	validateObject(extraOpts, {}, {
		allowInfinityPoint: "boolean",
		clearCofactor: "function",
		isTorsionFree: "function",
		fromBytes: "function",
		toBytes: "function",
		endo: "object",
		randomBytes: "function"
	});
	const { endo: endoOpts, allowInfinityPoint, clearCofactor, isTorsionFree, fromBytes, toBytes } = extraOpts;
	const randomBytes$2 = extraOpts.randomBytes === void 0 ? randomBytes : extraOpts.randomBytes;
	if (endoOpts) {
		if (!Fp.is0(CURVE.a) || typeof endoOpts.beta !== "bigint" || !Array.isArray(endoOpts.basises)) throw new Error("invalid endo: expected \"beta\": bigint and \"basises\": array");
	}
	const endo = endoOpts ? {
		beta: endoOpts.beta,
		basises: endoOpts.basises.map((basis) => [...basis])
	} : void 0;
	const lengths = getWLengths(Fp, Fn);
	function assertCompressionIsSupported() {
		if (!Fp.isOdd) throw new Error("compression is not supported: Field does not have .isOdd()");
	}
	function pointToBytes(_c, point, isCompressed) {
		if (point.is0()) {
			if (!allowInfinityPoint) throw new Error("bad point: ZERO");
			return Uint8Array.of(0);
		}
		const { x, y } = point.toAffine();
		const bx = Fp.toBytes(x);
		abool(isCompressed, "isCompressed");
		if (isCompressed) {
			assertCompressionIsSupported();
			const hasEvenY = !Fp.isOdd(y);
			return concatBytes(pprefix(hasEvenY), bx);
		} else return concatBytes(Uint8Array.of(4), bx, Fp.toBytes(y));
	}
	function pointFromBytes(bytes) {
		abytes(bytes, void 0, "Point");
		const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
		const length = bytes.length;
		const head = bytes[0];
		const tail = bytes.subarray(1);
		if (allowInfinityPoint && length === 1 && head === 0) return {
			x: Fp.ZERO,
			y: Fp.ZERO
		};
		if (length === comp && (head === 2 || head === 3)) {
			const x = Fp.fromBytes(tail);
			if (!Fp.isValid(x)) throw new Error("bad point: is not on curve, wrong x");
			const y2 = weierstrassEquation(x);
			let y;
			try {
				y = Fp.sqrt(y2);
			} catch (sqrtError) {
				const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
				throw new Error("bad point: is not on curve, sqrt error" + err);
			}
			assertCompressionIsSupported();
			const evenY = Fp.isOdd(y);
			if ((head & 1) === 1 !== evenY) y = Fp.neg(y);
			return {
				x,
				y
			};
		} else if (length === uncomp && head === 4) {
			const L = Fp.BYTES;
			const x = Fp.fromBytes(tail.subarray(0, L));
			const y = Fp.fromBytes(tail.subarray(L, L * 2));
			if (!isValidXY(x, y)) throw new Error("bad point: is not on curve");
			return {
				x,
				y
			};
		} else throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
	}
	const encodePoint = toBytes === void 0 ? pointToBytes : toBytes;
	const decodePoint = fromBytes === void 0 ? pointFromBytes : fromBytes;
	const b3 = Fp.mul(CURVE.b, _3n);
	const mulA = Fp.is0(CURVE.a) ? (_) => Fp.ZERO : (x) => Fp.mul(CURVE.a, x);
	function weierstrassEquation(x) {
		const x2 = Fp.sqr(x);
		const x3 = Fp.mul(x2, x);
		return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
	}
	/** Checks whether equation holds for given x, y: y² == x³ + ax + b */
	function isValidXY(x, y) {
		const left = Fp.sqr(y);
		const right = weierstrassEquation(x);
		return Fp.eql(left, right);
	}
	if (!isValidXY(CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
	const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n), _4n);
	const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
	if (Fp.is0(Fp.add(_4a3, _27b2))) throw new Error("bad curve params: a or b");
	/** Asserts coordinate is valid: 0 <= n < Fp.ORDER. */
	function acoord(title, n, banZero = false) {
		if (!Fp.isValid(n) || banZero && Fp.is0(n)) throw new Error(`bad point coordinate ${title}`);
		return typeof n === "object" && n !== null ? Fp.create(n) : n;
	}
	function aprjpoint(other) {
		if (!(other instanceof Point)) throw new Error("Weierstrass Point expected");
	}
	function splitEndoScalarN(k) {
		if (!endo || !endo.basises) throw new Error("no endo");
		return _splitEndoScalar(k, endo.basises, Fn.ORDER);
	}
	/**
	* Appends a (point, scalar) pair to the inputs of a vartime wNAF walk
	* ({@link mulAddUnsafe}). With GLV endomorphism the scalar is split into two half-width
	* pairs against P and ψ(P) = (β⋅x, y), halving the walk's shared doubling chain;
	* split signs fold into the points.
	*/
	function pushWnafPair(points, scalars, p, k) {
		if (!Fn.isValid(k)) throw new RangeError("invalid scalar: out of range");
		if (endo) {
			const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(k);
			const psi = new Point(Fp.mul(p.X, endo.beta), p.Y, p.Z);
			points.push(k1neg ? p.negate() : p, k2neg ? psi.negate() : psi);
			scalars.push(k1, k2);
		} else {
			points.push(p);
			scalars.push(k);
		}
	}
	const validityCache = /* @__PURE__ */ new WeakSet();
	/**
	* Projective Point works in 3d / projective (homogeneous) coordinates:(X, Y, Z) ∋ (x=X/Z, y=Y/Z).
	* Default Point works in 2d / affine coordinates: (x, y).
	* We're doing calculations in projective, because its operations don't require costly inversion.
	*/
	class Point {
		static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
		static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
		static Fp = Fp;
		static Fn = Fn;
		X;
		Y;
		Z;
		/** Does NOT validate if the point is valid. Use `.assertValidity()`. */
		constructor(X, Y, Z) {
			this.X = acoord("x", X);
			this.Y = acoord("y", Y, true);
			this.Z = acoord("z", Z);
			Object.freeze(this);
		}
		static CURVE() {
			return CURVE;
		}
		/** Does NOT validate if the point is valid. Use `.assertValidity()`. */
		static fromAffine(p) {
			const { x, y } = p || {};
			if (!p || !Fp.isValid(x) || !Fp.isValid(y)) throw new Error("invalid affine point");
			if (p instanceof Point) throw new Error("projective point not allowed");
			if (Fp.is0(x) && Fp.is0(y)) return Point.ZERO;
			return new Point(x, y, Fp.ONE);
		}
		static fromBytes(bytes) {
			const P = Point.fromAffine(decodePoint(abytes(bytes, void 0, "point")));
			P.assertValidity();
			return P;
		}
		static fromHex(hex) {
			return Point.fromBytes(hexToBytes(hex));
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		/**
		* @param isLazy - true will defer table computation until the first multiplication
		*/
		precompute(windowSize = 6, isLazy = true) {
			wnaf.setWindowSize(this, windowSize);
			if (!isLazy) this.multiply(_3n);
			return this;
		}
		/** A point on curve is valid if it conforms to equation. */
		assertValidity() {
			const p = this;
			if (p.is0()) {
				if (allowInfinityPoint && Fp.is0(p.X) && Fp.eql(p.Y, Fp.ONE) && Fp.is0(p.Z)) return;
				throw new Error("bad point: ZERO");
			}
			if (validityCache.has(p)) return;
			const { x, y } = p.toAffine();
			if (!Fp.isValid(x) || !Fp.isValid(y)) throw new Error("bad point: x or y not field elements");
			if (!isValidXY(x, y)) throw new Error("bad point: equation left != right");
			if (!p.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
			validityCache.add(p);
		}
		hasEvenY() {
			const { y } = this.toAffine();
			if (!Fp.isOdd) throw new Error("Field doesn't support isOdd");
			return !Fp.isOdd(y);
		}
		/** Compare one point to another. */
		equals(other) {
			aprjpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
			const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
			return U1 && U2;
		}
		/** Flips point to one corresponding to (x, -y) in Affine coordinates. */
		negate() {
			return new Point(this.X, Fp.neg(this.Y), this.Z);
		}
		double() {
			const { X: X1, Y: Y1, Z: Z1 } = this;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			let t0 = Fp.mul(X1, X1);
			let t1 = Fp.mul(Y1, Y1);
			let t2 = Fp.mul(Z1, Z1);
			let t3 = Fp.mul(X1, Y1);
			t3 = Fp.add(t3, t3);
			Z3 = Fp.mul(X1, Z1);
			Z3 = Fp.add(Z3, Z3);
			X3 = mulA(Z3);
			Y3 = Fp.mul(b3, t2);
			Y3 = Fp.add(X3, Y3);
			X3 = Fp.sub(t1, Y3);
			Y3 = Fp.add(t1, Y3);
			Y3 = Fp.mul(X3, Y3);
			X3 = Fp.mul(t3, X3);
			Z3 = Fp.mul(b3, Z3);
			t2 = mulA(t2);
			t3 = Fp.sub(t0, t2);
			t3 = mulA(t3);
			t3 = Fp.add(t3, Z3);
			Z3 = Fp.add(t0, t0);
			t0 = Fp.add(Z3, t0);
			t0 = Fp.add(t0, t2);
			t0 = Fp.mul(t0, t3);
			Y3 = Fp.add(Y3, t0);
			t2 = Fp.mul(Y1, Z1);
			t2 = Fp.add(t2, t2);
			t0 = Fp.mul(t2, t3);
			X3 = Fp.sub(X3, t0);
			Z3 = Fp.mul(t2, t1);
			Z3 = Fp.add(Z3, Z3);
			Z3 = Fp.add(Z3, Z3);
			return new Point(X3, Y3, Z3);
		}
		add(other) {
			aprjpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
			let t0 = Fp.mul(X1, X2);
			let t1 = Fp.mul(Y1, Y2);
			let t2 = Fp.mul(Z1, Z2);
			let t3 = Fp.add(X1, Y1);
			let t4 = Fp.add(X2, Y2);
			t3 = Fp.mul(t3, t4);
			t4 = Fp.add(t0, t1);
			t3 = Fp.sub(t3, t4);
			t4 = Fp.add(X1, Z1);
			let t5 = Fp.add(X2, Z2);
			t4 = Fp.mul(t4, t5);
			t5 = Fp.add(t0, t2);
			t4 = Fp.sub(t4, t5);
			t5 = Fp.add(Y1, Z1);
			X3 = Fp.add(Y2, Z2);
			t5 = Fp.mul(t5, X3);
			X3 = Fp.add(t1, t2);
			t5 = Fp.sub(t5, X3);
			Z3 = mulA(t4);
			X3 = Fp.mul(b3, t2);
			Z3 = Fp.add(X3, Z3);
			X3 = Fp.sub(t1, Z3);
			Z3 = Fp.add(t1, Z3);
			Y3 = Fp.mul(X3, Z3);
			t1 = Fp.add(t0, t0);
			t1 = Fp.add(t1, t0);
			t2 = mulA(t2);
			t4 = Fp.mul(b3, t4);
			t1 = Fp.add(t1, t2);
			t2 = Fp.sub(t0, t2);
			t2 = mulA(t2);
			t4 = Fp.add(t4, t2);
			t0 = Fp.mul(t1, t4);
			Y3 = Fp.add(Y3, t0);
			t0 = Fp.mul(t5, t4);
			X3 = Fp.mul(t3, X3);
			X3 = Fp.sub(X3, t0);
			t0 = Fp.mul(t3, t1);
			Z3 = Fp.mul(t5, Z3);
			Z3 = Fp.add(Z3, t0);
			return new Point(X3, Y3, Z3);
		}
		subtract(other) {
			aprjpoint(other);
			return this.add(other.negate());
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		/**
		* Constant time multiplication.
		* Uses precomputed tables (signed fixed-window wNAF) when available.
		* Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
		* @param scalar - by which the point would be multiplied
		* @returns New point
		*/
		multiply(scalar) {
			if (!Fn.isValidNot0(scalar)) throw new RangeError("invalid scalar: out of range");
			const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
			return normalize([p, f])[0];
		}
		/**
		* Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
		* when available (two half-width scalars sharing one halved doubling chain).
		* It's faster, but should only be used when you don't care about
		* an exposed secret key e.g. sig verification, which works over *public* keys.
		*/
		multiplyUnsafe(scalar) {
			const p = this;
			const sc = scalar;
			if (!Fn.isValid(sc)) throw new RangeError("invalid scalar: out of range");
			if (sc === _0n || p.is0()) return Point.ZERO;
			if (sc === _1n) return p;
			if (wnaf.hasWindowSize(this)) return wnaf.mulUnsafe(p, sc, normalize);
			const points = [];
			const scalars = [];
			pushWnafPair(points, scalars, p, sc);
			return mulAddUnsafe(Point, points, scalars);
		}
		/**
		* Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
		* Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
		* (when available) halves the chain again by splitting each scalar into two half-width
		* parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
		* Only for public scalars.
		*/
		mulAddUnsafe(a, other, b) {
			aprjpoint(other);
			const points = [];
			const scalars = [];
			pushWnafPair(points, scalars, this, a);
			pushWnafPair(points, scalars, other, b);
			return mulAddUnsafe(Point, points, scalars);
		}
		/**
		* Converts Projective point to affine (x, y) coordinates.
		* (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
		* @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
		*/
		toAffine(invertedZ) {
			const p = this;
			let iz = invertedZ;
			if (iz != null && !Fp.isValid(iz)) throw new RangeError("\"invertedZ\" expected valid field element");
			const { X, Y, Z } = p;
			if (Fp.eql(Z, Fp.ONE)) return {
				x: X,
				y: Y
			};
			const is0 = p.is0();
			if (iz == null) iz = is0 ? Fp.ONE : Fp.inv(Z);
			const x = Fp.mul(X, iz);
			const y = Fp.mul(Y, iz);
			const zz = Fp.mul(Z, iz);
			if (is0) return {
				x: Fp.ZERO,
				y: Fp.ZERO
			};
			if (!Fp.eql(zz, Fp.ONE)) throw new Error("invZ was invalid");
			return {
				x,
				y
			};
		}
		/**
		* Checks whether Point is free of torsion elements (is in prime subgroup).
		* Always torsion-free for cofactor=1 curves.
		*/
		isTorsionFree() {
			if (cofactor === _1n) return true;
			if (isTorsionFree) return isTorsionFree(Point, this);
			return wnaf.mulUnsafe(this, CURVE_ORDER).is0();
		}
		clearCofactor() {
			if (cofactor === _1n) return this;
			if (clearCofactor) return clearCofactor(Point, this);
			return this.multiplyUnsafe(cofactor);
		}
		isSmallOrder() {
			if (cofactor === _1n) return this.is0();
			return this.clearCofactor().is0();
		}
		toBytes(isCompressed = true) {
			abool(isCompressed, "isCompressed");
			this.assertValidity();
			return encodePoint(Point, this, isCompressed);
		}
		toHex(isCompressed = true) {
			return bytesToHex$1(this.toBytes(isCompressed));
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	const normalize = (points) => normalizeZ(Point, points);
	const wnaf = new ScalarMultiplier(Point, randomBytes$2);
	if (wnaf.bits >= 6) Point.BASE.precompute(6);
	Object.freeze(Point.prototype);
	Object.freeze(Point);
	return Point;
}
function pprefix(hasEvenY) {
	return Uint8Array.of(hasEvenY ? 2 : 3);
}
function getWLengths(Fp, Fn) {
	return {
		secretKey: Fn.BYTES,
		publicKey: 1 + Fp.BYTES,
		publicKeyUncompressed: 1 + 2 * Fp.BYTES,
		publicKeyHasPrefix: true,
		signature: 2 * Fn.BYTES
	};
}
/**
* Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
* This helper ensures no signature functionality is present. Less code, smaller bundle size.
* @param Point - Weierstrass point constructor.
* @param ecdhOpts - Optional randomness helpers:
*   - `randomBytes` (optional): Optional RNG override.
* @returns ECDH helper namespace.
* @example
* Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
*
* ```ts
* import { ecdh } from '@noble/curves/abstract/weierstrass.js';
* import { p256 } from '@noble/curves/nist.js';
* const dh = ecdh(p256.Point);
* const alice = dh.keygen();
* const shared = dh.getSharedSecret(alice.secretKey, alice.publicKey);
* ```
*/
function ecdh(Point, ecdhOpts = {}) {
	validatePointCons(Point);
	const { Fn } = Point;
	const randomBytes_ = ecdhOpts.randomBytes === void 0 ? randomBytes : ecdhOpts.randomBytes;
	const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: Math.max(getMinHashLength(Fn.ORDER), 16) });
	function isValidSecretKey(secretKey) {
		try {
			const num = Fn.fromBytes(secretKey);
			return Fn.isValidNot0(num);
		} catch (error) {
			return false;
		}
	}
	function isValidPublicKey(publicKey, isCompressed) {
		const { publicKey: comp, publicKeyUncompressed } = lengths;
		try {
			const l = publicKey.length;
			if (isCompressed === true && l !== comp) return false;
			if (isCompressed === false && l !== publicKeyUncompressed) return false;
			return !Point.fromBytes(publicKey).is0();
		} catch (error) {
			return false;
		}
	}
	/**
	* Produces cryptographically secure secret key from random of size
	* (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
	*/
	function randomSecretKey(seed) {
		seed = seed === void 0 ? randomBytes_(lengths.seed) : seed;
		return mapHashToField(abytes(seed, lengths.seed, "seed"), Fn.ORDER);
	}
	/**
	* Computes public key for a secret key. Checks for validity of the secret key.
	* @param isCompressed - whether to return compact (default), or full key
	* @returns Public key, full when isCompressed=false; short when isCompressed=true
	*/
	function getPublicKey(secretKey, isCompressed = true) {
		return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
	}
	/**
	* Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
	*/
	function isProbPub(item) {
		const { secretKey, publicKey, publicKeyUncompressed } = lengths;
		const allowedLengths = Fn._lengths;
		if (!isBytes(item)) return void 0;
		const l = abytes(item, void 0, "key").length;
		const isPub = l === publicKey || l === publicKeyUncompressed;
		const isSec = l === secretKey || !!allowedLengths?.includes(l);
		if (isPub && isSec) return void 0;
		return isPub;
	}
	/**
	* ECDH (Elliptic Curve Diffie Hellman).
	* Computes encoded shared point from secret key A and public key B.
	* Checks: 1) secret key validity 2) shared key is on-curve.
	* Does NOT hash the result or expose the SEC 1 x-coordinate-only `z`.
	* Returns the encoded shared point on purpose: callers that need `x_P`
	* can derive it from the encoded point, but `x_P` alone cannot recover the
	* point/parity back.
	* This helper only exposes the fully validated public-key path, not cofactor DH.
	* @param isCompressed - whether to return compact (default), or full key
	* @returns shared point encoding
	*/
	function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
		if (isProbPub(secretKeyA) === true) throw new Error("first arg must be private key");
		if (isProbPub(publicKeyB) === false) throw new Error("second arg must be public key");
		const s = Fn.fromBytes(secretKeyA);
		const b = Point.fromBytes(publicKeyB);
		if (b.is0()) throw new Error("invalid public key: point at infinity");
		return b.multiply(s).toBytes(isCompressed);
	}
	const utils = {
		isValidSecretKey,
		isValidPublicKey,
		randomSecretKey
	};
	const keygen = createKeygen(randomSecretKey, getPublicKey);
	Object.freeze(utils);
	Object.freeze(lengths);
	return Object.freeze({
		getPublicKey,
		getSharedSecret,
		keygen,
		Point,
		utils,
		lengths
	});
}
/**
* Creates ECDSA signing interface for given elliptic curve `Point` and `hash` function.
*
* @param Point - created using {@link weierstrass} function
* @param hash - used for 1) message prehash-ing 2) k generation in `sign`, using hmac_drbg(hash)
* @param ecdsaOpts - rarely needed, see {@link ECDSAOpts}:
*   - `lowS`: Default low-S policy.
*   - `hmac`: HMAC implementation used by RFC6979 DRBG.
*   - `randomBytes`: Optional RNG override.
*   - `bits2int`: Optional hash-to-int conversion override.
*   - `bits2int_modN`: Optional hash-to-int-mod-n conversion override.
*
* @returns ECDSA helper namespace.
* @example
* Create an ECDSA signer/verifier bundle for one curve implementation.
*
* ```ts
* import { ecdsa } from '@noble/curves/abstract/weierstrass.js';
* import { p256 } from '@noble/curves/nist.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const p256ecdsa = ecdsa(p256.Point, sha256);
* const { secretKey, publicKey } = p256ecdsa.keygen();
* const msg = new TextEncoder().encode('hello noble');
* const sig = p256ecdsa.sign(msg, secretKey);
* const isValid = p256ecdsa.verify(sig, msg, publicKey);
* ```
*/
function ecdsa(Point, hash, ecdsaOpts = {}) {
	validatePointCons(Point);
	const hash_ = hash;
	ahash(hash_);
	validateObject(ecdsaOpts, {}, {
		hmac: "function",
		lowS: "boolean",
		randomBytes: "function",
		bits2int: "function",
		bits2int_modN: "function"
	});
	const opts = Object.assign({}, ecdsaOpts);
	const randomBytes$3 = opts.randomBytes === void 0 ? randomBytes : opts.randomBytes;
	const hmac$1 = opts.hmac === void 0 ? (key, msg) => hmac(hash_, key, msg) : opts.hmac;
	const { Fp, Fn } = Point;
	const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
	const blindLength = getMinHashLength(CURVE_ORDER);
	const csprng = probeRandomBytes(randomBytes$3, blindLength);
	const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, opts);
	const defaultSigOpts = {
		prehash: true,
		lowS: typeof opts.lowS === "boolean" ? opts.lowS : true,
		format: "compact",
		extraEntropy: false
	};
	const hasLargeRecoveryLifts = CURVE_ORDER * _2n$1 + _1n < Fp.ORDER;
	function isBiggerThanHalfOrder(number) {
		return number > CURVE_ORDER >> _1n;
	}
	function validateRS(title, num) {
		if (!Fn.isValidNot0(num)) throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
		return num;
	}
	function assertFieldSignIsSupported() {
		if (!Fp.isOdd) throw new Error("Field doesn't support isOdd");
	}
	function getRecoveryBit(x, y, r) {
		assertFieldSignIsSupported();
		return (x === r ? 0 : 2) | Number(Fp.isOdd(y));
	}
	function assertRecoverableCurve() {
		if (hasLargeRecoveryLifts) throw new Error("\"recovered\" sig type is not supported for cofactor >2 curves");
	}
	function validateSigLength(bytes, format) {
		validateSigFormat(format);
		const size = lengths.signature;
		const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
		return abytes(bytes, sizer);
	}
	/**
	* ECDSA signature with its (r, s) properties. Supports compact, recovered & DER representations.
	*/
	class Signature {
		r;
		s;
		recovery;
		constructor(r, s, recovery) {
			this.r = validateRS("r", r);
			this.s = validateRS("s", s);
			if (recovery != null) {
				assertRecoverableCurve();
				if (![
					0,
					1,
					2,
					3
				].includes(recovery)) throw new Error("invalid recovery id");
				this.recovery = recovery;
			}
			Object.freeze(this);
		}
		static fromBytes(bytes, format = defaultSigOpts.format) {
			validateSigLength(bytes, format);
			let recid;
			if (format === "der") {
				if (bytes.length > 2 * Fn.BYTES + 16) throw new DER.Err("invalid signature: DER signature too long");
				const { r, s } = DER.toSig(abytes(bytes), Fn.BYTES + 1);
				return new Signature(r, s);
			}
			if (format === "recovered") {
				recid = bytes[0];
				format = "compact";
				bytes = bytes.subarray(1);
			}
			const L = lengths.signature / 2;
			const r = bytes.subarray(0, L);
			const s = bytes.subarray(L, L * 2);
			return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
		}
		static fromHex(hex, format) {
			return this.fromBytes(hexToBytes(hex), format);
		}
		assertRecovery() {
			const { recovery } = this;
			if (recovery == null) throw new Error("invalid recovery id: must be present");
			return recovery;
		}
		addRecoveryBit(recovery) {
			return new Signature(this.r, this.s, recovery);
		}
		recoverPublicKey(messageHash) {
			const { r, s } = this;
			const recovery = this.assertRecovery();
			const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER : r;
			if (!Fp.isValid(radj)) throw new Error("invalid recovery id: sig.r+curve.n != R.x");
			const x = Fp.toBytes(radj);
			const R = Point.fromBytes(concatBytes(pprefix((recovery & 1) === 0), x));
			const ir = Fn.inv(radj);
			const h = bits2int_modN(abytes(messageHash, void 0, "msgHash"));
			const u1 = Fn.create(-h * ir);
			const u2 = Fn.create(s * ir);
			const Q = Point.BASE.mulAddUnsafe(u1, R, u2);
			if (Q.is0()) throw new Error("invalid recovery: point at infinify");
			Q.assertValidity();
			return Q;
		}
		hasHighS() {
			return isBiggerThanHalfOrder(this.s);
		}
		toBytes(format = defaultSigOpts.format) {
			validateSigFormat(format);
			if (format === "der") return hexToBytes(DER.hexFromSig(this));
			const { r, s } = this;
			const rb = Fn.toBytes(r);
			const sb = Fn.toBytes(s);
			if (format === "recovered") {
				assertRecoverableCurve();
				return concatBytes(Uint8Array.of(this.assertRecovery()), rb, sb);
			}
			return concatBytes(rb, sb);
		}
		toHex(format) {
			return bytesToHex$1(this.toBytes(format));
		}
	}
	Object.freeze(Signature.prototype);
	Object.freeze(Signature);
	const bits2int = opts.bits2int === void 0 ? function bits2int_def(bytes) {
		if (bytes.length > 8192) throw new Error("input is too large");
		const num = bytesToNumberBE(bytes);
		const delta = bytes.length * 8 - fnBits;
		return delta > 0 ? num >> BigInt(delta) : num;
	} : opts.bits2int;
	const bits2int_modN = opts.bits2int_modN === void 0 ? function bits2int_modN_def(bytes) {
		return Fn.create(bits2int(bytes));
	} : opts.bits2int_modN;
	const ORDER_MASK = bitMask(fnBits);
	/** Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`. */
	function int2octets(num) {
		aInRange("num < 2^" + fnBits, num, _0n, ORDER_MASK);
		return Fn.toBytes(num);
	}
	function validateMsgAndHash(message, prehash) {
		abytes(message, void 0, "message");
		return prehash ? abytes(hash_(message), void 0, "prehashed message") : message;
	}
	/**
	* Steps A, D of RFC6979 3.2.
	* Creates RFC6979 seed; converts msg/privKey to numbers.
	* Used only in sign, not in verify.
	*
	* Warning: we cannot assume here that message has same amount of bytes as curve order,
	* this will be invalid at least for P521. Also it can be bigger for P224 + SHA256.
	*/
	function prepSig(message, secretKey, opts) {
		const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
		message = validateMsgAndHash(message, prehash);
		const h1int = bits2int_modN(message);
		const d = Fn.fromBytes(secretKey);
		if (!Fn.isValidNot0(d)) throw new Error("invalid private key");
		const seedArgs = [int2octets(d), int2octets(h1int)];
		if (extraEntropy != null && extraEntropy !== false) {
			const e = extraEntropy === true ? randomBytes$3(lengths.secretKey) : extraEntropy;
			seedArgs.push(abytes(e, void 0, "extraEntropy"));
		}
		const seed = concatBytes(...seedArgs);
		const m = h1int;
		function k2sig(kBytes) {
			const k = bits2int(kBytes);
			if (!Fn.isValidNot0(k)) return;
			const q = Point.BASE.multiply(k).toAffine();
			const r = Fn.create(q.x);
			if (r === _0n) return;
			let s;
			if (csprng !== void 0) {
				const b = bytesToNumberBE(mapHashToField(csprng(blindLength), CURVE_ORDER));
				const ibk = Fn.inv(Fn.mul(b, k));
				const bm = Fn.mul(b, m);
				const bd = Fn.mul(b, d);
				s = Fn.create(ibk * Fn.create(bm + bd * r));
			} else {
				const ik = invertCt(k, CURVE_ORDER);
				s = Fn.create(ik * Fn.create(m + r * d));
			}
			if (s === _0n) return;
			let recovery = getRecoveryBit(q.x, q.y, r);
			let normS = s;
			if (lowS && isBiggerThanHalfOrder(s)) {
				normS = Fn.neg(s);
				recovery ^= 1;
			}
			return new Signature(r, normS, hasLargeRecoveryLifts ? void 0 : recovery);
		}
		return {
			seed,
			k2sig
		};
	}
	/**
	* Signs a message or message hash with a secret key.
	* With the default `prehash: true`, raw message bytes are hashed internally;
	* only `{ prehash: false }` expects a caller-supplied digest.
	*
	* ```
	* sign(m, d) where
	*   k = rfc6979_hmac_drbg(m, d)
	*   (x, y) = G × k
	*   r = x mod n
	*   s = (m + dr) / k mod n
	* ```
	*/
	function sign(message, secretKey, opts = {}) {
		const { seed, k2sig } = prepSig(message, secretKey, opts);
		return createHmacDrbg(hash_.outputLen, Fn.BYTES, hmac$1)(seed, k2sig).toBytes(opts.format);
	}
	/**
	* Verifies a signature against message and public key.
	* Rejects lowS signatures by default: see {@link ECDSAVerifyOpts}.
	* Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
	*
	* ```
	* verify(r, s, h, P) where
	*   u1 = hs^-1 mod n
	*   u2 = rs^-1 mod n
	*   R = u1⋅G + u2⋅P
	*   mod(R.x, n) == r
	* ```
	*/
	function verify(signature, message, publicKey, opts = {}) {
		const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
		publicKey = abytes(publicKey, void 0, "publicKey");
		message = validateMsgAndHash(message, prehash);
		if (!isBytes(signature)) {
			const end = signature instanceof Signature ? ", use sig.toBytes()" : "";
			throw new Error("verify expects Uint8Array signature" + end);
		}
		validateSigLength(signature, format);
		try {
			const sig = Signature.fromBytes(signature, format);
			const P = Point.fromBytes(publicKey);
			if (P.is0()) return false;
			if (lowS && sig.hasHighS()) return false;
			const { r, s } = sig;
			const h = bits2int_modN(message);
			const is = Fn.inv(s);
			const u1 = Fn.create(h * is);
			const u2 = Fn.create(r * is);
			const R = Point.BASE.mulAddUnsafe(u1, P, u2);
			if (R.is0()) return false;
			const q = R.toAffine();
			if (Fn.create(q.x) !== r) return false;
			if (format === "recovered" && sig.recovery !== getRecoveryBit(q.x, q.y, r)) return false;
			return true;
		} catch (e) {
			return false;
		}
	}
	function recoverPublicKey(signature, message, opts = {}) {
		const { prehash } = validateSigOpts(opts, defaultSigOpts);
		message = validateMsgAndHash(message, prehash);
		return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
	}
	return Object.freeze({
		keygen,
		getPublicKey,
		getSharedSecret,
		utils,
		lengths,
		Point,
		sign,
		verify,
		recoverPublicKey,
		Signature,
		hash: hash_
	});
}
//#endregion
//#region ../../node_modules/@noble/curves/secp256k1.js
/**
* SECG secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
*
* Belongs to Koblitz curves: it has efficiently-computable GLV endomorphism ψ,
* check out {@link EndomorphismOpts}. Seems to be rigid (not backdoored).
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const secp256k1_CURVE = {
	p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
	n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	h: BigInt(1),
	a: BigInt(0),
	b: BigInt(7),
	Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
	Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
};
const secp256k1_ENDO = {
	beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
	basises: [[BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")], [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]]
};
const _2n = /* @__PURE__ */ BigInt(2);
/**
* √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
* (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
*/
function sqrtMod(y) {
	const P = secp256k1_CURVE.p;
	const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
	const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
	const b2 = y * y * y % P;
	const b3 = b2 * b2 * y % P;
	const b11 = pow2(pow2(pow2(b3, _3n, P) * b3 % P, _3n, P) * b3 % P, _2n, P) * b2 % P;
	const b22 = pow2(b11, _11n, P) * b11 % P;
	const b44 = pow2(b22, _22n, P) * b22 % P;
	const b88 = pow2(b44, _44n, P) * b44 % P;
	const root = pow2(pow2(pow2(pow2(pow2(pow2(b88, _88n, P) * b88 % P, _44n, P) * b44 % P, _3n, P) * b3 % P, _23n, P) * b22 % P, _6n, P) * b2 % P, _2n, P);
	if (!Fpk1.eql(Fpk1.sqr(root), y)) throw new Error("Cannot find square root");
	return root;
}
const Fpk1 = /* @__PURE__ */ Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
/**
* secp256k1 curve: ECDSA and ECDH methods.
*
* Uses sha256 to hash messages. To use a different hash,
* pass `{ prehash: false }` to sign / verify.
*
* @example
* Generate one secp256k1 keypair, sign a message, and verify it.
*
* ```js
* import { secp256k1 } from '@noble/curves/secp256k1.js';
* const { secretKey, publicKey } = secp256k1.keygen();
* // const publicKey = secp256k1.getPublicKey(secretKey);
* const msg = new TextEncoder().encode('hello noble');
* const sig = secp256k1.sign(msg, secretKey);
* const isValid = secp256k1.verify(sig, msg, publicKey);
* // const sigKeccak = secp256k1.sign(keccak256(msg), secretKey, { prehash: false });
* ```
*/
const secp256k1 = /* @__PURE__ */ ecdsa(/* @__PURE__ */ weierstrass(secp256k1_CURVE, {
	Fp: Fpk1,
	endo: secp256k1_ENDO
}), sha256$1);
//#endregion
//#region ../bc-crypto-ts/dist/index.mjs
/**
* The single error type thrown by this package.
*
* @module error
*/
/**
* Thrown for wrong-length keys, nonces, signatures and public keys
* (`InvalidSize`), a key, point or signature of the right length that is not
* valid (`InvalidData`), an argument outside its domain, including a value
* of the wrong type (`InvalidParameter`), and AEAD tag mismatch
* (`AuthenticationFailed`).
*
* Every failure of an argument or of a primitive is a `CryptoError`; when a
* backend error is what was caught, it is the `cause`. Two things propagate
* unwrapped, because they are not this package's: a generator's own error
* (`RandError` from `@blockchaincommons/rand`, including `InvalidGenerator`
* for a generator that lacks a method the draw calls), and an allocation
* failure outside the KDFs (`RangeError` from the engine). Instances come
* from the static factories only.
*
* @example
* ```ts
* try {
*   chacha20Poly1305.decrypt(key, nonce, sealed);
* } catch (e) {
*   if (CryptoError.isCryptoError(e) && e.is("AuthenticationFailed")) {
*     // tampered
*   }
* }
* ```
*/
var CryptoError = class CryptoError extends Error {
	/** Always `"CryptoError"`; the cross-copy identity {@link CryptoError.isCryptoError} checks. */
	name = "CryptoError";
	/** The discriminant; equals `details.code`. */
	code;
	/** The structured payload, discriminated by `code`. */
	details;
	constructor(message, details, cause) {
		super(message, cause === void 0 ? void 0 : { cause });
		this.code = details.code;
		this.details = details;
	}
	/** Type guard for a `CryptoError`, including one from another copy of this package. */
	static isCryptoError(value) {
		return value instanceof Error && value.name === "CryptoError" && "code" in value;
	}
	/** `true` when `code` is this error's code. */
	is(code) {
		return this.code === code;
	}
	/** `what` had `actual` bytes; `expected` were required. */
	static invalidSize(what, expected, actual) {
		return new CryptoError(`${what} must be ${expected} bytes, got ${actual}`, {
			code: "InvalidSize",
			what,
			expected,
			actual
		});
	}
	/** `what` has the right length but is not a valid key, point or signature. */
	static invalidData(what, message, cause) {
		return new CryptoError(message, {
			code: "InvalidData",
			what
		}, cause);
	}
	/** `what` (a number, an options object or a byte argument) is outside its domain. */
	static invalidParameter(what, message, cause) {
		return new CryptoError(message, {
			code: "InvalidParameter",
			what
		}, cause);
	}
	/** AEAD authentication failed (wrong key, nonce, aad, or tampered data). */
	static authenticationFailed(cause) {
		return new CryptoError("AEAD error", { code: "AuthenticationFailed" }, cause);
	}
};
/** @internal A short description of a rejected value for `got …` clauses. */
function describeValue(value) {
	if (value === null) return "null";
	if (Array.isArray(value)) return `Array(${value.length})`;
	if (typeof value !== "object") return typeof value;
	const name = Object.getPrototypeOf(value)?.constructor?.name;
	return typeof name === "string" && name !== "" ? name : "object";
}
/**
* @internal `value` must be a `Uint8Array` (from any realm; a `Buffer` is
* one). Every byte argument is checked this way before any other precondition,
* so a string, array or `ArrayBuffer` is `InvalidParameter` naming `what`.
*/
function requireBytes(what, value) {
	if (!isBytes$1(value)) throw CryptoError.invalidParameter(what, `${what} must be a Uint8Array, got ${describeValue(value)}`);
}
const CRC32_TABLE = /* @__PURE__ */ new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let crc = i;
	for (let j = 0; j < 8; j++) crc = (crc & 1) !== 0 ? crc >>> 1 ^ 3988292384 : crc >>> 1;
	CRC32_TABLE[i] = crc >>> 0;
}
/**
* CRC-32 (IEEE 802.3 / ISO-HDLC) as an unsigned 32-bit integer.
* @throws {CryptoError} `InvalidParameter` unless `data` is a `Uint8Array`.
*/
function crc32(data) {
	requireBytes("crc32 data", data);
	let crc = 4294967295;
	for (let i = 0; i < data.length; i++) crc = CRC32_TABLE[(crc ^ data[i]) & 255] ^ crc >>> 8;
	return (crc ^ 4294967295) >>> 0;
}
/**
* SHA-256 of `data` (32 bytes).
* @throws {CryptoError} `InvalidParameter` unless `data` is a `Uint8Array`.
*/
function sha256(data) {
	requireBytes("sha256 data", data);
	return sha256$1(data);
}
const textEncoder$1 = new TextEncoder();
textEncoder$1.encode("agreement");
textEncoder$1.encode("signing");
secp256k1.Point.Fn.ORDER;
//#endregion
//#region ../bc-ur-ts/dist/bytewords-8tau4TxD.mjs
/**
* The 256 bytewords (BCR-2020-012) and the 256 bytemojis, in byte order.
* Wire: every UR and every bytewords identifier is spelled from these.
*
* @module bytewords-tables
*/
/** Byteword for each byte value; four letters, unique first+last pair. Frozen: the tables are wire. */
const BYTEWORDS = Object.freeze([
	"able",
	"acid",
	"also",
	"apex",
	"aqua",
	"arch",
	"atom",
	"aunt",
	"away",
	"axis",
	"back",
	"bald",
	"barn",
	"belt",
	"beta",
	"bias",
	"blue",
	"body",
	"brag",
	"brew",
	"bulb",
	"buzz",
	"calm",
	"cash",
	"cats",
	"chef",
	"city",
	"claw",
	"code",
	"cola",
	"cook",
	"cost",
	"crux",
	"curl",
	"cusp",
	"cyan",
	"dark",
	"data",
	"days",
	"deli",
	"dice",
	"diet",
	"door",
	"down",
	"draw",
	"drop",
	"drum",
	"dull",
	"duty",
	"each",
	"easy",
	"echo",
	"edge",
	"epic",
	"even",
	"exam",
	"exit",
	"eyes",
	"fact",
	"fair",
	"fern",
	"figs",
	"film",
	"fish",
	"fizz",
	"flap",
	"flew",
	"flux",
	"foxy",
	"free",
	"frog",
	"fuel",
	"fund",
	"gala",
	"game",
	"gear",
	"gems",
	"gift",
	"girl",
	"glow",
	"good",
	"gray",
	"grim",
	"guru",
	"gush",
	"gyro",
	"half",
	"hang",
	"hard",
	"hawk",
	"heat",
	"help",
	"high",
	"hill",
	"holy",
	"hope",
	"horn",
	"huts",
	"iced",
	"idea",
	"idle",
	"inch",
	"inky",
	"into",
	"iris",
	"iron",
	"item",
	"jade",
	"jazz",
	"join",
	"jolt",
	"jowl",
	"judo",
	"jugs",
	"jump",
	"junk",
	"jury",
	"keep",
	"keno",
	"kept",
	"keys",
	"kick",
	"kiln",
	"king",
	"kite",
	"kiwi",
	"knob",
	"lamb",
	"lava",
	"lazy",
	"leaf",
	"legs",
	"liar",
	"limp",
	"lion",
	"list",
	"logo",
	"loud",
	"love",
	"luau",
	"luck",
	"lung",
	"main",
	"many",
	"math",
	"maze",
	"memo",
	"menu",
	"meow",
	"mild",
	"mint",
	"miss",
	"monk",
	"nail",
	"navy",
	"need",
	"news",
	"next",
	"noon",
	"note",
	"numb",
	"obey",
	"oboe",
	"omit",
	"onyx",
	"open",
	"oval",
	"owls",
	"paid",
	"part",
	"peck",
	"play",
	"plus",
	"poem",
	"pool",
	"pose",
	"puff",
	"puma",
	"purr",
	"quad",
	"quiz",
	"race",
	"ramp",
	"real",
	"redo",
	"rich",
	"road",
	"rock",
	"roof",
	"ruby",
	"ruin",
	"runs",
	"rust",
	"safe",
	"saga",
	"scar",
	"sets",
	"silk",
	"skew",
	"slot",
	"soap",
	"solo",
	"song",
	"stub",
	"surf",
	"swan",
	"taco",
	"task",
	"taxi",
	"tent",
	"tied",
	"time",
	"tiny",
	"toil",
	"tomb",
	"toys",
	"trip",
	"tuna",
	"twin",
	"ugly",
	"undo",
	"unit",
	"urge",
	"user",
	"vast",
	"very",
	"veto",
	"vial",
	"vibe",
	"view",
	"visa",
	"void",
	"vows",
	"wall",
	"wand",
	"warm",
	"wasp",
	"wave",
	"waxy",
	"webs",
	"what",
	"when",
	"whiz",
	"wolf",
	"work",
	"yank",
	"yawn",
	"yell",
	"yoga",
	"yurt",
	"zaps",
	"zero",
	"zest",
	"zinc",
	"zone",
	"zoom"
]);
/** Bytemoji for each byte value. Frozen: the tables are wire. */
const BYTEMOJIS = Object.freeze([
	"😀",
	"😂",
	"😆",
	"😉",
	"🙄",
	"😋",
	"😎",
	"😍",
	"😘",
	"😭",
	"🫠",
	"🥱",
	"🤩",
	"😶",
	"🤨",
	"🫥",
	"🥵",
	"🥶",
	"😳",
	"🤪",
	"😵",
	"😡",
	"🤢",
	"😇",
	"🤠",
	"🤡",
	"🥳",
	"🥺",
	"😬",
	"🤑",
	"🙃",
	"🤯",
	"😈",
	"👹",
	"👺",
	"💀",
	"👻",
	"👽",
	"😺",
	"😹",
	"😻",
	"😽",
	"🙀",
	"😿",
	"🫶",
	"🤲",
	"🙌",
	"🤝",
	"👍",
	"👎",
	"👈",
	"👆",
	"💪",
	"👄",
	"🦷",
	"👂",
	"👃",
	"🧠",
	"👀",
	"🤚",
	"🦶",
	"🍎",
	"🍊",
	"🍋",
	"🍌",
	"🍉",
	"🍇",
	"🍓",
	"🫐",
	"🍒",
	"🍑",
	"🍍",
	"🥝",
	"🍆",
	"🥑",
	"🥦",
	"🍅",
	"🌽",
	"🥕",
	"🫒",
	"🧄",
	"🥐",
	"🥯",
	"🍞",
	"🧀",
	"🥚",
	"🍗",
	"🌭",
	"🍔",
	"🍟",
	"🍕",
	"🌮",
	"🥙",
	"🍱",
	"🍜",
	"🍤",
	"🍚",
	"🥠",
	"🍨",
	"🍦",
	"🎂",
	"🪴",
	"🌵",
	"🌱",
	"💐",
	"🍁",
	"🍄",
	"🌹",
	"🌺",
	"🌼",
	"🌻",
	"🌸",
	"💨",
	"🌊",
	"💧",
	"💦",
	"🌀",
	"🌈",
	"🌞",
	"🌝",
	"🌛",
	"🌜",
	"🌙",
	"🌎",
	"💫",
	"⭐",
	"🪐",
	"🌐",
	"💛",
	"💔",
	"💘",
	"💖",
	"💕",
	"🏁",
	"🚩",
	"💬",
	"💯",
	"🚫",
	"🔴",
	"🔷",
	"🟩",
	"🛑",
	"🔺",
	"🚗",
	"🚑",
	"🚒",
	"🚜",
	"🛵",
	"🚨",
	"🚀",
	"🚁",
	"🛟",
	"🚦",
	"🏰",
	"🎡",
	"🎢",
	"🎠",
	"🏠",
	"🔔",
	"🔑",
	"🚪",
	"🪑",
	"🎈",
	"💌",
	"📦",
	"📫",
	"📖",
	"📚",
	"📌",
	"🧮",
	"🔒",
	"💎",
	"📷",
	"⏰",
	"⏳",
	"📡",
	"💡",
	"💰",
	"🧲",
	"🧸",
	"🎁",
	"🎀",
	"🎉",
	"🪭",
	"👑",
	"🫖",
	"🔭",
	"🛁",
	"🏆",
	"🥁",
	"🎷",
	"🎺",
	"🏀",
	"🏈",
	"🎾",
	"🏓",
	"✨",
	"🔥",
	"💥",
	"👕",
	"👚",
	"👖",
	"🩳",
	"👗",
	"👔",
	"🧢",
	"👓",
	"🧶",
	"🧵",
	"💍",
	"👠",
	"👟",
	"🧦",
	"🧤",
	"👒",
	"👜",
	"🐱",
	"🐶",
	"🐭",
	"🐹",
	"🐰",
	"🦊",
	"🐻",
	"🐼",
	"🐨",
	"🐯",
	"🦁",
	"🐮",
	"🐷",
	"🐸",
	"🐵",
	"🐔",
	"🐥",
	"🦆",
	"🦉",
	"🐴",
	"🦄",
	"🐝",
	"🐛",
	"🦋",
	"🐌",
	"🐞",
	"🐢",
	"🐺",
	"🐍",
	"🪽",
	"🐙",
	"🦑",
	"🪼",
	"🦞",
	"🦀",
	"🐚",
	"🦭",
	"🐟",
	"🐬",
	"🐳"
]);
/**
* Bytewords decoding shared by the public `decodeBytewords` and the UR
* parsers, which report a failure under different error codes (`Bytewords`
* from `decodeBytewords`, `Decoder` inside a UR string, as the reference's
* `bytewords::decode` and `ur::decode` do).
*
* @internal
* @module bytewords-decode
*/
/** Byte value by full word. */
const WORD_INDEX = new Map(BYTEWORDS.map((w, i) => [w, i]));
const MINIMAL_INDEX = (/* @__PURE__ */ new Int16Array(65536)).fill(-1);
for (let i = 0; i < 256; i++) {
	const w = BYTEWORDS[i];
	MINIMAL_INDEX[w.charCodeAt(0) << 8 | w.charCodeAt(3)] = i;
}
/**
* Decode `encoded` in `style`, verifying and stripping the CRC-32, or
* return the reason it fails. The checks run in the reference's order:
* non-ASCII input, an odd-length minimal string, an unknown word, then the
* checksum, which a string of fewer than four bytes always fails.
*/
function decodeBytewordsOrReason(encoded, style) {
	for (let i = 0; i < encoded.length; i++) if (encoded.charCodeAt(i) > 127) return "bytewords string contains non-ASCII characters";
	let bytes;
	if (style === "minimal") {
		if (encoded.length % 2 !== 0) return "invalid length";
		bytes = new Uint8Array(encoded.length / 2);
		for (let i = 0; i < encoded.length; i += 2) {
			const index = MINIMAL_INDEX[encoded.charCodeAt(i) << 8 | encoded.charCodeAt(i + 1)];
			if (index < 0) return "invalid word";
			bytes[i / 2] = index;
		}
	} else {
		const words = encoded.split(style === "standard" ? " " : "-");
		bytes = new Uint8Array(words.length);
		for (let i = 0; i < words.length; i++) {
			const index = WORD_INDEX.get(words[i]);
			if (index === void 0) return "invalid word";
			bytes[i] = index;
		}
	}
	if (bytes.length < 4) return "invalid checksum";
	const data = bytes.slice(0, -4);
	const expected = new DataView(bytes.buffer, bytes.length - 4).getUint32(0, false);
	if (crc32(data) !== expected) return "invalid checksum";
	return data;
}
/**
* Bytewords (BCR-2020-012): bytes as four-letter words, dash-joined words,
* or two-letter minimal codes, each with a trailing CRC-32; plus the
* checksum-free identifier encodings (words, minimal, bytemojis).
*
* @module @blockchaincommons/uniform-resources/bytewords
*/
const BYTEWORDS_STYLES = [
	"standard",
	"uri",
	"minimal"
];
const MINIMAL = BYTEWORDS.map((w) => w[0] + w[3]);
new Set(BYTEMOJIS);
new Map(BYTEWORDS.map((w) => [w[0] + w[3], w]));
new Map(BYTEWORDS.map((w) => [w.slice(0, 3), w]));
new Map(BYTEWORDS.map((w) => [w.slice(1), w]));
function withChecksum(data) {
	const out = new Uint8Array(data.length + 4);
	out.set(data);
	new DataView(out.buffer).setUint32(data.length, crc32(data), false);
	return out;
}
/**
* Encode `data` followed by its CRC-32 (big-endian) in `style` (default minimal).
* @throws {URError} `InvalidParameter` unless `data` is a `Uint8Array` and `style` one of the three.
*/
function encodeBytewords(data, style = "minimal") {
	expectBytes("data", data);
	expectChoice("style", style, BYTEWORDS_STYLES, "minimal");
	const bytes = withChecksum(data);
	if (style === "minimal") {
		let out = "";
		for (const b of bytes) out += MINIMAL[b];
		return out;
	}
	const words = [];
	for (const b of bytes) words.push(BYTEWORDS[b]);
	return words.join(style === "standard" ? " " : "-");
}
//#endregion
//#region ../bc-dcbor-ts/dist/error-BM_wVk_h.mjs
const MajorType = {
	Unsigned: 0,
	Negative: 1,
	ByteString: 2,
	Text: 3,
	Array: 4,
	Map: 5,
	Tagged: 6,
	Simple: 7
};
const isCborNumber = (value) => {
	return typeof value === "number" || typeof value === "bigint";
};
const isCbor = (value) => {
	return value !== null && typeof value === "object" && "isCbor" in value && value.isCbor === true;
};
/**
* Compare two tag values for equality, normalizing `number` vs `bigint`.
* A raw `===` would treat `100n` and `100` as unequal, so a large tag that
* decoded to a `bigint` wouldn't match the same value written as a `number`.
*
* @internal Exported for cross-module use; not part of the public surface -
* use `Tag.equals` instead.
*/
const tagValuesEqual = (a, b) => {
	if (typeof a === "bigint" || typeof b === "bigint") return BigInt(a) === BigInt(b);
	return a === b;
};
/**
* Get the string representation of a tag.
* Internal function used for error messages.
*
* @param tag - The tag to represent
* @returns String representation (name if available, otherwise value)
*
* @internal
*/
const tagToString = (tag) => tag.name ?? tag.value.toString();
const captureStackTrace = Error.captureStackTrace;
/**
* The single error type thrown by dCBOR encoding, decoding, and extraction.
*
* @example
* ```typescript
* try {
*   decodeCbor(bytes);
* } catch (e) {
*   if (CborError.isCborError(e) && e.code === "WrongTag") {
*     console.log(e.details.expectedTag, e.details.actualTag);
*   }
* }
* ```
*/
var CborError = class CborError extends Error {
	/** Machine-readable discriminant; switch on this to handle errors. */
	code;
	/** Structured, code-specific data (see {@link CborErrorDetails}). */
	details;
	constructor(code, message, details = {}) {
		super(message);
		this.name = "CborError";
		this.code = code;
		this.details = details;
		Object.setPrototypeOf(this, new.target.prototype);
		if (typeof captureStackTrace === "function") captureStackTrace(this, CborError);
	}
	/** Type guard: is `value` a {@link CborError}? Narrows to the
	* code-discriminated {@link CborErrorTyped} union. */
	static isCborError(value) {
		return value instanceof CborError;
	}
	/** The CBOR data ended before a complete item could be decoded. */
	static underrun() {
		return new CborError("Underrun", "early end of CBOR data");
	}
	/** An unsupported/invalid value was found in a CBOR header byte. */
	static unsupportedHeaderValue(headerValue) {
		return new CborError("UnsupportedHeaderValue", "unsupported value in CBOR header", { headerValue });
	}
	/** A numeric value was not in its shortest/canonical dCBOR form. */
	static nonCanonicalNumeric() {
		return new CborError("NonCanonicalNumeric", "a CBOR numeric value was encoded in non-canonical form");
	}
	/** A major-type-7 simple value other than false/true/null/float. */
	static invalidSimpleValue() {
		return new CborError("InvalidSimpleValue", "an invalid CBOR simple value was encountered");
	}
	/** A text string was not valid UTF-8 (with the underlying reason). */
	static invalidString(cause) {
		return new CborError("InvalidString", `an invalidly-encoded UTF-8 string was encountered in the CBOR (${cause})`, { cause });
	}
	/** A text string was not in Unicode NFC. */
	static nonCanonicalString() {
		return new CborError("NonCanonicalString", "a CBOR string was not encoded in Unicode Canonical Normalization Form C");
	}
	/** The decoded item left `count` trailing bytes unconsumed. */
	static unusedData(count) {
		return new CborError("UnusedData", `the decoded CBOR had ${count} extra bytes at the end`, { count });
	}
	/** Map keys were not in canonical ascending byte order. */
	static misorderedMapKey() {
		return new CborError("MisorderedMapKey", "the decoded CBOR map has keys that are not in canonical order");
	}
	/** A map contained a duplicate key. */
	static duplicateMapKey() {
		return new CborError("DuplicateMapKey", "the decoded CBOR map has a duplicate key");
	}
	/** A requested map key was not present. */
	static missingMapKey() {
		return new CborError("MissingMapKey", "missing CBOR map key");
	}
	/** A numeric value could not be represented in the target type. */
	static outOfRange() {
		return new CborError("OutOfRange", "the CBOR numeric value could not be represented in the specified numeric type");
	}
	/** The CBOR value was not the type expected by a conversion. */
	static wrongType() {
		return new CborError("WrongType", "the decoded CBOR value was not the expected type");
	}
	/** A tagged value had a tag other than the one expected. */
	static wrongTag(expected, actual) {
		return new CborError("WrongTag", `expected CBOR tag ${tagToString(expected)}, but got ${tagToString(actual)}`, {
			expectedTag: expected,
			actualTag: actual
		});
	}
	/** Invalid UTF-8 in a text string (with the underlying reason). */
	static invalidUtf8(cause) {
		return new CborError("InvalidUtf8", `invalid UTF‑8 string: ${cause}`, { cause });
	}
	/** Invalid ISO 8601 / RFC 3339 date string (with the underlying reason). */
	static invalidDate(cause) {
		return new CborError("InvalidDate", `invalid ISO 8601 date string: ${cause}`, { cause });
	}
	/** An arbitrary error carrying a custom message. */
	static custom(message) {
		return new CborError("Custom", message);
	}
};
//#endregion
//#region ../bc-dcbor-ts/dist/tags-store-BSBP9gpt.mjs
/**
* Byte-array utilities shared across the library.
*
* @module stdlib
*/
/**
* Check if two byte arrays are equal.
*/
const areBytesEqual = (a, b) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
};
/**
* Lexicographically compare two byte arrays.
* Returns: -1 if a < b, 0 if a == b, 1 if a > b
*/
const lexicographicallyCompareBytes = (a, b) => {
	const minLen = Math.min(a.length, b.length);
	for (let i = 0; i < minLen; i++) {
		const aVal = a[i];
		const bVal = b[i];
		if (aVal === void 0 || bVal === void 0) throw CborError.custom("Unexpected undefined byte in array");
		if (aVal < bVal) return -1;
		if (aVal > bVal) return 1;
	}
	if (a.length < b.length) return -1;
	if (a.length > b.length) return 1;
	return 0;
};
/**
* A map keyed by encoded CBOR key bytes, kept in canonical (lexicographic)
* byte order.
*
* dCBOR needs exactly one specialised container: keys are the encoded bytes of
* a CBOR value, and the map must iterate in ascending lexicographic byte order
* (that ordering is the deterministic wire contract). This is a thin,
* dependency-free structure over a sorted array with binary-search insertion -
* it gives the exact ordering dCBOR requires, and lets the decode hot path
* append in O(1) since canonical input already arrives sorted.
*
* @module sorted-byte-map
*/
var SortedByteMap = class {
	items = [];
	/** Number of entries. */
	get size() {
		return this.items.length;
	}
	/**
	* Binary search for `key`. Returns the index of an exact match, or the
	* negative value `-(insertionPoint) - 1` when absent, so a single search both
	* tests membership and locates where an insert would go (Java
	* `Arrays.binarySearch` convention).
	*/
	indexOf(key) {
		let lo = 0;
		let hi = this.items.length - 1;
		while (lo <= hi) {
			const mid = lo + hi >>> 1;
			const cmp = lexicographicallyCompareBytes(this.items[mid].key, key);
			if (cmp < 0) lo = mid + 1;
			else if (cmp > 0) hi = mid - 1;
			else return mid;
		}
		return -(lo + 1);
	}
	/** Insert or replace the entry for `key`. */
	set(key, value) {
		const i = this.indexOf(key);
		if (i >= 0) this.items[i] = {
			key,
			value
		};
		else this.items.splice(-i - 1, 0, {
			key,
			value
		});
	}
	/**
	* Append an entry whose key is strictly greater than every existing key.
	* Used by canonical decode, where keys arrive already sorted; the caller must
	* guarantee the ordering (this skips the search + shift that {@link set} does).
	*/
	appendGreatest(key, value) {
		this.items.push({
			key,
			value
		});
	}
	/** The value for `key`, or `undefined` if absent. */
	get(key) {
		const i = this.indexOf(key);
		return i >= 0 ? this.items[i].value : void 0;
	}
	/** Whether `key` is present. */
	has(key) {
		return this.indexOf(key) >= 0;
	}
	/** Remove `key`; returns whether it was present. */
	delete(key) {
		const i = this.indexOf(key);
		if (i < 0) return false;
		this.items.splice(i, 1);
		return true;
	}
	/** The greatest key currently stored (ascending order), or `undefined`. */
	maxKey() {
		const n = this.items.length;
		return n > 0 ? this.items[n - 1].key : void 0;
	}
	/**
	* The key at position `i` in ascending key order. Positional access lets
	* two maps be walked in lockstep, and a single map be encoded, without
	* materializing an entries array; the caller keeps `i` within `[0, size)`.
	*/
	keyAt(i) {
		return this.items[i].key;
	}
	/** The value at position `i` in ascending key order (see {@link keyAt}). */
	valueAt(i) {
		return this.items[i].value;
	}
	/** Map over each value (with its key) in ascending key order. */
	map(fn) {
		return this.items.map((e) => fn(e.value, e.key));
	}
};
/**
* Numeric boundary contract and helpers.
*
* ## The `number` / `bigint` contract
*
* dCBOR integers span `[-(2^64), 2^64)`, which exceeds JavaScript's safe
* integer range (`±(2^53 − 1)`). The rule is:
*
* - An integer that fits in the IEEE-754 **safe** range is represented as a
*   `number`; anything larger (in magnitude) is a `bigint`.
* - Decoding returns the **narrowest exact** representation via
*   {@link narrowInteger}, so small values are ergonomic `number`s and large
*   ones remain lossless `bigint`s.
* - Encoding accepts either at the public edge and normalises once.
*
* The integer range constants and the saturating float casts live here.
*
* @module numeric
*/
/** `BigInt(Number.MAX_SAFE_INTEGER)` - largest integer exact as a `number`. */
const SAFE_MAX_BIG = BigInt(Number.MAX_SAFE_INTEGER);
/** `BigInt(Number.MIN_SAFE_INTEGER)`. */
const SAFE_MIN_BIG = BigInt(Number.MIN_SAFE_INTEGER);
/** Smallest dCBOR-encodable integer: −(2^64). */
const CBOR_INT_MIN = -(1n << 64n);
/**
* Return the narrowest exact representation of an integer: a `number` when it
* fits the safe-integer range, otherwise the `bigint` unchanged. This is the
* canonical way to hand an integer back to callers.
*/
const narrowInteger = (value) => value >= SAFE_MIN_BIG && value <= SAFE_MAX_BIG ? Number(value) : value;
/**
* A growable output buffer for encoding.
*
* The encoder writes a whole CBOR tree into a single `BufWriter` rather than
* allocating a fresh `Uint8Array` per node and concatenating them (which
* re-copies every subtree at every level): one buffer, geometric growth, one
* final right-sized copy.
*
* @module buf-writer
*/
var BufWriter = class {
	buf;
	view;
	pos = 0;
	constructor(initialCapacity = 64) {
		this.buf = new Uint8Array(initialCapacity);
		this.view = new DataView(this.buf.buffer);
	}
	/** Number of bytes written so far. */
	get length() {
		return this.pos;
	}
	/** Grow the backing store so at least `extra` more bytes fit. */
	ensure(extra) {
		const needed = this.pos + extra;
		if (needed <= this.buf.length) return;
		let capacity = this.buf.length * 2;
		while (capacity < needed) capacity *= 2;
		const next = new Uint8Array(capacity);
		next.set(this.buf.subarray(0, this.pos));
		this.buf = next;
		this.view = new DataView(next.buffer);
	}
	writeByte(byte) {
		this.ensure(1);
		this.buf[this.pos] = byte;
		this.pos += 1;
	}
	writeUint16(value) {
		this.ensure(2);
		this.view.setUint16(this.pos, value, false);
		this.pos += 2;
	}
	writeUint32(value) {
		this.ensure(4);
		this.view.setUint32(this.pos, value, false);
		this.pos += 4;
	}
	writeBigUint64(value) {
		this.ensure(8);
		this.view.setBigUint64(this.pos, value, false);
		this.pos += 8;
	}
	writeBytes(bytes) {
		this.ensure(bytes.length);
		this.buf.set(bytes, this.pos);
		this.pos += bytes.length;
	}
	/** Return the written region as a right-sized copy. */
	toBytes() {
		return this.buf.slice(0, this.pos);
	}
};
const typeBits = (t) => {
	return t << 5;
};
/**
* Write a CBOR head (major type + argument) straight into `writer`, avoiding
* the intermediate `Uint8Array` that {@link encodeVarInt} allocates. This is
* the encoder hot path (every node emits a head). It must stay byte-identical
* to {@link encodeVarInt}; the golden vectors cover both.
*/
const writeVarInt = (writer, value, majorType) => {
	if (value < 0) throw CborError.outOfRange();
	if (typeof value === "number" && hasFractionalPart(value)) throw CborError.outOfRange();
	const type = typeBits(majorType);
	if (isCborNumber(value) && value <= Number.MAX_SAFE_INTEGER) {
		const n = Number(value);
		if (n <= 23) writer.writeByte(n | type);
		else if (n <= 255) {
			writer.writeByte(24 | type);
			writer.writeByte(n);
		} else if (n <= 65535) {
			writer.writeByte(25 | type);
			writer.writeUint16(n);
		} else if (n <= 4294967295) {
			writer.writeByte(26 | type);
			writer.writeUint32(n);
		} else {
			writer.writeByte(27 | type);
			writer.writeBigUint64(BigInt(n));
		}
	} else {
		const big = BigInt(value);
		if (big > 18446744073709551615n) throw CborError.outOfRange();
		writer.writeByte(27 | type);
		writer.writeBigUint64(big);
	}
};
/**
* Encode a CBOR head (major type + argument) in its shortest form.
*
* @throws {CborError} `OutOfRange` for a negative, fractional, or
*   above-u64 argument.
*/
const encodeVarInt = (value, majorType) => {
	if (value < 0) throw CborError.outOfRange();
	if (typeof value === "number" && hasFractionalPart(value)) throw CborError.outOfRange();
	const type = typeBits(majorType);
	if (isCborNumber(value) && value <= Number.MAX_SAFE_INTEGER) {
		value = Number(value);
		if (value <= 23) return new Uint8Array([value | type]);
		else if (value <= 255) return new Uint8Array([24 | type, value]);
		else if (value <= 65535) {
			const buffer = /* @__PURE__ */ new ArrayBuffer(3);
			const view = new DataView(buffer);
			view.setUint8(0, 25 | type);
			view.setUint16(1, value);
			return new Uint8Array(buffer);
		} else if (value <= 4294967295) {
			const buffer = /* @__PURE__ */ new ArrayBuffer(5);
			const view = new DataView(buffer);
			view.setUint8(0, 26 | type);
			view.setUint32(1, value);
			return new Uint8Array(buffer);
		} else {
			const buffer = /* @__PURE__ */ new ArrayBuffer(9);
			const view = new DataView(buffer);
			view.setUint8(0, 27 | type);
			view.setBigUint64(1, BigInt(value));
			return new Uint8Array(buffer);
		}
	} else {
		const big = BigInt(value);
		if (big > 18446744073709551615n) throw CborError.outOfRange();
		const buffer = /* @__PURE__ */ new ArrayBuffer(9);
		const view = new DataView(buffer);
		view.setUint8(0, 27 | type);
		view.setBigUint64(1, big);
		return new Uint8Array(buffer);
	}
};
const hasFract = (n) => {
	return n % 1 !== 0;
};
/**
* Shared float→integer exactness gate for every `Exact<Int>.exactFromF*`. A
* float is an exact integer of a width iff it is finite, whole, and inside that
* width's exclusive `(loEx, hiEx)` bounds (use ±Infinity to skip a side). The
* bounds encode the per-width / per-source-precision limits. The three typed
* wrappers below shape the truncated result.
*/
const isExactIntFloat = (source, loEx, hiEx) => Number.isFinite(source) && source > loEx && source < hiEx && !hasFract(source);
/** float → small integer (`number`). */
const intFromFloatNum = (source, loEx, hiEx) => isExactIntFloat(source, loEx, hiEx) ? Math.trunc(source) : void 0;
/** float → 64-bit integer (`number` if safe, else `bigint`). */
const intFromFloatNarrow = (source, loEx, hiEx) => isExactIntFloat(source, loEx, hiEx) ? narrowInteger(BigInt(Math.trunc(source))) : void 0;
/** float → 128-bit integer (`bigint`). */
const intFromFloatBig = (source, loEx, hiEx) => isExactIntFloat(source, loEx, hiEx) ? BigInt(Math.trunc(source)) : void 0;
/**
* Exact conversions for i128 (JavaScript bigint).
*/
var ExactI128 = class {
	static MIN = -(2n ** 127n);
	static MAX = 2n ** 127n - 1n;
	static exactFromF16(source) {
		return intFromFloatBig(source, -Infinity, Infinity);
	}
	static exactFromF32(source) {
		return intFromFloatBig(source, -Infinity, Infinity);
	}
	static exactFromF64(source) {
		return intFromFloatBig(source, -Infinity, Infinity);
	}
	static exactFromU64(source) {
		return BigInt(source);
	}
	static exactFromI64(source) {
		return BigInt(source);
	}
	static exactFromU128(source) {
		if (source > 2n ** 127n - 1n) return void 0;
		return source;
	}
	static exactFromI128(source) {
		return source;
	}
};
/**
* Exact conversions for u16 (0 to 65535).
*/
var ExactU16 = class {
	static MIN = 0;
	static MAX = 65535;
	static exactFromF16(source) {
		return intFromFloatNum(source, -1, Infinity);
	}
	static exactFromF32(source) {
		return intFromFloatNum(source, -1, 65536);
	}
	static exactFromF64(source) {
		return intFromFloatNum(source, -1, 65536);
	}
	static exactFromU64(source) {
		const n = typeof source === "bigint" ? Number(source) : source;
		if (n > 65535) return void 0;
		return n;
	}
	static exactFromI64(source) {
		const n = typeof source === "bigint" ? Number(source) : source;
		if (n < 0 || n > 65535) return void 0;
		return n;
	}
	static exactFromU128(source) {
		if (source > 65535n) return void 0;
		return Number(source);
	}
	static exactFromI128(source) {
		if (source < 0n || source > 65535n) return void 0;
		return Number(source);
	}
};
/**
* Exact conversions for u32 (0 to 4294967295).
*/
var ExactU32 = class {
	static MIN = 0;
	static MAX = 4294967295;
	static exactFromF16(source) {
		return intFromFloatNum(source, -1, Infinity);
	}
	static exactFromF32(source) {
		return intFromFloatNum(source, -1, 4294967296);
	}
	static exactFromF64(source) {
		return intFromFloatNum(source, -1, 4294967296);
	}
	static exactFromU64(source) {
		const n = typeof source === "bigint" ? Number(source) : source;
		if (n > 4294967295) return void 0;
		return n;
	}
	static exactFromI64(source) {
		const n = typeof source === "bigint" ? Number(source) : source;
		if (n < 0 || n > 4294967295) return void 0;
		return n;
	}
	static exactFromU128(source) {
		if (source > 4294967295n) return void 0;
		return Number(source);
	}
	static exactFromI128(source) {
		if (source < 0n || source > 4294967295n) return void 0;
		return Number(source);
	}
};
/**
* Exact conversions for u64 (0 to 18446744073709551615).
*/
var ExactU64 = class {
	static MIN = 0n;
	static MAX = 18446744073709551615n;
	static exactFromF16(source) {
		return intFromFloatNarrow(source, -1, Infinity);
	}
	static exactFromF32(source) {
		return intFromFloatNarrow(source, -1, 0x10000000000000000);
	}
	static exactFromF64(source) {
		return intFromFloatNarrow(source, -1, 0x10000000000000000);
	}
	static exactFromU64(source) {
		return source;
	}
	static exactFromI64(source) {
		if ((typeof source === "bigint" ? source : BigInt(source)) < 0n) return void 0;
		return source;
	}
	static exactFromU128(source) {
		if (source > 18446744073709551615n) return void 0;
		return narrowInteger(source);
	}
	static exactFromI128(source) {
		if (source < 0n || source > 18446744073709551615n) return void 0;
		return narrowInteger(source);
	}
};
/**
* Float encoding and conversion utilities for dCBOR.
*
* The dCBOR canonical encoding rules for floating point values:
*
* - Numeric reduction: a float with zero fractional part in
*   [-2^64, 2^64-1] is encoded as an integer (42.0 becomes 42)
* - Other values use the smallest width (f16, f32, f64) that preserves them
* - Every NaN is encoded as the single representation 0xf97e00
* - Positive and negative infinity are encoded as half-precision floats
*
* @module float
*/
/**
* Canonical NaN representation in CBOR: 0xf97e00
*/
const CBOR_NAN = new Uint8Array([
	249,
	126,
	0
]);
/**
* Check if a number has a fractional part.
*/
const hasFractionalPart = (n) => n !== Math.floor(n);
/**
* Read a big-endian IEEE-754 double from the first 8 bytes of `data`.
* @internal
*/
const binary64ToNumber = (data) => new DataView(data.buffer, data.byteOffset, data.byteLength).getFloat64(0, false);
/**
* Encode a number as 4 big-endian bytes of an IEEE-754 single (f32).
*/
const numberToBinary32 = (n) => {
	const data = /* @__PURE__ */ new Uint8Array(4);
	new DataView(data.buffer).setFloat32(0, n, false);
	return data;
};
/**
* Read a big-endian IEEE-754 single (f32) from the first 4 bytes of `data`.
*/
const binary32ToNumber = (data) => new DataView(data.buffer, data.byteOffset, data.byteLength).getFloat32(0, false);
const f32ScratchView = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(4));
/**
* Compute the 16-bit pattern of the IEEE-754 half-precision value nearest `n`,
* rounding ties to even.
*
* A value is only stored as a half after the round-trip probe
* (`binary16ToNumber(numberToBinary16(n)) === n`) succeeds, so stored values
* never round; the rounding makes that probe, and the reference's
* `f16::from_f32` in `validateCanonicalF32`, answer correctly for any input.
*/
const float16Bits = (n) => {
	f32ScratchView.setFloat32(0, n, false);
	const f = f32ScratchView.getUint32(0, false);
	const sign = f >>> 16 & 32768;
	const exp = f >>> 23 & 255;
	const mant = f & 8388607;
	if (exp === 255) return sign | (mant !== 0 ? 32256 : 31744);
	const e = exp - 127 + 15;
	if (e >= 31) return sign | 31744;
	if (e <= 0) {
		if (e < -10) return sign;
		const significand = mant | 8388608;
		const shift = 14 - e;
		let result = significand >>> shift;
		const remainder = significand & (1 << shift) - 1;
		const halfway = 1 << shift - 1;
		if (remainder > halfway || remainder === halfway && (result & 1) === 1) result += 1;
		return sign | result;
	}
	let fraction = mant >>> 13;
	const remainder = mant & 8191;
	let exponent = e;
	if (remainder > 4096 || remainder === 4096 && (fraction & 1) === 1) {
		fraction += 1;
		if (fraction === 1024) {
			fraction = 0;
			exponent += 1;
			if (exponent >= 31) return sign | 31744;
		}
	}
	return sign | exponent << 10 | fraction;
};
/**
* Encode a number as 2 big-endian bytes of an IEEE-754 half (f16).
*/
const numberToBinary16 = (n) => {
	const bits = float16Bits(n);
	return new Uint8Array([bits >> 8 & 255, bits & 255]);
};
/**
* Read a big-endian IEEE-754 half (f16) from the first 2 bytes of `data`.
*/
const binary16ToNumber = (data) => {
	const bits = data[0] << 8 | data[1];
	const sign = (bits & 32768) !== 0 ? -1 : 1;
	const exponent = bits >> 10 & 31;
	const fraction = bits & 1023;
	if (exponent === 0) return sign * fraction * 2 ** -24;
	if (exponent === 31) return fraction !== 0 ? NaN : sign * Infinity;
	return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
};
/**
* Encode f64 value to CBOR data bytes.
* Implements numeric reduction and canonical encoding rules.
* @internal
*/
const f64CborData = (value) => {
	const n = value;
	const f32Bytes = numberToBinary32(n);
	const f = binary32ToNumber(f32Bytes);
	if (f === n) return f32CborData(f);
	if (n < 0) {
		const i128 = ExactI128.exactFromF64(n);
		if (i128 !== void 0) {
			const i = ExactU64.exactFromI128(-1n - i128);
			if (i !== void 0) return encodeVarInt(i, MajorType.Negative);
		}
	}
	const u = ExactU64.exactFromF64(n);
	if (u !== void 0) return encodeVarInt(u, MajorType.Unsigned);
	if (Number.isNaN(value)) return CBOR_NAN;
	const buffer = /* @__PURE__ */ new ArrayBuffer(8);
	new DataView(buffer).setFloat64(0, n, false);
	const bytes = new Uint8Array(buffer);
	return new Uint8Array([251, ...bytes]);
};
/**
* Encode f32 value to CBOR data bytes.
* Implements numeric reduction and canonical encoding rules.
* @internal
*/
const f32CborData = (value) => {
	const n = value;
	const f16Bytes = numberToBinary16(n);
	const f = binary16ToNumber(f16Bytes);
	if (f === n) return f16CborData(f);
	if (n < 0) {
		const u = ExactU64.exactFromF32(Math.fround(-1 - n));
		if (u !== void 0) return encodeVarInt(u, MajorType.Negative);
	}
	const u = ExactU32.exactFromF32(n);
	if (u !== void 0) return encodeVarInt(u, MajorType.Unsigned);
	if (Number.isNaN(value)) return CBOR_NAN;
	const bytes = numberToBinary32(n);
	return new Uint8Array([250, ...bytes]);
};
/**
* Encode f16 value to CBOR data bytes.
* Implements numeric reduction and canonical encoding rules.
* @internal
*/
const f16CborData = (value) => {
	const n = value;
	if (n < 0) {
		const u = ExactU64.exactFromF64(-1 - n);
		if (u !== void 0) return encodeVarInt(u, MajorType.Negative);
	}
	const u = ExactU16.exactFromF64(n);
	if (u !== void 0) return encodeVarInt(u, MajorType.Unsigned);
	if (Number.isNaN(value)) return CBOR_NAN;
	const bytes = numberToBinary16(value);
	return new Uint8Array([249, ...bytes]);
};
const TWO_POW_63 = 2 ** 63;
/**
* Rust `n as i64 as f64`: NaN → 0; saturates at the i64 bounds. `i64::MAX`
* (2^63 - 1) is not a double, so the saturated image converts back to 2^63,
* and every double at or above 2^63 saturates to it.
*/
const saturatingI64AsF64 = (n) => {
	if (Number.isNaN(n)) return 0;
	if (n >= TWO_POW_63) return TWO_POW_63;
	if (n <= -TWO_POW_63) return -TWO_POW_63;
	return Math.trunc(n);
};
/** Rust `n as i32 as f32` for an f32 value: NaN → 0; saturates at the i32 bounds. */
const saturatingI32AsF32 = (n) => {
	if (Number.isNaN(n)) return 0;
	if (n >= 2147483647) return Math.fround(2147483647);
	if (n <= -2147483648) return -2147483648;
	return Math.fround(Math.trunc(n));
};
/**
* `validate_canonical_f16`: a half head is non-canonical when it is
* whole-valued (must be an integer) or a NaN other than `0x7e00`.
* @internal
*/
const validateCanonicalF16 = (bits, n) => {
	if (n === saturatingI64AsF64(n) || Number.isNaN(n) && bits !== 32256) throw CborError.nonCanonicalNumeric();
};
/**
* `validate_canonical_f32`: a single head is non-canonical when it fits a half
* (including ±0 and ±Infinity), equals its saturating `i32` image, or is NaN.
* @internal
*/
const validateCanonicalF32 = (n) => {
	if (n === binary16ToNumber(numberToBinary16(n)) || n === saturatingI32AsF32(n) || Number.isNaN(n)) throw CborError.nonCanonicalNumeric();
};
/**
* `validate_canonical_f64`: a double head is non-canonical when it fits a
* single, equals its saturating `i64` image, or is NaN.
* @internal
*/
const validateCanonicalF64 = (n) => {
	if (n === Math.fround(n) || n === saturatingI64AsF64(n) || Number.isNaN(n)) throw CborError.nonCanonicalNumeric();
};
const unsignedNode = (value) => ({
	isCbor: true,
	type: MajorType.Unsigned,
	value
});
const negativeNode = (magnitude) => ({
	isCbor: true,
	type: MajorType.Negative,
	value: magnitude
});
const floatNode = (value) => ({
	isCbor: true,
	type: MajorType.Simple,
	value: {
		type: "Float",
		value
	}
});
/** `From<f16> for CBOR`. @internal */
const cborNodeFromF16 = (n) => {
	if (n < 0) {
		const i = ExactU64.exactFromF64(-1 - n);
		if (i !== void 0) return negativeNode(i);
	}
	const u = ExactU16.exactFromF64(n);
	if (u !== void 0) return unsignedNode(u);
	return floatNode(n);
};
/**
* `From<f32> for CBOR`. The negative magnitude is computed in f32 arithmetic
* (`-1f32 - n`): `Math.fround(-1 - n)` is exactly that, since a double holds
* the difference of two singles with at most one rounding.
* @internal
*/
const cborNodeFromF32 = (n) => {
	if (n < 0) {
		const i = ExactU64.exactFromF32(Math.fround(-1 - n));
		if (i !== void 0) return negativeNode(i);
	}
	const u = ExactU32.exactFromF32(n);
	if (u !== void 0) return unsignedNode(u);
	return floatNode(n);
};
/** `From<f64> for CBOR`. @internal */
const cborNodeFromF64 = (n) => {
	if (n < 0) {
		const i128 = ExactI128.exactFromF64(n);
		if (i128 !== void 0) {
			const i = ExactU64.exactFromI128(-1n - i128);
			if (i !== void 0) return negativeNode(i);
		}
	}
	const u = ExactU64.exactFromF64(n);
	if (u !== void 0) return unsignedNode(u);
	return floatNode(n);
};
/**
* UTF-8 validation failure description, mirroring `core::str::Utf8Error`.
*
* The decoder rejects malformed text with the WHATWG `TextDecoder` (fatal
* mode), whose error text is host-defined. To report the same message as the
* reference (`str::from_utf8` → `Utf8Error` → `Display`), the failing bytes
* are re-scanned here with a port of `core::str::validations::
* run_utf8_validation`, which yields the reference's `(valid_up_to,
* error_len)` pair.
*
* @module utf8
* @internal
*/
/**
* `core::str::validations::utf8_char_width`: the sequence length a lead byte
* announces, or 0 for a byte that can never start a sequence (a continuation
* byte `80-bf`, the overlong leads `c0`/`c1`, or `f5-ff`).
*/
const utf8CharWidth = (lead) => {
	if (lead < 128) return 1;
	if (lead < 194) return 0;
	if (lead < 224) return 2;
	if (lead < 240) return 3;
	if (lead < 245) return 4;
	return 0;
};
/** A byte that is not a UTF-8 continuation byte (`80-bf`). */
const isNotContinuation = (byte) => byte < 128 || byte > 191;
/**
* Locate the first UTF-8 error in `bytes` the way `run_utf8_validation`
* does, or return `undefined` when the bytes are valid.
*
* `validUpTo` is the index of the offending lead byte. `errorLength` is the
* number of bytes to skip (1, 2 or 3) when an invalid byte is present, or
* `undefined` when the input ends inside a sequence. A present invalid byte
* always beats "incomplete": the continuation bytes are checked one at a
* time as they are read.
*/
const findUtf8Error = (bytes) => {
	const len = bytes.length;
	let index = 0;
	while (index < len) {
		const first = bytes[index];
		if (first < 128) {
			index++;
			continue;
		}
		const start = index;
		const next = () => {
			index++;
			return index < len ? bytes[index] : void 0;
		};
		const err = (errorLength) => ({
			validUpTo: start,
			errorLength
		});
		const width = utf8CharWidth(first);
		if (width === 2) {
			const b1 = next();
			if (b1 === void 0) return err(void 0);
			if (isNotContinuation(b1)) return err(1);
		} else if (width === 3) {
			const b1 = next();
			if (b1 === void 0) return err(void 0);
			if (!(first === 224 && b1 >= 160 && b1 <= 191 || first >= 225 && first <= 236 && b1 >= 128 && b1 <= 191 || first === 237 && b1 >= 128 && b1 <= 159 || first >= 238 && first <= 239 && b1 >= 128 && b1 <= 191)) return err(1);
			const b2 = next();
			if (b2 === void 0) return err(void 0);
			if (isNotContinuation(b2)) return err(2);
		} else if (width === 4) {
			const b1 = next();
			if (b1 === void 0) return err(void 0);
			if (!(first === 240 && b1 >= 144 && b1 <= 191 || first >= 241 && first <= 243 && b1 >= 128 && b1 <= 191 || first === 244 && b1 >= 128 && b1 <= 143)) return err(1);
			const b2 = next();
			if (b2 === void 0) return err(void 0);
			if (isNotContinuation(b2)) return err(2);
			const b3 = next();
			if (b3 === void 0) return err(void 0);
			if (isNotContinuation(b3)) return err(3);
		} else return err(1);
		index++;
	}
};
/**
* `Utf8Error`'s `Display` text for `bytes`, which must be invalid UTF-8:
* `invalid utf-8 sequence of N bytes from index I` or `incomplete utf-8 byte
* sequence from index I`.
*/
const utf8ErrorDescription = (bytes) => {
	const info = findUtf8Error(bytes);
	if (info === void 0) return "invalid utf-8 sequence";
	return info.errorLength === void 0 ? `incomplete utf-8 byte sequence from index ${info.validUpTo}` : `invalid utf-8 sequence of ${info.errorLength} bytes from index ${info.validUpTo}`;
};
const utf8Decoder = new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
/**
* A forward-only cursor over the input bytes.
*
* Decoding advances a single `pos` through one shared `DataView` rather than
* slicing a fresh sub-view per nested item and threading a consumed-length back
* up the recursion. Every read is bounds-checked against the remaining bytes.
*/
var ByteReader = class {
	view;
	pos = 0;
	constructor(data) {
		this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	}
	get byteLength() {
		return this.view.byteLength;
	}
	get remaining() {
		return this.view.byteLength - this.pos;
	}
	/** Read the byte at `offset` relative to the current position (no advance). */
	peek(offset) {
		return this.view.getUint8(this.pos + offset);
	}
	/** Advance the cursor by `count` bytes. */
	advance(count) {
		this.pos += count;
	}
	/** A zero-copy view of `len` bytes at the given absolute offset. */
	bytesAt(offset, len) {
		return new Uint8Array(this.view.buffer, this.view.byteOffset + offset, len);
	}
};
/**
* Decode a single dCBOR item from `data`, enforcing every deterministic
* encoding rule (canonical numeric forms, NFC text, map-key order, no
* trailing bytes). Throws {@link CborError} on any violation.
*
* @example
* ```typescript
* const value = decodeCbor(hexToBytes("a1616101")); // {"a": 1}
* expectMap(value).size; // 1
* ```
*
* @throws {CborError} `Underrun` | `UnsupportedHeaderValue` |
*   `NonCanonicalNumeric` | `InvalidSimpleValue` | `InvalidUtf8` |
*   `NonCanonicalString` | `UnusedData` | `MisorderedMapKey` |
*   `DuplicateMapKey` - see {@link CborErrorDetailsByCode}.
* @public
*
* @remarks Decoded byte strings are zero-copy views aliasing the input
* buffer - mutating the input after decoding (or mutating the returned
* bytes) changes the other side. Call `.slice()` first if you need an
* independent copy.
*/
function decodeCbor(data) {
	const reader = new ByteReader(data);
	const cbor = readCbor(reader);
	const remaining = reader.byteLength - reader.pos;
	if (remaining !== 0) throw CborError.unusedData(remaining);
	return cbor;
}
function parseHeader(header) {
	return {
		majorType: header >> 5,
		headerValue: header & 31
	};
}
/**
* Read a CBOR head (major type + argument) at the cursor, advancing past it.
* `varIntLen` is the head length (1/2/3/5/9); the argument value is validated
* for canonical minimal-length encoding.
*/
function readHeaderVarint(reader) {
	if (reader.remaining < 1) throw CborError.underrun();
	const header = reader.peek(0);
	const { majorType, headerValue } = parseHeader(header);
	const dataRemaining = reader.remaining - 1;
	let value;
	let varIntLen;
	if (headerValue <= 23) {
		value = headerValue;
		varIntLen = 1;
	} else if (headerValue === 24) {
		if (dataRemaining < 1) throw CborError.underrun();
		value = reader.peek(1);
		if (value < 24) throw CborError.nonCanonicalNumeric();
		varIntLen = 2;
	} else if (headerValue === 25) {
		if (dataRemaining < 2) throw CborError.underrun();
		value = (reader.peek(1) << 8 | reader.peek(2)) >>> 0;
		if (value <= 255 && header !== 249) throw CborError.nonCanonicalNumeric();
		varIntLen = 3;
	} else if (headerValue === 26) {
		if (dataRemaining < 4) throw CborError.underrun();
		value = (reader.peek(1) << 24 | reader.peek(2) << 16 | reader.peek(3) << 8 | reader.peek(4)) >>> 0;
		if (value <= 65535 && header !== 250) throw CborError.nonCanonicalNumeric();
		varIntLen = 5;
	} else if (headerValue === 27) {
		if (dataRemaining < 8) throw CborError.underrun();
		const a = BigInt(reader.peek(1)) << 56n;
		const b = BigInt(reader.peek(2)) << 48n;
		const c = BigInt(reader.peek(3)) << 40n;
		const d = BigInt(reader.peek(4)) << 32n;
		const e = BigInt(reader.peek(5)) << 24n;
		const f = BigInt(reader.peek(6)) << 16n;
		const g = BigInt(reader.peek(7)) << 8n;
		const h = BigInt(reader.peek(8));
		value = narrowInteger(a | b | c | d | e | f | g | h);
		if (value <= 4294967295 && header !== 251) throw CborError.nonCanonicalNumeric();
		varIntLen = 9;
	} else throw CborError.unsupportedHeaderValue(headerValue);
	reader.advance(varIntLen);
	return {
		majorType,
		value,
		varIntLen
	};
}
function readCbor(reader) {
	if (reader.remaining < 1) throw CborError.underrun();
	const headStart = reader.pos;
	const { majorType, value, varIntLen } = readHeaderVarint(reader);
	switch (majorType) {
		case MajorType.Unsigned: {
			const cbor = attachMethods({
				isCbor: true,
				type: MajorType.Unsigned,
				value
			});
			checkCanonicalEncoding(cbor, reader.bytesAt(headStart, varIntLen));
			return cbor;
		}
		case MajorType.Negative: {
			const cbor = attachMethods({
				isCbor: true,
				type: MajorType.Negative,
				value
			});
			checkCanonicalEncoding(cbor, reader.bytesAt(headStart, varIntLen));
			return cbor;
		}
		case MajorType.ByteString: {
			if (typeof value === "bigint") throw CborError.underrun();
			if (reader.remaining < value) throw CborError.underrun();
			const bytes = reader.bytesAt(reader.pos, value);
			reader.advance(value);
			return attachMethods({
				isCbor: true,
				type: MajorType.ByteString,
				value: bytes
			});
		}
		case MajorType.Text: {
			if (typeof value === "bigint") throw CborError.underrun();
			if (reader.remaining < value) throw CborError.underrun();
			const textBytes = reader.bytesAt(reader.pos, value);
			reader.advance(value);
			let text;
			try {
				text = utf8Decoder.decode(textBytes);
			} catch {
				throw CborError.invalidUtf8(utf8ErrorDescription(textBytes));
			}
			if (text.normalize("NFC") !== text) throw CborError.nonCanonicalString();
			return attachMethods({
				isCbor: true,
				type: MajorType.Text,
				value: text
			});
		}
		case MajorType.Array: {
			const items = [];
			for (let i = 0; i < value; i++) items.push(readCbor(reader));
			return attachMethods({
				isCbor: true,
				type: MajorType.Array,
				value: items
			});
		}
		case MajorType.Map: {
			const map = new CborMap();
			for (let i = 0; i < value; i++) {
				const key = readCbor(reader);
				const val = readCbor(reader);
				map.setNext(key, val);
			}
			return attachMethods({
				isCbor: true,
				type: MajorType.Map,
				value: map
			});
		}
		case MajorType.Tagged: {
			const item = readCbor(reader);
			return attachMethods({
				isCbor: true,
				type: MajorType.Tagged,
				tag: value,
				value: item
			});
		}
		case MajorType.Simple: switch (varIntLen) {
			case 3: {
				const f = binary16ToNumber(reader.bytesAt(headStart + 1, 2));
				validateCanonicalF16(Number(value), f);
				return attachMethods(cborNodeFromF16(f));
			}
			case 5: {
				const f = binary32ToNumber(reader.bytesAt(headStart + 1, 4));
				validateCanonicalF32(f);
				return attachMethods(cborNodeFromF32(f));
			}
			case 9: {
				const f = binary64ToNumber(reader.bytesAt(headStart + 1, 8));
				validateCanonicalF64(f);
				return attachMethods(cborNodeFromF64(f));
			}
			default: switch (value) {
				case 20: return attachMethods({
					isCbor: true,
					type: MajorType.Simple,
					value: { type: "False" }
				});
				case 21: return attachMethods({
					isCbor: true,
					type: MajorType.Simple,
					value: { type: "True" }
				});
				case 22: return attachMethods({
					isCbor: true,
					type: MajorType.Simple,
					value: { type: "Null" }
				});
				default: throw CborError.invalidSimpleValue();
			}
		}
	}
}
function checkCanonicalEncoding(cbor, buf) {
	const buf2 = encodeCbor(cbor);
	if (!areBytesEqual(buf, buf2)) throw CborError.nonCanonicalNumeric();
}
/**
* Extract the native JavaScript value from a CBOR value, decoding it first
* when given bytes. Maps come back as `CborMap` and tagged values as `Cbor`
* (see {@link CborNative}).
*/
const extractCbor = (cbor) => {
	let c;
	if (cbor instanceof Uint8Array) c = decodeCbor(cbor);
	else c = cbor;
	switch (c.type) {
		case MajorType.Unsigned: return c.value;
		case MajorType.Negative: if (typeof c.value === "bigint") return -c.value - 1n;
		else return -c.value - 1;
		case MajorType.ByteString: return c.value;
		case MajorType.Text: return c.value;
		case MajorType.Array: return c.value.map(extractCbor);
		case MajorType.Map: return c.value;
		case MajorType.Tagged: return c;
		case MajorType.Simple: {
			const simple = c.value;
			switch (simple.type) {
				case "True": return true;
				case "False": return false;
				case "Null": return null;
				case "Float": return simple.value;
				default: return simple;
			}
		}
		default: return c;
	}
};
/**
* A deterministic CBOR map: maps with the same content encode identically,
* regardless of insertion order.
*
* - Entries are kept in lexicographic order of their encoded key bytes
* - Setting a key whose encoding is already present replaces that entry
* - Keys and values can be any type that can be converted to CBOR
*
* `CborMap` mirrors the JS `Map` protocol: `set`, `get`, `getOrThrow`, `has`,
* `delete`, `clear`, `size`, `keys()`, `values()`, `entries()`, `forEach`,
* iteration. `get` returns the stored `Cbor` node, like `entries()`; extract
* natives explicitly with `extractCbor(map.getOrThrow(k))`.
*
* @module map
*/
/**
* A deterministic CBOR map implementation.
*
* Maps are always encoded with keys sorted lexicographically by their
* encoded CBOR representation, ensuring deterministic encoding.
*/
var CborMap = class {
	/** Debug label: `Object.prototype.toString` reports `[object CborMap]`. */
	get [Symbol.toStringTag]() {
		return "CborMap";
	}
	_dict;
	/**
	* Creates a new, empty CBOR Map.
	* Optionally initializes from a JavaScript Map (every key and value must
	* itself be encodable).
	*/
	constructor(map) {
		this._dict = new SortedByteMap();
		if (map !== void 0) for (const [key, value] of map.entries()) this.set(key, value);
	}
	/**
	* Inserts a key-value pair into the map (replacing any entry whose key has
	* the same canonical encoding). Any insertion order is accepted - entries
	* are kept in canonical ascending encoded-key order.
	*
	* @example
	* ```typescript
	* const m = new CborMap();
	* m.set("z", 1);
	* m.set(10, "ten"); // sorts before "z" in the encoding
	* encodeCbor(m);    // deterministic regardless of insertion order
	* ```
	* @public
	*/
	set(key, value) {
		const keyCbor = cbor(key);
		const valueCbor = cbor(value);
		const keyData = encodeCbor(keyCbor);
		this._dict.set(keyData, {
			key: keyCbor,
			value: valueCbor
		});
	}
	_makeKey(key) {
		return encodeCbor(cbor(key));
	}
	/**
	* Get the stored `Cbor` node for a key, or `undefined` if absent.
	*
	* To read a native value, compose explicitly:
	*
	* ```typescript
	* asNumber(map.get("age"));          // number | undefined, checked
	* extractCbor(map.getOrThrow("age")); // CborNative, throws if absent
	* ```
	* @public
	*/
	get(key) {
		return this._dict.get(this._makeKey(key))?.value;
	}
	/**
	* Get the stored `Cbor` node for a key.
	*
	* @throws {CborError} `MissingMapKey` - the key is not present.
	*/
	getOrThrow(key) {
		const value = this.get(key);
		if (value === void 0) throw CborError.missingMapKey();
		return value;
	}
	delete(key) {
		const keyData = this._makeKey(key);
		const existed = this._dict.has(keyData);
		this._dict.delete(keyData);
		return existed;
	}
	has(key) {
		return this._dict.has(this._makeKey(key));
	}
	clear() {
		this._dict = new SortedByteMap();
	}
	/** The number of entries in the map. */
	get size() {
		return this._dict.size;
	}
	/**
	* Get the entries of the map as an array, sorted in canonical ascending
	* encoded-key order.
	*
	* @internal Public because the encoder, diagnostic formatter, and hex
	* annotator consume it cross-module; not part of the supported surface.
	*/
	get entriesArray() {
		return this._dict.map((value, _key) => ({
			key: value.key,
			value: value.value
		}));
	}
	/**
	* The stored entry at position `i` in canonical ascending encoded-key
	* order; the caller keeps `i` within `[0, size)`.
	*
	* @internal Positional access for the encoder and for structural equality,
	* which walk a map (or two maps in lockstep) without materializing
	* `entriesArray`; not part of the supported surface.
	*/
	entryAt(i) {
		return this._dict.valueAt(i);
	}
	/**
	* The encoded CBOR bytes of the key at position `i` - the bytes the entry
	* is sorted by, computed once when it was inserted.
	*
	* @internal The encoder writes these directly, as the reference's
	* `Map::cbor_data` writes its stored `MapKey`, instead of re-encoding the
	* key node; not part of the supported surface.
	*/
	encodedKeyAt(i) {
		return this._dict.keyAt(i);
	}
	/** Iterate keys in canonical (sorted encoded-key) order. */
	*keys() {
		for (const entry of this.entriesArray) yield entry.key;
	}
	/** Iterate values in canonical key order. */
	*values() {
		for (const entry of this.entriesArray) yield entry.value;
	}
	/**
	* Iterate `[key, value]` tuples in canonical key order (the JS
	* `Map.entries()` shape).
	*/
	*entries() {
		for (const entry of this.entriesArray) yield [entry.key, entry.value];
	}
	/** JS `Map.forEach` mirror (value first, then key, then the map). */
	forEach(callback, thisArg) {
		for (const entry of this.entriesArray) callback.call(thisArg, entry.value, entry.key, this);
	}
	*[Symbol.iterator]() {
		for (const entry of this.entriesArray) yield [entry.key, entry.value];
	}
	/**
	* Append a key-value pair whose encoded key must sort strictly after every
	* existing key.
	*
	* @internal The decoder's append path; not part of the supported surface.
	* @throws {CborError} `DuplicateMapKey` for a repeated key,
	*   `MisorderedMapKey` for a key out of ascending order.
	*/
	setNext(key, value) {
		const keyCbor = cbor(key);
		const newKey = encodeCbor(keyCbor);
		if (this._dict.has(newKey)) throw CborError.duplicateMapKey();
		const greatest = this._dict.maxKey();
		if (greatest !== void 0) {
			if (lexicographicallyCompareBytes(newKey, greatest) <= 0) throw CborError.misorderedMapKey();
		}
		this._dict.appendGreatest(newKey, {
			key: keyCbor,
			value: cbor(value)
		});
	}
	/**
	* Convert to a plain JavaScript `Map` of extracted native values.
	* Tagged values come back as `Cbor` nodes and nested maps as `CborMap`
	* (the {@link CborNative} asymmetries).
	*/
	toMap() {
		const map = /* @__PURE__ */ new Map();
		for (const entry of this.entriesArray) map.set(extractCbor(entry.key), extractCbor(entry.value));
		return map;
	}
};
/**
* Checks if the simple value is a floating point number.
*/
const isFloat = (simple) => simple.type === "Float";
/**
* Encodes the simple value to its raw CBOR byte representation.
*
* Returns the CBOR bytes that represent this simple value according to the
* dCBOR deterministic encoding rules:
* - `False` encodes as `0xf4`
* - `True` encodes as `0xf5`
* - `Null` encodes as `0xf6`
* - `Float` values reduce to an integer when whole, otherwise encode in the
*   shortest IEEE 754 width that preserves the value.
*/
const simpleCborData = (simple) => {
	switch (simple.type) {
		case "False": return encodeVarInt(20, MajorType.Simple);
		case "True": return encodeVarInt(21, MajorType.Simple);
		case "Null": return encodeVarInt(22, MajorType.Simple);
		case "Float": return f64CborData(simple.value);
	}
};
/**
* Compare two Simple values for equality.
*
* Two `Simple` values are equal if they're the same variant. For `Float`
* variants, the contained floating point values are compared for equality,
* with NaN values considered equal to each other.
*/
const simpleEquals = (a, b) => {
	if (a.type !== b.type) return false;
	switch (a.type) {
		case "False":
		case "True":
		case "Null": return true;
		case "Float": {
			if (!isFloat(b)) return false;
			const v1 = a.value;
			const v2 = b.value;
			return v1 === v2 || Number.isNaN(v1) && Number.isNaN(v2);
		}
	}
};
Uint8Array.fromHex;
/**
* Convert bytes to a lowercase hex string.
*
* Delegates to the native `Uint8Array.prototype.toHex` where available.
*/
const bytesToHex = (bytes) => {
	const native = bytes.toHex;
	if (typeof native === "function") return native.call(bytes);
	let out = "";
	for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
	return out;
};
/**
* The dCBOR value core: the `Cbor` union type, the polymorphic constructor
* `cbor()`, the encoder entry `encodeCbor()`, and the tagged-value
* constructor `taggedValue()`.
*
* ## The API in one paragraph
*
* Construct with `cbor(input)` (the single polymorphic constructor) or
* `taggedValue(tag, content)` (the only explicit tagged-value constructor);
* custom types participate by implementing the one structural protocol
* `ToCbor { toCbor(): Cbor }`. Encode with `encodeCbor(value)`. Decode with
* `decodeCbor(bytes)` (throws) or `tryDecode(bytes)` (returns `Result`).
* Read with the free `isX`/`asX`/`expectX` accessor functions. The only
* instance conveniences on a `Cbor` value are `toData()`, `toHex()`, and a
* cheap `toString()`.
*
* @module cbor
*/
/**
* The instance methods shared by every `Cbor` value: exactly three cheap
* conveniences (plus debug symbols below). Everything else is a free function
* so decode-only bundles never carry the diagnostic formatter, hex annotator,
* tag store, or walker.
*
* `String(c)`/template literals/`console.log` produce `Cbor(0x…)`. Diagnostic
* rendering lives in `@blockchaincommons/dcbor/diagnostic`; opt-in diag-flavored debug
* output lives in `@blockchaincommons/dcbor/debug` (`installDebugHooks()`).
*/
const CBOR_METHODS = {
	toData() {
		return encodeCbor(this);
	},
	toHex() {
		return bytesToHex(encodeCbor(this));
	},
	toString() {
		return `Cbor(0x${bytesToHex(encodeCbor(this))})`;
	},
	[Symbol.toStringTag]: "Cbor",
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.toString();
	}
};
/**
* Decorate a bare CBOR value (`{ isCbor, type, value[, tag] }`) with the shared
* instance methods. The methods live on {@link CBOR_METHODS} and are installed
* via the prototype - constructed with `Object.create` (not `setPrototypeOf`,
* which would drop the object off V8's fast path). Only the handful of data
* properties are own-properties; the methods are shared, not per-object.
*
* @internal
*/
const attachMethods = (obj) => {
	const decorated = Object.create(CBOR_METHODS);
	return Object.assign(decorated, obj);
};
const CBOR_FALSE = attachMethods({
	isCbor: true,
	type: MajorType.Simple,
	value: { type: "False" }
});
const CBOR_TRUE = attachMethods({
	isCbor: true,
	type: MajorType.Simple,
	value: { type: "True" }
});
const CBOR_NULL = attachMethods({
	isCbor: true,
	type: MajorType.Simple,
	value: { type: "Null" }
});
/**
* Structural CBOR value equality, the reference's `PartialEq for CBOR`
* (`cbor.rs`): two values are equal when they have the same major type and
* equal contents, compared recursively.
*
* This is not "encode to the same bytes": a float node whose value is whole
* (`Float(2.0)`, reachable through a bare node) encodes as the integer `2`
* but is not equal to the integer node; a text node keeps the string it was
* built from, so a decomposed `"é"` is not equal to the composed one although
* both encode composed. Integers compare by value across `number`/`bigint`;
* tags compare by value only (the carried name is ignored); NaN equals NaN;
* maps compare entry by entry in canonical key order, keys and values both
* structurally.
*
* Use this rather than `===` (which compares JS object references) when
* you need value equality across two `Cbor` instances built independently.
*/
const cborEquals = (a, b) => {
	if (a === b) return true;
	switch (a.type) {
		case MajorType.Unsigned: return b.type === MajorType.Unsigned && BigInt(a.value) === BigInt(b.value);
		case MajorType.Negative: return b.type === MajorType.Negative && BigInt(a.value) === BigInt(b.value);
		case MajorType.ByteString: return b.type === MajorType.ByteString && areBytesEqual(a.value, b.value);
		case MajorType.Text: return b.type === MajorType.Text && a.value === b.value;
		case MajorType.Array: return b.type === MajorType.Array && a.value.length === b.value.length && a.value.every((item, i) => cborEquals(item, b.value[i]));
		case MajorType.Map: return b.type === MajorType.Map && mapEquals(a.value, b.value);
		case MajorType.Tagged: return b.type === MajorType.Tagged && tagValuesEqual(a.tag, b.tag) && cborEquals(a.value, b.value);
		case MajorType.Simple: return b.type === MajorType.Simple && simpleEquals(a.value, b.value);
	}
};
/**
* `PartialEq for Map` (`map.rs`): the same entries in canonical key order,
* each with a structurally equal stored key node and value node. Both maps
* iterate in encoded-key order, so a lockstep walk is exact, and like the
* reference's `BTreeMap` equality it stops at the first mismatch. (The
* reference also compares the stored key bytes; that is implied here, since
* structurally equal key nodes always encode to the same bytes.)
*/
const mapEquals = (a, b) => {
	const n = a.size;
	if (n !== b.size) return false;
	for (let i = 0; i < n; i++) {
		const l = a.entryAt(i);
		const r = b.entryAt(i);
		if (!cborEquals(l.key, r.key) || !cborEquals(l.value, r.value)) return false;
	}
	return true;
};
const hasTaggedCbor = (value) => {
	return typeof value === "object" && value !== null && "taggedCbor" in value && typeof value.taggedCbor === "function";
};
const hasToCbor = (value) => {
	return typeof value === "object" && value !== null && "toCbor" in value && typeof value.toCbor === "function";
};
/**
* Convert any supported value to its CBOR representation - the single
* polymorphic constructor.
*
* Custom types participate by implementing {@link ToCbor}
* (`toCbor(): Cbor` - the `toJSON` precedent). Tagged values are built with
* {@link taggedValue}.
*
* @example
* ```typescript
* cbor(42);                          // integer
* cbor("héllo");                     // text (NFC-normalized when encoded)
* cbor([1, "two", true, null]);      // array
* cbor(new Map([["k", 1]]));         // map (canonical key order)
* cbor({ name: "Alice", age: 30 });  // plain object -> map
* ```
*
* @throws {CborError} `OutOfRange` - bigint outside `[-(2^64), 2^64 - 1]`.
* @throws {CborError} `Custom` - unsupported input type, or one of the two
*   directive errors below.
* @public
*
* ## Directive errors
*
* Two input shapes throw a directive `CborError` because encoding them
* silently would produce ambiguous or divergent bytes:
*
* - plain objects shaped exactly `{tag, value}`: use
*   `taggedValue(tag, content)` for a tagged value, or add/rename a key for
*   a map;
* - objects implementing `taggedCbor()` but not `toCbor()`: add
*   `toCbor() { return this.taggedCbor(); }`.
*/
const cbor = (value) => {
	if (isCbor(value) && "toData" in value) return value;
	if (isCbor(value)) return attachMethods(value);
	let result;
	if (isCborNumber(value)) {
		if (typeof value === "number" && Number.isNaN(value)) result = {
			isCbor: true,
			type: MajorType.Simple,
			value: {
				type: "Float",
				value: NaN
			}
		};
		else if (typeof value === "number" && hasFractionalPart(value)) result = {
			isCbor: true,
			type: MajorType.Simple,
			value: {
				type: "Float",
				value
			}
		};
		else if (value == Infinity) result = {
			isCbor: true,
			type: MajorType.Simple,
			value: {
				type: "Float",
				value: Infinity
			}
		};
		else if (value == -Infinity) result = {
			isCbor: true,
			type: MajorType.Simple,
			value: {
				type: "Float",
				value: -Infinity
			}
		};
		else if (typeof value === "number" && !Number.isSafeInteger(value)) {
			const big = BigInt(value);
			if (big >= 0n && big <= 18446744073709551615n) result = {
				isCbor: true,
				type: MajorType.Unsigned,
				value: big
			};
			else if (big < 0n && big >= CBOR_INT_MIN) result = {
				isCbor: true,
				type: MajorType.Negative,
				value: -big - 1n
			};
			else result = {
				isCbor: true,
				type: MajorType.Simple,
				value: {
					type: "Float",
					value
				}
			};
		} else if (typeof value === "bigint" && (value > 18446744073709551615n || value < CBOR_INT_MIN)) throw CborError.outOfRange();
		else if (value < 0) {
			if (typeof value === "bigint") result = {
				isCbor: true,
				type: MajorType.Negative,
				value: -value - 1n
			};
			else result = {
				isCbor: true,
				type: MajorType.Negative,
				value: -value - 1
			};
		} else result = {
			isCbor: true,
			type: MajorType.Unsigned,
			value
		};
	} else if (typeof value === "string") result = {
		isCbor: true,
		type: MajorType.Text,
		value
	};
	else if (value === null || value === void 0) return CBOR_NULL;
	else if (value === true) return CBOR_TRUE;
	else if (value === false) return CBOR_FALSE;
	else if (Array.isArray(value)) result = {
		isCbor: true,
		type: MajorType.Array,
		value: value.map(cbor)
	};
	else if (value instanceof Uint8Array) result = {
		isCbor: true,
		type: MajorType.ByteString,
		value
	};
	else if (value instanceof CborMap) result = {
		isCbor: true,
		type: MajorType.Map,
		value
	};
	else if (value instanceof Map) result = {
		isCbor: true,
		type: MajorType.Map,
		value: new CborMap(value)
	};
	else if (value instanceof Set) result = {
		isCbor: true,
		type: MajorType.Array,
		value: Array.from(value).map(cbor)
	};
	else if (hasToCbor(value)) return value.toCbor();
	else if (hasTaggedCbor(value)) throw CborError.custom("objects implementing taggedCbor() are not auto-wrapped by cbor(); implement toCbor() (e.g. `toCbor() { return this.taggedCbor(); }`)");
	else if (typeof value === "object" && "tag" in value && "value" in value) {
		const keys = Object.keys(value);
		if (keys.length === 2 && keys.includes("tag") && keys.includes("value")) throw CborError.custom("plain { tag, value } objects are ambiguous and do not encode as tagged values; use taggedValue(tag, content) for a tagged value, or add/rename a key to encode a map");
		const map = new CborMap();
		for (const [key, val] of Object.entries(value)) map.set(cbor(key), cbor(val));
		result = {
			isCbor: true,
			type: MajorType.Map,
			value: map
		};
	} else if (typeof value === "object") {
		const map = new CborMap();
		for (const [key, val] of Object.entries(value)) map.set(cbor(key), cbor(val));
		result = {
			isCbor: true,
			type: MajorType.Map,
			value: map
		};
	} else throw CborError.custom("Unsupported type for CBOR encoding");
	return attachMethods(result);
};
const textEncoder = new TextEncoder();
/**
* dCBOR requires every encoded text string to be in Unicode Normalization
* Form C. Like the reference (`cbor.rs`: `x.nfc().collect()` inside
* `cbor_data`), normalization happens here at encode time, so the node keeps
* the string it was built from. Strings whose code units are all below U+0300
* (the first combining mark) contain nothing that can compose or decompose
* and are already NFC; skipping `normalize` for them keeps the ASCII/Latin-1
* hot path allocation-free.
*/
const toNfc = (text) => {
	for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) >= 768) return text.normalize("NFC");
	return text;
};
/**
* Write a CBOR value into `writer`. The whole tree encodes into one growable
* buffer, so nested containers don't allocate-and-concatenate a fresh array
* per level.
*/
const writeCborInto = (writer, value) => {
	const c = cbor(value);
	switch (c.type) {
		case MajorType.Unsigned:
			writeVarInt(writer, c.value, MajorType.Unsigned);
			return;
		case MajorType.Negative:
			writeVarInt(writer, c.value, MajorType.Negative);
			return;
		case MajorType.ByteString:
			if (c.value instanceof Uint8Array) {
				writeVarInt(writer, c.value.length, MajorType.ByteString);
				writer.writeBytes(c.value);
				return;
			}
			break;
		case MajorType.Text:
			if (typeof c.value === "string") {
				const utf8Bytes = textEncoder.encode(toNfc(c.value));
				writeVarInt(writer, utf8Bytes.length, MajorType.Text);
				writer.writeBytes(utf8Bytes);
				return;
			}
			break;
		case MajorType.Tagged:
			if (typeof c.tag === "bigint" || typeof c.tag === "number") {
				writeVarInt(writer, c.tag, MajorType.Tagged);
				writeCborInto(writer, c.value);
				return;
			}
			break;
		case MajorType.Simple:
			writer.writeBytes(simpleCborData(c.value));
			return;
		case MajorType.Array:
			writeVarInt(writer, c.value.length, MajorType.Array);
			for (const item of c.value) writeCborInto(writer, item);
			return;
		case MajorType.Map: {
			const map = c.value;
			const n = map.size;
			writeVarInt(writer, n, MajorType.Map);
			for (let i = 0; i < n; i++) {
				writer.writeBytes(map.encodedKeyAt(i));
				writeCborInto(writer, map.entryAt(i).value);
			}
			return;
		}
	}
	throw CborError.wrongType();
};
/**
* Encode a value to deterministic CBOR bytes. Accepts anything `cbor()`
* accepts; equal values always produce identical bytes (dCBOR determinism).
*
* @example
* ```typescript
* encodeCbor({ a: 1 });            // Uint8Array [0xa1, 0x61, 0x61, 0x01]
* bytesToHex(encodeCbor("Hello")); // "6548656c6c6f"
* ```
*
* @throws {CborError} Whatever `cbor(value)` throws for unsupported inputs
*   (`OutOfRange`, `Custom`).
* @remarks The decoder's canonicality check re-encodes every decoded value
*   through this function, so it is wire-critical.
* @public
*/
const encodeCbor = (value) => {
	const c = cbor(value);
	switch (c.type) {
		case MajorType.Unsigned: return encodeVarInt(c.value, MajorType.Unsigned);
		case MajorType.Negative: return encodeVarInt(c.value, MajorType.Negative);
		case MajorType.Simple: return simpleCborData(c.value);
		default: {
			const writer = new BufWriter();
			writeCborInto(writer, c);
			return writer.toBytes();
		}
	}
};
//#endregion
//#region ../bc-ur-ts/dist/fountain-B6SBcdn8.mjs
/**
* xoshiro256** on 32-bit lanes, seeded from 32 bytes (four big-endian
* u64s), with the double/int/shuffle/degree samplers the fountain code
* draws from. Internal; the same core as `@blockchaincommons/rand`.
*
* @internal
* @module xoshiro
*/
const TWO_32 = 4294967296;
const TWO_64 = 0x10000000000000000;
var Xoshiro256 = class {
	s = /* @__PURE__ */ new Uint32Array(8);
	outLo = 0;
	outHi = 0;
	/** @throws {RangeError} unless `seed` is 32 bytes. */
	constructor(seed) {
		if (seed.length !== 32) throw new RangeError(`seed must be 32 bytes, got ${seed.length}`);
		const v = new DataView(seed.buffer, seed.byteOffset, 32);
		for (let i = 0; i < 4; i++) {
			this.s[i * 2 + 1] = v.getUint32(i * 8, false);
			this.s[i * 2] = v.getUint32(i * 8 + 4, false);
		}
	}
	step() {
		const s = this.s;
		const s0lo = s[0], s0hi = s[1], s1lo = s[2], s1hi = s[3], s2lo = s[4], s2hi = s[5], s3lo = s[6], s3hi = s[7];
		let p = s1lo * 5;
		const mlo = p >>> 0;
		const mhi = Math.imul(s1hi, 5) + Math.floor(p / TWO_32) >>> 0;
		const rlo = (mlo << 7 | mhi >>> 25) >>> 0;
		const rhi = (mhi << 7 | mlo >>> 25) >>> 0;
		p = rlo * 9;
		this.outLo = p >>> 0;
		this.outHi = Math.imul(rhi, 9) + Math.floor(p / TWO_32) >>> 0;
		const tlo = s1lo << 17 >>> 0;
		const thi = (s1hi << 17 | s1lo >>> 15) >>> 0;
		let n2lo = (s2lo ^ s0lo) >>> 0, n2hi = (s2hi ^ s0hi) >>> 0;
		let n3lo = (s3lo ^ s1lo) >>> 0, n3hi = (s3hi ^ s1hi) >>> 0;
		const n1lo = (s1lo ^ n2lo) >>> 0, n1hi = (s1hi ^ n2hi) >>> 0;
		const n0lo = (s0lo ^ n3lo) >>> 0, n0hi = (s0hi ^ n3hi) >>> 0;
		n2lo = (n2lo ^ tlo) >>> 0;
		n2hi = (n2hi ^ thi) >>> 0;
		const swlo = n3hi, swhi = n3lo;
		n3lo = (swlo << 13 | swhi >>> 19) >>> 0;
		n3hi = (swhi << 13 | swlo >>> 19) >>> 0;
		s[0] = n0lo;
		s[1] = n0hi;
		s[2] = n1lo;
		s[3] = n1hi;
		s[4] = n2lo;
		s[5] = n2hi;
		s[6] = n3lo;
		s[7] = n3hi;
	}
	nextU64() {
		this.step();
		return BigInt(this.outHi) << 32n | BigInt(this.outLo);
	}
	/** The next output as a double in [0, 1): the 64-bit value divided by 2^64. */
	nextDouble() {
		this.step();
		return (this.outHi * TWO_32 + this.outLo) / TWO_64;
	}
	/** Uniform-ish integer in `[low, high]` from one double. */
	nextInt(low, high) {
		return Math.floor(this.nextDouble() * (high - low + 1)) + low;
	}
	nextByte() {
		return this.nextInt(0, 255);
	}
	nextData(count) {
		const out = new Uint8Array(count);
		for (let i = 0; i < count; i++) out[i] = this.nextByte();
		return out;
	}
	/** Fisher–Yates by repeated removal, the order the reference uses. */
	shuffled(items) {
		const source = [...items];
		const out = [];
		while (source.length > 0) {
			const index = this.nextInt(0, source.length - 1);
			out.push(source.splice(index, 1)[0]);
		}
		return out;
	}
	/** A degree in `1..=seqLen` with probability ∝ 1/degree (alias sampling). */
	chooseDegree(seqLen) {
		return new AliasSampler(Array.from({ length: seqLen }, (_, i) => 1 / (i + 1))).next(this) + 1;
	}
};
/**
* Builds the alias table exactly as the reference's `Weighted::new` does.
* The floating-point operation order is wire: the table decides which
* fragments a mixed part carries, so each expression is written in the
* reference's association.
* @internal
*/
function aliasTable(weights) {
	const n = weights.length;
	const sum = weights.reduce((a, b) => a + b, 0);
	const normalized = weights.map((w) => w * (n / sum));
	const aliases = new Array(n).fill(0);
	const probs = new Array(n).fill(0);
	const small = [];
	const large = [];
	for (let i = n - 1; i >= 0; i--) (normalized[i] < 1 ? small : large).push(i);
	while (small.length > 0 && large.length > 0) {
		const a = small.pop();
		const g = large.pop();
		if (a === void 0 || g === void 0) break;
		probs[a] = normalized[a];
		aliases[a] = g;
		normalized[g] = normalized[g] + (normalized[a] - 1);
		(normalized[g] < 1 ? small : large).push(g);
	}
	for (const g of large) probs[g] = 1;
	for (const a of small) probs[a] = 1;
	return {
		probs,
		aliases
	};
}
/** Walker alias method over non-negative weights. */
var AliasSampler = class {
	aliases;
	probs;
	constructor(weights) {
		const table = aliasTable(weights);
		this.aliases = table.aliases;
		this.probs = table.probs;
	}
	next(rng) {
		const r1 = rng.nextDouble();
		const r2 = rng.nextDouble();
		const i = Math.floor(this.probs.length * r1);
		return r2 < this.probs[i] ? i : this.aliases[i];
	}
};
/** The fountain seed for a part: `sha256(seqNum ‖ checksum)`, both big-endian u32. */
function seedFor(checksum, seqNum) {
	const bytes = /* @__PURE__ */ new Uint8Array(8);
	const v = new DataView(bytes.buffer);
	v.setUint32(0, seqNum, false);
	v.setUint32(4, checksum, false);
	return sha256(bytes);
}
/**
* The Luby-transform fountain code behind multipart URs: a message is cut
* into equal fragments, each part XORs a pseudo-random subset of them
* (chosen from a xoshiro stream seeded by the part number and the message
* checksum), and a decoder recovers the fragments as the reference's
* `ur::fountain::Decoder` does.
*
* @module @blockchaincommons/uniform-resources/fountain
*/
function expectPart(part) {
	const record = expectRecord("part", part);
	return {
		seqNum: expectInt("seqNum", record["seqNum"], NON_NEGATIVE),
		seqLen: expectInt("seqLen", record["seqLen"], NON_NEGATIVE),
		messageLen: expectInt("messageLen", record["messageLen"], NON_NEGATIVE),
		checksum: expectInt("checksum", record["checksum"], U32),
		data: expectBytes("data", record["data"])
	};
}
const divCeil = (a, b) => Math.floor(a / b) + (a % b > 0 ? 1 : 0);
/**
* The fragment length that cuts `dataLength` into the fewest fragments of at most `maxFragmentLength`, evenly.
* @throws {URError} `InvalidParameter` unless `dataLength` is an integer ≥ 0 and `maxFragmentLength` an integer ≥ 1.
*/
function fragmentLength(dataLength, maxFragmentLength) {
	expectInt("dataLength", dataLength, NON_NEGATIVE);
	expectInt("maxFragmentLength", maxFragmentLength, POSITIVE);
	return divCeil(dataLength, divCeil(dataLength, maxFragmentLength));
}
/**
* Cut `data` into `fragmentLen`-byte fragments, zero-padding the last.
* @throws {URError} `InvalidParameter` unless `data` is a `Uint8Array` and `fragmentLen` an integer ≥ 1.
*/
function partition(data, fragmentLen) {
	expectBytes("data", data);
	expectInt("fragmentLength", fragmentLen, POSITIVE);
	const count = divCeil(data.length, fragmentLen);
	const fragments = [];
	for (let i = 0; i < count; i++) {
		const f = new Uint8Array(fragmentLen);
		f.set(data.subarray(i * fragmentLen, (i + 1) * fragmentLen));
		fragments.push(f);
	}
	return fragments;
}
/**
* `target ^= source` over the shorter length, as the reference's `xor` zips
* the two slices in its release build.
* @throws {URError} `InvalidParameter` unless both are `Uint8Array`s.
*/
function xorInto(target, source) {
	expectBytes("target", target);
	expectBytes("source", source);
	const n = Math.min(target.length, source.length);
	for (let i = 0; i < n; i++) target[i] ^= source[i];
}
function fragmentIndexes(seqNum, seqLen, checksum) {
	if (seqNum <= seqLen) return [seqNum - 1];
	const rng = new Xoshiro256(seedFor(checksum, seqNum));
	const degree = rng.chooseDegree(seqLen);
	const indices = Array.from({ length: seqLen }, (_, i) => i);
	return rng.shuffled(indices).slice(0, degree);
}
/**
* XOR of the fragments at `indices`.
* @throws {URError} `InvalidParameter` unless `fragments` is a non-empty array of `Uint8Array`s and `indices` a non-empty array of indexes into it.
*/
function mixFragments(fragments, indices) {
	const fragmentList = fragments;
	if (!Array.isArray(fragmentList) || fragmentList.length === 0 || !fragmentList.every(isBytes$2)) throw URError.invalidParameter("fragments", fragments, "a non-empty array of Uint8Array");
	const indexList = indices;
	if (!Array.isArray(indexList) || indexList.length === 0) throw URError.invalidParameter("indices", indices, "a non-empty array of fragment indexes");
	const out = new Uint8Array(fragments[0].length);
	for (const index of indexList) {
		const fragment = isIntIn(index, NON_NEGATIVE) ? fragments[index] : void 0;
		if (fragment === void 0) throw URError.invalidParameter("indices", index, `an index below ${fragments.length}`);
		xorInto(out, fragment);
	}
	return out;
}
/**
* Encode a part as its CBOR array. `seqNum`, `seqLen` and `messageLen` are
* written as `u32`s, truncated as the reference's `as u32` truncates them.
* @throws {URError} `InvalidParameter` unless the counters are integers ≥ 0, `checksum` a `u32` and `data` a `Uint8Array`.
*/
function encodeFountainPart(part) {
	const p = expectPart(part);
	return encodeCbor([
		p.seqNum >>> 0,
		p.seqLen >>> 0,
		p.messageLen >>> 0,
		p.checksum,
		p.data
	]);
}
/**
* Produces parts forever; the first `partCount` are the plain fragments.
*
* The sequence is infinite by design: `Array.from(encoder)` never returns.
* Iterate with `for … of` and `break`, or take a prefix with the iterator
* helpers (`encoder[Symbol.iterator]().take(n)`, Node ≥ 22).
*/
var FountainEncoder = class {
	#fragments;
	#messageLen;
	#checksum;
	#seqNum = 0;
	/**
	* Fragments of at most `maxFragmentLen` bytes. The length is the
	* reference's `usize`: a safe integer `number`, or a `bigint` up to
	* 2⁶⁴ − 1 (a `number` of 2⁵³ or more is not accepted, as it may already
	* have been rounded).
	* @throws {URError} In the reference's order: `Decoder` for an empty
	* message ("expected non-empty message") and for a length of 0 ("expected
	* positive maximum fragment length"); `InvalidParameter` unless `message`
	* is a `Uint8Array` and the length is in the domain above.
	*/
	constructor(message, maxFragmentLen) {
		expectBytes("message", message);
		if (message.length === 0) throw URError.decoder("expected non-empty message");
		if (maxFragmentLen === 0 || maxFragmentLen === 0n) throw URError.decoder("expected positive maximum fragment length");
		const max = expectUsize("maxFragmentLength", maxFragmentLen, 1n);
		const effective = Number(max < BigInt(message.length) ? max : BigInt(message.length));
		this.#messageLen = message.length;
		this.#checksum = crc32(message);
		this.#fragments = partition(message, fragmentLength(message.length, effective));
	}
	/** Number of fragments; parts beyond it are mixtures. */
	get partCount() {
		return this.#fragments.length;
	}
	/** Parts produced so far. */
	get index() {
		return this.#seqNum;
	}
	/** Whether every plain fragment has been emitted at least once. */
	get done() {
		return this.#seqNum >= this.#fragments.length;
	}
	/** Whether the message fits in one fragment. */
	get isSinglePart() {
		return this.#fragments.length === 1;
	}
	/** The next part: a plain fragment while `seqNum ≤ partCount`, then a mixture. */
	nextPart() {
		this.#seqNum++;
		const indices = fragmentIndexes(this.#seqNum, this.partCount, this.#checksum);
		return {
			seqNum: this.#seqNum,
			seqLen: this.partCount,
			messageLen: this.#messageLen,
			checksum: this.#checksum,
			data: mixFragments(this.#fragments, indices)
		};
	}
	/** Start again from part 1. */
	reset() {
		this.#seqNum = 0;
	}
	/** Parts, forever. */
	*[Symbol.iterator]() {
		for (;;) yield this.nextPart();
	}
};
//#endregion
//#region ../bc-ur-ts/dist/index.mjs
/**
* UR type identifiers.
*
* @module ur-type
*/
const VALID = /^[a-z0-9-]*$/;
/**
* A UR type: lowercase letters, digits and hyphens, as the reference's
* `URType::new` accepts them. The empty string is accepted, so `ur:/…` is
* a valid UR, although BCR-2020-005 asks for one or more characters.
*/
var URType = class URType {
	#name;
	/**
	* @throws {URError} `InvalidType` when `name` has a character outside
	* `[a-z0-9-]`; `InvalidParameter` for a non-string.
	*/
	constructor(name) {
		if (!URType.isValid(name)) throw URError.invalidType();
		this.#name = name;
	}
	/**
	* `name` itself when it is already a `URType`, else a new one.
	* @throws {URError} `InvalidType`; `InvalidParameter` for anything but a string or `URType`.
	*/
	static from(name) {
		if (name instanceof URType) return name;
		if (typeof name !== "string") throw URError.invalidParameter("type", name, "a string or URType");
		return new URType(name);
	}
	/** Non-throwing `from` for a string. @throws {URError} `InvalidParameter` for a non-string. */
	static tryFrom(name) {
		return URType.isValid(name) ? {
			ok: true,
			value: new URType(name)
		} : {
			ok: false,
			error: URError.invalidType()
		};
	}
	/**
	* Whether every character of `name` is in `[a-z0-9-]` (the empty string is valid).
	* @throws {URError} `InvalidParameter` for a non-string.
	*/
	static isValid(name) {
		return VALID.test(expectString("name", name));
	}
	/** The type string, e.g. `"envelope"`. */
	get name() {
		return this.#name;
	}
	/** Same type string. */
	equals(other) {
		return this.#name === other.#name;
	}
	/** The type string. */
	toString() {
		return this.#name;
	}
};
/**
* The multipart `seqNum-seqLen` header, read as the reference's `ur::decode`
* reads it.
*
* @internal
* @module header
*/
/** `u16::from_str`: an optional `+`, ASCII digits, at most 65535. */
const U16 = /^\+?[0-9]+$/;
const isU16 = (s) => U16.test(s) && Number(s) <= 65535;
/**
* Whether `header` is two `u16`s split at its first `-` (`1-2`, `+1-2`,
* `0001-2`); `1-2-3`, `1-x`, `-1-2` and `65536-1` are not.
*/
function isMultipartHeader(header) {
	const dash = header.indexOf("-");
	if (dash === -1) return false;
	return isU16(header.slice(0, dash)) && isU16(header.slice(dash + 1));
}
/**
* Single-part Uniform Resources.
*
* @module ur
*/
/**
* A UR: a {@link URType} and a CBOR payload, spelled
* `ur:<type>/<minimal bytewords of the CBOR>`.
*/
var UR = class UR {
	#type;
	#cbor;
	/** A UR from an already-validated type and a decoded CBOR value. */
	constructor(type, cbor) {
		this.#type = type;
		this.#cbor = cbor;
	}
	/** A UR of `type` over `cbor`. @throws {URError} `InvalidType` for a malformed type string. */
	static from(type, cbor) {
		return new UR(URType.from(type), cbor);
	}
	/**
	* Parse a single-part UR string (any case: the whole string is
	* lower-cased first, as the reference's `UR::from_ur_string` does).
	* @throws {URError} In the reference's order: `InvalidScheme` (no `ur:`),
	* `TypeUnspecified` (no `/`), `InvalidType`, then `Decoder` for what the
	* reference's `ur::decode` rejects (a multipart header that is not two
	* `u16`s, "Invalid indices"; or the payload's bytewords, "invalid word" /
	* "invalid checksum" / "invalid length" / non-ASCII), `NotSinglePart` for
	* a well-formed multipart string, and `Cbor`.
	*/
	static parse(urString) {
		const { type, bytes } = UR.decodeBytes(urString);
		let cbor;
		try {
			cbor = decodeCbor(bytes);
		} catch (error) {
			throw URError.cbor(error instanceof Error ? error.message : String(error), error);
		}
		return new UR(type, cbor);
	}
	/** The string for already-encoded CBOR bytes. @throws {URError} `InvalidType`; `InvalidParameter` for a non-`Uint8Array`. */
	static encodeBytes(type, cborBytes) {
		const urType = URType.from(type);
		expectBytes("cborBytes", cborBytes);
		return `ur:${urType.name}/${encodeBytewords(cborBytes, "minimal")}`;
	}
	/**
	* The type and CBOR bytes of a single-part UR string, without decoding
	* the CBOR; the checks and their order are those of {@link UR.parse}.
	*/
	static decodeBytes(urString) {
		const s = expectString("urString", urString).toLowerCase();
		if (!s.startsWith("ur:")) throw URError.invalidScheme();
		const body = s.slice(3);
		const slash = body.indexOf("/");
		if (slash === -1) throw URError.typeUnspecified();
		const type = new URType(body.slice(0, slash));
		const payload = body.slice(slash + 1);
		const lastSlash = payload.lastIndexOf("/");
		if (lastSlash !== -1 && !isMultipartHeader(payload.slice(0, lastSlash))) throw URError.decoder("Invalid indices");
		const bytes = decodeBytewordsOrReason(payload.slice(lastSlash + 1), "minimal");
		if (typeof bytes === "string") throw URError.decoder(bytes);
		if (lastSlash !== -1) throw URError.notSinglePart();
		return {
			type,
			bytes
		};
	}
	/** The UR type. */
	get type() {
		return this.#type;
	}
	/** The payload. */
	get cbor() {
		return this.#cbor;
	}
	/** `ur:<type>/<bytewords>` */
	toString() {
		return UR.encodeBytes(this.#type, this.#cbor.toData());
	}
	/** Upper-case form for alphanumeric QR encoding. */
	toQRString() {
		return this.toString().toUpperCase();
	}
	/** UTF-8 bytes of `toQRString`. */
	toQRBytes() {
		return new TextEncoder().encode(this.toQRString());
	}
	/** Whether the UR's type is `type`. @throws {URError} `InvalidParameter` for anything but a string or `URType`. */
	isType(type) {
		if (type instanceof URType) return this.#type.equals(type);
		return this.#type.name === expectString("type", type);
	}
	/** Throws unless the UR's type is `type`. @throws {URError} `UnexpectedType` */
	expectType(type) {
		const expected = URType.from(type);
		if (!this.#type.equals(expected)) throw URError.unexpectedType(expected.name, this.#type.name);
	}
	/** Same type and structurally equal CBOR, as the reference's `PartialEq` compares them. */
	equals(other) {
		return this.#type.equals(other.#type) && cborEquals(this.#cbor, other.#cbor);
	}
};
/**
* Emits `ur:<type>/<seqNum>-<seqLen>/<bytewords>` part strings forever;
* iterate it, or call `nextPart` to step.
*
* The sequence is infinite by design (a fountain code): `Array.from(encoder)`
* and `[...encoder]` never return. Iterate with `for … of` and `break` when
* the receiver is done, or take a prefix with the iterator helpers
* (`encoder[Symbol.iterator]().take(n)`, Node ≥ 22).
*/
var MultipartEncoder = class {
	#type;
	#fountain;
	/**
	* Parts of at most `maxFragmentLength` payload bytes each. The length is
	* the reference's `usize`: a safe integer `number`, or a `bigint` up to
	* 2⁶⁴ − 1 (a `number` of 2⁵³ or more is not accepted, as it may already
	* have been rounded).
	* @throws {URError} `Decoder` ("expected positive maximum fragment
	* length") for 0; `InvalidParameter` for any other value outside that
	* domain.
	*/
	constructor(ur, maxFragmentLength) {
		this.#type = ur.type.name;
		this.#fountain = new FountainEncoder(ur.cbor.toData(), maxFragmentLength);
	}
	/** Parts produced so far. */
	get index() {
		return this.#fountain.index;
	}
	/** Number of fragments; parts beyond it are mixtures. */
	get partCount() {
		return this.#fountain.partCount;
	}
	/** The next part string. */
	nextPart() {
		return this.#encode(this.#fountain.nextPart());
	}
	#encode(part) {
		return `ur:${this.#type}/${part.seqNum}-${part.seqLen}/${encodeBytewords(encodeFountainPart(part), "minimal")}`;
	}
	/** Part strings, forever. */
	*[Symbol.iterator]() {
		for (;;) yield this.nextPart();
	}
};
//#endregion
//#region ../../node_modules/qrcode-generator/dist/qrcode.mjs
/**
* qrcode
* @param typeNumber 1 to 40
* @param errorCorrectionLevel 'L','M','Q','H'
*/
const qrcode = function(typeNumber, errorCorrectionLevel) {
	const PAD0 = 236;
	const PAD1 = 17;
	let _typeNumber = typeNumber;
	const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
	let _modules = null;
	let _moduleCount = 0;
	let _dataCache = null;
	const _dataList = [];
	const _this = {};
	const makeImpl = function(test, maskPattern) {
		_moduleCount = _typeNumber * 4 + 17;
		_modules = function(moduleCount) {
			const modules = new Array(moduleCount);
			for (let row = 0; row < moduleCount; row += 1) {
				modules[row] = new Array(moduleCount);
				for (let col = 0; col < moduleCount; col += 1) modules[row][col] = null;
			}
			return modules;
		}(_moduleCount);
		setupPositionProbePattern(0, 0);
		setupPositionProbePattern(_moduleCount - 7, 0);
		setupPositionProbePattern(0, _moduleCount - 7);
		setupPositionAdjustPattern();
		setupTimingPattern();
		setupTypeInfo(test, maskPattern);
		if (_typeNumber >= 7) setupTypeNumber(test);
		if (_dataCache == null) _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
		mapData(_dataCache, maskPattern);
	};
	const setupPositionProbePattern = function(row, col) {
		for (let r = -1; r <= 7; r += 1) {
			if (row + r <= -1 || _moduleCount <= row + r) continue;
			for (let c = -1; c <= 7; c += 1) {
				if (col + c <= -1 || _moduleCount <= col + c) continue;
				if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) _modules[row + r][col + c] = true;
				else _modules[row + r][col + c] = false;
			}
		}
	};
	const getBestMaskPattern = function() {
		let minLostPoint = 0;
		let pattern = 0;
		for (let i = 0; i < 8; i += 1) {
			makeImpl(true, i);
			const lostPoint = QRUtil.getLostPoint(_this);
			if (i == 0 || minLostPoint > lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
		return pattern;
	};
	const setupTimingPattern = function() {
		for (let r = 8; r < _moduleCount - 8; r += 1) {
			if (_modules[r][6] != null) continue;
			_modules[r][6] = r % 2 == 0;
		}
		for (let c = 8; c < _moduleCount - 8; c += 1) {
			if (_modules[6][c] != null) continue;
			_modules[6][c] = c % 2 == 0;
		}
	};
	const setupPositionAdjustPattern = function() {
		const pos = QRUtil.getPatternPosition(_typeNumber);
		for (let i = 0; i < pos.length; i += 1) for (let j = 0; j < pos.length; j += 1) {
			const row = pos[i];
			const col = pos[j];
			if (_modules[row][col] != null) continue;
			for (let r = -2; r <= 2; r += 1) for (let c = -2; c <= 2; c += 1) if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) _modules[row + r][col + c] = true;
			else _modules[row + r][col + c] = false;
		}
	};
	const setupTypeNumber = function(test) {
		const bits = QRUtil.getBCHTypeNumber(_typeNumber);
		for (let i = 0; i < 18; i += 1) {
			const mod = !test && (bits >> i & 1) == 1;
			_modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
		}
		for (let i = 0; i < 18; i += 1) {
			const mod = !test && (bits >> i & 1) == 1;
			_modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
		}
	};
	const setupTypeInfo = function(test, maskPattern) {
		const data = _errorCorrectionLevel << 3 | maskPattern;
		const bits = QRUtil.getBCHTypeInfo(data);
		for (let i = 0; i < 15; i += 1) {
			const mod = !test && (bits >> i & 1) == 1;
			if (i < 6) _modules[i][8] = mod;
			else if (i < 8) _modules[i + 1][8] = mod;
			else _modules[_moduleCount - 15 + i][8] = mod;
		}
		for (let i = 0; i < 15; i += 1) {
			const mod = !test && (bits >> i & 1) == 1;
			if (i < 8) _modules[8][_moduleCount - i - 1] = mod;
			else if (i < 9) _modules[8][15 - i - 1 + 1] = mod;
			else _modules[8][15 - i - 1] = mod;
		}
		_modules[_moduleCount - 8][8] = !test;
	};
	const mapData = function(data, maskPattern) {
		let inc = -1;
		let row = _moduleCount - 1;
		let bitIndex = 7;
		let byteIndex = 0;
		const maskFunc = QRUtil.getMaskFunction(maskPattern);
		for (let col = _moduleCount - 1; col > 0; col -= 2) {
			if (col == 6) col -= 1;
			while (true) {
				for (let c = 0; c < 2; c += 1) if (_modules[row][col - c] == null) {
					let dark = false;
					if (byteIndex < data.length) dark = (data[byteIndex] >>> bitIndex & 1) == 1;
					if (maskFunc(row, col - c)) dark = !dark;
					_modules[row][col - c] = dark;
					bitIndex -= 1;
					if (bitIndex == -1) {
						byteIndex += 1;
						bitIndex = 7;
					}
				}
				row += inc;
				if (row < 0 || _moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
	};
	const createBytes = function(buffer, rsBlocks) {
		let offset = 0;
		let maxDcCount = 0;
		let maxEcCount = 0;
		const dcdata = new Array(rsBlocks.length);
		const ecdata = new Array(rsBlocks.length);
		for (let r = 0; r < rsBlocks.length; r += 1) {
			const dcCount = rsBlocks[r].dataCount;
			const ecCount = rsBlocks[r].totalCount - dcCount;
			maxDcCount = Math.max(maxDcCount, dcCount);
			maxEcCount = Math.max(maxEcCount, ecCount);
			dcdata[r] = new Array(dcCount);
			for (let i = 0; i < dcdata[r].length; i += 1) dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
			offset += dcCount;
			const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
			const modPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1).mod(rsPoly);
			ecdata[r] = new Array(rsPoly.getLength() - 1);
			for (let i = 0; i < ecdata[r].length; i += 1) {
				const modIndex = i + modPoly.getLength() - ecdata[r].length;
				ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
			}
		}
		let totalCodeCount = 0;
		for (let i = 0; i < rsBlocks.length; i += 1) totalCodeCount += rsBlocks[i].totalCount;
		const data = new Array(totalCodeCount);
		let index = 0;
		for (let i = 0; i < maxDcCount; i += 1) for (let r = 0; r < rsBlocks.length; r += 1) if (i < dcdata[r].length) {
			data[index] = dcdata[r][i];
			index += 1;
		}
		for (let i = 0; i < maxEcCount; i += 1) for (let r = 0; r < rsBlocks.length; r += 1) if (i < ecdata[r].length) {
			data[index] = ecdata[r][i];
			index += 1;
		}
		return data;
	};
	const createData = function(typeNumber, errorCorrectionLevel, dataList) {
		const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
		const buffer = qrBitBuffer();
		for (let i = 0; i < dataList.length; i += 1) {
			const data = dataList[i];
			buffer.put(data.getMode(), 4);
			buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
			data.write(buffer);
		}
		let totalDataCount = 0;
		for (let i = 0; i < rsBlocks.length; i += 1) totalDataCount += rsBlocks[i].dataCount;
		if (buffer.getLengthInBits() > totalDataCount * 8) throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
		if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
		while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
		while (true) {
			if (buffer.getLengthInBits() >= totalDataCount * 8) break;
			buffer.put(PAD0, 8);
			if (buffer.getLengthInBits() >= totalDataCount * 8) break;
			buffer.put(PAD1, 8);
		}
		return createBytes(buffer, rsBlocks);
	};
	_this.addData = function(data, mode) {
		mode = mode || "Byte";
		let newData = null;
		switch (mode) {
			case "Numeric":
				newData = qrNumber(data);
				break;
			case "Alphanumeric":
				newData = qrAlphaNum(data);
				break;
			case "Byte":
				newData = qr8BitByte(data);
				break;
			case "Kanji":
				newData = qrKanji(data);
				break;
			default: throw "mode:" + mode;
		}
		_dataList.push(newData);
		_dataCache = null;
	};
	_this.isDark = function(row, col) {
		if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) throw row + "," + col;
		return _modules[row][col];
	};
	_this.getModuleCount = function() {
		return _moduleCount;
	};
	_this.make = function() {
		if (_typeNumber < 1) {
			let typeNumber = 1;
			for (; typeNumber < 40; typeNumber++) {
				const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
				const buffer = qrBitBuffer();
				for (let i = 0; i < _dataList.length; i++) {
					const data = _dataList[i];
					buffer.put(data.getMode(), 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
					data.write(buffer);
				}
				let totalDataCount = 0;
				for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
				if (buffer.getLengthInBits() <= totalDataCount * 8) break;
			}
			_typeNumber = typeNumber;
		}
		makeImpl(false, getBestMaskPattern());
	};
	_this.createTableTag = function(cellSize, margin) {
		cellSize = cellSize || 2;
		margin = typeof margin == "undefined" ? cellSize * 4 : margin;
		let qrHtml = "";
		qrHtml += "<table style=\"";
		qrHtml += " border-width: 0px; border-style: none;";
		qrHtml += " border-collapse: collapse;";
		qrHtml += " padding: 0px; margin: " + margin + "px;";
		qrHtml += "\">";
		qrHtml += "<tbody>";
		for (let r = 0; r < _this.getModuleCount(); r += 1) {
			qrHtml += "<tr>";
			for (let c = 0; c < _this.getModuleCount(); c += 1) {
				qrHtml += "<td style=\"";
				qrHtml += " border-width: 0px; border-style: none;";
				qrHtml += " border-collapse: collapse;";
				qrHtml += " padding: 0px; margin: 0px;";
				qrHtml += " width: " + cellSize + "px;";
				qrHtml += " height: " + cellSize + "px;";
				qrHtml += " background-color: ";
				qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
				qrHtml += ";";
				qrHtml += "\"/>";
			}
			qrHtml += "</tr>";
		}
		qrHtml += "</tbody>";
		qrHtml += "</table>";
		return qrHtml;
	};
	_this.createSvgTag = function(cellSize, margin, alt, title) {
		let opts = {};
		if (typeof arguments[0] == "object") {
			opts = arguments[0];
			cellSize = opts.cellSize;
			margin = opts.margin;
			alt = opts.alt;
			title = opts.title;
		}
		cellSize = cellSize || 2;
		margin = typeof margin == "undefined" ? cellSize * 4 : margin;
		alt = typeof alt === "string" ? { text: alt } : alt || {};
		alt.text = alt.text || null;
		alt.id = alt.text ? alt.id || "qrcode-description" : null;
		title = typeof title === "string" ? { text: title } : title || {};
		title.text = title.text || null;
		title.id = title.text ? title.id || "qrcode-title" : null;
		const size = _this.getModuleCount() * cellSize + margin * 2;
		let c, mc, r, mr, qrSvg = "", rect;
		rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
		qrSvg += "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\"";
		qrSvg += !opts.scalable ? " width=\"" + size + "px\" height=\"" + size + "px\"" : "";
		qrSvg += " viewBox=\"0 0 " + size + " " + size + "\" ";
		qrSvg += " preserveAspectRatio=\"xMinYMin meet\"";
		qrSvg += title.text || alt.text ? " role=\"img\" aria-labelledby=\"" + escapeXml([title.id, alt.id].join(" ").trim()) + "\"" : "";
		qrSvg += ">";
		qrSvg += title.text ? "<title id=\"" + escapeXml(title.id) + "\">" + escapeXml(title.text) + "</title>" : "";
		qrSvg += alt.text ? "<description id=\"" + escapeXml(alt.id) + "\">" + escapeXml(alt.text) + "</description>" : "";
		qrSvg += "<rect width=\"100%\" height=\"100%\" fill=\"white\" cx=\"0\" cy=\"0\"/>";
		qrSvg += "<path d=\"";
		for (r = 0; r < _this.getModuleCount(); r += 1) {
			mr = r * cellSize + margin;
			for (c = 0; c < _this.getModuleCount(); c += 1) if (_this.isDark(r, c)) {
				mc = c * cellSize + margin;
				qrSvg += "M" + mc + "," + mr + rect;
			}
		}
		qrSvg += "\" stroke=\"transparent\" fill=\"black\"/>";
		qrSvg += "</svg>";
		return qrSvg;
	};
	_this.createDataURL = function(cellSize, margin) {
		cellSize = cellSize || 2;
		margin = typeof margin == "undefined" ? cellSize * 4 : margin;
		const size = _this.getModuleCount() * cellSize + margin * 2;
		const min = margin;
		const max = size - margin;
		return createDataURL(size, size, function(x, y) {
			if (min <= x && x < max && min <= y && y < max) {
				const c = Math.floor((x - min) / cellSize);
				const r = Math.floor((y - min) / cellSize);
				return _this.isDark(r, c) ? 0 : 1;
			} else return 1;
		});
	};
	_this.createImgTag = function(cellSize, margin, alt) {
		cellSize = cellSize || 2;
		margin = typeof margin == "undefined" ? cellSize * 4 : margin;
		const size = _this.getModuleCount() * cellSize + margin * 2;
		let img = "";
		img += "<img";
		img += " src=\"";
		img += _this.createDataURL(cellSize, margin);
		img += "\"";
		img += " width=\"";
		img += size;
		img += "\"";
		img += " height=\"";
		img += size;
		img += "\"";
		if (alt) {
			img += " alt=\"";
			img += escapeXml(alt);
			img += "\"";
		}
		img += "/>";
		return img;
	};
	const escapeXml = function(s) {
		let escaped = "";
		for (let i = 0; i < s.length; i += 1) {
			const c = s.charAt(i);
			switch (c) {
				case "<":
					escaped += "&lt;";
					break;
				case ">":
					escaped += "&gt;";
					break;
				case "&":
					escaped += "&amp;";
					break;
				case "\"":
					escaped += "&quot;";
					break;
				default: escaped += c;
			}
		}
		return escaped;
	};
	const _createHalfASCII = function(margin) {
		const cellSize = 1;
		margin = typeof margin == "undefined" ? 2 : margin;
		const size = _this.getModuleCount() * cellSize + margin * 2;
		const min = margin;
		const max = size - margin;
		let y, x, r1, r2, p;
		const blocks = {
			"██": "█",
			"█ ": "▀",
			" █": "▄",
			"  ": " "
		};
		const blocksLastLineNoMargin = {
			"██": "▀",
			"█ ": "▀",
			" █": " ",
			"  ": " "
		};
		let ascii = "";
		for (y = 0; y < size; y += 2) {
			r1 = Math.floor((y - min) / cellSize);
			r2 = Math.floor((y + 1 - min) / cellSize);
			for (x = 0; x < size; x += 1) {
				p = "█";
				if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) p = " ";
				if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) p += " ";
				else p += "█";
				ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
			}
			ascii += "\n";
		}
		if (size % 2 && margin > 0) return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("▀");
		return ascii.substring(0, ascii.length - 1);
	};
	_this.createASCII = function(cellSize, margin) {
		cellSize = cellSize || 1;
		if (cellSize < 2) return _createHalfASCII(margin);
		cellSize -= 1;
		margin = typeof margin == "undefined" ? cellSize * 2 : margin;
		const size = _this.getModuleCount() * cellSize + margin * 2;
		const min = margin;
		const max = size - margin;
		let y, x, r, p;
		const white = Array(cellSize + 1).join("██");
		const black = Array(cellSize + 1).join("  ");
		let ascii = "";
		let line = "";
		for (y = 0; y < size; y += 1) {
			r = Math.floor((y - min) / cellSize);
			line = "";
			for (x = 0; x < size; x += 1) {
				p = 1;
				if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) p = 0;
				line += p ? white : black;
			}
			for (r = 0; r < cellSize; r += 1) ascii += line + "\n";
		}
		return ascii.substring(0, ascii.length - 1);
	};
	_this.renderTo2dContext = function(context, cellSize) {
		cellSize = cellSize || 2;
		const length = _this.getModuleCount();
		for (let row = 0; row < length; row++) for (let col = 0; col < length; col++) {
			context.fillStyle = _this.isDark(row, col) ? "black" : "white";
			context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
		}
	};
	return _this;
};
qrcode.stringToBytes = function(s) {
	const bytes = [];
	for (let i = 0; i < s.length; i += 1) {
		const c = s.charCodeAt(i);
		bytes.push(c & 255);
	}
	return bytes;
};
/**
* @param unicodeData base64 string of byte array.
* [16bit Unicode],[16bit Bytes], ...
* @param numChars
*/
qrcode.createStringToBytes = function(unicodeData, numChars) {
	const unicodeMap = function() {
		const bin = base64DecodeInputStream(unicodeData);
		const read = function() {
			const b = bin.read();
			if (b == -1) throw "eof";
			return b;
		};
		let count = 0;
		const unicodeMap = {};
		while (true) {
			const b0 = bin.read();
			if (b0 == -1) break;
			const b1 = read();
			const b2 = read();
			const b3 = read();
			const k = String.fromCharCode(b0 << 8 | b1);
			unicodeMap[k] = b2 << 8 | b3;
			count += 1;
		}
		if (count != numChars) throw count + " != " + numChars;
		return unicodeMap;
	}();
	const unknownChar = "?".charCodeAt(0);
	return function(s) {
		const bytes = [];
		for (let i = 0; i < s.length; i += 1) {
			const c = s.charCodeAt(i);
			if (c < 128) bytes.push(c);
			else {
				const b = unicodeMap[s.charAt(i)];
				if (typeof b == "number") {
					if ((b & 255) == b) bytes.push(b);
					else {
						bytes.push(b >>> 8);
						bytes.push(b & 255);
					}
				} else bytes.push(unknownChar);
			}
		}
		return bytes;
	};
};
const QRMode = {
	MODE_NUMBER: 1,
	MODE_ALPHA_NUM: 2,
	MODE_8BIT_BYTE: 4,
	MODE_KANJI: 8
};
const QRErrorCorrectionLevel = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2
};
const QRMaskPattern = {
	PATTERN000: 0,
	PATTERN001: 1,
	PATTERN010: 2,
	PATTERN011: 3,
	PATTERN100: 4,
	PATTERN101: 5,
	PATTERN110: 6,
	PATTERN111: 7
};
const QRUtil = function() {
	const PATTERN_POSITION_TABLE = [
		[],
		[6, 18],
		[6, 22],
		[6, 26],
		[6, 30],
		[6, 34],
		[
			6,
			22,
			38
		],
		[
			6,
			24,
			42
		],
		[
			6,
			26,
			46
		],
		[
			6,
			28,
			50
		],
		[
			6,
			30,
			54
		],
		[
			6,
			32,
			58
		],
		[
			6,
			34,
			62
		],
		[
			6,
			26,
			46,
			66
		],
		[
			6,
			26,
			48,
			70
		],
		[
			6,
			26,
			50,
			74
		],
		[
			6,
			30,
			54,
			78
		],
		[
			6,
			30,
			56,
			82
		],
		[
			6,
			30,
			58,
			86
		],
		[
			6,
			34,
			62,
			90
		],
		[
			6,
			28,
			50,
			72,
			94
		],
		[
			6,
			26,
			50,
			74,
			98
		],
		[
			6,
			30,
			54,
			78,
			102
		],
		[
			6,
			28,
			54,
			80,
			106
		],
		[
			6,
			32,
			58,
			84,
			110
		],
		[
			6,
			30,
			58,
			86,
			114
		],
		[
			6,
			34,
			62,
			90,
			118
		],
		[
			6,
			26,
			50,
			74,
			98,
			122
		],
		[
			6,
			30,
			54,
			78,
			102,
			126
		],
		[
			6,
			26,
			52,
			78,
			104,
			130
		],
		[
			6,
			30,
			56,
			82,
			108,
			134
		],
		[
			6,
			34,
			60,
			86,
			112,
			138
		],
		[
			6,
			30,
			58,
			86,
			114,
			142
		],
		[
			6,
			34,
			62,
			90,
			118,
			146
		],
		[
			6,
			30,
			54,
			78,
			102,
			126,
			150
		],
		[
			6,
			24,
			50,
			76,
			102,
			128,
			154
		],
		[
			6,
			28,
			54,
			80,
			106,
			132,
			158
		],
		[
			6,
			32,
			58,
			84,
			110,
			136,
			162
		],
		[
			6,
			26,
			54,
			82,
			110,
			138,
			166
		],
		[
			6,
			30,
			58,
			86,
			114,
			142,
			170
		]
	];
	const G15 = 1335;
	const G18 = 7973;
	const G15_MASK = 21522;
	const _this = {};
	const getBCHDigit = function(data) {
		let digit = 0;
		while (data != 0) {
			digit += 1;
			data >>>= 1;
		}
		return digit;
	};
	_this.getBCHTypeInfo = function(data) {
		let d = data << 10;
		while (getBCHDigit(d) - getBCHDigit(G15) >= 0) d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
		return (data << 10 | d) ^ G15_MASK;
	};
	_this.getBCHTypeNumber = function(data) {
		let d = data << 12;
		while (getBCHDigit(d) - getBCHDigit(G18) >= 0) d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
		return data << 12 | d;
	};
	_this.getPatternPosition = function(typeNumber) {
		return PATTERN_POSITION_TABLE[typeNumber - 1];
	};
	_this.getMaskFunction = function(maskPattern) {
		switch (maskPattern) {
			case QRMaskPattern.PATTERN000: return function(i, j) {
				return (i + j) % 2 == 0;
			};
			case QRMaskPattern.PATTERN001: return function(i, j) {
				return i % 2 == 0;
			};
			case QRMaskPattern.PATTERN010: return function(i, j) {
				return j % 3 == 0;
			};
			case QRMaskPattern.PATTERN011: return function(i, j) {
				return (i + j) % 3 == 0;
			};
			case QRMaskPattern.PATTERN100: return function(i, j) {
				return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
			};
			case QRMaskPattern.PATTERN101: return function(i, j) {
				return i * j % 2 + i * j % 3 == 0;
			};
			case QRMaskPattern.PATTERN110: return function(i, j) {
				return (i * j % 2 + i * j % 3) % 2 == 0;
			};
			case QRMaskPattern.PATTERN111: return function(i, j) {
				return (i * j % 3 + (i + j) % 2) % 2 == 0;
			};
			default: throw "bad maskPattern:" + maskPattern;
		}
	};
	_this.getErrorCorrectPolynomial = function(errorCorrectLength) {
		let a = qrPolynomial([1], 0);
		for (let i = 0; i < errorCorrectLength; i += 1) a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
		return a;
	};
	_this.getLengthInBits = function(mode, type) {
		if (1 <= type && type < 10) switch (mode) {
			case QRMode.MODE_NUMBER: return 10;
			case QRMode.MODE_ALPHA_NUM: return 9;
			case QRMode.MODE_8BIT_BYTE: return 8;
			case QRMode.MODE_KANJI: return 8;
			default: throw "mode:" + mode;
		}
		else if (type < 27) switch (mode) {
			case QRMode.MODE_NUMBER: return 12;
			case QRMode.MODE_ALPHA_NUM: return 11;
			case QRMode.MODE_8BIT_BYTE: return 16;
			case QRMode.MODE_KANJI: return 10;
			default: throw "mode:" + mode;
		}
		else if (type < 41) switch (mode) {
			case QRMode.MODE_NUMBER: return 14;
			case QRMode.MODE_ALPHA_NUM: return 13;
			case QRMode.MODE_8BIT_BYTE: return 16;
			case QRMode.MODE_KANJI: return 12;
			default: throw "mode:" + mode;
		}
		else throw "type:" + type;
	};
	_this.getLostPoint = function(qrcode) {
		const moduleCount = qrcode.getModuleCount();
		let lostPoint = 0;
		for (let row = 0; row < moduleCount; row += 1) for (let col = 0; col < moduleCount; col += 1) {
			let sameCount = 0;
			const dark = qrcode.isDark(row, col);
			for (let r = -1; r <= 1; r += 1) {
				if (row + r < 0 || moduleCount <= row + r) continue;
				for (let c = -1; c <= 1; c += 1) {
					if (col + c < 0 || moduleCount <= col + c) continue;
					if (r == 0 && c == 0) continue;
					if (dark == qrcode.isDark(row + r, col + c)) sameCount += 1;
				}
			}
			if (sameCount > 5) lostPoint += 3 + sameCount - 5;
		}
		for (let row = 0; row < moduleCount - 1; row += 1) for (let col = 0; col < moduleCount - 1; col += 1) {
			let count = 0;
			if (qrcode.isDark(row, col)) count += 1;
			if (qrcode.isDark(row + 1, col)) count += 1;
			if (qrcode.isDark(row, col + 1)) count += 1;
			if (qrcode.isDark(row + 1, col + 1)) count += 1;
			if (count == 0 || count == 4) lostPoint += 3;
		}
		for (let row = 0; row < moduleCount; row += 1) for (let col = 0; col < moduleCount - 6; col += 1) if (qrcode.isDark(row, col) && !qrcode.isDark(row, col + 1) && qrcode.isDark(row, col + 2) && qrcode.isDark(row, col + 3) && qrcode.isDark(row, col + 4) && !qrcode.isDark(row, col + 5) && qrcode.isDark(row, col + 6)) lostPoint += 40;
		for (let col = 0; col < moduleCount; col += 1) for (let row = 0; row < moduleCount - 6; row += 1) if (qrcode.isDark(row, col) && !qrcode.isDark(row + 1, col) && qrcode.isDark(row + 2, col) && qrcode.isDark(row + 3, col) && qrcode.isDark(row + 4, col) && !qrcode.isDark(row + 5, col) && qrcode.isDark(row + 6, col)) lostPoint += 40;
		let darkCount = 0;
		for (let col = 0; col < moduleCount; col += 1) for (let row = 0; row < moduleCount; row += 1) if (qrcode.isDark(row, col)) darkCount += 1;
		const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
		lostPoint += ratio * 10;
		return lostPoint;
	};
	return _this;
}();
const QRMath = function() {
	const EXP_TABLE = new Array(256);
	const LOG_TABLE = new Array(256);
	for (let i = 0; i < 8; i += 1) EXP_TABLE[i] = 1 << i;
	for (let i = 8; i < 256; i += 1) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
	for (let i = 0; i < 255; i += 1) LOG_TABLE[EXP_TABLE[i]] = i;
	const _this = {};
	_this.glog = function(n) {
		if (n < 1) throw "glog(" + n + ")";
		return LOG_TABLE[n];
	};
	_this.gexp = function(n) {
		while (n < 0) n += 255;
		while (n >= 256) n -= 255;
		return EXP_TABLE[n];
	};
	return _this;
}();
const qrPolynomial = function(num, shift) {
	if (typeof num.length == "undefined") throw num.length + "/" + shift;
	const _num = function() {
		let offset = 0;
		while (offset < num.length && num[offset] == 0) offset += 1;
		const _num = new Array(num.length - offset + shift);
		for (let i = 0; i < num.length - offset; i += 1) _num[i] = num[i + offset];
		return _num;
	}();
	const _this = {};
	_this.getAt = function(index) {
		return _num[index];
	};
	_this.getLength = function() {
		return _num.length;
	};
	_this.multiply = function(e) {
		const num = new Array(_this.getLength() + e.getLength() - 1);
		for (let i = 0; i < _this.getLength(); i += 1) for (let j = 0; j < e.getLength(); j += 1) num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
		return qrPolynomial(num, 0);
	};
	_this.mod = function(e) {
		if (_this.getLength() - e.getLength() < 0) return _this;
		const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
		const num = new Array(_this.getLength());
		for (let i = 0; i < _this.getLength(); i += 1) num[i] = _this.getAt(i);
		for (let i = 0; i < e.getLength(); i += 1) num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
		return qrPolynomial(num, 0).mod(e);
	};
	return _this;
};
const QRRSBlock = function() {
	const RS_BLOCK_TABLE = [
		[
			1,
			26,
			19
		],
		[
			1,
			26,
			16
		],
		[
			1,
			26,
			13
		],
		[
			1,
			26,
			9
		],
		[
			1,
			44,
			34
		],
		[
			1,
			44,
			28
		],
		[
			1,
			44,
			22
		],
		[
			1,
			44,
			16
		],
		[
			1,
			70,
			55
		],
		[
			1,
			70,
			44
		],
		[
			2,
			35,
			17
		],
		[
			2,
			35,
			13
		],
		[
			1,
			100,
			80
		],
		[
			2,
			50,
			32
		],
		[
			2,
			50,
			24
		],
		[
			4,
			25,
			9
		],
		[
			1,
			134,
			108
		],
		[
			2,
			67,
			43
		],
		[
			2,
			33,
			15,
			2,
			34,
			16
		],
		[
			2,
			33,
			11,
			2,
			34,
			12
		],
		[
			2,
			86,
			68
		],
		[
			4,
			43,
			27
		],
		[
			4,
			43,
			19
		],
		[
			4,
			43,
			15
		],
		[
			2,
			98,
			78
		],
		[
			4,
			49,
			31
		],
		[
			2,
			32,
			14,
			4,
			33,
			15
		],
		[
			4,
			39,
			13,
			1,
			40,
			14
		],
		[
			2,
			121,
			97
		],
		[
			2,
			60,
			38,
			2,
			61,
			39
		],
		[
			4,
			40,
			18,
			2,
			41,
			19
		],
		[
			4,
			40,
			14,
			2,
			41,
			15
		],
		[
			2,
			146,
			116
		],
		[
			3,
			58,
			36,
			2,
			59,
			37
		],
		[
			4,
			36,
			16,
			4,
			37,
			17
		],
		[
			4,
			36,
			12,
			4,
			37,
			13
		],
		[
			2,
			86,
			68,
			2,
			87,
			69
		],
		[
			4,
			69,
			43,
			1,
			70,
			44
		],
		[
			6,
			43,
			19,
			2,
			44,
			20
		],
		[
			6,
			43,
			15,
			2,
			44,
			16
		],
		[
			4,
			101,
			81
		],
		[
			1,
			80,
			50,
			4,
			81,
			51
		],
		[
			4,
			50,
			22,
			4,
			51,
			23
		],
		[
			3,
			36,
			12,
			8,
			37,
			13
		],
		[
			2,
			116,
			92,
			2,
			117,
			93
		],
		[
			6,
			58,
			36,
			2,
			59,
			37
		],
		[
			4,
			46,
			20,
			6,
			47,
			21
		],
		[
			7,
			42,
			14,
			4,
			43,
			15
		],
		[
			4,
			133,
			107
		],
		[
			8,
			59,
			37,
			1,
			60,
			38
		],
		[
			8,
			44,
			20,
			4,
			45,
			21
		],
		[
			12,
			33,
			11,
			4,
			34,
			12
		],
		[
			3,
			145,
			115,
			1,
			146,
			116
		],
		[
			4,
			64,
			40,
			5,
			65,
			41
		],
		[
			11,
			36,
			16,
			5,
			37,
			17
		],
		[
			11,
			36,
			12,
			5,
			37,
			13
		],
		[
			5,
			109,
			87,
			1,
			110,
			88
		],
		[
			5,
			65,
			41,
			5,
			66,
			42
		],
		[
			5,
			54,
			24,
			7,
			55,
			25
		],
		[
			11,
			36,
			12,
			7,
			37,
			13
		],
		[
			5,
			122,
			98,
			1,
			123,
			99
		],
		[
			7,
			73,
			45,
			3,
			74,
			46
		],
		[
			15,
			43,
			19,
			2,
			44,
			20
		],
		[
			3,
			45,
			15,
			13,
			46,
			16
		],
		[
			1,
			135,
			107,
			5,
			136,
			108
		],
		[
			10,
			74,
			46,
			1,
			75,
			47
		],
		[
			1,
			50,
			22,
			15,
			51,
			23
		],
		[
			2,
			42,
			14,
			17,
			43,
			15
		],
		[
			5,
			150,
			120,
			1,
			151,
			121
		],
		[
			9,
			69,
			43,
			4,
			70,
			44
		],
		[
			17,
			50,
			22,
			1,
			51,
			23
		],
		[
			2,
			42,
			14,
			19,
			43,
			15
		],
		[
			3,
			141,
			113,
			4,
			142,
			114
		],
		[
			3,
			70,
			44,
			11,
			71,
			45
		],
		[
			17,
			47,
			21,
			4,
			48,
			22
		],
		[
			9,
			39,
			13,
			16,
			40,
			14
		],
		[
			3,
			135,
			107,
			5,
			136,
			108
		],
		[
			3,
			67,
			41,
			13,
			68,
			42
		],
		[
			15,
			54,
			24,
			5,
			55,
			25
		],
		[
			15,
			43,
			15,
			10,
			44,
			16
		],
		[
			4,
			144,
			116,
			4,
			145,
			117
		],
		[
			17,
			68,
			42
		],
		[
			17,
			50,
			22,
			6,
			51,
			23
		],
		[
			19,
			46,
			16,
			6,
			47,
			17
		],
		[
			2,
			139,
			111,
			7,
			140,
			112
		],
		[
			17,
			74,
			46
		],
		[
			7,
			54,
			24,
			16,
			55,
			25
		],
		[
			34,
			37,
			13
		],
		[
			4,
			151,
			121,
			5,
			152,
			122
		],
		[
			4,
			75,
			47,
			14,
			76,
			48
		],
		[
			11,
			54,
			24,
			14,
			55,
			25
		],
		[
			16,
			45,
			15,
			14,
			46,
			16
		],
		[
			6,
			147,
			117,
			4,
			148,
			118
		],
		[
			6,
			73,
			45,
			14,
			74,
			46
		],
		[
			11,
			54,
			24,
			16,
			55,
			25
		],
		[
			30,
			46,
			16,
			2,
			47,
			17
		],
		[
			8,
			132,
			106,
			4,
			133,
			107
		],
		[
			8,
			75,
			47,
			13,
			76,
			48
		],
		[
			7,
			54,
			24,
			22,
			55,
			25
		],
		[
			22,
			45,
			15,
			13,
			46,
			16
		],
		[
			10,
			142,
			114,
			2,
			143,
			115
		],
		[
			19,
			74,
			46,
			4,
			75,
			47
		],
		[
			28,
			50,
			22,
			6,
			51,
			23
		],
		[
			33,
			46,
			16,
			4,
			47,
			17
		],
		[
			8,
			152,
			122,
			4,
			153,
			123
		],
		[
			22,
			73,
			45,
			3,
			74,
			46
		],
		[
			8,
			53,
			23,
			26,
			54,
			24
		],
		[
			12,
			45,
			15,
			28,
			46,
			16
		],
		[
			3,
			147,
			117,
			10,
			148,
			118
		],
		[
			3,
			73,
			45,
			23,
			74,
			46
		],
		[
			4,
			54,
			24,
			31,
			55,
			25
		],
		[
			11,
			45,
			15,
			31,
			46,
			16
		],
		[
			7,
			146,
			116,
			7,
			147,
			117
		],
		[
			21,
			73,
			45,
			7,
			74,
			46
		],
		[
			1,
			53,
			23,
			37,
			54,
			24
		],
		[
			19,
			45,
			15,
			26,
			46,
			16
		],
		[
			5,
			145,
			115,
			10,
			146,
			116
		],
		[
			19,
			75,
			47,
			10,
			76,
			48
		],
		[
			15,
			54,
			24,
			25,
			55,
			25
		],
		[
			23,
			45,
			15,
			25,
			46,
			16
		],
		[
			13,
			145,
			115,
			3,
			146,
			116
		],
		[
			2,
			74,
			46,
			29,
			75,
			47
		],
		[
			42,
			54,
			24,
			1,
			55,
			25
		],
		[
			23,
			45,
			15,
			28,
			46,
			16
		],
		[
			17,
			145,
			115
		],
		[
			10,
			74,
			46,
			23,
			75,
			47
		],
		[
			10,
			54,
			24,
			35,
			55,
			25
		],
		[
			19,
			45,
			15,
			35,
			46,
			16
		],
		[
			17,
			145,
			115,
			1,
			146,
			116
		],
		[
			14,
			74,
			46,
			21,
			75,
			47
		],
		[
			29,
			54,
			24,
			19,
			55,
			25
		],
		[
			11,
			45,
			15,
			46,
			46,
			16
		],
		[
			13,
			145,
			115,
			6,
			146,
			116
		],
		[
			14,
			74,
			46,
			23,
			75,
			47
		],
		[
			44,
			54,
			24,
			7,
			55,
			25
		],
		[
			59,
			46,
			16,
			1,
			47,
			17
		],
		[
			12,
			151,
			121,
			7,
			152,
			122
		],
		[
			12,
			75,
			47,
			26,
			76,
			48
		],
		[
			39,
			54,
			24,
			14,
			55,
			25
		],
		[
			22,
			45,
			15,
			41,
			46,
			16
		],
		[
			6,
			151,
			121,
			14,
			152,
			122
		],
		[
			6,
			75,
			47,
			34,
			76,
			48
		],
		[
			46,
			54,
			24,
			10,
			55,
			25
		],
		[
			2,
			45,
			15,
			64,
			46,
			16
		],
		[
			17,
			152,
			122,
			4,
			153,
			123
		],
		[
			29,
			74,
			46,
			14,
			75,
			47
		],
		[
			49,
			54,
			24,
			10,
			55,
			25
		],
		[
			24,
			45,
			15,
			46,
			46,
			16
		],
		[
			4,
			152,
			122,
			18,
			153,
			123
		],
		[
			13,
			74,
			46,
			32,
			75,
			47
		],
		[
			48,
			54,
			24,
			14,
			55,
			25
		],
		[
			42,
			45,
			15,
			32,
			46,
			16
		],
		[
			20,
			147,
			117,
			4,
			148,
			118
		],
		[
			40,
			75,
			47,
			7,
			76,
			48
		],
		[
			43,
			54,
			24,
			22,
			55,
			25
		],
		[
			10,
			45,
			15,
			67,
			46,
			16
		],
		[
			19,
			148,
			118,
			6,
			149,
			119
		],
		[
			18,
			75,
			47,
			31,
			76,
			48
		],
		[
			34,
			54,
			24,
			34,
			55,
			25
		],
		[
			20,
			45,
			15,
			61,
			46,
			16
		]
	];
	const qrRSBlock = function(totalCount, dataCount) {
		const _this = {};
		_this.totalCount = totalCount;
		_this.dataCount = dataCount;
		return _this;
	};
	const _this = {};
	const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
		switch (errorCorrectionLevel) {
			case QRErrorCorrectionLevel.L: return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
			case QRErrorCorrectionLevel.M: return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
			case QRErrorCorrectionLevel.Q: return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
			case QRErrorCorrectionLevel.H: return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
			default: return;
		}
	};
	_this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
		const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
		if (typeof rsBlock == "undefined") throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
		const length = rsBlock.length / 3;
		const list = [];
		for (let i = 0; i < length; i += 1) {
			const count = rsBlock[i * 3 + 0];
			const totalCount = rsBlock[i * 3 + 1];
			const dataCount = rsBlock[i * 3 + 2];
			for (let j = 0; j < count; j += 1) list.push(qrRSBlock(totalCount, dataCount));
		}
		return list;
	};
	return _this;
}();
const qrBitBuffer = function() {
	const _buffer = [];
	let _length = 0;
	const _this = {};
	_this.getBuffer = function() {
		return _buffer;
	};
	_this.getAt = function(index) {
		const bufIndex = Math.floor(index / 8);
		return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
	};
	_this.put = function(num, length) {
		for (let i = 0; i < length; i += 1) _this.putBit((num >>> length - i - 1 & 1) == 1);
	};
	_this.getLengthInBits = function() {
		return _length;
	};
	_this.putBit = function(bit) {
		const bufIndex = Math.floor(_length / 8);
		if (_buffer.length <= bufIndex) _buffer.push(0);
		if (bit) _buffer[bufIndex] |= 128 >>> _length % 8;
		_length += 1;
	};
	return _this;
};
const qrNumber = function(data) {
	const _mode = QRMode.MODE_NUMBER;
	const _data = data;
	const _this = {};
	_this.getMode = function() {
		return _mode;
	};
	_this.getLength = function(buffer) {
		return _data.length;
	};
	_this.write = function(buffer) {
		const data = _data;
		let i = 0;
		while (i + 2 < data.length) {
			buffer.put(strToNum(data.substring(i, i + 3)), 10);
			i += 3;
		}
		if (i < data.length) {
			if (data.length - i == 1) buffer.put(strToNum(data.substring(i, i + 1)), 4);
			else if (data.length - i == 2) buffer.put(strToNum(data.substring(i, i + 2)), 7);
		}
	};
	const strToNum = function(s) {
		let num = 0;
		for (let i = 0; i < s.length; i += 1) num = num * 10 + chatToNum(s.charAt(i));
		return num;
	};
	const chatToNum = function(c) {
		if ("0" <= c && c <= "9") return c.charCodeAt(0) - "0".charCodeAt(0);
		throw "illegal char :" + c;
	};
	return _this;
};
const qrAlphaNum = function(data) {
	const _mode = QRMode.MODE_ALPHA_NUM;
	const _data = data;
	const _this = {};
	_this.getMode = function() {
		return _mode;
	};
	_this.getLength = function(buffer) {
		return _data.length;
	};
	_this.write = function(buffer) {
		const s = _data;
		let i = 0;
		while (i + 1 < s.length) {
			buffer.put(getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)), 11);
			i += 2;
		}
		if (i < s.length) buffer.put(getCode(s.charAt(i)), 6);
	};
	const getCode = function(c) {
		if ("0" <= c && c <= "9") return c.charCodeAt(0) - "0".charCodeAt(0);
		else if ("A" <= c && c <= "Z") return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
		else switch (c) {
			case " ": return 36;
			case "$": return 37;
			case "%": return 38;
			case "*": return 39;
			case "+": return 40;
			case "-": return 41;
			case ".": return 42;
			case "/": return 43;
			case ":": return 44;
			default: throw "illegal char :" + c;
		}
	};
	return _this;
};
const qr8BitByte = function(data) {
	const _mode = QRMode.MODE_8BIT_BYTE;
	const _bytes = qrcode.stringToBytes(data);
	const _this = {};
	_this.getMode = function() {
		return _mode;
	};
	_this.getLength = function(buffer) {
		return _bytes.length;
	};
	_this.write = function(buffer) {
		for (let i = 0; i < _bytes.length; i += 1) buffer.put(_bytes[i], 8);
	};
	return _this;
};
const qrKanji = function(data) {
	const _mode = QRMode.MODE_KANJI;
	const stringToBytes = qrcode.stringToBytes;
	(function(c, code) {
		const test = stringToBytes(c);
		if (test.length != 2 || (test[0] << 8 | test[1]) != code) throw "sjis not supported.";
	})("友", 38726);
	const _bytes = stringToBytes(data);
	const _this = {};
	_this.getMode = function() {
		return _mode;
	};
	_this.getLength = function(buffer) {
		return ~~(_bytes.length / 2);
	};
	_this.write = function(buffer) {
		const data = _bytes;
		let i = 0;
		while (i + 1 < data.length) {
			let c = (255 & data[i]) << 8 | 255 & data[i + 1];
			if (33088 <= c && c <= 40956) c -= 33088;
			else if (57408 <= c && c <= 60351) c -= 49472;
			else throw "illegal char at " + (i + 1) + "/" + c;
			c = (c >>> 8 & 255) * 192 + (c & 255);
			buffer.put(c, 13);
			i += 2;
		}
		if (i < data.length) throw "illegal char at " + (i + 1);
	};
	return _this;
};
const byteArrayOutputStream = function() {
	const _bytes = [];
	const _this = {};
	_this.writeByte = function(b) {
		_bytes.push(b & 255);
	};
	_this.writeShort = function(i) {
		_this.writeByte(i);
		_this.writeByte(i >>> 8);
	};
	_this.writeBytes = function(b, off, len) {
		off = off || 0;
		len = len || b.length;
		for (let i = 0; i < len; i += 1) _this.writeByte(b[i + off]);
	};
	_this.writeString = function(s) {
		for (let i = 0; i < s.length; i += 1) _this.writeByte(s.charCodeAt(i));
	};
	_this.toByteArray = function() {
		return _bytes;
	};
	_this.toString = function() {
		let s = "";
		s += "[";
		for (let i = 0; i < _bytes.length; i += 1) {
			if (i > 0) s += ",";
			s += _bytes[i];
		}
		s += "]";
		return s;
	};
	return _this;
};
const base64EncodeOutputStream = function() {
	let _buffer = 0;
	let _buflen = 0;
	let _length = 0;
	let _base64 = "";
	const _this = {};
	const writeEncoded = function(b) {
		_base64 += String.fromCharCode(encode(b & 63));
	};
	const encode = function(n) {
		if (n < 0) throw "n:" + n;
		else if (n < 26) return 65 + n;
		else if (n < 52) return 97 + (n - 26);
		else if (n < 62) return 48 + (n - 52);
		else if (n == 62) return 43;
		else if (n == 63) return 47;
		else throw "n:" + n;
	};
	_this.writeByte = function(n) {
		_buffer = _buffer << 8 | n & 255;
		_buflen += 8;
		_length += 1;
		while (_buflen >= 6) {
			writeEncoded(_buffer >>> _buflen - 6);
			_buflen -= 6;
		}
	};
	_this.flush = function() {
		if (_buflen > 0) {
			writeEncoded(_buffer << 6 - _buflen);
			_buffer = 0;
			_buflen = 0;
		}
		if (_length % 3 != 0) {
			const padlen = 3 - _length % 3;
			for (let i = 0; i < padlen; i += 1) _base64 += "=";
		}
	};
	_this.toString = function() {
		return _base64;
	};
	return _this;
};
const base64DecodeInputStream = function(str) {
	const _str = str;
	let _pos = 0;
	let _buffer = 0;
	let _buflen = 0;
	const _this = {};
	_this.read = function() {
		while (_buflen < 8) {
			if (_pos >= _str.length) {
				if (_buflen == 0) return -1;
				throw "unexpected end of file./" + _buflen;
			}
			const c = _str.charAt(_pos);
			_pos += 1;
			if (c == "=") {
				_buflen = 0;
				return -1;
			} else if (c.match(/^\s$/)) continue;
			_buffer = _buffer << 6 | decode(c.charCodeAt(0));
			_buflen += 6;
		}
		const n = _buffer >>> _buflen - 8 & 255;
		_buflen -= 8;
		return n;
	};
	const decode = function(c) {
		if (65 <= c && c <= 90) return c - 65;
		else if (97 <= c && c <= 122) return c - 97 + 26;
		else if (48 <= c && c <= 57) return c - 48 + 52;
		else if (c == 43) return 62;
		else if (c == 47) return 63;
		else throw "c:" + c;
	};
	return _this;
};
const gifImage = function(width, height) {
	const _width = width;
	const _height = height;
	const _data = new Array(width * height);
	const _this = {};
	_this.setPixel = function(x, y, pixel) {
		_data[y * _width + x] = pixel;
	};
	_this.write = function(out) {
		out.writeString("GIF87a");
		out.writeShort(_width);
		out.writeShort(_height);
		out.writeByte(128);
		out.writeByte(0);
		out.writeByte(0);
		out.writeByte(0);
		out.writeByte(0);
		out.writeByte(0);
		out.writeByte(255);
		out.writeByte(255);
		out.writeByte(255);
		out.writeString(",");
		out.writeShort(0);
		out.writeShort(0);
		out.writeShort(_width);
		out.writeShort(_height);
		out.writeByte(0);
		const lzwMinCodeSize = 2;
		const raster = getLZWRaster(lzwMinCodeSize);
		out.writeByte(lzwMinCodeSize);
		let offset = 0;
		while (raster.length - offset > 255) {
			out.writeByte(255);
			out.writeBytes(raster, offset, 255);
			offset += 255;
		}
		out.writeByte(raster.length - offset);
		out.writeBytes(raster, offset, raster.length - offset);
		out.writeByte(0);
		out.writeString(";");
	};
	const bitOutputStream = function(out) {
		const _out = out;
		let _bitLength = 0;
		let _bitBuffer = 0;
		const _this = {};
		_this.write = function(data, length) {
			if (data >>> length != 0) throw "length over";
			while (_bitLength + length >= 8) {
				_out.writeByte(255 & (data << _bitLength | _bitBuffer));
				length -= 8 - _bitLength;
				data >>>= 8 - _bitLength;
				_bitBuffer = 0;
				_bitLength = 0;
			}
			_bitBuffer = data << _bitLength | _bitBuffer;
			_bitLength = _bitLength + length;
		};
		_this.flush = function() {
			if (_bitLength > 0) _out.writeByte(_bitBuffer);
		};
		return _this;
	};
	const getLZWRaster = function(lzwMinCodeSize) {
		const clearCode = 1 << lzwMinCodeSize;
		const endCode = (1 << lzwMinCodeSize) + 1;
		let bitLength = lzwMinCodeSize + 1;
		const table = lzwTable();
		for (let i = 0; i < clearCode; i += 1) table.add(String.fromCharCode(i));
		table.add(String.fromCharCode(clearCode));
		table.add(String.fromCharCode(endCode));
		const byteOut = byteArrayOutputStream();
		const bitOut = bitOutputStream(byteOut);
		bitOut.write(clearCode, bitLength);
		let dataIndex = 0;
		let s = String.fromCharCode(_data[dataIndex]);
		dataIndex += 1;
		while (dataIndex < _data.length) {
			const c = String.fromCharCode(_data[dataIndex]);
			dataIndex += 1;
			if (table.contains(s + c)) s = s + c;
			else {
				bitOut.write(table.indexOf(s), bitLength);
				if (table.size() < 4095) {
					if (table.size() == 1 << bitLength) bitLength += 1;
					table.add(s + c);
				}
				s = c;
			}
		}
		bitOut.write(table.indexOf(s), bitLength);
		bitOut.write(endCode, bitLength);
		bitOut.flush();
		return byteOut.toByteArray();
	};
	const lzwTable = function() {
		const _map = {};
		let _size = 0;
		const _this = {};
		_this.add = function(key) {
			if (_this.contains(key)) throw "dup key:" + key;
			_map[key] = _size;
			_size += 1;
		};
		_this.size = function() {
			return _size;
		};
		_this.indexOf = function(key) {
			return _map[key];
		};
		_this.contains = function(key) {
			return typeof _map[key] != "undefined";
		};
		return _this;
	};
	return _this;
};
const createDataURL = function(width, height, getPixel) {
	const gif = gifImage(width, height);
	for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) gif.setPixel(x, y, getPixel(x, y));
	const b = byteArrayOutputStream();
	gif.write(b);
	const base64 = base64EncodeOutputStream();
	const bytes = b.toByteArray();
	for (let i = 0; i < bytes.length; i += 1) base64.writeByte(bytes[i]);
	base64.flush();
	return "data:image/gif;base64," + base64;
};
qrcode.stringToBytes;
//#endregion
//#region tests/baseline/.src/src/qr-matrix.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*
* Port of `bc-mur::qr_matrix`.
*/
/**
* Default maximum QR module count for reliable phone scanning.
* Corresponds to QR version 25 (117×117 modules).
*/
const DEFAULT_MAX_MODULES = 117;
/** Get the QR module count for a message without rendering. */
function qrModuleCount(message, correction) {
	return QrMatrix.encode(message, correction).width();
}
/**
* Check that a module count is within a density limit.
*
* Throws `MurError.qrCodeTooDense` if `moduleCount > maxModules`.
*/
function checkQrDensity(moduleCount, maxModules) {
	if (moduleCount > maxModules) throw MurError.qrCodeTooDense(moduleCount, maxModules);
}
/**
* QR Alphanumeric mode character set (0-9, A-Z uppercase, plus
* space, `$`, `%`, `*`, `+`, `-`, `.`, `/`, `:`).
*
* Mirrors the Rust `qrcode` crate's mode-selection table — see
* `qrcode-0.12.0/src/types.rs::Mode::from_byte`.
*/
const QR_ALPHANUMERIC_SET = /* @__PURE__ */ new Set([
	...Array.from({ length: 10 }, (_, i) => 48 + i),
	...Array.from({ length: 26 }, (_, i) => 65 + i),
	32,
	36,
	37,
	42,
	43,
	45,
	46,
	47,
	58
]);
/**
* Pick the most compact QR mode for a byte payload, mirroring Rust
* `qrcode::Builder` which tries Numeric → Alphanumeric → Byte (→
* Kanji, omitted here) and picks the first that fits.
*
* `qrcode-generator` does NOT auto-select — it defaults to Byte
* regardless of input. Forcing Byte for uppercase UR strings
* inflates Version 1 Low (max 17 bytes) into Version 2 (25×25)
* where Alphanumeric (max 25 chars) would have fit at 21×21. This
* is the M1 fix from `PARITY_OUTSTANDING.md`.
*/
function selectQrMode(message) {
	if (message.length === 0) return "Byte";
	let allNumeric = true;
	let allAlphanumeric = true;
	for (const b of message) {
		if (b < 48 || b > 57) allNumeric = false;
		if (!QR_ALPHANUMERIC_SET.has(b)) allAlphanumeric = false;
		if (!allNumeric && !allAlphanumeric) return "Byte";
	}
	if (allNumeric) return "Numeric";
	if (allAlphanumeric) return "Alphanumeric";
	return "Byte";
}
/** A boolean QR module matrix. */
var QrMatrix = class QrMatrix {
	_modules;
	_width;
	constructor(modules, width) {
		this._modules = modules;
		this._width = width;
	}
	/** Encode a byte message into a QR matrix at the given correction level. */
	static encode(message, correction) {
		let qr;
		try {
			qr = qrcode(0, correctionLevelToLetter(correction));
			const mode = selectQrMode(message);
			let binary = "";
			for (let i = 0; i < message.length; i++) binary += String.fromCharCode(message[i]);
			qr.addData(binary, mode);
			qr.make();
		} catch (e) {
			throw MurError.qrEncode(messageOf(e), e);
		}
		const width = qr.getModuleCount();
		const modules = new Array(width * width);
		for (let row = 0; row < width; row++) for (let col = 0; col < width; col++) modules[row * width + col] = qr.isDark(row, col);
		return new QrMatrix(modules, width);
	}
	/** Module count (width == height for QR codes). */
	width() {
		return this._width;
	}
	/** True if the module at (col, row) is dark. */
	isDark(col, row) {
		return this._modules[row * this._width + col];
	}
};
//#endregion
//#region ../../node_modules/fflate/esm/index.mjs
var require$1 = createRequire("/");
var _a;
try {
	_a = require$1("worker_threads"), _a.Worker, _a.isMarkedAsUntransferable;
} catch (e) {}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]);
var fdeb = new u8([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]);
var clim = new u8([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]);
var freb = function(eb, start) {
	var b = new u16(31);
	for (var i = 0; i < 31; ++i) b[i] = start += 1 << eb[i - 1];
	var r = new i32(b[30]);
	for (var i = 1; i < 30; ++i) for (var j = b[i]; j < b[i + 1]; ++j) r[j] = j - b[i] << 5 | i;
	return {
		b,
		r
	};
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
	var x = (i & 43690) >> 1 | (i & 21845) << 1;
	x = (x & 52428) >> 2 | (x & 13107) << 2;
	x = (x & 61680) >> 4 | (x & 3855) << 4;
	rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = (function(cd, mb, r) {
	var s = cd.length;
	var i = 0;
	var l = new u16(mb);
	for (; i < s; ++i) if (cd[i]) ++l[cd[i] - 1];
	var le = new u16(mb);
	for (i = 1; i < mb; ++i) le[i] = le[i - 1] + l[i - 1] << 1;
	var co;
	if (r) {
		co = new u16(1 << mb);
		var rvb = 15 - mb;
		for (i = 0; i < s; ++i) if (cd[i]) {
			var sv = i << 4 | cd[i];
			var r_1 = mb - cd[i];
			var v = le[cd[i] - 1]++ << r_1;
			for (var m = v | (1 << r_1) - 1; v <= m; ++v) co[rev[v] >> rvb] = sv;
		}
	} else {
		co = new u16(s);
		for (i = 0; i < s; ++i) if (cd[i]) co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
	}
	return co;
});
var flt = new u8(288);
for (var i = 0; i < 144; ++i) flt[i] = 8;
for (var i = 144; i < 256; ++i) flt[i] = 9;
for (var i = 256; i < 280; ++i) flt[i] = 7;
for (var i = 280; i < 288; ++i) flt[i] = 8;
var fdt = new u8(32);
for (var i = 0; i < 32; ++i) fdt[i] = 5;
var flm = /*#__PURE__*/ hMap(flt, 9, 0);
var flrm = /*#__PURE__*/ hMap(flt, 9, 1);
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0);
var fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
var max = function(a) {
	var m = a[0];
	for (var i = 1; i < a.length; ++i) if (a[i] > m) m = a[i];
	return m;
};
var bits = function(d, p, m) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
	return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
	if (s == null || s < 0) s = 0;
	if (e == null || e > v.length) e = v.length;
	return new u8(v.subarray(s, e));
};
var ec = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
];
var err = function(ind, msg, nt) {
	var e = new Error(msg || ec[ind]);
	e.code = ind;
	if (Error.captureStackTrace) Error.captureStackTrace(e, err);
	if (!nt) throw e;
	return e;
};
var inflt = function(dat, st, buf, dict) {
	var sl = dat.length, dl = dict ? dict.length : 0;
	if (!sl || st.f && !st.l) return buf || new u8(0);
	var noBuf = !buf;
	var resize = noBuf || st.i != 2;
	var noSt = st.i;
	if (noBuf) buf = new u8(sl * 3);
	var cbuf = function(l) {
		var bl = buf.length;
		if (l > bl) {
			var nbuf = new u8(Math.max(bl * 2, l));
			nbuf.set(buf);
			buf = nbuf;
		}
	};
	var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
	var tbts = sl * 8;
	do {
		if (!lm) {
			final = bits(dat, pos, 1);
			var type = bits(dat, pos + 1, 3);
			pos += 3;
			if (!type) {
				var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
				if (t > sl) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + l);
				buf.set(dat.subarray(s, t), bt);
				st.b = bt += l, st.p = pos = t * 8, st.f = final;
				continue;
			} else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
			else if (type == 2) {
				var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
				var tl = hLit + bits(dat, pos + 5, 31) + 1;
				pos += 14;
				var ldt = new u8(tl);
				var clt = new u8(19);
				for (var i = 0; i < hcLen; ++i) clt[clim[i]] = bits(dat, pos + i * 3, 7);
				pos += hcLen * 3;
				var clb = max(clt), clbmsk = (1 << clb) - 1;
				var clm = hMap(clt, clb, 1);
				for (var i = 0; i < tl;) {
					var r = clm[bits(dat, pos, clbmsk)];
					pos += r & 15;
					var s = r >> 4;
					if (s < 16) ldt[i++] = s;
					else {
						var c = 0, n = 0;
						if (s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
						else if (s == 17) n = 3 + bits(dat, pos, 7), pos += 3;
						else if (s == 18) n = 11 + bits(dat, pos, 127), pos += 7;
						while (n--) ldt[i++] = c;
					}
				}
				var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
				lbt = max(lt);
				dbt = max(dt);
				lm = hMap(lt, lbt, 1);
				dm = hMap(dt, dbt, 1);
			} else err(1);
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
		}
		if (resize) cbuf(bt + 131072);
		var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
		var lpos = pos;
		for (;; lpos = pos) {
			var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
			pos += c & 15;
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
			if (!c) err(2);
			if (sym < 256) buf[bt++] = sym;
			else if (sym == 256) {
				lpos = pos, lm = null;
				break;
			} else {
				var add = sym - 254;
				if (sym > 264) {
					var i = sym - 257, b = fleb[i];
					add = bits(dat, pos, (1 << b) - 1) + fl[i];
					pos += b;
				}
				var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
				if (!d) err(3);
				pos += d & 15;
				var dt = fd[dsym];
				if (dsym > 3) {
					var b = fdeb[dsym];
					dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
				}
				if (pos > tbts) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + 131072);
				var end = bt + add;
				if (bt < dt) {
					var shift = dl - dt, dend = Math.min(dt, end);
					if (shift + bt < 0) err(3);
					for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
				}
				for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
			}
		}
		st.l = lm, st.p = lpos, st.b = bt, st.f = final;
		if (lm) final = 1, st.m = lbt, st.d = dm, st.n = dbt;
	} while (!final);
	return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
	d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
	var t = [];
	for (var i = 0; i < d.length; ++i) if (d[i]) t.push({
		s: i,
		f: d[i]
	});
	var s = t.length;
	var t2 = t.slice();
	if (!s) return {
		t: et,
		l: 0
	};
	if (s == 1) {
		var v = new u8(t[0].s + 1);
		v[t[0].s] = 1;
		return {
			t: v,
			l: 1
		};
	}
	t.sort(function(a, b) {
		return a.f - b.f;
	});
	t.push({
		s: -1,
		f: 25001
	});
	var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
	t[0] = {
		s: -1,
		f: l.f + r.f,
		l,
		r
	};
	while (i1 != s - 1) {
		l = t[t[i0].f < t[i2].f ? i0++ : i2++];
		r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
		t[i1++] = {
			s: -1,
			f: l.f + r.f,
			l,
			r
		};
	}
	var maxSym = t2[0].s;
	for (var i = 1; i < s; ++i) if (t2[i].s > maxSym) maxSym = t2[i].s;
	var tr = new u16(maxSym + 1);
	var mbt = ln(t[i1 - 1], tr, 0);
	if (mbt > mb) {
		var i = 0, dt = 0;
		var lft = mbt - mb, cst = 1 << lft;
		t2.sort(function(a, b) {
			return tr[b.s] - tr[a.s] || a.f - b.f;
		});
		for (; i < s; ++i) {
			var i2_1 = t2[i].s;
			if (tr[i2_1] > mb) {
				dt += cst - (1 << mbt - tr[i2_1]);
				tr[i2_1] = mb;
			} else break;
		}
		dt >>= lft;
		while (dt > 0) {
			var i2_2 = t2[i].s;
			if (tr[i2_2] < mb) dt -= 1 << mb - tr[i2_2]++ - 1;
			else ++i;
		}
		for (; i >= 0 && dt; --i) {
			var i2_3 = t2[i].s;
			if (tr[i2_3] == mb) {
				--tr[i2_3];
				++dt;
			}
		}
		mbt = mb;
	}
	return {
		t: new u8(tr),
		l: mbt
	};
};
var ln = function(n, l, d) {
	return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
	var s = c.length;
	while (s && !c[--s]);
	var cl = new u16(++s);
	var cli = 0, cln = c[0], cls = 1;
	var w = function(v) {
		cl[cli++] = v;
	};
	for (var i = 1; i <= s; ++i) if (c[i] == cln && i != s) ++cls;
	else {
		if (!cln && cls > 2) {
			for (; cls > 138; cls -= 138) w(32754);
			if (cls > 2) {
				w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
				cls = 0;
			}
		} else if (cls > 3) {
			w(cln), --cls;
			for (; cls > 6; cls -= 6) w(8304);
			if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
		}
		while (cls--) w(cln);
		cls = 1;
		cln = c[i];
	}
	return {
		c: cl.subarray(0, cli),
		n: s
	};
};
var clen = function(cf, cl) {
	var l = 0;
	for (var i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
	return l;
};
var wfblk = function(out, pos, dat) {
	var s = dat.length;
	var o = shft(pos + 2);
	out[o] = s & 255;
	out[o + 1] = s >> 8;
	out[o + 2] = out[o] ^ 255;
	out[o + 3] = out[o + 1] ^ 255;
	for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
	return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
	wbits(out, p++, final);
	++lf[256];
	var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
	var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
	var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
	var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
	var lcfreq = new u16(19);
	for (var i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
	for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
	var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
	var nlcc = 19;
	for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
	var flen = bl + 5 << 3;
	var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
	var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
	if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
	var lm, ll, dm, dl;
	wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
	if (dtlen < ftlen) {
		lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
		var llm = hMap(lct, mlcb, 0);
		wbits(out, p, nlc - 257);
		wbits(out, p + 5, ndc - 1);
		wbits(out, p + 10, nlcc - 4);
		p += 14;
		for (var i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
		p += 3 * nlcc;
		var lcts = [lclt, lcdt];
		for (var it = 0; it < 2; ++it) {
			var clct = lcts[it];
			for (var i = 0; i < clct.length; ++i) {
				var len = clct[i] & 31;
				wbits(out, p, llm[len]), p += lct[len];
				if (len > 15) wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
			}
		}
	} else lm = flm, ll = flt, dm = fdm, dl = fdt;
	for (var i = 0; i < li; ++i) {
		var sym = syms[i];
		if (sym > 255) {
			var len = sym >> 18 & 31;
			wbits16(out, p, lm[len + 257]), p += ll[len + 257];
			if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
			var dst = sym & 31;
			wbits16(out, p, dm[dst]), p += dl[dst];
			if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
		} else wbits16(out, p, lm[sym]), p += ll[sym];
	}
	wbits16(out, p, lm[256]);
	return p + ll[256];
};
var deo = /*#__PURE__*/ new i32([
	65540,
	131080,
	131088,
	131104,
	262176,
	1048704,
	1048832,
	2114560,
	2117632
]);
var et = /*#__PURE__*/ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
	var s = st.z || dat.length;
	var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
	var w = o.subarray(pre, o.length - post);
	var lst = st.l;
	var pos = (st.r || 0) & 7;
	if (lvl) {
		if (pos) w[0] = st.r >> 3;
		var opt = deo[lvl - 1];
		var n = opt >> 13, c = opt & 8191;
		var msk_1 = (1 << plvl) - 1;
		var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
		var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
		var hsh = function(i) {
			return (dat[i] ^ dat[i + 1] << bs1_1 ^ dat[i + 2] << bs2_1) & msk_1;
		};
		var syms = new i32(25e3);
		var lf = new u16(288), df = new u16(32);
		var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
		for (; i + 2 < s; ++i) {
			var hv = hsh(i);
			var imod = i & 32767, pimod = head[hv];
			prev[imod] = pimod;
			head[hv] = imod;
			if (wi <= i) {
				var rem = s - i;
				if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
					pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
					li = lc_1 = eb = 0, bs = i;
					for (var j = 0; j < 286; ++j) lf[j] = 0;
					for (var j = 0; j < 30; ++j) df[j] = 0;
				}
				var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
				if (rem > 2 && hv == hsh(i - dif)) {
					var maxn = Math.min(n, rem) - 1;
					var maxd = Math.min(32767, i);
					var ml = Math.min(258, rem);
					while (dif <= maxd && --ch_1 && imod != pimod) {
						if (dat[i + l] == dat[i + l - dif]) {
							var nl = 0;
							for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl);
							if (nl > l) {
								l = nl, d = dif;
								if (nl > maxn) break;
								var mmd = Math.min(dif, nl - 2);
								var md = 0;
								for (var j = 0; j < mmd; ++j) {
									var ti = i - dif + j & 32767;
									var cd = ti - prev[ti] & 32767;
									if (cd > md) md = cd, pimod = ti;
								}
							}
						}
						imod = pimod, pimod = prev[imod];
						dif += imod - pimod & 32767;
					}
				}
				if (d) {
					syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
					var lin = revfl[l] & 31, din = revfd[d] & 31;
					eb += fleb[lin] + fdeb[din];
					++lf[257 + lin];
					++df[din];
					wi = i + l;
					++lc_1;
				} else {
					syms[li++] = dat[i];
					++lf[dat[i]];
				}
			}
		}
		for (i = Math.max(i, wi); i < s; ++i) {
			syms[li++] = dat[i];
			++lf[dat[i]];
		}
		pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
		if (!lst) {
			st.r = pos & 7 | w[pos / 8 | 0] << 3;
			pos -= 7;
			st.h = head, st.p = prev, st.i = i, st.w = wi;
		}
	} else {
		for (var i = st.w || 0; i < s + lst; i += 65535) {
			var e = i + 65535;
			if (e >= s) {
				w[pos / 8 | 0] = lst;
				e = s;
			}
			pos = wfblk(w, pos + 1, dat.subarray(i, e));
		}
		st.i = s;
	}
	return slc(o, 0, pre + shft(pos) + post);
};
var adler = function() {
	var a = 1, b = 0;
	return {
		p: function(d) {
			var n = a, m = b;
			var l = d.length | 0;
			for (var i = 0; i != l;) {
				var e = Math.min(i + 2655, l);
				for (; i < e; ++i) m += n += d[i];
				n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
			}
			a = n, b = m;
		},
		d: function() {
			a %= 65521, b %= 65521;
			return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
		}
	};
};
var dopt = function(dat, opt, pre, post, st) {
	if (!st) {
		st = { l: 1 };
		if (opt.dictionary) {
			var dict = opt.dictionary.subarray(-32768);
			var newDat = new u8(dict.length + dat.length);
			newDat.set(dict);
			newDat.set(dat, dict.length);
			dat = newDat;
			st.w = dict.length;
		}
	}
	return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var wbytes = function(d, b, v) {
	for (; v; ++b) d[b] = v, v >>>= 8;
};
var zlh = function(c, o) {
	var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
	c[0] = 120, c[1] = fl << 6 | (o.dictionary && 32);
	c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
	if (o.dictionary) {
		var h = adler();
		h.p(o.dictionary);
		wbytes(c, 2, h.d());
	}
};
var zls = function(d, dict) {
	if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31) err(6, "invalid zlib data");
	if ((d[1] >> 5 & 1) == +!dict) err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
	return (d[1] >> 3 & 4) + 2;
};
/**
* Streaming DEFLATE decompression
*/
var Inflate = /* @__PURE__ */ function() {
	function Inflate(opts, cb) {
		if (typeof opts == "function") cb = opts, opts = {};
		this.ondata = cb;
		var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
		this.s = {
			i: 0,
			b: dict ? dict.length : 0
		};
		this.o = new u8(32768);
		this.p = new u8(0);
		if (dict) this.o.set(dict);
	}
	Inflate.prototype.e = function(c) {
		if (!this.ondata) err(5);
		if (this.d) err(4);
		if (!this.p.length) this.p = c;
		else if (c.length) {
			var n = new u8(this.p.length + c.length);
			n.set(this.p), n.set(c, this.p.length), this.p = n;
		}
	};
	Inflate.prototype.c = function(final) {
		this.s.i = +(this.d = final || false);
		var bts = this.s.b;
		var dt = inflt(this.p, this.s, this.o);
		this.ondata(slc(dt, bts, this.s.b), this.d);
		this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
		this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
	};
	/**
	* Pushes a chunk to be inflated
	* @param chunk The chunk to push
	* @param final Whether this is the final chunk
	*/
	Inflate.prototype.push = function(chunk, final) {
		this.e(chunk), this.c(final);
	};
	return Inflate;
}();
/**
* Compress data with Zlib
* @param data The data to compress
* @param opts The compression options
* @returns The zlib-compressed version of the data
*/
function zlibSync(data, opts) {
	if (!opts) opts = {};
	var a = adler();
	a.p(data);
	var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
	return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
/**
* Streaming Zlib decompression
*/
var Unzlib = /* @__PURE__ */ function() {
	function Unzlib(opts, cb) {
		Inflate.call(this, opts, cb);
		this.v = opts && opts.dictionary ? 2 : 1;
	}
	/**
	* Pushes a chunk to be unzlibbed
	* @param chunk The chunk to push
	* @param final Whether this is the last chunk
	*/
	Unzlib.prototype.push = function(chunk, final) {
		Inflate.prototype.e.call(this, chunk);
		if (this.v) {
			if (this.p.length < 6 && !final) return;
			this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
		}
		if (final) {
			if (this.p.length < 4) err(6, "invalid zlib data");
			this.p = this.p.subarray(0, -4);
		}
		Inflate.prototype.c.call(this, final);
	};
	return Unzlib;
}();
function unzlibSync(data, opts) {
	return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /*#__PURE__*/ new TextDecoder();
try {
	td.decode(et, { stream: true });
} catch (e) {}
//#endregion
//#region ../../node_modules/iobuffer/lib/text.js
/**
* Decode bytes to text
* @param bytes - Bytes to decode
* @param encoding - Text encoding
* @returns The decoded text
*/
function decode(bytes, encoding = "utf8") {
	return new TextDecoder(encoding).decode(bytes);
}
const encoder = new TextEncoder();
/**
* Encode text to utf8
* @param str - Text to encode
* @returns The encoded bytes
*/
function encode(str) {
	return encoder.encode(str);
}
//#endregion
//#region ../../node_modules/iobuffer/lib/iobuffer.js
const defaultByteLength = 8192;
const hostBigEndian = (() => {
	const array = /* @__PURE__ */ new Uint8Array(4);
	const view = new Uint32Array(array.buffer);
	return !((view[0] = 1) & array[0]);
})();
const typedArrays = {
	int8: globalThis.Int8Array,
	uint8: globalThis.Uint8Array,
	int16: globalThis.Int16Array,
	uint16: globalThis.Uint16Array,
	int32: globalThis.Int32Array,
	uint32: globalThis.Uint32Array,
	uint64: globalThis.BigUint64Array,
	int64: globalThis.BigInt64Array,
	float32: globalThis.Float32Array,
	float64: globalThis.Float64Array
};
var IOBuffer = class IOBuffer {
	/**
	* Reference to the internal ArrayBuffer object.
	*/
	buffer;
	/**
	* Byte length of the internal ArrayBuffer.
	*/
	byteLength;
	/**
	* Byte offset of the internal ArrayBuffer.
	*/
	byteOffset;
	/**
	* Byte length of the internal ArrayBuffer.
	*/
	length;
	/**
	* The current offset of the buffer's pointer.
	*/
	offset;
	lastWrittenByte;
	littleEndian;
	_data;
	_mark;
	_marks;
	/**
	* Create a new IOBuffer.
	* @param data - The data to construct the IOBuffer with.
	* If data is a number, it will be the new buffer's length<br>
	* If data is `undefined`, the buffer will be initialized with a default length of 8Kb<br>
	* If data is an ArrayBuffer, SharedArrayBuffer, an ArrayBufferView (Typed Array), an IOBuffer instance,
	* or a Node.js Buffer, a view will be created over the underlying ArrayBuffer.
	* @param options - An object for the options.
	* @returns A new IOBuffer instance.
	*/
	constructor(data = defaultByteLength, options = {}) {
		let dataIsGiven = false;
		if (typeof data === "number") data = new ArrayBuffer(data);
		else {
			dataIsGiven = true;
			this.lastWrittenByte = data.byteLength;
		}
		const offset = options.offset ? options.offset >>> 0 : 0;
		const byteLength = data.byteLength - offset;
		let dvOffset = offset;
		if (ArrayBuffer.isView(data) || data instanceof IOBuffer) {
			if (data.byteLength !== data.buffer.byteLength) dvOffset = data.byteOffset + offset;
			data = data.buffer;
		}
		if (dataIsGiven) this.lastWrittenByte = byteLength;
		else this.lastWrittenByte = 0;
		this.buffer = data;
		this.length = byteLength;
		this.byteLength = byteLength;
		this.byteOffset = dvOffset;
		this.offset = 0;
		this.littleEndian = true;
		this._data = new DataView(this.buffer, dvOffset, byteLength);
		this._mark = 0;
		this._marks = [];
	}
	/**
	* Checks if the memory allocated to the buffer is sufficient to store more
	* bytes after the offset.
	* @param byteLength - The needed memory in bytes.
	* @returns `true` if there is sufficient space and `false` otherwise.
	*/
	available(byteLength = 1) {
		return this.offset + byteLength <= this.length;
	}
	/**
	* Check if little-endian mode is used for reading and writing multi-byte
	* values.
	* @returns `true` if little-endian mode is used, `false` otherwise.
	*/
	isLittleEndian() {
		return this.littleEndian;
	}
	/**
	* Set little-endian mode for reading and writing multi-byte values.
	* @returns This.
	*/
	setLittleEndian() {
		this.littleEndian = true;
		return this;
	}
	/**
	* Check if big-endian mode is used for reading and writing multi-byte values.
	* @returns `true` if big-endian mode is used, `false` otherwise.
	*/
	isBigEndian() {
		return !this.littleEndian;
	}
	/**
	* Switches to big-endian mode for reading and writing multi-byte values.
	* @returns This.
	*/
	setBigEndian() {
		this.littleEndian = false;
		return this;
	}
	/**
	* Move the pointer n bytes forward.
	* @param n - Number of bytes to skip.
	* @returns This.
	*/
	skip(n = 1) {
		this.offset += n;
		return this;
	}
	/**
	* Move the pointer n bytes backward.
	* @param n - Number of bytes to move back.
	* @returns This.
	*/
	back(n = 1) {
		this.offset -= n;
		return this;
	}
	/**
	* Move the pointer to the given offset.
	* @param offset - The offset to move to.
	* @returns This.
	*/
	seek(offset) {
		this.offset = offset;
		return this;
	}
	/**
	* Store the current pointer offset.
	* @see {@link IOBuffer#reset}
	* @returns This.
	*/
	mark() {
		this._mark = this.offset;
		return this;
	}
	/**
	* Move the pointer back to the last pointer offset set by mark.
	* @see {@link IOBuffer#mark}
	* @returns This.
	*/
	reset() {
		this.offset = this._mark;
		return this;
	}
	/**
	* Push the current pointer offset to the mark stack.
	* @see {@link IOBuffer#popMark}
	* @returns This.
	*/
	pushMark() {
		this._marks.push(this.offset);
		return this;
	}
	/**
	* Pop the last pointer offset from the mark stack, and set the current
	* pointer offset to the popped value.
	* @see {@link IOBuffer#pushMark}
	* @returns This.
	*/
	popMark() {
		const offset = this._marks.pop();
		if (offset === void 0) throw new Error("Mark stack empty");
		this.seek(offset);
		return this;
	}
	/**
	* Move the pointer offset back to 0.
	* @returns This.
	*/
	rewind() {
		this.offset = 0;
		return this;
	}
	/**
	* Make sure the buffer has sufficient memory to write a given byteLength at
	* the current pointer offset.
	* If the buffer's memory is insufficient, this method will create a new
	* buffer (a copy) with a length that is twice (byteLength + current offset).
	* @param byteLength - The needed memory in bytes.
	* @returns This.
	*/
	ensureAvailable(byteLength = 1) {
		if (!this.available(byteLength)) {
			const newLength = (this.offset + byteLength) * 2;
			const newArray = new Uint8Array(newLength);
			newArray.set(new Uint8Array(this.buffer));
			this.buffer = newArray.buffer;
			this.length = newLength;
			this.byteLength = newLength;
			this._data = new DataView(this.buffer);
		}
		return this;
	}
	/**
	* Read a byte and return false if the byte's value is 0, or true otherwise.
	* Moves pointer forward by one byte.
	* @returns The read boolean.
	*/
	readBoolean() {
		return this.readUint8() !== 0;
	}
	/**
	* Read a signed 8-bit integer and move pointer forward by 1 byte.
	* @returns The read byte.
	*/
	readInt8() {
		return this._data.getInt8(this.offset++);
	}
	/**
	* Read an unsigned 8-bit integer and move pointer forward by 1 byte.
	* @returns The read byte.
	*/
	readUint8() {
		return this._data.getUint8(this.offset++);
	}
	/**
	* Alias for {@link IOBuffer#readUint8}.
	* @returns The read byte.
	*/
	readByte() {
		return this.readUint8();
	}
	/**
	* Read `n` bytes and move pointer forward by `n` bytes.
	* @param n - Number of bytes to read.
	* @returns The read bytes.
	*/
	readBytes(n = 1) {
		return this.readArray(n, "uint8");
	}
	/**
	* Creates an array of corresponding to the type `type` and size `size`.
	* For example, type `uint8` will create a `Uint8Array`.
	* @param size - size of the resulting array
	* @param type - number type of elements to read
	* @returns The read array.
	*/
	readArray(size, type) {
		const bytes = typedArrays[type].BYTES_PER_ELEMENT * size;
		const offset = this.byteOffset + this.offset;
		const slice = this.buffer.slice(offset, offset + bytes);
		if (this.littleEndian === hostBigEndian && type !== "uint8" && type !== "int8") {
			const slice = new Uint8Array(this.buffer.slice(offset, offset + bytes));
			slice.reverse();
			const returnArray = new typedArrays[type](slice.buffer);
			this.offset += bytes;
			returnArray.reverse();
			return returnArray;
		}
		const returnArray = new typedArrays[type](slice);
		this.offset += bytes;
		return returnArray;
	}
	/**
	* Read a 16-bit signed integer and move pointer forward by 2 bytes.
	* @returns The read value.
	*/
	readInt16() {
		const value = this._data.getInt16(this.offset, this.littleEndian);
		this.offset += 2;
		return value;
	}
	/**
	* Read a 16-bit unsigned integer and move pointer forward by 2 bytes.
	* @returns The read value.
	*/
	readUint16() {
		const value = this._data.getUint16(this.offset, this.littleEndian);
		this.offset += 2;
		return value;
	}
	/**
	* Read a 32-bit signed integer and move pointer forward by 4 bytes.
	* @returns The read value.
	*/
	readInt32() {
		const value = this._data.getInt32(this.offset, this.littleEndian);
		this.offset += 4;
		return value;
	}
	/**
	* Read a 32-bit unsigned integer and move pointer forward by 4 bytes.
	* @returns The read value.
	*/
	readUint32() {
		const value = this._data.getUint32(this.offset, this.littleEndian);
		this.offset += 4;
		return value;
	}
	/**
	* Read a 32-bit floating number and move pointer forward by 4 bytes.
	* @returns The read value.
	*/
	readFloat32() {
		const value = this._data.getFloat32(this.offset, this.littleEndian);
		this.offset += 4;
		return value;
	}
	/**
	* Read a 64-bit floating number and move pointer forward by 8 bytes.
	* @returns The read value.
	*/
	readFloat64() {
		const value = this._data.getFloat64(this.offset, this.littleEndian);
		this.offset += 8;
		return value;
	}
	/**
	* Read a 64-bit signed integer number and move pointer forward by 8 bytes.
	* @returns The read value.
	*/
	readBigInt64() {
		const value = this._data.getBigInt64(this.offset, this.littleEndian);
		this.offset += 8;
		return value;
	}
	/**
	* Read a 64-bit unsigned integer number and move pointer forward by 8 bytes.
	* @returns The read value.
	*/
	readBigUint64() {
		const value = this._data.getBigUint64(this.offset, this.littleEndian);
		this.offset += 8;
		return value;
	}
	/**
	* Read a 1-byte ASCII character and move pointer forward by 1 byte.
	* @returns The read character.
	*/
	readChar() {
		return String.fromCharCode(this.readInt8());
	}
	/**
	* Read `n` 1-byte ASCII characters and move pointer forward by `n` bytes.
	* @param n - Number of characters to read.
	* @returns The read characters.
	*/
	readChars(n = 1) {
		let result = "";
		for (let i = 0; i < n; i++) result += this.readChar();
		return result;
	}
	/**
	* Read the next `n` bytes, return a UTF-8 decoded string and move pointer
	* forward by `n` bytes.
	* @param n - Number of bytes to read.
	* @returns The decoded string.
	*/
	readUtf8(n = 1) {
		return decode(this.readBytes(n));
	}
	/**
	* Read the next `n` bytes, return a string decoded with `encoding` and move pointer
	* forward by `n` bytes.
	* If no encoding is passed, the function is equivalent to @see {@link IOBuffer#readUtf8}
	* @param n - Number of bytes to read.
	* @param encoding - The encoding to use. Default is 'utf8'.
	* @returns The decoded string.
	*/
	decodeText(n = 1, encoding = "utf8") {
		return decode(this.readBytes(n), encoding);
	}
	/**
	* Write 0xff if the passed value is truthy, 0x00 otherwise and move pointer
	* forward by 1 byte.
	* @param value - The value to write.
	* @returns This.
	*/
	writeBoolean(value) {
		this.writeUint8(value ? 255 : 0);
		return this;
	}
	/**
	* Write `value` as an 8-bit signed integer and move pointer forward by 1 byte.
	* @param value - The value to write.
	* @returns This.
	*/
	writeInt8(value) {
		this.ensureAvailable(1);
		this._data.setInt8(this.offset++, value);
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as an 8-bit unsigned integer and move pointer forward by 1
	* byte.
	* @param value - The value to write.
	* @returns This.
	*/
	writeUint8(value) {
		this.ensureAvailable(1);
		this._data.setUint8(this.offset++, value);
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* An alias for {@link IOBuffer#writeUint8}.
	* @param value - The value to write.
	* @returns This.
	*/
	writeByte(value) {
		return this.writeUint8(value);
	}
	/**
	* Write all elements of `bytes` as uint8 values and move pointer forward by
	* `bytes.length` bytes.
	* @param bytes - The array of bytes to write.
	* @returns This.
	*/
	writeBytes(bytes) {
		this.ensureAvailable(bytes.length);
		for (let i = 0; i < bytes.length; i++) this._data.setUint8(this.offset++, bytes[i]);
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 16-bit signed integer and move pointer forward by 2
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeInt16(value) {
		this.ensureAvailable(2);
		this._data.setInt16(this.offset, value, this.littleEndian);
		this.offset += 2;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 16-bit unsigned integer and move pointer forward by 2
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeUint16(value) {
		this.ensureAvailable(2);
		this._data.setUint16(this.offset, value, this.littleEndian);
		this.offset += 2;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 32-bit signed integer and move pointer forward by 4
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeInt32(value) {
		this.ensureAvailable(4);
		this._data.setInt32(this.offset, value, this.littleEndian);
		this.offset += 4;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 32-bit unsigned integer and move pointer forward by 4
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeUint32(value) {
		this.ensureAvailable(4);
		this._data.setUint32(this.offset, value, this.littleEndian);
		this.offset += 4;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 32-bit floating number and move pointer forward by 4
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeFloat32(value) {
		this.ensureAvailable(4);
		this._data.setFloat32(this.offset, value, this.littleEndian);
		this.offset += 4;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 64-bit floating number and move pointer forward by 8
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeFloat64(value) {
		this.ensureAvailable(8);
		this._data.setFloat64(this.offset, value, this.littleEndian);
		this.offset += 8;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 64-bit signed bigint and move pointer forward by 8
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeBigInt64(value) {
		this.ensureAvailable(8);
		this._data.setBigInt64(this.offset, value, this.littleEndian);
		this.offset += 8;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write `value` as a 64-bit unsigned bigint and move pointer forward by 8
	* bytes.
	* @param value - The value to write.
	* @returns This.
	*/
	writeBigUint64(value) {
		this.ensureAvailable(8);
		this._data.setBigUint64(this.offset, value, this.littleEndian);
		this.offset += 8;
		this._updateLastWrittenByte();
		return this;
	}
	/**
	* Write the charCode of `str`'s first character as an 8-bit unsigned integer
	* and move pointer forward by 1 byte.
	* @param str - The character to write.
	* @returns This.
	*/
	writeChar(str) {
		return this.writeUint8(str.charCodeAt(0));
	}
	/**
	* Write the charCodes of all `str`'s characters as 8-bit unsigned integers
	* and move pointer forward by `str.length` bytes.
	* @param str - The characters to write.
	* @returns This.
	*/
	writeChars(str) {
		for (let i = 0; i < str.length; i++) this.writeUint8(str.charCodeAt(i));
		return this;
	}
	/**
	* UTF-8 encode and write `str` to the current pointer offset and move pointer
	* forward according to the encoded length.
	* @param str - The string to write.
	* @returns This.
	*/
	writeUtf8(str) {
		return this.writeBytes(encode(str));
	}
	/**
	* Export a Uint8Array view of the internal buffer.
	* The view starts at the byte offset and its length
	* is calculated to stop at the last written byte or the original length.
	* @returns A new Uint8Array view.
	*/
	toArray() {
		return new Uint8Array(this.buffer, this.byteOffset, this.lastWrittenByte);
	}
	/**
	*  Get the total number of bytes written so far, regardless of the current offset.
	* @returns - Total number of bytes.
	*/
	getWrittenByteLength() {
		return this.lastWrittenByte - this.byteOffset;
	}
	/**
	* Update the last written byte offset
	* @private
	*/
	_updateLastWrittenByte() {
		if (this.offset > this.lastWrittenByte) this.lastWrittenByte = this.offset;
	}
};
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/crc.js
const crcTable = [];
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) if (c & 1) c = 3988292384 ^ c >>> 1;
	else c = c >>> 1;
	crcTable[n] = c;
}
const initialCrc = 4294967295;
function updateCrc(currentCrc, data, length) {
	let c = currentCrc;
	for (let n = 0; n < length; n++) c = crcTable[(c ^ data[n]) & 255] ^ c >>> 8;
	return c;
}
function crc(data, length) {
	return (updateCrc(initialCrc, data, length) ^ initialCrc) >>> 0;
}
function checkCrc(buffer, crcLength, chunkName) {
	const expectedCrc = buffer.readUint32();
	const actualCrc = crc(new Uint8Array(buffer.buffer, buffer.byteOffset + buffer.offset - crcLength - 4, crcLength), crcLength);
	if (actualCrc !== expectedCrc) throw new Error(`CRC mismatch for chunk ${chunkName}. Expected ${expectedCrc}, found ${actualCrc}`);
}
function writeCrc(buffer, length) {
	buffer.writeUint32(crc(new Uint8Array(buffer.buffer, buffer.byteOffset + buffer.offset - length, length), length));
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/unfilter.js
function unfilterNone(currentLine, newLine, bytesPerLine) {
	for (let i = 0; i < bytesPerLine; i++) newLine[i] = currentLine[i];
}
function unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel) {
	let i = 0;
	for (; i < bytesPerPixel; i++) newLine[i] = currentLine[i];
	for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + newLine[i - bytesPerPixel] & 255;
}
function unfilterUp(currentLine, newLine, prevLine, bytesPerLine) {
	let i = 0;
	if (prevLine.length === 0) for (; i < bytesPerLine; i++) newLine[i] = currentLine[i];
	else for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + prevLine[i] & 255;
}
function unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
	let i = 0;
	if (prevLine.length === 0) {
		for (; i < bytesPerPixel; i++) newLine[i] = currentLine[i];
		for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + (newLine[i - bytesPerPixel] >> 1) & 255;
	} else {
		for (; i < bytesPerPixel; i++) newLine[i] = currentLine[i] + (prevLine[i] >> 1) & 255;
		for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + (newLine[i - bytesPerPixel] + prevLine[i] >> 1) & 255;
	}
}
function unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
	let i = 0;
	if (prevLine.length === 0) {
		for (; i < bytesPerPixel; i++) newLine[i] = currentLine[i];
		for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + newLine[i - bytesPerPixel] & 255;
	} else {
		for (; i < bytesPerPixel; i++) newLine[i] = currentLine[i] + prevLine[i] & 255;
		for (; i < bytesPerLine; i++) newLine[i] = currentLine[i] + paethPredictor(newLine[i - bytesPerPixel], prevLine[i], prevLine[i - bytesPerPixel]) & 255;
	}
}
function paethPredictor(a, b, c) {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	else if (pb <= pc) return b;
	else return c;
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/apply_unfilter.js
/**
* Apllies filter on scanline based on the filter type.
* @param filterType - The filter type to apply.
* @param currentLine - The current line of pixel data.
* @param newLine - The new line of pixel data.
* @param prevLine - The previous line of pixel data.
* @param passLineBytes - The number of bytes in the pass line.
* @param bytesPerPixel - The number of bytes per pixel.
*/
function applyUnfilter(filterType, currentLine, newLine, prevLine, passLineBytes, bytesPerPixel) {
	switch (filterType) {
		case 0:
			unfilterNone(currentLine, newLine, passLineBytes);
			break;
		case 1:
			unfilterSub(currentLine, newLine, passLineBytes, bytesPerPixel);
			break;
		case 2:
			unfilterUp(currentLine, newLine, prevLine, passLineBytes);
			break;
		case 3:
			unfilterAverage(currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
			break;
		case 4:
			unfilterPaeth(currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
			break;
		default: throw new Error(`Unsupported filter: ${filterType}`);
	}
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/decode_interlace_adam7.js
const uint16$1 = new Uint16Array([255]);
const osIsLittleEndian$1 = new Uint8Array(uint16$1.buffer)[0] === 255;
/**
* Decodes the Adam7 interlaced PNG data.
* @param params - DecodeInterlaceNullParams
* @returns - array of pixel data.
*/
function decodeInterlaceAdam7(params) {
	const { data, width, height, channels, depth } = params;
	const passes = [
		{
			x: 0,
			y: 0,
			xStep: 8,
			yStep: 8
		},
		{
			x: 4,
			y: 0,
			xStep: 8,
			yStep: 8
		},
		{
			x: 0,
			y: 4,
			xStep: 4,
			yStep: 8
		},
		{
			x: 2,
			y: 0,
			xStep: 4,
			yStep: 4
		},
		{
			x: 0,
			y: 2,
			xStep: 2,
			yStep: 4
		},
		{
			x: 1,
			y: 0,
			xStep: 2,
			yStep: 2
		},
		{
			x: 0,
			y: 1,
			xStep: 1,
			yStep: 2
		}
	];
	const bytesPerPixel = Math.ceil(depth / 8) * channels;
	const resultData = new Uint8Array(height * width * bytesPerPixel);
	let offset = 0;
	for (let passIndex = 0; passIndex < 7; passIndex++) {
		const pass = passes[passIndex];
		const passWidth = Math.ceil((width - pass.x) / pass.xStep);
		const passHeight = Math.ceil((height - pass.y) / pass.yStep);
		if (passWidth <= 0 || passHeight <= 0) continue;
		const passLineBytes = passWidth * bytesPerPixel;
		const prevLine = new Uint8Array(passLineBytes);
		for (let y = 0; y < passHeight; y++) {
			const filterType = data[offset++];
			const currentLine = data.subarray(offset, offset + passLineBytes);
			offset += passLineBytes;
			const newLine = new Uint8Array(passLineBytes);
			applyUnfilter(filterType, currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
			prevLine.set(newLine);
			for (let x = 0; x < passWidth; x++) {
				const outputX = pass.x + x * pass.xStep;
				const outputY = pass.y + y * pass.yStep;
				if (outputX >= width || outputY >= height) continue;
				for (let i = 0; i < bytesPerPixel; i++) resultData[(outputY * width + outputX) * bytesPerPixel + i] = newLine[x * bytesPerPixel + i];
			}
		}
	}
	if (depth === 16) {
		const uint16Data = new Uint16Array(resultData.buffer);
		if (osIsLittleEndian$1) for (let k = 0; k < uint16Data.length; k++) uint16Data[k] = swap16$1(uint16Data[k]);
		return uint16Data;
	} else return resultData;
}
function swap16$1(val) {
	return (val & 255) << 8 | val >> 8 & 255;
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/decode_interlace_null.js
const uint16 = new Uint16Array([255]);
const osIsLittleEndian = new Uint8Array(uint16.buffer)[0] === 255;
const empty = /* @__PURE__ */ new Uint8Array(0);
function decodeInterlaceNull(params) {
	const { data, width, height, channels, depth } = params;
	const bytesPerPixel = Math.ceil(depth / 8) * channels;
	const bytesPerLine = Math.ceil(depth / 8 * channels * width);
	const newData = new Uint8Array(height * bytesPerLine);
	let prevLine = empty;
	let offset = 0;
	let currentLine;
	let newLine;
	for (let i = 0; i < height; i++) {
		currentLine = data.subarray(offset + 1, offset + 1 + bytesPerLine);
		newLine = newData.subarray(i * bytesPerLine, (i + 1) * bytesPerLine);
		switch (data[offset]) {
			case 0:
				unfilterNone(currentLine, newLine, bytesPerLine);
				break;
			case 1:
				unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel);
				break;
			case 2:
				unfilterUp(currentLine, newLine, prevLine, bytesPerLine);
				break;
			case 3:
				unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
				break;
			case 4:
				unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
				break;
			default: throw new Error(`Unsupported filter: ${data[offset]}`);
		}
		prevLine = newLine;
		offset += bytesPerLine + 1;
	}
	if (depth === 16) {
		const uint16Data = new Uint16Array(newData.buffer);
		if (osIsLittleEndian) for (let k = 0; k < uint16Data.length; k++) uint16Data[k] = swap16(uint16Data[k]);
		return uint16Data;
	} else return newData;
}
function swap16(val) {
	return (val & 255) << 8 | val >> 8 & 255;
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/signature.js
const pngSignature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
function writeSignature(buffer) {
	buffer.writeBytes(pngSignature);
}
function checkSignature(buffer) {
	if (!hasPngSignature(buffer.readBytes(pngSignature.length))) throw new Error("wrong PNG signature");
}
function hasPngSignature(array) {
	if (array.length < pngSignature.length) return false;
	for (let i = 0; i < pngSignature.length; i++) if (array[i] !== pngSignature[i]) return false;
	return true;
}
//#endregion
//#region ../../node_modules/fast-png/lib/helpers/text.js
const textChunkName = "tEXt";
const NULL = 0;
const latin1Decoder = new TextDecoder("latin1");
function validateKeyword(keyword) {
	validateLatin1(keyword);
	if (keyword.length === 0 || keyword.length > 79) throw new Error("keyword length must be between 1 and 79");
}
const latin1Regex = /^[\u0000-\u00FF]*$/;
function validateLatin1(text) {
	if (!latin1Regex.test(text)) throw new Error("invalid latin1 text");
}
function decodetEXt(text, buffer, length) {
	const keyword = readKeyword(buffer);
	text[keyword] = readLatin1(buffer, length - keyword.length - 1);
}
function encodetEXt(buffer, keyword, text) {
	validateKeyword(keyword);
	validateLatin1(text);
	const length = keyword.length + 1 + text.length;
	buffer.writeUint32(length);
	buffer.writeChars(textChunkName);
	buffer.writeChars(keyword);
	buffer.writeByte(NULL);
	buffer.writeChars(text);
	writeCrc(buffer, length + 4);
}
function readKeyword(buffer) {
	buffer.mark();
	while (buffer.readByte() !== NULL);
	const end = buffer.offset;
	buffer.reset();
	const keyword = latin1Decoder.decode(buffer.readBytes(end - buffer.offset - 1));
	buffer.skip(1);
	validateKeyword(keyword);
	return keyword;
}
function readLatin1(buffer, length) {
	return latin1Decoder.decode(buffer.readBytes(length));
}
//#endregion
//#region ../../node_modules/fast-png/lib/internal_types.js
const ColorType = {
	UNKNOWN: -1,
	GREYSCALE: 0,
	TRUECOLOUR: 2,
	INDEXED_COLOUR: 3,
	GREYSCALE_ALPHA: 4,
	TRUECOLOUR_ALPHA: 6
};
const CompressionMethod = {
	UNKNOWN: -1,
	DEFLATE: 0
};
const FilterMethod = {
	UNKNOWN: -1,
	ADAPTIVE: 0
};
const InterlaceMethod = {
	UNKNOWN: -1,
	NO_INTERLACE: 0,
	ADAM7: 1
};
const DisposeOpType = {
	NONE: 0,
	BACKGROUND: 1,
	PREVIOUS: 2
};
const BlendOpType = {
	SOURCE: 0,
	OVER: 1
};
//#endregion
//#region ../../node_modules/fast-png/lib/png_decoder.js
var PngDecoder = class extends IOBuffer {
	_checkCrc;
	_inflator;
	_png;
	_apng;
	_end;
	_hasPalette;
	_palette;
	_hasTransparency;
	_transparency;
	_compressionMethod;
	_filterMethod;
	_interlaceMethod;
	_colorType;
	_isAnimated;
	_numberOfFrames;
	_numberOfPlays;
	_frames;
	_writingDataChunks;
	_chunks;
	_inflatorResult;
	constructor(data, options = {}) {
		super(data);
		const { checkCrc = false } = options;
		this._checkCrc = checkCrc;
		this._inflator = new Unzlib((chunk, final) => {
			this._chunks.push(chunk);
			if (final) {
				const totalLength = this._chunks.reduce((sum, c) => sum + c.length, 0);
				this._inflatorResult = new Uint8Array(totalLength);
				let offset = 0;
				for (const chunk of this._chunks) {
					this._inflatorResult.set(chunk, offset);
					offset += chunk.length;
				}
				this._chunks = [];
			}
		});
		this._chunks = [];
		this._png = {
			width: -1,
			height: -1,
			channels: -1,
			data: /* @__PURE__ */ new Uint8Array(0),
			depth: 1,
			text: {}
		};
		this._apng = {
			width: -1,
			height: -1,
			channels: -1,
			depth: 1,
			numberOfFrames: 1,
			numberOfPlays: 0,
			text: {},
			frames: []
		};
		this._end = false;
		this._hasPalette = false;
		this._palette = [];
		this._hasTransparency = false;
		this._transparency = /* @__PURE__ */ new Uint16Array(0);
		this._compressionMethod = CompressionMethod.UNKNOWN;
		this._filterMethod = FilterMethod.UNKNOWN;
		this._interlaceMethod = InterlaceMethod.UNKNOWN;
		this._colorType = ColorType.UNKNOWN;
		this._isAnimated = false;
		this._numberOfFrames = 1;
		this._numberOfPlays = 0;
		this._frames = [];
		this._writingDataChunks = false;
		this._inflatorResult = /* @__PURE__ */ new Uint8Array(0);
		this.setBigEndian();
	}
	decode() {
		checkSignature(this);
		while (!this._end) {
			const length = this.readUint32();
			const type = this.readChars(4);
			this.decodeChunk(length, type);
		}
		this._inflator.push(/* @__PURE__ */ new Uint8Array(0), true);
		this.decodeImage();
		return this._png;
	}
	decodeApng() {
		checkSignature(this);
		while (!this._end) {
			const length = this.readUint32();
			const type = this.readChars(4);
			this.decodeApngChunk(length, type);
		}
		this.decodeApngImage();
		return this._apng;
	}
	decodeChunk(length, type) {
		const offset = this.offset;
		switch (type) {
			case "IHDR":
				this.decodeIHDR();
				break;
			case "PLTE":
				this.decodePLTE(length);
				break;
			case "IDAT":
				this.decodeIDAT(length);
				break;
			case "IEND":
				this._end = true;
				break;
			case "tRNS":
				this.decodetRNS(length);
				break;
			case "iCCP":
				this.decodeiCCP(length);
				break;
			case textChunkName:
				decodetEXt(this._png.text, this, length);
				break;
			case "pHYs":
				this.decodepHYs();
				break;
			default: this.skip(length);
		}
		if (this.offset - offset !== length) throw new Error(`Length mismatch while decoding chunk ${type}`);
		if (this._checkCrc) checkCrc(this, length + 4, type);
		else this.skip(4);
	}
	decodeApngChunk(length, type) {
		const offset = this.offset;
		if (type !== "fdAT" && type !== "IDAT" && this._writingDataChunks) this.pushDataToFrame();
		switch (type) {
			case "acTL":
				this.decodeACTL();
				break;
			case "fcTL":
				this.decodeFCTL();
				break;
			case "fdAT":
				this.decodeFDAT(length);
				break;
			default:
				this.decodeChunk(length, type);
				this.offset = offset + length;
		}
		if (this.offset - offset !== length) throw new Error(`Length mismatch while decoding chunk ${type}`);
		if (this._checkCrc) checkCrc(this, length + 4, type);
		else this.skip(4);
	}
	decodeIHDR() {
		const image = this._png;
		image.width = this.readUint32();
		image.height = this.readUint32();
		image.depth = checkBitDepth(this.readUint8());
		const colorType = this.readUint8();
		this._colorType = colorType;
		let channels;
		switch (colorType) {
			case ColorType.GREYSCALE:
				channels = 1;
				break;
			case ColorType.TRUECOLOUR:
				channels = 3;
				break;
			case ColorType.INDEXED_COLOUR:
				channels = 1;
				break;
			case ColorType.GREYSCALE_ALPHA:
				channels = 2;
				break;
			case ColorType.TRUECOLOUR_ALPHA:
				channels = 4;
				break;
			case ColorType.UNKNOWN:
			default: throw new Error(`Unknown color type: ${colorType}`);
		}
		this._png.channels = channels;
		this._compressionMethod = this.readUint8();
		if (this._compressionMethod !== CompressionMethod.DEFLATE) throw new Error(`Unsupported compression method: ${this._compressionMethod}`);
		this._filterMethod = this.readUint8();
		this._interlaceMethod = this.readUint8();
	}
	decodeACTL() {
		this._numberOfFrames = this.readUint32();
		this._numberOfPlays = this.readUint32();
		this._isAnimated = true;
	}
	decodeFCTL() {
		const image = {
			sequenceNumber: this.readUint32(),
			width: this.readUint32(),
			height: this.readUint32(),
			xOffset: this.readUint32(),
			yOffset: this.readUint32(),
			delayNumber: this.readUint16(),
			delayDenominator: this.readUint16(),
			disposeOp: this.readUint8(),
			blendOp: this.readUint8(),
			data: /* @__PURE__ */ new Uint8Array(0)
		};
		this._frames.push(image);
	}
	decodePLTE(length) {
		if (length % 3 !== 0) throw new RangeError(`PLTE field length must be a multiple of 3. Got ${length}`);
		const l = length / 3;
		this._hasPalette = true;
		const palette = [];
		this._palette = palette;
		for (let i = 0; i < l; i++) palette.push([
			this.readUint8(),
			this.readUint8(),
			this.readUint8()
		]);
	}
	decodeIDAT(length) {
		this._writingDataChunks = true;
		const dataLength = length;
		const dataOffset = this.offset + this.byteOffset;
		try {
			this._inflator.push(new Uint8Array(this.buffer, dataOffset, dataLength), false);
		} catch (error) {
			throw new Error("Error while decompressing the data:", { cause: error });
		}
		this.skip(length);
	}
	decodeFDAT(length) {
		this._writingDataChunks = true;
		let dataLength = length;
		let dataOffset = this.offset + this.byteOffset;
		dataOffset += 4;
		dataLength -= 4;
		try {
			this._inflator.push(new Uint8Array(this.buffer, dataOffset, dataLength), false);
		} catch (error) {
			throw new Error("Error while decompressing the data:", { cause: error });
		}
		this.skip(length);
	}
	decodetRNS(length) {
		switch (this._colorType) {
			case ColorType.GREYSCALE:
			case ColorType.TRUECOLOUR:
				if (length % 2 !== 0) throw new RangeError(`tRNS chunk length must be a multiple of 2. Got ${length}`);
				if (length / 2 > this._png.width * this._png.height) throw new Error(`tRNS chunk contains more alpha values than there are pixels (${length / 2} vs ${this._png.width * this._png.height})`);
				this._hasTransparency = true;
				this._transparency = new Uint16Array(length / 2);
				for (let i = 0; i < length / 2; i++) this._transparency[i] = this.readUint16();
				break;
			case ColorType.INDEXED_COLOUR: {
				if (length > this._palette.length) throw new Error(`tRNS chunk contains more alpha values than there are palette colors (${length} vs ${this._palette.length})`);
				let i = 0;
				for (; i < length; i++) {
					const alpha = this.readByte();
					this._palette[i].push(alpha);
				}
				for (; i < this._palette.length; i++) this._palette[i].push(255);
				break;
			}
			case ColorType.UNKNOWN:
			case ColorType.GREYSCALE_ALPHA:
			case ColorType.TRUECOLOUR_ALPHA:
			default: throw new Error(`tRNS chunk is not supported for color type ${this._colorType}`);
		}
	}
	decodeiCCP(length) {
		const name = readKeyword(this);
		const compressionMethod = this.readUint8();
		if (compressionMethod !== CompressionMethod.DEFLATE) throw new Error(`Unsupported iCCP compression method: ${compressionMethod}`);
		const compressedProfile = this.readBytes(length - name.length - 2);
		this._png.iccEmbeddedProfile = {
			name,
			profile: unzlibSync(compressedProfile)
		};
	}
	decodepHYs() {
		const ppuX = this.readUint32();
		const ppuY = this.readUint32();
		const unitSpecifier = this.readByte();
		this._png.resolution = {
			x: ppuX,
			y: ppuY,
			unit: unitSpecifier
		};
	}
	decodeApngImage() {
		this._apng.width = this._png.width;
		this._apng.height = this._png.height;
		this._apng.channels = this._png.channels;
		this._apng.depth = this._png.depth;
		this._apng.numberOfFrames = this._numberOfFrames;
		this._apng.numberOfPlays = this._numberOfPlays;
		this._apng.text = this._png.text;
		this._apng.resolution = this._png.resolution;
		for (let i = 0; i < this._numberOfFrames; i++) {
			const newFrame = {
				sequenceNumber: this._frames[i].sequenceNumber,
				delayNumber: this._frames[i].delayNumber,
				delayDenominator: this._frames[i].delayDenominator,
				data: this._apng.depth === 8 ? new Uint8Array(this._apng.width * this._apng.height * this._apng.channels) : new Uint16Array(this._apng.width * this._apng.height * this._apng.channels)
			};
			const frame = this._frames.at(i);
			if (frame) {
				frame.data = decodeInterlaceNull({
					data: frame.data,
					width: frame.width,
					height: frame.height,
					channels: this._apng.channels,
					depth: this._apng.depth
				});
				if (this._hasPalette) this._apng.palette = this._palette;
				if (this._hasTransparency) this._apng.transparency = this._transparency;
				if (i === 0 || frame.xOffset === 0 && frame.yOffset === 0 && frame.width === this._png.width && frame.height === this._png.height) newFrame.data = frame.data;
				else {
					const prevFrame = this._apng.frames.at(i - 1);
					this.disposeFrame(frame, prevFrame, newFrame);
					this.addFrameDataToCanvas(newFrame, frame);
				}
				this._apng.frames.push(newFrame);
			}
		}
		return this._apng;
	}
	disposeFrame(frame, prevFrame, imageFrame) {
		switch (frame.disposeOp) {
			case DisposeOpType.NONE: break;
			case DisposeOpType.BACKGROUND:
				for (let row = 0; row < this._png.height; row++) for (let col = 0; col < this._png.width; col++) {
					const index = (row * frame.width + col) * this._png.channels;
					for (let channel = 0; channel < this._png.channels; channel++) imageFrame.data[index + channel] = 0;
				}
				break;
			case DisposeOpType.PREVIOUS:
				imageFrame.data.set(prevFrame.data);
				break;
			default: throw new Error("Unknown disposeOp");
		}
	}
	addFrameDataToCanvas(imageFrame, frame) {
		const maxValue = 1 << this._png.depth;
		const calculatePixelIndices = (row, col) => {
			return {
				index: ((row + frame.yOffset) * this._png.width + frame.xOffset + col) * this._png.channels,
				frameIndex: (row * frame.width + col) * this._png.channels
			};
		};
		switch (frame.blendOp) {
			case BlendOpType.SOURCE:
				for (let row = 0; row < frame.height; row++) for (let col = 0; col < frame.width; col++) {
					const { index, frameIndex } = calculatePixelIndices(row, col);
					for (let channel = 0; channel < this._png.channels; channel++) imageFrame.data[index + channel] = frame.data[frameIndex + channel];
				}
				break;
			case BlendOpType.OVER:
				for (let row = 0; row < frame.height; row++) for (let col = 0; col < frame.width; col++) {
					const { index, frameIndex } = calculatePixelIndices(row, col);
					for (let channel = 0; channel < this._png.channels; channel++) {
						const sourceAlpha = frame.data[frameIndex + this._png.channels - 1] / maxValue;
						const foregroundValue = channel % (this._png.channels - 1) === 0 ? 1 : frame.data[frameIndex + channel];
						const value = Math.floor(sourceAlpha * foregroundValue + (1 - sourceAlpha) * imageFrame.data[index + channel]);
						imageFrame.data[index + channel] += value;
					}
				}
				break;
			default: throw new Error("Unknown blendOp");
		}
	}
	decodeImage() {
		const data = this._inflatorResult;
		if (this._filterMethod !== FilterMethod.ADAPTIVE) throw new Error(`Filter method ${this._filterMethod} not supported`);
		if (this._interlaceMethod === InterlaceMethod.NO_INTERLACE) this._png.data = decodeInterlaceNull({
			data,
			width: this._png.width,
			height: this._png.height,
			channels: this._png.channels,
			depth: this._png.depth
		});
		else if (this._interlaceMethod === InterlaceMethod.ADAM7) this._png.data = decodeInterlaceAdam7({
			data,
			width: this._png.width,
			height: this._png.height,
			channels: this._png.channels,
			depth: this._png.depth
		});
		else throw new Error(`Interlace method ${this._interlaceMethod} not supported`);
		if (this._hasPalette) this._png.palette = this._palette;
		if (this._hasTransparency) this._png.transparency = this._transparency;
	}
	pushDataToFrame() {
		this._inflator.push(/* @__PURE__ */ new Uint8Array(0), true);
		const result = this._inflatorResult;
		const lastFrame = this._frames.at(-1);
		if (lastFrame) lastFrame.data = result;
		else this._frames.push({
			sequenceNumber: 0,
			width: this._png.width,
			height: this._png.height,
			xOffset: 0,
			yOffset: 0,
			delayNumber: 0,
			delayDenominator: 0,
			disposeOp: DisposeOpType.NONE,
			blendOp: BlendOpType.SOURCE,
			data: result
		});
		this._inflator = new Unzlib((chunk, final) => {
			this._chunks.push(chunk);
			if (final) {
				const totalLength = this._chunks.reduce((sum, c) => sum + c.length, 0);
				this._inflatorResult = new Uint8Array(totalLength);
				let offset = 0;
				for (const chunk of this._chunks) {
					this._inflatorResult.set(chunk, offset);
					offset += chunk.length;
				}
				this._chunks = [];
			}
		});
		this._chunks = [];
		this._writingDataChunks = false;
	}
};
function checkBitDepth(value) {
	if (value !== 1 && value !== 2 && value !== 4 && value !== 8 && value !== 16) throw new Error(`invalid bit depth: ${value}`);
	return value;
}
//#endregion
//#region ../../node_modules/fast-png/lib/png_encoder.js
const defaultZlibOptions = { level: 3 };
var PngEncoder = class extends IOBuffer {
	_png;
	_zlibOptions;
	_colorType;
	_interlaceMethod;
	constructor(data, options = {}) {
		super();
		this._colorType = ColorType.UNKNOWN;
		this._zlibOptions = {
			...defaultZlibOptions,
			...options.zlib
		};
		this._png = this._checkData(data);
		this._interlaceMethod = (options.interlace === "Adam7" ? InterlaceMethod.ADAM7 : InterlaceMethod.NO_INTERLACE) ?? InterlaceMethod.NO_INTERLACE;
		this.setBigEndian();
	}
	encode() {
		writeSignature(this);
		this.encodeIHDR();
		if (this._png.palette) {
			this.encodePLTE();
			if (this._png.palette[0].length === 4) this.encodeTRNS();
		}
		this.encodeData();
		if (this._png.text) for (const [keyword, text] of Object.entries(this._png.text)) encodetEXt(this, keyword, text);
		this.encodeIEND();
		return this.toArray();
	}
	encodeIHDR() {
		this.writeUint32(13);
		this.writeChars("IHDR");
		this.writeUint32(this._png.width);
		this.writeUint32(this._png.height);
		this.writeByte(this._png.depth);
		this.writeByte(this._colorType);
		this.writeByte(CompressionMethod.DEFLATE);
		this.writeByte(FilterMethod.ADAPTIVE);
		this.writeByte(this._interlaceMethod);
		writeCrc(this, 17);
	}
	encodeIEND() {
		this.writeUint32(0);
		this.writeChars("IEND");
		writeCrc(this, 4);
	}
	encodePLTE() {
		const paletteLength = this._png.palette?.length * 3;
		this.writeUint32(paletteLength);
		this.writeChars("PLTE");
		for (const color of this._png.palette) {
			this.writeByte(color[0]);
			this.writeByte(color[1]);
			this.writeByte(color[2]);
		}
		writeCrc(this, 4 + paletteLength);
	}
	encodeTRNS() {
		const alpha = this._png.palette.filter((color) => {
			return color.at(-1) !== 255;
		});
		this.writeUint32(alpha.length);
		this.writeChars("tRNS");
		for (const el of alpha) this.writeByte(el.at(-1));
		writeCrc(this, 4 + alpha.length);
	}
	encodeIDAT(data) {
		this.writeUint32(data.length);
		this.writeChars("IDAT");
		this.writeBytes(data);
		writeCrc(this, data.length + 4);
	}
	encodeData() {
		const { width, height, channels, depth, data } = this._png;
		const slotsPerLine = depth <= 8 ? Math.ceil(width * depth / 8) * channels : Math.ceil(width * depth / 8 * channels / 2);
		const newData = new IOBuffer().setBigEndian();
		let offset = 0;
		if (this._interlaceMethod === InterlaceMethod.NO_INTERLACE) for (let i = 0; i < height; i++) {
			newData.writeByte(0);
			if (depth === 16) offset = writeDataUint16(data, newData, slotsPerLine, offset);
			else offset = writeDataBytes(data, newData, slotsPerLine, offset);
		}
		else if (this._interlaceMethod === InterlaceMethod.ADAM7) offset = writeDataInterlaced(this._png, data, newData, offset);
		const compressed = zlibSync(newData.toArray(), this._zlibOptions);
		this.encodeIDAT(compressed);
	}
	_checkData(data) {
		const { colorType, channels, depth } = getColorType(data, data.palette);
		const png = {
			width: checkInteger(data.width, "width"),
			height: checkInteger(data.height, "height"),
			channels,
			data: data.data,
			depth,
			text: data.text,
			palette: data.palette
		};
		this._colorType = colorType;
		const expectedSize = depth < 8 ? Math.ceil(png.width * depth / 8) * png.height * channels : png.width * png.height * channels;
		if (png.data.length !== expectedSize) throw new RangeError(`wrong data size. Found ${png.data.length}, expected ${expectedSize}`);
		return png;
	}
};
function checkInteger(value, name) {
	if (Number.isInteger(value) && value > 0) return value;
	throw new TypeError(`${name} must be a positive integer`);
}
function getColorType(data, palette) {
	const { channels = 4, depth = 8 } = data;
	if (channels !== 4 && channels !== 3 && channels !== 2 && channels !== 1) throw new RangeError(`unsupported number of channels: ${channels}`);
	const returnValue = {
		channels,
		depth,
		colorType: ColorType.UNKNOWN
	};
	switch (channels) {
		case 4:
			returnValue.colorType = ColorType.TRUECOLOUR_ALPHA;
			break;
		case 3:
			returnValue.colorType = ColorType.TRUECOLOUR;
			break;
		case 1:
			if (palette) returnValue.colorType = ColorType.INDEXED_COLOUR;
			else returnValue.colorType = ColorType.GREYSCALE;
			break;
		case 2:
			returnValue.colorType = ColorType.GREYSCALE_ALPHA;
			break;
		default: throw new Error("unsupported number of channels");
	}
	return returnValue;
}
function writeDataBytes(data, newData, slotsPerLine, offset) {
	for (let j = 0; j < slotsPerLine; j++) newData.writeByte(data[offset++]);
	return offset;
}
function writeDataInterlaced(imageData, data, newData, offset) {
	const passes = [
		{
			x: 0,
			y: 0,
			xStep: 8,
			yStep: 8
		},
		{
			x: 4,
			y: 0,
			xStep: 8,
			yStep: 8
		},
		{
			x: 0,
			y: 4,
			xStep: 4,
			yStep: 8
		},
		{
			x: 2,
			y: 0,
			xStep: 4,
			yStep: 4
		},
		{
			x: 0,
			y: 2,
			xStep: 2,
			yStep: 4
		},
		{
			x: 1,
			y: 0,
			xStep: 2,
			yStep: 2
		},
		{
			x: 0,
			y: 1,
			xStep: 1,
			yStep: 2
		}
	];
	const { width, height, channels, depth } = imageData;
	let pixelSize;
	if (depth === 16) pixelSize = channels * depth / 8 / 2;
	else pixelSize = channels * depth / 8;
	for (let passIndex = 0; passIndex < 7; passIndex++) {
		const pass = passes[passIndex];
		const passWidth = Math.floor((width - pass.x + pass.xStep - 1) / pass.xStep);
		const passHeight = Math.floor((height - pass.y + pass.yStep - 1) / pass.yStep);
		if (passWidth <= 0 || passHeight <= 0) continue;
		const passLineBytes = passWidth * pixelSize;
		for (let y = 0; y < passHeight; y++) {
			const imageY = pass.y + y * pass.yStep;
			const rawScanline = depth <= 8 ? new Uint8Array(passLineBytes) : new Uint16Array(passLineBytes);
			let rawOffset = 0;
			for (let x = 0; x < passWidth; x++) {
				const imageX = pass.x + x * pass.xStep;
				if (imageX < width && imageY < height) {
					const srcPos = (imageY * width + imageX) * pixelSize;
					for (let i = 0; i < pixelSize; i++) rawScanline[rawOffset++] = data[srcPos + i];
				}
			}
			newData.writeByte(0);
			if (depth === 8) newData.writeBytes(rawScanline);
			else if (depth === 16) for (const value of rawScanline) {
				newData.writeByte(value >> 8 & 255);
				newData.writeByte(value & 255);
			}
		}
	}
	return offset;
}
function writeDataUint16(data, newData, slotsPerLine, offset) {
	for (let j = 0; j < slotsPerLine; j++) newData.writeUint16(data[offset++]);
	return offset;
}
//#endregion
//#region ../../node_modules/fast-png/lib/index.js
function decodePng(data, options) {
	return new PngDecoder(data, options).decode();
}
function encodePng(png, options) {
	return new PngEncoder(png, options).encode();
}
//#endregion
//#region ../../node_modules/jpeg-js/lib/encoder.js
var require_encoder = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function JPEGEncoder(quality) {
		var ffloor = Math.floor;
		var YTable = new Array(64);
		var UVTable = new Array(64);
		var fdtbl_Y = new Array(64);
		var fdtbl_UV = new Array(64);
		var YDC_HT;
		var UVDC_HT;
		var YAC_HT;
		var UVAC_HT;
		var bitcode = new Array(65535);
		var category = new Array(65535);
		var outputfDCTQuant = new Array(64);
		var DU = new Array(64);
		var byteout = [];
		var bytenew = 0;
		var bytepos = 7;
		var YDU = new Array(64);
		var UDU = new Array(64);
		var VDU = new Array(64);
		var clt = new Array(256);
		var RGB_YUV_TABLE = new Array(2048);
		var currentQuality;
		var ZigZag = [
			0,
			1,
			5,
			6,
			14,
			15,
			27,
			28,
			2,
			4,
			7,
			13,
			16,
			26,
			29,
			42,
			3,
			8,
			12,
			17,
			25,
			30,
			41,
			43,
			9,
			11,
			18,
			24,
			31,
			40,
			44,
			53,
			10,
			19,
			23,
			32,
			39,
			45,
			52,
			54,
			20,
			22,
			33,
			38,
			46,
			51,
			55,
			60,
			21,
			34,
			37,
			47,
			50,
			56,
			59,
			61,
			35,
			36,
			48,
			49,
			57,
			58,
			62,
			63
		];
		var std_dc_luminance_nrcodes = [
			0,
			0,
			1,
			5,
			1,
			1,
			1,
			1,
			1,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		];
		var std_dc_luminance_values = [
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11
		];
		var std_ac_luminance_nrcodes = [
			0,
			0,
			2,
			1,
			3,
			3,
			2,
			4,
			3,
			5,
			5,
			4,
			4,
			0,
			0,
			1,
			125
		];
		var std_ac_luminance_values = [
			1,
			2,
			3,
			0,
			4,
			17,
			5,
			18,
			33,
			49,
			65,
			6,
			19,
			81,
			97,
			7,
			34,
			113,
			20,
			50,
			129,
			145,
			161,
			8,
			35,
			66,
			177,
			193,
			21,
			82,
			209,
			240,
			36,
			51,
			98,
			114,
			130,
			9,
			10,
			22,
			23,
			24,
			25,
			26,
			37,
			38,
			39,
			40,
			41,
			42,
			52,
			53,
			54,
			55,
			56,
			57,
			58,
			67,
			68,
			69,
			70,
			71,
			72,
			73,
			74,
			83,
			84,
			85,
			86,
			87,
			88,
			89,
			90,
			99,
			100,
			101,
			102,
			103,
			104,
			105,
			106,
			115,
			116,
			117,
			118,
			119,
			120,
			121,
			122,
			131,
			132,
			133,
			134,
			135,
			136,
			137,
			138,
			146,
			147,
			148,
			149,
			150,
			151,
			152,
			153,
			154,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			178,
			179,
			180,
			181,
			182,
			183,
			184,
			185,
			186,
			194,
			195,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			210,
			211,
			212,
			213,
			214,
			215,
			216,
			217,
			218,
			225,
			226,
			227,
			228,
			229,
			230,
			231,
			232,
			233,
			234,
			241,
			242,
			243,
			244,
			245,
			246,
			247,
			248,
			249,
			250
		];
		var std_dc_chrominance_nrcodes = [
			0,
			0,
			3,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			1,
			0,
			0,
			0,
			0,
			0
		];
		var std_dc_chrominance_values = [
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11
		];
		var std_ac_chrominance_nrcodes = [
			0,
			0,
			2,
			1,
			2,
			4,
			4,
			3,
			4,
			7,
			5,
			4,
			4,
			0,
			1,
			2,
			119
		];
		var std_ac_chrominance_values = [
			0,
			1,
			2,
			3,
			17,
			4,
			5,
			33,
			49,
			6,
			18,
			65,
			81,
			7,
			97,
			113,
			19,
			34,
			50,
			129,
			8,
			20,
			66,
			145,
			161,
			177,
			193,
			9,
			35,
			51,
			82,
			240,
			21,
			98,
			114,
			209,
			10,
			22,
			36,
			52,
			225,
			37,
			241,
			23,
			24,
			25,
			26,
			38,
			39,
			40,
			41,
			42,
			53,
			54,
			55,
			56,
			57,
			58,
			67,
			68,
			69,
			70,
			71,
			72,
			73,
			74,
			83,
			84,
			85,
			86,
			87,
			88,
			89,
			90,
			99,
			100,
			101,
			102,
			103,
			104,
			105,
			106,
			115,
			116,
			117,
			118,
			119,
			120,
			121,
			122,
			130,
			131,
			132,
			133,
			134,
			135,
			136,
			137,
			138,
			146,
			147,
			148,
			149,
			150,
			151,
			152,
			153,
			154,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			178,
			179,
			180,
			181,
			182,
			183,
			184,
			185,
			186,
			194,
			195,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			210,
			211,
			212,
			213,
			214,
			215,
			216,
			217,
			218,
			226,
			227,
			228,
			229,
			230,
			231,
			232,
			233,
			234,
			242,
			243,
			244,
			245,
			246,
			247,
			248,
			249,
			250
		];
		function initQuantTables(sf) {
			var YQT = [
				16,
				11,
				10,
				16,
				24,
				40,
				51,
				61,
				12,
				12,
				14,
				19,
				26,
				58,
				60,
				55,
				14,
				13,
				16,
				24,
				40,
				57,
				69,
				56,
				14,
				17,
				22,
				29,
				51,
				87,
				80,
				62,
				18,
				22,
				37,
				56,
				68,
				109,
				103,
				77,
				24,
				35,
				55,
				64,
				81,
				104,
				113,
				92,
				49,
				64,
				78,
				87,
				103,
				121,
				120,
				101,
				72,
				92,
				95,
				98,
				112,
				100,
				103,
				99
			];
			for (var i = 0; i < 64; i++) {
				var t = ffloor((YQT[i] * sf + 50) / 100);
				if (t < 1) t = 1;
				else if (t > 255) t = 255;
				YTable[ZigZag[i]] = t;
			}
			var UVQT = [
				17,
				18,
				24,
				47,
				99,
				99,
				99,
				99,
				18,
				21,
				26,
				66,
				99,
				99,
				99,
				99,
				24,
				26,
				56,
				99,
				99,
				99,
				99,
				99,
				47,
				66,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99,
				99
			];
			for (var j = 0; j < 64; j++) {
				var u = ffloor((UVQT[j] * sf + 50) / 100);
				if (u < 1) u = 1;
				else if (u > 255) u = 255;
				UVTable[ZigZag[j]] = u;
			}
			var aasf = [
				1,
				1.387039845,
				1.306562965,
				1.175875602,
				1,
				.785694958,
				.5411961,
				.275899379
			];
			var k = 0;
			for (var row = 0; row < 8; row++) for (var col = 0; col < 8; col++) {
				fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
				fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
				k++;
			}
		}
		function computeHuffmanTbl(nrcodes, std_table) {
			var codevalue = 0;
			var pos_in_table = 0;
			var HT = new Array();
			for (var k = 1; k <= 16; k++) {
				for (var j = 1; j <= nrcodes[k]; j++) {
					HT[std_table[pos_in_table]] = [];
					HT[std_table[pos_in_table]][0] = codevalue;
					HT[std_table[pos_in_table]][1] = k;
					pos_in_table++;
					codevalue++;
				}
				codevalue *= 2;
			}
			return HT;
		}
		function initHuffmanTbl() {
			YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
			UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
			YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
			UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
		}
		function initCategoryNumber() {
			var nrlower = 1;
			var nrupper = 2;
			for (var cat = 1; cat <= 15; cat++) {
				for (var nr = nrlower; nr < nrupper; nr++) {
					category[32767 + nr] = cat;
					bitcode[32767 + nr] = [];
					bitcode[32767 + nr][1] = cat;
					bitcode[32767 + nr][0] = nr;
				}
				for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
					category[32767 + nrneg] = cat;
					bitcode[32767 + nrneg] = [];
					bitcode[32767 + nrneg][1] = cat;
					bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
				}
				nrlower <<= 1;
				nrupper <<= 1;
			}
		}
		function initRGBYUVTable() {
			for (var i = 0; i < 256; i++) {
				RGB_YUV_TABLE[i] = 19595 * i;
				RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
				RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
				RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
				RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
				RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
				RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
				RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
			}
		}
		function writeBits(bs) {
			var value = bs[0];
			var posval = bs[1] - 1;
			while (posval >= 0) {
				if (value & 1 << posval) bytenew |= 1 << bytepos;
				posval--;
				bytepos--;
				if (bytepos < 0) {
					if (bytenew == 255) {
						writeByte(255);
						writeByte(0);
					} else writeByte(bytenew);
					bytepos = 7;
					bytenew = 0;
				}
			}
		}
		function writeByte(value) {
			byteout.push(value);
		}
		function writeWord(value) {
			writeByte(value >> 8 & 255);
			writeByte(value & 255);
		}
		function fDCTQuant(data, fdtbl) {
			var d0, d1, d2, d3, d4, d5, d6, d7;
			var dataOff = 0;
			var i;
			var I8 = 8;
			var I64 = 64;
			for (i = 0; i < I8; ++i) {
				d0 = data[dataOff];
				d1 = data[dataOff + 1];
				d2 = data[dataOff + 2];
				d3 = data[dataOff + 3];
				d4 = data[dataOff + 4];
				d5 = data[dataOff + 5];
				d6 = data[dataOff + 6];
				d7 = data[dataOff + 7];
				var tmp0 = d0 + d7;
				var tmp7 = d0 - d7;
				var tmp1 = d1 + d6;
				var tmp6 = d1 - d6;
				var tmp2 = d2 + d5;
				var tmp5 = d2 - d5;
				var tmp3 = d3 + d4;
				var tmp4 = d3 - d4;
				var tmp10 = tmp0 + tmp3;
				var tmp13 = tmp0 - tmp3;
				var tmp11 = tmp1 + tmp2;
				var tmp12 = tmp1 - tmp2;
				data[dataOff] = tmp10 + tmp11;
				data[dataOff + 4] = tmp10 - tmp11;
				var z1 = (tmp12 + tmp13) * .707106781;
				data[dataOff + 2] = tmp13 + z1;
				data[dataOff + 6] = tmp13 - z1;
				tmp10 = tmp4 + tmp5;
				tmp11 = tmp5 + tmp6;
				tmp12 = tmp6 + tmp7;
				var z5 = (tmp10 - tmp12) * .382683433;
				var z2 = .5411961 * tmp10 + z5;
				var z4 = 1.306562965 * tmp12 + z5;
				var z3 = tmp11 * .707106781;
				var z11 = tmp7 + z3;
				var z13 = tmp7 - z3;
				data[dataOff + 5] = z13 + z2;
				data[dataOff + 3] = z13 - z2;
				data[dataOff + 1] = z11 + z4;
				data[dataOff + 7] = z11 - z4;
				dataOff += 8;
			}
			dataOff = 0;
			for (i = 0; i < I8; ++i) {
				d0 = data[dataOff];
				d1 = data[dataOff + 8];
				d2 = data[dataOff + 16];
				d3 = data[dataOff + 24];
				d4 = data[dataOff + 32];
				d5 = data[dataOff + 40];
				d6 = data[dataOff + 48];
				d7 = data[dataOff + 56];
				var tmp0p2 = d0 + d7;
				var tmp7p2 = d0 - d7;
				var tmp1p2 = d1 + d6;
				var tmp6p2 = d1 - d6;
				var tmp2p2 = d2 + d5;
				var tmp5p2 = d2 - d5;
				var tmp3p2 = d3 + d4;
				var tmp4p2 = d3 - d4;
				var tmp10p2 = tmp0p2 + tmp3p2;
				var tmp13p2 = tmp0p2 - tmp3p2;
				var tmp11p2 = tmp1p2 + tmp2p2;
				var tmp12p2 = tmp1p2 - tmp2p2;
				data[dataOff] = tmp10p2 + tmp11p2;
				data[dataOff + 32] = tmp10p2 - tmp11p2;
				var z1p2 = (tmp12p2 + tmp13p2) * .707106781;
				data[dataOff + 16] = tmp13p2 + z1p2;
				data[dataOff + 48] = tmp13p2 - z1p2;
				tmp10p2 = tmp4p2 + tmp5p2;
				tmp11p2 = tmp5p2 + tmp6p2;
				tmp12p2 = tmp6p2 + tmp7p2;
				var z5p2 = (tmp10p2 - tmp12p2) * .382683433;
				var z2p2 = .5411961 * tmp10p2 + z5p2;
				var z4p2 = 1.306562965 * tmp12p2 + z5p2;
				var z3p2 = tmp11p2 * .707106781;
				var z11p2 = tmp7p2 + z3p2;
				var z13p2 = tmp7p2 - z3p2;
				data[dataOff + 40] = z13p2 + z2p2;
				data[dataOff + 24] = z13p2 - z2p2;
				data[dataOff + 8] = z11p2 + z4p2;
				data[dataOff + 56] = z11p2 - z4p2;
				dataOff++;
			}
			var fDCTQuant;
			for (i = 0; i < I64; ++i) {
				fDCTQuant = data[i] * fdtbl[i];
				outputfDCTQuant[i] = fDCTQuant > 0 ? fDCTQuant + .5 | 0 : fDCTQuant - .5 | 0;
			}
			return outputfDCTQuant;
		}
		function writeAPP0() {
			writeWord(65504);
			writeWord(16);
			writeByte(74);
			writeByte(70);
			writeByte(73);
			writeByte(70);
			writeByte(0);
			writeByte(1);
			writeByte(1);
			writeByte(0);
			writeWord(1);
			writeWord(1);
			writeByte(0);
			writeByte(0);
		}
		function writeAPP1(exifBuffer) {
			if (!exifBuffer) return;
			writeWord(65505);
			if (exifBuffer[0] === 69 && exifBuffer[1] === 120 && exifBuffer[2] === 105 && exifBuffer[3] === 102) writeWord(exifBuffer.length + 2);
			else {
				writeWord(exifBuffer.length + 5 + 2);
				writeByte(69);
				writeByte(120);
				writeByte(105);
				writeByte(102);
				writeByte(0);
			}
			for (var i = 0; i < exifBuffer.length; i++) writeByte(exifBuffer[i]);
		}
		function writeSOF0(width, height) {
			writeWord(65472);
			writeWord(17);
			writeByte(8);
			writeWord(height);
			writeWord(width);
			writeByte(3);
			writeByte(1);
			writeByte(17);
			writeByte(0);
			writeByte(2);
			writeByte(17);
			writeByte(1);
			writeByte(3);
			writeByte(17);
			writeByte(1);
		}
		function writeDQT() {
			writeWord(65499);
			writeWord(132);
			writeByte(0);
			for (var i = 0; i < 64; i++) writeByte(YTable[i]);
			writeByte(1);
			for (var j = 0; j < 64; j++) writeByte(UVTable[j]);
		}
		function writeDHT() {
			writeWord(65476);
			writeWord(418);
			writeByte(0);
			for (var i = 0; i < 16; i++) writeByte(std_dc_luminance_nrcodes[i + 1]);
			for (var j = 0; j <= 11; j++) writeByte(std_dc_luminance_values[j]);
			writeByte(16);
			for (var k = 0; k < 16; k++) writeByte(std_ac_luminance_nrcodes[k + 1]);
			for (var l = 0; l <= 161; l++) writeByte(std_ac_luminance_values[l]);
			writeByte(1);
			for (var m = 0; m < 16; m++) writeByte(std_dc_chrominance_nrcodes[m + 1]);
			for (var n = 0; n <= 11; n++) writeByte(std_dc_chrominance_values[n]);
			writeByte(17);
			for (var o = 0; o < 16; o++) writeByte(std_ac_chrominance_nrcodes[o + 1]);
			for (var p = 0; p <= 161; p++) writeByte(std_ac_chrominance_values[p]);
		}
		function writeCOM(comments) {
			if (typeof comments === "undefined" || comments.constructor !== Array) return;
			comments.forEach((e) => {
				if (typeof e !== "string") return;
				writeWord(65534);
				var l = e.length;
				writeWord(l + 2);
				var i = 0;
				for (; i < l; i++) writeByte(e.charCodeAt(i));
			});
		}
		function writeSOS() {
			writeWord(65498);
			writeWord(12);
			writeByte(3);
			writeByte(1);
			writeByte(0);
			writeByte(2);
			writeByte(17);
			writeByte(3);
			writeByte(17);
			writeByte(0);
			writeByte(63);
			writeByte(0);
		}
		function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
			var EOB = HTAC[0];
			var M16zeroes = HTAC[240];
			var pos;
			var I16 = 16;
			var I63 = 63;
			var I64 = 64;
			var DU_DCT = fDCTQuant(CDU, fdtbl);
			for (var j = 0; j < I64; ++j) DU[ZigZag[j]] = DU_DCT[j];
			var Diff = DU[0] - DC;
			DC = DU[0];
			if (Diff == 0) writeBits(HTDC[0]);
			else {
				pos = 32767 + Diff;
				writeBits(HTDC[category[pos]]);
				writeBits(bitcode[pos]);
			}
			var end0pos = 63;
			for (; end0pos > 0 && DU[end0pos] == 0; end0pos--);
			if (end0pos == 0) {
				writeBits(EOB);
				return DC;
			}
			var i = 1;
			var lng;
			while (i <= end0pos) {
				var startpos = i;
				for (; DU[i] == 0 && i <= end0pos; ++i);
				var nrzeroes = i - startpos;
				if (nrzeroes >= I16) {
					lng = nrzeroes >> 4;
					for (var nrmarker = 1; nrmarker <= lng; ++nrmarker) writeBits(M16zeroes);
					nrzeroes = nrzeroes & 15;
				}
				pos = 32767 + DU[i];
				writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
				writeBits(bitcode[pos]);
				i++;
			}
			if (end0pos != I63) writeBits(EOB);
			return DC;
		}
		function initCharLookupTable() {
			var sfcc = String.fromCharCode;
			for (var i = 0; i < 256; i++) clt[i] = sfcc(i);
		}
		this.encode = function(image, quality) {
			(/* @__PURE__ */ new Date()).getTime();
			if (quality) setQuality(quality);
			byteout = new Array();
			bytenew = 0;
			bytepos = 7;
			writeWord(65496);
			writeAPP0();
			writeCOM(image.comments);
			writeAPP1(image.exifBuffer);
			writeDQT();
			writeSOF0(image.width, image.height);
			writeDHT();
			writeSOS();
			var DCY = 0;
			var DCU = 0;
			var DCV = 0;
			bytenew = 0;
			bytepos = 7;
			this.encode.displayName = "_encode_";
			var imageData = image.data;
			var width = image.width;
			var height = image.height;
			var quadWidth = width * 4;
			width * 3;
			var x, y = 0;
			var r, g, b;
			var start, p, col, row, pos;
			while (y < height) {
				x = 0;
				while (x < quadWidth) {
					start = quadWidth * y + x;
					p = start;
					col = -1;
					row = 0;
					for (pos = 0; pos < 64; pos++) {
						row = pos >> 3;
						col = (pos & 7) * 4;
						p = start + row * quadWidth + col;
						if (y + row >= height) p -= quadWidth * (y + 1 + row - height);
						if (x + col >= quadWidth) p -= x + col - quadWidth + 4;
						r = imageData[p++];
						g = imageData[p++];
						b = imageData[p++];
						YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
						UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
						VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
					}
					DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
					DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
					DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
					x += 32;
				}
				y += 8;
			}
			if (bytepos >= 0) {
				var fillbits = [];
				fillbits[1] = bytepos + 1;
				fillbits[0] = (1 << bytepos + 1) - 1;
				writeBits(fillbits);
			}
			writeWord(65497);
			if (typeof module === "undefined") return new Uint8Array(byteout);
			return Buffer.from(byteout);
		};
		function setQuality(quality) {
			if (quality <= 0) quality = 1;
			if (quality > 100) quality = 100;
			if (currentQuality == quality) return;
			var sf = 0;
			if (quality < 50) sf = Math.floor(5e3 / quality);
			else sf = Math.floor(200 - quality * 2);
			initQuantTables(sf);
			currentQuality = quality;
		}
		function init() {
			var time_start = (/* @__PURE__ */ new Date()).getTime();
			if (!quality) quality = 50;
			initCharLookupTable();
			initHuffmanTbl();
			initCategoryNumber();
			initRGBYUVTable();
			setQuality(quality);
			(/* @__PURE__ */ new Date()).getTime() - time_start;
		}
		init();
	}
	if (typeof module !== "undefined") module.exports = encode;
	else if (typeof window !== "undefined") {
		window["jpeg-js"] = window["jpeg-js"] || {};
		window["jpeg-js"].encode = encode;
	}
	function encode(imgData, qu) {
		if (typeof qu === "undefined") qu = 50;
		return {
			data: new JPEGEncoder(qu).encode(imgData, qu),
			width: imgData.width,
			height: imgData.height
		};
	}
}));
//#endregion
//#region ../../node_modules/jpeg-js/lib/decoder.js
var require_decoder = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var JpegImage = (function jpegImage() {
		"use strict";
		var dctZigZag = new Int32Array([
			0,
			1,
			8,
			16,
			9,
			2,
			3,
			10,
			17,
			24,
			32,
			25,
			18,
			11,
			4,
			5,
			12,
			19,
			26,
			33,
			40,
			48,
			41,
			34,
			27,
			20,
			13,
			6,
			7,
			14,
			21,
			28,
			35,
			42,
			49,
			56,
			57,
			50,
			43,
			36,
			29,
			22,
			15,
			23,
			30,
			37,
			44,
			51,
			58,
			59,
			52,
			45,
			38,
			31,
			39,
			46,
			53,
			60,
			61,
			54,
			47,
			55,
			62,
			63
		]);
		var dctCos1 = 4017;
		var dctSin1 = 799;
		var dctCos3 = 3406;
		var dctSin3 = 2276;
		var dctCos6 = 1567;
		var dctSin6 = 3784;
		var dctSqrt2 = 5793;
		var dctSqrt1d2 = 2896;
		function constructor() {}
		function buildHuffmanTable(codeLengths, values) {
			var k = 0, code = [], i, j, length = 16;
			while (length > 0 && !codeLengths[length - 1]) length--;
			code.push({
				children: [],
				index: 0
			});
			var p = code[0], q;
			for (i = 0; i < length; i++) {
				for (j = 0; j < codeLengths[i]; j++) {
					p = code.pop();
					p.children[p.index] = values[k];
					while (p.index > 0) {
						if (code.length === 0) throw new Error("Could not recreate Huffman Table");
						p = code.pop();
					}
					p.index++;
					code.push(p);
					while (code.length <= i) {
						code.push(q = {
							children: [],
							index: 0
						});
						p.children[p.index] = q.children;
						p = q;
					}
					k++;
				}
				if (i + 1 < length) {
					code.push(q = {
						children: [],
						index: 0
					});
					p.children[p.index] = q.children;
					p = q;
				}
			}
			return code[0].children;
		}
		function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
			frame.precision;
			frame.samplesPerLine;
			frame.scanLines;
			var mcusPerLine = frame.mcusPerLine;
			var progressive = frame.progressive;
			frame.maxH;
			frame.maxV;
			var startOffset = offset, bitsData = 0, bitsCount = 0;
			function readBit() {
				if (bitsCount > 0) {
					bitsCount--;
					return bitsData >> bitsCount & 1;
				}
				bitsData = data[offset++];
				if (bitsData == 255) {
					var nextByte = data[offset++];
					if (nextByte) throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
				}
				bitsCount = 7;
				return bitsData >>> 7;
			}
			function decodeHuffman(tree) {
				var node = tree, bit;
				while ((bit = readBit()) !== null) {
					node = node[bit];
					if (typeof node === "number") return node;
					if (typeof node !== "object") throw new Error("invalid huffman sequence");
				}
				return null;
			}
			function receive(length) {
				var n = 0;
				while (length > 0) {
					var bit = readBit();
					if (bit === null) return;
					n = n << 1 | bit;
					length--;
				}
				return n;
			}
			function receiveAndExtend(length) {
				var n = receive(length);
				if (n >= 1 << length - 1) return n;
				return n + (-1 << length) + 1;
			}
			function decodeBaseline(component, zz) {
				var t = decodeHuffman(component.huffmanTableDC);
				var diff = t === 0 ? 0 : receiveAndExtend(t);
				zz[0] = component.pred += diff;
				var k = 1;
				while (k < 64) {
					var rs = decodeHuffman(component.huffmanTableAC);
					var s = rs & 15, r = rs >> 4;
					if (s === 0) {
						if (r < 15) break;
						k += 16;
						continue;
					}
					k += r;
					var z = dctZigZag[k];
					zz[z] = receiveAndExtend(s);
					k++;
				}
			}
			function decodeDCFirst(component, zz) {
				var t = decodeHuffman(component.huffmanTableDC);
				var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
				zz[0] = component.pred += diff;
			}
			function decodeDCSuccessive(component, zz) {
				zz[0] |= readBit() << successive;
			}
			var eobrun = 0;
			function decodeACFirst(component, zz) {
				if (eobrun > 0) {
					eobrun--;
					return;
				}
				var k = spectralStart, e = spectralEnd;
				while (k <= e) {
					var rs = decodeHuffman(component.huffmanTableAC);
					var s = rs & 15, r = rs >> 4;
					if (s === 0) {
						if (r < 15) {
							eobrun = receive(r) + (1 << r) - 1;
							break;
						}
						k += 16;
						continue;
					}
					k += r;
					var z = dctZigZag[k];
					zz[z] = receiveAndExtend(s) * (1 << successive);
					k++;
				}
			}
			var successiveACState = 0, successiveACNextValue;
			function decodeACSuccessive(component, zz) {
				var k = spectralStart, e = spectralEnd, r = 0;
				while (k <= e) {
					var z = dctZigZag[k];
					var direction = zz[z] < 0 ? -1 : 1;
					switch (successiveACState) {
						case 0:
							var rs = decodeHuffman(component.huffmanTableAC);
							var s = rs & 15, r = rs >> 4;
							if (s === 0) {
								if (r < 15) {
									eobrun = receive(r) + (1 << r);
									successiveACState = 4;
								} else {
									r = 16;
									successiveACState = 1;
								}
							} else {
								if (s !== 1) throw new Error("invalid ACn encoding");
								successiveACNextValue = receiveAndExtend(s);
								successiveACState = r ? 2 : 3;
							}
							continue;
						case 1:
						case 2:
							if (zz[z]) zz[z] += (readBit() << successive) * direction;
							else {
								r--;
								if (r === 0) successiveACState = successiveACState == 2 ? 3 : 0;
							}
							break;
						case 3:
							if (zz[z]) zz[z] += (readBit() << successive) * direction;
							else {
								zz[z] = successiveACNextValue << successive;
								successiveACState = 0;
							}
							break;
						case 4: if (zz[z]) zz[z] += (readBit() << successive) * direction;
					}
					k++;
				}
				if (successiveACState === 4) {
					eobrun--;
					if (eobrun === 0) successiveACState = 0;
				}
			}
			function decodeMcu(component, decode, mcu, row, col) {
				var mcuRow = mcu / mcusPerLine | 0;
				var mcuCol = mcu % mcusPerLine;
				var blockRow = mcuRow * component.v + row;
				var blockCol = mcuCol * component.h + col;
				if (component.blocks[blockRow] === void 0 && opts.tolerantDecoding) return;
				decode(component, component.blocks[blockRow][blockCol]);
			}
			function decodeBlock(component, decode, mcu) {
				var blockRow = mcu / component.blocksPerLine | 0;
				var blockCol = mcu % component.blocksPerLine;
				if (component.blocks[blockRow] === void 0 && opts.tolerantDecoding) return;
				decode(component, component.blocks[blockRow][blockCol]);
			}
			var componentsLength = components.length;
			var component, i, j, k, n;
			var decodeFn;
			if (progressive) {
				if (spectralStart === 0) decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
				else decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
			} else decodeFn = decodeBaseline;
			var mcu = 0, marker;
			var mcuExpected;
			if (componentsLength == 1) mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
			else mcuExpected = mcusPerLine * frame.mcusPerColumn;
			if (!resetInterval) resetInterval = mcuExpected;
			var h, v;
			while (mcu < mcuExpected) {
				for (i = 0; i < componentsLength; i++) components[i].pred = 0;
				eobrun = 0;
				if (componentsLength == 1) {
					component = components[0];
					for (n = 0; n < resetInterval; n++) {
						decodeBlock(component, decodeFn, mcu);
						mcu++;
					}
				} else for (n = 0; n < resetInterval; n++) {
					for (i = 0; i < componentsLength; i++) {
						component = components[i];
						h = component.h;
						v = component.v;
						for (j = 0; j < v; j++) for (k = 0; k < h; k++) decodeMcu(component, decodeFn, mcu, j, k);
					}
					mcu++;
					if (mcu === mcuExpected) break;
				}
				if (mcu === mcuExpected) do {
					if (data[offset] === 255) {
						if (data[offset + 1] !== 0) break;
					}
					offset += 1;
				} while (offset < data.length - 2);
				bitsCount = 0;
				marker = data[offset] << 8 | data[offset + 1];
				if (marker < 65280) throw new Error("marker was not found");
				if (marker >= 65488 && marker <= 65495) offset += 2;
				else break;
			}
			return offset - startOffset;
		}
		function buildComponentData(frame, component) {
			var lines = [];
			var blocksPerLine = component.blocksPerLine;
			var blocksPerColumn = component.blocksPerColumn;
			var samplesPerLine = blocksPerLine << 3;
			var R = /* @__PURE__ */ new Int32Array(64), r = /* @__PURE__ */ new Uint8Array(64);
			function quantizeAndInverse(zz, dataOut, dataIn) {
				var qt = component.quantizationTable;
				var v0, v1, v2, v3, v4, v5, v6, v7, t;
				var p = dataIn;
				var i = 0;
				for (; i < 64; i++) p[i] = zz[i] * qt[i];
				for (i = 0; i < 8; ++i) {
					var row = 8 * i;
					if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
						t = dctSqrt2 * p[0 + row] + 512 >> 10;
						p[0 + row] = t;
						p[1 + row] = t;
						p[2 + row] = t;
						p[3 + row] = t;
						p[4 + row] = t;
						p[5 + row] = t;
						p[6 + row] = t;
						p[7 + row] = t;
						continue;
					}
					v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
					v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
					v2 = p[2 + row];
					v3 = p[6 + row];
					v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
					v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
					v5 = p[3 + row] << 4;
					v6 = p[5 + row] << 4;
					t = v0 - v1 + 1 >> 1;
					v0 = v0 + v1 + 1 >> 1;
					v1 = t;
					t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
					v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
					v3 = t;
					t = v4 - v6 + 1 >> 1;
					v4 = v4 + v6 + 1 >> 1;
					v6 = t;
					t = v7 + v5 + 1 >> 1;
					v5 = v7 - v5 + 1 >> 1;
					v7 = t;
					t = v0 - v3 + 1 >> 1;
					v0 = v0 + v3 + 1 >> 1;
					v3 = t;
					t = v1 - v2 + 1 >> 1;
					v1 = v1 + v2 + 1 >> 1;
					v2 = t;
					t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
					v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
					v7 = t;
					t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
					v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
					v6 = t;
					p[0 + row] = v0 + v7;
					p[7 + row] = v0 - v7;
					p[1 + row] = v1 + v6;
					p[6 + row] = v1 - v6;
					p[2 + row] = v2 + v5;
					p[5 + row] = v2 - v5;
					p[3 + row] = v3 + v4;
					p[4 + row] = v3 - v4;
				}
				for (i = 0; i < 8; ++i) {
					var col = i;
					if (p[8 + col] == 0 && p[16 + col] == 0 && p[24 + col] == 0 && p[32 + col] == 0 && p[40 + col] == 0 && p[48 + col] == 0 && p[56 + col] == 0) {
						t = dctSqrt2 * dataIn[i + 0] + 8192 >> 14;
						p[0 + col] = t;
						p[8 + col] = t;
						p[16 + col] = t;
						p[24 + col] = t;
						p[32 + col] = t;
						p[40 + col] = t;
						p[48 + col] = t;
						p[56 + col] = t;
						continue;
					}
					v0 = dctSqrt2 * p[0 + col] + 2048 >> 12;
					v1 = dctSqrt2 * p[32 + col] + 2048 >> 12;
					v2 = p[16 + col];
					v3 = p[48 + col];
					v4 = dctSqrt1d2 * (p[8 + col] - p[56 + col]) + 2048 >> 12;
					v7 = dctSqrt1d2 * (p[8 + col] + p[56 + col]) + 2048 >> 12;
					v5 = p[24 + col];
					v6 = p[40 + col];
					t = v0 - v1 + 1 >> 1;
					v0 = v0 + v1 + 1 >> 1;
					v1 = t;
					t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
					v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
					v3 = t;
					t = v4 - v6 + 1 >> 1;
					v4 = v4 + v6 + 1 >> 1;
					v6 = t;
					t = v7 + v5 + 1 >> 1;
					v5 = v7 - v5 + 1 >> 1;
					v7 = t;
					t = v0 - v3 + 1 >> 1;
					v0 = v0 + v3 + 1 >> 1;
					v3 = t;
					t = v1 - v2 + 1 >> 1;
					v1 = v1 + v2 + 1 >> 1;
					v2 = t;
					t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
					v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
					v7 = t;
					t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
					v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
					v6 = t;
					p[0 + col] = v0 + v7;
					p[56 + col] = v0 - v7;
					p[8 + col] = v1 + v6;
					p[48 + col] = v1 - v6;
					p[16 + col] = v2 + v5;
					p[40 + col] = v2 - v5;
					p[24 + col] = v3 + v4;
					p[32 + col] = v3 - v4;
				}
				for (i = 0; i < 64; ++i) {
					var sample = 128 + (p[i] + 8 >> 4);
					dataOut[i] = sample < 0 ? 0 : sample > 255 ? 255 : sample;
				}
			}
			requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
			var i, j;
			for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
				var scanLine = blockRow << 3;
				for (i = 0; i < 8; i++) lines.push(new Uint8Array(samplesPerLine));
				for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
					quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
					var offset = 0, sample = blockCol << 3;
					for (j = 0; j < 8; j++) {
						var line = lines[scanLine + j];
						for (i = 0; i < 8; i++) line[sample + i] = r[offset++];
					}
				}
			}
			return lines;
		}
		function clampTo8bit(a) {
			return a < 0 ? 0 : a > 255 ? 255 : a;
		}
		constructor.prototype = {
			load: function load(path) {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", path, true);
				xhr.responseType = "arraybuffer";
				xhr.onload = (function() {
					var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
					this.parse(data);
					if (this.onload) this.onload();
				}).bind(this);
				xhr.send(null);
			},
			parse: function parse(data) {
				var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3, offset = 0;
				data.length;
				function readUint16() {
					var value = data[offset] << 8 | data[offset + 1];
					offset += 2;
					return value;
				}
				function readDataBlock() {
					var length = readUint16();
					var array = data.subarray(offset, offset + length - 2);
					offset += array.length;
					return array;
				}
				function prepareComponents(frame) {
					var maxH = 1, maxV = 1;
					var component, componentId;
					for (componentId in frame.components) if (frame.components.hasOwnProperty(componentId)) {
						component = frame.components[componentId];
						if (maxH < component.h) maxH = component.h;
						if (maxV < component.v) maxV = component.v;
					}
					var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
					var mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
					for (componentId in frame.components) if (frame.components.hasOwnProperty(componentId)) {
						component = frame.components[componentId];
						var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / maxH);
						var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / maxV);
						var blocksPerLineForMcu = mcusPerLine * component.h;
						var blocksPerColumnForMcu = mcusPerColumn * component.v;
						var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
						var blocks = [];
						requestMemoryAllocation(blocksToAllocate * 256);
						for (var i = 0; i < blocksPerColumnForMcu; i++) {
							var row = [];
							for (var j = 0; j < blocksPerLineForMcu; j++) row.push(/* @__PURE__ */ new Int32Array(64));
							blocks.push(row);
						}
						component.blocksPerLine = blocksPerLine;
						component.blocksPerColumn = blocksPerColumn;
						component.blocks = blocks;
					}
					frame.maxH = maxH;
					frame.maxV = maxV;
					frame.mcusPerLine = mcusPerLine;
					frame.mcusPerColumn = mcusPerColumn;
				}
				var jfif = null;
				var adobe = null;
				var frame, resetInterval;
				var quantizationTables = [], frames = [];
				var huffmanTablesAC = [], huffmanTablesDC = [];
				var fileMarker = readUint16();
				var malformedDataOffset = -1;
				this.comments = [];
				if (fileMarker != 65496) throw new Error("SOI not found");
				fileMarker = readUint16();
				while (fileMarker != 65497) {
					var i, j;
					switch (fileMarker) {
						case 65280: break;
						case 65504:
						case 65505:
						case 65506:
						case 65507:
						case 65508:
						case 65509:
						case 65510:
						case 65511:
						case 65512:
						case 65513:
						case 65514:
						case 65515:
						case 65516:
						case 65517:
						case 65518:
						case 65519:
						case 65534:
							var appData = readDataBlock();
							if (fileMarker === 65534) {
								var comment = String.fromCharCode.apply(null, appData);
								this.comments.push(comment);
							}
							if (fileMarker === 65504) {
								if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) jfif = {
									version: {
										major: appData[5],
										minor: appData[6]
									},
									densityUnits: appData[7],
									xDensity: appData[8] << 8 | appData[9],
									yDensity: appData[10] << 8 | appData[11],
									thumbWidth: appData[12],
									thumbHeight: appData[13],
									thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
								};
							}
							if (fileMarker === 65505) {
								if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) this.exifBuffer = appData.subarray(5, appData.length);
							}
							if (fileMarker === 65518) {
								if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) adobe = {
									version: appData[6],
									flags0: appData[7] << 8 | appData[8],
									flags1: appData[9] << 8 | appData[10],
									transformCode: appData[11]
								};
							}
							break;
						case 65499:
							var quantizationTablesEnd = readUint16() + offset - 2;
							while (offset < quantizationTablesEnd) {
								var quantizationTableSpec = data[offset++];
								requestMemoryAllocation(256);
								var tableData = /* @__PURE__ */ new Int32Array(64);
								if (quantizationTableSpec >> 4 === 0) for (j = 0; j < 64; j++) {
									var z = dctZigZag[j];
									tableData[z] = data[offset++];
								}
								else if (quantizationTableSpec >> 4 === 1) for (j = 0; j < 64; j++) {
									var z = dctZigZag[j];
									tableData[z] = readUint16();
								}
								else throw new Error("DQT: invalid table spec");
								quantizationTables[quantizationTableSpec & 15] = tableData;
							}
							break;
						case 65472:
						case 65473:
						case 65474:
							readUint16();
							frame = {};
							frame.extended = fileMarker === 65473;
							frame.progressive = fileMarker === 65474;
							frame.precision = data[offset++];
							frame.scanLines = readUint16();
							frame.samplesPerLine = readUint16();
							frame.components = {};
							frame.componentsOrder = [];
							var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
							if (pixelsInFrame > maxResolutionInPixels) {
								var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
								throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
							}
							var componentsCount = data[offset++], componentId;
							for (i = 0; i < componentsCount; i++) {
								componentId = data[offset];
								var h = data[offset + 1] >> 4;
								var v = data[offset + 1] & 15;
								var qId = data[offset + 2];
								if (h <= 0 || v <= 0) throw new Error("Invalid sampling factor, expected values above 0");
								frame.componentsOrder.push(componentId);
								frame.components[componentId] = {
									h,
									v,
									quantizationIdx: qId
								};
								offset += 3;
							}
							prepareComponents(frame);
							frames.push(frame);
							break;
						case 65476:
							var huffmanLength = readUint16();
							for (i = 2; i < huffmanLength;) {
								var huffmanTableSpec = data[offset++];
								var codeLengths = /* @__PURE__ */ new Uint8Array(16);
								var codeLengthSum = 0;
								for (j = 0; j < 16; j++, offset++) codeLengthSum += codeLengths[j] = data[offset];
								requestMemoryAllocation(16 + codeLengthSum);
								var huffmanValues = new Uint8Array(codeLengthSum);
								for (j = 0; j < codeLengthSum; j++, offset++) huffmanValues[j] = data[offset];
								i += 17 + codeLengthSum;
								(huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
							}
							break;
						case 65501:
							readUint16();
							resetInterval = readUint16();
							break;
						case 65500:
							readUint16();
							readUint16();
							break;
						case 65498:
							readUint16();
							var selectorsCount = data[offset++];
							var components = [], component;
							for (i = 0; i < selectorsCount; i++) {
								component = frame.components[data[offset++]];
								var tableSpec = data[offset++];
								component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
								component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
								components.push(component);
							}
							var spectralStart = data[offset++];
							var spectralEnd = data[offset++];
							var successiveApproximation = data[offset++];
							var processed = decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15, this.opts);
							offset += processed;
							break;
						case 65535:
							if (data[offset] !== 255) offset--;
							break;
						default:
							if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
								offset -= 3;
								break;
							} else if (fileMarker === 224 || fileMarker == 225) {
								if (malformedDataOffset !== -1) throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
								malformedDataOffset = offset - 1;
								const nextOffset = readUint16();
								if (data[offset + nextOffset - 2] === 255) {
									offset += nextOffset - 2;
									break;
								}
							}
							throw new Error("unknown JPEG marker " + fileMarker.toString(16));
					}
					fileMarker = readUint16();
				}
				if (frames.length != 1) throw new Error("only single frame JPEGs supported");
				for (var i = 0; i < frames.length; i++) {
					var cp = frames[i].components;
					for (var j in cp) {
						cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
						delete cp[j].quantizationIdx;
					}
				}
				this.width = frame.samplesPerLine;
				this.height = frame.scanLines;
				this.jfif = jfif;
				this.adobe = adobe;
				this.components = [];
				for (var i = 0; i < frame.componentsOrder.length; i++) {
					var component = frame.components[frame.componentsOrder[i]];
					this.components.push({
						lines: buildComponentData(frame, component),
						scaleX: component.h / frame.maxH,
						scaleY: component.v / frame.maxV
					});
				}
			},
			getData: function getData(width, height) {
				var scaleX = this.width / width, scaleY = this.height / height;
				var component1, component2, component3, component4;
				var component1Line, component2Line, component3Line, component4Line;
				var x, y;
				var offset = 0;
				var Y, Cb, Cr, K, C, M, Ye, R, G, B;
				var colorTransform;
				var dataLength = width * height * this.components.length;
				requestMemoryAllocation(dataLength);
				var data = new Uint8Array(dataLength);
				switch (this.components.length) {
					case 1:
						component1 = this.components[0];
						for (y = 0; y < height; y++) {
							component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
							for (x = 0; x < width; x++) {
								Y = component1Line[0 | x * component1.scaleX * scaleX];
								data[offset++] = Y;
							}
						}
						break;
					case 2:
						component1 = this.components[0];
						component2 = this.components[1];
						for (y = 0; y < height; y++) {
							component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
							component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
							for (x = 0; x < width; x++) {
								Y = component1Line[0 | x * component1.scaleX * scaleX];
								data[offset++] = Y;
								Y = component2Line[0 | x * component2.scaleX * scaleX];
								data[offset++] = Y;
							}
						}
						break;
					case 3:
						colorTransform = true;
						if (this.adobe && this.adobe.transformCode) colorTransform = true;
						else if (typeof this.opts.colorTransform !== "undefined") colorTransform = !!this.opts.colorTransform;
						component1 = this.components[0];
						component2 = this.components[1];
						component3 = this.components[2];
						for (y = 0; y < height; y++) {
							component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
							component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
							component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
							for (x = 0; x < width; x++) {
								if (!colorTransform) {
									R = component1Line[0 | x * component1.scaleX * scaleX];
									G = component2Line[0 | x * component2.scaleX * scaleX];
									B = component3Line[0 | x * component3.scaleX * scaleX];
								} else {
									Y = component1Line[0 | x * component1.scaleX * scaleX];
									Cb = component2Line[0 | x * component2.scaleX * scaleX];
									Cr = component3Line[0 | x * component3.scaleX * scaleX];
									R = clampTo8bit(Y + 1.402 * (Cr - 128));
									G = clampTo8bit(Y - .3441363 * (Cb - 128) - .71413636 * (Cr - 128));
									B = clampTo8bit(Y + 1.772 * (Cb - 128));
								}
								data[offset++] = R;
								data[offset++] = G;
								data[offset++] = B;
							}
						}
						break;
					case 4:
						if (!this.adobe) throw new Error("Unsupported color mode (4 components)");
						colorTransform = false;
						if (this.adobe && this.adobe.transformCode) colorTransform = true;
						else if (typeof this.opts.colorTransform !== "undefined") colorTransform = !!this.opts.colorTransform;
						component1 = this.components[0];
						component2 = this.components[1];
						component3 = this.components[2];
						component4 = this.components[3];
						for (y = 0; y < height; y++) {
							component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
							component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
							component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
							component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
							for (x = 0; x < width; x++) {
								if (!colorTransform) {
									C = component1Line[0 | x * component1.scaleX * scaleX];
									M = component2Line[0 | x * component2.scaleX * scaleX];
									Ye = component3Line[0 | x * component3.scaleX * scaleX];
									K = component4Line[0 | x * component4.scaleX * scaleX];
								} else {
									Y = component1Line[0 | x * component1.scaleX * scaleX];
									Cb = component2Line[0 | x * component2.scaleX * scaleX];
									Cr = component3Line[0 | x * component3.scaleX * scaleX];
									K = component4Line[0 | x * component4.scaleX * scaleX];
									C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
									M = 255 - clampTo8bit(Y - .3441363 * (Cb - 128) - .71413636 * (Cr - 128));
									Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
								}
								data[offset++] = 255 - C;
								data[offset++] = 255 - M;
								data[offset++] = 255 - Ye;
								data[offset++] = 255 - K;
							}
						}
						break;
					default: throw new Error("Unsupported color mode");
				}
				return data;
			},
			copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
				var width = imageData.width, height = imageData.height;
				var imageDataArray = imageData.data;
				var data = this.getData(width, height);
				var i = 0, j = 0, x, y;
				var Y, K, C, M, R, G, B;
				switch (this.components.length) {
					case 1:
						for (y = 0; y < height; y++) for (x = 0; x < width; x++) {
							Y = data[i++];
							imageDataArray[j++] = Y;
							imageDataArray[j++] = Y;
							imageDataArray[j++] = Y;
							if (formatAsRGBA) imageDataArray[j++] = 255;
						}
						break;
					case 3:
						for (y = 0; y < height; y++) for (x = 0; x < width; x++) {
							R = data[i++];
							G = data[i++];
							B = data[i++];
							imageDataArray[j++] = R;
							imageDataArray[j++] = G;
							imageDataArray[j++] = B;
							if (formatAsRGBA) imageDataArray[j++] = 255;
						}
						break;
					case 4:
						for (y = 0; y < height; y++) for (x = 0; x < width; x++) {
							C = data[i++];
							M = data[i++];
							Y = data[i++];
							K = data[i++];
							R = 255 - clampTo8bit(C * (1 - K / 255) + K);
							G = 255 - clampTo8bit(M * (1 - K / 255) + K);
							B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
							imageDataArray[j++] = R;
							imageDataArray[j++] = G;
							imageDataArray[j++] = B;
							if (formatAsRGBA) imageDataArray[j++] = 255;
						}
						break;
					default: throw new Error("Unsupported color mode");
				}
			}
		};
		var totalBytesAllocated = 0;
		var maxMemoryUsageBytes = 0;
		function requestMemoryAllocation(increaseAmount = 0) {
			var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
			if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
				var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
				throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
			}
			totalBytesAllocated = totalMemoryImpactBytes;
		}
		constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
			totalBytesAllocated = 0;
			maxMemoryUsageBytes = maxMemoryUsageBytes_;
		};
		constructor.getBytesAllocated = function() {
			return totalBytesAllocated;
		};
		constructor.requestMemoryAllocation = requestMemoryAllocation;
		return constructor;
	})();
	if (typeof module !== "undefined") module.exports = decode;
	else if (typeof window !== "undefined") {
		window["jpeg-js"] = window["jpeg-js"] || {};
		window["jpeg-js"].decode = decode;
	}
	function decode(jpegData, userOpts = {}) {
		var opts = {
			colorTransform: void 0,
			useTArray: false,
			formatAsRGBA: true,
			tolerantDecoding: true,
			maxResolutionInMP: 100,
			maxMemoryUsageInMB: 512,
			...userOpts
		};
		var arr = new Uint8Array(jpegData);
		var decoder = new JpegImage();
		decoder.opts = opts;
		JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
		decoder.parse(arr);
		var channels = opts.formatAsRGBA ? 4 : 3;
		var bytesNeeded = decoder.width * decoder.height * channels;
		try {
			JpegImage.requestMemoryAllocation(bytesNeeded);
			var image = {
				width: decoder.width,
				height: decoder.height,
				exifBuffer: decoder.exifBuffer,
				data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
			};
			if (decoder.comments.length > 0) image["comments"] = decoder.comments;
		} catch (err) {
			if (err instanceof RangeError) throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
			if (err instanceof ReferenceError) {
				if (err.message === "Buffer is not defined") throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
			}
			throw err;
		}
		decoder.copyToImageData(image, opts.formatAsRGBA);
		return image;
	}
}));
//#endregion
//#region tests/baseline/.src/src/render.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
var import_jpeg_js = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		encode: require_encoder(),
		decode: require_decoder()
	};
})))(), 1);
/** @internal */
function resolveRenderOptions(options) {
	const logo = options.logo ?? null;
	const size = options.size ?? 512;
	const quietZone = options.quietZone ?? 1;
	if (!Number.isInteger(size) || size < 1) throw MurError.invalidParameter(`size must be a positive integer, got ${size}`);
	if (!Number.isInteger(quietZone) || quietZone < 0) throw MurError.invalidParameter(`quiet zone must be a non-negative integer, got ${quietZone}`);
	return {
		correction: options.correction ?? (logo ? "high" : "low"),
		size,
		foreground: Color.from(options.foreground ?? Color.BLACK),
		background: Color.from(options.background ?? Color.WHITE),
		quietZone,
		logo
	};
}
/** A rendered QR code: an RGBA raster with PNG and JPEG encoders. */
var RenderedImage = class {
	width;
	height;
	pixels;
	channels = 4;
	constructor(image) {
		this.width = image.width;
		this.height = image.height;
		this.pixels = image.pixels;
	}
	toPng() {
		try {
			return encodePng({
				width: this.width,
				height: this.height,
				data: this.pixels,
				depth: 8,
				channels: 4
			});
		} catch (e) {
			throw MurError.imageEncode(messageOf(e), e);
		}
	}
	/** JPEG bytes at `quality` 1–100 (default 90). Alpha is dropped. */
	toJpeg(options = {}) {
		try {
			const result = import_jpeg_js.encode({
				data: this.pixels,
				width: this.width,
				height: this.height
			}, options.quality ?? 90);
			return result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
		} catch (e) {
			throw MurError.imageEncode(messageOf(e), e);
		}
	}
};
/** Renders `message` (raw bytes) as a QR code. */
function renderQr(message, options = {}) {
	const resolved = resolveRenderOptions(options);
	return renderFromMatrix(QrMatrix.encode(message, resolved.correction), resolved);
}
/** Renders a UR (its string form, upper-cased for QR alphanumeric mode) as a QR code. */
function renderUrQr(ur, options = {}) {
	return renderQr(urBytes(ur), options);
}
/** @internal The bytes a UR string encodes to: upper-cased UTF-8. */
function urBytes(ur) {
	return new TextEncoder().encode(String(ur).toUpperCase());
}
/** @internal */
function renderFromMatrix(matrix, o) {
	const qrModules = matrix.width();
	const totalModules = qrModules + 2 * o.quietZone;
	const pixelsPerModule = Math.max(1, Math.floor(o.size / totalModules));
	const compositingSize = totalModules * pixelsPerModule;
	const qzPx = o.quietZone * pixelsPerModule;
	const pixels = new Uint8Array(compositingSize * compositingSize * 4);
	const words = new Uint32Array(pixels.buffer);
	const fg = packColor(o.foreground);
	const bg = packColor(o.background);
	words.fill(bg);
	for (let row = 0; row < qrModules; row++) {
		const py = qzPx + row * pixelsPerModule;
		for (let col = 0; col < qrModules; col++) {
			if (!matrix.isDark(col, row)) continue;
			fillRect(words, compositingSize, qzPx + col * pixelsPerModule, py, pixelsPerModule, pixelsPerModule, fg);
		}
	}
	if (o.logo) compositeLogo(pixels, words, compositingSize, qrModules, pixelsPerModule, qzPx, o.background, o.logo);
	const finalPixels = compositingSize !== o.size ? nearestNeighborScale(pixels, compositingSize, compositingSize, o.size, o.size) : pixels;
	return new RenderedImage({
		width: o.size,
		height: o.size,
		pixels: finalPixels
	});
}
/** The colour as one 32-bit word in the platform's byte order, for `Uint32Array` fills. */
function packColor(color) {
	return new Uint32Array(color.bytes.buffer)[0];
}
function fillRect(words, stride, x, y, w, h, packed) {
	for (let row = y; row < y + h; row++) {
		const start = row * stride + x;
		words.fill(packed, start, start + w);
	}
}
function compositeLogo(pixels, words, compositingSize, moduleCount, pixelsPerModule, qzPx, background, logo) {
	const layout = new LogoLayout(moduleCount, logo.fraction, logo.clearBorder);
	if (layout.logoModules === 0) return;
	const clear = packColor(background.isTransparent ? Color.WHITE : background);
	const centerModule = moduleCount / 2;
	const qrPx = moduleCount * pixelsPerModule;
	const startModule = Math.floor((moduleCount - layout.clearedModules) / 2);
	switch (logo.clearShape) {
		case "square": {
			const clearPixels = layout.clearedModules * pixelsPerModule;
			const clearOrigin = qzPx + Math.floor((qrPx - clearPixels) / 2);
			fillRect(words, compositingSize, clearOrigin, clearOrigin, clearPixels, clearPixels, clear);
			break;
		}
		case "circle": {
			const radius = layout.clearedModules / 2;
			for (let row = 0; row < layout.clearedModules; row++) for (let col = 0; col < layout.clearedModules; col++) {
				const dx = startModule + col + .5 - centerModule;
				const dy = startModule + row + .5 - centerModule;
				if (dx * dx + dy * dy <= radius * radius) fillRect(words, compositingSize, qzPx + (startModule + col) * pixelsPerModule, qzPx + (startModule + row) * pixelsPerModule, pixelsPerModule, pixelsPerModule, clear);
			}
			break;
		}
	}
	const logoPixels = layout.logoModules * pixelsPerModule;
	const logoOrigin = qzPx + Math.floor((qrPx - logoPixels) / 2);
	const scaled = bilinearScale(logo.pixels, logo.width, logo.height, logoPixels, logoPixels);
	for (let row = 0; row < logoPixels; row++) {
		let srcOffset = row * logoPixels * 4;
		let dstOffset = ((logoOrigin + row) * compositingSize + logoOrigin) * 4;
		for (let col = 0; col < logoPixels; col++, srcOffset += 4, dstOffset += 4) {
			const sa = scaled[srcOffset + 3];
			if (sa === 0) continue;
			if (sa === 255) {
				pixels[dstOffset] = scaled[srcOffset];
				pixels[dstOffset + 1] = scaled[srcOffset + 1];
				pixels[dstOffset + 2] = scaled[srcOffset + 2];
				pixels[dstOffset + 3] = 255;
				continue;
			}
			const da = pixels[dstOffset + 3];
			const invSa = 255 - sa;
			const outA = sa + Math.floor(da * invSa / 255);
			if (outA > 0) {
				for (let c = 0; c < 3; c++) {
					const sc = scaled[srcOffset + c];
					const dc = pixels[dstOffset + c];
					pixels[dstOffset + c] = Math.floor((sc * sa + Math.floor(dc * da * invSa / 255)) / outA) & 255;
				}
				pixels[dstOffset + 3] = Math.min(outA, 255);
			}
		}
	}
}
/** @internal How many modules the logo and its cleared area span. */
var LogoLayout = class {
	logoModules;
	clearedModules;
	constructor(moduleCount, fraction, clearBorder) {
		let logo = Math.round(moduleCount * fraction);
		if (logo % 2 === 0) logo += 1;
		let cleared = logo + 2 * clearBorder;
		const maxCleared = Math.floor(moduleCount * .4);
		if (cleared > maxCleared) {
			cleared = maxCleared;
			logo = Math.max(0, cleared - 2 * clearBorder);
		}
		if (logo % 2 === 0 && logo > 0) logo -= 1;
		this.logoModules = logo;
		this.clearedModules = cleared;
	}
};
/** @internal */
function nearestNeighborScale(src, srcW, srcH, dstW, dstH) {
	const dst = new Uint8Array(dstW * dstH * 4);
	const src32 = src.byteOffset % 4 === 0 && src.byteLength % 4 === 0 ? new Uint32Array(src.buffer, src.byteOffset, src.byteLength / 4) : new Uint32Array(src.slice().buffer);
	const dst32 = new Uint32Array(dst.buffer);
	for (let y = 0; y < dstH; y++) {
		const srcRow = Math.min(Math.floor(y * srcH / dstH), srcH - 1) * srcW;
		const dstRow = y * dstW;
		for (let x = 0; x < dstW; x++) {
			const sx = Math.min(Math.floor(x * srcW / dstW), srcW - 1);
			dst32[dstRow + x] = src32[srcRow + sx];
		}
	}
	return dst;
}
/** @internal */
function bilinearScale(src, srcW, srcH, dstW, dstH) {
	const dst = new Uint8Array(dstW * dstH * 4);
	const xDen = Math.max(dstW - 1, 1);
	const yDen = Math.max(dstH - 1, 1);
	for (let y = 0; y < dstH; y++) {
		const fy = y * (srcH - 1) / yDen;
		const y0 = Math.floor(fy);
		const y1 = Math.min(y0 + 1, srcH - 1);
		const wy = fy - y0;
		const row0 = y0 * srcW;
		const row1 = y1 * srcW;
		let di = y * dstW * 4;
		for (let x = 0; x < dstW; x++, di += 4) {
			const fx = x * (srcW - 1) / xDen;
			const x0 = Math.floor(fx);
			const x1 = Math.min(x0 + 1, srcW - 1);
			const wx = fx - x0;
			const i00 = (row0 + x0) * 4;
			const i10 = (row0 + x1) * 4;
			const i01 = (row1 + x0) * 4;
			const i11 = (row1 + x1) * 4;
			for (let c = 0; c < 4; c++) {
				const v = src[i00 + c] * (1 - wx) * (1 - wy) + src[i10 + c] * wx * (1 - wy) + src[i01 + c] * (1 - wx) * wy + src[i11 + c] * wx * wy;
				dst[di + c] = Math.round(v) & 255;
			}
		}
	}
	return dst;
}
//#endregion
//#region tests/baseline/.src/src/frames.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
/**
* Renders the multipart sequence of `ur` (a `UR` or its string form). The
* sequence is the fountain encoder's, in order: the first `partCount` frames
* are the plain fragments, the rest are mixed parts.
*/
function generateFrames(ur, options = {}) {
	const render = resolveRenderOptions(options);
	const maxFragmentLen = options.maxFragmentLen ?? 40;
	const cycles = options.cycles ?? 3;
	let encoder;
	try {
		encoder = new MultipartEncoder(typeof ur === "string" ? UR.parse(ur) : ur, maxFragmentLen);
	} catch (e) {
		throw MurError.ur(messageOf(e), e);
	}
	const partsCount = encoder.partCount;
	const totalFrames = options.frameCount ?? partsCount * cycles;
	if (totalFrames < partsCount) throw MurError.insufficientFrames(totalFrames, partsCount);
	const frames = [];
	for (let i = 0; i < totalFrames; i++) {
		let part;
		try {
			part = encoder.nextPart();
		} catch (e) {
			throw MurError.ur(messageOf(e), e);
		}
		const index = encoder.index;
		const matrix = QrMatrix.encode(new TextEncoder().encode(part.toUpperCase()), render.correction);
		if (i === 0 && options.maxModules !== void 0) checkQrDensity(matrix.width(), options.maxModules);
		frames.push({
			image: renderFromMatrix(matrix, render),
			index
		});
	}
	return frames;
}
/** Writes `0000.png`, `0001.png`, … into `outputDir` (created if needed). Node only. */
async function writeFramePngs(frames, outputDir) {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");
	await fs.mkdir(outputDir, { recursive: true });
	for (let i = 0; i < frames.length; i++) {
		const file = path.join(outputDir, `${String(i).padStart(4, "0")}.png`);
		await fs.writeFile(file, frames[i].image.toPng());
	}
}
//#endregion
//#region tests/baseline/.src/src/image.ts
var import_omggif = (/* @__PURE__ */ __commonJSMin(((exports) => {
	function GifWriter(buf, width, height, gopts) {
		var p = 0;
		var gopts = gopts === void 0 ? {} : gopts;
		var loop_count = gopts.loop === void 0 ? null : gopts.loop;
		var global_palette = gopts.palette === void 0 ? null : gopts.palette;
		if (width <= 0 || height <= 0 || width > 65535 || height > 65535) throw new Error("Width/Height invalid.");
		function check_palette_and_num_colors(palette) {
			var num_colors = palette.length;
			if (num_colors < 2 || num_colors > 256 || num_colors & num_colors - 1) throw new Error("Invalid code/color length, must be power of 2 and 2 .. 256.");
			return num_colors;
		}
		buf[p++] = 71;
		buf[p++] = 73;
		buf[p++] = 70;
		buf[p++] = 56;
		buf[p++] = 57;
		buf[p++] = 97;
		var gp_num_colors_pow2 = 0;
		var background = 0;
		if (global_palette !== null) {
			var gp_num_colors = check_palette_and_num_colors(global_palette);
			while (gp_num_colors >>= 1) ++gp_num_colors_pow2;
			gp_num_colors = 1 << gp_num_colors_pow2;
			--gp_num_colors_pow2;
			if (gopts.background !== void 0) {
				background = gopts.background;
				if (background >= gp_num_colors) throw new Error("Background index out of range.");
				if (background === 0) throw new Error("Background index explicitly passed as 0.");
			}
		}
		buf[p++] = width & 255;
		buf[p++] = width >> 8 & 255;
		buf[p++] = height & 255;
		buf[p++] = height >> 8 & 255;
		buf[p++] = (global_palette !== null ? 128 : 0) | gp_num_colors_pow2;
		buf[p++] = background;
		buf[p++] = 0;
		if (global_palette !== null) for (var i = 0, il = global_palette.length; i < il; ++i) {
			var rgb = global_palette[i];
			buf[p++] = rgb >> 16 & 255;
			buf[p++] = rgb >> 8 & 255;
			buf[p++] = rgb & 255;
		}
		if (loop_count !== null) {
			if (loop_count < 0 || loop_count > 65535) throw new Error("Loop count invalid.");
			buf[p++] = 33;
			buf[p++] = 255;
			buf[p++] = 11;
			buf[p++] = 78;
			buf[p++] = 69;
			buf[p++] = 84;
			buf[p++] = 83;
			buf[p++] = 67;
			buf[p++] = 65;
			buf[p++] = 80;
			buf[p++] = 69;
			buf[p++] = 50;
			buf[p++] = 46;
			buf[p++] = 48;
			buf[p++] = 3;
			buf[p++] = 1;
			buf[p++] = loop_count & 255;
			buf[p++] = loop_count >> 8 & 255;
			buf[p++] = 0;
		}
		var ended = false;
		this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
			if (ended === true) {
				--p;
				ended = false;
			}
			opts = opts === void 0 ? {} : opts;
			if (x < 0 || y < 0 || x > 65535 || y > 65535) throw new Error("x/y invalid.");
			if (w <= 0 || h <= 0 || w > 65535 || h > 65535) throw new Error("Width/Height invalid.");
			if (indexed_pixels.length < w * h) throw new Error("Not enough pixels for the frame size.");
			var using_local_palette = true;
			var palette = opts.palette;
			if (palette === void 0 || palette === null) {
				using_local_palette = false;
				palette = global_palette;
			}
			if (palette === void 0 || palette === null) throw new Error("Must supply either a local or global palette.");
			var num_colors = check_palette_and_num_colors(palette);
			var min_code_size = 0;
			while (num_colors >>= 1) ++min_code_size;
			num_colors = 1 << min_code_size;
			var delay = opts.delay === void 0 ? 0 : opts.delay;
			var disposal = opts.disposal === void 0 ? 0 : opts.disposal;
			if (disposal < 0 || disposal > 3) throw new Error("Disposal out of range.");
			var use_transparency = false;
			var transparent_index = 0;
			if (opts.transparent !== void 0 && opts.transparent !== null) {
				use_transparency = true;
				transparent_index = opts.transparent;
				if (transparent_index < 0 || transparent_index >= num_colors) throw new Error("Transparent color index.");
			}
			if (disposal !== 0 || use_transparency || delay !== 0) {
				buf[p++] = 33;
				buf[p++] = 249;
				buf[p++] = 4;
				buf[p++] = disposal << 2 | (use_transparency === true ? 1 : 0);
				buf[p++] = delay & 255;
				buf[p++] = delay >> 8 & 255;
				buf[p++] = transparent_index;
				buf[p++] = 0;
			}
			buf[p++] = 44;
			buf[p++] = x & 255;
			buf[p++] = x >> 8 & 255;
			buf[p++] = y & 255;
			buf[p++] = y >> 8 & 255;
			buf[p++] = w & 255;
			buf[p++] = w >> 8 & 255;
			buf[p++] = h & 255;
			buf[p++] = h >> 8 & 255;
			buf[p++] = using_local_palette === true ? 128 | min_code_size - 1 : 0;
			if (using_local_palette === true) for (var i = 0, il = palette.length; i < il; ++i) {
				var rgb = palette[i];
				buf[p++] = rgb >> 16 & 255;
				buf[p++] = rgb >> 8 & 255;
				buf[p++] = rgb & 255;
			}
			p = GifWriterOutputLZWCodeStream(buf, p, min_code_size < 2 ? 2 : min_code_size, indexed_pixels);
			return p;
		};
		this.end = function() {
			if (ended === false) {
				buf[p++] = 59;
				ended = true;
			}
			return p;
		};
		this.getOutputBuffer = function() {
			return buf;
		};
		this.setOutputBuffer = function(v) {
			buf = v;
		};
		this.getOutputBufferPosition = function() {
			return p;
		};
		this.setOutputBufferPosition = function(v) {
			p = v;
		};
	}
	function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
		buf[p++] = min_code_size;
		var cur_subblock = p++;
		var clear_code = 1 << min_code_size;
		var code_mask = clear_code - 1;
		var eoi_code = clear_code + 1;
		var next_code = eoi_code + 1;
		var cur_code_size = min_code_size + 1;
		var cur_shift = 0;
		var cur = 0;
		function emit_bytes_to_buffer(bit_block_size) {
			while (cur_shift >= bit_block_size) {
				buf[p++] = cur & 255;
				cur >>= 8;
				cur_shift -= 8;
				if (p === cur_subblock + 256) {
					buf[cur_subblock] = 255;
					cur_subblock = p++;
				}
			}
		}
		function emit_code(c) {
			cur |= c << cur_shift;
			cur_shift += cur_code_size;
			emit_bytes_to_buffer(8);
		}
		var ib_code = index_stream[0] & code_mask;
		var code_table = {};
		emit_code(clear_code);
		for (var i = 1, il = index_stream.length; i < il; ++i) {
			var k = index_stream[i] & code_mask;
			var cur_key = ib_code << 8 | k;
			var cur_code = code_table[cur_key];
			if (cur_code === void 0) {
				cur |= ib_code << cur_shift;
				cur_shift += cur_code_size;
				while (cur_shift >= 8) {
					buf[p++] = cur & 255;
					cur >>= 8;
					cur_shift -= 8;
					if (p === cur_subblock + 256) {
						buf[cur_subblock] = 255;
						cur_subblock = p++;
					}
				}
				if (next_code === 4096) {
					emit_code(clear_code);
					next_code = eoi_code + 1;
					cur_code_size = min_code_size + 1;
					code_table = {};
				} else {
					if (next_code >= 1 << cur_code_size) ++cur_code_size;
					code_table[cur_key] = next_code++;
				}
				ib_code = k;
			} else ib_code = cur_code;
		}
		emit_code(ib_code);
		emit_code(eoi_code);
		emit_bytes_to_buffer(1);
		if (cur_subblock + 1 === p) buf[cur_subblock] = 0;
		else {
			buf[cur_subblock] = p - cur_subblock - 1;
			buf[p++] = 0;
		}
		return p;
	}
	function GifReader(buf) {
		var p = 0;
		if (buf[p++] !== 71 || buf[p++] !== 73 || buf[p++] !== 70 || buf[p++] !== 56 || (buf[p++] + 1 & 253) !== 56 || buf[p++] !== 97) throw new Error("Invalid GIF 87a/89a header.");
		var width = buf[p++] | buf[p++] << 8;
		var height = buf[p++] | buf[p++] << 8;
		var pf0 = buf[p++];
		var global_palette_flag = pf0 >> 7;
		var num_global_colors = 1 << (pf0 & 7) + 1;
		buf[p++];
		buf[p++];
		var global_palette_offset = null;
		var global_palette_size = null;
		if (global_palette_flag) {
			global_palette_offset = p;
			global_palette_size = num_global_colors;
			p += num_global_colors * 3;
		}
		var no_eof = true;
		var frames = [];
		var delay = 0;
		var transparent_index = null;
		var disposal = 0;
		var loop_count = null;
		this.width = width;
		this.height = height;
		while (no_eof && p < buf.length) switch (buf[p++]) {
			case 33:
				switch (buf[p++]) {
					case 255:
						if (buf[p] !== 11 || buf[p + 1] == 78 && buf[p + 2] == 69 && buf[p + 3] == 84 && buf[p + 4] == 83 && buf[p + 5] == 67 && buf[p + 6] == 65 && buf[p + 7] == 80 && buf[p + 8] == 69 && buf[p + 9] == 50 && buf[p + 10] == 46 && buf[p + 11] == 48 && buf[p + 12] == 3 && buf[p + 13] == 1 && buf[p + 16] == 0) {
							p += 14;
							loop_count = buf[p++] | buf[p++] << 8;
							p++;
						} else {
							p += 12;
							while (true) {
								var block_size = buf[p++];
								if (!(block_size >= 0)) throw Error("Invalid block size");
								if (block_size === 0) break;
								p += block_size;
							}
						}
						break;
					case 249:
						if (buf[p++] !== 4 || buf[p + 4] !== 0) throw new Error("Invalid graphics extension block.");
						var pf1 = buf[p++];
						delay = buf[p++] | buf[p++] << 8;
						transparent_index = buf[p++];
						if ((pf1 & 1) === 0) transparent_index = null;
						disposal = pf1 >> 2 & 7;
						p++;
						break;
					case 254:
						while (true) {
							var block_size = buf[p++];
							if (!(block_size >= 0)) throw Error("Invalid block size");
							if (block_size === 0) break;
							p += block_size;
						}
						break;
					default: throw new Error("Unknown graphic control label: 0x" + buf[p - 1].toString(16));
				}
				break;
			case 44:
				var x = buf[p++] | buf[p++] << 8;
				var y = buf[p++] | buf[p++] << 8;
				var w = buf[p++] | buf[p++] << 8;
				var h = buf[p++] | buf[p++] << 8;
				var pf2 = buf[p++];
				var local_palette_flag = pf2 >> 7;
				var interlace_flag = pf2 >> 6 & 1;
				var num_local_colors = 1 << (pf2 & 7) + 1;
				var palette_offset = global_palette_offset;
				var palette_size = global_palette_size;
				var has_local_palette = false;
				if (local_palette_flag) {
					var has_local_palette = true;
					palette_offset = p;
					palette_size = num_local_colors;
					p += num_local_colors * 3;
				}
				var data_offset = p;
				p++;
				while (true) {
					var block_size = buf[p++];
					if (!(block_size >= 0)) throw Error("Invalid block size");
					if (block_size === 0) break;
					p += block_size;
				}
				frames.push({
					x,
					y,
					width: w,
					height: h,
					has_local_palette,
					palette_offset,
					palette_size,
					data_offset,
					data_length: p - data_offset,
					transparent_index,
					interlaced: !!interlace_flag,
					delay,
					disposal
				});
				break;
			case 59:
				no_eof = false;
				break;
			default: throw new Error("Unknown gif block: 0x" + buf[p - 1].toString(16));
		}
		this.numFrames = function() {
			return frames.length;
		};
		this.loopCount = function() {
			return loop_count;
		};
		this.frameInfo = function(frame_num) {
			if (frame_num < 0 || frame_num >= frames.length) throw new Error("Frame index out of range.");
			return frames[frame_num];
		};
		this.decodeAndBlitFrameBGRA = function(frame_num, pixels) {
			var frame = this.frameInfo(frame_num);
			var num_pixels = frame.width * frame.height;
			var index_stream = new Uint8Array(num_pixels);
			GifReaderLZWOutputIndexStream(buf, frame.data_offset, index_stream, num_pixels);
			var palette_offset = frame.palette_offset;
			var trans = frame.transparent_index;
			if (trans === null) trans = 256;
			var framewidth = frame.width;
			var framestride = width - framewidth;
			var xleft = framewidth;
			var opbeg = (frame.y * width + frame.x) * 4;
			var opend = ((frame.y + frame.height) * width + frame.x) * 4;
			var op = opbeg;
			var scanstride = framestride * 4;
			if (frame.interlaced === true) scanstride += width * 4 * 7;
			var interlaceskip = 8;
			for (var i = 0, il = index_stream.length; i < il; ++i) {
				var index = index_stream[i];
				if (xleft === 0) {
					op += scanstride;
					xleft = framewidth;
					if (op >= opend) {
						scanstride = framestride * 4 + width * 4 * (interlaceskip - 1);
						op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
						interlaceskip >>= 1;
					}
				}
				if (index === trans) op += 4;
				else {
					var r = buf[palette_offset + index * 3];
					var g = buf[palette_offset + index * 3 + 1];
					var b = buf[palette_offset + index * 3 + 2];
					pixels[op++] = b;
					pixels[op++] = g;
					pixels[op++] = r;
					pixels[op++] = 255;
				}
				--xleft;
			}
		};
		this.decodeAndBlitFrameRGBA = function(frame_num, pixels) {
			var frame = this.frameInfo(frame_num);
			var num_pixels = frame.width * frame.height;
			var index_stream = new Uint8Array(num_pixels);
			GifReaderLZWOutputIndexStream(buf, frame.data_offset, index_stream, num_pixels);
			var palette_offset = frame.palette_offset;
			var trans = frame.transparent_index;
			if (trans === null) trans = 256;
			var framewidth = frame.width;
			var framestride = width - framewidth;
			var xleft = framewidth;
			var opbeg = (frame.y * width + frame.x) * 4;
			var opend = ((frame.y + frame.height) * width + frame.x) * 4;
			var op = opbeg;
			var scanstride = framestride * 4;
			if (frame.interlaced === true) scanstride += width * 4 * 7;
			var interlaceskip = 8;
			for (var i = 0, il = index_stream.length; i < il; ++i) {
				var index = index_stream[i];
				if (xleft === 0) {
					op += scanstride;
					xleft = framewidth;
					if (op >= opend) {
						scanstride = framestride * 4 + width * 4 * (interlaceskip - 1);
						op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
						interlaceskip >>= 1;
					}
				}
				if (index === trans) op += 4;
				else {
					var r = buf[palette_offset + index * 3];
					var g = buf[palette_offset + index * 3 + 1];
					var b = buf[palette_offset + index * 3 + 2];
					pixels[op++] = r;
					pixels[op++] = g;
					pixels[op++] = b;
					pixels[op++] = 255;
				}
				--xleft;
			}
		};
	}
	function GifReaderLZWOutputIndexStream(code_stream, p, output, output_length) {
		var min_code_size = code_stream[p++];
		var clear_code = 1 << min_code_size;
		var eoi_code = clear_code + 1;
		var next_code = eoi_code + 1;
		var cur_code_size = min_code_size + 1;
		var code_mask = (1 << cur_code_size) - 1;
		var cur_shift = 0;
		var cur = 0;
		var op = 0;
		var subblock_size = code_stream[p++];
		var code_table = /* @__PURE__ */ new Int32Array(4096);
		var prev_code = null;
		while (true) {
			while (cur_shift < 16) {
				if (subblock_size === 0) break;
				cur |= code_stream[p++] << cur_shift;
				cur_shift += 8;
				if (subblock_size === 1) subblock_size = code_stream[p++];
				else --subblock_size;
			}
			if (cur_shift < cur_code_size) break;
			var code = cur & code_mask;
			cur >>= cur_code_size;
			cur_shift -= cur_code_size;
			if (code === clear_code) {
				next_code = eoi_code + 1;
				cur_code_size = min_code_size + 1;
				code_mask = (1 << cur_code_size) - 1;
				prev_code = null;
				continue;
			} else if (code === eoi_code) break;
			var chase_code = code < next_code ? code : prev_code;
			var chase_length = 0;
			var chase = chase_code;
			while (chase > clear_code) {
				chase = code_table[chase] >> 8;
				++chase_length;
			}
			var k = chase;
			if (op + chase_length + (chase_code !== code ? 1 : 0) > output_length) {
				console.log("Warning, gif stream longer than expected.");
				return;
			}
			output[op++] = k;
			op += chase_length;
			var b = op;
			if (chase_code !== code) output[op++] = k;
			chase = chase_code;
			while (chase_length--) {
				chase = code_table[chase];
				output[--b] = chase & 255;
				chase >>= 8;
			}
			if (prev_code !== null && next_code < 4096) {
				code_table[next_code++] = prev_code << 8 | k;
				if (next_code >= code_mask + 1 && cur_code_size < 12) {
					++cur_code_size;
					code_mask = code_mask << 1 | 1;
				}
			}
			prev_code = code;
		}
		if (op !== output_length) console.log("Warning, gif stream shorter than expected.");
		return output;
	}
	try {
		exports.GifWriter = GifWriter;
		exports.GifReader = GifReader;
	} catch (e) {}
})))();
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
/** Throws `InvalidParameter` unless the buffer is exactly `width * height * 4` bytes. */
function expectRgba(image, what = "pixel buffer") {
	if (image.pixels.length !== image.width * image.height * 4) throw MurError.invalidParameter(`${what} size ${image.pixels.length} doesn't match ${image.width}x${image.height}x4`);
}
//#endregion
//#region tests/baseline/.src/src/logo.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
const LOGO_CLEAR_SHAPES = ["square", "circle"];
/** An RGBA logo to overlay on the centre of a QR code. */
var Logo = class Logo {
	pixels;
	width;
	height;
	fraction;
	clearBorder;
	clearShape;
	constructor(image, fraction, clearBorder, clearShape) {
		this.pixels = image.pixels;
		this.width = image.width;
		this.height = image.height;
		this.fraction = fraction;
		this.clearBorder = clearBorder;
		this.clearShape = clearShape;
	}
	/** A logo from a raw RGBA raster. */
	static fromRgba(image, options = {}) {
		const { fraction, clearBorder, clearShape } = resolveLogoOptions(options);
		expectRgba(image);
		return new Logo(image, fraction, clearBorder, clearShape);
	}
	/**
	* A logo decoded from PNG, JPEG, GIF (first frame) or BMP bytes. WebP
	* needs the `/webp` entry (`logoFromWebp`) and SVG the `/svg-logo` entry
	* (`logoFromSvg`).
	*/
	static fromImageBytes(data, options = {}) {
		const { fraction, clearBorder, clearShape } = resolveLogoOptions(options);
		let image;
		try {
			if (isPng(data)) {
				const decoded = decodePng(data);
				image = {
					width: decoded.width,
					height: decoded.height,
					pixels: ensureRgba8(new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength), decoded.channels ?? 4, decoded.depth ?? 8)
				};
			} else if (isJpeg(data)) {
				const decoded = import_jpeg_js.decode(data, { useTArray: true });
				image = {
					width: decoded.width,
					height: decoded.height,
					pixels: decoded.data instanceof Uint8Array ? decoded.data : new Uint8Array(decoded.data)
				};
			} else if (isGif(data)) image = decodeGif(data);
			else if (isBmp(data)) image = decodeBmp(data);
			else if (isWebp(data)) throw new Error("WebP decoding requires the async API — use `logoFromWebp` from the `/webp` entry instead");
			else throw new Error("unrecognized format (expected PNG, JPEG, GIF, or BMP)");
		} catch (e) {
			throw MurError.imageEncode(`failed to decode image: ${messageOf(e)}`, e);
		}
		return new Logo(image, fraction, clearBorder, clearShape);
	}
};
/** @internal The validated options with defaults applied. */
function resolveLogoOptions(options) {
	const fraction = validateFraction(options.fraction ?? .25);
	const clearBorder = validateClearBorder(options.clearBorder ?? 1);
	const clearShape = options.clearShape ?? "square";
	if (clearShape !== "square" && clearShape !== "circle") throw MurError.invalidParameter(`unknown clear shape: ${String(clearShape)} (expected square or circle)`);
	return {
		fraction,
		clearBorder,
		clearShape
	};
}
/** @internal */
function validateFraction(f) {
	if (!(f >= .01 && f <= .99)) throw MurError.invalidParameter(`logo fraction must be 0.01–0.99, got ${f}`);
	return f;
}
/** @internal */
function validateClearBorder(b) {
	if (b > 5 || b < 0 || !Number.isInteger(b)) throw MurError.invalidParameter(`clear_border must be 0–5, got ${b}`);
	return b;
}
function isPng(data) {
	return data.length >= 8 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71 && data[4] === 13 && data[5] === 10 && data[6] === 26 && data[7] === 10;
}
function isJpeg(data) {
	return data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
}
/** GIF87a / GIF89a magic bytes. */
function isGif(data) {
	return data.length >= 6 && data[0] === 71 && data[1] === 73 && data[2] === 70 && data[3] === 56 && (data[4] === 55 || data[4] === 57) && data[5] === 97;
}
/** BMP magic bytes — `BM`. */
function isBmp(data) {
	return data.length >= 2 && data[0] === 66 && data[1] === 77;
}
/** WebP magic bytes — `RIFF....WEBP`. */
function isWebp(data) {
	return data.length >= 12 && data[0] === 82 && data[1] === 73 && data[2] === 70 && data[3] === 70 && data[8] === 87 && data[9] === 69 && data[10] === 66 && data[11] === 80;
}
/**
* Decode a GIF to RGBA8 (first frame for animated GIFs, mirroring
* Rust's `image::load_from_memory` GIF behaviour).
*/
function decodeGif(data) {
	const reader = new import_omggif.GifReader(data);
	const width = reader.width;
	const height = reader.height;
	const pixels = new Uint8Array(width * height * 4);
	reader.decodeAndBlitFrameRGBA(0, pixels);
	return {
		width,
		height,
		pixels
	};
}
/**
* Decode an uncompressed 24-bit or 32-bit BMP to RGBA8.
*
* Mirrors Rust's `image::codecs::bmp` BMP decoder for the common
* (and dominant) 24/32-bit BI_RGB case. RLE / 16bpp / 1bpp BMPs
* surface as a decode error — those are vanishingly rare in
* practice and the audit explicitly accepts the BI_RGB subset.
*/
function decodeBmp(data) {
	if (data.length < 54) throw new Error("BMP too small (expected at least 54 header bytes)");
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const dataOffset = view.getUint32(10, true);
	const dibSize = view.getUint32(14, true);
	if (dibSize < 40) throw new Error(`unsupported BMP DIB header size: ${dibSize}`);
	const width = view.getInt32(18, true);
	const heightSigned = view.getInt32(22, true);
	const height = Math.abs(heightSigned);
	const topDown = heightSigned < 0;
	const bpp = view.getUint16(28, true);
	const compression = view.getUint32(30, true);
	if (compression !== 0) throw new Error(`unsupported BMP compression: ${compression} (only BI_RGB is supported)`);
	if (bpp !== 24 && bpp !== 32) throw new Error(`unsupported BMP bit depth: ${bpp} (expected 24 or 32)`);
	const bytesPerPixel = bpp / 8;
	const rowStride = Math.ceil(width * bpp / 32) * 4;
	const pixels = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		const srcOffset = dataOffset + (topDown ? y : height - 1 - y) * rowStride;
		if (srcOffset + width * bytesPerPixel > data.length) throw new Error("BMP truncated row data");
		for (let x = 0; x < width; x++) {
			const px = srcOffset + x * bytesPerPixel;
			const dst = (y * width + x) * 4;
			pixels[dst] = data[px + 2];
			pixels[dst + 1] = data[px + 1];
			pixels[dst + 2] = data[px];
			pixels[dst + 3] = bpp === 32 ? data[px + 3] : 255;
		}
	}
	return {
		width,
		height,
		pixels
	};
}
function ensureRgba8(data, channels, depth) {
	if (depth !== 8) throw MurError.imageEncode(`unsupported PNG bit depth: ${depth} (expected 8)`);
	if (channels === 4) return data;
	if (channels === 3) {
		const px = data.length / 3;
		const out = new Uint8Array(px * 4);
		for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
			out[j] = data[i];
			out[j + 1] = data[i + 1];
			out[j + 2] = data[i + 2];
			out[j + 3] = 255;
		}
		return out;
	}
	if (channels === 2) {
		const px = data.length / 2;
		const out = new Uint8Array(px * 4);
		for (let i = 0, j = 0; i < data.length; i += 2, j += 4) {
			const v = data[i];
			out[j] = v;
			out[j + 1] = v;
			out[j + 2] = v;
			out[j + 3] = data[i + 1];
		}
		return out;
	}
	if (channels === 1) {
		const out = new Uint8Array(data.length * 4);
		for (let i = 0, j = 0; i < data.length; i++, j += 4) {
			const v = data[i];
			out[j] = v;
			out[j + 1] = v;
			out[j + 2] = v;
			out[j + 3] = 255;
		}
		return out;
	}
	throw MurError.imageEncode(`unsupported PNG channel count: ${channels}`);
}
//#endregion
//#region tests/baseline/.src/src/gif.ts
var import_gifenc = (/* @__PURE__ */ __commonJSMin(((exports) => {
	var __defProp = Object.defineProperty;
	var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	__markAsModule(exports);
	__export(exports, {
		GIFEncoder: () => GIFEncoder,
		applyPalette: () => applyPalette,
		default: () => src_default,
		nearestColor: () => nearestColor,
		nearestColorIndex: () => nearestColorIndex,
		nearestColorIndexWithDistance: () => nearestColorIndexWithDistance,
		prequantize: () => prequantize,
		quantize: () => quantize,
		snapColorsToPalette: () => snapColorsToPalette
	});
	var constants_default = {
		signature: "GIF",
		version: "89a",
		trailer: 59,
		extensionIntroducer: 33,
		applicationExtensionLabel: 255,
		graphicControlExtensionLabel: 249,
		imageSeparator: 44,
		signatureSize: 3,
		versionSize: 3,
		globalColorTableFlagMask: 128,
		colorResolutionMask: 112,
		sortFlagMask: 8,
		globalColorTableSizeMask: 7,
		applicationIdentifierSize: 8,
		applicationAuthCodeSize: 3,
		disposalMethodMask: 28,
		userInputFlagMask: 2,
		transparentColorFlagMask: 1,
		localColorTableFlagMask: 128,
		interlaceFlagMask: 64,
		idSortFlagMask: 32,
		localColorTableSizeMask: 7
	};
	function createStream(initialCapacity = 256) {
		let cursor = 0;
		let contents = new Uint8Array(initialCapacity);
		return {
			get buffer() {
				return contents.buffer;
			},
			reset() {
				cursor = 0;
			},
			bytesView() {
				return contents.subarray(0, cursor);
			},
			bytes() {
				return contents.slice(0, cursor);
			},
			writeByte(byte) {
				expand(cursor + 1);
				contents[cursor] = byte;
				cursor++;
			},
			writeBytes(data, offset = 0, byteLength = data.length) {
				expand(cursor + byteLength);
				for (let i = 0; i < byteLength; i++) contents[cursor++] = data[i + offset];
			},
			writeBytesView(data, offset = 0, byteLength = data.byteLength) {
				expand(cursor + byteLength);
				contents.set(data.subarray(offset, offset + byteLength), cursor);
				cursor += byteLength;
			}
		};
		function expand(newCapacity) {
			var prevCapacity = contents.length;
			if (prevCapacity >= newCapacity) return;
			newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1048576 ? 2 : 1.125) >>> 0);
			if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
			const oldContents = contents;
			contents = new Uint8Array(newCapacity);
			if (cursor > 0) contents.set(oldContents.subarray(0, cursor), 0);
		}
	}
	var BITS = 12;
	var DEFAULT_HSIZE = 5003;
	var MASKS = [
		0,
		1,
		3,
		7,
		15,
		31,
		63,
		127,
		255,
		511,
		1023,
		2047,
		4095,
		8191,
		16383,
		32767,
		65535
	];
	function lzwEncode(width, height, pixels, colorDepth, outStream = createStream(512), accum = /* @__PURE__ */ new Uint8Array(256), htab = new Int32Array(DEFAULT_HSIZE), codetab = new Int32Array(DEFAULT_HSIZE)) {
		const hsize = htab.length;
		const initCodeSize = Math.max(2, colorDepth);
		accum.fill(0);
		codetab.fill(0);
		htab.fill(-1);
		let cur_accum = 0;
		let cur_bits = 0;
		const init_bits = initCodeSize + 1;
		const g_init_bits = init_bits;
		let clear_flg = false;
		let n_bits = g_init_bits;
		let maxcode = (1 << n_bits) - 1;
		const ClearCode = 1 << init_bits - 1;
		const EOFCode = ClearCode + 1;
		let free_ent = ClearCode + 2;
		let a_count = 0;
		let ent = pixels[0];
		let hshift = 0;
		for (let fcode = hsize; fcode < 65536; fcode *= 2) ++hshift;
		hshift = 8 - hshift;
		outStream.writeByte(initCodeSize);
		output(ClearCode);
		const length = pixels.length;
		for (let idx = 1; idx < length; idx++) next_block: {
			const c = pixels[idx];
			const fcode = (c << BITS) + ent;
			let i = c << hshift ^ ent;
			if (htab[i] === fcode) {
				ent = codetab[i];
				break next_block;
			}
			const disp = i === 0 ? 1 : hsize - i;
			while (htab[i] >= 0) {
				i -= disp;
				if (i < 0) i += hsize;
				if (htab[i] === fcode) {
					ent = codetab[i];
					break next_block;
				}
			}
			output(ent);
			ent = c;
			if (free_ent < 1 << BITS) {
				codetab[i] = free_ent++;
				htab[i] = fcode;
			} else {
				htab.fill(-1);
				free_ent = ClearCode + 2;
				clear_flg = true;
				output(ClearCode);
			}
		}
		output(ent);
		output(EOFCode);
		outStream.writeByte(0);
		return outStream.bytesView();
		function output(code) {
			cur_accum &= MASKS[cur_bits];
			if (cur_bits > 0) cur_accum |= code << cur_bits;
			else cur_accum = code;
			cur_bits += n_bits;
			while (cur_bits >= 8) {
				accum[a_count++] = cur_accum & 255;
				if (a_count >= 254) {
					outStream.writeByte(a_count);
					outStream.writeBytesView(accum, 0, a_count);
					a_count = 0;
				}
				cur_accum >>= 8;
				cur_bits -= 8;
			}
			if (free_ent > maxcode || clear_flg) {
				if (clear_flg) {
					n_bits = g_init_bits;
					maxcode = (1 << n_bits) - 1;
					clear_flg = false;
				} else {
					++n_bits;
					maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
				}
			}
			if (code == EOFCode) {
				while (cur_bits > 0) {
					accum[a_count++] = cur_accum & 255;
					if (a_count >= 254) {
						outStream.writeByte(a_count);
						outStream.writeBytesView(accum, 0, a_count);
						a_count = 0;
					}
					cur_accum >>= 8;
					cur_bits -= 8;
				}
				if (a_count > 0) {
					outStream.writeByte(a_count);
					outStream.writeBytesView(accum, 0, a_count);
					a_count = 0;
				}
			}
		}
	}
	var lzwEncode_default = lzwEncode;
	function rgb888_to_rgb565(r, g, b) {
		return r << 8 & 63488 | g << 2 & 992 | b >> 3;
	}
	function rgba8888_to_rgba4444(r, g, b, a) {
		return r >> 4 | g & 240 | (b & 240) << 4 | (a & 240) << 8;
	}
	function rgb888_to_rgb444(r, g, b) {
		return r >> 4 << 8 | g & 240 | b >> 4;
	}
	function clamp(value, min, max) {
		return value < min ? min : value > max ? max : value;
	}
	function sqr(value) {
		return value * value;
	}
	function find_nn(bins, idx, hasAlpha) {
		var nn = 0;
		var err = 1e100;
		const bin1 = bins[idx];
		const n1 = bin1.cnt;
		const wa = bin1.ac;
		const wr = bin1.rc;
		const wg = bin1.gc;
		const wb = bin1.bc;
		for (var i = bin1.fw; i != 0; i = bins[i].fw) {
			const bin = bins[i];
			const n2 = bin.cnt;
			const nerr2 = n1 * n2 / (n1 + n2);
			if (nerr2 >= err) continue;
			var nerr = 0;
			if (hasAlpha) {
				nerr += nerr2 * sqr(bin.ac - wa);
				if (nerr >= err) continue;
			}
			nerr += nerr2 * sqr(bin.rc - wr);
			if (nerr >= err) continue;
			nerr += nerr2 * sqr(bin.gc - wg);
			if (nerr >= err) continue;
			nerr += nerr2 * sqr(bin.bc - wb);
			if (nerr >= err) continue;
			err = nerr;
			nn = i;
		}
		bin1.err = err;
		bin1.nn = nn;
	}
	function create_bin() {
		return {
			ac: 0,
			rc: 0,
			gc: 0,
			bc: 0,
			cnt: 0,
			nn: 0,
			fw: 0,
			bk: 0,
			tm: 0,
			mtm: 0,
			err: 0
		};
	}
	function create_bin_list(data, format) {
		const bins = new Array(format === "rgb444" ? 4096 : 65536);
		const size = data.length;
		if (format === "rgba4444") for (let i = 0; i < size; ++i) {
			const color = data[i];
			const a = color >> 24 & 255;
			const b = color >> 16 & 255;
			const g = color >> 8 & 255;
			const r = color & 255;
			const index = rgba8888_to_rgba4444(r, g, b, a);
			let bin = index in bins ? bins[index] : bins[index] = create_bin();
			bin.rc += r;
			bin.gc += g;
			bin.bc += b;
			bin.ac += a;
			bin.cnt++;
		}
		else if (format === "rgb444") for (let i = 0; i < size; ++i) {
			const color = data[i];
			const b = color >> 16 & 255;
			const g = color >> 8 & 255;
			const r = color & 255;
			const index = rgb888_to_rgb444(r, g, b);
			let bin = index in bins ? bins[index] : bins[index] = create_bin();
			bin.rc += r;
			bin.gc += g;
			bin.bc += b;
			bin.cnt++;
		}
		else for (let i = 0; i < size; ++i) {
			const color = data[i];
			const b = color >> 16 & 255;
			const g = color >> 8 & 255;
			const r = color & 255;
			const index = rgb888_to_rgb565(r, g, b);
			let bin = index in bins ? bins[index] : bins[index] = create_bin();
			bin.rc += r;
			bin.gc += g;
			bin.bc += b;
			bin.cnt++;
		}
		return bins;
	}
	function quantize(rgba, maxColors, opts = {}) {
		const { format = "rgb565", clearAlpha = true, clearAlphaColor = 0, clearAlphaThreshold = 0, oneBitAlpha = false } = opts;
		if (!rgba || !rgba.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
		if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
		const data = new Uint32Array(rgba.buffer);
		let useSqrt = opts.useSqrt !== false;
		const hasAlpha = format === "rgba4444";
		const bins = create_bin_list(data, format);
		const bincount = bins.length;
		const bincountMinusOne = bincount - 1;
		const heap = new Uint32Array(bincount + 1);
		var maxbins = 0;
		for (var i = 0; i < bincount; ++i) {
			const bin = bins[i];
			if (bin != null) {
				var d = 1 / bin.cnt;
				if (hasAlpha) bin.ac *= d;
				bin.rc *= d;
				bin.gc *= d;
				bin.bc *= d;
				bins[maxbins++] = bin;
			}
		}
		if (sqr(maxColors) / maxbins < .022) useSqrt = false;
		var i = 0;
		for (; i < maxbins - 1; ++i) {
			bins[i].fw = i + 1;
			bins[i + 1].bk = i;
			if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
		}
		if (useSqrt) bins[i].cnt = Math.sqrt(bins[i].cnt);
		var h, l, l2;
		for (i = 0; i < maxbins; ++i) {
			find_nn(bins, i, false);
			var err = bins[i].err;
			for (l = ++heap[0]; l > 1; l = l2) {
				l2 = l >> 1;
				if (bins[h = heap[l2]].err <= err) break;
				heap[l] = h;
			}
			heap[l] = i;
		}
		var extbins = maxbins - maxColors;
		for (i = 0; i < extbins;) {
			var tb;
			for (;;) {
				var b1 = heap[1];
				tb = bins[b1];
				if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm) break;
				if (tb.mtm == bincountMinusOne) b1 = heap[1] = heap[heap[0]--];
				else {
					find_nn(bins, b1, false);
					tb.tm = i;
				}
				var err = bins[b1].err;
				for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
					if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err) l2++;
					if (err <= bins[h = heap[l2]].err) break;
					heap[l] = h;
				}
				heap[l] = b1;
			}
			var nb = bins[tb.nn];
			var n1 = tb.cnt;
			var n2 = nb.cnt;
			var d = 1 / (n1 + n2);
			if (hasAlpha) tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
			tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
			tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
			tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
			tb.cnt += nb.cnt;
			tb.mtm = ++i;
			bins[nb.bk].fw = nb.fw;
			bins[nb.fw].bk = nb.bk;
			nb.mtm = bincountMinusOne;
		}
		let palette = [];
		var k = 0;
		for (i = 0;; ++k) {
			let r = clamp(Math.round(bins[i].rc), 0, 255);
			let g = clamp(Math.round(bins[i].gc), 0, 255);
			let b = clamp(Math.round(bins[i].bc), 0, 255);
			let a = 255;
			if (hasAlpha) {
				a = clamp(Math.round(bins[i].ac), 0, 255);
				if (oneBitAlpha) a = a <= (typeof oneBitAlpha === "number" ? oneBitAlpha : 127) ? 0 : 255;
				if (clearAlpha && a <= clearAlphaThreshold) {
					r = g = b = clearAlphaColor;
					a = 0;
				}
			}
			const color = hasAlpha ? [
				r,
				g,
				b,
				a
			] : [
				r,
				g,
				b
			];
			if (!existsInPalette(palette, color)) palette.push(color);
			if ((i = bins[i].fw) == 0) break;
		}
		return palette;
	}
	function existsInPalette(palette, color) {
		for (let i = 0; i < palette.length; i++) {
			const p = palette[i];
			let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
			let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
			if (matchesRGB && matchesAlpha) return true;
		}
		return false;
	}
	function euclideanDistanceSquared(a, b) {
		var sum = 0;
		var n = 0;
		for (; n < a.length; n++) {
			const dx = a[n] - b[n];
			sum += dx * dx;
		}
		return sum;
	}
	function roundStep(byte, step) {
		return step > 1 ? Math.round(byte / step) * step : byte;
	}
	function prequantize(rgba, { roundRGB = 5, roundAlpha = 10, oneBitAlpha = null } = {}) {
		const data = new Uint32Array(rgba.buffer);
		for (let i = 0; i < data.length; i++) {
			const color = data[i];
			let a = color >> 24 & 255;
			let b = color >> 16 & 255;
			let g = color >> 8 & 255;
			let r = color & 255;
			a = roundStep(a, roundAlpha);
			if (oneBitAlpha) a = a <= (typeof oneBitAlpha === "number" ? oneBitAlpha : 127) ? 0 : 255;
			r = roundStep(r, roundRGB);
			g = roundStep(g, roundRGB);
			b = roundStep(b, roundRGB);
			data[i] = a << 24 | b << 16 | g << 8 | r << 0;
		}
	}
	function applyPalette(rgba, palette, format = "rgb565") {
		if (!rgba || !rgba.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
		if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
		if (palette.length > 256) throw new Error("applyPalette() only works with 256 colors or less");
		const data = new Uint32Array(rgba.buffer);
		const length = data.length;
		const bincount = format === "rgb444" ? 4096 : 65536;
		const index = new Uint8Array(length);
		const cache = new Array(bincount);
		if (format === "rgba4444") for (let i = 0; i < length; i++) {
			const color = data[i];
			const a = color >> 24 & 255;
			const b = color >> 16 & 255;
			const g = color >> 8 & 255;
			const r = color & 255;
			const key = rgba8888_to_rgba4444(r, g, b, a);
			const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGBA(r, g, b, a, palette);
			index[i] = idx;
		}
		else {
			const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
			for (let i = 0; i < length; i++) {
				const color = data[i];
				const b = color >> 16 & 255;
				const g = color >> 8 & 255;
				const r = color & 255;
				const key = rgb888_to_key(r, g, b);
				const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGB(r, g, b, palette);
				index[i] = idx;
			}
		}
		return index;
	}
	function nearestColorIndexRGBA(r, g, b, a, palette) {
		let k = 0;
		let mindist = 1e100;
		for (let i = 0; i < palette.length; i++) {
			const px2 = palette[i];
			const a2 = px2[3];
			let curdist = sqr2(a2 - a);
			if (curdist > mindist) continue;
			const r2 = px2[0];
			curdist += sqr2(r2 - r);
			if (curdist > mindist) continue;
			const g2 = px2[1];
			curdist += sqr2(g2 - g);
			if (curdist > mindist) continue;
			const b2 = px2[2];
			curdist += sqr2(b2 - b);
			if (curdist > mindist) continue;
			mindist = curdist;
			k = i;
		}
		return k;
	}
	function nearestColorIndexRGB(r, g, b, palette) {
		let k = 0;
		let mindist = 1e100;
		for (let i = 0; i < palette.length; i++) {
			const px2 = palette[i];
			const r2 = px2[0];
			let curdist = sqr2(r2 - r);
			if (curdist > mindist) continue;
			const g2 = px2[1];
			curdist += sqr2(g2 - g);
			if (curdist > mindist) continue;
			const b2 = px2[2];
			curdist += sqr2(b2 - b);
			if (curdist > mindist) continue;
			mindist = curdist;
			k = i;
		}
		return k;
	}
	function snapColorsToPalette(palette, knownColors, threshold = 5) {
		if (!palette.length || !knownColors.length) return;
		const paletteRGB = palette.map((p) => p.slice(0, 3));
		const thresholdSq = threshold * threshold;
		const dim = palette[0].length;
		for (let i = 0; i < knownColors.length; i++) {
			let color = knownColors[i];
			if (color.length < dim) color = [
				color[0],
				color[1],
				color[2],
				255
			];
			else if (color.length > dim) color = color.slice(0, 3);
			else color = color.slice();
			const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
			const idx = r[0];
			const distanceSq = r[1];
			if (distanceSq > 0 && distanceSq <= thresholdSq) palette[idx] = color;
		}
	}
	function sqr2(a) {
		return a * a;
	}
	function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
		let minDist = Infinity;
		let minDistIndex = -1;
		for (let j = 0; j < colors.length; j++) {
			const paletteColor = colors[j];
			const dist = distanceFn(pixel, paletteColor);
			if (dist < minDist) {
				minDist = dist;
				minDistIndex = j;
			}
		}
		return minDistIndex;
	}
	function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
		let minDist = Infinity;
		let minDistIndex = -1;
		for (let j = 0; j < colors.length; j++) {
			const paletteColor = colors[j];
			const dist = distanceFn(pixel, paletteColor);
			if (dist < minDist) {
				minDist = dist;
				minDistIndex = j;
			}
		}
		return [minDistIndex, minDist];
	}
	function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
		return colors[nearestColorIndex(colors, pixel, distanceFn)];
	}
	function GIFEncoder(opt = {}) {
		const { initialCapacity = 4096, auto = true } = opt;
		const stream = createStream(initialCapacity);
		const HSIZE = 5003;
		const accum = /* @__PURE__ */ new Uint8Array(256);
		const htab = new Int32Array(HSIZE);
		const codetab = new Int32Array(HSIZE);
		let hasInit = false;
		return {
			reset() {
				stream.reset();
				hasInit = false;
			},
			finish() {
				stream.writeByte(constants_default.trailer);
			},
			bytes() {
				return stream.bytes();
			},
			bytesView() {
				return stream.bytesView();
			},
			get buffer() {
				return stream.buffer;
			},
			get stream() {
				return stream;
			},
			writeHeader,
			writeFrame(index, width, height, opts = {}) {
				const { transparent = false, transparentIndex = 0, delay = 0, palette = null, repeat = 0, colorDepth = 8, dispose = -1 } = opts;
				let first = false;
				if (auto) {
					if (!hasInit) {
						first = true;
						writeHeader();
						hasInit = true;
					}
				} else first = Boolean(opts.first);
				width = Math.max(0, Math.floor(width));
				height = Math.max(0, Math.floor(height));
				if (first) {
					if (!palette) throw new Error("First frame must include a { palette } option");
					encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
					encodeColorTable(stream, palette);
					if (repeat >= 0) encodeNetscapeExt(stream, repeat);
				}
				const delayTime = Math.round(delay / 10);
				encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
				const useLocalColorTable = Boolean(palette) && !first;
				encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
				if (useLocalColorTable) encodeColorTable(stream, palette);
				encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
			}
		};
		function writeHeader() {
			writeUTFBytes(stream, "GIF89a");
		}
	}
	function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
		stream.writeByte(33);
		stream.writeByte(249);
		stream.writeByte(4);
		if (transparentIndex < 0) {
			transparentIndex = 0;
			transparent = false;
		}
		var transp, disp;
		if (!transparent) {
			transp = 0;
			disp = 0;
		} else {
			transp = 1;
			disp = 2;
		}
		if (dispose >= 0) disp = dispose & 7;
		disp <<= 2;
		stream.writeByte(disp | 0 | transp);
		writeUInt16(stream, delay);
		stream.writeByte(transparentIndex || 0);
		stream.writeByte(0);
	}
	function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
		const globalColorTableSize = colorTableSize(palette.length) - 1;
		const fields = colorDepth - 1 << 4 | 128 | globalColorTableSize;
		const backgroundColorIndex = 0;
		const pixelAspectRatio = 0;
		writeUInt16(stream, width);
		writeUInt16(stream, height);
		stream.writeBytes([
			fields,
			backgroundColorIndex,
			pixelAspectRatio
		]);
	}
	function encodeNetscapeExt(stream, repeat) {
		stream.writeByte(33);
		stream.writeByte(255);
		stream.writeByte(11);
		writeUTFBytes(stream, "NETSCAPE2.0");
		stream.writeByte(3);
		stream.writeByte(1);
		writeUInt16(stream, repeat);
		stream.writeByte(0);
	}
	function encodeColorTable(stream, palette) {
		const colorTableLength = 1 << colorTableSize(palette.length);
		for (let i = 0; i < colorTableLength; i++) {
			let color = [
				0,
				0,
				0
			];
			if (i < palette.length) color = palette[i];
			stream.writeByte(color[0]);
			stream.writeByte(color[1]);
			stream.writeByte(color[2]);
		}
	}
	function encodeImageDescriptor(stream, width, height, localPalette) {
		stream.writeByte(44);
		writeUInt16(stream, 0);
		writeUInt16(stream, 0);
		writeUInt16(stream, width);
		writeUInt16(stream, height);
		if (localPalette) {
			const palSize = colorTableSize(localPalette.length) - 1;
			stream.writeByte(128 | palSize);
		} else stream.writeByte(0);
	}
	function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
		lzwEncode_default(width, height, index, colorDepth, stream, accum, htab, codetab);
	}
	function writeUInt16(stream, short) {
		stream.writeByte(short & 255);
		stream.writeByte(short >> 8 & 255);
	}
	function writeUTFBytes(stream, text) {
		for (var i = 0; i < text.length; i++) stream.writeByte(text.charCodeAt(i));
	}
	function colorTableSize(length) {
		return Math.max(Math.ceil(Math.log2(length)), 1);
	}
	var src_default = GIFEncoder;
})))();
/** Encodes the frames as a looping animated GIF. */
function encodeAnimatedGif(frames, options = {}) {
	const fps = options.fps ?? 8;
	if (frames.length === 0) throw MurError.invalidParameter("no frames to encode");
	const width = frames[0].image.width;
	const height = frames[0].image.height;
	const delayCs = Math.round(100 / fps);
	let gif;
	try {
		gif = (0, import_gifenc.GIFEncoder)();
	} catch (e) {
		throw MurError.gifEncode(`GIF init: ${messageOf(e)}`, e);
	}
	for (const frame of frames) {
		const rgba = frame.image.pixels;
		const { palette, indexed } = quantizeFrame(rgba);
		try {
			gif.writeFrame(indexed, width, height, {
				palette,
				delay: delayCs * 10,
				repeat: 0
			});
		} catch (e) {
			throw MurError.gifEncode(`GIF write frame: ${messageOf(e)}`, e);
		}
	}
	try {
		gif.finish();
	} catch (e) {
		throw MurError.gifEncode(`GIF finalize: ${messageOf(e)}`, e);
	}
	return gif.bytes();
}
/**
* Quantize an RGBA frame to a 256-color indexed palette.
*
* Uses a small unique-color palette when possible (≤256 colors), otherwise
* falls back to gifenc's quantizer for many-color frames (e.g. with logos).
*/
function quantizeFrame(rgba) {
	const uniqueKeys = /* @__PURE__ */ new Set();
	const uniqueColors = [];
	let exceeded = false;
	for (let i = 0; i < rgba.length; i += 4) {
		const r = rgba[i];
		const g = rgba[i + 1];
		const b = rgba[i + 2];
		const a = rgba[i + 3];
		const key = (r << 24 | g << 16 | b << 8 | a) >>> 0;
		if (!uniqueKeys.has(key)) {
			uniqueKeys.add(key);
			uniqueColors.push([
				r,
				g,
				b,
				a
			]);
			if (uniqueColors.length > 256) {
				exceeded = true;
				break;
			}
		}
	}
	if (!exceeded) {
		const palette = uniqueColors.map((c) => [
			c[0],
			c[1],
			c[2]
		]);
		const lookup = /* @__PURE__ */ new Map();
		uniqueColors.forEach((c, i) => {
			const key = (c[0] << 24 | c[1] << 16 | c[2] << 8 | c[3]) >>> 0;
			lookup.set(key, i);
		});
		const indexed = new Uint8Array(rgba.length / 4);
		for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
			const key = (rgba[i] << 24 | rgba[i + 1] << 16 | rgba[i + 2] << 8 | rgba[i + 3]) >>> 0;
			indexed[j] = lookup.get(key) ?? 0;
		}
		return {
			palette,
			indexed
		};
	}
	const palette = (0, import_gifenc.quantize)(rgba, 256, { format: "rgb565" });
	return {
		palette,
		indexed: (0, import_gifenc.applyPalette)(rgba, palette, "rgb565")
	};
}
//#endregion
//#region tests/baseline/.src/src/svg.ts
/**
* Copyright © 2026 Blockchain Commons, LLC
*/
/** A logo rasterized from SVG bytes. */
async function logoFromSvg(svg, options = {}) {
	return Logo.fromRgba(await rasterizeSvg(svg), options);
}
let initPromise = null;
/**
* Initialize the WASM module used for SVG rasterization.
*
* In Node.js, the WASM file is auto-resolved from this package's
* dependency tree.
*
* In a browser, the caller must pass an `InitInput` (URL, Response,
* BufferSource, WebAssembly.Module, or a Promise of one) before invoking
* any SVG-rendering API.
*/
function initSvgRenderer(wasm) {
	initPromise ??= (async () => {
		if (wasm) {
			await initWasm(wasm);
			return;
		}
		const wasmBytes = await loadWasmFromNode();
		await initWasm(wasmBytes);
	})().catch((e) => {
		initPromise = null;
		throw e;
	});
	return initPromise;
}
async function loadWasmFromNode() {
	if (!(typeof process !== "undefined" && process.versions?.node !== void 0)) throw MurError.svgRender("SVG renderer not initialized — call initSvgRenderer(wasmBytes) first");
	const fs = await import("node:fs/promises");
	const { createRequire } = await import("node:module");
	const path = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
	return new Uint8Array(await fs.readFile(path));
}
/**
* Rasterize SVG data to a 512×512 straight-alpha RGBA buffer (centered,
* preserving aspect ratio).
*
* Mirrors Rust `bc-mur::Logo::from_svg`
* (`logo.rs:53-97`):
*   let scale = (512/w).min(512/h);
*   let tx = (512 - w * scale) / 2;
*   let ty = (512 - h * scale) / 2;
*   let transform = Transform::from_scale(scale, scale)
*       .post_translate(tx, ty);
*   resvg::render(&tree, transform, &mut pixmap)
*
* Rust uses tiny_skia which handles **float** sub-pixel positioning
* via anti-aliased rasterization. resvg-wasm has no direct Transform
* input, so we mirror the same effect by:
*
*  1. Rendering the SVG at the target `scale` via
*     `fitTo: { mode: "zoom", value: scale }` to get an aspect-correct
*     `w_r × h_r` buffer.
*  2. Compositing it onto the 512×512 canvas with **sub-pixel-accurate
*     bilinear sampling** at the float offset `(tx, ty)`.
*
* The earlier port placed the rendered buffer at integer-floored
* offsets (`Math.floor((512 - w_r) / 2)`), which introduced a
* 0–1-pixel hard shift relative to Rust's anti-aliased boundary
* whenever `w * scale` (or `h * scale`) wasn't an integer. The
* bilinear-blit below removes that shift — see M3 in
* `PARITY_OUTSTANDING.md`.
*/
/**
* Rasterizes an SVG into a 512×512 straight-alpha RGBA image, scaled to fit
* and centred with sub-pixel bilinear placement (the reference's `resvg`
* pipeline). Initializes the renderer if needed.
*/
async function rasterizeSvg(svg) {
	await initSvgRenderer();
	const renderSize = 512;
	let probe;
	try {
		probe = new Resvg(svg, {
			fitTo: { mode: "original" },
			background: "rgba(0, 0, 0, 0)"
		});
	} catch (e) {
		throw MurError.svgRender(`SVG parse: ${messageOf(e)}`, e);
	}
	const intrinsicW = probe.width;
	const intrinsicH = probe.height;
	probe.free();
	const sx = renderSize / intrinsicW;
	const sy = renderSize / intrinsicH;
	const scale = Math.min(sx, sy);
	const tx = (renderSize - intrinsicW * scale) / 2;
	const ty = (renderSize - intrinsicH * scale) / 2;
	let scaledResvg;
	try {
		scaledResvg = new Resvg(svg, {
			fitTo: {
				mode: "zoom",
				value: scale
			},
			background: "rgba(0, 0, 0, 0)"
		});
	} catch (e) {
		throw MurError.svgRender(`SVG parse: ${messageOf(e)}`, e);
	}
	const rendered = scaledResvg.render();
	const w = rendered.width;
	const h = rendered.height;
	const premulRgba = rendered.pixels.slice();
	rendered.free();
	scaledResvg.free();
	return {
		width: renderSize,
		height: renderSize,
		pixels: compositeBilinearAtOffset(demultiplyAlpha(premulRgba), w, h, tx, ty, renderSize)
	};
}
/**
* Composite a `srcW × srcH` straight-alpha RGBA buffer onto a fresh
* `targetSize × targetSize` transparent canvas at float offset
* `(tx, ty)`, sampling the source bilinearly.
*
* Mirrors the sub-pixel-accurate placement that Rust's tiny_skia gets
* for free via `Transform::post_translate(tx, ty)`.
*/
function compositeBilinearAtOffset(src, srcW, srcH, tx, ty, targetSize) {
	const out = new Uint8Array(targetSize * targetSize * 4);
	for (let Y = 0; Y < targetSize; Y++) {
		const yf = Y - ty;
		if (yf <= -1 || yf >= srcH) continue;
		const y0 = Math.floor(yf);
		const yFrac = yf - y0;
		const y1 = y0 + 1;
		for (let X = 0; X < targetSize; X++) {
			const xf = X - tx;
			if (xf <= -1 || xf >= srcW) continue;
			const x0 = Math.floor(xf);
			const xFrac = xf - x0;
			const x1 = x0 + 1;
			const w00 = (1 - xFrac) * (1 - yFrac);
			const w10 = xFrac * (1 - yFrac);
			const w01 = (1 - xFrac) * yFrac;
			const w11 = xFrac * yFrac;
			let r = 0, g = 0, b = 0, a = 0;
			if (x0 >= 0 && x0 < srcW && y0 >= 0 && y0 < srcH) {
				const i = (y0 * srcW + x0) * 4;
				r += src[i] * w00;
				g += src[i + 1] * w00;
				b += src[i + 2] * w00;
				a += src[i + 3] * w00;
			}
			if (x1 >= 0 && x1 < srcW && y0 >= 0 && y0 < srcH) {
				const i = (y0 * srcW + x1) * 4;
				r += src[i] * w10;
				g += src[i + 1] * w10;
				b += src[i + 2] * w10;
				a += src[i + 3] * w10;
			}
			if (x0 >= 0 && x0 < srcW && y1 >= 0 && y1 < srcH) {
				const i = (y1 * srcW + x0) * 4;
				r += src[i] * w01;
				g += src[i + 1] * w01;
				b += src[i + 2] * w01;
				a += src[i + 3] * w01;
			}
			if (x1 >= 0 && x1 < srcW && y1 >= 0 && y1 < srcH) {
				const i = (y1 * srcW + x1) * 4;
				r += src[i] * w11;
				g += src[i + 1] * w11;
				b += src[i + 2] * w11;
				a += src[i + 3] * w11;
			}
			const o = (Y * targetSize + X) * 4;
			out[o] = Math.round(r) & 255;
			out[o + 1] = Math.round(g) & 255;
			out[o + 2] = Math.round(b) & 255;
			out[o + 3] = Math.round(a) & 255;
		}
	}
	return out;
}
/** Convert premultiplied RGBA to straight RGBA (mirror of rust `demultiply_alpha`). */
/** @internal */
function demultiplyAlpha(data) {
	const out = new Uint8Array(data.length);
	for (let i = 0; i < data.length; i += 4) {
		const a = data[i + 3];
		if (a === 0) {
			out[i] = 0;
			out[i + 1] = 0;
			out[i + 2] = 0;
			out[i + 3] = 0;
		} else if (a === 255) {
			out[i] = data[i];
			out[i + 1] = data[i + 1];
			out[i + 2] = data[i + 2];
			out[i + 3] = 255;
		} else {
			out[i] = Math.floor((data[i] * 255 + Math.floor(a / 2)) / a) & 255;
			out[i + 1] = Math.floor((data[i + 1] * 255 + Math.floor(a / 2)) / a) & 255;
			out[i + 2] = Math.floor((data[i + 2] * 255 + Math.floor(a / 2)) / a) & 255;
			out[i + 3] = a;
		}
	}
	return out;
}
//#endregion
export { CORRECTION_LEVELS, Color, DEFAULT_MAX_MODULES, LOGO_CLEAR_SHAPES, Logo, MUR_ERROR_CODES, MurError, RenderedImage, checkQrDensity, encodeAnimatedGif, generateFrames, logoFromSvg, qrModuleCount, rasterizeSvg, renderQr, renderUrQr, writeFramePngs };
