/**
 * Copyright © 2026 Blockchain Commons, LLC
 *
 * NeuQuant colour quantisation, a port of the `color_quant` crate (1.1.0)
 * the reference's animated-GIF encoder uses for frames of more than 256
 * colours. The arithmetic is kept in the crate's order and precision
 * (`f64` for the network, 32-bit integers for the colour map) so the
 * palette and every index are the reference's. See LICENSE-COLOR-QUANT.
 */

const CHANNELS = 4;
const RADIUS_DEC = 30;
const ALPHA_BIASSHIFT = 10;
const INIT_ALPHA = 1 << ALPHA_BIASSHIFT;
const GAMMA = 1024.0;
const BETA = 1.0 / GAMMA;
const BETAGAMMA = BETA * GAMMA;
/** Four primes near 500; no image has a length divisible by all four. */
const PRIMES = [499, 491, 478, 503] as const;

interface Quad {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Rust's `f64::round`: half away from zero. */
const round = (x: number): number => (x < 0 ? -Math.round(-x) : Math.round(x));

const clamp = (a: number): number => (a < 0 ? 0 : a > 255 ? 255 : a);

/** @internal A trained NeuQuant network over RGBA pixels: `NeuQuant::new(samplefac, colors, pixels)`. */
export class NeuQuant {
  private readonly network: Quad[] = [];
  private readonly colormap: Quad[] = [];
  private readonly netindex: number[] = new Array<number>(256).fill(0);
  private readonly bias: number[] = [];
  private readonly freq: number[] = [];
  private readonly samplefac: number;
  private readonly netsize: number;

  /**
   * Trains a network of `colors` neurons on `pixels` (RGBA), sampling one
   * pixel in `samplefac` (1–30; the reference passes 10).
   */
  constructor(samplefac: number, colors: number, pixels: Uint8Array) {
    this.samplefac = samplefac;
    this.netsize = colors;
    this.init(pixels);
  }

  private init(pixels: Uint8Array): void {
    const freq = 1 / this.netsize;
    for (let i = 0; i < this.netsize; i++) {
      const tmp = (i * 256.0) / this.netsize;
      // Alpha starts at 0 for the darkest neurons.
      const a = i < 16 ? i * 16.0 : 255.0;
      this.network.push({ r: tmp, g: tmp, b: tmp, a });
      this.colormap.push({ r: 0, g: 0, b: 0, a: 255 });
      this.freq.push(freq);
      this.bias.push(0.0);
    }
    this.learn(pixels);
    this.buildColormap();
    this.buildNetindex();
  }

  /** The index of the colour-map entry closest to the RGBA pixel (`index_of`). */
  indexOf(r: number, g: number, b: number, a: number): number {
    return this.searchNetindex(b, g, r, a);
  }

  /** The colour-map entry at `idx` as `[r, g, b, a]`, or `undefined` past the end (`lookup`). */
  lookup(idx: number): [number, number, number, number] | undefined {
    const p = this.colormap[idx];
    return p === undefined ? undefined : [p.r, p.g, p.b, p.a];
  }

  /** Moves neuron `i` towards the biased colour by `alpha`. */
  private alterSingle(alpha: number, i: number, quad: Quad): void {
    const n = this.network[i];
    n.b -= alpha * (n.b - quad.b);
    n.g -= alpha * (n.g - quad.g);
    n.r -= alpha * (n.r - quad.r);
    n.a -= alpha * (n.a - quad.a);
  }

  /** Moves the neurons within `rad` of `i` towards the biased colour, less the further they are. */
  private alterNeighbour(alpha: number, rad: number, i: number, quad: Quad): void {
    const lo = Math.max(i - rad, 0);
    const hi = Math.min(i + rad, this.netsize);
    let j = i + 1;
    let k = i - 1;
    let q = 0;
    while (j < hi || k > lo) {
      const radSq = rad * rad;
      const a = (alpha * (radSq - q * q)) / radSq;
      q += 1;
      if (j < hi) {
        const p = this.network[j];
        p.b -= a * (p.b - quad.b);
        p.g -= a * (p.g - quad.g);
        p.r -= a * (p.r - quad.r);
        p.a -= a * (p.a - quad.a);
        j += 1;
      }
      if (k > lo) {
        const p = this.network[k];
        p.b -= a * (p.b - quad.b);
        p.g -= a * (p.g - quad.g);
        p.r -= a * (p.r - quad.r);
        p.a -= a * (p.a - quad.a);
        k -= 1;
      }
    }
  }

  /**
   * Finds the closest neuron (updating its frequency) and returns the best
   * neuron by biased distance: frequently chosen neurons get a negative bias.
   */
  private contest(b: number, g: number, r: number, a: number): number {
    let bestd = Number.MAX_VALUE;
    let bestbiasd = bestd;
    let bestpos = -1;
    let bestbiaspos = bestpos;
    for (let i = 0; i < this.netsize; i++) {
      const bestbiasdBiased = bestbiasd + this.bias[i];
      const n = this.network[i];
      let dist = Math.abs(n.b - b);
      dist += Math.abs(n.r - r);
      if (dist < bestd || dist < bestbiasdBiased) {
        dist += Math.abs(n.g - g);
        dist += Math.abs(n.a - a);
        if (dist < bestd) {
          bestd = dist;
          bestpos = i;
        }
        const biasdist = dist - this.bias[i];
        if (biasdist < bestbiasd) {
          bestbiasd = biasdist;
          bestbiaspos = i;
        }
      }
      this.freq[i] -= BETA * this.freq[i];
      this.bias[i] += BETAGAMMA * this.freq[i];
    }
    this.freq[bestpos] += BETA;
    this.bias[bestpos] -= BETAGAMMA;
    return bestbiaspos;
  }

  /** The main learning loop; the cycle count and parameters are tuned for 26–256 colours. */
  private learn(pixels: Uint8Array): void {
    const initrad = Math.trunc(this.netsize / 8);
    const radiusbiasshift = 6;
    const radiusbias = 1 << radiusbiasshift;
    const initBiasRadius = initrad * radiusbias;
    let biasRadius = initBiasRadius;
    const alphadec = 30 + Math.trunc((this.samplefac - 1) / 3);
    const lengthcount = Math.trunc(pixels.length / CHANNELS);
    const samplepixels = Math.trunc(lengthcount / this.samplefac);
    const half = this.netsize >> 1;
    const nCycles = half <= 100 ? 100 : half;
    const perCycle = Math.trunc(samplepixels / nCycles);
    const delta = perCycle === 0 ? 1 : perCycle;
    let alpha = INIT_ALPHA;
    let rad = biasRadius >> radiusbiasshift;
    if (rad <= 1) rad = 0;
    let pos = 0;
    const step = PRIMES.find((prime) => lengthcount % prime !== 0) ?? PRIMES[3];
    let i = 0;
    while (i < samplepixels) {
      const at = CHANNELS * pos;
      const r = pixels[at];
      const g = pixels[at + 1];
      const b = pixels[at + 2];
      const a = pixels[at + 3];
      const j = this.contest(b, g, r, a);
      const alphaF = (1.0 * alpha) / INIT_ALPHA;
      const quad: Quad = { b, g, r, a };
      this.alterSingle(alphaF, j, quad);
      if (rad > 0) this.alterNeighbour(alphaF, rad, j, quad);
      pos += step;
      while (pos >= lengthcount) pos -= lengthcount;
      i += 1;
      if (i % delta === 0) {
        alpha -= Math.trunc(alpha / alphadec);
        biasRadius -= Math.trunc(biasRadius / RADIUS_DEC);
        rad = biasRadius >> radiusbiasshift;
        if (rad <= 1) rad = 0;
      }
    }
  }

  /** Rounds the network into the colour map. */
  private buildColormap(): void {
    for (let i = 0; i < this.netsize; i++) {
      this.colormap[i].b = clamp(round(this.network[i].b));
      this.colormap[i].g = clamp(round(this.network[i].g));
      this.colormap[i].r = clamp(round(this.network[i].r));
      this.colormap[i].a = clamp(round(this.network[i].a));
    }
  }

  /** Sorts the colour map on green (selection sort) and builds the green index. */
  private buildNetindex(): void {
    let previouscol = 0;
    let startpos = 0;
    for (let i = 0; i < this.netsize; i++) {
      let smallpos = i;
      let smallval = this.colormap[i].g;
      for (let j = i + 1; j < this.netsize; j++) {
        if (this.colormap[j].g < smallval) {
          smallpos = j;
          smallval = this.colormap[j].g;
        }
      }
      if (i !== smallpos) {
        const q = this.colormap[smallpos];
        this.colormap[smallpos] = this.colormap[i];
        this.colormap[i] = q;
      }
      if (smallval !== previouscol) {
        this.netindex[previouscol] = (startpos + i) >> 1;
        for (let j = previouscol + 1; j < smallval; j++) this.netindex[j] = i;
        previouscol = smallval;
        startpos = i;
      }
    }
    const maxNetpos = this.netsize - 1;
    this.netindex[previouscol] = (startpos + maxNetpos) >> 1;
    for (let j = previouscol + 1; j < 256; j++) this.netindex[j] = maxNetpos;
  }

  /** The best-matching colour-map index, searching outwards from the green index. */
  private searchNetindex(b: number, g: number, r: number, a: number): number {
    let bestd = 1 << 30;
    let best = 0;
    let i = this.netindex[g];
    let j = i > 0 ? i - 1 : 0;
    while (i < this.netsize || j > 0) {
      if (i < this.netsize) {
        const p = this.colormap[i];
        let e = p.g - g;
        let dist = e * e;
        if (dist >= bestd) break;
        e = p.b - b;
        dist += e * e;
        if (dist < bestd) {
          e = p.r - r;
          dist += e * e;
          if (dist < bestd) {
            e = p.a - a;
            dist += e * e;
            if (dist < bestd) {
              bestd = dist;
              best = i;
            }
          }
        }
        i += 1;
      }
      if (j > 0) {
        const p = this.colormap[j];
        let e = p.g - g;
        let dist = e * e;
        if (dist >= bestd) break;
        e = p.b - b;
        dist += e * e;
        if (dist < bestd) {
          e = p.r - r;
          dist += e * e;
          if (dist < bestd) {
            e = p.a - a;
            dist += e * e;
            if (dist < bestd) {
              bestd = dist;
              best = j;
            }
          }
        }
        j -= 1;
      }
    }
    return best;
  }
}
