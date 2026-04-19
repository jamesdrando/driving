import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
} from "three";
import type { TerrainData } from "../../game/types";

export function createTerrainMesh(terrain: TerrainData): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(terrain.vertices, 3));
  geometry.setIndex(new BufferAttribute(terrain.indices, 1));

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let index = 1; index < terrain.vertices.length; index += 3) {
    minHeight = Math.min(minHeight, terrain.vertices[index]);
    maxHeight = Math.max(maxHeight, terrain.vertices[index]);
  }

  const colors = new Float32Array((terrain.vertices.length / 3) * 3);
  const low = new Color("#b97d46");
  const mid = new Color("#dba565");
  const high = new Color("#f1c985");
  const ridge = new Color("#f7deb0");
  const scratch = new Color();

  for (let vertexIndex = 0; vertexIndex < terrain.vertices.length; vertexIndex += 3) {
    const height = terrain.vertices[vertexIndex + 1];
    const heightFactor = (height - minHeight) / (maxHeight - minHeight || 1);

    scratch.copy(low).lerp(mid, Math.min(1, heightFactor * 1.2));
    if (heightFactor > 0.48) {
      scratch.lerp(high, (heightFactor - 0.48) / 0.52);
    }
    if (heightFactor > 0.78) {
      scratch.lerp(ridge, (heightFactor - 0.78) / 0.22);
    }

    const colorIndex = vertexIndex;
    colors[colorIndex] = scratch.r;
    colors[colorIndex + 1] = scratch.g;
    colors[colorIndex + 2] = scratch.b;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
