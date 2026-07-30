import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: path.dirname(fileURLToPath(import.meta.url)),
  base: "/plugins/taskfold/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
