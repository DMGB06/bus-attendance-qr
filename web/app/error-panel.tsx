"use client";

export type ErrorProps = { error: unknown; retry: () => void };

// No muestra error.message: puede traer detalles internos. El codigo sirve para buscarlo en los registros.
export function ErrorPanel({ error, retry }: ErrorProps) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : "";
  return (
    <div className="panel" role="alert">
      <div className="head">
        <h2>No pudimos cargar esta pantalla</h2>
        <p>Puede ser la conexión o un fallo momentáneo del sistema. Vuelve a intentarlo.</p>
      </div>
      <button className="btn" type="button" onClick={() => retry()}>Reintentar</button>
      {/* Enlace comun a proposito: recarga todo y sale de un estado roto del cliente. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="link center" href="/">Ir al inicio</a>
      {digest && <p className="note center">Código del error: {digest}</p>}
    </div>
  );
}
