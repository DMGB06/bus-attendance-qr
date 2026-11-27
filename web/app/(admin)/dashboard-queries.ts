import type { requireAdmin } from "@/lib/auth";
import { resumenOperativoSchema, resumenSchema, type Resumen, type ResumenOperativo } from "@/lib/schemas/dashboard";

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function obtenerResumen(supabase: Supabase): Promise<Resumen> {
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error) throw new Error("No se pudo cargar el dashboard.");
  return resumenSchema.parse(data);
}

export async function obtenerOperacion(supabase: Supabase): Promise<ResumenOperativo | null> {
  const { data, error } = await supabase.rpc("admin_dashboard_operativo");
  if (error) {
    console.error("No se pudo cargar el resumen operativo.", error.code);
    return null;
  }
  const resumen = resumenOperativoSchema.safeParse(data);
  if (resumen.success) return resumen.data;
  console.error("El resumen operativo tiene un formato inválido.");
  return null;
}
