import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// base './': alle Pfade relativ, damit jeder Branch unter /<repo>/<branch>/ läuft.
// Der Deploy setzt --base pro Branch (siehe .github/workflows/deploy.yml).
const BUILD = new Date().toISOString().slice(0, 16).replace('T', ' ');
const VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig(({ command }) => ({
    base: './',
    define: {
        __BUILD__: JSON.stringify(command === 'build' ? BUILD : 'dev'),
        __VERSION__: JSON.stringify(VERSION)
    },
    build: { chunkSizeWarningLimit: 2000 },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            manifest: false, // eigenes public/manifest.json
            workbox: {
                cleanupOutdatedCaches: true,
                globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,wav,mp3,ogg,woff2,glb}'],
                maximumFileSizeToCacheInBytes: 10_000_000
            },
            devOptions: { enabled: false }
        })
    ]
}));
