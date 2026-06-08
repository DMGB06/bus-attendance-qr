import { useCallback, useRef, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { registerAttendance } from "@/src/features/trips/services/attendance.service";
import {
  findStudentByLookup,
  searchStudentsByName,
} from "@/src/features/trips/services/students.service";
import type { Student } from "@/src/features/trips/types";

export type LookupState = "idle" | "searching" | "found" | "not_found";
export type ScannerViewMode = "scanner" | "manual";

const SCAN_DEBOUNCE_MS = 800;
const CANCEL_RESCAN_SUPPRESS_MS = 3000;

type ScanRecord = {
  value: string;
  at: number;
  suppressMs: number;
};

export function useStudentAttendance(tripId: string | undefined) {
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [viewMode, setViewMode] = useState<ScannerViewMode>("scanner");
  const [scannedValue, setScannedValue] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCandidates, setManualCandidates] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const scanLockedRef = useRef(false);
  const lastScannedRef = useRef<ScanRecord | null>(null);
  const confirmModalOpenRef = useRef(false);
  const studentRef = useRef<Student | null>(null);

  confirmModalOpenRef.current = isConfirmModalVisible;
  studentRef.current = student;

  const isSearching = lookupState === "searching";

  const releaseScanLock = useCallback(() => {
    scanLockedRef.current = false;
  }, []);

  const lockScan = useCallback(() => {
    scanLockedRef.current = true;
  }, []);

  const resetLookupSession = useCallback(
    (options?: { clearManual?: boolean; clearSuccess?: boolean }) => {
      const clearManual = options?.clearManual ?? false;
      const clearSuccess = options?.clearSuccess ?? false;

      releaseScanLock();
      lastScannedRef.current = null;
      setLookupState("idle");
      setScannedValue("");
      setStudent(null);
      setManualCandidates([]);
      setIsConfirmModalVisible(false);
      setErrorMessage(null);
      setInfoMessage(null);

      if (clearManual) {
        setManualName("");
      }

      if (clearSuccess) {
        setSuccessMessage(null);
      }
    },
    [releaseScanLock],
  );

  const clearStudentSelection = useCallback(
    (clearManual: boolean) => {
      resetLookupSession({ clearManual, clearSuccess: clearManual });
    },
    [resetLookupSession],
  );

  const cancelStudentConfirmation = useCallback(() => {
    if (isRegistering) {
      return;
    }

    const suppressedValue =
      scannedValue.trim() || studentRef.current?.codigo?.trim() || studentRef.current?.id || "";

    resetLookupSession({
      clearManual: viewMode === "manual",
      clearSuccess: false,
    });

    if (suppressedValue) {
      lastScannedRef.current = {
        value: suppressedValue,
        at: Date.now(),
        suppressMs: CANCEL_RESCAN_SUPPRESS_MS,
      };
    }
  }, [isRegistering, resetLookupSession, scannedValue, viewMode]);

  const selectStudent = useCallback(
    (foundStudent: Student) => {
      setErrorMessage(null);
      setInfoMessage(null);
      setManualCandidates([]);
      setStudent(foundStudent);
      setLookupState("found");
      setIsConfirmModalVisible(true);
      lockScan();
    },
    [lockScan],
  );

  const resolveStudentByCode = useCallback(
    async (value: string) => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        setErrorMessage("Ingresa un código válido.");
        return;
      }

      setLookupState("searching");
      setErrorMessage(null);
      setSuccessMessage(null);
      setInfoMessage(null);
      setStudent(null);
      setManualCandidates([]);
      setScannedValue(normalizedValue);

      try {
        const foundStudent = await findStudentByLookup(normalizedValue);

        if (!foundStudent) {
          setLookupState("not_found");
          setIsConfirmModalVisible(false);
          setErrorMessage(
            "No encontramos a este alumno en el padrón oficial. Verifica el QR o regístralo manualmente.",
          );
          releaseScanLock();
          lastScannedRef.current = {
            value: normalizedValue,
            at: Date.now(),
            suppressMs: SCAN_DEBOUNCE_MS,
          };
          return;
        }

        selectStudent(foundStudent);
      } catch (error: unknown) {
        setLookupState("idle");
        setErrorMessage(getErrorMessage(error, "No se pudo buscar al alumno."));
        releaseScanLock();
      }
    },
    [releaseScanLock, selectStudent],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (viewMode !== "scanner") {
        return;
      }

      if (
        confirmModalOpenRef.current ||
        scanLockedRef.current ||
        isSearching ||
        isRegistering ||
        studentRef.current
      ) {
        return;
      }

      const now = Date.now();
      const suppressMs = lastScannedRef.current?.suppressMs ?? SCAN_DEBOUNCE_MS;
      if (
        lastScannedRef.current?.value === data &&
        now - lastScannedRef.current.at < suppressMs
      ) {
        return;
      }

      lastScannedRef.current = { value: data, at: now, suppressMs: SCAN_DEBOUNCE_MS };
      lockScan();
      void resolveStudentByCode(data);
    },
    [viewMode, isSearching, isRegistering, lockScan, resolveStudentByCode],
  );

  const handleManualSearch = useCallback(async () => {
    if (isSearching || isRegistering) {
      return;
    }

    const normalizedName = manualName.trim();
    if (!normalizedName) {
      setErrorMessage("Ingresa el nombre del alumno.");
      return;
    }

    setLookupState("searching");
    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);
    setStudent(null);
    setManualCandidates([]);
    setScannedValue("");
    lockScan();

    try {
      const candidates = await searchStudentsByName(normalizedName);

      if (!candidates.length) {
        setLookupState("not_found");
        setErrorMessage(
          "No encontramos coincidencias en el padrón oficial. Revisa el nombre e intenta de nuevo.",
        );
        releaseScanLock();
        return;
      }

      if (candidates.length === 1) {
        selectStudent(candidates[0]);
        return;
      }

      setLookupState("idle");
      setManualCandidates(candidates);
      setInfoMessage(`Se encontraron ${candidates.length} alumnos. Selecciona uno.`);
      releaseScanLock();
    } catch (error: unknown) {
      setLookupState("idle");
      setErrorMessage(getErrorMessage(error, "No se pudo buscar al alumno."));
      releaseScanLock();
    }
  }, [isSearching, isRegistering, manualName, lockScan, releaseScanLock, selectStudent]);

  const handleConfirmAttendance = useCallback(async () => {
    if (!tripId || !student) {
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);

    try {
      const studentName = student.nombre_alumno;
      await registerAttendance(tripId, student.id, "subio");
      clearStudentSelection(true);
      setSuccessMessage(`Asistencia registrada para ${studentName}.`);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "No se pudo registrar la asistencia."));
      releaseScanLock();
    } finally {
      setIsRegistering(false);
      releaseScanLock();
    }
  }, [tripId, student, clearStudentSelection, releaseScanLock]);

  const handleManualNameChange = useCallback((value: string) => {
    setManualName(value);
    setErrorMessage(null);
    setInfoMessage(null);
  }, []);

  return {
    viewMode,
    setViewMode,
    isSearching,
    scannedValue,
    manualName,
    manualCandidates,
    student,
    isConfirmModalVisible,
    isRegistering,
    errorMessage,
    successMessage,
    infoMessage,
    handleBarcodeScanned,
    handleManualSearch,
    handleSelectManualStudent: selectStudent,
    handleConfirmAttendance,
    clearStudentSelection,
    cancelStudentConfirmation,
    handleManualNameChange,
    openConfirmModal: () => setIsConfirmModalVisible(true),
  };
}
