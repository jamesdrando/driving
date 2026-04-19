import { Quaternion, Vector3 } from "three";
import { moveToward } from "../game/input/inputMath";
import type { FrameInput, TerrainData, VehiclePreset } from "../game/types";
import { clamp, shouldSelfRight } from "./vehicleMath";
import { RAPIER, toRapierRotation, toRapierVector } from "./world";

const WORLD_UP = new Vector3(0, 1, 0);
const CHASSIS_HALF_EXTENTS = new Vector3(1.26, 0.4, 1.95);
const WHEEL_RADIUS = 0.9;
const GRAVITY_MAGNITUDE = 18;
const ROLL_DAMPING = 0.075;

interface WheelSpec {
  key: "frontLeft" | "frontRight" | "rearLeft" | "rearRight";
  anchor: Vector3;
  steerable: boolean;
  driveShare: number;
}

export interface WheelRenderState {
  key: WheelSpec["key"];
  localPosition: Vector3;
  steerAngle: number;
  spinAngle: number;
  grounded: boolean;
  compression: number;
}

export interface VehicleRenderState {
  position: Vector3;
  quaternion: Quaternion;
  forward: Vector3;
  speedSquared: number;
  wheelStates: WheelRenderState[];
}

export interface VehicleDebugState {
  position: Vector3;
  linearSpeed: number;
  angularSpeed: number;
  upDot: number;
  groundedWheels: number;
}

export class VehicleController {
  private readonly body: RAPIER.RigidBody;
  private readonly vehicleController: RAPIER.DynamicRayCastVehicleController;
  private readonly rideHeightOffset: number;
  private readonly maxSuspensionForce: number;
  private readonly wheelSpecs: WheelSpec[] = [
    {
      key: "frontLeft",
      anchor: new Vector3(-1.34, 0.14, 1.34),
      steerable: true,
      driveShare: 0.28,
    },
    {
      key: "frontRight",
      anchor: new Vector3(1.34, 0.14, 1.34),
      steerable: true,
      driveShare: 0.28,
    },
    {
      key: "rearLeft",
      anchor: new Vector3(-1.34, 0.14, -1.32),
      steerable: false,
      driveShare: 0.22,
    },
    {
      key: "rearRight",
      anchor: new Vector3(1.34, 0.14, -1.32),
      steerable: false,
      driveShare: 0.22,
    },
  ];

  private readonly bodyPosition = new Vector3();
  private readonly bodyQuaternion = new Quaternion();
  private readonly bodyForward = new Vector3(0, 0, 1);
  private readonly bodyUp = new Vector3(0, 1, 0);
  private groundedWheelCount = 0;
  private currentSteer = 0;
  private rolloverTimer = 0;
  private airTime = 0;

  constructor(
    private readonly world: RAPIER.World,
    private readonly terrain: TerrainData,
    private readonly preset: VehiclePreset,
    private readonly spawnPoint: [number, number, number],
  ) {
    const lowestAnchorY = Math.min(...this.wheelSpecs.map((wheel) => wheel.anchor.y));
    this.rideHeightOffset =
      this.preset.suspensionRestLength + WHEEL_RADIUS - lowestAnchorY + 0.08;
    this.maxSuspensionForce =
      (this.preset.mass * GRAVITY_MAGNITUDE * 1.15) / this.wheelSpecs.length;

    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setCanSleep(false),
    );
    this.body.setLinearDamping(this.preset.linearDamping);
    this.body.setAngularDamping(this.preset.angularDamping);

    const collider = RAPIER.ColliderDesc.cuboid(
      CHASSIS_HALF_EXTENTS.x,
      CHASSIS_HALF_EXTENTS.y,
      CHASSIS_HALF_EXTENTS.z,
    )
      .setTranslation(0, -0.18, 0)
      .setMass(this.preset.mass)
      .setFriction(0.28)
      .setRestitution(0.02);

    world.createCollider(collider, this.body);

    this.vehicleController = new RAPIER.DynamicRayCastVehicleController(
      this.body,
      world.bodies,
      world.colliders,
      world.queryPipeline,
    );
    this.vehicleController.indexUpAxis = 1;
    this.vehicleController.setIndexForwardAxis = 2;

    for (let index = 0; index < this.wheelSpecs.length; index += 1) {
      const spec = this.wheelSpecs[index];
      this.vehicleController.addWheel(
        toRapierVector(spec.anchor.x, spec.anchor.y, spec.anchor.z),
        toRapierVector(0, -1, 0),
        toRapierVector(-1, 0, 0),
        this.preset.suspensionRestLength,
        WHEEL_RADIUS,
      );
      this.vehicleController.setWheelMaxSuspensionTravel(index, this.preset.suspensionTravel);
      this.vehicleController.setWheelSuspensionStiffness(index, this.preset.suspensionStiffness);
      this.vehicleController.setWheelSuspensionCompression(index, this.preset.suspensionDamping);
      this.vehicleController.setWheelSuspensionRelaxation(index, this.preset.suspensionDamping * 0.9);
      this.vehicleController.setWheelMaxSuspensionForce(index, this.maxSuspensionForce);
      this.vehicleController.setWheelFrictionSlip(index, 1.55 + this.preset.longitudinalGrip * 0.035);
      this.vehicleController.setWheelSideFrictionStiffness(index, 0.95 + this.preset.lateralGrip * 0.02);
    }

    this.reset(true);
  }

  step(input: FrameInput, deltaSeconds: number): void {
    if (input.wantsReset) {
      this.reset(false);
    }

    this.refreshBasis();

    const steerRate =
      this.currentSteer === 0 || Math.sign(this.currentSteer) === Math.sign(input.steer)
        ? this.preset.steeringResponse
        : this.preset.steeringReturn;

    this.currentSteer = moveToward(
      this.currentSteer,
      input.steer * this.preset.steeringAngle,
      steerRate,
      deltaSeconds,
    );

    const driveInput = clamp(input.throttle - input.reverse, -1, 1);
    const signedSpeed = this.getPlanarForwardSpeed();
    const brakingAgainstMotion =
      (driveInput > 0 && signedSpeed < -1.2) || (driveInput < 0 && signedSpeed > 1.2);

    for (let index = 0; index < this.wheelSpecs.length; index += 1) {
      const spec = this.wheelSpecs[index];
      const wheelScale = spec.driveShare * 2;
      let engineForce = 0;
      let brakeForce = 0;

      this.vehicleController.setWheelSteering(index, spec.steerable ? -this.currentSteer : 0);

      if (Math.abs(driveInput) > 0.01) {
        if (brakingAgainstMotion) {
          brakeForce = this.preset.brakeForce * wheelScale;
        } else {
          const forceBudget = driveInput > 0 ? this.preset.engineForce : this.preset.reverseForce;
          engineForce = driveInput * forceBudget * wheelScale;
        }
      } else if (Math.abs(signedSpeed) < 0.3) {
        brakeForce = this.preset.brakeForce * 0.1;
      }

      this.vehicleController.setWheelEngineForce(index, engineForce);
      this.vehicleController.setWheelBrake(index, brakeForce);
    }

    this.vehicleController.updateVehicle(
      deltaSeconds,
      undefined,
      undefined,
      (collider) => collider.parent()?.handle !== this.body.handle,
    );

    this.groundedWheelCount = this.countGroundedWheels();

    if (this.groundedWheelCount === 0) {
      this.airTime += deltaSeconds;
      this.applyAirControl(driveInput, deltaSeconds);
    } else {
      this.airTime = 0;
      this.applyGroundRoll(deltaSeconds);
    }

    this.refreshBasis();
    const linearVelocity = this.body.linvel();
    const angularVelocity = this.body.angvel();
    const linearSpeed = Math.hypot(linearVelocity.x, linearVelocity.y, linearVelocity.z);
    const angularSpeed = Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z);
    const outOfBounds =
      Math.hypot(this.bodyPosition.x, this.bodyPosition.z) > this.terrain.boundsRadius + 80 ||
      this.bodyPosition.y < this.terrain.sampleHeight(this.bodyPosition.x, this.bodyPosition.z) - 12;

    if (
      shouldSelfRight(
        this.bodyUp.y,
        linearSpeed,
        angularSpeed,
        this.preset.selfRightDelay,
        this.rolloverTimer,
      ) ||
      outOfBounds
    ) {
      this.reset(outOfBounds);
      return;
    }

    if (this.bodyUp.y < 0.18 && linearSpeed < 2.6 && angularSpeed < 3.2) {
      this.rolloverTimer += deltaSeconds;
    } else {
      this.rolloverTimer = 0;
    }
  }

  reset(forceSpawn: boolean): void {
    this.refreshBasis();

    const targetX = forceSpawn ? this.spawnPoint[0] : this.bodyPosition.x;
    const targetZ = forceSpawn ? this.spawnPoint[2] : this.bodyPosition.z;
    const safeY = this.terrain.sampleHeight(targetX, targetZ) + this.rideHeightOffset;
    const forwardFlat = this.bodyForward.clone().setY(0);
    const yaw = forwardFlat.lengthSq() > 0.0001 ? Math.atan2(forwardFlat.x, forwardFlat.z) : 0;
    const uprightRotation = new Quaternion().setFromAxisAngle(WORLD_UP, yaw);

    this.body.setTranslation(toRapierVector(targetX, safeY, targetZ), true);
    this.body.setRotation(toRapierRotation(uprightRotation), true);
    this.body.setLinvel(toRapierVector(0, 0, 0), true);
    this.body.setAngvel(toRapierVector(0, 0, 0), true);
    this.world.propagateModifiedBodyPositionsToColliders();
    this.world.updateSceneQueries();
    this.currentSteer = 0;
    this.rolloverTimer = 0;
    this.airTime = 0;
    this.groundedWheelCount = 0;
  }

  getRenderState(): VehicleRenderState {
    this.refreshBasis();

    return {
      position: this.bodyPosition.clone(),
      quaternion: this.bodyQuaternion.clone(),
      forward: this.bodyForward.clone(),
      speedSquared: this.body.linvel().x ** 2 + this.body.linvel().y ** 2 + this.body.linvel().z ** 2,
      wheelStates: this.wheelSpecs.map((spec, index) => {
        const suspensionLength =
          this.vehicleController.wheelSuspensionLength(index) ??
          this.preset.suspensionRestLength + this.preset.suspensionTravel;
        const compression = this.getWheelCompression(index, suspensionLength);

        return {
          key: spec.key,
          localPosition: new Vector3(spec.anchor.x, spec.anchor.y - suspensionLength, spec.anchor.z),
          steerAngle: this.vehicleController.wheelSteering(index) ?? 0,
          spinAngle: this.vehicleController.wheelRotation(index) ?? 0,
          grounded: this.vehicleController.wheelIsInContact(index),
          compression,
        };
      }),
    };
  }

  getDebugState(): VehicleDebugState {
    this.refreshBasis();
    const linearVelocity = this.body.linvel();
    const angularVelocity = this.body.angvel();

    return {
      position: this.bodyPosition.clone(),
      linearSpeed: Math.hypot(linearVelocity.x, linearVelocity.y, linearVelocity.z),
      angularSpeed: Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z),
      upDot: this.bodyUp.y,
      groundedWheels: this.groundedWheelCount,
    };
  }

  private refreshBasis(): void {
    const position = this.body.translation();
    const rotation = this.body.rotation();

    this.bodyPosition.set(position.x, position.y, position.z);
    this.bodyQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w).normalize();
    this.bodyForward.set(0, 0, 1).applyQuaternion(this.bodyQuaternion).normalize();
    this.bodyUp.set(0, 1, 0).applyQuaternion(this.bodyQuaternion).normalize();
  }

  private countGroundedWheels(): number {
    let grounded = 0;

    for (let index = 0; index < this.wheelSpecs.length; index += 1) {
      if (this.vehicleController.wheelIsInContact(index)) {
        grounded += 1;
      }
    }

    return grounded;
  }

  private getPlanarForwardSpeed(): number {
    const linearVelocity = this.body.linvel();
    const planarForward = this.bodyForward.clone().setY(0);

    if (planarForward.lengthSq() < 0.0001) {
      return 0;
    }

    planarForward.normalize();
    return linearVelocity.x * planarForward.x + linearVelocity.z * planarForward.z;
  }

  private getWheelCompression(index: number, suspensionLengthOverride?: number): number {
    const suspensionLength =
      suspensionLengthOverride ??
      this.vehicleController.wheelSuspensionLength(index) ??
      this.preset.suspensionRestLength + this.preset.suspensionTravel;

    return clamp(
      (this.preset.suspensionRestLength - suspensionLength) / this.preset.suspensionTravel,
      0,
      1.2,
    );
  }

  private applyGroundRoll(deltaSeconds: number): void {
    const leftCompression = (this.getWheelCompression(0) + this.getWheelCompression(2)) / 2;
    const rightCompression = (this.getWheelCompression(1) + this.getWheelCompression(3)) / 2;
    const speed = Math.abs(this.getPlanarForwardSpeed());
    const suspensionRoll = (rightCompression - leftCompression) * 0.72;
    const turnRoll = this.currentSteer * clamp((speed - 4) * 0.05, 0, 1.12);
    const rollImpulse = (suspensionRoll + turnRoll) * this.preset.antiRoll * deltaSeconds * 0.72;
    const rollAxis = new Vector3(0, 0, 1).applyQuaternion(this.bodyQuaternion).normalize();

    if (Math.abs(rollImpulse) > 0.0001) {
      this.body.applyTorqueImpulse(
        toRapierVector(-rollAxis.x * rollImpulse, -rollAxis.y * rollImpulse, -rollAxis.z * rollImpulse),
        true,
      );
    }

    const angularVelocity = this.body.angvel();
    const rollRate = angularVelocity.x * rollAxis.x + angularVelocity.y * rollAxis.y + angularVelocity.z * rollAxis.z;
    if (Math.abs(rollRate) > 0.001) {
      const dampTorque = -rollRate * this.preset.antiRoll * ROLL_DAMPING * deltaSeconds;
      this.body.applyTorqueImpulse(
        toRapierVector(rollAxis.x * dampTorque, rollAxis.y * dampTorque, rollAxis.z * dampTorque),
        true,
      );
    }
  }

  private applyAirControl(driveInput: number, deltaSeconds: number): void {
    const linearSpeed = this.body.linvel();
    const horizontalSpeed = Math.hypot(linearSpeed.x, linearSpeed.z);

    const uprightAxis = this.bodyUp.clone().cross(WORLD_UP);

    if (uprightAxis.lengthSq() > 0.0001) {
      const uprightAmount = uprightAxis.length();
      uprightAxis.normalize().multiplyScalar(uprightAmount * this.preset.airUprightTorque * deltaSeconds);
      this.body.applyTorqueImpulse(toRapierVector(uprightAxis.x, uprightAxis.y, uprightAxis.z), true);
    }

    if (Math.abs(this.currentSteer) > 0.02) {
      const yawTorque = WORLD_UP.clone().multiplyScalar(-this.currentSteer * this.preset.airYawTorque * deltaSeconds);
      this.body.applyTorqueImpulse(toRapierVector(yawTorque.x, yawTorque.y, yawTorque.z), true);
    }

    if (Math.abs(driveInput) > 0.35 && horizontalSpeed > 3 && this.airTime > 0.12) {
      const bodyRight = new Vector3(1, 0, 0).applyQuaternion(this.bodyQuaternion).normalize();
      const pitchTorque = bodyRight.multiplyScalar(driveInput * this.preset.airPitchTorque * deltaSeconds);
      this.body.applyTorqueImpulse(toRapierVector(pitchTorque.x, pitchTorque.y, pitchTorque.z), true);
    }
  }
}
