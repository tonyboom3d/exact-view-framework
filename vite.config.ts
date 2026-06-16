import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

function copyIndexToSubroutes(): Plugin {
  return {
    name: 'copy-index-to-subroutes',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtml = path.join(distDir, 'index.html');
      const routes = ['event2'];
      for (const route of routes) {
        const dir = path.join(distDir, route);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(indexHtml, path.join(dir, 'index.html'));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/exact-view-framework/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    copyIndexToSubroutes(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
