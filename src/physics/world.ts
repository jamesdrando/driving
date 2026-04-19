import RAPIER from "@dimforge/rapier3d-compat";
import { Euler, Quaternion, Vector3 } from "three";
import type { LandmarkDescriptor, TerrainData } from "../game/types";

function toQuaternion(x: number, y: number, z: number): Quaternion {
  return new Quaternion().setFromEuler(new Euler(x, y, z));
}

function toRapierVector(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x, y, z };
}

function toRapierRotation(quaternion: Quaternion): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

export async function createPhysicsWorld(): Promise<RAPIER.World> {
  await RAPIER.init();
  return new RAPIER.World({ x: 0, y: -18, z: 0 });
}

export function addTerrainCollider(world: RAPIER.World, terrain: TerrainData): void {
  const colliderDesc = RAPIER.ColliderDesc.trimesh(terrain.vertices, terrain.indices)
    .setFriction(1.2)
    .setRestitution(0.05);

  world.createCollider(colliderDesc);
}

export function addLandmarkColliders(world: RAPIER.World, landmarks: LandmarkDescriptor[]): void {
  for (const descriptor of landmarks) {
    const bodyRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), descriptor.rotationY);
    const rigidBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(descriptor.position[0], descriptor.position[1], descriptor.position[2])
        .setRotation(toRapierRotation(bodyRotation)),
    );

    for (const part of descriptor.parts) {
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        part.halfExtents[0],
        part.halfExtents[1],
        part.halfExtents[2],
      )
        .setTranslation(part.offset[0], part.offset[1], part.offset[2])
        .setRotation(toRapierRotation(toQuaternion(part.rotation[0], part.rotation[1], part.rotation[2])))
        .setFriction(descriptor.kind === "ramp" ? 0.8 : 1.15)
        .setRestitution(descriptor.kind === "ramp" ? 0.08 : 0.02);

      world.createCollider(colliderDesc, rigidBody);
    }
  }
}

export { RAPIER, toRapierRotation, toRapierVector };
