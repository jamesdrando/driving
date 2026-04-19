import type { InputAction } from "../types";

export const ACTIONS: readonly InputAction[] = [
  "throttle",
  "reverse",
  "steerLeft",
  "steerRight",
  "reset",
  "pause",
  "cameraRecenter",
] as const;
