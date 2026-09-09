import { createContext, useContext, useSyncExternalStore } from "react";

import {
  meetingSelectionKey,
  type Meeting,
  type Selection,
} from "./timetableViewerModel.ts";

export type SelectionStore = {
  subscribe: (cb: () => void) => () => void;
  getSelection: () => Selection;
  setSelection: (next: Selection) => void;
  isPersonalGroup: (groupId: string) => boolean;
  setPersonalGroups: (groups: readonly string[]) => void;
};

export function createSelectionStore(): SelectionStore {
  let selection: Selection = null;
  let personalGroups = new Set<string>();
  const listeners = new Set<() => void>();
  return {
    isPersonalGroup(groupId) {
      return personalGroups.has(groupId);
    },
    setPersonalGroups(groups) {
      const next = new Set(groups);
      if (
        next.size === personalGroups.size &&
        [...next].every((group) => personalGroups.has(group))
      )
        return;
      personalGroups = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSelection() {
      return selection;
    },
    setSelection(next) {
      if (selection === next) return;
      if (
        selection?.type === next?.type &&
        selection?.value === next?.value &&
        (selection?.type !== "meeting" ||
          (selection.course ===
            (next as { course?: string; focusTag?: string })?.course &&
            String(selection.focusTag || "") ===
              String(
                (next as { course?: string; focusTag?: string })?.focusTag ||
                  "",
              )))
      ) {
        return;
      }
      selection = next;
      listeners.forEach((l) => l());
    },
  };
}

export const SelectionStoreContext = createContext<SelectionStore | null>(null);

export function useSelectionStore(): SelectionStore {
  const ctx = useContext(SelectionStoreContext);
  if (!ctx) throw new Error("SelectionStoreContext is missing");
  return ctx;
}

export function useSelectionSnapshot(): Selection {
  const store = useSelectionStore();
  return useSyncExternalStore(store.subscribe, store.getSelection, () => null);
}

export function usePersonalGroup(groupId: string): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.isPersonalGroup(groupId),
    () => false,
  );
}

/** Selection bits 1/2 and personal-group bit 4 are independent. */
export function meetingHighlightBits(
  store: SelectionStore,
  meeting: Meeting,
): number {
  const personal = meeting.groups.some((group) => store.isPersonalGroup(group))
    ? 4
    : 0;
  const selection = store.getSelection();
  if (selection?.type !== "meeting") return personal;
  const selected = selection.value === meetingSelectionKey(meeting) ? 1 : 0;
  if (selection.course !== (meeting.course || "—")) return personal | selected;
  const focusTag = String(selection.focusTag || "").trim();
  const related =
    !focusTag || String(meeting.tag || "").trim() === focusTag ? 2 : 0;
  return personal | selected | related;
}

export function useProgramSelected(yearLabel: string): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return sel?.type === "program" && sel.value === yearLabel;
    },
    () => false,
  );
}

export function useGroupHeaderHighlight(
  groupId: string,
  yearLabel: string,
): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return (
        (sel?.type === "group" && sel.value === groupId) ||
        (sel?.type === "program" && sel.value === yearLabel)
      );
    },
    () => false,
  );
}

export function useResourceHeaderSelected(
  type: "room" | "instructor",
  resourceKey: string,
): boolean {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      return sel?.type === type && sel.value === resourceKey;
    },
    () => false,
  );
}

export function useMeetingHighlightBits(m: Meeting): number {
  const store = useSelectionStore();
  return useSyncExternalStore(
    store.subscribe,
    () => meetingHighlightBits(store, m),
    () => 0,
  );
}
