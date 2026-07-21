import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const DARK_GAME_THEME = "#11100f";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "assets/ui/lulus-tale-title-screen.png",
        "pwa/lulus-tale-192.png",
        "pwa/lulus-tale-512.png",
        "pwa/lulus-tale-maskable-192.png",
        "pwa/lulus-tale-maskable-512.png"
      ],
      manifest: {
        name: "Lulu’s Tale",
        short_name: "Lulu’s Tale",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "landscape",
        theme_color: DARK_GAME_THEME,
        background_color: DARK_GAME_THEME,
        icons: [
          {
            src: "/pwa/lulus-tale-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa/lulus-tale-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa/lulus-tale-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa/lulus-tale-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html"
      }
    })
  ]
});
