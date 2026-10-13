// The Stickman mark: a stick figure mid-stride whose torso is a play button,
// with a small spark for the AI that writes and animates it, on the brand
// tile. Same geometry as public/icons/logo-mark.svg (the source the PNG icons
// are rasterised from) - change both together.
//
// The tile is a CSS gradient rather than an SVG <linearGradient>: an SVG
// gradient needs a document-wide id, and with the mark on screen more than
// once (header, assistant, empty state) a duplicate id inside a hidden copy
// can leave the visible ones unfilled in some browsers.

interface LogoMarkProps {
    size?: number;
    className?: string;
}

export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
    return (
        <span
            aria-hidden="true"
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[25%] bg-gradient-to-br from-[#6366f1] via-[#5b3fe6] to-[#7c3aed] shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7)] ring-1 ring-inset ring-white/20 ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Top-left sheen, as in the SVG source. */}
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(255,255,255,0.32),transparent_65%)]" />
            <svg viewBox="0 0 64 64" width={size} height={size} className="relative">
                <g transform="translate(1.5 0.5)">
                    <g fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="24" cy="15.5" r="6" stroke="none" />
                        <path d="M19 25.5 L19 45 L36.5 35.25 Z" strokeWidth="4" />
                        <path d="M19 31 L10.5 23" fill="none" strokeWidth="4.25" />
                        <path d="M21 44 L16 54" fill="none" strokeWidth="4.25" />
                        <path d="M29 40.5 L34 54" fill="none" strokeWidth="4.25" />
                    </g>
                    <path d="M46 8.5 Q47 14 52.5 15 Q47 16 46 21.5 Q45 16 39.5 15 Q45 14 46 8.5 Z" fill="#e9ddff" />
                </g>
            </svg>
        </span>
    );
}

interface LogoProps {
    size?: number;
    /** Show the one-line description under the name. */
    tagline?: string;
    className?: string;
}

// Mark plus wordmark, for the header and the login screen.
export default function Logo({ size = 36, tagline, className = '' }: LogoProps) {
    return (
        <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
            <LogoMark size={size} />
            <span className="min-w-0 leading-tight">
                <span className="flex items-center gap-2">
                    <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-white">Stickman</span>
                    <span className="rounded-full border border-brand-300/25 bg-gradient-to-r from-brand-500/15 to-accent-500/15 px-2 py-px text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-brand-200">
                        Studio
                    </span>
                </span>
                {tagline && <span className="mt-0.5 block truncate text-xs text-slate-400">{tagline}</span>}
            </span>
        </span>
    );
}
