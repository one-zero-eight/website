import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type SettingsSubTab =
  | "courses"
  | "groups"
  | "instructors"
  | "rooms"
  | "semester";

export type SettingsSelection =
  | { kind: "course"; courseIndex: number }
  | { kind: "room"; roomIndex: number }
  | { kind: "instructor"; instructorIndex: number }
  | { kind: "program"; sectionCode: string; programIndex: number }
  | {
      kind: "track";
      sectionCode: string;
      programIndex: number;
      trackIndex: number;
    }
  | {
      kind: "group";
      sectionCode: string;
      programIndex: number;
      trackIndex: number;
      groupId: string;
    };

/** Строка простого списка на вкладках настроек (преподаватели, курсы в сводке и т.п.). */
export type SettingsListRow = {
  id: string;
  title: string;
  subtitle?: string;
  selection: SettingsSelection;
};

type SelectionByTab = Record<SettingsSubTab, SettingsSelection | null>;

const emptySelection: SelectionByTab = {
  courses: null,
  groups: null,
  instructors: null,
  rooms: null,
  semester: null,
};
const SETTINGS_SELECTION_STORAGE_KEY = "schedule-assistant:settings:selection";

function readStoredSelection(): SelectionByTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isSelectionByTab(parsed)) {
      window.localStorage.removeItem(SETTINGS_SELECTION_STORAGE_KEY);
      return null;
    }
    return {
      ...emptySelection,
      ...parsed,
    };
  } catch {
    window.localStorage.removeItem(SETTINGS_SELECTION_STORAGE_KEY);
    return null;
  }
}

export type SelectionStore = {
  settingsSubTab: SettingsSubTab;
  setSettingsSubTab: (subTab: SettingsSubTab) => void;
  settingsSelectionByTab: SelectionByTab;
  setSettingsSelectionByTab: Dispatch<SetStateAction<SelectionByTab>>;
  selectedSelection: SettingsSelection | null;
  selectedSelectionId: string;
  selectItem: (selection: SettingsSelection) => void;
  deselectItem: () => void;
  clearAllSelection: () => void;
};

const SelectionContext = createContext<SelectionStore | null>(null);

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isValidSelection(value: unknown): value is SettingsSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Record<string, unknown>;
  switch (selection.kind) {
    case "course":
      return isNonNegativeInteger(selection.courseIndex);
    case "room":
      return isNonNegativeInteger(selection.roomIndex);
    case "instructor":
      return isNonNegativeInteger(selection.instructorIndex);
    case "program":
      return (
        typeof selection.sectionCode === "string" &&
        isNonNegativeInteger(selection.programIndex)
      );
    case "track":
      return (
        typeof selection.sectionCode === "string" &&
        isNonNegativeInteger(selection.programIndex) &&
        isNonNegativeInteger(selection.trackIndex)
      );
    case "group":
      return (
        typeof selection.sectionCode === "string" &&
        isNonNegativeInteger(selection.programIndex) &&
        isNonNegativeInteger(selection.trackIndex) &&
        typeof selection.groupId === "string"
      );
    default:
      return false;
  }
}

function isSelectionByTab(value: unknown): value is SelectionByTab {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Record<SettingsSubTab, unknown>>;
  return (Object.keys(emptySelection) as SettingsSubTab[]).every((tab) => {
    const selection = record[tab];
    return selection == null || isValidSelection(selection);
  });
}

export function isSameSettingsSelection(
  a: SettingsSelection | null,
  b: SettingsSelection | null,
): boolean {
  return getSettingsSelectionKey(a) === getSettingsSelectionKey(b);
}

export function getSettingsSelectionKey(
  selection: SettingsSelection | null,
): string {
  if (!selection) return "";
  switch (selection.kind) {
    case "course":
      return `course:${selection.courseIndex}`;
    case "room":
      return `room:${selection.roomIndex}`;
    case "instructor":
      return `instructor:${selection.instructorIndex}`;
    case "program":
      return `program:${selection.sectionCode}:${selection.programIndex}`;
    case "track":
      return `track:${selection.sectionCode}:${selection.programIndex}:${selection.trackIndex}`;
    case "group":
      return `group:${selection.sectionCode}:${selection.programIndex}:${selection.trackIndex}:${selection.groupId}`;
  }
}

export function useSelectionState(
  currentSubTab: SettingsSubTab = "courses",
): SelectionStore {
  const [settingsSubTab, setSettingsSubTab] =
    useState<SettingsSubTab>(currentSubTab);
  const [settingsSelectionByTab, setSettingsSelectionByTab] =
    useState<SelectionByTab>(() => readStoredSelection() || emptySelection);

  useEffect(() => {
    if (settingsSubTab === currentSubTab) return;
    setSettingsSubTab(currentSubTab);
  }, [currentSubTab, settingsSubTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SETTINGS_SELECTION_STORAGE_KEY,
        JSON.stringify(settingsSelectionByTab),
      );
    } catch {
      // Ignore storage errors in private mode/quota cases.
    }
  }, [settingsSelectionByTab]);

  const selectItem = useCallback(
    (selection: SettingsSelection) => {
      setSettingsSelectionByTab((prev) => ({
        ...prev,
        [settingsSubTab]: selection,
      }));
    },
    [settingsSubTab],
  );

  const deselectItem = useCallback(() => {
    setSettingsSelectionByTab((prev) => ({ ...prev, [settingsSubTab]: null }));
  }, [settingsSubTab]);

  const clearAllSelection = useCallback(() => {
    setSettingsSelectionByTab(emptySelection);
  }, []);

  const selectedSelection = settingsSelectionByTab[settingsSubTab];
  const selectedSelectionId = getSettingsSelectionKey(selectedSelection);

  return useMemo(
    () => ({
      settingsSubTab,
      setSettingsSubTab,
      settingsSelectionByTab,
      setSettingsSelectionByTab,
      selectedSelection,
      selectedSelectionId,
      selectItem,
      deselectItem,
      clearAllSelection,
    }),
    [
      settingsSubTab,
      setSettingsSubTab,
      settingsSelectionByTab,
      setSettingsSelectionByTab,
      selectedSelection,
      selectedSelectionId,
      selectItem,
      deselectItem,
      clearAllSelection,
    ],
  );
}

export function SelectionProvider({
  value,
  children,
}: {
  value: SelectionStore;
  children: ReactNode;
}) {
  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used inside SelectionProvider.");
  }
  return ctx;
}
