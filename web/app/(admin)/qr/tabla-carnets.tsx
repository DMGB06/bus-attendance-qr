"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { anioActual } from "@/lib/carnet/estado";
import { POR_HOJA } from "@/lib/carnet/layout";
import { carnetUrl, descargar, hojaPdf } from "@/lib/carnet/render";
import type { EstadoCarnetFila } from "@/lib/schemas/carnets";
import { prepararCarnets } from "./actions";

export type Fila = {
  student_id: string;
  codigo: string | null;
  nombre: string;
  card_issued_at: string | null;
  card_year: number | null;
  estado_carnet: EstadoCarnetFila;
};

const fecha = (iso: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

function EstadoTag({ f }: { f: Fila }) {
  if (!f.codigo) return <span className="ad-tag warn">No se puede emitir</span>;
  if (f.estado_carnet === "vigente") return <span className="ad-tag ok">Vigente {f.card_year}</span>;
  if (f.estado_carnet === "vencido") return <span className="ad-tag warn">Vencido {f.card_year}</span>;
  if (f.estado_carnet === "perdido") return <span className="ad-tag bad">Perdido</span>;
  return <span className="ad-tag neutral">Sin carnet</span>;
}

const accion = (f: Fila) =>
  !f.codigo ? "Falta el código en el padrón"
  : f.estado_carnet === "vigente" ? "Ver carnet"
  : f.estado_carnet === "vencido" ? `Emitir ${anioActual()}`
  : f.estado_carnet === "perdido" ? "Emitir de nuevo"
  : "Emitir carnet";

const Codigo = ({ c }: { c: string | null }) => (c ? <strong className="ad-num">{c}</strong> : <strong className="ad-warn-text">Sin código</strong>);

export function TablaCarnets({ filas }: { filas: Fila[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [previas, setPrevias] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const habilitadas = filas.filter((f) => f.codigo);
  const seleccion = filas.filter((f) => elegidos.includes(f.student_id));
  const alternar = (id: string) => setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const todos = habilitadas.length > 0 && habilitadas.every((f) => elegidos.includes(f.student_id));

  const cuenta = (e: EstadoCarnetFila) => seleccion.filter((f) => f.estado_carnet === e).length;
  const nuevos = cuenta("sin_carnet") + cuenta("perdido");
  const renovados = cuenta("vencido");
  const hojas = Math.ceil(seleccion.length / POR_HOJA);

  async function abrir() {
    setError("");
    setPrevias(null);
    dialog.current?.showModal();
    try {
      const primeros = seleccion.slice(0, POR_HOJA);
      setPrevias(await Promise.all(primeros.map((f) => carnetUrl({ codigo: f.codigo!, nombre: f.nombre, anio: f.estado_carnet === "vigente" ? f.card_year! : anioActual() }))));
    } catch {
      setError("No se pudo dibujar la vista previa.");
    }
  }

  async function descargarHoja() {
    setError("");
    setTrabajando(true);
    try {
      const r = await prepararCarnets(seleccion.map((f) => f.student_id), true, "pdf");
      if (!r.ok) return setError(r.error);
      descargar(await hojaPdf(r.carnets), `carnets-${new Date().toISOString().slice(0, 10)}.pdf`, "application/pdf");
      dialog.current?.close();
      setElegidos([]);
    } catch {
      setError("No se pudo armar el PDF. Vuelve a intentarlo.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <>
      <div className="ad-hoja-barra">
        <span className="ad-muted" aria-live="polite">{elegidos.length === 0 ? "Ningún alumno elegido." : `${elegidos.length} ${elegidos.length === 1 ? "elegido" : "elegidos"}`}</span>
        <button type="button" className="ad-btn primary" disabled={elegidos.length === 0} onClick={abrir} aria-haspopup="dialog">
          Descargar hoja A4{elegidos.length ? ` (${elegidos.length})` : ""}
        </button>
      </div>

      <div className="ad-card ad-tablewrap">
        <table className="ad-tbl">
          <caption className="ad-sr">Carnets de los alumnos beneficiarios</caption>
          <thead>
            <tr>
              <th scope="col" className="ad-col-chk">
                <input type="checkbox" className="ad-chk" aria-label="Elegir todos los de esta página" checked={todos} onChange={() => setElegidos(todos ? [] : habilitadas.map((f) => f.student_id))} />
              </th>
              <th scope="col">Alumno</th><th scope="col">Código</th><th scope="col">Carnet</th><th scope="col">Emitido</th><th scope="col"><span className="ad-sr">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.student_id}>
                <td><input type="checkbox" className="ad-chk" disabled={!f.codigo} checked={elegidos.includes(f.student_id)} onChange={() => alternar(f.student_id)} aria-label={f.codigo ? `Elegir a ${f.nombre}` : `${f.nombre} no tiene código`} /></td>
                <td><Link className="ad-rowlink" href={`/qr/${f.student_id}`}>{f.nombre}</Link></td>
                <td><Codigo c={f.codigo} /></td>
                <td><EstadoTag f={f} /></td>
                <td className="ad-muted">{f.card_issued_at ? fecha(f.card_issued_at) : "—"}</td>
                <td className="ad-right">{f.codigo ? <Link className="ad-link" href={`/qr/${f.student_id}`}>{accion(f)}</Link> : <span className="ad-note">{accion(f)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="ad-cards">
        {filas.map((f) => (
          <li key={f.student_id} className="ad-card ad-alumno">
            <div className="ad-alumno-top">
              <input type="checkbox" className="ad-chk big" disabled={!f.codigo} checked={elegidos.includes(f.student_id)} onChange={() => alternar(f.student_id)} aria-label={f.codigo ? `Elegir a ${f.nombre}` : `${f.nombre} no tiene código`} />
              <Link className="ad-rowlink grow" href={`/qr/${f.student_id}`}>{f.nombre}</Link>
              <Codigo c={f.codigo} />
            </div>
            <div className="ad-tags indent"><EstadoTag f={f} /></div>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} className="ad-dlg wide" aria-labelledby="hoja-t" onClose={() => { setPrevias(null); setError(""); }}>
        <div className="ad-dlg-body">
          <div>
            <h2 id="hoja-t">Hoja A4 para imprimir</h2>
            <p className="ad-muted">
              {seleccion.length} {seleccion.length === 1 ? "carnet" : "carnets"} · {hojas} {hojas === 1 ? "hoja" : "hojas"} de {POR_HOJA} (2 × 4). Mica de 95 × 60 mm. Imprime a tamaño real, sin ajustar a la página.
            </p>
          </div>
          {(nuevos > 0 || renovados > 0) && (
            <p className="ad-info" role="status">
              Al descargar se emitirán {nuevos + renovados} {nuevos + renovados === 1 ? "carnet" : "carnets"}
              {nuevos > 0 && ` (${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"}`}{nuevos > 0 && renovados > 0 && ", "}{renovados > 0 && `${nuevos > 0 ? "" : "("}${renovados} ${renovados === 1 ? "renovado" : "renovados"}`}{(nuevos > 0 || renovados > 0) && ")"}. Los que ya están vigentes no cambian.
            </p>
          )}
          <div className="ad-hoja" aria-label="Vista previa de la primera hoja">
            {Array.from({ length: POR_HOJA }, (_, i) => (
              <div key={i} className="ad-hoja-celda">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previas?.[i] && <img src={previas[i]} alt={`Carnet de ${seleccion[i]?.nombre ?? ""}`} />}
                {!previas?.[i] && i < seleccion.length && <span className="ad-note">Dibujando</span>}
                {i >= seleccion.length && <span className="ad-note">Libre</span>}
              </div>
            ))}
          </div>
          <p className="ad-note">Cada descarga queda registrada en la auditoría como impresión.{seleccion.length > POR_HOJA ? " La vista previa muestra solo la primera hoja." : ""}</p>
          {error && <p className="ad-error" role="alert">{error}</p>}
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={trabajando}>Volver</button>
            <button type="button" className="ad-btn primary" onClick={descargarHoja} disabled={trabajando || seleccion.length === 0}>{trabajando ? "Preparando" : "Descargar PDF"}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
