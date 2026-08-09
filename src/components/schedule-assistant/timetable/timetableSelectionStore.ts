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
};

export function createSelectionStore(): SelectionStore {
  let selection: Selection = null;
  const listeners = new Set<() => void>();
  return {
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
          selection.course === (next as { course?: string })?.course)
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
  const courseTitle = String(m.course || "").trim() || "—";
  const key = meetingSelectionKey(m);
  const course = m.course || courseTitle;
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const sel = store.getSelection();
      if (sel?.type !== "meeting") return 0;
      const selected = sel.value === key ? 1 : 0;
      const related = sel.course === course ? 2 : 0;
      return selected | related;
    },
    () => 0,
  );
}
