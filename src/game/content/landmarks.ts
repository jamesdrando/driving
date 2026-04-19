import { createSeededRng } from "./random";
import type { LandmarkDescriptor, TerrainData, WorldSeed } from "../types";

function distanceSquared(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function buildMonolith(index: number, x: number, y: number, z: number, rotationY: number): LandmarkDescriptor {
  return {
    id: `monolith-${index}`,
    kind: "monolith",
    position: [x, y, z],
    rotationY,
    parts: [
      {
        halfExtents: [1.6, 7.5, 1.8],
        offset: [0, 7.5, 0],
        rotation: [0, 0.08, 0],
        color: "#8c5d36",
      },
      {
        halfExtents: [2.4, 1.1, 2.4],
        offset: [0, 1.1, 0],
        rotation: [0, 0, 0],
        color: "#a97244",
      },
    ],
  };
}

function buildArch(index: number, x: number, y: number, z: number, rotationY: number): LandmarkDescriptor {
  return {
    id: `arch-${index}`,
    kind: "arch",
    position: [x, y, z],
    rotationY,
    parts: [
      {
        halfExtents: [1.3, 4.5, 1.6],
        offset: [-3.6, 4.5, 0],
        rotation: [0, 0, 0],
        color: "#8f6038",
      },
      {
        halfExtents: [1.3, 4.8, 1.6],
        offset: [3.6, 4.8, 0],
        rotation: [0, 0, 0],
        color: "#83552f",
      },
      {
        halfExtents: [4.6, 1.1, 1.6],
        offset: [0, 9.2, 0],
        rotation: [0.05, 0, 0],
        color: "#ba8350",
      },
    ],
  };
}

function buildRamp(index: number, x: number, y: number, z: number, rotationY: number): LandmarkDescriptor {
  return {
    id: `ramp-${index}`,
    kind: "ramp",
    position: [x, y, z],
    rotationY,
    parts: [
      {
        halfExtents: [4.6, 0.7, 9.4],
        offset: [0, 2.3, 0],
        rotation: [-0.36, 0, 0],
        color: "#c88a4a",
      },
      {
        halfExtents: [5.4, 0.45, 1.6],
        offset: [0, 0.45, -7.1],
        rotation: [0, 0, 0],
        color: "#8c5d36",
      },
    ],
  };
}

export function createLandmarks(worldSeed: WorldSeed, terrain: TerrainData): LandmarkDescriptor[] {
  const rng = createSeededRng(worldSeed.value ^ 0x5a5aa5a5);
  const descriptors: LandmarkDescriptor[] = [];
  const occupied: Array<[number, number]> = [[terrain.spawnPoint[0], terrain.spawnPoint[2]]];
  const count = 14;
  let attempts = 0;

  while (descriptors.length < count && attempts < 500) {
    attempts += 1;
    const radius = terrain.config.spawnPadding + 30 + rng() * (terrain.boundsRadius - 45);
    const angle = rng() * Math.PI * 2;
    const x = Math.cos(angle) * radius + (rng() - 0.5) * 16;
    const z = Math.sin(angle) * radius + (rng() - 0.5) * 16;

    if (distanceSquared(x, z, terrain.spawnPoint[0], terrain.spawnPoint[2]) < terrain.config.spawnPadding ** 2) {
      continue;
    }

    if (occupied.some(([ox, oz]) => distanceSquared(x, z, ox, oz) < 28 ** 2)) {
      continue;
    }

    const rotationY = rng() * Math.PI * 2;
    const y = terrain.sampleHeight(x, z);
    const pick = rng();
    const index = descriptors.length;

    if (pick < 0.33) {
      descriptors.push(buildMonolith(index, x, y, z, rotationY));
    } else if (pick < 0.66) {
      descriptors.push(buildArch(index, x, y, z, rotationY));
    } else {
      descriptors.push(buildRamp(index, x, y, z, rotationY));
    }

    occupied.push([x, z]);
  }

  return descriptors;
}
