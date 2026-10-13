import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            // The faces are loaded in layout.tsx as CSS variables. Inter carries
            // the UI, Instrument Serif is the editorial accent for display
            // headlines only, Geist Mono the numbers and codes.
            fontFamily: {
                sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
            },
            colors: {
                // Brand: an electric indigo, matching the logo tile. 600 is the
                // lightest shade white text still passes WCAG AA on, so it is
                // the fill for primary buttons; 200-400 are for text and focus
                // rings on the dark ground.
                brand: {
                    50: '#eef1ff',
                    100: '#e0e5ff',
                    200: '#c5ccff',
                    300: '#a3acfd',
                    400: '#8189f8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#2e2a7a',
                },
                // Secondary accent for gradients: violet next to the indigo.
                accent: {
                    300: '#d0b4fe',
                    400: '#b98cfb',
                    500: '#9a5cf6',
                    600: '#7c3aed',
                },
                // Surfaces, from the page ground up to a raised control. A
                // near-neutral graphite with only a hint of blue, so the brand
                // colour is what reads as colour on screen.
                ink: {
                    950: '#06070b',
                    900: '#0a0c12',
                    850: '#0f1119',
                    800: '#141722',
                    700: '#1c202d',
                    600: '#262b3a',
                },
            },
            boxShadow: {
                panel: '0 1px 0 0 rgba(255, 255, 255, 0.05) inset, 0 0 0 1px rgba(0, 0, 0, 0.25), 0 24px 48px -24px rgba(0, 0, 0, 0.85)',
                glow: '0 0 0 1px rgba(129, 137, 248, 0.35), 0 8px 32px -8px rgba(99, 102, 241, 0.55)',
                'glow-emerald': '0 0 0 1px rgba(52, 211, 153, 0.4), 0 8px 28px -10px rgba(16, 185, 129, 0.6)',
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(6px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                'fade-in': 'fade-in 0.3s ease-out both',
            },
        },
    },
    plugins: [],
};

export default config;
