import { exportarCsv } from "@/lib/exportacion";

export function POST(request: Request) {
  return exportarCsv(request, "viajes");
}
