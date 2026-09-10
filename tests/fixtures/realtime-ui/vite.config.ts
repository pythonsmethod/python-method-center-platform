import { defineConfig } from "vite";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "../../.."), "next/image": path.resolve(__dirname, "image.tsx") } },
  publicDir: path.resolve(__dirname, "../../../public"),
  oxc: { jsx: { runtime: "automatic" } },
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});
