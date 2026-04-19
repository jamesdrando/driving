import type { VehiclePreset } from "../types";

export const MONSTER_TRUCK_PRESET: VehiclePreset = {
  mass: 16.8,
  topSpeed: 27,
  engineForce: 365,
  reverseForce: 168,
  brakeForce: 182,
  steeringAngle: 0.72,
  steeringResponse: 5.6,
  steeringReturn: 6.8,
  suspensionRestLength: 1.12,
  suspensionTravel: 0.9,
  suspensionStiffness: 44,
  suspensionDamping: 8.7,
  lateralGrip: 21,
  longitudinalGrip: 18,
  antiRoll: 18,
  airUprightTorque: 8.2,
  airYawTorque: 3.6,
  airPitchTorque: 1.4,
  selfRightDelay: 2,
  linearDamping: 0.26,
  angularDamping: 1.14,
};

export const BUGGY_PRESET = MONSTER_TRUCK_PRESET;
