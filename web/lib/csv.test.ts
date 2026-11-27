import { describe, expect, it } from "vitest";
import { generarCsv, nombreCsv, type FilaCsv } from "./csv";
import { parametrosExportacion, urlExportarAlumno, urlExportarViajes } from "./schemas/exportacion";
import { filtrosAsistencia } from "./schemas/asistencia";
import { filtrosViajes } from "./schemas/viajes";

const id = "45000000-0000-0000-1000-000000000001";
const fila: FilaCsv = {
  trip_date: "2034-05-01", bus_code: "BUS-01", bus_label: "Bus municipal", turn_type: "mañana",
  direction: "recojo", status: "completed", started_at: "2034-05-01T12:00:00Z", ended_at: null,
  student_name: 'María; "Pérez"', event_type: "manual", scanned_at: "2034-05-02T05:05:00Z",
  anulado: true, void_reason: "Duplicado\r\nAl sincronizar", operator_name: "Chofer prueba",
};

describe("descargas CSV", () => {
  it("usa BOM UTF-8, columnas del origen y formato de Lima", () => {
    const csv = generarCsv("viaje", [fila]);
    expect(Buffer.from(csv).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(csv).toContain('"Fecha del viaje";"Bus";"Turno";"Sentido";"Alumno";"Evento";"Hora registrada";"Operador";"Estado de anulación";"Motivo de anulación"\r\n');
    expect(csv).toContain('"01/05/2034";"BUS-01 · Bus municipal";"Recojo mañana";"Recojo";"María; ""Pérez""";"Subida manual"');
    expect(csv).toMatch(/02\/05\/2034.*00:05/);
    expect(csv).toContain('"Chofer prueba";"Anulado";"Duplicado\r\nAl sincronizar"\r\n');
    expect(generarCsv("alumno", [fila])).not.toContain("Chofer prueba");
    expect(generarCsv("viajes", [fila])).toContain('"Cerrado";"07:00";""\r\n');
    expect(nombreCsv("alumno", new Date("2034-05-02T04:59:59Z"))).toBe("asistencia-alumno-2034-05-01.csv");
  });

  it("preserva celdas vacías y el orden de las filas recibidas", () => {
    const csv = generarCsv("alumno", [fila, { ...fila, student_name: "Segunda", scanned_at: null, void_reason: null, anulado: false }]);
    expect(csv.lastIndexOf("María")).toBeLessThan(csv.indexOf("Segunda"));
    expect(csv).toContain('"Segunda";"Subida manual";"";"Vigente";""\r\n');
  });

  it.each(["=1+1", "+1", "-1", "@texto", " \t\u200B =1+1", "\u0007+1", "＝1+1", "\nTexto"])(
    "preserva como texto el valor %j",
    (valor) => {
      const csv = generarCsv("viaje", [{ ...fila, student_name: valor, operator_name: valor, void_reason: valor }]);
      expect(csv.split(`"'${valor}"`).length - 1).toBe(3);
    },
  );
});

describe("filtros de descarga", () => {
  it("utiliza solo filtros aplicados y conserva las fechas abiertas al cambiar de página", () => {
    const { filtros } = filtrosViajes({ desde: "2034-05-01", hasta: "", bus: id, turno: "mañana", sentido: "recojo", estado: "completed", page: "2" });
    const url = urlExportarViajes(filtros);
    expect(urlExportarViajes({ ...filtros, page: 4 })).toBe(url);
    expect(urlExportarViajes({ ...filtros, estado: "active" })).not.toBe(url);
    expect(parametrosExportacion("viajes", new URL(url, "http://localhost").searchParams)).toEqual({
      p_origen: "viajes", p_desde: "2034-05-01", p_hasta: null, p_bus_id: id, p_turno: "mañana", p_sentido: "recojo", p_estado: "completed",
    });
    const alumno = filtrosAsistencia({ desde: "", hasta: "", evento: "manual", page: "10" }).filtros;
    const consulta = new URL(urlExportarAlumno(id, alumno), "http://localhost");
    expect(consulta.searchParams.has("page")).toBe(false);
    expect(parametrosExportacion("alumno", consulta.searchParams, id)).toMatchObject({ p_id: id, p_desde: null, p_hasta: null, p_evento: "manual" });
  });

  it("rechaza fechas, filtros e identificadores inválidos", () => {
    for (const query of ["desde=0000-01-01", "desde=2034-02-30", "desde=2034-05-02&hasta=2034-05-01", "turno=falso", "bus=roto", "estado=active&estado=completed"]) {
      expect(parametrosExportacion("viajes", new URLSearchParams(query))).toBeNull();
    }
    expect(parametrosExportacion("alumno", new URLSearchParams("evento=otro"), id)).toBeNull();
    expect(parametrosExportacion("viaje", new URLSearchParams(), "roto")).toBeNull();
  });
});
