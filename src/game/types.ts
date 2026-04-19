export type GameState = "playing" | "paused" | "resetting";

export type InputAction =
  | "throttle"
  | "reverse"
  | "steerLeft"
  | "steerRight"
  | "reset"
  | "pause"
  | "cameraRecenter";

export interface FrameInput {
  throttle: number;
  reverse: number;
  steer: number;
  wantsReset: boolean;
  wantsPause: boolean;
  wantsCameraRecenter: boolean;
  active: boolean;
  usingTouch: boolean;
}

export interface VehiclePreset {
  mass: number;
  topSpeed: number;
  engineForce: number;
  reverseForce: number;
  brakeForce: number;
  steeringAngle: number;
  steeringResponse: number;
  steeringReturn: number;
  suspensionRestLength: number;
  suspensionTravel: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  lateralGrip: number;
  longitudinalGrip: number;
  antiRoll: number;
  airUprightTorque: number;
  airYawTorque: number;
  airPitchTorque: number;
  selfRightDelay: number;
  linearDamping: number;
  angularDamping: number;
}

export interface WorldSeed {
  value: number;
}

export interface TerrainConfig {
  width: number;
  depth: number;
  segments: number;
  valleyDepth: number;
  edgeLift: number;
  duneScale: number;
  duneAmplitude: number;
  ridgeScale: number;
  ridgeAmplitude: number;
  spawnPadding: number;
}

export interface TerrainData {
  config: TerrainConfig;
  heightMap: Float32Array;
  vertices: Float32Array;
  indices: Uint32Array;
  boundsRadius: number;
  spawnPoint: [number, number, number];
  sampleHeight: (x: number, z: number) => number;
  sampleNormal: (x: number, z: number) => [number, number, number];
}

export interface LandmarkPart {
  halfExtents: [number, number, number];
  offset: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

export interface LandmarkDescriptor {
  id: string;
  kind: "arch" | "monolith" | "ramp";
  position: [number, number, number];
  rotationY: number;
  parts: LandmarkPart[];
}
