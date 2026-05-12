import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/Matts-Ergo-Cursor-Prototype-v01/",
  plugins: [react()],
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        reactAppLegacy: resolve(__dirname, "react-app.html"),
        sbciHubV1: resolve(__dirname, "sbci-hub-v1.html"),
        prototypeV2: resolve(__dirname, "prototype-v2.html"),
      },
    },
  },
});
