import type { VehiclePreset } from "../game/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeDriveForce(
  driveInput: number,
  forwardSpeed: number,
  driveShare: number,
  preset: VehiclePreset,
): number {
  if (Math.abs(driveInput) < 0.001) {
    return -forwardSpeed * preset.longitudinalGrip * driveShare;
  }

  const movingSameDirection =
    Math.sign(forwardSpeed) === 0 || Math.sign(forwardSpeed) === Math.sign(driveInput);

  if (!movingSameDirection && Math.abs(forwardSpeed) > 1.8) {
    return -Math.sign(forwardSpeed) * preset.brakeForce * driveShare;
  }

  const targetTopSpeed = driveInput > 0 ? preset.topSpeed : preset.topSpeed * 0.45;
  const forceBudget = driveInput > 0 ? preset.engineForce : preset.reverseForce;
  const speedRatio = clamp(Math.abs(forwardSpeed) / targetTopSpeed, 0, 1);

  return driveInput * forceBudget * driveShare * Math.max(0.12, 1 - speedRatio * 0.92);
}

export function shouldSelfRight(
  upDot: number,
  linearSpeed: number,
  angularSpeed: number,
  timeoutSeconds: number,
  timerSeconds: number,
): boolean {
  return upDot < 0.18 && linearSpeed < 2.6 && angularSpeed < 3.2 && timerSeconds >= timeoutSeconds;
}
