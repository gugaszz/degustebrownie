import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Without a registered service worker, Chrome/Android never satisfies its
      // installability criteria — the "Instalar app" menu item and the automatic
      // install prompt both silently fail to appear, which is exactly what a
      // seller sees as "não consigo baixar o app". This plugin builds and
      // registers that service worker (auto-updating on every deploy) and reuses
      // the existing public/manifest.json as the PWA manifest.
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false, // manifest.json is already hand-authored in public/ and linked from index.html
        includeAssets: ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              // Never cache Supabase API calls — the app must always see live data
              urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
              handler: 'NetworkOnly'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
