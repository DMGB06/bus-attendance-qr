-- Ejecutar SOLO cuando ya existan usuarios en Supabase Auth.
-- Dashboard → Authentication → Users → copiar UUID de cada uno.
-- Perfiles BusControl → buscontrol.app_profiles (NO public.profiles)

-- 1) Rol operativo en perfil propio BusControl
-- INSERT INTO buscontrol.app_profiles (id, email, full_name, app_role)
-- VALUES (
--   'UUID_CHOFER'::uuid,
--   'chofer@ejemplo.com',
--   'Nombre Chofer',
--   'chofer'::buscontrol.app_role
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   app_role = EXCLUDED.app_role,
--   updated_at = now();

-- INSERT INTO buscontrol.app_profiles (id, email, full_name, app_role)
-- VALUES (
--   'UUID_ASISTENTA'::uuid,
--   'asistenta@ejemplo.com',
--   'Nombre Asistenta',
--   'asistenta'::buscontrol.app_role
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   app_role = EXCLUDED.app_role,
--   updated_at = now();

-- INSERT INTO buscontrol.app_profiles (id, email, full_name, app_role)
-- VALUES (
--   'UUID_PADRE'::uuid,
--   'padre@ejemplo.com',
--   'Nombre Apoderado',
--   'padre'::buscontrol.app_role
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   app_role = EXCLUDED.app_role,
--   updated_at = now();

-- 2) Asignar crew al BUS-01 (mismo día)
-- INSERT INTO buscontrol.bus_crew_assignments (bus_id, user_id, crew_role)
-- SELECT u.id, 'UUID_CHOFER'::uuid, 'chofer'::buscontrol.crew_role
-- FROM buscontrol.bus_units u WHERE u.code = 'BUS-01'
-- ON CONFLICT DO NOTHING;

-- INSERT INTO buscontrol.bus_crew_assignments (bus_id, user_id, crew_role)
-- SELECT u.id, 'UUID_ASISTENTA'::uuid, 'asistenta'::buscontrol.crew_role
-- FROM buscontrol.bus_units u WHERE u.code = 'BUS-01'
-- ON CONFLICT DO NOTHING;

-- 3) Vincular padre ↔ alumno(s) — **modelo municipal (recomendado, ya con datos)**
-- a) Crear usuario Auth + app_profiles con app_role = padre
-- b) Enlazar auth al catálogo:
-- UPDATE buscontrol.bus_guardians
-- SET auth_user_id = 'UUID_PADRE'::uuid, updated_at = now()
-- WHERE dni = '12345678' OR email = 'padre@ejemplo.com';
--
-- Los hijos ya vinculados en bus_student_guardians aparecen solos en la app.
-- Un apoderado puede tener varios hijos (varias filas en bus_student_guardians).

-- Alternativa directa (sin catálogo bus_guardians):
-- INSERT INTO buscontrol.student_guardians (student_id, guardian_user_id, is_primary, verified_at)
-- VALUES ('UUID_ALUMNO_1'::uuid, 'UUID_PADRE'::uuid, true, now());
