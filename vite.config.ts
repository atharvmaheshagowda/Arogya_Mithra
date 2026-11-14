import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@studio-freight/lenis": fileURLToPath(new URL("./src/lib/lenis-shim.ts", import.meta.url)),
      "gsap/ScrollTrigger": fileURLToPath(new URL("./src/lib/gsap-shim.ts", import.meta.url)),
      "gsap": fileURLToPath(new URL("./src/lib/gsap-shim.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
