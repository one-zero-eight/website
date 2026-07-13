import {
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";

export type ScanSessionState = {
  scannerName: string;
  mode: ScanningOptionsInput_source;
  scanSides: ScanningOptionsSides;
  quality: ScanningOptionsQuality;
  crop: ScanningOptionsCrop;
  documentName: string;
  hasScanResult: boolean;
  isNewScan: boolean;
  isScanning: boolean;
  preparedFile?: File;
  fileBlob?: string;
  preparedFileName?: string;
  downloadFileName?: string;
  preparedFilePagesCount?: number;
};

const defaultState: ScanSessionState = {
  scannerName: "",
  mode: ScanningOptionsInput_source.Platen,
  scanSides: ScanningOptionsSides.false,
  quality: ScanningOptionsQuality.Value200,
  crop: ScanningOptionsCrop.false,
  documentName: "",
  hasScanResult: false,
  isNewScan: true,
  isScanning: false,
};

let state: ScanSessionState = { ...defaultState };
const listeners = new Set<() => void>();

export function getScanSessionState(): ScanSessionState {
  return state;
}

export function setScanSessionState(partial: Partial<ScanSessionState>) {
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

export function subscribeScanSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
