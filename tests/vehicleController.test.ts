import { describe, expect, it } from "vitest";
import { createTerrainData } from "../src/game/content/terrain";
import { BUGGY_PRESET } from "../src/game/simulation/buggyPreset";
import type { FrameInput } from "../src/game/types";
import { VehicleController } from "../src/physics/VehicleController";
import { createPhysicsWorld, addTerrainCollider } from "../src/physics/world";

const idleInput: FrameInput = {
  throttle: 0,
  reverse: 0,
  steer: 0,
  wantsReset: false,
  wantsPause: false,
  wantsCameraRecenter: false,
  active: false,
  usingTouch: false,
};

const throttleInput: FrameInput = {
  ...idleInput,
  throttle: 1,
  active: true,
};

describe("VehicleController", () => {
  it("spawns near the ground without explosive angular velocity", async () => {
    const terrain = createTerrainData({ value: 48327 });
    const world = await createPhysicsWorld();
    world.timestep = 1 / 60;
    addTerrainCollider(world, terrain);

    const vehicle = new VehicleController(world, terrain, BUGGY_PRESET, terrain.spawnPoint);

    for (let index = 0; index < 120; index += 1) {
      vehicle.step(idleInput, 1 / 60);
      world.step();
    }

    const debug = vehicle.getDebugState();
    const groundY = terrain.sampleHeight(debug.position.x, debug.position.z);

    expect(debug.angularSpeed).toBeLessThan(8);
    expect(debug.linearSpeed).toBeLessThan(12);
    expect(debug.position.y).toBeGreaterThan(groundY + 0.5);
    expect(debug.position.y).toBeLessThan(groundY + 3);
    expect(debug.groundedWheels).toBeGreaterThan(1);
  });

  it("stays mostly upright under sustained throttle on the spawn patch", async () => {
    const terrain = createTerrainData({ value: 48327 });
    const world = await createPhysicsWorld();
    world.timestep = 1 / 60;
    addTerrainCollider(world, terrain);

    const vehicle = new VehicleController(world, terrain, BUGGY_PRESET, terrain.spawnPoint);

    for (let index = 0; index < 90; index += 1) {
      vehicle.step(throttleInput, 1 / 60);
      world.step();
    }

    const debug = vehicle.getDebugState();

    expect(debug.upDot).toBeGreaterThan(0.72);
    expect(debug.angularSpeed).toBeLessThan(6);
    expect(debug.groundedWheels).toBeGreaterThan(1);
    expect(debug.position.z - terrain.spawnPoint[2]).toBeGreaterThan(3);
  });
});
