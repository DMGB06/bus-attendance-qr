import type { Resumen } from "@/lib/schemas/dashboard";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const nombreMes = (m: string) => MESES[Number(m.slice(5)) - 1];

const ESTADOS = [
  { clave: "vigente", texto: "Vigentes", color: "#1f8a52", clase: "c-vigente" },
  { clave: "vencido", texto: "Vencidos", color: "#d99a1b", clase: "c-vencido" },
  { clave: "perdido", texto: "Perdidos", color: "#c4382e", clase: "c-perdido" },
  { clave: "sin_carnet", texto: "Sin carnet", color: "#6b8399", clase: "c-sin" },
] as const;

const R = 60;
const C = 2 * Math.PI * R;
const GAP = 2;

// Cada gráfico lleva su valor al pasar el cursor (<title>) y una tabla para quien no distingue colores.
export function DonaCarnets({ carnets, total }: { carnets: Resumen["carnets"]; total: number }) {
  const pct = total ? Math.round((carnets.vigente / total) * 100) : 0;
  const largos = ESTADOS.map((e) => (total ? (carnets[e.clave] / total) * C : 0));
  const trozos = ESTADOS.map((e, i) => ({
    ...e,
    n: carnets[e.clave],
    largo: Math.max(largos[i] - GAP, 0),
    desde: largos.slice(0, i).reduce((a, b) => a + b, 0),
  }));
  const resumen = ESTADOS.map((e) => `${carnets[e.clave]} ${e.texto.toLowerCase()}`).join(", ");

  return (
    <section className="ad-card ad-graf" aria-labelledby="g-estado">
      <div>
        <h2 id="g-estado" className="ad-h3">Estado de los carnets</h2>
        <p className="ad-note">Alumnos activos, {total} en total</p>
      </div>
      <div className="ad-dona-fila">
        <svg viewBox="0 0 160 160" width="168" height="168" role="img" aria-label={`Estado de los carnets: ${resumen}`} className="ad-dona">
          <g transform="rotate(-90 80 80)" fill="none" strokeWidth="22">
            <circle cx="80" cy="80" r={R} stroke="#d3e3f1" />
            {trozos.filter((t) => t.largo > 0).map((t) => (
              <circle key={t.clave} cx="80" cy="80" r={R} stroke={t.color} strokeDasharray={`${t.largo.toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={(-t.desde).toFixed(2)}>
                <title>{`${t.texto}: ${t.n}`}</title>
              </circle>
            ))}
          </g>
          <text x="80" y="82" textAnchor="middle" fontSize="30" fontWeight="800" fill="#0f2b47">{pct}%</text>
          <text x="80" y="100" textAnchor="middle" fontSize="11" fontWeight="600" fill="#4d6a84">vigentes</text>
        </svg>
        <ul className="ad-leyenda">
          {ESTADOS.map((e) => (
            <li key={e.clave}><span className={`ad-sw ${e.clase}`} aria-hidden="true" /><span className="grow">{e.texto}</span><strong className="ad-num">{carnets[e.clave]}</strong></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BarrasMeses({ meses }: { meses: Resumen["emitidos_por_mes"] }) {
  const max = Math.max(...meses.map((m) => m.n));
  const tope = Math.max(10, Math.ceil(max / 10) * 10);
  const escala = 140 / tope;
  const base = 180;
  const resumen = meses.map((m) => `${nombreMes(m.mes)} ${m.n}`).join(", ");

  return (
    <section className="ad-card ad-graf" aria-labelledby="g-meses">
      <div>
        <h2 id="g-meses" className="ad-h3">Carnets emitidos por mes</h2>
        <p className="ad-note">Últimos 6 meses</p>
      </div>
      <svg viewBox="0 0 520 214" width="100%" role="img" aria-label={`Carnets emitidos por mes: ${resumen}`} className="ad-barras">
        <g fill="#4d6a84" fontSize="12">
          <line x1="40" x2="500" y1={base - 140} y2={base - 140} stroke="#e1ecf6" />
          <line x1="40" x2="500" y1={base - 70} y2={base - 70} stroke="#e1ecf6" />
          <line x1="40" x2="500" y1={base} y2={base} stroke="#9db6cc" />
          <text x="32" y={base - 136} textAnchor="end">{tope}</text>
          <text x="32" y={base - 66} textAnchor="end">{tope / 2}</text>
          <text x="32" y={base + 4} textAnchor="end">0</text>
        </g>
        {meses.map((m, i) => {
          const x = 58 + i * 76;
          const h = m.n * escala;
          const y = base - h;
          const r = Math.min(4, h);
          const ultimo = i === meses.length - 1;
          return (
            <g key={m.mes}>
              {m.n > 0 && (
                <path fill="#2478c9" d={`M${x} ${base} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + 40 - r} Q${x + 40} ${y} ${x + 40} ${y + r} V${base} Z`}>
                  <title>{`${nombreMes(m.mes)}: ${m.n}`}</title>
                </path>
              )}
              <text x={x + 20} y={y - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f2b47">{m.n}</text>
              <text x={x + 20} y={200} textAnchor="middle" fontSize="12" fontWeight={ultimo ? 800 : 500} fill={ultimo ? "#0f2b47" : "#4d6a84"}>{nombreMes(m.mes)}</text>
            </g>
          );
        })}
      </svg>
      <details className="ad-tabla-vista">
        <summary>Ver como tabla</summary>
        <table className="ad-tbl">
          <caption className="ad-sr">Carnets emitidos por mes</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col" className="ad-right">Emitidos</th></tr></thead>
          <tbody>{meses.map((m) => <tr key={m.mes}><th scope="row">{nombreMes(m.mes)} {m.mes.slice(0, 4)}</th><td className="ad-right ad-num">{m.n}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

export function BarraApoderados({ con, sin }: { con: number; sin: number }) {
  const total = con + sin;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  // con inline style prohibido por la CSP, la barra es un SVG; el tramo chico nunca baja de 3 para que se vea
  const anchoCon = total === 0 || sin === 0 ? 100 : Math.min((con / total) * 100, 97);
  return (
    <section className="ad-card ad-graf" aria-labelledby="g-apo">
      <div>
        <h2 id="g-apo" className="ad-h3">Alumnos con apoderado</h2>
        <p className="ad-note">Alumnos activos con al menos un apoderado activo vinculado</p>
      </div>
      <svg className="ad-barra-apilada" viewBox="0 0 100 28" preserveAspectRatio="none" width="100%" height="28" role="img" aria-label={`${con} alumnos con apoderado y ${sin} sin apoderado`}>
        <rect width="100" height="28" fill="#d3e3f1" />
        {con > 0 && <rect width={anchoCon} height="28" fill="#2478c9"><title>{`Con apoderado: ${con}`}</title></rect>}
        {sin > 0 && <rect x={anchoCon + 0.6} width={100 - anchoCon - 0.6} height="28" fill="#d99a1b"><title>{`Sin apoderado: ${sin}`}</title></rect>}
      </svg>
      <ul className="ad-leyenda fila">
        <li><span className="ad-sw c-apo" aria-hidden="true" />Con apoderado <strong className="ad-num">{con}</strong> <span className="ad-note">({pct(con)}%)</span></li>
        <li><span className="ad-sw c-vencido" aria-hidden="true" />Sin apoderado <strong className="ad-num">{sin}</strong> <span className="ad-note">({pct(sin)}%)</span></li>
      </ul>
    </section>
  );
}
