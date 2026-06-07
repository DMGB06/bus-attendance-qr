# Migración: solo lista oficial del pata

Ya tienes backup. Este proceso **borra todos los alumnos actuales** e importa **solo los 109 de la lista oficial**, con apoderados separados.

---

## Qué va a pasar

| Acción | Detalle |
|---|---|
| ✅ Se crean | `bus_guardians`, `bus_student_guardians` |
| 🗑️ Se borra | Todos los alumnos de `social_bus_escolar` |
| 🗑️ Se borra | Todo el historial de `bus_attendance_records` |
| ✅ Se importa | 109 alumnos oficiales + 69 apoderados |
| ✅ Se conserva | Código QR (`BU00xx`) donde hubo match con backup |
| ✅ Se conserva | DNI, colegio, dirección del backup cuando existía |

**No se borran:** `bus_trips`, `profiles`, usuarios de login.

---

## Paso 1 — Generar el SQL (en tu PC)

```powershell
cd C:\Users\denil\PROYECTOS\MUNICIPALIDAD\BusControl
python scripts/generar_migracion_oficial.py
```

Se crea: `scripts/output/migracion_lista_oficial.sql`

---

## Paso 2 — Ejecutar en Supabase

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **SQL Editor** → **New query**
3. Abre `scripts/output/migracion_lista_oficial.sql`, copia todo y pega
4. Click **Run**
5. Debe decir `Success`

--- 

## Paso 3 — Verificar

Ejecuta en SQL Editor:

```sql
-- Debe dar ~109
SELECT COUNT(*) AS alumnos FROM social_bus_escolar;

-- Debe dar ~69
SELECT COUNT(*) AS apoderados FROM bus_guardians;

-- Debe dar ~109 (1 por alumno)
SELECT COUNT(*) AS vínculos FROM bus_student_guardians;

-- Apoderados con varios hijos (ejemplo)
SELECT g.full_name, g.phone, COUNT(sg.student_id) AS hijos
FROM bus_guardians g
JOIN bus_student_guardians sg ON sg.guardian_id = g.id
GROUP BY g.id, g.full_name, g.phone
HAVING COUNT(sg.student_id) > 1
ORDER BY hijos DESC;
```

---

## Paso 4 — Probar la app

1. Abre la app móvil
2. Inicia un viaje
3. Escanea un QR de un alumno que tenía código (ej. BU0014)
4. Confirma que aparece en el roster

---

## Casos especiales (6 apoderados sin teléfono)

Estos quedaron en BD con `phone = NULL`. Pídele a tu pata el teléfono y actualiza:

```sql
UPDATE bus_guardians SET phone = '999 999 999', phone_normalized = '999999999'
WHERE full_name ILIKE '%Carmen Chávez%';
```

Apoderados sin teléfono en la lista:
- Carmen Chávez
- Katerin Segura
- Margarita Campos Julian

---

## Si algo sale mal

Restaura desde tu backup CSV en Supabase → Table Editor → Import, o contacta para revertir.

---

## Después (opcional)

Cuando estabilices, actualiza la app para leer apoderados desde `bus_guardians` en lugar de columnas viejas en `social_bus_escolar`.
