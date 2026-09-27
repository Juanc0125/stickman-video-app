import type { Metadata } from 'next';
import LoginForm from '../components/login-form';

export const metadata: Metadata = {
    title: 'Iniciar sesión · Stickman',
};

// The first screen a client sees of the product they are paying for, so it
// carries the same backdrop and glass panel as the studio behind it rather
// than reading as a bare, unfinished form.
export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen flex-1 items-center justify-center px-5 py-10">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0f18]">
                <div
                    className="backdrop-layer absolute inset-0 bg-cover bg-center opacity-90"
                    style={{ backgroundImage: 'url(/backdrop/space.jpg)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f18]/30 via-transparent to-[#0a0f18]/85" />
            </div>

            <div className="flex w-full max-w-sm flex-col items-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-400/25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
                </span>
                <h1 className="mb-1 text-xl font-semibold tracking-tight text-white">Stickman</h1>
                <p className="mb-8 text-center text-sm text-slate-400">
                    Genera, revisa, aprueba y publica videos cortos de marketing hipotecario.
                </p>
                <LoginForm />
            </div>
        </div>
    );
}
