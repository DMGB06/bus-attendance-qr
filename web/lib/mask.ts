// Datos de menores y apoderados: se muestran parcialmente. Quedan solo los extremos.
export function maskPhone(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("51")) d = d.slice(2); // prefijo de Perú
  return d.length < 6 ? "" : `${d[0]}•• ••• ${d.slice(-3)}`;
}

export function maskDni(dni: string | null | undefined): string {
  const d = (dni ?? "").replace(/\D/g, "");
  return d.length < 6 ? "" : `${d[0]}•••• ${d.slice(-3)}`;
}
