import { fbm2D } from "./random";
import type { TerrainConfig, TerrainData, WorldSeed } from "../types";

const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 420,
  depth: 420,
  segments: 140,
  valleyDepth: 24,
  edgeLift: 34,
  duneScale: 0.015,
  duneAmplitude: 12,
  ridgeScale: 0.035,
  ridgeAmplitude: 4.5,
  spawnPadding: 34,
};

const SPAWN_X = 0;
const SPAWN_Z_FACTOR = -0.18;
const SPAWN_FLAT_RADIUS = 24;
const SPAWN_BLEND_RADIUS = 58;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildRawTerrainHeight(seed: number, config: TerrainConfig, x: number, z: number): number {
  const nx = x / (config.width * 0.5);
  const nz = z / (config.depth * 0.5);
  const radial = Math.min(1, Math.sqrt(nx * nx + nz * nz));

  const bowl = radial * radial * config.edgeLift - (1 - radial) * config.valleyDepth;
  const dunes = fbm2D(seed, x * config.duneScale, z * config.duneScale, 5) * config.duneAmplitude;
  const ripples = fbm2D(seed + 77, x * config.ridgeScale, z * config.ridgeScale, 3) * config.ridgeAmplitude;
  const ridgeMask = Math.pow(radial, 1.4);

  return bowl + dunes + Math.abs(ripples) * ridgeMask * 1.8;
}

function smoothBlend(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function blendSpawnPatch(
  rawHeight: number,
  x: number,
  z: number,
  spawnZ: number,
  spawnHeight: number,
): number {
  const spawnDistance = Math.hypot(x - SPAWN_X, z - spawnZ);
  const flatBlend = smoothBlend(SPAWN_FLAT_RADIUS, SPAWN_BLEND_RADIUS, spawnDistance);
  const edgeRise = Math.max(0, spawnDistance - SPAWN_FLAT_RADIUS);
  const shapedSpawnHeight = spawnHeight + Math.min(edgeRise * 0.016, 1.2);
  return interpolate(shapedSpawnHeight, rawHeight, flatBlend);
}

function sampleBilinear(heightMap: Float32Array, config: TerrainConfig, x: number, z: number): number {
  const halfWidth = config.width * 0.5;
  const halfDepth = config.depth * 0.5;
  const rowSize = config.segments + 1;

  const u = clamp((x + halfWidth) / config.width, 0, 1) * config.segments;
  const v = clamp((z + halfDepth) / config.depth, 0, 1) * config.segments;

  const x0 = Math.floor(u);
  const z0 = Math.floor(v);
  const x1 = Math.min(config.segments, x0 + 1);
  const z1 = Math.min(config.segments, z0 + 1);

  const tx = u - x0;
  const tz = v - z0;

  const h00 = heightMap[z0 * rowSize + x0];
  const h10 = heightMap[z0 * rowSize + x1];
  const h01 = heightMap[z1 * rowSize + x0];
  const h11 = heightMap[z1 * rowSize + x1];

  const hx0 = interpolate(h00, h10, tx);
  const hx1 = interpolate(h01, h11, tx);

  return interpolate(hx0, hx1, tz);
}

function sampleNormal(heightMap: Float32Array, config: TerrainConfig, x: number, z: number): [number, number, number] {
  const offset = 1.5;
  const left = sampleBilinear(heightMap, config, x - offset, z);
  const right = sampleBilinear(heightMap, config, x + offset, z);
  const down = sampleBilinear(heightMap, config, x, z - offset);
  const up = sampleBilinear(heightMap, config, x, z + offset);

  const normalX = left - right;
  const normalY = 2 * offset;
  const normalZ = down - up;
  const length = Math.hypot(normalX, normalY, normalZ) || 1;

  return [normalX / length, normalY / length, normalZ / length];
}

export function createTerrainData(
  worldSeed: WorldSeed,
  overrides: Partial<TerrainConfig> = {},
): TerrainData {
  const config: TerrainConfig = { ...DEFAULT_TERRAIN_CONFIG, ...overrides };
  const rowSize = config.segments + 1;
  const vertexCount = rowSize * rowSize;
  const heightMap = new Float32Array(vertexCount);
  const vertices = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(config.segments * config.segments * 6);
  const halfWidth = config.width * 0.5;
  const halfDepth = config.depth * 0.5;
  const stepX = config.width / config.segments;
  const stepZ = config.depth / config.segments;
  const spawnX = SPAWN_X;
  const spawnZ = config.depth * SPAWN_Z_FACTOR;
  const rawSpawnHeight = buildRawTerrainHeight(worldSeed.value, config, spawnX, spawnZ);

  for (let row = 0; row <= config.segments; row += 1) {
    const z = -halfDepth + row * stepZ;

    for (let col = 0; col <= config.segments; col += 1) {
      const x = -halfWidth + col * stepX;
      const index = row * rowSize + col;
      const rawHeight = buildRawTerrainHeight(worldSeed.value, config, x, z);
      const height = blendSpawnPatch(rawHeight, x, z, spawnZ, rawSpawnHeight);
      const vertexIndex = index * 3;

      heightMap[index] = height;
      vertices[vertexIndex] = x;
      vertices[vertexIndex + 1] = height;
      vertices[vertexIndex + 2] = z;
    }
  }

  let indexOffset = 0;
  for (let row = 0; row < config.segments; row += 1) {
    for (let col = 0; col < config.segments; col += 1) {
      const a = row * rowSize + col;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;

      indices[indexOffset] = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
      indexOffset += 6;
    }
  }

  const spawnY = sampleBilinear(heightMap, config, spawnX, spawnZ) + 1.4;

  return {
    config,
    heightMap,
    vertices,
    indices,
    boundsRadius: Math.min(config.width, config.depth) * 0.44,
    spawnPoint: [spawnX, spawnY, spawnZ],
    sampleHeight: (x: number, z: number) => sampleBilinear(heightMap, config, x, z),
    sampleNormal: (x: number, z: number) => sampleNormal(heightMap, config, x, z),
  };
}
