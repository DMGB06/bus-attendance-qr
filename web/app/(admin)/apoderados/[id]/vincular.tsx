"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { buscarAlumnos, vincular, type AlumnoOpcion, type Estado } from "../actions";
import { PARENTESCOS } from "@/lib/schemas/apoderados";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ESTADO = { beneficiario: "Beneficiario", baja: "De baja", sin_alta: "Sin alta" } as Record<string, string>;

export function VincularAlumno({ guardianId, nombre }: { guardianId: string; nombre: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [estado, action, pendiente] = useActionState<Estado, FormData>(vincular, undefined);
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<AlumnoOpcion[]>([]);
  const [elegido, setElegido] = useState<AlumnoOpcion | null>(null);
  const [buscando, setBuscando] = useState(false);
  // Controlados: React 19 vacía los campos sin control cuando la acción devuelve un error.
  const [parentesco, setParentesco] = useState<string>("apoderado");
  const [principal, setPrincipal] = useState(false);

  useEffect(() => {
    if (estado?.ok) dialog.current?.close();
  }, [estado]);

  // Búsqueda con espera de 250 ms para no pedir en cada tecla.
  const escribir = (v: string) => {
    setQ(v);
    setElegido(null);
    clearTimeout(timer.current);
    if (v.trim().length < 2) return setOpciones([]);
    setBuscando(true);
    timer.current = setTimeout(async () => {
      setOpciones(await buscarAlumnos(v));
      setBuscando(false);
    }, 250);
  };
  const limpiar = () => {
    clearTimeout(timer.current);
    setQ("");
    setOpciones([]);
    setElegido(null);
    setBuscando(false);
    setParentesco("apoderado");
    setPrincipal(false);
  };

  return (
    <>
      <button type="button" className="ad-btn outline" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>Vincular alumno</button>
      <dialog ref={dialog} className="ad-dlg" aria-labelledby="vinc-t" onClose={limpiar}>
        <form action={action} className="ad-dlg-body">
          <div>
            <h2 id="vinc-t">Vincular alumno a {nombre}</h2>
            <p className="ad-muted">Busca al alumno y elige el parentesco. Solo salen alumnos del padrón.</p>
          </div>
          <input type="hidden" name="guardianId" value={guardianId} />
          <input type="hidden" name="studentId" value={elegido?.id ?? ""} />

          <div className="ad-search">
            <label htmlFor="vinc-q" className="ad-sr">Buscar alumno</label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            <input id="vinc-q" type="search" value={q} onChange={(e) => escribir(e.target.value)} placeholder="Nombre o código del alumno" autoComplete="off" maxLength={100} />
          </div>

          <div role="listbox" aria-label="Resultados" className="ad-opts">
            {opciones.map((o) => (
              <button key={o.id} type="button" role="option" aria-selected={elegido?.id === o.id} className="ad-opt" onClick={() => setElegido(o)}>
                <strong>{o.nombre}</strong>
                <span>{o.codigo ? `CÓDIGO ${o.codigo}` : "Sin código"} · {ESTADO[o.estado] ?? o.estado}</span>
              </button>
            ))}
            {!buscando && q.trim().length >= 2 && opciones.length === 0 && <p className="ad-muted" role="status">No hay alumnos con esa búsqueda.</p>}
          </div>

          <div className="ad-two bottom">
            <div className="ad-field">
              <label htmlFor="vinc-par">Parentesco</label>
              <select id="vinc-par" name="relationship" className="ad-input" value={parentesco} onChange={(e) => setParentesco(e.target.value)} disabled={pendiente}>
                {PARENTESCOS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </div>
            <label className="ad-check" htmlFor="vinc-prin"><input id="vinc-prin" name="primary" type="checkbox" checked={principal} onChange={(e) => setPrincipal(e.target.checked)} disabled={pendiente} /> Es el apoderado principal</label>
          </div>
          <p className="ad-note">Si el alumno ya tiene un principal y marcas este, el anterior deja de serlo.</p>

          {estado?.error && <p className="ad-error" role="alert">{estado.error}</p>}
          <div className="ad-actions">
            <button type="button" className="ad-btn outline" onClick={() => dialog.current?.close()} disabled={pendiente}>Cancelar</button>
            <button type="submit" className="ad-btn primary" disabled={pendiente || !elegido}>{pendiente ? "Guardando" : "Vincular"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
