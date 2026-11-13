import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // THIS IS THE KILL SWITCH
      selfDestroying: true, 
      registerType: 'autoUpdate',
      manifest: {
        name: 'NursifyGH',
        short_name: 'NursifyGH',
        description: 'Study companion for Ghanaian nursing students',
        theme_color: '#047857',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})