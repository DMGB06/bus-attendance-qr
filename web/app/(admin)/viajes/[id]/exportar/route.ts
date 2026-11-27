import { exportarCsv } from "@/lib/exportacion";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return exportarCsv(request, "viaje", (await params).id);
}
