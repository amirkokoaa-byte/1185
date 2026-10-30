import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'suppress-vite-ws-error',
        enforce: 'post',
        transform(code, id) {
          if (
            id.includes('vite/dist/client/client.mjs') ||
            code.includes('WebSocket closed without opened.')
          ) {
            return code
              .replace(
                'const socket = options.createConnection();',
                'const socket = { OPEN: 1, readyState: 1, addEventListener() {}, removeEventListener() {}, send() {}, close() {} };'
              )
              .replace(
                /reject\(\/\*\s*@__PURE__\s*\*\/\s*new Error\("WebSocket closed without opened\."\)\)/g,
                'resolve()'
              )
              .replace(
                /reject\(new Error\("WebSocket closed without opened\."\)\)/g,
                'resolve()'
              )
              .replace(
                /throw new SendBeforeConnectError\([^)]*\);/g,
                'return;'
              )
              .replace(
                'ws.send(JSON.stringify(data));',
                'ws?.send?.(JSON.stringify(data));'
              );
          }
          return null;
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'موقع خدمات التخيل 1185',
          short_name: 'التخيل 1185',
          description: 'موقع خدمات التخيل 1185 — منصة خدمية وتجارية متكاملة',
          theme_color: '#0A192F',
          background_color: '#0A192F',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          dir: 'rtl',
          lang: 'ar',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                request.mode === 'navigate' ||
                request.destination === 'document' ||
                request.destination === 'script' ||
                request.destination === 'style',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'live-app-shell-network-first-v3',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'local-images-instant-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/i\.ibb\.co\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cloud-images-instant-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio.
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
