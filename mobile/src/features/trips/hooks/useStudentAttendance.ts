import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getErrorMessage } from "@/src/shared/utils/errors";
import { perfStart } from "@/src/shared/utils/perfMark";
import { notifyScanSuccess } from "@/src/shared/utils/haptics";
import {
  resolveScannerEventForStudent,
  type ResolvedScannerEvent,
} from "@/src/features/trips/domain/scanner-event.rules";
import { findStudentInStudentList } from "@/src/features/trips/services/students-cache.service";
import {
  findStudentByLookup,
  refreshStudentGuardianFromPadron,
  searchStudentsByName,
} from "@/src/features/trips/services/students.service";
import { loadCachedStudents } from "@/src/features/trips/storage/roster-cache.storage";
import { rosterStoreActions, useRosterItems } from "@/src/features/trips/store/rosterStore";
import type { Student, TripDirection } from "@/src/features/trips/types";
import { withTimeout } from "@/src/shared/utils/withTimeout";

export type LookupState = "idle" | "searching" | "found" | "not_found";
export type ScannerViewMode = "scanner" | "manual";

const SCAN_DEBOUNCE_MS = 800;
const CANCEL_RESCAN_SUPPRESS_MS = 3000;
const LOOKUP_TIMEOUT_MS = 8_000;
export const MANUAL_SEARCH_MIN_CHARS = 2;

type ScanRecord = {
  value: string;
  at: number;
  suppressMs: number;
};

export function useStudentAttendance(
  tripId: string | undefined,
  tripDirection: TripDirection | undefined,
) {
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [viewMode, setViewMode] = useState<ScannerViewMode>("scanner");
  const [scannedValue, setScannedValue] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCandidates, setManualCandidates] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [resolvedEvent, setResolvedEvent] = useState<Extract<ResolvedScannerEvent, { ok: true }> | null>(
    null,
  );
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const rosterItems = useRosterItems(tripId);
  const rosterStudents = useMemo(
    () => rosterItems.map((item) => item.student),
    [rosterItems],
  );

  const scanLockedRef = useRef(false);
  const lastScannedRef = useRef<ScanRecord | null>(null);
  const confirmModalOpenRef = useRef(false);
  const studentRef = useRef<Student | null>(null);
  const resolveInFlightRef = useRef<string | null>(null);
  const manualSearchRequestRef = useRef(0);

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
      resolveInFlightRef.current = null;
      lastScannedRef.current = null;
      setLookupState("idle");
      setScannedValue("");
      setStudent(null);
      setResolvedEvent(null);
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

  const resolveEventForStudent = useCallback(
    (studentId: string): ResolvedScannerEvent => {
      if (!tripDirection) {
        return resolveScannerEventForStudent("recojo", [], studentId);
      }
      return resolveScannerEventForStudent(tripDirection, rosterItems, studentId);
    },
    [tripDirection, rosterItems],
  );

  const guardScannerRegistration = useCallback(
    (studentId: string) => {
      const resolved = resolveEventForStudent(studentId);
      if (!resolved.ok) {
        setErrorMessage(resolved.error);
        setResolvedEvent(null);
        setLookupState("idle");
        setIsConfirmModalVisible(false);
        releaseScanLock();
        return true;
      }

      setResolvedEvent(resolved);
      return false;
    },
    [releaseScanLock, resolveEventForStudent],
  );

  const selectStudent = useCallback(
    (foundStudent: Student) => {
      if (guardScannerRegistration(foundStudent.id)) {
        return;
      }

      setErrorMessage(null);
      setInfoMessage(null);
      setManualCandidates([]);
      setStudent(foundStudent);
      setLookupState("found");
      setIsConfirmModalVisible(true);
      lockScan();
    },
    [guardScannerRegistration, lockScan],
  );

  const resolveStudentByCode = useCallback(
    async (value: string) => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        setErrorMessage("Ingresa un código válido.");
        return;
      }

      if (resolveInFlightRef.current === normalizedValue) {
        return;
      }

      resolveInFlightRef.current = normalizedValue;
      setErrorMessage(null);
      setSuccessMessage(null);
      setInfoMessage(null);
      setStudent(null);
      setResolvedEvent(null);
      setManualCandidates([]);
      setScannedValue(normalizedValue);

      const endResolve = perfStart("scanner.resolveStudentByCode");
      try {
        const localMatch = rosterStudents.length
          ? findStudentInStudentList(rosterStudents, normalizedValue)
          : null;

        if (localMatch) {
          void notifyScanSuccess();
          selectStudent(localMatch);
          void refreshStudentGuardianFromPadron(localMatch).then((enriched) => {
            if (studentRef.current?.id === enriched.id) {
              setStudent(enriched);
            }
          });
          return;
        }

        setLookupState("searching");
        const foundStudent = await withTimeout(
          findStudentByLookup(normalizedValue, rosterStudents),
          LOOKUP_TIMEOUT_MS,
          null,
        );

        if (foundStudent === null) {
          setLookupState("idle");
          setIsConfirmModalVisible(false);
          setErrorMessage("La búsqueda tardó demasiado. Revisa tu conexión e intenta de nuevo.");
          releaseScanLock();
          return;
        }

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

        void notifyScanSuccess();
        selectStudent(foundStudent);
      } catch (error: unknown) {
        setLookupState("idle");
        setErrorMessage(getErrorMessage(error, "No se pudo buscar al alumno."));
        releaseScanLock();
      } finally {
        if (resolveInFlightRef.current === normalizedValue) {
          resolveInFlightRef.current = null;
        }
        endResolve();
      }
    },
    [releaseScanLock, rosterStudents, selectStudent],
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
        studentRef.current ||
        resolveInFlightRef.current
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

  const runManualSearch = useCallback(
    async (nameOverride?: string) => {
      if (isRegistering) {
        return;
      }

      const normalizedName = (nameOverride ?? manualName).trim();
      if (!normalizedName) {
        setErrorMessage("Ingresa el nombre del alumno.");
        return;
      }

      if (normalizedName.length < MANUAL_SEARCH_MIN_CHARS) {
        setManualCandidates([]);
        setErrorMessage(null);
        setInfoMessage(`Escribe al menos ${MANUAL_SEARCH_MIN_CHARS} caracteres para buscar.`);
        return;
      }

      const requestId = manualSearchRequestRef.current + 1;
      manualSearchRequestRef.current = requestId;

      setLookupState("searching");
      setErrorMessage(null);
      setSuccessMessage(null);
      setInfoMessage(null);
      setStudent(null);
      setResolvedEvent(null);
      setManualCandidates([]);
      setScannedValue("");
      lockScan();

      try {
        let searchPool = rosterStudents;
        if (!searchPool.length) {
          const cached = await loadCachedStudents();
          searchPool = cached?.students ?? [];
        }

        const candidates = await withTimeout(
          searchStudentsByName(normalizedName, 8, searchPool),
          LOOKUP_TIMEOUT_MS,
          null,
        );

        if (manualSearchRequestRef.current !== requestId) {
          return;
        }

        if (candidates === null) {
          setLookupState("idle");
          setErrorMessage("La búsqueda tardó demasiado. Revisa tu conexión e intenta de nuevo.");
          releaseScanLock();
          return;
        }

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
          void refreshStudentGuardianFromPadron(candidates[0]).then((enriched) => {
            if (studentRef.current?.id === enriched.id) {
              setStudent(enriched);
            }
          });
          return;
        }

        setLookupState("idle");
        setManualCandidates(candidates);
        setInfoMessage(`Se encontraron ${candidates.length} alumnos. Selecciona uno.`);
        releaseScanLock();
      } catch (error: unknown) {
        if (manualSearchRequestRef.current !== requestId) {
          return;
        }
        setLookupState("idle");
        setErrorMessage(getErrorMessage(error, "No se pudo buscar al alumno."));
        releaseScanLock();
      }
    },
    [
      isRegistering,
      manualName,
      lockScan,
      releaseScanLock,
      rosterStudents,
      selectStudent,
    ],
  );

  const handleManualSearch = useCallback(async () => {
    await runManualSearch();
  }, [runManualSearch]);

  const handleSetViewMode = useCallback(
    (mode: ScannerViewMode) => {
      manualSearchRequestRef.current += 1;
      if (mode === "manual") {
        setLookupState("idle");
        setErrorMessage(null);
        releaseScanLock();
      }
      setViewMode(mode);
    },
    [releaseScanLock],
  );

  const handleConfirmAttendance = useCallback(async () => {
    if (!tripId || !student) {
      return;
    }

    const resolved = resolveEventForStudent(student.id);
    if (!resolved.ok) {
      setErrorMessage(resolved.error);
      return;
    }

    const duplicateMessage = rosterStoreActions.getRegistrationValidationError(
      student.id,
      resolved.eventType,
    );
    if (duplicateMessage) {
      setErrorMessage(duplicateMessage);
      return;
    }

    const studentToRegister = student;
    const studentName = studentToRegister.nombre_alumno;

    setIsRegistering(true);
    setErrorMessage(null);

    clearStudentSelection(true);
    setSuccessMessage(resolved.successMessage(studentName));

    try {
      const result = await rosterStoreActions.registerStudentAttendance(
        tripId,
        studentToRegister.id,
        resolved.eventType,
      );

      if (result.duplicate) {
        setSuccessMessage(null);
        setErrorMessage(
          resolved.eventType === "bajo"
            ? "La salida de este alumno ya fue registrada."
            : "Ya registrado",
        );
        return;
      }

      if (result.queued) {
        setSuccessMessage(resolved.queuedMessage(studentName));
      }
    } catch (error: unknown) {
      setSuccessMessage(null);
      const message = getErrorMessage(error, "No se pudo registrar la asistencia.");
      setErrorMessage(message);
      releaseScanLock();
    } finally {
      setIsRegistering(false);
      releaseScanLock();
    }
  }, [
    tripId,
    student,
    resolveEventForStudent,
    clearStudentSelection,
    releaseScanLock,
  ]);

  const handleManualNameChange = useCallback(
    (value: string) => {
      manualSearchRequestRef.current += 1;
      setManualName(value);
      setManualCandidates([]);
      setLookupState("idle");
      setErrorMessage(null);
      setInfoMessage(null);
      releaseScanLock();
    },
    [releaseScanLock],
  );

  useEffect(() => {
    if (!student) {
      setResolvedEvent(null);
      return;
    }

    const resolved = resolveEventForStudent(student.id);
    if (!resolved.ok) {
      setErrorMessage(resolved.error);
      setResolvedEvent(null);
      setIsConfirmModalVisible(false);
      setStudent(null);
      setLookupState("idle");
      releaseScanLock();
      return;
    }

    setResolvedEvent(resolved);
  }, [student, resolveEventForStudent, releaseScanLock]);

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    isSearching,
    scannedValue,
    manualName,
    manualCandidates,
    student,
    resolvedEvent,
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
