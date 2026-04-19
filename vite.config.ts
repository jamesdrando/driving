import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@dimforge/rapier3d-compat")) {
            return "rapier";
          }

          if (id.includes("three")) {
            return "three";
          }

          return undefined;
        },
      },
    },
  },
});
