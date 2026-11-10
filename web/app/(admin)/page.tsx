import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { obtenerResumen } from "./dashboard-queries";
import { BarraApoderados, BarrasMeses, DonaCarnets } from "./graficos";

const mesActual = () => {
  const t = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", month: "long", year: "numeric" }).format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const mesAnterior = () => {
  const d = new Date();
  d.setUTCDate(15); // el día 15 no cambia de mes al pasar a hora de Lima
  d.setUTCMonth(d.getUTCMonth() - 1);
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", month: "long" }).format(d);
};

function Pendiente({ n, ok, aviso, detalle, href }: { n: number; ok: string; aviso: string; detalle?: string; href: string }) {
  if (n === 0) {
    return (
      <p className="ad-alerta ok">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>
        <span className="grow">{ok}</span>
      </p>
    );
  }
  return (
    <Link className="ad-alerta" href={href}>
      <strong className="ad-alerta-n ad-num">{n}</strong>
      <span className="grow"><strong>{aviso}</strong>{detalle && <><br /><span className="ad-note">{detalle}</span></>}</span>
      <span aria-hidden="true" className="ad-alerta-flecha">›</span>
    </Link>
  );
}

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const r = await obtenerResumen(supabase);
  const activos = r.beneficiarios_activos;
  const c = r.carnets;
  const sinCarnetVigente = c.vencido + c.perdido + c.sin_carnet;
  const pctVigente = activos ? Math.round((c.vigente / activos) * 100) : 0;
  const dif = r.emitidos_mes - r.emitidos_mes_anterior;
  const comparacion = dif === 0 ? `igual que en ${mesAnterior()}` : `${Math.abs(dif)} ${dif > 0 ? "más" : "menos"} que en ${mesAnterior()}`;

  return (
    <div className="ad-stack">
      <div className="ad-stats">
        <Link className="ad-stat" href="/alumnos">
          <span className="ad-stat-t">Alumnos activos</span>
          <strong className="ad-stat-n ad-num">{activos}</strong>
          <span className="ad-note">Beneficiarios del bus escolar</span>
        </Link>
        <Link className="ad-stat" href="/qr?filtro=vigente">
          <span className="ad-stat-t">Carnets vigentes</span>
          <strong className="ad-stat-n ad-num">{c.vigente} <span className="ad-stat-de">de {activos}</span></strong>
          <svg className="ad-progreso" viewBox="0 0 100 8" preserveAspectRatio="none" width="100%" height="8" role="img" aria-label={`${pctVigente} por ciento de los alumnos activos tienen carnet vigente`}><rect width="100" height="8" fill="#d3e3f1" /><rect width={pctVigente} height="8" fill="#2478c9" /></svg>
        </Link>
        <Link className="ad-stat" href="/apoderados">
          <span className="ad-stat-t">Apoderados activos</span>
          <strong className="ad-stat-n ad-num">{r.apoderados_activos}</strong>
          <span className="ad-note">{r.apoderados_con_cuenta} con cuenta para la app</span>
        </Link>
        <Link className="ad-stat" href="/qr">
          <span className="ad-stat-t">Emitidos este mes</span>
          <strong className="ad-stat-n ad-num">{r.emitidos_mes}</strong>
          <span className="ad-note">{mesActual()}, {comparacion}</span>
        </Link>
      </div>

      <div className="ad-graf-fila">
        <DonaCarnets carnets={c} total={activos} />
        <BarrasMeses meses={r.emitidos_por_mes} />
      </div>

      <div className="ad-graf-fila">
        <BarraApoderados con={r.con_apoderado} sin={r.sin_apoderado} />
        <section className="ad-card ad-graf" aria-labelledby="g-pen">
          <div>
            <h2 id="g-pen" className="ad-h3">Pendientes</h2>
            <p className="ad-note">Lo que conviene resolver</p>
          </div>
          <Pendiente n={r.sin_apoderado} ok="Todos los alumnos tienen apoderado" aviso="Alumnos sin apoderado" detalle="Nadie los ve en la app" href="/alumnos?estado=beneficiario" />
          <Pendiente n={sinCarnetVigente} ok="Todos tienen carnet vigente este año" aviso="Sin carnet vigente" detalle={`${c.vencido} vencidos, ${c.perdido} perdidos, ${c.sin_carnet} sin carnet`} href="/qr?filtro=por_emitir" />
        </section>
      </div>

      <p className="ad-note">Los números se calculan al abrir la página. Los alumnos de baja no se cuentan.</p>
    </div>
  );
}
