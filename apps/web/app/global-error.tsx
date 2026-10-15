"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort screen when the root layout itself fails. It replaces the whole
// document, so it cannot rely on the layout's fonts or styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 16px", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo salió mal</h1>
        <p style={{ color: "#555", marginBottom: 24 }}>
          El error quedó registrado. Intenta de nuevo; si se repite, avisa al equipo.
        </p>
        <button onClick={reset} style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
