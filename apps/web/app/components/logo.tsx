// The Stickman mark: a stick figure whose torso is a play button, on the brand
// tile. Same geometry as public/icons/logo-mark.svg (the source the PNG icons
// and favicon are rasterised from) - change both together.
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
            className={`inline-flex shrink-0 items-center justify-center rounded-[23%] bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] shadow-lg shadow-brand-900/40 ring-1 ring-inset ring-white/15 ${className}`}
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 64 64" width={size} height={size} fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
                <g transform="translate(10 0)">
                    <circle cx="23" cy="14.5" r="6.5" stroke="none" />
                    <path d="M17 24.5 L17 45 L35.5 34.75 Z" strokeWidth="4" />
                    <path d="M17 30.5 L8.5 22.5" fill="none" strokeWidth="4.5" />
                    <path d="M19 44 L14 54" fill="none" strokeWidth="4.5" />
                    <path d="M27 40 L32 54" fill="none" strokeWidth="4.5" />
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
                <span className="flex items-center gap-1.5">
                    <span className="text-[1.05rem] font-semibold tracking-tight text-white">Stickman</span>
                    <span className="rounded-md border border-brand-400/30 bg-brand-500/10 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-brand-200">
                        Studio
                    </span>
                </span>
                {tagline && <span className="block truncate text-xs text-slate-400">{tagline}</span>}
            </span>
        </span>
    );
}
