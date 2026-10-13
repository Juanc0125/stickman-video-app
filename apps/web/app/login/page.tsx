import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from '../components/login-form';
import Logo, { LogoMark } from '../components/logo';

export const metadata: Metadata = {
    title: 'Iniciar sesión · Stickman',
};

const HIGHLIGHTS = [
    { t: 'Del tema al MP4', d: 'Guion, escenas, voz y subtítulos en un solo flujo.' },
    { t: 'Tu marca en cada video', d: 'Tu logo, tus colores y tu tipografía en pantalla.' },
    { t: 'Tú apruebas', d: 'Nada se genera ni se publica sin el clic de una persona.' },
];

// The first screen a client sees of the product they are paying for. On wide
// screens it splits into a brand side and the form; on phones only the form
// and the mark remain, so nothing has to scroll sideways.
export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen flex-1 flex-col">
            <div aria-hidden="true" className="app-backdrop" />

            <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
                <aside className="hidden lg:block" aria-hidden="true">
                    <Logo size={40} />
                    <h2 className="text-gradient mt-10 max-w-lg text-5xl font-semibold leading-[1.05] tracking-[-0.035em]">
                        Videos que se escriben,{' '}
                        <span className="text-gradient-brand pr-1 font-display text-[1.1em] font-normal italic tracking-[-0.01em]">se animan solos</span>
                    </h2>
                    <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
                        Genera, revisa, aprueba y publica videos cortos de marketing hipotecario para Reels, TikTok y Shorts.
                    </p>
                    <ul className="mt-10 space-y-4">
                        {HIGHLIGHTS.map((item) => (
                            <li key={item.t} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/30 to-accent-500/20 text-brand-100 ring-1 ring-inset ring-brand-300/30">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m5 12 5 5L20 7" />
                                    </svg>
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold text-white">{item.t}</span>
                                    <span className="block text-sm text-slate-400">{item.d}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </aside>

                <main className="mx-auto flex w-full max-w-sm flex-col items-center lg:mx-0 lg:justify-self-end">
                    <LogoMark size={56} className="mb-6 lg:hidden" />
                    <div className="mb-8 w-full text-center lg:text-left">
                        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-white sm:text-[1.75rem]">Inicia sesión en Stickman</h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            Entra para generar, aprobar y publicar tus videos.
                        </p>
                    </div>
                    <LoginForm />
                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-400 transition-colors hover:text-white"
                    >
                        <span aria-hidden="true">&larr;</span> Volver al estudio
                    </Link>
                </main>
            </div>
        </div>
    );
}
