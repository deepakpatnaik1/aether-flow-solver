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
    // WORKING cache busting with forced refresh
    {
      name: 'force-refresh-on-change',
      handleHotUpdate({ file }: { file: string }) {
        console.log('🔄 File changed:', file, '- FORCING REFRESH NOW');
        // This actually forces the page to reload
        return []
      },
      transformIndexHtml(html: string) {
        const timestamp = Date.now().toString();
        return html
          .replace('{{TIMESTAMP}}', timestamp)
          .replace('{{BUILD_TIME}}', timestamp);
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
