import type { MetadataRoute } from 'next';

// Makes Stickman installable: Chrome and Edge offer "Install app" when a page
// serves this, and the installed copy opens in its own window with the
// Stickman icon instead of a browser tab.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Stickman',
        short_name: 'Stickman',
        description: 'Genera, revisa, aprueba y publica videos cortos de marketing hipotecario.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#17202a',
        theme_color: '#17202a',
        lang: 'es',
        categories: ['business', 'productivity'],
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
