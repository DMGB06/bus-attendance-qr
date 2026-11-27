"use client";

import { useEffect, useRef, useState } from "react";
import { descargar } from "@/lib/descargar";

export function BotonExportar({ endpoint, deshabilitado }: { endpoint: string; deshabilitado?: boolean }) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string>();
  const solicitud = useRef<AbortController | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => solicitud.current?.abort(), []);

  async function exportar() {
    if (solicitud.current || deshabilitado) return;
    const controller = new AbortController();
    solicitud.current = controller;
    setPendiente(true);
    setError(undefined);
    try {
      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
      });
      if (respuesta.type === "opaqueredirect" || respuesta.status === 401) {
        setError("Vuelve a iniciar sesión para descargar el CSV.");
        return;
      }
      if (!respuesta.ok) {
        const datos = respuesta.headers.get("content-type")?.includes("application/json") ? await respuesta.json() : null;
        throw new Error(datos?.error || "No se pudo preparar el CSV. Vuelve a intentarlo.");
      }
      const nombre = respuesta.headers.get("content-disposition")?.match(/filename="([a-z0-9-]+\.csv)"/)?.[1];
      if (!nombre || !respuesta.headers.get("content-type")?.startsWith("text/csv")) {
        throw new Error("No se pudo preparar el CSV. Vuelve a intentarlo.");
      }
      const archivo = await respuesta.blob();
      if (!controller.signal.aborted) descargar(archivo, nombre, "text/csv");
    } catch (fallo) {
      if (!controller.signal.aborted) setError(fallo instanceof Error && fallo.name === "Error" ? fallo.message : "No se pudo preparar el CSV. Vuelve a intentarlo.");
    } finally {
      solicitud.current = null;
      setPendiente(false);
    }
  }

  return (
    <div className="ad-exportar">
      <div className="ad-actions start">
        <button ref={boton} type="button" className="ad-btn outline" onClick={exportar} disabled={deshabilitado} aria-disabled={pendiente || undefined}>
          {pendiente ? "Preparando CSV…" : "Descargar CSV"}
        </button>
        {pendiente && <button type="button" className="ad-btn outline" onClick={() => {
          solicitud.current?.abort();
          boton.current?.focus();
        }}>Cancelar</button>}
      </div>
      <span className="ad-sr" role="status">{pendiente ? "Preparando el archivo CSV." : ""}</span>
      {error && <p className="ad-error" role="alert">{error}</p>}
    </div>
  );
}
