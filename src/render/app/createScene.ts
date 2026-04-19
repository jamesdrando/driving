import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Scene,
} from "three";

export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color("#f0c693");
  scene.fog = new Fog("#f1c697", 95, 460);

  const skyGlow = new Group();
  const sun = new Mesh(
    new SphereGeometry(12, 24, 24),
    new MeshBasicMaterial({ color: "#ffe1a0" }),
  );
  sun.position.set(-140, 145, -220);
  skyGlow.add(sun);
  scene.add(skyGlow);

  const hemisphere = new HemisphereLight("#ffe6bf", "#985322", 1.6);
  scene.add(hemisphere);

  const sunlight = new DirectionalLight("#ffefc1", 2.6);
  sunlight.position.set(110, 140, -80);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 420;
  sunlight.shadow.camera.left = -160;
  sunlight.shadow.camera.right = 160;
  sunlight.shadow.camera.top = 160;
  sunlight.shadow.camera.bottom = -160;
  scene.add(sunlight);

  return scene;
}
