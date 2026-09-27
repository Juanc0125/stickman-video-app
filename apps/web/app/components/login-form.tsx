'use client';

import { useState } from 'react';
import { login } from './api';

// Accounts are created by the operator in the Supabase dashboard - there is
// deliberately no signup link and no password reset here. A self-service form
// on this screen would let anyone with the URL into the client's studio.
export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await login(email, password);
            // A full navigation, not router.push: the studio fetches its own
            // state on mount and a fresh load is simpler than reconciling
            // whatever was left over from a previous, signed-out render.
            window.location.href = '/';
        } catch (err) {
            setSubmitting(false);
            setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
        }
    }

    return (
        <form onSubmit={(event) => { void handleSubmit(event); }} className="glass w-full max-w-sm rounded-2xl p-6">
            <div className="mb-5 space-y-1">
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-300">
                    Correo
                </label>
                <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-sky-400/60 focus:outline-none disabled:opacity-60"
                />
            </div>

            <div className="mb-5 space-y-1">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
                    Contraseña
                </label>
                <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-sky-400/60 focus:outline-none disabled:opacity-60"
                />
            </div>

            {error && (
                <p role="alert" className="mb-4 text-sm text-red-300">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {submitting ? 'Entrando...' : 'Entrar'}
            </button>
        </form>
    );
}
