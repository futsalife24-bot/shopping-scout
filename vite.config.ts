import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const ghPagesBase = process.env.GITHUB_PAGES_BASE || '/';

export default defineConfig({
  base: ghPagesBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/icon-192x192.svg', 'icons/icon-512x512.svg'],
      manifest: {
        name: '買い物スカウター',
        short_name: '買い物スカウター',
        description: '値札を撮って、自分の価格履歴と比較するアプリ（Phase 1 準備）',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
