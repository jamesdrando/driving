export function moveToward(current: number, target: number, rate: number, deltaSeconds: number): number {
  const maxStep = rate * deltaSeconds;

  if (Math.abs(target - current) <= maxStep) {
    return target;
  }

  return current + Math.sign(target - current) * maxStep;
}
