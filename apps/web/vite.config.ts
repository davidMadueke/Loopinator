import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    alias: {
      "@": path.resolve(appDir, "./src"),
    },
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  ssr: {
    // Bundling every SSR dep breaks some CJS packages in local dev (module is not defined).
    noExternal: process.env.VERCEL === "1" ? true : ["@loopinator/ui", "@loopinator/env"],
  },
});
