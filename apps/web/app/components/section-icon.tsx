// Small line icons for panel headers, drawn on the `.section-icon` tile. All
// on one 24px grid with the same stroke so the panels read as one set.

export type SectionIconName =
    | 'sparkles'
    | 'library'
    | 'script'
    | 'scenes'
    | 'sound'
    | 'brand'
    | 'shield'
    | 'copy';

const PATHS: Record<SectionIconName, React.ReactNode> = {
    sparkles: (
        <>
            <path d="M12 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" />
            <path d="M18.5 15.5c.3 1.5 1 2.2 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5Z" />
        </>
    ),
    library: (
        <>
            <rect x="3" y="4" width="7" height="7" rx="1.5" />
            <rect x="14" y="4" width="7" height="7" rx="1.5" />
            <rect x="3" y="15" width="7" height="5" rx="1.5" />
            <rect x="14" y="15" width="7" height="5" rx="1.5" />
        </>
    ),
    script: (
        <>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h4" />
        </>
    ),
    scenes: (
        <>
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M3 9h18M8 4l-1.5 5M13.5 4 12 9M19 4l-1.5 5" />
        </>
    ),
    sound: (
        <>
            <path d="M9 18V5l11-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="17" cy="16" r="3" />
        </>
    ),
    brand: (
        <>
            <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-3.5 3.5H15a2 2 0 0 0-1.4 3.4c.6.6.4 2.1-1.6 2.1Z" />
            <circle cx="7.5" cy="11" r="1" />
            <circle cx="10.5" cy="7" r="1" />
            <circle cx="15.5" cy="7.5" r="1" />
        </>
    ),
    shield: (
        <>
            <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
            <path d="m9 12 2 2 4-4" />
        </>
    ),
    copy: (
        <>
            <rect x="8" y="8" width="13" height="13" rx="2.5" />
            <path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8" />
        </>
    ),
};

export default function SectionIcon({ name, className = '' }: { name: SectionIconName; className?: string }) {
    return (
        <span className={`section-icon ${className}`} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                {PATHS[name]}
            </svg>
        </span>
    );
}
