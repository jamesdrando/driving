import { describe, expect, it } from "vitest";
import { BUGGY_PRESET } from "../src/game/simulation/buggyPreset";
import { computeDriveForce, shouldSelfRight } from "../src/physics/vehicleMath";

describe("computeDriveForce", () => {
  it("pushes the buggy forward under the top speed cap", () => {
    expect(computeDriveForce(1, 6, 0.25, BUGGY_PRESET)).toBeGreaterThan(0);
  });

  it("switches to braking when reversing against forward motion", () => {
    expect(computeDriveForce(-1, 8, 0.25, BUGGY_PRESET)).toBeLessThan(0);
  });

  it("adds passive drag when the player releases the pedals", () => {
    expect(computeDriveForce(0, 5, 0.25, BUGGY_PRESET)).toBeLessThan(0);
  });
});

describe("shouldSelfRight", () => {
  it("requires the buggy to be inverted, slow, and over the timeout", () => {
    expect(shouldSelfRight(0.1, 1.2, 1.1, 1.6, 1.8)).toBe(true);
    expect(shouldSelfRight(0.4, 1.2, 1.1, 1.6, 1.8)).toBe(false);
    expect(shouldSelfRight(0.1, 4.8, 1.1, 1.6, 1.8)).toBe(false);
  });
});
