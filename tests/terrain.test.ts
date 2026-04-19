import { describe, expect, it } from "vitest";
import { createTerrainData } from "../src/game/content/terrain";

describe("createTerrainData", () => {
  it("produces identical height samples for the same seed", () => {
    const terrainA = createTerrainData({ value: 12345 });
    const terrainB = createTerrainData({ value: 12345 });

    expect(Array.from(terrainA.heightMap.slice(0, 64))).toEqual(Array.from(terrainB.heightMap.slice(0, 64)));
    expect(terrainA.sampleHeight(18.2, -41.7)).toBeCloseTo(terrainB.sampleHeight(18.2, -41.7), 8);
  });

  it("changes the terrain profile when the seed changes", () => {
    const terrainA = createTerrainData({ value: 12345 });
    const terrainB = createTerrainData({ value: 98765 });

    expect(terrainA.sampleHeight(42, 18)).not.toBeCloseTo(terrainB.sampleHeight(42, 18), 4);
  });

  it("returns a normalized surface normal", () => {
    const terrain = createTerrainData({ value: 48327 });
    const [x, y, z] = terrain.sampleNormal(12, -20);
    const length = Math.hypot(x, y, z);

    expect(length).toBeCloseTo(1, 5);
    expect(y).toBeGreaterThan(0.25);
  });
});
