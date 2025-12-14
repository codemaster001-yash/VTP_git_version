import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Use '.' instead of process.cwd() to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    // IMPORTANT: The 'base' setting of './' makes all asset paths relative.
    base: "./",
    build: {
      outDir: "dist",
    },
    // This injects the API key into the code at build time so the app can use it.
    define: {
      "process.env.API_KEY": JSON.stringify(env.API_KEY),
    },
  };
});
