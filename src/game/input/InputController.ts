import { moveToward } from "./inputMath";
import type { FrameInput, InputAction } from "../types";

const KEY_TO_ACTION: Record<string, InputAction | undefined> = {
  ArrowUp: "throttle",
  KeyW: "throttle",
  ArrowDown: "reverse",
  KeyS: "reverse",
  ArrowLeft: "steerLeft",
  KeyA: "steerLeft",
  ArrowRight: "steerRight",
  KeyD: "steerRight",
  KeyR: "reset",
  Escape: "pause",
  KeyP: "pause",
  KeyC: "cameraRecenter",
};

function prefersTouchControls(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

export class InputController {
  private readonly pressedKeys = new Set<InputAction>();
  private readonly touchState = new Map<InputAction, boolean>();
  private steerAxis = 0;
  private pauseQueued = false;
  private resetQueued = false;
  private cameraRecenterQueued = false;
  private moved = false;
  private usingTouch = prefersTouchControls();

  constructor(private readonly target: EventTarget = window) {
    this.target.addEventListener("keydown", this.handleKeyDown as EventListener);
    this.target.addEventListener("keyup", this.handleKeyUp as EventListener);
  }

  get hasMoved(): boolean {
    return this.moved;
  }

  get touchPreferred(): boolean {
    return prefersTouchControls();
  }

  bindTouchButton(action: InputAction, element: HTMLElement): void {
    const activate = (event: Event) => {
      event.preventDefault();
      this.usingTouch = true;
      this.touchState.set(action, true);
      element.classList.add("is-active");
    };

    const deactivate = (event: Event) => {
      event.preventDefault();
      this.touchState.set(action, false);
      element.classList.remove("is-active");
    };

    element.addEventListener("pointerdown", activate);
    element.addEventListener("pointerup", deactivate);
    element.addEventListener("pointerleave", deactivate);
    element.addEventListener("pointercancel", deactivate);
  }

  update(deltaSeconds: number): FrameInput {
    const throttle = this.isPressed("throttle") ? 1 : 0;
    const reverse = this.isPressed("reverse") ? 1 : 0;
    const left = this.isPressed("steerLeft");
    const right = this.isPressed("steerRight");
    const steerTarget = left === right ? 0 : left ? -1 : 1;
    const isTouch = this.usingTouch && this.touchPreferred;

    this.steerAxis = moveToward(
      this.steerAxis,
      steerTarget,
      steerTarget === 0 ? (isTouch ? 8.5 : 10.5) : isTouch ? 5.5 : 9,
      deltaSeconds,
    );

    const input: FrameInput = {
      throttle,
      reverse,
      steer: this.steerAxis,
      wantsReset: this.consumeFlag("reset"),
      wantsPause: this.consumeFlag("pause"),
      wantsCameraRecenter: this.consumeFlag("cameraRecenter"),
      active: throttle > 0 || reverse > 0 || Math.abs(this.steerAxis) > 0.08,
      usingTouch: isTouch,
    };

    if (input.active) {
      this.moved = true;
    }

    return input;
  }

  destroy(): void {
    this.target.removeEventListener("keydown", this.handleKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.handleKeyUp as EventListener);
  }

  private isPressed(action: InputAction): boolean {
    return this.pressedKeys.has(action) || this.touchState.get(action) === true;
  }

  private consumeFlag(flag: "pause" | "reset" | "cameraRecenter"): boolean {
    if (flag === "pause" && this.pauseQueued) {
      this.pauseQueued = false;
      return true;
    }

    if (flag === "reset" && this.resetQueued) {
      this.resetQueued = false;
      return true;
    }

    if (flag === "cameraRecenter" && this.cameraRecenterQueued) {
      this.cameraRecenterQueued = false;
      return true;
    }

    return false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_TO_ACTION[event.code];

    if (!action) {
      return;
    }

    this.usingTouch = false;

    if (action === "pause") {
      if (!event.repeat) {
        this.pauseQueued = true;
      }
      event.preventDefault();
      return;
    }

    if (action === "reset") {
      if (!event.repeat) {
        this.resetQueued = true;
      }
      event.preventDefault();
      return;
    }

    if (action === "cameraRecenter") {
      if (!event.repeat) {
        this.cameraRecenterQueued = true;
      }
      event.preventDefault();
      return;
    }

    this.pressedKeys.add(action);
    event.preventDefault();
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_TO_ACTION[event.code];

    if (!action || action === "pause" || action === "reset" || action === "cameraRecenter") {
      return;
    }

    this.pressedKeys.delete(action);
    event.preventDefault();
  };
}
