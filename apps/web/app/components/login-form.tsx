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
        <form onSubmit={(event) => { void handleSubmit(event); }} className="panel w-full max-w-sm p-6 sm:p-7">
            <div className="mb-4">
                <label htmlFor="login-email" className="label text-sm">
                    Correo
                </label>
                <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting}
                    className="field h-11"
                />
            </div>

            <div className="mb-4">
                <label htmlFor="login-password" className="label text-sm">
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
                    className="field h-11"
                />
            </div>

            {error && (
                <p role="alert" className="alert alert-error mb-4">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-block mt-2 h-11"
            >
                {submitting && <span className="spinner" aria-hidden="true" />}
                {submitting ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="hint mt-4 text-center">
                Las cuentas las crea el administrador del estudio.
            </p>
        </form>
    );
}
