import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from GitHub Pages under /ChemZoom/ (~/Dev/docs/github-pages-pwa-deploy.md).
const BASE = '/ChemZoom/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ChemZoom - what is inside your filament',
        short_name: 'ChemZoom',
        description: 'Zoom from a spool of filament down to its atoms, and see why PLA, PETG, TPU, ABS and ASA behave differently.',
        theme_color: '#0B1020',
        background_color: '#0B1020',
        display: 'standalone',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2,json}'],
        navigateFallback: `${BASE}index.html`,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true },
})
