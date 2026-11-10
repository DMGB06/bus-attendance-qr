import { execFileSync } from "node:child_process";

// Solo Supabase LOCAL en Docker. Deja los datos de prueba en un estado conocido antes de cada prueba.
export function sql(query: string): string {
  return execFileSync("docker", ["exec", "-i", "supabase_db_BusControl", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", query], { encoding: "utf8" });
}

export const S1 = "a0000000-0000-0000-0000-000000000001"; // ALUMNO PRUEBA UNO, BU0098
export const S2 = "a0000000-0000-0000-0000-000000000002"; // ALUMNO PRUEBA DOS, BU0099
export const S3 = "a0000000-0000-0000-0000-000000000003"; // ALUMNO PRUEBA TRES, sin código

// S1 beneficiario con carnet y apoderado principal; S2 y S3 sin alta; S3 sin código.
export function resetAlumnos() {
  sql(`
    INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES ('${S3}','ALUMNO PRUEBA TRES','10000003',NULL) ON CONFLICT DO NOTHING;
    DELETE FROM buscontrol.qr_codes;
    DELETE FROM buscontrol.bus_student_guardians;
    DELETE FROM buscontrol.bus_guardians;
    DELETE FROM buscontrol.bus_beneficiaries;
    INSERT INTO buscontrol.bus_guardians (id, full_name, phone) VALUES ('c1000000-0000-0000-0000-000000000001','Rosa Prueba','987654321');
    INSERT INTO buscontrol.bus_student_guardians (student_id, guardian_id, is_primary) VALUES ('${S1}','c1000000-0000-0000-0000-000000000001', true);
    INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by)
      SELECT '${S1}', id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
    INSERT INTO buscontrol.qr_codes (student_id, code, issued_by)
      SELECT '${S1}', 'BU0098', id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
  `);
}

// Quita el alumno extra para que las suites SQL (que esperan 2 alumnos) sigan pasando.
export function limpiarAlumnos() {
  sql(`DELETE FROM buscontrol.bus_beneficiaries WHERE student_id = '${S3}'; DELETE FROM public.social_bus_escolar WHERE id = '${S3}';`);
}

export const G1 = "c1000000-0000-0000-0000-000000000001"; // Rosa Prueba: principal de S1, con correo
export const G2 = "c1000000-0000-0000-0000-000000000002"; // Julio Prueba: sin correo ni alumnos

// Parte del reset de alumnos: Rosa con correo y teléfono normalizado, y Julio sin correo ni alumnos.
export function resetApoderados() {
  resetAlumnos();
  sql(`
    UPDATE buscontrol.bus_guardians SET phone_normalized = '987654321', dni = '44123119', email = 'rosa-e2e@buscontrol.local' WHERE id = '${G1}';
    INSERT INTO buscontrol.bus_guardians (id, full_name, phone, phone_normalized) VALUES ('${G2}','Julio Prueba','912345678','912345678');
  `);
}

// Borra lo que crean las pruebas de cuentas (usuarios de Auth incluidos).
export function limpiarApoderados() {
  sql(`
    DELETE FROM buscontrol.bus_student_guardians;
    DELETE FROM buscontrol.bus_guardians WHERE email LIKE 'e2e-padre-%' OR full_name LIKE '%E2E%';
    DELETE FROM buscontrol.bus_guardians;
    DELETE FROM buscontrol.app_profiles WHERE email LIKE 'e2e-padre-%';
    DELETE FROM auth.users WHERE email LIKE 'e2e-padre-%';
  `);
  limpiarAlumnos();
}

export const S4 = "a0000000-0000-0000-0000-000000000004"; // ALUMNO PRUEBA CUATRO, BU0100, carnet perdido
export const S5 = "a0000000-0000-0000-0000-000000000005"; // ALUMNO PRUEBA CINCO, BU0101, beneficiario sin carnet

// S1 beneficiario con carnet vigente; S2 beneficiario con carnet vencido (de hace 14 meses); S3 beneficiario sin código;
// S4 beneficiario con carnet perdido; S5 beneficiario sin carnet. `lote` agrega alumnos extra con carnet vigente.
export function resetCarnets(lote = 0) {
  resetAlumnos();
  sql(`
    DELETE FROM buscontrol.admin_audit_log WHERE action IN ('qr_print','qr_issue','qr_report_lost');
    INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES
      ('${S4}','ALUMNO PRUEBA CUATRO','10000004','BU0100'), ('${S5}','ALUMNO PRUEBA CINCO','10000005','BU0101') ON CONFLICT DO NOTHING;
    INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by)
      SELECT x, (SELECT id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local') FROM unnest(ARRAY['${S2}','${S3}','${S4}','${S5}']::uuid[]) x ON CONFLICT DO NOTHING;
    INSERT INTO buscontrol.qr_codes (student_id, code, issued_by, issued_at)
      SELECT '${S2}', 'BU0099', id, now() - interval '14 months' FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
    INSERT INTO buscontrol.qr_codes (student_id, code, issued_by, status, closed_at, reason)
      SELECT '${S4}', 'BU0100', id, 'reportado_perdido', now(), 'se perdio' FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
  `);
  for (let i = 1; i <= lote; i++) {
    const id = `a0000000-0000-0000-0000-0000000001${String(i).padStart(2, "0")}`;
    sql(`
      INSERT INTO public.social_bus_escolar (id, nombre_alumno, dni_alumno, codigo) VALUES ('${id}','ALUMNO LOTE ${String(i).padStart(2, "0")}','2000${String(i).padStart(4, "0")}','BU02${String(i).padStart(2, "0")}') ON CONFLICT DO NOTHING;
      INSERT INTO buscontrol.bus_beneficiaries (student_id, enrolled_by) SELECT '${id}', id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local' ON CONFLICT DO NOTHING;
      INSERT INTO buscontrol.qr_codes (student_id, code, issued_by) SELECT '${id}', 'BU02${String(i).padStart(2, "0")}', id FROM auth.users WHERE email = 'e2e-admin@buscontrol.local';
    `);
  }
}

// Quita los alumnos extra de las pruebas de carnets.
export function limpiarCarnets() {
  sql(`
    DELETE FROM buscontrol.qr_codes WHERE student_id IN (SELECT id FROM public.social_bus_escolar WHERE id::text LIKE 'a0000000-0000-0000-0000-0000000001%' OR id IN ('${S4}','${S5}','${S3}'));
    DELETE FROM buscontrol.bus_beneficiaries WHERE student_id IN (SELECT id FROM public.social_bus_escolar WHERE id::text LIKE 'a0000000-0000-0000-0000-0000000001%' OR id IN ('${S4}','${S5}'));
    DELETE FROM public.social_bus_escolar WHERE id::text LIKE 'a0000000-0000-0000-0000-0000000001%' OR id IN ('${S4}','${S5}');
  `);
  limpiarAlumnos();
}
