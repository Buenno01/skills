import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const name = process.env.ARTIFACT;
if (!name) throw new Error("ARTIFACT env var is required (artifact folder name under artifacts/)");
const dir = resolve(__dirname, "artifacts", name);
if (!existsSync(resolve(dir, "index.html"))) throw new Error(`artifacts/${name}/index.html not found`);

export default defineConfig({
  root: dir,
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  build: {
    outDir: resolve(__dirname, "dist", name),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5000,
  },
  logLevel: "warn",
});
