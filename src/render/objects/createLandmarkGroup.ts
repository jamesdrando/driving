import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import type { LandmarkDescriptor } from "../../game/types";

export function createLandmarkGroup(landmarks: LandmarkDescriptor[]): Group {
  const group = new Group();

  for (const descriptor of landmarks) {
    const landmark = new Group();
    landmark.position.set(descriptor.position[0], descriptor.position[1], descriptor.position[2]);
    landmark.rotation.y = descriptor.rotationY;

    for (const part of descriptor.parts) {
      const geometry = new BoxGeometry(
        part.halfExtents[0] * 2,
        part.halfExtents[1] * 2,
        part.halfExtents[2] * 2,
      );
      const material = new MeshStandardMaterial({
        color: part.color,
        roughness: descriptor.kind === "ramp" ? 0.92 : 1,
        metalness: 0,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      landmark.add(mesh);
    }

    group.add(landmark);
  }

  return group;
}
