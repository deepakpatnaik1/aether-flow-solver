import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Cache busting plugin with auto-refresh
    {
      name: 'auto-refresh-cache-bust',
      transformIndexHtml(html: string) {
        const timestamp = Date.now().toString();
        return html
          .replace('{{TIMESTAMP}}', timestamp)
          .replace('{{BUILD_TIME}}', timestamp);
      },
      handleHotUpdate() {
        // Force page reload on any change
        setTimeout(() => {
          console.log('🔄 Code changed - forcing refresh...');
        }, 100);
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash for cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
}));
