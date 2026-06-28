import { Middleware } from "@/api/helpers/create-fetch-client";
import { useSyncExternalStore } from "react";

type AccountsApiAvailabilityState = {
  isUnavailable: boolean;
  errorMessage: string | null;
  updatedAt: number | null;
};

const listeners = new Set<() => void>();

let state: AccountsApiAvailabilityState = {
  isUnavailable: false,
  errorMessage: null,
  updatedAt: null,
};

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setAccountsApiAvailability(next: AccountsApiAvailabilityState) {
  if (
    state.isUnavailable === next.isUnavailable &&
    state.errorMessage === next.errorMessage
  ) {
    return;
  }

  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return state;
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Network request failed";
}

export function useAccountsApiAvailability() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const accountsApiAvailabilityMiddleware: Middleware = {
  onResponse() {
    setAccountsApiAvailability({
      isUnavailable: false,
      errorMessage: null,
      updatedAt: Date.now(),
    });
  },
  onError({ error }) {
    if (!isNetworkError(error)) {
      return;
    }

    setAccountsApiAvailability({
      isUnavailable: true,
      errorMessage: getErrorMessage(error),
      updatedAt: Date.now(),
    });
  },
};
