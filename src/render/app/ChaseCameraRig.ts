import { PerspectiveCamera, Vector3 } from "three";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class ChaseCameraRig {
  readonly camera: PerspectiveCamera;

  private readonly desiredLookAt = new Vector3();
  private readonly smoothedLookAt = new Vector3();
  private readonly desiredPosition = new Vector3();
  private yawOffset = 0;
  private pitchOffset = 0.34;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly sampleHeight: (x: number, z: number) => number,
  ) {
    this.camera = new PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 6, -10);

    domElement.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    domElement.addEventListener("contextmenu", this.preventContextMenu);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  recenter(): void {
    this.yawOffset = 0;
    this.pitchOffset = 0.34;
  }

  update(targetPosition: Vector3, forward: Vector3, speedSquared: number, deltaSeconds: number): void {
    const speed = Math.sqrt(speedSquared);
    const flatForward = forward.clone().setY(0).normalize();
    const vehicleYaw = Math.atan2(flatForward.x, flatForward.z);
    const lookAhead = 1.8 + Math.min(speed * 0.045, 2.2);
    const distance = 8.5 + Math.min(speed * 0.03, 2.6);
    const height = 3 + Math.min(speed * 0.02, 1.1);
    const yaw = vehicleYaw + this.yawOffset;

    this.desiredLookAt.copy(targetPosition).add(flatForward.multiplyScalar(lookAhead)).setY(targetPosition.y + 1.4);
    this.smoothedLookAt.lerp(this.desiredLookAt, 1 - Math.exp(-deltaSeconds * 5.4));

    this.desiredPosition.set(
      Math.sin(yaw) * distance,
      height + Math.sin(this.pitchOffset) * 2.8,
      Math.cos(yaw) * distance,
    );
    this.desiredPosition.x = this.smoothedLookAt.x - this.desiredPosition.x;
    this.desiredPosition.y = this.smoothedLookAt.y + 1.2 + Math.sin(this.pitchOffset) * 2.8;
    this.desiredPosition.z = this.smoothedLookAt.z - this.desiredPosition.z;
    this.desiredPosition.y = Math.max(
      this.desiredPosition.y,
      this.sampleHeight(this.desiredPosition.x, this.desiredPosition.z) + 1.8,
    );

    this.camera.position.lerp(this.desiredPosition, 1 - Math.exp(-deltaSeconds * 6.2));
    this.camera.position.y = Math.max(
      this.camera.position.y,
      this.sampleHeight(this.camera.position.x, this.camera.position.z) + 1.2,
    );
    this.camera.lookAt(this.smoothedLookAt);
  }

  destroy(): void {
    this.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.domElement.removeEventListener("contextmenu", this.preventContextMenu);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      return;
    }

    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerType === "touch") {
      return;
    }

    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.yawOffset -= deltaX * 0.005;
    this.pitchOffset = clamp(this.pitchOffset + deltaY * 0.0035, 0.18, 0.72);
  };

  private handlePointerUp = (): void => {
    this.dragging = false;
  };

  private preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
