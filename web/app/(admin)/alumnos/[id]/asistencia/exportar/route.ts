import { exportarCsv } from "@/lib/exportacion";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return exportarCsv(request, "alumno", (await params).id);
}
