import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { loginComoAdmin } from "./helpers/login";
import { limpiarCarnets, resetCarnets, S1, S2, S3, S4, S5, sql } from "./helpers/db";

test.afterAll(() => limpiarCarnets());

const anio = new Date().getFullYear();
const fila = (page: Page, nombre: string) => page.getByRole("row").filter({ hasText: nombre });
const vigentes = (id: string) => sql(`SELECT count(*) FROM buscontrol.qr_codes WHERE student_id = '${id}' AND status = 'vigente'`).trim();
const impresiones = () => sql(`SELECT count(*) FROM buscontrol.admin_audit_log WHERE action = 'qr_print'`).trim();

async function bajar(page: Page, accion: () => Promise<void>): Promise<{ dl: Download; bytes: Buffer }> {
  const [dl] = await Promise.all([page.waitForEvent("download"), accion()]);
  return { dl, bytes: readFileSync(await dl.path()) };
}

test.describe("carnets", () => {
  test.beforeEach(async ({ page }) => {
    resetCarnets();
    await loginComoAdmin(page);
  });

  test("la lista muestra el estado de cada carnet y filtra", async ({ page }) => {
    await page.goto("/qr");
    await expect(fila(page, "ALUMNO PRUEBA UNO")).toContainText(`Vigente ${anio}`);
    await expect(fila(page, "ALUMNO PRUEBA DOS")).toContainText(/Vencido \d{4}/); // emitido hace 14 meses
    await expect(fila(page, "ALUMNO PRUEBA CUATRO")).toContainText("Perdido");
    await expect(fila(page, "ALUMNO PRUEBA CINCO")).toContainText("Sin carnet");
    const tres = fila(page, "ALUMNO PRUEBA TRES"); // Review Focus 1: sin código no se puede emitir
    await expect(tres).toContainText("No se puede emitir");
    await expect(tres.getByRole("checkbox")).toBeDisabled();

    await page.getByRole("link", { name: "Por emitir" }).click();
    await expect(fila(page, "ALUMNO PRUEBA UNO")).toHaveCount(0);
    await expect(fila(page, "ALUMNO PRUEBA CINCO")).toBeVisible();
    await page.getByRole("link", { name: "Vigentes" }).click();
    await expect(fila(page, "ALUMNO PRUEBA UNO")).toBeVisible();
    await expect(fila(page, "ALUMNO PRUEBA CINCO")).toHaveCount(0);

    await page.goto("/qr");
    await page.getByLabel("Buscar alumno").fill("bu0100");
    await page.keyboard.press("Enter");
    await expect(fila(page, "ALUMNO PRUEBA CUATRO")).toBeVisible();
    await expect(fila(page, "ALUMNO PRUEBA UNO")).toHaveCount(0);
  });

  test("descargar el PDF y el PNG de un carnet vigente deja la impresión en la auditoría y no cambia el carnet", async ({ page }) => {
    await page.goto(`/qr/${S1}`);
    await expect(page.getByRole("img", { name: /Vista previa del carnet de ALUMNO PRUEBA UNO, código BU0098/ })).toBeVisible();

    const pdf = await bajar(page, () => page.getByRole("button", { name: "Descargar PDF" }).click());
    expect(pdf.dl.suggestedFilename()).toBe(`carnet-bu0098-${anio}.pdf`);
    expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBe(1);

    const png = await bajar(page, () => page.getByRole("button", { name: "Descargar PNG" }).click());
    expect(png.bytes.subarray(1, 4).toString()).toBe("PNG");
    expect([png.bytes.readUInt32BE(16), png.bytes.readUInt32BE(20)]).toEqual([1122, 709]); // 95 x 60 mm a 300 dpi

    expect(impresiones()).toBe("2");
    expect(sql(`SELECT count(*) FROM buscontrol.qr_codes WHERE student_id = '${S1}'`).trim()).toBe("1"); // no emitió nada
    expect(sql(`SELECT details->>'format' FROM buscontrol.admin_audit_log WHERE action = 'qr_print' ORDER BY created_at LIMIT 1`).trim()).toBe("pdf");
  });

  test("la hoja A4 emite los que faltan, descarga el PDF y lo registra", async ({ page }) => {
    await page.goto("/qr");
    await page.getByRole("checkbox", { name: "Elegir a ALUMNO PRUEBA UNO" }).check();
    await page.getByRole("checkbox", { name: "Elegir a ALUMNO PRUEBA CINCO" }).check();
    await page.getByRole("checkbox", { name: "Elegir a ALUMNO PRUEBA DOS" }).check();
    await page.getByRole("button", { name: /Descargar hoja A4/ }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg).toContainText("3 carnets");
    await expect(dlg).toContainText("Al descargar se emitirán 2 carnets (1 nuevo, 1 renovado)");
    await expect(dlg.locator("img")).toHaveCount(3); // vista previa de cada carnet elegido

    const { bytes } = await bajar(page, () => dlg.getByRole("button", { name: "Descargar PDF" }).click());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(vigentes(S5)).toBe("1"); // Review Focus 2: uno solo
    expect(vigentes(S2)).toBe("1");
    expect(sql(`SELECT count(*) FROM buscontrol.qr_codes WHERE student_id = '${S2}' AND status = 'reemplazado'`).trim()).toBe("1");
    expect(impresiones()).toBe("1");
    await expect(fila(page, "ALUMNO PRUEBA CINCO")).toContainText(`Vigente ${anio}`);
  });

  test("más de 8 carnets generan varias hojas", async ({ page }) => {
    resetCarnets(6); // 4 sin carnet vigente + 6 de lote + S1 = 11 con código elegibles
    await page.goto("/qr");
    await page.getByRole("checkbox", { name: "Elegir todos los de esta página" }).check();
    await page.getByRole("button", { name: /Descargar hoja A4/ }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg).toContainText("2 hojas de 8");
    const { bytes } = await bajar(page, () => dlg.getByRole("button", { name: "Descargar PDF" }).click());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  test("carnet vencido: emitir uno nuevo reemplaza al anterior", async ({ page }) => {
    await page.goto(`/qr/${S2}`);
    await expect(page.getByText(/ya venció/)).toBeVisible();
    await page.getByRole("button", { name: `Emitir carnet ${anio}` }).click();
    await expect(page.getByText(`Vigente ${anio}`).first()).toBeVisible();
    await expect(page.locator(".ad-tag", { hasText: "Reemplazado" })).toBeVisible();
    expect(vigentes(S2)).toBe("1");
  });

  test("doble clic en emitir no deja dos carnets vigentes", async ({ page }) => {
    await page.goto(`/qr/${S5}`);
    await page.getByRole("button", { name: `Emitir carnet ${anio}` }).dblclick();
    await expect(page.getByText(`Vigente ${anio}`).first()).toBeVisible();
    expect(vigentes(S5)).toBe("1");
  });

  test("reportar perdido pide el motivo; después se emite de nuevo con el mismo código", async ({ page }) => {
    await page.goto(`/qr/${S1}`);
    await page.getByRole("button", { name: "Reportar perdido" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByRole("button", { name: "Reportar perdido" }).click();
    await expect(dlg.getByRole("alert")).toHaveText("Escribe qué pasó con el carnet.");
    await dlg.getByLabel(/¿Qué pasó\?/).fill("Se le cayó en el bus");
    await dlg.getByRole("button", { name: "Reportar perdido" }).click();
    await expect(page.getByText(/Reportado como perdido el/)).toBeVisible();
    expect(vigentes(S1)).toBe("0");

    const { bytes } = await bajar(page, () => page.getByRole("button", { name: "Emitir de nuevo e imprimir" }).click());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    expect(vigentes(S1)).toBe("1");
    expect(sql(`SELECT count(DISTINCT code) FROM buscontrol.qr_codes WHERE student_id = '${S1}'`).trim()).toBe("1"); // mismo código
  });

  test("un alumno con carnet perdido muestra el aviso de la limitación conocida", async ({ page }) => {
    await page.goto(`/qr/${S4}`);
    await expect(page.getByText(/Reportado como perdido el/)).toBeVisible();
    await expect(page.locator("p.ad-note", { hasText: /sigue funcionando en el bus/ })).toBeVisible();
  });

  test("alumno sin código avisa y no ofrece emitir", async ({ page }) => {
    await page.goto(`/qr/${S3}`);
    await expect(page.getByText(/no tiene código en el padrón/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Emitir/ })).toHaveCount(0);
  });

  test("un id inválido o inexistente muestra la pantalla 404", async ({ page }) => {
    await page.goto("/qr/no-es-un-uuid");
    await expect(page.getByText("Esta página no existe")).toBeVisible();
    await page.goto("/qr/a0000000-0000-0000-0000-0000000000ff");
    await expect(page.getByText("Esta página no existe")).toBeVisible();
  });
});
