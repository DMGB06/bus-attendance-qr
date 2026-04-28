import { supabase } from "@/src/lib/supabase";
import type { Student } from "@/src/types";

function normalizeLookup(value: string) {
  return value.trim();
}

export async function findStudentByCode(code: string): Promise<Student | null> {
  const normalizedCode = normalizeLookup(code);
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .eq("codigo", normalizedCode)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo consultar la base de alumnos.');
  }

  return data;
}

export async function findStudentByLookup(value: string): Promise<Student | null> {
  return findStudentByCode(value);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const normalizedId = normalizeLookup(id);
  if (!normalizedId) {
    return null;
  }

  const { data, error } = await supabase
    .from("social_bus_escolar")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo consultar la base de alumnos.');
  }

  return data;
}
