export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(seed: number, x: number, z: number): number {
  let h = seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(z, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2d);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function valueNoise2D(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  const tx = x - x0;
  const tz = z - z0;
  const sx = smoothstep(tx);
  const sz = smoothstep(tz);

  const n00 = hash2(seed, x0, z0);
  const n10 = hash2(seed, x1, z0);
  const n01 = hash2(seed, x0, z1);
  const n11 = hash2(seed, x1, z1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;

  return nx0 + (nx1 - nx0) * sz;
}

export function fbm2D(
  seed: number,
  x: number,
  z: number,
  octaves: number,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += (valueNoise2D(seed + octave * 97, x * frequency, z * frequency) * 2 - 1) * amplitude;
    normalizer += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return total / normalizer;
}
