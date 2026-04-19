import type { InputAction } from "../game/types";

export class GameHud {
  readonly root: HTMLDivElement;

  private readonly hint: HTMLDivElement;
  private readonly speedValue: HTMLSpanElement;
  private readonly touchControls: HTMLDivElement;
  private readonly pauseOverlay: HTMLDivElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly resumeButton: HTMLButtonElement;
  private readonly standUpButton: HTMLButtonElement;
  private readonly touchButtons = new Map<InputAction, HTMLButtonElement>();

  constructor(container: HTMLElement, touchPreferred: boolean) {
    this.root = document.createElement("div");
    this.root.className = "hud-root";
    this.root.innerHTML = `
      <div class="hud-topbar">
        <div class="hud-chip">
          <span class="hud-chip-label">Free Drive</span>
          <span class="hud-chip-copy">Cruise the valley.</span>
        </div>
        <div class="hud-controls">
          <div class="hud-status">
            <span class="hud-status-label">Speed</span>
            <span class="hud-status-value">0 mph</span>
          </div>
          <button class="pause-button" type="button" aria-label="Pause">II</button>
        </div>
      </div>
      <div class="hud-hint">
        <strong>Drive:</strong>
        W / A / S / D or arrows. Drag to orbit the camera. Press C to recenter.
      </div>
      <div class="touch-controls ${touchPreferred ? "" : "hidden"}">
        <div class="touch-steering">
          <button class="touch-button" type="button" data-action="steerLeft">Left</button>
          <button class="touch-button" type="button" data-action="steerRight">Right</button>
        </div>
        <div class="touch-pedals">
          <button class="touch-button" type="button" data-action="reverse">Reverse</button>
          <button class="touch-button drive" type="button" data-action="throttle">Go</button>
        </div>
      </div>
      <div class="pause-overlay">
        <div class="pause-card">
          <p class="pause-title">Rest Stop</p>
          <p class="pause-copy">Pause the sandstorm, stand the buggy back up, or jump back in.</p>
          <div class="pause-actions">
            <button class="pause-action primary" type="button" data-role="resume">Resume</button>
            <button class="pause-action" type="button" data-role="standup">Stand Up</button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(this.root);

    const hint = this.root.querySelector<HTMLDivElement>(".hud-hint");
    const speedValue = this.root.querySelector<HTMLSpanElement>(".hud-status-value");
    const touchControls = this.root.querySelector<HTMLDivElement>(".touch-controls");
    const pauseOverlay = this.root.querySelector<HTMLDivElement>(".pause-overlay");
    const pauseButton = this.root.querySelector<HTMLButtonElement>(".pause-button");
    const resumeButton = this.root.querySelector<HTMLButtonElement>('[data-role="resume"]');
    const standUpButton = this.root.querySelector<HTMLButtonElement>('[data-role="standup"]');

    if (!hint || !speedValue || !touchControls || !pauseOverlay || !pauseButton || !resumeButton || !standUpButton) {
      throw new Error("Failed to create HUD.");
    }

    this.hint = hint;
    this.speedValue = speedValue;
    this.touchControls = touchControls;
    this.pauseOverlay = pauseOverlay;
    this.pauseButton = pauseButton;
    this.resumeButton = resumeButton;
    this.standUpButton = standUpButton;

    for (const button of Array.from(this.root.querySelectorAll<HTMLButtonElement>("[data-action]"))) {
      const action = button.dataset.action as InputAction | undefined;

      if (action) {
        this.touchButtons.set(action, button);
      }
    }
  }

  bindPause(handler: () => void): void {
    this.pauseButton.addEventListener("click", handler);
  }

  bindResume(handler: () => void): void {
    this.resumeButton.addEventListener("click", handler);
  }

  bindStandUp(handler: () => void): void {
    this.standUpButton.addEventListener("click", handler);
  }

  getTouchButton(action: InputAction): HTMLButtonElement | undefined {
    return this.touchButtons.get(action);
  }

  setHintVisible(visible: boolean): void {
    this.hint.classList.toggle("hidden", !visible);
  }

  setPaused(paused: boolean): void {
    this.pauseOverlay.classList.toggle("visible", paused);
  }

  setTouchVisible(visible: boolean): void {
    this.touchControls.classList.toggle("hidden", !visible);
  }

  setSpeed(speedSquared: number): void {
    const mph = Math.round(Math.sqrt(speedSquared) * 2.23694);
    this.speedValue.textContent = `${mph} mph`;
  }
}
