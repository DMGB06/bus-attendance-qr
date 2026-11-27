import "server-only";
import { verificarAdminAction } from "./auth";
import { generarCsv, nombreCsv, type FilaCsv } from "./csv";
import { parametrosExportacion, type OrigenCsv } from "./schemas/exportacion";

const headers = { "Cache-Control": "private, no-store" };
const error = (mensaje: string, status: number) => Response.json({ error: mensaje }, { status, headers });
const mensajeConsulta = "No se pudo preparar el CSV. Vuelve a intentarlo.";

type Consulta =
  | { estado: "ok"; filas: FilaCsv[] }
  | { estado: "vacio" | "limite" | "tamano" };

export async function exportarCsv(request: Request, origen: OrigenCsv, id?: string) {
  // Un formulario de otro origen no puede enviar este tipo de contenido sin preflight.
  if (request.headers.get("content-type") !== "application/json" || request.headers.get("sec-fetch-site") === "cross-site") {
    return error("La solicitud de descarga no es válida.", 415);
  }
  const admin = await verificarAdminAction();
  if (admin.motivo === "sesion") return error("Vuelve a iniciar sesión para descargar el CSV.", 401);
  if (admin.motivo === "mfa") return error("Completa la verificación en dos pasos para descargar el CSV.", 403);
  if (admin.motivo === "rol") return error("Tu cuenta no tiene permisos para descargar el CSV.", 403);

  const parametros = parametrosExportacion(origen, new URL(request.url).searchParams, id);
  if (!parametros) return error("Revisa las fechas y filtros antes de descargar.", 400);

  const { data, error: fallo } = await admin.supabase.rpc("admin_prepare_export", parametros);
  if (fallo?.code === "42501") return error("Tu cuenta no tiene permisos para descargar el CSV.", 403);
  if (fallo || !data) return error(mensajeConsulta, 503);
  const resultado = data as Consulta;
  if (resultado.estado === "vacio") return error("No hay registros para descargar con esta consulta.", 422);
  if (resultado.estado === "limite" || resultado.estado === "tamano") {
    const filas = resultado.estado === "limite";
    if (origen === "viaje") {
      return error(filas
        ? "Este viaje supera el límite de 10.000 filas por CSV."
        : "Este viaje supera el tamaño máximo del archivo CSV.", 422);
    }
    return error(filas
      ? "El CSV supera las 10.000 filas. Acota la consulta antes de descargar."
      : "El CSV es demasiado grande. Acota la consulta antes de descargar.", 422);
  }
  if (resultado.estado !== "ok") return error(mensajeConsulta, 503);

  return new Response(generarCsv(origen, resultado.filas), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreCsv(origen)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
