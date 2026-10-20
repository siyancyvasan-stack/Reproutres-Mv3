import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '');
  const port = Number(backendEnv.FACTORY_PORT || '4003');
  const target = `http://127.0.0.1:${backendEnv.PORT || '4000'}`;
  const appVersion = backendEnv.VITE_APP_VERSION || backendEnv.APP_VERSION || '1.1.0';

  // Automatically sync package.json version with backend .env
  try {
    const pkgPath = path.resolve(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version !== appVersion) {
        pkg.version = appVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      }
    }
  } catch {}

  return {
    envDir: path.resolve(__dirname, '../backend'),
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      'import.meta.env.VITE_FACTORY_APP_VERSION': JSON.stringify(backendEnv.VITE_FACTORY_APP_VERSION || appVersion),
    },
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
      host: '0.0.0.0',
      port,
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
