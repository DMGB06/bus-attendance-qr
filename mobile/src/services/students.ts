// src/services/students.ts

import { supabase } from "@/src/lib/supabase";
import type { Student } from "@/src/types";

async function findStudentByColumn(
  column: "codigo" | "id",
  value: string,
): Promise<Student | null> {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .eq(column, normalizedValue)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findStudentByLookup(
  value: string,
): Promise<Student | null> {
  const byCodigo = await findStudentByColumn("codigo", value);
  if (byCodigo) {
    return byCodigo;
  }

  return findStudentByColumn("id", value);
}

export async function getStudentById(id: string): Promise<Student | null> {
  return findStudentByColumn("id", id);
}

export async function getStudentByCode(code: string): Promise<Student | null> {
  return findStudentByColumn("codigo", code);
}
