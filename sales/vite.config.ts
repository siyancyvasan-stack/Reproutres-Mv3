import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '');
  const frontendEnv = loadEnv(mode, __dirname, '');
  // Keep browser calls same-origin during development; Vite proxies them to
  // the configured API target and avoids cross-origin browser CORS failures.
  const target = frontendEnv.VITE_DEV_API_PROXY_TARGET || `http://127.0.0.1:${backendEnv.PORT || '4000'}`;

  return {
    // Vite/esbuild compiles the project's react-jsx TypeScript directly. The
    // Fast Refresh plugin is intentionally omitted because it requires the HMR
    // preamble/WebSocket that is disabled for this standalone frontend.
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      port: 4002,
      strictPort: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/health': {
          target,
          changeOrigin: true,
        },
        '/api-docs': {
          target,
          changeOrigin: true,
        },
        '/socket.io': {
          target,
          changeOrigin: true,
          ws: true,
        },
        '/uploads': {
          target,
          changeOrigin: true,
        },
        '/media': {
          target,
          changeOrigin: true,
        },
      },
      // This project runs as a standalone frontend. Disabling HMR prevents the
      // stale injected WebSocket endpoint from reconnecting to port 24680.
      hmr: false,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
  };
});
