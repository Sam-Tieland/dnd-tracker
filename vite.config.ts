import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/dnd-tracker/',
  plugins: [
    react(),
    // Spec §13: the service worker caches the whole app; a new version waits until the player taps "Reload".
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'D&D Character Tracker',
        short_name: 'D&D Tracker',
        description: 'Character sheet for D&D 5e (2024 rules) that works offline.',
        lang: 'nl',
        display: 'standalone',
        background_color: '#16140f',
        theme_color: '#8b1e1e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/ui/testing/pwa-register-stub.ts', import.meta.url)),
    },
  },
});
