import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { createLandmarks } from "../game/content/landmarks";
import { createTerrainData } from "../game/content/terrain";
import { InputController } from "../game/input/InputController";
import { BUGGY_PRESET } from "../game/simulation/buggyPreset";
import type { GameState, WorldSeed } from "../game/types";
import { VehicleController } from "../physics/VehicleController";
import { addLandmarkColliders, addTerrainCollider, createPhysicsWorld } from "../physics/world";
import { ChaseCameraRig } from "../render/app/ChaseCameraRig";
import { createRenderer } from "../render/app/createRenderer";
import { createScene } from "../render/app/createScene";
import { createLandmarkGroup } from "../render/objects/createLandmarkGroup";
import { createTerrainMesh } from "../render/objects/createTerrainMesh";
import { VehicleVisual } from "../render/objects/VehicleVisual";
import { GameHud } from "../ui/GameHud";

const FIXED_TIME_STEP = 1 / 60;
const WORLD_SEED: WorldSeed = { value: 48327 };

export class GameApp {
  private readonly shell = document.createElement("div");
  private readonly canvasHost = document.createElement("div");
  private accumulator = 0;
  private lastFrameTime = 0;
  private state: GameState = "playing";
  private world: Awaited<ReturnType<typeof createPhysicsWorld>> | null = null;
  private hud: GameHud | null = null;
  private input: InputController | null = null;
  private cameraRig: ChaseCameraRig | null = null;
  private vehicle: VehicleController | null = null;
  private vehicleVisual: VehicleVisual | null = null;
  private animationFrame = 0;

  constructor(private readonly root: HTMLElement) {}

  async init(): Promise<void> {
    this.root.replaceChildren();
    this.shell.className = "game-shell";
    this.canvasHost.className = "game-canvas";
    this.shell.appendChild(this.canvasHost);
    this.root.appendChild(this.shell);

    const renderer = createRenderer(this.canvasHost);
    const scene = createScene();
    const terrain = createTerrainData(WORLD_SEED);
    const landmarks = createLandmarks(WORLD_SEED, terrain);

    scene.add(createTerrainMesh(terrain));
    scene.add(createLandmarkGroup(landmarks));
    scene.add(this.createHazeRibbons());

    this.world = await createPhysicsWorld();
    this.world.timestep = FIXED_TIME_STEP;
    addTerrainCollider(this.world, terrain);
    addLandmarkColliders(this.world, landmarks);

    this.vehicle = new VehicleController(this.world, terrain, BUGGY_PRESET, terrain.spawnPoint);
    this.vehicleVisual = new VehicleVisual();
    scene.add(this.vehicleVisual.group);

    this.cameraRig = new ChaseCameraRig(renderer.domElement, terrain.sampleHeight);
    this.hud = new GameHud(this.shell, window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
    this.input = new InputController();

    this.hud.bindPause(() => this.togglePause());
    this.hud.bindResume(() => this.togglePause(false));
    this.hud.bindStandUp(() => {
      this.vehicle?.reset(false);
      this.togglePause(false);
    });

    for (const action of ["throttle", "reverse", "steerLeft", "steerRight"] as const) {
      const button = this.hud.getTouchButton(action);
      if (button) {
        this.input.bindTouchButton(action, button);
      }
    }

    const onResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(this.canvasHost.clientWidth || window.innerWidth, this.canvasHost.clientHeight || window.innerHeight);
      this.cameraRig?.resize(renderer.domElement.clientWidth || window.innerWidth, renderer.domElement.clientHeight || window.innerHeight);
    };

    window.addEventListener("resize", onResize);
    onResize();

    const frame = (time: number) => {
      if (!this.world || !this.vehicle || !this.vehicleVisual || !this.cameraRig || !this.hud || !this.input) {
        return;
      }

      if (this.lastFrameTime === 0) {
        this.lastFrameTime = time;
      }

      const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = time;
      const frameInput = this.input.update(deltaSeconds);

      if (frameInput.wantsPause) {
        this.togglePause();
      }

      if (frameInput.wantsCameraRecenter) {
        this.cameraRig.recenter();
      }

      if (this.state === "playing") {
        let resetPending = frameInput.wantsReset;
        this.accumulator += deltaSeconds;

        while (this.accumulator >= FIXED_TIME_STEP) {
          this.vehicle.step({ ...frameInput, wantsReset: resetPending }, FIXED_TIME_STEP);
          this.world.step();
          this.accumulator -= FIXED_TIME_STEP;
          resetPending = false;
        }
      } else {
        this.accumulator = 0;
      }

      const renderState = this.vehicle.getRenderState();
      this.vehicleVisual.sync(renderState);
      this.cameraRig.update(renderState.position, renderState.forward, renderState.speedSquared, deltaSeconds);
      this.hud.setSpeed(renderState.speedSquared);
      this.hud.setHintVisible(!this.input.hasMoved && this.state === "playing");
      this.hud.setPaused(this.state === "paused");
      this.hud.setTouchVisible(frameInput.usingTouch || this.input.touchPreferred);

      renderer.render(scene, this.cameraRig.camera);
      this.animationFrame = window.requestAnimationFrame(frame);
    };

    this.animationFrame = window.requestAnimationFrame(frame);
  }

  private togglePause(forcePlaying?: boolean): void {
    this.state =
      forcePlaying === false
        ? "playing"
        : this.state === "playing"
          ? "paused"
          : "playing";
  }

  private createHazeRibbons(): Group {
    const group = new Group();
    const material = new MeshStandardMaterial({
      color: "#f2d1a0",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });

    for (const [index, depth] of [110, 180, 250].entries()) {
      const ribbon = new Mesh(new PlaneGeometry(360, 34), material);
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.position.set((index - 1) * 20, 8 + index * 1.4, -depth);
      group.add(ribbon);
    }

    return group;
  }
}
