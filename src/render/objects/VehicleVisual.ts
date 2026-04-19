import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import type { VehicleRenderState } from "../../physics/VehicleController";

function createPennantGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        0, 0.45, 0,
        1.2, 0.1, 0,
        0, -0.18, 0,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export class VehicleVisual {
  readonly group = new Group();

  private readonly wheelRoots = new Map<string, Group>();
  private readonly wheelMeshes = new Map<string, Mesh>();

  constructor() {
    const chassisMaterial = new MeshStandardMaterial({
      color: "#e06f35",
      roughness: 0.94,
      metalness: 0,
    });
    const accentMaterial = new MeshStandardMaterial({
      color: "#ffd28a",
      roughness: 0.78,
      metalness: 0,
    });
    const darkMaterial = new MeshStandardMaterial({
      color: "#2d1407",
      roughness: 1,
      metalness: 0,
    });
    const rimMaterial = new MeshStandardMaterial({
      color: "#1f1f1f",
      roughness: 0.6,
      metalness: 0.2,
    });
    const chromeMaterial = new MeshStandardMaterial({
      color: "#8a8a8a",
      roughness: 0.38,
      metalness: 0.82,
    });

    const frame = new Mesh(new BoxGeometry(2.52, 0.76, 3.9), chassisMaterial);
    frame.position.set(0, 0.78, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.group.add(frame);

    const bed = new Mesh(new BoxGeometry(2.24, 0.58, 3.2), accentMaterial);
    bed.position.set(0, 1.29, -0.12);
    bed.castShadow = true;
    bed.receiveShadow = true;
    this.group.add(bed);

    const innerRails = new Mesh(new BoxGeometry(2.12, 0.28, 3.08), darkMaterial);
    innerRails.position.set(0, 1.64, 0.02);
    innerRails.castShadow = true;
    innerRails.receiveShadow = true;
    this.group.add(innerRails);

    const cab = new Mesh(new BoxGeometry(1.78, 0.86, 2.03), darkMaterial);
    cab.position.set(0, 1.78, 0.01);
    cab.castShadow = true;
    cab.receiveShadow = true;
    this.group.add(cab);

    const roof = new Mesh(new BoxGeometry(1.6, 0.16, 1.95), accentMaterial);
    roof.position.set(0, 2.22, 0.03);
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.group.add(roof);

    const nose = new Mesh(new BoxGeometry(1.55, 0.4, 0.34), darkMaterial);
    nose.position.set(0, 0.76, 1.93);
    nose.castShadow = true;
    nose.receiveShadow = true;
    this.group.add(nose);

    const rearPanel = new Mesh(new BoxGeometry(1.55, 0.28, 0.32), darkMaterial);
    rearPanel.position.set(0, 1.06, -2.0);
    rearPanel.castShadow = true;
    rearPanel.receiveShadow = true;
    this.group.add(rearPanel);

    const rearPillarL = new Mesh(new BoxGeometry(0.16, 1.0, 0.16), chromeMaterial);
    rearPillarL.position.set(-0.9, 1.78, -1.08);
    rearPillarL.castShadow = true;
    rearPillarL.receiveShadow = true;
    this.group.add(rearPillarL);

    const rearPillarR = rearPillarL.clone();
    rearPillarR.position.x = 0.89;
    this.group.add(rearPillarR);

    const guard = new Mesh(new BoxGeometry(0.62, 0.56, 1.56), darkMaterial);
    guard.position.set(-1.33, 0.93, 0.03);
    guard.castShadow = true;
    guard.receiveShadow = true;
    this.group.add(guard);

    const guardR = guard.clone();
    guardR.position.x = 1.33;
    this.group.add(guardR);

    const rollBar = new Mesh(new BoxGeometry(2.0, 0.1, 0.56), darkMaterial);
    rollBar.position.set(0, 2.25, 0.02);
    rollBar.castShadow = true;
    rollBar.receiveShadow = true;
    this.group.add(rollBar);

    const shockBar = new Mesh(new CylinderGeometry(0.08, 0.08, 1.92, 8), chromeMaterial);
    shockBar.position.set(-0.71, 1.68, 0);
    shockBar.rotation.z = Math.PI / 2;
    shockBar.castShadow = true;
    shockBar.receiveShadow = true;
    this.group.add(shockBar);

    const shockBarR = shockBar.clone();
    shockBarR.position.x = 0.71;
    this.group.add(shockBarR);

    const flagPole = new Mesh(new CylinderGeometry(0.035, 0.035, 1.9, 8), darkMaterial);
    flagPole.position.set(-0.66, 2.31, 0.4);
    flagPole.castShadow = true;
    this.group.add(flagPole);

    const pennant = new Mesh(
      createPennantGeometry(),
      new MeshStandardMaterial({ color: "#f0b960", side: DoubleSide }),
    );
    pennant.position.set(-0.66, 3.0, 0.35);
    pennant.castShadow = true;
    this.group.add(pennant);

    const wheelGeometry = new CylinderGeometry(0.9, 0.9, 0.66, 28);
    wheelGeometry.rotateZ(Math.PI / 2);
    const tireMaterial = new MeshStandardMaterial({
      color: "#17120a",
      roughness: 1,
      metalness: 0,
    });
    const wheelBeadGeometry = new CylinderGeometry(0.26, 0.26, 0.08, 16);
    wheelBeadGeometry.rotateZ(Math.PI / 2);
    const spokeGeometry = new CylinderGeometry(0.18, 0.28, 0.36, 12);
    spokeGeometry.rotateZ(Math.PI / 2);

    for (const key of ["frontLeft", "frontRight", "rearLeft", "rearRight"] as const) {
      const root = new Group();
      const wheel = new Mesh(wheelGeometry, tireMaterial);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      wheel.position.y = 0.04;

      const bead = new Mesh(wheelBeadGeometry, rimMaterial);
      bead.rotation.z = Math.PI / 2;
      bead.castShadow = true;
      bead.receiveShadow = true;
      wheel.add(bead);

      for (const spokeIndex of [0, 1, 2, 3]) {
        const spoke = new Mesh(spokeGeometry, chromeMaterial);
        spoke.rotation.x = spokeIndex % 2 === 0 ? 0 : Math.PI / 2;
        spoke.rotation.z = (Math.PI / 2) * spokeIndex;
        spoke.castShadow = true;
        spoke.receiveShadow = true;
        wheel.add(spoke);
      }

      root.add(wheel);
      this.group.add(root);
      this.wheelRoots.set(key, root);
      this.wheelMeshes.set(key, wheel);
    }

    const shadowPlate = new Mesh(
      new PlaneGeometry(4.2, 6.4),
      new MeshStandardMaterial({
        color: "#5b3318",
        transparent: true,
        opacity: 0.12,
      }),
    );
    shadowPlate.rotation.x = -Math.PI / 2;
    shadowPlate.position.y = 0.03;
    this.group.add(shadowPlate);
  }

  sync(state: VehicleRenderState): void {
    this.group.position.copy(state.position);
    this.group.quaternion.copy(state.quaternion);

    for (const wheelState of state.wheelStates) {
      const root = this.wheelRoots.get(wheelState.key);
      const mesh = this.wheelMeshes.get(wheelState.key);

      if (!root || !mesh) {
        continue;
      }

      root.position.copy(wheelState.localPosition);
      root.rotation.y = wheelState.steerAngle;
      mesh.rotation.x = wheelState.spinAngle;
      mesh.position.y = wheelState.grounded ? 0 : 0.04;
    }
  }
}
