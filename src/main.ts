import "./style.css";
import { GameApp } from "./app/GameApp";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found.");
}

const app = new GameApp(root);

void app.init().catch((error) => {
  console.error(error);
  root.innerHTML = `
    <div class="fatal-screen">
      <p class="fatal-title">The valley failed to load.</p>
      <p class="fatal-copy">Check the console for details, then refresh the page.</p>
    </div>
  `;
});
