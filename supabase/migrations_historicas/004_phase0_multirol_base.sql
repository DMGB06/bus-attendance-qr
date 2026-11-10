-- BusControl QR — Fase 0 (base multi-rol)
-- Pre-requisitos: schema buscontrol creado, tablas bus_* movidas desde public,
--                 TI expuso buscontrol en Data API → Settings.
-- NO requiere usuarios chofer/asistenta/padre todavía.

-- =============================================================================
-- 0.1 — Perfiles PROPIOS BusControl (NO tocar public.profiles municipal)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE buscontrol.app_role AS ENUM (
    'chofer', 'asistenta', 'padre', 'coordinador'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS buscontrol.app_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  app_role buscontrol.app_role,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_profiles_app_role
  ON buscontrol.app_profiles (app_role)
  WHERE app_role IS NOT NULL;

-- Opcional: fila automática al registrarse (rol NULL hasta que coordinador asigne)
CREATE OR REPLACE FUNCTION buscontrol.handle_new_app_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
BEGIN
  INSERT INTO buscontrol.app_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_app_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_app_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION buscontrol.handle_new_app_user();

-- =============================================================================
-- 0.2 — bus_units + seed BUS-01
-- =============================================================================
CREATE TABLE IF NOT EXISTS buscontrol.bus_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plate text,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO buscontrol.bus_units (code, label)
VALUES ('BUS-01', 'Bus escolar 01')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 0.3 — crew_role + bus_crew_assignments (tabla vacía hasta Fase 1 / seed usuarios)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE buscontrol.crew_role AS ENUM ('chofer', 'asistenta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS buscontrol.bus_crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buscontrol.bus_units(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  crew_role buscontrol.crew_role NOT NULL,
  assignment_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bus_id, user_id, assignment_date, crew_role)
);

-- =============================================================================
-- 0.4 — extender bus_trips
-- =============================================================================
ALTER TABLE buscontrol.bus_trips
  ADD COLUMN IF NOT EXISTS bus_id uuid REFERENCES buscontrol.bus_units(id),
  ADD COLUMN IF NOT EXISTS started_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assistant_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz;

UPDATE buscontrol.bus_trips
SET started_by = operator_id
WHERE started_by IS NULL AND operator_id IS NOT NULL;

UPDATE buscontrol.bus_trips t
SET bus_id = u.id
FROM buscontrol.bus_units u
WHERE t.bus_id IS NULL AND u.code = 'BUS-01';

-- =============================================================================
-- 0.5 — un solo viaje active por bus
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_bus_trips_one_active_per_bus
  ON buscontrol.bus_trips (bus_id)
  WHERE status = 'active';

-- =============================================================================
-- 0.6 + 0.10 — asistencia: scanned_by, scan_role, anulación
-- =============================================================================
ALTER TABLE buscontrol.bus_attendance_records
  ADD COLUMN IF NOT EXISTS scanned_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS scan_role buscontrol.crew_role,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;

DO $$ BEGIN
  ALTER TABLE buscontrol.bus_attendance_records
    ADD CONSTRAINT uq_attendance_trip_student_event
    UNIQUE (trip_id, student_id, event_type);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 0.7 — student_guardians (vacía; datos en Fase 3)
-- =============================================================================
CREATE TABLE IF NOT EXISTS buscontrol.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.social_bus_escolar(id),
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id),
  relationship text NOT NULL DEFAULT 'apoderado',
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_user_id)
);

-- =============================================================================
-- 0.8 — student_trip_status + trigger
-- =============================================================================
CREATE TABLE IF NOT EXISTS buscontrol.student_trip_status (
  student_id uuid NOT NULL REFERENCES public.social_bus_escolar(id),
  trip_id uuid NOT NULL REFERENCES buscontrol.bus_trips(id),
  trip_date date NOT NULL,
  direction text NOT NULL,
  status text NOT NULL,
  last_event_type text,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, trip_id)
);

CREATE OR REPLACE FUNCTION buscontrol.sync_student_trip_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_direction text;
  v_trip_date date;
  v_status text;
BEGIN
  IF NEW.voided_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT direction, trip_date INTO v_direction, v_trip_date
  FROM buscontrol.bus_trips WHERE id = NEW.trip_id;

  v_status := CASE
    WHEN NEW.event_type = 'ausente' THEN 'absent'
    WHEN NEW.event_type IN ('subio', 'manual') AND v_direction = 'recojo' THEN 'onboard'
    WHEN NEW.event_type = 'bajo' AND v_direction = 'recojo' THEN 'at_school'
    WHEN NEW.event_type IN ('subio', 'manual') AND v_direction = 'retorno' THEN 'returning'
    WHEN NEW.event_type = 'bajo' AND v_direction = 'retorno' THEN 'dropped_off'
    ELSE 'pending'
  END;

  INSERT INTO buscontrol.student_trip_status (
    student_id, trip_id, trip_date, direction, status,
    last_event_type, last_event_at, updated_at
  ) VALUES (
    NEW.student_id, NEW.trip_id, v_trip_date, v_direction, v_status,
    NEW.event_type, COALESCE(NEW.scanned_at, now()), now()
  )
  ON CONFLICT (student_id, trip_id) DO UPDATE SET
    status = EXCLUDED.status,
    last_event_type = EXCLUDED.last_event_type,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_trip_status ON buscontrol.bus_attendance_records;

CREATE TRIGGER trg_sync_student_trip_status
AFTER INSERT ON buscontrol.bus_attendance_records
FOR EACH ROW
EXECUTE FUNCTION buscontrol.sync_student_trip_status();

-- =============================================================================
-- 0.9 — tablas futuras push/GPS (vacías)
-- =============================================================================
CREATE TABLE IF NOT EXISTS buscontrol.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  expo_push_token text NOT NULL,
  platform text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

CREATE TABLE IF NOT EXISTS buscontrol.bus_trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES buscontrol.bus_trips(id),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS buscontrol.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.social_bus_escolar(id),
  event_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 0.11 — RLS base (permisivo MVP; endurecer en Fase 1)
-- =============================================================================
CREATE OR REPLACE FUNCTION buscontrol.current_app_role()
RETURNS buscontrol.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = buscontrol, public
AS $$
  SELECT app_role FROM buscontrol.app_profiles WHERE id = auth.uid()
$$;

ALTER TABLE buscontrol.app_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.bus_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.bus_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.bus_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.bus_crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscontrol.student_trip_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_app_profile" ON buscontrol.app_profiles;
CREATE POLICY "read_own_app_profile" ON buscontrol.app_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "update_own_app_profile" ON buscontrol.app_profiles;
CREATE POLICY "update_own_app_profile" ON buscontrol.app_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "ops_all_bus_trips" ON buscontrol.bus_trips;
CREATE POLICY "ops_all_bus_trips" ON buscontrol.bus_trips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ops_all_attendance" ON buscontrol.bus_attendance_records;
CREATE POLICY "ops_all_attendance" ON buscontrol.bus_attendance_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read_bus_units" ON buscontrol.bus_units;
CREATE POLICY "read_bus_units" ON buscontrol.bus_units
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read_crew" ON buscontrol.bus_crew_assignments;
CREATE POLICY "read_crew" ON buscontrol.bus_crew_assignments
  FOR SELECT TO authenticated USING (true);

-- Re-aplicar grants por si tablas nuevas
GRANT USAGE ON SCHEMA buscontrol TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA buscontrol TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA buscontrol TO service_role;

-- 0.12 RPCs → Fase 1 (app V1 sigue con insert directo)
