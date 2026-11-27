import Link from "next/link";
import { enlacesOperacion, type ResumenOperativo } from "@/lib/schemas/dashboard";
import { fechaViaje } from "@/lib/schemas/viajes";
import { BarrasViajes } from "./graficos";

export function OperacionTransporte({ resumen }: { resumen: ResumenOperativo | null }) {
  return (
    <section className="ad-stack ad-operacion" aria-labelledby="dashboard-operacion">
      <div>
        <h2 className="ad-h3" id="dashboard-operacion">Operación del transporte</h2>
        {resumen && <p className="ad-note"><time dateTime={resumen.fecha}>{fechaViaje(resumen.fecha)}</time> · Hora de Lima</p>}
      </div>
      {resumen ? <Indicadores resumen={resumen} /> : (
        <div className="ad-card ad-graf">
          <p className="ad-error" role="alert">No se pudo cargar el resumen operativo.</p>
          <form action="/" method="get">
            <button className="ad-btn outline" type="submit">Reintentar</button>
          </form>
        </div>
      )}
    </section>
  );
}

function Indicadores({ resumen }: { resumen: ResumenOperativo }) {
  const enlaces = enlacesOperacion(resumen);
  const indicadores = [
    { titulo: "Viajes en curso", n: resumen.en_curso, href: enlaces.enCurso, detalle: "Viajes activos de hoy" },
    { titulo: "Viajes cerrados", n: resumen.cerrados, href: enlaces.cerrados, detalle: "Viajes cerrados de hoy" },
    { titulo: "Subidas registradas", n: resumen.subidas, href: enlaces.subidas, detalle: "Consulta los registros en el detalle de cada viaje" },
    {
      titulo: "Incidencias",
      n: resumen.ausencias + resumen.anulaciones,
      href: enlaces.incidencias,
      detalle: `${resumen.ausencias} ${resumen.ausencias === 1 ? "ausencia" : "ausencias"} · ${resumen.anulaciones} ${resumen.anulaciones === 1 ? "anulación" : "anulaciones"}`,
    },
  ];

  return (
    <>
      <div className="ad-stats">
        {indicadores.map(({ titulo, n, href, detalle }) => (
          <Link key={titulo} className="ad-stat" href={href}>
            <span className="ad-stat-t">{titulo}</span>
            <strong className="ad-stat-n ad-num">{n}</strong>
            <span className="ad-note">{detalle}</span>
          </Link>
        ))}
      </div>
      <BarrasViajes dias={resumen.dias} href={enlaces.semana} />
    </>
  );
}
