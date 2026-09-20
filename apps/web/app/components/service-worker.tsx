'use client';

import { useEffect } from 'react';

// Registering the worker is what turns the manifest into an actual install
// offer in Chrome and Edge. It runs after load so it never competes with the
// first render for bandwidth.
export default function ServiceWorker() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const register = () => {
            navigator.serviceWorker.register('/sw.js').catch((error) => {
                console.warn('No se pudo registrar el service worker.', error);
            });
        };
        if (document.readyState === 'complete') register();
        else {
            window.addEventListener('load', register);
            return () => window.removeEventListener('load', register);
        }
    }, []);

    return null;
}
