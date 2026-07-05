import {
  PrintingOptionsNumberUpAnyOf0,
  PrintingOptionsSidesAnyOf0,
} from "@/api/printers/types.ts";

export type PrintSessionState = {
  printerName: string;
  copiesCount: number;
  sides: PrintingOptionsSidesAnyOf0;
  pages: string | null;
  pageRangesInput: string;
  numberUp: PrintingOptionsNumberUpAnyOf0;
  originalFileName?: string;
  preparedFile?: File;
  fileBlob?: string;
  preparedFileName?: string;
  downloadFileName?: string;
  preparedFilePagesCount?: number;
  jobId?: number;
  isPrinting: boolean;
};

const defaultState: PrintSessionState = {
  printerName: "",
  copiesCount: 1,
  sides: PrintingOptionsSidesAnyOf0.two_sided_long_edge,
  pages: null,
  pageRangesInput: "",
  numberUp: PrintingOptionsNumberUpAnyOf0.Value1,
  isPrinting: false,
};

let state: PrintSessionState = { ...defaultState };
const listeners = new Set<() => void>();

export let stopPrintJobPolling = false;

export function resetStopPrintJobPolling() {
  stopPrintJobPolling = false;
}

export function requestStopPrintJobPolling() {
  stopPrintJobPolling = true;
}

export function shouldStopPrintJobPolling() {
  return stopPrintJobPolling;
}

export function getPrintSessionState(): PrintSessionState {
  return state;
}

export function setPrintSessionState(partial: Partial<PrintSessionState>) {
  if (
    partial.fileBlob !== undefined &&
    state.fileBlob &&
    partial.fileBlob !== state.fileBlob
  ) {
    URL.revokeObjectURL(state.fileBlob);
  }

  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

export function subscribePrintSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
