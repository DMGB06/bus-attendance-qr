"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { maskPhone } from "@/lib/mask";
import type { EstadoAlumno } from "@/lib/schemas/alumnos";
import { CarnetTag, EstadoTag } from "./etiquetas";

export type Fila = {
  student_id: string;
  codigo: string | null;
  nombre: string;
  colegio: string | null;
  nivel: string | null;
  edad: number | null;
  estado: EstadoAlumno;
  principal_name: string | null;
  principal_phone: string | null;
  card_status: string | null;
  card_issued_at: string | null;
};

const carnetDe = (f: Fila) => (f.card_status && f.card_issued_at ? { status: f.card_status, issued_at: f.card_issued_at } : null);
const Codigo = ({ codigo }: { codigo: string | null }) => (codigo ? <strong className="ad-num">{codigo}</strong> : <strong className="ad-warn-text">Sin código</strong>);
const Apoderado = ({ f }: { f: Fila }) => (f.principal_name ? <>{f.principal_name}</> : <span className="ad-tag warn">Sin apoderado</span>);

export function TablaAlumnos({ filas }: { filas: Fila[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<Fila | null>(null);
  const abrir = (f: Fila) => {
    setSel(f);
    dialog.current?.showModal();
  };
  const nombre = (f: Fila) => (
    <button type="button" className="ad-rowlink" onClick={() => abrir(f)} aria-haspopup="dialog">
      {f.nombre}
    </button>
  );

  return (
    <>
      <div className="ad-card ad-tablewrap">
        <table className="ad-tbl">
          <caption className="ad-sr">Lista de alumnos del padrón</caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Alumno</th>
              <th scope="col">Estado</th>
              <th scope="col">Apoderado principal</th>
              <th scope="col">Carnet</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.student_id}>
                <td><Codigo codigo={f.codigo} /></td>
                <td>{nombre(f)}</td>
                <td><EstadoTag estado={f.estado} /></td>
                <td><Apoderado f={f} /></td>
                <td><CarnetTag carnet={carnetDe(f)} estado={f.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="ad-cards">
        {filas.map((f) => (
          <li key={f.student_id} className="ad-card ad-alumno">
            <div className="ad-alumno-top">
              {nombre(f)}
              <Codigo codigo={f.codigo} />
            </div>
            <div className="ad-tags">
              <EstadoTag estado={f.estado} />
              <CarnetTag carnet={carnetDe(f)} estado={f.estado} />
            </div>
            <span className="ad-muted"><Apoderado f={f} /></span>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} className="ad-dlg" aria-labelledby="rapida-t" onClose={() => setSel(null)}>
        {sel && (
          <div className="ad-dlg-body">
            <div className="ad-dlg-head">
              <div className="ad-avatar" aria-hidden="true">{sel.nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}</div>
              <div>
                <h2 id="rapida-t">{sel.nombre}</h2>
                <div className="ad-tags">
                  <span className="ad-tag code">{sel.codigo ? `CÓDIGO ${sel.codigo}` : "SIN CÓDIGO"}</span>
                  <EstadoTag estado={sel.estado} largo />
                </div>
              </div>
              <button type="button" className="ad-x" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <dl className="ad-dl two">
              <div><dt>Colegio</dt><dd>{sel.colegio ?? "—"}</dd></div>
              <div><dt>Nivel</dt><dd>{sel.nivel ? sel.nivel[0].toUpperCase() + sel.nivel.slice(1) : "—"}</dd></div>
              <div><dt>Edad</dt><dd>{sel.edad != null ? `${sel.edad} años` : "—"}</dd></div>
              <div><dt>Apoderado principal</dt><dd>{sel.principal_name ?? "Sin apoderado"}</dd></div>
              <div><dt>Teléfono</dt><dd className="ad-num">{maskPhone(sel.principal_phone) || "—"}</dd></div>
              <div><dt>Carnet</dt><dd><CarnetTag carnet={carnetDe(sel)} estado={sel.estado} /></dd></div>
            </dl>
            <p className="ad-note">La dirección, el DNI y las notas se ven en la ficha completa.</p>
            <div className="ad-actions">
              <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()}>Cerrar</button>
              <Link className="ad-btn primary" href={`/alumnos/${sel.student_id}`}>Ver ficha completa</Link>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
