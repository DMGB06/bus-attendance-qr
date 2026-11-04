import { supabase } from "@/src/core/config/supabase";
import { getStudentById } from "@/src/features/trips/services/students.service";
import { guardianDniMatchesPadron } from "@/src/features/parent/domain/guardian-enrollment.rules";
import type {
  BusStudentGuardianLink,
  ParentStudentLink,
  StudentGuardian,
} from "@/src/features/parent/types";

function mapBusStudentLink(row: BusStudentGuardianLink): ParentStudentLink {
  return {
    id: row.id,
    student_id: row.student_id,
    relationship: row.relationship,
    is_primary: row.is_primary,
    created_at: row.created_at,
    source: "bus_student_guardians",
  };
}

function mapStudentGuardianLink(row: StudentGuardian): ParentStudentLink {
  return {
    id: row.id,
    student_id: row.student_id,
    relationship: row.relationship,
    is_primary: row.is_primary,
    created_at: row.created_at,
    source: "student_guardians",
  };
}

async function getLinksFromBusGuardians(userId: string): Promise<ParentStudentLink[]> {
  const { data: guardian, error: guardianError } = await supabase
    .from("bus_guardians")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (guardianError) {
    throw new Error("No se pudo consultar el apoderado vinculado.");
  }

  if (!guardian) {
    return [];
  }

  const { data: links, error: linksError } = await supabase
    .from("bus_student_guardians")
    .select("*")
    .eq("guardian_id", guardian.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (linksError) {
    throw new Error("No se pudieron cargar los hijos vinculados.");
  }

  return (links ?? []).map(mapBusStudentLink);
}

async function getLinksFromStudentGuardians(userId: string): Promise<ParentStudentLink[]> {
  const { data, error } = await supabase
    .from("student_guardians")
    .select("*")
    .eq("guardian_user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los hijos vinculados.");
  }

  return (data ?? []).map(mapStudentGuardianLink);
}

/**
 * Hijos del apoderado logueado.
 * Une catálogo municipal y `student_guardians`, igual que `is_guardian_of_student` en la BD.
 */
export async function getGuardianLinksForUser(userId: string): Promise<ParentStudentLink[]> {
  const [fromCatalog, fromStudentGuardians] = await Promise.all([
    getLinksFromBusGuardians(userId),
    getLinksFromStudentGuardians(userId),
  ]);

  const catalogStudentIds = new Set(fromCatalog.map((link) => link.student_id));
  return [
    ...fromCatalog,
    ...fromStudentGuardians.filter((link) => !catalogStudentIds.has(link.student_id)),
  ];
}

/**
 * Valida DNI apoderado contra padrón antes de vincular (coordinador / SQL manual).
 */
export async function validateGuardianEnrollment(
  studentId: string,
  guardianDni: string,
): Promise<{ valid: boolean; reason?: string }> {
  const student = await getStudentById(studentId);

  if (!student) {
    return { valid: false, reason: "Alumno no encontrado en el padrón." };
  }

  if (!guardianDniMatchesPadron(guardianDni, student.dni_apoderado)) {
    return {
      valid: false,
      reason: "El DNI no coincide con el apoderado registrado en el padrón escolar.",
    };
  }

  return { valid: true };
}
