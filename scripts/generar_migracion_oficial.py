"""
Genera SQL para Supabase: borra alumnos viejos e importa SOLO lista oficial
con apoderados normalizados (bus_guardians + bus_student_guardians).

Ejecutar: python scripts/generar_migracion_oficial.py
Luego pegar el .sql en Supabase → SQL Editor.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from matching_utils import (
    clean_field,
    find_best_match,
    load_current,
    load_official,
    normalize_name,
    normalize_phone,
)

OUTPUT_SQL = Path(__file__).resolve().parent / "output" / "migracion_lista_oficial.sql"


def sql_str(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_int(value: str | None) -> str:
    if not value or not str(value).isdigit():
        return "NULL"
    return str(value)


def title_case_name(name: str) -> str:
    parts = name.strip().split()
    return " ".join(p[:1].upper() + p[1:].lower() if p else "" for p in parts)


def guardian_key(apoderado: str, telefono_norm: str) -> str:
    return telefono_norm or normalize_name(apoderado)


def next_codigo(existing: set[str], counter: list[int]) -> str:
    while True:
        code = f"BU{counter[0]:04d}"
        counter[0] += 1
        if code not in existing:
            existing.add(code)
            return code


def build_migration() -> str:
    official = load_official()
    current = load_current()
    used_student_ids: set[str] = set()
    used_codigos: set[str] = {
        clean_field(r.get("codigo")) for r in current if clean_field(r.get("codigo"))
    }
    codigo_counter = [113]

    guardians: dict[str, dict] = {}
    students: list[dict] = []
    links: list[dict] = []

    for row in official:
        match, score = find_best_match(row["alumno"], current, used_student_ids)
        if match:
            used_student_ids.add(match["id"])

        student_id = match["id"] if match and score >= 0.70 else str(uuid.uuid4())
        codigo = clean_field(match.get("codigo") if match else "")
        if not codigo:
            codigo = next_codigo(used_codigos, codigo_counter)

        gkey = guardian_key(row["apoderado"], row["telefono_norm"])
        if gkey not in guardians:
            guardians[gkey] = {
                "id": str(uuid.uuid4()),
                "full_name": title_case_name(row["apoderado"]),
                "phone": row["telefono"].strip() or None,
                "phone_norm": row["telefono_norm"] or None,
            }

        students.append(
            {
                "id": student_id,
                "nombre": title_case_name(row["alumno"]),
                "dni": clean_field(match.get("dni_alumno") if match else "") or f"PEND-{row['fila']:03d}",
                "edad": clean_field(match.get("edad") if match else ""),
                "sexo": clean_field(match.get("sexo") if match else ""),
                "colegio": clean_field(match.get("colegio") if match else ""),
                "direccion": clean_field(match.get("direccion") if match else ""),
                "codigo": codigo,
                "match_score": round(score * 100, 1),
                "matched": bool(match),
            }
        )

        links.append(
            {
                "student_id": student_id,
                "guardian_id": guardians[gkey]["id"],
            }
        )

    lines: list[str] = [
        "-- ============================================================",
        "-- BusControl: migración a lista oficial únicamente",
        "-- GENERADO AUTOMÁTICAMENTE — revisar antes de ejecutar",
        f"-- Alumnos oficiales: {len(students)}",
        f"-- Apoderados únicos: {len(guardians)}",
        "-- ============================================================",
        "",
        "BEGIN;",
        "",
        "-- 1) Tablas nuevas de apoderados",
        "CREATE TABLE IF NOT EXISTS bus_guardians (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  full_name text NOT NULL,",
        "  phone text,",
        "  phone_normalized text,",
        "  dni text,",
        "  email text,",
        "  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,",
        "  is_active boolean NOT NULL DEFAULT true,",
        "  notes text,",
        "  created_at timestamptz NOT NULL DEFAULT now(),",
        "  updated_at timestamptz NOT NULL DEFAULT now()",
        ");",
        "",
        "CREATE UNIQUE INDEX IF NOT EXISTS bus_guardians_phone_norm_uidx",
        "  ON bus_guardians (phone_normalized)",
        "  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';",
        "",
        "CREATE TABLE IF NOT EXISTS bus_student_guardians (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  student_id uuid NOT NULL REFERENCES social_bus_escolar(id) ON DELETE CASCADE,",
        "  guardian_id uuid NOT NULL REFERENCES bus_guardians(id) ON DELETE CASCADE,",
        "  relationship text NOT NULL DEFAULT 'apoderado',",
        "  is_primary boolean NOT NULL DEFAULT true,",
        "  created_at timestamptz NOT NULL DEFAULT now(),",
        "  UNIQUE (student_id, guardian_id)",
        ");",
        "",
        "ALTER TABLE social_bus_escolar",
        "  ADD COLUMN IF NOT EXISTS enrollment_status text NOT NULL DEFAULT 'active';",
        "",
        "-- 2) Limpiar datos viejos (ya tienes backup)",
        "DELETE FROM bus_attendance_records;",
        "DELETE FROM bus_student_guardians;",
        "DELETE FROM bus_guardians;",
        "DELETE FROM social_bus_escolar;",
        "",
        "-- 3) Apoderados oficiales",
    ]

    for g in sorted(guardians.values(), key=lambda x: x["full_name"]):
        lines.append(
            "INSERT INTO bus_guardians (id, full_name, phone, phone_normalized, is_active) VALUES "
            f"({sql_str(g['id'])}, {sql_str(g['full_name'])}, {sql_str(g['phone'])}, "
            f"{sql_str(g['phone_norm'])}, true);"
        )

    lines.append("")
    lines.append("-- 4) Alumnos oficiales")
    for s in students:
        lines.append(
            "INSERT INTO social_bus_escolar "
            "(id, nombre_alumno, dni_alumno, edad, sexo, colegio, direccion, codigo, activo, enrollment_status) VALUES ("
            f"{sql_str(s['id'])}, {sql_str(s['nombre'])}, {sql_str(s['dni'])}, "
            f"{sql_int(s['edad'])}, {sql_str(s['sexo']) or 'NULL'}, "
            f"{sql_str(s['colegio']) or 'NULL'}, {sql_str(s['direccion']) or 'NULL'}, "
            f"{sql_str(s['codigo'])}, true, 'active');"
        )

    lines.append("")
    lines.append("-- 5) Relación alumno ↔ apoderado")
    for link in links:
        lines.append(
            "INSERT INTO bus_student_guardians (student_id, guardian_id, relationship, is_primary) VALUES ("
            f"{sql_str(link['student_id'])}, {sql_str(link['guardian_id'])}, 'apoderado', true);"
        )

    matched = sum(1 for s in students if s["matched"])
    lines.extend(
        [
            "",
            "COMMIT;",
            "",
            f"-- Match con BD anterior: {matched}/{len(students)}",
            f"-- Alumnos con QR reutilizado: {sum(1 for s in students if s['matched'])}",
            f"-- Apoderados sin teléfono: {sum(1 for g in guardians.values() if not g['phone_norm'])}",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    OUTPUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    sql = build_migration()
    OUTPUT_SQL.write_text(sql, encoding="utf-8")
    print(f"SQL generado: {OUTPUT_SQL}")
    print(f"Tamaño: {len(sql):,} caracteres")
    print()
    print("SIGUIENTE PASO:")
    print("1. Abre Supabase -> SQL Editor")
    print("2. Pega el contenido del archivo")
    print("3. Ejecuta (Run)")
    print("4. Verifica: SELECT COUNT(*) FROM social_bus_escolar;  → debe dar ~109")


if __name__ == "__main__":
    main()
