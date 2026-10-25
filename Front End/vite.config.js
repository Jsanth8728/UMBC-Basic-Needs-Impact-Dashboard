import { fileURLToPath } from "node:url";
import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => ({
  plugins: [
    {
      name: "jsx-in-js",
      enforce: "pre",
      // Compile our .js components before Vite parses them as plain JavaScript.
      transform(code, id) {
        const filename = id.split("?")[0];
        if (!filename.endsWith(".js") || /[/\\]node_modules[/\\]/.test(filename)) {
          return null;
        }
        return transformWithOxc(code, filename, {
          lang: "jsx",
          jsx: {
            runtime: "automatic",
            development: command === "serve" && mode !== "production",
          },
        });
      },
    },
    react(),
  ],
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: { ".js": "jsx" },
    },
  },
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
  build: {
    rolldownOptions: {
      input: fileURLToPath(new URL("./HomePage.html", import.meta.url)),
    },
  },
}));
