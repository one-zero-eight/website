import {
  useTermQuery,
  useCoursesQuery,
  useRoomsQuery,
  useInstructorsQuery,
  useStudentGroupsQuery,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { cn } from "@/lib/ui/cn";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SettingsSaveStatusKind = "unsaved" | "saving" | "syncing" | "saved";

type SettingsSaveStatusContextValue = {
  setFieldDirty: (fieldId: string, dirty: boolean) => void;
};

const SettingsSaveStatusContext =
  createContext<SettingsSaveStatusContextValue | null>(null);

const SAVED_INDICATOR_MS = 3000;

function isScheduleConfigWriteMutationKey(mutationKey: unknown): boolean {
  if (!Array.isArray(mutationKey) || mutationKey.length < 2) return false;
  const [method, path] = mutationKey;
  if (typeof method !== "string" || typeof path !== "string") return false;
  if (!path.startsWith("/schedule-config")) return false;
  return method === "put" || method === "post" || method === "delete";
}

function useScheduleConfigQueriesFetchState() {
  const termQuery = useTermQuery();
  const coursesQuery = useCoursesQuery();
  const roomsQuery = useRoomsQuery();
  const instructorsQuery = useInstructorsQuery();
  const studentGroupsQuery = useStudentGroupsQuery();
  const queries = [
    termQuery,
    coursesQuery,
    roomsQuery,
    instructorsQuery,
    studentGroupsQuery,
  ];

  return {
    isPending: queries.some((query) => query.isPending),
    isFetching: queries.some((query) => query.isFetching),
  };
}

export function SettingsSaveStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(() => new Set());
  const [savedPulse, setSavedPulse] = useState(false);
  const [saveSettling, setSaveSettling] = useState(false);
  const prevFetchingRef = useRef(false);
  const queryClient = useQueryClient();
  const { isFetching } = useScheduleConfigQueriesFetchState();
  const savingCount = useIsMutating({
    predicate: (mutation) =>
      isScheduleConfigWriteMutationKey(mutation.options.mutationKey),
  });

  const setFieldDirty = useCallback((fieldId: string, dirty: boolean) => {
    setDirtyFields((prev) => {
      const hasField = prev.has(fieldId);
      if (dirty) {
        if (hasField) return prev;
        const next = new Set(prev);
        next.add(fieldId);
        return next;
      }
      if (!hasField) return prev;
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);

  useEffect(() => {
    return queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const { mutation } = event;
      if (!isScheduleConfigWriteMutationKey(mutation.options.mutationKey))
        return;

      if (mutation.state.status === "pending") {
        setSaveSettling(true);
      }
      if (mutation.state.status === "success") {
        setSavedPulse(true);
        setSaveSettling(true);
      }
      if (mutation.state.status === "error") {
        setSaveSettling(false);
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!saveSettling) {
      prevFetchingRef.current = isFetching;
      return;
    }
    if (savingCount > 0) {
      prevFetchingRef.current = isFetching;
      return;
    }

    const wasFetching = prevFetchingRef.current;
    prevFetchingRef.current = isFetching;
    if (wasFetching && !isFetching) {
      setSaveSettling(false);
    }
  }, [saveSettling, savingCount, isFetching]);

  useEffect(() => {
    if (!savedPulse) return;
    const timer = window.setTimeout(
      () => setSavedPulse(false),
      SAVED_INDICATOR_MS,
    );
    return () => window.clearTimeout(timer);
  }, [savedPulse]);

  const hasUnsavedDrafts = dirtyFields.size > 0;
  const isSaving = savingCount > 0 || saveSettling;
  const isSyncing = isFetching && !isSaving && !hasUnsavedDrafts;

  const status = useMemo((): SettingsSaveStatusKind => {
    if (hasUnsavedDrafts) return "unsaved";
    if (isSaving) return "saving";
    if (isSyncing) return "syncing";
    if (savedPulse) return "saved";
    return "saved";
  }, [hasUnsavedDrafts, isSaving, isSyncing, savedPulse]);

  const value = useMemo(() => ({ setFieldDirty }), [setFieldDirty]);

  return (
    <SettingsSaveStatusContext.Provider value={value}>
      <SettingsSaveStatusStateContext.Provider value={status}>
        {children}
      </SettingsSaveStatusStateContext.Provider>
    </SettingsSaveStatusContext.Provider>
  );
}

const SettingsSaveStatusStateContext =
  createContext<SettingsSaveStatusKind>("saved");

export function useSettingsSaveStatusContext() {
  const context = useContext(SettingsSaveStatusContext);
  if (!context) {
    throw new Error(
      "Settings save status hooks must be used within SettingsSaveStatusProvider",
    );
  }
  return context;
}

export function useSettingsSaveStatus() {
  return useContext(SettingsSaveStatusStateContext);
}

export function useRegisterSettingsDirty(isDirty: boolean) {
  const fieldId = useId();
  const { setFieldDirty } = useSettingsSaveStatusContext();

  useEffect(() => {
    setFieldDirty(fieldId, isDirty);
    return () => setFieldDirty(fieldId, false);
  }, [fieldId, isDirty, setFieldDirty]);
}

const STATUS_META: Record<
  SettingsSaveStatusKind,
  { label: string; iconClass: string; spin?: boolean }
> = {
  unsaved: {
    label: "Не сохранено",
    iconClass: "icon-[material-symbols--edit-note-outline]",
  },
  saving: {
    label: "Сохранение",
    iconClass: "icon-[material-symbols--sync]",
    spin: true,
  },
  syncing: {
    label: "Синхронизация",
    iconClass: "icon-[material-symbols--sync]",
    spin: true,
  },
  saved: {
    label: "Сохранено",
    iconClass: "icon-[material-symbols--check-circle-outline]",
  },
};

export function SettingsSaveStatusIndicator() {
  const status = useSettingsSaveStatus();
  const meta = STATUS_META[status];

  return (
    <div
      className={cn(
        "text-base-content/70 flex shrink-0 items-center gap-1.5 px-2 text-xs font-medium whitespace-nowrap",
        status === "unsaved" && "text-warning",
        status === "saved" && "text-success",
      )}
    >
      {meta.spin ? (
        <span
          className={cn(meta.iconClass, "shrink-0 animate-spin text-base")}
        />
      ) : (
        <span className={cn(meta.iconClass, "shrink-0 text-base")} />
      )}
      <span>{meta.label}</span>
    </div>
  );
}
