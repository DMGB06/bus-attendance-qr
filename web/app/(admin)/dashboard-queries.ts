import type { requireAdmin } from "@/lib/auth";
import { resumenSchema, type Resumen } from "@/lib/schemas/dashboard";

export async function obtenerResumen(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]): Promise<Resumen> {
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error) throw new Error("No se pudo cargar el dashboard.");
  return resumenSchema.parse(data);
}
