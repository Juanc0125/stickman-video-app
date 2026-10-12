import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from '../components/login-form';
import { LogoMark } from '../components/logo';

export const metadata: Metadata = {
    title: 'Iniciar sesión · Stickman',
};

// The first screen a client sees of the product they are paying for, so it
// carries the same ground and panel style as the studio behind it rather than
// reading as a bare, unfinished form.
export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
            <div aria-hidden="true" className="app-backdrop" />

            <main className="flex w-full max-w-sm flex-col items-center">
                <LogoMark size={56} className="mb-5" />
                <h1 className="text-center text-2xl font-semibold tracking-tight text-white">Inicia sesión en Stickman</h1>
                <p className="mb-8 mt-2 text-center text-sm leading-relaxed text-slate-400">
                    Genera, revisa, aprueba y publica videos cortos de marketing hipotecario.
                </p>
                <LoginForm />
                <Link
                    href="/"
                    className="mt-6 rounded-md text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                    &larr; Volver al estudio
                </Link>
            </main>
        </div>
    );
}
