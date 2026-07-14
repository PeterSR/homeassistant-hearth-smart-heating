import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/hearth/frontend/",
  build: {
    rollupOptions: {
      input: {
        "hearth-panel": resolve(__dirname, "src/hearth-panel.ts"),
        "hearth-card": resolve(__dirname, "src/hearth-card.ts"),
        "hearth-cards": resolve(__dirname, "src/hearth-cards.ts"),
      },
      output: {
        format: "es",
        entryFileNames: "[name].js",
      },
    },
    outDir: "../custom_components/hearth/frontend/dist",
    emptyOutDir: true,
  },
});
