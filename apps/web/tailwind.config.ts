import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            // The two Geist faces are loaded in layout.tsx as CSS variables;
            // pointing the default families at them makes every `font-sans` /
            // `font-mono` utility (and the body) use them.
            fontFamily: {
                sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
            },
            colors: {
                // Brand blue, matching the logo tile. 600 is the lightest shade
                // white text still passes WCAG AA on, so it is the fill for
                // primary buttons; 200-400 are for text and focus rings on the
                // dark ground.
                brand: {
                    50: '#eff5ff',
                    100: '#dbe8fe',
                    200: '#bfd6fe',
                    300: '#93bbfd',
                    400: '#6098fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                // Surfaces, from the page ground up to a raised control.
                ink: {
                    950: '#070b14',
                    900: '#0b1220',
                    850: '#0f1828',
                    800: '#131e31',
                    700: '#1b2840',
                },
            },
            boxShadow: {
                panel: '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 16px 40px -20px rgba(0, 0, 0, 0.7)',
            },
        },
    },
    plugins: [],
};

export default config;
