"use client";

import { useRef, useState } from "react";
import { anioActual } from "@/lib/carnet/estado";
import type { Carnet } from "@/lib/carnet/layout";
import { carnetPng, descargar, hojaPdf } from "@/lib/carnet/render";
import type { EstadoCarnetFila } from "@/lib/schemas/carnets";
import { emitirCarnet, prepararCarnets, reportarPerdido } from "../actions";

type Props = { studentId: string; nombre: string; estado: EstadoCarnetFila; anioCarnet: number | null; puedeEmitir: boolean };

const slug = (c: Carnet) => `carnet-${c.codigo.toLowerCase()}-${c.anio}`;

export function AccionesCarnet({ studentId, nombre, estado, anioCarnet, puedeEmitir }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");
  const anio = anioActual();

  // Todas las acciones siguen el mismo camino: pedir al servidor (que audita) y luego dibujar y descargar aquí.
  async function correr(nombreAccion: string, fn: () => Promise<void>) {
    setError("");
    setOcupado(nombreAccion);
    try {
      await fn();
    } catch {
      setError("No se pudo completar la acción. Vuelve a intentarlo.");
    } finally {
      setOcupado(null);
    }
  }

  const bajar = (emitir: boolean, formato: "pdf" | "png") => async () => {
    const r = await prepararCarnets([studentId], emitir, formato);
    if (!r.ok) return setError(r.error);
    const c = r.carnets[0];
    if (formato === "png") descargar(await carnetPng(c), `${slug(c)}.png`, "image/png");
    else descargar(await hojaPdf(r.carnets), `${slug(c)}.pdf`, "application/pdf");
  };

  const emitir = async () => {
    const r = await emitirCarnet(studentId);
    if (!r.ok) return setError(r.error);
  };

  async function perdido(e: React.FormEvent) {
    e.preventDefault();
    setErrorMotivo("");
    setOcupado("perdido");
    try {
      const r = await reportarPerdido(studentId, motivo);
      if (!r.ok) return setErrorMotivo(r.error);
      dialog.current?.close();
      setMotivo("");
    } catch {
      setErrorMotivo("No se pudo reportar el carnet. Vuelve a intentarlo.");
    } finally {
      setOcupado(null);
    }
  }

  const btn = (clave: string, texto: string, ocupadoTxt: string, fn: () => Promise<void>, clase = "primary") => (
    <button type="button" className={`ad-btn ${clase}`} disabled={ocupado !== null} onClick={() => correr(clave, fn)}>
      {ocupado === clave ? ocupadoTxt : texto}
    </button>
  );

  if (!puedeEmitir && estado !== "vigente" && estado !== "vencido") {
    return <p className="ad-warn" role="status">No se puede emitir un carnet: el alumno no es beneficiario activo o no tiene código en el padrón.</p>;
  }

  return (
    <div className="ad-stack">
      {estado === "vigente" && (
        <>
          <div className="ad-actions start">
            {btn("pdf", "Descargar PDF", "Preparando", bajar(false, "pdf"))}
            {btn("png", "Descargar PNG", "Preparando", bajar(false, "png"), "outline")}
          </div>
          <button type="button" className="ad-btn danger-outline fit" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>Reportar perdido</button>
        </>
      )}
      {estado === "vencido" && (
        <div className="ad-actions start">
          {puedeEmitir && btn("emitir", `Emitir carnet ${anio}`, "Emitiendo", emitir)}
          {btn("viejo", `Descargar el de ${anioCarnet}`, "Preparando", bajar(false, "pdf"), "outline")}
        </div>
      )}
      {estado === "perdido" && <div className="ad-actions start">{btn("nuevo", "Emitir de nuevo e imprimir", "Emitiendo", bajar(true, "pdf"))}</div>}
      {estado === "sin_carnet" && <div className="ad-actions start">{btn("emitir", `Emitir carnet ${anio}`, "Emitiendo", emitir)}</div>}
      {error && <p className="ad-error" role="alert">{error}</p>}

      <dialog ref={dialog} className="ad-dlg narrow" aria-labelledby="perdido-t" onClose={() => { setMotivo(""); setErrorMotivo(""); }}>
        <form onSubmit={perdido} className="ad-dlg-body">
          <div>
            <h2 id="perdido-t">Reportar perdido el carnet de {nombre}</h2>
            <p className="ad-muted">El carnet queda marcado como perdido y registrado. Después podrás emitirlo de nuevo con el mismo código para entregarle otro.</p>
          </div>
          <div className="ad-field">
            <label htmlFor="perdido-motivo">¿Qué pasó? <span className="ad-bad">(obligatorio)</span></label>
            <textarea id="perdido-motivo" rows={3} maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-describedby="perdido-ayuda" aria-invalid={errorMotivo ? "true" : "false"} disabled={ocupado === "perdido"} />
            <div className="ad-field-foot"><span id="perdido-ayuda">Por ejemplo: se perdió, se mojó, se rompió.</span><span className="ad-num">{motivo.length}/200</span></div>
            {errorMotivo && <p className="ad-error" role="alert">{errorMotivo}</p>}
          </div>
          <p className="ad-warn">Un carnet perdido sigue funcionando en el bus: el móvil no consulta esta lista. Si preocupa el mal uso, hay que cambiar la app móvil (fuera de esta etapa).</p>
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={ocupado === "perdido"}>Cancelar</button>
            <button type="submit" className="ad-btn danger" disabled={ocupado === "perdido"}>{ocupado === "perdido" ? "Guardando" : "Reportar perdido"}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
