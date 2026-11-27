import { expect, test } from "@playwright/test";
import { loginComoAdmin } from "./helpers/login";
import { sql } from "./helpers/db";

const bus = "41000000-0000-0000-1000-000000000001";
const retorno = "41000000-0000-0000-1000-000000000002";
const vacio = "41000000-0000-0000-1000-000000000003";
const alumno = "41000000-0000-0000-1000-000000000004";
const segundoAlumno = "41000000-0000-0000-1000-000000000005";
const operador = "b0000000-0000-0000-0000-000000000002";
const ayer = () => sql("SELECT ((now() AT TIME ZONE 'America/Lima')::date - 1)::text").trim();

function limpiar() {
  sql(`BEGIN;
    DELETE FROM buscontrol.student_trip_status WHERE trip_id IN ('${retorno}', '${vacio}');
    DELETE FROM buscontrol.bus_trips WHERE id IN ('${retorno}', '${vacio}');
    DELETE FROM buscontrol.bus_units WHERE id = '${bus}';
    DELETE FROM public.social_bus_escolar WHERE id IN ('${alumno}', '${segundoAlumno}');
    COMMIT;`);
}

function eventos(valores: string) {
  sql(`BEGIN;
    ALTER TABLE buscontrol.bus_attendance_records DISABLE TRIGGER "attendance-push";
    INSERT INTO buscontrol.bus_attendance_records
      (trip_id, student_id, event_type, scanned_at, scanned_by, voided_at, void_reason)
    VALUES ${valores};
    ALTER TABLE buscontrol.bus_attendance_records ENABLE TRIGGER "attendance-push";
    COMMIT;`);
}

test.describe("Viajes", () => {
  test.beforeEach(async ({ page }) => {
    limpiar();
    sql(`BEGIN;
      INSERT INTO buscontrol.bus_units (id, code, label, is_active) VALUES ('${bus}', 'E2E-VIAJES', 'Bus Viajes Prueba', false);
      INSERT INTO buscontrol.bus_trips (id, bus_id, trip_date, turn_type, direction, status, started_at, ended_at)
      VALUES
        ('${retorno}', '${bus}', (now() AT TIME ZONE 'America/Lima')::date - 1, 'tarde_unica', 'retorno', 'completed', now() - interval '26 hours', now() - interval '25 hours'),
        ('${vacio}', '${bus}', (now() AT TIME ZONE 'America/Lima')::date, 'mañana', 'recojo', 'active', now(), NULL);
      INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo)
      VALUES ('${alumno}', 'ALUMNO E2E VIAJES', '10000411', 'BU0411'),
             ('${segundoAlumno}', 'SEGUNDO E2E VIAJES', '10000412', 'BU0412');
      COMMIT;`);
    eventos(`
      ('${retorno}', '${alumno}', 'manual', now() - interval '25 hours 40 minutes', '${operador}', NULL, NULL),
      ('${retorno}', '${alumno}', 'bajo', now() - interval '25 hours 10 minutes', '${operador}', now(), 'Registro de prueba anulado'),
      ('${retorno}', '${segundoAlumno}', 'ausente', now() - interval '25 hours 30 minutes', '${operador}', NULL, NULL)
    `);
    await loginComoAdmin(page);
  });

  test.afterEach(() => limpiar());

  test("encuentra el retorno de ayer, muestra la asistencia y conserva filtros", async ({ page }) => {
    await page.getByRole("link", { name: "Viajes", exact: true }).click();
    const dia = ayer();
    await page.getByLabel("Desde").fill(dia);
    await page.getByLabel("Hasta").fill(dia);
    await page.getByLabel("Bus", { exact: true }).selectOption(bus);
    await page.getByLabel("Turno").selectOption("tarde_unica");
    await page.getByLabel("Sentido").selectOption("retorno");
    await page.getByLabel("Estado").selectOption("completed");
    await page.getByRole("button", { name: "Filtrar" }).click();
    const lista = page.getByRole("table");
    await expect(lista.getByRole("row")).toHaveCount(2);
    await lista.getByRole("link", { name: /Ver viaje: Retorno/ }).click();
    await expect(page).toHaveURL(new RegExp(`/viajes/${retorno}\\?`));

    const resumen = page.getByRole("region", { name: "Resumen de asistencia" });
    await expect(resumen.locator("dd")).toHaveText(["1", "0", "1", "1"]);
    const tabla = page.getByRole("table");
    await expect(tabla.getByText("Subida manual")).toBeVisible();
    await expect(tabla.getByText("Registro de prueba anulado")).toBeVisible();
    await expect(tabla.getByText("Chofer Prueba").first()).toBeVisible();

    await page.getByRole("link", { name: "Volver a viajes" }).click();
    await expect(page.getByLabel("Desde")).toHaveValue(dia);
    await expect(page.getByLabel("Bus", { exact: true })).toHaveValue(bus);
    await expect(page.getByLabel("Turno")).toHaveValue("tarde_unica");
    await lista.getByRole("link", { name: /Ver viaje: Retorno/ }).click();
    await tabla.getByRole("row", { name: /Subida manual/ }).getByRole("link", { name: "ALUMNO E2E VIAJES" }).click();
    await expect(page).toHaveURL(new RegExp(`/alumnos/${alumno}$`));
    await expect(page.getByRole("heading", { name: "ALUMNO E2E VIAJES" })).toBeVisible();
  });

  test("muestra un viaje vacío y refleja un nuevo registro al actualizar", async ({ page }) => {
    await page.goto(`/viajes/${vacio}`);
    await expect(page.getByText("Este viaje todavía no tiene registros de asistencia.")).toBeVisible();
    eventos(`('${vacio}', '${alumno}', 'subio', now(), '${operador}', NULL, NULL)`);
    await page.reload();
    await expect(page.getByRole("table").getByText("Subió", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumen de asistencia" }).locator("dd")).toHaveText(["1", "0", "0", "1"]);
  });

  test("distingue los filtros sin resultados, las fechas inválidas y los viajes inexistentes", async ({ page }) => {
    await page.goto("/viajes?desde=2000-01-01&hasta=2000-01-02");
    await expect(page.getByText("No hay viajes con esos filtros.")).toBeVisible();
    await page.goto("/viajes?desde=2000-01-02&hasta=2000-01-01");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("La fecha inicial no puede ser posterior a la final.");
    for (const id of ["invalido", "41000000-0000-0000-1000-000000000099"]) {
      await page.goto(`/viajes/${id}`);
      await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
    }
  });

  test("los nombres largos se ajustan a la tarjeta en móvil", async ({ page }) => {
    const nombre = "APELLIDO".repeat(18);
    sql(`UPDATE public.social_bus_escolar SET nombre_alumno = '${nombre}' WHERE id = '${alumno}';`);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/viajes/${retorno}`);
    await expect(page.getByRole("link", { name: nombre, exact: true }).first()).toBeVisible();
    await expect(page.getByRole("table")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  });
});

test("protege las rutas de viajes fuera de sesión", async ({ page }) => {
  await page.goto(`/viajes/${retorno}`);
  await expect(page).toHaveURL(/\/login\?next=/);
});
